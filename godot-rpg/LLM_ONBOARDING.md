# LLM Onboarding Guide for Veternum

This file is an "instant context primer" for any model or developer joining the project.

## 1) What this game is

Veternum is a dark fantasy run-based RPG with:
- a camp hub layer (management, progression, rebirth),
- a dungeon run layer (floor/wave encounters),
- timer-driven turn combat,
- event-flagged narrative progression,
- image-driven presentation (rooms and monsters as authored assets).

The project currently blends two traversal paradigms:
- procedural node graph (`DungeonGenerator`) and
- run-encounter pipeline (`RunStateManager`).

The run pipeline is the primary active gameplay loop.

## 2) Runtime entry and ownership

- Engine config: `project.godot`
- Main scene: `scenes/main/MainGame.tscn`
- Main orchestrator: `scripts/ui/MainGameUI.gd`

`MainGameUI.gd` is the largest integration surface. It wires UI, autoloads, signals, overlays, and many runtime transitions.

## 3) Core gameplay loop (authoritative)

1. Camp mode (`GameSession.SessionMode.CAMP`)
2. Start run (`GameSession.start_run()` -> `RunStateManager.start_new_run()`)
3. Encounter generation (`RunStateManager._generate_current_encounter()`)
4. Combat (`CombatManager.start_combat()`)
5. Victory rewards + wave/floor progression (`CombatUI` + `RunStateManager.on_encounter_victory()`)
6. Boss resolution:
   - continue (`RunStateManager.continue_after_boss()`)
   - leave (`GameSession.leave_run_to_camp()`)
7. Camp progression and eventual rebirth (`RebirthEngine.perform_rebirth()`)

## 4) Most important autoloads

From `project.godot` `[autoload]`:

- `GameSession` - global session mode and run/combat adapters
- `RunStateManager` - floors/waves, boss gating, encounter emission
- `CombatManager` - combat state machine and skill/effect execution
- `GameState` - persistent state object and run/meta fields
- `SaveService` - slot saves, migrations, autosave, settings payload
- `CharacterManager` - character creation/stats/xp/gold
- `InventoryManager` - item DB/drop/equip logic
- `MonsterDatabase` - monster loading and level scaling
- `MaterialsEngine` - camp resource clicker/familars/sparkle
- `RebirthEngine` - crow beak gate, hole unlock, hemalith conversion
- `NarrativeManager` - narrative JSON loading and cache
- `MapManager` - camp room discovery state for map overlay
- `EventBus` - cross-system events/logging bus

## 5) Story and tone anchors

Primary textual anchors:
- Intro and camp framing in `scripts/ui/MainGameUI.gd` (Grifth dialogue)
- Event JSONs in `data/narratives/story_events/`
  - `arc01_floor1_wave1_omen.json`
  - `arc01_floor1_wave3_possession.json`
  - `arc01_floor1_boss_truth.json`

Important line in canonical runtime tone:
- "You do not return home. You return evidence."

## 6) Data model quick map

- `data/jobs.json` - classes/start kits/stat bonuses
- `data/skills.json` - skill definitions/effects
- `data/items.json` - item stats/slots/requirements
- `data/monsters.json` - monsters/archetypes/stats/assets
- `data/narratives/` - room, combat, and story event prose payloads

Resources:
- `scripts/resources/Character.gd`
- `scripts/resources/Monster.gd`
- `scripts/resources/DungeonNode.gd`
- `scripts/resources/BuriedbornesStats.gd`

## 7) Controls and UX behavior

From `MainGameUI.gd`:
- `Esc` pause / close map overlay first if open
- `Tab` map
- `I` inventory
- `Q` lamp
- Material controls: `1/2/3`, `Space`, `E`, `B`

Map is currently camp-oriented (`MapManager` + `MapMenu`) and toggled through `MainGameUI._toggle_re_map_overlay()`.

## 8) Persistence and safety

Save model:
- `SaveService` writes slot files (`save_1.json`, etc.) and backup files.
- `GameState.SAVE_SCHEMA_VERSION` is used for migration in `SaveService._migrate_payload()`.
- Autosave interval: `300s`.

If changing state shape:
1. update `GameState`
2. update migration logic in `SaveService`
3. validate slot load and clear behavior

## 9) Where to extend features safely

- New narrative beats: add JSON under `data/narratives/story_events/` + trigger logic in `MainGameUI`.
- New monsters: update `data/monsters.json`; ensure visual assets exist.
- New class/skills: update `jobs.json`/`skills.json` + verify CombatManager loading.
- New map/camp rooms: `MapManager` + `MapMenu` + camp room entry hooks.
- New currencies/progression: `GameState`, `MaterialsEngine`, `RebirthEngine`, UI labels.

## 10) Read-order for deeper dives

1. `ARCHITECTURE.md`
2. `STORY_BIBLE.md`
3. `DATA_DICTIONARY.md`
4. `DEVELOPMENT_GUIDE.md`
