/**
 * Internal API types for REST route handlers and typed client.
 * Used by /api/workflows, /api/folders, /api/history.
 */

// ---------------------------------------------------------------------------
// Workflow
// ---------------------------------------------------------------------------

export interface WorkflowListItem {
  id: string;
  name: string;
  thumbnail: string | null;
  folderId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowDetail {
  id: string;
  name: string;
  folderId: string | null;
  nodes: unknown;
  edges: unknown;
  thumbnail: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWorkflowBody {
  name?: string;
  folderId?: string | null;
  nodes?: unknown[];
  edges?: unknown[];
}

export interface UpdateWorkflowBody {
  name?: string;
  folderId?: string | null;
  nodes?: unknown[];
  edges?: unknown[];
  thumbnail?: string;
}

// ---------------------------------------------------------------------------
// Folder
// ---------------------------------------------------------------------------

export interface FolderListItem {
  id: string;
  name: string;
  parentId: string | null;
  fileCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface FolderDetail {
  id: string;
  name: string;
  parentId: string | null;
  fileCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFolderBody {
  name: string;
  parentId?: string | null;
}

export interface UpdateFolderBody {
  name?: string;
  parentId?: string | null;
}

// ---------------------------------------------------------------------------
// History (runs)
// ---------------------------------------------------------------------------

export interface NodeRunDto {
  id: string;
  nodeId: string;
  nodeName: string;
  nodeType: string;
  status: string;
  startedAt: string;
  completedAt: string | null;
  duration: number | null;
  inputData: Record<string, unknown> | null;
  outputData: Record<string, unknown> | null;
  error: string | null;
}

export interface WorkflowRunDto {
  id: string;
  workflowId: string;
  runScope: string;
  status: string;
  startedAt: string;
  completedAt: string | null;
  duration: number | null;
  nodeCount: number;
  nodeRuns: NodeRunDto[];
}

export interface CreateRunBody {
  workflowId: string;
  runScope: 'full' | 'selected' | 'single';
  nodeCount: number;
}

export interface UpdateRunBody {
  status: 'running' | 'completed' | 'failed' | 'partial';
  completedAt?: string;
  duration?: number;
}

export interface AddNodeRunBody {
  nodeId: string;
  nodeName: string;
  nodeType: string;
  inputData?: Record<string, unknown>;
}

export interface UpdateNodeRunBody {
  status: 'running' | 'completed' | 'failed';
  completedAt?: string;
  duration?: number;
  outputData?: Record<string, unknown>;
  error?: string;
}
