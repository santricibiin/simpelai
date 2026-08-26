mod auth;
mod db;
mod error;
mod handlers;
mod routes;

use std::env;
use std::time::Instant;

use axum::http::{HeaderValue, Method};
use tokio::net::TcpListener;
use tower_http::cors::CorsLayer;
use tower_http::trace::TraceLayer;

use routes::AppState;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenvy::dotenv().ok();
    tracing_subscriber::fmt().with_env_filter("info").init();

    let database_url = env::var("DATABASE_URL")?;
    let jwt_secret = env::var("JWT_SECRET")?;
    if jwt_secret.len() < 32 {
        anyhow::bail!("JWT_SECRET minimal 32 karakter");
    }
    let origin = env::var("WEB_ORIGIN").unwrap_or_else(|_| "http://localhost:3000".into());
    let addr = env::var("BIND_ADDR").unwrap_or_else(|_| "0.0.0.0:8080".into());

    let pool = db::connect(&database_url).await?;

    let cors = CorsLayer::new()
        .allow_origin(origin.parse::<HeaderValue>()?)
        .allow_methods([Method::GET, Method::POST])
        .allow_headers([axum::http::header::AUTHORIZATION, axum::http::header::CONTENT_TYPE]);

    let app = routes::router(AppState { pool, started: Instant::now(), jwt_secret })
        .layer(cors)
        .layer(TraceLayer::new_for_http());

    let listener = TcpListener::bind(&addr).await?;
    tracing::info!("listening on {addr}");
    axum::serve(listener, app).await?;

    Ok(())
}
