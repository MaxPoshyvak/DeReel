import React from "react";
import { CheckCircle2, FolderOpen, X, AlertCircle, Sparkles } from "lucide-react";
import { RenderProgressPayload, Preset } from "../types";

interface ProgressModalProps {
  isOpen: boolean;
  isFullUpscale: boolean;
  progress: RenderProgressPayload | null;
  completedPath: string | null;
  error: string | null;
  activePreset?: Preset;
  chipName?: string;
  onCancel: () => void;
  onOpenFinder: (path: string) => void;
  onClose: () => void;
  onCompareResult: () => void;
}

export const ProgressModal: React.FC<ProgressModalProps> = ({
  isOpen,
  isFullUpscale,
  progress,
  completedPath,
  error,
  activePreset,
  chipName = "Apple Silicon",
  onCancel,
  onOpenFinder,
  onClose,
  onCompareResult,
}) => {
  if (!isOpen) return null;

  const percent = Math.min(100, Math.max(0, progress?.percent || 0));
  const isDone = Boolean(completedPath);

  const formatEta = (seconds: number) => {
    if (!seconds || seconds <= 0) return "--:--";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  return (
    <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-6 z-50 select-none animate-in fade-in duration-150">
      <div className="w-full max-w-md rounded-2xl bg-[#15161b] border border-white/[0.1] p-6 shadow-2xl relative space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            {isDone ? (
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            ) : error ? (
              <div className="w-8 h-8 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center">
                <AlertCircle className="w-4 h-4" />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-full bg-sky-500/10 text-sky-400 flex items-center justify-center">
                <div className="w-4 h-4 rounded-full border-2 border-sky-400 border-t-transparent animate-spin" />
              </div>
            )}

            <div>
              <h3 className="text-sm font-semibold text-zinc-100">
                {isDone
                  ? isFullUpscale
                    ? "Upscale Complete"
                    : "3s Preview Ready"
                  : error
                  ? "Upscale Failed"
                  : isFullUpscale
                  ? "Upscaling Video"
                  : "Rendering 3s Preview"}
              </h3>
              <p className="text-[11px] text-zinc-400 font-mono mt-0.5">
                {isDone
                  ? "Ready to compare Before & After"
                  : error
                  ? error
                  : activePreset
                  ? `${activePreset.title} • ${chipName}`
                  : chipName}
              </p>
            </div>
          </div>

          {(isDone || error) && (
            <button
              onClick={isDone ? onCompareResult : onClose}
              className="p-1 rounded-md text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.06] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Progress Bar & Percent Indicator */}
        {!isDone && !error && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-zinc-400 text-[11px]">
                {progress?.stage || "Processing..."}
              </span>
              <span className="text-[#38BDF8] font-bold text-sm tabular-nums">
                {percent.toFixed(0)}%
              </span>
            </div>

            {/* Track */}
            <div className="w-full h-2 rounded-full bg-black/60 border border-white/[0.06] overflow-hidden p-0.5">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#38BDF8] to-[#3B82F6] transition-all duration-300 ease-out shadow-[0_0_12px_rgba(56,189,248,0.5)]"
                style={{ width: `${percent}%` }}
              />
            </div>

            {/* Telemetry Stats Strip */}
            <div className="grid grid-cols-3 gap-2 pt-2">
              <div className="px-2.5 py-1.5 rounded-lg bg-black/30 border border-white/[0.04]">
                <div className="text-[9px] font-mono text-zinc-500 uppercase">Frames</div>
                <div className="text-xs font-mono text-zinc-300 font-medium tabular-nums mt-0.5">
                  {progress?.current_frame || 0} / {progress?.total_frames || "--"}
                </div>
              </div>

              <div className="px-2.5 py-1.5 rounded-lg bg-black/30 border border-white/[0.04]">
                <div className="text-[9px] font-mono text-zinc-500 uppercase">Speed</div>
                <div className="text-xs font-mono text-zinc-300 font-medium tabular-nums mt-0.5">
                  {progress?.fps && progress.fps > 0 ? `${progress.fps.toFixed(1)} FPS` : "-- FPS"}
                </div>
              </div>

              <div className="px-2.5 py-1.5 rounded-lg bg-black/30 border border-white/[0.04]">
                <div className="text-[9px] font-mono text-zinc-500 uppercase">ETA</div>
                <div className="text-xs font-mono text-zinc-300 font-medium tabular-nums mt-0.5">
                  {formatEta(progress?.eta_seconds || 0)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Done State Details */}
        {isDone && completedPath && (
          <div className="space-y-3 pt-1">
            <div className="p-3 rounded-xl bg-black/40 border border-white/[0.06] space-y-1">
              <div className="text-[10px] font-mono text-zinc-500 uppercase">Saved to</div>
              <div className="text-xs font-mono text-zinc-300 truncate" title={completedPath}>
                {completedPath}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => onOpenFinder(completedPath)}
                className="py-2.5 px-3.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] text-zinc-200 hover:text-white text-xs font-medium flex items-center justify-center space-x-1.5 border border-white/[0.08] transition-all"
              >
                <FolderOpen className="w-3.5 h-3.5 text-zinc-400" />
                <span>Show in Finder</span>
              </button>

              <button
                onClick={onCompareResult}
                className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#38BDF8] to-[#3B82F6] hover:brightness-110 active:brightness-95 text-white font-semibold text-xs flex items-center justify-center space-x-2 transition-all shadow-[0_0_15px_-3px_rgba(56,189,248,0.4)]"
              >
                <Sparkles className="w-3.5 h-3.5 fill-current" />
                <span>Compare Before & After</span>
              </button>
            </div>
          </div>
        )}

        {/* Active Action / Cancel Button */}
        {!isDone && !error && (
          <div className="pt-1 flex justify-end">
            <button
              onClick={onCancel}
              className="px-4 py-1.5 rounded-lg bg-white/[0.04] hover:bg-red-500/10 hover:text-red-400 text-zinc-400 text-xs font-medium transition-colors border border-white/[0.06]"
            >
              Cancel
            </button>
          </div>
        )}

        {error && (
          <div className="pt-2 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-white/[0.08] text-zinc-200 text-xs font-medium hover:bg-white/[0.12] transition-colors"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
