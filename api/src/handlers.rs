use axum::extract::State;
use axum::http::StatusCode;
use axum::Json;
use chrono::NaiveDate;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

use crate::auth::{issue_token, verify_password, AdminUser, AuthUser};
use crate::error::ApiError;
use crate::routes::AppState;

#[derive(Deserialize)]
pub struct LoginBody {
    pub email: String,
    pub password: String,
}

#[derive(Serialize)]
pub struct Profile {
    pub id: u64,
    pub email: String,
    pub name: String,
    pub role: String,
}

#[derive(Serialize)]
pub struct LoginResponse {
    pub token: String,
    pub expires_in: i64,
    pub user: Profile,
}

#[derive(FromRow)]
struct UserRow {
    id: u64,
    email: String,
    name: String,
    password_hash: String,
    role: String,
    is_active: i8,
}

pub async fn login(
    State(state): State<AppState>,
    Json(body): Json<LoginBody>,
) -> Result<Json<LoginResponse>, ApiError> {
    let email = body.email.trim().to_lowercase();
    if email.is_empty() || body.password.is_empty() {
        return Err(ApiError::new(StatusCode::BAD_REQUEST, "email dan password wajib diisi"));
    }

    let invalid = || ApiError::new(StatusCode::UNAUTHORIZED, "email atau password salah");

    let row = sqlx::query_as::<_, UserRow>(
        "SELECT id, email, name, password_hash, role, is_active FROM users WHERE email = ? LIMIT 1",
    )
    .bind(&email)
    .fetch_optional(&state.pool)
    .await?
    .ok_or_else(invalid)?;

    if !verify_password(&body.password, &row.password_hash) {
        return Err(invalid());
    }
    if row.is_active == 0 {
        return Err(ApiError::new(StatusCode::FORBIDDEN, "akun dinonaktifkan"));
    }

    let ttl_hours = 8;
    let token = issue_token(&state.jwt_secret, row.id, &row.email, &row.role, ttl_hours)?;

    Ok(Json(LoginResponse {
        token,
        expires_in: ttl_hours * 3600,
        user: Profile { id: row.id, email: row.email, name: row.name, role: row.role },
    }))
}

pub async fn me(State(state): State<AppState>, AuthUser(claims): AuthUser) -> Result<Json<Profile>, ApiError> {
    let row = sqlx::query_as::<_, UserRow>(
        "SELECT id, email, name, password_hash, role, is_active FROM users WHERE id = ? LIMIT 1",
    )
    .bind(claims.sub.parse::<u64>().unwrap_or(0))
    .fetch_optional(&state.pool)
    .await?
    .ok_or_else(|| ApiError::new(StatusCode::UNAUTHORIZED, "user tidak ditemukan"))?;

    Ok(Json(Profile { id: row.id, email: row.email, name: row.name, role: row.role }))
}

#[derive(Serialize, FromRow)]
pub struct SeriesPoint {
    pub day: NaiveDate,
    pub tokens: i64,
    pub requests: i64,
    pub revenue_cents: i64,
}

#[derive(Serialize, FromRow)]
pub struct ModelSlice {
    pub model: String,
    pub tokens: i64,
}

#[derive(Serialize, FromRow)]
pub struct RecentUser {
    pub id: u64,
    pub email: String,
    pub name: String,
    pub role: String,
    pub is_active: i8,
}

#[derive(Serialize)]
pub struct Kpis {
    pub tokens_30d: i64,
    pub requests_30d: i64,
    pub revenue_cents_30d: i64,
    pub total_users: i64,
    pub active_users: i64,
}

#[derive(Serialize)]
pub struct AdminStats {
    pub kpis: Kpis,
    pub series: Vec<SeriesPoint>,
    pub by_model: Vec<ModelSlice>,
    pub recent_users: Vec<RecentUser>,
}

pub async fn admin_stats(
    State(state): State<AppState>,
    AdminUser(_): AdminUser,
) -> Result<Json<AdminStats>, ApiError> {
    let series = sqlx::query_as::<_, SeriesPoint>(
        "SELECT day, CAST(SUM(tokens) AS SIGNED) AS tokens, CAST(SUM(requests) AS SIGNED) AS requests, \
         CAST(SUM(revenue_cents) AS SIGNED) AS revenue_cents \
         FROM usage_daily WHERE day >= CURDATE() - INTERVAL 29 DAY GROUP BY day ORDER BY day",
    )
    .fetch_all(&state.pool)
    .await?;

    let by_model = sqlx::query_as::<_, ModelSlice>(
        "SELECT model, CAST(SUM(tokens) AS SIGNED) AS tokens FROM usage_daily \
         WHERE day >= CURDATE() - INTERVAL 29 DAY GROUP BY model ORDER BY tokens DESC LIMIT 6",
    )
    .fetch_all(&state.pool)
    .await?;

    let recent_users = sqlx::query_as::<_, RecentUser>(
        "SELECT id, email, name, role, is_active FROM users ORDER BY created_at DESC LIMIT 8",
    )
    .fetch_all(&state.pool)
    .await?;

    let (total_users, active_users): (i64, i64) = sqlx::query_as(
        "SELECT CAST(COUNT(*) AS SIGNED), CAST(SUM(is_active) AS SIGNED) FROM users",
    )
    .fetch_one(&state.pool)
    .await?;

    let kpis = Kpis {
        tokens_30d: series.iter().map(|p| p.tokens).sum(),
        requests_30d: series.iter().map(|p| p.requests).sum(),
        revenue_cents_30d: series.iter().map(|p| p.revenue_cents).sum(),
        total_users,
        active_users,
    };

    Ok(Json(AdminStats { kpis, series, by_model, recent_users }))
}

#[derive(Serialize, FromRow)]
pub struct SettingRow {
    pub key: String,
    pub value: String,
}

#[derive(Serialize)]
pub struct PublicSettings {
    pub site_name: String,
    pub site_tagline: String,
}

fn pick(rows: &[SettingRow], key: &str, fallback: &str) -> String {
    rows.iter()
        .find(|r| r.key == key)
        .map(|r| r.value.clone())
        .unwrap_or_else(|| fallback.to_owned())
}

pub async fn get_settings(State(state): State<AppState>) -> Result<Json<PublicSettings>, ApiError> {
    let rows = sqlx::query_as::<_, SettingRow>("SELECT `key`, `value` FROM settings")
        .fetch_all(&state.pool)
        .await?;

    Ok(Json(PublicSettings {
        site_name: pick(&rows, "site_name", "NeuroForge"),
        site_tagline: pick(&rows, "site_tagline", "LLM API Token Platform"),
    }))
}

#[derive(Deserialize)]
pub struct UpdateSettingsBody {
    pub site_name: String,
    pub site_tagline: Option<String>,
}

pub async fn update_settings(
    State(state): State<AppState>,
    AdminUser(_): AdminUser,
    Json(body): Json<UpdateSettingsBody>,
) -> Result<Json<PublicSettings>, ApiError> {
    let name = body.site_name.trim();
    if name.is_empty() || name.chars().count() > 60 {
        return Err(ApiError::new(StatusCode::BAD_REQUEST, "nama website 1-60 karakter"));
    }

    let tagline = body.site_tagline.unwrap_or_default().trim().to_owned();
    if tagline.chars().count() > 120 {
        return Err(ApiError::new(StatusCode::BAD_REQUEST, "tagline maksimal 120 karakter"));
    }

    let mut tx = state.pool.begin().await?;
    for (key, value) in [("site_name", name), ("site_tagline", tagline.as_str())] {
        sqlx::query(
            "INSERT INTO settings (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)",
        )
        .bind(key)
        .bind(value)
        .execute(&mut *tx)
        .await?;
    }
    tx.commit().await?;

    Ok(Json(PublicSettings { site_name: name.to_owned(), site_tagline: tagline }))
}
