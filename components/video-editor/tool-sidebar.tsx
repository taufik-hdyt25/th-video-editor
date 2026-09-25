"use client";

import type { ActiveTool } from "@/types/video";
import { Crop, ZoomIn, Scissors, Type, Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ToolSidebarProps {
  activeTool: ActiveTool;
  onToolChange: (tool: ActiveTool) => void;
}

const TOOLS: Array<{ id: ActiveTool; icon: React.ReactNode; label: string }> = [
  { id: "trim", icon: <Scissors className="w-5 h-5" />, label: "Trim" },
  { id: "crop", icon: <Crop className="w-5 h-5" />, label: "Crop" },
  { id: "zoom", icon: <ZoomIn className="w-5 h-5" />, label: "Zoom & Pan" },
  { id: "text", icon: <Type className="w-5 h-5" />, label: "Text Overlay" },
  { id: "metadata", icon: <Info className="w-5 h-5" />, label: "Metadata" },
];

export function ToolSidebar({ activeTool, onToolChange }: ToolSidebarProps) {
  return (
    <aside className="flex flex-col items-center gap-2 py-4 px-2 bg-[#151518] border-r border-zinc-800/60 w-16 shrink-0">
      <div className="mb-2">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-md shadow-violet-500/20">
          <span className="text-white text-xs font-bold">VE</span>
        </div>
      </div>

      <div className="w-full h-px bg-zinc-800 mb-2" />

      {TOOLS.map((tool) => (
      <Tooltip key={tool.id}>
          <TooltipTrigger
            id={`tool-${tool.id}`}
            onClick={() => onToolChange(tool.id)}
            aria-label={tool.label}
            aria-pressed={activeTool === tool.id}
            className={`
              relative w-11 h-11 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all duration-150 group
              ${activeTool === tool.id
                ? "bg-violet-600 text-white shadow-lg shadow-violet-500/30"
                : "text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800"
              }
            `}
          >
            {tool.icon}
            <span className="text-[8px] font-medium leading-none opacity-70">
              {tool.label.split(" ")[0]}
            </span>
            {activeTool === tool.id && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-violet-400 rounded-r-full" />
            )}
          </TooltipTrigger>
          <TooltipContent side="right" className="bg-zinc-800 border-zinc-700 text-zinc-200">
            {tool.label}
          </TooltipContent>
        </Tooltip>
      ))}
    </aside>
  );
}
