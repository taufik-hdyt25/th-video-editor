import { NextRequest, NextResponse } from "next/server";
import { saveTempFile, deleteTempFile, ffmpeg } from "@/lib/video/ffmpeg";
import { WaveFile } from "wavefile";
import fs from "fs";

// Initialize transformers.js in Node
import { pipeline, env } from "@huggingface/transformers";
env.allowLocalModels = true;

const MAX_SIZE_MB = parseInt(process.env.MAX_VIDEO_SIZE_MB || "500", 10);
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;
const ALLOWED_TYPES = ["video/mp4", "video/quicktime", "video/webm", "video/x-msvideo", "audio/mpeg", "audio/wav"];

export async function POST(req: NextRequest) {
  let inputPath: string | null = null;
  let audioPath: string | null = null;

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const language = (formData.get("language") as string) || "id";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type." },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${MAX_SIZE_MB}MB.` },
        { status: 400 }
      );
    }

    // Save file to temp location
    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.name.split(".").pop()?.toLowerCase() || "mp4";
    inputPath = await saveTempFile(buffer, ext);

    // Extract audio as 16kHz mono WAV for Whisper
    audioPath = inputPath.replace(`.${ext}`, "_audio.wav");
    
    await new Promise((resolve, reject) => {
      const cmd = ffmpeg(inputPath!);
      cmd.setFfmpegPath(require("ffmpeg-static"));
      cmd.noVideo()
        .audioCodec("pcm_s16le")
        .audioFrequency(16000)
        .audioChannels(1)
        .output(audioPath!)
        .on("end", resolve)
        .on("error", reject)
        .run();
    });

    // Read audio file
    const audioBuffer = await fs.promises.readFile(audioPath);
    const wav = new WaveFile(audioBuffer);
    
    // Make sure it's 32-bit float for Transformers.js
    wav.toBitDepth("32f");
    wav.toSampleRate(16000);
    let audioData = wav.getSamples();
    if (Array.isArray(audioData)) {
      audioData = audioData[0];
    }
    
    // Make it a proper Float32Array
    const float32Data = new Float32Array(audioData as unknown as Float64Array);

    // Run Whisper pipeline (quantized: true uses smaller 8-bit model for speed)
    const transcriber = await pipeline("automatic-speech-recognition", "Xenova/whisper-tiny", {
      quantized: true,
    });
    
    // Perform transcription with timestamps
    const result = await transcriber(float32Data, {
      return_timestamps: "word",
      chunk_length_s: 30,
      stride_length_s: 5,
      language: language, // skip auto-detect for faster processing
      task: "transcribe",
    });

    const chunks = Array.isArray(result.chunks) ? result.chunks : [];

    // Clean up temp files
    if (inputPath) await deleteTempFile(inputPath);
    if (audioPath) await deleteTempFile(audioPath);

    return NextResponse.json({ chunks });
  } catch (error) {
    console.error("Transcription error:", error);
    if (inputPath) await deleteTempFile(inputPath).catch(() => {});
    if (audioPath) await deleteTempFile(audioPath).catch(() => {});
    return NextResponse.json(
      { error: "Failed to generate subtitles." },
      { status: 500 }
    );
  }
}
