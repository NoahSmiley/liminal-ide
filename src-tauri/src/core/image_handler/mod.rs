#[cfg(test)]
mod tests;

use std::path::{Path, PathBuf};
use uuid::Uuid;

use crate::error::FsError;

pub struct ImageData {
    pub id: String,
    pub path: PathBuf,
    pub mime_type: String,
}

/// Receives base64-encoded image data, saves to temp directory,
/// returns metadata for constructing the image prompt.
pub fn save_image(
    data_dir: &Path,
    base64_data: &str,
    mime_type: &str,
) -> Result<ImageData, FsError> {
    let images_dir = data_dir.join("images");
    std::fs::create_dir_all(&images_dir).map_err(FsError::Io)?;

    let ext = mime_to_extension(mime_type);
    let id = Uuid::new_v4().to_string();
    let filename = format!("{}.{}", id, ext);
    let path = images_dir.join(&filename);

    let bytes = base64_decode(base64_data)
        .map_err(|e| FsError::Io(std::io::Error::new(std::io::ErrorKind::InvalidData, e)))?;
    std::fs::write(&path, bytes).map_err(FsError::Io)?;

    Ok(ImageData {
        id,
        path,
        mime_type: mime_type.to_string(),
    })
}

/// Constructs a prompt segment describing the attached image.
pub fn format_image_prompt(image: &ImageData) -> String {
    format!(
        "[Image attached: {} ({})]",
        image.path.display(),
        image.mime_type,
    )
}

fn mime_to_extension(mime: &str) -> &str {
    match mime {
        "image/png" => "png",
        "image/jpeg" | "image/jpg" => "jpg",
        "image/gif" => "gif",
        "image/webp" => "webp",
        "image/svg+xml" => "svg",
        _ => "png",
    }
}

fn base64_decode(data: &str) -> Result<Vec<u8>, String> {
    // Strip data URL prefix if present
    let clean = if let Some(idx) = data.find(",") {
        &data[idx + 1..]
    } else {
        data
    };
    // Simple base64 decode without external dependency
    decode_base64(clean)
}

fn decode_base64(input: &str) -> Result<Vec<u8>, String> {
    const TABLE: &[u8; 64] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut output = Vec::new();
    let mut buf: u32 = 0;
    let mut bits: u32 = 0;
    for &b in input.as_bytes() {
        if b == b'=' || b == b'\n' || b == b'\r' || b == b' ' { continue; }
        let val = TABLE.iter().position(|&c| c == b)
            .ok_or_else(|| format!("invalid base64 char: {}", b as char))? as u32;
        buf = (buf << 6) | val;
        bits += 6;
        if bits >= 8 {
            bits -= 8;
            output.push((buf >> bits) as u8);
            buf &= (1 << bits) - 1;
        }
    }
    Ok(output)
}
