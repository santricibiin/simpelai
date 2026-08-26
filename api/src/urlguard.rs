use std::net::IpAddr;

use url::{Host, Url};

pub fn validate_base_url(raw: &str, allow_private: bool) -> Result<String, String> {
    let trimmed = raw.trim().trim_end_matches('/');
    if trimmed.is_empty() {
        return Err("base URL wajib diisi".into());
    }
    if trimmed.len() > 255 {
        return Err("base URL terlalu panjang".into());
    }

    let url = Url::parse(trimmed).map_err(|_| "base URL tidak valid".to_string())?;

    match url.scheme() {
        "https" => {}
        "http" if allow_private => {}
        "http" => return Err("gunakan HTTPS untuk endpoint publik".into()),
        _ => return Err("skema harus http atau https".into()),
    }

    if !url.username().is_empty() || url.password().is_some() {
        return Err("base URL tidak boleh memuat kredensial".into());
    }

    let host = url.host().ok_or_else(|| "host tidak ditemukan".to_string())?;

    if !allow_private {
        match host {
            Host::Ipv4(ip) => reject_private(IpAddr::V4(ip))?,
            Host::Ipv6(ip) => reject_private(IpAddr::V6(ip))?,
            Host::Domain(name) => reject_local_name(name)?,
        }
    }

    Ok(trimmed.to_string())
}

fn reject_private(ip: IpAddr) -> Result<(), String> {
    let blocked = match ip {
        IpAddr::V4(v4) => {
            v4.is_private()
                || v4.is_loopback()
                || v4.is_link_local()
                || v4.is_broadcast()
                || v4.is_unspecified()
                || v4.octets()[0] == 0
                || (v4.octets()[0] == 100 && (64..128).contains(&v4.octets()[1]))
        }
        IpAddr::V6(v6) => {
            v6.is_loopback()
                || v6.is_unspecified()
                || (v6.segments()[0] & 0xfe00) == 0xfc00
                || (v6.segments()[0] & 0xffc0) == 0xfe80
        }
    };

    if blocked {
        return Err("alamat IP internal tidak diizinkan".into());
    }
    Ok(())
}

fn reject_local_name(name: &str) -> Result<(), String> {
    let lower = name.to_ascii_lowercase();
    let blocked = ["localhost", "metadata.google.internal", "instance-data"];

    if blocked.contains(&lower.as_str())
        || lower.ends_with(".localhost")
        || lower.ends_with(".internal")
        || lower.ends_with(".local")
    {
        return Err("host internal tidak diizinkan".into());
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::validate_base_url;

    #[test]
    fn menolak_ssrf_dan_menerima_publik() {
        assert!(validate_base_url("https://api.openai.com/v1", false).is_ok());
        assert_eq!(
            validate_base_url("https://api.openai.com/v1/", false).unwrap(),
            "https://api.openai.com/v1"
        );

        for bad in [
            "http://169.254.169.254/latest/meta-data",
            "https://127.0.0.1/v1",
            "https://localhost/v1",
            "https://10.0.0.5/v1",
            "https://192.168.1.1/v1",
            "https://172.16.0.1/v1",
            "https://metadata.google.internal/v1",
            "https://redis.internal/v1",
            "file:///etc/passwd",
            "https://user:pass@api.openai.com/v1",
            "http://api.openai.com/v1",
        ] {
            assert!(validate_base_url(bad, false).is_err(), "harus ditolak: {bad}");
        }

        assert!(validate_base_url("http://127.0.0.1:11434/v1", true).is_ok());
    }
}
