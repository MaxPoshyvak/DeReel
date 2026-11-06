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
  Zap,
  FolderOpen,
  ZoomIn,
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
  onUseUpscaledAsSource?: (path: string) => void;
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
  onUseUpscaledAsSource,
}) => {
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingSlider = useRef(false);

  // Zoom & Pan states for Before/After comparison
  const [zoomLevel, setZoomLevel] = useState<1 | 2 | 4>(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0 });

  // Comparison playback time (isolated from global time to prevent 3s preview desync)
  const [comparisonTime, setComparisonTime] = useState(0);

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

  // Synchronize split-screen comparison videos with lockstep play/pause & drift management
  useEffect(() => {
    const orig = originalPreviewRef.current;
    const enh = enhancedPreviewRef.current;
    if (!previewMedia || !orig || !enh) return;

    if (isPlaying) {
      enh.currentTime = orig.currentTime;
      orig.play().catch(() => {});
      enh.play().catch(() => {});
    } else {
      orig.pause();
      enh.pause();
      enh.currentTime = orig.currentTime;
    }
  }, [isPlaying, previewMedia]);

  // Initialize and synchronize comparison time
  useEffect(() => {
    if (previewMedia) {
      if (previewMedia.isFullVideo) {
        setComparisonTime(currentTime);
        if (originalPreviewRef.current) originalPreviewRef.current.currentTime = currentTime;
        if (enhancedPreviewRef.current) enhancedPreviewRef.current.currentTime = currentTime;
      } else {
        setComparisonTime(0);
        if (originalPreviewRef.current) originalPreviewRef.current.currentTime = 0;
        if (enhancedPreviewRef.current) enhancedPreviewRef.current.currentTime = 0;
      }
    }
  }, [previewMedia]);

  // Reset zoom & pan when preview changes
  useEffect(() => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  }, [previewMedia]);

  // Lockstep sync listeners without jitter-seeking
  useEffect(() => {
    const orig = originalPreviewRef.current;
    const enh = enhancedPreviewRef.current;
    if (!previewMedia || !orig || !enh) return;

    const maxDur = previewMedia.isFullVideo
      ? (video?.duration || 100)
      : (previewMedia.duration || 3.0);

    const handleOrigTimeUpdate = () => {
      setComparisonTime(orig.currentTime);
      if (previewMedia.isFullVideo) {
        onSeek(orig.currentTime);
      }
      // If 3s preview clip reaches its duration, loop both synchronously
      if (!previewMedia.isFullVideo && orig.currentTime >= maxDur - 0.05) {
        orig.currentTime = 0;
        enh.currentTime = 0;
        setComparisonTime(0);
        return;
      }
      const drift = Math.abs(orig.currentTime - enh.currentTime);
      // Snap only if drift exceeds 150ms to keep silky 60fps lockstep
      if (drift > 0.15) {
        enh.currentTime = orig.currentTime;
      }
    };

    const handleOrigSeeked = () => {
      enh.currentTime = orig.currentTime;
    };

    const handleOrigEnded = () => {
      orig.currentTime = 0;
      enh.currentTime = 0;
      setComparisonTime(0);
      if (isPlaying) {
        orig.play().catch(() => {});
        enh.play().catch(() => {});
      }
    };

    orig.addEventListener("timeupdate", handleOrigTimeUpdate);
    orig.addEventListener("seeked", handleOrigSeeked);
    orig.addEventListener("ended", handleOrigEnded);

    return () => {
      orig.removeEventListener("timeupdate", handleOrigTimeUpdate);
      orig.removeEventListener("seeked", handleOrigSeeked);
      orig.removeEventListener("ended", handleOrigEnded);
    };
  }, [previewMedia, isPlaying, onSeek, video?.duration]);

  const handleSourceTimeUpdate = () => {
    if (sourceVideoRef.current) {
      onSeek(sourceVideoRef.current.currentTime);
    }
  };

  const handleSeekVideo = (newTime: number) => {
    onSeek(newTime);
    if (sourceVideoRef.current) {
      sourceVideoRef.current.currentTime = newTime;
    }
  };

  const handleSeekComparison = (newTime: number) => {
    setComparisonTime(newTime);
    if (previewMedia?.isFullVideo) {
      onSeek(newTime);
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
    e.stopPropagation();
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

  // Mouse pan handlers when zoom > 1
  const handlePanMouseDown = (e: React.MouseEvent) => {
    if (zoomLevel <= 1) return;
    if ((e.target as HTMLElement).closest(".slider-handle")) return;
    isPanning.current = true;
    panStart.current = { x: e.clientX - panOffset.x, y: e.clientY - panOffset.y };

    const handlePanMouseMove = (ev: MouseEvent) => {
      if (!isPanning.current) return;
      setPanOffset({
        x: ev.clientX - panStart.current.x,
        y: ev.clientY - panStart.current.y,
      });
    };

    const handlePanMouseUp = () => {
      isPanning.current = false;
      window.removeEventListener("mousemove", handlePanMouseMove);
      window.removeEventListener("mouseup", handlePanMouseUp);
    };

    window.addEventListener("mousemove", handlePanMouseMove);
    window.addEventListener("mouseup", handlePanMouseUp);
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
          {/* Top Bar: Clean & Context-Aware */}
          <div
            data-tauri-drag-region
            onMouseDown={handleDrag}
            className="h-9 flex items-center justify-between flex-shrink-0 z-20 px-1"
          >
            {previewMedia ? (
              /* COMPARISON MODE HEADER: No old filenames or outdated specs */
              <div className="flex items-center space-x-2.5">
                <span className="px-2.5 py-0.5 rounded-md bg-white/[0.08] text-xs font-semibold text-zinc-200 tracking-tight">
                  Before / After Comparison
                </span>

                <div className="flex items-center space-x-1.5 font-mono text-[11px] text-zinc-400 bg-white/[0.04] px-2.5 py-0.5 rounded-md border border-white/[0.06]">
                  <Clock className="w-3 h-3 text-zinc-500" />
                  <span>
                    Duration {formatTimecode(previewMedia.isFullVideo ? video.duration : (previewMedia.duration || 3.0))}
                  </span>
                </div>
              </div>
            ) : (
              /* SOURCE VIDEO MODE HEADER */
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  <FileVideo className="w-4 h-4 text-zinc-400" />
                  <span className="text-[12.5px] font-medium text-zinc-200 truncate max-w-[260px]">
                    {video.name}
                  </span>
                </div>

                <div className="flex items-center space-x-1.5 font-mono text-[11px] text-zinc-400 bg-white/[0.04] px-2 py-0.5 rounded-md border border-white/[0.06]">
                  <Clock className="w-3 h-3 text-zinc-500" />
                  <span>{formatTimecode(video.duration)}</span>
                </div>

                <span className="font-mono text-[11px] text-zinc-500">
                  {video.width}×{video.height} • {video.fps.toFixed(1)} FPS
                </span>
              </div>
            )}

            {/* Header Right Actions */}
            <div className="flex items-center space-x-2.5">
              {previewMedia ? (
                <>
                  {/* Zoom Controls (1x, 2x, 4x) for Pixel Inspection */}
                  <div className="flex items-center space-x-1 p-0.5 rounded-lg bg-black/40 border border-white/[0.06]">
                    <div className="flex items-center space-x-1 px-1.5 text-zinc-500">
                      <ZoomIn className="w-3 h-3 text-zinc-400" />
                      <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">
                        Zoom
                      </span>
                    </div>

                    <button
                      onClick={() => {
                        setZoomLevel(1);
                        setPanOffset({ x: 0, y: 0 });
                      }}
                      className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all ${
                        zoomLevel === 1
                          ? "bg-white text-zinc-950 font-semibold shadow-sm"
                          : "text-zinc-400 hover:text-zinc-200"
                      }`}
                      title="Fit to view (100%)"
                    >
                      1× Fit
                    </button>

                    <button
                      onClick={() => setZoomLevel(2)}
                      className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all ${
                        zoomLevel === 2
                          ? "bg-white text-zinc-950 font-semibold shadow-sm"
                          : "text-zinc-400 hover:text-zinc-200"
                      }`}
                      title="Zoom in (200%)"
                    >
                      2×
                    </button>

                    <button
                      onClick={() => setZoomLevel(4)}
                      className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all ${
                        zoomLevel === 4
                          ? "bg-white text-zinc-950 font-semibold shadow-sm"
                          : "text-zinc-400 hover:text-zinc-200"
                      }`}
                      title="Pixel peep (400%)"
                    >
                      4×
                    </button>
                  </div>

                  {/* Single Clean Exit Button in Header */}
                  <button
                    onClick={onClearPreview}
                    className="h-7 px-2.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-zinc-300 hover:text-white text-[11px] font-medium flex items-center space-x-1 border border-white/[0.08] transition-all"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Exit Comparison</span>
                  </button>
                </>
              ) : (
                /* Clear 2x & 4x Scale Factor Switcher (No confusing 1080p/4k labels) */
                <div className="flex items-center space-x-1 p-0.5 rounded-lg bg-black/40 border border-white/[0.06]">
                  <button
                    onClick={() => onChangeSettings({ scaleFactor: 2 })}
                    className={`px-2.5 py-0.5 rounded text-[11px] font-medium transition-all ${
                      settings.scaleFactor === 2
                        ? "bg-white text-zinc-950 font-semibold shadow-sm"
                        : "text-zinc-400 hover:text-zinc-200"
                    }`}
                    title={`Scale video 2x to ${video.width * 2}×${video.height * 2}`}
                  >
                    2× ({video.width * 2}×{video.height * 2})
                  </button>

                  <button
                    onClick={() => onChangeSettings({ scaleFactor: 4 })}
                    className={`px-2.5 py-0.5 rounded text-[11px] font-medium transition-all ${
                      settings.scaleFactor === 4
                        ? "bg-white text-zinc-950 font-semibold shadow-sm"
                        : "text-zinc-400 hover:text-zinc-200"
                    }`}
                    title={`Scale video 4x to ${video.width * 4}×${video.height * 4}`}
                  >
                    4× ({video.width * 4}×{video.height * 4})
                  </button>
                </div>
              )}

              {!previewMedia && (
                <button
                  onClick={onClearVideo}
                  className="p-1 rounded-md text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.06] transition-colors"
                  title="Remove video"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Central Stage: Source Video Player OR Split-Screen Comparison */}
          <div className="flex-1 my-2 relative rounded-xl overflow-hidden bg-black/60 border border-white/[0.06] flex items-center justify-center">
            {previewMedia ? (
              /* MODE B: SPLIT-SCREEN COMPARISON VIEWER WITH ZOOM & PAN */
              <div
                ref={containerRef}
                onMouseDown={handlePanMouseDown}
                className={`w-full h-full relative overflow-hidden select-none flex items-center justify-center ${
                  zoomLevel > 1 ? "cursor-grab active:cursor-grabbing" : ""
                }`}
              >
                {/* BEFORE (Original Clip) with Zoom/Pan Transformation */}
                <div className="absolute inset-0 flex items-center justify-center bg-black overflow-hidden">
                  <div
                    className="w-full h-full flex items-center justify-center transition-transform duration-100 ease-out"
                    style={{
                      transform: `scale(${zoomLevel}) translate(${panOffset.x / zoomLevel}px, ${panOffset.y / zoomLevel}px)`,
                      transformOrigin: "center center",
                    }}
                  >
                    <video
                      ref={originalPreviewRef}
                      src={previewMedia.originalUrl}
                      loop
                      muted
                      playsInline
                      autoPlay
                      className="w-full h-full object-contain pointer-events-none"
                    />
                  </div>
                </div>

                {/* AFTER (AI Enhanced Video, clipped by sliderPos) with Synchronous Zoom/Pan */}
                <div
                  className="absolute inset-0 flex items-center justify-center bg-black overflow-hidden"
                  style={{
                    clipPath: `inset(0 0 0 ${sliderPos}%)`,
                  }}
                >
                  <div
                    className="w-full h-full flex items-center justify-center transition-transform duration-100 ease-out"
                    style={{
                      transform: `scale(${zoomLevel}) translate(${panOffset.x / zoomLevel}px, ${panOffset.y / zoomLevel}px)`,
                      transformOrigin: "center center",
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
                </div>

                {/* Split Hairline Divider & Draggable Handle */}
                <div
                  onMouseDown={handleSliderMouseDown}
                  className="slider-handle absolute top-0 bottom-0 w-[2px] bg-white hover:bg-white cursor-ew-resize flex items-center justify-center shadow-[0_0_12px_rgba(0,0,0,0.9)] z-30 group"
                  style={{ left: `${sliderPos}%` }}
                >
                  <div className="w-7 h-7 rounded-full bg-white text-zinc-950 font-bold text-xs flex items-center justify-center shadow-xl tracking-tighter group-hover:scale-110 transition-transform">
                    ↔
                  </div>
                </div>

                {/* Floating Top Badges */}
                <div className="absolute top-3 left-3 px-2 py-0.5 rounded bg-black/60 backdrop-blur-md border border-white/10 text-[10.5px] font-mono text-zinc-400 pointer-events-none z-30">
                  Original ({video.width}×{video.height})
                </div>
                <div className="absolute top-3 right-3 px-2 py-0.5 rounded bg-[#18181D]/80 backdrop-blur-md border border-white/15 text-[10.5px] font-mono text-[#38BDF8] pointer-events-none flex items-center space-x-1 z-30">
                  <Sparkles className="w-3 h-3 text-[#38BDF8]" />
                  <span>
                    AI Restored ({previewMedia.outputWidth}×{previewMedia.outputHeight})
                  </span>
                </div>

                {/* Floating Glass Pill for Comparison Transport */}
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/85 backdrop-blur-xl border border-white/10 px-4 py-2 flex items-center gap-3.5 shadow-2xl z-40 cursor-default whitespace-nowrap"
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

                  {/* Scrubber slider synchronized across both videos */}
                  <div className="flex items-center space-x-2.5 flex-shrink-0">
                    <input
                      type="range"
                      min={0}
                      max={previewMedia.isFullVideo ? (video?.duration || 100) : (previewMedia.duration || 3.0)}
                      step={0.02}
                      value={comparisonTime}
                      onChange={(e) => handleSeekComparison(parseFloat(e.target.value))}
                      className="w-56 sm:w-72 pro-slider flex-shrink-0"
                    />
                    <span className="font-mono text-xs text-zinc-300 tabular-nums whitespace-nowrap flex-shrink-0">
                      {formatTimecode(comparisonTime)} / {formatTimecode(previewMedia.isFullVideo ? (video?.duration || 0) : (previewMedia.duration || 3.0))}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              /* MODE A: REAL SOURCE VIDEO PLAYER (Never clipped, always centered) */
              <div
                onClick={onTogglePlay}
                className="w-full h-full relative overflow-hidden select-none cursor-pointer group"
              >
                {/* Isolated video stage */}
                <div className="absolute inset-0 flex items-center justify-center bg-black">
                  <video
                    ref={sourceVideoRef}
                    src={video.srcUrl}
                    loop
                    playsInline
                    onTimeUpdate={handleSourceTimeUpdate}
                    className="w-full h-full object-contain pointer-events-none"
                  />
                </div>

                {/* Floating Glass Pill for Video Playback */}
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/85 backdrop-blur-xl border border-white/10 px-4 py-2 flex items-center gap-3.5 shadow-2xl z-40 cursor-default whitespace-nowrap"
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
                  <div className="flex items-center space-x-2.5 flex-shrink-0">
                    <input
                      type="range"
                      min={0}
                      max={video.duration || 100}
                      step={0.05}
                      value={currentTime}
                      onChange={(e) => handleSeekVideo(parseFloat(e.target.value))}
                      className="w-56 sm:w-72 pro-slider flex-shrink-0"
                    />
                    <span className="font-mono text-xs text-zinc-300 tabular-nums whitespace-nowrap flex-shrink-0">
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

          {/* Bottom Bar: Context-Aware Actions */}
          {previewMedia ? (
            /* DEDICATED CLEAN COMPARISON ACTIONS (No duplicate exits) */
            <div className="h-12 flex items-center justify-between gap-4 pt-1 flex-shrink-0 z-20 px-1 border-t border-white/[0.04]">
              <div className="flex items-center space-x-2 text-xs font-mono text-zinc-400 bg-white/[0.03] px-3 py-1.5 rounded-xl border border-white/[0.06]">
                <Sparkles className="w-3.5 h-3.5 text-[#38BDF8]" />
                <span className="text-zinc-200 font-medium">
                  {completedPath ? "Full Video AI Restored" : "3s Quick Preview"}
                </span>
                <span className="text-zinc-600">•</span>
                <span className="text-zinc-300">
                  {video.width}×{video.height} ➔ {previewMedia.outputWidth}×{previewMedia.outputHeight}
                </span>
              </div>

              <div className="flex items-center space-x-2.5">
                {completedPath && onOpenFinder && (
                  <button
                    onClick={() => onOpenFinder(completedPath)}
                    className="h-10 px-3.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-zinc-300 hover:text-white font-medium text-xs border border-white/[0.08] flex items-center space-x-1.5 transition-all"
                  >
                    <FolderOpen className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Show in Finder</span>
                  </button>
                )}

                {completedPath && onUseUpscaledAsSource && (
                  <button
                    onClick={() => onUseUpscaledAsSource(completedPath)}
                    className="h-10 px-4 rounded-xl bg-gradient-to-r from-[#38BDF8] to-[#3B82F6] hover:brightness-110 active:brightness-95 text-white font-semibold text-xs shadow-[0_0_20px_-4px_rgba(56,189,248,0.4)] flex items-center space-x-1.5 transition-all"
                    title="Load this upscaled video into workspace to upscale further or apply more presets"
                  >
                    <Zap className="w-3.5 h-3.5 fill-current" />
                    <span>Upscale This Video Further</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}

                {!completedPath && (
                  <button
                    onClick={onStartUpscale}
                    disabled={isUpscaling || isProcessingPreview}
                    className="h-10 px-5 rounded-xl bg-gradient-to-r from-[#38BDF8] to-[#3B82F6] hover:brightness-110 active:brightness-95 text-white font-semibold text-xs shadow-[0_0_20px_-4px_rgba(56,189,248,0.4)] flex items-center space-x-2 transition-all disabled:opacity-50"
                  >
                    <Zap className="w-3.5 h-3.5 fill-current" />
                    <span>Start Full Upscale ({settings.scaleFactor}×)</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* SETUP CONTROLS FOR INITIAL WORKSPACE */
            <div className="h-12 flex items-center justify-between gap-4 pt-1 flex-shrink-0 z-20 px-1">
              {/* Minimal Bento Cards */}
              <div className="flex items-center space-x-2">
                <div className="px-2.5 py-1 rounded-lg bg-[#18181D] border border-white/[0.07] min-w-[95px]">
                  <div className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider">
                    Target Output
                  </div>
                  <div className="text-[11.5px] font-mono font-semibold text-zinc-200 tabular-nums">
                    {video.width * settings.scaleFactor} × {video.height * settings.scaleFactor}
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

                <div className="px-2.5 py-1 rounded-lg bg-[#18181D] border border-white/[0.07] min-w-[70px]">
                  <div className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider">
                    Scale
                  </div>
                  <div className="text-[11.5px] font-mono font-semibold text-zinc-200 tabular-nums">
                    {settings.scaleFactor}×
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
                      <span>Start Upscale ({settings.scaleFactor}×)</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </main>
  );
};