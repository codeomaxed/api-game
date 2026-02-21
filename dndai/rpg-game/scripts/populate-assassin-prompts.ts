/**
 * Script to populate Assassin prompts for Left Branch and Right Branch topologies
 * Run this in the browser console or as a one-time setup script
 */

// Assassin monster ID (custom monster)
const ASSASSIN_ID = 'assassin';

// Left Branch (topology index 6) - hasLeft=true, hasAhead=true, hasRight=false
// Valid entry directions: north, south, east, west
const LEFT_BRANCH_PROMPTS = {
  north: `Grimdark fantasy masterpiece, heavily inspired by Dark Souls 3. A cinematic 16:9 wide-angle shot of a dungeon junction. The camera looks down a deep hallway. Standing upright on the Left side of the vast floor is a nimble Assassin, seen in profile facing the Right, leaning casually against the left wall. The figure is clad in tight, worn leather armor. The back wall (center) features a tall, ominous archway leading forward. The wall on the Left Side of the frame features a tall, ominous archway leading into darkness. The right wall is a solid, seamless surface of heavy stone blocks. The floor is a wide expanse of broken wet stone reflecting faint orange torchlight. Heavy vignette, pitch-black shadows, filthy textures, thick fog, claustrophobic, 8k resolution, photorealistic grim concept art.`,
  
  south: `Grimdark fantasy masterpiece, heavily inspired by Dark Souls 3. A cinematic 16:9 wide-angle shot of a dungeon junction. The camera looks down a deep hallway. Standing upright on the Left side of the vast floor is a nimble Assassin, seen in profile facing the Right, leaning casually against the left wall. The figure is clad in tight, worn leather armor. The back wall (center) features a tall, ominous archway leading forward. The wall on the Left Side of the frame features a tall, ominous archway leading into darkness. The right wall is a solid, seamless surface of heavy stone blocks. The floor is a wide expanse of broken wet stone reflecting faint orange torchlight. Heavy vignette, pitch-black shadows, filthy textures, thick fog, claustrophobic, 8k resolution, photorealistic grim concept art.`,
  
  east: `Grimdark fantasy masterpiece, heavily inspired by Dark Souls 3. A cinematic 16:9 wide-angle shot of a dungeon junction. The camera looks down a deep hallway. Standing upright on the Left side of the vast floor is a nimble Assassin, seen in profile facing the Right, leaning casually against the left wall. The figure is clad in tight, worn leather armor. The back wall (center) features a tall, ominous archway leading forward. The wall on the Left Side of the frame features a tall, ominous archway leading into darkness. The right wall is a solid, seamless surface of heavy stone blocks. The floor is a wide expanse of broken wet stone reflecting faint orange torchlight. Heavy vignette, pitch-black shadows, filthy textures, thick fog, claustrophobic, 8k resolution, photorealistic grim concept art.`,
  
  west: `Grimdark fantasy masterpiece, heavily inspired by Dark Souls 3. A cinematic 16:9 wide-angle shot of a dungeon junction. The camera looks down a deep hallway. Standing upright on the Left side of the vast floor is a nimble Assassin, seen in profile facing the Right, leaning casually against the left wall. The figure is clad in tight, worn leather armor. The back wall (center) features a tall, ominous archway leading forward. The wall on the Left Side of the frame features a tall, ominous archway leading into darkness. The right wall is a solid, seamless surface of heavy stone blocks. The floor is a wide expanse of broken wet stone reflecting faint orange torchlight. Heavy vignette, pitch-black shadows, filthy textures, thick fog, claustrophobic, 8k resolution, photorealistic grim concept art.`
};

// Right Branch (topology index 3) - hasLeft=false, hasAhead=true, hasRight=true
// Valid entry directions: south, east, north
const RIGHT_BRANCH_PROMPTS = {
  south: `Grimdark fantasy masterpiece, heavily inspired by Dark Souls 3. A cinematic 16:9 wide-angle shot of a dungeon junction. The camera looks down a deep hallway. Standing upright on the Right side of the vast floor is a nimble Assassin, seen in profile facing the Left, leaning casually against the right wall. The figure is clad in tight, worn leather armor. The back wall (center) features a tall, ominous archway leading forward. The wall on the Right Side of the frame features a tall, ominous archway leading into darkness. The left wall is a solid, seamless surface of heavy stone blocks. The floor is a wide expanse of broken wet stone reflecting faint orange torchlight. Heavy vignette, pitch-black shadows, filthy textures, thick fog, claustrophobic, 8k resolution, photorealistic grim concept art.`,
  
  east: `Grimdark fantasy masterpiece, heavily inspired by Dark Souls 3. A cinematic 16:9 wide-angle shot of a dungeon junction. The camera looks down a deep hallway. Standing upright on the Right side of the vast floor is a nimble Assassin, seen in profile facing the Left, leaning casually against the right wall. The figure is clad in tight, worn leather armor. The back wall (center) features a tall, ominous archway leading forward. The wall on the Right Side of the frame features a tall, ominous archway leading into darkness. The left wall is a solid, seamless surface of heavy stone blocks. The floor is a wide expanse of broken wet stone reflecting faint orange torchlight. Heavy vignette, pitch-black shadows, filthy textures, thick fog, claustrophobic, 8k resolution, photorealistic grim concept art.`,
  
  north: `Grimdark fantasy masterpiece, heavily inspired by Dark Souls 3. A cinematic 16:9 wide-angle shot of a dungeon junction. The camera looks down a deep hallway. Standing upright on the Right side of the vast floor is a nimble Assassin, seen in profile facing the Left, leaning casually against the right wall. The figure is clad in tight, worn leather armor. The back wall (center) features a tall, ominous archway leading forward. The wall on the Right Side of the frame features a tall, ominous archway leading into darkness. The left wall is a solid, seamless surface of heavy stone blocks. The floor is a wide expanse of broken wet stone reflecting faint orange torchlight. Heavy vignette, pitch-black shadows, filthy textures, thick fog, claustrophobic, 8k resolution, photorealistic grim concept art.`
};

/**
 * Populate all Assassin prompts for Left and Right Branch
 * This should be called from the browser console after the store is initialized
 */
export function populateAssassinPrompts() {
  // This will be called from browser console, so we need to access the store
  // For now, this is a reference implementation
  console.log('Populate Assassin Prompts - Use the store.setMonsterPrompt function');
  console.log('Left Branch (6) prompts:', LEFT_BRANCH_PROMPTS);
  console.log('Right Branch (3) prompts:', RIGHT_BRANCH_PROMPTS);
}

// Export for use in browser console
if (typeof window !== 'undefined') {
  (window as any).populateAssassinPrompts = populateAssassinPrompts;
  (window as any).LEFT_BRANCH_PROMPTS = LEFT_BRANCH_PROMPTS;
  (window as any).RIGHT_BRANCH_PROMPTS = RIGHT_BRANCH_PROMPTS;
  (window as any).ASSASSIN_ID = ASSASSIN_ID;
}









