# Image Generation System - Complete Breakdown

## Overview

The RPG game uses a sophisticated image generation system that creates dynamic dungeon scenes with proper camera framing, monster positioning, and consistent dark fantasy aesthetic. The system integrates with Fal.ai's image generation API using both WebSocket (realtime) and HTTP fallback methods.

## Architecture

### Core Components

1. **Prompt Builder** (`lib/dungeon/images.ts`)
   - `buildRoomPrompt()` - Main prompt construction function
   - `getCameraFramingTemplate()` - Dynamic camera framing based on creature size
   - `getCreatureSize()` - Classifies monsters as small/standard/none

2. **Image Generation API** (`lib/ai/images.ts`)
   - `generateImage()` - Primary image generation function
   - Handles WebSocket (realtime) and HTTP fallback
   - Applies style enhancements

3. **WebSocket Manager** (`lib/ai/fal-realtime.ts`)
   - `FalRealtimeManager` - Singleton for persistent WebSocket connection
   - Maintains connection state and request queue
   - Automatic HTTP fallback on errors

4. **Game Generation Hook** (`lib/hooks/use-game-generation.ts`)
   - Integrates image generation with story generation
   - Handles prompt extraction from story stream
   - Manages image URL state

5. **API Route** (`app/api/generate-story/route.ts`)
   - `constructVisualPrompt()` - Three-Lane Composition algorithm
   - Fallback prompt generation when buildRoomPrompt not available

## Prompt Structure

### Four-Segment Architecture

The `buildRoomPrompt()` function constructs prompts using a structured four-segment approach:

```
[SEGMENT 1: Camera/Size Template] + [SEGMENT 2: Creature Visual Description] + [SEGMENT 3: Room Environment] + [SEGMENT 4: Unified Art Style]
```

### Segment 1: Camera/Size Template

Dynamic camera framing based on creature size classification:

#### Case A: Small Creatures
**Creatures:** Gelatinous Slime (and future small creatures like rats, spiders)

**Template:**
```
A wide cinematic shot from a slightly elevated standing perspective, looking down the length of a long dark dungeon corridor. Positioned far down the hallway, well into the distance on the wet stone floor, sits a [Creature Name]. The [Creature Name] appears tiny and far away relative to the vast corridor.
```

**Purpose:** Forces tiny creatures to appear far away, emphasizing the vastness of the dungeon.

#### Case B: Standard/Large Creatures
**Creatures:** Skeletons, Orcs, Zombies, Dire Wolves, Animated Armor, etc.

**Template:**
```
A wide cinematic environmental shot looking down a long dark dungeon corridor. Standing deep in the hallway, positioned far back with a large stretch of wet stone floor in the foreground, is a [Creature Name]. The [Creature Name] is fully visible from head to toe, appearing significantly smaller than the surrounding walls.
```

**Key Features:**
- Forces "Long Shot" perspective to prevent monsters from appearing too close/cropped
- Explicitly mentions "large stretch of wet stone floor in the foreground" to force distance
- Ensures creature appears "significantly smaller than the surrounding walls"
- Guarantees "fully visible from head to toe" to prevent cropping

**Visual Check:** If generated image cuts off feet or creature fills >50% of vertical height, the subject is too close.

#### Case C: No Monster
**Template:**
```
A wide environmental shot of a dark dungeon [roomType]. The room's floor and walls are visible.
```

### Segment 2: Creature Visual Description

Pulled from `monster.visualDescription` field in the monster database.

**Example (Skeleton):**
```
a skeletal warrior clad in rusted chainmail, its empty eye sockets glowing with a faint crimson light, wielding a notched longsword. The bones are yellowed with age, and tattered cloth hangs from its frame. Heavy cross-hatching shadows define its form.
```

**Style Notes:**
- Buriedbornes & Gustave Doré engraving style
- Heavy cross-hatching for shadows
- Ink-wash technique for semi-transparent elements
- Detailed, atmospheric descriptions

### Segment 3: Room Environment

Describes exits and room geometry:

**Format:**
```
The room has [exit descriptions], [exit descriptions], [exit descriptions].
```

**Exit Descriptions:**
- `"a doorway to the north"`
- `"a doorway to the south"`
- `"a doorway to the east"`
- `"a doorway to the west"`
- `"no visible exits, sealed walls"` (for dead ends)

**Purpose:** Provides geometric anchor to prevent monster from warping room layout.

### Segment 4: Unified Art Style

**Fixed Style Keywords (appended to every prompt):**
```
8k resolution, distinct digital painting style, semi-realistic textures, wet stone surfaces, volumetric lighting, deep depth of field, sharp focus everywhere, dark fantasy masterpiece.
```

**Additional Style Enhancements:**
- Applied in `generateImage()` fallback: `dark fantasy, gothic horror, Bloodborne aesthetic, Dark Souls style, gritty, desolate, ominous atmosphere, detailed, high quality`
- Applied in `falRealtime.generateImage()`: `dark fantasy art style, masterpiece, oil painting, dramatic lighting`

## Room Types

Room type descriptions are mapped from `DungeonNode.type`:

| Node Type | Room Description |
|-----------|----------------|
| `START` | `"dungeon entrance"` |
| `BOSS` | `"boss chamber"` |
| `TREASURE` | `"treasure room"` |
| `MERCHANT` | `"hidden merchant room"` |
| `EVENT` | `"event room"` |
| `DEAD_END` | `"dead end room"` |
| `default` | `"dungeon room"` |

## Biomes

Currently defined but not actively used in prompt building:

```typescript
const BIOMES = [
  'damp stone corridors',
  'ancient crypt',
  'dark catacombs',
  'forgotten ruins',
  'shadowy passage',
  'gloomy chamber',
  'weathered dungeon',
  'cursed halls',
];
```

## Creature Size Classification

### Small Creatures
Defined in `SMALL_CREATURE_IDS` Set:
- `'slime'` - Gelatinous Slime

### Standard/Large Creatures
All other monsters default to standard size:
- Skeletons
- Dire Wolves
- Animated Armor
- Orcs
- Zombies
- Boss monsters

## API Integration

### Fal.ai Configuration

**Model:** `fal-ai/z-image/turbo`

**Parameters:**
- `num_inference_steps`: 8 (fixed for quality)
- `num_images`: 1
- `enable_safety_checker`: true
- `output_format`: 'png'
- `acceleration`: 'none' (for HTTP fallback)

### Image Sizes

**Aspect Ratio Mapping:**
- `'square'` → `'square_hd'`
- `'portrait'` → `'portrait_4_3'`
- `'landscape'` → `'landscape_4_3'` (default)

**Size Options:**
- `'512'` - Small items/portraits
- `'768'` - Character portraits
- `'1024'` - Room scenes (default)

### Connection Methods

#### 1. WebSocket (Realtime) - Preferred
- Persistent connection via `falRealtime.initialize(apiKey)`
- Reuses connection for all requests
- Faster response times
- Automatic reconnection handling
- Request queue management with timeouts (60s)

**Usage:**
```typescript
if (falRealtime.isConnected()) {
  return await falRealtime.generateImage(options);
}
```

#### 2. HTTP Fallback
- Used when WebSocket unavailable or fails
- Via `/api/generate-image` route
- Uses `fal.subscribe()` for synchronous execution
- Slower but more reliable

**Fallback Chain:**
1. Try WebSocket (`falRealtime.generateImage()`)
2. If fails, try HTTP API route (`/api/generate-image`)
3. If fails, log error and return null

## Integration Points

### 1. Game Generation Hook

**File:** `lib/hooks/use-game-generation.ts`

**Flow:**
1. Receives monster, nodeType, validExits from game engine
2. Calls `buildRoomPrompt()` if monster available
3. Triggers image generation via `falRealtime.generateImage()`
4. Updates `imageUrl` state
5. Falls back to API prompt extraction if buildRoomPrompt not used

**Key Code:**
```typescript
if (monster !== undefined && validExits && nodeType) {
  fullImagePrompt = buildRoomPrompt(roomTypeDesc, exitDescriptions, monster);
  falRealtime.generateImage({
    prompt: fullImagePrompt,
    aspectRatio: 'landscape',
    size: '1024',
  });
}
```

### 2. Dungeon Content Generation

**File:** `lib/dungeon/content.ts`

**Usage:**
```typescript
const fullImagePrompt = buildRoomPrompt(roomTypeDesc, exitDescriptions, monster);
imageUrl = await falRealtime.generateImage({
  prompt: fullImagePrompt,
  aspectRatio: 'landscape',
  size: '1024',
});
```

### 3. Room Image Generation

**File:** `lib/dungeon/images.ts`

**Function:** `generateRoomImage()`

**Usage:**
- Called during dungeon generation
- Uses `buildRoomPrompt()` internally
- Returns image URL or null

## Monster Visual Descriptions

Monsters are defined in `lib/game/monsters.ts` with two description fields:

1. **`visualDescription`** - Used in image prompts (detailed, atmospheric)
2. **`combatDescription`** - Used in narrative text (action-focused)

**Example Structure:**
```typescript
{
  id: 'skeleton',
  name: 'Skeleton',
  visualDescription: 'a skeletal warrior clad in rusted chainmail...',
  combatDescription: 'A skeletal warrior rises from the shadows...',
  tier: 'common',
  minLevel: 1,
  xp: 50,
}
```

## Style Guidelines

### Art Direction
- **Primary Style:** Dark Fantasy, Gothic Horror
- **Aesthetic References:** Bloodborne, Dark Souls
- **Art Technique:** Digital Painting, Semi-realistic
- **Visual Style:** Buriedbornes & Gustave Doré engraving style

### Key Visual Elements
- Wet stone surfaces
- Volumetric lighting
- Deep depth of field
- Sharp focus everywhere
- Heavy cross-hatching for shadows
- Ink-wash technique for transparency
- Ominous, desolate atmosphere

### Color Palette
- Dark, muted tones
- Crimson accents (monster eyes, magical effects)
- Gold/yellow highlights (torchlight, treasure)
- Black and grey stone textures

## Prompt Examples

### Example 1: Skeleton in Corridor
```
A wide cinematic environmental shot looking down a long dark dungeon corridor. Standing deep in the hallway, positioned far back with a large stretch of wet stone floor in the foreground, is a Skeleton. The Skeleton is fully visible from head to toe, appearing significantly smaller than the surrounding walls. a skeletal warrior clad in rusted chainmail, its empty eye sockets glowing with a faint crimson light, wielding a notched longsword. The bones are yellowed with age, and tattered cloth hangs from its frame. Heavy cross-hatching shadows define its form. The room has a doorway to the north, a doorway to the east. 8k resolution, distinct digital painting style, semi-realistic textures, wet stone surfaces, volumetric lighting, deep depth of field, sharp focus everywhere, dark fantasy masterpiece.
```

### Example 2: Slime (Small Creature)
```
A wide cinematic shot from a slightly elevated standing perspective, looking down the length of a long dark dungeon corridor. Positioned far down the hallway, well into the distance on the wet stone floor, sits a Gelatinous Slime. The Gelatinous Slime appears tiny and far away relative to the vast corridor. a massive translucent ooze, its body a sickly green-yellow with visible bones and debris suspended within. It pulses and quivers, leaving a corrosive trail. Ink-wash technique shows its semi-transparent nature against the dark stone floor. The room has a doorway to the south, no visible exits, sealed walls. 8k resolution, distinct digital painting style, semi-realistic textures, wet stone surfaces, volumetric lighting, deep depth of field, sharp focus everywhere, dark fantasy masterpiece.
```

### Example 3: Empty Room
```
A wide environmental shot of a dark dungeon dungeon room. The room's floor and walls are visible. The room has a doorway to the north, a doorway to the east, a doorway to the west. 8k resolution, distinct digital painting style, semi-realistic textures, wet stone surfaces, volumetric lighting, deep depth of field, sharp focus everywhere, dark fantasy masterpiece.
```

## Technical Details

### Image Specifications
- **Default Size:** 1024px (landscape)
- **Aspect Ratio:** Landscape (4:3)
- **Format:** PNG
- **Resolution:** 8k (prompt keyword, actual output depends on model)

### Error Handling
- WebSocket failures fall back to HTTP
- HTTP failures log error and return null
- Image generation failures don't block story generation
- Timeout: 60 seconds for WebSocket requests

### State Management
- Image URLs stored in component state (`imageUrl`)
- Context history maintained for prompt consistency
- Image URLs cached in dungeon nodes (`node.imageUrl`)

## Future Enhancements

### Potential Improvements
1. **Biome Integration:** Actively use biome descriptions in prompts
2. **Dynamic Lighting:** Vary lighting based on room type
3. **Atmospheric Details:** Add room-specific atmospheric keywords
4. **Pre-rendering:** Option to pre-generate all room images
5. **Style Variations:** Different art styles for different room types
6. **Monster Poses:** Add pose/action descriptions to visual descriptions

### Known Limitations
1. Case B creatures may still appear too close if model ignores prompt
2. Biome system defined but not actively used
3. No dynamic lighting variations
4. Fixed art style (no style variations per room type)

## File Reference

### Core Files
- `rpg-game/lib/dungeon/images.ts` - Prompt building and room image generation
- `rpg-game/lib/ai/images.ts` - Image generation API wrapper
- `rpg-game/lib/ai/fal-realtime.ts` - WebSocket connection manager
- `rpg-game/lib/hooks/use-game-generation.ts` - Game generation hook with image integration
- `rpg-game/lib/game/monsters.ts` - Monster database with visual descriptions
- `rpg-game/app/api/generate-story/route.ts` - Story generation API with fallback prompt builder
- `rpg-game/app/api/generate-image/route.ts` - HTTP image generation API route

### Related Files
- `rpg-game/lib/dungeon/content.ts` - Dungeon content generation
- `rpg-game/lib/dungeon/types.ts` - Dungeon node and exit types
- `rpg-game/components/GameInterface.tsx` - Main game interface (displays images)

## Summary

The image generation system uses a sophisticated four-segment prompt structure that:
1. **Dynamically frames scenes** based on creature size (small/standard/none)
2. **Forces proper camera distance** to prevent cropping and close-ups
3. **Maintains consistent art style** across all generated images
4. **Integrates seamlessly** with story generation and game flow
5. **Uses efficient WebSocket connections** with automatic HTTP fallback

The system prioritizes visual consistency, proper composition, and atmospheric dark fantasy aesthetics while maintaining flexibility for different room types and monster encounters.












