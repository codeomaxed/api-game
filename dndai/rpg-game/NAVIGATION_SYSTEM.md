# Navigation System - Complete Technical Documentation

## Table of Contents

1. [Overview](#overview)
2. [Node System](#node-system)
3. [Connector System](#connector-system)
4. [Navigation System](#navigation-system)
5. [Camera System](#camera-system)
6. [Image Generation](#image-generation)
7. [State Management](#state-management)
8. [Choice System](#choice-system)
9. [Flow Diagrams](#flow-diagrams)

---

## Overview

The navigation system is a sophisticated grid-based dungeon exploration system that combines procedural generation, AI-driven narrative, and dynamic image generation. The system uses a coordinate-based node graph where each room is a node connected to adjacent nodes through bidirectional connectors.

### Key Concepts

- **Nodes**: Rooms in the dungeon, identified by `x,y` coordinates
- **Connectors**: Bidirectional links between nodes with visual types
- **Navigation**: Movement through nodes using cardinal directions
- **Camera System**: Perspective-based visual configuration (8 archetypes)
- **Image Generation**: Topology-first prompt architecture
- **Fog of War**: Visited vs. seen node tracking

### Architecture Flow

```
Dungeon Generation → Node Creation → Connection Assignment → 
Player Movement → Room Entry → Content Generation → 
Story/Image Generation → Choice Display → Player Selection → Loop
```

---

## Node System

### Node Structure

Each node (`DungeonNode`) represents a room in the dungeon and contains:

```typescript
interface DungeonNode {
  id: string;              // "x,y" format (e.g., "6,15")
  x: number;               // Grid X coordinate (0-11)
  y: number;               // Grid Y coordinate (0-19)
  type: RoomType;          // START | BOSS | NORMAL | TREASURE | EVENT | MERCHANT | DEAD_END
  connections: Map<string, Connection>;  // Bidirectional connections
  isMainPath: boolean;     // Whether node is on main progression path
  visited: boolean;        // Has player been here? (for fog of war)
  monster: Monster | null; // Pre-assigned monster (null for START, boss for BOSS)
  content?: RoomContent;   // Generated content (undefined until first visit)
}
```

### Room Types

| Type | Color | Radius | Label | Description |
|------|-------|--------|-------|-------------|
| START | Green | 6 | START | Entrance room, always at bottom |
| BOSS | Red | 12 | BOSS | Final boss encounter at top |
| NORMAL | Gray | 5 | - | Regular exploration rooms |
| TREASURE | Yellow | 7 | $ | Loot rooms |
| EVENT | Purple | 6 | ? | Special event rooms |
| MERCHANT | Orange | 8 | SHOP | Shop encounters |
| DEAD_END | Dark Gray | 4 | - | Dead ends (1 connection) |

### Grid System

- **Grid Dimensions**: 12x20 cells (portrait orientation)
- **Cell Size**: 45 pixels
- **Orientation**: Vertical (bottom to top progression)
- **Coordinate System**: 
  - X: 0-11 (left to right)
  - Y: 0-19 (top to bottom, but progression is bottom→top)
  - Start node: `(Math.floor(GRID_W / 2), GRID_H - 2)` = `(6, 18)` (bottom center)
  - Antechamber: `(6, 17)` (directly north of start)
  - Boss node: `(random 2-9, 2)` (near top, random horizontal position)

### Node Generation Process

1. **Waypoint System**: Defines key points (start, intermediate waypoints, boss)
2. **Path Creation**: Creates linear path through waypoints using A*-like algorithm
3. **Branching**: Adds side branches with probability (60% main branch, 30% sub-branch)
4. **Room Assignment**: Assigns room types based on position and path importance
5. **Monster Assignment**: Topology-aware spawning (prevents monsters in straight corridors)

---

## Connector System

### Connection Structure

Connections are **bidirectional** - when Node A connects to Node B, both nodes store the connection:

```typescript
interface Connection {
  targetId: string;        // Target node ID ("x,y")
  type: ConnectionType;    // Visual descriptor for the connection
}
```

### Connection Types

| Type | Description | Visual Example |
|------|-------------|----------------|
| `arched_stone` | Open stone archway | "Step through the mossy archway" |
| `heavy_door` | Reinforced wooden door | "Push through the heavy door" |
| `iron_bars` | Rusted iron gate | "Approach the rusted iron gate" |
| `collapsed_hole` | Jagged hole in wall | "Squeeze through the opening" |
| `grand_double_doors` | Ornate double doors | "Open the ornate double doors" |

### Connection Assignment

When two nodes are connected, both receive the **same connection type**:

```typescript
private connect(n1: DungeonNode, n2: DungeonNode): void {
  const connectionType: ConnectionType = 
    CONNECTION_TYPES[Math.floor(Math.random() * CONNECTION_TYPES.length)];
  
  // Create bidirectional connections
  n1.connections.set(n2.id, { targetId: n2.id, type: connectionType });
  n2.connections.set(n1.id, { targetId: n1.id, type: connectionType });
}
```

### Exit Calculation

Exits are calculated by comparing node coordinates:

```typescript
function getExits(nodeId: string, allNodes: Map<string, DungeonNode>): Exits {
  const node = allNodes.get(nodeId);
  const exits = { north: false, south: false, east: false, west: false };
  
  node.connections.forEach((connection, targetId) => {
    const connected = allNodes.get(targetId);
    const dx = connected.x - node.x;
    const dy = connected.y - node.y;
    
    // Determine direction based on coordinate delta
    if (dx === 0 && dy === -1) exits.north = true;  // Target is above
    if (dx === 0 && dy === 1) exits.south = true;   // Target is below
    if (dx === 1 && dy === 0) exits.east = true;    // Target is right
    if (dx === -1 && dy === 0) exits.west = true;   // Target is left
  });
  
  return exits;
}
```

---

## Navigation System

### Movement Mechanics

Player movement is handled by the `movePlayer` function in the dungeon store:

```typescript
movePlayer: (direction: 'north' | 'south' | 'east' | 'west') => {
  // 1. Get current node
  const currentNode = nodes.get(playerLocation);
  
  // 2. Validate exit exists
  const exits = getExits(playerLocation, nodes);
  if (!exits[direction]) return false;
  
  // 3. Calculate target coordinates
  const dx = direction === 'east' ? 1 : direction === 'west' ? -1 : 0;
  const dy = direction === 'north' ? -1 : direction === 'south' ? 1 : 0;
  const targetX = currentNode.x + dx;
  const targetY = currentNode.y + dy;
  const targetId = `${targetX},${targetY}`;
  
  // 4. Calculate entry direction (opposite of movement)
  let entryDirection: 'north' | 'south' | 'east' | 'west' | null = null;
  if (direction === 'north') entryDirection = 'south';
  else if (direction === 'south') entryDirection = 'north';
  else if (direction === 'east') entryDirection = 'west';
  else if (direction === 'west') entryDirection = 'east';
  
  // 5. Update state
  targetNode.visited = true;
  set({ 
    nodes: newNodes, 
    playerLocation: targetId, 
    visitedNodes: newVisitedNodes,
    seenNodes: newSeenNodes,
    entryDirection: entryDirection
  });
}
```

### Entry Direction Calculation

The entry direction is critical for:
- **Camera perspective**: Determines what the player "faces"
- **Relative positioning**: Maps absolute directions to relative (left/right/ahead/behind)
- **Image generation**: Ensures correct visual framing

**Rule**: Player faces the **opposite** of the direction they entered from.

- Entering from **North** → Facing **South**
- Entering from **South** → Facing **North**
- Entering from **East** → Facing **West**
- Entering from **West** → Facing **East**

### Heading Calculation

Heading is the direction the player is **facing** after movement (used for main path progression):

```typescript
export function getHeading(
  fromNode: DungeonNode,
  toNode: DungeonNode
): AbsoluteDirection | null {
  const dx = toNode.x - fromNode.x;
  const dy = toNode.y - fromNode.y;
  
  if (dx === 0 && dy === -1) return 'north';  // Moving up
  if (dx === 0 && dy === 1) return 'south';  // Moving down
  if (dx === 1 && dy === 0) return 'east';   // Moving right
  if (dx === -1 && dy === 0) return 'west';  // Moving left
  
  return null;
}
```

---

## Camera System

### Visual Configuration Archetypes

The camera system uses **8 visual archetypes** based on room topology (which exits are visible from the player's perspective):

| Config | Binary | Exits | Description |
|--------|--------|-------|-------------|
| `DEAD_END` | 000 | None | No visible exits (only entry behind) |
| `STRAIGHT_PATH` | 010 | Ahead only | Corridor with one exit ahead |
| `RIGHT_TURN` | 001 | Right only | Corner with exit to right |
| `LEFT_TURN` | 100 | Left only | Corner with exit to left |
| `T_JUNCTION` | 101 | Left & Right | T-junction (wall ahead) |
| `LEFT_BRANCH` | 110 | Ahead & Left | Multi-way (right blocked) |
| `RIGHT_BRANCH` | 011 | Ahead & Right | Multi-way (left blocked) |
| `CROSSROADS` | 111 | All directions | Four-way intersection |

### Perspective Mapping

The system maps **absolute directions** (North/South/East/West) to **relative positions** (Left/Right/Ahead/Behind) based on entry direction:

```typescript
// If player entered from North, they face South
// Therefore: North = Behind, South = Ahead, East = Right, West = Left

const PERSPECTIVE_MAP: Record<Direction, Record<Direction, RelativeDir>> = {
  NORTH: { WEST: 'left', EAST: 'right', NORTH: 'ahead', SOUTH: 'behind' },
  EAST:  { NORTH: 'left', SOUTH: 'right', EAST: 'ahead', WEST: 'behind' },
  SOUTH: { EAST: 'left', WEST: 'right', SOUTH: 'ahead', NORTH: 'behind' },
  WEST:  { SOUTH: 'left', NORTH: 'right', WEST: 'ahead', EAST: 'behind' },
};
```

### Visual Configuration Calculation

```typescript
export function determineVisualConfiguration(
  exits: Exits,
  entryDirection: AbsoluteDirection | null,
  currentNode: DungeonNode
): VisualConfiguration {
  // Map exits to relative positions
  const relativeExits = { left: false, right: false, ahead: false, behind: false };
  
  // Check each absolute direction and map to relative
  if (exits.north) {
    const rel = getRelativeView(entryDirection, 'north');
    if (rel !== 'behind') relativeExits[rel] = true;
  }
  // ... repeat for south, east, west
  
  // Determine template based on which relative directions have exits
  const left = relativeExits.left ? 1 : 0;
  const ahead = relativeExits.ahead ? 1 : 0;
  const right = relativeExits.right ? 1 : 0;
  const config = (left << 2) | (ahead << 1) | right;
  
  // Return appropriate VisualConfiguration
  switch (config) {
    case 0b000: return 'DEAD_END';
    case 0b010: return 'STRAIGHT_PATH';
    // ... etc
  }
}
```

### Connection Type Retrieval

For each relative direction, the system retrieves the connection type:

```typescript
export function getConnectionTypeForRelativeDirection(
  currentNode: DungeonNode,
  relativeDirection: 'left' | 'right' | 'ahead',
  entryDirection: AbsoluteDirection | null
): { type: string; absoluteDirection: AbsoluteDirection } | null {
  // Map relative direction back to absolute directions
  const facingDirection = entryDirection 
    ? getOppositeDirection(entryDirection)
    : 'north';
  
  // Find which absolute direction maps to this relative direction
  const absoluteDirections: AbsoluteDirection[] = [];
  for (const absDir of ['north', 'south', 'east', 'west']) {
    const rel = getRelativeView(entryDirection, absDir);
    if (rel === relativeDirection) {
      absoluteDirections.push(absDir);
    }
  }
  
  // Find the first absolute direction that has a connection
  for (const absDir of absoluteDirections) {
    const targetId = calculateTargetId(currentNode, absDir);
    const connection = currentNode.connections.get(targetId);
    if (connection) {
      return { type: connection.type, absoluteDirection: absDir };
    }
  }
  
  return null;
}
```

---

## Image Generation

### Topology-First Architecture

The image generation system uses a **topology-first** approach where:
1. **Geometry Archetype** is determined first (8 visual configurations)
2. **Base Prompt String** is selected based on archetype
3. **Monster Positioning** adapts to geometry (not vice versa)
4. **Creature Visual Description** is added
5. **Unified Art Style** is appended

### Prompt Structure

Each prompt follows this structure:

```
[SEGMENT 1: Geometric Template] + 
[SEGMENT 2: Monster Placement] + 
[SEGMENT 3: Creature Visual Description] + 
[SEGMENT 4: Unified Art Style]
```

### Example Prompts by Archetype

#### STRAIGHT_PATH (Ahead only)
```
A straight, narrow tunnel leading directly AHEAD to a distant (heavily illuminated) arched stone passageway. 
The left and right walls are solid, unbroken stone. One-point perspective.
Deep in the tunnel, Goblin waits.
[Creature visual description]
, gritty Dark Souls and Buriedbornes art style, 8k resolution...
```

#### T_JUNCTION (Left & Right)
```
A branching path splitting LEFT and RIGHT. 
On the left, a (heavily illuminated) heavy wooden door. 
On the right, a (heavily illuminated) iron-barred gate. 
Directly ahead is a solid stone pillar splitting the room.
At the center, Skeleton blocks the path.
[Creature visual description]
, gritty Dark Souls and Buriedbornes art style...
```

#### CROSSROADS (All directions)
```
A multi-way intersection. 
Ahead is a (heavily illuminated) arched stone passageway. 
To the left, a (heavily illuminated) heavy wooden door. 
To the right, a (heavily illuminated) collapsed hole in the wall.
At the center, Orc blocks the path.
[Creature visual description]
, gritty Dark Souls and Buriedbornes art style...
```

### Negative Prompts

The system automatically generates negative prompts to prevent AI hallucinations:

```typescript
const negativePrompts: string[] = [
  'cartoon', 'sketch', 'blur', 'symmetry',
  'wide angle distortion', 'no open doors',
  'no extra hallways', 'no additional passages', 'no false exits'
];

// Add directional negative prompts for solid walls
if (!hasLeft) {
  negativePrompts.push('door on left', 'archway on left', 'hallway on left');
}
if (!hasRight) {
  negativePrompts.push('door on right', 'archway on right', 'hallway on right');
}
if (!hasAhead) {
  negativePrompts.push('door ahead', 'hallway ahead', 'tunnel ahead');
}
```

### Monster Positioning Rules

Monster placement adapts to geometry:

- **DEAD_END**: "In the corner, [monster] stands defensively"
- **STRAIGHT_PATH**: "Deep in the tunnel, [monster] waits"
- **T_JUNCTION / CROSSROADS**: "At the center, [monster] blocks the path"
- **TURNS**: "In the corner, [monster] stands defensively"

### Image Generation Flow

1. **Calculate Visual Configuration** from exits and entry direction
2. **Get Connection Types** for each relative direction
3. **Select Geometric Template** based on archetype
4. **Add Monster Placement** (if monster exists)
5. **Add Creature Description** (if monster exists)
6. **Append Art Style** keywords
7. **Generate Image** via WebSocket (fal.ai) or HTTP fallback

---

## State Management

### Dungeon Store (Zustand)

The dungeon state is managed using Zustand:

```typescript
interface DungeonState {
  nodes: Map<string, DungeonNode>;      // All nodes in dungeon
  startNodeId: string;                  // Starting node ID
  bossNodeId: string;                    // Boss node ID
  playerLocation: string;               // Current node ID
  visitedNodes: Set<string>;            // Visited nodes (for fog of war)
  seenNodes: Set<string>;               // Seen nodes (persistent visibility)
  entryDirection: 'north' | 'south' | 'east' | 'west' | null;
}
```

### Fog of War System

The system uses two visibility states:

1. **Visited Nodes** (`visitedNodes`): Nodes the player has actually entered
2. **Seen Nodes** (`seenNodes`): Nodes visible on minimap (persistent)

**Visibility Rules**:
- Current node: Always visible
- Visited nodes: Always visible
- Direct neighbors: Visible and marked as "seen"
- Other nodes: Hidden (fog of war)

```typescript
getVisibleNodes: () => {
  const visible = new Set<string>();
  const currentNode = nodes.get(playerLocation);
  
  // Always show current node
  visible.add(playerLocation);
  
  // Show visited nodes
  visitedNodes.forEach(id => visible.add(id));
  
  // Show all previously seen nodes (persistent visibility)
  seenNodes.forEach(id => visible.add(id));
  
  // Show direct neighbors (scouting range) - and mark them as seen
  const newSeenNodes = new Set(seenNodes);
  currentNode.connections.forEach((connection, targetId) => {
    visible.add(targetId);
    newSeenNodes.add(targetId); // Mark as seen
  });
  
  // Update seenNodes if new nodes were discovered
  if (newSeenNodes.size > seenNodes.size) {
    set({ seenNodes: newSeenNodes });
  }
  
  return visible;
}
```

### Room Content Caching

Room content is cached in the node itself:

```typescript
interface RoomContent {
  description: string;           // Narrative text
  imageUrl: string;              // Generated image URL
  availableChoices: Choice[];    // Movement/action choices
  isExplored: boolean;          // Has player been here?
  entities: string[];            // Persistent entities (monsters, chests)
}
```

**Caching Strategy**:
- Content is generated on first visit
- Cached in `node.content` for subsequent visits
- Prevents regeneration of story/images for visited rooms

---

## Choice System

### Choice Structure

```typescript
interface Choice {
  id: string;                    // Unique identifier
  text: string;                   // Display text (with [DIRECTION] tag)
  actionPoints: number;           // AP cost (typically 1)
  type: 'action' | 'attack' | 'spell' | ...;
  metadata?: {
    direction?: 'north' | 'south' | 'east' | 'west';
  };
}
```

### Choice Format

Choices use a standardized format with direction tags:

```
[NORTH] Step through the mossy archway into the darkness
[EAST] Push through the heavy wooden door
[SOUTH] Retrace your steps the way you came
```

### Choice Generation Flow

1. **AI Generates Narrative** with `CHOICES:` section
2. **Parser Extracts Choices** using regex patterns
3. **Validation** against actual exits (removes invalid choices)
4. **Formatting** ensures `[DIRECTION]` tags are present
5. **Display** in UI with icons and hotkeys

### Choice Parsing

The system supports multiple formats for backward compatibility:

```typescript
// Format 1: [NORTH] Immersive text
const match1 = line.match(/^-\s*\[(NORTH|SOUTH|EAST|WEST)\]\s*(.+)/i);

// Format 2: Text (direction: north)
const match2 = line.match(/^-\s*(.+?)\s*\(direction:\s*(\w+)\)/i);

// Format 3: [FORWARD] / [LEFT] / [RIGHT] / [BACK] (relative)
const match3 = line.match(/^-\s*\[(FORWARD|LEFT|RIGHT|BACK)\]\s*(.+)/i);
```

### Choice Validation

Choices are validated against actual node connections:

```typescript
// Calculate exit flags from current node
const exitFlags = {
  hasNorth: dungeonNode.connections.has(`${dungeonNode.x},${dungeonNode.y - 1}`),
  hasEast: dungeonNode.connections.has(`${dungeonNode.x + 1},${dungeonNode.y}`),
  hasWest: dungeonNode.connections.has(`${dungeonNode.x - 1},${dungeonNode.y}`),
  hasSouth: dungeonNode.connections.has(`${dungeonNode.x},${dungeonNode.y + 1}`),
};

// Filter choices to only show valid exits
const validChoices = choices.filter(choice => {
  const { direction } = getDirectionInfo(choice.text);
  if (!direction) return true; // Non-directional choices are always valid
  
  // Check if the direction has a valid exit
  if (direction === 'NORTH') return exitFlags.hasNorth;
  if (direction === 'EAST') return exitFlags.hasEast;
  if (direction === 'WEST') return exitFlags.hasWest;
  if (direction === 'SOUTH') return exitFlags.hasSouth;
  return true;
});
```

### Choice Display

Choices are displayed with:
- **Icons**: Directional arrows (⬆️⬇️➡️⬅️)
- **Hotkeys**: Number keys (1, 2, 3, 4)
- **Immersive Text**: Extracted from `[DIRECTION]` tag content

---

## Flow Diagrams

### Complete Movement Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    PLAYER SELECTS CHOICE                     │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              GameInterface.handleChoice()                    │
│  - Extract direction from choice.metadata.direction        │
│  - Check action points                                      │
│  - Call movePlayer(direction)                               │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              DungeonStore.movePlayer()                       │
│  1. Validate exit exists                                    │
│  2. Calculate target coordinates                            │
│  3. Calculate entry direction (opposite of movement)       │
│  4. Mark target as visited                                   │
│  5. Update playerLocation                                   │
│  6. Update entryDirection                                   │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              GameInterface.handleRoomEntry()                │
│  - Check if room content is cached                          │
│  - If cached: Load from node.content                        │
│  - If not: Generate new content                             │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│         DungeonStore.enterRoom() / generateRoomContent()    │
│  1. Calculate valid exits from connections                  │
│  2. Get entry connection type                               │
│  3. Build AI prompt with exits and context                  │
│  4. Call /api/generate-story (streaming)                    │
│  5. Parse story and extract choices                         │
│  6. Generate image using buildRoomPrompt()                  │
│  7. Cache content in node.content                           │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              Story/Image Generation                          │
│                                                              │
│  Story Generation:                                          │
│  - Streaming API call to OpenRouter (Gemini Flash)          │
│  - Parse SSE format: "data: {...}"                          │
│  - Extract narrative and choices                           │
│                                                              │
│  Image Generation:                                          │
│  - Calculate visual configuration (8 archetypes)             │
│  - Build topology-first prompt                              │
│  - Generate via WebSocket (fal.ai) or HTTP fallback         │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              GameInterface State Update                      │
│  - Update currentNode with room content                      │
│  - Update storyLog                                           │
│  - Update currentRoomImage                                   │
│  - Display choices in CommandConsole                        │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    WAIT FOR NEXT CHOICE                      │
└─────────────────────────────────────────────────────────────┘
```

### Visual Configuration Calculation Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    ENTER ROOM                                │
│  - Current node exits (north, south, east, west)            │
│  - Entry direction (direction entered from)                │
└───────────────────────────┬─────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│         determineVisualConfiguration()                      │
│                                                              │
│  1. Map absolute directions to relative positions:         │
│     - getRelativeView(entryDirection, 'north') → 'ahead'    │
│     - getRelativeView(entryDirection, 'east') → 'right'     │
│     - getRelativeView(entryDirection, 'west') → 'left'     │
│                                                              │
│  2. Build relative exits object:                            │
│     { left: boolean, right: boolean, ahead: boolean }       │
│                                                              │
│  3. Calculate binary config:                                │
│     config = (left << 2) | (ahead << 1) | right            │
│                                                              │
│  4. Return VisualConfiguration:                             │
│     - 0b000 → DEAD_END                                      │
│     - 0b010 → STRAIGHT_PATH                                 │
│     - 0b001 → RIGHT_TURN                                    │
│     - 0b100 → LEFT_TURN                                     │
│     - 0b101 → T_JUNCTION                                    │
│     - 0b110 → LEFT_BRANCH                                   │
│     - 0b011 → RIGHT_BRANCH                                  │
│     - 0b111 → CROSSROADS                                    │
└───────────────────────────┬─────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│              buildRoomPrompt()                               │
│                                                              │
│  1. Get connection types for relative directions:          │
│     - getConnectionTypeForRelativeDirection('left')         │
│     - getConnectionTypeForRelativeDirection('right')        │
│     - getConnectionTypeForRelativeDirection('ahead')        │
│                                                              │
│  2. Select geometric template based on VisualConfiguration  │
│                                                              │
│  3. Add monster placement (if monster exists)              │
│                                                              │
│  4. Add creature visual description (if monster exists)    │
│                                                              │
│  5. Append unified art style keywords                       │
│                                                              │
│  6. Generate negative prompts for solid walls               │
└───────────────────────────┬─────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│              Image Generation                                │
│  - WebSocket (fal.ai) or HTTP fallback                      │
│  - Returns image URL                                         │
└─────────────────────────────────────────────────────────────┘
```

### Choice Parsing Flow

```
┌─────────────────────────────────────────────────────────────┐
│              AI Response (Streaming)                         │
│  Format: "Description text... CHOICES: - [NORTH] ..."        │
└───────────────────────────┬─────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│              Parse CHOICES Section                           │
│  - Extract text after "CHOICES:"                            │
│  - Split by newlines                                        │
│  - Filter lines starting with "-"                          │
└───────────────────────────┬─────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│              Parse Each Choice Line                          │
│                                                              │
│  Try Format 1: [NORTH] Immersive text                       │
│  Try Format 2: Text (direction: north)                       │
│  Try Format 3: [FORWARD] Text (relative)                    │
│                                                              │
│  Extract:                                                    │
│  - Direction (NORTH/SOUTH/EAST/WEST)                        │
│  - Display text (immersive description)                     │
└───────────────────────────┬─────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│              Validate Against Exits                          │
│                                                              │
│  For each parsed choice:                                    │
│  1. Get direction from choice                               │
│  2. Check if node has connection in that direction          │
│  3. If valid: Keep choice                                    │
│  4. If invalid: Remove choice                              │
└───────────────────────────┬─────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│              Format Choices                                  │
│                                                              │
│  Ensure all choices have [DIRECTION] tag:                   │
│  - If missing: Add tag from metadata.direction               │
│  - Transform: "Go North" → "[NORTH] Go North"              │
└───────────────────────────┬─────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│              Display in UI                                   │
│  - Sort by direction (North, East, West, South)             │
│  - Add icons (⬆️⬇️➡️⬅️)                                    │
│  - Add hotkeys (1, 2, 3, 4)                                 │
│  - Extract display text (remove [DIRECTION] tag)            │
└─────────────────────────────────────────────────────────────┘
```

### Entry Direction Calculation Example

```
Example: Player moves from Node (6, 15) to Node (6, 14)

Step 1: Calculate movement direction
  - dx = 6 - 6 = 0
  - dy = 14 - 15 = -1
  - Movement direction: NORTH (moving up)

Step 2: Calculate entry direction (opposite)
  - Entry direction: SOUTH (entered from south)

Step 3: Calculate facing direction (opposite of entry)
  - Facing direction: NORTH (facing north)

Step 4: Map exits to relative positions
  - If exit exists at (6, 13): NORTH → AHEAD
  - If exit exists at (6, 15): SOUTH → BEHIND
  - If exit exists at (7, 14): EAST → RIGHT
  - If exit exists at (5, 14): WEST → LEFT

Step 5: Determine visual configuration
  - If exits: AHEAD + RIGHT → RIGHT_BRANCH (0b011)
  - Template: "A multi-way intersection. Ahead is a [exit]. To the right, a [exit]."
```

---

## Key Implementation Details

### Coordinate System

- **Grid**: 12x20 cells (portrait orientation)
- **Origin**: Top-left (0, 0)
- **Progression**: Bottom to top (Y decreases = forward)
- **Node ID Format**: `"x,y"` (e.g., `"6,15"`)

### Direction Semantics

In vertical orientation:
- **North (Y-1)**: Forward progression, deeper into dungeon
- **South (Y+1)**: Retreat, going back
- **East (X+1)**: Right side
- **West (X-1)**: Left side

### Monster Spawning Rules

1. **START room**: No monster
2. **BOSS room**: Always has boss monster
3. **STRAIGHT_PATH topology**: No monster (blocks door view)
4. **Dead ends (1 connection)**: 70% chance of monster
5. **Main path nodes**: No monster if player faces a door (heading matches exit)

### Caching Strategy

- **Room content**: Cached in `node.content` after first generation
- **Story history**: Last 5 events tracked for narrative continuity
- **Image URLs**: Cached with room content
- **Choices**: Cached and validated on load

### Error Handling

- **Invalid movement**: Returns `false`, no state change
- **Missing exits**: Fallback to generic choices
- **Image generation failure**: Story continues without image
- **AI parsing failure**: Fallback to movement metadata

---

## File Reference

### Core Files

- `lib/dungeon/types.ts` - Type definitions
- `lib/dungeon/generator.ts` - Dungeon generation
- `lib/dungeon/store.ts` - State management
- `lib/dungeon/geometry.ts` - Camera/perspective calculations
- `lib/dungeon/images.ts` - Image prompt generation
- `lib/dungeon/content.ts` - Room content generation
- `lib/dungeon/prompts.ts` - AI prompt construction

### UI Components

- `components/GameInterface.tsx` - Main game UI
- `components/CommandConsole.tsx` - Choice display
- `components/DungeonMiniMap.tsx` - Minimap visualization

### Hooks & Utilities

- `lib/hooks/use-game-generation.ts` - Story/image generation hook
- `lib/ai/fal-realtime.ts` - WebSocket image generation
- `app/api/generate-story/route.ts` - Story generation API

---

## Summary

The navigation system is a sophisticated, multi-layered architecture that combines:

1. **Procedural Generation**: Grid-based dungeon creation with waypoints and branching
2. **Bidirectional Connections**: Nodes linked with visual connection types
3. **Perspective-Based Camera**: 8 visual archetypes based on room topology
4. **Topology-First Images**: Geometry determines layout, monsters adapt
5. **AI-Driven Narrative**: Streaming story generation with choice parsing
6. **Fog of War**: Visited/seen tracking for exploration mechanics
7. **Content Caching**: Prevents regeneration of visited rooms

The system ensures visual consistency between the minimap, generated images, and narrative descriptions through strict coordinate-based calculations and perspective mapping.










