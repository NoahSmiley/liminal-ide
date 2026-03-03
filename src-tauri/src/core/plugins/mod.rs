pub mod executor;
pub mod manifest;

use std::path::{Path, PathBuf};

use manifest::{PluginCommand, PluginManifest};
use serde::Serialize;

#[derive(Clone, Debug, Serialize)]
pub struct PluginInfo {
    pub name: String,
    pub version: String,
    pub description: String,
    pub commands: Vec<PluginCommand>,
    pub dir: String,
}

pub struct PluginManager {
    plugins_dir: PathBuf,
}

impl PluginManager {
    pub fn new(data_dir: &Path) -> Self {
        Self { plugins_dir: data_dir.join("plugins") }
    }

    pub fn scan_plugins(&self) -> Vec<PluginInfo> {
        let entries = match std::fs::read_dir(&self.plugins_dir) {
            Ok(e) => e,
            Err(_) => return Vec::new(),
        };
        let mut plugins = Vec::new();
        for entry in entries.flatten() {
            let path = entry.path();
            if !path.is_dir() { continue; }
            if let Some(m) = manifest::load_manifest(&path) {
                plugins.push(PluginInfo {
                    name: m.name,
                    version: m.version,
                    description: m.description,
                    commands: m.commands,
                    dir: path.display().to_string(),
                });
            }
        }
        plugins
    }

    pub fn execute_command(
        &self,
        plugin_name: &str,
        command_name: &str,
        project_root: Option<&Path>,
    ) -> Result<String, String> {
        let plugins = self.scan_plugins();
        let plugin = plugins.iter()
            .find(|p| p.name == plugin_name)
            .ok_or_else(|| format!("Plugin '{}' not found", plugin_name))?;
        let cmd = plugin.commands.iter()
            .find(|c| c.name == command_name)
            .ok_or_else(|| format!("Command '{}' not found in '{}'", command_name, plugin_name))?;
        let result = executor::execute_script(
            Path::new(&plugin.dir), &cmd.script, project_root,
        )?;
        if result.success {
            Ok(result.stdout)
        } else {
            Err(result.stderr)
        }
    }
}
