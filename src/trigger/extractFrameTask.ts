/**
 * Extract Frame Task - Trigger.dev Task for Video Frame Extraction
 *
 * Uses FFmpeg to extract a single frame at the given timestamp.
 * Transloadit is used only for uploading the result.
 */

import { task, logger } from "@trigger.dev/sdk/v3";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { spawn } from "child_process";
import { uploadBufferToTransloadit } from "@/lib/transloadit-server";

// ============================================================================
// Types
// ============================================================================

export interface ExtractFrameTaskPayload {
  videoUrl: string;
  timestamp: number; // seconds
}

export interface ExtractFrameTaskResult {
  frameImageUrl: string;
}

const FFMPEG_PATH = process.env.FFMPEG_PATH ?? "ffmpeg";

// ============================================================================
// Helpers
// ============================================================================

function runFfmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(FFMPEG_PATH, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";
    proc.stderr?.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exited ${code}: ${stderr.slice(-500)}`));
    });
    proc.on("error", (err) => reject(err));
  });
}

async function downloadToTemp(url: string, ext: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch video: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const tmpDir = os.tmpdir();
  const filePath = path.join(tmpDir, `video_${Date.now()}${ext}`);
  await fs.writeFile(filePath, buf);
  return filePath;
}

// ============================================================================
// Task Definition
// ============================================================================

export const extractFrameTask = task({
  id: "extract-video-frame",
  maxDuration: 300,
  retry: {
    maxAttempts: 3,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 5000,
    factor: 2,
  },
  run: async (payload: ExtractFrameTaskPayload): Promise<ExtractFrameTaskResult> => {
    const { videoUrl, timestamp } = payload;

    logger.info("Starting extract frame task (FFmpeg)", {
      videoUrl: videoUrl.substring(0, 50) + "...",
      timestamp,
    });

    const tmpDir = os.tmpdir();
    const outputPath = path.join(tmpDir, `frame_${Date.now()}.png`);
    let inputPath: string | null = null;

    try {
      const isDataUrl = videoUrl.startsWith("data:");
      if (isDataUrl) {
        const base64 = videoUrl.replace(/^data:[^;]+;base64,/, "");
        inputPath = path.join(tmpDir, `video_${Date.now()}.mp4`);
        await fs.writeFile(inputPath, Buffer.from(base64, "base64"));
      } else {
        inputPath = await downloadToTemp(videoUrl, ".mp4");
      }

      // FFmpeg: -ss before -i for fast seek; extract one frame
      await runFfmpeg([
        "-ss",
        String(timestamp),
        "-i",
        inputPath,
        "-frames:v",
        "1",
        "-q:v",
        "2",
        "-y",
        outputPath,
      ]);

      const frameBuffer = await fs.readFile(outputPath);
      await fs.unlink(outputPath).catch(() => {});
      if (inputPath) await fs.unlink(inputPath).catch(() => {});

      const upload = await uploadBufferToTransloadit(
        frameBuffer,
        "frame.png",
        "image/png"
      );

      if (!upload?.ssl_url) {
        throw new Error("Transloadit upload failed");
      }

      logger.info("Extract frame task completed (FFmpeg)", {
        frameUrl: upload.ssl_url.substring(0, 50) + "...",
      });

      return { frameImageUrl: upload.ssl_url };
    } finally {
      if (inputPath) await fs.unlink(inputPath).catch(() => {});
      await fs.unlink(outputPath).catch(() => {});
    }
  },
});
