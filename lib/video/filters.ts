import type {
  CropSettings,
  TransformSettings,
  TrimSettings,
  TextOverlay,
  VideoMetadata,
} from "@/types/video";

/**
 * Build an FFmpeg filter graph from editing settings.
 */
export interface FilterOptions {
  trim: TrimSettings;
  crop: CropSettings;
  transform: TransformSettings;
  aspectRatio: { width: number; height: number };
  textOverlays: TextOverlay[];
  metadata: VideoMetadata;
  speed: number;
}

/**
 * Convert normalized crop coords to pixel coords.
 */
export function normCropToPixels(
  crop: CropSettings,
  videoWidth: number,
  videoHeight: number
): { x: number; y: number; w: number; h: number } {
  return {
    x: Math.round(crop.x * videoWidth),
    y: Math.round(crop.y * videoHeight),
    w: Math.round(crop.width * videoWidth),
    h: Math.round(crop.height * videoHeight),
  };
}

/**
 * Ensure dimensions are even (required by libx264).
 */
function evenDim(n: number): number {
  return n % 2 === 0 ? n : n - 1;
}

/**
 * Build FFmpeg video filter chain string.
 */
export function buildVideoFilter(opts: FilterOptions): string {
  const { crop, transform, aspectRatio, textOverlays, metadata } = opts;
  const filters: string[] = [];

  // 1. Crop
  const px = normCropToPixels(crop, metadata.width, metadata.height);
  if (
    crop.x > 0 ||
    crop.y > 0 ||
    crop.width < 1 ||
    crop.height < 1
  ) {
    filters.push(`crop=${px.w}:${px.h}:${px.x}:${px.y}`);
  }

  // 2. Scale/Zoom: calculate target output resolution
  const targetAR = aspectRatio.width / aspectRatio.height;
  const currentW = crop.width < 1 ? px.w : metadata.width;
  const currentH = crop.height < 1 ? px.h : metadata.height;

  // Scale while preserving aspect ratio, then pad/crop to target
  const scaleFactor = transform.scale;
  const scaledW = Math.round(currentW * scaleFactor);
  const scaledH = Math.round(currentH * scaleFactor);

  if (scaleFactor !== 1.0 || transform.x !== 0 || transform.y !== 0) {
    filters.push(`scale=${scaledW}:${scaledH}`);
    // Pan offset
    const panX = Math.round((transform.x * scaledW) / 2);
    const panY = Math.round((transform.y * scaledH) / 2);
    const cropW = evenDim(Math.min(currentW, scaledW));
    const cropH = evenDim(Math.min(currentH, scaledH));
    const cx = Math.max(0, Math.round((scaledW - cropW) / 2) - panX);
    const cy = Math.max(0, Math.round((scaledH - cropH) / 2) - panY);
    filters.push(`crop=${cropW}:${cropH}:${cx}:${cy}`);
  }

  // 3. Scale to final output size for aspect ratio using zoom-to-fill (crop)
  const finalH = 720;
  const finalW = evenDim(Math.round(finalH * targetAR));
  // Scale increasing to cover the target box, then crop the overflow
  filters.push(`scale=${finalW}:${finalH}:force_original_aspect_ratio=increase`);
  filters.push(`crop=${finalW}:${finalH}`);
  filters.push(`setsar=1`);

  // 4. Text overlays (drawtext)
  for (const overlay of textOverlays) {
    if (!overlay.text.trim()) continue;
    const xPx = `(w*${overlay.x / 100})`;
    const yPx = `(h*${overlay.y / 100})`;
    const alpha = (overlay.opacity / 100).toFixed(2);
    const weight = overlay.fontWeight === "bold" ? ":Bold" : "";
    const escapedText = overlay.text
      .replace(/\\/g, "\\\\")
      .replace(/'/g, "\\'")
      .replace(/:/g, "\\:");
    const fontName = (overlay.fontFamily || "Arial").replace(/ /g, "\\ ");
    let drawtext = `drawtext=text='${escapedText}':fontsize=${overlay.fontSize}:fontcolor=${overlay.color}@${alpha}:x=${xPx}:y=${yPx}:font=${fontName}${weight}`;
    if (overlay.startTime !== undefined && overlay.endTime !== undefined) {
      drawtext += `:enable='between(t,${overlay.startTime},${overlay.endTime})'`;
    }
    filters.push(drawtext);
  }

  // 5. Speed (Video)
  if (opts.speed && opts.speed !== 1) {
    filters.push(`setpts=${1 / opts.speed}*PTS`);
  }

  return filters.join(",");
}
