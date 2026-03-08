use std::sync::Arc;
use std::net::UdpSocket;
use serde::Serialize;
use tauri::State;

use crate::core::relay::types::{CloudStatus, PairedDevice, RelayConfig, RelayStatus};
use crate::error::AppError;
use crate::state::AppState;

use base64::Engine;

#[derive(Serialize)]
pub struct PairingQR {
    pub qr_data_url: String,
    /// For local pairing: the local IP address. For cloud: the proxy URL.
    pub host: String,
    /// For local pairing: the port. For cloud: empty.
    pub port: u16,
    /// For local pairing: the pairing code. For cloud: the account key.
    pub code: String,
}

/// Get the local network IP address by connecting a UDP socket to an external address.
/// This doesn't send any data — it just lets the OS pick the right local interface.
fn get_local_ip() -> Option<String> {
    let socket = UdpSocket::bind("0.0.0.0:0").ok()?;
    socket.connect("8.8.8.8:80").ok()?;
    let addr = socket.local_addr().ok()?;
    Some(addr.ip().to_string())
}

#[tauri::command]
pub async fn start_relay(state: State<'_, std::sync::Arc<AppState>>) -> Result<RelayStatus, AppError> {
    // We need an Arc<AppState> for the relay server. The State wrapper
    // gives us a reference, so we create a self-referencing Arc via inner().
    let app_state: Arc<AppState> = state.inner().clone();
    state
        .relay_manager
        .start(app_state)
        .await
        .map_err(AppError::Relay)
}

#[tauri::command]
pub async fn stop_relay(state: State<'_, std::sync::Arc<AppState>>) -> Result<(), AppError> {
    state.relay_manager.stop().await;
    Ok(())
}

#[tauri::command]
pub async fn get_relay_status(state: State<'_, std::sync::Arc<AppState>>) -> Result<RelayStatus, AppError> {
    Ok(state.relay_manager.status().await)
}

#[tauri::command]
pub async fn get_pairing_code(state: State<'_, std::sync::Arc<AppState>>) -> Result<Option<String>, AppError> {
    Ok(state.relay_manager.get_pairing_code().await)
}

#[tauri::command]
pub async fn regenerate_pairing_code(
    state: State<'_, std::sync::Arc<AppState>>,
) -> Result<Option<String>, AppError> {
    Ok(state.relay_manager.regenerate_pairing_code().await)
}

#[tauri::command]
pub async fn list_paired_devices(
    state: State<'_, std::sync::Arc<AppState>>,
) -> Result<Vec<PairedDevice>, AppError> {
    Ok(state.relay_manager.list_devices().await)
}

#[tauri::command]
pub async fn revoke_paired_device(
    state: State<'_, std::sync::Arc<AppState>>,
    device_id: String,
) -> Result<bool, AppError> {
    Ok(state.relay_manager.revoke_device(&device_id).await)
}

#[tauri::command]
pub async fn update_relay_config(
    state: State<'_, std::sync::Arc<AppState>>,
    config: RelayConfig,
) -> Result<(), AppError> {
    state
        .relay_manager
        .update_config(config)
        .await
        .map_err(AppError::Relay)
}

#[tauri::command]
pub async fn start_cloud_relay(
    state: State<'_, std::sync::Arc<AppState>>,
) -> Result<CloudStatus, AppError> {
    let app_state: Arc<AppState> = state.inner().clone();
    state
        .relay_manager
        .start_cloud(app_state)
        .await
        .map_err(AppError::Relay)
}

#[tauri::command]
pub async fn stop_cloud_relay(
    state: State<'_, std::sync::Arc<AppState>>,
) -> Result<(), AppError> {
    state.relay_manager.stop_cloud().await;
    Ok(())
}

#[tauri::command]
pub async fn get_cloud_status(
    state: State<'_, std::sync::Arc<AppState>>,
) -> Result<CloudStatus, AppError> {
    Ok(state.relay_manager.cloud_status().await)
}

#[tauri::command]
pub async fn get_account_key(
    state: State<'_, std::sync::Arc<AppState>>,
) -> Result<String, AppError> {
    let key = state.relay_manager.get_account_key().await;
    Ok(key.to_string())
}

#[tauri::command]
pub async fn set_cloud_url(
    state: State<'_, std::sync::Arc<AppState>>,
    url: String,
) -> Result<(), AppError> {
    state.relay_manager.set_cloud_url(url).await;
    Ok(())
}

/// Generate a QR code data URL containing the cloud proxy URL and account key.
/// The QR payload is JSON: {"proxy": "wss://...", "key": "<uuid>"}
/// Returns a PNG data URL string.
#[tauri::command]
pub async fn generate_cloud_qr(
    state: State<'_, std::sync::Arc<AppState>>,
) -> Result<String, AppError> {
    let status = state.relay_manager.cloud_status().await;
    let cloud_url = status.cloud_url
        .ok_or_else(|| AppError::Relay("No cloud URL configured".to_string()))?;
    let account_key = status.account_key
        .ok_or_else(|| AppError::Relay("No account key configured".to_string()))?;

    let payload = serde_json::json!({
        "proxy": cloud_url,
        "key": account_key.to_string(),
    });

    let code = qrcode::QrCode::new(payload.to_string().as_bytes())
        .map_err(|e| AppError::Relay(format!("QR generation failed: {e}")))?;

    let image = code.render::<qrcode::render::svg::Color>()
        .min_dimensions(200, 200)
        .build();

    let b64 = base64::engine::general_purpose::STANDARD.encode(image.as_bytes());
    Ok(format!("data:image/svg+xml;base64,{b64}"))
}

/// Generate a QR code for device pairing.
/// Prefers local relay (starts it if needed). Falls back to cloud if configured.
/// Local QR payload: {"ip": "...", "port": "...", "code": "..."}
/// Cloud QR payload: {"proxy": "...", "key": "..."}
#[tauri::command]
pub async fn generate_pairing_qr(
    state: State<'_, std::sync::Arc<AppState>>,
) -> Result<PairingQR, AppError> {
    // Start local relay if not already running
    let relay_status = state.relay_manager.status().await;
    let relay_status = if !relay_status.running {
        let app_state: Arc<AppState> = state.inner().clone();
        state.relay_manager.start(app_state).await
            .map_err(AppError::Relay)?
    } else {
        relay_status
    };

    let local_ip = get_local_ip()
        .ok_or_else(|| AppError::Relay("Could not detect local IP address".to_string()))?;
    let port = relay_status.port;
    let code = relay_status.pairing_code
        .ok_or_else(|| AppError::Relay("No pairing code available".to_string()))?;

    let payload = serde_json::json!({
        "ip": local_ip,
        "port": port.to_string(),
        "code": code,
    });

    let qr = qrcode::QrCode::new(payload.to_string().as_bytes())
        .map_err(|e| AppError::Relay(format!("QR generation failed: {e}")))?;

    let svg = qr.render::<qrcode::render::svg::Color>()
        .min_dimensions(200, 200)
        .build();

    let b64 = base64::engine::general_purpose::STANDARD.encode(svg.as_bytes());
    let data_url = format!("data:image/svg+xml;base64,{b64}");

    Ok(PairingQR {
        qr_data_url: data_url,
        host: local_ip,
        port,
        code,
    })
}
