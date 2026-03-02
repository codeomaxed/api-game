# Veternum - Dark Fantasy Image-Driven RPG (Godot 4.5)

Veternum is a run-based dark fantasy RPG built around:
- a camp hub,
- node-based dungeon descents,
- timer-driven turn combat,
- narrative event flags,
- and rebirth/meta progression.

The game is designed as an image-first experience: room and monster art are mostly pre-authored assets, with systems layering combat, narrative, and progression over those scenes.

## Start Here (for humans + LLMs)

If you are onboarding to this repository, read in this order:

1. `LLM_ONBOARDING.md` - complete project orientation
2. `ARCHITECTURE.md` - technical system map and signal flow
3. `STORY_BIBLE.md` - setting, tone, locations, arc state
4. `DATA_DICTIONARY.md` - JSON/resource schemas and runtime meaning
5. `DEVELOPMENT_GUIDE.md` - implementation workflow and extension patterns

## Quick Snapshot

- **Engine:** Godot `4.5` (`project.godot`)
- **Main scene:** `res://scenes/main/MainGame.tscn`
- **Main orchestrator script:** `scripts/ui/MainGameUI.gd`
- **Core game modes:** `CAMP`, `DUNGEON`, `COMBAT` (`scripts/autoload/GameSession.gd`)
- **Run model:** floor/wave encounters with boss-gated progression (`scripts/autoload/RunStateManager.gd`)
- **Combat model:** timer-driven turn loop + skill/effect system (`scripts/autoload/CombatManager.gd`)
- **Persistent state:** `GameState` + `SaveService` (`scripts/autoload/GameState.gd`, `scripts/autoload/SaveService.gd`)

## Current Core Loop

1. Start in camp (dialogue, management, prep).
2. Begin a run.
3. Clear combat encounters and floor boss.
4. Choose to continue deeper or leave to camp.
5. Spend resources, unlock systems, and eventually rebirth for Hemalith.

## Controls (default)

Defined via `MainGameUI.gd`:
- `Esc` pause
- `Tab` map
- `I` inventory
- `Q` lamp
- `1`/`2`/`3` material select (wood/rock/iron)
- `Space` material click
- `E` collect sparkle
- `B` hold-buy material familiar

## High-Value Paths

- `scripts/autoload/` - authoritative gameplay systems
- `scripts/ui/` - runtime UI orchestration and interaction
- `scripts/resources/` - data model classes
- `data/` - jobs/skills/items/monsters + narrative JSON
- `assets/` - image/audio/font resources
- `obsidian/` - design/lore planning vault used during development

## Documentation Intent

This repo now includes comprehensive onboarding docs intended so another LLM (or new developer) can infer:
- what the game is,
- how story and systems connect,
- where to implement changes safely,
- and how to extend content without breaking the runtime model.




