import { useState, useRef, useEffect } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { StackItem } from '../types';
import { api } from '../api';

interface Props {
  item: StackItem;
  onRefresh: () => void;
}

export function StackItemCard({ item, onRefresh }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingDescription, setEditingDescription] = useState(false);
  const [title, setTitle] = useState(item.title);
  const [description, setDescription] = useState(item.description);
  const [newSubtask, setNewSubtask] = useState('');
  const [editingSubtaskId, setEditingSubtaskId] = useState<string | null>(null);
  const [editingSubtaskText, setEditingSubtaskText] = useState('');
  const subtaskInputRef = useRef<HTMLInputElement>(null);

  const [editingPriority, setEditingPriority] = useState(false);
  const [priorityValue, setPriorityValue] = useState(String(item.priority));

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

  const handleTitleSave = async () => {
    if (title.trim() && title !== item.title) {
      await api.updateItem(item.id, { title: title.trim() });
      onRefresh();
    } else {
      setTitle(item.title);
    }
    setEditingTitle(false);
  };

  const handleDescriptionSave = async () => {
    if (description !== item.description) {
      await api.updateItem(item.id, { description });
      onRefresh();
    }
    setEditingDescription(false);
  };

  const handlePrioritySave = async () => {
    const p = parseInt(priorityValue, 10);
    if (!isNaN(p) && p >= 0) {
      await api.updateItem(item.id, { priority: p });
      onRefresh();
    }
    setEditingPriority(false);
  };

  const handleAddSubtask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtask.trim()) return;
    const result = await api.addSubtask(item.id, newSubtask.trim());
    setNewSubtask('');
    onRefresh();
    // Auto-focus the newly added subtask for editing
    setEditingSubtaskId(result.id);
    setEditingSubtaskText(newSubtask.trim());
  };

  const handleSubtaskSave = async (id: string) => {
    if (editingSubtaskText.trim()) {
      await api.updateSubtask(id, editingSubtaskText.trim());
      onRefresh();
    }
    setEditingSubtaskId(null);
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

  const priorityColor = item.priority >= 8 ? '#ef4444' : item.priority >= 5 ? '#f97316' : item.priority >= 3 ? '#eab308' : '#6b7280';

  // Focus the subtask edit input when editingSubtaskId changes
  useEffect(() => {
    if (editingSubtaskId && subtaskInputRef.current) {
      subtaskInputRef.current.focus();
      subtaskInputRef.current.select();
    }
  }, [editingSubtaskId]);

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

        {editingPriority ? (
          <input
            className="priority-input"
            type="number"
            min="0"
            value={priorityValue}
            onChange={e => setPriorityValue(e.target.value)}
            onBlur={handlePrioritySave}
            onKeyDown={e => {
              if (e.key === 'Enter') handlePrioritySave();
              if (e.key === 'Escape') setEditingPriority(false);
            }}
            onClick={e => e.stopPropagation()}
            autoFocus
          />
        ) : (
          <span
            className="priority-badge"
            style={{ backgroundColor: priorityColor }}
            onClick={e => {
              e.stopPropagation();
              setPriorityValue(String(item.priority));
              setEditingPriority(true);
            }}
            title="Click to set priority"
          >
            P{item.priority}
          </span>
        )}

        <div className="stack-item-title-area" onClick={() => !editingTitle && setExpanded(!expanded)}>
          {editingTitle ? (
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              onBlur={handleTitleSave}
              onKeyDown={e => {
                if (e.key === 'Enter') handleTitleSave();
                if (e.key === 'Escape') { setTitle(item.title); setEditingTitle(false); }
              }}
              onClick={e => e.stopPropagation()}
              className="edit-input"
              autoFocus
            />
          ) : (
            <span
              className="stack-item-title"
              onDoubleClick={e => {
                e.stopPropagation();
                setEditingTitle(true);
              }}
            >
              {item.title}
            </span>
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
          <div className="item-actions-top">
            <button onClick={handleArchive} className="btn btn-archive btn-small">Archive</button>
            <button onClick={handleDelete} className="btn btn-danger btn-small">Delete</button>
          </div>

          {editingDescription ? (
            <div className="edit-section">
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Description..."
                className="edit-textarea"
                rows={3}
                autoFocus
                onBlur={handleDescriptionSave}
                onKeyDown={e => {
                  if (e.key === 'Escape') { setDescription(item.description); setEditingDescription(false); }
                }}
              />
            </div>
          ) : (
            <p
              className={`stack-item-description ${!item.description ? 'empty' : ''}`}
              onClick={() => setEditingDescription(true)}
              title="Click to edit description"
            >
              {item.description || 'Click to add description...'}
            </p>
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
                  {editingSubtaskId === subtask.id ? (
                    <input
                      ref={subtaskInputRef}
                      className="subtask-edit-input"
                      value={editingSubtaskText}
                      onChange={e => setEditingSubtaskText(e.target.value)}
                      onBlur={() => handleSubtaskSave(subtask.id)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleSubtaskSave(subtask.id);
                        if (e.key === 'Escape') setEditingSubtaskId(null);
                      }}
                    />
                  ) : (
                    <span
                      className={subtask.completed ? 'completed' : ''}
                      onDoubleClick={() => {
                        setEditingSubtaskId(subtask.id);
                        setEditingSubtaskText(subtask.title);
                      }}
                      title="Double-click to edit"
                    >
                      {subtask.title}
                    </span>
                  )}
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
        </div>
      )}
    </div>
  );
}
