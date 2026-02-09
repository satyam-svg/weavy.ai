/**
 * Extract Frame Task - Trigger.dev Task for Video Frame Extraction
 * 
 * This task extracts a single frame from a video at a specified timestamp
 * using Transloadit's video processing.
 */

import { task, logger } from "@trigger.dev/sdk/v3";

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
    maxAttempts = 90,
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

export const extractFrameTask = task({
    id: "extract-video-frame",
    maxDuration: 300, // 5 minutes max for video processing
    retry: {
        maxAttempts: 3,
        minTimeoutInMs: 1000,
        maxTimeoutInMs: 5000,
        factor: 2,
    },
    run: async (payload: ExtractFrameTaskPayload): Promise<ExtractFrameTaskResult> => {
        const { videoUrl, timestamp } = payload;

        logger.info("Starting extract frame task", {
            videoUrl: videoUrl.substring(0, 50) + '...',
            timestamp
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
                    url: videoUrl,
                },
                frame: {
                    use: 'imported',
                    robot: '/video/thumbs',
                    count: 1,
                    offsets: [timestamp],
                    result: true,
                },
            },
        };

        try {
            logger.info("Creating Transloadit assembly for frame extraction...");

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
                const frameUrl = result.results.frame?.[0]?.ssl_url;

                if (!frameUrl) {
                    throw new Error("No frame image URL in assembly result");
                }

                logger.info("Extract frame task completed", { frameUrl: frameUrl.substring(0, 50) + '...' });

                return { frameImageUrl: frameUrl };
            }

            throw new Error("Assembly failed to complete");
        } catch (error) {
            logger.error("Extract frame error", { error });
            throw error;
        }
    },
});
