"use client";

import type {
  ActiveTool,
  VideoProject,
  TextOverlay,
  FontWeight,
  TextAlignment,
  TrimSettings,
} from "@/types/video";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CropEditor } from "./crop-editor";
import { MetadataEditor } from "./metadata-editor";
import { Plus, Trash2, ChevronUp, ChevronDown } from "lucide-react";
import { useState } from "react";

interface PropertiesPanelProps {
  activeTool: ActiveTool;
  project: VideoProject;
  onProjectChange: (updates: Partial<VideoProject>) => void;
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">{title}</h3>
      <div className="flex-1 h-px bg-zinc-800" />
    </div>
  );
}

function NumericField({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <Label className="text-xs text-zinc-500">{label}</Label>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-sm text-zinc-200 font-mono w-full focus:outline-none focus:border-violet-500/60 focus:ring-1 focus:ring-violet-500/20 transition-all"
        aria-label={label}
      />
    </div>
  );
}

// ────────── Trim Panel ──────────
function TrimPanel({
  trim,
  duration,
  onChange,
}: {
  trim: TrimSettings;
  duration: number;
  onChange: (t: TrimSettings) => void;
}) {
  const fmt = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

  return (
    <div className="flex flex-col gap-4">
      <SectionHeader title="Trim" />

      <div className="flex flex-col gap-2">
        <div className="flex justify-between text-xs text-zinc-500">
          <span>Start</span>
          <span className="font-mono text-zinc-300">{fmt(trim.start)}</span>
        </div>
        <Slider
          min={0}
          max={Math.max(duration - 0.1, 0)}
          step={0.1}
          value={trim.start}
          onValueChange={(v) =>
            onChange({ start: Math.min(v as number, trim.end - 0.5), end: trim.end })
          }
          className="[&_[role=slider]]:bg-violet-500 [&_[role=slider]]:border-violet-400"
          aria-label="Trim start"
        />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex justify-between text-xs text-zinc-500">
          <span>End</span>
          <span className="font-mono text-zinc-300">{fmt(trim.end)}</span>
        </div>
        <Slider
          min={0.5}
          max={duration}
          step={0.1}
          value={trim.end}
          onValueChange={(v) =>
            onChange({ start: trim.start, end: Math.max(v as number, trim.start + 0.5) })
          }
          className="[&_[role=slider]]:bg-violet-500 [&_[role=slider]]:border-violet-400"
          aria-label="Trim end"
        />
      </div>

      <div className="grid grid-cols-2 gap-2 mt-1">
        <div className="bg-zinc-900 rounded-lg p-2.5 border border-zinc-800 text-center">
          <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">Start</span>
          <span className="font-mono text-sm text-violet-300 mt-0.5 block">{fmt(trim.start)}</span>
        </div>
        <div className="bg-zinc-900 rounded-lg p-2.5 border border-zinc-800 text-center">
          <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">End</span>
          <span className="font-mono text-sm text-violet-300 mt-0.5 block">{fmt(trim.end)}</span>
        </div>
      </div>
      <div className="bg-zinc-900 rounded-lg p-2.5 border border-zinc-800 text-center">
        <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">Duration</span>
        <span className="font-mono text-sm text-zinc-200 mt-0.5 block">
          {fmt(trim.end - trim.start)}
        </span>
      </div>
    </div>
  );
}

// ────────── Zoom Panel ──────────
function ZoomPanel({
  transform,
  onChange,
}: {
  transform: VideoProject["transform"];
  onChange: (t: VideoProject["transform"]) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <SectionHeader title="Zoom & Position" />

      <div className="flex flex-col gap-2">
        <div className="flex justify-between text-xs text-zinc-500">
          <span>Scale</span>
          <span className="font-mono text-zinc-300">{transform.scale.toFixed(2)}×</span>
        </div>
        <Slider
          min={1}
          max={3}
          step={0.05}
          value={transform.scale}
          onValueChange={(v) => onChange({ ...transform, scale: v as number })}
          className="[&_[role=slider]]:bg-violet-500 [&_[role=slider]]:border-violet-400"
          aria-label="Scale"
        />
        <div className="flex justify-between text-[10px] text-zinc-600">
          <span>1×</span>
          <span>2×</span>
          <span>3×</span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex justify-between text-xs text-zinc-500">
          <span>Position X</span>
          <span className="font-mono text-zinc-300">{transform.x.toFixed(2)}</span>
        </div>
        <Slider
          min={-1}
          max={1}
          step={0.01}
          value={transform.x}
          onValueChange={(v) => onChange({ ...transform, x: v as number })}
          className="[&_[role=slider]]:bg-violet-500 [&_[role=slider]]:border-violet-400"
          aria-label="Position X"
        />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex justify-between text-xs text-zinc-500">
          <span>Position Y</span>
          <span className="font-mono text-zinc-300">{transform.y.toFixed(2)}</span>
        </div>
        <Slider
          min={-1}
          max={1}
          step={0.01}
          value={transform.y}
          onValueChange={(v) => onChange({ ...transform, y: v as number })}
          className="[&_[role=slider]]:bg-violet-500 [&_[role=slider]]:border-violet-400"
          aria-label="Position Y"
        />
      </div>

      <button
        onClick={() => onChange({ scale: 1, x: 0, y: 0 })}
        className="w-full py-2 rounded-lg text-xs text-zinc-400 border border-zinc-800 hover:border-zinc-600 hover:text-zinc-200 transition-all"
      >
        Reset Zoom
      </button>
    </div>
  );
}

// ────────── Text Overlay Panel ──────────
function TextPanel({
  textOverlays,
  onChange,
  file,
}: {
  textOverlays: TextOverlay[];
  onChange: (overlays: TextOverlay[]) => void;
  file: File | null;
}) {
  const [selected, setSelected] = useState<string | null>(
    textOverlays[0]?.id ?? null
  );
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [language, setLanguage] = useState("id");

  const addOverlay = () => {
    const id = `text-${Date.now()}`;
    const next: TextOverlay = {
      id,
      text: "Hello World",
      fontSize: 32,
      fontFamily: "Arial",
      fontWeight: "bold",
      color: "#ffffff",
      x: 50,
      y: 80,
      opacity: 100,
      alignment: "center",
    };
    onChange([...textOverlays, next]);
    setSelected(id);
  };

  const updateOverlay = (id: string, updates: Partial<TextOverlay>) => {
    onChange(textOverlays.map((o) => (o.id === id ? { ...o, ...updates } : o)));
  };

  const removeOverlay = (id: string) => {
    const next = textOverlays.filter((o) => o.id !== id);
    onChange(next);
    setSelected(next[0]?.id ?? null);
  };

  const autoSubtitle = async () => {
    if (!file) return;
    setIsTranscribing(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("language", language);
      
      const res = await fetch("/api/video/transcribe", {
        method: "POST",
        body: formData,
      });
      
      if (!res.ok) throw new Error("Failed to transcribe");
      
      const data = await res.json();
      if (data.chunks) {
        const newOverlays: TextOverlay[] = [];
        for (let i = 0; i < data.chunks.length; i += 2) {
          const chunk1 = data.chunks[i];
          const chunk2 = data.chunks[i + 1];

          const words = [chunk1.text.trim()];
          if (chunk2) words.push(chunk2.text.trim());

          const start = chunk1.timestamp[0];
          let end = chunk1.timestamp[1] || start + 1;
          if (chunk2) {
            end = chunk2.timestamp[1] || chunk2.timestamp[0] + 1;
          }
          
          const pairText = words
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
            .join(" ");
            
          newOverlays.push({
            id: `auto-${Date.now()}-${i}`,
            text: pairText,
            fontSize: 24,
            fontFamily: "Arial",
            fontWeight: "bold",
            color: "#fbbf24", // Yellow
            x: 50,
            y: 75,
            opacity: 100,
            alignment: "center",
            startTime: start,
            endTime: end,
          });
        }
        onChange([...textOverlays, ...newOverlays]);
      }
    } catch (error) {
      console.error(error);
      alert("Auto subtitle failed. Check console for details.");
    } finally {
      setIsTranscribing(false);
    }
  };

  const active = textOverlays.find((o) => o.id === selected);

  return (
    <div className="flex flex-col gap-4">
      <SectionHeader title="Text Overlays" />

      {/* Layer list */}
      <div className="flex flex-col gap-1.5 max-h-28 overflow-y-auto">
        {textOverlays.map((o) => (
          <div
            key={o.id}
            onClick={() => setSelected(o.id)}
            className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-all ${
              selected === o.id
                ? "bg-violet-600/20 border border-violet-500/30"
                : "bg-zinc-900 border border-zinc-800 hover:border-zinc-700"
            }`}
          >
            <span className="flex-1 text-xs text-zinc-300 truncate">{o.text || "(empty)"}</span>
            <button
              onClick={(e) => { e.stopPropagation(); removeOverlay(o.id); }}
              className="text-zinc-600 hover:text-red-400 transition-colors p-0.5"
              aria-label="Remove text overlay"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <button
          onClick={addOverlay}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs text-violet-400 border border-violet-500/30 hover:bg-violet-500/10 transition-all"
        >
          <Plus className="w-3 h-3" />
          Add Text Layer
        </button>

        {file && (
          <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-lg flex flex-col gap-2">
            <Label className="text-xs text-zinc-400">AI Auto Subtitle</Label>
            <div className="flex gap-2">
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger className="flex-1 h-8 text-xs bg-zinc-950 border-zinc-800">
                  <SelectValue placeholder="Language" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  <SelectItem value="id">Indonesian</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                </SelectContent>
              </Select>
              
              <button
                onClick={autoSubtitle}
                disabled={isTranscribing || !file}
                className="flex-1 flex items-center justify-center gap-2 px-2 py-0 rounded-lg text-xs text-blue-400 border border-blue-500/30 hover:bg-blue-500/10 transition-all disabled:opacity-50"
              >
                {isTranscribing ? "Wait..." : "Auto Subtitle"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Editor for selected layer */}
      {active && (
        <div className="flex flex-col gap-3 pt-2 border-t border-zinc-800">
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-zinc-500">Text Content</Label>
            <textarea
              value={active.text}
              onChange={(e) => updateOverlay(active.id, { text: e.target.value })}
              rows={2}
              className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-sm text-zinc-200 w-full resize-none focus:outline-none focus:border-violet-500/60 focus:ring-1 focus:ring-violet-500/20 transition-all"
              placeholder="Enter text..."
              aria-label="Text content"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <NumericField
              label="Font Size"
              value={active.fontSize}
              min={8}
              max={200}
              step={1}
              onChange={(v) => updateOverlay(active.id, { fontSize: v })}
            />

            <div className="flex flex-col gap-1">
              <Label className="text-xs text-zinc-500">Font</Label>
              <Select
                value={active.fontFamily || "Arial"}
                onValueChange={(v) => updateOverlay(active.id, { fontFamily: v })}
              >
                <SelectTrigger className="h-8 text-xs bg-zinc-900 border-zinc-800">
                  <SelectValue placeholder="Select font" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  <SelectItem value="Arial" className="font-[Arial]">Arial</SelectItem>
                  <SelectItem value="Impact" className="font-[Impact]">Impact</SelectItem>
                  <SelectItem value="Times New Roman" className="font-serif">Times New Roman</SelectItem>
                  <SelectItem value="Courier New" className="font-mono">Courier New</SelectItem>
                  <SelectItem value="Verdana" className="font-[Verdana]">Verdana</SelectItem>
                  <SelectItem value="Trebuchet MS" className="font-[Trebuchet MS]">Trebuchet</SelectItem>
                  <SelectItem value="Comic Sans MS" className="font-[Comic Sans MS]">Comic Sans</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1">
              <Label className="text-xs text-zinc-500">Weight</Label>
              <div className="flex gap-1">
                {(["normal", "bold"] as FontWeight[]).map((w) => (
                  <button
                    key={w}
                    onClick={() => updateOverlay(active.id, { fontWeight: w })}
                    className={`flex-1 py-1.5 rounded-lg text-xs transition-all ${
                      active.fontWeight === w
                        ? "bg-violet-600 text-white"
                        : "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    {w === "bold" ? <strong>B</strong> : "N"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <NumericField
              label="Position X (%)"
              value={active.x}
              min={0}
              max={100}
              step={1}
              onChange={(v) => updateOverlay(active.id, { x: v })}
            />
            <NumericField
              label="Position Y (%)"
              value={active.y}
              min={0}
              max={100}
              step={1}
              onChange={(v) => updateOverlay(active.id, { y: v })}
            />
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex justify-between text-xs text-zinc-500">
              <span>Opacity</span>
              <span className="font-mono text-zinc-300">{active.opacity}%</span>
            </div>
            <Slider
              min={0}
              max={100}
              step={1}
              value={active.opacity}
              onValueChange={(v) => updateOverlay(active.id, { opacity: v as number })}
              className="[&_[role=slider]]:bg-violet-500 [&_[role=slider]]:border-violet-400"
              aria-label="Text opacity"
            />
          </div>

          <div className="flex flex-col gap-1">
            <Label className="text-xs text-zinc-500">Color</Label>
            <div className="flex gap-2 items-center">
              <input
                type="color"
                value={active.color}
                onChange={(e) => updateOverlay(active.id, { color: e.target.value })}
                className="w-9 h-9 rounded-lg border border-zinc-800 cursor-pointer bg-transparent"
                aria-label="Text color"
              />
              <input
                type="text"
                value={active.color}
                onChange={(e) => updateOverlay(active.id, { color: e.target.value })}
                className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-sm font-mono text-zinc-200 focus:outline-none focus:border-violet-500/60"
                aria-label="Text color hex"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <Label className="text-xs text-zinc-500">Alignment</Label>
            <div className="flex gap-1">
              {(["left", "center", "right"] as TextAlignment[]).map((a) => (
                <button
                  key={a}
                  onClick={() => updateOverlay(active.id, { alignment: a })}
                  className={`flex-1 py-1.5 rounded-lg text-xs transition-all ${
                    active.alignment === a
                      ? "bg-violet-600 text-white"
                      : "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  {a[0].toUpperCase() + a.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div className="pt-2 border-t border-white/5">
            <button
              onClick={() => {
                const next = textOverlays.map(o => ({
                  ...o,
                  fontSize: active.fontSize,
                  fontFamily: active.fontFamily || "Arial",
                  fontWeight: active.fontWeight,
                  color: active.color,
                  alignment: active.alignment,
                  y: active.y
                }));
                onChange(next);
              }}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs text-orange-400 border border-orange-500/30 hover:bg-orange-500/10 transition-all"
            >
              Apply Style to All Layers
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ────────── Speed Panel ──────────
function SpeedPanel({
  speed,
  onChange,
}: {
  speed: number;
  onChange: (speed: number) => void;
}) {
  return (
    <div className="space-y-4">
      <SectionHeader title="Playback Speed" />
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-zinc-400">
          <Label>Speed</Label>
          <span className="font-mono text-violet-400">{speed.toFixed(2)}x</span>
        </div>
        <Slider
          value={[speed]}
          min={0.25}
          max={4}
          step={0.05}
          onValueChange={(v) => onChange(Array.isArray(v) ? v[0] : (v as unknown as number))}
          className="py-1"
        />
        <div className="flex gap-2">
          {[0.5, 1, 1.5, 2].map((v) => (
            <button
              key={v}
              onClick={() => onChange(v)}
              className={`flex-1 py-1 text-[10px] rounded border transition-colors ${
                speed === v
                  ? "bg-violet-600/20 border-violet-500/50 text-violet-300"
                  : "border-zinc-700/50 text-zinc-500 hover:bg-zinc-800/50"
              }`}
            >
              {v}x
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ────────── Main Properties Panel ──────────
export function PropertiesPanel({
  activeTool,
  project,
  onProjectChange,
}: PropertiesPanelProps) {
  const videoAR =
    project.metadata
      ? project.metadata.width / project.metadata.height
      : 16 / 9;

  return (
    <aside className="w-64 shrink-0 bg-[#151518] border-l border-zinc-800/60 overflow-y-auto">
      <div className="p-3 border-b border-zinc-800/60">
        <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Properties</h2>
      </div>

      <div className="p-3">
        {activeTool === "trim" && (
          <TrimPanel
            trim={project.trim}
            duration={project.metadata?.duration ?? 0}
            onChange={(trim) => onProjectChange({ trim })}
          />
        )}

        {activeTool === "crop" && (
          <>
            <SectionHeader title="Crop" />
            <CropEditor
              crop={project.crop}
              aspectRatio={project.aspectRatio}
              videoAspectRatio={videoAR}
              onCropChange={(crop) => onProjectChange({ crop })}
              onAspectRatioChange={(aspectRatio) => onProjectChange({ aspectRatio })}
            />
          </>
        )}

        {activeTool === "zoom" && (
          <ZoomPanel
            transform={project.transform}
            onChange={(transform) => onProjectChange({ transform })}
          />
        )}

        {activeTool === "text" && (
          <TextPanel
            textOverlays={project.textOverlays}
            onChange={(textOverlays) => onProjectChange({ textOverlays })}
            file={project.sourceFile || null}
          />
        )}

        {activeTool === "speed" && (
          <SpeedPanel
            speed={project.speed || 1}
            onChange={(speed) => onProjectChange({ speed })}
          />
        )}

        {activeTool === "metadata" && (
          <MetadataEditor project={project} onProjectChange={onProjectChange} />
        )}
      </div>
    </aside>
  );
}
