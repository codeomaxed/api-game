import { DungeonNode, Exits } from './types';

export type AbsoluteDirection = 'north' | 'south' | 'east' | 'west';
export type RelativeDirection = 'left' | 'right' | 'ahead' | 'behind';

/**
 * Visual configuration keys for the 8 room archetypes
 */
export type VisualConfiguration = 
  | 'DEAD_END'      // 000 - No visible exits
  | 'STRAIGHT_PATH' // 010 - Ahead only
  | 'RIGHT_TURN'    // 001 - Right only (corner)
  | 'LEFT_TURN'     // 100 - Left only (corner)
  | 'T_JUNCTION'    // 101 - Left & Right (wall ahead)
  | 'LEFT_BRANCH'   // 110 - Ahead & Left
  | 'RIGHT_BRANCH'  // 011 - Ahead & Right
  | 'CROSSROADS';   // 111 - All directions

/**
 * Calculate entry direction by comparing currentNode and previousNode coordinates
 * @param currentNode - The current room node
 * @param previousNode - The previous room node (where player came from)
 * @returns Entry direction or null if no previous node (start room)
 */
export function calculateEntryDirection(
  currentNode: DungeonNode,
  previousNode: DungeonNode | null
): AbsoluteDirection | null {
  if (!previousNode) {
    return null; // Start room has no entry direction
  }

  const dx = currentNode.x - previousNode.x;
  const dy = currentNode.y - previousNode.y;

  // Determine direction based on coordinate difference
  if (dx === 0 && dy === -1) return 'north';  // Previous is south of current
  if (dx === 0 && dy === 1) return 'south';    // Previous is north of current
  if (dx === 1 && dy === 0) return 'east';    // Previous is west of current
  if (dx === -1 && dy === 0) return 'west';   // Previous is east of current

  return null; // Invalid connection
}

/**
 * Map absolute directions to relative positions based on entry direction
 * When player enters from a direction, they face the opposite direction
 * 
 * @param entryDirection - Direction player entered from
 * @param absoluteDirection - Absolute direction to map
 * @returns Relative position (left, right, ahead, behind)
 */
export function getRelativeView(
  entryDirection: AbsoluteDirection | null,
  absoluteDirection: AbsoluteDirection
): RelativeDirection {
  // If no entry direction (start room), default to facing north
  const facingDirection = entryDirection 
    ? getOppositeDirection(entryDirection)
    : 'north';

  // Perspective mapping: based on what direction player is facing
  const perspectiveMap: Record<AbsoluteDirection, Record<AbsoluteDirection, RelativeDirection>> = {
    // Facing NORTH: West=Left, East=Right, North=Ahead, South=Behind
    north: {
      west: 'left',
      east: 'right',
      north: 'ahead',
      south: 'behind',
    },
    // Facing EAST: North=Left, South=Right, East=Ahead, West=Behind
    east: {
      north: 'left',
      south: 'right',
      east: 'ahead',
      west: 'behind',
    },
    // Facing SOUTH: East=Left, West=Right, South=Ahead, North=Behind
    south: {
      east: 'left',
      west: 'right',
      south: 'ahead',
      north: 'behind',
    },
    // Facing WEST: South=Left, North=Right, West=Ahead, East=Behind
    west: {
      south: 'left',
      north: 'right',
      west: 'ahead',
      east: 'behind',
    },
  };

  return perspectiveMap[facingDirection][absoluteDirection] || 'ahead';
}

/**
 * Get the opposite direction
 */
function getOppositeDirection(direction: AbsoluteDirection): AbsoluteDirection {
  const opposites: Record<AbsoluteDirection, AbsoluteDirection> = {
    north: 'south',
    south: 'north',
    east: 'west',
    west: 'east',
  };
  return opposites[direction];
}

/**
 * Determine which visual configuration template to use based on exits and entry direction
 * @param exits - Exits object indicating which directions have connections
 * @param entryDirection - Direction player entered from (null for start room)
 * @param currentNode - Current node to check connections
 * @returns Visual configuration key
 */
export function determineVisualConfiguration(
  exits: Exits,
  entryDirection: AbsoluteDirection | null,
  currentNode: DungeonNode
): VisualConfiguration {
  // Map exits to relative positions
  const relativeExits = {
    left: false,
    right: false,
    ahead: false,
    behind: false, // Entry direction (always exists if not start room)
  };

  // Check each absolute direction and map to relative
  if (exits.north) {
    const rel = getRelativeView(entryDirection, 'north');
    if (rel !== 'behind') relativeExits[rel] = true;
  }
  if (exits.south) {
    const rel = getRelativeView(entryDirection, 'south');
    if (rel !== 'behind') relativeExits[rel] = true;
  }
  if (exits.east) {
    const rel = getRelativeView(entryDirection, 'east');
    if (rel !== 'behind') relativeExits[rel] = true;
  }
  if (exits.west) {
    const rel = getRelativeView(entryDirection, 'west');
    if (rel !== 'behind') relativeExits[rel] = true;
  }

  // Determine template based on which relative directions have exits
  // Format: [left][ahead][right] as binary
  const left = relativeExits.left ? 1 : 0;
  const ahead = relativeExits.ahead ? 1 : 0;
  const right = relativeExits.right ? 1 : 0;
  const config = (left << 2) | (ahead << 1) | right;

  switch (config) {
    case 0b000: return 'DEAD_END';      // 000 - No visible exits
    case 0b010: return 'STRAIGHT_PATH'; // 010 - Ahead only
    case 0b001: return 'RIGHT_TURN';     // 001 - Right only
    case 0b100: return 'LEFT_TURN';     // 100 - Left only
    case 0b101: return 'T_JUNCTION';    // 101 - Left & Right
    case 0b110: return 'LEFT_BRANCH';   // 110 - Ahead & Left
    case 0b011: return 'RIGHT_BRANCH';  // 011 - Ahead & Right
    case 0b111: return 'CROSSROADS';   // 111 - All directions
    default: return 'DEAD_END'; // Fallback
  }
}

/**
 * Get connection type for a specific relative direction
 * @param currentNode - Current node
 * @param relativeDirection - Relative direction (left, right, ahead)
 * @param entryDirection - Entry direction for perspective mapping
 * @returns Connection type or null if no exit in that direction
 */
export function getConnectionTypeForRelativeDirection(
  currentNode: DungeonNode,
  relativeDirection: 'left' | 'right' | 'ahead',
  entryDirection: AbsoluteDirection | null
): { type: string; absoluteDirection: AbsoluteDirection } | null {
  // Map relative direction back to absolute directions
  const facingDirection = entryDirection 
    ? getOppositeDirection(entryDirection)
    : 'north';

  // Reverse perspective mapping to find which absolute directions map to this relative direction
  const absoluteDirections: AbsoluteDirection[] = [];
  
  // Check all 4 absolute directions
  const allDirections: AbsoluteDirection[] = ['north', 'south', 'east', 'west'];
  for (const absDir of allDirections) {
    const rel = getRelativeView(entryDirection, absDir);
    if (rel === relativeDirection) {
      absoluteDirections.push(absDir);
    }
  }

  // Find the first absolute direction that has a connection
  for (const absDir of absoluteDirections) {
    let targetId: string;
    if (absDir === 'north') {
      targetId = `${currentNode.x},${currentNode.y - 1}`;
    } else if (absDir === 'south') {
      targetId = `${currentNode.x},${currentNode.y + 1}`;
    } else if (absDir === 'east') {
      targetId = `${currentNode.x + 1},${currentNode.y}`;
    } else {
      targetId = `${currentNode.x - 1},${currentNode.y}`;
    }

    const connection = currentNode.connections.get(targetId);
    if (connection) {
      return {
        type: connection.type,
        absoluteDirection: absDir,
      };
    }
  }

  return null;
}

