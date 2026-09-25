"use client";

import { useCallback, useRef, useState, useEffect } from "react";
import type { CropSettings, AspectRatioSettings, AspectRatioPreset } from "@/types/video";

const AR_PRESETS: Array<{ label: string; preset: AspectRatioPreset; ratio?: [number, number] }> = [
  { label: "Original", preset: "original" },
  { label: "16:9", preset: "16:9", ratio: [16, 9] },
  { label: "9:16", preset: "9:16", ratio: [9, 16] },
  { label: "4:3", preset: "4:3", ratio: [4, 3] },
  { label: "1:1", preset: "1:1", ratio: [1, 1] },
];

interface CropEditorProps {
  crop: CropSettings;
  aspectRatio: AspectRatioSettings;
  videoAspectRatio: number; // original video w/h
  onCropChange: (crop: CropSettings) => void;
  onAspectRatioChange: (ar: AspectRatioSettings) => void;
}

type Handle = "tl" | "tr" | "bl" | "br" | "move" | null;

export function CropEditor({
  crop,
  aspectRatio,
  videoAspectRatio,
  onCropChange,
  onAspectRatioChange,
}: CropEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    handle: Handle;
    startX: number;
    startY: number;
    startCrop: CropSettings;
  } | null>(null);
  const [localCrop, setLocalCrop] = useState(crop);

  useEffect(() => setLocalCrop(crop), [crop]);

  const getRelPos = (clientX: number, clientY: number) => {
    const el = containerRef.current;
    if (!el) return { px: 0, py: 0 };
    const rect = el.getBoundingClientRect();
    return {
      px: (clientX - rect.left) / rect.width,
      py: (clientY - rect.top) / rect.height,
    };
  };

  const startDrag = useCallback(
    (handle: Handle) => (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const { px, py } = getRelPos(e.clientX, e.clientY);
      dragRef.current = {
        handle,
        startX: px,
        startY: py,
        startCrop: { ...localCrop },
      };

      const onMove = (ev: MouseEvent) => {
        if (!dragRef.current) return;
        const { px: npx, py: npy } = getRelPos(ev.clientX, ev.clientY);
        const dx = npx - dragRef.current.startX;
        const dy = npy - dragRef.current.startY;
        const sc = dragRef.current.startCrop;
        let nx = sc.x, ny = sc.y, nw = sc.width, nh = sc.height;

        const MIN = 0.05;

        if (dragRef.current.handle === "move") {
          nx = Math.max(0, Math.min(1 - nw, sc.x + dx));
          ny = Math.max(0, Math.min(1 - nh, sc.y + dy));
        } else if (dragRef.current.handle === "tl") {
          nx = Math.max(0, Math.min(sc.x + sc.width - MIN, sc.x + dx));
          ny = Math.max(0, Math.min(sc.y + sc.height - MIN, sc.y + dy));
          nw = sc.width - (nx - sc.x);
          nh = sc.height - (ny - sc.y);
        } else if (dragRef.current.handle === "tr") {
          ny = Math.max(0, Math.min(sc.y + sc.height - MIN, sc.y + dy));
          nw = Math.max(MIN, Math.min(1 - sc.x, sc.width + dx));
          nh = sc.height - (ny - sc.y);
        } else if (dragRef.current.handle === "bl") {
          nx = Math.max(0, Math.min(sc.x + sc.width - MIN, sc.x + dx));
          nw = sc.width - (nx - sc.x);
          nh = Math.max(MIN, Math.min(1 - sc.y, sc.height + dy));
        } else if (dragRef.current.handle === "br") {
          nw = Math.max(MIN, Math.min(1 - sc.x, sc.width + dx));
          nh = Math.max(MIN, Math.min(1 - sc.y, sc.height + dy));
        }

        // Clamp
        nx = Math.max(0, Math.min(1 - nw, nx));
        ny = Math.max(0, Math.min(1 - nh, ny));
        nw = Math.max(MIN, Math.min(1 - nx, nw));
        nh = Math.max(MIN, Math.min(1 - ny, nh));

        const next = { x: nx, y: ny, width: nw, height: nh };
        setLocalCrop(next);
        onCropChange(next);
      };

      const onUp = () => {
        dragRef.current = null;
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [localCrop, onCropChange]
  );

  const applyPreset = (preset: AspectRatioPreset) => {
    const found = AR_PRESETS.find((p) => p.preset === preset);
    if (!found) return;

    let arW = aspectRatio.width;
    let arH = aspectRatio.height;
    if (found.ratio) {
      [arW, arH] = found.ratio;
    } else {
      // original
      arW = Math.round(videoAspectRatio * 100);
      arH = 100;
    }

    onAspectRatioChange({ width: arW, height: arH, preset });

    // Reset crop to match aspect ratio
    const targetAR = arW / arH;
    const videoContainerAR = videoAspectRatio;
    let cw = 1, ch = 1, cx = 0, cy = 0;
    if (targetAR > videoContainerAR) {
      ch = videoContainerAR / targetAR;
      cy = (1 - ch) / 2;
    } else if (targetAR < videoContainerAR) {
      cw = targetAR / videoContainerAR;
      cx = (1 - cw) / 2;
    }
    const next = { x: cx, y: cy, width: cw, height: ch };
    setLocalCrop(next);
    onCropChange(next);
  };

  const resetCrop = () => {
    const next = { x: 0, y: 0, width: 1, height: 1 };
    setLocalCrop(next);
    onCropChange(next);
  };

  const lc = localCrop;
  const pctLeft = lc.x * 100;
  const pctTop = lc.y * 100;
  const pctRight = (1 - lc.x - lc.width) * 100;
  const pctBottom = (1 - lc.y - lc.height) * 100;

  return (
    <div className="flex flex-col gap-4">
      {/* Aspect ratio presets */}
      <div>
        <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
          Aspect Ratio
        </label>
        <div className="grid grid-cols-3 gap-1.5">
          {AR_PRESETS.map((p) => (
            <button
              key={p.preset}
              id={`ar-preset-${p.preset}`}
              onClick={() => applyPreset(p.preset)}
              className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${
                aspectRatio.preset === p.preset
                  ? "bg-violet-600 text-white"
                  : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Visual crop area */}
      <div>
        <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
          Crop Area
        </label>
        <div
          ref={containerRef}
          className="relative rounded-lg overflow-hidden bg-zinc-900 border border-zinc-700 select-none"
          style={{ aspectRatio: `${videoAspectRatio}` }}
        >
          {/* Dark overlay for outside crop */}
          <div className="absolute inset-0 bg-black/60 pointer-events-none" />
          <div
            className="absolute bg-transparent"
            style={{
              left: `${pctLeft}%`,
              top: `${pctTop}%`,
              right: `${pctRight}%`,
              bottom: `${pctBottom}%`,
              boxShadow: "0 0 0 9999px rgba(0,0,0,0.55)",
            }}
            onMouseDown={startDrag("move")}
          >
            {/* Grid lines */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute border border-white/20 inset-0" />
              <div className="absolute left-1/3 top-0 bottom-0 w-px bg-white/15" />
              <div className="absolute left-2/3 top-0 bottom-0 w-px bg-white/15" />
              <div className="absolute top-1/3 left-0 right-0 h-px bg-white/15" />
              <div className="absolute top-2/3 left-0 right-0 h-px bg-white/15" />
            </div>
            {/* Corner handles */}
            {(["tl", "tr", "bl", "br"] as Handle[]).map((h) => (
              <div
                key={h!}
                onMouseDown={startDrag(h)}
                className={`absolute w-5 h-5 border-2 border-white bg-white/10 cursor-nw-resize z-10 ${
                  h === "tl" ? "top-0 left-0 cursor-nw-resize" :
                  h === "tr" ? "top-0 right-0 cursor-ne-resize" :
                  h === "bl" ? "bottom-0 left-0 cursor-sw-resize" :
                  "bottom-0 right-0 cursor-se-resize"
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Numeric values */}
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: "X", value: lc.x },
          { label: "Y", value: lc.y },
          { label: "Width", value: lc.width },
          { label: "Height", value: lc.height },
        ].map(({ label, value }) => (
          <div key={label} className="bg-zinc-900 rounded-lg p-2 border border-zinc-800">
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider">{label}</span>
            <p className="text-sm font-mono text-zinc-200 mt-0.5">{value.toFixed(3)}</p>
          </div>
        ))}
      </div>

      <button
        onClick={resetCrop}
        className="w-full py-2 rounded-lg text-xs text-zinc-400 border border-zinc-800 hover:border-zinc-600 hover:text-zinc-200 transition-all"
      >
        Reset Crop
      </button>
    </div>
  );
}
