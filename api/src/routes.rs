use std::time::Instant;

use axum::extract::State;
use axum::http::StatusCode;
use axum::routing::{delete, get, patch, post};
use axum::{Json, Router};
use serde::Serialize;
use sqlx::FromRow;
use sqlx::MySqlPool;

use crate::crypto::Cipher;
use crate::error::ApiError;
use crate::ratelimit::RateLimiter;
use crate::usage::UsageRecorder;
use crate::{apikeys, gateway, handlers, providers};

#[derive(Clone)]
pub struct AppState {
    pub pool: MySqlPool,
    pub started: Instant,
    pub jwt_secret: String,
    pub cipher: Cipher,
    pub http: reqwest::Client,
    pub usage: UsageRecorder,
    pub limiter: RateLimiter,
    pub allow_private_upstream: bool,
}

#[derive(FromRow)]
struct KeyRow {
    id: u64,
    key_cipher: Vec<u8>,
    key_nonce: Vec<u8>,
}

pub struct ResolvedKey {
    pub id: u64,
    pub secret: String,
}

impl AppState {
    pub async fn pick_key(&self, provider_id: u64) -> Result<ResolvedKey, ApiError> {
        let row = sqlx::query_as::<_, KeyRow>(
            "SELECT id, key_cipher, key_nonce FROM provider_keys \
             WHERE provider_id = ? AND enabled = 1 AND (cooldown_until IS NULL OR cooldown_until < NOW()) \
             ORDER BY RAND() LIMIT 1",
        )
        .bind(provider_id)
        .fetch_optional(&self.pool)
        .await?
        .ok_or_else(|| ApiError::new(StatusCode::SERVICE_UNAVAILABLE, "tidak ada key aktif untuk provider"))?;

        let secret = self.cipher.decrypt(&row.key_cipher, &row.key_nonce)?;
        Ok(ResolvedKey { id: row.id, secret })
    }

    pub async fn cooldown_key(&self, key_id: u64, seconds: u32) {
        let _ = sqlx::query("UPDATE provider_keys SET cooldown_until = DATE_ADD(NOW(), INTERVAL ? SECOND) WHERE id = ?")
            .bind(seconds)
            .bind(key_id)
            .execute(&self.pool)
            .await;
    }
}

#[derive(Serialize)]
pub struct Status {
    service: &'static str,
    version: &'static str,
    database: &'static str,
    uptime_seconds: u64,
    latency_ms: u128,
}

pub fn router(state: AppState) -> Router {
    let dashboard = Router::new()
        .route("/api/status", get(status))
        .route("/api/health", get(|| async { StatusCode::NO_CONTENT }))
        .route("/api/auth/login", post(handlers::login))
        .route("/api/auth/me", get(handlers::me))
        .route("/api/admin/stats", get(handlers::admin_stats))
        .route("/api/settings", get(handlers::get_settings))
        .route("/api/admin/settings", post(handlers::update_settings))
        .route(
            "/api/admin/providers",
            get(providers::list_providers).post(providers::create_provider),
        )
        .route("/api/admin/providers/:id", patch(providers::patch_provider))
        .route("/api/admin/providers/:id", delete(providers::delete_provider))
        .route("/api/admin/providers/:id/test", post(providers::test_provider))
        .route("/api/admin/providers/:id/keys", post(providers::add_provider_key))
        .route("/api/admin/providers/:id/models", patch(providers::bulk_models))
        .route("/api/admin/providers/:pid/models/:mid", patch(providers::patch_model))
        .route("/api/keys", get(apikeys::list_keys).post(apikeys::create_key))
        .route("/api/keys/:id", delete(apikeys::revoke_key).patch(apikeys::patch_key))
        .route("/api/admin/logs", get(apikeys::admin_logs));

    let v1 = Router::new()
        .route("/v1/chat/completions", post(gateway::chat_completions))
        .route("/v1/models", get(gateway::list_models));

    dashboard.merge(v1).with_state(state)
}

async fn status(State(state): State<AppState>) -> (StatusCode, Json<Status>) {
    let probe = Instant::now();
    let up = crate::db::ping(&state.pool).await;

    let body = Status {
        service: "neuroforge-api",
        version: env!("CARGO_PKG_VERSION"),
        database: if up { "up" } else { "down" },
        uptime_seconds: state.started.elapsed().as_secs(),
        latency_ms: probe.elapsed().as_millis(),
    };

    let code = if up { StatusCode::OK } else { StatusCode::SERVICE_UNAVAILABLE };
    (code, Json(body))
}
