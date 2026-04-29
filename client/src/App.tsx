import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import type { StackItem, Stack } from './types';
import { api } from './api';
import { StackItemCard } from './components/StackItemCard';
import { AddItemForm } from './components/AddItemForm';
import { StaleItemAlert } from './components/StaleItemAlert';
import { ArchiveView } from './components/ArchiveView';
import { StackSelector } from './components/StackSelector';
import './App.css';

function App() {
  const [allItems, setAllItems] = useState<StackItem[]>([]);
  const [archivedItems, setArchivedItems] = useState<StackItem[]>([]);
  const [staleItems, setStaleItems] = useState<StackItem[]>([]);
  const [showStaleAlert, setShowStaleAlert] = useState(false);
  const [view, setView] = useState<'stack' | 'archive'>('stack');
  const [stacks, setStacks] = useState<Stack[]>([]);
  const [activeStackId, setActiveStackId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // Always load all items for counts, then filter client-side
  const loadItems = useCallback(async () => {
    const data = await api.getItems();
    setAllItems(data);
  }, []);

  const loadArchived = useCallback(async () => {
    const data = await api.getArchivedItems();
    setArchivedItems(data);
  }, []);

  const checkStale = useCallback(async () => {
    const data = await api.getStaleItems(activeStackId);
    setStaleItems(data);
    if (data.length > 0) setShowStaleAlert(true);
  }, [activeStackId]);

  const loadStacks = useCallback(async () => {
    const data = await api.getStacks();
    setStacks(data);
  }, []);

  const refresh = useCallback(() => {
    loadItems();
    loadArchived();
    checkStale();
    loadStacks();
  }, [loadItems, loadArchived, checkStale, loadStacks]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Filter items for current view
  const items = useMemo(() => {
    if (activeStackId === null) return allItems;
    return allItems.filter(i => i.stack_id === activeStackId);
  }, [allItems, activeStackId]);

  // Compute item counts per stack
  const itemCounts = useMemo(() => {
    const counts: Record<string, number> = { all: allItems.length };
    for (const item of allItems) {
      if (item.stack_id) {
        counts[item.stack_id] = (counts[item.stack_id] || 0) + 1;
      }
    }
    return counts;
  }, [allItems]);

  // Color lookup: stack_id -> color (only used in "All" view)
  const stackColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const s of stacks) map[s.id] = s.color;
    return map;
  }, [stacks]);

  const getStackColor = (item: StackItem) => {
    if (activeStackId !== null) return undefined; // don't show in single-stack view
    return item.stack_id ? stackColorMap[item.stack_id] : undefined;
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex(i => i.id === active.id);
    const newIndex = items.findIndex(i => i.id === over.id);

    const newItems = [...items];
    const [moved] = newItems.splice(oldIndex, 1);
    newItems.splice(newIndex, 0, moved);

    // Optimistic update for filtered view
    if (activeStackId === null) {
      setAllItems(newItems);
    } else {
      setAllItems(prev => {
        const updated = [...prev];
        // Replace items that are in this stack with the reordered ones
        const otherItems = updated.filter(i => i.stack_id !== activeStackId);
        return [...otherItems, ...newItems].sort((a, b) => b.priority - a.priority);
      });
    }

    await api.reorderItems(newItems.map(i => i.id));
    setAllItems(await api.getItems());
  };

  const handleCreateStack = async (name: string) => {
    await api.createStack(name);
    loadStacks();
  };

  const handleDeleteStack = async (id: string) => {
    await api.deleteStack(id);
    if (activeStackId === id) setActiveStackId(null);
    refresh();
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
            Completed ({archivedItems.length})
          </button>
        </nav>
      </header>

      <main className="app-main">
        {view === 'stack' ? (
          <>
            <StackSelector
              stacks={stacks}
              activeStackId={activeStackId}
              onSelect={setActiveStackId}
              onCreateStack={handleCreateStack}
              onDeleteStack={handleDeleteStack}
              itemCounts={itemCounts}
            />

            <AddItemForm onCreated={refresh} stackId={activeStackId} />

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
                    {items.some(i => !i.decay_enabled) && (
                      <div className="high-priority-group">
                        <span className="high-priority-label">High Priority</span>
                        {items.filter(i => !i.decay_enabled).map((item) => (
                          <StackItemCard
                            key={item.id}
                            item={item}
                            onRefresh={refresh}
                            stackColor={getStackColor(item)}
                          />
                        ))}
                      </div>
                    )}
                    {items.filter(i => i.decay_enabled).map((item) => (
                      <StackItemCard
                        key={item.id}
                        item={item}
                        onRefresh={refresh}
                        stackColor={getStackColor(item)}
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
