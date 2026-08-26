use std::collections::HashMap;
use std::sync::Arc;
use std::time::{Duration, Instant};

use tokio::sync::Mutex;

struct Window {
    started: Instant,
    count: u32,
}

#[derive(Clone)]
pub struct RateLimiter {
    slots: Arc<Mutex<HashMap<u64, Window>>>,
}

impl RateLimiter {
    pub fn new() -> Self {
        let limiter = Self { slots: Arc::new(Mutex::new(HashMap::new())) };
        let cleaner = limiter.clone();

        tokio::spawn(async move {
            let mut ticker = tokio::time::interval(Duration::from_secs(120));
            loop {
                ticker.tick().await;
                let mut slots = cleaner.slots.lock().await;
                slots.retain(|_, w| w.started.elapsed() < Duration::from_secs(60));
            }
        });

        limiter
    }

    pub async fn allow(&self, key_id: u64, limit: u32) -> bool {
        let mut slots = self.slots.lock().await;
        let window = slots.entry(key_id).or_insert_with(|| Window { started: Instant::now(), count: 0 });

        if window.started.elapsed() >= Duration::from_secs(60) {
            window.started = Instant::now();
            window.count = 0;
        }

        if window.count >= limit {
            return false;
        }

        window.count += 1;
        true
    }
}
