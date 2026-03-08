pub mod auth;
pub mod bridge;
pub mod cloud_client;
pub mod connection;
pub mod protocol;
pub mod server;
pub mod types;

use std::sync::Arc;

use tokio::sync::Mutex;
use uuid::Uuid;

use crate::core::events::EventBus;
use crate::state::AppState;

use auth::AuthManager;
use cloud_client::CloudClient;
use server::RelayServer;
use types::{CloudStatus, RelayConfig, RelayStatus};

pub struct RelayManager {
    server: Mutex<Option<RelayServer>>,
    cloud: Mutex<Option<CloudClient>>,
    auth: Arc<AuthManager>,
    config: Mutex<RelayConfig>,
    event_bus: EventBus,
    data_dir: std::path::PathBuf,
}

impl RelayManager {
    pub fn new(event_bus: EventBus, data_dir: &std::path::Path) -> Self {
        // Load config from disk (or use default)
        let config = Self::load_config(data_dir);

        Self {
            server: Mutex::new(None),
            cloud: Mutex::new(None),
            auth: Arc::new(AuthManager::new(data_dir)),
            config: Mutex::new(config),
            event_bus,
            data_dir: data_dir.to_path_buf(),
        }
    }

    fn load_config(data_dir: &std::path::Path) -> RelayConfig {
        let config_path = data_dir.join("relay_config.json");
        if let Ok(data) = std::fs::read_to_string(&config_path) {
            serde_json::from_str(&data).unwrap_or_default()
        } else {
            RelayConfig::default()
        }
    }

    fn save_config(&self, config: &RelayConfig) {
        let config_path = self.data_dir.join("relay_config.json");
        if let Ok(json) = serde_json::to_string_pretty(config) {
            let _ = std::fs::write(&config_path, json);
        }
    }

    // --- Local relay ---

    pub async fn start(&self, app_state: Arc<AppState>) -> Result<RelayStatus, String> {
        let mut server_lock = self.server.lock().await;
        if server_lock.is_some() {
            return Err("Relay server is already running".to_string());
        }

        let config = self.config.lock().await.clone();
        let relay_server = RelayServer::start(&config, self.auth.clone(), app_state).await?;
        let port = relay_server.port();
        let clients = relay_server.connected_clients().await;
        let code = self.auth.get_code().await;

        *server_lock = Some(relay_server);

        Ok(RelayStatus {
            running: true,
            port,
            pairing_code: Some(code),
            connected_clients: clients,
        })
    }

    pub async fn stop(&self) {
        let mut server_lock = self.server.lock().await;
        if let Some(mut server) = server_lock.take() {
            server.stop();
        }
        self.event_bus.clear_relay_sender();
    }

    pub async fn status(&self) -> RelayStatus {
        let server_lock = self.server.lock().await;
        match server_lock.as_ref() {
            Some(server) => {
                let code = self.auth.get_code().await;
                RelayStatus {
                    running: true,
                    port: server.port(),
                    pairing_code: Some(code),
                    connected_clients: server.connected_clients().await,
                }
            }
            None => RelayStatus {
                running: false,
                port: self.config.lock().await.port,
                pairing_code: None,
                connected_clients: vec![],
            },
        }
    }

    // --- Cloud relay ---

    /// Auto-connect to the cloud proxy on startup, if a cloud URL is configured.
    pub async fn auto_connect_cloud(&self, app_state: Arc<AppState>) {
        let config = self.config.lock().await.clone();
        let cloud_url = match config.cloud_url {
            Some(url) => url,
            None => {
                eprintln!("[relay] no cloud URL configured, skipping auto-connect");
                return;
            }
        };

        // Ensure account key exists
        let account_key = self.get_account_key().await;

        let mut cloud_lock = self.cloud.lock().await;
        if cloud_lock.is_some() {
            return; // Already connected
        }

        match CloudClient::start(cloud_url.clone(), account_key, app_state).await {
            Ok(client) => {
                *cloud_lock = Some(client);
                eprintln!("[relay] auto-connected to cloud proxy: {cloud_url}");
            }
            Err(e) => {
                eprintln!("[relay] auto-connect to cloud proxy failed: {e}");
            }
        }
    }

    pub async fn start_cloud(&self, app_state: Arc<AppState>) -> Result<CloudStatus, String> {
        let mut cloud_lock = self.cloud.lock().await;
        if cloud_lock.is_some() {
            return Err("Cloud relay is already running".to_string());
        }

        let config = self.config.lock().await.clone();
        let cloud_url = config.cloud_url
            .ok_or_else(|| "No cloud URL configured. Set cloud_url first.".to_string())?;
        let account_key = config.account_key
            .ok_or_else(|| "No account key configured. Generate one first.".to_string())?;

        let client = CloudClient::start(cloud_url.clone(), account_key, app_state).await?;
        *cloud_lock = Some(client);

        Ok(CloudStatus {
            connected: true,
            cloud_url: Some(cloud_url),
            account_key: Some(account_key),
        })
    }

    pub async fn stop_cloud(&self) {
        let mut cloud_lock = self.cloud.lock().await;
        if let Some(mut client) = cloud_lock.take() {
            client.stop();
        }
        self.event_bus.clear_cloud_sender();
    }

    pub async fn cloud_status(&self) -> CloudStatus {
        let cloud_lock = self.cloud.lock().await;
        let config = self.config.lock().await;
        CloudStatus {
            connected: cloud_lock.is_some(),
            cloud_url: config.cloud_url.clone(),
            account_key: config.account_key,
        }
    }

    // --- Account key ---

    pub async fn get_account_key(&self) -> Uuid {
        let mut config = self.config.lock().await;
        if let Some(key) = config.account_key {
            key
        } else {
            let key = Uuid::new_v4();
            config.account_key = Some(key);
            self.save_config(&config);
            key
        }
    }

    pub async fn set_cloud_url(&self, url: String) {
        let mut config = self.config.lock().await;
        config.cloud_url = Some(url);
        self.save_config(&config);
    }

    // --- Existing methods ---

    pub async fn get_pairing_code(&self) -> Option<String> {
        let server_lock = self.server.lock().await;
        if server_lock.is_some() {
            Some(self.auth.get_code().await)
        } else {
            None
        }
    }

    pub async fn regenerate_pairing_code(&self) -> Option<String> {
        let server_lock = self.server.lock().await;
        if server_lock.is_some() {
            Some(self.auth.regenerate_code().await)
        } else {
            None
        }
    }

    pub async fn revoke_device(&self, device_id: &str) -> bool {
        self.auth.revoke_device(device_id).await
    }

    pub async fn list_devices(&self) -> Vec<types::PairedDevice> {
        self.auth.list_devices().await
    }

    /// Returns (port, pairing_code) if the relay is running.
    pub async fn get_pairing_info(&self) -> Option<(u16, String)> {
        let server_lock = self.server.lock().await;
        if let Some(server) = server_lock.as_ref() {
            let code = self.auth.get_code().await;
            Some((server.port(), code))
        } else {
            None
        }
    }

    pub async fn update_config(&self, config: RelayConfig) -> Result<(), String> {
        let server_lock = self.server.lock().await;
        if server_lock.is_some() {
            return Err("Cannot update config while server is running. Stop the relay first.".to_string());
        }
        drop(server_lock);
        self.save_config(&config);
        *self.config.lock().await = config;
        Ok(())
    }
}
