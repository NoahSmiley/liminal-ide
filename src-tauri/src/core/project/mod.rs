pub mod storage;

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
    data_dir: Option<PathBuf>,
}

impl ProjectManager {
    pub fn new() -> Self {
        Self {
            projects: Mutex::new(HashMap::new()),
            active_project: Mutex::new(None),
            data_dir: None,
        }
    }

    pub fn with_data_dir(data_dir: PathBuf) -> Self {
        let mut mgr = Self {
            projects: Mutex::new(HashMap::new()),
            active_project: Mutex::new(None),
            data_dir: Some(data_dir.clone()),
        };
        mgr.load_persisted();
        mgr
    }

    fn load_persisted(&mut self) {
        let Some(dir) = &self.data_dir else { return };
        let persisted = storage::load_all(dir);
        let projects = self.projects.get_mut();
        for p in persisted {
            projects.insert(p.id, p);
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
        if let Some(dir) = &self.data_dir {
            let _ = storage::save(dir, &project);
        }

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

        // Deduplicate: reuse existing entry if same path already known
        let canonical = std::fs::canonicalize(&path)
            .unwrap_or_else(|_| path.clone());
        {
            let projects = self.projects.lock().await;
            for project in projects.values() {
                let existing = std::fs::canonicalize(&project.root_path)
                    .unwrap_or_else(|_| project.root_path.clone());
                if existing == canonical {
                    let mut active = self.active_project.lock().await;
                    *active = Some(project.id);
                    return Ok(project.clone());
                }
            }
        }

        let name = path
            .file_name()
            .map(|n| n.to_string_lossy().to_string())
            .unwrap_or_else(|| "untitled".to_string());

        self.create_project(name, path).await
    }

    pub async fn remove_project(&self, id: Uuid) -> Result<(), ProjectError> {
        let mut projects = self.projects.lock().await;
        projects.remove(&id);
        if let Some(dir) = &self.data_dir {
            storage::remove(dir, &id.to_string())?;
        }
        let mut active = self.active_project.lock().await;
        if *active == Some(id) {
            *active = None;
        }
        Ok(())
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
mod tests;
