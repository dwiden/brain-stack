export type Subtask = {
  id: string;
  item_id: string;
  title: string;
  completed: boolean;
  sort_order: number;
}

export type StackItem = {
  id: string;
  title: string;
  description: string;
  priority: number;
  created_at: string;
  last_touched_at: string;
  archived: boolean;
  archived_at: string | null;
  decay_enabled: boolean;
  daysOnStack: number;
  subtasks: Subtask[];
}
