pub mod schema;

use std::path::{Path, PathBuf};

use crate::error::SettingsError;
use schema::Settings;

pub struct SettingsManager {
    file_path: PathBuf,
    current: tokio::sync::Mutex<Settings>,
}

impl SettingsManager {
    pub fn new(data_dir: &Path) -> Self {
        let file_path = data_dir.join("settings.json");
        let current = load_from_disk(&file_path).unwrap_or_default();
        Self {
            file_path,
            current: tokio::sync::Mutex::new(current),
        }
    }

    pub async fn get(&self) -> Settings {
        self.current.lock().await.clone()
    }

    pub async fn update(&self, settings: Settings) -> Result<(), SettingsError> {
        save_to_disk(&self.file_path, &settings)?;
        *self.current.lock().await = settings;
        Ok(())
    }

    pub async fn update_field(
        &self,
        updater: impl FnOnce(&mut Settings),
    ) -> Result<Settings, SettingsError> {
        let mut current = self.current.lock().await;
        updater(&mut current);
        save_to_disk(&self.file_path, &current)?;
        Ok(current.clone())
    }

    pub async fn reset(&self) -> Result<Settings, SettingsError> {
        let defaults = Settings::default();
        save_to_disk(&self.file_path, &defaults)?;
        *self.current.lock().await = defaults.clone();
        Ok(defaults)
    }
}

fn load_from_disk(path: &Path) -> Result<Settings, SettingsError> {
    let content = std::fs::read_to_string(path)
        .map_err(|e| SettingsError::LoadFailed(e.to_string()))?;
    serde_json::from_str(&content)
        .map_err(|e| SettingsError::LoadFailed(e.to_string()))
}

fn save_to_disk(path: &Path, settings: &Settings) -> Result<(), SettingsError> {
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| SettingsError::SaveFailed(e.to_string()))?;
    }
    let json = serde_json::to_string_pretty(settings)
        .map_err(|e| SettingsError::SaveFailed(e.to_string()))?;
    std::fs::write(path, json)
        .map_err(|e| SettingsError::SaveFailed(e.to_string()))?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use schema::{KeybindingPreset, Theme};

    #[tokio::test]
    async fn new_creates_with_defaults() {
        let tmp = tempfile::tempdir().unwrap();
        let mgr = SettingsManager::new(tmp.path());
        let s = mgr.get().await;
        assert_eq!(s.model, "sonnet");
        assert_eq!(s.font_size, 13);
    }

    #[tokio::test]
    async fn get_returns_current() {
        let tmp = tempfile::tempdir().unwrap();
        let mgr = SettingsManager::new(tmp.path());
        let s = mgr.get().await;
        assert_eq!(s.theme, Theme::Dark);
        assert_eq!(s.keybinding_preset, KeybindingPreset::Default);
    }

    #[tokio::test]
    async fn update_persists_and_retrieves() {
        let tmp = tempfile::tempdir().unwrap();
        let mgr = SettingsManager::new(tmp.path());
        let mut s = mgr.get().await;
        s.font_size = 18;
        s.theme = Theme::Light;
        mgr.update(s).await.unwrap();
        let reloaded = SettingsManager::new(tmp.path());
        let s2 = reloaded.get().await;
        assert_eq!(s2.font_size, 18);
        assert_eq!(s2.theme, Theme::Light);
    }

    #[tokio::test]
    async fn reset_returns_to_defaults() {
        let tmp = tempfile::tempdir().unwrap();
        let mgr = SettingsManager::new(tmp.path());
        let mut s = mgr.get().await;
        s.font_size = 20;
        mgr.update(s).await.unwrap();
        let defaults = mgr.reset().await.unwrap();
        assert_eq!(defaults.font_size, 13);
        assert_eq!(defaults.model, "sonnet");
    }

    #[tokio::test]
    async fn update_field_modifies_specific_field() {
        let tmp = tempfile::tempdir().unwrap();
        let mgr = SettingsManager::new(tmp.path());
        let result = mgr.update_field(|s| {
            s.keybinding_preset = KeybindingPreset::Vim;
        }).await.unwrap();
        assert_eq!(result.keybinding_preset, KeybindingPreset::Vim);
        assert_eq!(result.font_size, 13); // unchanged
    }
}
