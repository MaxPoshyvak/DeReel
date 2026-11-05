import { useState, useEffect, useCallback } from "react";
import { PresetSidebar } from "./components/PresetSidebar";
import { WorkspaceIsland } from "./components/WorkspaceIsland";
import { ProgressModal } from "./components/ProgressModal";
import { PresetId, PresetSettings, PreviewMedia, VideoMetadata, RenderProgressPayload } from "./types";
import { invoke, convertFileSrc } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { open } from "@tauri-apps/plugin-dialog";

export default function App() {
  const [activePresetId, setActivePresetId] = useState<PresetId>("vhs");
  const [settings, setSettings] = useState<PresetSettings>({
    targetResolution: "1080p",
    faceRestore: true,
    deinterlace: true,
  });

  const [video, setVideo] = useState<VideoMetadata | null>(null);
  const [sliderPos, setSliderPos] = useState<number>(50);
  const [currentTime, setCurrentTime] = useState<number>(0.0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isProcessingPreview, setIsProcessingPreview] = useState<boolean>(false);
  const [previewMedia, setPreviewMedia] = useState<PreviewMedia | null>(null);

  // Upscale and Progress states
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isFullUpscale, setIsFullUpscale] = useState<boolean>(false);
  const [progress, setProgress] = useState<RenderProgressPayload | null>(null);
  const [completedPath, setCompletedPath] = useState<string | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [isUpscaling, setIsUpscaling] = useState<boolean>(false);

  // Listen to live render progress emitted by Rust backend
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    listen<RenderProgressPayload>("render-progress", (event) => {
      setProgress(event.payload);
    }).then((fn) => {
      unlisten = fn;
    });

    return () => {
      if (unlisten) unlisten();
    };
  }, []);

  // Load video given absolute file path
  const loadVideoFromPath = useCallback(async (filePath: string) => {
    try {
      const meta = await invoke<Omit<VideoMetadata, "srcUrl">>("probe_video", { path: filePath });
      setVideo({
        ...meta,
        srcUrl: convertFileSrc(filePath),
      });
      setCurrentTime(0.0);
      setPreviewMedia(null);
      setIsPlaying(true);
    } catch (err) {
      console.warn("Probe video failed:", err);
      const name = filePath.split("/").pop() || "video.mp4";
      setVideo({
        name,
        path: filePath,
        srcUrl: convertFileSrc(filePath),
        size: 0,
        duration: 30.0,
        fps: 29.97,
        width: 640,
        height: 480,
        codec: "h264",
      });
      setCurrentTime(0.0);
      setPreviewMedia(null);
      setIsPlaying(true);
    }
  }, []);

  // Native Finder file browser
  const handleBrowseFile = useCallback(async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [{ name: "Video", extensions: ["mp4", "mov", "mkv", "avi", "webm", "m4v"] }],
      });
      if (selected && typeof selected === "string") {
        await loadVideoFromPath(selected);
      }
    } catch (err) {
      console.warn("Native file dialog error:", err);
    }
  }, [loadVideoFromPath]);

  // Load demo VHS sample
  const handleLoadDemo = useCallback(async () => {
    const demoPath = "/Users/max/FFI/Project/DeReel/src-tauri/binaries/onepiece_demo.mp4";
    try {
      const meta = await invoke<Omit<VideoMetadata, "srcUrl">>("probe_video", { path: demoPath });
      setVideo({
        ...meta,
        srcUrl: convertFileSrc(demoPath),
      });
      setCurrentTime(0.0);
      setPreviewMedia(null);
      setIsPlaying(true);
    } catch {
      setVideo({
        name: "demo_clip_vhs.mp4",
        path: demoPath,
        srcUrl: "/demo_sample.mp4",
        size: 592566,
        duration: 7.55,
        fps: 23.98,
        width: 640,
        height: 480,
        codec: "h264",
      });
      setCurrentTime(0.0);
      setPreviewMedia(null);
      setIsPlaying(true);
    }
  }, []);

  // Handle file drop from HTML5 file object
  const handleSelectFile = useCallback(async (file: File) => {
    const blobUrl = URL.createObjectURL(file);
    const filePath = (file as unknown as { path?: string }).path;

    if (filePath) {
      await loadVideoFromPath(filePath);
      return;
    }

    setVideo({
      name: file.name,
      path: file.name,
      srcUrl: blobUrl,
      size: file.size,
      duration: 30.0,
      fps: 29.97,
      width: 640,
      height: 480,
      codec: "h264",
    });
    setCurrentTime(0.0);
    setPreviewMedia(null);
    setIsPlaying(true);
  }, [loadVideoFromPath]);

  // Listen to Tauri window drag & drop events
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    try {
      import("@tauri-apps/api/webview").then(({ getCurrentWebview }) => {
        getCurrentWebview()
          .onDragDropEvent((event) => {
            if (event.payload.type === "drop" && event.payload.paths.length > 0) {
              loadVideoFromPath(event.payload.paths[0]);
            }
          })
          .then((fn) => {
            unlisten = fn;
          });
      });
    } catch {
      // Ignored in browser mode
    }
    return () => {
      if (unlisten) unlisten();
    };
  }, [loadVideoFromPath]);

  // Execute Real AI 3s Preview on Apple GPU
  const handleRunPreview = useCallback(async () => {
    if (!video || isProcessingPreview || isUpscaling) return;
    setIsProcessingPreview(true);
    setIsFullUpscale(false);
    setCompletedPath(null);
    setRenderError(null);
    setProgress({
      stage: "Extracting 3s frames with deinterlacer...",
      percent: 5,
      current_frame: 0,
      total_frames: Math.round(3.0 * (video.fps || 30)),
      fps: 0,
      eta_seconds: 10,
    });
    setIsModalOpen(true);

    try {
      const scale = settings.targetResolution === "4k" ? 4 : 2;
      const res = await invoke<{
        original_path: string;
        enhanced_path: string;
        duration: number;
        output_width: number;
        output_height: number;
      }>("render_preview", {
        inputPath: video.path,
        startSec: currentTime,
        scale,
        deinterlace: settings.deinterlace,
      });

      setPreviewMedia({
        originalUrl: convertFileSrc(res.original_path),
        enhancedUrl: convertFileSrc(res.enhanced_path),
        outputWidth: res.output_width,
        outputHeight: res.output_height,
      });
      setIsPlaying(true);
      // Close modal on preview success so user can immediately view split-screen slider
      setIsModalOpen(false);
    } catch (err: unknown) {
      console.warn("Real preview failed:", err);
      const errMsg = typeof err === "string" ? err : (err as Error)?.message || "Preview failed";
      setRenderError(errMsg);
    } finally {
      setIsProcessingPreview(false);
    }
  }, [video, isProcessingPreview, isUpscaling, currentTime, settings]);

  // Execute Full Video AI Upscale
  const handleStartUpscale = useCallback(async () => {
    if (!video || isUpscaling || isProcessingPreview) return;
    setIsUpscaling(true);
    setIsFullUpscale(true);
    setCompletedPath(null);
    setRenderError(null);
    setProgress({
      stage: "Initializing AI pipeline...",
      percent: 2,
      current_frame: 0,
      total_frames: Math.round((video.duration || 10) * (video.fps || 30)),
      fps: 0,
      eta_seconds: 30,
    });
    setIsModalOpen(true);

    try {
      const scale = settings.targetResolution === "4k" ? 4 : 2;
      const res = await invoke<string>("upscale_video", {
        inputPath: video.path,
        outputPath: "",
        scale,
        deinterlace: settings.deinterlace,
      });

      setCompletedPath(res);
      setProgress({
        stage: "Upscale Complete!",
        percent: 100,
        current_frame: Math.round((video.duration || 10) * (video.fps || 30)),
        total_frames: Math.round((video.duration || 10) * (video.fps || 30)),
        fps: 0,
        eta_seconds: 0,
      });
    } catch (err: unknown) {
      console.warn("Full upscale failed:", err);
      const errMsg = typeof err === "string" ? err : (err as Error)?.message || "Upscale failed";
      setRenderError(errMsg);
    } finally {
      setIsUpscaling(false);
    }
  }, [video, isUpscaling, isProcessingPreview, settings]);

  // Open Before/After Comparison view for upscaled video
  const handleCompareResult = useCallback(() => {
    if (!video || !completedPath) return;
    const scale = settings.targetResolution === "4k" ? 4 : 2;
    setPreviewMedia({
      originalUrl: video.srcUrl,
      enhancedUrl: convertFileSrc(completedPath),
      outputWidth: video.width * scale,
      outputHeight: video.height * scale,
    });
    setIsModalOpen(false);
    setIsPlaying(true);
  }, [video, completedPath, settings.targetResolution]);

  // Load upscaled video as the new input to allow re-upscaling or applying more presets
  const handleUseUpscaledAsSource = useCallback(
    async (path: string) => {
      setPreviewMedia(null);
      setCompletedPath(null);
      await loadVideoFromPath(path);
    },
    [loadVideoFromPath]
  );

  // Cancel running pipeline
  const handleCancel = useCallback(async () => {
    try {
      await invoke("cancel_render");
    } catch (e) {
      console.warn("Cancel invoke failed:", e);
    }
    setIsModalOpen(false);
    setIsUpscaling(false);
    setIsProcessingPreview(false);
  }, []);

  // Reveal finished file in macOS Finder
  const handleOpenFinder = useCallback(async (path: string) => {
    try {
      await invoke("show_in_finder", { path });
    } catch (e) {
      console.warn("Show in finder failed:", e);
    }
  }, []);

  // Global Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;

      if (e.code === "Space") {
        e.preventDefault();
        setIsPlaying((prev) => !prev);
      } else if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleStartUpscale();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleStartUpscale]);

  const handleDrag = (e: React.MouseEvent) => {
    if (e.button === 0 && !(e.target as HTMLElement).closest("button, input, a, select, video")) {
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
    <div
      data-tauri-drag-region
      onMouseDown={handleDrag}
      className="w-screen h-screen overflow-hidden select-none bg-[#09090b] text-[#f4f4f6] flex p-2.5 gap-2.5"
    >
      {/* Zone 1: Preset Sidebar (260px) */}
      <PresetSidebar
        activePresetId={activePresetId}
        onSelectPreset={setActivePresetId}
      />

      {/* Zone 2: Main Video Workspace Island */}
      <WorkspaceIsland
        video={video}
        onSelectFile={handleSelectFile}
        onBrowseFile={handleBrowseFile}
        onLoadDemo={handleLoadDemo}
        onClearVideo={() => {
          setVideo(null);
          setPreviewMedia(null);
          setIsPlaying(false);
        }}
        settings={settings}
        onChangeSettings={(newSt) => setSettings((prev) => ({ ...prev, ...newSt }))}
        sliderPos={sliderPos}
        onChangeSliderPos={setSliderPos}
        currentTime={currentTime}
        onSeek={setCurrentTime}
        isPlaying={isPlaying}
        onTogglePlay={() => setIsPlaying((p) => !p)}
        isProcessingPreview={isProcessingPreview}
        previewMedia={previewMedia}
        onClearPreview={() => {
          setPreviewMedia(null);
          setIsPlaying(true);
        }}
        onRunPreview={handleRunPreview}
        isUpscaling={isUpscaling}
        onStartUpscale={handleStartUpscale}
        completedPath={completedPath}
        onOpenFinder={handleOpenFinder}
        onUseUpscaledAsSource={handleUseUpscaledAsSource}
      />

      {/* Real-time Progress HUD / Modal */}
      <ProgressModal
        isOpen={isModalOpen}
        isFullUpscale={isFullUpscale}
        progress={progress}
        completedPath={completedPath}
        error={renderError}
        onCancel={handleCancel}
        onOpenFinder={handleOpenFinder}
        onCompareResult={handleCompareResult}
        onClose={() => {
          if (completedPath) {
            handleCompareResult();
          } else {
            setIsModalOpen(false);
            setCompletedPath(null);
            setRenderError(null);
          }
        }}
      />
    </div>
  );
}
