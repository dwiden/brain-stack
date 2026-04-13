export interface Subtask {
  id: string;
  item_id: string;
  title: string;
  completed: boolean;
  sort_order: number;
}

export interface StackItem {
  id: string;
  title: string;
  description: string;
  priority: number;
  created_at: string;
  last_touched_at: string;
  archived: boolean;
  archived_at: string | null;
  daysOnStack: number;
  daysSinceTouched: number;
  effectivePriority: number;
  subtasks: Subtask[];
}
