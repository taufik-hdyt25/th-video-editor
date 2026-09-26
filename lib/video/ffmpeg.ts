import ffmpeg from "fluent-ffmpeg";
import path from "path";
import fs from "fs";
import os from "os";
import type { ExportRequest, VideoMetadata } from "@/types/video";
import { buildVideoFilter } from "./filters";

const ffmpegStatic = require("ffmpeg-static");
const ffprobeStatic = require("ffprobe-static");

const FFMPEG_PATH = process.env.FFMPEG_PATH || ffmpegStatic;
const FFPROBE_PATH = process.env.FFPROBE_PATH || ffprobeStatic.path;

if (FFMPEG_PATH) ffmpeg.setFfmpegPath(FFMPEG_PATH);
if (FFPROBE_PATH) ffmpeg.setFfprobePath(FFPROBE_PATH);

export { ffmpeg };

/**
 * Probe video metadata.
 */
export async function probeVideo(filePath: string): Promise<VideoMetadata> {
  const probePath = require("ffprobe-static").path;
  ffmpeg.setFfprobePath(probePath);
  
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, data) => {
      if (err) return reject(err);
      const stream = data.streams.find((s) => s.codec_type === "video");
      if (!stream) return reject(new Error("No video stream found"));
      const fps = stream.r_frame_rate ? eval(stream.r_frame_rate) : 30;
      resolve({
        duration: data.format.duration || 0,
        width: stream.width || 1920,
        height: stream.height || 1080,
        fps: Math.round(fps),
        codec: stream.codec_name || "unknown",
        size: data.format.size || 0,
      });
    });
  });
}

/**
 * Export video with editing settings applied.
 */
export async function exportVideo(
  inputPath: string,
  request: ExportRequest,
  metadata: VideoMetadata,
  onProgress?: (pct: number) => void,
): Promise<string> {
  const binPath = require("ffmpeg-static");
  ffmpeg.setFfmpegPath(binPath);
  
  const tmpDir = os.tmpdir();
  const outputPath = path.join(tmpDir, `ve_out_${Date.now()}.mp4`);

  const videoFilter = buildVideoFilter({
    trim: request.trim,
    crop: request.crop,
    transform: request.transform,
    aspectRatio: request.aspectRatio,
    textOverlays: request.textOverlays,
    metadata,
    speed: request.speed || 1,
  });

  return new Promise((resolve, reject) => {
    let cmd = ffmpeg(inputPath);
    if (FFMPEG_PATH) cmd.setFfmpegPath(FFMPEG_PATH);
    if (FFPROBE_PATH) cmd.setFfprobePath(FFPROBE_PATH);
    cmd = cmd.seekInput(request.trim.start)
      .duration(request.trim.end - request.trim.start);

    if (videoFilter) {
      cmd = cmd.videoFilter(videoFilter);
    }

    if (request.speed && request.speed !== 1) {
      let currentSpeed = request.speed;
      const atempoFilters: string[] = [];
      while (currentSpeed < 0.5) {
        atempoFilters.push("atempo=0.5");
        currentSpeed /= 0.5;
      }
      while (currentSpeed > 2.0) {
        atempoFilters.push("atempo=2.0");
        currentSpeed /= 2.0;
      }
      if (currentSpeed !== 1.0) {
        atempoFilters.push(`atempo=${currentSpeed}`);
      }
      if (atempoFilters.length > 0) {
        cmd = cmd.audioFilter(atempoFilters.join(","));
      }
    }

    let videoCodec = "libx264";
    if (metadata.codec === "hevc") videoCodec = "libx265";
    else if (metadata.codec === "vp9") videoCodec = "libvpx-vp9";

    cmd
      .videoCodec(videoCodec)
      .audioCodec("aac")
      .fps(metadata.fps || 30)
      .outputOptions([
        "-pix_fmt yuv420p",
        "-movflags +faststart",
        "-preset ultrafast",
        "-crf 28",
        "-map_metadata -1", // Strip all original metadata to ensure privacy/hide AI traces
      ])
      .output(outputPath)
      .on("progress", (prog) => {
        const pct = Math.min(
          99,
          Math.round(
            (prog.timemark
              ? timeToSeconds(prog.timemark) /
                (request.trim.end - request.trim.start)
              : 0) * 100,
          ),
        );
        onProgress?.(pct);
      })
      .on("end", () => resolve(outputPath))
      .on("error", (err) => reject(err))
      .run();
  });
}

function timeToSeconds(timemark: string): number {
  const parts = timemark.split(":").map(Number);
  return parts[0] * 3600 + parts[1] * 60 + parts[2];
}

/**
 * Save a Buffer to a temp file and return its path.
 */
export async function saveTempFile(
  buffer: Buffer,
  ext: string,
): Promise<string> {
  const tmpDir = os.tmpdir();
  const filePath = path.join(tmpDir, `ve_in_${Date.now()}.${ext}`);
  await fs.promises.writeFile(filePath, buffer);
  return filePath;
}

/**
 * Delete a temp file silently.
 */
export async function deleteTempFile(filePath: string): Promise<void> {
  try {
    await fs.promises.unlink(filePath);
  } catch {}
}
