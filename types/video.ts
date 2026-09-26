// Core video editor types

export type AspectRatioPreset =
  | "original"
  | "16:9"
  | "9:16"
  | "4:3"
  | "1:1"
  | "custom";

export type ActiveTool = "crop" | "zoom" | "trim" | "text" | "metadata" | "speed";

export interface CropSettings {
  /** Normalized 0-1 */
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TransformSettings {
  scale: number; // 1.0 - 3.0
  x: number;     // -1.0 - 1.0
  y: number;     // -1.0 - 1.0
}

export interface TrimSettings {
  start: number; // seconds
  end: number;   // seconds
}

export interface AspectRatioSettings {
  width: number;
  height: number;
  preset: AspectRatioPreset;
}

export type TextAlignment = "left" | "center" | "right";
export type FontWeight = "normal" | "bold";

export interface TextOverlay {
  id: string;
  text: string;
  fontSize: number;
  fontFamily: string;
  fontWeight: FontWeight;
  color: string;
  x: number;       // 0-100 percentage
  y: number;       // 0-100 percentage
  opacity: number; // 0-100
  alignment: TextAlignment;
  startTime?: number; // seconds (for subtitles)
  endTime?: number; // seconds
}

export interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
  fps: number;
  codec: string;
  size: number;
}

export interface VideoProject {
  sourceFile: File | null;
  sourceUrl: string | null;
  metadata: VideoMetadata | null;
  trim: TrimSettings;
  crop: CropSettings;
  transform: TransformSettings;
  aspectRatio: AspectRatioSettings;
  textOverlays: TextOverlay[];
  speed: number;
}


export type ExportStatus = "idle" | "processing" | "done" | "error";

export interface ExportState {
  status: ExportStatus;
  progress: number;
  error: string | null;
  outputUrl: string | null;
}

export interface ExportRequest {
  trim: TrimSettings;
  crop: CropSettings;
  transform: TransformSettings;
  aspectRatio: { width: number; height: number };
  textOverlays: TextOverlay[];
  speed: number;
  metadata?: VideoMetadata;
}
