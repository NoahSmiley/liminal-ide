use std::path::Path;
use super::Skill;

/// Walk a directory looking for SKILL.md files and parse them.
pub fn scan_directory(dir: &Path, source: &str, out: &mut Vec<Skill>) {
    let Ok(entries) = std::fs::read_dir(dir) else { return };

    for entry in entries.flatten() {
        let path = entry.path();
        if path.is_dir() {
            // Look for SKILL.md inside subdirectory
            let skill_file = path.join("SKILL.md");
            if skill_file.is_file() {
                if let Some(skill) = parse_skill_file(&skill_file, source) {
                    out.push(skill);
                }
            }
        } else if path.is_file() && path.file_name().map(|f| f == "SKILL.md").unwrap_or(false) {
            if let Some(skill) = parse_skill_file(&path, source) {
                out.push(skill);
            }
        }
    }
}

fn parse_skill_file(path: &Path, source: &str) -> Option<Skill> {
    let content = std::fs::read_to_string(path).ok()?;

    // Extract name from parent directory or first heading
    let name = path.parent()
        .and_then(|p| p.file_name())
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| "unnamed".to_string());

    // Extract description from first line or frontmatter
    let description = extract_description(&content);

    // Use directory name as stable id
    let id = format!("{source}:{name}");

    Some(Skill {
        id,
        name,
        description,
        content,
        source: source.to_string(),
    })
}

fn extract_description(content: &str) -> String {
    for line in content.lines() {
        let trimmed = line.trim();
        // Skip frontmatter delimiters and headings
        if trimmed == "---" || trimmed.is_empty() { continue; }
        if trimmed.starts_with('#') {
            return trimmed.trim_start_matches('#').trim().to_string();
        }
        // First non-empty, non-heading line
        return trimmed.chars().take(120).collect();
    }
    "No description".to_string()
}
