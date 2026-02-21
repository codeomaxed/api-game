/**
 * Utility to populate ALL monster prompts for Left Branch, Right Branch, and T-Junction topologies
 * This ensures all monsters have prompts for all valid entry directions
 */

import { useDungeonStore } from './store';
import { getAllMonsters, Monster } from '@/lib/game/monsters';

/**
 * Get monster-specific positioning description based on monster type and entry direction
 * - Entry from SOUTH: Monster in center of room, facing south
 * - Entry from other directions: Monster against the solid wall, facing the entry direction
 */
function getMonsterPositioning(monster: Monster, entryDirection: 'north' | 'south' | 'east' | 'west', topology: 'left' | 'right'): string {
  const monsterId = monster.id.toLowerCase();
  const monsterName = monster.name;
  
  // For entry from SOUTH: center positioning (closer, larger monsters) with combat poses
  if (entryDirection === 'south') {
    switch (monsterId) {
      case 'slime':
      case 'gelatinous slime':
        return `Positioned in the middle of the vast floor, facing south towards the camera, a large round ${monsterName} rises up menacingly in an aggressive combat pose, its translucent form tensing and expanding, quivering and pulsing with hostile intent, taking up a significant portion of the frame. The slime is clearly facing south and looking directly south, ready to attack.`;
      
      case 'skeleton':
        return `Positioned in the middle of the vast floor, facing south towards the camera, a full-size ${monsterName} stands in an aggressive combat-ready stance in the middle of the room, arms positioned in a fighting pose by his side, taking up a significant portion of the frame. The skeleton is clearly facing south and looking directly south, its body and head oriented towards the camera, the human-sized figure clearly visible and imposing.`;
      
      case 'animated-armor':
      case 'animated armor':
        return `Positioned in the middle of the vast floor, facing south towards the camera, a full-size ${monsterName} stands in a defensive combat stance in the middle of the room, arms positioned defensively, its empty armor plates catching the torchlight, taking up a significant portion of the frame. The animated armor is clearly facing south and looking directly south, its body and helmet oriented towards the camera, the human-sized figure clearly visible.`;
      
      case 'shadow-stalker':
      case 'shadow stalker':
        return `Positioned in the middle of the vast floor, facing south towards the camera, a full-size ${monsterName} crouches in an aggressive combat pose in the middle of the room, ready to pounce, its shadowy form constantly shifting and writhing with only its burning red eyes remaining constant, taking up a significant portion of the frame. The shadow stalker is clearly facing south and looking directly south, its body and eyes oriented towards the camera, the human-sized figure clearly visible.`;
      
      case 'assassin':
        return `Positioned in the middle of the vast floor, facing south towards the camera, a full-size life-size ${monsterName} crouches in a combat-ready stance in the middle of the room, arms positioned in a fighting pose, taking up a significant portion of the frame. The assassin is clearly facing south and looking directly south, its body and head oriented towards the camera, the human-sized figure clearly visible and imposing, clad in tight, worn leather armor.`;
      
      default:
        const visualDesc = monster.visualDescription.toLowerCase();
        if (visualDesc.includes('ooze') || visualDesc.includes('slime') || visualDesc.includes('pools') || visualDesc.includes('liquid')) {
          return `Positioned in the middle of the vast floor, facing south towards the camera, a large round ${monsterName} rises up menacingly in an aggressive combat pose, its form tensing and expanding, taking up a significant portion of the frame. The monster is clearly facing south and looking directly south, ready to attack.`;
        } else if (visualDesc.includes('shadow') || visualDesc.includes('darkness') || visualDesc.includes('shifts')) {
          return `Positioned in the middle of the vast floor, facing south towards the camera, a full-size ${monsterName} crouches in an aggressive combat pose in the middle of the room, ready to strike, its form constantly shifting, taking up a significant portion of the frame. The monster is clearly facing south and looking directly south, its body oriented towards the camera, the human-sized figure clearly visible and imposing.`;
        } else {
          return `Positioned in the middle of the vast floor, facing south towards the camera, a full-size ${monsterName} stands in a combat-ready stance in the middle of the room, arms positioned in a fighting pose, taking up a significant portion of the frame. The monster is clearly facing south and looking directly south, its body and head oriented towards the camera, the human-sized figure clearly visible and imposing.`;
        }
    }
  }
  
  // For other entry directions: against the solid wall
  // Left Branch: solid wall is RIGHT side
  // Right Branch: solid wall is LEFT side
  const sideText = topology === 'left' ? 'Right' : 'Left';
  const facingDirection = entryDirection.charAt(0).toUpperCase() + entryDirection.slice(1);
  
  switch (monsterId) {
    case 'slime':
    case 'gelatinous slime':
      return `Positioned on the ${sideText} side of the vast floor, a large round ${monsterName} oozes and pools against the solid ${sideText.toLowerCase()} wall (the wall opposite from where the player entered, not near any archway or door), its translucent form quivering and pulsing, facing ${facingDirection.toLowerCase()}. The slime is positioned against the solid ${sideText.toLowerCase()} wall, clearly pooling against the wall surface, away from all archways.`;
    
    case 'skeleton':
      return `Positioned on the ${sideText} side of the vast floor, standing prominently next to the solid ${sideText.toLowerCase()} wall, is a full-size ${monsterName}, facing ${facingDirection.toLowerCase()}, the human-sized figure clearly visible and imposing. The monster is positioned against the solid ${sideText.toLowerCase()} wall, clearly leaning against the wall surface, away from all archways.`;
    
    case 'animated-armor':
    case 'animated armor':
      // Special handling for Left Branch to match user's exact prompt structure
      if (topology === 'left') {
        return `Positioned on the ${sideText} side of the vast floor, standing prominently next to the solid ${sideText.toLowerCase()} wall, is a full-size Animated Armor, facing ${facingDirection.toLowerCase()}, its empty armor plates catching the torchlight, the human-sized figure clearly visible and imposing. The monster is positioned against the solid ${sideText.toLowerCase()} wall, clearly leaning against the wall surface, away from all archways.`;
      } else {
        return `Positioned on the ${sideText} side of the vast floor, standing prominently next to the solid ${sideText.toLowerCase()} wall, is a full-size Animated Armor, facing ${facingDirection.toLowerCase()}, its empty armor plates catching the torchlight, the human-sized figure clearly visible and imposing. The monster is positioned against the solid ${sideText.toLowerCase()} wall, clearly leaning against the wall surface, away from all archways.`;
      }
    
    case 'shadow-stalker':
    case 'shadow stalker':
      return `Positioned on the ${sideText} side of the vast floor, a full-size ${monsterName} shifts and writhes prominently against the solid ${sideText.toLowerCase()} wall, facing ${facingDirection.toLowerCase()}, its shadowy form constantly moving with only its burning red eyes remaining constant, the human-sized figure clearly visible and imposing. The monster is positioned against the solid ${sideText.toLowerCase()} wall, clearly pressed against the wall surface, away from all archways.`;
    
    case 'assassin':
      return `Positioned on the ${sideText} side of the vast floor, standing prominently next to the solid ${sideText.toLowerCase()} wall, is a full-size life-size ${monsterName}, facing ${facingDirection.toLowerCase()}, the human-sized figure clearly visible and imposing, clad in tight, worn leather armor. The monster is positioned against the solid ${sideText.toLowerCase()} wall, clearly leaning against the wall surface, away from all archways.`;
    
    default:
      const visualDesc = monster.visualDescription.toLowerCase();
      if (visualDesc.includes('ooze') || visualDesc.includes('slime') || visualDesc.includes('pools') || visualDesc.includes('liquid')) {
        return `Positioned on the ${sideText} side of the vast floor, a large round ${monsterName} pools and oozes against the solid ${sideText.toLowerCase()} wall (the wall opposite from where the player entered, not near any archway or door), facing ${facingDirection.toLowerCase()}. The monster is positioned against the solid ${sideText.toLowerCase()} wall, clearly pooling against the wall surface, away from all archways.`;
      } else if (visualDesc.includes('shadow') || visualDesc.includes('darkness') || visualDesc.includes('shifts')) {
        return `Positioned on the ${sideText} side of the vast floor, a full-size ${monsterName} shifts and writhes prominently against the solid ${sideText.toLowerCase()} wall, facing ${facingDirection.toLowerCase()}, the human-sized figure clearly visible and imposing. The monster is positioned against the solid ${sideText.toLowerCase()} wall, clearly pressed against the wall surface, away from all archways.`;
      } else {
        return `Positioned on the ${sideText} side of the vast floor, standing prominently next to the solid ${sideText.toLowerCase()} wall, is a full-size ${monsterName}, facing ${facingDirection.toLowerCase()}, the human-sized figure clearly visible and imposing. The monster is positioned against the solid ${sideText.toLowerCase()} wall, clearly leaning against the wall surface, away from all archways.`;
      }
  }
}

/**
 * Generate prompt for a monster in Left Branch (topology 6)
 * Uses the EXACT base topology prompt and subtly adds the monster in the center, facing entry direction
 * Monster positioning is unique based on monster type
 * For south entry: uses closer camera perspective (medium shot)
 */
function generateLeftBranchPrompt(monster: Monster, entryDirection: 'north' | 'south' | 'east' | 'west'): string {
  const positioning = getMonsterPositioning(monster, entryDirection, 'left');
  
  // Use medium shot for all entries (closer camera perspective)
  const cameraDescription = 'A cinematic 16:9 medium shot of a dungeon junction. The camera is positioned closer, looking down the hallway from a mid-range perspective.';
  
  return `Grimdark fantasy masterpiece, heavily inspired by Dark Souls 3. ${cameraDescription} ${positioning} The back wall (center) features a tall, ominous archway leading forward. The right wall is a solid, seamless surface of heavy stone blocks. The wall on the Left Side of the frame features a tall, ominous archway leading into darkness. The floor is a wide expanse of broken wet stone reflecting faint orange torchlight. Heavy vignette, pitch-black shadows, filthy textures, thick fog, claustrophobic, 8k resolution, photorealistic grim concept art. No weapon.`;
}

/**
 * Generate prompt for a monster in Right Branch (topology 3)
 * Uses the EXACT base topology prompt and subtly adds the monster in the center, facing entry direction
 * Monster positioning is unique based on monster type
 * For south entry: uses closer camera perspective (medium shot)
 */
function generateRightBranchPrompt(monster: Monster, entryDirection: 'north' | 'south' | 'east'): string {
  const positioning = getMonsterPositioning(monster, entryDirection, 'right');
  
  // Use medium shot for all entries (closer camera perspective)
  const cameraDescription = 'A cinematic 16:9 medium shot of a dungeon junction. The camera is positioned closer, looking down the hallway from a mid-range perspective.';
  
  return `Grimdark fantasy masterpiece, heavily inspired by Dark Souls 3. ${cameraDescription} ${positioning} The back wall (center) features a tall, ominous archway leading forward. The left wall is a solid, seamless surface of heavy stone blocks. The wall on the Right Side of the frame features a tall, ominous archway leading into darkness. The floor is a wide expanse of broken wet stone reflecting faint orange torchlight. Heavy vignette, pitch-black shadows, filthy textures, thick fog, claustrophobic, 8k resolution, photorealistic grim concept art. No weapon.`;
}

/**
 * Get monster-specific positioning for T-Junction
 * ALWAYS in center, ALWAYS facing south, regardless of entry direction
 * All monsters are in combat-ready poses
 */
function getTJunctionMonsterPositioning(monster: Monster): string {
  const monsterId = monster.id.toLowerCase();
  const monsterName = monster.name;
  
  switch (monsterId) {
    case 'slime':
    case 'gelatinous slime':
      return `Positioned in the middle of the vast floor, facing south towards the camera, a large round ${monsterName} rises up menacingly in an aggressive combat pose, its translucent form tensing and expanding, quivering and pulsing with hostile intent, taking up a significant portion of the frame. The slime is clearly facing south and looking directly south, ready to attack.`;
      
    case 'skeleton':
      return `Positioned in the middle of the vast floor, facing south towards the camera, a full-size ${monsterName} stands in an aggressive combat-ready stance in the middle of the room, arms positioned in a fighting pose by his side, taking up a significant portion of the frame. The skeleton is clearly facing south and looking directly south, its body and head oriented towards the camera, the human-sized figure clearly visible and imposing.`;
      
    case 'animated-armor':
    case 'animated armor':
      return `Positioned in the middle of the vast floor, facing south towards the camera, a full-size ${monsterName} stands in a defensive combat stance in the middle of the room, arms positioned defensively, its empty armor plates catching the torchlight, taking up a significant portion of the frame. The animated armor is clearly facing south and looking directly south, its body and helmet oriented towards the camera, the human-sized figure clearly visible.`;
      
    case 'shadow-stalker':
    case 'shadow stalker':
      return `Positioned in the middle of the vast floor, facing south towards the camera, a full-size ${monsterName} crouches in an aggressive combat pose in the middle of the room, ready to pounce, its shadowy form constantly shifting and writhing with only its burning red eyes remaining constant, taking up a significant portion of the frame. The shadow stalker is clearly facing south and looking directly south, its body and eyes oriented towards the camera, the human-sized figure clearly visible.`;
      
    case 'assassin':
      return `Positioned in the middle of the vast floor, facing south towards the camera, a full-size life-size ${monsterName} crouches in a combat-ready stance in the middle of the room, arms positioned in a fighting pose, taking up a significant portion of the frame. The assassin is clearly facing south and looking directly south, its body and head oriented towards the camera, the human-sized figure clearly visible and imposing, clad in tight, worn leather armor.`;
      
    default:
      const visualDesc = monster.visualDescription.toLowerCase();
      if (visualDesc.includes('ooze') || visualDesc.includes('slime') || visualDesc.includes('pools') || visualDesc.includes('liquid')) {
        return `Positioned in the middle of the vast floor, facing south towards the camera, a large round ${monsterName} rises up menacingly in an aggressive combat pose, its form tensing and expanding, taking up a significant portion of the frame. The monster is clearly facing south and looking directly south, ready to attack.`;
      } else if (visualDesc.includes('shadow') || visualDesc.includes('darkness') || visualDesc.includes('shifts')) {
        return `Positioned in the middle of the vast floor, facing south towards the camera, a full-size ${monsterName} crouches in an aggressive combat pose in the middle of the room, ready to strike, its form constantly shifting, taking up a significant portion of the frame. The monster is clearly facing south and looking directly south, its body oriented towards the camera, the human-sized figure clearly visible and imposing.`;
      } else {
        return `Positioned in the middle of the vast floor, facing south towards the camera, a full-size ${monsterName} stands in a combat-ready stance in the middle of the room, arms raised in a fighting pose, taking up a significant portion of the frame. The monster is clearly facing south and looking directly south, its body and head oriented towards the camera, the human-sized figure clearly visible and imposing.`;
      }
  }
}

/**
 * Generate prompt for a monster in T-Junction (topology 5)
 * Monster is ALWAYS in center, ALWAYS facing south, regardless of entry direction
 */
function generateTJunctionPrompt(monster: Monster, entryDirection: 'north' | 'south' | 'east' | 'west'): string {
  const positioning = getTJunctionMonsterPositioning(monster);
  
  // Use medium shot for all entries (closer camera perspective)
  const cameraDescription = 'A cinematic 16:9 medium shot of a T-shaped dungeon junction. The camera is positioned closer, looking down the hallway from a mid-range perspective.';
  
  return `Grimdark fantasy masterpiece, heavily inspired by Dark Souls 3. ${cameraDescription} ${positioning} The back wall (center) is a continuous, seamless expanse of heavy wet bricks from floor to ceiling. The wall on the Left Side of the frame features a tall, ominous archway. The wall on the Right Side of the frame features a matching tall, ominous archway. The floor is a wide expanse of broken wet stone reflecting faint orange torchlight. Heavy vignette, pitch-black shadows, filthy textures, thick fog, claustrophobic, 8k resolution, photorealistic grim concept art. No weapon.`;
}

/**
 * Populate all monster prompts for Left Branch (6) and Right Branch (3) topologies
 * This function should be called once to set up prompts for all monsters
 */
export async function populateAllMonsterPrompts(): Promise<void> {
  const { setMonsterPrompt, addMonsterToPool, getMonsterPool } = useDungeonStore.getState();
  
  console.log(`[populateAllMonsterPrompts] Starting to populate prompts for all monsters...`);
  
  // Get all monsters (built-in + custom)
  const allMonsters = getAllMonsters();
  console.log(`[populateAllMonsterPrompts] Found ${allMonsters.length} monsters to populate`);
  console.log(`[populateAllMonsterPrompts] Monster IDs: ${allMonsters.map(m => m.id).join(', ')}`);
  
  // Left Branch (topology 6) - valid entries: north, south, east, west
  const LEFT_BRANCH_ENTRIES: ('north' | 'south' | 'east' | 'west')[] = ['north', 'south', 'east', 'west'];
  
  // Right Branch (topology 3) - valid entries: south, east, north
  const RIGHT_BRANCH_ENTRIES: ('north' | 'south' | 'east')[] = ['south', 'east', 'north'];
  
  let leftBranchCount = 0;
  let rightBranchCount = 0;
  
  // Populate prompts for each monster
  for (const monster of allMonsters) {
    console.log(`[populateAllMonsterPrompts] Processing ${monster.name} (id: ${monster.id})...`);
    
    // Ensure monster is in both pools
    addMonsterToPool(6, monster.id); // Left Branch
    addMonsterToPool(3, monster.id); // Right Branch
    
    // Populate Left Branch prompts (all 4 entry directions)
    for (const entryDirection of LEFT_BRANCH_ENTRIES) {
      const prompt = generateLeftBranchPrompt(monster, entryDirection);
      setMonsterPrompt(6, monster.id, prompt, entryDirection);
      leftBranchCount++;
      console.log(`[populateAllMonsterPrompts] ✓ Set Left Branch prompt for ${monster.name} (entry from ${entryDirection.toUpperCase()})`);
    }
    
    // Populate Right Branch prompts (3 entry directions)
    for (const entryDirection of RIGHT_BRANCH_ENTRIES) {
      const prompt = generateRightBranchPrompt(monster, entryDirection);
      setMonsterPrompt(3, monster.id, prompt, entryDirection);
      rightBranchCount++;
      console.log(`[populateAllMonsterPrompts] ✓ Set Right Branch prompt for ${monster.name} (entry from ${entryDirection.toUpperCase()})`);
    }
  }
  
  // Final verification
  const finalLeftPool = getMonsterPool(6);
  const finalRightPool = getMonsterPool(3);
  const leftPoolSize = finalLeftPool.size;
  const rightPoolSize = finalRightPool.size;
  
  console.log(`[populateAllMonsterPrompts] ✓ Completed! All prompts have been set.`);
  console.log(`[populateAllMonsterPrompts] Left Branch: ${leftBranchCount} prompts (${allMonsters.length} monsters × 4 entries), pool size: ${leftPoolSize}`);
  console.log(`[populateAllMonsterPrompts] Right Branch: ${rightBranchCount} prompts (${allMonsters.length} monsters × 3 entries), pool size: ${rightPoolSize}`);
}

/**
 * Populate all monster prompts for T-Junction (topology 5)
 * Monsters are ALWAYS in center, ALWAYS facing south, regardless of entry direction
 */
export async function populateTJunctionMonsterPrompts(): Promise<void> {
  const { setMonsterPrompt, addMonsterToPool, getMonsterPool } = useDungeonStore.getState();
  
  console.log(`[populateTJunctionMonsterPrompts] Starting to populate prompts for all monsters...`);
  
  // Get all monsters (built-in + custom)
  const allMonsters = getAllMonsters();
  console.log(`[populateTJunctionMonsterPrompts] Found ${allMonsters.length} monsters to populate`);
  console.log(`[populateTJunctionMonsterPrompts] Monster IDs: ${allMonsters.map(m => m.id).join(', ')}`);
  
  // T-Junction (topology 5) - valid entries: north, south, east, west
  const T_JUNCTION_ENTRIES: ('north' | 'south' | 'east' | 'west')[] = ['north', 'south', 'east', 'west'];
  
  let tJunctionCount = 0;
  
  // Populate prompts for each monster
  for (const monster of allMonsters) {
    console.log(`[populateTJunctionMonsterPrompts] Processing ${monster.name} (id: ${monster.id})...`);
    
    // Ensure monster is in T-Junction pool
    addMonsterToPool(5, monster.id);
    
    // Populate T-Junction prompts (all 4 entry directions - same prompt for all since monster is always center, facing south)
    for (const entryDirection of T_JUNCTION_ENTRIES) {
      const prompt = generateTJunctionPrompt(monster, entryDirection);
      setMonsterPrompt(5, monster.id, prompt, entryDirection);
      tJunctionCount++;
      console.log(`[populateTJunctionMonsterPrompts] ✓ Set T-Junction prompt for ${monster.name} (entry from ${entryDirection.toUpperCase()})`);
    }
  }
  
  // Final verification
  const finalTJunctionPool = getMonsterPool(5);
  const tJunctionPoolSize = finalTJunctionPool.size;
  
  console.log(`[populateTJunctionMonsterPrompts] ✓ Completed! All prompts have been set.`);
  console.log(`[populateTJunctionMonsterPrompts] T-Junction: ${tJunctionCount} prompts (${allMonsters.length} monsters × 4 entries), pool size: ${tJunctionPoolSize}`);
}

// Export for use in browser console or direct import
if (typeof window !== 'undefined') {
  (window as any).populateAllMonsterPrompts = populateAllMonsterPrompts;
  (window as any).populateTJunctionMonsterPrompts = populateTJunctionMonsterPrompts;
}

