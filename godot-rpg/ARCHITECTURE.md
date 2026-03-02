# Veternum Architecture Reference

## Runtime composition

- **Root scene:** `scenes/main/MainGame.tscn`
- **Primary runtime script:** `scripts/ui/MainGameUI.gd`
- **Main autoload graph:** declared in `project.godot` `[autoload]`

`MainGameUI.gd` is the central integration script. It listens to combat/run/character/state events and updates scene presentation.

## System layers

### 1) Session and state
- `scripts/autoload/GameSession.gd`
  - `SessionMode`: `CAMP`, `DUNGEON`, `COMBAT`
  - Bridges `RunStateManager` and `CombatManager` into mode transitions
- `scripts/autoload/GameState.gd`
  - Persistent global store:
    - `currencies`
    - `equipment_levels`
    - `run_state`
    - `temporary_boons`
    - `permanent_multipliers`
    - `unlocks`
    - `story_flags`
    - `combat`

### 2) Run progression
- `scripts/autoload/RunStateManager.gd`
  - `WAVES_PER_FLOOR = 10`
  - emits `encounter_changed(room, floor, wave, is_boss_wave)`
  - boss-gated leave rules (`can_leave_now()`)
  - transitions:
    - `on_encounter_victory()`
    - `continue_after_boss()`
    - `leave_to_camp()`

### 3) Combat
- `scripts/autoload/CombatManager.gd`
  - timer-driven turn loop (`_player_attack_timer`, `_enemy_attack_timer`, `_regen_timer`)
  - stateful buffs/status/heal-cut/cooldown-lock fields
  - signals:
    - `combat_started`
    - `combat_ended`
    - `turn_changed`
    - `damage_dealt`
    - `skill_used`
- `scripts/ui/CombatUI.gd`
  - applies rewards (xp/gold/meat)
  - handles boss reward resolution
  - calls:
    - `RunStateManager.on_encounter_victory()`
    - `RunStateManager.continue_after_boss()`
    - `GameSession.leave_run_to_camp()`

### 4) Character and inventory
- `scripts/autoload/CharacterManager.gd`
- `scripts/autoload/InventoryManager.gd`
- Resources:
  - `scripts/resources/Character.gd`
  - `scripts/resources/Item.gd`
  - `scripts/resources/BuriedbornesStats.gd`

### 5) Content databases
- `scripts/autoload/MonsterDatabase.gd`
- `scripts/autoload/BoonCatalog.gd`
- `scripts/autoload/EnemyCatalog.gd`
- Data files:
  - `data/monsters.json`
  - `data/jobs.json`
  - `data/skills.json`
  - `data/items.json`

### 6) Presentation/media
- `scripts/autoload/RoomImageManager.gd`
- `scripts/autoload/MonsterImageManager.gd`
- `scripts/autoload/AssetLoader.gd`
- `scripts/autoload/AudioManager.gd`
- `scripts/autoload/UIFontManager.gd`

### 7) Economy/meta
- `scripts/autoload/MaterialsEngine.gd` (wood/rock/iron clicker + familiars + sparkle)
- `scripts/autoload/RebirthEngine.gd` (crow beak gate, hole unlock, hemalith conversion)

### 8) Persistence/settings
- `scripts/autoload/SaveService.gd`
  - slot saves + backup fallback + schema migration + autosave
- `scripts/autoload/SettingsService.gd`
  - default + merged settings application

### 9) Event bus and integration
- `scripts/autoload/EventBus.gd`
  - low-friction broadcast channel for logs/material/run/combat related UI events.

## Dual traversal model (important)

Veternum contains two room/run representations:

1. `DungeonGenerator.gd` (procedural graph nodes, masks, visited/seen, movement)
2. `RunStateManager.gd` (wave encounter pipeline using synthetic run rooms)

`MainGameUI.update_ui()` currently chooses source based on run activity:
- if run active -> `RunStateManager.get_current_room()`
- else -> `DungeonGenerator.get_current_room()`

When extending traversal systems, decide which layer is authoritative for new features and keep UI assumptions aligned.

## Camp map architecture

- `scripts/autoload/MapManager.gd`
  - camp rooms: `Camp`, `LivingRoom`, `DiningRoom`, `Hallway`
  - discovery dictionary by room id
- `scenes/ui/MapMenu.tscn` + `scripts/ui/MapMenu.gd`
  - overlay map
  - room rendering and drag behavior
  - visibility is driven by room discovery
- `MainGameUI` map overlay functions:
  - `_ensure_map_menu_overlay()`
  - `_toggle_re_map_overlay()`
  - `_hide_re_map_overlay()`

## High-impact signal paths

1. `RunStateManager.encounter_changed` -> `MainGameUI` updates room/UI context
2. `CombatManager.combat_started/ended` -> mode transitions + UI overlays
3. `CharacterManager` XP/HP/gold signals -> stat bars and progression feedback
4. `EventBus` -> global logs and system notifications

## Scaling and balancing logic

- `scripts/autoload/ProgressionMath.gd`
  - shared formulas for enemy scaling, rewards, mitigation caps, progression coefficients
- `scripts/autoload/RunStateManager.gd`
  - floor/wave-level generation multipliers
- `scripts/autoload/CombatManager.gd`
  - runtime damage timing, mitigation caps, enemy archetype behavior adjustments

## Save/migration protocol

When introducing new persistent fields:
1. Add to `GameState` default structure.
2. Ensure `to_dict()` and `from_dict()` include fields.
3. Update `SaveService._migrate_payload()` for old schemas.
4. Verify load from existing slots and backup fallback behavior.
