import { StackItem } from '../types';
import { api } from '../api';

interface Props {
  items: StackItem[];
  onRefresh: () => void;
}

export function ArchiveView({ items, onRefresh }: Props) {
  const handleUnarchive = async (id: string) => {
    await api.unarchiveItem(id);
    onRefresh();
  };

  const handleDelete = async (id: string) => {
    if (confirm('Permanently delete this item?')) {
      await api.deleteItem(id);
      onRefresh();
    }
  };

  if (items.length === 0) {
    return <p className="empty-state">No archived items</p>;
  }

  return (
    <div className="archive-list">
      {items.map(item => (
        <div key={item.id} className="archive-item">
          <div className="archive-item-info">
            <strong>{item.title}</strong>
            {item.description && <p>{item.description}</p>}
            <span className="archive-date">
              Archived {item.archived_at ? new Date(item.archived_at).toLocaleDateString() : ''}
            </span>
          </div>
          <div className="archive-item-actions">
            <button onClick={() => handleUnarchive(item.id)} className="btn btn-save btn-small">
              Restore
            </button>
            <button onClick={() => handleDelete(item.id)} className="btn btn-danger btn-small">
              Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
