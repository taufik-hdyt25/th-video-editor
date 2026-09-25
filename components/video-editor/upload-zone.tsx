"use client";

import { useCallback, useRef, useState } from "react";
import { Upload, Film, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface UploadZoneProps {
  onFileSelected: (file: File) => void;
  maxSizeMb?: number;
}

// Accept semua MIME type video umum (termasuk string kosong — beberapa browser tidak set MIME)
const ALLOWED_TYPES = [
  "video/mp4",
  "video/quicktime",
  "video/webm",
  "video/x-matroska",
  "video/avi",
  "video/x-msvideo",
  "video/x-ms-wmv",
  "video/3gpp",
  "video/ogg",
  "", // beberapa browser tidak set MIME type
];
const ALLOWED_EXTS = [".mp4", ".mov", ".webm", ".mkv", ".avi", ".wmv", ".3gp", ".ogg", ".m4v"];


export function UploadZone({ onFileSelected, maxSizeMb = 500 }: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validate = (file: File): string | null => {
    const ext = "." + (file.name.split(".").pop()?.toLowerCase() ?? "");
    const mimeOk = file.type === "" || file.type.startsWith("video/");
    const extOk = ALLOWED_EXTS.includes(ext);

    // Cukup salah satu (MIME atau extension) valid
    if (!mimeOk && !extOk) {
      return `Format file tidak didukung (${file.type || ext}). Gunakan MP4, MOV, atau WebM.`;
    }
    if (file.size > maxSizeMb * 1024 * 1024) {
      return `File terlalu besar. Maksimum ${maxSizeMb}MB.`;
    }
    return null;
  };


  const handleFile = useCallback(
    (file: File) => {
      const err = validate(file);
      if (err) {
        setError(err);
        return;
      }
      setError(null);
      onFileSelected(file);
    },
    [onFileSelected, maxSizeMb]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#0f0f11] px-4">
      {/* Brand */}
      <div className="mb-12 text-center">
        <div className="flex items-center gap-3 justify-center mb-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
            <Film className="w-5 h-5 text-white" />
          </div>
          <span className="text-2xl font-bold text-white tracking-tight">Video Editor</span>
        </div>
        <p className="text-sm text-zinc-500">Professional browser-based video editing</p>
      </div>

      {/* Drop Zone */}
      <div
        onDrop={onDrop}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onClick={() => inputRef.current?.click()}
        className={`
          relative w-full max-w-xl cursor-pointer rounded-2xl border-2 border-dashed transition-all duration-200
          flex flex-col items-center justify-center py-20 px-8 gap-5
          ${isDragging
            ? "border-violet-500 bg-violet-500/5 scale-[1.01] shadow-xl shadow-violet-500/10"
            : "border-zinc-700 bg-zinc-900/50 hover:border-zinc-500 hover:bg-zinc-900"
          }
        `}
      >
        {/* Glow when dragging */}
        {isDragging && (
          <div className="absolute inset-0 rounded-2xl bg-violet-500/5 pointer-events-none" />
        )}

        <div className={`
          w-20 h-20 rounded-2xl flex items-center justify-center transition-all duration-200
          ${isDragging ? "bg-violet-500/20 text-violet-400" : "bg-zinc-800 text-zinc-400"}
        `}>
          <Upload className="w-9 h-9" />
        </div>

        <div className="text-center space-y-2">
          <p className="text-lg font-semibold text-white">
            {isDragging ? "Drop your video here" : "Drag & drop your video here"}
          </p>
          <p className="text-sm text-zinc-500">or click to browse files</p>
        </div>

        <Button
          variant="outline"
          className="relative z-10 bg-zinc-800 border-zinc-700 text-zinc-200 hover:bg-zinc-700 hover:border-zinc-600 hover:text-white transition-all"
          onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
        >
          <Upload className="w-4 h-4 mr-2" />
          Upload Video
        </Button>

        <p className="text-xs text-zinc-600">MP4 · MOV · WebM · Max {maxSizeMb}MB</p>

        <input
          ref={inputRef}
          type="file"
          accept={ALLOWED_EXTS.join(",")}
          className="hidden"
          onChange={onInputChange}
          id="video-upload-input"
          aria-label="Upload video file"
        />
      </div>

      {/* Error */}
      {error && (
        <div className="mt-4 flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 max-w-xl w-full">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Feature hints */}
      <div className="mt-12 grid grid-cols-4 gap-4 max-w-xl w-full">
        {[
          { label: "Trim", desc: "Cut start & end" },
          { label: "Crop & Zoom", desc: "Frame your shot" },
          { label: "Aspect Ratio", desc: "16:9, 9:16, 1:1" },
          { label: "Text", desc: "Add overlays" },
        ].map((f) => (
          <div key={f.label} className="text-center p-3 rounded-xl bg-zinc-900 border border-zinc-800">
            <p className="text-xs font-semibold text-zinc-300">{f.label}</p>
            <p className="text-xs text-zinc-600 mt-0.5">{f.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
