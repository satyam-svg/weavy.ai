/**
 * Server-side Transloadit upload (API routes only).
 * Uses TRANSLOADIT_KEY / TRANSLOADIT_AUTH_KEY from env (no NEXT_PUBLIC).
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

interface TransloaditAssemblyResult {
  ok: string;
  assembly_id: string;
  assembly_ssl_url: string;
  results: {
    [stepName: string]: TransloaditResult[];
  };
}

// Prefer server-only env; fallback to NEXT_PUBLIC_ so existing .env works
const TRANSLOADIT_KEY =
  process.env.TRANSLOADIT_KEY ||
  process.env.TRANSLOADIT_AUTH_KEY ||
  process.env.NEXT_PUBLIC_TRANSLOADIT_KEY ||
  process.env.NEXT_PUBLIC_TRANSLOADIT_AUTH_KEY ||
  '';

async function pollAssemblyStatus(
  assemblyUrl: string,
  maxAttempts = 60,
  intervalMs = 1000
): Promise<TransloaditAssemblyResult | null> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const response = await fetch(assemblyUrl);
      const data = (await response.json()) as TransloaditAssemblyResult;

      if (data.ok === 'ASSEMBLY_COMPLETED') {
        return data;
      }
      if (data.ok === 'ASSEMBLY_EXECUTING' || data.ok === 'ASSEMBLY_UPLOADING') {
        await new Promise((r) => setTimeout(r, intervalMs));
      } else if ((data as { error?: string }).error) {
        console.error('Transloadit assembly error:', (data as { error?: string }).error);
        return null;
      }
    } catch (error) {
      console.error('Transloadit poll error:', error);
      await new Promise((r) => setTimeout(r, intervalMs));
    }
  }
  return null;
}

/**
 * Upload a file to Transloadit from the server (image or video).
 * File is the Web API File from request.formData().
 */
export async function uploadFileToTransloadit(
  file: File,
  type: 'image' | 'video'
): Promise<TransloaditResult | null> {
  if (!TRANSLOADIT_KEY) {
    console.error('TRANSLOADIT_KEY or TRANSLOADIT_AUTH_KEY is not set');
    return null;
  }

  const steps =
    type === 'image'
      ? {
          ':original': { robot: '/upload/handle' as const },
          optimized: {
            use: ':original',
            robot: '/image/optimize' as const,
            result: true,
          },
        }
      : {
          ':original': { robot: '/upload/handle' as const },
          encoded: {
            use: ':original',
            robot: '/video/encode' as const,
            preset: 'webm',
            result: true,
          },
        };

  const params = {
    auth: { key: TRANSLOADIT_KEY },
    steps,
  };

  const formData = new FormData();
  formData.append('params', JSON.stringify(params));
  formData.append('file', file, file.name || (type === 'image' ? 'image' : 'video'));

  try {
    const response = await fetch('https://api2.transloadit.com/assemblies', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const text = await response.text();
      console.error('Transloadit POST failed:', response.status, text);
      return null;
    }

    const data = (await response.json()) as { assembly_ssl_url?: string; error?: string };
    if (data.error || !data.assembly_ssl_url) {
      console.error('Transloadit response error:', data.error ?? 'No assembly_ssl_url');
      return null;
    }

    const result = await pollAssemblyStatus(data.assembly_ssl_url);
    if (!result || result.ok !== 'ASSEMBLY_COMPLETED') {
      return null;
    }

    const resultKey = type === 'image' ? 'optimized' : 'encoded';
    const files = result.results[resultKey] ?? result.results[':original'];
    return files?.[0] ?? null;
  } catch (error) {
    console.error('Transloadit server upload error:', error);
    return null;
  }
}
