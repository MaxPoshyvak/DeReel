import React, { useState, useRef } from "react";
import {
  Film,
  Sparkles,
  Zap,
  Smartphone,
  Upload,
  Play,
  Download,
  Sliders,
  ShieldCheck,
  CheckCircle2,
  Layers,
  Info,
  Clock,
  Video
} from "lucide-react";
import { Preset, PresetId, VideoFile } from "./types";

const PRESETS: Preset[] = [
  {
    id: "vhs",
    icon: "Film",
    title: "VHS / Сімейний архів",
    subtitle: "Деінтерлейсинг + Денойз + Обличчя",
    description: "Видаляє смуги гребінки (bwdif), плівковий шум та повертає природну чіткість старим відео.",
    badge: "Найпопулярніший",
    models: ["bwdif", "realesr-general-x4v3", "RestoreFormer"]
  },
  {
    id: "lowres",
    icon: "Smartphone",
    title: "Старий телефон / Low-Res",
    subtitle: "Швидкий апскейл 2x / 4x",
    description: "Прибирає піксельні артефакти компресії 3GP/MP4 та збільшує розширення до HD/4K.",
    badge: "2x–4x Швидкість",
    models: ["realesr-general-x4v3-compact"]
  },
  {
    id: "fps60",
    icon: "Zap",
    title: "Плавні 60 FPS",
    subtitle: "Інтерполяція кадрів RIFE",
    description: "Генерує плавні проміжні кадри за допомогою нейромережі RIFE без ефекту мила.",
    badge: "Super Smooth",
    models: ["RIFE-v4.6"]
  },
  {
    id: "anime",
    icon: "Sparkles",
    title: "Мультфільми / Аніме",
    subtitle: "Векторна чіткість ліній",
    description: "Зберігає чіткі контури, вирівнює кольорові заливки та оптимізує 2D/3D анімацію.",
    badge: "Compact SPAN",
    models: ["realesr-animevideov3"]
  }
];

export default function App() {
  const [selectedFile, setSelectedFile] = useState<VideoFile | null>(null);
  const [activePreset, setActivePreset] = useState<PresetId>("vhs");
  const [previewPosition, setPreviewPosition] = useState<number>(50);
  const [isPreviewActive, setIsPreviewActive] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [previewTimestamp, setPreviewTimestamp] = useState<number>(12); // seconds into video
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile({
        name: file.name,
        path: file.name,
        size: file.size,
        duration: 84, // mock 1m 24s
        resolution: "640x480 (SD)"
      });
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      setSelectedFile({
        name: file.name,
        path: file.name,
        size: file.size,
        duration: 84,
        resolution: "640x480 (SD)"
      });
    }
  };

  const getPresetIcon = (iconName: string) => {
    switch (iconName) {
      case "Film":
        return <Film className="w-5 h-5 text-purple-400" />;
      case "Smartphone":
        return <Smartphone className="w-5 h-5 text-blue-400" />;
      case "Zap":
        return <Zap className="w-5 h-5 text-amber-400" />;
      case "Sparkles":
        return <Sparkles className="w-5 h-5 text-emerald-400" />;
      default:
        return <Video className="w-5 h-5 text-purple-400" />;
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#09090b] text-zinc-100 select-none">
      {/* Top Bar / Header */}
      <header className="h-14 border-b border-white/10 px-6 flex items-center justify-between glass-panel sticky top-0 z-50">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
            <Film className="w-4 h-4 text-white" />
          </div>
          <div>
            <span className="font-bold tracking-tight text-lg bg-gradient-to-r from-zinc-100 to-zinc-400 bg-clip-text text-transparent">
              DeReel
            </span>
            <span className="ml-2 text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
              v0.1.0 MVP
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1.5 text-xs text-zinc-400 bg-white/5 px-2.5 py-1 rounded-full border border-white/5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>100% Local GPU & Private</span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Video Workspace & Interactive Preview */}
        <div className="lg:col-span-8 flex flex-col space-y-4">
          {!selectedFile ? (
            /* Drag and drop zone */
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 min-h-[460px] rounded-2xl border-2 border-dashed border-zinc-700/70 hover:border-purple-500/60 bg-zinc-900/30 hover:bg-zinc-900/60 transition-all flex flex-col items-center justify-center p-8 text-center cursor-pointer group"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*,.mp4,.mov,.mkv,.avi"
                onChange={handleFileSelect}
                className="hidden"
              />
              <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform mb-4 shadow-xl">
                <Upload className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-semibold text-zinc-100 mb-1">
                Перетягніть сюди відео або натисніть для вибору
              </h3>
              <p className="text-sm text-zinc-400 max-w-sm mb-4">
                Підтримуються формати MP4, MOV, MKV, AVI. Відновлення та апскейл відбуваються локально без відправки в мережу.
              </p>
              <div className="flex items-center space-x-2 text-xs text-zinc-500 bg-zinc-800/50 px-3 py-1.5 rounded-lg border border-zinc-700/50">
                <Layers className="w-3.5 h-3.5 text-zinc-400" />
                <span>Zero-Disk-Write: пряма пам'ять без сміття на SSD</span>
              </div>
            </div>
          ) : (
            /* Active Video View & Side-by-side Preview Slider */
            <div className="flex-1 flex flex-col space-y-4">
              <div className="relative aspect-video bg-black rounded-2xl overflow-hidden border border-white/10 shadow-2xl flex items-center justify-center">
                {/* Side-by-Side Comparison Container */}
                <div className="w-full h-full relative select-none overflow-hidden">
                  {/* Before (Original) */}
                  <div className="absolute inset-0 flex items-center justify-center bg-zinc-950">
                    <div className="relative text-center p-6">
                      <div className="text-6xl mb-2 opacity-30">📼</div>
                      <p className="text-xs uppercase tracking-wider font-bold text-zinc-500">
                        Оригінал (До відновлення)
                      </p>
                      <span className="text-xs text-zinc-600 font-mono">
                        {selectedFile.resolution || "SD 480p"} • Черезрядкова гребінка • Шум
                      </span>
                    </div>
                  </div>

                  {/* After (Enhanced) - Clipped via split slider */}
                  <div
                    className="absolute inset-0 flex items-center justify-center bg-zinc-900 border-l border-purple-400/80"
                    style={{ left: `${previewPosition}%` }}
                  >
                    <div
                      className="absolute inset-0 flex items-center justify-center overflow-hidden"
                      style={{
                        width: "100%",
                        marginLeft: `-${previewPosition}%`
                      }}
                    >
                      <div className="relative text-center p-6">
                        <div className="text-6xl mb-2 text-purple-400/90 drop-shadow-[0_0_20px_rgba(168,85,247,0.4)]">
                          ✨
                        </div>
                        <p className="text-xs uppercase tracking-wider font-bold text-purple-400">
                          DeReel AI Відновлення (Після)
                        </p>
                        <span className="text-xs text-purple-300/70 font-mono">
                          1080p/4K • De-interlaced bwdif • De-noised • SPAN Crisp
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Slider Divider Line */}
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-purple-400 cursor-ew-resize flex items-center justify-center"
                    style={{ left: `${previewPosition}%` }}
                  >
                    <div className="w-7 h-7 rounded-full bg-purple-500 text-white flex items-center justify-center shadow-lg border border-white/30 text-xs font-bold">
                      ↔
                    </div>
                  </div>

                  {/* Floating Labels */}
                  <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded text-[11px] font-medium text-zinc-300 border border-white/10">
                    Оригінал
                  </div>
                  <div className="absolute top-4 right-4 bg-purple-950/70 backdrop-blur-md px-2.5 py-1 rounded text-[11px] font-medium text-purple-200 border border-purple-500/30 flex items-center space-x-1">
                    {isPreviewActive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse mr-1" />}
                    <span>{isPreviewActive ? "DeReel AI (3s Ready)" : "DeReel AI"}</span>
                  </div>
                </div>
              </div>

              {/* Slider Controller */}
              <div className="glass-panel p-4 rounded-xl flex items-center space-x-4">
                <span className="text-xs text-zinc-400 whitespace-nowrap">Слайдер порівняння:</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={previewPosition}
                  onChange={(e) => setPreviewPosition(Number(e.target.value))}
                  className="w-full accent-purple-500 cursor-pointer h-1.5 bg-zinc-800 rounded-lg"
                />
                <span className="text-xs font-mono text-purple-400 w-12 text-right">
                  {previewPosition}%
                </span>
              </div>

              {/* Timeline segment for 3s preview */}
              <div className="glass-panel p-4 rounded-xl flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Clock className="w-4 h-4 text-zinc-400" />
                  <div>
                    <div className="text-xs font-medium text-zinc-200">
                      Момент для 3-секундного прев'ю
                    </div>
                    <div className="text-[11px] text-zinc-400">
                      Позиція: 00:{previewTimestamp < 10 ? `0${previewTimestamp}` : previewTimestamp} / 01:24
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <input
                    type="range"
                    min="0"
                    max="80"
                    value={previewTimestamp}
                    onChange={(e) => setPreviewTimestamp(Number(e.target.value))}
                    className="w-48 accent-purple-500 cursor-pointer h-1.5 bg-zinc-800 rounded-lg"
                  />
                  <button
                    onClick={() => {
                      setIsProcessing(true);
                      setTimeout(() => {
                        setIsProcessing(false);
                        setIsPreviewActive(true);
                      }, 1200);
                    }}
                    disabled={isProcessing}
                    className="px-3.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium text-xs flex items-center space-x-1.5 shadow-lg shadow-purple-600/20 disabled:opacity-50 transition-all"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>{isProcessing ? "Генерація 3s..." : "3s Прев'ю"}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Presets & Controls */}
        <div className="lg:col-span-4 flex flex-col space-y-4">
          {/* File summary card if selected */}
          {selectedFile && (
            <div className="glass-panel p-4 rounded-xl flex items-center justify-between">
              <div className="truncate max-w-[220px]">
                <div className="text-xs font-semibold text-zinc-200 truncate">
                  {selectedFile.name}
                </div>
                <div className="text-[11px] text-zinc-400">
                  {(selectedFile.size / (1024 * 1024)).toFixed(1)} MB • {selectedFile.resolution}
                </div>
              </div>
              <button
                onClick={() => setSelectedFile(null)}
                className="text-xs text-zinc-400 hover:text-zinc-200 hover:underline"
              >
                Змінити
              </button>
            </div>
          )}

          {/* Presets Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400 flex items-center space-x-1.5">
              <Sliders className="w-4 h-4 text-purple-400" />
              <span>Пресет відновлення</span>
            </h2>
            <span className="text-[11px] text-zinc-500">1 клік</span>
          </div>

          {/* 4 One-Click Presets */}
          <div className="space-y-2.5">
            {PRESETS.map((preset) => {
              const isSelected = activePreset === preset.id;
              return (
                <div
                  key={preset.id}
                  onClick={() => setActivePreset(preset.id)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer relative ${
                    isSelected
                      ? "bg-purple-950/20 border-purple-500/60 shadow-lg shadow-purple-500/10"
                      : "glass-panel glass-panel-hover"
                  }`}
                >
                  <div className="flex items-start justify-between mb-1.5">
                    <div className="flex items-center space-x-2.5">
                      <div
                        className={`p-1.5 rounded-lg ${
                          isSelected
                            ? "bg-purple-500/20 text-purple-300"
                            : "bg-white/5 text-zinc-400"
                        }`}
                      >
                        {getPresetIcon(preset.icon)}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-zinc-100 flex items-center space-x-1.5">
                          <span>{preset.title}</span>
                          {isSelected && (
                            <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />
                          )}
                        </div>
                        <div className="text-xs text-purple-300/80 font-medium">
                          {preset.subtitle}
                        </div>
                      </div>
                    </div>
                    {preset.badge && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-white/5 text-zinc-400 border border-white/5">
                        {preset.badge}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                    {preset.description}
                  </p>

                  <div className="mt-2.5 pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-zinc-500">
                    <span>Модельний стек:</span>
                    <span className="font-mono text-zinc-400">
                      {preset.models.join(" ➔ ")}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Export Action Card */}
          <div className="mt-auto pt-4">
            <button
              disabled={!selectedFile}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-sm flex items-center justify-center space-x-2 shadow-xl shadow-purple-600/25 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <Download className="w-4 h-4" />
              <span>Повний експорт відео</span>
            </button>
            <p className="text-center text-[11px] text-zinc-500 mt-2 flex items-center justify-center space-x-1">
              <Info className="w-3 h-3" />
              <span>Zero-Disk-Write: прямий стрім у вихідний MP4 без сміття на диску</span>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
