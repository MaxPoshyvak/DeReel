import React from "react";
import { Film, Smartphone, Zap, Sparkles } from "lucide-react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Preset, PresetId } from "../types";
import logoIcon from "../assets/logo-icon-ui.png";
import logoWordmark from "../assets/logo-wordmark-ui.png";

export const PRESETS: Preset[] = [
  {
    id: "vhs",
    title: "VHS & Home Video",
    subtitle: "Deinterlace • Denoise • Faces",
    badge: "Default",
    models: ["bwdif", "realesr-general-x4v3", "RestoreFormer"]
  },
  {
    id: "lowres",
    title: "Old Phone / Low-Res",
    subtitle: "Deblock compression • Sharp detail",
    badge: "x4plus",
    models: ["realesrgan-x4plus"]
  },
  {
    id: "fps60",
    title: "Smooth 60 FPS",
    subtitle: "Motion interpolation (RIFE)",
    badge: "60fps",
    models: ["RIFE-v4.6"]
  },
  {
    id: "anime",
    title: "Cartoons & Anime",
    subtitle: "Vector lines & clean deband",
    badge: "Compact",
    models: ["realesr-animevideov3"]
  }
];

interface PresetSidebarProps {
  activePresetId: PresetId;
  onSelectPreset: (id: PresetId) => void;
}

export const PresetSidebar: React.FC<PresetSidebarProps> = ({
  activePresetId,
  onSelectPreset
}) => {
  const handleDrag = (e: React.MouseEvent) => {
    if (e.button === 0 && !(e.target as HTMLElement).closest("button, input, a, [role='button']")) {
      try {
        getCurrentWindow().startDragging();
      } catch (err) {
        console.warn("Drag error:", err);
      }
    }
  };

  const getPresetIcon = (id: PresetId) => {
    switch (id) {
      case "vhs":
        return <Film className="w-3.5 h-3.5" />;
      case "lowres":
        return <Smartphone className="w-3.5 h-3.5" />;
      case "fps60":
        return <Zap className="w-3.5 h-3.5" />;
      case "anime":
        return <Sparkles className="w-3.5 h-3.5" />;
    }
  };

  return (
    <aside
      data-tauri-drag-region
      onMouseDown={handleDrag}
      className="w-[260px] flex-shrink-0 flex flex-col justify-start py-3 px-3 select-none"
    >
      {/* Window Traffic Lights Spacing & App Title */}
      <div
        data-tauri-drag-region
        onMouseDown={handleDrag}
        className="pt-7 px-1 flex items-center justify-between"
      >
        <div className="flex items-center space-x-2.5">
          <img
            src={logoIcon}
            alt="DeReel Icon"
            className="w-5 h-5 rounded-[5px] shadow-sm select-none pointer-events-none"
          />
          <img
            src={logoWordmark}
            alt="DeReel"
            className="h-3.5 w-auto object-contain select-none pointer-events-none"
          />
        </div>
      </div>

      {/* Presets List */}
      <div className="pt-4 space-y-1.5">
        <div className="text-[10px] font-semibold tracking-wider uppercase text-zinc-500 px-1 mb-2">
          Restoration Presets
        </div>

        {PRESETS.map((preset) => {
          const isSelected = activePresetId === preset.id;
          return (
            <div
              key={preset.id}
              onClick={() => onSelectPreset(preset.id)}
              className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                isSelected
                  ? "bg-[#18181d] border-white/20 text-zinc-100 shadow-sm"
                  : "bg-[#111115]/40 border-white/[0.04] hover:bg-[#16161b] hover:border-white/[0.08] text-zinc-400"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div
                    className={`w-6 h-6 rounded-md flex items-center justify-center transition-colors ${
                      isSelected ? "bg-white/[0.1] text-white" : "bg-white/[0.03] text-zinc-500"
                    }`}
                  >
                    {getPresetIcon(preset.id)}
                  </div>
                  <span className="text-xs font-medium text-zinc-200">{preset.title}</span>
                </div>

                <span
                  className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
                    isSelected
                      ? "bg-white/10 text-zinc-300 border border-white/10 font-medium"
                      : "text-zinc-600 border border-transparent"
                  }`}
                >
                  {preset.badge}
                </span>
              </div>

              <p className="text-[10.5px] text-zinc-500 mt-1 pl-8 leading-snug">
                {preset.subtitle}
              </p>
            </div>
          );
        })}
      </div>
    </aside>
  );
};
