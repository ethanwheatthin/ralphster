# Trello-Style Kanban — Visually Polished, Production-Ready Prompt

## Overview
Build a lightweight, production-feeling Trello-style kanban SPA with an emphasis on polished visuals, consistent spacing, and a modern, flexible layout using CSS Flexbox. Prioritize a beautiful, clear UI with strong typography, spacing systems, and delightful micro-interactions while keeping the codebase small and dependency-free.

## Visual Design Goals (Primary)
- Create a cohesive design system driven by CSS variables for colors, spacing, radii, shadows, and type scales.
- Use a clear spacing scale and flexbox-first layout patterns so components feel consistently spaced and responsive.
- Prioritize readable typography, strong contrast (WCAG AA), and a clean visual hierarchy.
- Provide subtle motion and micro-interactions to improve perceived quality (transitions on hover, lift on drag, focus rings).

## Core Requirements (UI-focused)
- Boards containing multiple lists (columns) with clear visual hierarchy and consistent gutters and column spacing.
- Create, edit, and delete lists with smooth transitions and focus management.
- Create, edit, delete, and reorder cards within lists using accessible controls and drag-and-drop.
- Drag-and-drop should use HTML5 DnD or a small vanilla helper; visually lift cards with shadow and transform while dragging.
- Card details editor (modal or inline) supporting title, description, labels/tags with a polished form layout.
- Persistent storage using `localStorage` with a clear versioned schema and safe debounced writes (e.g., 300ms).

## Spacing & Layout Rules (explicit)
- Define a spacing scale in `:root`: `--space-xxs:4px; --space-xs:8px; --space-sm:12px; --space-md:16px; --space-lg:24px; --space-xl:32px;`.
- Use `gap` on flex containers instead of margin hacks. Prefer `display:flex` with `gap: var(--space-md)` for lists and `gap: var(--space-sm)` for cards.
- Consistent container padding: `padding: var(--space-lg)` for main containers; inner cards use `padding: var(--space-md)`.
- Use utility helpers (small set) for spacing if needed: `.mt-`, `.mb-`, `.px-`, but keep them minimal.

## Flexbox Patterns (recommended)
- Board layout: `.board { display:flex; gap:var(--space-lg); align-items:flex-start; overflow:auto; }`
- List column: `.list { display:flex; flex-direction:column; gap:var(--space-sm); min-width:280px; max-width:420px; }`
- Cards container: `.cards { display:flex; flex-direction:column; gap:var(--space-xs); }`
- Card: `.card { display:flex; flex-direction:column; }` — keep card content vertically stacked and let actions align right with a separate row.

## Styling & Polishing
- Design tokens in `:root` for colors, focus ring, radii and shadow levels (`--shadow-1`, `--shadow-2`).
- Use subtle shadows and transform for lift: `transform: translateY(-4px); box-shadow: var(--shadow-2);` on drag or hover (with `prefers-reduced-motion` respected).
- Provide clear focus styles: `outline-offset` and `box-shadow` focus ring.
- Microcopy and affordances: inline hints, empty state illustrations, and ARIA live region announcements for major actions.

## Accessibility & Keyboard
- Keyboard reachable controls (Tab order), and keyboard actions for moving cards between lists (e.g., focus card → keyboard menu to move left/right).
- ARIA roles: board (region), list (`list`), card (`listitem`), buttons with labels.
- Respect `prefers-reduced-motion` and provide skip links or accessible fallbacks.

## Data & Persistence (practical)
- State schema (versioned):

```json
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
```

- Save on meaningful changes with debounced writes (300ms) and provide explicit import/export for backups.

## Implementation Notes & Minimal Structure
- File scaffold: `index.html`, `styles.css`, `app.js` (or small modules). Keep CSS single-file for this small project.
- Use event delegation and small state module: `loadState()`, `saveState()`, `createList()`, `createCard()`, `moveCard()`.
- Keep code modular and well-commented; prefer clarity over cleverness.

## Visual Examples (quick snippets)
- `:root` tokens:

```css
:root {
	--space-xs: 8px; --space-sm: 12px; --space-md: 16px; --space-lg: 24px; --space-xl: 32px;
	--radius: 10px;
	--shadow-1: 0 1px 2px rgba(0,0,0,0.06);
	--shadow-2: 0 8px 20px rgba(0,0,0,0.12);
	--color-bg: #f6f7fb; --color-surface: #ffffff; --color-accent: #3b82f6;
}

.board { display:flex; gap:var(--space-lg); align-items:flex-start; padding:var(--space-lg); }
.list  { background:var(--color-surface); padding:var(--space-md); border-radius:var(--radius); box-shadow:var(--shadow-1); min-width:280px; }
.cards { display:flex; flex-direction:column; gap:var(--space-xs); }
.card  { background:linear-gradient(180deg,#fff,#fbfbff); padding:var(--space-sm); border-radius:8px; box-shadow:var(--shadow-1); }
```

## Deliverables (visual-first)
- A runnable single-page frontend demonstrating all core features with polished styling and consistent spacing.
- A short `README.md` describing design decisions and the spacing system.
- Well-commented source with clear separation: state, rendering, behavior, and a style guide section in `styles.css`.

## Checklist (visual-priority)
- [ ] Project scaffold and style tokens
- [ ] Lists implemented with consistent gaps and column spacing
- [ ] Cards implemented with polish, drag visuals, and keyboard controls
- [ ] Persistent `localStorage` with debounced writes
- [ ] Visual polish: motion, shadows, focus styles, and responsive layout
- [ ] README documenting spacing system and CSS patterns

## Next Steps for Implementer
- Scaffold the basic HTML/CSS/JS following the flexbox patterns above.
- Implement the state module and localStorage persistence.
- Add accessible keyboard controls for reordering and moving cards.
- Iterate on visual polish and test on multiple viewport sizes.

---
Focus on delightful visuals, consistent spacing, and flexbox-first layout. If you'd like, I can scaffold the full HTML/CSS/JS now with the style tokens and initial UI components.
