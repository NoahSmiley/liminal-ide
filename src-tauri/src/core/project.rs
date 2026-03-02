use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;
use tokio::sync::Mutex;
use uuid::Uuid;

use crate::error::ProjectError;

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Project {
    pub id: Uuid,
    pub name: String,
    pub root_path: PathBuf,
}

#[derive(Clone, Debug, Serialize)]
pub struct ProjectSummary {
    pub id: Uuid,
    pub name: String,
    pub root_path: String,
}

pub struct ProjectManager {
    projects: Mutex<HashMap<Uuid, Project>>,
    active_project: Mutex<Option<Uuid>>,
}

impl ProjectManager {
    pub fn new() -> Self {
        Self {
            projects: Mutex::new(HashMap::new()),
            active_project: Mutex::new(None),
        }
    }

    pub async fn create_project(
        &self,
        name: String,
        path: PathBuf,
    ) -> Result<Project, ProjectError> {
        if !path.exists() {
            std::fs::create_dir_all(&path)
                .map_err(|e| ProjectError::InvalidPath(e.to_string()))?;
        }

        let project = Project {
            id: Uuid::new_v4(),
            name,
            root_path: path,
        };

        let mut projects = self.projects.lock().await;
        projects.insert(project.id, project.clone());

        let mut active = self.active_project.lock().await;
        *active = Some(project.id);

        Ok(project)
    }

    pub async fn open_project(
        &self,
        path: PathBuf,
    ) -> Result<Project, ProjectError> {
        if !path.exists() {
            return Err(ProjectError::InvalidPath(
                format!("Path does not exist: {}", path.display()),
            ));
        }

        let name = path
            .file_name()
            .map(|n| n.to_string_lossy().to_string())
            .unwrap_or_else(|| "untitled".to_string());

        self.create_project(name, path).await
    }

    pub async fn get_active(&self) -> Option<Project> {
        let active_id = self.active_project.lock().await;
        let projects = self.projects.lock().await;
        active_id.and_then(|id| projects.get(&id).cloned())
    }

    pub async fn list_projects(&self) -> Vec<ProjectSummary> {
        let projects = self.projects.lock().await;
        projects
            .values()
            .map(|p| ProjectSummary {
                id: p.id,
                name: p.name.clone(),
                root_path: p.root_path.display().to_string(),
            })
            .collect()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::env;

    #[tokio::test]
    async fn create_project_sets_active() {
        let mgr = ProjectManager::new();
        let tmp = env::temp_dir().join("liminal-test-create");
        let project = mgr
            .create_project("test".into(), tmp.clone())
            .await
            .expect("create failed");
        let active = mgr.get_active().await.expect("no active project");
        assert_eq!(active.id, project.id);
        let _ = std::fs::remove_dir_all(&tmp);
    }

    #[tokio::test]
    async fn open_nonexistent_path_fails() {
        let mgr = ProjectManager::new();
        let result = mgr
            .open_project(PathBuf::from("/nonexistent/path/liminal-test"))
            .await;
        assert!(result.is_err());
    }
}
