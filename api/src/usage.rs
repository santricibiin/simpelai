use std::collections::HashMap;
use std::sync::Arc;
use std::time::Duration;

use sqlx::MySqlPool;
use tokio::sync::Mutex;

#[derive(Clone, Debug)]
pub struct UsageEvent {
    pub api_key_id: Option<u64>,
    pub provider_id: Option<u64>,
    pub model: String,
    pub prompt_tokens: u32,
    pub completion_tokens: u32,
    pub latency_ms: u32,
    pub status_code: u16,
    /// Bobot biaya per model; 1.0 = flat. Diambil dari provider_models.multiplier.
    pub multiplier: f64,
}

#[derive(Clone)]
pub struct UsageRecorder {
    buffer: Arc<Mutex<Vec<UsageEvent>>>,
}

impl UsageRecorder {
    pub fn start(pool: MySqlPool) -> Self {
        let recorder = Self { buffer: Arc::new(Mutex::new(Vec::new())) };
        let worker = recorder.clone();

        tokio::spawn(async move {
            let mut ticker = tokio::time::interval(Duration::from_secs(5));
            ticker.set_missed_tick_behavior(tokio::time::MissedTickBehavior::Delay);

            loop {
                ticker.tick().await;
                if let Err(e) = worker.flush(&pool).await {
                    tracing::error!("flush usage gagal: {e}");
                }
            }
        });

        recorder
    }

    pub async fn push(&self, event: UsageEvent) {
        let mut buf = self.buffer.lock().await;
        if buf.len() < 20_000 {
            buf.push(event);
        }
    }

    async fn flush(&self, pool: &MySqlPool) -> anyhow::Result<()> {
        let batch: Vec<UsageEvent> = {
            let mut buf = self.buffer.lock().await;
            if buf.is_empty() {
                return Ok(());
            }
            std::mem::take(&mut *buf)
        };

        let mut sql = String::from(
            "INSERT INTO usage_events \
             (api_key_id, provider_id, model, prompt_tokens, completion_tokens, latency_ms, status_code, multiplier) VALUES ",
        );
        sql.push_str(&vec!["(?, ?, ?, ?, ?, ?, ?, ?)"; batch.len()].join(", "));

        let mut query = sqlx::query(&sql);
        for e in &batch {
            query = query
                .bind(e.api_key_id)
                .bind(e.provider_id)
                .bind(&e.model)
                .bind(e.prompt_tokens)
                .bind(e.completion_tokens)
                .bind(e.latency_ms)
                .bind(e.status_code)
                .bind(e.multiplier);
        }
        query.execute(pool).await?;

        // tokens_used = penjumlahan ceil((prompt+completion) * multiplier) per event,
        // dibulatkan ke atas agar admin tidak rugi pecahan token.
        let mut per_key: HashMap<u64, (u64, u64, u64)> = HashMap::new();
        for e in &batch {
            if let Some(id) = e.api_key_id {
                let slot = per_key.entry(id).or_default();
                slot.0 += e.prompt_tokens as u64;
                slot.1 += e.completion_tokens as u64;
                slot.2 += ((e.prompt_tokens as u64 + e.completion_tokens as u64) as f64 * e.multiplier)
                    .ceil() as u64;
            }
        }

        for (key_id, (tin, tout, weighted)) in per_key {
            sqlx::query(
                "UPDATE api_keys SET tokens_used = tokens_used + ?, tokens_in = tokens_in + ?, \
                 tokens_out = tokens_out + ?, last_used_at = NOW() WHERE id = ?",
            )
            .bind(weighted)
            .bind(tin)
            .bind(tout)
            .bind(key_id)
            .execute(pool)
            .await?;
        }

        Ok(())
    }
}
