# Trello-Style Kanban — Production-Ready Prompt

## Overview
Build a lightweight, production-feeling Trello-style kanban SPA with a clean, responsive UI and polished interactions. Focus on robust UX, accessibility, maintainable architecture, and a small, dependency-free codebase.

## Core Requirements
- Boards containing multiple lists (columns) with clear visual hierarchy
- Create, edit, and delete lists
- Create, edit, delete, and reorder cards within lists
- Drag-and-drop to move cards between lists and reorder within a list (HTML5 DnD or small vanilla helper)
- Card details editor (modal or inline) supporting title, description, labels/tags
- Persistent storage using `localStorage` with a clear versioned schema for future upgrades
- Polished UI: micro-interactions, motion, and clear affordances
- Fully responsive layout for desktop and mobile

## Production Styling Guidance
- Design system: define theme tokens (colors, spacing, radii, shadows, font-sizes) in a single `:root` CSS block so visual changes are centralized.
- CSS architecture: use a lightweight, semantic class strategy (BEM-like or utility-prefixed) and keep stateful modifiers (e.g., `is-dragging`, `is-drop-target`) separate from layout classes.
- Typography: use a system of scales (base, small, large) and a single readable font-stack; prioritize legibility and contrast (WCAG AA+) for text and controls.
- Motion: prefer CSS transitions for hover/focus and transform-based animations for drags; avoid forcing reflow during drag operations.
- Elevation: subtle, layered shadows for lists and cards to create depth; animate shadows on lift.
- Color & themes: supply a neutral light theme by default and structure variables for an optional dark theme toggle.

## UX & Accessibility
- Keyboard support: all interactive elements must be reachable via `Tab`. Provide keyboard controls for moving focus and moving cards between lists (e.g., focus a card, press a shortcut or use move buttons).
- ARIA: use appropriate roles (list, listitem, button), aria-grabbed during DnD, and announce major state changes via a live region for screen readers.
- Focus management: when opening modals or editors, trap focus and return it when closed.
- Reduced-motion: respect `prefers-reduced-motion`.
- Progressive enhancement: core actions (add/edit/delete) should work with basic JS; ensure graceful failure or instructions if JS unavailable.

## Data & Persistence
- State schema (example):

	{
		"boards": [{
			"id": "board_1",
			"title": "My Board",
			"lists": [{
				"id": "list_1",
				"title": "Todo",
				"cards": [{ "id": "card_1", "title": "Task", "description": "...", "labels": [] }]
			}]
		}],
		"meta": { "version": 1 }
	}

- Save on every meaningful change with debounced writes (e.g., 300ms) to reduce thrashing and avoid corrupting data on rapid interactions.
- Provide an import/export JSON option for backups and migration.

## Implementation Notes & Best Practices
- Single-page app with modular files: `index.html`, `styles.css`, `app.js` (or small module files).
- Use event delegation for list/card actions to keep JS small and efficient.
- Encapsulate state management in a tiny module with functions: `loadState()`, `saveState()`, `createList()`, `createCard()`, `moveCard()`.
- Drag-and-drop: use `data-*` attributes to store ids, set `draggable=true` on cards, and maintain a lightweight drag overlay for smooth visuals.
- Undo stack: implement a simple undo for destructive actions (delete list/card) via ephemeral toasts with an undo button.

## Testing, QA & Performance
- Cross-browser: validate on Chromium-based, Firefox, and Safari (desktop + mobile). Test touch drag interactions.
- Accessibility testing: run axe or Lighthouse audits and fix high-severity issues.
- Performance: avoid layout thrashing; use transforms for position changes; limit expensive DOM operations during drag.

## Deliverables
- A runnable single-page frontend that opens in the browser (no build step required) and demonstrates all core features.
- A short README with run instructions and design decisions.
- Well-commented source code with clear separation between state, rendering, and behavior.

## Run / Try Locally
- Open `index.html` in a browser (or run a tiny static server: `npx http-server` or `python -m http.server`).

## Checklist (for this implementation)
- [ ] Project scaffold (HTML/CSS/JS) created and documented
- [ ] Lists (columns) implemented with create/edit/delete
- [ ] Cards implemented with create/edit/delete/reorder
- [ ] Drag-and-drop between lists with clear drop targets
- [ ] Persistent state in `localStorage` with debounced saves
- [ ] Responsive styles and accessible keyboard controls
- [ ] Visual polish: motion, shadows, and subtle transitions
- [ ] Undo for destructive actions via toast
- [ ] Export/import backup feature

## Optional Production Enhancements (TODO)
- Add labels, due dates, and card assignees with small data model extensions
- Add multi-board support and a tiny sidebar for board switching
- Add unit tests for critical state functions and end-to-end smoke tests
- Add theming toggles (dark mode) and persist theme preference

## Notes for Implementer
- Prioritize clarity and maintainability over clever one-liners. Keep functions small and pure where practical.
- Leave inline TODO comments for future refactors and optimizations.
- If you want, I can implement the initial UI (HTML/CSS/JS) following these guidelines — ask me to scaffold it and I will.
