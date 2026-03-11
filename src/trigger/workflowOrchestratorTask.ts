/**
 * Workflow Orchestrator Task - Server-side Trigger.dev orchestration
 *
 * Receives the full workflow graph, computes execution order (DAG), and fans out
 * to child tasks (llm, crop-image, extract-frame). No browser polling; one run handle.
 */

import { task, logger, tasks, runs } from "@trigger.dev/sdk/v3";
import { createExecutionPlan, getConnectedNodes } from "@/lib/dagExecution";
import type { WorkflowNode, WorkflowEdge } from "@/types/workflow.types";
import {
    type SerialNode,
    type SerialEdge,
    type ResolvedOutputs,
    buildTaskPayload,
    getSourceNodeOutput,
} from "@/lib/workflowOrchestratorPayload";
import type { LLMTaskPayload } from "./llmTask";
import type { CropImageTaskPayload } from "./cropImageTask";
import type { ExtractFrameTaskPayload } from "./extractFrameTask";

// ============================================================================
// Payload & Result Types
// ============================================================================

export interface WorkflowOrchestratorPayload {
    /** Serializable nodes: id, type, data */
    nodes: SerialNode[];
    /** Edges: source, target, optional handles */
    edges: SerialEdge[];
    /** Optional: run only these node ids (selected run) */
    selectedNodeIds?: string[];
}

export interface WorkflowOrchestratorResult {
    status: "completed" | "partial" | "failed";
    /** nodeId -> output for each executed node (for client to update UI) */
    nodeOutputs: Record<string, Record<string, unknown>>;
    /** nodeId -> error message for failed nodes */
    errors?: Record<string, string>;
}

// ============================================================================
// Helpers: trigger child task and wait for result (server-side, no polling from client)
// ============================================================================

async function triggerAndWaitForRun(
    taskId: string,
    payload: Record<string, unknown>
): Promise<{ output?: Record<string, unknown>; error?: string }> {
    const handle = await tasks.trigger(taskId, payload as Record<string, unknown>);
    const maxAttempts = 300;
    const intervalMs = 1000;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const run = await runs.retrieve(handle.id);
        if (run.status === "COMPLETED") {
            return { output: run.output as Record<string, unknown> };
        }
        if (
            run.status === "FAILED" ||
            run.status === "CANCELED" ||
            run.status === "SYSTEM_FAILURE" ||
            run.status === "CRASHED" ||
            run.status === "EXPIRED"
        ) {
            const err =
                run.error == null
                    ? "Task failed"
                    : typeof run.error === "string"
                      ? run.error
                      : (run.error as Error)?.message ?? JSON.stringify(run.error);
            return { error: err };
        }
        await new Promise((r) => setTimeout(r, intervalMs));
    }
    return { error: "Task timed out" };
}

// ============================================================================
// Task Definition
// ============================================================================

export const workflowOrchestratorTask = task({
    id: "workflow-orchestrator",
    maxDuration: 3600, // 1 hour for full workflow
    run: async (payload: WorkflowOrchestratorPayload): Promise<WorkflowOrchestratorResult> => {
        const { nodes: serialNodes, edges: serialEdges, selectedNodeIds } = payload;

        // Cast to workflow types for DAG (only id / source/target are used)
        const nodes = serialNodes as unknown as WorkflowNode[];
        const edges = serialEdges as unknown as WorkflowEdge[];

        const connectedNodes = selectedNodeIds
            ? nodes.filter((n) => selectedNodeIds.includes(n.id))
            : getConnectedNodes(nodes, edges);

        if (connectedNodes.length === 0) {
            return { status: "completed", nodeOutputs: {} };
        }

        const plan = createExecutionPlan(nodes, edges, selectedNodeIds ?? undefined);
        if (!plan.isValidDAG) {
            logger.error("Invalid DAG", { error: plan.error });
            return {
                status: "failed",
                nodeOutputs: {},
                errors: { _graph: plan.error ?? "Invalid workflow" },
            };
        }

        const connectedIds = new Set(connectedNodes.map((n) => n.id));
        const connectedSerialNodes = serialNodes.filter((n) => connectedIds.has(n.id));

        const resolved: ResolvedOutputs = new Map();
        const nodeOutputs: Record<string, Record<string, unknown>> = {};
        const errors: Record<string, string> = {};

        for (const batch of plan.batches) {
            for (const nodeId of batch.nodeIds) {
                const serialNode = connectedSerialNodes.find((n) => n.id === nodeId);
                if (!serialNode) continue;

                if (serialNode.type === "image" || serialNode.type === "video" || serialNode.type === "text") {
                    const out = getSourceNodeOutput(serialNode);
                    resolved.set(serialNode.id, out);
                    nodeOutputs[serialNode.id] = out;
                    continue;
                }

                const taskSpec = buildTaskPayload(serialNode, serialNodes, serialEdges, resolved);
                if (!taskSpec) {
                    errors[serialNode.id] = "Missing required inputs";
                    continue;
                }

                let taskId: string;
                let taskPayload: Record<string, unknown>;

                if (taskSpec.type === "crop-image") {
                    taskId = "crop-image";
                    taskPayload = taskSpec.payload as unknown as CropImageTaskPayload;
                } else if (taskSpec.type === "extract-frame") {
                    taskId = "extract-video-frame";
                    taskPayload = taskSpec.payload as unknown as ExtractFrameTaskPayload;
                } else {
                    taskId = "llm-gemini";
                    taskPayload = taskSpec.payload as unknown as LLMTaskPayload;
                }

                logger.info("Triggering child task", { nodeId: serialNode.id, taskId });
                const result = await triggerAndWaitForRun(taskId, taskPayload);

                if (result.error) {
                    errors[serialNode.id] = result.error;
                    logger.error("Child task failed", { nodeId: serialNode.id, error: result.error });
                    continue;
                }

                const output = result.output ?? {};
                resolved.set(serialNode.id, output);

                if (taskSpec.type === "crop-image") {
                    nodeOutputs[serialNode.id] = { outputImageUrl: (output as { croppedImageUrl?: string }).croppedImageUrl };
                } else if (taskSpec.type === "extract-frame") {
                    nodeOutputs[serialNode.id] = { outputFrameUrl: (output as { frameImageUrl?: string }).frameImageUrl };
                } else {
                    nodeOutputs[serialNode.id] = { output: (output as { output?: string }).output };
                }
            }
        }

        const hasErrors = Object.keys(errors).length > 0;
        const hasOutputs = Object.keys(nodeOutputs).length > 0;
        const status: WorkflowOrchestratorResult["status"] = hasErrors
            ? hasOutputs
                ? "partial"
                : "failed"
            : "completed";

        return { status, nodeOutputs, errors: Object.keys(errors).length > 0 ? errors : undefined };
    },
});
