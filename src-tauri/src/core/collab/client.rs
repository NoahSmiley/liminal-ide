use futures_util::{SinkExt, StreamExt};
use tokio::sync::mpsc;
use tokio_tungstenite::{connect_async, tungstenite::Message};

use super::protocol::CollabMessage;

pub struct CollabClient {
    pub outgoing: mpsc::Sender<CollabMessage>,
    pub incoming: mpsc::Receiver<CollabMessage>,
    shutdown: mpsc::Sender<()>,
}

impl CollabClient {
    pub async fn connect(server_url: &str) -> Result<Self, String> {
        let (ws_stream, _) = connect_async(server_url)
            .await
            .map_err(|e| format!("WebSocket connection failed: {e}"))?;

        let (mut ws_sink, mut ws_source) = ws_stream.split();
        let (out_tx, mut out_rx) = mpsc::channel::<CollabMessage>(64);
        let (in_tx, in_rx) = mpsc::channel::<CollabMessage>(64);
        let (shutdown_tx, mut shutdown_rx) = mpsc::channel::<()>(1);

        // Writer: send outgoing messages to WebSocket
        tokio::spawn(async move {
            loop {
                tokio::select! {
                    Some(msg) = out_rx.recv() => {
                        let json = match serde_json::to_string(&msg) {
                            Ok(j) => j,
                            Err(_) => continue,
                        };
                        if ws_sink.send(Message::Text(json.into())).await.is_err() {
                            break;
                        }
                    }
                    _ = shutdown_rx.recv() => break,
                }
            }
        });

        // Reader: receive messages from WebSocket
        tokio::spawn(async move {
            while let Some(Ok(msg)) = ws_source.next().await {
                if let Message::Text(text) = msg {
                    if let Ok(collab_msg) = serde_json::from_str::<CollabMessage>(&text) {
                        if in_tx.send(collab_msg).await.is_err() {
                            break;
                        }
                    }
                }
            }
        });

        Ok(Self {
            outgoing: out_tx,
            incoming: in_rx,
            shutdown: shutdown_tx,
        })
    }

    pub async fn send(&self, msg: CollabMessage) -> Result<(), String> {
        self.outgoing.send(msg).await.map_err(|e| e.to_string())
    }

    pub async fn disconnect(self) -> Result<(), String> {
        let _ = self.shutdown.send(()).await;
        Ok(())
    }
}
