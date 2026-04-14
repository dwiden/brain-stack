import type { StackItem } from '../types';
import { api } from '../api';

interface Props {
  items: StackItem[];
  onRefresh: () => void;
  onDismiss: () => void;
}

export function StaleItemAlert({ items, onRefresh, onDismiss }: Props) {
  if (items.length === 0) return null;

  const handleKeep = async (id: string) => {
    await api.touchItem(id);
    onRefresh();
  };

  const handleArchive = async (id: string) => {
    await api.archiveItem(id);
    onRefresh();
  };

  return (
    <div className="stale-alert-overlay">
      <div className="stale-alert">
        <h3>Stale items detected</h3>
        <p>These items have been on the stack for 7+ days. Still important?</p>

        <div className="stale-items-list">
          {items.map(item => (
            <div key={item.id} className="stale-item">
              <div className="stale-item-info">
                <strong>{item.title}</strong>
                <span className="stale-days">
                  {item.daysOnStack} days on stack
                </span>
              </div>
              <div className="stale-item-actions">
                <button onClick={() => handleKeep(item.id)} className="btn btn-save btn-small">
                  Keep it
                </button>
                <button onClick={() => handleArchive(item.id)} className="btn btn-archive btn-small">
                  Complete
                </button>
              </div>
            </div>
          ))}
        </div>

        <button onClick={onDismiss} className="btn btn-cancel stale-dismiss">Dismiss</button>
      </div>
    </div>
  );
}
