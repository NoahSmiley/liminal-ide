use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::time::Instant;

use rand::Rng;
use sha2::{Digest, Sha256};
use tokio::sync::RwLock;

use super::types::PairedDevice;

pub struct AuthManager {
    current_code: RwLock<(String, Instant)>,
    paired_devices: RwLock<HashMap<String, PairedDevice>>,
    file_path: PathBuf,
}

impl AuthManager {
    pub fn new(data_dir: &Path) -> Self {
        let file_path = data_dir.join("relay_devices.json");
        let devices = load_devices(&file_path).unwrap_or_default();
        Self {
            current_code: RwLock::new((generate_code(), Instant::now())),
            paired_devices: RwLock::new(devices),
            file_path,
        }
    }

    pub async fn get_code(&self) -> String {
        let mut code = self.current_code.write().await;
        // Rotate code every 5 minutes
        if code.1.elapsed().as_secs() > 300 {
            *code = (generate_code(), Instant::now());
        }
        code.0.clone()
    }

    pub async fn regenerate_code(&self) -> String {
        let mut code = self.current_code.write().await;
        *code = (generate_code(), Instant::now());
        code.0.clone()
    }

    pub async fn validate_code(&self, candidate: &str) -> bool {
        let code = self.current_code.read().await;
        // Also check staleness
        if code.1.elapsed().as_secs() > 300 {
            return false;
        }
        code.0 == candidate
    }

    pub async fn pair_device(
        &self,
        device_id: &str,
        device_name: &str,
    ) -> String {
        let token = generate_token();
        let hash = hash_token(&token);
        let now = chrono_now();

        let device = PairedDevice {
            device_id: device_id.to_string(),
            device_name: device_name.to_string(),
            token_hash: hash,
            paired_at: now,
            last_seen: Some(now),
        };

        let mut devices = self.paired_devices.write().await;
        devices.insert(device_id.to_string(), device);
        let _ = save_devices(&self.file_path, &devices);

        // Rotate code after successful pairing
        drop(devices);
        self.regenerate_code().await;

        token
    }

    pub async fn validate_token(&self, device_id: &str, token: &str) -> bool {
        let hash = hash_token(token);
        let mut devices = self.paired_devices.write().await;
        if let Some(device) = devices.get_mut(device_id) {
            if device.token_hash == hash {
                device.last_seen = Some(chrono_now());
                let _ = save_devices(&self.file_path, &devices);
                return true;
            }
        }
        false
    }

    pub async fn revoke_device(&self, device_id: &str) -> bool {
        let mut devices = self.paired_devices.write().await;
        let removed = devices.remove(device_id).is_some();
        if removed {
            let _ = save_devices(&self.file_path, &devices);
        }
        removed
    }

    pub async fn list_devices(&self) -> Vec<PairedDevice> {
        self.paired_devices.read().await.values().cloned().collect()
    }
}

fn generate_code() -> String {
    let mut rng = rand::thread_rng();
    format!("{:06}", rng.gen_range(0..1_000_000u32))
}

fn generate_token() -> String {
    let mut rng = rand::thread_rng();
    let bytes: Vec<u8> = (0..32).map(|_| rng.gen()).collect();
    hex::encode(bytes)
}

fn hash_token(token: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(token.as_bytes());
    hex::encode(hasher.finalize())
}

fn chrono_now() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as i64
}

fn load_devices(path: &Path) -> Result<HashMap<String, PairedDevice>, String> {
    let content = std::fs::read_to_string(path).map_err(|e| e.to_string())?;
    serde_json::from_str(&content).map_err(|e| e.to_string())
}

fn save_devices(path: &Path, devices: &HashMap<String, PairedDevice>) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let json = serde_json::to_string_pretty(devices).map_err(|e| e.to_string())?;
    std::fs::write(path, json).map_err(|e| e.to_string())?;
    Ok(())
}
