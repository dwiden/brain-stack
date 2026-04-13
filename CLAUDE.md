# Brain Stack

A personal priority queue for organizing thoughts and tasks, with automatic priority decay.

## Architecture

- **Monorepo** managed with pnpm workspaces (`client/` and `server/`)
- **Frontend** (`client/`): React + TypeScript + Vite on port 3000
- **Backend** (`server/`): Express + TypeScript on port 3001
- **Database**: SQLite via better-sqlite3, stored as `brain-stack.db` at project root (gitignored, created on first run)

## Running

```bash
pnpm install
pnpm rebuild better-sqlite3
pnpm dev
```

## Key Concepts

- **Effective priority**: `stored_priority - days_since_last_touched`. Items sink down the stack by 1 priority point per day of inactivity.
- **Touch**: Any interaction (edit, subtask toggle, manual touch) resets the decay clock.
- **Stale threshold**: 7 days untouched triggers a "still important?" prompt.
- **Reorder**: Drag-and-drop updates stored priority for all items and resets their touch timestamps.

## Code Layout

- `server/src/index.ts` — All API routes and the effective priority calculation
- `server/src/database.ts` — SQLite schema (items + subtasks tables)
- `client/src/App.tsx` — Main app with DnD context and state management
- `client/src/api.ts` — API client (all fetch calls)
- `client/src/types.ts` — Shared TypeScript interfaces
- `client/src/components/` — UI components (StackItemCard, AddItemForm, StaleItemAlert, ArchiveView)

## Conventions

- Keep it simple — this is a localhost personal tool
- Dark theme only
- No auth layer needed
- SQLite is the only dependency — no external services
- All new code must go on a feature branch (not directly on `main`), then submitted via PR
