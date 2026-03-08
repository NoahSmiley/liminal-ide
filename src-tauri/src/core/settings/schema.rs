use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum PermissionMode {
    Full,
    Default,
    Plan,
}

impl std::default::Default for PermissionMode {
    fn default() -> Self {
        PermissionMode::Full
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Settings {
    pub model: String,
    pub theme: Theme,
    pub font_size: u8,
    pub keybinding_preset: KeybindingPreset,
    #[serde(default)]
    pub personality: String,
    #[serde(default)]
    pub permission_mode: PermissionMode,
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum Theme {
    Dark,
    Light,
    System,
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum KeybindingPreset {
    Default,
    Vim,
    Emacs,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            model: "sonnet".to_string(),
            theme: Theme::Dark,
            font_size: 13,
            keybinding_preset: KeybindingPreset::Default,
            personality: String::new(),
            permission_mode: PermissionMode::Full,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn default_settings_serialize_roundtrip() {
        let settings = Settings::default();
        let json = serde_json::to_string(&settings).expect("serialize");
        let parsed: Settings = serde_json::from_str(&json).expect("deserialize");
        assert_eq!(parsed.model, "sonnet");
        assert_eq!(parsed.theme, Theme::Dark);
        assert_eq!(parsed.font_size, 13);
        assert_eq!(parsed.keybinding_preset, KeybindingPreset::Default);
    }
}
