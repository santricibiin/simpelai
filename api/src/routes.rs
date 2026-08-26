use std::time::Instant;

use axum::extract::State;
use axum::http::StatusCode;
use axum::routing::{get, post};
use axum::{Json, Router};
use serde::Serialize;
use sqlx::MySqlPool;

use crate::handlers;

#[derive(Clone)]
pub struct AppState {
    pub pool: MySqlPool,
    pub started: Instant,
    pub jwt_secret: String,
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
    Router::new()
        .route("/api/status", get(status))
        .route("/api/health", get(|| async { StatusCode::NO_CONTENT }))
        .route("/api/auth/login", post(handlers::login))
        .route("/api/auth/me", get(handlers::me))
        .route("/api/admin/stats", get(handlers::admin_stats))
        .route("/api/settings", get(handlers::get_settings))
        .route("/api/admin/settings", post(handlers::update_settings))
        .with_state(state)
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
