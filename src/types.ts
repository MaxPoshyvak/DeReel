export type PresetId = "vhs" | "lowres" | "fps60" | "anime";

export interface Preset {
  id: PresetId;
  title: string;
  subtitle: string;
  badge: string;
  models: string[];
}

export interface PresetSettings {
  targetResolution: "1080p" | "4k";
  faceRestore: boolean;
  deinterlace: boolean;
}

export interface VideoMetadata {
  name: string;
  path: string;
  srcUrl: string;
  size: number;
  duration: number; // in seconds
  fps: number;
  width: number;
  height: number;
  codec: string;
}

export interface PreviewMedia {
  originalUrl: string;
  enhancedUrl: string;
  outputWidth: number;
  outputHeight: number;
}

export interface RenderProgressPayload {
  stage: string;
  percent: number;
  current_frame: number;
  total_frames: number;
  fps: number;
  eta_seconds: number;
}
