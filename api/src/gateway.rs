use std::time::Instant;

use axum::body::Body;
use axum::extract::State;
use axum::http::{HeaderMap, StatusCode};
use axum::response::{IntoResponse, Response};
use axum::Json;
use serde_json::Value;
use sqlx::FromRow;

use crate::gatewayauth::{extract_model, wants_stream, ApiKeyUser};
use crate::routes::AppState;
use crate::usage::UsageEvent;

const MAX_BODY_BYTES: usize = 2 * 1024 * 1024;

#[derive(FromRow, Clone)]
pub struct Candidate {
    pub id: u64,
    pub base_url: String,
    pub multiplier: f64,
}

fn err(status: StatusCode, message: &str) -> Response {
    (
        status,
        Json(serde_json::json!({ "error": { "message": message, "type": "gateway_error" } })),
    )
        .into_response()
}

async fn candidates(state: &AppState, model: &str) -> Result<Vec<Candidate>, sqlx::Error> {
    sqlx::query_as::<_, Candidate>(
        "SELECT p.id, p.base_url, CAST(m.multiplier AS DOUBLE) AS multiplier FROM providers p \
         JOIN provider_models m ON m.provider_id = p.id \
         WHERE p.enabled = 1 AND m.enabled = 1 AND m.model = ? \
         ORDER BY p.priority, p.id LIMIT 5",
    )
    .bind(model)
    .fetch_all(&state.pool)
    .await
}

pub async fn chat_completions(
    State(state): State<AppState>,
    ApiKeyUser(ctx): ApiKeyUser,
    body: axum::body::Bytes,
) -> Response {
    if body.len() > MAX_BODY_BYTES {
        return err(StatusCode::PAYLOAD_TOO_LARGE, "body melebihi 2MB");
    }

    let payload: Value = match serde_json::from_slice(&body) {
        Ok(v) => v,
        Err(_) => return err(StatusCode::BAD_REQUEST, "body harus JSON valid"),
    };

    let model = match extract_model(&payload) {
        Ok(m) => m,
        Err(e) => return e.into_response(),
    };

    let streaming = wants_stream(&payload);

    let mut payload = payload;
    if streaming {
        if let Some(obj) = payload.as_object_mut() {
            obj.entry("stream_options")
                .or_insert_with(|| serde_json::json!({ "include_usage": true }));
        }
    }
    let payload = payload;

    let pool_candidates = match candidates(&state, &model).await {
        Ok(c) if !c.is_empty() => c,
        Ok(_) => {
            return err(
                StatusCode::NOT_FOUND,
                "model tidak tersedia atau dinonaktifkan",
            )
        }
        Err(e) => {
            tracing::error!("query provider gagal: {e}");
            return err(StatusCode::INTERNAL_SERVER_ERROR, "kesalahan internal");
        }
    };

    let mut last_error = String::from("semua provider gagal");

    for candidate in pool_candidates {
        let key = match state.pick_key(candidate.id).await {
            Ok(k) => k,
            Err(_) => {
                last_error = "provider tidak punya key aktif".into();
                continue;
            }
        };

        let started = Instant::now();
        let upstream = state
            .http
            .post(format!("{}/chat/completions", candidate.base_url))
            .bearer_auth(&key.secret)
            .json(&payload)
            .send()
            .await;

        let res = match upstream {
            Ok(r) => r,
            Err(e) => {
                last_error = if e.is_timeout() {
                    "provider timeout".into()
                } else {
                    "tidak dapat menghubungi provider".into()
                };
                state.cooldown_key(key.id, 30).await;
                continue;
            }
        };

        let status = res.status();

        if status == reqwest::StatusCode::TOO_MANY_REQUESTS || status.as_u16() == 402 {
            state.cooldown_key(key.id, 60).await;
            last_error = "provider membatasi rate".into();
            continue;
        }

        if status.is_server_error() {
            last_error = format!("provider error HTTP {}", status.as_u16());
            continue;
        }

        let axum_status = StatusCode::from_u16(status.as_u16()).unwrap_or(StatusCode::BAD_GATEWAY);

        if !status.is_success() {
            let text = res.text().await.unwrap_or_default();
            state
                .usage
                .push(UsageEvent {
                    api_key_id: Some(ctx.id),
                    provider_id: Some(candidate.id),
                    model: model.clone(),
                    prompt_tokens: 0,
                    completion_tokens: 0,
                    latency_ms: started.elapsed().as_millis() as u32,
                    status_code: status.as_u16(),
                    multiplier: candidate.multiplier,
                })
                .await;

            return Response::builder()
                .status(axum_status)
                .header("content-type", "application/json")
                .body(Body::from(text))
                .unwrap_or_else(|_| err(StatusCode::BAD_GATEWAY, "respons provider tidak valid"));
        }

        if streaming {
            let mut headers = HeaderMap::new();
            headers.insert("content-type", "text/event-stream".parse().unwrap());
            headers.insert("cache-control", "no-cache".parse().unwrap());
            headers.insert("x-nf-provider", candidate.id.to_string().parse().unwrap());

            let counted = count_stream(
                res.bytes_stream(),
                state.usage.clone(),
                UsageEvent {
                    api_key_id: Some(ctx.id),
                    provider_id: Some(candidate.id),
                    model: model.clone(),
                    prompt_tokens: 0,
                    completion_tokens: 0,
                    latency_ms: started.elapsed().as_millis() as u32,
                    status_code: 200,
                    multiplier: candidate.multiplier,
                },
            );

            return (axum_status, headers, Body::from_stream(counted)).into_response();
        }

        let text = match res.text().await {
            Ok(t) => t,
            Err(_) => {
                last_error = "gagal membaca respons provider".into();
                continue;
            }
        };

        let parsed: Value = serde_json::from_str(&text).unwrap_or(Value::Null);
        let usage = parsed.get("usage");
        let prompt = usage.and_then(|u| u.get("prompt_tokens")).and_then(|v| v.as_u64()).unwrap_or(0) as u32;
        let completion = usage
            .and_then(|u| u.get("completion_tokens"))
            .and_then(|v| v.as_u64())
            .unwrap_or(0) as u32;

        state
            .usage
            .push(UsageEvent {
                api_key_id: Some(ctx.id),
                provider_id: Some(candidate.id),
                model: model.clone(),
                prompt_tokens: prompt,
                completion_tokens: completion,
                latency_ms: started.elapsed().as_millis() as u32,
                status_code: 200,
                multiplier: candidate.multiplier,
            })
            .await;

        return Response::builder()
            .status(axum_status)
            .header("content-type", "application/json")
            .header("x-nf-provider", candidate.id.to_string())
            .body(Body::from(text))
            .unwrap_or_else(|_| err(StatusCode::BAD_GATEWAY, "respons provider tidak valid"));
    }

    state
        .usage
        .push(UsageEvent {
            api_key_id: Some(ctx.id),
            provider_id: None,
            model,
            prompt_tokens: 0,
            completion_tokens: 0,
            latency_ms: 0,
            status_code: 503,
            multiplier: 1.0,
        })
        .await;

    err(StatusCode::SERVICE_UNAVAILABLE, &last_error)
}

pub async fn list_models(State(state): State<AppState>, ApiKeyUser(_): ApiKeyUser) -> Response {
    let rows: Vec<(String,)> = match sqlx::query_as(
        "SELECT DISTINCT m.model FROM provider_models m \
         JOIN providers p ON p.id = m.provider_id \
         WHERE p.enabled = 1 AND m.enabled = 1 ORDER BY m.model",
    )
    .fetch_all(&state.pool)
    .await
    {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("list model gagal: {e}");
            return err(StatusCode::INTERNAL_SERVER_ERROR, "kesalahan internal");
        }
    };

    let data: Vec<Value> = rows
        .into_iter()
        .map(|(id,)| id)
        .map(|id| serde_json::json!({ "id": id, "object": "model", "owned_by": "neuroforge" }))
        .collect();

    Json(serde_json::json!({ "object": "list", "data": data })).into_response()
}

fn parse_usage(line: &str) -> Option<(u32, u32)> {
    let data = line.strip_prefix("data:")?.trim();
    if data.is_empty() || data == "[DONE]" {
        return None;
    }

    let v: Value = serde_json::from_str(data).ok()?;
    let usage = v.get("usage")?;
    if usage.is_null() {
        return None;
    }

    let prompt = usage.get("prompt_tokens").and_then(|x| x.as_u64()).unwrap_or(0) as u32;
    let completion = usage.get("completion_tokens").and_then(|x| x.as_u64()).unwrap_or(0) as u32;

    if prompt == 0 && completion == 0 {
        return None;
    }
    Some((prompt, completion))
}

fn count_stream<S>(
    upstream: S,
    recorder: crate::usage::UsageRecorder,
    template: UsageEvent,
) -> impl futures_util::Stream<Item = Result<axum::body::Bytes, std::io::Error>>
where
    S: futures_util::Stream<Item = reqwest::Result<axum::body::Bytes>> + Send + 'static,
{
    use futures_util::StreamExt;

    let state = std::sync::Arc::new(tokio::sync::Mutex::new((String::new(), 0u32, 0u32, 0u32)));
    let finaliser = state.clone();

    let body = upstream.map(move |chunk| {
        let state = state.clone();
        match chunk {
            Ok(bytes) => {
                if let Ok(text) = std::str::from_utf8(&bytes) {
                    let owned = text.to_owned();
                    let st = state.clone();
                    tokio::spawn(async move {
                        let mut guard = st.lock().await;
                        guard.0.push_str(&owned);

                        while let Some(pos) = guard.0.find('\n') {
                            let line: String = guard.0.drain(..=pos).collect();
                            let line = line.trim().to_owned();
                            if line.starts_with("data:") {
                                guard.3 += 1;
                                if let Some((p, c)) = parse_usage(&line) {
                                    guard.1 = guard.1.max(p);
                                    guard.2 = guard.2.max(c);
                                }
                            }
                        }

                        if guard.0.len() > 64 * 1024 {
                            guard.0.clear();
                        }
                    });
                }
                Ok(bytes)
            }
            Err(e) => Err(std::io::Error::new(std::io::ErrorKind::Other, e.to_string())),
        }
    });

    let recorder2 = recorder.clone();
    let tmpl = template.clone();

    body.chain(futures_util::stream::once(async move {
        tokio::time::sleep(std::time::Duration::from_millis(60)).await;
        let guard = finaliser.lock().await;
        let (_, prompt, completion, chunks) = &*guard;

        let mut event = tmpl;
        event.prompt_tokens = *prompt;
        event.completion_tokens = if *completion > 0 { *completion } else { *chunks };
        recorder2.push(event).await;

        Ok(axum::body::Bytes::new())
    }))
}
