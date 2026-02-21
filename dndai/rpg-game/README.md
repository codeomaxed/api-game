# RPG Game - AI-Powered Browser RPG

<div align="center">

![Version](https://img.shields.io/badge/version-0.1.0-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-14+-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.2-blue?logo=typescript)
![License](https://img.shields.io/badge/license-MIT-green.svg)

**An immersive, AI-driven browser RPG featuring dynamic storytelling, procedural dungeons, and intelligent combat systems.**

[Features](#-features) • [Quick Start](#-quick-start) • [What the Game is About](#-what-the-game-is-about) • [Contributing](#-contributing)

</div>

---

## Overview

**RPG Game** is a fully-featured browser-based role-playing game that seamlessly blends traditional RPG mechanics with modern artificial intelligence. Every adventure is unique, with AI-generated narratives, procedurally generated dungeons, intelligent monster encounters, and dynamic visual storytelling that adapts to your choices.

### What Makes This Special?

- **AI-Powered Everything**: Stories, images, and encounters are dynamically generated using state-of-the-art AI models
- **Procedural Dungeon Generation**: Every playthrough features a unique dungeon layout with branching paths and multiple room types
- **Intelligent Combat System**: Turn-based combat with visual attack animations, death effects, and strategic depth
- **Character Progression**: Deep leveling system with skills, equipment, and stat improvements
- **Dark Fantasy Aesthetic**: Gothic horror visuals with atmospheric image generation
- **Lightning-Fast Generation**: Optimized AI pipeline delivers immersive narratives and visuals quickly

---

## What the Game is About

This is a dark fantasy RPG where you explore procedurally generated dungeons filled with danger, treasure, and mystery. Each playthrough is completely unique - the dungeons are algorithmically generated, the stories are AI-crafted based on your choices, and every encounter adapts to your character's progression.

**The Core Experience:**
- Create your character from multiple classes, each with unique abilities and playstyles
- Explore dungeons that are different every time you play
- Engage in strategic turn-based combat with visual feedback
- Progress through levels, gaining new skills and powerful equipment
- Experience stories that respond to your choices and character development

**The Vision:**
We're building an RPG that combines the depth of traditional role-playing games with the infinite variety that AI can provide. Every room tells a story, every choice matters, and every playthrough feels fresh and engaging.

---

## Features

### Core Gameplay

#### Character System
- **Multiple Character Classes**: Warrior, Mage, Rogue, and more - each with unique abilities
- **Character Progression**: Level up from 1 to 20+ with meaningful stat improvements
- **Skill System**: Abilities with cooldowns, resource costs, and strategic depth
- **Equipment System**: Collect and equip items with stat modifiers and rarity tiers
- **Visual Character Portraits**: AI-generated character images that update with equipment

#### Procedural Dungeon System
- **Grid-Based Generation**: Algorithmically creates unique dungeon layouts
- **Multiple Room Types**:
  - **START**: Entrance room where your adventure begins
  - **COMBAT**: Enemy encounters with varied difficulty
  - **TREASURE**: Loot rooms with rare items
  - **EVENT**: Special narrative events
  - **MERCHANT**: Shop encounters for trading
  - **BOSS**: Epic final encounters
  - **DEAD_END**: Exploration dead ends
- **Branching Paths**: Main route with side branches for exploration
- **Fog of War**: Visited vs. seen rooms create strategic exploration
- **Interactive Minimap**: Real-time visualization of dungeon layout and player position

#### AI-Driven Storytelling
- **Dynamic Narrative Generation**: Real-time story generation that adapts to your choices
- **Context-Aware Progression**: Stories respond to:
  - Character stats, class, and level
  - Previous story events and choices
  - Room type and environment
  - Available exits and their descriptions
- **Immersive Choice Descriptions**: Rich, descriptive text instead of generic directions
- **Story History Tracking**: Maintains narrative continuity across rooms
- **Room-Specific Narratives**: Each room type generates unique story content

#### Combat System
- **Turn-Based Mechanics**: Strategic combat with alternating turns
- **Visual Attack Animations**: Dynamic animations for attacks and abilities
- **Death Effects**: Visual feedback for enemy defeats
- **Multiple Attack Types**: Physical, Magic, and Special abilities
- **Critical Hits**: Chance-based critical strikes for increased damage
- **Enemy AI**: Varied attack patterns and behaviors
- **Auto-Battle Option**: Streamlined combat for faster gameplay
- **Status Effects**: Poison, Burn, Freeze, and more strategic effects

#### Progression & Rewards
- **XP-Based Leveling**: Gain experience through combat and exploration
- **Stat Improvements**: Meaningful stat increases on level up
- **Loot Generation**: Floor-based scaling ensures appropriate rewards
- **Item Rarity System**: Common, Uncommon, Rare, Very Rare, Legendary, Artifact
- **Equipment Power**: Items provide significant stat boosts that scale with progression

#### Visual Features
- **AI-Generated Images**: Character portraits, room images, and enemy visuals
- **Monster Segmentation**: Advanced image processing for interactive encounters
- **Atmospheric Generation**: Dynamic visuals that match the narrative tone
- **Smooth Animations**: Transitions and effects for immersive experience

### Technical Features

#### AI Integration
- **Narrative Generation**: Fast, context-aware story generation
- **Image Generation**: ComfyUI workflows for dynamic image creation
- **Local Processing**: All image generation runs on local ComfyUI server for privacy and control
- **Caching**: Room content and images cached for performance
- **Streaming Responses**: Real-time story generation for immediate feedback

#### State Management
- **React Context API**: Character state (stats, equipment, inventory)
- **Zustand**: Lightweight dungeon state management
- **Local Component State**: UI state and game flow
- **Persistent Caching**: Room content persists across sessions

#### Performance Optimizations
- **Pre-rendering Option**: Generate all room images upfront for instant gameplay
- **Efficient API Calls**: Optimized workflow execution
- **Lazy Loading**: Components load on demand
- **Efficient Re-renders**: Optimized React component structure

---

## Quick Start

### Prerequisites

- **Node.js** 18 or higher
- **npm** or **yarn** package manager
- **ComfyUI Server**: Local ComfyUI installation running on port 8188 (default)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/codeomaxed/dndai.git
   cd dndai/rpg-game
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create `.env.local` in the `rpg-game/` directory:
   ```env
   COMFYUI_SERVER_URL=http://127.0.0.1:8188
   COMFYUI_WORKFLOW_PATH=path/to/Comfy API.json
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```
   
   The game will be available at `http://localhost:3001`

5. **Build for production** (optional)
   ```bash
   npm run build
   npm start
   ```

---

## Project Structure

```
rpg-game/
├── app/                    # Next.js App Router
│   ├── api/               # API Routes
│   │   ├── comfyui-image/ # ComfyUI image generation
│   │   └── generate-image/ # Image generation fallback
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Main entry point
│   └── globals.css        # Global styles
│
├── components/            # React Components
│   ├── CharacterCreation.tsx
│   ├── CharacterDisplay.tsx
│   ├── CombatInterface.tsx
│   ├── GameInterface.tsx
│   ├── DungeonMiniMap.tsx
│   ├── Inventory.tsx
│   └── ...               # Additional UI components
│
├── lib/                   # Core Game Logic
│   ├── ai/               # AI Integration
│   │   ├── comfyui-client.ts
│   │   └── comfyui-images.ts
│   ├── character/        # Character System
│   │   ├── CharacterContext.tsx
│   │   └── defaultCharacter.ts
│   ├── dungeon/          # Dungeon System
│   │   ├── generator.ts
│   │   ├── store.ts
│   │   └── types.ts
│   ├── game/             # Game Mechanics
│   │   ├── buriedbornes-combat.ts
│   │   ├── items.ts
│   │   ├── monsters.ts
│   │   ├── skills.ts
│   │   └── xp-leveling.ts
│   └── hooks/            # Custom React Hooks
│
└── types/                 # TypeScript Definitions
    ├── character.ts
    └── game.ts
```

---

## Development

### Running in Development

```bash
npm run dev
```

Runs on port 3001 by default with hot reloading enabled.

### Building for Production

```bash
npm run build
npm start
```

### Code Style

- TypeScript is used throughout for type safety
- ESLint is configured for code quality
- Follow React best practices and component patterns
- Keep components focused and under 300 lines when possible

### Adding New Features

**New Character Classes**
- Add class definitions to `lib/character/defaultCharacter.ts`
- Update character types in `types/character.ts`

**New Room Types**
- Update room type definitions in `lib/dungeon/types.ts`
- Modify dungeon generator in `lib/dungeon/generator.ts`

**New Items**
- Add item generation logic to `lib/game/items.ts`
- Update item types in `types/character.ts`

**New Monsters**
- Add monster definitions to `lib/game/monsters.ts`
- Update monster types in `types/game.ts`

---

## Important Notes

### ComfyUI Integration

This project uses ComfyUI for local image generation. Ensure your ComfyUI server is running before starting the game. The server should be accessible at the URL specified in your environment variables.

**Benefits of Local Generation:**
- No external API keys required
- Complete privacy and control
- No usage limits or costs
- Generation speed depends on your hardware

### Image Generation

Images are generated locally using ComfyUI workflows. This means all processing happens on your machine, giving you full control over the generation process and ensuring your data stays private.

---

## Future Goals

### Planned Features

- [ ] **Save/Load System**: Persistent character progression with localStorage or cloud storage
- [ ] **Expanded Combat System**: Status effects, advanced spells, and more strategic depth
- [ ] **Multiplayer Support**: Cooperative dungeon exploration with friends
- [ ] **Character Export/Import**: Share your characters between sessions
- [ ] **Achievement System**: Unlock achievements for various accomplishments
- [ ] **More Dungeon Biomes**: Expand variety with new environment types
- [ ] **Expanded Item Database**: Hundreds of unique items with interesting effects
- [ ] **Quest System**: Structured objectives and storylines
- [ ] **Merchant Interactions**: More complex trading and economy systems
- [ ] **Advanced Particle Effects**: Enhanced visual feedback and atmosphere
- [ ] **Multiple Difficulty Levels**: Adjustable challenge for all skill levels
- [ ] **Character Customization**: Visual customization options for characters

### Code Quality Improvements

- [ ] **Refactor Large Components**: Break down complex components for maintainability
- [ ] **Comprehensive Testing**: Unit, integration, and E2E tests
- [ ] **Improved Error Handling**: User-friendly error messages and recovery
- [ ] **Standardize State Management**: Consistent patterns across the codebase
- [ ] **Performance Optimizations**: Further improve load times and responsiveness
- [ ] **Enhanced Image Caching**: Smarter caching strategies for better performance

---

## Contributing

Contributions are welcome! This project benefits from community involvement and we're excited to see what you can bring to the table.

### Areas Where Help is Needed

**Testing**
- Unit tests for game mechanics and calculations
- Integration tests for combat system and progression
- End-to-end tests for complete user flows
- Performance testing and optimization

**Code Quality**
- Refactoring large components into smaller, maintainable pieces
- Improving error handling and user feedback
- Performance optimizations and load time improvements
- Type safety improvements and TypeScript strict mode

**New Features**
- Additional character classes with unique playstyles
- New dungeon biomes and room types for variety
- Expanded item database with interesting mechanics
- New combat mechanics and abilities
- Save/load system implementation
- Achievement and progression systems

**Documentation**
- Code comments and inline documentation
- Tutorial guides for new players
- API documentation improvements
- Development setup guides

**Bug Fixes**
- Report issues on GitHub
- Fix existing bugs and edge cases
- Improve error messages and user experience
- Performance issues and optimizations

### How to Contribute

1. **Fork the repository** to your GitHub account
2. **Create a feature branch** (`git checkout -b feature/amazing-feature`)
3. **Make your changes** following the existing code style
4. **Test your changes** to ensure everything works correctly
5. **Commit your changes** (`git commit -m 'Add amazing feature'`)
6. **Push to the branch** (`git push origin feature/amazing-feature`)
7. **Open a Pull Request** with a clear description of your changes

Please ensure your code follows the existing style and includes appropriate tests when applicable. We're happy to help guide you through the contribution process!

---

## License

This project is licensed under the MIT License - see the LICENSE file for details.

---

## Acknowledgments

- **ComfyUI**: For powerful local image generation capabilities
- **Next.js & React**: For the amazing frameworks that power this project
- **Open Source Community**: For all the incredible libraries and tools that made this possible
- **RPG Inspiration**: Classic RPGs that inspired the mechanics and feel of this game

---

<div align="center">

**Built with passion using Next.js, TypeScript, and AI**

⭐ Star this repo if you find it interesting!

</div>
