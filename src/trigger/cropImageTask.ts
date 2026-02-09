/**
 * Crop Image Task - Trigger.dev Task for Image Cropping
 * 
 * This task crops images using Transloadit's image processing.
 * Accepts percentage-based crop coordinates.
 */

import { task, logger } from "@trigger.dev/sdk/v3";

// ============================================================================
// Types
// ============================================================================

export interface CropImageTaskPayload {
    imageUrl: string;
    cropX: number;       // percentage 0-100
    cropY: number;       // percentage 0-100
    cropWidth: number;   // percentage 0-100
    cropHeight: number;  // percentage 0-100
}

export interface CropImageTaskResult {
    croppedImageUrl: string;
}

interface TransloaditResult {
    ssl_url: string;
    [key: string]: unknown;
}

interface TransloaditAssemblyResult {
    ok: string;
    results: {
        [stepName: string]: TransloaditResult[];
    };
    error?: string;
}

// ============================================================================
// Helpers
// ============================================================================

const TRANSLOADIT_AUTH_KEY = process.env.NEXT_PUBLIC_TRANSLOADIT_KEY || '';

/**
 * Poll assembly status until complete
 */
async function pollAssemblyStatus(
    assemblyUrl: string,
    maxAttempts = 60,
    intervalMs = 1000
): Promise<TransloaditAssemblyResult | null> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
            const response = await fetch(assemblyUrl);
            const data = await response.json() as TransloaditAssemblyResult;

            if (data.ok === 'ASSEMBLY_COMPLETED') {
                return data;
            } else if (data.ok === 'ASSEMBLY_EXECUTING' || data.ok === 'ASSEMBLY_UPLOADING') {
                await new Promise(resolve => setTimeout(resolve, intervalMs));
            } else if (data.error) {
                logger.error('Assembly error', { error: data.error });
                return null;
            }
        } catch (error) {
            logger.error('Polling error', { error });
            await new Promise(resolve => setTimeout(resolve, intervalMs));
        }
    }

    return null;
}

// ============================================================================
// Task Definition
// ============================================================================

export const cropImageTask = task({
    id: "crop-image",
    maxDuration: 180, // 3 minutes max for image processing
    retry: {
        maxAttempts: 3,
        minTimeoutInMs: 1000,
        maxTimeoutInMs: 5000,
        factor: 2,
    },
    run: async (payload: CropImageTaskPayload): Promise<CropImageTaskResult> => {
        const { imageUrl, cropX, cropY, cropWidth, cropHeight } = payload;

        logger.info("Starting crop image task", {
            imageUrl: imageUrl.substring(0, 50) + '...',
            cropX, cropY, cropWidth, cropHeight
        });

        if (!TRANSLOADIT_AUTH_KEY) {
            throw new Error("NEXT_PUBLIC_TRANSLOADIT_KEY is not configured.");
        }

        const params = {
            auth: {
                key: TRANSLOADIT_AUTH_KEY,
            },
            steps: {
                imported: {
                    robot: '/http/import',
                    url: imageUrl,
                },
                cropped: {
                    use: 'imported',
                    robot: '/image/resize',
                    crop: {
                        x1: `${cropX}%`,
                        y1: `${cropY}%`,
                        x2: `${cropX + cropWidth}%`,
                        y2: `${cropY + cropHeight}%`,
                    },
                    result: true,
                },
            },
        };

        try {
            logger.info("Creating Transloadit assembly for crop...");

            const response = await fetch('https://api2.transloadit.com/assemblies', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ params: JSON.stringify(params) }),
            });

            const data = await response.json() as { assembly_ssl_url: string };

            logger.info("Polling assembly status...", { assemblyUrl: data.assembly_ssl_url });

            const result = await pollAssemblyStatus(data.assembly_ssl_url);

            if (result && result.ok === 'ASSEMBLY_COMPLETED') {
                const croppedUrl = result.results.cropped?.[0]?.ssl_url;

                if (!croppedUrl) {
                    throw new Error("No cropped image URL in assembly result");
                }

                logger.info("Crop image task completed", { croppedUrl: croppedUrl.substring(0, 50) + '...' });

                return { croppedImageUrl: croppedUrl };
            }

            throw new Error("Assembly failed to complete");
        } catch (error) {
            logger.error("Crop image error", { error });
            throw error;
        }
    },
});
