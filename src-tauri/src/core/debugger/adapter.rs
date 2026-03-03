use std::path::Path;
use std::process::Stdio;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::process::{Child, Command};
use tokio::sync::mpsc;

use super::protocol::{encode_message, make_request, try_parse_message, DapMessage};

pub struct DapAdapter {
    child: Child,
    tx: mpsc::Sender<DapMessage>,
    pub rx: mpsc::Receiver<DapMessage>,
}

impl DapAdapter {
    pub async fn spawn(adapter_cmd: &str, args: &[&str], cwd: &Path) -> Result<Self, String> {
        let mut child = Command::new(adapter_cmd)
            .args(args)
            .current_dir(cwd)
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::null())
            .spawn()
            .map_err(|e| format!("Failed to spawn debug adapter: {e}"))?;

        let stdout = child.stdout.take().ok_or("No stdout")?;
        let stdin = child.stdin.take().ok_or("No stdin")?;

        let (msg_tx, msg_rx) = mpsc::channel::<DapMessage>(64);
        let (write_tx, mut write_rx) = mpsc::channel::<DapMessage>(64);

        // Reader task: parse DAP messages from stdout
        tokio::spawn(async move {
            let mut reader = tokio::io::BufReader::new(stdout);
            let mut buf = Vec::with_capacity(8192);
            let mut tmp = [0u8; 4096];
            loop {
                match reader.read(&mut tmp).await {
                    Ok(0) => break,
                    Ok(n) => buf.extend_from_slice(&tmp[..n]),
                    Err(_) => break,
                }
                while let Some((msg, consumed)) = try_parse_message(&buf) {
                    let _ = msg_tx.send(msg).await;
                    buf.drain(..consumed);
                }
            }
        });

        // Writer task: encode and send DAP messages to stdin
        tokio::spawn(async move {
            let mut writer = stdin;
            while let Some(msg) = write_rx.recv().await {
                if let Ok(data) = encode_message(&msg) {
                    if writer.write_all(&data).await.is_err() {
                        break;
                    }
                }
            }
        });

        Ok(Self {
            child,
            tx: write_tx,
            rx: msg_rx,
        })
    }

    pub async fn send_request(&self, command: &str, args: Option<serde_json::Value>) -> Result<(), String> {
        let msg = make_request(command, args);
        self.tx.send(msg).await.map_err(|e| e.to_string())
    }

    pub async fn kill(&mut self) -> Result<(), String> {
        self.child.kill().await.map_err(|e| e.to_string())
    }
}
