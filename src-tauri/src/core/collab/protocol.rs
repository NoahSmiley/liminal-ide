use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum CollabMessage {
    Join { room_id: String, user_name: String },
    Leave { room_id: String, user_name: String },
    ChatMessage { room_id: String, user_name: String, content: String },
    CursorUpdate { room_id: String, user_name: String, file: String, line: u32, col: u32 },
    FileEdit { room_id: String, user_name: String, file: String, content: String },
    RoomCreated { room_id: String },
    UserJoined { room_id: String, user_name: String },
    UserLeft { room_id: String, user_name: String },
    Error { message: String },
}

impl CollabMessage {
    pub fn room_id(&self) -> Option<&str> {
        match self {
            Self::Join { room_id, .. }
            | Self::Leave { room_id, .. }
            | Self::ChatMessage { room_id, .. }
            | Self::CursorUpdate { room_id, .. }
            | Self::FileEdit { room_id, .. }
            | Self::RoomCreated { room_id }
            | Self::UserJoined { room_id, .. }
            | Self::UserLeft { room_id, .. } => Some(room_id),
            Self::Error { .. } => None,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn join_serializes_with_type_join() {
        let msg = CollabMessage::Join {
            room_id: "room-1".to_string(),
            user_name: "alice".to_string(),
        };
        let json = serde_json::to_value(&msg).unwrap();
        assert_eq!(json["type"], "Join");
        assert_eq!(json["room_id"], "room-1");
        assert_eq!(json["user_name"], "alice");
    }

    #[test]
    fn room_id_returns_room_id_for_all_variants_except_error() {
        let join = CollabMessage::Join {
            room_id: "r1".to_string(),
            user_name: "u".to_string(),
        };
        assert_eq!(join.room_id(), Some("r1"));

        let leave = CollabMessage::Leave {
            room_id: "r2".to_string(),
            user_name: "u".to_string(),
        };
        assert_eq!(leave.room_id(), Some("r2"));

        let chat = CollabMessage::ChatMessage {
            room_id: "r3".to_string(),
            user_name: "u".to_string(),
            content: "hi".to_string(),
        };
        assert_eq!(chat.room_id(), Some("r3"));

        let cursor = CollabMessage::CursorUpdate {
            room_id: "r4".to_string(),
            user_name: "u".to_string(),
            file: "f".to_string(),
            line: 1,
            col: 1,
        };
        assert_eq!(cursor.room_id(), Some("r4"));

        let edit = CollabMessage::FileEdit {
            room_id: "r5".to_string(),
            user_name: "u".to_string(),
            file: "f".to_string(),
            content: "c".to_string(),
        };
        assert_eq!(edit.room_id(), Some("r5"));

        let created = CollabMessage::RoomCreated {
            room_id: "r6".to_string(),
        };
        assert_eq!(created.room_id(), Some("r6"));

        let joined = CollabMessage::UserJoined {
            room_id: "r7".to_string(),
            user_name: "u".to_string(),
        };
        assert_eq!(joined.room_id(), Some("r7"));

        let left = CollabMessage::UserLeft {
            room_id: "r8".to_string(),
            user_name: "u".to_string(),
        };
        assert_eq!(left.room_id(), Some("r8"));
    }

    #[test]
    fn error_room_id_returns_none() {
        let err = CollabMessage::Error {
            message: "oops".to_string(),
        };
        assert!(err.room_id().is_none());
    }

    #[test]
    fn roundtrip_serialize_deserialize() {
        let msg = CollabMessage::ChatMessage {
            room_id: "room".to_string(),
            user_name: "bob".to_string(),
            content: "hello world".to_string(),
        };
        let json = serde_json::to_string(&msg).unwrap();
        let parsed: CollabMessage = serde_json::from_str(&json).unwrap();
        match parsed {
            CollabMessage::ChatMessage { room_id, user_name, content } => {
                assert_eq!(room_id, "room");
                assert_eq!(user_name, "bob");
                assert_eq!(content, "hello world");
            }
            _ => panic!("expected ChatMessage"),
        }
    }
}
