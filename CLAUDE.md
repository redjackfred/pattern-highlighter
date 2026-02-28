# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
bun dev        # Start development server at localhost:3000
bun build      # Production build
bun lint       # Run ESLint
```

No test suite is configured.

## Architecture

This is a **Next.js 16 app** (App Router) with a single-page UI built in React 19 + TypeScript + Tailwind CSS v4. The package manager is **bun**.

### How it works

The app is a knitting pattern row highlighter — users upload a pattern image, draw a crop selection over the stitch grid, specify the total row count, then navigate row-by-row with arrow keys.

**Data flow:**
1. Image is loaded via file input or `Ctrl+V` paste (clipboard API) into a data URL stored in `imgSrc` state.
2. In crop mode, `react-image-crop` renders a `ReactCrop` wrapper that returns a `PercentCrop` (percentage-based coordinates) on completion.
3. In highlight mode, `getHighlightStyle()` converts the `PercentCrop` + `totalRows` + `currentRow` into absolute `top/left/width/height` percentages that position a yellow overlay `<div>` over the image. Row numbering is **bottom-up** (row 1 = bottom of crop area).
4. Arrow keys (`↑` = next row, `↓` = previous row) are bound globally when in highlight mode.

### Key files

- `components/PatternHighlighter.tsx` — the entire application logic and UI (single client component)
- `app/page.tsx` — renders `<PatternHighlighter />`
- `app/layout.tsx` — sets metadata, loads Geist fonts, applies Tailwind base styles
- `app/globals.css` — Tailwind v4 import + CSS variables for light/dark background/foreground colors

### Layout geometry note

The image container uses `inline-flex` (not `block`) in both crop and highlight modes. This is intentional to prevent layout gaps and ensure the `react-image-crop` bounding box matches the visible image dimensions. The highlight overlay uses `position: absolute` relative to this `inline-flex` container.
