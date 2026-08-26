use axum::extract::FromRequestParts;
use axum::http::header::AUTHORIZATION;
use axum::http::request::Parts;
use axum::http::StatusCode;
use axum::async_trait;
use serde_json::Value;
use sqlx::FromRow;

use crate::crypto::sha256_hex;
use crate::error::ApiError;
use crate::routes::AppState;

#[derive(FromRow)]
pub struct ApiKeyContext {
    pub id: u64,
    #[allow(dead_code)]
    pub user_id: u64,
    pub rpm_limit: i32,
    pub token_quota: Option<u64>,
    pub tokens_used: u64,
}

pub struct ApiKeyUser(pub ApiKeyContext);

#[async_trait]
impl FromRequestParts<AppState> for ApiKeyUser {
    type Rejection = ApiError;

    async fn from_request_parts(parts: &mut Parts, state: &AppState) -> Result<Self, Self::Rejection> {
        let raw = parts
            .headers
            .get(AUTHORIZATION)
            .and_then(|v| v.to_str().ok())
            .and_then(|v| v.strip_prefix("Bearer "))
            .map(str::trim)
            .filter(|v| !v.is_empty())
            .ok_or_else(|| ApiError::new(StatusCode::UNAUTHORIZED, "header Authorization: Bearer wajib ada"))?;

        let ctx = sqlx::query_as::<_, ApiKeyContext>(
            "SELECT k.id, k.user_id, k.rpm_limit, k.token_quota, k.tokens_used \
             FROM api_keys k JOIN users u ON u.id = k.user_id \
             WHERE k.key_hash = ? AND k.revoked = 0 AND u.is_active = 1 LIMIT 1",
        )
        .bind(sha256_hex(raw))
        .fetch_optional(&state.pool)
        .await?
        .ok_or_else(|| ApiError::new(StatusCode::UNAUTHORIZED, "API key tidak valid"))?;

        if let Some(quota) = ctx.token_quota {
            if ctx.tokens_used >= quota {
                return Err(ApiError::new(
                    StatusCode::PAYMENT_REQUIRED,
                    format!(
                        "kuota token habis: {} dari {} token terpakai. Hubungi admin untuk menambah kuota.",
                        ctx.tokens_used, quota
                    ),
                ));
            }
        }

        if !state.limiter.allow(ctx.id, ctx.rpm_limit.max(1) as u32).await {
            return Err(ApiError::new(StatusCode::TOO_MANY_REQUESTS, "melebihi rate limit"));
        }

        Ok(ApiKeyUser(ctx))
    }
}

pub fn extract_model(body: &Value) -> Result<String, ApiError> {
    body.get("model")
        .and_then(|m| m.as_str())
        .map(str::trim)
        .filter(|m| !m.is_empty() && m.len() <= 96)
        .map(str::to_owned)
        .ok_or_else(|| ApiError::new(StatusCode::BAD_REQUEST, "field 'model' wajib ada"))
}

pub fn wants_stream(body: &Value) -> bool {
    body.get("stream").and_then(|v| v.as_bool()).unwrap_or(false)
}
