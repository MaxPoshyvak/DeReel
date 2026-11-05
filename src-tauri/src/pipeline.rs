use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Debug, Serialize, Deserialize)]
pub struct VideoMetadata {
    pub name: String,
    pub path: String,
    pub size: u64,
    pub duration: f64,
    pub fps: f64,
    pub width: u32,
    pub height: u32,
    pub codec: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PreviewOutput {
    pub original_path: String,
    pub enhanced_path: String,
    pub duration: f64,
    pub output_width: u32,
    pub output_height: u32,
}

#[derive(Deserialize)]
struct FFprobeStream {
    width: Option<u32>,
    height: Option<u32>,
    codec_name: Option<String>,
    duration: Option<String>,
    r_frame_rate: Option<String>,
}

#[derive(Deserialize)]
struct FFprobeFormat {
    duration: Option<String>,
}

#[derive(Deserialize)]
struct FFprobeOutput {
    streams: Option<Vec<FFprobeStream>>,
    format: Option<FFprobeFormat>,
}

fn get_binary_path() -> PathBuf {
    // Current executable dir or relative binaries dir
    let mut path = std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."));
    if path.ends_with("src-tauri") {
        path.push("binaries");
    } else {
        path.push("src-tauri");
        path.push("binaries");
    }
    path
}

pub fn probe_video_file(path_str: &str) -> Result<VideoMetadata, String> {
    let path = Path::new(path_str);
    if !path.exists() {
        return Err(format!("File does not exist: {}", path_str));
    }

    let file_name = path
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| "video.mp4".to_string());

    let file_size = fs::metadata(path).map(|m| m.len()).unwrap_or(0);

    let output = Command::new("ffprobe")
        .args([
            "-v",
            "quiet",
            "-print_format",
            "json",
            "-show_format",
            "-show_streams",
            path_str,
        ])
        .output()
        .map_err(|e| format!("Failed to run ffprobe: {}", e))?;

    if !output.status.success() {
        return Err("ffprobe failed to analyze video".to_string());
    }

    let probe: FFprobeOutput = serde_json::from_slice(&output.stdout)
        .map_err(|e| format!("Failed to parse ffprobe json: {}", e))?;

    let video_stream = probe
        .streams
        .as_ref()
        .and_then(|s| s.iter().find(|st| st.width.is_some() && st.height.is_some()));

    let width = video_stream.and_then(|s| s.width).unwrap_or(640);
    let height = video_stream.and_then(|s| s.height).unwrap_or(480);
    let codec = video_stream
        .and_then(|s| s.codec_name.clone())
        .unwrap_or_else(|| "h264".to_string());

    let fps = video_stream
        .and_then(|s| s.r_frame_rate.as_ref())
        .and_then(|rate| {
            let parts: Vec<&str> = rate.split('/').collect();
            if parts.len() == 2 {
                let num: f64 = parts[0].parse().ok()?;
                let den: f64 = parts[1].parse().ok()?;
                if den > 0.0 {
                    return Some(num / den);
                }
            }
            rate.parse().ok()
        })
        .unwrap_or(29.97);

    let duration: f64 = video_stream
        .and_then(|s| s.duration.as_ref())
        .and_then(|d| d.parse().ok())
        .or_else(|| {
            probe
                .format
                .as_ref()
                .and_then(|f| f.duration.as_ref())
                .and_then(|d| d.parse().ok())
        })
        .unwrap_or(60.0);

    Ok(VideoMetadata {
        name: file_name,
        path: path_str.to_string(),
        size: file_size,
        duration,
        fps,
        width,
        height,
        codec,
    })
}

pub fn execute_preview_pipeline(
    input_path: &str,
    start_sec: f64,
    scale: u32,
    deinterlace: bool,
) -> Result<PreviewOutput, String> {
    let meta = probe_video_file(input_path)?;

    // 1. Create isolated temp dir for this preview run
    let ts = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis())
        .unwrap_or(0);
    let temp_dir = std::env::temp_dir().join(format!("dereel_preview_{}", ts));
    let frames_in_dir = temp_dir.join("in");
    let frames_out_dir = temp_dir.join("out");

    fs::create_dir_all(&frames_in_dir).map_err(|e| e.to_string())?;
    fs::create_dir_all(&frames_out_dir).map_err(|e| e.to_string())?;

    let original_3s_path = temp_dir.join("original_3s.mp4");
    let enhanced_3s_path = temp_dir.join("enhanced_3s.mp4");

    // 2. Generate clean original 3s clip for sync playback (with deinterlacing if requested)
    let filter_arg = if deinterlace {
        "bwdif=mode=send_frame"
    } else {
        "null"
    };

    let original_extract = Command::new("ffmpeg")
        .args([
            "-y",
            "-ss",
            &format!("{:.2}", start_sec),
            "-t",
            "3.0",
            "-i",
            input_path,
            "-vf",
            filter_arg,
            "-c:v",
            "h264_videotoolbox",
            "-b:v",
            "6M",
            "-pix_fmt",
            "yuv420p",
            "-an",
            original_3s_path.to_str().unwrap(),
        ])
        .output()
        .map_err(|e| format!("Failed to run ffmpeg: {}", e))?;

    if !original_extract.status.success() {
        return Err("Failed to extract original 3s segment".to_string());
    }

    // 3. Extract 3-second frames to PNG for AI inference
    let frame_pattern = frames_in_dir.join("frame_%04d.png");
    let extract_frames = Command::new("ffmpeg")
        .args([
            "-y",
            "-ss",
            &format!("{:.2}", start_sec),
            "-t",
            "3.0",
            "-i",
            input_path,
            "-vf",
            filter_arg,
            frame_pattern.to_str().unwrap(),
        ])
        .output()
        .map_err(|e| format!("Failed to extract frames: {}", e))?;

    if !extract_frames.status.success() {
        return Err("Failed to extract video frames".to_string());
    }

    // 4. Run real Real-ESRGAN inference on Apple Silicon GPU
    let bin_dir = get_binary_path();
    let runner = bin_dir.join("realesrgan-ncnn-vulkan");
    let models_dir = bin_dir.join("models");

    let scale_str = if scale == 4 { "4" } else { "2" };

    let ai_run = Command::new(&runner)
        .args([
            "-i",
            frames_in_dir.to_str().unwrap(),
            "-o",
            frames_out_dir.to_str().unwrap(),
            "-s",
            scale_str,
            "-m",
            models_dir.to_str().unwrap(),
            "-n",
            "realesr-animevideov3",
        ])
        .output()
        .map_err(|e| format!("Failed to execute Real-ESRGAN runner: {}", e))?;

    if !ai_run.status.success() {
        let err_msg = String::from_utf8_lossy(&ai_run.stderr);
        return Err(format!("AI upscaler execution failed: {}", err_msg));
    }

    // 5. Encode upscaled frames back to enhanced 3s MP4 using VideoToolbox
    let out_pattern = frames_out_dir.join("frame_%04d.png");
    let target_fps = if meta.fps > 0.0 { meta.fps } else { 29.97 };

    let encode_run = Command::new("ffmpeg")
        .args([
            "-y",
            "-r",
            &format!("{:.2}", target_fps),
            "-i",
            out_pattern.to_str().unwrap(),
            "-c:v",
            "h264_videotoolbox",
            "-b:v",
            "12M",
            "-pix_fmt",
            "yuv420p",
            enhanced_3s_path.to_str().unwrap(),
        ])
        .output()
        .map_err(|e| format!("Failed to encode output video: {}", e))?;

    if !encode_run.status.success() {
        return Err("Failed to encode final enhanced video".to_string());
    }

    // 6. Clean up raw frame images to obey Zero-Disk-Write rule
    let _ = fs::remove_dir_all(&frames_in_dir);
    let _ = fs::remove_dir_all(&frames_out_dir);

    let output_width = meta.width * (if scale == 4 { 4 } else { 2 });
    let output_height = meta.height * (if scale == 4 { 4 } else { 2 });

    Ok(PreviewOutput {
        original_path: original_3s_path.to_str().unwrap().to_string(),
        enhanced_path: enhanced_3s_path.to_str().unwrap().to_string(),
        duration: 3.0,
        output_width,
        output_height,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_pipeline_on_demo() {
        let mut demo = std::env::current_dir().unwrap();
        if !demo.ends_with("src-tauri") {
            demo.push("src-tauri");
        }
        demo.push("binaries");
        demo.push("onepiece_demo.mp4");

        if demo.exists() {
            let res = execute_preview_pipeline(demo.to_str().unwrap(), 0.0, 2, true);
            assert!(res.is_ok(), "Pipeline failed: {:?}", res.err());
            let out = res.unwrap();
            assert!(Path::new(&out.original_path).exists());
            assert!(Path::new(&out.enhanced_path).exists());
        }
    }
}
