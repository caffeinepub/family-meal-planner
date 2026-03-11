# Family Meal Planner

## Current State
Dinner and Lunch Ideas tabs each have entries with two fields: Name and Link. Entries can be toggled to This Week. Backend stores `DinnerIdea` and `LunchIdea` with fields: id, name, placeSeen, link, thisWeek.

## Requested Changes (Diff)

### Add
- `recipe` text field to `DinnerIdea` and `LunchIdea` types in backend
- `updateDinnerIdeaRecipe(id, recipe)` and `updateLunchIdeaRecipe(id, recipe)` backend functions
- Recipe textarea input in the add-entry form (name / link / recipe — three fields)
- When a recipe is saved and non-empty, show a clickable "Recipe" text link on that row
- Full-screen recipe overlay panel that slides over the whole app when Recipe link is tapped, showing: dish name at top, recipe text below, Edit button to edit the recipe text in-place, Back button to return
- Recipe overlay must match the existing dark brown / gold / GFS Didot design

### Modify
- `addDinnerIdea` and `addLunchIdea` backend calls to include recipe parameter
- Pending refs in App.tsx to include recipe field
- DinnerIdeasPanel and LunchIdeasPanel to pass recipe through and show recipe link/overlay
- backend.d.ts to add recipe field and new update functions

### Remove
- Nothing removed

## Implementation Plan
1. Update `main.mo`: add `recipe` to both types, add recipe param to add functions, add `updateDinnerIdeaRecipe` and `updateLunchIdeaRecipe`
2. Update `backend.d.ts`: add `recipe` field to interfaces, add new update function signatures
3. Update `App.tsx`:
   - Add `onUpdateRecipe` action to dinner/lunch actions
   - Add recipe input to add forms (third field after link)
   - Add RecipePage full-screen overlay component (name header, recipe text, edit toggle, back button)
   - Show "Recipe" clickable link on rows that have a saved recipe
   - Wire up RecipePage open/close state
