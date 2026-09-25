import { NextRequest, NextResponse } from "next/server";
import { probeVideo, exportVideo, saveTempFile, deleteTempFile } from "@/lib/video/ffmpeg";
import type { ExportRequest } from "@/types/video";
import fs from "fs";

const MAX_SIZE_MB = parseInt(process.env.MAX_VIDEO_SIZE_MB || "500", 10);
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

// Allowed MIME types
const ALLOWED_TYPES = ["video/mp4", "video/quicktime", "video/webm", "video/x-msvideo"];
// Allowed extensions
const ALLOWED_EXTS = ["mp4", "mov", "webm", "avi"];

export async function POST(req: NextRequest) {
  let inputPath: string | null = null;
  let outputPath: string | null = null;

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const configRaw = formData.get("config") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    if (!configRaw) {
      return NextResponse.json({ error: "No config provided" }, { status: 400 });
    }

    // Validate MIME type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Please upload MP4, MOV, or WebM." },
        { status: 400 }
      );
    }

    // Validate file extension
    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    if (!ALLOWED_EXTS.includes(ext)) {
      return NextResponse.json(
        { error: "Invalid file extension." },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${MAX_SIZE_MB}MB.` },
        { status: 400 }
      );
    }

    // Parse and validate config
    let config: ExportRequest;
    try {
      config = JSON.parse(configRaw);
    } catch {
      return NextResponse.json({ error: "Invalid config JSON" }, { status: 400 });
    }

    // Basic config validation
    if (
      typeof config.trim?.start !== "number" ||
      typeof config.trim?.end !== "number" ||
      config.trim.start < 0 ||
      config.trim.end <= config.trim.start
    ) {
      return NextResponse.json({ error: "Invalid trim settings" }, { status: 400 });
    }

    // Save file to temp location
    const buffer = Buffer.from(await file.arrayBuffer());
    inputPath = await saveTempFile(buffer, ext);

    // Probe video metadata
    let metadata;
    try {
      metadata = await probeVideo(inputPath);
    } catch (err) {
      console.error("FFmpeg Probe Error:", err);
      return NextResponse.json(
        { error: "Unable to read video file. Please try another MP4 or MOV file." },
        { status: 422 }
      );
    }

    // Override probed metadata with user-defined metadata if present
    if (config.metadata) {
      if (config.metadata.fps) metadata.fps = config.metadata.fps;
      if (config.metadata.codec) metadata.codec = config.metadata.codec;
    }

    // Clamp trim to actual duration
    config.trim.start = Math.max(0, Math.min(config.trim.start, metadata.duration - 0.1));
    config.trim.end = Math.max(config.trim.start + 0.1, Math.min(config.trim.end, metadata.duration));

    // Export
    try {
      outputPath = await exportVideo(inputPath, config, metadata);
    } catch (err) {
      console.error("FFmpeg export error:", err);
      return NextResponse.json(
        { error: "Unable to process this video. Please try another MP4 or MOV file." },
        { status: 500 }
      );
    }

    // Read output and stream back
    const outputBuffer = await fs.promises.readFile(outputPath);

    // Clean up
    if (inputPath) await deleteTempFile(inputPath);
    if (outputPath) await deleteTempFile(outputPath);

    return new NextResponse(outputBuffer, {
      status: 200,
      headers: {
        "Content-Type": "video/mp4",
        "Content-Disposition": `attachment; filename="edited_video.mp4"`,
        "Content-Length": String(outputBuffer.length),
      },
    });
  } catch (err) {
    console.error("Export API error:", err);
    // Clean up on error
    if (inputPath) await deleteTempFile(inputPath).catch(() => {});
    if (outputPath) await deleteTempFile(outputPath).catch(() => {});

    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    );
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
};
