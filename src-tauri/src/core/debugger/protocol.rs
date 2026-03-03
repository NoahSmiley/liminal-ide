use serde::{Deserialize, Serialize};
use serde_json::Value;

/// DAP base message: all DAP communication uses this envelope.
#[derive(Debug, Serialize, Deserialize)]
pub struct DapMessage {
    pub seq: u32,
    #[serde(rename = "type")]
    pub msg_type: String,
    #[serde(flatten)]
    pub body: DapBody,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(untagged)]
pub enum DapBody {
    Request {
        command: String,
        #[serde(default)]
        arguments: Option<Value>,
    },
    Response {
        request_seq: u32,
        success: bool,
        command: String,
        #[serde(default)]
        body: Option<Value>,
        #[serde(default)]
        message: Option<String>,
    },
    Event {
        event: String,
        #[serde(default)]
        body: Option<Value>,
    },
}

static SEQ_COUNTER: std::sync::atomic::AtomicU32 = std::sync::atomic::AtomicU32::new(1);

pub fn next_seq() -> u32 {
    SEQ_COUNTER.fetch_add(1, std::sync::atomic::Ordering::Relaxed)
}

pub fn make_request(command: &str, arguments: Option<Value>) -> DapMessage {
    DapMessage {
        seq: next_seq(),
        msg_type: "request".to_string(),
        body: DapBody::Request {
            command: command.to_string(),
            arguments,
        },
    }
}

pub fn encode_message(msg: &DapMessage) -> Result<Vec<u8>, serde_json::Error> {
    let json = serde_json::to_string(msg)?;
    let header = format!("Content-Length: {}\r\n\r\n", json.len());
    let mut buf = Vec::with_capacity(header.len() + json.len());
    buf.extend_from_slice(header.as_bytes());
    buf.extend_from_slice(json.as_bytes());
    Ok(buf)
}

/// Parse a Content-Length-framed DAP message from a buffer.
/// Returns (parsed_message, bytes_consumed) or None if incomplete.
pub fn try_parse_message(buf: &[u8]) -> Option<(DapMessage, usize)> {
    let buf_str = std::str::from_utf8(buf).ok()?;
    let header_end = buf_str.find("\r\n\r\n")?;
    let header = &buf_str[..header_end];

    let content_length: usize = header
        .lines()
        .find_map(|line| {
            let stripped = line.strip_prefix("Content-Length: ")?;
            stripped.trim().parse().ok()
        })?;

    let body_start = header_end + 4;
    if buf.len() < body_start + content_length {
        return None;
    }

    let body_bytes = &buf[body_start..body_start + content_length];
    let msg: DapMessage = serde_json::from_slice(body_bytes).ok()?;
    Some((msg, body_start + content_length))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn make_request_creates_request_message() {
        let msg = make_request("initialize", None);
        assert_eq!(msg.msg_type, "request");
        assert!(msg.seq > 0);
        match &msg.body {
            DapBody::Request { command, arguments } => {
                assert_eq!(command, "initialize");
                assert!(arguments.is_none());
            }
            _ => panic!("expected Request body"),
        }
    }

    #[test]
    fn encode_message_produces_content_length_header() {
        let msg = make_request("launch", None);
        let encoded = encode_message(&msg).unwrap();
        let text = String::from_utf8(encoded).unwrap();
        assert!(text.starts_with("Content-Length: "));
        assert!(text.contains("\r\n\r\n"));
    }

    #[test]
    fn try_parse_message_roundtrips_encoded_message() {
        let msg = make_request("setBreakpoints", Some(serde_json::json!({"line": 42})));
        let encoded = encode_message(&msg).unwrap();
        let (parsed, consumed) = try_parse_message(&encoded).unwrap();
        assert_eq!(consumed, encoded.len());
        assert_eq!(parsed.msg_type, "request");
        match &parsed.body {
            DapBody::Request { command, .. } => {
                assert_eq!(command, "setBreakpoints");
            }
            _ => panic!("expected Request body"),
        }
    }

    #[test]
    fn try_parse_message_returns_none_on_incomplete() {
        let partial = b"Content-Length: 999\r\n\r\n{\"inc";
        let result = try_parse_message(partial);
        assert!(result.is_none());
    }

    #[test]
    fn next_seq_increments() {
        let a = next_seq();
        let b = next_seq();
        assert!(b > a);
    }
}
