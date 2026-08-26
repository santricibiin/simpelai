mod apikeys;
mod auth;
mod crypto;
mod db;
mod error;
mod gateway;
mod gatewayauth;
mod handlers;
mod providers;
mod ratelimit;
mod routes;
mod urlguard;
mod usage;

use std::env;
use std::time::{Duration, Instant};

use axum::http::{HeaderValue, Method};
use tokio::net::TcpListener;
use tower_http::cors::CorsLayer;
use tower_http::trace::TraceLayer;

use crypto::Cipher;
use ratelimit::RateLimiter;
use routes::AppState;
use usage::UsageRecorder;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenvy::dotenv().ok();
    tracing_subscriber::fmt().with_env_filter("info").init();

    let database_url = env::var("DATABASE_URL")?;
    let jwt_secret = env::var("JWT_SECRET")?;
    if jwt_secret.len() < 32 {
        anyhow::bail!("JWT_SECRET minimal 32 karakter");
    }

    let cipher = Cipher::from_env_key(&env::var("ENCRYPTION_KEY")?)?;
    let origin = env::var("WEB_ORIGIN").unwrap_or_else(|_| "http://localhost:3000".into());
    let addr = env::var("BIND_ADDR").unwrap_or_else(|_| "0.0.0.0:8080".into());
    let allow_private_upstream = env::var("ALLOW_PRIVATE_UPSTREAM").is_ok_and(|v| v == "true");

    if allow_private_upstream {
        tracing::warn!("ALLOW_PRIVATE_UPSTREAM aktif: proteksi SSRF dilonggarkan, jangan pakai di produksi");
    }

    let pool = db::connect(&database_url).await?;

    let http = reqwest::Client::builder()
        .connect_timeout(Duration::from_secs(10))
        .timeout(Duration::from_secs(300))
        .pool_max_idle_per_host(32)
        .redirect(reqwest::redirect::Policy::none())
        .build()?;

    let state = AppState {
        usage: UsageRecorder::start(pool.clone()),
        limiter: RateLimiter::new(),
        pool,
        started: Instant::now(),
        jwt_secret,
        cipher,
        http,
        allow_private_upstream,
    };

    let cors = CorsLayer::new()
        .allow_origin(origin.parse::<HeaderValue>()?)
        .allow_methods([Method::GET, Method::POST, Method::PATCH, Method::DELETE])
        .allow_headers([axum::http::header::AUTHORIZATION, axum::http::header::CONTENT_TYPE]);

    let app = routes::router(state).layer(cors).layer(TraceLayer::new_for_http());

    let listener = TcpListener::bind(&addr).await?;
    tracing::info!("listening on {addr}");
    axum::serve(listener, app).await?;

    Ok(())
}
