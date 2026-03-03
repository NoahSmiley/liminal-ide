use super::*;

fn make_test_tree(dir: &std::path::Path) {
    std::fs::create_dir_all(dir.join("src")).unwrap();
    std::fs::write(dir.join("src/main.rs"), "fn main() {\n    println!(\"Hello World\");\n}\n").unwrap();
    std::fs::write(dir.join("src/lib.rs"), "pub fn greet() {\n    println!(\"hello world\");\n}\n").unwrap();
    std::fs::write(dir.join("README.md"), "# Hello\nThis is a readme.\n").unwrap();
}

#[test]
fn empty_query_returns_empty_results() {
    let tmp = tempfile::tempdir().unwrap();
    make_test_tree(tmp.path());
    let results = search_project(tmp.path(), "", &SearchOptions::default()).unwrap();
    assert!(results.is_empty());
}

#[test]
fn case_insensitive_search_finds_matches() {
    let tmp = tempfile::tempdir().unwrap();
    make_test_tree(tmp.path());
    let opts = SearchOptions { case_sensitive: false, ..Default::default() };
    let results = search_project(tmp.path(), "hello", &opts).unwrap();
    // Should find in main.rs ("Hello World"), lib.rs ("hello world"), README.md ("Hello")
    assert!(results.len() >= 2);
    let all_matches: Vec<_> = results.iter().flat_map(|r| &r.matches).collect();
    assert!(all_matches.len() >= 3);
}

#[test]
fn case_sensitive_search_distinguishes_case() {
    let tmp = tempfile::tempdir().unwrap();
    make_test_tree(tmp.path());
    let opts = SearchOptions { case_sensitive: true, regex: false, max_results: 500 };
    let results = search_project(tmp.path(), "Hello", &opts).unwrap();
    let all_lines: Vec<_> = results.iter().flat_map(|r| &r.matches).collect();
    // "hello world" (lowercase) should NOT match
    for m in &all_lines {
        assert!(m.line_content.contains("Hello"));
    }
}

#[test]
fn regex_search_works() {
    let tmp = tempfile::tempdir().unwrap();
    make_test_tree(tmp.path());
    let opts = SearchOptions { case_sensitive: false, regex: true, max_results: 500 };
    let results = search_project(tmp.path(), r"fn \w+\(\)", &opts).unwrap();
    assert!(!results.is_empty());
}

#[test]
fn results_include_line_number_and_content() {
    let tmp = tempfile::tempdir().unwrap();
    make_test_tree(tmp.path());
    let results = search_project(tmp.path(), "println", &SearchOptions::default()).unwrap();
    assert!(!results.is_empty());
    for result in &results {
        for m in &result.matches {
            assert!(m.line_number >= 1);
            assert!(m.line_content.contains("println"));
        }
    }
}

#[test]
fn searches_skip_binary_unreadable_files() {
    let tmp = tempfile::tempdir().unwrap();
    make_test_tree(tmp.path());
    // Write a file with invalid UTF-8
    std::fs::write(tmp.path().join("binary.bin"), &[0xFF, 0xFE, 0x00, 0x01]).unwrap();
    // Should not panic or error, just skip
    let results = search_project(tmp.path(), "Hello", &SearchOptions::default()).unwrap();
    assert!(!results.is_empty()); // Still finds text file matches
}

#[test]
fn max_results_caps_output() {
    let tmp = tempfile::tempdir().unwrap();
    // Create a file with many matching lines
    let content: String = (0..100).map(|i| format!("match line {}\n", i)).collect();
    std::fs::write(tmp.path().join("many.txt"), &content).unwrap();
    let opts = SearchOptions { case_sensitive: false, regex: false, max_results: 5 };
    let results = search_project(tmp.path(), "match", &opts).unwrap();
    let total: usize = results.iter().map(|r| r.matches.len()).sum();
    assert!(total <= 5);
}
