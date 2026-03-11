/**
 * Crop Image Task - Trigger.dev Task for Image Cropping
 *
 * Uses FFmpeg to crop the image (percentage-based). Transloadit is used only
 * for uploading the result.
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

export interface CropImageTaskPayload {
  imageUrl: string;
  cropX: number; // percentage 0-100
  cropY: number;
  cropWidth: number;
  cropHeight: number;
}

export interface CropImageTaskResult {
  croppedImageUrl: string;
}

const FFMPEG_PATH = process.env.FFMPEG_PATH ?? "ffmpeg";
const FFPROBE_PATH = process.env.FFPROBE_PATH ?? "ffprobe";

// ============================================================================
// Helpers
// ============================================================================

async function getImageDimensions(
  inputPath: string
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const proc = spawn(FFPROBE_PATH, [
      "-v",
      "error",
      "-select_streams",
      "v:0",
      "-show_entries",
      "stream=width,height",
      "-of",
      "json",
      inputPath,
    ], { stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    let err = "";
    proc.stdout?.on("data", (chunk) => {
      out += chunk.toString();
    });
    proc.stderr?.on("data", (chunk) => {
      err += chunk.toString();
    });
    proc.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`ffprobe exited ${code}: ${err}`));
        return;
      }
      try {
        const data = JSON.parse(out) as { streams?: { width: number; height: number }[] };
        const stream = data.streams?.[0];
        if (!stream?.width || !stream?.height) {
          reject(new Error("Could not get image dimensions"));
          return;
        }
        resolve({ width: stream.width, height: stream.height });
      } catch (e) {
        reject(e);
      }
    });
    proc.on("error", reject);
  });
}

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
  if (url.startsWith("data:")) {
    const base64 = url.replace(/^data:[^;]+;base64,/, "");
    const tmpDir = os.tmpdir();
    const filePath = path.join(tmpDir, `image_${Date.now()}${ext}`);
    await fs.writeFile(filePath, Buffer.from(base64, "base64"));
    return filePath;
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const tmpDir = os.tmpdir();
  const filePath = path.join(tmpDir, `image_${Date.now()}${ext}`);
  await fs.writeFile(filePath, buf);
  return filePath;
}

// ============================================================================
// Task Definition
// ============================================================================

export const cropImageTask = task({
  id: "crop-image",
  maxDuration: 180,
  retry: {
    maxAttempts: 3,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 5000,
    factor: 2,
  },
  run: async (payload: CropImageTaskPayload): Promise<CropImageTaskResult> => {
    const { imageUrl, cropX, cropY, cropWidth, cropHeight } = payload;

    logger.info("Starting crop image task (FFmpeg)", {
      imageUrl: imageUrl.substring(0, 50) + "...",
      cropX,
      cropY,
      cropWidth,
      cropHeight,
    });

    const tmpDir = os.tmpdir();
    const ext = imageUrl.includes("png") ? ".png" : ".jpg";
    const inputPath = await downloadToTemp(imageUrl, ext);
    const outputPath = path.join(tmpDir, `cropped_${Date.now()}${ext}`);

    try {
      const { width, height } = await getImageDimensions(inputPath);

      const x = Math.round((width * cropX) / 100);
      const y = Math.round((height * cropY) / 100);
      const w = Math.round((width * cropWidth) / 100);
      const h = Math.round((height * cropHeight) / 100);

      if (w <= 0 || h <= 0) {
        throw new Error("Invalid crop size");
      }

      await runFfmpeg([
        "-i",
        inputPath,
        "-vf",
        `crop=${w}:${h}:${x}:${y}`,
        "-y",
        outputPath,
      ]);

      const croppedBuffer = await fs.readFile(outputPath);

      const upload = await uploadBufferToTransloadit(
        croppedBuffer,
        `cropped${ext}`,
        ext === ".png" ? "image/png" : "image/jpeg"
      );

      if (!upload?.ssl_url) {
        throw new Error("Transloadit upload failed");
      }

      logger.info("Crop image task completed (FFmpeg)", {
        croppedUrl: upload.ssl_url.substring(0, 50) + "...",
      });

      return { croppedImageUrl: upload.ssl_url };
    } finally {
      await fs.unlink(inputPath).catch(() => {});
      await fs.unlink(outputPath).catch(() => {});
    }
  },
});
