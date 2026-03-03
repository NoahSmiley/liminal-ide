use super::*;
use std::path::PathBuf;

#[test]
fn save_image_decodes_base64_and_writes_file() {
    let tmp = tempfile::tempdir().unwrap();
    // "Hello" in base64 is "SGVsbG8="
    let result = save_image(tmp.path(), "SGVsbG8=", "image/png").unwrap();
    assert!(result.path.exists());
    let bytes = std::fs::read(&result.path).unwrap();
    assert_eq!(bytes, b"Hello");
    assert_eq!(result.mime_type, "image/png");
    assert!(result.path.to_string_lossy().ends_with(".png"));
}

#[test]
fn save_image_strips_data_url_prefix() {
    let tmp = tempfile::tempdir().unwrap();
    // "Hi" in base64 is "SGk="
    let data_url = "data:image/jpeg;base64,SGk=";
    let result = save_image(tmp.path(), data_url, "image/jpeg").unwrap();
    let bytes = std::fs::read(&result.path).unwrap();
    assert_eq!(bytes, b"Hi");
}

#[test]
fn format_image_prompt_includes_path_and_mime() {
    let image = ImageData {
        id: "abc".to_string(),
        path: PathBuf::from("/tmp/images/abc.png"),
        mime_type: "image/png".to_string(),
    };
    let prompt = format_image_prompt(&image);
    assert!(prompt.contains("/tmp/images/abc.png"));
    assert!(prompt.contains("image/png"));
    assert!(prompt.starts_with("[Image attached:"));
}

#[test]
fn mime_to_extension_maps_correctly() {
    assert_eq!(mime_to_extension("image/png"), "png");
    assert_eq!(mime_to_extension("image/jpeg"), "jpg");
    assert_eq!(mime_to_extension("image/jpg"), "jpg");
    assert_eq!(mime_to_extension("image/gif"), "gif");
    assert_eq!(mime_to_extension("image/webp"), "webp");
    assert_eq!(mime_to_extension("image/svg+xml"), "svg");
    assert_eq!(mime_to_extension("image/unknown"), "png"); // default
}

#[test]
fn invalid_base64_returns_error() {
    let tmp = tempfile::tempdir().unwrap();
    let result = save_image(tmp.path(), "!!!invalid!!!", "image/png");
    assert!(result.is_err());
}
