"use client";

import { useCallback, useRef, useState } from "react";
import type { TrimSettings } from "@/types/video";
import {
  Play, Pause, Volume2, VolumeX, Maximize2,
  SkipBack, SkipForward
} from "lucide-react";
import type { VideoPreviewHandle } from "./video-preview";

interface TimelineProps {
  duration: number;
  currentTime: number;
  trim: TrimSettings;
  isPlaying: boolean;
  onTrimChange: (trim: TrimSettings) => void;
  onSeek: (time: number) => void;
  onPlayPause: () => void;
  videoRef: React.RefObject<VideoPreviewHandle | null>;
}

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

type DragTarget = "start" | "end" | "playhead" | null;

export function Timeline({
  duration,
  currentTime,
  trim,
  isPlaying,
  onTrimChange,
  onSeek,
  onPlayPause,
  videoRef,
}: TimelineProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const dragTarget = useRef<DragTarget>(null);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);

  const getTimeFromX = useCallback(
    (clientX: number): number => {
      const el = trackRef.current;
      if (!el) return 0;
      const rect = el.getBoundingClientRect();
      const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      return pct * duration;
    },
    [duration]
  );

  const handleMouseDown = useCallback(
    (target: DragTarget) => (e: React.MouseEvent) => {
      e.preventDefault();
      dragTarget.current = target;

      const onMove = (ev: MouseEvent) => {
        const t = getTimeFromX(ev.clientX);
        if (dragTarget.current === "start") {
          onTrimChange({ start: Math.min(t, trim.end - 0.5), end: trim.end });
        } else if (dragTarget.current === "end") {
          onTrimChange({ start: trim.start, end: Math.max(t, trim.start + 0.5) });
        } else if (dragTarget.current === "playhead") {
          const clamped = Math.max(trim.start, Math.min(t, trim.end));
          onSeek(clamped);
        }
      };
      const onUp = () => {
        dragTarget.current = null;
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [getTimeFromX, trim, onTrimChange, onSeek]
  );

  const handleTrackClick = useCallback(
    (e: React.MouseEvent) => {
      if (dragTarget.current) return;
      const t = getTimeFromX(e.clientX);
      const clamped = Math.max(trim.start, Math.min(t, trim.end));
      onSeek(clamped);
    },
    [getTimeFromX, trim, onSeek]
  );

  const toggleMute = () => {
    const el = videoRef.current?.getElement();
    if (!el) return;
    el.muted = !el.muted;
    setIsMuted(el.muted);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    setVolume(v);
    const el = videoRef.current?.getElement();
    if (el) {
      el.volume = v;
      el.muted = v === 0;
      setIsMuted(v === 0);
    }
  };

  const skipBackward = () => onSeek(Math.max(trim.start, currentTime - 5));
  const skipForward = () => onSeek(Math.min(trim.end, currentTime + 5));

  const safeD = Math.max(duration, 0.001);
  const startPct = (trim.start / safeD) * 100;
  const endPct = (trim.end / safeD) * 100;
  const playheadPct = (currentTime / safeD) * 100;

  // Tick marks
  const tickCount = Math.min(10, Math.floor(duration / 5));
  const ticks = Array.from({ length: tickCount + 1 }, (_, i) =>
    (i / Math.max(tickCount, 1)) * duration
  );

  return (
    <div className="flex flex-col gap-3 bg-[#1a1a1f] border-t border-zinc-800/60 px-4 py-3">
      {/* Time markers */}
      <div className="relative h-5 select-none" aria-hidden>
        {ticks.map((t) => (
          <div
            key={t}
            className="absolute top-0 flex flex-col items-center"
            style={{ left: `${(t / safeD) * 100}%`, transform: "translateX(-50%)" }}
          >
            <span className="text-[10px] text-zinc-600 font-mono">{formatTime(t)}</span>
          </div>
        ))}
      </div>

      {/* Track */}
      <div
        ref={trackRef}
        className="relative h-8 rounded-lg overflow-visible cursor-pointer select-none"
        onClick={handleTrackClick}
        role="slider"
        aria-label="Timeline"
        aria-valuemin={0}
        aria-valuemax={duration}
        aria-valuenow={currentTime}
      >
        {/* Background */}
        <div className="absolute inset-0 bg-zinc-800 rounded-lg" />

        {/* Inactive region (outside trim) */}
        <div
          className="absolute top-0 bottom-0 bg-zinc-900/80 rounded-l-lg"
          style={{ left: 0, width: `${startPct}%` }}
        />
        <div
          className="absolute top-0 bottom-0 bg-zinc-900/80 rounded-r-lg"
          style={{ left: `${endPct}%`, right: 0 }}
        />

        {/* Active region */}
        <div
          className="absolute top-0 bottom-0 bg-violet-500/20 border-y border-violet-500/40"
          style={{ left: `${startPct}%`, width: `${endPct - startPct}%` }}
        />

        {/* Trim Start handle */}
        <div
          className="absolute top-0 bottom-0 w-1.5 bg-violet-400 rounded-l cursor-ew-resize z-20 hover:bg-violet-300 transition-colors"
          style={{ left: `${startPct}%`, transform: "translateX(-50%)" }}
          onMouseDown={handleMouseDown("start")}
          aria-label="Trim start"
        >
          <div className="absolute -top-1 -bottom-1 left-1/2 -translate-x-1/2 w-4 cursor-ew-resize" />
        </div>

        {/* Trim End handle */}
        <div
          className="absolute top-0 bottom-0 w-1.5 bg-violet-400 rounded-r cursor-ew-resize z-20 hover:bg-violet-300 transition-colors"
          style={{ left: `${endPct}%`, transform: "translateX(-50%)" }}
          onMouseDown={handleMouseDown("end")}
          aria-label="Trim end"
        >
          <div className="absolute -top-1 -bottom-1 left-1/2 -translate-x-1/2 w-4 cursor-ew-resize" />
        </div>

        {/* Playhead */}
        <div
          className="absolute top-0 w-0.5 bg-white z-30 cursor-ew-resize"
          style={{
            left: `${playheadPct}%`,
            height: "calc(100% + 8px)",
            top: "-4px",
            transform: "translateX(-50%)",
          }}
          onMouseDown={handleMouseDown("playhead")}
        >
          {/* Playhead triangle */}
          <div
            className="absolute -top-1 left-1/2 -translate-x-1/2 w-0 h-0"
            style={{
              borderLeft: "5px solid transparent",
              borderRight: "5px solid transparent",
              borderTop: "6px solid white",
            }}
          />
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        {/* Transport */}
        <div className="flex items-center gap-2">
          <button
            onClick={skipBackward}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all"
            aria-label="Skip backward 5 seconds"
          >
            <SkipBack className="w-4 h-4" />
          </button>
          <button
            onClick={onPlayPause}
            className="w-10 h-10 rounded-xl flex items-center justify-center bg-violet-600 text-white hover:bg-violet-500 transition-all shadow-lg shadow-violet-500/20"
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
          </button>
          <button
            onClick={skipForward}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all"
            aria-label="Skip forward 5 seconds"
          >
            <SkipForward className="w-4 h-4" />
          </button>
        </div>

        {/* Time */}
        <div className="flex items-center gap-1 font-mono text-sm">
          <span className="text-white">{formatTime(currentTime)}</span>
          <span className="text-zinc-600">/</span>
          <span className="text-zinc-400">{formatTime(duration)}</span>
        </div>

        {/* Volume */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-600">
            Trim: {formatTime(trim.start)} – {formatTime(trim.end)}
          </span>
          <button
            onClick={toggleMute}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all"
            aria-label={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={isMuted ? 0 : volume}
            onChange={handleVolumeChange}
            className="w-20 h-1 accent-violet-500 cursor-pointer"
            aria-label="Volume"
          />
        </div>
      </div>
    </div>
  );
}
