# Brain Stack

A priority queue for your brain. Track thoughts, tasks, and ideas with automatic priority decay -- things you ignore naturally sink to the bottom.

## Quick Start

```bash
# Install dependencies
pnpm install
pnpm rebuild better-sqlite3

# Run (starts both server and client)
pnpm dev
```

- **Frontend**: http://localhost:3000
- **API**: http://localhost:3001

## How It Works

- **Push items** onto your stack with a title, description, and subtasks
- **Drag and drop** to reorder -- top items have highest priority
- **Priority decays** by 1 per day of inactivity -- neglected items sink down
- **Stale alerts** pop up after 7 days of no interaction, asking you to keep or archive
- **Archive** items you're done with; restore them later if needed

## Tech Stack

- **Frontend**: React + TypeScript + Vite, @dnd-kit for drag-and-drop
- **Backend**: Express + TypeScript
- **Database**: SQLite via better-sqlite3 (stored in `brain-stack.db` at project root)

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start both server and client |
| `pnpm server` | Start API server only (port 3001) |
| `pnpm client` | Start frontend only (port 3000) |

## Project Structure

```
brain-stack/
  client/          # React frontend
    src/
      components/  # StackItemCard, AddItemForm, StaleItemAlert, ArchiveView
      api.ts       # API client
      types.ts     # TypeScript interfaces
  server/
    src/
      index.ts     # Express API routes
      database.ts  # SQLite schema & connection
  brain-stack.db   # SQLite database (created on first run)
```
