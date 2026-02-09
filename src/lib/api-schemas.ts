/**
 * Zod schemas for API request validation.
 * Used in route handlers to validate and parse request bodies.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';

// ---------------------------------------------------------------------------
// Workflow
// ---------------------------------------------------------------------------

export const createWorkflowSchema = z.object({
  name: z.string().max(500).optional(),
  folderId: z.string().nullable().optional(),
  nodes: z.array(z.unknown()).optional(),
  edges: z.array(z.unknown()).optional(),
});

export const updateWorkflowSchema = z.object({
  name: z.string().min(1).max(500).optional(),
  folderId: z.string().nullable().optional(),
  nodes: z.array(z.unknown()).optional(),
  edges: z.array(z.unknown()).optional(),
  thumbnail: z.string().max(2000).optional(),
});

// ---------------------------------------------------------------------------
// Folder
// ---------------------------------------------------------------------------

export const createFolderSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  parentId: z.string().nullable().optional(),
});

export const updateFolderSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  parentId: z.string().nullable().optional(),
});

// ---------------------------------------------------------------------------
// History (runs)
// ---------------------------------------------------------------------------

export const createRunSchema = z.object({
  workflowId: z.string().min(1, 'workflowId is required'),
  runScope: z.enum(['full', 'selected', 'single']),
  nodeCount: z.number().int().min(0),
});

export const updateRunSchema = z.object({
  status: z.enum(['running', 'completed', 'failed', 'partial']),
  completedAt: z.string().optional(),
  duration: z.number().int().min(0).optional(),
});

export const addNodeRunSchema = z.object({
  nodeId: z.string().min(1, 'nodeId is required'),
  nodeName: z.string().min(1, 'nodeName is required'),
  nodeType: z.string().min(1, 'nodeType is required'),
  inputData: z.record(z.string(), z.unknown()).optional(),
});

export const updateNodeRunSchema = z.object({
  status: z.enum(['running', 'completed', 'failed']),
  completedAt: z.string().optional(),
  duration: z.number().int().min(0).optional(),
  outputData: z.record(z.string(), z.unknown()).optional(),
  error: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Trigger (task payloads)
// ---------------------------------------------------------------------------

export const triggerRequestSchema = z.object({
  taskType: z.enum(['llm', 'crop-image', 'extract-frame']),
  payload: z.record(z.string(), z.unknown()),
});

// ---------------------------------------------------------------------------
// Helper: parse and return 400 on validation error
// ---------------------------------------------------------------------------

export function parseBody<T>(
  result: { success: true; data: T } | { success: false; error: z.ZodError }
): { ok: true; data: T } | { ok: false; response: NextResponse } {
  if (result.success) {
    return { ok: true, data: result.data };
  }
  const errors = result.error.flatten();
  const message = errors.formErrors?.[0] ?? errors.fieldErrors ? Object.values(errors.fieldErrors).flat()[0] : 'Validation failed';
  const response = NextResponse.json(
    { error: typeof message === 'string' ? message : 'Validation failed', details: errors.fieldErrors },
    { status: 400 }
  );
  return { ok: false, response };
}
