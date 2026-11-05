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
  size: number;
  duration: number; // in seconds
  fps: number;
  width: number;
  height: number;
  codec: string;
}
