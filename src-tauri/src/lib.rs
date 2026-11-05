mod pipeline;

use pipeline::{
    execute_full_upscale_pipeline, execute_preview_pipeline, probe_video_file, PreviewOutput,
    RenderProgress, VideoMetadata,
};
use serde::{Deserialize, Serialize};
use std::process::Command;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use tauri::{Emitter, State};

pub struct AppState {
    pub cancel_flag: Arc<AtomicBool>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SystemCapabilities {
    pub os: String,
    pub arch: String,
    pub has_apple_silicon: bool,
    pub chip_name: String,
}

#[tauri::command]
fn get_system_capabilities() -> SystemCapabilities {
    let arch = std::env::consts::ARCH.to_string();
    let os = std::env::consts::OS.to_string();
    let has_apple_silicon = os == "macos" && (arch == "aarch64" || arch == "arm64");
    let chip_name = pipeline::detect_hardware_chip();

    SystemCapabilities {
        os,
        arch,
        has_apple_silicon,
        chip_name,
    }
}

#[tauri::command]
fn probe_video(path: String) -> Result<VideoMetadata, String> {
    probe_video_file(&path)
}

#[tauri::command]
async fn render_preview(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    input_path: String,
    start_sec: f64,
    scale: u32,
    deinterlace: bool,
) -> Result<PreviewOutput, String> {
    let cancel_flag = state.cancel_flag.clone();
    cancel_flag.store(false, Ordering::Relaxed);

    tokio::task::spawn_blocking(move || {
        let app_clone = app.clone();
        execute_preview_pipeline(
            &input_path,
            start_sec,
            scale,
            deinterlace,
            move |progress: RenderProgress| {
                let _ = app_clone.emit("render-progress", &progress);
            },
            cancel_flag,
        )
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
}

#[tauri::command]
async fn upscale_video(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    input_path: String,
    output_path: String,
    scale: u32,
    deinterlace: bool,
) -> Result<String, String> {
    let cancel_flag = state.cancel_flag.clone();
    cancel_flag.store(false, Ordering::Relaxed);

    tokio::task::spawn_blocking(move || {
        let app_clone = app.clone();
        execute_full_upscale_pipeline(
            &input_path,
            &output_path,
            scale,
            deinterlace,
            move |progress: RenderProgress| {
                let _ = app_clone.emit("render-progress", &progress);
            },
            cancel_flag,
        )
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
}

#[tauri::command]
fn cancel_render(state: State<'_, AppState>) -> Result<(), String> {
    state.cancel_flag.store(true, Ordering::Relaxed);
    Ok(())
}

#[tauri::command]
fn show_in_finder(path: String) -> Result<(), String> {
    Command::new("open")
        .args(["-R", &path])
        .spawn()
        .map_err(|e| format!("Failed to open finder: {}", e))?;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let cancel_flag = Arc::new(AtomicBool::new(false));

    tauri::Builder::default()
        .manage(AppState { cancel_flag })
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            get_system_capabilities,
            probe_video,
            render_preview,
            upscale_video,
            cancel_render,
            show_in_finder
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
