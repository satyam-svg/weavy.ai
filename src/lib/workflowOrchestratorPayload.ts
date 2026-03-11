/**
 * Server-side payload building for the workflow orchestrator.
 * Builds task payloads from node data + resolved outputs (from upstream nodes).
 * Used only in Trigger.dev orchestrator task; no browser/fetch.
 */

export interface SerialNode {
    id: string;
    type: string;
    data: Record<string, unknown>;
}

export interface SerialEdge {
    source: string;
    target: string;
    sourceHandle?: string | null;
    targetHandle?: string | null;
}

export type ResolvedOutputs = Map<string, Record<string, unknown>>;

/**
 * Get inputs for a node from resolved outputs of upstream nodes (by edges).
 */
export function gatherInputsFromResolved(
    nodeId: string,
    nodes: SerialNode[],
    edges: SerialEdge[],
    resolved: ResolvedOutputs
): Record<string, unknown> {
    const inputs: Record<string, unknown> = {};
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return inputs;

    const incomingEdges = edges.filter((e) => e.target === nodeId);
    for (const edge of incomingEdges) {
        const out = resolved.get(edge.source);
        if (!out) continue;
        const sourceNode = nodes.find((n) => n.id === edge.source);
        if (!sourceNode) continue;

        if (sourceNode.type === 'image') {
            const url = (out as { imageUrl?: string }).imageUrl ?? (out as { images?: { imageUrl?: string }[] }).images?.[0]?.imageUrl;
            if (url) inputs[`source_${edge.source}_imageUrl`] = url;
        } else if (sourceNode.type === 'video') {
            const url = (out as { videoUrl?: string }).videoUrl;
            if (url) inputs[`source_${edge.source}_videoUrl`] = url;
        } else if (sourceNode.type === 'text') {
            const text = (out as { text?: string }).text;
            if (text !== undefined) inputs[`source_${edge.source}_text`] = text;
        } else if (sourceNode.type === 'cropImage') {
            const url = (out as { outputImageUrl?: string }).outputImageUrl ?? (out as { croppedImageUrl?: string }).croppedImageUrl;
            if (url) inputs[`source_${edge.source}_imageUrl`] = url;
        } else if (sourceNode.type === 'extractFrame') {
            const url = (out as { outputFrameUrl?: string }).outputFrameUrl ?? (out as { frameImageUrl?: string }).frameImageUrl;
            if (url) inputs[`source_${edge.source}_imageUrl`] = url;
        } else if (sourceNode.type === 'llm') {
            const text = (out as { output?: string }).output;
            if (text !== undefined) inputs[`source_${edge.source}_text`] = text;
        }
    }
    return inputs;
}

/**
 * LLM-specific: gather system_prompt, user_message, images from edges + resolved.
 */
export function gatherLLMInputsFromResolved(
    nodeId: string,
    nodes: SerialNode[],
    edges: SerialEdge[],
    resolved: ResolvedOutputs
): { systemPrompt?: string; userMessage?: string; imageUrls: string[] } {
    const result: { systemPrompt?: string; userMessage?: string; imageUrls: string[] } = { imageUrls: [] };
    const incomingEdges = edges.filter((e) => e.target === nodeId);

    for (const edge of incomingEdges) {
        const sourceNode = nodes.find((n) => n.id === edge.source);
        const out = resolved.get(edge.source);
        if (!sourceNode || !out) continue;

        switch (edge.targetHandle) {
            case 'system_prompt':
                if (sourceNode.type === 'text') result.systemPrompt = (out as { text?: string }).text;
                else if (sourceNode.type === 'llm') result.systemPrompt = (out as { output?: string }).output;
                break;
            case 'user_message':
                if (sourceNode.type === 'text') result.userMessage = (out as { text?: string }).text;
                else if (sourceNode.type === 'llm') result.userMessage = (out as { output?: string }).output;
                break;
            case 'images':
                if (sourceNode.type === 'image') {
                    const images = (out as { images?: { imageUrl?: string }[] }).images;
                    if (images) result.imageUrls.push(...images.map((i) => i.imageUrl).filter(Boolean) as string[]);
                } else if (sourceNode.type === 'cropImage') {
                    const u = (out as { outputImageUrl?: string }).outputImageUrl ?? (out as { croppedImageUrl?: string }).croppedImageUrl;
                    if (u) result.imageUrls.push(u);
                } else if (sourceNode.type === 'extractFrame') {
                    const u = (out as { outputFrameUrl?: string }).outputFrameUrl ?? (out as { frameImageUrl?: string }).frameImageUrl;
                    if (u) result.imageUrls.push(u);
                }
                break;
        }
    }
    return result;
}

export interface CropPayload {
    imageUrl: string;
    cropX: number;
    cropY: number;
    cropWidth: number;
    cropHeight: number;
}

export interface ExtractFramePayload {
    videoUrl: string;
    timestamp: number;
}

export interface LLMPayload {
    model: string;
    systemPrompt?: string;
    userMessage: string;
    images?: string[];
}

export type TaskPayload = { type: 'crop-image'; payload: CropPayload } | { type: 'extract-frame'; payload: ExtractFramePayload } | { type: 'llm'; payload: LLMPayload };

/**
 * Build the task payload for an executable node from node data + resolved outputs.
 * Returns null if node is a source (no task) or if required inputs are missing.
 */
export function buildTaskPayload(
    node: SerialNode,
    nodes: SerialNode[],
    edges: SerialEdge[],
    resolved: ResolvedOutputs
): TaskPayload | null {
    const inputs = gatherInputsFromResolved(node.id, nodes, edges, resolved);

    if (node.type === 'cropImage') {
        const data = node.data as { inputImageUrl?: string; cropX: number; cropY: number; cropWidth: number; cropHeight: number };
        const imageUrl =
            data.inputImageUrl ||
            (Object.values(inputs).find((v) => typeof v === 'string' && (v.startsWith('http') || v.startsWith('data:'))) as string | undefined);
        if (!imageUrl) return null;
        return {
            type: 'crop-image',
            payload: {
                imageUrl,
                cropX: data.cropX,
                cropY: data.cropY,
                cropWidth: data.cropWidth,
                cropHeight: data.cropHeight,
            },
        };
    }

    if (node.type === 'extractFrame') {
        const data = node.data as { inputVideoUrl?: string; timestamp: number };
        const videoUrl =
            data.inputVideoUrl ||
            (Object.values(inputs).find((v) => typeof v === 'string' && (v.startsWith('http') || v.startsWith('blob:'))) as string | undefined);
        if (!videoUrl) return null;
        return { type: 'extract-frame', payload: { videoUrl, timestamp: data.timestamp } };
    }

    if (node.type === 'llm') {
        const data = node.data as { model: string; systemPrompt?: string; userMessage?: string; images?: string[] };
        const llmInputs = gatherLLMInputsFromResolved(node.id, nodes, edges, resolved);
        const userMessage = llmInputs.userMessage ?? data.userMessage ?? '';
        if (!userMessage.trim()) return null;
        return {
            type: 'llm',
            payload: {
                model: data.model,
                systemPrompt: llmInputs.systemPrompt ?? data.systemPrompt,
                userMessage,
                images: llmInputs.imageUrls.length > 0 ? llmInputs.imageUrls : data.images,
            },
        };
    }

    return null;
}

/**
 * Get resolved output for a source node (image, video, text) from its data.
 */
export function getSourceNodeOutput(node: SerialNode): Record<string, unknown> {
    if (node.type === 'image') {
        const images = (node.data as { images?: { imageUrl: string }[] }).images;
        const imageUrl = images?.[0]?.imageUrl ?? 'No image uploaded';
        return { type: 'image', imageUrl, images: node.data.images };
    }
    if (node.type === 'video') {
        const videoUrl = (node.data as { videoUrl?: string }).videoUrl ?? 'No video uploaded';
        return { type: 'video', videoUrl };
    }
    if (node.type === 'text') {
        const text = (node.data as { text?: string }).text ?? '';
        return { type: 'text', text };
    }
    return {};
}
