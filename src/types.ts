export type PresetId = "vhs" | "lowres" | "fps60" | "anime";

export interface Preset {
  id: PresetId;
  icon: string;
  title: string;
  subtitle: string;
  description: string;
  badge?: string;
  models: string[];
}

export interface VideoFile {
  name: string;
  path: string;
  size: number;
  duration?: number;
  resolution?: string;
}
