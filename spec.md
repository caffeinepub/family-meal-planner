# Family Meal Planner

## Current State
- Full-page leopard print background with a dark brown semi-transparent overlay
- Solid dark brown blocks (`.leopard-bg`) used as headers for names row, day headers, and shopping list header
- Meal type label "Breakfast" truncates in the 52px gutter column and wraps with a hyphen
- All content is in a single scrolling page: planner table + shopping list at the bottom
- Shopping list has one "Clear All" button with confirmation dialog
- No "For the House" list exists
- No notification system

## Requested Changes (Diff)

### Add
- Tab system at the top of the main content area: "Planner", "Shopping List", "For the House"
- "For the House" tab: identical UI/behaviour to the Shopping List but labelled differently
- Both Shopping List and For the House to have two clear buttons: "Clear All" and "Clear All Not Selected" (with confirmation dialogs for each)
- Notification system: when any user makes a change (meal entry, shopping item add/check/clear, house item add/check/clear), a debounced notification toast fires after a short pause (3 seconds) to allow the user to finish entering data before alerting

### Modify
- Remove the solid dark brown `.leopard-bg` background from names row, day headers, and shopping list header — replace with fully transparent so the background leopard print shows through
- Fix "Breakfast" label truncation: increase gutter width or reduce font size / abbreviate so the full word fits on one line without hyphenation
- Planner content (7 day cards + names header) moves under the "Planner" tab
- Shopping list moves under the "Shopping List" tab
- Utility bar (sync indicator, clear week, names) stays visible above tabs at all times

### Remove
- The brown solid block styling from day headers, names row, and shopping list header section

## Implementation Plan
1. CSS: change `.leopard-bg` to be fully transparent (no background colour) so the page background shows through
2. CSS: increase meal gutter width from 52px to ~68px (or reduce `.meal-label` font size) so "Breakfast" fits without wrapping
3. Frontend App.tsx: add tab state (`planner | shopping | house`), render shadcn `Tabs` component below the utility bar
4. Move day cards + names header inside the Planner tab content
5. Move `<ShoppingList>` inside the Shopping List tab content
6. Create `<HouseList>` component — copy of ShoppingList with different label, storage key, and heading text; use a separate localStorage key (`houseList`)
7. Add "Clear All Not Selected" button (with confirmation) to both ShoppingList and HouseList — removes only items where `purchased === false`
8. Add debounced notification: create a `useNotify` hook that accepts a dependency value; when the value changes, set a 3-second timer and then fire a `toast` ("Changes saved — your partner will be notified"); clear the timer if another change arrives before it fires
9. Wire `useNotify` to meal plan saves, shopping list mutations, and house list mutations
