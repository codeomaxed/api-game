# Veternum Data Dictionary

This reference maps runtime data files and important schema expectations.

## JSON content files

## `data/jobs.json`

Class/job definitions keyed by job id (currently Warrior/Mage/Rogue/Cleric).

Typical shape:
- `name`
- `description`
- `primaryStat` (`STR`/`DEX`/`INT`/`PIE`)
- `startingSkills` (array of skill ids)
- `statBonuses` (dictionary of stat deltas)

Used by:
- `CharacterManager`
- character creation UI

## `data/skills.json`

Array of skill definitions.

Typical fields:
- `id`
- `name`
- `description`
- `primaryStat`
- `power`
- `skillPower`
- `cooldown`
- optional `effects` array (`heal`, etc.)

Used by:
- `CombatManager.load_skills()`

## `data/items.json`

Array of item definitions.

Typical fields:
- `id`
- `name`
- `rarity`
- `slot` (weapon/armor/accessory/etc.)
- `description`
- `statModifiers`
- `requirements`

Used by:
- `InventoryManager` database/drop/equip flow

## `data/monsters.json`

Array of monster definitions with combat and presentation metadata.

Typical fields include:
- `id`, `name`, `tier`, `minLevel`, `xp`
- behavior/archetype knobs (`behaviorArchetype`, pressure/control/attrition params)
- `baseStats` payload compatible with `BuriedbornesStats`
- image/model paths (`glbPath`, segmented paths, optional attack/hit/death variants)

Used by:
- `MonsterDatabase`
- `DungeonGenerator` / `RunStateManager` encounter assembly
- `CombatManager` behavior execution

## Narrative JSON

Under `data/narratives/`:
- `room_descriptions/*.json`
- `combat_descriptions/*.json`
- `story_events/*.json`

### Room descriptions
Expected keys:
- `description`
- optional `choices` array

Loaded by:
- `NarrativeManager.load_room_description()`

### Combat descriptions
Expected keys:
- `description`
- optional metadata like `damage`, `type`

Loaded by:
- `NarrativeManager.load_combat_description()`

### Story events
Expected keys:
- `title`
- `description`
- `flags_set` (array of story flags)

Consumed via trigger wiring in:
- `MainGameUI` event routing

## GDScript resource models

## `scripts/resources/BuriedbornesStats.gd`

Primary stat model:
- `STR`, `DEX`, `INT`, `PIE`
- plus combat stats (`maxHP`, `Power`, `Armor`, `Resistance`, `Avoid`, etc.)

Used by:
- `Character`
- `Monster`
- damage/heal/stat aggregation logic

## `scripts/resources/DungeonNode.gd`

Room node model:
- coordinates/id
- room type enum
- connections
- monster reference
- generated room text/image metadata

RoomType enum:
- `START`, `BOSS`, `NORMAL`, `TREASURE`, `EVENT`, `MERCHANT`, `DEAD_END`, `COMBAT`

## `scripts/resources/Character.gd`

Player runtime model:
- name, level, xp, hp, skills, inventory/equipment, stat base/totals

## `scripts/resources/Monster.gd`

Enemy runtime model:
- identity, tier, stat base, behavioral modifiers, visual references

## Saved state schema (`GameState`)

Persistent fields (see `scripts/autoload/GameState.gd`):
- `currencies` (`wood`, `rock`, `iron`, `meat`, `hemalith`)
- `equipment_levels`
- `run_state`
- `temporary_boons`
- `permanent_multipliers`
- `unlocks` (`crow_beak_found`, `hole_unlocked`, `face_npc_unlocked`)
- `story_flags`
- `combat`

Schema version:
- `SAVE_SCHEMA_VERSION = 2`

Migration handled by:
- `SaveService._migrate_payload()`

## Save/settings files (`user://`)

From `SaveService`:
- slot files: `save_1.json`, `save_2.json`, `save_3.json`
- backups: `save_1_backup.json`, etc.
- legacy fallback: `save.json`, `save_backup.json`
- settings: `settings.json`

Additional persistence:
- audio config via `AudioManager` (`user://audio_settings.cfg`)
- calibration overrides via `CalibrationOverrideManager` (`user://dungeon_calibration.cfg`)
