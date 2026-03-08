use std::path::Path;
use super::AgentTemplate;

pub fn scan_agents(dir: &Path, out: &mut Vec<AgentTemplate>) {
    let Ok(entries) = std::fs::read_dir(dir) else { return };

    for entry in entries.flatten() {
        let path = entry.path();
        if path.extension().map(|e| e == "json").unwrap_or(false) {
            if let Ok(contents) = std::fs::read_to_string(&path) {
                if let Ok(template) = serde_json::from_str::<AgentTemplate>(&contents) {
                    out.push(template);
                }
            }
        }
    }
}

pub fn save_agent(dir: &Path, template: &AgentTemplate) -> Result<(), String> {
    std::fs::create_dir_all(dir).map_err(|e| e.to_string())?;
    let path = dir.join(format!("{}.json", sanitize_filename(&template.id)));
    let json = serde_json::to_string_pretty(template).map_err(|e| e.to_string())?;
    std::fs::write(path, json).map_err(|e| e.to_string())
}

pub fn delete_agent(dir: &Path, id: &str) -> Result<(), String> {
    let path = dir.join(format!("{}.json", sanitize_filename(id)));
    if path.exists() {
        std::fs::remove_file(path).map_err(|e| e.to_string())
    } else {
        Ok(())
    }
}

fn sanitize_filename(name: &str) -> String {
    name.chars()
        .map(|c| if c.is_alphanumeric() || c == '-' || c == '_' { c } else { '_' })
        .collect()
}
