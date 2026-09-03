use axum::extract::{Path, State};
use axum::http::StatusCode;
use axum::Json;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use sqlx::FromRow;

use crate::auth::AdminUser;
use crate::crypto::key_hint;
use crate::error::ApiError;
use crate::routes::AppState;
use crate::urlguard::validate_base_url;

#[derive(Serialize, FromRow)]
pub struct ProviderRow {
    pub id: u64,
    pub name: String,
    pub slug: String,
    pub base_url: String,
    pub enabled: i8,
    pub priority: i32,
    pub models: Option<Value>,
    pub last_error: Option<String>,
}

#[derive(Serialize, FromRow)]
pub struct ProviderKeyRow {
    pub id: u64,
    pub provider_id: u64,
    pub label: String,
    pub key_hint: String,
    pub enabled: i8,
}

#[derive(Serialize, FromRow, Clone)]
pub struct ModelRow {
    pub id: u64,
    pub provider_id: u64,
    pub model: String,
    pub enabled: i8,
    pub multiplier: f64,
}

#[derive(Serialize)]
pub struct ProviderDetail {
    #[serde(flatten)]
    pub provider: ProviderRow,
    pub keys: Vec<ProviderKeyRow>,
    pub model_list: Vec<ModelRow>,
}

#[derive(Deserialize)]
pub struct CreateProviderBody {
    pub name: String,
    pub base_url: String,
    pub api_key: String,
    pub key_label: Option<String>,
    pub priority: Option<i32>,
}

fn slugify(name: &str) -> String {
    let slug: String = name
        .trim()
        .to_lowercase()
        .chars()
        .map(|c| if c.is_ascii_alphanumeric() { c } else { '-' })
        .collect();

    slug.split('-').filter(|s| !s.is_empty()).collect::<Vec<_>>().join("-")
}

async fn fetch_models(state: &AppState, base_url: &str, api_key: &str) -> Result<Vec<String>, String> {
    let res = state
        .http
        .get(format!("{base_url}/models"))
        .bearer_auth(api_key)
        .send()
        .await
        .map_err(|e| {
            if e.is_timeout() {
                "provider timeout".to_string()
            } else {
                "tidak dapat menghubungi provider".to_string()
            }
        })?;

    let status = res.status();
    if !status.is_success() {
        return Err(match status.as_u16() {
            401 | 403 => "API key ditolak provider".into(),
            404 => "endpoint /models tidak ditemukan, periksa base URL".into(),
            429 => "provider membatasi rate".into(),
            code => format!("provider mengembalikan HTTP {code}"),
        });
    }

    let body: Value = res.json().await.map_err(|_| "respons provider bukan JSON".to_string())?;

    let models: Vec<String> = body
        .get("data")
        .and_then(|d| d.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|m| m.get("id").and_then(|v| v.as_str()).map(str::to_owned))
                .collect()
        })
        .unwrap_or_default();

    if models.is_empty() {
        return Err("provider tidak mengembalikan daftar model".into());
    }

    Ok(models)
}

async fn sync_models(
    pool: &sqlx::MySqlPool,
    provider_id: u64,
    models: &[String],
) -> Result<(), sqlx::Error> {
    if models.is_empty() {
        return Ok(());
    }

    let placeholders = vec!["(?, ?)"; models.len()].join(", ");
    let sql = format!(
        "INSERT INTO provider_models (provider_id, model) VALUES {placeholders} \
         ON DUPLICATE KEY UPDATE model = VALUES(model)"
    );

    let mut q = sqlx::query(&sql);
    for m in models {
        q = q.bind(provider_id).bind(m);
    }
    q.execute(pool).await?;

    Ok(())
}

pub async fn list_providers(
    State(state): State<AppState>,
    AdminUser(_): AdminUser,
) -> Result<Json<Vec<ProviderDetail>>, ApiError> {
    let providers = sqlx::query_as::<_, ProviderRow>(
        "SELECT id, name, slug, base_url, enabled, priority, models, last_error \
         FROM providers ORDER BY priority, id",
    )
    .fetch_all(&state.pool)
    .await?;

    let keys = sqlx::query_as::<_, ProviderKeyRow>(
        "SELECT id, provider_id, label, key_hint, enabled FROM provider_keys ORDER BY id",
    )
    .fetch_all(&state.pool)
    .await?;

    let model_rows = sqlx::query_as::<_, ModelRow>(
        "SELECT id, provider_id, model, enabled, CAST(multiplier AS DOUBLE) AS multiplier FROM provider_models ORDER BY model",
    )
    .fetch_all(&state.pool)
    .await?;

    let detail = providers
        .into_iter()
        .map(|p| {
            let owned = keys.iter().filter(|k| k.provider_id == p.id);
            ProviderDetail {
                model_list: model_rows.iter().filter(|m| m.provider_id == p.id).cloned().collect(),
                keys: owned
                    .map(|k| ProviderKeyRow {
                        id: k.id,
                        provider_id: k.provider_id,
                        label: k.label.clone(),
                        key_hint: k.key_hint.clone(),
                        enabled: k.enabled,
                    })
                    .collect(),
                provider: p,
            }
        })
        .collect();

    Ok(Json(detail))
}

pub async fn create_provider(
    State(state): State<AppState>,
    AdminUser(_): AdminUser,
    Json(body): Json<CreateProviderBody>,
) -> Result<(StatusCode, Json<Value>), ApiError> {
    let name = body.name.trim();
    if name.is_empty() || name.chars().count() > 80 {
        return Err(ApiError::new(StatusCode::BAD_REQUEST, "nama provider 1-80 karakter"));
    }

    let api_key = body.api_key.trim();
    if api_key.is_empty() || api_key.len() > 400 {
        return Err(ApiError::new(StatusCode::BAD_REQUEST, "API key provider wajib diisi"));
    }

    let base_url = validate_base_url(&body.base_url, state.allow_private_upstream)
        .map_err(|e| ApiError::new(StatusCode::BAD_REQUEST, e))?;

    let slug = slugify(name);
    if slug.is_empty() {
        return Err(ApiError::new(StatusCode::BAD_REQUEST, "nama provider tidak valid"));
    }

    let models = fetch_models(&state, &base_url, api_key)
        .await
        .map_err(|e| ApiError::new(StatusCode::BAD_GATEWAY, e))?;

    let (cipher, nonce) = state.cipher.encrypt(api_key)?;

    let mut tx = state.pool.begin().await?;

    let insert = sqlx::query(
        "INSERT INTO providers (name, slug, base_url, priority, models, last_checked_at) \
         VALUES (?, ?, ?, ?, ?, NOW())",
    )
    .bind(name)
    .bind(&slug)
    .bind(&base_url)
    .bind(body.priority.unwrap_or(100))
    .bind(serde_json::to_string(&models).unwrap_or_else(|_| "[]".into()))
    .execute(&mut *tx)
    .await;

    let provider_id = match insert {
        Ok(r) => r.last_insert_id(),
        Err(sqlx::Error::Database(e)) if e.is_unique_violation() => {
            return Err(ApiError::new(StatusCode::CONFLICT, "provider dengan nama itu sudah ada"))
        }
        Err(e) => return Err(e.into()),
    };

    sqlx::query(
        "INSERT INTO provider_keys (provider_id, label, key_cipher, key_nonce, key_hint) \
         VALUES (?, ?, ?, ?, ?)",
    )
    .bind(provider_id)
    .bind(body.key_label.as_deref().unwrap_or("utama").trim())
    .bind(&cipher)
    .bind(&nonce)
    .bind(key_hint(api_key))
    .execute(&mut *tx)
    .await?;

    tx.commit().await?;

    sync_models(&state.pool, provider_id, &models).await?;

    Ok((
        StatusCode::CREATED,
        Json(serde_json::json!({ "id": provider_id, "slug": slug, "models": models })),
    ))
}

#[derive(Deserialize)]
pub struct AddKeyBody {
    pub api_key: String,
    pub label: Option<String>,
}

pub async fn add_provider_key(
    State(state): State<AppState>,
    AdminUser(_): AdminUser,
    Path(provider_id): Path<u64>,
    Json(body): Json<AddKeyBody>,
) -> Result<(StatusCode, Json<Value>), ApiError> {
    let api_key = body.api_key.trim();
    if api_key.is_empty() || api_key.len() > 400 {
        return Err(ApiError::new(StatusCode::BAD_REQUEST, "API key wajib diisi"));
    }

    let base_url: Option<String> = sqlx::query_scalar("SELECT base_url FROM providers WHERE id = ?")
        .bind(provider_id)
        .fetch_optional(&state.pool)
        .await?;

    let base_url = base_url.ok_or_else(|| ApiError::new(StatusCode::NOT_FOUND, "provider tidak ditemukan"))?;

    fetch_models(&state, &base_url, api_key)
        .await
        .map_err(|e| ApiError::new(StatusCode::BAD_GATEWAY, e))?;

    let (cipher, nonce) = state.cipher.encrypt(api_key)?;

    let res = sqlx::query(
        "INSERT INTO provider_keys (provider_id, label, key_cipher, key_nonce, key_hint) \
         VALUES (?, ?, ?, ?, ?)",
    )
    .bind(provider_id)
    .bind(body.label.as_deref().unwrap_or("tambahan").trim())
    .bind(&cipher)
    .bind(&nonce)
    .bind(key_hint(api_key))
    .execute(&state.pool)
    .await?;

    Ok((StatusCode::CREATED, Json(serde_json::json!({ "id": res.last_insert_id() }))))
}

pub async fn test_provider(
    State(state): State<AppState>,
    AdminUser(_): AdminUser,
    Path(provider_id): Path<u64>,
) -> Result<Json<Value>, ApiError> {
    let row: Option<(String,)> = sqlx::query_as("SELECT base_url FROM providers WHERE id = ?")
        .bind(provider_id)
        .fetch_optional(&state.pool)
        .await?;

    let (base_url,) = row.ok_or_else(|| ApiError::new(StatusCode::NOT_FOUND, "provider tidak ditemukan"))?;

    let key = state.pick_key(provider_id).await?;
    let started = std::time::Instant::now();
    let result = fetch_models(&state, &base_url, &key.secret).await;
    let latency = started.elapsed().as_millis();

    match result {
        Ok(models) => {
            sqlx::query(
                "UPDATE providers SET models = ?, last_checked_at = NOW(), last_error = NULL WHERE id = ?",
            )
            .bind(serde_json::to_string(&models).unwrap_or_else(|_| "[]".into()))
            .bind(provider_id)
            .execute(&state.pool)
            .await?;

            sync_models(&state.pool, provider_id, &models).await?;

            Ok(Json(serde_json::json!({
                "ok": true,
                "latency_ms": latency,
                "model_count": models.len(),
                "models": models,
            })))
        }
        Err(msg) => {
            sqlx::query("UPDATE providers SET last_checked_at = NOW(), last_error = ? WHERE id = ?")
                .bind(&msg)
                .bind(provider_id)
                .execute(&state.pool)
                .await?;

            Ok(Json(serde_json::json!({ "ok": false, "latency_ms": latency, "error": msg })))
        }
    }
}

#[derive(Deserialize)]
pub struct PatchProviderBody {
    pub enabled: Option<bool>,
    pub priority: Option<i32>,
}

pub async fn patch_provider(
    State(state): State<AppState>,
    AdminUser(_): AdminUser,
    Path(provider_id): Path<u64>,
    Json(body): Json<PatchProviderBody>,
) -> Result<StatusCode, ApiError> {
    if body.enabled.is_none() && body.priority.is_none() {
        return Err(ApiError::new(StatusCode::BAD_REQUEST, "tidak ada perubahan"));
    }

    let res = sqlx::query(
        "UPDATE providers SET enabled = COALESCE(?, enabled), priority = COALESCE(?, priority) WHERE id = ?",
    )
    .bind(body.enabled.map(|v| v as i8))
    .bind(body.priority)
    .bind(provider_id)
    .execute(&state.pool)
    .await?;

    if res.rows_affected() == 0 {
        return Err(ApiError::new(StatusCode::NOT_FOUND, "provider tidak ditemukan"));
    }

    Ok(StatusCode::NO_CONTENT)
}

pub async fn delete_provider(
    State(state): State<AppState>,
    AdminUser(_): AdminUser,
    Path(provider_id): Path<u64>,
) -> Result<StatusCode, ApiError> {
    let res = sqlx::query("DELETE FROM providers WHERE id = ?")
        .bind(provider_id)
        .execute(&state.pool)
        .await?;

    if res.rows_affected() == 0 {
        return Err(ApiError::new(StatusCode::NOT_FOUND, "provider tidak ditemukan"));
    }

    Ok(StatusCode::NO_CONTENT)
}

#[derive(Deserialize)]
pub struct PatchModelBody {
    pub enabled: Option<bool>,
    /// Bobot biaya token model ini; 0.01–100. None = tidak diubah.
    pub multiplier: Option<f64>,
}

pub async fn patch_model(
    State(state): State<AppState>,
    AdminUser(_): AdminUser,
    Path((provider_id, model_id)): Path<(u64, u64)>,
    Json(body): Json<PatchModelBody>,
) -> Result<StatusCode, ApiError> {
    if body.enabled.is_none() && body.multiplier.is_none() {
        return Err(ApiError::new(StatusCode::BAD_REQUEST, "tidak ada perubahan"));
    }

    if let Some(m) = body.multiplier {
        if !(0.01..=100.0).contains(&m) {
            return Err(ApiError::new(StatusCode::BAD_REQUEST, "multiplier harus 0.01–100"));
        }
    }

    let res = sqlx::query(
        "UPDATE provider_models SET enabled = COALESCE(?, enabled), multiplier = COALESCE(?, multiplier) \
         WHERE id = ? AND provider_id = ?",
    )
    .bind(body.enabled.map(|v| v as i8))
    .bind(body.multiplier)
    .bind(model_id)
    .bind(provider_id)
    .execute(&state.pool)
    .await?;

    if res.rows_affected() == 0 {
        return Err(ApiError::new(StatusCode::NOT_FOUND, "model tidak ditemukan"));
    }

    Ok(StatusCode::NO_CONTENT)
}

#[derive(Deserialize)]
pub struct BulkModelBody {
    pub enabled: bool,
}

pub async fn bulk_models(
    State(state): State<AppState>,
    AdminUser(_): AdminUser,
    Path(provider_id): Path<u64>,
    Json(body): Json<BulkModelBody>,
) -> Result<StatusCode, ApiError> {
    sqlx::query("UPDATE provider_models SET enabled = ? WHERE provider_id = ?")
        .bind(body.enabled as i8)
        .bind(provider_id)
        .execute(&state.pool)
        .await?;

    Ok(StatusCode::NO_CONTENT)
}
