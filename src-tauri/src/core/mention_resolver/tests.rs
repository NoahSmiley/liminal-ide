use super::*;

#[test]
fn no_mentions_returns_original_prompt_unchanged() {
    let tmp = tempfile::tempdir().unwrap();
    let (result, mentions) = resolve_mentions("hello world", tmp.path()).unwrap();
    assert_eq!(result, "hello world");
    assert!(mentions.is_empty());
}

#[test]
fn direct_filename_resolves_to_file_content() {
    let tmp = tempfile::tempdir().unwrap();
    std::fs::write(tmp.path().join("config.toml"), "key = \"value\"").unwrap();
    let (result, mentions) = resolve_mentions(
        "Check @config.toml please",
        tmp.path(),
    ).unwrap();
    assert_eq!(mentions.len(), 1);
    assert_eq!(mentions[0].pattern, "@config.toml");
    assert_eq!(mentions[0].content, "key = \"value\"");
    assert!(result.contains("<mentioned-files>"));
    assert!(result.contains("key = \"value\""));
}

#[test]
fn fuzzy_matching_finds_files_containing_pattern() {
    let tmp = tempfile::tempdir().unwrap();
    std::fs::create_dir_all(tmp.path().join("src")).unwrap();
    std::fs::write(
        tmp.path().join("src/my_config.rs"),
        "pub struct Config {}",
    ).unwrap();
    let (_, mentions) = resolve_mentions(
        "Look at @my_config",
        tmp.path(),
    ).unwrap();
    assert_eq!(mentions.len(), 1);
    assert!(mentions[0].path.contains("my_config"));
}

#[test]
fn multiple_mentions_all_resolved() {
    let tmp = tempfile::tempdir().unwrap();
    std::fs::write(tmp.path().join("a.txt"), "alpha").unwrap();
    std::fs::write(tmp.path().join("b.txt"), "beta").unwrap();
    let (result, mentions) = resolve_mentions(
        "Compare @a.txt and @b.txt",
        tmp.path(),
    ).unwrap();
    assert_eq!(mentions.len(), 2);
    assert!(result.contains("alpha"));
    assert!(result.contains("beta"));
}

#[test]
fn nonexistent_file_returns_empty_mentions() {
    let tmp = tempfile::tempdir().unwrap();
    let (result, mentions) = resolve_mentions(
        "Open @nonexistent.txt",
        tmp.path(),
    ).unwrap();
    assert!(mentions.is_empty());
    assert_eq!(result, "Open @nonexistent.txt");
}

#[test]
fn output_includes_mentioned_files_xml_block() {
    let tmp = tempfile::tempdir().unwrap();
    std::fs::write(tmp.path().join("data.json"), "{}").unwrap();
    let (result, _) = resolve_mentions("See @data.json", tmp.path()).unwrap();
    assert!(result.contains("<mentioned-files>"));
    assert!(result.contains("</mentioned-files>"));
    assert!(result.contains("--- data.json ---"));
}
