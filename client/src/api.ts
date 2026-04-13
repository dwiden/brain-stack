const API = 'http://localhost:3001/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  return res.json();
}

export const api = {
  getItems: () => request<any[]>('/items'),
  getArchivedItems: () => request<any[]>('/items/archived'),
  getStaleItems: () => request<any[]>('/items/stale'),
  createItem: (data: { title: string; description?: string; subtasks?: { title: string }[] }) =>
    request<any>('/items', { method: 'POST', body: JSON.stringify(data) }),
  updateItem: (id: string, data: { title?: string; description?: string }) =>
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
  deleteSubtask: (id: string) =>
    request<any>(`/subtasks/${id}`, { method: 'DELETE' }),
};
