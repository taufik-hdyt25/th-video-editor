"use client";

import { useCallback, useRef, useState, useEffect } from "react";
import type { VideoProject, ActiveTool, ExportState } from "@/types/video";
import { VideoPreview, VideoPreviewHandle } from "./video-preview";
import { Timeline } from "./timeline";
import { ToolSidebar } from "./tool-sidebar";
import { PropertiesPanel } from "./properties-panel";
import { ExportDialog } from "./export-dialog";
import { Button } from "@/components/ui/button";
import { Film, Download, PlusCircle, Loader2, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const DEFAULT_PROJECT = (duration: number): Omit<VideoProject, "sourceFile" | "sourceUrl" | "metadata"> => ({
  trim: { start: 0, end: duration },
  crop: { x: 0, y: 0, width: 1, height: 1 },
  transform: { scale: 1.3, x: 0, y: 0 },
  aspectRatio: { width: 16, height: 9, preset: "original" },
  textOverlays: [],
  speed: 1,
});

interface VideoEditorProps {
  file: File;
  sourceUrl: string;
  onNewProject: () => void;
}

export function VideoEditor({ file, sourceUrl, onNewProject }: VideoEditorProps) {
  const videoRef = useRef<VideoPreviewHandle>(null);

  const [project, setProject] = useState<VideoProject>({
    sourceFile: file,
    sourceUrl,
    metadata: null,
    ...DEFAULT_PROJECT(0),
  });
  const [activeTool, setActiveTool] = useState<ActiveTool>("trim");
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [exportState, setExportState] = useState<ExportState>({
    status: "idle",
    progress: 0,
    error: null,
    outputUrl: null,
  });

  const updateProject = useCallback((updates: Partial<VideoProject>) => {
    setProject((prev) => ({ ...prev, ...updates }));
  }, []);

  const handleLoadedMetadata = useCallback((dur: number, width: number, height: number) => {
    setDuration(dur);
    setProject((prev) => {
      // Force update metadata if it's null, or if it was initialized incorrectly
      const newMeta = prev.metadata?.width ? prev.metadata : {
        duration: dur,
        width,
        height,
        fps: 30,
        codec: "h264",
        size: file.size,
      };
      
      return {
        ...prev,
        trim: { start: prev.trim.start === 0 && prev.trim.end === 0 ? 0 : prev.trim.start, end: prev.trim.end === 0 ? dur : prev.trim.end },
        metadata: newMeta,
      };
    });
  }, [file]);

  const handlePlayPause = useCallback(() => {
    const el = videoRef.current;
    if (!el) return;
    if (isPlaying) {
      el.pause();
    } else {
      el.play();
    }
  }, [isPlaying]);

  const handleSeek = useCallback((time: number) => {
    videoRef.current?.seek(time);
    setCurrentTime(time);
  }, []);

  // Export
  const startExport = useCallback(async () => {
    if (!project.sourceFile) return;
    setExportState({ status: "processing", progress: 0, error: null, outputUrl: null });

    // Simulate initial progress (server-sent events not available here, so we simulate)
    let simulatedProgress = 0;
    const interval = setInterval(() => {
      simulatedProgress = Math.min(simulatedProgress + Math.random() * 8, 90);
      setExportState((s) => ({ ...s, progress: Math.round(simulatedProgress) }));
    }, 800);

    try {
      const formData = new FormData();
      formData.append("file", project.sourceFile);
      formData.append(
        "config",
        JSON.stringify({
          trim: project.trim,
          crop: project.crop,
          transform: project.transform,
          aspectRatio: {
            width: project.aspectRatio.width,
            height: project.aspectRatio.height,
          },
          speed: project.speed,
          textOverlays: project.textOverlays,
          metadata: project.metadata,
        })
      );

      const res = await fetch("/api/video/export", {
        method: "POST",
        body: formData,
      });

      clearInterval(interval);

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(body.error || "Export failed");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setExportState({ status: "done", progress: 100, error: null, outputUrl: url });
    } catch (err) {
      clearInterval(interval);
      const msg = err instanceof Error ? err.message : "Export failed";
      setExportState({ status: "error", progress: 0, error: msg, outputUrl: null });
    }
  }, [project]);

  const handleDownload = useCallback(() => {
    if (!exportState.outputUrl) return;
    const a = document.createElement("a");
    a.href = exportState.outputUrl;
    a.download = "edited_video.mp4";
    a.click();
  }, [exportState.outputUrl]);

  const closeExport = useCallback(() => {
    if (exportState.status === "processing") return;
    setShowExport(false);
    if (exportState.outputUrl) {
      URL.revokeObjectURL(exportState.outputUrl);
    }
    setExportState({ status: "idle", progress: 0, error: null, outputUrl: null });
  }, [exportState]);

  return (
    <div className="flex flex-col h-screen bg-[#0f0f11] text-white overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-4 h-12 bg-[#151518] border-b border-zinc-800/60 shrink-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-md shadow-violet-500/20">
            <Film className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-sm font-bold text-white tracking-tight">Video Editor</span>
          <Badge variant="secondary" className="bg-zinc-800 text-zinc-400 text-[10px] border-zinc-700">
            {file.name.length > 24 ? file.name.slice(0, 24) + "…" : file.name}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger
              onClick={onNewProject}
              className="text-zinc-400 hover:text-white hover:bg-zinc-800 h-8 px-3 inline-flex items-center gap-1.5 rounded-md text-sm font-medium transition-colors"
              id="new-project-btn"
            >
              <PlusCircle className="w-4 h-4" />
              New Project
            </TooltipTrigger>
            <TooltipContent className="bg-zinc-800 border-zinc-700 text-zinc-200">
              Upload a new video
            </TooltipContent>
          </Tooltip>

          <Button
            size="sm"
            onClick={() => {
              setExportState({ status: "idle", progress: 0, error: null, outputUrl: null });
              setShowExport(true);
            }}
            disabled={exportState.status === "processing" || duration === 0}
            className="bg-violet-600 hover:bg-violet-500 text-white h-8 px-4 shadow-lg shadow-violet-500/20"
            id="export-btn"
          >
            {exportState.status === "processing" ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                Exporting…
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5 mr-1.5" />
                Export
              </>
            )}
          </Button>
        </div>
      </header>

      {/* Main layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Tool Sidebar */}
        <ToolSidebar activeTool={activeTool} onToolChange={setActiveTool} />

        {/* Center: Video Preview */}
        <main className="flex-1 flex flex-col overflow-hidden bg-black relative">
          <div className="flex-1 overflow-hidden">
            <VideoPreview
              ref={videoRef}
              project={project}
              onTimeUpdate={setCurrentTime}
              onLoadedMetadata={handleLoadedMetadata}
              onPlayStateChange={setIsPlaying}
              onProjectChange={updateProject}
            />
          </div>

          {/* Timeline */}
          <Timeline
            duration={duration}
            currentTime={currentTime}
            trim={project.trim}
            isPlaying={isPlaying}
            onTrimChange={(trim) => updateProject({ trim })}
            onSeek={handleSeek}
            onPlayPause={handlePlayPause}
            videoRef={videoRef}
          />
        </main>

        {/* Right: Properties Panel */}
        <PropertiesPanel
          activeTool={activeTool}
          project={project}
          onProjectChange={updateProject}
        />
      </div>

      {/* Export Dialog */}
      <ExportDialog
        open={showExport}
        exportState={exportState}
        project={project}
        onClose={closeExport}
        onStartExport={startExport}
        onDownload={handleDownload}
      />
    </div>
  );
}
