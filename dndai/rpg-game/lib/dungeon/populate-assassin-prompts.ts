/**
 * Utility to populate Assassin prompts for Left Branch and Right Branch topologies
 * This ensures the Assassin monster has prompts for all valid entry directions
 */

import { useDungeonStore } from './store';
import { getAllMonsters, getMonsterById, createCustomMonster } from '@/lib/game/monsters';

// Assassin monster ID (custom monster - ID is generated from name "Assassin" -> "assassin")
const ASSASSIN_ID = 'assassin';

// Left Branch (topology index 6) - hasLeft=true, hasAhead=true, hasRight=false
// Valid entry directions: north, south, east, west
// Monster positioned on RIGHT side (opposite wall from entry), standing next to RIGHT wall (solid wall)
const LEFT_BRANCH_PROMPTS = {
  north: `Grimdark fantasy masterpiece, heavily inspired by Dark Souls 3. A cinematic 16:9 wide-angle shot of a dungeon junction. The camera looks down a deep hallway. Positioned on the Right side of the vast floor, standing casually next to the solid right wall (the wall opposite from where the player entered, not near any archway or door), is an Assassin, seen in profile facing the Left. The back wall (center) features a tall, ominous archway leading forward. The wall on the Left Side of the frame features a tall, ominous archway leading into darkness. The right wall is a solid, seamless surface of heavy stone blocks. The monster is positioned against the solid right wall, clearly leaning against the wall surface, away from all archways. The floor is a wide expanse of broken wet stone reflecting faint orange torchlight. Heavy vignette, pitch-black shadows, filthy textures, thick fog, claustrophobic, 8k resolution, photorealistic grim concept art. No weapon.`,
  
  south: `Grimdark fantasy masterpiece, heavily inspired by Dark Souls 3. A cinematic 16:9 wide-angle shot of a dungeon junction. The camera looks down a deep hallway. Positioned on the Right side of the vast floor, standing casually next to the solid right wall (the wall opposite from where the player entered, not near any archway or door), is an Assassin, seen in profile facing the Left. The back wall (center) features a tall, ominous archway leading forward. The wall on the Left Side of the frame features a tall, ominous archway leading into darkness. The right wall is a solid, seamless surface of heavy stone blocks. The monster is positioned against the solid right wall, clearly leaning against the wall surface, away from all archways. The floor is a wide expanse of broken wet stone reflecting faint orange torchlight. Heavy vignette, pitch-black shadows, filthy textures, thick fog, claustrophobic, 8k resolution, photorealistic grim concept art. No weapon.`,
  
  east: `Grimdark fantasy masterpiece, heavily inspired by Dark Souls 3. A cinematic 16:9 wide-angle shot of a dungeon junction. The camera looks down a deep hallway. Positioned on the Right side of the vast floor, standing casually next to the solid right wall (the wall opposite from where the player entered, not near any archway or door), is an Assassin, seen in profile facing the Left. The back wall (center) features a tall, ominous archway leading forward. The wall on the Left Side of the frame features a tall, ominous archway leading into darkness. The right wall is a solid, seamless surface of heavy stone blocks. The monster is positioned against the solid right wall, clearly leaning against the wall surface, away from all archways. The floor is a wide expanse of broken wet stone reflecting faint orange torchlight. Heavy vignette, pitch-black shadows, filthy textures, thick fog, claustrophobic, 8k resolution, photorealistic grim concept art. No weapon.`,
  
  west: `Grimdark fantasy masterpiece, heavily inspired by Dark Souls 3. A cinematic 16:9 wide-angle shot of a dungeon junction. The camera looks down a deep hallway. Positioned on the Right side of the vast floor, standing casually next to the solid right wall (the wall opposite from where the player entered, not near any archway or door), is an Assassin, seen in profile facing the Left. The back wall (center) features a tall, ominous archway leading forward. The wall on the Left Side of the frame features a tall, ominous archway leading into darkness. The right wall is a solid, seamless surface of heavy stone blocks. The monster is positioned against the solid right wall, clearly leaning against the wall surface, away from all archways. The floor is a wide expanse of broken wet stone reflecting faint orange torchlight. Heavy vignette, pitch-black shadows, filthy textures, thick fog, claustrophobic, 8k resolution, photorealistic grim concept art. No weapon.`
};

// Right Branch (topology index 3) - hasLeft=false, hasAhead=true, hasRight=true
// Valid entry directions: south, east, north
// Monster positioned on LEFT side (opposite wall from entry), standing next to LEFT wall (solid wall)
const RIGHT_BRANCH_PROMPTS = {
  south: `Grimdark fantasy masterpiece, heavily inspired by Dark Souls 3. A cinematic 16:9 wide-angle shot of a dungeon junction. The camera looks down a deep hallway. Positioned on the Left side of the vast floor, standing casually next to the solid left wall (the wall opposite from where the player entered, not near any archway or door), is an Assassin, seen in profile facing the Right. The back wall (center) features a tall, ominous archway leading forward. The left wall is a solid, seamless surface of heavy stone blocks. The wall on the Right Side of the frame features a tall, ominous archway leading into darkness. The monster is positioned against the solid left wall, clearly leaning against the wall surface, away from all archways. The floor is a wide expanse of broken wet stone reflecting faint orange torchlight. Heavy vignette, pitch-black shadows, filthy textures, thick fog, claustrophobic, 8k resolution, photorealistic grim concept art. No weapon.`,
  
  east: `Grimdark fantasy masterpiece, heavily inspired by Dark Souls 3. A cinematic 16:9 wide-angle shot of a dungeon junction. The camera looks down a deep hallway. Positioned on the Left side of the vast floor, standing casually next to the solid left wall (the wall opposite from where the player entered, not near any archway or door), is an Assassin, seen in profile facing the Right. The back wall (center) features a tall, ominous archway leading forward. The left wall is a solid, seamless surface of heavy stone blocks. The wall on the Right Side of the frame features a tall, ominous archway leading into darkness. The monster is positioned against the solid left wall, clearly leaning against the wall surface, away from all archways. The floor is a wide expanse of broken wet stone reflecting faint orange torchlight. Heavy vignette, pitch-black shadows, filthy textures, thick fog, claustrophobic, 8k resolution, photorealistic grim concept art. No weapon.`,
  
  north: `Grimdark fantasy masterpiece, heavily inspired by Dark Souls 3. A cinematic 16:9 wide-angle shot of a dungeon junction. The camera looks down a deep hallway. Positioned on the Left side of the vast floor, standing casually next to the solid left wall (the wall opposite from where the player entered, not near any archway or door), is an Assassin, seen in profile facing the Right. The back wall (center) features a tall, ominous archway leading forward. The left wall is a solid, seamless surface of heavy stone blocks. The wall on the Right Side of the frame features a tall, ominous archway leading into darkness. The monster is positioned against the solid left wall, clearly leaning against the wall surface, away from all archways. The floor is a wide expanse of broken wet stone reflecting faint orange torchlight. Heavy vignette, pitch-black shadows, filthy textures, thick fog, claustrophobic, 8k resolution, photorealistic grim concept art. No weapon.`
};

/**
 * Populate all Assassin prompts for Left Branch (6) and Right Branch (3) topologies
 * This function should be called once to set up the prompts
 */
export async function populateAssassinPrompts(): Promise<void> {
  const { setMonsterPrompt, addMonsterToPool, getMonsterPool } = useDungeonStore.getState();
  
  console.log(`[populateAssassinPrompts] Starting to populate prompts for Assassin (id: ${ASSASSIN_ID})...`);
  
  // First, ensure the Assassin monster exists (create if it doesn't)
  let assassin = getMonsterById(ASSASSIN_ID);
  if (!assassin) {
    console.log(`[populateAssassinPrompts] Assassin monster not found, creating it...`);
    try {
      assassin = createCustomMonster('Assassin', 'common', 1, 50);
      console.log(`[populateAssassinPrompts] ✓ Created Assassin monster (id: ${assassin.id})`);
      
      // Force a small delay to ensure localStorage is written
      // Then verify with retry logic
      let retries = 3;
      let assassinInAllMonsters = false;
      while (retries > 0 && !assassinInAllMonsters) {
        // Small delay to allow localStorage write to complete
        await new Promise(resolve => setTimeout(resolve, 50));
        const allMonsters = getAllMonsters();
        assassinInAllMonsters = allMonsters.some(m => m.id === ASSASSIN_ID);
        if (!assassinInAllMonsters) {
          retries--;
          console.log(`[populateAssassinPrompts] Retry ${3 - retries}/3: Assassin not yet in getAllMonsters()...`);
        }
      }
      
      if (!assassinInAllMonsters) {
        console.error(`[populateAssassinPrompts] ⚠ ERROR: Assassin still not found in getAllMonsters() after retries!`);
        console.error(`[populateAssassinPrompts] This will prevent monster selection. Please refresh the page.`);
        return; // Early return if we can't verify Assassin exists
      }
    } catch (error) {
      console.error(`[populateAssassinPrompts] ⚠ ERROR: Failed to create Assassin monster:`, error);
      return; // Early return on error
    }
  } else {
    console.log(`[populateAssassinPrompts] ✓ Assassin monster exists (id: ${assassin.id}, name: ${assassin.name})`);
  }
  
  // Verify Assassin is in getAllMonsters (required for pool selection) - final check
  const allMonsters = getAllMonsters();
  const assassinInAllMonsters = allMonsters.some(m => m.id === ASSASSIN_ID);
  const allMonsterIds = allMonsters.map(m => m.id);
  console.log(`[populateAssassinPrompts] Assassin in getAllMonsters: ${assassinInAllMonsters} (total monsters: ${allMonsters.length})`);
  console.log(`[populateAssassinPrompts] All monster IDs: ${allMonsterIds.join(', ')}`);
  
  if (!assassinInAllMonsters) {
    console.error(`[populateAssassinPrompts] ⚠ ERROR: Assassin not found in getAllMonsters()! This will prevent monster selection.`);
    console.error(`[populateAssassinPrompts] Please check localStorage for 'dungeon-custom-monsters' key.`);
    return; // Early return if Assassin doesn't exist
  }
  
  // Explicitly ensure Assassin is in both pools
  console.log(`[populateAssassinPrompts] Ensuring Assassin is in pools...`);
  addMonsterToPool(6, ASSASSIN_ID); // Left Branch
  addMonsterToPool(3, ASSASSIN_ID); // Right Branch
  
  // Verify Assassin is in pools
  const leftBranchPool = getMonsterPool(6);
  const rightBranchPool = getMonsterPool(3);
  const inLeftBranch = leftBranchPool.has(ASSASSIN_ID);
  const inRightBranch = rightBranchPool.has(ASSASSIN_ID);
  
  console.log(`[populateAssassinPrompts] Assassin in Left Branch pool: ${inLeftBranch}`);
  console.log(`[populateAssassinPrompts] Assassin in Right Branch pool: ${inRightBranch}`);
  
  if (!inLeftBranch || !inRightBranch) {
    console.warn(`[populateAssassinPrompts] ⚠ WARNING: Assassin may not be in pools!`);
  }
  
  // Populate Left Branch (topology index 6) prompts
  console.log(`[populateAssassinPrompts] Setting Left Branch (6) prompts...`);
  Object.entries(LEFT_BRANCH_PROMPTS).forEach(([direction, prompt]) => {
    setMonsterPrompt(6, ASSASSIN_ID, prompt, direction as 'north' | 'south' | 'east' | 'west');
    console.log(`[populateAssassinPrompts] ✓ Set Left Branch prompt for entry from ${direction.toUpperCase()}`);
  });
  
  // Populate Right Branch (topology index 3) prompts
  console.log(`[populateAssassinPrompts] Setting Right Branch (3) prompts...`);
  Object.entries(RIGHT_BRANCH_PROMPTS).forEach(([direction, prompt]) => {
    setMonsterPrompt(3, ASSASSIN_ID, prompt, direction as 'north' | 'south' | 'east' | 'west');
    console.log(`[populateAssassinPrompts] ✓ Set Right Branch prompt for entry from ${direction.toUpperCase()}`);
  });
  
  // Final verification
  const finalLeftPool = getMonsterPool(6);
  const finalRightPool = getMonsterPool(3);
  const finalInLeft = finalLeftPool.has(ASSASSIN_ID);
  const finalInRight = finalRightPool.has(ASSASSIN_ID);
  const leftPoolSize = finalLeftPool.size;
  const rightPoolSize = finalRightPool.size;
  
  console.log(`[populateAssassinPrompts] ✓ Completed! All prompts have been set.`);
  console.log(`[populateAssassinPrompts] Left Branch: 4 prompts (north, south, east, west), pool size: ${leftPoolSize}, Assassin in pool: ${finalInLeft}`);
  console.log(`[populateAssassinPrompts] Right Branch: 3 prompts (south, east, north), pool size: ${rightPoolSize}, Assassin in pool: ${finalInRight}`);
}

// Export for use in browser console or direct import
if (typeof window !== 'undefined') {
  (window as any).populateAssassinPrompts = populateAssassinPrompts;
}

