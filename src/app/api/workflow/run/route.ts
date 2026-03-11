/**
 * Workflow Run API - Single server-side orchestration
 *
 * Client sends the full workflow graph once; server triggers the orchestrator task
 * and returns one run handle. No per-node triggers or client-side polling loops.
 */

import { NextRequest, NextResponse } from 'next/server';
import { tasks } from '@trigger.dev/sdk/v3';
import { workflowRunRequestSchema, parseBody } from '@/lib/api-schemas';
import type { z } from 'zod';

export async function POST(request: NextRequest) {
    try {
        let raw: unknown;
        try {
            raw = await request.json();
        } catch {
            return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
        }

        const parsed = parseBody<z.infer<typeof workflowRunRequestSchema>>(
            workflowRunRequestSchema.safeParse(raw)
        );
        if (!parsed.ok) return parsed.response;

        const { nodes, edges, selectedNodeIds } = parsed.data;

        const handle = await tasks.trigger('workflow-orchestrator', {
            nodes,
            edges,
            ...(selectedNodeIds?.length ? { selectedNodeIds } : {}),
        });

        return NextResponse.json({
            success: true,
            runId: handle.id,
            publicAccessToken: handle.publicAccessToken,
        });
    } catch (error) {
        console.error('Workflow run API error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to start workflow run' },
            { status: 500 }
        );
    }
}
