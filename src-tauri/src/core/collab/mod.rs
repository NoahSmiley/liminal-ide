pub mod client;
pub mod protocol;

use tokio::sync::Mutex;
use client::CollabClient;
use protocol::CollabMessage;

pub struct CollabManager {
    client: Mutex<Option<CollabClient>>,
    room_id: Mutex<Option<String>>,
    user_name: Mutex<String>,
}

impl CollabManager {
    pub fn new() -> Self {
        Self {
            client: Mutex::new(None),
            room_id: Mutex::new(None),
            user_name: Mutex::new("anonymous".to_string()),
        }
    }

    pub async fn set_user_name(&self, name: &str) {
        *self.user_name.lock().await = name.to_string();
    }

    pub async fn create_room(&self, server_url: &str) -> Result<String, String> {
        let ws_client = CollabClient::connect(server_url).await?;
        let room_id = uuid::Uuid::new_v4().to_string()[..8].to_string();
        let user = self.user_name.lock().await.clone();

        ws_client.send(CollabMessage::Join {
            room_id: room_id.clone(),
            user_name: user,
        }).await?;

        *self.client.lock().await = Some(ws_client);
        *self.room_id.lock().await = Some(room_id.clone());
        Ok(room_id)
    }

    pub async fn join_room(&self, server_url: &str, room_id: &str) -> Result<(), String> {
        let ws_client = CollabClient::connect(server_url).await?;
        let user = self.user_name.lock().await.clone();

        ws_client.send(CollabMessage::Join {
            room_id: room_id.to_string(),
            user_name: user,
        }).await?;

        *self.client.lock().await = Some(ws_client);
        *self.room_id.lock().await = Some(room_id.to_string());
        Ok(())
    }

    pub async fn leave(&self) -> Result<(), String> {
        let mut client_guard = self.client.lock().await;
        if let Some(client) = client_guard.take() {
            let room = self.room_id.lock().await.clone();
            let user = self.user_name.lock().await.clone();
            if let Some(rid) = room {
                let _ = client.send(CollabMessage::Leave {
                    room_id: rid,
                    user_name: user,
                }).await;
            }
            client.disconnect().await?;
        }
        *self.room_id.lock().await = None;
        Ok(())
    }

    pub async fn send_message(&self, content: &str) -> Result<(), String> {
        let client = self.client.lock().await;
        let room = self.room_id.lock().await.clone();
        let user = self.user_name.lock().await.clone();
        match (&*client, room) {
            (Some(c), Some(rid)) => {
                c.send(CollabMessage::ChatMessage {
                    room_id: rid,
                    user_name: user,
                    content: content.to_string(),
                }).await
            }
            _ => Err("Not connected".to_string()),
        }
    }

    pub async fn send_cursor_update(&self, file: &str, line: u32, col: u32) -> Result<(), String> {
        let client = self.client.lock().await;
        let room = self.room_id.lock().await.clone();
        let user = self.user_name.lock().await.clone();
        match (&*client, room) {
            (Some(c), Some(rid)) => {
                c.send(CollabMessage::CursorUpdate {
                    room_id: rid,
                    user_name: user,
                    file: file.to_string(),
                    line,
                    col,
                }).await
            }
            _ => Err("Not connected".to_string()),
        }
    }

    pub async fn is_connected(&self) -> bool {
        self.client.lock().await.is_some()
    }

    pub async fn get_room_id(&self) -> Option<String> {
        self.room_id.lock().await.clone()
    }
}
