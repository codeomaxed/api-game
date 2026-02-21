import { DungeonNode, Exits, ConnectionType, PromptPattern } from './types';
import { generateImage } from '@/lib/ai/images';
import { generateImageWithSegmentation } from '@/lib/ai/comfyui-images';
import { Monster } from '@/lib/game/monsters';
import { 
  determineVisualConfiguration, 
  getConnectionTypeForRelativeDirection,
  VisualConfiguration,
  AbsoluteDirection,
  getRelativeView
} from './geometry';
import { getStrictPrompt, getRelativeExits, getPromptByIndex, PROMPT_ARCHETYPE_NAMES } from './prompt-logic';

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


// Small creature IDs - creatures that should appear tiny and far away
const SMALL_CREATURE_IDS = new Set([
  'slime', // Gelatinous Slime
  // Future small creatures: 'rat', 'spider', 'bug', etc.
]);

/**
 * Maps ConnectionType to descriptive visual strings for prompts
 */
function getConnectionTypeDescription(connectionType: ConnectionType): string {
  const descriptions: Record<ConnectionType, string> = {
    'arched_stone': 'arched stone passageway',
    'heavy_door': 'heavy wooden door',
    'iron_bars': 'iron-barred gate',
    'collapsed_hole': 'collapsed hole in the wall',
    'grand_double_doors': 'grand double doors',
  };
  return descriptions[connectionType];
}

/**
 * Get detailed wall texture description to prevent AI from inventing doors
 * By providing interesting texture details, the AI has something to render instead of adding doors
 * @param position - Position of the wall ('left', 'right', 'center', 'ahead')
 * @returns Detailed texture description string
 */
function getWallTextureDescription(position: 'left' | 'right' | 'center' | 'ahead'): string {
  const textures = [
    'a claustrophobic, textured wall of mossy, cracked grey slate',
    'a continuous, unbroken surface of damp, rough-hewn stone',
    'a solid, dead-end surface of damp stone with NO openings',
    'an unbroken masonry wall of weathered, dark grey stone',
    'a solid stone surface with no visible passages or doors',
  ];
  return textures[Math.floor(Math.random() * textures.length)];
}

type Direction = 'NORTH' | 'SOUTH' | 'EAST' | 'WEST';
type RelativeDir = 'left' | 'right' | 'ahead' | 'behind';

/**
 * PERSPECTIVE_MAP: Maps facing direction to relative positions
 * Key = Direction Player is FACING (derived from entry direction)
 * Value = Map of absolute directions to relative positions
 */
const PERSPECTIVE_MAP: Record<Direction, Record<Direction, RelativeDir>> = {
  // Player facing NORTH: West=Left, East=Right, North=Ahead, South=Behind
  NORTH: { WEST: 'left', EAST: 'right', NORTH: 'ahead', SOUTH: 'behind' },
  // Player facing EAST: North=Left, South=Right, East=Ahead, West=Behind
  EAST:  { NORTH: 'left', SOUTH: 'right', EAST: 'ahead', WEST: 'behind' },
  // Player facing SOUTH: East=Left, West=Right, South=Ahead, North=Behind
  SOUTH: { EAST: 'left', WEST: 'right', SOUTH: 'ahead', NORTH: 'behind' },
  // Player facing WEST: South=Left, North=Right, West=Ahead, East=Behind
  WEST:  { SOUTH: 'left', NORTH: 'right', WEST: 'ahead', EAST: 'behind' },
};

/**
 * Get the direction the player is facing based on entry direction
 * Player faces the OPPOSITE of the direction they entered from
 * @param entryDirection - Direction player entered from (null = start room, assume facing NORTH)
 * @returns Direction player is facing
 */
function getFacingDirection(entryDirection: 'north' | 'south' | 'east' | 'west' | null): Direction {
  if (!entryDirection) {
    return 'NORTH'; // Default: start room faces north
  }
  
  // Player faces opposite of entry direction
  const facingMap: Record<string, Direction> = {
    'north': 'SOUTH', // Entered from north, facing south
    'south': 'NORTH', // Entered from south, facing north
    'east': 'WEST',   // Entered from east, facing west
    'west': 'EAST',   // Entered from west, facing east
  };
  
  return facingMap[entryDirection] || 'NORTH';
}

/**
 * Get relative perspective position based on entry direction
 * Maps absolute directions to relative positions (ahead, left, right, behind)
 * @param entryDirection - Direction player entered from ('north', 'south', 'east', 'west', or null)
 * @param targetDirection - Absolute direction of the exit ('north', 'south', 'east', 'west')
 * @returns Relative position string ('ahead', 'left', 'right', 'behind')
 */
export function getRelativePerspective(
  entryDirection: 'north' | 'south' | 'east' | 'west' | null,
  targetDirection: 'north' | 'south' | 'east' | 'west'
): RelativeDir {
  const facing = getFacingDirection(entryDirection);
  const targetDir = targetDirection.toUpperCase() as Direction;
  
  return PERSPECTIVE_MAP[facing][targetDir] || 'ahead';
}

/**
 * Convert relative direction to descriptive string for prompts
 * @param relativeDir - Relative direction ('left', 'right', 'ahead', 'behind')
 * @returns Descriptive string for prompts
 */
export function getRelativeDescription(relativeDir: RelativeDir): string {
  const descriptions: Record<RelativeDir, string> = {
    'left': 'To your left',
    'right': 'To your right',
    'ahead': 'Directly ahead',
    'behind': 'Behind you',
  };
  return descriptions[relativeDir] || 'Directly ahead';
}

/**
 * Classify creature size for camera framing
 * @param monster - The monster to classify, or null if no monster
 * @returns 'small' for tiny creatures, 'standard' for normal/large creatures, 'none' if no monster
 */
function getCreatureSize(monster: Monster | null): 'small' | 'standard' | 'none' {
  if (!monster) {
    return 'none';
  }
  
  // Check if monster ID is in the small creatures set
  if (SMALL_CREATURE_IDS.has(monster.id)) {
    return 'small';
  }
  
  // All other monsters are standard/large
  return 'standard';
}

/**
 * @deprecated This function is no longer used. Camera framing is now determined by geometry archetype in buildRoomPrompt.
 * Get camera framing template based on creature size
 * @param monster - The monster, or null if no monster
 * @param roomType - Description of the room type (e.g., "dungeon entrance", "boss chamber")
 * @param exits - Array of exit descriptions
 * @returns Camera framing template string
 */
function getCameraFramingTemplate(
  monster: Monster | null,
  roomType: string,
  exits: string[]
): string {
  const creatureSize = getCreatureSize(monster);
  
  // CASE A: Small Creatures
  if (creatureSize === 'small' && monster) {
    return `A wide cinematic shot from a slightly elevated standing perspective, looking down the length of a long dark dungeon corridor. Positioned far down the hallway, well into the distance on the wet stone floor, sits a ${monster.name}. The ${monster.name} appears tiny and far away relative to the vast corridor.`;
  }
  
  // CASE B: Standard/Large Creatures
  // Force "Long Shot" perspective to prevent monsters from appearing too close/cropped
  if (creatureSize === 'standard' && monster) {
    return `A wide cinematic environmental shot looking down a long dark dungeon corridor. Standing deep in the hallway, positioned far back with a large stretch of wet stone floor in the foreground, is a ${monster.name}. The ${monster.name} is fully visible from head to toe, appearing significantly smaller than the surrounding walls.`;
  }
  
  // CASE C: No Monster
  return `A wide environmental shot of a dark dungeon ${roomType}. The room's floor and walls are visible.`;
}

/**
 * Exit information for perspective-based prompting
 */
export interface ExitInfo {
  direction: 'north' | 'south' | 'east' | 'west';
  visualType: ConnectionType;
  relativePosition: string;
}

/**
 * Build visual context string (text-only room layout description)
 * This is shared between image generator and narrative API to ensure consistency
 * Returns a plain text description of the room layout without camera/art style
 */
export function buildVisualContextString(
  exits: ExitInfo[],
  entryDirection?: 'north' | 'south' | 'east' | 'west' | null,
  entryConnectionType?: ConnectionType | null
): string {
  // Create a map of relative directions to their descriptions
  const exitMap = new Map<RelativeDir, { description: string }>();
  
  // Map exits to their relative positions
  exits.forEach(exit => {
    const relDir = getRelativePerspective(entryDirection || null, exit.direction);
    exitMap.set(relDir, {
      description: `${getRelativeDescription(relDir)} is a ${getConnectionTypeDescription(exit.visualType)}`,
    });
  });
  
  // Add entry door to "behind" if we entered from somewhere
  if (entryDirection && entryConnectionType) {
    const behindRelDir = getRelativePerspective(entryDirection, entryDirection);
    exitMap.set(behindRelDir, {
      description: `${getRelativeDescription(behindRelDir)} is the ${getConnectionTypeDescription(entryConnectionType)} you just entered through`,
    });
  }
  
  // Build descriptions for all 4 relative directions
  const allRelativeDirs: RelativeDir[] = ['left', 'right', 'ahead', 'behind'];
  const descriptions: string[] = [];
  
  allRelativeDirs.forEach(relDir => {
    if (exitMap.has(relDir)) {
      // Exit exists - describe it
      descriptions.push(exitMap.get(relDir)!.description);
    } else {
      // No exit - explicitly describe solid wall
      const relDesc = getRelativeDescription(relDir);
      descriptions.push(`The wall ${relDesc.toLowerCase()} is solid, unbroken damp stone with no openings`);
    }
  });
  
  return descriptions.join('. ') + '.';
}


/**
 * Build room prompt using strict archetype system
 * Returns the exact immutable prompt from prompt-logic.ts based on relative exits
 * @param hasLeft - Whether there is an exit to the left (relative to player's facing direction)
 * @param hasAhead - Whether there is an exit ahead (relative to player's facing direction)
 * @param hasRight - Whether there is an exit to the right (relative to player's facing direction)
 * @returns Object with prompt (exact archetype string) and empty negativePrompt
 */
export function buildRoomPrompt(
  hasLeft: boolean,
  hasAhead: boolean,
  hasRight: boolean
): { prompt: string; negativePrompt: string } {
  // Get the exact immutable prompt based on relative exits
  const prompt = getStrictPrompt(hasLeft, hasAhead, hasRight);

  // Return prompt unchanged - no negative prompt needed
  return {
    prompt,
    negativePrompt: '',
  };
}

/**
 * Generates an image prompt for a dungeon room based on node type and exits
 * Uses geometry-first prompt structure to prevent monster from warping room layout
 * Checks for pattern matches before using automatic calculation
 */
export async function generateRoomImage(
  node: DungeonNode,
  allNodes: any, // Accepts Map, Object, or Array
  entryDirection: 'north' | 'south' | 'east' | 'west' | null,
  apiKey?: string,
  monster?: Monster | null,
  getPatternForNode?: (nodeId: string) => PromptPattern | null, // Optional pattern getter
  getMonsterPrompt?: (topologyIndex: number, monsterId: string) => string | null // Optional function to get custom monster prompt from pool
): Promise<string | null> {
  let prompt: string;
  let negativePrompt: string = '';

  // Check for pattern match first
  if (getPatternForNode) {
    const pattern = getPatternForNode(node.id);
    if (pattern) {
      // Calculate what the prompt index would be based on current entry direction
      const simpleExits: Exits = {
        north: node.connections?.has(`${node.x},${node.y - 1}`) ?? false,
        south: node.connections?.has(`${node.x},${node.y + 1}`) ?? false,
        east: node.connections?.has(`${node.x + 1},${node.y}`) ?? false,
        west: node.connections?.has(`${node.x - 1},${node.y}`) ?? false,
      };
      const { hasLeft, hasAhead, hasRight } = getRelativeExits(node, allNodes, entryDirection, simpleExits);
      const calculatedIndex = (hasLeft ? 4 : 0) + (hasAhead ? 2 : 0) + (hasRight ? 1 : 0);
      
      console.log(`[ImageGen] ✓ Pattern match found for Node ${node.id}`);
      console.log(`[ImageGen]   Pattern index: ${pattern.promptIndex} (${PROMPT_ARCHETYPE_NAMES[pattern.promptIndex]})`);
      console.log(`[ImageGen]   Entry direction: ${entryDirection || 'null (start room)'}`);
      console.log(`[ImageGen]   Relative exits: L:${hasLeft} A:${hasAhead} R:${hasRight} -> Calculated index: ${calculatedIndex}`);
      
      if (calculatedIndex !== pattern.promptIndex) {
        console.warn(`[ImageGen] ⚠ WARNING: Pattern index (${pattern.promptIndex}) differs from calculated index (${calculatedIndex})`);
        console.warn(`[ImageGen]   Using pattern's assigned index (${pattern.promptIndex}) as user's explicit choice.`);
      }
      
      // Use pattern's prompt directly (user's explicit choice overrides auto-calculation)
      prompt = getPromptByIndex(pattern.promptIndex);
      console.log(`[ImageGen]   Using prompt archetype: ${PROMPT_ARCHETYPE_NAMES[pattern.promptIndex]}`);
    } else {
      // No pattern match, use automatic calculation
      const simpleExits: Exits = {
        north: node.connections?.has(`${node.x},${node.y - 1}`) ?? false,
        south: node.connections?.has(`${node.x},${node.y + 1}`) ?? false,
        east: node.connections?.has(`${node.x + 1},${node.y}`) ?? false,
        west: node.connections?.has(`${node.x - 1},${node.y}`) ?? false,
      };

      // Pass these explicit exits to prompt logic
      const { hasLeft, hasAhead, hasRight } = getRelativeExits(node, allNodes, entryDirection, simpleExits);
      const calculatedIndex = (hasLeft ? 4 : 0) + (hasAhead ? 2 : 0) + (hasRight ? 1 : 0);

      // Get Prompt
      const result = buildRoomPrompt(hasLeft, hasAhead, hasRight);
      prompt = result.prompt;
      negativePrompt = result.negativePrompt;
      console.log(`[ImageGen] No pattern match for Node ${node.id} - using auto-calculation`);
      console.log(`[ImageGen]   Entry direction: ${entryDirection || 'null (start room)'}`);
      console.log(`[ImageGen]   Relative exits: L:${hasLeft} A:${hasAhead} R:${hasRight} -> Index: ${calculatedIndex} (${PROMPT_ARCHETYPE_NAMES[calculatedIndex]})`);
    }
  } else {
    // No pattern getter provided, use automatic calculation
    const simpleExits: Exits = {
      north: node.connections?.has(`${node.x},${node.y - 1}`) ?? false,
      south: node.connections?.has(`${node.x},${node.y + 1}`) ?? false,
      east: node.connections?.has(`${node.x + 1},${node.y}`) ?? false,
      west: node.connections?.has(`${node.x - 1},${node.y}`) ?? false,
    };

    // Pass these explicit exits to prompt logic
    const { hasLeft, hasAhead, hasRight } = getRelativeExits(node, allNodes, entryDirection, simpleExits);
    const calculatedIndex = (hasLeft ? 4 : 0) + (hasAhead ? 2 : 0) + (hasRight ? 1 : 0);

    // Get Prompt
    const result = buildRoomPrompt(hasLeft, hasAhead, hasRight);
    prompt = result.prompt;
    negativePrompt = result.negativePrompt;
    console.log(`[ImageGen] No pattern getter provided for Node ${node.id} - using auto-calculation`);
    console.log(`[ImageGen]   Entry direction: ${entryDirection || 'null (start room)'}`);
    console.log(`[ImageGen]   Relative exits: L:${hasLeft} A:${hasAhead} R:${hasRight} -> Index: ${calculatedIndex} (${PROMPT_ARCHETYPE_NAMES[calculatedIndex]})`);
  }

  // Inject monster description into prompt ONLY if custom prompt exists
  // If no custom prompt is set, don't inject any monster description
  let useCustomDimensions = false; // Track if we should use custom dimensions
  if (monster && getMonsterPrompt) {
    // Calculate topology index to get the right pool
    const simpleExits: Exits = {
      north: node.connections?.has(`${node.x},${node.y - 1}`) ?? false,
      south: node.connections?.has(`${node.x},${node.y + 1}`) ?? false,
      east: node.connections?.has(`${node.x + 1},${node.y}`) ?? false,
      west: node.connections?.has(`${node.x - 1},${node.y}`) ?? false,
    };
    const { hasLeft, hasAhead, hasRight } = getRelativeExits(node, allNodes, entryDirection, simpleExits);
    const topologyIndex = (hasLeft ? 4 : 0) + (hasAhead ? 2 : 0) + (hasRight ? 1 : 0);
    
    // Pass entry direction to get entry-direction-specific prompt
    const customPrompt = getMonsterPrompt(topologyIndex, monster.id, entryDirection || null);
    if (customPrompt !== null && customPrompt.trim() !== '') {
      // Check if custom prompt is a complete prompt (contains room structure)
      const isCompletePrompt = customPrompt.includes('Grimdark fantasy masterpiece') || 
                                customPrompt.includes('dungeon corner') ||
                                customPrompt.includes('stone wall') ||
                                customPrompt.includes('dungeon chamber') ||
                                customPrompt.includes('dungeon junction') ||
                                customPrompt.length > 200; // Heuristic: long prompts are likely complete
      
      if (isCompletePrompt) {
        // Replace base prompt entirely with custom prompt
        prompt = customPrompt.trim();
        useCustomDimensions = true; // Use custom dimensions for complete prompts
        console.log(`[ImageGen] Using complete custom prompt for ${monster.name} in topology ${topologyIndex} (entry: ${entryDirection || 'null'})`);
        console.log(`[ImageGen] Will use custom dimensions: 1216x832 with 3 steps`);
      } else {
        // Append as monster description (short prompt)
        prompt = prompt.trim();
        const monsterText = ` STANDING IN THE CENTER of the room is ${customPrompt}. It looks hostile.`;
        prompt = prompt + monsterText;
        console.log(`[ImageGen] Injected custom monster description for ${monster.name} in topology ${topologyIndex} (entry: ${entryDirection || 'null'})`);
      }
    } else {
      console.log(`[ImageGen] No custom prompt set for ${monster.name} in topology ${topologyIndex} (entry: ${entryDirection || 'null'}) - not injecting monster description`);
    }
  }

  // For combat rooms, use segmentation-enabled generation
  const isCombatRoom = node.type === 'COMBAT';
  
  if (isCombatRoom) {
    console.log('[ImageGen] Combat room detected - generating with automatic segmentation');
    
    // Use custom dimensions if complete prompt was detected
    const customWidth = useCustomDimensions ? 1216 : undefined;
    const customHeight = useCustomDimensions ? 832 : undefined;
    const customSteps = useCustomDimensions ? 3 : undefined;
    
    const result = await generateImageWithSegmentation(
      prompt,
      true, // isCombatRoom
      useCustomDimensions ? undefined : 'square', // Don't force aspect ratio if using custom dimensions
      customWidth,
      customHeight,
      customSteps // Pass steps if available
    );
    
    if (result) {
      // Use backgroundUrl (node #83) if available, otherwise fallback to imageUrl (node #9)
      // This ensures the background doesn't show the monster, allowing death animation to work properly
      const finalImageUrl = result.backgroundUrl || result.imageUrl;
      if (result.backgroundUrl) {
        console.log('[ImageGen] ✓ Using background image from node #83 (monster removed)');
      } else {
        console.log('[ImageGen] Using fallback image from node #9');
      }
      // Store both original and segmented URLs in node content
      // Note: The segmentedUrl will be saved to room content in generateRoomContent
      return finalImageUrl;
    }
    
    // Fallback to regular generation if segmentation fails
    console.warn('[ImageGen] Segmentation generation failed, falling back to regular generation');
  }
  
  // Regular image generation (non-combat rooms or fallback)
  // Use custom dimensions if complete prompt was detected
  if (useCustomDimensions) {
    return generateImage({
      prompt,
      negativePrompt,
      width: 1216,
      height: 832,
      numSteps: 3,
    });
  } else {
    return generateImage(
      {
        prompt,
        negativePrompt,
        aspectRatio: 'square',
        size: '1024',
      }
    );
  }
}
