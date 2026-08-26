use argon2::password_hash::rand_core::OsRng;
use argon2::password_hash::{PasswordHasher, SaltString};
use argon2::Argon2;
use rand::Rng;
use sqlx::mysql::MySqlPoolOptions;

const MODELS: [(&str, u32); 5] = [
    ("gpt-4o-mini", 40),
    ("claude-3.7-sonnet", 25),
    ("llama-3.3-70b", 18),
    ("qwen2.5-72b", 11),
    ("mistral-large", 6),
];

fn hash(plain: &str) -> anyhow::Result<String> {
    let salt = SaltString::generate(&mut OsRng);
    Argon2::default()
        .hash_password(plain.as_bytes(), &salt)
        .map(|h| h.to_string())
        .map_err(|e| anyhow::anyhow!("{e}"))
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenvy::dotenv().ok();
    let pool = MySqlPoolOptions::new().max_connections(4).connect(&std::env::var("DATABASE_URL")?).await?;

    let admin_email = std::env::var("SEED_ADMIN_EMAIL").unwrap_or_else(|_| "admin@neuroforge.dev".into());
    let admin_password = std::env::var("SEED_ADMIN_PASSWORD").unwrap_or_else(|_| "Admin#12345".into());

    for (email, name, role, pass) in [
        (admin_email.as_str(), "Grid Operator", "admin", admin_password.as_str()),
        ("member@neuroforge.dev", "Dev Member", "member", "Member#12345"),
    ] {
        sqlx::query(
            "INSERT INTO users (email, name, password_hash, role) VALUES (?, ?, ?, ?) \
             ON DUPLICATE KEY UPDATE name = VALUES(name), password_hash = VALUES(password_hash), role = VALUES(role)",
        )
        .bind(email)
        .bind(name)
        .bind(hash(pass)?)
        .bind(role)
        .execute(&pool)
        .await?;
    }

    let mut rng = rand::thread_rng();
    for back in (0..30).rev() {
        for (model, weight) in MODELS {
            let base = (weight as i64) * rng.gen_range(90_000..130_000);
            let requests = base / 900;
            sqlx::query(
                "INSERT INTO usage_daily (day, model, tokens, requests, revenue_cents) \
                 VALUES (CURDATE() - INTERVAL ? DAY, ?, ?, ?, ?) \
                 ON DUPLICATE KEY UPDATE tokens = VALUES(tokens), requests = VALUES(requests), \
                 revenue_cents = VALUES(revenue_cents)",
            )
            .bind(back)
            .bind(model)
            .bind(base)
            .bind(requests)
            .bind(base * 40 / 1_000_000)
            .execute(&pool)
            .await?;
        }
    }

    println!("seed ok: admin={admin_email}");
    Ok(())
}
