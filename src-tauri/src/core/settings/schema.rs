use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Settings {
    pub model: String,
    pub theme: Theme,
    pub font_size: u8,
    pub keybinding_preset: KeybindingPreset,
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
