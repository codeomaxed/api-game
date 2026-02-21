# D&D 5e AI-Driven Browser RPG - Comprehensive Project Analysis

## Executive Summary

This is a Next.js 14+ TypeScript application implementing a dark fantasy D&D 5e browser-based RPG. The game features AI-generated narratives (via OpenAI/Anthropic) and images (via fal.ai), procedurally generated dungeons, turn-based combat, character progression, and an inventory system. The aesthetic is inspired by Bloodborne, Dark Souls, and Buriedbornes.

**Current Status**: Functional but experiencing issues with immersive choice text display - buttons show generic "Go North" labels instead of AI-generated descriptive text like "Step through the open stone archway".

---

## Architecture Overview

### Technology Stack

- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **UI**: React 18.2 with Tailwind CSS
- **State Management**: 
  - React Context API (Character state)
  - Zustand (Dungeon state)
- **AI Services**:
  - OpenAI/Anthropic (via OpenRouter) for narrative generation
  - fal.ai (z-image/turbo) for image generation
- **Styling**: Tailwind CSS with custom dark fantasy theme

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Next.js App Router                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │   page.tsx   │  │  layout.tsx │  │  globals.css │   │
│  └──────────────┘  └──────────────┘  └──────────────┘   │
└─────────────────────────────────────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
┌───────▼──────┐  ┌──────▼──────┐  ┌──────▼──────┐
│  Components  │  │  API Routes  │  │    Lib      │
│              │  │              │  │             │
│ - GameUI     │  │ - generate-  │  │ - ai/       │
│ - Character  │  │   story      │  │ - character/│
│ - Inventory  │  │ - generate-  │  │ - dungeon/  │
│ - MiniMap    │  │   image      │  │ - game/     │
└──────────────┘  └──────────────┘  └─────────────┘
```

---

## Project Structure

### Directory Breakdown

```
rpg-game/
├── app/                          # Next.js App Router
│   ├── api/                      # API Routes (Server-side)
│   │   ├── generate-story/       # Narrative generation endpoint
│   │   │   └── route.ts          # Streaming story generation (OpenRouter/Anthropic)
│   │   └── generate-image/       # Image generation endpoint
│   │       └── route.ts          # Image generation (fal.ai HTTP fallback)
│   ├── layout.tsx                # Root layout with CharacterProvider
│   ├── page.tsx                  # Main entry point
│   └── globals.css               # Global styles + Tailwind
│
├── components/                   # React Components
│   ├── CharacterCreation.tsx     # Character creation UI
│   ├── CharacterDisplay.tsx      # Character stats display
│   ├── DungeonMiniMap.tsx        # Procedural dungeon minimap
│   ├── GameInterface.tsx         # Main game UI (986 lines - largest component)
│   ├── Inventory.tsx             # Equipment & backpack UI
│   └── Layout.tsx                # Main layout wrapper
│
├── lib/                          # Core Game Logic
│   ├── ai/                       # AI Integration
│   │   ├── fal-realtime.ts       # WebSocket manager for fal.ai
│   │   ├── images.ts             # Image generation functions
│   │   └── narrative.ts          # Narrative generation (legacy)
│   │
│   ├── character/                # Character System
│   │   ├── CharacterContext.tsx  # React Context for character state
│   │   └── defaultCharacter.ts   # Character creation utilities
│   │
│   ├── dungeon/                  # Dungeon System
│   │   ├── content.ts            # Room content generation
│   │   ├── generator.ts          # Procedural dungeon generation
│   │   ├── images.ts             # Dungeon image generation
│   │   ├── prompts.ts            # AI prompt construction
│   │   ├── store.ts              # Zustand store for dungeon state
│   │   └── types.ts              # Dungeon type definitions
│   │
│   ├── game/                     # Game Mechanics
│   │   ├── actionPoints.ts       # Action point system
│   │   ├── combat.ts             # Combat calculations
│   │   ├── GameEngine.ts         # Core game engine
│   │   ├── leveling.ts           # XP and leveling system
│   │   └── loot.ts               # Loot generation
│   │
│   ├── hooks/                    # Custom React Hooks
│   │   └── use-game-generation.ts # Streaming story/image generation hook
│   │
│   └── story/                    # Story System (Legacy/Unused?)
│       ├── context.ts             # Story context manager
│       ├── events.ts             # Story event types
│       └── locations.ts          # Location definitions
│
└── types/                        # TypeScript Definitions
    ├── character.ts              # Character, Class, Race, Item types
    └── game.ts                   # GameNode, Choice, Combat types
```

---

## Core Systems Analysis

### 1. Character System

**Location**: `lib/character/CharacterContext.tsx`, `types/character.ts`

**Features**:
- D&D 5e ability scores (STR, DEX, CON, INT, WIS, CHA)
- Class and race selection
- Equipment system with stat modifiers
- Inventory management
- HP and resource pools (Mana, Ki, etc.)
- XP and leveling (levels 1-20)
- Action points system

**State Management**: React Context API
- Provider wraps entire app in `app/page.tsx`
- Character state persists in memory (not persisted to localStorage)

**Key Functions**:
- `createDefaultCharacter()` - Creates new character
- `calculateTotalStats()` - Stats + equipment modifiers
- `calculateArmorClass()` - AC calculation
- `getProficiencyBonus()` - Proficiency based on level

### 2. Dungeon System

**Location**: `lib/dungeon/`

**Architecture**:
- **Generator** (`generator.ts`): Procedurally generates dungeon map
  - Grid-based (12x20 cells)
  - Vertical orientation (bottom to top progression)
  - Room types: START, BOSS, NORMAL, TREASURE, EVENT, MERCHANT, DEAD_END
  - Connection types: arched_stone, heavy_door, iron_bars, collapsed_hole, grand_double_doors
  - Main path with branches
  
- **Store** (`store.ts`): Zustand store for dungeon state
  - Manages node map, player location, visited nodes
  - Fog of war system (visited vs seen nodes)
  - Room content caching
  
- **Content Generator** (`content.ts`): Generates room descriptions and choices
  - Calls `/api/generate-story` for narrative
  - Parses streaming response
  - Extracts image prompt and story text
  - Generates image via fal.ai
  - Caches room content for revisits

**Data Flow**:
```
DungeonGenerator → DungeonStore → GameInterface → generateRoomContent → API → AI Response → Parse → Cache
```

### 3. Game Interface Component

**Location**: `components/GameInterface.tsx` (986 lines)

**Responsibilities**:
- Main game UI rendering
- Room entry handling
- Choice parsing from AI responses
- Button rendering with immersive text
- Image display
- Story log management
- Character movement

**Key Functions**:
- `getDirectionInfo()` - Extracts direction and text from choice strings
- `ensureChoiceFormat()` - Transforms choices to correct format
- `handleRoomEntry()` - Processes room entry and triggers generation
- `handleChoice()` - Handles player choice selection

**Current Issue**: Choice text parsing and display logic has multiple layers of fallbacks that may be interfering with immersive text display.

### 4. AI Integration

#### Narrative Generation

**Location**: `app/api/generate-story/route.ts`, `lib/hooks/use-game-generation.ts`

**Flow**:
1. GameInterface calls `generateStream()` hook
2. Hook calls `/api/generate-story` endpoint
3. Endpoint uses OpenRouter API (Gemini Flash model)
4. Response streams in SSE format
5. Hook parses stream, detects `|||` separator
6. Extracts image prompt and narrative
7. Triggers image generation when separator found
8. Updates state with story text and image URL

**Prompt Construction**:
- Character stats and class
- Current room type and exits
- Story history (last 5 events)
- Exit visual types (arched_stone, heavy_door, etc.)
- Strict format requirements for choices: `[NORTH] Immersive text`

#### Image Generation

**Location**: `lib/ai/images.ts`, `lib/ai/fal-realtime.ts`, `app/api/generate-image/route.ts`

**Flow**:
1. Image prompt extracted from story (before `|||` separator)
2. WebSocket connection to fal.ai (preferred, fast)
3. Falls back to HTTP API if WebSocket unavailable
4. Uses `fal-ai/z-image/turbo` model
5. Returns image URL for display

**Optimization**: WebSocket connection reused across requests for speed.

### 5. State Management

**Character State**: React Context (`CharacterContext.tsx`)
- Character object
- Update functions (HP, XP, equipment, etc.)
- Computed values (total stats, AC, proficiency)

**Dungeon State**: Zustand Store (`lib/dungeon/store.ts`)
- Node map (Map<string, DungeonNode>)
- Player location
- Visited/seen nodes (fog of war)
- Room content cache

**Game State**: Local component state + GameEngine class
- Current node
- Story context
- Combat state (if in combat)

### 6. Game Mechanics

#### Combat System
**Location**: `lib/game/combat.ts`
- Turn-based combat
- Attack roll calculations (d20 + modifiers)
- Damage calculations (dice parsing)
- Critical hits (natural 20)
- Enemy AI attacks

#### Leveling System
**Location**: `lib/game/leveling.ts`
- XP table (levels 1-20)
- Level calculation from XP
- HP increase on level up
- Ability Score Improvements (levels 4, 8, 12, 16, 19)

#### Action Points
**Location**: `lib/game/actionPoints.ts`
- Prevents choice spamming
- Each action costs AP
- Regenerates over time or on rest

---

## Data Flow Diagrams

### Room Entry Flow

```
Player Enters Room
    │
    ├─→ Check Cache (DungeonStore)
    │   │
    │   ├─→ Cached? → Load cached content → Display
    │   │
    │   └─→ Not Cached? → Continue...
    │
    ├─→ handleRoomEntry() (GameInterface)
    │   │
    │   ├─→ Build AI Prompt (with exits, character, history)
    │   │
    │   ├─→ Call generateStream() hook
    │   │   │
    │   │   ├─→ POST /api/generate-story
    │   │   │   │
    │   │   │   ├─→ OpenRouter API (Gemini Flash)
    │   │   │   │
    │   │   │   └─→ Stream SSE response
    │   │   │
    │   │   ├─→ Parse stream, detect ||| separator
    │   │   │
    │   │   ├─→ Extract image prompt → Generate image (fal.ai)
    │   │   │
    │   │   └─→ Extract story text → Parse choices
    │   │
    │   ├─→ Parse Choices from Story Text
    │   │   │
    │   │   ├─→ Match regex: /CHOICES?:?\s*\n((?:-.*\n?)+)/i
    │   │   │
    │   │   ├─→ Parse each line: /^-\s*\[(NORTH|SOUTH|EAST|WEST)\]\s*([\s\S]+)/i
    │   │   │
    │   │   └─→ Store as: { text: "[NORTH] Step through...", metadata: { direction: "north" } }
    │   │
    │   ├─→ Transform Choices (ensureChoiceFormat)
    │   │
    │   ├─→ Update currentNode state
    │   │
    │   └─→ Save to DungeonStore cache
    │
    └─→ Render UI with choices
```

### Choice Display Flow

```
Choice Object in currentNode.choices
    │
    ├─→ ensureChoiceFormat() transformation
    │   │
    │   ├─→ Has [DIRECTION] tag? → Keep as-is
    │   │
    │   └─→ No tag but has metadata.direction? → Add tag
    │
    ├─→ getDirectionInfo(choice.text)
    │   │
    │   ├─→ String slicing: indexOf(']')
    │   │
    │   ├─→ Extract tag: substring(1, closingBracketIndex)
    │   │
    │   └─→ Extract text: substring(closingBracketIndex + 1).trim()
    │
    ├─→ Button Rendering Logic
    │   │
    │   ├─→ Check if displayText is generic ("Go North")
    │   │
    │   ├─→ If generic → Use full choice.text
    │   │
    │   └─→ Otherwise → Use displayText
    │
    └─→ Render button with icon + text
```

---

## Component Hierarchy

```
App (page.tsx)
└── CharacterProvider
    └── GameContent
        ├── CharacterCreation (if no character)
        │
        └── Layout (if character exists)
            ├── Inventory (Left Sidebar)
            │   ├── Equipment Slots
            │   └── Backpack Items
            │
            └── GameInterface (Main Area)
                ├── DungeonMiniMap (Top Right)
                ├── Image Display (Center)
                ├── Story Log (Below Image)
                └── Choice Buttons (Bottom)
                    └── CharacterDisplay (Left of Choices)
```

---

## Known Issues & Technical Debt

### Critical Issues

1. **Immersive Choice Text Not Displaying** (Current Issue)
   - **Location**: `components/GameInterface.tsx`
   - **Problem**: Buttons show "Go North" instead of "Step through the open stone archway"
   - **Root Causes**:
     - Choice parsing may be failing to capture full text
     - Cached choices may have generic text from old fallback logic
     - Display logic may be using wrong fallback path
   - **Attempted Fixes**:
     - Enhanced regex parsing with `[\s\S]+` for newlines
     - Added `ensureChoiceFormat()` transformation
     - Improved `getDirectionInfo()` with string slicing
     - Added generic text detection
     - Multiple debugging logs added
   - **Status**: Still not working - needs deeper investigation

2. **Choice Parsing Fragility**
   - Multiple regex patterns for different formats
   - Fallback logic creates generic choices when parsing fails
   - No validation that parsed choices match expected format

3. **Cached Content Bypass**
   - Cached room content bypasses all parsing fixes
   - Old cached choices may have wrong format
   - Transformation applied but may not be sufficient

### Code Quality Issues

1. **GameInterface.tsx is Too Large** (986 lines)
   - Should be split into smaller components
   - Choice parsing logic could be extracted
   - Button rendering could be separate component

2. **Multiple State Management Patterns**
   - Character: React Context
   - Dungeon: Zustand
   - Game: Local state + GameEngine class
   - Inconsistent patterns make debugging harder

3. **Error Handling**
   - Many try-catch blocks but errors may be swallowed
   - No user-facing error messages for API failures
   - Image generation failures may not be handled gracefully

4. **Type Safety**
   - Some `any` types in function parameters
   - GameEngine uses `any` for some parameters
   - Could benefit from stricter typing

5. **Testing**
   - No test files found
   - Critical parsing logic untested
   - Game mechanics untested

### Performance Concerns

1. **Image Generation**
   - WebSocket connection may not be properly reused
   - Multiple image generation requests could be optimized
   - No image caching strategy beyond room content cache

2. **Story Generation**
   - Streaming is good, but parsing happens after stream completes
   - Could parse incrementally for better UX

3. **Dungeon Generation**
   - Generator may fail and retry up to 20 times
   - No validation of generated dungeon quality

---

## Detailed File Analysis

### components/GameInterface.tsx (986 lines)

**Purpose**: Main game interface component

**Key Sections**:
1. **Helper Functions** (lines 28-115)
   - `getIcon()` - Direction to emoji mapping
   - `ensureChoiceFormat()` - Choice transformation
   - `getDirectionInfo()` - Text extraction from choices

2. **Component State** (lines 117-129)
   - Character, nodes, story log
   - Loading states
   - Image URLs (multiple sources)
   - GameEngine ref

3. **Dungeon Entry** (lines 131-212)
   - `enterDungeon()` - Initial dungeon entry
   - Generates dungeon map
   - Calls `handleRoomEntry()`

4. **Room Entry Handler** (lines 214-339)
   - Checks cache first
   - Builds AI prompt with exits and character info
   - Calls streaming generation
   - Manages loading states

5. **Story Parsing** (lines 341-555)
   - Parses streaming story text
   - Extracts choices from `CHOICES:` section
   - Multiple regex patterns for different formats
   - Fallback to generic choices if parsing fails
   - Saves to cache

6. **Choice Handling** (lines 616-682)
   - `handleChoice()` - Processes player choices
   - Movement handling
   - Action point checking

7. **UI Rendering** (lines 684-986)
   - Image display with loading states
   - Story log with auto-scroll
   - Choice buttons with filtering and sorting
   - Character display integration

**Issues**:
- Very large file (986 lines)
- Complex choice parsing logic
- Multiple image URL sources (hook, state, cache)
- Debugging logs scattered throughout

### lib/dungeon/generator.ts

**Purpose**: Procedural dungeon generation

**Algorithm**:
1. Define waypoints (start, intermediate, boss)
2. Create linear path through waypoints
3. Add branches with probability
4. Assign room types based on position
5. Create connections with visual types

**Room Types**:
- START: Entrance (green, radius 6)
- BOSS: Final boss (red, radius 12)
- NORMAL: Regular rooms (gray, radius 5)
- TREASURE: Loot rooms (yellow, radius 7)
- EVENT: Special events (purple, radius 6)
- MERCHANT: Shop (orange, radius 8)
- DEAD_END: Dead ends (dark gray, radius 4)

**Connection Types**:
- `arched_stone` - Open stone archway
- `heavy_door` - Reinforced wooden door
- `iron_bars` - Rusted iron gate
- `collapsed_hole` - Jagged hole in wall
- `grand_double_doors` - Ornate double doors

### lib/dungeon/store.ts

**Purpose**: Zustand store for dungeon state

**State**:
- `nodes`: Map of all dungeon nodes
- `startNodeId`: Starting node ID
- `bossNodeId`: Boss node ID
- `playerLocation`: Current node ID
- `visitedNodes`: Set of visited node IDs
- `seenNodes`: Set of seen node IDs (for minimap)

**Actions**:
- `generateDungeon()` - Creates new dungeon
- `movePlayer()` - Moves player to adjacent node
- `getCurrentNode()` - Gets current node
- `enterRoom()` - Generates/loads room content
- `updateRoomContent()` - Updates cached content

### lib/hooks/use-game-generation.ts

**Purpose**: Custom hook for streaming story/image generation

**Features**:
- Streaming story generation
- Image prompt extraction
- Parallel image generation
- Client-side caching
- Story history tracking

**Flow**:
1. Receives prompt and node info
2. Calls `/api/generate-story`
3. Parses SSE stream
4. Detects `|||` separator
5. Extracts image prompt (before separator)
6. Extracts story text (after separator)
7. Triggers image generation
8. Updates state

### app/api/generate-story/route.ts

**Purpose**: Server-side story generation endpoint

**Features**:
- Uses OpenRouter API (Gemini Flash model)
- Constructs detailed system prompt
- Includes character info, exits, history
- Returns streaming SSE response
- Handles errors gracefully

**Prompt Structure**:
- Character information
- Current room type and exits
- Exit visual types (for immersive descriptions)
- Story history
- Strict format requirements for choices

### app/api/generate-image/route.ts

**Purpose**: HTTP fallback for image generation

**Features**:
- Uses fal.ai HTTP API
- Falls back if WebSocket unavailable
- Handles errors
- Returns image URL

---

## Current Issue: Immersive Choice Text

### Problem Description

Buttons display generic text ("Go North", "Go South") instead of immersive AI-generated text ("Step through the open stone archway", "Approach the rusted iron gate").

### Investigation Points

1. **AI Response Format**
   - AI is generating correct format: `[NORTH] Step through the open stone archway`
   - Visible in story text but not on buttons

2. **Parsing Logic** (lines 399-555 in GameInterface.tsx)
   - Regex: `/^-\s*\[(NORTH|SOUTH|EAST|WEST)\]\s*([\s\S]+)/i`
   - Should capture full text after direction tag
   - Stores as: `text: "[NORTH] Step through..."`

3. **Transformation** (lines 43-66)
   - `ensureChoiceFormat()` adds tags if missing
   - Applied to cached and fresh choices

4. **Display Logic** (lines 883-951)
   - `getDirectionInfo()` extracts text after tag
   - Generic text detection
   - Multiple fallback paths

### Possible Root Causes

1. **Cached Choices Have Wrong Format**
   - Old cached rooms may have "Go North" text
   - Transformation adds tag but doesn't fix generic text
   - Need to clear cache or fix transformation

2. **Parsing Not Matching**
   - AI may be using different format
   - Regex may not be matching correctly
   - Need to check console logs

3. **Display Logic Using Wrong Path**
   - Generic text detection may be triggering incorrectly
   - Fallback to `choice.text` may have wrong format
   - Need to trace execution

### Recommended Debugging Steps

1. Check browser console for `[PARSER]` logs
2. Verify `choice.text` format in logs
3. Check if `getDirectionInfo()` is extracting correctly
4. Verify transformation is being applied
5. Check if cached content is being used

---

## Recommendations

### Immediate Fixes

1. **Fix Choice Text Display**
   - Add comprehensive logging to trace the issue
   - Verify AI is generating correct format
   - Ensure parsing captures full text
   - Fix transformation to handle generic text
   - Clear old cached content

2. **Simplify Choice Parsing**
   - Consolidate regex patterns
   - Remove unnecessary fallbacks
   - Add validation after parsing

3. **Improve Error Handling**
   - Show user-friendly error messages
   - Log errors to console with context
   - Handle API failures gracefully

### Code Quality Improvements

1. **Refactor GameInterface.tsx**
   - Extract choice parsing to separate function/file
   - Extract button rendering to component
   - Extract room entry logic to hook
   - Target: < 300 lines per file

2. **Standardize State Management**
   - Consider moving all state to Zustand
   - Or consolidate to React Context
   - Document state management patterns

3. **Add Type Safety**
   - Remove `any` types
   - Add strict type checking
   - Use TypeScript strict mode

4. **Add Testing**
   - Unit tests for parsing logic
   - Integration tests for game flow
   - E2E tests for critical paths

### Performance Optimizations

1. **Image Caching**
   - Implement proper image caching strategy
   - Preload images for adjacent rooms
   - Use image optimization

2. **Incremental Parsing**
   - Parse choices as they stream in
   - Show buttons as soon as available
   - Don't wait for full stream

3. **Dungeon Generation**
   - Validate generated dungeons
   - Cache successful generations
   - Optimize generation algorithm

### Feature Enhancements

1. **Save/Load System**
   - Persist character to localStorage
   - Save game state
   - Load previous games

2. **Combat System**
   - Currently basic, needs expansion
   - Add spell casting
   - Add status effects

3. **Inventory System**
   - Currently display-only
   - Add item management
   - Add item interactions

---

## Environment Variables

Required environment variables:
- `NEXT_PUBLIC_OPENAI_API_KEY` - OpenRouter API key (or OpenAI/Anthropic)
- `NEXT_PUBLIC_FAL_API_KEY` - fal.ai API key for image generation

---

## Dependencies

### Production
- `react` ^18.2.0
- `react-dom` ^18.2.0
- `next` ^14.0.0
- `@fal-ai/client` ^1.7.2
- `openai` ^4.20.0
- `zustand` ^4.4.7

### Development
- `typescript` ^5.2.2
- `tailwindcss` ^3.3.5
- `eslint` ^8.51.0

---

## Build & Run

```bash
# Install dependencies
npm install

# Development server (port 3001)
npm run dev

# Production build
npm run build

# Production server
npm start
```

---

## File Size Analysis

- **Largest Files**:
  - `components/GameInterface.tsx`: 986 lines
  - `lib/dungeon/generator.ts`: ~282 lines
  - `lib/hooks/use-game-generation.ts`: ~414 lines
  - `app/api/generate-story/route.ts`: ~403 lines

- **Most Complex**:
  - `GameInterface.tsx` - Multiple responsibilities
  - Choice parsing logic - Multiple regex patterns
  - State management - Multiple patterns

---

## Conclusion

This is a well-structured RPG game with solid architecture and good separation of concerns. The main issue is the immersive choice text display, which appears to be a combination of parsing, caching, and display logic problems. The codebase would benefit from refactoring the large GameInterface component and adding comprehensive testing.

The game successfully implements:
- ✅ Procedural dungeon generation
- ✅ AI-driven narrative generation
- ✅ AI image generation
- ✅ D&D 5e character system
- ✅ Combat mechanics
- ✅ Inventory system
- ✅ Leveling system

Areas needing attention:
- ⚠️ Choice text display (current issue)
- ⚠️ Code organization (large files)
- ⚠️ Error handling
- ⚠️ Testing coverage
- ⚠️ State management consistency













