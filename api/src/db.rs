use std::time::Duration;

use anyhow::Context;
use sqlx::mysql::MySqlPoolOptions;
use sqlx::MySqlPool;

pub async fn connect(url: &str) -> anyhow::Result<MySqlPool> {
    MySqlPoolOptions::new()
        .max_connections(10)
        .acquire_timeout(Duration::from_secs(5))
        .connect(url)
        .await
        .context("gagal konek MySQL")
}

pub async fn ping(pool: &MySqlPool) -> bool {
    sqlx::query_scalar::<_, i64>("SELECT 1").fetch_one(pool).await.is_ok()
}
