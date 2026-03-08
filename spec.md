# Family Meal Planner

## Current State
Full-stack meal planner with a botanical dark-green patterned background, leopard print SVG headers for day/name/shopping columns, Playfair Display + Figtree mixed fonts, 3-row meal textareas, a shopping list section with Enter-to-add and checkbox ticking, a settings dialog for names, and clear-week / clear-shopping confirmations. The layout uses a max-w-5xl horizontal table. The leopard print on headers is currently a low-fidelity SVG approximation.

## Requested Changes (Diff)

### Add
- Real leopard print image (`/assets/generated/leopard-print-tile.dim_400x400.jpg`) as the background for: names column headers, day-of-week column, and shopping list section header — replace the SVG `.leopard-bg` CSS utility with an image-based version.
- `user-scalable=no, maximum-scale=1` viewport meta to prevent pinch-to-zoom / zoom-out behavior on phones.
- Playfair Display as the SOLE font for the entire app (headings, labels, inputs, buttons, all text) — drop Figtree/body font distinction. Playfair Display is already available in `/assets/fonts/Playfair Display.woff2`.

### Modify
- **Centring**: Remove left-bias. The entire layout must be perfectly centred on screen both horizontally and vertically. On portrait phone, the table should fill available width without overflow or left-heavy padding.
- **Portrait phone optimisation**: Redesign the table for vertical phone use. Replace the horizontal 2-column meal grid with a vertical card-per-day layout that stacks naturally. Each day gets its own section: leopard print day header spanning full width, then meal rows beneath with Person 1 and Person 2 fields side by side (or stacked on very narrow screens). This avoids horizontal scroll on phones.
- **Unified font**: All text — labels, inputs, placeholders, buttons, nav — uses Playfair Display. Remove all `font-body` / `font-display` class splits; use a single `font-serif` class backed by Playfair Display throughout.
- **Leopard print headers**: Replace the SVG `.leopard-bg` implementation with a CSS class using the generated image: `background-image: url("/assets/generated/leopard-print-tile.dim_400x400.jpg"); background-size: 200px;` (or similar scale that looks bold on phone). Text on leopard must remain cream/off-white with enough contrast.
- **No zoom-out**: Add `<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">` to `index.html`.
- **Shopping list section**: Use the same real leopard print header. Layout centred, full-width on phone.
- **Overall layout**: Reduce horizontal padding on mobile so the table fills screen width. Centre the whole content vertically with even side gutters.

### Remove
- SVG-based `.leopard-bg` background-image data URI in `index.css`.
- Figtree font-face declaration and its use as a body font (Playfair Display takes over all text).
- Any `font-body` class references in App.tsx (replace with `font-serif` or remove class overrides so Playfair inherits by default).
- `min-w-[460px]` constraint on the table that forces horizontal scroll on phones.

## Implementation Plan
1. Update `index.html` viewport meta to disable user zoom.
2. In `index.css`: remove Figtree `@font-face` and `font-body` token; set `body { font-family: "Playfair Display", serif; }` as the universal default; update `.leopard-bg` to use the real image tile; keep the botanical page background and dark-green overlay.
3. In `tailwind.config.js`: collapse `fontFamily` so both `display` and `body` (or just the default) resolve to Playfair Display.
4. In `App.tsx`: 
   - Remove all `font-body` class strings.
   - Replace the wide horizontal table with a vertical card-per-day layout: each day = a `<section>` block with a full-width leopard print header showing the day name horizontally (not rotated), followed by meal rows. Each meal row shows the emoji + meal label, then two input cells side by side.
   - On mobile (default), each person's column is 50% wide. The layout fits portrait phone without scroll.
   - Centre all content: `max-w-lg mx-auto` on phone, `max-w-2xl mx-auto` on tablet+.
   - Shopping list remains below, centred and full-width within the same container.
5. Validate and fix any TypeScript/lint errors.
