/**
 * Typed API client for internal Next.js API routes.
 * Replaces tRPC vanilla client. Uses same-origin fetch (Clerk cookies sent automatically).
 */

import type {
  WorkflowListItem,
  WorkflowDetail,
  CreateWorkflowBody,
  UpdateWorkflowBody,
  FolderListItem,
  FolderDetail,
  CreateFolderBody,
  UpdateFolderBody,
  WorkflowRunDto,
  NodeRunDto,
  CreateRunBody,
  UpdateRunBody,
  AddNodeRunBody,
  UpdateNodeRunBody,
} from '@/lib/api-types';

const BASE = '';

type RequestOptions = Omit<RequestInit, 'body'> & { body?: unknown };

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, ...rest } = options;
  const init: RequestInit = {
    ...rest,
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(rest.headers as Record<string, string>),
    },
  };
  if (body !== undefined && method !== 'GET') {
    init.body = JSON.stringify(body);
  }
  const res = await fetch(`${BASE}${path}`, { credentials: 'include', ...init });
  const data = await res.json();
  if (!res.ok) {
    const err = new Error((data as { error?: string }).error ?? 'Request failed');
    (err as Error & { status?: number }).status = res.status;
    throw err;
  }
  return data as T;
}

// ---------------------------------------------------------------------------
// Workflows
// ---------------------------------------------------------------------------

export const workflowApi = {
  list: (params?: { folderId?: string | null }) => {
    const q = new URLSearchParams();
    if (params?.folderId !== undefined) {
      q.set('folderId', params.folderId ?? '');
    }
    const query = q.toString();
    return request<{ workflows: WorkflowListItem[] }>(
      `/api/workflows${query ? `?${query}` : ''}`
    );
  },

  getById: (id: string) =>
    request<{ workflow: WorkflowDetail }>(`/api/workflows/${id}`),

  create: (body: CreateWorkflowBody) =>
    request<{ workflow: WorkflowDetail }>('/api/workflows', {
      method: 'POST',
      body,
    }),

  update: (id: string, body: UpdateWorkflowBody) =>
    request<{ workflow: WorkflowDetail }>(`/api/workflows/${id}`, {
      method: 'PATCH',
      body,
    }),

  delete: (id: string) =>
    request<{ message: string }>(`/api/workflows/${id}`, { method: 'DELETE' }),
};

// ---------------------------------------------------------------------------
// Folders
// ---------------------------------------------------------------------------

export const folderApi = {
  list: (params?: { parentId?: string | null }) => {
    const q = new URLSearchParams();
    if (params?.parentId !== undefined) {
      q.set('parentId', params.parentId ?? '');
    }
    const query = q.toString();
    return request<{ folders: FolderListItem[] }>(
      `/api/folders${query ? `?${query}` : ''}`
    );
  },

  getById: (id: string) =>
    request<{ folder: FolderDetail }>(`/api/folders/${id}`),

  create: (body: CreateFolderBody) =>
    request<{ folder: FolderDetail }>('/api/folders', {
      method: 'POST',
      body,
    }),

  update: (id: string, body: UpdateFolderBody) =>
    request<{ folder: FolderDetail }>(`/api/folders/${id}`, {
      method: 'PATCH',
      body,
    }),

  delete: (id: string) =>
    request<{ message: string }>(`/api/folders/${id}`, { method: 'DELETE' }),
};

// ---------------------------------------------------------------------------
// History (runs)
// ---------------------------------------------------------------------------

export const historyApi = {
  createRun: (body: CreateRunBody) =>
    request<{ run: WorkflowRunDto }>('/api/history/runs', {
      method: 'POST',
      body,
    }),

  updateRun: (runId: string, body: UpdateRunBody) =>
    request<{ run: WorkflowRunDto }>(`/api/history/runs/${runId}`, {
      method: 'PATCH',
      body: {
        ...body,
        completedAt: body.completedAt ?? new Date().toISOString(),
      },
    }),

  getRunDetails: (runId: string) =>
    request<{ run: WorkflowRunDto }>(`/api/history/runs/${runId}`),

  getRunsByWorkflow: (workflowId: string, limit = 50) =>
    request<{ runs: WorkflowRunDto[] }>(
      `/api/history/workflows/${workflowId}/runs${limit !== 50 ? `?limit=${limit}` : ''}`
    ),

  deleteRun: (runId: string) =>
    request<{ success: boolean }>(`/api/history/runs/${runId}`, {
      method: 'DELETE',
    }),

  addNodeRun: (runId: string, body: AddNodeRunBody) =>
    request<{ nodeRun: NodeRunDto }>(`/api/history/runs/${runId}/nodes`, {
      method: 'POST',
      body,
    }),

  updateNodeRun: (nodeRunId: string, body: UpdateNodeRunBody) =>
    request<{ nodeRun: NodeRunDto }>(`/api/history/nodes/${nodeRunId}`, {
      method: 'PATCH',
      body: {
        ...body,
        completedAt: body.completedAt ?? new Date().toISOString(),
      },
    }),

  clearWorkflowHistory: (workflowId: string) =>
    request<{ success: boolean }>(
      `/api/history/workflows/${workflowId}/clear`,
      { method: 'POST' }
    ),
};

// ---------------------------------------------------------------------------
// User (credits)
// ---------------------------------------------------------------------------

export const userApi = {
  getCredits: () =>
    request<{ totalCredit: number }>('/api/user/credits'),
};

export default { workflowApi, folderApi, historyApi, userApi };
