import { DungeonNode, Exits, RoomType } from './types';

// ==========================================
// 1. IMMUTABLE PROMPTS (DO NOT MODIFY)
// ==========================================
export const PROMPT_ARCHETYPE_NAMES = [
  'Dead End',
  'Right Turn',
  'Straight',
  'Right Branch',
  'Left Turn',
  'T-Junction',
  'Left Branch',
  'Crossroads',
  'Merchant: S + Dead End',
  'Merchant: N + Straight',
  'Merchant: E + Right Turn',
  'Merchant: W + Right Turn'
];

const ARCHETYPE_PROMPTS = [
  // 0 (000) - DEAD END
  `Grimdark fantasy masterpiece, heavily inspired by Dark Souls 3. A cinematic 16:9 wide-angle shot of a sealed dungeon chamber. The camera looks straight at a flat, blank stone wall. The back wall (center) is a continuous, seamless expanse of heavy wet bricks from floor to ceiling. The left wall is a solid, blank surface of wet masonry. The right wall is a solid, blank surface of wet masonry. The floor is a wide expanse of broken wet stone reflecting faint orange torchlight. Heavy vignette, pitch-black shadows, filthy textures, thick fog, claustrophobic, 8k resolution, photorealistic grim concept art.`,

  // 1 (001) - RIGHT TURN
  `Grimdark fantasy masterpiece, heavily inspired by Dark Souls 3. A cinematic 16:9 wide-angle shot of a dungeon corner. The camera looks straight at a flat, blank stone wall. The wall on the Left Side of the frame is a solid, seamless surface of heavy stone blocks. The back wall (center) is a continuous, seamless expanse of heavy wet bricks. The wall on the Right Side of the frame features a tall, ominous archway leading into darkness. The floor is a wide expanse of broken wet stone reflecting faint orange torchlight. Heavy vignette, pitch-black shadows, filthy textures, thick fog, claustrophobic, 8k resolution, photorealistic grim concept art.`,

  // 2 (010) - STRAIGHT
  `Grimdark fantasy masterpiece, heavily inspired by Dark Souls 3. A cinematic 16:9 wide-angle shot of a long dungeon corridor. The camera looks down a deep hallway. The back wall (center) features a tall, ominous archway leading straight into deep darkness. The left wall is a continuous, seamless expanse of heavy wet bricks. The right wall is a continuous, seamless expanse of heavy wet bricks. The floor is a wide expanse of broken wet stone reflecting faint orange torchlight. Heavy vignette, pitch-black shadows, filthy textures, thick fog, claustrophobic, 8k resolution, photorealistic grim concept art.`,

  // 3 (011) - RIGHT BRANCH
  `Grimdark fantasy masterpiece, heavily inspired by Dark Souls 3. A cinematic 16:9 wide-angle shot of a dungeon junction. The camera looks down a deep hallway. The back wall (center) features a tall, ominous archway leading forward. The left wall is a solid, seamless surface of heavy stone blocks. The wall on the Right Side of the frame features a tall, ominous archway leading into darkness. The floor is a wide expanse of broken wet stone reflecting faint orange torchlight. Heavy vignette, pitch-black shadows, filthy textures, thick fog, claustrophobic, 8k resolution, photorealistic grim concept art.`,

  // 4 (100) - LEFT TURN
  `Grimdark fantasy masterpiece, heavily inspired by Dark Souls 3. A cinematic 16:9 wide-angle shot of a dungeon corner. The camera looks straight at a flat, blank stone wall. The wall on the Right Side of the frame is a solid, seamless surface of heavy stone blocks. The back wall (center) is a continuous, seamless expanse of heavy wet bricks. The wall on the Left Side of the frame features a tall, ominous archway leading into darkness. The floor is a wide expanse of broken wet stone reflecting faint orange torchlight. Heavy vignette, pitch-black shadows, filthy textures, thick fog, claustrophobic, 8k resolution, photorealistic grim concept art.`,

  // 5 (101) - T_JUNCTION
  `Grimdark fantasy masterpiece, heavily inspired by Dark Souls 3. A cinematic 16:9 wide-angle shot of a T-shaped dungeon junction. The camera looks straight at a flat, blank stone wall. The back wall (center) is a continuous, seamless expanse of heavy wet bricks from floor to ceiling. The wall on the Left Side of the frame features a tall, ominous archway. The wall on the Right Side of the frame features a matching tall, ominous archway. The floor is a wide expanse of broken wet stone reflecting faint orange torchlight. Heavy vignette, pitch-black shadows, filthy textures, thick fog, claustrophobic, 8k resolution, photorealistic grim concept art.`,

  // 6 (110) - LEFT BRANCH
  `Grimdark fantasy masterpiece, heavily inspired by Dark Souls 3. A cinematic 16:9 wide-angle shot of a dungeon junction. The camera looks down a deep hallway. The back wall (center) features a tall, ominous archway leading forward. The wall on the Left Side of the frame features a tall, ominous archway leading into darkness. The right wall is a solid, seamless surface of heavy stone blocks. The floor is a wide expanse of broken wet stone reflecting faint orange torchlight. Heavy vignette, pitch-black shadows, filthy textures, thick fog, claustrophobic, 8k resolution, photorealistic grim concept art.`,

  // 7 (111) - CROSSROADS
  `Grimdark fantasy masterpiece, heavily inspired by Dark Souls 3. A cinematic 16:9 wide-angle shot of a four-way dungeon crossroads. The camera looks down a deep hallway. The back wall (center) features a tall, ominous archway leading forward. The wall on the Left Side of the frame features a tall, ominous archway. The wall on the Right Side of the frame features a matching tall, ominous archway. The floor is a wide expanse of broken wet stone reflecting faint orange torchlight. Heavy vignette, pitch-black shadows, filthy textures, thick fog, claustrophobic, 8k resolution, photorealistic grim concept art.`,

  // 8 - MERCHANT: S + DEAD END
  `Grimdark fantasy masterpiece, heavily inspired by Dark Souls 3. A cinematic 16:9 wide-angle shot of a dungeon merchant's alcove. The camera looks straight at a crude wooden stall positioned against the back wall. Standing behind the counter is a mysterious, hooded Merchant facing the camera. The stall is cluttered with strange potions, scrolls, and rusted artifacts. The back wall (center) is a continuous, seamless expanse of heavy wet bricks from floor to ceiling. The left wall is a solid, blank surface of wet masonry. The right wall is a solid, blank surface of wet masonry. The floor is a wide expanse of broken wet stone reflecting faint orange torchlight. Heavy vignette, pitch-black shadows, filthy textures, thick fog, claustrophobic, 8k resolution, photorealistic grim concept art.`,

  // 9 - MERCHANT: N + STRAIGHT
  `Grimdark fantasy masterpiece, heavily inspired by Dark Souls 3. A cinematic 16:9 wide-angle shot of a dungeon corridor serving as a marketplace. The camera looks down a deep hallway. The back wall (center) features a tall, ominous archway leading straight into deep darkness. The left wall is lined with a long, crude wooden stall where a hooded Merchant sits, wares displayed on the damp wood. The right wall is a continuous, seamless expanse of heavy wet bricks. The floor is a wide expanse of broken wet stone with a clear path down the center, reflecting faint orange torchlight. Heavy vignette, pitch-black shadows, filthy textures, thick fog, claustrophobic, 8k resolution, photorealistic grim concept art.`,

  // 10 - MERCHANT: E + RIGHT TURN
  `Grimdark fantasy masterpiece, heavily inspired by Dark Souls 3. A cinematic 16:9 wide-angle shot of a dungeon corner occupied by a trader. The camera looks straight at a flat, blank stone wall. Positioned in the Left third of the frame is a crude wooden stall with a hooded Merchant standing behind it, seen in side profile, facing Right towards the exit. The wall directly behind the Merchant (the Left wall) is a solid, seamless surface of heavy stone blocks. The back wall (center) is a continuous, seamless expanse of heavy wet bricks. The wall on the Right Side of the frame features a tall, ominous archway leading into darkness. The floor is cluttered with scattered wares and wooden crates reflecting faint orange torchlight. Heavy vignette, pitch-black shadows, filthy textures, thick fog, claustrophobic, 8k resolution, photorealistic grim concept art.`,

  // 11 - MERCHANT: W + RIGHT TURN
  `Grimdark fantasy masterpiece, heavily inspired by Dark Souls 3. A cinematic 16:9 wide-angle shot of a dungeon corner occupied by a trader. The camera looks straight at a flat, blank stone wall. Positioned in the Right third of the frame is a crude wooden stall with a hooded Merchant standing behind it, seen in side profile, facing Left towards the exit. The wall directly behind the Merchant (the Right wall) is a solid, seamless surface of heavy stone blocks. The back wall (center) is a continuous, seamless expanse of heavy wet bricks. The wall on the Left Side of the frame features a tall, ominous archway leading into darkness. The floor is cluttered with scattered wares and wooden crates reflecting faint orange torchlight. Heavy vignette, pitch-black shadows, filthy textures, thick fog, claustrophobic, 8k resolution, photorealistic grim concept art.`

];

/**
 * Normalizes any data structure (Map, Object, Array) into a clean node array.
 */
function normalizeNodeList(container: any): DungeonNode[] {
  if (!container) return [];

  if (Array.isArray(container)) return container;
  if (container instanceof Map) return Array.from(container.values());
  if (typeof container === 'object') return Object.values(container);

  return [];
}

/**
 * Calculates the Relative Exits (Left/Ahead/Right) based on the Global Grid.
 * This is the SOURCE OF TRUTH for visual topology.
 */
export function getRelativeExits(
  node: DungeonNode,
  allNodesContainer: any,
  entryDirection: 'north' | 'south' | 'east' | 'west' | null,
  explicitExits?: Exits
) {
  const cx = Number(node.x);
  const cy = Number(node.y);

  // #region agent log
  fetch('http://127.0.0.1:7249/ingest/08331948-86a3-4f5f-b660-2645d043da0c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'prompt-logic.ts:77',message:'getRelativeExits: entry',data:{nodeId:node.id,nodeX:cx,nodeY:cy,entryDirection,hasExplicitExits:!!explicitExits,explicitExits},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion

  // 1. Determine Absolute Neighbors
  // If explicit exits are provided (from content.ts), use them.
  // Otherwise, scan the grid.
  let n = false, s = false, e = false, w = false;

  if (explicitExits) {
    n = explicitExits.north;
    s = explicitExits.south;
    e = explicitExits.east;
    w = explicitExits.west;
  } else {
    const nodes = normalizeNodeList(allNodesContainer);
    n = nodes.some(x => Number(x.x) === cx && Number(x.y) === cy - 1);
    s = nodes.some(x => Number(x.x) === cx && Number(x.y) === cy + 1);
    e = nodes.some(x => Number(x.x) === cx + 1 && Number(x.y) === cy);
    w = nodes.some(x => Number(x.x) === cx - 1 && Number(x.y) === cy);
  }

  // #region agent log
  fetch('http://127.0.0.1:7249/ingest/08331948-86a3-4f5f-b660-2645d043da0c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'prompt-logic.ts:103',message:'getRelativeExits: absolute exits calculated',data:{nodeId:node.id,absoluteExits:{north:n,south:s,east:e,west:w},usedExplicitExits:!!explicitExits},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
  // #endregion

  // Entry direction validation
  const hasAnyExits = n || s || e || w;
  if (entryDirection === null && hasAnyExits) {
    console.warn(`[Topology] ⚠ WARNING: Node(${cx},${cy}) has exits but entry direction is null`);
    console.warn(`[Topology]   Absolute exits: N=${n} S=${s} E=${e} W=${w}`);
    console.warn(`[Topology]   This may cause incorrect relative exit calculation`);
  }
  
  // Validate entry direction doesn't match an exit (impossible state)
  if (entryDirection !== null) {
    if (entryDirection === 'north' && n) {
      console.error(`[Topology] ⚠ ERROR: Node(${cx},${cy}) entry direction is 'north' but also has north exit - impossible state!`);
    }
    if (entryDirection === 'south' && s) {
      console.error(`[Topology] ⚠ ERROR: Node(${cx},${cy}) entry direction is 'south' but also has south exit - impossible state!`);
    }
    if (entryDirection === 'east' && e) {
      console.error(`[Topology] ⚠ ERROR: Node(${cx},${cy}) entry direction is 'east' but also has east exit - impossible state!`);
    }
    if (entryDirection === 'west' && w) {
      console.error(`[Topology] ⚠ ERROR: Node(${cx},${cy}) entry direction is 'west' but also has west exit - impossible state!`);
    }
  }

  // 2. Determine Facing Direction (Inverse of Entry)
  let facing = 'NORTH';
  if (entryDirection === 'south') facing = 'NORTH';
  else if (entryDirection === 'north') facing = 'SOUTH';
  else if (entryDirection === 'west') facing = 'EAST';
  else if (entryDirection === 'east') facing = 'WEST';
  // If entryDirection is null, default to NORTH (start room assumption)

  // #region agent log
  fetch('http://127.0.0.1:7249/ingest/08331948-86a3-4f5f-b660-2645d043da0c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'prompt-logic.ts:109',message:'getRelativeExits: facing direction determined',data:{nodeId:node.id,entryDirection,facing,hasAnyExits},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion

  // 3. Map Absolute to Relative
  let hasLeft = false;
  let hasAhead = false;
  let hasRight = false;

  switch (facing) {
    case 'NORTH': // Facing Up
      hasLeft = w; hasAhead = n; hasRight = e;
      break;
    case 'SOUTH': // Facing Down
      hasLeft = e; hasAhead = s; hasRight = w; // Left is East when facing South
      break;
    case 'EAST': // Facing Right
      hasLeft = n; hasAhead = e; hasRight = s; // Left is North when facing East
      break;
    case 'WEST': // Facing Left
      hasLeft = s; hasAhead = w; hasRight = n; // Left is South when facing West
      break;
  }

  // #region agent log
  fetch('http://127.0.0.1:7249/ingest/08331948-86a3-4f5f-b660-2645d043da0c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'prompt-logic.ts:129',message:'getRelativeExits: exit',data:{nodeId:node.id,absoluteExits:{north:n,south:s,east:e,west:w},facing,relativeExits:{hasLeft,hasAhead,hasRight},calculatedIndex:(hasLeft?4:0)+(hasAhead?2:0)+(hasRight?1:0)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
  // #endregion

  // Validation: Check for impossible states
  // The entry direction should not be the same as an exit (you can't enter from a direction you're also exiting to)
  if (entryDirection === 'north' && n) {
    console.warn(`[Topology] ⚠ WARNING: Node(${cx},${cy}) has entry from north but also has north exit - this may indicate a bug`);
  }
  if (entryDirection === 'south' && s) {
    console.warn(`[Topology] ⚠ WARNING: Node(${cx},${cy}) has entry from south but also has south exit - this may indicate a bug`);
  }
  if (entryDirection === 'east' && e) {
    console.warn(`[Topology] ⚠ WARNING: Node(${cx},${cy}) has entry from east but also has east exit - this may indicate a bug`);
  }
  if (entryDirection === 'west' && w) {
    console.warn(`[Topology] ⚠ WARNING: Node(${cx},${cy}) has entry from west but also has west exit - this may indicate a bug`);
  }

  // Debug Log
  console.log(`[Topology] Node(${cx},${cy}) Facing:${facing}`);
  console.log(`[Topology] Absolute: N:${n} S:${s} E:${e} W:${w}`);
  console.log(`[Topology] Relative: L:${hasLeft} A:${hasAhead} R:${hasRight}`);

  return { hasLeft, hasAhead, hasRight };
}

/**
 * Returns the strict immutable prompt based on pre-calculated relative flags.
 * The logic for determining "hasLeft/Ahead/Right" is handled by the caller (content.ts),
 * which ensures it matches the narrative text exactly.
 */
export function getStrictPrompt(
  hasLeft: boolean, 
  hasAhead: boolean, 
  hasRight: boolean
): string {
  // Calculate Index (4=Left, 2=Ahead, 1=Right)
  const index = (hasLeft ? 4 : 0) + (hasAhead ? 2 : 0) + (hasRight ? 1 : 0);

  console.log(`[PromptLogic] Received flags -> L:${hasLeft} A:${hasAhead} R:${hasRight} -> Index ${index}`);

  return ARCHETYPE_PROMPTS[index] || ARCHETYPE_PROMPTS[0];
}

/**
 * Gets a prompt by its index (0-11)
 * @param index - The prompt archetype index
 * @returns The prompt string, or the first prompt if index is invalid
 */
export function getPromptByIndex(index: number): string {
  if (index >= 0 && index < ARCHETYPE_PROMPTS.length) {
    return ARCHETYPE_PROMPTS[index];
  }
  return ARCHETYPE_PROMPTS[0];
}

/**
 * Creates a topology key string from exits for pattern matching
 * Format: "nsew" where each letter is 1 if exit exists, 0 if not
 * Example: north=true, south=false, east=true, west=false -> "1010"
 * @param exits - The exit configuration
 * @returns A string representation of the topology
 */
export function getTopologyFromExits(exits: Exits): string {
  return `${exits.north ? '1' : '0'}${exits.south ? '1' : '0'}${exits.east ? '1' : '0'}${exits.west ? '1' : '0'}`;
}

// ==========================================
// ROOM TYPE PROMPT CONFIGURATION SYSTEM
// ==========================================

/**
 * Configuration for room type-specific prompts
 * Defines which room types have special prompts and maps topologies to prompt indices
 */
export interface RoomTypePromptConfig {
  roomType: RoomType;
  startIndex: number; // Starting index in ARCHETYPE_PROMPTS array
  topologies: {
    deadEnd?: number;      // Index for dead end topology (no exits ahead/left/right)
    straight?: number;     // Index for straight topology (exit ahead only)
    rightTurn?: number;    // Index for right turn topology (exit to right only)
    leftTurn?: number;     // Index for left turn topology (exit to left only)
  };
}

/**
 * Configuration for room types with special prompts
 * Add new room types here by:
 * 1. Adding prompts to ARCHETYPE_PROMPTS array
 * 2. Adding corresponding entries to PROMPT_ARCHETYPE_NAMES
 * 3. Adding a config entry here
 */
export const ROOM_TYPE_PROMPT_CONFIGS: RoomTypePromptConfig[] = [
  {
    roomType: 'MERCHANT',
    startIndex: 8,
    topologies: {
      deadEnd: 8,      // MERCHANT: S + Dead End
      straight: 9,     // MERCHANT: N + Straight
      rightTurn: 10,   // MERCHANT: E + Right Turn
      leftTurn: 11,    // MERCHANT: W + Right Turn
    }
  },
  // Future room types can be added here:
  // {
  //   roomType: 'TREASURE',
  //   startIndex: 12,
  //   topologies: {
  //     deadEnd: 12,
  //     straight: 13,
  //     rightTurn: 14,
  //     leftTurn: 15,
  //   }
  // },
  // {
  //   roomType: 'BOSS',
  //   startIndex: 16,
  //   topologies: {
  //     deadEnd: 16,    // Only dead end for boss rooms
  //   }
  // },
];

/**
 * Maps room type topology to room type-specific prompt indices
 * Uses ROOM_TYPE_PROMPT_CONFIGS to determine which prompts to use
 * @param roomType - The type of room (MERCHANT, TREASURE, BOSS, etc.)
 * @param hasLeft - Whether there is an exit to the left (relative to player's facing direction)
 * @param hasAhead - Whether there is an exit ahead (relative to player's facing direction)
 * @param hasRight - Whether there is an exit to the right (relative to player's facing direction)
 * @returns The room type-specific prompt index, or null if room type not configured or topology doesn't match
 */
export function getRoomTypePromptIndex(
  roomType: RoomType,
  hasLeft: boolean,
  hasAhead: boolean,
  hasRight: boolean
): number | null {
  // Find configuration for this room type
  const config = ROOM_TYPE_PROMPT_CONFIGS.find(c => c.roomType === roomType);
  
  if (!config) {
    // Room type not configured for special prompts
    return null;
  }
  
  // Determine topology pattern
  // Dead End: no exits ahead/left/right
  if (!hasLeft && !hasAhead && !hasRight) {
    return config.topologies.deadEnd ?? null;
  }
  
  // Straight: exit ahead only
  if (!hasLeft && hasAhead && !hasRight) {
    return config.topologies.straight ?? null;
  }
  
  // Right Turn: exit to right only
  if (!hasLeft && !hasAhead && hasRight) {
    return config.topologies.rightTurn ?? null;
  }
  
  // Left Turn: exit to left only
  if (hasLeft && !hasAhead && !hasRight) {
    return config.topologies.leftTurn ?? null;
  }
  
  // Complex topology (multiple exits) - not supported by room type prompts
  // This allows fallback to standard prompts for complex room configurations
  return null;
}

/**
 * @deprecated Use getRoomTypePromptIndex instead
 * Kept for backward compatibility
 */
export function getMerchantPromptIndex(
  hasLeft: boolean,
  hasAhead: boolean,
  hasRight: boolean
): number | null {
  return getRoomTypePromptIndex('MERCHANT', hasLeft, hasAhead, hasRight);
}
