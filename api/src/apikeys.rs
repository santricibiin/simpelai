use axum::extract::{Path, Query, State};
use axum::http::StatusCode;
use axum::Json;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use sqlx::FromRow;

use crate::auth::{AdminUser, AuthUser};
use crate::crypto::{generate_api_key, sha256_hex};
use crate::error::ApiError;
use crate::routes::AppState;

#[derive(Serialize, FromRow)]
pub struct ApiKeyRow {
    pub id: u64,
    pub name: String,
    pub key_prefix: String,
    pub revoked: i8,
    pub rpm_limit: i32,
    pub tokens_used: u64,
    pub tokens_in: u64,
    pub tokens_out: u64,
    pub token_quota: Option<u64>,
    pub requests: i64,
    pub avg_latency_ms: i64,
}

#[derive(Deserialize)]
pub struct CreateKeyBody {
    pub name: String,
    pub rpm_limit: Option<i32>,
    pub token_quota: Option<u64>,
}

pub async fn list_keys(
    State(state): State<AppState>,
    AuthUser(claims): AuthUser,
) -> Result<Json<Vec<ApiKeyRow>>, ApiError> {
    let user_id: u64 = claims.sub.parse().unwrap_or(0);

    let rows = sqlx::query_as::<_, ApiKeyRow>(
        "SELECT k.id, k.name, k.key_prefix, k.revoked, k.rpm_limit, k.tokens_used, k.tokens_in, \
                k.tokens_out, k.token_quota, \
                CAST(COUNT(e.id) AS SIGNED) AS requests, \
                CAST(COALESCE(AVG(NULLIF(e.latency_ms, 0)), 0) AS SIGNED) AS avg_latency_ms \
         FROM api_keys k LEFT JOIN usage_events e ON e.api_key_id = k.id \
         WHERE k.user_id = ? GROUP BY k.id ORDER BY k.id DESC",
    )
    .bind(user_id)
    .fetch_all(&state.pool)
    .await?;

    Ok(Json(rows))
}

pub async fn create_key(
    State(state): State<AppState>,
    AuthUser(claims): AuthUser,
    Json(body): Json<CreateKeyBody>,
) -> Result<(StatusCode, Json<Value>), ApiError> {
    let user_id: u64 = claims.sub.parse().unwrap_or(0);
    let name = body.name.trim();

    if name.is_empty() || name.chars().count() > 60 {
        return Err(ApiError::new(StatusCode::BAD_REQUEST, "nama key 1-60 karakter"));
    }

    let existing: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM api_keys WHERE user_id = ? AND revoked = 0")
        .bind(user_id)
        .fetch_one(&state.pool)
        .await?;

    if existing >= 20 {
        return Err(ApiError::new(StatusCode::CONFLICT, "maksimal 20 key aktif per akun"));
    }

    let rpm = body.rpm_limit.unwrap_or(60).clamp(1, 10_000);
    let (secret, prefix) = generate_api_key();

    let res = sqlx::query(
        "INSERT INTO api_keys (user_id, name, key_hash, key_prefix, rpm_limit, token_quota) \
         VALUES (?, ?, ?, ?, ?, ?)",
    )
    .bind(user_id)
    .bind(name)
    .bind(sha256_hex(&secret))
    .bind(&prefix)
    .bind(rpm)
    .bind(body.token_quota)
    .execute(&state.pool)
    .await?;

    Ok((
        StatusCode::CREATED,
        Json(serde_json::json!({
            "id": res.last_insert_id(),
            "name": name,
            "api_key": secret,
            "warning": "Key hanya ditampilkan sekali. Simpan sekarang.",
        })),
    ))
}

pub async fn revoke_key(
    State(state): State<AppState>,
    AuthUser(claims): AuthUser,
    Path(key_id): Path<u64>,
) -> Result<StatusCode, ApiError> {
    let user_id: u64 = claims.sub.parse().unwrap_or(0);

    let res = sqlx::query("UPDATE api_keys SET revoked = 1 WHERE id = ? AND user_id = ?")
        .bind(key_id)
        .bind(user_id)
        .execute(&state.pool)
        .await?;

    if res.rows_affected() == 0 {
        return Err(ApiError::new(StatusCode::NOT_FOUND, "key tidak ditemukan"));
    }

    Ok(StatusCode::NO_CONTENT)
}

#[derive(Deserialize)]
pub struct PatchKeyBody {
    pub token_quota: Option<u64>,
    pub rpm_limit: Option<i32>,
    pub reset_usage: Option<bool>,
}

pub async fn patch_key(
    State(state): State<AppState>,
    AuthUser(claims): AuthUser,
    Path(key_id): Path<u64>,
    Json(body): Json<PatchKeyBody>,
) -> Result<StatusCode, ApiError> {
    let user_id: u64 = claims.sub.parse().unwrap_or(0);
    let is_admin = claims.role == "admin";

    if body.token_quota.is_none() && body.rpm_limit.is_none() && body.reset_usage.is_none() {
        return Err(ApiError::new(StatusCode::BAD_REQUEST, "tidak ada perubahan"));
    }

    let rpm = body.rpm_limit.map(|v| v.clamp(1, 10_000));

    let sql = if is_admin {
        "UPDATE api_keys SET token_quota = COALESCE(?, token_quota), rpm_limit = COALESCE(?, rpm_limit), \
         tokens_used = IF(? = 1, 0, tokens_used), tokens_in = IF(? = 1, 0, tokens_in), \
         tokens_out = IF(? = 1, 0, tokens_out) WHERE id = ?"
    } else {
        "UPDATE api_keys SET token_quota = COALESCE(?, token_quota), rpm_limit = COALESCE(?, rpm_limit), \
         tokens_used = IF(? = 1, 0, tokens_used), tokens_in = IF(? = 1, 0, tokens_in), \
         tokens_out = IF(? = 1, 0, tokens_out) WHERE id = ? AND user_id = ?"
    };

    let reset = body.reset_usage.unwrap_or(false) as i8;

    let mut q = sqlx::query(sql)
        .bind(body.token_quota)
        .bind(rpm)
        .bind(reset)
        .bind(reset)
        .bind(reset)
        .bind(key_id);

    if !is_admin {
        q = q.bind(user_id);
    }

    if q.execute(&state.pool).await?.rows_affected() == 0 {
        return Err(ApiError::new(StatusCode::NOT_FOUND, "key tidak ditemukan"));
    }

    Ok(StatusCode::NO_CONTENT)
}

#[derive(Serialize, FromRow)]
pub struct LogRow {
    pub id: u64,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub model: String,
    pub prompt_tokens: u32,
    pub completion_tokens: u32,
    pub latency_ms: u32,
    pub status_code: u16,
    pub key_name: Option<String>,
    pub key_prefix: Option<String>,
    pub user_email: Option<String>,
    pub provider_name: Option<String>,
}

#[derive(Serialize)]
pub struct LogStats {
    pub total: i64,
    pub failed: i64,
    pub tokens: i64,
    pub p50_ms: i64,
    pub p95_ms: i64,
    pub avg_ms: i64,
}

#[derive(Serialize)]
pub struct LogsResponse {
    pub stats: LogStats,
    pub rows: Vec<LogRow>,
}

#[derive(Deserialize)]
pub struct LogQuery {
    pub limit: Option<i64>,
    pub key_id: Option<u64>,
    pub only_failed: Option<bool>,
}

pub async fn admin_logs(
    State(state): State<AppState>,
    AdminUser(_): AdminUser,
    Query(q): Query<LogQuery>,
) -> Result<Json<LogsResponse>, ApiError> {
    let limit = q.limit.unwrap_or(100).clamp(1, 500);
    let key_filter = q.key_id.map(|v| v as i64).unwrap_or(0);
    let only_failed = q.only_failed.unwrap_or(false) as i8;

    let rows = sqlx::query_as::<_, LogRow>(
        "SELECT e.id, e.created_at, e.model, e.prompt_tokens, e.completion_tokens, e.latency_ms, \
                e.status_code, k.name AS key_name, k.key_prefix, u.email AS user_email, p.name AS provider_name \
         FROM usage_events e \
         LEFT JOIN api_keys k ON k.id = e.api_key_id \
         LEFT JOIN users u ON u.id = k.user_id \
         LEFT JOIN providers p ON p.id = e.provider_id \
         WHERE (? = 0 OR e.api_key_id = ?) AND (? = 0 OR e.status_code >= 400) \
         ORDER BY e.id DESC LIMIT ?",
    )
    .bind(key_filter)
    .bind(key_filter)
    .bind(only_failed)
    .bind(limit)
    .fetch_all(&state.pool)
    .await?;

    let (total, failed, tokens, avg_ms): (i64, i64, i64, i64) = sqlx::query_as(
        "SELECT CAST(COUNT(*) AS SIGNED), \
                CAST(COALESCE(SUM(status_code >= 400), 0) AS SIGNED), \
                CAST(COALESCE(SUM(prompt_tokens + completion_tokens), 0) AS SIGNED), \
                CAST(COALESCE(AVG(latency_ms), 0) AS SIGNED) \
         FROM usage_events WHERE created_at >= NOW() - INTERVAL 24 HOUR",
    )
    .fetch_one(&state.pool)
    .await?;

    let mut lat: Vec<i64> = sqlx::query_scalar(
        "SELECT CAST(latency_ms AS SIGNED) FROM usage_events \
         WHERE created_at >= NOW() - INTERVAL 24 HOUR AND latency_ms > 0 ORDER BY latency_ms",
    )
    .fetch_all(&state.pool)
    .await?;

    lat.sort_unstable();
    let pick = |frac: f64| -> i64 {
        if lat.is_empty() {
            return 0;
        }
        let idx = ((lat.len() as f64 - 1.0) * frac).round() as usize;
        lat[idx.min(lat.len() - 1)]
    };

    Ok(Json(LogsResponse {
        stats: LogStats { total, failed, tokens, p50_ms: pick(0.5), p95_ms: pick(0.95), avg_ms },
        rows,
    }))
}
