import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import db from './database';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// ---------- Helpers ----------

function getItemsWithSubtasks(archived = false, stackId?: string) {
  let query = `SELECT * FROM items WHERE archived = ?`;
  const params: any[] = [archived ? 1 : 0];

  if (stackId) {
    query += ` AND stack_id = ?`;
    params.push(stackId);
  }

  query += ` ORDER BY decay_enabled ASC, priority DESC, created_at DESC`;

  const items = db.prepare(query).all(...params) as any[];

  const getSubtasks = db.prepare(
    `SELECT * FROM subtasks WHERE item_id = ? ORDER BY sort_order ASC`
  );

  const todayDate = new Date().toISOString().split('T')[0];

  return items.map(item => {
    const staleBase = (item.stale_reset_at || item.created_at).split(' ')[0];
    const daysOnStack = Math.max(0, Math.floor(
      (new Date(todayDate).getTime() - new Date(staleBase).getTime()) / (1000 * 60 * 60 * 24)
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

// ---------- Stack Routes ----------

const STACK_COLORS = [
  '#6366f1', // indigo
  '#22c55e', // green
  '#f97316', // orange
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#eab308', // yellow
  '#8b5cf6', // violet
  '#14b8a6', // teal
];

app.get('/api/stacks', (_req, res) => {
  const stacks = db.prepare('SELECT * FROM stacks ORDER BY sort_order ASC, created_at ASC').all();
  res.json(stacks);
});

app.post('/api/stacks', (req, res) => {
  const { name } = req.body;
  const id = uuidv4();
  const maxOrder = db.prepare('SELECT COALESCE(MAX(sort_order), -1) as max FROM stacks').get() as any;
  const usedColors = (db.prepare('SELECT color FROM stacks').all() as any[]).map(r => r.color);
  const available = STACK_COLORS.filter(c => !usedColors.includes(c));
  const pool = available.length > 0 ? available : STACK_COLORS;
  const color = pool[Math.floor(Math.random() * pool.length)];
  db.prepare('INSERT INTO stacks (id, name, color, sort_order) VALUES (?, ?, ?, ?)').run(id, name, color, maxOrder.max + 1);
  const stack = db.prepare('SELECT * FROM stacks WHERE id = ?').get(id);
  res.status(201).json(stack);
});

app.patch('/api/stacks/:id', (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  db.prepare('UPDATE stacks SET name = ? WHERE id = ?').run(name, id);
  const stack = db.prepare('SELECT * FROM stacks WHERE id = ?').get(id);
  res.json(stack);
});

app.delete('/api/stacks/:id', (req, res) => {
  const { id } = req.params;
  db.prepare('DELETE FROM stacks WHERE id = ?').run(id);
  res.json({ success: true });
});

// ---------- Item Routes ----------

// Get active items (optional ?stack_id= filter)
app.get('/api/items', (req, res) => {
  const stackId = req.query.stack_id as string | undefined;
  res.json(getItemsWithSubtasks(false, stackId));
});

// Get archived items (optional ?stack_id= filter)
app.get('/api/items/archived', (req, res) => {
  const stackId = req.query.stack_id as string | undefined;
  res.json(getItemsWithSubtasks(true, stackId));
});

// Create item
app.post('/api/items', (req, res) => {
  const { title, description = '', subtasks = [], decay_enabled = true, stack_id = null } = req.body;

  const maxPriority = db.prepare(
    'SELECT COALESCE(MAX(priority), 0) as max FROM items WHERE archived = 0'
  ).get() as any;

  const id = uuidv4();
  const priority = maxPriority.max + 1;

  db.prepare(`
    INSERT INTO items (id, title, description, priority, decay_enabled, stack_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, title, description, priority, decay_enabled ? 1 : 0, stack_id);

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
  const { title, description, priority, decay_enabled, stack_id } = req.body;

  const sets: string[] = [];
  const values: any[] = [];

  if (title !== undefined) { sets.push('title = ?'); values.push(title); }
  if (description !== undefined) { sets.push('description = ?'); values.push(description); }
  if (priority !== undefined) { sets.push('priority = ?'); values.push(priority); }
  if (decay_enabled !== undefined) { sets.push('decay_enabled = ?'); values.push(decay_enabled ? 1 : 0); }
  if (stack_id !== undefined) { sets.push('stack_id = ?'); values.push(stack_id); }

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
    for (let i = 0; i < orderedIds.length; i++) {
      update.run(orderedIds.length - i, orderedIds[i]);
    }
  });
  transaction();

  res.json(getItemsWithSubtasks(false));
});

// Touch item (reset stale timer)
app.post('/api/items/:id/touch', (req, res) => {
  const { id } = req.params;
  db.prepare("UPDATE items SET stale_reset_at = datetime('now'), last_touched_at = datetime('now') WHERE id = ?").run(id);
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

app.post('/api/items/:itemId/subtasks', (req, res) => {
  const { itemId } = req.params;
  const { title } = req.body;
  const id = uuidv4();

  const maxOrder = db.prepare(
    'SELECT COALESCE(MAX(sort_order), -1) as max FROM subtasks WHERE item_id = ?'
  ).get(itemId) as any;

  db.prepare('INSERT INTO subtasks (id, item_id, title, sort_order) VALUES (?, ?, ?, ?)')
    .run(id, itemId, title, maxOrder.max + 1);

  db.prepare("UPDATE items SET last_touched_at = datetime('now') WHERE id = ?").run(itemId);

  res.status(201).json({ id, item_id: itemId, title, completed: false, sort_order: maxOrder.max + 1 });
});

app.patch('/api/subtasks/:id', (req, res) => {
  const { id } = req.params;
  const { completed, title } = req.body;

  if (completed !== undefined) {
    db.prepare('UPDATE subtasks SET completed = ? WHERE id = ?').run(completed ? 1 : 0, id);
  }
  if (title !== undefined) {
    db.prepare('UPDATE subtasks SET title = ? WHERE id = ?').run(title, id);
  }

  const subtask = db.prepare('SELECT item_id FROM subtasks WHERE id = ?').get(id) as any;
  if (subtask) {
    db.prepare("UPDATE items SET last_touched_at = datetime('now') WHERE id = ?").run(subtask.item_id);
  }

  res.json({ success: true });
});

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

app.get('/api/items/stale', (req, res) => {
  const STALE_DAYS = 7;
  const stackId = req.query.stack_id as string | undefined;

  let query = `
    SELECT * FROM items
    WHERE archived = 0
      AND decay_enabled = 1
      AND CAST(julianday(date('now')) - julianday(date(COALESCE(stale_reset_at, created_at))) AS INTEGER) >= ?
  `;
  const params: any[] = [STALE_DAYS];

  if (stackId) {
    query += ` AND stack_id = ?`;
    params.push(stackId);
  }

  query += ` ORDER BY priority ASC`;

  const staleItems = db.prepare(query).all(...params) as any[];
  const getSubtasks = db.prepare('SELECT * FROM subtasks WHERE item_id = ? ORDER BY sort_order ASC');
  const todayDate = new Date().toISOString().split('T')[0];

  const result = staleItems.map(item => {
    const staleBase = (item.stale_reset_at || item.created_at).split(' ')[0];
    const daysOnStack = Math.max(0, Math.floor(
      (new Date(todayDate).getTime() - new Date(staleBase).getTime()) / (1000 * 60 * 60 * 24)
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
