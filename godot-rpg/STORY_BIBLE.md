# Veternum Story Bible (Runtime Canon)

This document describes the story and world as they currently exist in shipped code/data, not only design intent.

## Premise

You wake in Veternum, one of the last functioning camps. The world is in decline, survival is ritualized, and descent into the dungeon is both necessity and contamination.

Canonical framing appears in `scripts/ui/MainGameUI.gd`:
- "Welcome to Veternum, one of the last functioning camps."
- "Keep near the fire at night, or the dark will drag you below."
- Grifth as practical caretaker ("I keep this camp fed and breathing.")

## Core tone

- Dark fantasy horror with body/possession motifs.
- The dungeon is treated as active/predatory, not inert architecture.
- Return from descent is framed as damage-bearing testimony, not clean heroism.

The strongest thesis line is in event content:
- "You do not return home. You return evidence."
  (`data/narratives/story_events/arc01_floor1_boss_truth.json`)

## Primary locations

### Camp layer

Camp map system (`MapManager`) currently defines:
- `Camp`
- `LivingRoom`
- `DiningRoom`
- `Hallway`

These are the stable, human-facing spaces where management and recovery happen.

### Dungeon layer

Dungeon spaces are organized by topology and room type:
- topological descriptions (`data/narratives/room_descriptions/`)
- typed nodes (`START`, `COMBAT`, `EVENT`, `TREASURE`, `MERCHANT`, `BOSS`, `DEAD_END`, etc. via `DungeonNode`)

Atmospheric examples:
- `dead_end_001.json`: blind stone face, stitched-mouth imagery, retreat marks
- `turn_left_001.json`: colder descent, damp walls, distant torchlight

## Arc 01 (implemented beats)

Defined in `data/narratives/story_events/` and wired by `MainGameUI` story triggers:

1. `arc01_floor1_wave1_omen` -> `arc01_seen_omen`
2. `arc01_floor1_wave3_possession` -> `arc01_seen_possession`
3. `arc01_floor1_boss_truth` -> `arc01_seen_boss_truth`

Beat progression:
- omen of impossible trace
- possession/intimacy breach ("corridor exhales in your voice")
- revelation linking dungeon violence directly back toward camp

`MainGameUI` also sets broader arc flags such as:
- `arc01_blood_debt_opened`
- `arc01_camp_mutated`
- `arc01_cursed_prop_unlocked`
- `arc01_room_unlock_catacomb`
- `arc01_completed`

## Player fantasy

The player fantasy is not pure conquest. It is:
- survive,
- return,
- understand,
- and trade parts of oneself for continuity.

Mechanically this is reinforced through:
- run loops (risk/reward),
- camp management,
- rebirth reset mechanics,
- and event flags that imply persistent narrative consequences.

## Rebirth mythology

`RebirthEngine` ties narrative and progression tightly:
- `crow_beak` gate unlocks the hole (`hole_unlocked`) and face NPC flag (`face_npc_unlocked`)
- rebirth converts performance into `hemalith`
- rebirth wipes most run-layer progress while preserving meta currency

Key line:
- "The hole stirs. Rebirth unlocked."
  (`scripts/autoload/RebirthEngine.gd`)

This positions progression as ritual exchange, not simple leveling.

## Monsters as narrative texture

`data/monsters.json` establishes enemies with visual and tonal descriptors:
- Skeleton lineages
- Slime/attrition horrors
- Assassin pressure threats
- Occultist/control enemies
- Rat King boss body-horror

Enemy behavior archetypes (`pressure`, `attrition`, `control`) reinforce story mood through combat pacing.

## Current canon boundary

This file reflects runtime and content already wired to systems. Broader lore planning also exists in `obsidian/`, but that material may be aspirational or ahead of implementation.
