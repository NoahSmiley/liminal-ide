use serde::{Deserialize, Serialize};
use uuid::Uuid;

pub type ClientId = Uuid;

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct RelayConfig {
    pub port: u16,
    pub bind_address: String,
    pub max_clients: usize,
    #[serde(default)]
    pub cloud_url: Option<String>,
    #[serde(default)]
    pub account_key: Option<Uuid>,
}

impl Default for RelayConfig {
    fn default() -> Self {
        Self {
            port: 9849,
            bind_address: "0.0.0.0".to_string(),
            max_clients: 4,
            cloud_url: None,
            account_key: None,
        }
    }
}

#[derive(Clone, Debug, Serialize)]
pub struct ClientInfo {
    pub id: ClientId,
    pub device_name: String,
    pub device_id: String,
    pub connected_at: i64,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct PairedDevice {
    pub device_id: String,
    pub device_name: String,
    pub token_hash: String,
    pub paired_at: i64,
    pub last_seen: Option<i64>,
}

#[derive(Clone, Debug, Serialize)]
pub struct RelayStatus {
    pub running: bool,
    pub port: u16,
    pub pairing_code: Option<String>,
    pub connected_clients: Vec<ClientInfo>,
}

#[derive(Clone, Debug, Serialize)]
pub struct CloudStatus {
    pub connected: bool,
    pub cloud_url: Option<String>,
    pub account_key: Option<Uuid>,
}
