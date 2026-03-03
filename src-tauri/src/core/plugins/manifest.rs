use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct PluginManifest {
    pub name: String,
    pub version: String,
    pub description: String,
    pub commands: Vec<PluginCommand>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct PluginCommand {
    pub name: String,
    pub description: String,
    pub script: String,
}

pub fn load_manifest(plugin_dir: &std::path::Path) -> Option<PluginManifest> {
    let manifest_path = plugin_dir.join("plugin.json");
    let content = std::fs::read_to_string(&manifest_path).ok()?;
    serde_json::from_str(&content).ok()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn load_manifest_returns_none_for_missing_dir() {
        let tmp = tempfile::tempdir().unwrap();
        let result = load_manifest(&tmp.path().join("nonexistent"));
        assert!(result.is_none());
    }

    #[test]
    fn load_manifest_parses_valid_plugin_json() {
        let tmp = tempfile::tempdir().unwrap();
        let json = serde_json::json!({
            "name": "test-plugin",
            "version": "1.0.0",
            "description": "A test plugin",
            "commands": [
                {
                    "name": "greet",
                    "description": "Says hello",
                    "script": "echo hello"
                }
            ]
        });
        std::fs::write(
            tmp.path().join("plugin.json"),
            serde_json::to_string_pretty(&json).unwrap(),
        ).unwrap();
        let manifest = load_manifest(tmp.path()).unwrap();
        assert_eq!(manifest.name, "test-plugin");
        assert_eq!(manifest.version, "1.0.0");
        assert_eq!(manifest.commands.len(), 1);
        assert_eq!(manifest.commands[0].name, "greet");
    }

    #[test]
    fn plugin_manifest_serializes_roundtrip() {
        let manifest = PluginManifest {
            name: "roundtrip".to_string(),
            version: "2.0.0".to_string(),
            description: "Test roundtrip".to_string(),
            commands: vec![
                PluginCommand {
                    name: "cmd1".to_string(),
                    description: "First".to_string(),
                    script: "run.sh".to_string(),
                },
            ],
        };
        let json = serde_json::to_string(&manifest).unwrap();
        let parsed: PluginManifest = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed.name, "roundtrip");
        assert_eq!(parsed.version, "2.0.0");
        assert_eq!(parsed.commands.len(), 1);
    }
}
