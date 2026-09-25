import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["fluent-ffmpeg", "ffmpeg-static", "ffprobe-static", "@huggingface/transformers", "wavefile"],
};

export default nextConfig;
