'use client';

import * as React from 'react';
import { Position, type NodeProps } from '@xyflow/react';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { useWorkflowStore, type WorkflowState } from '@/stores/workflowStore';
import { urlToBase64 } from '@/lib/transloadit';
import {
  type LLMFlowNode,
  GEMINI_MODELS,
  LLM_HANDLES,
} from '@/types/workflow.types';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Lock, Play, Sparkles, X } from 'lucide-react';

import {
  NodeShell,
  HandleWithLabel,
  RenameDialog,
  NodeDropdownMenu,
} from '../primitives';

// Types for Trigger.dev task API
interface TriggerTaskResponse {
  success: boolean;
  runId: string;
  publicAccessToken?: string;
  error?: string;
}

interface TriggerPollResponse {
  runId: string;
  status: string;
  output?: { output: string };
  error?: string | unknown; // API may return object from Trigger.dev
  isCompleted: boolean;
  isFailed: boolean;
}

/** Normalize any error value to a display string (avoids "[object Object]") */
function errorToMessage(err: unknown): string {
  if (err == null) return 'Unknown error';
  if (typeof err === 'string') return err;
  if (err instanceof Error) return err.message;
  if (typeof (err as { message?: string }).message === 'string') return (err as Error).message;
  return typeof err === 'object' ? JSON.stringify(err) : String(err);
}

/**
 * LLMNode Component
 * 
 * A node for running LLM inference via Trigger.dev.
 * Features:
 * - Model selector dropdown
 * - Input handles for system_prompt, user_message, and images
 * - Output handle for LLM response
 * - Editable result text field
 * - Pulsating glow when running
 * - Run button with loading state
 * - Error display
 */
export function LLMNode({ id, data, selected }: NodeProps<LLMFlowNode>) {
  const updateNodeData = useWorkflowStore((s: WorkflowState) => s.updateNodeData);
  const getConnectedInputs = useWorkflowStore((s: WorkflowState) => s.getConnectedInputs);
  const propagateOutput = useWorkflowStore((s: WorkflowState) => s.propagateOutput);
  const addTask = useWorkflowStore((s: WorkflowState) => s.addTask);
  const updateTask = useWorkflowStore((s: WorkflowState) => s.updateTask);
  // Workflow history functions
  const queryClient = useQueryClient();
  const workflowId = useWorkflowStore((s: WorkflowState) => s.workflowId);
  const startRun = useWorkflowStore((s: WorkflowState) => s.startRun);
  const addNodeToRun = useWorkflowStore((s: WorkflowState) => s.addNodeToRun);
  const completeNodeRun = useWorkflowStore((s: WorkflowState) => s.completeNodeRun);
  const completeRun = useWorkflowStore((s: WorkflowState) => s.completeRun);

  const [renameDialogOpen, setRenameDialogOpen] = React.useState(false);
  const [newLabel, setNewLabel] = React.useState(data.label || 'Run Any LLM');

  const displayLabel = data.label || 'Run Any LLM';
  const isLocked = data.isLocked || false;
  const isLoading = data.isLoading || false;

  const handleRename = () => {
    if (newLabel.trim()) {
      updateNodeData<LLMFlowNode>(id, { label: newLabel.trim() });
    }
    setRenameDialogOpen(false);
  };

  const toggleLock = () => {
    updateNodeData<LLMFlowNode>(id, { isLocked: !isLocked });
  };

  // Poll for task completion
  const pollTaskResult = async (runId: string): Promise<TriggerPollResponse> => {
    const maxAttempts = 120; // 2 minutes max
    const intervalMs = 1000;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const response = await fetch(`/api/trigger?runId=${runId}`);
      const result: TriggerPollResponse = await response.json();

      if (result.isCompleted || result.isFailed) {
        return result;
      }

      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }

    throw new Error('Task timed out');
  };

  const handleRun = async () => {
    updateNodeData<LLMFlowNode>(id, { isLoading: true, error: undefined });

    const taskId = addTask(id, displayLabel);

    // Start workflow history run for this individual node
    let runId: string | null = null;
    let nodeRunId: string | null = null;

    if (workflowId) {
      runId = await startRun(workflowId, 'single', [id]);
    }

    try {
      const inputs = getConnectedInputs(id);

      const systemPrompt = inputs.systemPrompt || data.systemPrompt;
      const userMessage = inputs.userMessage || data.userMessage || '';

      // Collect all images (base64 and URLs converted to base64)
      let allImages: string[] = inputs.images.length > 0 ? [...inputs.images] : (data.images ? [...data.images] : []);

      // Convert any connected image URLs to base64
      if (inputs.imageUrls && inputs.imageUrls.length > 0) {
        const urlPromises = inputs.imageUrls.map(url => urlToBase64(url));
        const base64Results = await Promise.all(urlPromises);
        base64Results.forEach(base64 => {
          if (base64) {
            allImages.push(base64);
          }
        });
      }

      // Record node run to history BEFORE validation to capture errors
      const inputData = {
        model: data.model,
        systemPrompt,
        userMessage: userMessage || '(not provided)',
        imageCount: allImages.length,
      };

      if (runId) {
        nodeRunId = await addNodeToRun(runId, id, displayLabel, 'llm', inputData);
      }

      // Validate user message AFTER recording to history
      if (!userMessage.trim()) {
        throw new Error('User message is required. Connect a Text node to the user_message input.');
      }

      // Trigger the Trigger.dev task
      const triggerResponse = await fetch('/api/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskType: 'llm',
          payload: {
            model: data.model,
            systemPrompt,
            userMessage,
            images: allImages,
          },
        }),
      });

      const triggerResult: TriggerTaskResponse = await triggerResponse.json();

      if (!triggerResult.success || !triggerResult.runId) {
        throw new Error(errorToMessage(triggerResult.error) || 'Failed to trigger LLM task');
      }

      // Poll for completion
      const pollResult = await pollTaskResult(triggerResult.runId);

      if (pollResult.isFailed) {
        throw new Error(errorToMessage(pollResult.error) || 'LLM task failed');
      }

      const output = pollResult.output?.output || '';

      updateNodeData<LLMFlowNode>(id, {
        output,
        isLoading: false,
        error: undefined,
      });

      updateTask(taskId, { status: 'completed', completedAt: new Date() });
      propagateOutput(id, output);

      // Complete node run and workflow run in history
      if (nodeRunId) {
        await completeNodeRun(nodeRunId, 'completed', { output });
      }
      if (runId) {
        await completeRun(runId, 'completed');
        const prev = queryClient.getQueryData<{ totalCredit: number }>(['user', 'credits']);
        const next = Math.max(0, (prev?.totalCredit ?? 100) - 5);
        queryClient.setQueryData(['user', 'credits'], { totalCredit: next });
        queryClient.invalidateQueries({ queryKey: ['user', 'credits'] });
      }

    } catch (error) {
      const message = errorToMessage(error);
      updateNodeData<LLMFlowNode>(id, {
        isLoading: false,
        error: message,
      });

      updateTask(taskId, {
        status: 'failed',
        completedAt: new Date(),
        error: message,
      });

      // Record failure in history
      if (nodeRunId) {
        await completeNodeRun(nodeRunId, 'failed', undefined, message);
      }
      if (runId) {
        await completeRun(runId, 'failed');
      }
    }
  };

  const handleOutputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newOutput = e.target.value;
    updateNodeData<LLMFlowNode>(id, { output: newOutput });
    propagateOutput(id, newOutput);
  };

  return (
    <div className={cn("relative group/node", isLoading && "node-running-glow rounded-xl")}>
      {/* Input Handles */}
      <div className="absolute left-0 top-0 h-full flex flex-col justify-center gap-8" style={{ transform: 'translateX(-6px)' }}>
        <HandleWithLabel
          type="target"
          position={Position.Left}
          id={LLM_HANDLES.SYSTEM_PROMPT}
          nodeId={id}
          label="system_prompt"
          color="magenta"
          style={{ position: 'relative', top: 0 }}
        />
        <HandleWithLabel
          type="target"
          position={Position.Left}
          id={LLM_HANDLES.USER_MESSAGE}
          nodeId={id}
          label="user_message"
          color="magenta"
          style={{ position: 'relative', top: 0 }}
        />
        <HandleWithLabel
          type="target"
          position={Position.Left}
          id={LLM_HANDLES.IMAGES}
          nodeId={id}
          label="images"
          color="cyan"
          style={{ position: 'relative', top: 0 }}
        />
      </div>

      {/* Output Handle */}
      <div className="absolute right-0 top-1/2 -translate-y-1/2" style={{ transform: 'translate(6px, -50%)' }}>
        <HandleWithLabel
          type="source"
          position={Position.Right}
          id={LLM_HANDLES.OUTPUT}
          nodeId={id}
          label="output"
          color="green"
        />
      </div>

      <NodeShell
        title={displayLabel}
        icon={<Sparkles className="h-4 w-4" />}
        selected={selected}
        className="w-90"
        right={
          <div className="flex items-center gap-1">
            {isLocked && <Lock className="h-4 w-4 text-foreground/50" />}
            <NodeDropdownMenu
              nodeId={id}
              label={displayLabel}
              isLocked={isLocked}
              onToggleLock={toggleLock}
              onOpenRename={() => {
                setNewLabel(displayLabel);
                setRenameDialogOpen(true);
              }}
            />
          </div>
        }
      >
        <div className="space-y-4">
          {/* Model Selector */}
          <div>
            <label className="text-xs text-foreground/60 mb-1 block">Model</label>
            <Select
              value={data.model}
              onValueChange={(value) =>
                updateNodeData<LLMFlowNode>(id, { model: value as LLMFlowNode['data']['model'] })
              }
            >
              <SelectTrigger className="nodrag w-full bg-muted/40">
                <SelectValue placeholder="Select model" />
              </SelectTrigger>
              <SelectContent>
                {GEMINI_MODELS.map((model) => (
                  <SelectItem key={model.value} value={model.value}>
                    {model.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[10px] text-foreground/50 mt-1">
              If 1.5 Flash shows quota error, use Gemini 2.5 Flash.
            </p>
          </div>

          {/* Error Display - normalize so we never show [object Object] */}
          {data.error != null && data.error !== '' && (
            <div
              className={cn(
                'rounded-lg p-3 text-sm',
                'bg-red-500/10 text-red-400 border border-red-500/30'
              )}
            >
              <div className="flex items-start gap-2">
                <X className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{typeof data.error === 'string' ? data.error : errorToMessage(data.error)}</span>
              </div>
            </div>
          )}

          {/* Run Button */}
          <Button
            onClick={handleRun}
            disabled={isLoading}
            className="w-full bg-black hover:bg-black/90 text-white"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Run
              </>
            )}
          </Button>

          {/* Result Output - Editable Text Field */}
          {(data.output || isLoading) && (
            <div>
              <label className="text-xs text-foreground/60 mb-1 block">Result</label>
              <Textarea
                value={data.output || ''}
                onChange={handleOutputChange}
                placeholder={isLoading ? 'Generating response...' : 'LLM output will appear here...'}
                className="nodrag min-h-25 max-h-50 resize-y bg-muted/40 text-sm"
                disabled={isLoading}
              />
            </div>
          )}
        </div>
      </NodeShell>

      <RenameDialog
        open={renameDialogOpen}
        onOpenChange={setRenameDialogOpen}
        value={newLabel}
        onChange={setNewLabel}
        onSubmit={handleRename}
      />
    </div>
  );
}
