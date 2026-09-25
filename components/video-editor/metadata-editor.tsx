"use client";

import { Info } from "lucide-react";
import type { VideoProject } from "@/types/video";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface MetadataEditorProps {
  project: VideoProject;
  onProjectChange: (updates: Partial<VideoProject>) => void;
}

export function MetadataEditor({
  project,
  onProjectChange,
}: MetadataEditorProps) {
  const meta = project.metadata;
  console.log("project.metadata", project.metadata);

  if (!meta) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-zinc-500">
        <Info className="w-8 h-8 mb-2 opacity-50" />
        <p className="text-sm">Metadata not loaded yet.</p>
      </div>
    );
  }

  const updateMeta = (key: keyof typeof meta, value: any) => {
    onProjectChange({
      metadata: {
        ...meta,
        [key]: value,
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h3 className="text-sm font-medium text-white flex items-center gap-2">
          <Info className="w-4 h-4 text-violet-400" />
          Export Metadata
        </h3>
        <p className="text-[11px] text-zinc-400">
          Edit the video encoding properties for export.
        </p>
      </div>

      <div className="space-y-4">
        {/* Dimensions (Read-only for original, but useful to see) */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-400">Original Width</Label>
            <Input
              type="number"
              value={meta.width}
              className="h-8 bg-zinc-900 border-zinc-800"
              disabled
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-400">Original Height</Label>
            <Input
              type="number"
              value={meta.height}
              className="h-8 bg-zinc-900 border-zinc-800"
              disabled
            />
          </div>
        </div>

        {/* FPS */}
        <div className="space-y-1.5">
          <Label className="text-xs text-zinc-400">Framerate (FPS)</Label>
          <Input
            type="number"
            min={1}
            max={120}
            value={meta.fps}
            onChange={(e) => updateMeta("fps", parseInt(e.target.value) || 30)}
            className="h-8 bg-zinc-900 border-zinc-800 focus:border-violet-500"
          />
        </div>

        {/* Codec */}
        <div className="space-y-1.5">
          <Label className="text-xs text-zinc-400">Video Codec</Label>
          <Select
            value={meta.codec}
            onValueChange={(val) => updateMeta("codec", val)}
          >
            <SelectTrigger className="h-8 bg-zinc-900 border-zinc-800 focus:ring-violet-500">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-zinc-800 border-zinc-700 text-zinc-200">
              <SelectItem value="h264">H.264 (High Compatibility)</SelectItem>
              <SelectItem value="hevc">
                H.265 / HEVC (High Efficiency)
              </SelectItem>
              <SelectItem value="vp9">VP9 (Web Optimized)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
