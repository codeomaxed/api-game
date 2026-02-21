import { DungeonNode, Exits } from './types';

/**
 * Builds a spatial context description for a room
 */
export function buildSpatialContext(
  exits: Exits,
  isDeadEnd: boolean
): string {
  const availableDirections: string[] = [];
  if (exits.north) availableDirections.push('North');
  if (exits.south) availableDirections.push('South');
  if (exits.east) availableDirections.push('East');
  if (exits.west) availableDirections.push('West');

  if (isDeadEnd && availableDirections.length === 1) {
    return `A dead end with no way forward except back the way you came (${availableDirections[0]}).`;
  }

  if (availableDirections.length === 0) {
    return 'A sealed room with no visible exits.';
  }

  if (availableDirections.length === 1) {
    return `A corridor with a single path leading ${availableDirections[0]}.`;
  }

  if (availableDirections.length === 2) {
    if (exits.north && exits.south) {
      return 'A north-south corridor.';
    }
    if (exits.east && exits.west) {
      return 'An east-west corridor.';
    }
    return `A T-junction with paths to ${availableDirections.join(' and ')}.`;
  }

  if (availableDirections.length === 3) {
    return `A three-way intersection with paths to ${availableDirections.join(', ')}.`;
  }

  return `A four-way intersection with paths in all directions: ${availableDirections.join(', ')}.`;
}

/**
 * Constructs a room prompt for AI narrative generation with immersive movement choices
 */
export function constructRoomPrompt(
  node: DungeonNode,
  allNodes: Map<string, DungeonNode>
): string {
  const exits = getExits(node.id, allNodes);
  const isDeadEnd = node.connections.size === 1;
  const spatialContext = buildSpatialContext(exits, isDeadEnd);

  const roomTypeDescriptions: Record<string, string> = {
    START: 'the dungeon entrance',
    BOSS: 'the boss chamber',
    NORMAL: 'a normal room',
    TREASURE: 'a treasure room',
    EVENT: 'an event room',
    MERCHANT: 'a merchant room',
    DEAD_END: 'a dead end room',
    COMBAT: 'a combat encounter room',
  };

  const roomTypeDesc = roomTypeDescriptions[node.type] || 'a room';

  let prompt = `You are the Dungeon Master. The player has entered ${roomTypeDesc}.\n\n`;
  prompt += `Room Type: ${node.type}\n`;
  prompt += `Layout: ${spatialContext}\n\n`;

  // Add exit descriptions
  const exitDescriptions: string[] = [];
  if (exits.north) exitDescriptions.push('North');
  if (exits.south) exitDescriptions.push('South');
  if (exits.east) exitDescriptions.push('East');
  if (exits.west) exitDescriptions.push('West');

  if (exitDescriptions.length > 0) {
    prompt += `Available Exits: ${exitDescriptions.join(', ')}\n\n`;
  }

  // Room-specific context
  if (node.type === 'MERCHANT') {
    prompt +=
      'This is a merchant room. Describe the vendor and their wares. The merchant hides in the shadows.\n';
  } else if (node.type === 'TREASURE') {
    prompt +=
      'This is a treasure room. Describe the chest or loot container. Loot is scarce in this dungeon.\n';
  } else if (node.type === 'BOSS') {
    prompt +=
      'This is the boss chamber. Describe the menacing presence and the final confrontation ahead.\n';
  } else if (node.type === 'COMBAT') {
    prompt +=
      'This is a combat encounter room. A hostile creature or enemy is present here. Describe the monster and the immediate threat. The atmosphere should be tense and dangerous.\n';
  } else if (node.type === 'EVENT') {
    prompt +=
      'This is an event room. Something unusual or significant happens here.\n';
  } else if (node.type === 'DEAD_END') {
    prompt +=
      'This is a dead end. The room is empty or contains only minor details. No treasure or significant encounters here.\n';
  }

  prompt +=
    '\nAtmosphere: Dark, Gritty, Bloodborne-style. Describe the scene vividly. ';
  prompt +=
    'If it is a Merchant, describe the vendor. If it is Loot, describe the chest.\n\n';
  
  // CRITICAL: Request immersive movement choices
  // Vertical orientation: North = Up = Forward/Progress, South = Down = Back/Retreat
  prompt += 'IMPORTANT: You must generate movement choices as immersive narrative text. ';
  prompt += 'For each available exit, create a descriptive choice that makes the player want to explore.\n\n';
  prompt += 'Direction Semantics (Vertical Orientation):\n';
  prompt += '- North (Up): Forward progression, deeper into the dungeon, upward movement. Examples: "Ascend the spiraling ramp into the shrouded darkness to the North", "Walk towards the faint light in the North"\n';
  prompt += '- South (Down): Retreat, going back, downward movement. Examples: "Retrace your steps to the South", "Descend back the way you came"\n';
  prompt += '- East/West: Lateral exploration, side passages. Examples: "Open the heavy iron door to the East", "Investigate the shadowy passage to the West"\n\n';
  prompt += 'Each choice must include a "direction" field in the metadata: "north", "south", "east", or "west". ';
  prompt += 'The choices should be evocative and match the dark fantasy atmosphere.';
  prompt += 'Do NOT use generic descriptions like "Go North" or "Move East". ';
  prompt += 'Instead, describe what the player sees or feels that draws them in that direction.';

  return prompt;
}

/**
 * Generates movement choices metadata for AI response parsing
 */
export function generateMovementChoicesMetadata(exits: Exits): Array<{
  direction: 'north' | 'south' | 'east' | 'west';
  id: string;
}> {
  const choices: Array<{ direction: 'north' | 'south' | 'east' | 'west'; id: string }> = [];
  
  if (exits.north) choices.push({ direction: 'north', id: 'move-north' });
  if (exits.south) choices.push({ direction: 'south', id: 'move-south' });
  if (exits.east) choices.push({ direction: 'east', id: 'move-east' });
  if (exits.west) choices.push({ direction: 'west', id: 'move-west' });
  
  return choices;
}

// Helper function to get exits (re-exported from generator for convenience)
function getExits(
  nodeId: string,
  allNodes: Map<string, DungeonNode>
): Exits {
  const node = allNodes.get(nodeId);
  if (!node) {
    return { north: false, south: false, east: false, west: false };
  }

  const exits: Exits = {
    north: false,
    south: false,
    east: false,
    west: false,
  };

  node.connections.forEach((connection, targetId) => {
    const connected = allNodes.get(targetId);
    if (!connected) return;

    const dx = connected.x - node.x;
    const dy = connected.y - node.y;

    if (dx === 0 && dy === -1) exits.north = true;
    if (dx === 0 && dy === 1) exits.south = true;
    if (dx === 1 && dy === 0) exits.east = true;
    if (dx === -1 && dy === 0) exits.west = true;
  });

  return exits;
}
