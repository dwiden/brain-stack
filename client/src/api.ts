const API = 'http://localhost:3001/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  return res.json();
}

function stackQuery(stackId?: string | null) {
  return stackId ? `?stack_id=${stackId}` : '';
}

export const api = {
  // Stacks
  getStacks: () => request<any[]>('/stacks'),
  createStack: (name: string) =>
    request<any>('/stacks', { method: 'POST', body: JSON.stringify({ name }) }),
  updateStack: (id: string, name: string) =>
    request<any>(`/stacks/${id}`, { method: 'PATCH', body: JSON.stringify({ name }) }),
  deleteStack: (id: string) =>
    request<any>(`/stacks/${id}`, { method: 'DELETE' }),

  // Items
  getItems: (stackId?: string | null) => request<any[]>(`/items${stackQuery(stackId)}`),
  getArchivedItems: (stackId?: string | null) => request<any[]>(`/items/archived${stackQuery(stackId)}`),
  getStaleItems: (stackId?: string | null) => request<any[]>(`/items/stale${stackQuery(stackId)}`),
  createItem: (data: { title: string; description?: string; subtasks?: { title: string }[]; stack_id?: string | null }) =>
    request<any>('/items', { method: 'POST', body: JSON.stringify(data) }),
  updateItem: (id: string, data: { title?: string; description?: string; stack_id?: string | null; decay_enabled?: boolean }) =>
    request<any>(`/items/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  reorderItems: (orderedIds: string[]) =>
    request<any[]>('/items/reorder', { method: 'PUT', body: JSON.stringify({ orderedIds }) }),
  touchItem: (id: string) =>
    request<any>(`/items/${id}/touch`, { method: 'POST' }),
  archiveItem: (id: string) =>
    request<any>(`/items/${id}/archive`, { method: 'POST' }),
  unarchiveItem: (id: string) =>
    request<any>(`/items/${id}/unarchive`, { method: 'POST' }),
  deleteItem: (id: string) =>
    request<any>(`/items/${id}`, { method: 'DELETE' }),
  addSubtask: (itemId: string, title: string) =>
    request<any>(`/items/${itemId}/subtasks`, { method: 'POST', body: JSON.stringify({ title }) }),
  toggleSubtask: (id: string, completed: boolean) =>
    request<any>(`/subtasks/${id}`, { method: 'PATCH', body: JSON.stringify({ completed }) }),
  updateSubtask: (id: string, title: string) =>
    request<any>(`/subtasks/${id}`, { method: 'PATCH', body: JSON.stringify({ title }) }),
  deleteSubtask: (id: string) =>
    request<any>(`/subtasks/${id}`, { method: 'DELETE' }),
};
