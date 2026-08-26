use aes_gcm::aead::{Aead, KeyInit, OsRng};
use aes_gcm::{Aes256Gcm, Key, Nonce};
use anyhow::{bail, Context};
use base64::Engine;
use rand::RngCore;
use sha2::{Digest, Sha256};

#[derive(Clone)]
pub struct Cipher {
    inner: Aes256Gcm,
}

impl Cipher {
    pub fn from_env_key(raw: &str) -> anyhow::Result<Self> {
        let bytes = base64::engine::general_purpose::STANDARD
            .decode(raw.trim())
            .context("ENCRYPTION_KEY harus base64")?;

        if bytes.len() != 32 {
            bail!("ENCRYPTION_KEY harus 32 byte setelah decode base64");
        }

        let key = Key::<Aes256Gcm>::from_slice(&bytes);
        Ok(Self { inner: Aes256Gcm::new(key) })
    }

    pub fn encrypt(&self, plain: &str) -> anyhow::Result<(Vec<u8>, Vec<u8>)> {
        let mut nonce_bytes = [0u8; 12];
        OsRng.fill_bytes(&mut nonce_bytes);
        let nonce = Nonce::from_slice(&nonce_bytes);

        let cipher = self
            .inner
            .encrypt(nonce, plain.as_bytes())
            .map_err(|_| anyhow::anyhow!("enkripsi gagal"))?;

        Ok((cipher, nonce_bytes.to_vec()))
    }

    pub fn decrypt(&self, cipher: &[u8], nonce: &[u8]) -> anyhow::Result<String> {
        if nonce.len() != 12 {
            bail!("nonce tidak valid");
        }

        let plain = self
            .inner
            .decrypt(Nonce::from_slice(nonce), cipher)
            .map_err(|_| anyhow::anyhow!("dekripsi gagal"))?;

        String::from_utf8(plain).context("hasil dekripsi bukan UTF-8")
    }
}

pub fn sha256_hex(input: &str) -> String {
    let digest = Sha256::digest(input.as_bytes());
    digest.iter().fold(String::with_capacity(64), |mut acc, b| {
        acc.push_str(&format!("{b:02x}"));
        acc
    })
}

pub fn key_hint(secret: &str) -> String {
    let tail: String = secret.chars().rev().take(4).collect::<Vec<_>>().into_iter().rev().collect();
    format!("...{tail}")
}

pub fn generate_api_key() -> (String, String) {
    let mut raw = [0u8; 24];
    OsRng.fill_bytes(&mut raw);
    let body = base64::engine::general_purpose::URL_SAFE_NO_PAD.encode(raw);
    let full = format!("sk-nf-{body}");
    let prefix = full.chars().take(14).collect();
    (full, prefix)
}
