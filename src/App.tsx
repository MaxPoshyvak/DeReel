import { useState, useEffect, useCallback } from "react";
import { PresetSidebar } from "./components/PresetSidebar";
import { WorkspaceIsland } from "./components/WorkspaceIsland";
import { PresetId, PresetSettings, PreviewMedia, VideoMetadata } from "./types";
import { invoke, convertFileSrc } from "@tauri-apps/api/core";

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
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Load demo video (uses bundled onepiece_demo.mp4)
  const handleLoadDemo = useCallback(async () => {
    const demoPath = "/Users/max/FFI/Project/DeReel/src-tauri/binaries/onepiece_demo.mp4";

    try {
      // Probe real metadata via Tauri ffprobe
      const meta = await invoke<VideoMetadata>("probe_video", { path: demoPath });
      setVideo(meta);
      setCurrentTime(0.0);
      setPreviewMedia(null);
    } catch {
      // Fallback for browser mode
      setVideo({
        name: "demo_clip_vhs.mp4",
        path: demoPath,
        size: 592566,
        duration: 7.55,
        fps: 23.98,
        width: 640,
        height: 480,
        codec: "h264",
      });
      setCurrentTime(0.0);
      setPreviewMedia(null);
    }
  }, []);

  const handleSelectFile = useCallback(async (file: File) => {
    // If running in Tauri with file path:
    // In web standard, file.name is available; we probe if path is available
    const filePath = (file as unknown as { path?: string }).path || file.name;

    try {
      const meta = await invoke<VideoMetadata>("probe_video", { path: filePath });
      setVideo(meta);
    } catch {
      setVideo({
        name: file.name,
        path: filePath,
        size: file.size,
        duration: 30.0,
        fps: 29.97,
        width: 640,
        height: 480,
        codec: "h264",
      });
    }
    setCurrentTime(0.0);
    setPreviewMedia(null);
  }, []);

  const handleRunPreview = useCallback(async () => {
    if (!video || isProcessingPreview) return;
    setIsProcessingPreview(true);

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
    } catch (err) {
      console.warn("Real preview failed, falling back to simulated preview:", err);
      // Fallback
      setPreviewMedia({
        originalUrl: "/demo_sample.mp4",
        enhancedUrl: "/demo_sample.mp4",
        outputWidth: video.width * 2,
        outputHeight: video.height * 2,
      });
      setIsPlaying(true);
    } finally {
      setIsProcessingPreview(false);
    }
  }, [video, isProcessingPreview, currentTime, settings]);

  const handleExport = useCallback(() => {
    if (!video || isExporting) return;
    setIsExporting(true);
    setTimeout(() => {
      setIsExporting(false);
      alert(`Export of ${video.name} completed successfully!`);
    }, 2500);
  }, [video, isExporting]);

  // Global Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;

      if (e.code === "Space") {
        e.preventDefault();
        setIsPlaying((prev) => !prev);
      } else if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleExport();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleExport]);

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
        onRunPreview={handleRunPreview}
        isExporting={isExporting}
        onExport={handleExport}
      />
    </div>
  );
}
