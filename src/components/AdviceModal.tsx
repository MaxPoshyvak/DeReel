import React from "react";
import { Sparkles, AlertTriangle, X, Check } from "lucide-react";

export type AdviceType = "hd_video_on_lowres" | "lowres_4x_warning";

interface AdviceModalProps {
  isOpen: boolean;
  type: AdviceType | null;
  videoWidth?: number;
  videoHeight?: number;
  onConfirm: () => void;
  onDismiss: () => void;
}

export const AdviceModal: React.FC<AdviceModalProps> = ({
  isOpen,
  type,
  videoWidth,
  videoHeight,
  onConfirm,
  onDismiss,
}) => {
  if (!isOpen || !type) return null;

  const isHdAdvice = type === "hd_video_on_lowres";

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-6 z-50 select-none animate-in fade-in duration-150">
      <div className="w-full max-w-md rounded-2xl bg-[#15161b] border border-white/[0.1] p-6 shadow-2xl relative space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            {isHdAdvice ? (
              <div className="w-9 h-9 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center border border-sky-500/20 flex-shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
            ) : (
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20 flex-shrink-0">
                <AlertTriangle className="w-4 h-4" />
              </div>
            )}

            <div>
              <h3 className="text-sm font-semibold text-zinc-100">
                {isHdAdvice ? "HD Video Detected" : "4× Upscale on Low-Res Source"}
              </h3>
              <p className="text-[11px] text-zinc-400 font-mono mt-0.5">
                {isHdAdvice
                  ? `${videoWidth || 1280}×${videoHeight || 720} Resolution`
                  : "Quality Advisory"}
              </p>
            </div>
          </div>

          <button
            onClick={onDismiss}
            className="p-1 rounded-md text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.06] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="text-xs leading-relaxed text-zinc-300 bg-white/[0.02] border border-white/[0.05] rounded-xl p-3.5 space-y-2">
          {isHdAdvice ? (
            <>
              <p>
                This video already has high resolution (
                <span className="font-mono text-zinc-100">
                  {videoWidth}×{videoHeight}
                </span>
                ).
              </p>
              <p className="text-zinc-400">
                The <span className="text-sky-300 font-medium">Old Phone / Low-Res</span> preset is designed for heavily degraded 240p–480p clips with severe block compression. For clean HD content, the default{" "}
                <span className="text-zinc-200 font-medium">VHS & Home Video</span> mode provides much faster rendering and more natural texture enhancement.
              </p>
            </>
          ) : (
            <>
              <p>
                Upscaling heavily compressed low-res video (240p–360p) by{" "}
                <span className="font-semibold text-zinc-100">4×</span> multiplies the pixel canvas by 16×.
              </p>
              <p className="text-zinc-400">
                Due to the lack of fine source data, 4× may produce slight watercolor smoothing or AI-hallucinated lines. We recommend{" "}
                <span className="text-sky-300 font-medium">2× scaling</span> for the sharpest, most authentic restoration.
              </p>
            </>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end space-x-2.5 pt-1">
          <button
            onClick={onDismiss}
            className="h-9 px-3.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] active:bg-white/[0.04] text-zinc-400 hover:text-zinc-200 text-xs font-medium border border-white/[0.06] transition-all"
          >
            {isHdAdvice ? "Keep Old Phone / Low-Res" : "Proceed with 4×"}
          </button>

          <button
            onClick={onConfirm}
            className="h-9 px-4 rounded-xl bg-gradient-to-r from-[#38BDF8] to-[#3B82F6] hover:brightness-110 active:brightness-95 text-white text-xs font-semibold shadow-[0_0_16px_rgba(56,189,248,0.3)] flex items-center space-x-1.5 transition-all"
          >
            <Check className="w-3.5 h-3.5" />
            <span>
              {isHdAdvice
                ? "Switch to VHS (Recommended)"
                : "Switch to 2× (Recommended)"}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
