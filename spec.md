# Family Meal Planner

## Current State
The app has a full UI (planner, shopping list, for the house tabs) but all data is stored in `localStorage` on each device. This means changes made on one phone never appear on the other person's phone — there is no shared state.

The backend was previously an empty actor with no methods. It has now been updated with a full Motoko implementation that stores all data server-side and exposes query/update functions.

## Requested Changes (Diff)

### Add
- Backend integration: all reads and writes now go through the ICP canister backend instead of localStorage
- Polling mechanism: poll `getLastModified()` every 5 seconds to detect remote changes, then fetch fresh data
- Loading states when the app is first fetching data from the backend

### Modify
- `App.tsx`: Replace all `localStorage.getItem/setItem` calls with backend actor calls
  - `loadMealPlan()` → `actor.getMealPlan()`
  - `saveMealPlan()` / `setMeal` → `actor.setMeal(key, value)`
  - `setNames` → `actor.setNames(name1, name2)`
  - `clearMeals` → `actor.clearMeals()`
  - `loadList(SHOPPING_KEY)` → `actor.getShoppingList()`
  - Shopping list mutations → `actor.addShoppingItem`, `actor.toggleShoppingItem`, `actor.clearShoppingList`, `actor.clearTickedShoppingItems`
  - House list mutations → `actor.addHouseItem`, `actor.toggleHouseItem`, `actor.clearHouseList`, `actor.clearTickedHouseItems`
- Polling now compares `lastModified` bigint from backend to detect remote changes
- `MealCell` should call `onSave` on blur as it does now, but `onSave` calls `actor.setMeal`
- `ListPanel` should call backend functions directly via actor prop

### Remove
- All `localStorage.getItem/setItem` logic
- `STORAGE_KEY`, `SHOPPING_KEY`, `HOUSE_KEY` constants
- `loadMealPlan()`, `saveMealPlan()`, `loadList()`, `saveList()` helper functions

## Implementation Plan
1. Import `useActor` hook in `App.tsx`
2. Use `actor` from `useActor()` for all data operations
3. On mount: fetch `getMealPlan()`, `getShoppingList()`, `getHouseList()` and set state
4. Poll `getLastModified()` every 5s; if changed, re-fetch all data and update state
5. All mutations call the appropriate actor method, then optimistically update local state
6. Show a brief loading indicator while initial data is being fetched
7. Handle errors gracefully (show toast on failure, keep UI responsive)
8. Pass actor down to `ListPanel` via props so it can call backend directly
