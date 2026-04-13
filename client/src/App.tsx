import { useState, useEffect, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { StackItem } from './types';
import { api } from './api';
import { StackItemCard } from './components/StackItemCard';
import { AddItemForm } from './components/AddItemForm';
import { StaleItemAlert } from './components/StaleItemAlert';
import { ArchiveView } from './components/ArchiveView';
import './App.css';

function App() {
  const [items, setItems] = useState<StackItem[]>([]);
  const [archivedItems, setArchivedItems] = useState<StackItem[]>([]);
  const [staleItems, setStaleItems] = useState<StackItem[]>([]);
  const [showStaleAlert, setShowStaleAlert] = useState(false);
  const [view, setView] = useState<'stack' | 'archive'>('stack');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const loadItems = useCallback(async () => {
    const data = await api.getItems();
    setItems(data);
  }, []);

  const loadArchived = useCallback(async () => {
    const data = await api.getArchivedItems();
    setArchivedItems(data);
  }, []);

  const checkStale = useCallback(async () => {
    const data = await api.getStaleItems();
    setStaleItems(data);
    if (data.length > 0) setShowStaleAlert(true);
  }, []);

  const refresh = useCallback(() => {
    loadItems();
    loadArchived();
    checkStale();
  }, [loadItems, loadArchived, checkStale]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex(i => i.id === active.id);
    const newIndex = items.findIndex(i => i.id === over.id);

    const newItems = [...items];
    const [moved] = newItems.splice(oldIndex, 1);
    newItems.splice(newIndex, 0, moved);

    setItems(newItems);
    const updated = await api.reorderItems(newItems.map(i => i.id));
    setItems(updated);
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>Brain Stack</h1>
        <nav className="nav-tabs">
          <button
            className={`nav-tab ${view === 'stack' ? 'active' : ''}`}
            onClick={() => setView('stack')}
          >
            Stack ({items.length})
          </button>
          <button
            className={`nav-tab ${view === 'archive' ? 'active' : ''}`}
            onClick={() => setView('archive')}
          >
            Archive ({archivedItems.length})
          </button>
        </nav>
      </header>

      <main className="app-main">
        {view === 'stack' ? (
          <>
            <AddItemForm onCreated={refresh} />

            {items.length === 0 ? (
              <p className="empty-state">Your brain stack is empty. Push something!</p>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
                modifiers={[restrictToVerticalAxis]}
              >
                <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
                  <div className="stack-list">
                    {items.map((item, index) => (
                      <StackItemCard
                        key={item.id}
                        item={item}
                        index={index}
                        onRefresh={refresh}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </>
        ) : (
          <ArchiveView items={archivedItems} onRefresh={refresh} />
        )}
      </main>

      {showStaleAlert && (
        <StaleItemAlert
          items={staleItems}
          onRefresh={refresh}
          onDismiss={() => setShowStaleAlert(false)}
        />
      )}
    </div>
  );
}

export default App;
