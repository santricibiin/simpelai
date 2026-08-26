use argon2::password_hash::rand_core::OsRng;
use argon2::password_hash::{PasswordHasher, SaltString};
use argon2::Argon2;
use sqlx::mysql::MySqlPoolOptions;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenvy::dotenv().ok();

    let mut args = std::env::args().skip(1);
    let email = args.next().ok_or_else(|| anyhow::anyhow!("usage: setpass <email> <password>"))?;
    let password = args.next().ok_or_else(|| anyhow::anyhow!("usage: setpass <email> <password>"))?;

    if password.chars().count() < 12 {
        anyhow::bail!("password minimal 12 karakter");
    }

    let salt = SaltString::generate(&mut OsRng);
    let hash = Argon2::default()
        .hash_password(password.as_bytes(), &salt)
        .map_err(|e| anyhow::anyhow!("{e}"))?
        .to_string();

    let pool = MySqlPoolOptions::new()
        .max_connections(2)
        .connect(&std::env::var("DATABASE_URL")?)
        .await?;

    let res = sqlx::query("UPDATE users SET password_hash = ? WHERE email = ?")
        .bind(&hash)
        .bind(email.trim().to_lowercase())
        .execute(&pool)
        .await?;

    if res.rows_affected() == 0 {
        anyhow::bail!("user tidak ditemukan: {email}");
    }

    println!("password diperbarui untuk {email}");
    Ok(())
}
