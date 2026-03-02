# Veternum Project Overview

## One-paragraph summary

Veternum is an image-driven dark fantasy RPG in which the player cycles between a fragile camp hub and escalating dungeon descents. Gameplay combines floor/wave encounter runs, timer-driven combat, narrative story flags, resource extraction, and rebirth-based meta progression. The world framing is oppressive and ritualistic: every descent returns the player with resources and evidence, but also with deeper entanglement in what the dungeon is doing to camp and self.

## Design pillars

- **Image-first presentation:** authored room/monster visuals with system overlays.
- **Ritual loop progression:** run, return, reset, persist.
- **Narrative as state:** story flags alter world text and unlock pathways.
- **Mechanical readability:** autoload systems with clear responsibilities.

## Runtime gameplay loop

1. **Camp**: manage inventory/equipment/currencies, interact with narrative UI.
2. **Run start**: `GameSession.start_run()` enters dungeon mode.
3. **Encounter loop**: combat encounters emitted by `RunStateManager`.
4. **Boss gate**: beat boss to unlock leave/continue decisions.
5. **Return**: camp mode resumes with updated resources/flags.
6. **Rebirth**: convert run performance into hemalith, reset run layer.

## Story framing currently in runtime

- Location: Veternum camp as the last functioning refuge.
- Guide figure: Grifth intro dialogue.
- Arc 01 implemented beats:
  - Omen
  - Possession surge
  - Witness truth
- Thematically reinforced line: "You do not return home. You return evidence."

## Project status notes

- Camp map (`MapMenu`) is camp-room driven through `MapManager`.
- Save schema currently at version `2`.
- Both procedural dungeon graph and run-wave systems exist and are active in different contexts.

## Where to learn more

- `README.md` - entry summary
- `LLM_ONBOARDING.md` - complete onboarding map
- `ARCHITECTURE.md` - system-level technical details
- `STORY_BIBLE.md` - setting/tone/canon
- `DATA_DICTIONARY.md` - schema references
- `DEVELOPMENT_GUIDE.md` - extension workflow
