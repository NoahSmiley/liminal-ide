pub mod scanner;

use serde::{Deserialize, Serialize};
use std::path::Path;

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Skill {
    pub id: String,
    pub name: String,
    pub description: String,
    pub content: String,
    pub source: String,
}

pub struct SkillScanner;

impl SkillScanner {
    /// Scans for SKILL.md files in project-local and global .claude/skills/ directories.
    pub fn scan_skills(project_root: Option<&Path>) -> Vec<Skill> {
        let mut skills = Vec::new();

        // Project-local skills
        if let Some(root) = project_root {
            let local_dir = root.join(".claude").join("skills");
            if local_dir.is_dir() {
                scanner::scan_directory(&local_dir, "project", &mut skills);
            }
        }

        // Global skills (~/.claude/skills/)
        if let Some(home) = dirs_next::home_dir() {
            let global_dir = home.join(".claude").join("skills");
            if global_dir.is_dir() {
                scanner::scan_directory(&global_dir, "global", &mut skills);
            }
        }

        skills
    }
}
