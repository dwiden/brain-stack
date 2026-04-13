import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { StackItem } from '../types';
import { api } from '../api';

interface Props {
  item: StackItem;
  index: number;
  onRefresh: () => void;
}

export function StackItemCard({ item, index, onRefresh }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(item.title);
  const [description, setDescription] = useState(item.description);
  const [newSubtask, setNewSubtask] = useState('');

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const completedCount = item.subtasks.filter(s => s.completed).length;
  const totalSubtasks = item.subtasks.length;

  const handleSave = async () => {
    await api.updateItem(item.id, { title, description });
    setEditing(false);
    onRefresh();
  };

  const handleAddSubtask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtask.trim()) return;
    await api.addSubtask(item.id, newSubtask.trim());
    setNewSubtask('');
    onRefresh();
  };

  const handleToggleSubtask = async (id: string, completed: boolean) => {
    await api.toggleSubtask(id, !completed);
    onRefresh();
  };

  const handleDeleteSubtask = async (id: string) => {
    await api.deleteSubtask(id);
    onRefresh();
  };

  const handleArchive = async () => {
    await api.archiveItem(item.id);
    onRefresh();
  };

  const handleDelete = async () => {
    if (confirm('Permanently delete this item?')) {
      await api.deleteItem(item.id);
      onRefresh();
    }
  };

  const priorityColor = index === 0 ? '#ef4444' : index === 1 ? '#f97316' : index === 2 ? '#eab308' : '#6b7280';

  return (
    <div ref={setNodeRef} style={style} className="stack-item">
      <div className="stack-item-header">
        <div className="drag-handle" {...attributes} {...listeners}>
          <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor">
            <circle cx="5" cy="3" r="1.5" />
            <circle cx="11" cy="3" r="1.5" />
            <circle cx="5" cy="8" r="1.5" />
            <circle cx="11" cy="8" r="1.5" />
            <circle cx="5" cy="13" r="1.5" />
            <circle cx="11" cy="13" r="1.5" />
          </svg>
        </div>

        <span className="priority-badge" style={{ backgroundColor: priorityColor }}>
          #{index + 1}
        </span>

        <div className="stack-item-title-area" onClick={() => setExpanded(!expanded)}>
          {editing ? (
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              onClick={e => e.stopPropagation()}
              className="edit-input"
              autoFocus
            />
          ) : (
            <span className="stack-item-title">{item.title}</span>
          )}
        </div>

        <div className="stack-item-meta">
          {totalSubtasks > 0 && (
            <span className="subtask-count">{completedCount}/{totalSubtasks}</span>
          )}
          {item.daysSinceTouched > 0 && (
            <span className="decay-badge" title={`Priority decaying: -${item.daysSinceTouched} from inactivity`}>
              {item.daysSinceTouched > 3 ? '\u26A0' : '\u2193'}{item.daysSinceTouched}d
            </span>
          )}
          <span className="days-badge" title="Days on stack">
            {item.daysOnStack}d
          </span>
        </div>
      </div>

      {expanded && (
        <div className="stack-item-body">
          {editing ? (
            <div className="edit-section">
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Description..."
                className="edit-textarea"
                rows={3}
              />
              <div className="edit-actions">
                <button onClick={handleSave} className="btn btn-save">Save</button>
                <button onClick={() => setEditing(false)} className="btn btn-cancel">Cancel</button>
              </div>
            </div>
          ) : (
            <>
              {item.description && (
                <p className="stack-item-description">{item.description}</p>
              )}
              {!item.description && (
                <p className="stack-item-description empty">No description</p>
              )}
            </>
          )}

          <div className="subtasks-section">
            <h4>Subtasks</h4>
            {item.subtasks.map(subtask => (
              <div key={subtask.id} className="subtask-row">
                <label className="subtask-label">
                  <input
                    type="checkbox"
                    checked={subtask.completed}
                    onChange={() => handleToggleSubtask(subtask.id, subtask.completed)}
                  />
                  <span className={subtask.completed ? 'completed' : ''}>{subtask.title}</span>
                </label>
                <button
                  onClick={() => handleDeleteSubtask(subtask.id)}
                  className="btn-icon btn-delete-subtask"
                  title="Delete subtask"
                >
                  &times;
                </button>
              </div>
            ))}
            <form onSubmit={handleAddSubtask} className="add-subtask-form">
              <input
                value={newSubtask}
                onChange={e => setNewSubtask(e.target.value)}
                placeholder="Add subtask..."
                className="subtask-input"
              />
              <button type="submit" className="btn btn-small">+</button>
            </form>
          </div>

          <div className="item-actions">
            {!editing && (
              <button onClick={() => setEditing(true)} className="btn btn-edit">Edit</button>
            )}
            <button onClick={handleArchive} className="btn btn-archive">Archive</button>
            <button onClick={handleDelete} className="btn btn-danger">Delete</button>
          </div>
        </div>
      )}
    </div>
  );
}
