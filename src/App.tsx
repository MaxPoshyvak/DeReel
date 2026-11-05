import { useState, useEffect, useCallback } from "react";
import { PresetSidebar } from "./components/PresetSidebar";
import { WorkspaceIsland } from "./components/WorkspaceIsland";
import { PresetId, PresetSettings, VideoMetadata } from "./types";

export default function App() {
  const [activePresetId, setActivePresetId] = useState<PresetId>("vhs");
  const [settings, setSettings] = useState<PresetSettings>({
    targetResolution: "1080p",
    faceRestore: true,
    deinterlace: true,
  });

  const [video, setVideo] = useState<VideoMetadata | null>(null);
  const [sliderPos, setSliderPos] = useState<number>(50);
  const [currentTime, setCurrentTime] = useState<number>(14.5);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isProcessingPreview, setIsProcessingPreview] = useState<boolean>(false);
  const [hasPreview, setHasPreview] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Load demo VHS sample
  const handleLoadDemo = () => {
    setVideo({
      name: "family_vacation_kyiv_1994.avi",
      path: "/Users/max/Movies/family_vacation_kyiv_1994.avi",
      size: 42 * 1024 * 1024,
      duration: 84.0,
      fps: 29.97,
      width: 640,
      height: 480,
      codec: "h264 (yuv420p)",
    });
    setCurrentTime(14.5);
  };

  const handleSelectFile = (file: File) => {
    setVideo({
      name: file.name,
      path: file.name,
      size: file.size,
      duration: 120.0,
      fps: 25.0,
      width: 720,
      height: 576,
      codec: "h264",
    });
    setCurrentTime(10.0);
  };

  const handleRunPreview = useCallback(() => {
    if (!video || isProcessingPreview) return;
    setIsProcessingPreview(true);
    setTimeout(() => {
      setIsProcessingPreview(false);
      setHasPreview(true);
    }, 1200);
  }, [video, isProcessingPreview]);

  const handleExport = useCallback(() => {
    if (!video || isExporting) return;
    setIsExporting(true);
    setTimeout(() => {
      setIsExporting(false);
      alert(`Export of ${video.name} completed successfully!`);
    }, 3000);
  }, [video, isExporting]);

  // Global Keyboard shortcuts (Space = Play/Pause, Cmd+Enter = Export)
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

  // Playback loop timer
  useEffect(() => {
    if (!isPlaying || !video) return;
    const interval = setInterval(() => {
      setCurrentTime((prev) => {
        if (prev >= video.duration) return 0;
        return prev + 0.1;
      });
    }, 100);
    return () => clearInterval(interval);
  }, [isPlaying, video]);

  const handleDrag = (e: React.MouseEvent) => {
    if (e.button === 0 && !(e.target as HTMLElement).closest("button, input, a, select")) {
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
          setHasPreview(false);
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
        hasPreview={hasPreview}
        onRunPreview={handleRunPreview}
        isExporting={isExporting}
        onExport={handleExport}
      />
    </div>
  );
}
