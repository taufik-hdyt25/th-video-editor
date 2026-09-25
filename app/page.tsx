"use client";

import { useState, useCallback } from "react";
import { UploadZone } from "@/components/video-editor/upload-zone";
import { VideoEditor } from "@/components/video-editor/video-editor";

interface LoadedVideo {
  file: File;
  url: string;
}

export default function Home() {
  const [video, setVideo] = useState<LoadedVideo | null>(null);

  const handleFileSelected = useCallback((file: File) => {
    // Revoke any previous URL to free memory
    if (video?.url) {
      URL.revokeObjectURL(video.url);
    }
    const url = URL.createObjectURL(file);
    setVideo({ file, url });
  }, [video]);

  const handleNewProject = useCallback(() => {
    if (video?.url) {
      URL.revokeObjectURL(video.url);
    }
    setVideo(null);
  }, [video]);

  if (!video) {
    return <UploadZone onFileSelected={handleFileSelected} />;
  }

  return (
    <VideoEditor
      key={video.url}
      file={video.file}
      sourceUrl={video.url}
      onNewProject={handleNewProject}
    />
  );
}
