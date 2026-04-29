import { useState } from 'react';
import type { Stack } from '../types';

interface Props {
  stacks: Stack[];
  activeStackId: string | null;
  onSelect: (stackId: string | null) => void;
  onCreateStack: (name: string) => void;
  onDeleteStack: (id: string) => void;
  itemCounts: Record<string, number>;
}

export function StackSelector({ stacks, activeStackId, onSelect, onCreateStack, onDeleteStack, itemCounts }: Props) {
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');

  const handleCreate = () => {
    if (newName.trim()) {
      onCreateStack(newName.trim());
      setNewName('');
      setCreating(false);
    }
  };

  return (
    <div className="stack-selector">
      <button
        className={`stack-tab ${activeStackId === null ? 'active' : ''}`}
        onClick={() => onSelect(null)}
      >
        All ({itemCounts['all'] ?? 0})
      </button>

      {stacks.map(stack => (
        <div key={stack.id} className="stack-tab-wrapper">
          <button
            className={`stack-tab ${activeStackId === stack.id ? 'active' : ''}`}
            onClick={() => onSelect(stack.id)}
          >
            <span className="stack-color-dot" style={{ backgroundColor: activeStackId === stack.id ? 'white' : stack.color }} />
            {stack.name} ({itemCounts[stack.id] ?? 0})
          </button>
          <button
            className="stack-tab-delete"
            onClick={e => {
              e.stopPropagation();
              if (confirm(`Delete stack "${stack.name}"? Items will move to All.`)) {
                onDeleteStack(stack.id);
              }
            }}
            title="Delete stack"
          >
            &times;
          </button>
        </div>
      ))}

      {creating ? (
        <div className="stack-tab-create">
          <input
            className="stack-name-input"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') handleCreate();
              if (e.key === 'Escape') { setCreating(false); setNewName(''); }
            }}
            onBlur={() => { if (!newName.trim()) setCreating(false); }}
            placeholder="Stack name..."
            autoFocus
          />
          <button className="btn btn-small" onClick={handleCreate}>Add</button>
        </div>
      ) : (
        <button className="stack-tab stack-tab-add" onClick={() => setCreating(true)}>+</button>
      )}
    </div>
  );
}
