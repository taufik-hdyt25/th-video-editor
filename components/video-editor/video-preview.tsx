"use client";

import { useRef, useEffect, useCallback, forwardRef, useImperativeHandle, useState } from "react";
import type { VideoProject } from "@/types/video";

interface VideoPreviewProps {
  project: VideoProject;
  onTimeUpdate?: (currentTime: number) => void;
  onLoadedMetadata?: (duration: number, width: number, height: number) => void;
  onPlayStateChange?: (playing: boolean) => void;
  onProjectChange?: (updates: Partial<VideoProject>) => void;
}

export interface VideoPreviewHandle {
  play: () => void;
  pause: () => void;
  seek: (time: number) => void;
  getElement: () => HTMLVideoElement | null;
}

export const VideoPreview = forwardRef<VideoPreviewHandle, VideoPreviewProps>(
  function VideoPreview({ project, onTimeUpdate, onLoadedMetadata, onPlayStateChange, onProjectChange }, ref) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [currentTime, setCurrentTime] = useState(0);
    const [draggingTextId, setDraggingTextId] = useState<string | null>(null);

    useEffect(() => {
      if (videoRef.current && project.speed) {
        videoRef.current.playbackRate = project.speed;
      }
    }, [project.speed]);

    useImperativeHandle(ref, () => ({
      play: () => videoRef.current?.play(),
      pause: () => videoRef.current?.pause(),
      seek: (time: number) => {
        if (videoRef.current) {
          videoRef.current.currentTime = time;
          setCurrentTime(time);
        }
      },
      getElement: () => videoRef.current,
    }));

    // Build CSS transform for zoom & pan preview
    const { transform, crop, aspectRatio } = project;
    
    // CSS transform for zoom preview
    const cssTransform = `scale(${transform.scale}) translate(${transform.x * 50}%, ${transform.y * 50}%)`;
    
    // CSS clip path for crop preview
    const clipLeft = crop.x * 100;
    const clipTop = crop.y * 100;
    const clipRight = (1 - crop.x - crop.width) * 100;
    const clipBottom = (1 - crop.y - crop.height) * 100;
    const clipPath = `inset(${clipTop}% ${clipRight}% ${clipBottom}% ${clipLeft}%)`;

    // Aspect ratio for the preview container should match the original video
    // because crop coordinates (clipPath) are relative to the original video frame.
    const arRatio = project.metadata 
      ? project.metadata.width / project.metadata.height 
      : 16 / 9;

    const handleTimeUpdate = useCallback(() => {
      const el = videoRef.current;
      if (!el) return;
      setCurrentTime(el.currentTime);
      onTimeUpdate?.(el.currentTime);
      // Loop within trim range
      if (el.currentTime >= project.trim.end) {
        el.currentTime = project.trim.start;
        el.pause();
      }
    }, [onTimeUpdate, project.trim]);

    const handleLoadedMetadata = useCallback(() => {
      const el = videoRef.current;
      if (!el) return;
      onLoadedMetadata?.(el.duration, el.videoWidth, el.videoHeight);
      el.currentTime = project.trim.start;
    }, [onLoadedMetadata, project.trim.start]);

    // Fallback: if the video is already loaded (e.g. from cache or fast local object URL), manually trigger it
    useEffect(() => {
      const el = videoRef.current;
      if (el && el.readyState >= 1 && onLoadedMetadata) {
        onLoadedMetadata(el.duration, el.videoWidth, el.videoHeight);
      }
    }, [project.sourceUrl, onLoadedMetadata]);

    const handlePlay = useCallback(() => onPlayStateChange?.(true), [onPlayStateChange]);
    const handlePause = useCallback(() => onPlayStateChange?.(false), [onPlayStateChange]);

    // Seek to trim start when trim changes
    useEffect(() => {
      const el = videoRef.current;
      if (!el) return;
      if (el.currentTime < project.trim.start || el.currentTime > project.trim.end) {
        el.currentTime = project.trim.start;
      }
    }, [project.trim.start, project.trim.end]);

    return (
      <div className="flex items-center justify-center w-full h-full bg-black relative overflow-hidden">
        {/* Aspect ratio container */}
        <div
          className="relative overflow-hidden bg-black"
          style={{
            aspectRatio: `${arRatio}`,
            maxWidth: "100%",
            maxHeight: "100%",
            width: arRatio >= 1 ? "100%" : "auto",
            height: arRatio < 1 ? "100%" : "auto",
          }}
        >
          {/* Video with transform */}
          <div
            className="w-full h-full"
            style={{ clipPath }}
          >
            {project.sourceUrl && (
              <video
                ref={videoRef}
                src={project.sourceUrl}
                className="w-full h-full object-contain"
                style={{ transform: cssTransform, transformOrigin: "center" }}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onPlay={handlePlay}
                onPause={handlePause}
                playsInline
                preload="metadata"
              />
            )}
          </div>

          {/* Text overlays preview */}
          {project.textOverlays.map((overlay) => {
            if (
              overlay.startTime !== undefined &&
              overlay.endTime !== undefined &&
              (currentTime < overlay.startTime || currentTime > overlay.endTime)
            ) {
              return null;
            }
            return (
              <div
                key={overlay.id}
                className="absolute select-none cursor-move"
                onPointerDown={(e) => {
                  e.currentTarget.setPointerCapture(e.pointerId);
                  setDraggingTextId(overlay.id);
                }}
                onPointerMove={(e) => {
                  if (draggingTextId !== overlay.id || !onProjectChange) return;
                  const container = e.currentTarget.parentElement;
                  if (!container) return;
                  const rect = container.getBoundingClientRect();
                  
                  // movementX/Y is sometimes unreliable, using clientX/Y delta would be safer but movementX is usually okay on desktop
                  const dx = (e.movementX / rect.width) * 100;
                  const dy = (e.movementY / rect.height) * 100;
                  
                  const newOverlays = project.textOverlays.map(o => {
                    if (o.id === overlay.id) {
                      return { ...o, x: o.x + dx, y: o.y + dy };
                    }
                    return o;
                  });
                  onProjectChange({ textOverlays: newOverlays });
                }}
                onPointerUp={(e) => {
                  e.currentTarget.releasePointerCapture(e.pointerId);
                  setDraggingTextId(null);
                }}
                style={{
                  left: `${overlay.x}%`,
                  top: `${overlay.y}%`,
                  transform: "translate(-50%, -50%)",
                  fontFamily: overlay.fontFamily || "Arial",
                  fontSize: `${overlay.fontSize}px`,
                  fontWeight: overlay.fontWeight,
                  color: overlay.color,
                  opacity: overlay.opacity / 100,
                  textAlign: overlay.alignment,
                  textShadow: "0 2px 6px rgba(0,0,0,0.8), 0 -1px 3px rgba(0,0,0,0.8), 1px 0 3px rgba(0,0,0,0.8), -1px 0 3px rgba(0,0,0,0.8)",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  maxWidth: "90%",
                  zIndex: 20,
                }}
              >
                {overlay.text}
              </div>
            );
          })}

          {/* Crop overlay guides */}
          {(crop.x > 0 || crop.y > 0 || crop.width < 1 || crop.height < 1) && (
            <>
              {/* Darkened areas */}
              <div
                className="absolute inset-0 bg-black/50 pointer-events-none"
                style={{
                  clipPath: `polygon(
                    0% 0%, 100% 0%, 100% 100%, 0% 100%,
                    ${clipLeft}% ${clipTop}%,
                    ${clipLeft}% ${100 - clipBottom}%,
                    ${100 - clipRight}% ${100 - clipBottom}%,
                    ${100 - clipRight}% ${clipTop}%,
                    ${clipLeft}% ${clipTop}%
                  )`,
                }}
              />
              {/* Crop border */}
              <div
                className="absolute border-2 border-white/80 pointer-events-none"
                style={{
                  left: `${clipLeft}%`,
                  top: `${clipTop}%`,
                  right: `${clipRight}%`,
                  bottom: `${clipBottom}%`,
                  boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.3)",
                }}
              >
                {/* Rule of thirds grid */}
                <div className="absolute inset-0">
                  <div className="absolute left-1/3 top-0 bottom-0 w-px bg-white/20" />
                  <div className="absolute left-2/3 top-0 bottom-0 w-px bg-white/20" />
                  <div className="absolute top-1/3 left-0 right-0 h-px bg-white/20" />
                  <div className="absolute top-2/3 left-0 right-0 h-px bg-white/20" />
                </div>
                {/* Corner handles */}
                {[["top-0 left-0", "-translate-x-0.5 -translate-y-0.5"],
                  ["top-0 right-0", "translate-x-0.5 -translate-y-0.5"],
                  ["bottom-0 left-0", "-translate-x-0.5 translate-y-0.5"],
                  ["bottom-0 right-0", "translate-x-0.5 translate-y-0.5"],
                ].map(([pos, t]) => (
                  <div
                    key={pos}
                    className={`absolute w-4 h-4 border-2 border-white ${pos} transform ${t}`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    );
  }
);
