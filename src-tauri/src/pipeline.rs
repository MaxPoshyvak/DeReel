use serde::{Deserialize, Serialize};
use std::fs;
use std::io::{BufRead, BufReader};
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::{Instant, SystemTime, UNIX_EPOCH};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RenderProgress {
    pub stage: String,
    pub percent: f64,
    pub current_frame: u32,
    pub total_frames: u32,
    pub fps: f64,
    pub eta_seconds: u32,
}

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
    avg_frame_rate: Option<String>,
    #[allow(dead_code)]
    field_order: Option<String>,
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
    let mut path = std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."));
    if path.ends_with("src-tauri") {
        path.push("binaries");
    } else {
        path.push("src-tauri");
        path.push("binaries");
    }
    path
}

pub fn detect_hardware_chip() -> String {
    #[cfg(target_os = "macos")]
    {
        if let Ok(output) = Command::new("sysctl")
            .args(["-n", "machdep.cpu.brand_string"])
            .output()
        {
            if output.status.success() {
                let name = String::from_utf8_lossy(&output.stdout).trim().to_string();
                if !name.is_empty() {
                    return name;
                }
            }
        }
    }
    "Apple Silicon".to_string()
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

    let video_stream = probe.streams.as_ref().and_then(|s| {
        s.iter()
            .find(|st| st.width.is_some() && st.height.is_some())
    });

    let width = video_stream.and_then(|s| s.width).unwrap_or(640);
    let height = video_stream.and_then(|s| s.height).unwrap_or(480);
    let codec = video_stream
        .and_then(|s| s.codec_name.clone())
        .unwrap_or_else(|| "h264".to_string());

    let parse_rate = |rate_opt: Option<&String>| -> Option<f64> {
        let rate = rate_opt?;
        let parts: Vec<&str> = rate.split('/').collect();
        if parts.len() == 2 {
            let num: f64 = parts[0].parse().ok()?;
            let den: f64 = parts[1].parse().ok()?;
            if den > 0.0 && num > 0.0 {
                return Some(num / den);
            }
        }
        rate.parse().ok()
    };

    // Prefer avg_frame_rate up to 60fps; avoid 120fps display refresh rate of screen recordings
    let fps = video_stream
        .and_then(|s| parse_rate(s.avg_frame_rate.as_ref()))
        .filter(|&f| f > 0.0 && f <= 60.0)
        .or_else(|| video_stream.and_then(|s| parse_rate(s.r_frame_rate.as_ref())))
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

pub fn resolve_model_for_preset(preset: Option<&str>) -> &'static str {
    match preset.unwrap_or("vhs") {
        "anime" => "realesr-animevideov3",
        "lowres" => "realesrgan-x4plus",
        "fps60" => "rife-v4.6",
        "vhs" => "realesr-general-x4v3",
        _ => "realesr-general-x4v3",
    }
}

pub fn compute_output_path(
    input_path: &str,
    output_path: &str,
    preset: Option<&str>,
    scale: u32,
) -> PathBuf {
    if !output_path.is_empty() {
        return PathBuf::from(output_path);
    }
    let in_p = Path::new(input_path);
    let stem = in_p.file_stem().and_then(|s| s.to_str()).unwrap_or("video");
    let parent = in_p.parent().unwrap_or_else(|| Path::new("."));
    let preset_slug = match preset.unwrap_or("vhs") {
        "vhs" => "vhs",
        "lowres" => "lowres",
        "fps60" => "60fps",
        "anime" => "anime",
        other => other,
    };
    if preset_slug == "60fps" {
        parent.join(format!("{}_dereel_{}fps.mp4", stem, scale))
    } else {
        parent.join(format!("{}_dereel_{}_{}x.mp4", stem, preset_slug, scale))
    }
}

// Explicit pipeline arguments needed for video processing stages
#[allow(clippy::too_many_arguments)]
pub fn execute_preview_pipeline<F>(
    input_path: &str,
    start_sec: f64,
    scale: u32,
    deinterlace: bool,
    preset: Option<&str>,
    target_fps_opt: Option<f64>,
    progress: F,
    cancel_flag: Arc<AtomicBool>,
) -> Result<PreviewOutput, String>
where
    F: Fn(RenderProgress) + Send + Sync + 'static,
{
    let meta = probe_video_file(input_path)?;
    let is_fps60 = preset == Some("fps60");
    let target_fps = if is_fps60 {
        target_fps_opt.unwrap_or(if scale == 4 { 120.0 } else { 60.0 })
    } else if meta.fps > 0.0 {
        meta.fps
    } else {
        29.97
    };

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

    // Stage 1: Extract 3s original clip and raw frames
    progress(RenderProgress {
        stage: "Extracting frames...".to_string(),
        percent: 5.0,
        current_frame: 0,
        total_frames: (3.0 * meta.fps) as u32,
        fps: 0.0,
        eta_seconds: 12,
    });

    let filter_arg = if deinterlace {
        "bwdif=mode=send_frame:deint=interlaced"
    } else {
        "null"
    };

    // 1. Extract 3s reference MP4 for side-by-side player
    let mut original_extract = Command::new("ffmpeg")
        .args([
            "-y",
            "-ss",
            &format!("{:.2}", start_sec),
            "-t",
            "3.0",
            "-i",
            input_path,
            "-fps_mode",
            "passthrough",
            "-vf",
            filter_arg,
            "-c:v",
            "h264_videotoolbox",
            "-tag:v",
            "avc1",
            "-b:v",
            "6M",
            "-pix_fmt",
            "yuv420p",
            "-an",
            original_3s_path.to_str().unwrap(),
        ])
        .spawn()
        .map_err(|e| format!("Failed to spawn ffmpeg: {}", e))?;

    let orig_status = original_extract
        .wait()
        .map_err(|e| format!("Failed to wait for ffmpeg: {}", e))?;
    if !orig_status.success() {
        return Err("Failed to extract original 3s segment".to_string());
    }

    if cancel_flag.load(Ordering::Relaxed) {
        let _ = fs::remove_dir_all(&temp_dir);
        return Err("Operation cancelled by user".to_string());
    }

    // 2. Extract frames for neural inference with fast high-quality JPEG
    let frame_pattern = if is_fps60 {
        frames_in_dir.join("%08d.jpg")
    } else {
        frames_in_dir.join("frame_%04d.jpg")
    };
    let mut extract_frames = Command::new("ffmpeg")
        .args([
            "-y",
            "-ss",
            &format!("{:.2}", start_sec),
            "-t",
            "3.0",
            "-i",
            input_path,
            "-fps_mode",
            "passthrough",
            "-vf",
            filter_arg,
            "-q:v",
            "1",
            frame_pattern.to_str().unwrap(),
        ])
        .spawn()
        .map_err(|e| format!("Failed to extract frames: {}", e))?;

    let extract_status = extract_frames.wait().map_err(|e| e.to_string())?;
    if !extract_status.success() {
        return Err("Failed to extract video frames".to_string());
    }

    // Count extracted frames
    let frame_count = fs::read_dir(&frames_in_dir)
        .map(|r| r.count() as u32)
        .unwrap_or(72)
        .max(1);

    let bin_dir = get_binary_path();

    if is_fps60 {
        // Stage 2: RIFE Motion Interpolation on Apple GPU
        let rife_runner = bin_dir.join("rife-ncnn-vulkan");
        let rife_model_dir = bin_dir.join("models").join("rife-v4.6");

        let target_frames = if (target_fps - (meta.fps * 2.0)).abs() < 1.0 {
            frame_count * 2
        } else {
            ((frame_count as f64) * (target_fps / meta.fps)).round() as u32
        }
        .max(frame_count + 1);

        progress(RenderProgress {
            stage: format!(
                "Interpolating motion ({} FPS)...",
                target_fps.round() as u32
            ),
            percent: 15.0,
            current_frame: 0,
            total_frames: target_frames,
            fps: 0.0,
            eta_seconds: 5,
        });

        let mut ai_child = Command::new(&rife_runner)
            .args([
                "-i",
                frames_in_dir.to_str().unwrap(),
                "-o",
                frames_out_dir.to_str().unwrap(),
                "-n",
                &target_frames.to_string(),
                "-m",
                rife_model_dir.to_str().unwrap(),
                "-f",
                "%08d.jpg",
                "-j",
                "2:2:2",
            ])
            .spawn()
            .map_err(|e| format!("Failed to spawn RIFE runner: {}", e))?;

        let start_time = Instant::now();
        let mut last_progress_pct = 15.0;

        loop {
            if cancel_flag.load(Ordering::Relaxed) {
                let _ = ai_child.kill();
                let _ = fs::remove_dir_all(&temp_dir);
                return Err("Operation cancelled by user".to_string());
            }

            match ai_child.try_wait() {
                Ok(Some(status)) => {
                    if !status.success() {
                        let _ = fs::remove_dir_all(&temp_dir);
                        return Err("RIFE motion interpolation encountered an error".to_string());
                    }
                    break;
                }
                Ok(None) => {
                    let completed = fs::read_dir(&frames_out_dir)
                        .map(|r| r.count() as u32)
                        .unwrap_or(0);
                    let overall_pct =
                        (15.0 + (completed as f64 / target_frames as f64) * 75.0).min(90.0);
                    if overall_pct > last_progress_pct {
                        last_progress_pct = overall_pct;
                    }
                    let elapsed = start_time.elapsed().as_secs_f64();
                    let fps = if elapsed > 0.5 {
                        completed as f64 / elapsed
                    } else {
                        0.0
                    };
                    let eta = if fps > 0.1 && completed < target_frames {
                        ((target_frames - completed) as f64 / fps) as u32
                    } else {
                        0
                    };

                    progress(RenderProgress {
                        stage: format!(
                            "Interpolating motion ({} FPS)...",
                            target_fps.round() as u32
                        ),
                        percent: last_progress_pct,
                        current_frame: completed.min(target_frames),
                        total_frames: target_frames,
                        fps,
                        eta_seconds: eta,
                    });

                    std::thread::sleep(std::time::Duration::from_millis(150));
                }
                Err(e) => {
                    let _ = fs::remove_dir_all(&temp_dir);
                    return Err(format!("Error monitoring RIFE: {}", e));
                }
            }
        }
    } else {
        // Stage 2: Run Real-ESRGAN on Apple GPU with live progress parsing
        progress(RenderProgress {
            stage: "Upscaling frames...".to_string(),
            percent: 15.0,
            current_frame: 0,
            total_frames: frame_count,
            fps: 0.0,
            eta_seconds: 5,
        });

        let runner = bin_dir.join("realesrgan-ncnn-vulkan");
        let models_dir = bin_dir.join("models");
        let model_name = resolve_model_for_preset(preset);

        let mut ai_child = Command::new(&runner)
            .args([
                "-i",
                frames_in_dir.to_str().unwrap(),
                "-o",
                frames_out_dir.to_str().unwrap(),
                "-s",
                "4",
                "-m",
                models_dir.to_str().unwrap(),
                "-n",
                model_name,
                "-j",
                "2:2:2",
                "-f",
                "jpg",
            ])
            .stderr(Stdio::piped())
            .spawn()
            .map_err(|e| format!("Failed to spawn Real-ESRGAN runner: {}", e))?;

        let start_time = Instant::now();
        let mut last_progress_pct = 15.0;

        if let Some(stderr) = ai_child.stderr.take() {
            let reader = BufReader::new(stderr);
            for line in reader.lines().map_while(Result::ok) {
                if cancel_flag.load(Ordering::Relaxed) {
                    let _ = ai_child.kill();
                    let _ = fs::remove_dir_all(&temp_dir);
                    return Err("Operation cancelled by user".to_string());
                }

                let completed = fs::read_dir(&frames_out_dir)
                    .map(|r| r.count() as u32)
                    .unwrap_or(0);

                let pct_in_frame = if line.contains('%') {
                    line.split('%')
                        .next()
                        .and_then(|s| s.split_whitespace().last())
                        .and_then(|s| s.parse::<f64>().ok())
                        .unwrap_or(0.0)
                } else {
                    0.0
                };

                let frame_progress =
                    (completed as f64 + (pct_in_frame / 100.0)).min(frame_count as f64);
                let calculated_pct = 15.0 + (frame_progress / frame_count as f64) * 70.0;
                let overall_pct = calculated_pct.max(last_progress_pct);
                last_progress_pct = overall_pct;

                let elapsed = start_time.elapsed().as_secs_f64();
                let fps = if elapsed > 0.5 {
                    completed as f64 / elapsed
                } else {
                    0.0
                };
                let eta = if fps > 0.1 && completed < frame_count {
                    ((frame_count - completed) as f64 / fps) as u32
                } else {
                    0
                };

                progress(RenderProgress {
                    stage: "Upscaling frames...".to_string(),
                    percent: overall_pct,
                    current_frame: completed.min(frame_count),
                    total_frames: frame_count,
                    fps,
                    eta_seconds: eta,
                });
            }
        }

        let ai_status = ai_child.wait().map_err(|e| e.to_string())?;
        if !ai_status.success() {
            return Err("AI upscaling process encountered an error".to_string());
        }
    }

    // Stage 3: Encode output frames using hardware VideoToolbox
    let total_out_frames = fs::read_dir(&frames_out_dir)
        .map(|r| r.count() as u32)
        .unwrap_or(frame_count);

    progress(RenderProgress {
        stage: "Encoding video...".to_string(),
        percent: 92.0,
        current_frame: total_out_frames,
        total_frames: total_out_frames,
        fps: 30.0,
        eta_seconds: 1,
    });

    let scale_multiplier = if scale == 4 { 4 } else { 2 };
    let output_width = if is_fps60 {
        meta.width
    } else {
        ((meta.width * scale_multiplier) / 2) * 2
    };
    let output_height = if is_fps60 {
        meta.height
    } else {
        ((meta.height * scale_multiplier) / 2) * 2
    };

    let out_pattern = if is_fps60 {
        frames_out_dir.join("%08d.jpg")
    } else {
        frames_out_dir.join("frame_%04d.jpg")
    };

    let mut encode_cmd = Command::new("ffmpeg");
    encode_cmd.args([
        "-y",
        "-r",
        &format!("{:.2}", target_fps),
        "-i",
        out_pattern.to_str().unwrap(),
    ]);

    // If 2x was chosen on spatial model, downscale native 4x neural output via Lanczos supersampling
    if !is_fps60 && scale == 2 {
        encode_cmd.args([
            "-vf",
            &format!("scale={}:{}:flags=lanczos", output_width, output_height),
        ]);
    }

    encode_cmd.args([
        "-c:v",
        "h264_videotoolbox",
        "-tag:v",
        "avc1",
        "-b:v",
        "12M",
        "-pix_fmt",
        "yuv420p",
        enhanced_3s_path.to_str().unwrap(),
    ]);

    let mut encode_run = encode_cmd
        .spawn()
        .map_err(|e| format!("Failed to spawn encoder: {}", e))?;

    let encode_status = encode_run.wait().map_err(|e| e.to_string())?;
    if !encode_status.success() {
        return Err("Failed to encode final enhanced video".to_string());
    }

    // Zero-Disk Cleanup of frame directories
    let _ = fs::remove_dir_all(&frames_in_dir);
    let _ = fs::remove_dir_all(&frames_out_dir);

    progress(RenderProgress {
        stage: "Complete!".to_string(),
        percent: 100.0,
        current_frame: total_out_frames,
        total_frames: total_out_frames,
        fps: 0.0,
        eta_seconds: 0,
    });

    Ok(PreviewOutput {
        original_path: original_3s_path.to_str().unwrap().to_string(),
        enhanced_path: enhanced_3s_path.to_str().unwrap().to_string(),
        duration: 3.0,
        output_width,
        output_height,
    })
}

// Explicit pipeline arguments needed for full video rendering stages
#[allow(clippy::too_many_arguments)]
pub fn execute_full_upscale_pipeline<F>(
    input_path: &str,
    output_path: &str,
    scale: u32,
    deinterlace: bool,
    preset: Option<&str>,
    target_fps_opt: Option<f64>,
    progress: F,
    cancel_flag: Arc<AtomicBool>,
) -> Result<String, String>
where
    F: Fn(RenderProgress) + Send + Sync + 'static,
{
    let meta = probe_video_file(input_path)?;
    let is_fps60 = preset == Some("fps60");
    let target_fps = if is_fps60 {
        target_fps_opt.unwrap_or(if scale == 4 { 120.0 } else { 60.0 })
    } else if meta.fps > 0.0 {
        meta.fps
    } else {
        29.97
    };

    let final_dest = if is_fps60 {
        compute_output_path(input_path, output_path, preset, target_fps.round() as u32)
    } else {
        compute_output_path(input_path, output_path, preset, scale)
    };

    let ts = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis())
        .unwrap_or(0);
    let temp_dir = std::env::temp_dir().join(format!("dereel_full_{}", ts));
    let frames_in_dir = temp_dir.join("in");
    let frames_out_dir = temp_dir.join("out");

    fs::create_dir_all(&frames_in_dir).map_err(|e| e.to_string())?;
    fs::create_dir_all(&frames_out_dir).map_err(|e| e.to_string())?;

    let filter_arg = if deinterlace {
        "bwdif=mode=send_frame:deint=interlaced"
    } else {
        "null"
    };

    let total_est_frames = (meta.duration * meta.fps).max(1.0) as u32;

    progress(RenderProgress {
        stage: "Extracting frames...".to_string(),
        percent: 2.0,
        current_frame: 0,
        total_frames: total_est_frames,
        fps: 0.0,
        eta_seconds: 15,
    });

    let frame_pattern = if is_fps60 {
        frames_in_dir.join("%08d.jpg")
    } else {
        frames_in_dir.join("frame_%06d.jpg")
    };
    let mut extract_child = Command::new("ffmpeg")
        .args([
            "-y",
            "-i",
            input_path,
            "-fps_mode",
            "passthrough",
            "-vf",
            filter_arg,
            "-q:v",
            "1",
            frame_pattern.to_str().unwrap(),
        ])
        .spawn()
        .map_err(|e| format!("Failed to extract frames: {}", e))?;

    let ext_status = extract_child.wait().map_err(|e| e.to_string())?;
    if !ext_status.success() {
        let _ = fs::remove_dir_all(&temp_dir);
        return Err("Failed to extract all video frames".to_string());
    }

    if cancel_flag.load(Ordering::Relaxed) {
        let _ = fs::remove_dir_all(&temp_dir);
        return Err("Upscale cancelled by user".to_string());
    }

    let actual_frames = fs::read_dir(&frames_in_dir)
        .map(|r| r.count() as u32)
        .unwrap_or(total_est_frames)
        .max(1);

    let bin_dir = get_binary_path();

    if is_fps60 {
        // Stage 2: RIFE Motion Interpolation on Apple GPU
        let rife_runner = bin_dir.join("rife-ncnn-vulkan");
        let rife_model_dir = bin_dir.join("models").join("rife-v4.6");

        let target_frames = if (target_fps - (meta.fps * 2.0)).abs() < 1.0 {
            actual_frames * 2
        } else {
            ((actual_frames as f64) * (target_fps / meta.fps)).round() as u32
        }
        .max(actual_frames + 1);

        progress(RenderProgress {
            stage: format!(
                "Interpolating motion ({} FPS)...",
                target_fps.round() as u32
            ),
            percent: 10.0,
            current_frame: 0,
            total_frames: target_frames,
            fps: 0.0,
            eta_seconds: (target_frames as f64 / 20.0) as u32,
        });

        let mut ai_child = Command::new(&rife_runner)
            .args([
                "-i",
                frames_in_dir.to_str().unwrap(),
                "-o",
                frames_out_dir.to_str().unwrap(),
                "-n",
                &target_frames.to_string(),
                "-m",
                rife_model_dir.to_str().unwrap(),
                "-f",
                "%08d.jpg",
                "-j",
                "2:2:2",
            ])
            .spawn()
            .map_err(|e| format!("Failed to spawn RIFE runner: {}", e))?;

        let start_time = Instant::now();
        let mut last_progress_pct = 10.0;

        loop {
            if cancel_flag.load(Ordering::Relaxed) {
                let _ = ai_child.kill();
                let _ = fs::remove_dir_all(&temp_dir);
                return Err("Upscale cancelled by user".to_string());
            }

            match ai_child.try_wait() {
                Ok(Some(status)) => {
                    if !status.success() {
                        let _ = fs::remove_dir_all(&temp_dir);
                        return Err("RIFE frame interpolation encountered an error".to_string());
                    }
                    break;
                }
                Ok(None) => {
                    let completed = fs::read_dir(&frames_out_dir)
                        .map(|r| r.count() as u32)
                        .unwrap_or(0);
                    let overall_pct =
                        (10.0 + (completed as f64 / target_frames as f64) * 82.0).min(92.0);
                    if overall_pct > last_progress_pct {
                        last_progress_pct = overall_pct;
                    }
                    let elapsed = start_time.elapsed().as_secs_f64();
                    let fps = if elapsed > 0.5 {
                        completed as f64 / elapsed
                    } else {
                        0.0
                    };
                    let eta = if fps > 0.1 && completed < target_frames {
                        ((target_frames - completed) as f64 / fps) as u32
                    } else {
                        0
                    };

                    progress(RenderProgress {
                        stage: format!(
                            "Interpolating motion ({} FPS)...",
                            target_fps.round() as u32
                        ),
                        percent: last_progress_pct,
                        current_frame: completed.min(target_frames),
                        total_frames: target_frames,
                        fps,
                        eta_seconds: eta,
                    });

                    std::thread::sleep(std::time::Duration::from_millis(200));
                }
                Err(e) => {
                    let _ = fs::remove_dir_all(&temp_dir);
                    return Err(format!("Error monitoring RIFE: {}", e));
                }
            }
        }
    } else {
        // Stage 2: Run Real-ESRGAN on Apple GPU with live progress parsing
        progress(RenderProgress {
            stage: "Upscaling frames...".to_string(),
            percent: 10.0,
            current_frame: 0,
            total_frames: actual_frames,
            fps: 0.0,
            eta_seconds: (actual_frames as f64 / 2.0) as u32,
        });

        let runner = bin_dir.join("realesrgan-ncnn-vulkan");
        let models_dir = bin_dir.join("models");
        let model_name = resolve_model_for_preset(preset);

        let mut ai_child = Command::new(&runner)
            .args([
                "-i",
                frames_in_dir.to_str().unwrap(),
                "-o",
                frames_out_dir.to_str().unwrap(),
                "-s",
                "4",
                "-m",
                models_dir.to_str().unwrap(),
                "-n",
                model_name,
                "-j",
                "2:2:2",
                "-f",
                "jpg",
            ])
            .stderr(Stdio::piped())
            .spawn()
            .map_err(|e| format!("Failed to spawn Real-ESRGAN runner: {}", e))?;

        let start_time = Instant::now();
        let mut last_progress_pct = 10.0;

        if let Some(stderr) = ai_child.stderr.take() {
            let reader = BufReader::new(stderr);
            for line in reader.lines().map_while(Result::ok) {
                if cancel_flag.load(Ordering::Relaxed) {
                    let _ = ai_child.kill();
                    let _ = fs::remove_dir_all(&temp_dir);
                    return Err("Upscale cancelled by user".to_string());
                }

                let completed = fs::read_dir(&frames_out_dir)
                    .map(|r| r.count() as u32)
                    .unwrap_or(0);

                let pct_in_frame = if line.contains('%') {
                    line.split('%')
                        .next()
                        .and_then(|s| s.split_whitespace().last())
                        .and_then(|s| s.parse::<f64>().ok())
                        .unwrap_or(0.0)
                } else {
                    0.0
                };

                let frame_progress =
                    (completed as f64 + (pct_in_frame / 100.0)).min(actual_frames as f64);
                let calculated_pct = 10.0 + (frame_progress / actual_frames as f64) * 82.0;
                let overall_pct = calculated_pct.max(last_progress_pct);
                last_progress_pct = overall_pct;

                let elapsed = start_time.elapsed().as_secs_f64();
                let fps = if elapsed > 1.0 {
                    completed as f64 / elapsed
                } else {
                    0.0
                };
                let eta = if fps > 0.1 && completed < actual_frames {
                    ((actual_frames - completed) as f64 / fps) as u32
                } else {
                    0
                };

                progress(RenderProgress {
                    stage: "Upscaling frames...".to_string(),
                    percent: overall_pct,
                    current_frame: completed.min(actual_frames),
                    total_frames: actual_frames,
                    fps,
                    eta_seconds: eta,
                });
            }
        }

        let ai_status = ai_child.wait().map_err(|e| e.to_string())?;
        if !ai_status.success() {
            let _ = fs::remove_dir_all(&temp_dir);
            return Err("AI upscaling process failed".to_string());
        }
    }

    // Stage 3: Hardware encode back to MP4 with original audio stream remuxed
    let total_out_frames = fs::read_dir(&frames_out_dir)
        .map(|r| r.count() as u32)
        .unwrap_or(actual_frames);

    progress(RenderProgress {
        stage: "Encoding video...".to_string(),
        percent: 94.0,
        current_frame: total_out_frames,
        total_frames: total_out_frames,
        fps: 40.0,
        eta_seconds: 2,
    });

    let scale_multiplier = if scale == 4 { 4 } else { 2 };
    let output_width = if is_fps60 {
        meta.width
    } else {
        ((meta.width * scale_multiplier) / 2) * 2
    };
    let output_height = if is_fps60 {
        meta.height
    } else {
        ((meta.height * scale_multiplier) / 2) * 2
    };

    let out_pattern = if is_fps60 {
        frames_out_dir.join("%08d.jpg")
    } else {
        frames_out_dir.join("frame_%06d.jpg")
    };

    let mut encode_cmd = Command::new("ffmpeg");
    encode_cmd.args([
        "-y",
        "-r",
        &format!("{:.2}", target_fps),
        "-i",
        out_pattern.to_str().unwrap(),
        "-i",
        input_path, // input for audio pass-through
        "-map",
        "0:v:0",
        "-map",
        "1:a?", // copy audio if stream exists
    ]);

    // If 2x was chosen on spatial models, downscale native 4x neural output via Lanczos supersampling
    if !is_fps60 && scale == 2 {
        encode_cmd.args([
            "-vf",
            &format!("scale={}:{}:flags=lanczos", output_width, output_height),
        ]);
    }

    encode_cmd.args([
        "-c:v",
        "h264_videotoolbox",
        "-tag:v",
        "avc1",
        "-b:v",
        "16M",
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "copy",
        "-shortest",
        final_dest.to_str().unwrap(),
    ]);

    let mut encode_run = encode_cmd
        .spawn()
        .map_err(|e| format!("Failed to spawn encoder: {}", e))?;

    let encode_status = encode_run.wait().map_err(|e| e.to_string())?;
    if !encode_status.success() {
        let _ = fs::remove_dir_all(&temp_dir);
        return Err("Failed to encode final video".to_string());
    }

    let _ = fs::remove_dir_all(&temp_dir);

    progress(RenderProgress {
        stage: if is_fps60 {
            "Motion Smoothing Complete!".to_string()
        } else {
            "Upscale Complete!".to_string()
        },
        percent: 100.0,
        current_frame: total_out_frames,
        total_frames: total_out_frames,
        fps: 0.0,
        eta_seconds: 0,
    });

    Ok(final_dest.to_string_lossy().to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_probe_metadata() {
        let sample = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("binaries")
            .join("onepiece_demo.mp4");
        if sample.exists() {
            let meta = probe_video_file(sample.to_str().unwrap()).expect("Probe failed");
            assert_eq!(meta.width, 640);
            assert_eq!(meta.height, 480);
            assert!(meta.duration > 0.0);
        }
    }

    #[test]
    fn test_compute_output_path() {
        let out_lowres = compute_output_path("/path/to/my_video.mp4", "", Some("lowres"), 4);
        assert_eq!(
            out_lowres,
            PathBuf::from("/path/to/my_video_dereel_lowres_4x.mp4")
        );

        let out_vhs = compute_output_path("/path/to/my_video.mov", "", Some("vhs"), 2);
        assert_eq!(
            out_vhs,
            PathBuf::from("/path/to/my_video_dereel_vhs_2x.mp4")
        );

        let out_anime = compute_output_path("/path/to/my_video.mp4", "", Some("anime"), 4);
        assert_eq!(
            out_anime,
            PathBuf::from("/path/to/my_video_dereel_anime_4x.mp4")
        );

        let out_fps60 = compute_output_path("/path/to/my_video.mp4", "", Some("fps60"), 60);
        assert_eq!(
            out_fps60,
            PathBuf::from("/path/to/my_video_dereel_60fps.mp4")
        );

        let out_custom = compute_output_path(
            "/path/to/my_video.mp4",
            "/custom/dest.mp4",
            Some("anime"),
            4,
        );
        assert_eq!(out_custom, PathBuf::from("/custom/dest.mp4"));
    }

    #[test]
    fn test_resolve_model_for_preset() {
        assert_eq!(
            resolve_model_for_preset(Some("lowres")),
            "realesrgan-x4plus"
        );
        assert_eq!(
            resolve_model_for_preset(Some("anime")),
            "realesr-animevideov3"
        );
        assert_eq!(
            resolve_model_for_preset(Some("vhs")),
            "realesr-general-x4v3"
        );
        assert_eq!(resolve_model_for_preset(Some("fps60")), "rife-v4.6");
        assert_eq!(resolve_model_for_preset(None), "realesr-general-x4v3");
    }
}
