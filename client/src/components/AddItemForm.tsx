import { useState } from 'react';
import { api } from '../api';

interface Props {
  onCreated: () => void;
}

export function AddItemForm({ onCreated }: Props) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subtasks, setSubtasks] = useState<string[]>([]);
  const [newSubtask, setNewSubtask] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    await api.createItem({
      title: title.trim(),
      description: description.trim(),
      subtasks: subtasks.filter(s => s.trim()).map(s => ({ title: s.trim() })),
    });

    setTitle('');
    setDescription('');
    setSubtasks([]);
    setNewSubtask('');
    setOpen(false);
    onCreated();
  };

  const addSubtask = () => {
    if (newSubtask.trim()) {
      setSubtasks([...subtasks, newSubtask.trim()]);
      setNewSubtask('');
    }
  };

  const removeSubtask = (index: number) => {
    setSubtasks(subtasks.filter((_, i) => i !== index));
  };

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn btn-add-item">
        + Push to Stack
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="add-item-form">
      <input
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder="What's on your mind?"
        className="form-input"
        autoFocus
      />
      <textarea
        value={description}
        onChange={e => setDescription(e.target.value)}
        placeholder="Description (optional)"
        className="form-textarea"
        rows={2}
      />

      <div className="form-subtasks">
        {subtasks.map((s, i) => (
          <div key={i} className="form-subtask-row">
            <span>{s}</span>
            <button type="button" onClick={() => removeSubtask(i)} className="btn-icon">&times;</button>
          </div>
        ))}
        <div className="form-subtask-add">
          <input
            value={newSubtask}
            onChange={e => setNewSubtask(e.target.value)}
            placeholder="Add subtask..."
            className="subtask-input"
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addSubtask();
              }
            }}
          />
          <button type="button" onClick={addSubtask} className="btn btn-small">+</button>
        </div>
      </div>

      <div className="form-actions">
        <button type="submit" className="btn btn-save">Push</button>
        <button type="button" onClick={() => setOpen(false)} className="btn btn-cancel">Cancel</button>
      </div>
    </form>
  );
}
