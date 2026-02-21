# Dark Fantasy RPG - Godot 4.5.1

This is the Godot 4.5.1 port of the browser-based D&D 5e RPG game. All features from the original browser version are preserved, but images and narrative text are pre-generated and loaded from organized folder structures.

## Project Structure

```
godot-rpg/
├── project.godot              # Godot project configuration
├── scenes/                    # Scene files
│   ├── main/                  # Main game scenes
│   │   └── MainGame.tscn
│   └── ui/                    # UI scenes
│       ├── CombatUI.tscn
│       ├── CharacterCreationUI.tscn
│       └── InventoryUI.tscn
├── scripts/                   # GDScript files
│   ├── autoload/              # Singleton managers
│   │   ├── CharacterManager.gd
│   │   ├── DungeonGenerator.gd
│   │   ├── CombatManager.gd
│   │   ├── AssetLoader.gd
│   │   ├── RoomImageManager.gd
│   │   ├── MonsterImageManager.gd
│   │   ├── NarrativeManager.gd
│   │   ├── AudioManager.gd
│   │   ├── InventoryManager.gd
│   │   └── MonsterDatabase.gd
│   ├── resources/              # Resource classes
│   │   ├── Character.gd
│   │   ├── Monster.gd
│   │   ├── Item.gd
│   │   ├── DungeonNode.gd
│   │   ├── Job.gd
│   │   ├── Skill.gd
│   │   └── BuriedbornesStats.gd
│   ├── ui/                    # UI scripts
│   │   ├── MainGameUI.gd
│   │   ├── CombatUI.gd
│   │   ├── CharacterCreationUI.gd
│   │   ├── InventoryUI.gd
│   │   ├── DungeonMiniMap.gd
│   │   └── AdventureLogUI.gd
│   └── effects/               # Visual effects
│       ├── AtmosphericEffects.gd
│       └── MonsterGlow.gd
├── assets/                    # Pre-generated assets
│   ├── monsters/              # Monster images
│   │   ├── Skeleton/
│   │   │   ├── background.png
│   │   │   └── segmented.png
│   │   ├── Orc/
│   │   └── ...
│   └── rooms/                 # Room images
│       ├── Turn Left/
│       ├── Turn Right/
│       ├── T Junction/
│       └── ...
├── data/                      # Data files
│   ├── narratives/           # Pre-generated narrative text
│   │   ├── room_descriptions/
│   │   ├── combat_descriptions/
│   │   └── story_events/
│   ├── monsters.json         # Monster definitions
│   ├── items.json            # Item definitions
│   ├── skills.json           # Skill definitions
│   └── jobs.json             # Job definitions
└── audio/                     # Audio files
    ├── music/
    └── sfx/
```

## Asset Organization

### Monster Images
Place monster images in `res://assets/monsters/[MonsterName]/`:
- `background.png` - Room with monster
- `segmented.png` - Transparent monster cutout
- `segmented_animated.png` - Optional animated version

### Room Images
Place room images in `res://assets/rooms/[RoomType]/`:
- Room types: `Turn Left`, `Turn Right`, `T Junction`, `Dead End`, `Straight`, `Boss Chamber`, `Treasure Room`, `Merchant`
- Multiple variations per type: `room_001.png`, `room_002.png`, etc.

### Narrative Text
Place narrative JSON files in `res://data/narratives/`:
- Room descriptions: `room_descriptions/[room_type]_[topology]_[variation].json`
- Combat descriptions: `combat_descriptions/[monster_id]_[action_type]_[variation].json`
- Story events: `story_events/[event_id].json`

## Features

- **Character System**: Creation, stats, leveling (Buriedbornes-style)
- **Dungeon Generation**: Procedural dungeon with rooms and navigation
- **Combat System**: Turn-based combat with skills and status effects
- **Inventory System**: Equipment and item management
- **Monster System**: Monster database with scaling and display
- **Asset Loading**: Efficient loading of pre-generated images
- **Narrative System**: Pre-generated text with variation selection
- **Visual Effects**: Fog, water drops, lighting, monster glow
- **Audio System**: Sound effects and music

## Getting Started

1. Open the project in Godot 4.5.1
2. Generate and organize your images in the `assets/` folder structure
3. Generate and organize your narrative text in the `data/narratives/` folder structure
4. Export monster/item/skill definitions to JSON in `data/`
5. Run the game!

## Notes

- All images must be pre-generated using ComfyUI before running the game
- Narrative text must be pre-generated as JSON files
- The game logic matches the browser version, just ported to GDScript
- UI uses Godot's Control nodes instead of React components
- Visual effects use Godot's particle systems and shaders




