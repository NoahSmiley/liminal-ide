use serde::{Deserialize, Serialize};
use tokio::io::{AsyncBufReadExt, AsyncReadExt, AsyncWriteExt, BufReader};
use tokio::process::ChildStdin;

use crate::error::LspError;

#[derive(Debug, Serialize, Deserialize)]
pub struct JsonRpcResponse {
    pub jsonrpc: String,
    pub id: Option<u64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub result: Option<serde_json::Value>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub error: Option<serde_json::Value>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub method: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub params: Option<serde_json::Value>,
}

/// Send a JSON-RPC message with Content-Length framing.
pub async fn send_message(
    stdin: &mut ChildStdin,
    msg: &serde_json::Value,
) -> Result<(), LspError> {
    let body = serde_json::to_string(msg)
        .map_err(|e| LspError::ProtocolError(e.to_string()))?;
    let header = format!("Content-Length: {}\r\n\r\n", body.len());
    stdin
        .write_all(header.as_bytes())
        .await
        .map_err(|e| LspError::IoError(e.to_string()))?;
    stdin
        .write_all(body.as_bytes())
        .await
        .map_err(|e| LspError::IoError(e.to_string()))?;
    stdin
        .flush()
        .await
        .map_err(|e| LspError::IoError(e.to_string()))?;
    Ok(())
}

/// Read one JSON-RPC message from Content-Length framed stream.
pub async fn read_message<R: tokio::io::AsyncRead + Unpin>(
    reader: &mut BufReader<R>,
) -> Result<JsonRpcResponse, LspError> {
    let content_length = read_content_length(reader).await?;
    let mut body = vec![0u8; content_length];
    reader
        .read_exact(&mut body)
        .await
        .map_err(|e| LspError::IoError(e.to_string()))?;
    serde_json::from_slice(&body)
        .map_err(|e| LspError::ProtocolError(format!("Invalid JSON: {}", e)))
}

async fn read_content_length<R: tokio::io::AsyncRead + Unpin>(
    reader: &mut BufReader<R>,
) -> Result<usize, LspError> {
    let mut content_length: Option<usize> = None;
    let mut line = String::new();

    loop {
        line.clear();
        let n = reader
            .read_line(&mut line)
            .await
            .map_err(|e| LspError::IoError(e.to_string()))?;
        if n == 0 {
            return Err(LspError::ServerExited);
        }
        let trimmed = line.trim();
        if trimmed.is_empty() {
            break;
        }
        if let Some(val) = trimmed.strip_prefix("Content-Length: ") {
            content_length = Some(
                val.parse()
                    .map_err(|_| LspError::ProtocolError("Bad Content-Length".into()))?,
            );
        }
    }

    content_length.ok_or(LspError::ProtocolError("Missing Content-Length".into()))
}
