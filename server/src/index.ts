import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import db from './database';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// ---------- Helpers ----------

function getItemsWithSubtasks(archived = false) {
  // Pinned items (decay_enabled=0) sort first, then by stored priority
  const items = db.prepare(`
    SELECT * FROM items
    WHERE archived = ?
    ORDER BY decay_enabled ASC, priority DESC, created_at DESC
  `).all(archived ? 1 : 0) as any[];

  const getSubtasks = db.prepare(`
    SELECT * FROM subtasks WHERE item_id = ? ORDER BY sort_order ASC
  `);

  const todayDate = new Date().toISOString().split('T')[0];

  return items.map(item => {
    const createdDate = item.created_at.split(' ')[0];
    const daysOnStack = Math.max(0, Math.floor(
      (new Date(todayDate).getTime() - new Date(createdDate).getTime()) / (1000 * 60 * 60 * 24)
    ));

    return {
      ...item,
      archived: !!item.archived,
      decay_enabled: !!item.decay_enabled,
      daysOnStack,
      subtasks: getSubtasks.all(item.id).map((s: any) => ({
        ...s,
        completed: !!s.completed,
      })),
    };
  });
}

// ---------- Routes ----------

// Get all active items
app.get('/api/items', (_req, res) => {
  res.json(getItemsWithSubtasks(false));
});

// Get archived items
app.get('/api/items/archived', (_req, res) => {
  res.json(getItemsWithSubtasks(true));
});

// Create item
app.post('/api/items', (req, res) => {
  const { title, description = '', subtasks = [], decay_enabled = true } = req.body;

  // New items get priority = max + 1 (top of stack)
  const maxPriority = db.prepare(
    'SELECT COALESCE(MAX(priority), 0) as max FROM items WHERE archived = 0'
  ).get() as any;

  const id = uuidv4();
  const priority = maxPriority.max + 1;

  db.prepare(`
    INSERT INTO items (id, title, description, priority, decay_enabled)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, title, description, priority, decay_enabled ? 1 : 0);

  for (let i = 0; i < subtasks.length; i++) {
    db.prepare(`
      INSERT INTO subtasks (id, item_id, title, sort_order)
      VALUES (?, ?, ?, ?)
    `).run(uuidv4(), id, subtasks[i].title, i);
  }

  const items = getItemsWithSubtasks(false);
  res.status(201).json(items.find(item => item.id === id));
});

// Update item
app.patch('/api/items/:id', (req, res) => {
  const { id } = req.params;
  const { title, description, priority, decay_enabled } = req.body;

  const sets: string[] = [];
  const values: any[] = [];

  if (title !== undefined) { sets.push('title = ?'); values.push(title); }
  if (description !== undefined) { sets.push('description = ?'); values.push(description); }
  if (priority !== undefined) { sets.push('priority = ?'); values.push(priority); }
  if (decay_enabled !== undefined) { sets.push('decay_enabled = ?'); values.push(decay_enabled ? 1 : 0); }

  // Touching the item resets the decay clock
  sets.push("last_touched_at = datetime('now')");

  if (sets.length > 0) {
    values.push(id);
    db.prepare(`UPDATE items SET ${sets.join(', ')} WHERE id = ?`).run(...values);
  }

  const items = getItemsWithSubtasks(false);
  res.json(items.find(item => item.id === id));
});

// Reorder items (bulk priority update)
app.put('/api/items/reorder', (req, res) => {
  const { orderedIds } = req.body as { orderedIds: string[] };

  const update = db.prepare('UPDATE items SET priority = ?, last_touched_at = datetime(\'now\') WHERE id = ?');
  const transaction = db.transaction(() => {
    // Highest priority = length, going down
    for (let i = 0; i < orderedIds.length; i++) {
      update.run(orderedIds.length - i, orderedIds[i]);
    }
  });
  transaction();

  res.json(getItemsWithSubtasks(false));
});

// Touch item (reset stale timer - user says "still important")
app.post('/api/items/:id/touch', (req, res) => {
  const { id } = req.params;
  db.prepare("UPDATE items SET created_at = datetime('now'), last_touched_at = datetime('now') WHERE id = ?").run(id);
  const items = getItemsWithSubtasks(false);
  res.json(items.find(item => item.id === id));
});

// Archive item
app.post('/api/items/:id/archive', (req, res) => {
  const { id } = req.params;
  db.prepare("UPDATE items SET archived = 1, archived_at = datetime('now') WHERE id = ?").run(id);
  res.json({ success: true });
});

// Unarchive item
app.post('/api/items/:id/unarchive', (req, res) => {
  const { id } = req.params;
  const maxPriority = db.prepare(
    'SELECT COALESCE(MAX(priority), 0) as max FROM items WHERE archived = 0'
  ).get() as any;
  db.prepare("UPDATE items SET archived = 0, archived_at = NULL, priority = ?, last_touched_at = datetime('now') WHERE id = ?")
    .run(maxPriority.max + 1, id);
  res.json({ success: true });
});

// Delete item permanently
app.delete('/api/items/:id', (req, res) => {
  const { id } = req.params;
  db.prepare('DELETE FROM items WHERE id = ?').run(id);
  res.json({ success: true });
});

// ---------- Subtasks ----------

// Add subtask
app.post('/api/items/:itemId/subtasks', (req, res) => {
  const { itemId } = req.params;
  const { title } = req.body;
  const id = uuidv4();

  const maxOrder = db.prepare(
    'SELECT COALESCE(MAX(sort_order), -1) as max FROM subtasks WHERE item_id = ?'
  ).get(itemId) as any;

  db.prepare('INSERT INTO subtasks (id, item_id, title, sort_order) VALUES (?, ?, ?, ?)')
    .run(id, itemId, title, maxOrder.max + 1);

  // Touch parent item
  db.prepare("UPDATE items SET last_touched_at = datetime('now') WHERE id = ?").run(itemId);

  res.status(201).json({ id, item_id: itemId, title, completed: false, sort_order: maxOrder.max + 1 });
});

// Update subtask (toggle completed and/or edit title)
app.patch('/api/subtasks/:id', (req, res) => {
  const { id } = req.params;
  const { completed, title } = req.body;

  if (completed !== undefined) {
    db.prepare('UPDATE subtasks SET completed = ? WHERE id = ?').run(completed ? 1 : 0, id);
  }
  if (title !== undefined) {
    db.prepare('UPDATE subtasks SET title = ? WHERE id = ?').run(title, id);
  }

  // Touch parent item
  const subtask = db.prepare('SELECT item_id FROM subtasks WHERE id = ?').get(id) as any;
  if (subtask) {
    db.prepare("UPDATE items SET last_touched_at = datetime('now') WHERE id = ?").run(subtask.item_id);
  }

  res.json({ success: true });
});

// Delete subtask
app.delete('/api/subtasks/:id', (req, res) => {
  const { id } = req.params;
  const subtask = db.prepare('SELECT item_id FROM subtasks WHERE id = ?').get(id) as any;
  db.prepare('DELETE FROM subtasks WHERE id = ?').run(id);
  if (subtask) {
    db.prepare("UPDATE items SET last_touched_at = datetime('now') WHERE id = ?").run(subtask.item_id);
  }
  res.json({ success: true });
});

// ---------- Stale check ----------
// Returns items on the stack for 7+ calendar days (skips pinned items)
app.get('/api/items/stale', (_req, res) => {
  const STALE_DAYS = 7;
  const staleItems = db.prepare(`
    SELECT * FROM items
    WHERE archived = 0
      AND decay_enabled = 1
      AND CAST(julianday(date('now')) - julianday(date(created_at)) AS INTEGER) >= ?
    ORDER BY priority ASC
  `).all(STALE_DAYS) as any[];

  const getSubtasks = db.prepare('SELECT * FROM subtasks WHERE item_id = ? ORDER BY sort_order ASC');
  const todayDate = new Date().toISOString().split('T')[0];

  const result = staleItems.map(item => {
    const createdDate = item.created_at.split(' ')[0];
    const daysOnStack = Math.max(0, Math.floor(
      (new Date(todayDate).getTime() - new Date(createdDate).getTime()) / (1000 * 60 * 60 * 24)
    ));
    return {
      ...item,
      archived: !!item.archived,
      decay_enabled: !!item.decay_enabled,
      daysOnStack,
      subtasks: getSubtasks.all(item.id).map((s: any) => ({
        ...s,
        completed: !!s.completed,
      })),
    };
  });

  res.json(result);
});

app.listen(PORT, () => {
  console.log(`Brain Stack API running on http://localhost:${PORT}/api`);
});
