# Veternum Development Guide

## Principles

1. Keep `MainGameUI` orchestration coherent.
2. Prefer autoloads for authoritative state transitions.
3. Treat `GameState` as save-contract surface area.
4. Wire new story content through explicit flags and deterministic triggers.

## Implementation map by task

## Add a new story event beat

1. Add JSON in `data/narratives/story_events/`.
2. Define unique `flags_set` ids.
3. Hook trigger and one-shot gating in `MainGameUI`.
4. Verify flags survive save/load.

Do not rely on prose-only docs; ensure runtime trigger code exists.

## Add a new monster

1. Add entry in `data/monsters.json`.
2. Provide required art/model assets.
3. Confirm `MonsterDatabase` can load and scale it.
4. Validate encounter assignment paths (`RunStateManager` / `DungeonGenerator`).
5. Validate combat behavior archetype knobs.

## Add a new skill

1. Add skill row in `data/skills.json`.
2. Verify `CombatManager.load_skills()` recognizes fields.
3. If introducing new effect types, extend `execute_skill()` path.
4. Ensure UI messaging and cooldown display still render correctly.

## Add a new camp room to map

1. Update `MapManager.CAMP_ROOM_IDS` and display name dictionary.
2. Ensure discovery hook sets room discovered at correct runtime moment.
3. Verify `MapMenu` can render/center with new visible-room bounds.

## Extend rebirth/meta progression

1. Add durable fields to `GameState`.
2. Update `RebirthEngine` reset semantics and unlock logic.
3. Add migration updates in `SaveService._migrate_payload()`.
4. Validate old slots and new slots both load.

## Known architectural caveats

## Dual traversal representations

The codebase contains both:
- `DungeonGenerator` graph-based traversal and
- `RunStateManager` wave-driven traversal.

When adding room/progression features, choose one authority explicitly and align UI assumptions (`MainGameUI.update_ui()`).

## MainGameUI size and responsibility

`MainGameUI.gd` currently owns many concerns (UI composition, input maps, overlays, story trigger glue, combat/camp transitions).
For large features, isolate logic in autoloads/resources first, then keep MainGameUI as coordinator.

## Save compatibility checklist (required)

Before merging persistent state changes:

1. Update `GameState` defaults.
2. Update serialization (`to_dict` / `from_dict`) if needed.
3. Update migration in `SaveService`.
4. Verify `get_slot_summary()`, load fallback, and clear slot behavior.
5. Test with an old save payload.

## Basic test checklist for gameplay edits

1. Boot from new game and from existing save.
2. Run start -> first combat -> victory reward.
3. Boss wave -> continue and leave branches.
4. Camp transitions and map overlay input behavior.
5. Save/load in all slots.
6. Rebirth sequence and post-rebirth state reset.

## Recommended file read order before coding

1. `LLM_ONBOARDING.md`
2. `ARCHITECTURE.md`
3. target autoload(s) under `scripts/autoload/`
4. `MainGameUI.gd` integration points
5. relevant JSON/resource file schemas
