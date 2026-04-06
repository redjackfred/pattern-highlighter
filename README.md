# Pattern Highlighter

A browser-based tool for knitters to follow patterns row by row. Upload your pattern image, draw a crop selection over the stitch grid, and navigate row by row with keyboard shortcuts — no app install required.

## Features

- **Row highlighter** — crops a stitch grid from a pattern image and overlays a yellow highlight on the current row; numbering is bottom-up (row 1 = bottom)
- **PDF viewer** — load your pattern PDF side-by-side for easy reference
- **Pug counter** — left/right arrow keys increment or decrement a stitch counter
- **Pomodoro timer** — draggable countdown timer with audio notification on completion
- **Keyboard-driven** — ↑/↓ moves between rows, ←/→ adjusts the stitch counter, Space starts/pauses the timer, Enter collapses panels
- **Paste to load** — paste a screenshot directly (`Ctrl+V`) to load a pattern image without a file dialog
- **Persistent state** — pattern image, crop selection, row position, and PDF are all saved across sessions via `localStorage` + IndexedDB

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router) |
| UI | React 19 + TypeScript |
| Styling | Tailwind CSS v4 |
| Crop | `react-image-crop` |
| Storage | `localStorage` + IndexedDB |
| Package manager | Bun |

## Getting started

```bash
bun install
bun dev       # http://localhost:3000
```

## Usage

1. Click **Choose Image** or paste a screenshot (`Ctrl+V`) to load your pattern.
2. Drag a crop selection over the stitch rows you want to track.
3. Enter the total number of rows in your selected area and click **Start Highlighting**.
4. Press **↑ / ↓** to move to the next or previous row.
5. Optionally load a PDF with your full pattern instructions using the PDF panel on the right.

## Build

```bash
bun build     # production build
bun lint      # ESLint
```
