use argon2::password_hash::rand_core::OsRng;
use argon2::password_hash::{PasswordHasher, SaltString};
use argon2::{Argon2, PasswordHash, PasswordVerifier};
use axum::async_trait;
use axum::extract::FromRequestParts;
use axum::http::header::AUTHORIZATION;
use axum::http::request::Parts;
use axum::http::StatusCode;
use jsonwebtoken::{decode, encode, Algorithm, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};

use crate::error::ApiError;
use crate::routes::AppState;

#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
    pub sub: String,
    pub email: String,
    pub role: String,
    pub exp: i64,
}

#[allow(dead_code)]
pub fn hash_password(plain: &str) -> anyhow::Result<String> {
    let salt = SaltString::generate(&mut OsRng);
    Argon2::default()
        .hash_password(plain.as_bytes(), &salt)
        .map(|h| h.to_string())
        .map_err(|e| anyhow::anyhow!("hash gagal: {e}"))
}

pub fn verify_password(plain: &str, hash: &str) -> bool {
    PasswordHash::new(hash)
        .map(|parsed| Argon2::default().verify_password(plain.as_bytes(), &parsed).is_ok())
        .unwrap_or(false)
}

pub fn issue_token(secret: &str, id: u64, email: &str, role: &str, ttl_hours: i64) -> anyhow::Result<String> {
    let claims = Claims {
        sub: id.to_string(),
        email: email.to_owned(),
        role: role.to_owned(),
        exp: (chrono::Utc::now() + chrono::Duration::hours(ttl_hours)).timestamp(),
    };
    Ok(encode(&Header::default(), &claims, &EncodingKey::from_secret(secret.as_bytes()))?)
}

fn decode_token(secret: &str, token: &str) -> Result<Claims, ApiError> {
    decode::<Claims>(token, &DecodingKey::from_secret(secret.as_bytes()), &Validation::new(Algorithm::HS256))
        .map(|d| d.claims)
        .map_err(|_| ApiError::new(StatusCode::UNAUTHORIZED, "token tidak valid atau kedaluwarsa"))
}

pub struct AuthUser(pub Claims);
pub struct AdminUser(#[allow(dead_code)] pub Claims);

#[async_trait]
impl FromRequestParts<AppState> for AuthUser {
    type Rejection = ApiError;

    async fn from_request_parts(parts: &mut Parts, state: &AppState) -> Result<Self, Self::Rejection> {
        let token = parts
            .headers
            .get(AUTHORIZATION)
            .and_then(|v| v.to_str().ok())
            .and_then(|v| v.strip_prefix("Bearer "))
            .ok_or_else(|| ApiError::new(StatusCode::UNAUTHORIZED, "header Authorization tidak ada"))?;

        Ok(AuthUser(decode_token(&state.jwt_secret, token.trim())?))
    }
}

#[async_trait]
impl FromRequestParts<AppState> for AdminUser {
    type Rejection = ApiError;

    async fn from_request_parts(parts: &mut Parts, state: &AppState) -> Result<Self, Self::Rejection> {
        let AuthUser(claims) = AuthUser::from_request_parts(parts, state).await?;
        if claims.role != "admin" {
            return Err(ApiError::new(StatusCode::FORBIDDEN, "butuh role admin"));
        }
        Ok(AdminUser(claims))
    }
}
