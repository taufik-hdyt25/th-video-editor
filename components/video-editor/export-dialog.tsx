"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import type { ExportState, VideoProject } from "@/types/video";
import {
  Download,
  CheckCircle2,
  XCircle,
  Loader2,
  Film,
} from "lucide-react";

interface ExportDialogProps {
  open: boolean;
  exportState: ExportState;
  project: VideoProject;
  onClose: () => void;
  onStartExport: () => void;
  onDownload: () => void;
}

export function ExportDialog({
  open,
  exportState,
  project,
  onClose,
  onStartExport,
  onDownload,
}: ExportDialogProps) {
  const { status, progress, error, outputUrl } = exportState;
  const duration = project.trim.end - project.trim.start;
  const fmt = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && status !== "processing" && onClose()}>
      <DialogContent className="bg-[#1a1a1f] border-zinc-800 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Film className="w-5 h-5 text-violet-400" />
            Export Video
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            Your video will be exported as MP4 with H.264 encoding.
          </DialogDescription>
        </DialogHeader>

        {status === "idle" && (
          <div className="flex flex-col gap-4">
            {/* Summary */}
            <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 space-y-2">
              <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
                Export Summary
              </h4>
              {[
                ["Duration", `${fmt(project.trim.start)} → ${fmt(project.trim.end)} (${fmt(duration)})`],
                ["Aspect Ratio", `${project.aspectRatio.width}:${project.aspectRatio.height}`],
                ["Scale", `${project.transform.scale.toFixed(2)}×`],
                ["Text Overlays", `${project.textOverlays.length} layer(s)`],
                ["Output Format", "MP4 · H.264 · AAC"],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between text-sm">
                  <span className="text-zinc-500">{k}</span>
                  <span className="text-zinc-200 font-medium">{v}</span>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={onClose}
                className="flex-1 bg-zinc-900 border-zinc-700 text-zinc-300 hover:bg-zinc-800"
              >
                Cancel
              </Button>
              <Button
                onClick={onStartExport}
                className="flex-1 bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-500/20"
              >
                <Film className="w-4 h-4 mr-2" />
                Start Export
              </Button>
            </div>
          </div>
        )}

        {status === "processing" && (
          <div className="flex flex-col gap-4 py-4">
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-violet-500/10 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
              </div>
              <div className="text-center">
                <p className="text-base font-semibold text-white">Exporting video…</p>
                <p className="text-sm text-zinc-500 mt-1">This may take a moment</p>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-400">Processing</span>
                <span className="text-violet-300 font-mono font-semibold">{progress}%</span>
              </div>
              <Progress
                value={progress}
                className="h-2 bg-zinc-800 [&>div]:bg-violet-500 [&>div]:transition-all"
              />
            </div>

            <p className="text-xs text-zinc-600 text-center">
              Please wait — do not close this window
            </p>
          </div>
        )}

        {status === "done" && outputUrl && (
          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col items-center gap-3">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
              </div>
              <div className="text-center">
                <p className="text-base font-semibold text-white">Export Complete!</p>
                <p className="text-sm text-zinc-500 mt-1">Your video is ready to download</p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={onClose}
                className="flex-1 bg-zinc-900 border-zinc-700 text-zinc-300 hover:bg-zinc-800"
              >
                Close
              </Button>
              <Button
                onClick={onDownload}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white"
              >
                <Download className="w-4 h-4 mr-2" />
                Download MP4
              </Button>
            </div>
          </div>
        )}

        {status === "error" && (
          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col items-center gap-3">
              <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center">
                <XCircle className="w-8 h-8 text-red-400" />
              </div>
              <div className="text-center">
                <p className="text-base font-semibold text-white">Export Failed</p>
                <p className="text-sm text-zinc-500 mt-1 max-w-xs">
                  {error ?? "Unable to process this video. Please try another MP4 or MOV file."}
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={onClose}
                className="flex-1 bg-zinc-900 border-zinc-700 text-zinc-300 hover:bg-zinc-800"
              >
                Cancel
              </Button>
              <Button
                onClick={onStartExport}
                className="flex-1 bg-violet-600 hover:bg-violet-500 text-white"
              >
                Retry
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
