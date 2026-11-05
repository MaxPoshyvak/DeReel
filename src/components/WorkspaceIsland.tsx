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
  Sparkles
} from "lucide-react";
import { PresetSettings, PreviewMedia, VideoMetadata } from "../types";

interface WorkspaceIslandProps {
  video: VideoMetadata | null;
  onSelectFile: (file: File) => void;
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
  onRunPreview: () => void;
  isExporting: boolean;
  onExport: () => void;
}

export const WorkspaceIsland: React.FC<WorkspaceIslandProps> = ({
  video,
  onSelectFile,
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
  onRunPreview,
  isExporting,
  onExport
}) => {
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingSlider = useRef(false);

  const originalVideoRef = useRef<HTMLVideoElement>(null);
  const enhancedVideoRef = useRef<HTMLVideoElement>(null);

  // Synchronize both preview videos when playing
  useEffect(() => {
    if (originalVideoRef.current && enhancedVideoRef.current) {
      if (isPlaying) {
        originalVideoRef.current.play().catch(() => {});
        enhancedVideoRef.current.play().catch(() => {});
      } else {
        originalVideoRef.current.pause();
        enhancedVideoRef.current.pause();
      }
    }
  }, [isPlaying, previewMedia]);

  const handleTimeUpdate = () => {
    if (originalVideoRef.current && enhancedVideoRef.current) {
      const diff = Math.abs(originalVideoRef.current.currentTime - enhancedVideoRef.current.currentTime);
      if (diff > 0.05) {
        enhancedVideoRef.current.currentTime = originalVideoRef.current.currentTime;
      }
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
          onClick={() => fileInputRef.current?.click()}
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
        /* CASE 2: VIDEO LOADED — PROFESSIONAL WORKSPACE */
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

              <button
                onClick={onClearVideo}
                className="p-1 rounded-md text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.06] transition-colors"
                title="Remove video"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Central Split-Screen Video Canvas */}
          <div className="flex-1 my-2 relative rounded-xl overflow-hidden bg-black/50 border border-white/[0.06] flex items-center justify-center">
            <div
              ref={containerRef}
              className="w-full h-full relative overflow-hidden select-none flex items-center justify-center"
            >
              {previewMedia ? (
                /* REAL SPLIT-SCREEN VIDEO PLAYER */
                <>
                  {/* BEFORE (Original 3s Video) */}
                  <div className="absolute inset-0 flex items-center justify-center bg-black">
                    <video
                      ref={originalVideoRef}
                      src={previewMedia.originalUrl}
                      loop
                      muted
                      playsInline
                      onTimeUpdate={handleTimeUpdate}
                      className="w-full h-full object-contain pointer-events-none"
                    />
                  </div>

                  {/* AFTER (AI Enhanced 3s Video, clipped by sliderPos) */}
                  <div
                    className="absolute inset-0 flex items-center justify-center bg-black overflow-hidden"
                    style={{
                      clipPath: `inset(0 0 0 ${sliderPos}%)`
                    }}
                  >
                    <video
                      ref={enhancedVideoRef}
                      src={previewMedia.enhancedUrl}
                      loop
                      muted
                      playsInline
                      className="w-full h-full object-contain pointer-events-none"
                    />
                  </div>
                </>
              ) : (
                /* PLACEHOLDER BEFORE RENDERING PREVIEW */
                <>
                  {/* Before Layer (Original Analog Footage preview) */}
                  <div className="absolute inset-0 flex items-center justify-center bg-[#09090c]">
                    <div
                      className="absolute inset-0 pointer-events-none opacity-20"
                      style={{
                        backgroundImage:
                          "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.8) 3px, rgba(0,0,0,0.8) 4px)"
                      }}
                    />
                    <div className="text-center p-6 select-none">
                      <div className="text-5xl opacity-40 mb-2">📼</div>
                      <div className="text-xs font-mono text-zinc-500 uppercase tracking-widest font-semibold">
                        Original ({video.width}×{video.height})
                      </div>
                      <div className="text-[11px] text-zinc-600 mt-2">
                        Click "Render 3s Preview" below to run Apple Silicon Neural Engine & GPU
                      </div>
                    </div>
                  </div>

                  {/* After Layer (Simulated preview) */}
                  <div
                    className="absolute inset-0 flex items-center justify-center bg-[#131318] overflow-hidden"
                    style={{
                      clipPath: `inset(0 0 0 ${sliderPos}%)`
                    }}
                  >
                    <div className="text-center p-6 select-none">
                      <div className="text-5xl text-[#38BDF8] drop-shadow-[0_0_24px_rgba(56,189,248,0.35)] mb-2">
                        ✨
                      </div>
                      <div className="text-xs font-mono text-sky-200 uppercase tracking-widest font-semibold">
                        AI Restored ({settings.targetResolution.toUpperCase()})
                      </div>
                      <div className="text-[11px] text-zinc-500 mt-2">
                        Ready for instant GPU preview
                      </div>
                    </div>
                  </div>
                </>
              )}

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
                  {previewMedia
                    ? `AI Restored (${previewMedia.outputWidth}×${previewMedia.outputHeight})`
                    : `AI Restored (${settings.targetResolution.toUpperCase()})`}
                </span>
              </div>

              {/* Floating Glass Pill Docked Bottom Center */}
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/70 backdrop-blur-xl border border-white/10 px-3 py-1.5 flex items-center gap-3 shadow-2xl z-20">
                <button
                  onClick={onTogglePlay}
                  className="w-6 h-6 rounded-full bg-white text-zinc-950 flex items-center justify-center shadow hover:bg-zinc-200 active:scale-95 transition-all"
                  title="Play/Pause (Space)"
                >
                  {isPlaying ? (
                    <Pause className="w-3 h-3 fill-current" />
                  ) : (
                    <Play className="w-3 h-3 fill-current ml-0.5" />
                  )}
                </button>

                <div className="flex items-center space-x-2">
                  <input
                    type="range"
                    min={0}
                    max={video.duration}
                    step={0.1}
                    value={currentTime}
                    onChange={(e) => onSeek(parseFloat(e.target.value))}
                    className="w-28 pro-slider"
                  />
                  <span className="font-mono text-[10px] text-zinc-400 tabular-nums">
                    {formatTimecode(currentTime)}
                  </span>
                </div>

                <button
                  onClick={onRunPreview}
                  disabled={isProcessingPreview}
                  className="bg-white text-zinc-950 hover:bg-zinc-200 active:scale-95 px-2.5 py-1 rounded-full text-[11px] font-semibold shadow flex items-center space-x-1 transition-all disabled:opacity-50"
                >
                  {isProcessingPreview ? (
                    <RotateCcw className="w-3 h-3 animate-spin text-zinc-950" />
                  ) : (
                    <span>⚡</span>
                  )}
                  <span>{isProcessingPreview ? "Generating..." : "Render 3s Preview"}</span>
                </button>
              </div>

              {/* Processing Shimmer Overlay */}
              {isProcessingPreview && (
                <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center space-y-2.5 z-40">
                  <div className="w-6 h-6 rounded-full border-2 border-[#38BDF8] border-t-transparent animate-spin" />
                  <div className="text-xs font-semibold text-zinc-200">
                    Running Apple Silicon GPU & Neural Engine...
                  </div>
                  <div className="text-[10.5px] font-mono text-zinc-500">
                    bwdif deinterlacing • Real-ESRGAN SPAN • VideoToolbox encode
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Bottom Telemetry & Export Bar (ONLY VISIBLE WHEN VIDEO IS LOADED) */}
          <div className="h-12 flex items-center justify-between gap-4 pt-1 flex-shrink-0 z-20 px-1">
            {/* 3 Minimal Bento Cards */}
            <div className="flex items-center space-x-2">
              <div className="px-2.5 py-1 rounded-lg bg-[#18181D] border border-white/[0.07] min-w-[95px]">
                <div className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider">
                  Output
                </div>
                <div className="text-[11.5px] font-mono font-semibold text-zinc-200 tabular-nums">
                  {settings.targetResolution === "4k"
                    ? `${video.width * 4} × ${video.height * 4}`
                    : `${video.width * 2} × ${video.height * 2}`}
                </div>
              </div>

              <div className="px-2.5 py-1 rounded-lg bg-[#18181D] border border-white/[0.07] min-w-[95px]">
                <div className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider">
                  Frame Rate
                </div>
                <div className="text-[11.5px] font-mono font-semibold text-zinc-200 tabular-nums">
                  {video.fps.toFixed(1)} FPS
                </div>
              </div>

              <div className="px-2.5 py-1 rounded-lg bg-[#18181D] border border-white/[0.07] min-w-[90px]">
                <div className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider">
                  Est. Time
                </div>
                <div className="text-[11.5px] font-mono font-semibold text-zinc-200 tabular-nums">
                  ~00m 15s (3s)
                </div>
              </div>
            </div>

            {/* Single Accent Gradient CTA */}
            <button
              onClick={onExport}
              disabled={isExporting}
              className="h-10 px-5 rounded-xl bg-gradient-to-r from-[#38BDF8] to-[#3B82F6] hover:brightness-110 active:brightness-95 text-white font-semibold text-xs shadow-[0_0_20px_-4px_rgba(56,189,248,0.4)] flex items-center space-x-2 transition-all disabled:opacity-50"
            >
              {isExporting ? (
                <>
                  <RotateCcw className="w-3.5 h-3.5 animate-spin text-white" />
                  <span>Exporting...</span>
                </>
              ) : (
                <>
                  <span>Export Video</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </main>
  );
};
