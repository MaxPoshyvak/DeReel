import React, { useState, useRef, useEffect } from "react";
import {
  Upload,
  Play,
  Pause,
  ArrowRight,
  RotateCcw,
  X,
  FileVideo,
  Clock,
  Sparkles,
  Undo2,
  Zap,
  FolderOpen,
} from "lucide-react";
import { PresetSettings, PreviewMedia, VideoMetadata } from "../types";

interface WorkspaceIslandProps {
  video: VideoMetadata | null;
  onSelectFile: (file: File) => void;
  onBrowseFile: () => void;
  onLoadDemo: () => void;
  onClearVideo: () => void;
  settings: PresetSettings;
  onChangeSettings: (settings: Partial<PresetSettings>) => void;
  sliderPos: number;
  onChangeSliderPos: (pos: number) => void;
  currentTime: number;
  onSeek: (time: number) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  isProcessingPreview: boolean;
  previewMedia: PreviewMedia | null;
  onClearPreview: () => void;
  onRunPreview: () => void;
  isUpscaling: boolean;
  onStartUpscale: () => void;
  completedPath?: string | null;
  onOpenFinder?: (path: string) => void;
}

export const WorkspaceIsland: React.FC<WorkspaceIslandProps> = ({
  video,
  onSelectFile,
  onBrowseFile,
  onLoadDemo,
  onClearVideo,
  settings,
  onChangeSettings,
  sliderPos,
  onChangeSliderPos,
  currentTime,
  onSeek,
  isPlaying,
  onTogglePlay,
  isProcessingPreview,
  previewMedia,
  onClearPreview,
  onRunPreview,
  isUpscaling,
  onStartUpscale,
  completedPath,
  onOpenFinder,
}) => {
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingSlider = useRef(false);

  // Video element refs
  const sourceVideoRef = useRef<HTMLVideoElement>(null);
  const originalPreviewRef = useRef<HTMLVideoElement>(null);
  const enhancedPreviewRef = useRef<HTMLVideoElement>(null);

  // Sync source video play/pause
  useEffect(() => {
    if (!previewMedia && sourceVideoRef.current) {
      if (isPlaying) {
        sourceVideoRef.current.play().catch(() => {});
      } else {
        sourceVideoRef.current.pause();
      }
    }
  }, [isPlaying, previewMedia]);

  // Sync split-screen preview videos play/pause
  useEffect(() => {
    if (previewMedia && originalPreviewRef.current && enhancedPreviewRef.current) {
      if (isPlaying) {
        originalPreviewRef.current.play().catch(() => {});
        enhancedPreviewRef.current.play().catch(() => {});
      } else {
        originalPreviewRef.current.pause();
        enhancedPreviewRef.current.pause();
      }
    }
  }, [isPlaying, previewMedia]);

  const handleSourceTimeUpdate = () => {
    if (sourceVideoRef.current) {
      onSeek(sourceVideoRef.current.currentTime);
    }
  };

  const handlePreviewSync = () => {
    if (originalPreviewRef.current && enhancedPreviewRef.current) {
      const diff = Math.abs(originalPreviewRef.current.currentTime - enhancedPreviewRef.current.currentTime);
      if (diff > 0.05) {
        enhancedPreviewRef.current.currentTime = originalPreviewRef.current.currentTime;
      }
    }
  };

  const handlePreviewTimeUpdate = () => {
    if (originalPreviewRef.current) {
      onSeek(originalPreviewRef.current.currentTime);
    }
    handlePreviewSync();
  };

  const handleSeekVideo = (newTime: number) => {
    onSeek(newTime);
    if (sourceVideoRef.current) {
      sourceVideoRef.current.currentTime = newTime;
    }
    if (originalPreviewRef.current) {
      originalPreviewRef.current.currentTime = newTime;
    }
    if (enhancedPreviewRef.current) {
      enhancedPreviewRef.current.currentTime = newTime;
    }
  };

  const formatTimecode = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const frames = Math.floor((seconds % 1) * 30);
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}:${String(frames).padStart(2, "0")}`;
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(true);
  };

  const handleDragLeave = () => {
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      onSelectFile(file);
    }
  };

  const handleSliderMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingSlider.current = true;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isDraggingSlider.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(moveEvent.clientX - rect.left, rect.width));
      const percentage = (x / rect.width) * 100;
      onChangeSliderPos(Math.round(percentage));
    };

    const handleMouseUp = () => {
      isDraggingSlider.current = false;
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  const handleDrag = (e: React.MouseEvent) => {
    if (e.button === 0 && !(e.target as HTMLElement).closest("button, input, a, video")) {
      try {
        import("@tauri-apps/api/window").then(({ getCurrentWindow }) => {
          getCurrentWindow().startDragging();
        });
      } catch {
        // Ignored in browser mode
      }
    }
  };

  return (
    <main className="flex-1 rounded-[20px] bg-[#111115] border border-white/[0.07] flex flex-col justify-between overflow-hidden relative select-none">
      {/* CASE 1: EMPTY STATE — PURE MINIMALISM */}
      {!video ? (
        <div
          data-tauri-drag-region
          onMouseDown={handleDrag}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={onBrowseFile}
          className="flex-1 flex flex-col items-center justify-center p-8 cursor-pointer transition-colors"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*,.mp4,.mov,.mkv,.avi"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onSelectFile(f);
            }}
            className="hidden"
          />

          <div
            className={`flex flex-col items-center p-8 rounded-2xl border transition-all ${
              isDraggingOver
                ? "border-sky-500/60 bg-sky-500/[0.04] scale-[1.01]"
                : "border-transparent hover:border-white/[0.06] hover:bg-white/[0.02]"
            }`}
          >
            <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-zinc-400 mb-4 shadow-sm">
              <Upload className="w-5 h-5 text-zinc-300" />
            </div>

            <div className="text-sm font-medium text-zinc-200 mb-1">
              Drop video here to restore
            </div>
            <div className="text-xs text-zinc-500 mb-5">
              or click to browse from Finder
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                onLoadDemo();
              }}
              className="text-xs text-zinc-400 hover:text-white font-medium flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] transition-all"
            >
              <span>Try with sample video</span>
              <ArrowRight className="w-3 h-3 text-zinc-500" />
            </button>
          </div>
        </div>
      ) : (
        /* CASE 2: VIDEO LOADED — INTERACTIVE WORKSPACE */
        <div className="flex-1 flex flex-col justify-between p-3.5 overflow-hidden">
          {/* Top Bar */}
          <div
            data-tauri-drag-region
            onMouseDown={handleDrag}
            className="h-9 flex items-center justify-between flex-shrink-0 z-20 px-1"
          >
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <FileVideo className="w-4 h-4 text-zinc-400" />
                <span className="text-[12.5px] font-medium text-zinc-200 truncate max-w-[280px]">
                  {video.name}
                </span>
              </div>

              <div className="flex items-center space-x-1.5 font-mono text-[11px] text-zinc-400 bg-white/[0.04] px-2 py-0.5 rounded-md border border-white/[0.06]">
                <Clock className="w-3 h-3 text-zinc-500" />
                <span>{formatTimecode(video.duration)}</span>
              </div>

              <span className="font-mono text-[11px] text-zinc-500">
                {video.width}×{video.height} SD @ {video.fps.toFixed(1)} FPS
              </span>
            </div>

            {/* Quality Switcher & Close */}
            <div className="flex items-center space-x-2">
              {previewMedia ? (
                <>
                  {completedPath && onOpenFinder && (
                    <button
                      onClick={() => onOpenFinder(completedPath)}
                      className="px-2.5 py-1 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-zinc-300 hover:text-white text-[11px] font-medium flex items-center space-x-1.5 border border-white/[0.08] transition-all"
                    >
                      <FolderOpen className="w-3 h-3 text-zinc-400" />
                      <span>Show in Finder</span>
                    </button>
                  )}
                  <button
                    onClick={onClearPreview}
                    className="px-2.5 py-1 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-zinc-300 hover:text-white text-[11px] font-medium flex items-center space-x-1 border border-white/[0.08] transition-all"
                  >
                    <Undo2 className="w-3 h-3 text-zinc-400" />
                    <span>Exit Comparison</span>
                  </button>
                </>
              ) : (
                <div className="flex items-center space-x-1 p-0.5 rounded-lg bg-black/40 border border-white/[0.06]">
                  <button
                    onClick={() => onChangeSettings({ targetResolution: "1080p" })}
                    className={`px-2.5 py-0.5 rounded text-[11px] font-medium transition-all ${
                      settings.targetResolution === "1080p"
                        ? "bg-white text-zinc-950 font-semibold shadow-sm"
                        : "text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    1080p FHD
                  </button>
                  <button
                    onClick={() => onChangeSettings({ targetResolution: "4k" })}
                    className={`px-2.5 py-0.5 rounded text-[11px] font-medium transition-all ${
                      settings.targetResolution === "4k"
                        ? "bg-white text-zinc-950 font-semibold shadow-sm"
                        : "text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    4K UHD
                  </button>
                </div>
              )}

              <button
                onClick={onClearVideo}
                className="p-1 rounded-md text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.06] transition-colors"
                title="Remove video"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Central Stage: Source Video Player OR 3s Split-Screen Preview */}
          <div className="flex-1 my-2 relative rounded-xl overflow-hidden bg-black/60 border border-white/[0.06] flex items-center justify-center">
            {previewMedia ? (
              /* MODE B: 3S SPLIT-SCREEN COMPARISON VIEWER */
              <div
                ref={containerRef}
                className="w-full h-full relative overflow-hidden select-none flex items-center justify-center"
              >
                {/* BEFORE (Original 3s Clip) */}
                <div className="absolute inset-0 flex items-center justify-center bg-black">
                  <video
                    ref={originalPreviewRef}
                    src={previewMedia.originalUrl}
                    loop
                    muted
                    playsInline
                    autoPlay
                    onTimeUpdate={handlePreviewTimeUpdate}
                    className="w-full h-full object-contain pointer-events-none"
                  />
                </div>

                {/* AFTER (AI Enhanced Video, clipped by sliderPos) */}
                <div
                  className="absolute inset-0 flex items-center justify-center bg-black overflow-hidden"
                  style={{
                    clipPath: `inset(0 0 0 ${sliderPos}%)`
                  }}
                >
                  <video
                    ref={enhancedPreviewRef}
                    src={previewMedia.enhancedUrl}
                    loop
                    muted
                    playsInline
                    autoPlay
                    className="w-full h-full object-contain pointer-events-none"
                  />
                </div>

                {/* Split Hairline Divider & Handle */}
                <div
                  onMouseDown={handleSliderMouseDown}
                  className="absolute top-0 bottom-0 w-[1.5px] bg-white/80 hover:bg-white cursor-ew-resize flex items-center justify-center shadow-[0_0_10px_rgba(0,0,0,0.8)] z-30 group"
                  style={{ left: `${sliderPos}%` }}
                >
                  <div className="w-7 h-7 rounded-full bg-white text-zinc-950 font-bold text-xs flex items-center justify-center shadow-xl tracking-tighter group-hover:scale-110 transition-transform">
                    ↔
                  </div>
                </div>

                {/* Floating Top Badges */}
                <div className="absolute top-3 left-3 px-2 py-0.5 rounded bg-black/60 backdrop-blur-md border border-white/10 text-[10.5px] font-mono text-zinc-400 pointer-events-none">
                  Original ({video.width}×{video.height})
                </div>
                <div className="absolute top-3 right-3 px-2 py-0.5 rounded bg-[#18181D]/80 backdrop-blur-md border border-white/15 text-[10.5px] font-mono text-[#38BDF8] pointer-events-none flex items-center space-x-1">
                  <Sparkles className="w-3 h-3 text-[#38BDF8]" />
                  <span>
                    AI Restored ({previewMedia.outputWidth}×{previewMedia.outputHeight})
                  </span>
                </div>

                {/* Floating Glass Pill for Comparison Transport */}
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/80 backdrop-blur-xl border border-white/10 px-3.5 py-1.5 flex items-center gap-3 shadow-2xl z-20 cursor-default"
                >
                  <button
                    onClick={onTogglePlay}
                    className="w-7 h-7 rounded-full bg-white text-zinc-950 flex items-center justify-center shadow hover:bg-zinc-200 active:scale-95 transition-all flex-shrink-0"
                    title="Play/Pause (Space)"
                  >
                    {isPlaying ? (
                      <Pause className="w-3.5 h-3.5 fill-current" />
                    ) : (
                      <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                    )}
                  </button>

                  {/* Scrubber slider to scrub across the whole video in sync */}
                  <div className="flex items-center space-x-2.5">
                    <input
                      type="range"
                      min={0}
                      max={video.duration || 100}
                      step={0.1}
                      value={currentTime}
                      onChange={(e) => handleSeekVideo(parseFloat(e.target.value))}
                      className="w-48 pro-slider"
                    />
                    <span className="font-mono text-[11px] text-zinc-300 tabular-nums">
                      {formatTimecode(currentTime)} / {formatTimecode(video.duration)}
                    </span>
                  </div>

                  <div className="w-[1px] h-4 bg-white/15" />

                  <button
                    onClick={onClearPreview}
                    className="text-xs text-zinc-400 hover:text-white px-2 py-0.5 rounded hover:bg-white/[0.08] transition-colors"
                    title="Return to original video"
                  >
                    Exit
                  </button>
                </div>
              </div>
            ) : (
              /* MODE A: REAL SOURCE VIDEO PLAYER */
              <div
                onClick={onTogglePlay}
                className="w-full h-full relative overflow-hidden select-none flex items-center justify-center cursor-pointer group"
              >
                <video
                  ref={sourceVideoRef}
                  src={video.srcUrl}
                  loop
                  playsInline
                  onTimeUpdate={handleSourceTimeUpdate}
                  className="w-full h-full object-contain pointer-events-none"
                />

                {/* Floating Glass Pill for Video Playback */}
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/75 backdrop-blur-xl border border-white/10 px-3.5 py-1.5 flex items-center gap-3 shadow-2xl z-20 cursor-default"
                >
                  <button
                    onClick={onTogglePlay}
                    className="w-7 h-7 rounded-full bg-white text-zinc-950 flex items-center justify-center shadow hover:bg-zinc-200 active:scale-95 transition-all flex-shrink-0"
                    title="Play/Pause (Space)"
                  >
                    {isPlaying ? (
                      <Pause className="w-3.5 h-3.5 fill-current" />
                    ) : (
                      <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                    )}
                  </button>

                  {/* Scrubber with full timecode */}
                  <div className="flex items-center space-x-2.5">
                    <input
                      type="range"
                      min={0}
                      max={video.duration || 100}
                      step={0.1}
                      value={currentTime}
                      onChange={(e) => handleSeekVideo(parseFloat(e.target.value))}
                      className="w-56 pro-slider"
                    />
                    <span className="font-mono text-[11px] text-zinc-300 tabular-nums">
                      {formatTimecode(currentTime)} / {formatTimecode(video.duration)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Processing Shimmer Overlay */}
            {isProcessingPreview && (
              <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center space-y-2.5 z-40">
                <div className="w-7 h-7 rounded-full border-2 border-[#38BDF8] border-t-transparent animate-spin" />
                <div className="text-xs font-semibold text-zinc-200">
                  Running Apple Silicon GPU & Neural Engine...
                </div>
                <div className="text-[10.5px] font-mono text-zinc-500">
                  bwdif deinterlacing • Real-ESRGAN SPAN • VideoToolbox encode
                </div>
              </div>
            )}
          </div>

          {/* Bottom Telemetry & Upscale Action Bar */}
          <div className="h-12 flex items-center justify-between gap-4 pt-1 flex-shrink-0 z-20 px-1">
            {/* 3 Minimal Bento Cards */}
            <div className="flex items-center space-x-2">
              <div className="px-2.5 py-1 rounded-lg bg-[#18181D] border border-white/[0.07] min-w-[95px]">
                <div className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider">
                  Target Output
                </div>
                <div className="text-[11.5px] font-mono font-semibold text-zinc-200 tabular-nums">
                  {settings.targetResolution === "4k"
                    ? `${video.width * 4} × ${video.height * 4}`
                    : `${video.width * 2} × ${video.height * 2}`}
                </div>
              </div>

              <div className="px-2.5 py-1 rounded-lg bg-[#18181D] border border-white/[0.07] min-w-[95px]">
                <div className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider">
                  Target FPS
                </div>
                <div className="text-[11.5px] font-mono font-semibold text-zinc-200 tabular-nums">
                  {video.fps.toFixed(1)} FPS
                </div>
              </div>

              <div className="px-2.5 py-1 rounded-lg bg-[#18181D] border border-white/[0.07] min-w-[90px]">
                <div className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider">
                  Scale
                </div>
                <div className="text-[11.5px] font-mono font-semibold text-zinc-200 tabular-nums">
                  {settings.targetResolution === "4k" ? "4× UHD" : "2× FHD"}
                </div>
              </div>
            </div>

            {/* Actions: 3s Quick Preview + Primary Start Upscale Button */}
            <div className="flex items-center space-x-2.5">
              <button
                onClick={onRunPreview}
                disabled={isProcessingPreview || isUpscaling}
                className="h-10 px-3.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] active:bg-white/[0.04] text-zinc-300 hover:text-white font-medium text-xs border border-white/[0.08] flex items-center space-x-2 transition-all disabled:opacity-50"
                title="Generate 3-second before/after comparison"
              >
                {isProcessingPreview ? (
                  <RotateCcw className="w-3.5 h-3.5 animate-spin text-zinc-400" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                )}
                <span>{isProcessingPreview ? "Generating..." : "3s Quick Preview"}</span>
              </button>

              <button
                onClick={onStartUpscale}
                disabled={isUpscaling || isProcessingPreview}
                className="h-10 px-5 rounded-xl bg-gradient-to-r from-[#38BDF8] to-[#3B82F6] hover:brightness-110 active:brightness-95 text-white font-semibold text-xs shadow-[0_0_20px_-4px_rgba(56,189,248,0.4)] flex items-center space-x-2 transition-all disabled:opacity-50"
              >
                {isUpscaling ? (
                  <>
                    <RotateCcw className="w-3.5 h-3.5 animate-spin text-white" />
                    <span>Upscaling...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5 fill-current" />
                    <span>Start Upscale ({settings.targetResolution === "4k" ? "4K" : "1080p"})</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};
