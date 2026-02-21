# 🎲 D&D AI - AI-Powered Dungeon Crawler RPG

<div align="center">

![Version](https://img.shields.io/badge/version-0.1.0-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-14+-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.2-blue?logo=typescript)
![License](https://img.shields.io/badge/license-MIT-green.svg)

**An immersive, AI-driven browser RPG combining D&D 5e mechanics with cutting-edge AI for dynamic storytelling, procedural dungeons, and intelligent monster detection.**

[Features](#-features) • [Quick Start](#-quick-start) • [Architecture](#-architecture) • [Documentation](#-documentation) • [Contributing](#-contributing)

</div>

---

## 🌟 Overview

**D&D AI** is a fully-featured browser-based role-playing game that seamlessly blends traditional Dungeons & Dragons 5th Edition mechanics with modern artificial intelligence. Every adventure is unique, with AI-generated narratives, procedurally generated dungeons, intelligent monster segmentation, and dynamic visual storytelling that adapts to your choices.

### What Makes This Special?

- 🧠 **AI-Powered Everything**: Stories, images, and encounters are dynamically generated using state-of-the-art AI models
- 🎯 **Pixel-Perfect Monster Detection**: Advanced SAM-3 segmentation isolates monsters with glowing visual effects and particle systems
- 🗺️ **Procedural Dungeon Generation**: Every playthrough features a unique dungeon layout with branching paths and multiple room types
- ⚔️ **Full D&D 5e Compliance**: Complete implementation of classes, races, combat, leveling, and equipment systems
- 🎨 **Dark Fantasy Aesthetic**: Gothic horror visuals inspired by Bloodborne, Dark Souls, and Buriedbornes
- ⚡ **Lightning-Fast Story Generation**: Optimized AI pipeline delivers immersive narratives in 2-3 seconds

---

## ✨ Features

### 🎮 Core Gameplay

#### Character Creation & Progression
- **13 D&D 5e Classes**: Artificer, Barbarian, Bard, Cleric, Druid, Fighter, Monk, Paladin, Ranger, Rogue, Sorcerer, Warlock, Wizard
- **30+ Playable Races**: From Humans to Dragonborn, each with unique traits and ability score bonuses
- **Background System**: Choose backgrounds that grant skill proficiencies and roleplaying hooks
- **Ability Score Allocation**: Customize your character's strengths and weaknesses
- **Visual Character Portraits**: AI-generated character images that update with equipment changes
- **Leveling System**: Full D&D 5e progression from level 1 to 20 with XP tracking
- **Ability Score Improvements**: ASIs at levels 4, 8, 12, 16, and 19

#### Procedural Dungeon System
- **Grid-Based Generation**: Algorithmically creates 12x20 cell dungeons with vertical progression
- **Multiple Room Types**:
  - 🟢 **START**: Entrance room where your adventure begins
  - ⚔️ **COMBAT**: Enemy encounters with intelligent monster detection
  - 💰 **TREASURE**: Loot rooms with rare items
  - 🎲 **EVENT**: Special narrative events
  - 🏪 **MERCHANT**: Shop encounters for trading
  - 🔴 **BOSS**: Epic final encounters
  - ⚫ **DEAD_END**: Exploration dead ends
- **Branching Paths**: Main route with side branches for exploration
- **Fog of War**: Visited vs. seen rooms create strategic exploration
- **Interactive Minimap**: Real-time visualization of dungeon layout and player position
- **Connection Types**: Immersive exit descriptions (arched stone archways, heavy doors, iron bars, etc.)

#### AI-Driven Storytelling
- **Streaming Narrative Generation**: Real-time story generation using Claude 3.5 Haiku (2-3 second response time)
- **Context-Aware Progression**: Stories adapt based on:
  - Character stats, class, and level
  - Previous story events and choices
  - Room type and biome
  - Available exits and their visual descriptions
- **Immersive Choice Descriptions**: Instead of "Go North", you see "Step through the mossy archway into darkness"
- **Story History Tracking**: Maintains narrative continuity across rooms
- **Room-Specific Narratives**: Each room type generates unique story content

#### Advanced Monster Detection & Segmentation
- **SAM-3 Image Segmentation**: Uses Meta's Segment Anything Model 3 for pixel-perfect monster isolation
- **Intelligent Prompt Extraction**: Automatically extracts monster names from image generation prompts
- **Visual Effects**:
  - 🔴 **Enemy Red Glow**: Animated pulsing glow effect around detected monsters
  - ✨ **Particle System**: Subtle red particles emit from monster outlines
  - 🎯 **Hover Effects**: Enhanced glow intensity on hover
  - 🖱️ **Pixel-Perfect Click Detection**: Only the monster itself is clickable, not transparent areas
- **Caching System**: Segmentation results are cached per room for instant display on return visits
- **Retry Logic**: Automatically tries alternative prompts if initial segmentation fails
- **Edge Detection**: Particles emit from actual monster outlines for natural visual effects

#### Combat System
- **Turn-Based Mechanics**: Classic D&D 5e combat flow
- **Attack Roll Calculations**: `d20 + Ability Modifier + Proficiency Bonus + Weapon Bonus`
- **Damage System**: Parses dice notation (e.g., "1d8+3") with ability modifiers
- **Critical Hits**: Natural 20s double damage dice
- **Enemy AI**: Multiple attack types and behaviors
- **Spell Casting**: Resource management for spell slots, mana, ki points
- **Saving Throws**: Area effect spells use saving throw mechanics

#### Inventory & Equipment
- **11 Equipment Slots**: Head, Shoulder, Chest, Hands, Feet, Neck, Cape, Ring 1, Ring 2, Weapon, Shield
- **Backpack System**: Unlimited inventory for collected items
- **Rarity System**: Common → Uncommon → Rare → Very Rare → Legendary → Artifact
- **Stat Modifiers**: Equipment affects ability scores, AC, HP, and speed
- **Item Requirements**: Minimum ability scores or class restrictions
- **Armor Class Calculation**: Base 10 + DEX modifier + Armor + Shield + Equipment bonuses
- **Visual Item Display**: AI-generated images for all equipment

#### Action Point System
- **Strategic Resource Management**: Prevents choice spamming
- **Variable Costs**: Different actions cost different AP amounts
- **Regeneration**: AP regenerates over time or fully on rest
- **Level-Based Maximum**: AP pool scales with character level

### 🛠️ Technical Features

#### AI Integration
- **Narrative Generation**: Claude 3.5 Haiku via OpenRouter API
- **Image Generation**: ComfyUI workflows for dynamic image generation
- **Monster Segmentation**: ComfyUI Character Segment workflow (SAM-3) for precise object isolation
- **Streaming Responses**: Server-Sent Events (SSE) for real-time story generation
- **Caching**: Room content and segmentation results cached for performance
- **Local Processing**: All image generation runs on local ComfyUI server for privacy and control

#### State Management
- **React Context API**: Character state (stats, equipment, inventory)
- **Zustand**: Lightweight dungeon state management
- **Local Component State**: UI state and game flow
- **Persistent Caching**: Room content persists across sessions

#### Performance Optimizations
- **Pre-rendering Option**: Generate all room images upfront for instant gameplay
- **HTTP API**: Efficient ComfyUI workflow execution with polling
- **Lazy Loading**: Components load on demand
- **Efficient Re-renders**: Optimized React component structure
- **Workflow Caching**: Base workflow loaded once and cloned for each request

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ and npm
- **API Keys**:
  - OpenRouter API key (for narrative generation)
- **ComfyUI Server**: Local ComfyUI installation running on port 8188 (default)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/codeomaxed/dndai.git
   cd dndai
   ```

2. **Navigate to the game directory**
   ```bash
   cd rpg-game
   ```

3. **Install dependencies**
   ```bash
   npm install
   ```

4. **Set up environment variables**
   
   Create `.env.local` in the `rpg-game/` directory:
   ```env
   NEXT_PUBLIC_OPENAI_API_KEY=your_openrouter_api_key_here
   COMFYUI_SERVER_URL=http://127.0.0.1:8188
   COMFYUI_WORKFLOW_PATH=path/to/Comfy API.json
   COMFYUI_CHARACTER_SEGMENT_WORKFLOW_PATH=path/to/Character Segment.json
   ```
   
   **Getting API Keys**:
   - **OpenRouter**: Sign up at [openrouter.ai](https://openrouter.ai) and get your API key
   
   **ComfyUI Setup**:
   - Install ComfyUI (see [ComfyUI GitHub](https://github.com/comfyanonymous/ComfyUI))
   - Start the ComfyUI server (default port: 8188)
   - Place workflow files in `Image Generator/ComfyUI_windows_portable/Api Workflow/`:
     - `Comfy API.json` - Main image generation workflow
     - `Character Segment.json` - Monster segmentation workflow (uses SAM-3)
   - Alternatively, set `COMFYUI_WORKFLOW_PATH` and `COMFYUI_CHARACTER_SEGMENT_WORKFLOW_PATH` environment variables to point to your workflow files

5. **Run the development server**
   ```bash
   npm run dev
   ```
   
   The game will be available at `http://localhost:3001`

6. **Build for production** (optional)
   ```bash
   npm run build
   npm start
   ```

---

## 🏗️ Architecture

### Technology Stack

#### Frontend
- **Next.js 14+** (App Router) - React framework with server-side rendering
- **React 18.2** - UI library with hooks and context
- **TypeScript 5.2** - Type-safe development
- **Tailwind CSS 3.3** - Utility-first CSS framework
- **Zustand 4.4** - Lightweight state management

#### Backend
- **Next.js API Routes** - Server-side endpoints
- **OpenRouter API** - AI model access (Claude 3.5 Haiku)
- **ComfyUI Client** - Local image generation and segmentation via ComfyUI workflows
- **HTTP API** - ComfyUI server communication for workflow execution

#### AI Services
- **Claude 3.5 Haiku** (via OpenRouter) - Fast, high-quality narrative generation
- **ComfyUI Workflows** - Image generation for rooms, characters, items (local processing)
- **ComfyUI Character Segment Workflow (SAM-3)** - Advanced image segmentation for monster detection

### Project Structure

```
dndai/
├── rpg-game/                      # Main game application
│   ├── app/                       # Next.js App Router
│   │   ├── api/                   # API Routes
│   │   │   ├── generate-story/    # Narrative generation endpoint
│   │   │   └── generate-image/    # Image generation endpoint
│   │   ├── layout.tsx             # Root layout
│   │   ├── page.tsx               # Main entry point
│   │   └── globals.css            # Global styles
│   │
│   ├── components/                 # React Components
│   │   ├── CharacterCreation.tsx  # Character creation UI
│   │   ├── GameInterface.tsx      # Main game interface
│   │   ├── MonsterHighlight.tsx   # Monster segmentation & effects
│   │   ├── DungeonMiniMap.tsx     # Procedural dungeon minimap
│   │   ├── Inventory.tsx          # Equipment management
│   │   └── ...                    # Other UI components
│   │
│   ├── lib/                       # Core Game Logic
│   │   ├── ai/                    # AI Integration
│   │   │   ├── monster-segmentation.ts  # SAM-3 segmentation
│   │   │   ├── images.ts          # Image generation
│   │   │   └── narrative.ts       # Story generation
│   │   ├── character/             # Character System
│   │   │   ├── CharacterContext.tsx
│   │   │   └── defaultCharacter.ts
│   │   ├── dungeon/               # Dungeon System
│   │   │   ├── generator.ts       # Procedural generation
│   │   │   ├── store.ts           # Zustand store
│   │   │   └── types.ts           # Type definitions
│   │   └── game/                  # Game Mechanics
│   │       ├── GameEngine.ts      # Core engine
│   │       ├── combat.ts          # Combat calculations
│   │       ├── leveling.ts        # XP and leveling
│   │       └── monsters.ts        # Monster definitions
│   │
│   └── types/                     # TypeScript Definitions
│       ├── character.ts           # Character types
│       └── game.ts                # Game types
│
├── .gitignore                    # Git ignore patterns
├── GITHUB_SETUP.md               # GitHub setup guide
├── push-to-github.bat            # Helper script for pushing
└── README.md                     # This file
```

### System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    User Interface                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │  Character   │  │     Game     │  │   Inventory  │ │
│  │  Creation    │  │  Interface   │  │   & Stats    │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│                  State Management                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │   React      │  │    Zustand    │  │   Component  │ │
│  │   Context    │  │     Store     │  │    State     │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│                    Game Engine                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │   Dungeon    │  │   Character  │  │    Combat    │ │
│  │  Generator   │  │    System    │  │   System     │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│                    AI Services                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │   OpenRouter │  │   ComfyUI   │  │   SAM-3      │ │
│  │  (Claude)    │  │  (Images)    │  │(Segmentation)│ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────┘
```

---

## 📚 Documentation

### Game Mechanics

#### Character System

**Ability Scores**: Six core attributes that define your character
- **STR** (Strength): Physical power, melee attack damage
- **DEX** (Dexterity): Agility, ranged attacks, AC modifier
- **CON** (Constitution): Health, HP per level, survivability
- **INT** (Intelligence): Wizard spellcasting, investigation skills
- **WIS** (Wisdom): Cleric/Druid spellcasting, perception
- **CHA** (Charisma): Bard/Sorcerer/Warlock spellcasting, social skills

**Ability Modifiers**: Calculated as `Math.floor((score - 10) / 2)`

**Proficiency Bonus**: Scales with level
- Levels 1-4: +2
- Levels 5-8: +3
- Levels 9-12: +4
- Levels 13-16: +5
- Levels 17-20: +6

#### Dungeon Generation Algorithm

1. **Waypoint System**: Defines key points (start, intermediate waypoints, boss)
2. **Path Creation**: Creates linear path connecting waypoints
3. **Branching**: Adds side branches with probability (60% main, 30% sub-branch)
4. **Room Assignment**: Assigns room types based on position and importance
5. **Connection Types**: Visual descriptors for immersive exit descriptions

#### Combat System

**Attack Roll Formula**:
```
Attack Roll = d20 + Ability Modifier + Proficiency Bonus (if proficient) + Weapon Bonus
```

**Damage Calculation**:
- Parses dice notation (e.g., "1d8+3")
- Adds relevant ability modifier
- Critical hits (natural 20) double all dice

**Armor Class (AC)**:
```
AC = 10 + DEX modifier (unless heavy armor) + Armor AC + Shield (+2) + Equipment bonuses
```

#### Monster Segmentation System

**How It Works**:
1. Image generation prompt includes monster name (e.g., `*spider*` or `**assassin**`)
2. Prompt extraction function identifies monster name from asterisks
3. For combat rooms, ComfyUI workflow generates both base image and segmented image in a single execution
4. Character Segment workflow (SAM-3) processes the image with "character" prompt
5. Workflow returns transparent PNG with only the monster visible (alpha channel)
6. Overlay system positions segmented image pixel-perfectly over original
7. Visual effects (glow, particles) applied to segmented monster
8. Result cached in room content for instant display on return

**Technical Details**:
- Uses ComfyUI Character Segment workflow with SAM-3 model
- Single workflow execution for combat rooms (base + segmented image)
- Separate Character Segment workflow for post-processing if needed
- Retry logic with alternative prompts if primary fails
- Edge detection for particle emission
- Canvas-based pixel detection for click/hover accuracy
- CORS proxy route (`/api/comfyui-image`) for serving ComfyUI images

### API Endpoints

#### `/api/generate-story` (POST)

Generates streaming narrative content for rooms.

**Request Body**:
```typescript
{
  prompt: string;                    // Base narrative prompt
  previousContext?: string;           // Previous story context
  storyHistory?: string[];            // Array of previous narrative paragraphs
  validExits?: Array<{                // Available exits from room
    direction: 'NORTH' | 'SOUTH' | 'EAST' | 'WEST';
    targetId: string;
    visualType: string;
  }>;
  nodeType?: string;                  // Room type
  biome?: string;                     // Environment type
  monsterDescription?: string;         // Monster description (if present)
}
```

**Response**: Server-Sent Events (SSE) stream
- Format: `[Image Prompt] ||| [Narrative Story]`
- Narrative includes `CHOICES:` section with format: `- [NORTH] Immersive description text`

**Model**: Claude 3.5 Haiku (via OpenRouter)

#### `/api/generate-image` (POST)

Generates images using ComfyUI workflows.

**Request Body**:
```typescript
{
  prompt: string;                     // Image generation prompt
  aspectRatio?: 'square' | 'portrait' | 'landscape';
  width?: number;
  height?: number;
  isCombatRoom?: boolean;             // If true, enables segmentation
}
```

**Response**:
```json
{
  "imageUrl": "/api/comfyui-image?filename=...",
  "segmentedUrl": "/api/comfyui-image?filename=..."  // Only for combat rooms
}
```

**Implementation**: ComfyUI workflow execution (local server)

#### `/api/comfyui-image` (GET)

CORS proxy endpoint for serving ComfyUI-generated images.

**Query Parameters**:
- `filename`: Image filename
- `subfolder`: Optional subfolder path
- `type`: Image type (`output` or `input`)

**Response**: Image file (PNG/JPEG)

**Purpose**: Avoids CORS issues when loading images from ComfyUI server

---

## 🎨 Visual Features

### Monster Highlight System

The game features an advanced monster detection and highlighting system:

- **Segmentation**: Pixel-perfect isolation of monsters using SAM-3 via ComfyUI
- **Glow Effects**: Animated red glow that pulses around detected monsters (50% reduced intensity for better visibility)
- **Particle System**: Subtle red particles emit from monster outlines
- **Hover Effects**: Enhanced glow intensity when hovering over monsters
- **Click Detection**: Only the monster itself is clickable (not transparent areas)
- **Caching**: Segmentation results cached per room for performance

### UI Features

- **Dark Fantasy Theme**: Gothic horror aesthetic throughout
- **Responsive Design**: Works on various screen sizes
- **Smooth Animations**: Transitions and effects for immersive experience
- **Interactive Minimap**: Real-time dungeon visualization with square nodes
- **Character Display**: Comprehensive stats and equipment view
- **Adventure Log**: Story history tracking

### Recent UI Improvements

- **Redesigned Profile Section**: 
  - Large square avatar (1/4 width, full height) with character name overlay
  - Character information (name, level, class, race) prominently displayed at top
  - Ability modifiers (INT, WIS, STR, DEX, CON) in horizontal row at top right
  - HP and XP bars spanning full width at bottom of container
  - Improved text readability with enhanced font weights and shadows
  
- **Minimap Enhancements**:
  - Nodes changed from circles to squares for modern aesthetic
  - Improved line connectors that accurately meet square edges
  - Map extends to bottom of container for better visibility
  
- **Visual Refinements**:
  - Reduced monster glow effects by 50% for better visibility
  - Improved ability score text readability throughout the interface
  - Removed redundant HP/XP/AP bars from top bar (now in profile section)
  - Removed ability scores from bottom right of map for cleaner layout

---

## 🔧 Configuration

### Environment Variables

Create `.env.local` in `rpg-game/` directory:

```env
# OpenRouter API Key (for narrative generation)
NEXT_PUBLIC_OPENAI_API_KEY=your_openrouter_api_key

# ComfyUI Server Configuration
COMFYUI_SERVER_URL=http://127.0.0.1:8188
COMFYUI_WORKFLOW_PATH=path/to/Comfy API.json
COMFYUI_CHARACTER_SEGMENT_WORKFLOW_PATH=path/to/Character Segment.json
```

**Note**: If `COMFYUI_WORKFLOW_PATH` and `COMFYUI_CHARACTER_SEGMENT_WORKFLOW_PATH` are not set, the application will attempt to find workflow files at:
- `Image Generator/ComfyUI_windows_portable/Api Workflow/Comfy API.json`
- `Image Generator/ComfyUI_windows_portable/Api Workflow/Character Segment.json`

Relative to the workspace root.

### Pre-rendering

The game includes an option to pre-render all room images:
- **Location**: Character creation screen and game interface
- **Toggle**: "Pre-render all rooms" switch
- **Effect**: Generates all room images upfront (slower initial load, instant gameplay)

### Segmentation Visibility

Toggle monster detection box visibility:
- **Location**: Map panel (next to "Fog ON" toggle)
- **Toggle**: "Seg ON" / "Seg OFF" button
- **Default**: OFF (detection box hidden)

---

## 🧪 Development

### Running in Development

```bash
cd rpg-game
npm run dev
```

Runs on port 3001 by default.

### Building for Production

```bash
cd rpg-game
npm run build
npm start
```

### Code Style

- TypeScript strict mode recommended
- ESLint configuration included
- Follow React best practices
- Component files should target < 300 lines

### Adding New Features

1. **New Classes/Races**: Add to `types/character.ts`
2. **New Room Types**: Update `lib/dungeon/types.ts` and generator
3. **New Items**: Add to loot generation in `lib/game/loot.ts`
4. **New Monsters**: Add to `lib/game/monsters.ts`
5. **New Spells**: Add to character spell system

---

## 🐛 Known Issues & Limitations

### Current Issues

1. **Large Component Files**: Some components (e.g., `GameInterface.tsx`) are large and could benefit from refactoring
2. **State Management**: Mixed patterns (Context, Zustand, local state) could be standardized
3. **Testing**: No test files currently - critical parsing logic untested

### Limitations

1. **No Save/Load System**: Character state not persisted to localStorage
2. **Combat System**: Basic implementation - missing advanced features (status effects, complex spells)
3. **Error Handling**: Some API failures may not show user-friendly messages

---

## 🔮 Future Enhancements

### Planned Features

- [ ] Save/Load system (localStorage or cloud)
- [ ] Expanded combat system (status effects, advanced spells)
- [ ] Multiplayer support
- [ ] Character export/import
- [ ] Achievement system
- [ ] More dungeon biomes
- [ ] Expanded item database
- [ ] Spell system expansion
- [ ] Quest system
- [ ] Merchant interactions
- [ ] Advanced particle effects customization
- [ ] Multiple segmentation models support

### Code Quality Improvements

- [ ] Refactor large components
- [ ] Add comprehensive testing
- [ ] Improve error handling
- [ ] Standardize state management
- [ ] Add TypeScript strict mode
- [ ] Performance optimizations
- [ ] Image caching strategy improvements

---

## 🤝 Contributing

Contributions are welcome! Areas that need help:

- **Testing**: Unit, integration, and E2E tests
- **Code Refactoring**: Especially large components
- **New Features**: See Future Enhancements section
- **Bug Fixes**: Report issues and submit fixes
- **Documentation**: Improve and expand documentation
- **Performance**: Optimizations and improvements

### How to Contribute

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

## 🙏 Acknowledgments

- **D&D 5e Rules**: Wizards of the Coast for the comprehensive game system
- **Inspiration**: Bloodborne, Dark Souls, and Buriedbornes for aesthetic inspiration
- **AI Services**: 
  - OpenRouter for AI model access
  - ComfyUI for local image generation and segmentation
  - Anthropic for Claude models
  - Meta for SAM-3 segmentation model
- **Frameworks**: Next.js and React communities
- **Open Source**: All the amazing open-source libraries that made this possible

---

## 📞 Support & Contact

- **Issues**: [GitHub Issues](https://github.com/codeomaxed/dndai/issues)
- **Discussions**: [GitHub Discussions](https://github.com/codeomaxed/dndai/discussions)

---

<div align="center">

**Built with ❤️ using Next.js, TypeScript, and AI**

⭐ Star this repo if you find it interesting!

</div>

