use super::*;

fn make_project(dir: &std::path::Path) {
    std::fs::create_dir_all(dir.join("src")).unwrap();
    std::fs::write(
        dir.join("src/main.rs"),
        "fn main() {\n    // TODO: implement this\n    // FIXME: broken logic\n}\n",
    ).unwrap();
}

#[test]
fn scan_todos_finds_todo_comments() {
    let tmp = tempfile::tempdir().unwrap();
    make_project(tmp.path());
    let items = scan_todos(tmp.path());
    assert!(items.iter().any(|i| matches!(i.kind, item::TodoKind::Todo)));
}

#[test]
fn scan_todos_finds_fixme_comments() {
    let tmp = tempfile::tempdir().unwrap();
    make_project(tmp.path());
    let items = scan_todos(tmp.path());
    assert!(items.iter().any(|i| matches!(i.kind, item::TodoKind::Fixme)));
}

#[test]
fn scan_todos_respects_gitignore() {
    let tmp = tempfile::tempdir().unwrap();
    std::fs::create_dir_all(tmp.path().join("ignored_dir")).unwrap();
    std::fs::write(
        tmp.path().join("ignored_dir/file.rs"),
        "// TODO: should be ignored\n",
    ).unwrap();
    std::fs::write(
        tmp.path().join(".gitignore"),
        "ignored_dir\n",
    ).unwrap();
    std::fs::write(
        tmp.path().join("visible.rs"),
        "// TODO: should be found\n",
    ).unwrap();
    let items = scan_todos(tmp.path());
    // Only the visible.rs TODO should be found
    assert_eq!(items.len(), 1);
    assert!(items[0].path.contains("visible"));
}

#[test]
fn scan_todos_returns_correct_line_numbers() {
    let tmp = tempfile::tempdir().unwrap();
    std::fs::write(
        tmp.path().join("code.rs"),
        "line one\nline two\n// TODO: on line three\nline four\n",
    ).unwrap();
    let items = scan_todos(tmp.path());
    assert_eq!(items.len(), 1);
    assert_eq!(items[0].line_number, 3);
}

#[test]
fn scan_todos_extracts_text_after_marker() {
    let tmp = tempfile::tempdir().unwrap();
    std::fs::write(
        tmp.path().join("code.rs"),
        "// TODO: implement authentication\n// FIXME(urgent): memory leak\n",
    ).unwrap();
    let items = scan_todos(tmp.path());
    assert_eq!(items.len(), 2);
    let todo = items.iter().find(|i| matches!(i.kind, item::TodoKind::Todo)).unwrap();
    assert_eq!(todo.text, "implement authentication");
    let fixme = items.iter().find(|i| matches!(i.kind, item::TodoKind::Fixme)).unwrap();
    assert!(fixme.text.contains("urgent"));
}
