mod pipeline;

use pipeline::{execute_preview_pipeline, probe_video_file, PreviewOutput, VideoMetadata};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct SystemCapabilities {
    pub os: String,
    pub arch: String,
    pub has_apple_silicon: bool,
}

#[tauri::command]
fn get_system_capabilities() -> SystemCapabilities {
    let arch = std::env::consts::ARCH.to_string();
    let os = std::env::consts::OS.to_string();
    let has_apple_silicon = os == "macos" && (arch == "aarch64" || arch == "arm64");

    SystemCapabilities {
        os,
        arch,
        has_apple_silicon,
    }
}

#[tauri::command]
fn probe_video(path: String) -> Result<VideoMetadata, String> {
    probe_video_file(&path)
}

#[tauri::command]
fn render_preview(
    input_path: String,
    start_sec: f64,
    scale: u32,
    deinterlace: bool,
) -> Result<PreviewOutput, String> {
    execute_preview_pipeline(&input_path, start_sec, scale, deinterlace)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            get_system_capabilities,
            probe_video,
            render_preview
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
