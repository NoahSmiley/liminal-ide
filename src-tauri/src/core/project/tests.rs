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

#[tokio::test]
async fn persistence_round_trip() {
    let dir = env::temp_dir().join("liminal-project-persist-test");
    let _ = std::fs::remove_dir_all(&dir);
    let tmp = env::temp_dir().join("liminal-proj-test-root");
    std::fs::create_dir_all(&tmp).unwrap();

    let mgr = ProjectManager::with_data_dir(dir.clone());
    let project = mgr
        .create_project("persisted".into(), tmp.clone())
        .await
        .unwrap();

    let mgr2 = ProjectManager::with_data_dir(dir.clone());
    let list = mgr2.list_projects().await;
    assert!(list.iter().any(|p| p.id == project.id));

    let _ = std::fs::remove_dir_all(&dir);
    let _ = std::fs::remove_dir_all(&tmp);
}

#[tokio::test]
async fn open_deduplicates_same_path() {
    let mgr = ProjectManager::new();
    let tmp = env::temp_dir().join("liminal-test-dedup");
    std::fs::create_dir_all(&tmp).unwrap();
    let p1 = mgr.open_project(tmp.clone()).await.unwrap();
    let p2 = mgr.open_project(tmp.clone()).await.unwrap();
    assert_eq!(p1.id, p2.id);
    let _ = std::fs::remove_dir_all(&tmp);
}
