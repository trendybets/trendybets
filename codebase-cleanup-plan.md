# TrendyBets Codebase Cleanup Plan

This document outlines the plan for cleaning up and consolidating the TrendyBets codebase. We'll work through each item systematically, checking them off as we complete them and verify that functionality still works.

## 1. Utility Files Consolidation

- [x] **1.1 Consolidate `app/lib/utils.ts` and `lib/utils.ts`**
  - Both contain the `cn()` function for Tailwind class merging
  - Move all utility functions to `lib/utils.ts`
  - Update imports across the codebase
  - Verify that UI components still render correctly

- [x] **1.2 Organize utility functions by domain**
  - [x] Move `normalizeTeamName` and `normalizePlayerId` functions to `lib/utils.ts`
  - [x] Create specialized utility files (e.g., `date-utils.ts`, `string-utils.ts`, `ui-utils.ts`)

## 2. Environment Variables Consolidation

- [x] **2.1 Standardize on `lib/env.ts`**
  - [x] Remove `app/lib/env.ts`
  - [x] Ensure `lib/env.ts` contains all necessary environment variables
  - [x] Verify that all environment variables are properly accessed

## 3. Database Files Consolidation

- [x] **3.1 Consolidate `app/lib/database.ts` and `lib/database.ts`**
  - [x] Merge unique functions from both files into `lib/database.ts`
  - [x] Create a single point of initialization for the Supabase client
  - [x] Update imports across the codebase
  - [x] Verify that all database operations still work

- [x] **3.2 Organize database functions by domain**
  - [x] Created specialized database files (`user-db.ts`, `games-db.ts`, `odds-db.ts`, `bets-db.ts`)

## 4. Components Directories Consolidation

- [x] **4.1 Standardize on components directories**
  - [x] Keep `components/` for general-purpose and UI components
  - [x] Keep `app/components/` for application-specific components
  - [x] Move UI components from `app/components/ui` to `components/ui`
  - [x] Verify that all UI components render correctly

- [x] **4.2 Resolve duplicate components**
  - [x] Rename `app/components/game-card.tsx` to `app/components/simple-game-card.tsx`
  - [x] Remove unused `game-card.tsx` files
  - [x] Ensure consistent styling and behavior

## 5. API Routes Optimization

- [ ] **5.1 Review sync-related API routes**
  - [ ] Analyze functionality of all sync routes (`sync-fixtures`, `sync-players`, etc.)
  - [ ] Identify opportunities for consolidation
  - [ ] Consider implementing a more modular sync system

- [ ] **5.2 Standardize error handling**
  - [ ] Implement consistent error handling pattern across all API routes
  - [ ] Ensure proper logging and client-friendly error messages

## 6. Project Cleanup

- [x] **6.1 Clean up debug/test files**
  - [x] Move JSON files (`player_props_response.json`, etc.) to a dedicated directory (`debug/json`)
  - [x] Move Python scripts (`check_player.py`, `debug_player.py`) to a dedicated directory (`debug/scripts`)
  - [x] Move other test files (`test_supabase.js`) to the debug/scripts directory

- [x] **6.2 Standardize configuration files**
  - [x] Choose between `next.config.js` and `next.config.mjs` (kept `next.config.js`)
  - [x] Choose between `postcss.config.js` and `postcss.config.mjs` (kept `postcss.config.js`)
  - [x] Choose between `tailwind.config.js` and `tailwind.config.ts` (kept `tailwind.config.js`)
  - [x] Remove the unused configuration files
  - [x] Verify that Next.js configuration still works correctly

## 7. Code Quality Improvements

- [ ] **7.1 Implement consistent code formatting**
  - [ ] Ensure consistent use of TypeScript types
  - [ ] Add missing type definitions where needed

- [ ] **7.2 Improve documentation**
  - [ ] Add JSDoc comments to key functions
  - [ ] Update README with current project structure

## Progress Tracking

As we work through each item, we'll:
1. Make the necessary changes
2. Test to ensure functionality still works
3. Check off the item in this document
4. Commit the changes with a descriptive message

This systematic approach will help us maintain a clean and organized codebase while ensuring that all functionality continues to work as expected. 