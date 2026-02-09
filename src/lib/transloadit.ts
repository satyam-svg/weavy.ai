/**
 * Transloadit Integration (client)
 *
 * Uploads go to our server (POST /api/upload/image or /api/upload/video),
 * which then uploads to Transloadit server-side. Auth key stays on server.
 */

export interface TransloaditResult {
  url: string;
  ssl_url: string;
  name: string;
  basename: string;
  ext: string;
  size: number;
  mime: string;
  width?: number;
  height?: number;
  duration?: number;
}

export interface UploadProgress {
  bytesReceived: number;
  bytesExpected: number;
  percentage: number;
}

/**
 * Upload image via server (server then uses Transloadit).
 */
export async function uploadImageToTransloadit(
  file: File,
  onProgress?: (progress: UploadProgress) => void
): Promise<TransloaditResult | null> {
  return uploadViaServer(file, '/api/upload/image', onProgress);
}

/**
 * Upload video via server (server then uses Transloadit).
 */
export async function uploadVideoToTransloadit(
  file: File,
  onProgress?: (progress: UploadProgress) => void
): Promise<TransloaditResult | null> {
  return uploadViaServer(file, '/api/upload/video', onProgress);
}

/**
 * POST file to our upload API; progress = upload-to-server progress.
 */
function uploadViaServer(
  file: File,
  url: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<TransloaditResult | null> {
  const formData = new FormData();
  formData.append('file', file);

  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress({
          bytesReceived: event.loaded,
          bytesExpected: event.total,
          percentage: Math.round((event.loaded / event.total) * 100),
        });
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText) as TransloaditResult;
          resolve(data);
        } catch {
          resolve(null);
        }
      } else {
        try {
          const err = JSON.parse(xhr.responseText) as { error?: string };
          console.error('Upload API error:', err.error ?? xhr.statusText);
        } catch {
          console.error('Upload API error:', xhr.status, xhr.responseText);
        }
        resolve(null);
      }
    });

    xhr.addEventListener('error', () => {
      console.error('Upload request failed');
      resolve(null);
    });

    xhr.open('POST', url);
    xhr.send(formData);
  });
}

/**
 * Crop and frame extraction are done server-side via Trigger.dev tasks.
 * Use the trigger API (e.g. crop-image, extract-frame task types) from the client.
 */

/**
 * Fetch image as base64 for LLM API calls
 */
export async function urlToBase64(url: string): Promise<string | null> {
    try {
        const response = await fetch(url);
        const blob = await response.blob();

        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const base64 = reader.result as string;
                // Remove data URL prefix
                const base64Data = base64.split(',')[1];
                resolve(base64Data);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        console.error('URL to base64 conversion error:', error);
        return null;
    }
}
