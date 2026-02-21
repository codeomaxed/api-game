import { DungeonNode, Exits, ConnectionType, PromptPattern } from './types';
import { Choice } from '@/types/game';
import { constructRoomPrompt } from './prompts';
import { generateMovementChoicesMetadata } from './prompts';
import { getExits } from './generator';
import { generateImage } from '@/lib/ai/images';
import { buildRoomPrompt, ExitInfo, getRelativePerspective } from './images';
import { getRelativeExits, getPromptByIndex, PROMPT_ARCHETYPE_NAMES } from './prompt-logic';
import { useDungeonStore } from './store';

/**
 * Validates that the calculated prompt index makes sense for the absolute topology
 * Helps catch bugs where topology calculation goes wrong
 */
function validateTopologyMatch(
  topologyString: string,
  entryDirection: 'north' | 'south' | 'east' | 'west' | null,
  calculatedIndex: number,
  hasLeft: boolean,
  hasAhead: boolean,
  hasRight: boolean
): { isValid: boolean; warning?: string } {
  // Count exits in topology
  const exitCount = (topologyString.match(/[NSEW]/g) || []).length;
  
  // Dead End (index 0): Should have exactly 1 exit (the entry)
  if (calculatedIndex === 0) {
    if (exitCount !== 1) {
      return {
        isValid: false,
        warning: `Dead End prompt (index 0) selected but topology has ${exitCount} exits (expected 1)`
      };
    }
  }
  
  // Straight (index 2): Should have exactly 2 opposite exits
  if (calculatedIndex === 2) {
    if (exitCount !== 2) {
      return {
        isValid: false,
        warning: `Straight prompt (index 2) selected but topology has ${exitCount} exits (expected 2 opposite)`
      };
    }
    // Check if exits are opposite (N+S or E+W)
    const hasNS = topologyString.includes('N') && topologyString.includes('S');
    const hasEW = topologyString.includes('E') && topologyString.includes('W');
    if (!hasNS && !hasEW) {
      return {
        isValid: false,
        warning: `Straight prompt (index 2) selected but exits are not opposite (topology: ${topologyString})`
      };
    }
  }
  
  // T-Junction (index 5): Should have exactly 3 exits
  if (calculatedIndex === 5) {
    if (exitCount !== 3) {
      return {
        isValid: false,
        warning: `T-Junction prompt (index 5) selected but topology has ${exitCount} exits (expected 3)`
      };
    }
  }
  
  // Crossroads (index 7): Should have exactly 4 exits
  if (calculatedIndex === 7) {
    if (exitCount !== 4) {
      return {
        isValid: false,
        warning: `Crossroads prompt (index 7) selected but topology has ${exitCount} exits (expected 4)`
      };
    }
  }
  
  // Specific validation: E+W topology should never result in Straight (index 2) or N+S-related prompts
  if (topologyString === 'E+W' || topologyString === 'W+E') {
    if (calculatedIndex === 2) {
      return {
        isValid: false,
        warning: `E+W topology incorrectly calculated as Straight (index 2). E+W should be T-Junction (index 5) when entering from N or S`
      };
    }
  }
  
  // Specific validation: N+S topology should never result in E+W-related prompts
  if (topologyString === 'N+S' || topologyString === 'S+N') {
    if (calculatedIndex === 5 && !hasLeft && !hasRight) {
      return {
        isValid: false,
        warning: `N+S topology incorrectly calculated as T-Junction (index 5) without left/right exits. N+S should be Straight (index 2) when entering from E or W`
      };
    }
  }
  
  return { isValid: true };
}

/**
 * Generates room content (description, image, choices) for a node
 */
/**
 * Create topology key string from exits (e.g., "N+E" or "N+S+W")
 */
function getTopologyKey(exits: Exits): string {
  const parts: string[] = [];
  if (exits.north) parts.push('N');
  if (exits.south) parts.push('S');
  if (exits.east) parts.push('E');
  if (exits.west) parts.push('W');
  return parts.length > 0 ? parts.join('+') : 'None';
}

/**
 * Create composite key from room type and topology (e.g., "MERCHANT:N+E")
 */
function getCompositeKey(roomType: string, exits: Exits): string {
  return `${roomType}:${getTopologyKey(exits)}`;
}

/**
 * Calculate valid exits from actual node connections
 */
function calculateValidExits(node: DungeonNode): Exits {
  // #region agent log
  fetch('http://127.0.0.1:7249/ingest/08331948-86a3-4f5f-b660-2645d043da0c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'content.ts:36',message:'calculateValidExits: entry',data:{nodeId:node.id,nodeX:node.x,nodeY:node.y,connectionCount:node.connections.size,connectionKeys:Array.from(node.connections.keys())},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
  // #endregion

  const validExits: Exits = {
    north: node.connections.has(`${node.x},${node.y - 1}`),
    south: node.connections.has(`${node.x},${node.y + 1}`),
    east: node.connections.has(`${node.x + 1},${node.y}`),
    west: node.connections.has(`${node.x - 1},${node.y}`),
  };

  // #region agent log
  fetch('http://127.0.0.1:7249/ingest/08331948-86a3-4f5f-b660-2645d043da0c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'content.ts:42',message:'calculateValidExits: exit',data:{nodeId:node.id,validExits,expectedNorth:`${node.x},${node.y - 1}`,expectedSouth:`${node.x},${node.y + 1}`,expectedEast:`${node.x + 1},${node.y}`,expectedWest:`${node.x - 1},${node.y}`},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
  // #endregion

  return validExits;
}

export async function generateRoomContent(
  node: DungeonNode,
  allNodes: Map<string, DungeonNode>,
  exits: Exits,
  character: any,
  gameEngine: any,
  entryDirection?: 'north' | 'south' | 'east' | 'west' | null,
  getPatternForNode?: (nodeId: string) => PromptPattern | null // Optional pattern getter
): Promise<{
  description: string;
  imageUrl: string;
  availableChoices: Choice[];
  isExplored: boolean;
  entities: string[];
}> {
  console.log(`[generateRoomContent] Called for node ${node.id} (type: ${node.type})`);
  console.log(`[generateRoomContent] Entry direction: ${entryDirection || 'null (start room)'}`);
  console.log(`[generateRoomContent] Node has cached content: ${node.content ? 'YES' : 'NO'}`);
  
  // Entry direction validation
  const hasExits = exits.north || exits.south || exits.east || exits.west;
  if (entryDirection === null && hasExits && node.type !== 'START') {
    console.warn(`[generateRoomContent] ⚠ WARNING: Node ${node.id} has exits but entry direction is null (not a start room)`);
    console.warn(`[generateRoomContent]   This may cause incorrect topology calculation`);
  }
  
  // Validate entry direction doesn't match an exit (impossible state)
  if (entryDirection !== null) {
    if (entryDirection === 'north' && exits.north) {
      console.error(`[generateRoomContent] ⚠ ERROR: Node ${node.id} entry direction is 'north' but also has north exit - impossible state!`);
    }
    if (entryDirection === 'south' && exits.south) {
      console.error(`[generateRoomContent] ⚠ ERROR: Node ${node.id} entry direction is 'south' but also has south exit - impossible state!`);
    }
    if (entryDirection === 'east' && exits.east) {
      console.error(`[generateRoomContent] ⚠ ERROR: Node ${node.id} entry direction is 'east' but also has east exit - impossible state!`);
    }
    if (entryDirection === 'west' && exits.west) {
      console.error(`[generateRoomContent] ⚠ ERROR: Node ${node.id} entry direction is 'west' but also has west exit - impossible state!`);
    }
  }
  
  // PRIORITY 0: Check if content already exists WITH a valid imageUrl - return immediately if cached
  // If content exists but imageUrl is missing/empty, we need to regenerate the image
  if (node.content && node.content.imageUrl) {
    const hasImageUrl = !!node.content.imageUrl;
    const isCombatRoom = node.type === 'COMBAT';
    const hasSegmentedUrl = !!node.content.segmentedMonsterUrl;
    
    console.log(`[generateRoomContent] ✓ Node ${node.id} already has cached content with imageUrl, returning it immediately`);
    console.log(`[generateRoomContent]   Cached imageUrl: ${node.content.imageUrl.substring(0, 60)}...`);
    console.log(`[generateRoomContent]   Is combat room: ${isCombatRoom}`);
    console.log(`[generateRoomContent]   Has segmentedMonsterUrl: ${hasSegmentedUrl}`);
    
    // For combat rooms without segmentation, we should regenerate to get segmentation
    // But for now, return cached content and let client-side handle it
    if (isCombatRoom && !hasSegmentedUrl) {
      console.warn(`[generateRoomContent] ⚠ Combat room ${node.id} has cached content but NO segmentedMonsterUrl`);
      console.warn(`[generateRoomContent]   This room was generated before segmentation was implemented`);
      console.warn(`[generateRoomContent]   Consider clearing cache for this room to regenerate with segmentation`);
    }
    
    return {
      description: node.content.description,
      imageUrl: node.content.imageUrl || '',
      availableChoices: node.content.availableChoices || [],
      isExplored: node.content.isExplored || true,
      entities: node.content.entities || [],
      imagePrompt: node.content.imagePrompt, // Preserve image prompt if it exists
      segmentedMonsterUrl: node.content.segmentedMonsterUrl, // Preserve segmented URL if it exists
    };
  }
  
  // If content exists but imageUrl is missing, log and continue to generation
  if (node.content && !node.content.imageUrl) {
    console.log(`[generateRoomContent] ⚠ Node ${node.id} has cached content but NO imageUrl - will regenerate image`);
    console.log(`[generateRoomContent]   Content keys: ${Object.keys(node.content).join(', ')}`);
  }
  
          // STORY GENERATION DISABLED - Only generate images
          // PRIORITY 0: Check for manual topology override first
          // Calculate topology pattern from actual connections (before override check)
          const initialValidExits = calculateValidExits(node);
          const initialTopologyStr = getTopologyKey(initialValidExits);
          
          // Check for manual topology override
          const manualTopologyOverride = useDungeonStore.getState().getManualTopologyOverride(initialTopologyStr);
          const validExits = manualTopologyOverride || initialValidExits;
          const topologyStr = manualTopologyOverride ? getTopologyKey(manualTopologyOverride) : initialTopologyStr;
          
          if (manualTopologyOverride) {
            console.log(`[generateRoomContent] ✓ Using MANUAL TOPOLOGY OVERRIDE for pattern "${initialTopologyStr}"`);
            console.log(`[generateRoomContent]   Original: ${initialTopologyStr}, Override: ${topologyStr}`);
              } else {
            console.log(`[generateRoomContent] Using generated topology: ${topologyStr}`);
          }
          
          console.log(`[generateRoomContent] Valid exits: N=${validExits.north}, S=${validExits.south}, E=${validExits.east}, W=${validExits.west}`);
          
          // #region agent log
          fetch('http://127.0.0.1:7249/ingest/08331948-86a3-4f5f-b660-2645d043da0c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'content.ts:80',message:'generateRoomContent: validExits calculated',data:{nodeId:node.id,nodeType:node.type,entryDirection,validExits,hasManualTopologyOverride:!!manualTopologyOverride},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
          // #endregion
  
  // Get monster from node
  const monster = node.monster || null;
  const exitInfos: ExitInfo[] = [];
  
  if (validExits.north) {
    const targetId = `${node.x},${node.y - 1}`;
    const connection = node.connections.get(targetId);
    if (connection) {
      exitInfos.push({ direction: 'north', visualType: connection.type, targetId });
    }
  }
  if (validExits.south) {
    const targetId = `${node.x},${node.y + 1}`;
    const connection = node.connections.get(targetId);
    if (connection) {
      exitInfos.push({ direction: 'south', visualType: connection.type, targetId });
    }
  }
  if (validExits.east) {
    const targetId = `${node.x + 1},${node.y}`;
    const connection = node.connections.get(targetId);
    if (connection) {
      exitInfos.push({ direction: 'east', visualType: connection.type, targetId });
    }
  }
  if (validExits.west) {
    const targetId = `${node.x - 1},${node.y}`;
    const connection = node.connections.get(targetId);
    if (connection) {
      exitInfos.push({ direction: 'west', visualType: connection.type, targetId });
    }
  }
  
          // Calculate relative exits based on entry direction (will be recalculated with effective entry direction below)
          // This is a placeholder - actual calculation happens after entry direction override check
          let hasLeft = false, hasAhead = false, hasRight = false;
  
          // PRIORITY 1: Check for manual entry direction override
          const manualEntryDirectionOverride = useDungeonStore.getState().getManualEntryDirectionOverride(topologyStr);
          const effectiveEntryDirection = manualEntryDirectionOverride !== null ? manualEntryDirectionOverride : entryDirection;
          
          // #region agent log
          fetch('http://127.0.0.1:7249/ingest/08331948-86a3-4f5f-b660-2645d043da0c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'content.ts:265',message:'generateRoomContent: effective entry direction',data:{nodeId:node.id,entryDirection,manualEntryDirectionOverride,effectiveEntryDirection,topologyStr},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
          // #endregion
          
          if (manualEntryDirectionOverride !== null) {
            console.log(`[generateRoomContent] ✓ Using MANUAL ENTRY DIRECTION OVERRIDE for pattern "${topologyStr}"`);
            console.log(`[generateRoomContent]   Original: ${entryDirection || 'null'}, Override: ${manualEntryDirectionOverride}`);
          }
          
          // Recalculate relative exits with effective entry direction
          const { hasLeft: effectiveHasLeft, hasAhead: effectiveHasAhead, hasRight: effectiveHasRight } = getRelativeExits(node, allNodes, effectiveEntryDirection || null, validExits);
          
          // Calculate topology string for validation (already have topologyStr from above)
          const topologyString = topologyStr;
          
          // Calculate expected prompt index from relative exits
          const calculatedIndex = (effectiveHasLeft ? 4 : 0) + (effectiveHasAhead ? 2 : 0) + (effectiveHasRight ? 1 : 0);
          const expectedTopologyName = PROMPT_ARCHETYPE_NAMES[calculatedIndex];

  // Validate actual connections match validExits
  const actualConnections = Array.from(node.connections.keys());
  const expectedConnections: string[] = [];
  if (validExits.north) expectedConnections.push(`${node.x},${node.y - 1}`);
  if (validExits.south) expectedConnections.push(`${node.x},${node.y + 1}`);
  if (validExits.east) expectedConnections.push(`${node.x + 1},${node.y}`);
  if (validExits.west) expectedConnections.push(`${node.x - 1},${node.y}`);
  
  const connectionsMatch = actualConnections.length === expectedConnections.length &&
    actualConnections.every(conn => expectedConnections.includes(conn)) &&
    expectedConnections.every(conn => actualConnections.includes(conn));

  // #region agent log
  fetch('http://127.0.0.1:7249/ingest/08331948-86a3-4f5f-b660-2645d043da0c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'content.ts:128',message:'generateRoomContent: topology calculated',data:{nodeId:node.id,topologyString,entryDirection,effectiveEntryDirection,relativeExits:{hasLeft:effectiveHasLeft,hasAhead:effectiveHasAhead,hasRight:effectiveHasRight},calculatedIndex,expectedTopologyName,actualConnections,expectedConnections,connectionsMatch,validExits},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
  // #endregion

  // Log warning if connections don't match
  if (!connectionsMatch) {
    console.error(`[generateRoomContent] ⚠ CONNECTION MISMATCH for Node ${node.id}!`);
    console.error(`[generateRoomContent]   Actual connections: ${actualConnections.join(', ')}`);
    console.error(`[generateRoomContent]   Expected from validExits: ${expectedConnections.join(', ')}`);
    console.error(`[generateRoomContent]   validExits: N=${validExits.north} S=${validExits.south} E=${validExits.east} W=${validExits.west}`);
  }
  
  // Detailed topology logging and validation
  console.log(`[generateRoomContent] === TOPOLOGY CALCULATION ===`);
  console.log(`[generateRoomContent] Node ${node.id} (${node.type})`);
  console.log(`[generateRoomContent] Actual absolute exits: N=${validExits.north} S=${validExits.south} E=${validExits.east} W=${validExits.west} -> Topology: ${topologyString}`);
  console.log(`[generateRoomContent] Entry direction: ${entryDirection || 'null (start room)'}${manualEntryDirectionOverride !== null ? ` (MANUAL OVERRIDE: ${manualEntryDirectionOverride})` : ''}`);
  console.log(`[generateRoomContent] Effective entry direction: ${effectiveEntryDirection || 'null (start room)'}`);
  console.log(`[generateRoomContent] Calculated relative exits: L=${effectiveHasLeft} A=${effectiveHasAhead} R=${effectiveHasRight}`);
  console.log(`[generateRoomContent] Calculated prompt index: ${calculatedIndex} (${expectedTopologyName})`);
  
  // #region agent log
  fetch('http://127.0.0.1:7249/ingest/08331948-86a3-4f5f-b660-2645d043da0c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'content.ts:160',message:'generateRoomContent: topology calculated final',data:{nodeId:node.id,topologyString,entryDirection,effectiveEntryDirection,calculatedIndex,expectedTopologyName,relativeExits:{hasLeft:effectiveHasLeft,hasAhead:effectiveHasAhead,hasRight:effectiveHasRight},validExits,connectionsMatch},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
  // #endregion
  
  // PRIORITY 0: Check for manual prompt index override (manual selection - highest priority for prompt)
  const promptIndexOverride = useDungeonStore.getState().getManualPromptIndexOverride(topologyString);
  
  // PRIORITY 1: Check for node-specific text override (custom prompt text)
  const compositeKey = getCompositeKey(node.type, validExits);
  const nodeOverride = useDungeonStore.getState().getNodePromptOverride(node.id);
    
  let imagePrompt: string;
  let negativePrompt: string = '';
  let selectedPromptIndex: number | null = null;
  let promptSelectionReason: string = '';
  
  // Detailed diagnostic logging
  console.log(`[generateRoomContent] === PROMPT SELECTION DIAGNOSTICS ===`);
  console.log(`[generateRoomContent] Node ${node.id} (${node.type})`);
  console.log(`[generateRoomContent] Absolute exits: N=${validExits.north} S=${validExits.south} E=${validExits.east} W=${validExits.west} -> Topology: ${topologyString}`);
  console.log(`[generateRoomContent] Entry direction: ${entryDirection || 'null (start room)'} ${entryDirection === null && node.type !== 'START' ? '⚠ WARNING: null for non-start node' : ''}`);
  console.log(`[generateRoomContent] Entry direction source: ${entryDirection !== undefined ? 'provided parameter' : 'undefined'}`);
  console.log(`[generateRoomContent] Calculated relative exits: L=${effectiveHasLeft} A=${effectiveHasAhead} R=${effectiveHasRight}`);
  console.log(`[generateRoomContent] Calculated prompt index: ${calculatedIndex} (${expectedTopologyName})`);
  console.log(`[generateRoomContent] Manual prompt index override (topology-based): ${promptIndexOverride !== null ? `${promptIndexOverride} (${PROMPT_ARCHETYPE_NAMES[promptIndexOverride]}) for topology "${topologyString}"` : 'none'}`);
  console.log(`[generateRoomContent] Custom text override: ${nodeOverride !== null ? 'set' : 'none'}`);
  
  if (promptIndexOverride !== null) {
    // PRIORITY 0: Use manual prompt index selection
    selectedPromptIndex = promptIndexOverride;
    promptSelectionReason = 'manual-prompt-index-override';
    imagePrompt = getPromptByIndex(promptIndexOverride);
    negativePrompt = '';
    console.log(`[generateRoomContent] ✓ Using manual prompt index override for Node ${node.id}`);
    console.log(`[generateRoomContent]   Selected index: ${promptIndexOverride} (${PROMPT_ARCHETYPE_NAMES[promptIndexOverride]})`);
    console.log(`[generateRoomContent]   Prompt preview: ${imagePrompt.substring(0, 100)}...`);
  } else if (nodeOverride !== null && nodeOverride.trim() !== '') {
    // PRIORITY 1: Use custom text override
    selectedPromptIndex = null; // Override doesn't use index
    promptSelectionReason = 'node-text-override';
    // Use node-specific override (custom prompt text)
    imagePrompt = nodeOverride.trim();
    negativePrompt = '';
    console.log(`[generateRoomContent] ✓ Node text override found for Node ${node.id}`);
    console.log(`[generateRoomContent]   Composite key: ${compositeKey}`);
    console.log(`[generateRoomContent]   Using custom override prompt`);
    console.log(`[generateRoomContent]   Prompt preview: ${imagePrompt.substring(0, 100)}...`);
  } else {
    // PRIORITY 2: Use standard geometry prompts (no room-type-specific prompts)
    // All nodes (MERCHANT, COMBAT, TREASURE, etc.) use standard geometry prompts based on topology
    selectedPromptIndex = calculatedIndex;
    promptSelectionReason = 'standard-geometry';
    const result = buildRoomPrompt(effectiveHasLeft, effectiveHasAhead, effectiveHasRight);
    imagePrompt = result.prompt;
    negativePrompt = result.negativePrompt;
    console.log(`[generateRoomContent] ✓ Using STANDARD GEOMETRY prompt for ${node.type} room Node ${node.id}`);
    console.log(`[generateRoomContent]   Entry direction: ${effectiveEntryDirection || 'null (start room)'}`);
    console.log(`[generateRoomContent]   Relative exits: L=${effectiveHasLeft} A=${effectiveHasAhead} R=${effectiveHasRight} -> Index: ${calculatedIndex} (${PROMPT_ARCHETYPE_NAMES[calculatedIndex]})`);
  }
  
  // Topology validation: Check if calculated prompt index makes sense for absolute topology
  // This helps catch bugs where E+W topology incorrectly results in N+S prompt (index 2)
  const topologyValidation = validateTopologyMatch(topologyString, effectiveEntryDirection, calculatedIndex, effectiveHasLeft, effectiveHasAhead, effectiveHasRight);
  if (!topologyValidation.isValid) {
    console.warn(`[generateRoomContent] ⚠ TOPOLOGY VALIDATION WARNING for Node ${node.id}:`);
    console.warn(`[generateRoomContent]   ${topologyValidation.warning}`);
    console.warn(`[generateRoomContent]   Absolute topology: ${topologyString}`);
    console.warn(`[generateRoomContent]   Entry direction: ${effectiveEntryDirection || 'null'}`);
    console.warn(`[generateRoomContent]   Calculated relative: L=${effectiveHasLeft} A=${effectiveHasAhead} R=${effectiveHasRight}`);
    console.warn(`[generateRoomContent]   Calculated index: ${calculatedIndex} (${PROMPT_ARCHETYPE_NAMES[calculatedIndex]})`);
  }
  
  // #region agent log
  fetch('http://127.0.0.1:7249/ingest/08331948-86a3-4f5f-b660-2645d043da0c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'content.ts:230',message:'generateRoomContent: prompt selected',data:{nodeId:node.id,topologyString,entryDirection,calculatedIndex,selectedPromptIndex,promptSelectionReason,selectedPromptName:selectedPromptIndex!==null?PROMPT_ARCHETYPE_NAMES[selectedPromptIndex]:'override',promptPreview:imagePrompt.substring(0,100),topologyValidation},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
  // #endregion
  
  // Final diagnostic summary
  console.log(`[generateRoomContent] === FINAL PROMPT SELECTION ===`);
  console.log(`[generateRoomContent] Node: ${node.id} (${node.type})`);
  console.log(`[generateRoomContent] Topology: ${topologyString}`);
  console.log(`[generateRoomContent] Entry: ${entryDirection || 'null'}`);
  console.log(`[generateRoomContent] Calculated index: ${calculatedIndex} (${expectedTopologyName})`);
  console.log(`[generateRoomContent] Selected index: ${selectedPromptIndex !== null ? selectedPromptIndex + ' (' + PROMPT_ARCHETYPE_NAMES[selectedPromptIndex] + ')' : 'custom text override'}`);
  console.log(`[generateRoomContent] Selection reason: ${promptSelectionReason}`);
  console.log(`[generateRoomContent] Prompt preview: ${imagePrompt.substring(0, 100)}...`);
  
  // Validate topology matches expected patterns
  if (selectedPromptIndex !== null && selectedPromptIndex === calculatedIndex) {
    console.log(`[generateRoomContent] ✓ Prompt index matches calculated topology`);
  } else if (selectedPromptIndex !== null && selectedPromptIndex !== calculatedIndex) {
    console.log(`[generateRoomContent] ⚠ Prompt index (${selectedPromptIndex}) differs from calculated (${calculatedIndex}) - ${promptSelectionReason === 'manual-prompt-index-override' ? 'using manual override' : 'check topology calculation'}`);
  }
  
  // Inject monster description into prompt ONLY if custom prompt exists
  // If no custom prompt is set, don't inject any monster description
  if (monster && node.type === 'COMBAT') {
    // Calculate topology index to get the right pool
    // CRITICAL: Use selectedPromptIndex if available (respects manual overrides), otherwise use calculatedIndex
    const topologyIndexForMonster = selectedPromptIndex !== null ? selectedPromptIndex : calculatedIndex;
    const { getMonsterPrompt } = useDungeonStore.getState();
    if (getMonsterPrompt) {
      // Use effective entry direction (may be overridden manually)
      console.log(`[generateRoomContent] === MONSTER PROMPT RETRIEVAL ===`);
      console.log(`[generateRoomContent] Monster: ${monster.name} (id: ${monster.id})`);
      console.log(`[generateRoomContent] Calculated topology index: ${calculatedIndex} (${PROMPT_ARCHETYPE_NAMES[calculatedIndex]})`);
      console.log(`[generateRoomContent] Selected topology index: ${topologyIndexForMonster} (${PROMPT_ARCHETYPE_NAMES[topologyIndexForMonster]}) ${selectedPromptIndex !== null && selectedPromptIndex !== calculatedIndex ? '(using override)' : ''}`);
      console.log(`[generateRoomContent] Entry direction: ${effectiveEntryDirection || 'null'}`);
      console.log(`[generateRoomContent] Base prompt preview: ${imagePrompt.substring(0, 150)}...`);
      
      // #region agent log
      fetch('http://127.0.0.1:7249/ingest/08331948-86a3-4f5f-b660-2645d043da0c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'content.ts:421',message:'generateRoomContent: before getMonsterPrompt',data:{nodeId:node.id,monsterId:monster.id,monsterName:monster.name,calculatedIndex,selectedPromptIndex,topologyIndexForMonster,effectiveEntryDirection,entryDirectionForLookup:effectiveEntryDirection||null},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      
      // Ensure entry direction is explicitly passed (not undefined)
      const entryDirectionForLookup = effectiveEntryDirection !== undefined && effectiveEntryDirection !== null ? effectiveEntryDirection : null;
      const customPrompt = getMonsterPrompt(topologyIndexForMonster, monster.id, entryDirectionForLookup);
      
      // #region agent log
      fetch('http://127.0.0.1:7249/ingest/08331948-86a3-4f5f-b660-2645d043da0c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'content.ts:422',message:'generateRoomContent: after getMonsterPrompt',data:{nodeId:node.id,monsterId:monster.id,topologyIndex:calculatedIndex,effectiveEntryDirection,customPromptFound:!!customPrompt,customPromptLength:customPrompt?.length||0,customPromptPreview:customPrompt?.substring(0,100)||'none',fullPromptText:customPrompt||'none',hasFacingSouth:customPrompt?.toLowerCase().includes('facing south')||false,hasFacingWest:customPrompt?.toLowerCase().includes('facing west')||false},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      
      console.log(`[generateRoomContent] Retrieved custom prompt: ${customPrompt ? `FOUND (length: ${customPrompt.length})` : 'NOT FOUND or empty'}`);
      if (customPrompt) {
        console.log(`[generateRoomContent] Custom prompt preview: ${customPrompt.substring(0, 200)}...`);
      }
      
      if (customPrompt !== null && customPrompt.trim() !== '') {
        // Check if custom prompt is a complete prompt (contains room structure)
        const isCompletePrompt = customPrompt.includes('Grimdark fantasy masterpiece') || 
                                  customPrompt.includes('dungeon corner') ||
                                  customPrompt.includes('stone wall') ||
                                  customPrompt.includes('dungeon chamber') ||
                                  customPrompt.includes('dungeon junction') ||
                                  customPrompt.length > 200; // Heuristic: long prompts are likely complete
        
        // #region agent log
        fetch('http://127.0.0.1:7249/ingest/08331948-86a3-4f5f-b660-2645d043da0c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'content.ts:428',message:'generateRoomContent: prompt detection',data:{nodeId:node.id,monsterId:monster.id,customPromptLength:customPrompt.length,isCompletePrompt,hasGrimdark:customPrompt.includes('Grimdark fantasy masterpiece'),hasDungeonCorner:customPrompt.includes('dungeon corner'),hasStoneWall:customPrompt.includes('stone wall'),hasDungeonChamber:customPrompt.includes('dungeon chamber'),hasDungeonJunction:customPrompt.includes('dungeon junction'),lengthOver200:customPrompt.length>200},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
        // #endregion
        
        console.log(`[generateRoomContent] Prompt detection: isCompletePrompt=${isCompletePrompt}, length=${customPrompt.length}`);
        
        if (isCompletePrompt) {
          // Replace base prompt entirely with custom prompt
          const oldPrompt = imagePrompt;
          imagePrompt = customPrompt.trim();
          // #region agent log
          fetch('http://127.0.0.1:7249/ingest/08331948-86a3-4f5f-b660-2645d043da0c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'content.ts:439',message:'generateRoomContent: replacing prompt',data:{nodeId:node.id,monsterId:monster.id,oldPromptPreview:oldPrompt.substring(0,100),newPromptPreview:imagePrompt.substring(0,100)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
          // #endregion
          console.log(`[generateRoomContent] ✓ REPLACING base prompt with complete custom prompt`);
          console.log(`[generateRoomContent] Final prompt preview: ${imagePrompt.substring(0, 250)}...`);
        } else {
          // Append as monster description (short prompt)
          const oldPrompt = imagePrompt;
          imagePrompt = imagePrompt.trim();
          const monsterText = ` STANDING IN THE CENTER of the room is ${customPrompt}. It looks hostile.`;
          imagePrompt = imagePrompt + monsterText;
          // #region agent log
          fetch('http://127.0.0.1:7249/ingest/08331948-86a3-4f5f-b660-2645d043da0c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'content.ts:446',message:'generateRoomContent: appending prompt',data:{nodeId:node.id,monsterId:monster.id,oldPromptPreview:oldPrompt.substring(0,100),newPromptPreview:imagePrompt.substring(0,150)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
          // #endregion
          console.log(`[generateRoomContent] ✓ APPENDING custom monster description to base prompt`);
          console.log(`[generateRoomContent] Final prompt preview: ${imagePrompt.substring(0, 250)}...`);
        }
      } else {
        // No custom prompt set - inject monster's visual description into base prompt
        if (monster.visualDescription) {
          const monsterText = ` STANDING IN THE CENTER of the room is ${monster.visualDescription}. It looks hostile.`;
          imagePrompt = imagePrompt.trim() + monsterText;
          console.log(`[generateRoomContent] No custom prompt set - injecting monster visual description into base prompt`);
          console.log(`[generateRoomContent] Monster description: ${monster.visualDescription.substring(0, 100)}...`);
          console.log(`[generateRoomContent] Final prompt preview: ${imagePrompt.substring(0, 250)}...`);
        } else {
          console.log(`[generateRoomContent] No custom prompt set and no visual description available - using base prompt only`);
        }
      }
      console.log(`[generateRoomContent] === END MONSTER PROMPT RETRIEVAL ===`);
    }
  }

  // #region agent log
  fetch('http://127.0.0.1:7249/ingest/08331948-86a3-4f5f-b660-2645d043da0c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'content.ts:457',message:'generateRoomContent: final prompt before image generation',data:{nodeId:node.id,monsterId:monster?.id,monsterName:monster?.name,finalPromptLength:imagePrompt.length,finalPromptPreview:imagePrompt.substring(0,200),hasSkeleton:imagePrompt.toLowerCase().includes('skeleton'),hasFacingSouth:imagePrompt.toLowerCase().includes('facing south')||imagePrompt.toLowerCase().includes('faces south'),hasFacingWest:imagePrompt.toLowerCase().includes('facing west')||imagePrompt.toLowerCase().includes('faces west')},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
  // #endregion

  console.log(`[generateRoomContent] Starting image generation for node ${node.id}`);
  console.log(`[generateRoomContent] Prompt length: ${imagePrompt.length} characters`);
  console.log(`[generateRoomContent] Prompt preview: ${imagePrompt.substring(0, 150)}...`);
  
  // Generate image - use segmentation for combat rooms
  let imageUrl: string | null = null;
  let segmentedMonsterUrl: string | undefined = undefined;
  
  const isCombatRoom = node.type === 'COMBAT';
  
  try {
    if (isCombatRoom) {
      console.log(`[generateRoomContent] Combat room detected - using segmentation-enabled generation`);
      // Check if we're on client-side (need to use API route) or server-side (direct call)
      if (typeof window !== 'undefined') {
        // Client-side: use API route
        console.log(`[generateRoomContent] Client-side: calling API route with isCombatRoom flag`);
        const response = await fetch('/api/generate-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: imagePrompt,
            negativePrompt: negativePrompt,
            aspectRatio: 'square',
            size: '1024',
            isCombatRoom: true,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to generate combat room image');
        }

        const result = await response.json();
        
        if (result.imageUrl) {
          // Prefer backgroundUrl (node #83) if available, otherwise use imageUrl (node #9)
          imageUrl = result.backgroundUrl || result.imageUrl;
          segmentedMonsterUrl = result.segmentedUrl || undefined;
          if (result.backgroundUrl) {
            console.log(`[generateRoomContent] ✓ Using background image from node #83 (monster removed)`);
          } else {
            console.log(`[generateRoomContent] Using fallback image from node #9`);
          }
          if (segmentedMonsterUrl) {
            console.log(`[generateRoomContent] ✓✓✓ SEGMENTED MONSTER URL GENERATED ✓✓✓`);
            console.log(`[generateRoomContent] Segmented URL: ${segmentedMonsterUrl.substring(0, 100)}...`);
            console.log(`[generateRoomContent] Full segmented URL length: ${segmentedMonsterUrl.length}`);
            console.log(`[generateRoomContent] Type check - segmentedMonsterUrl is string: ${typeof segmentedMonsterUrl === 'string'}`);
          } else {
            console.warn(`[generateRoomContent] ⚠ Segmentation workflow completed but no segmented URL returned`);
            console.warn(`[generateRoomContent] API result keys: ${Object.keys(result).join(', ')}`);
            console.warn(`[generateRoomContent] result.segmentedUrl value: ${result.segmentedUrl}`);
            console.warn(`[generateRoomContent] result.segmentedUrl type: ${typeof result.segmentedUrl}`);
          }
        } else {
          // Fallback to regular generation if segmentation fails
          console.warn(`[generateRoomContent] Combat room image generation failed, falling back to regular generation`);
          imageUrl = await generateImage({
            prompt: imagePrompt,
            negativePrompt: negativePrompt,
            aspectRatio: 'square',
            size: '1024',
          });
        }
      } else {
        // Server-side: call generateImageWithSegmentation directly
        console.log(`[generateRoomContent] Server-side: calling generateImageWithSegmentation directly`);
        const { generateImageWithSegmentation } = await import('@/lib/ai/comfyui-images');
        const result = await generateImageWithSegmentation(
          imagePrompt,
          true, // isCombatRoom
          'square'
        );
        
        if (result && result.imageUrl) {
          // Prefer backgroundUrl (node #83) if available, otherwise use imageUrl (node #9)
          imageUrl = result.backgroundUrl || result.imageUrl;
          segmentedMonsterUrl = result.segmentedUrl || undefined;
          if (result.backgroundUrl) {
            console.log(`[generateRoomContent] ✓ Using background image from node #83 (monster removed)`);
          } else {
            console.log(`[generateRoomContent] Using fallback image from node #9`);
          }
          if (segmentedMonsterUrl) {
            console.log(`[generateRoomContent] ✓✓✓ SEGMENTED MONSTER URL GENERATED ✓✓✓`);
            console.log(`[generateRoomContent] Segmented URL: ${segmentedMonsterUrl.substring(0, 100)}...`);
            console.log(`[generateRoomContent] Full segmented URL length: ${segmentedMonsterUrl.length}`);
            console.log(`[generateRoomContent] Type check - segmentedMonsterUrl is string: ${typeof segmentedMonsterUrl === 'string'}`);
          } else {
            console.warn(`[generateRoomContent] ⚠ Segmentation workflow completed but no segmented URL returned`);
            console.warn(`[generateRoomContent] Result keys: ${Object.keys(result || {}).join(', ')}`);
            console.warn(`[generateRoomContent] result.segmentedUrl value: ${result.segmentedUrl}`);
            console.warn(`[generateRoomContent] result.segmentedUrl type: ${typeof result.segmentedUrl}`);
          }
        } else {
          // Fallback to regular generation if segmentation fails
          console.warn(`[generateRoomContent] Segmentation generation failed or returned no image, falling back to regular generation`);
          imageUrl = await generateImage({
            prompt: imagePrompt,
            negativePrompt: negativePrompt,
            aspectRatio: 'square',
            size: '1024',
          });
        }
      }
    } else {
      imageUrl = await generateImage({
        prompt: imagePrompt,
        negativePrompt: negativePrompt,
        aspectRatio: 'square',
        size: '1024',
      });
    }
  } catch (error) {
    console.error(`[generateRoomContent] ❌ ERROR during image generation for node ${node.id}:`, error);
    if (error instanceof Error) {
      console.error(`[generateRoomContent] Error message: ${error.message}`);
      console.error(`[generateRoomContent] Error stack: ${error.stack}`);
    }
    imageUrl = null;
    segmentedMonsterUrl = undefined;
  }
  
  console.log(`[generateRoomContent] Image generation completed for node ${node.id}: ${imageUrl ? 'SUCCESS' : 'FAILED'}`);
  if (imageUrl) {
    console.log(`[generateRoomContent] ✓ Image URL: ${imageUrl.substring(0, 80)}...`);
  } else {
    console.error(`[generateRoomContent] ❌ Image generation returned null/empty for node ${node.id}`);
    console.error(`[generateRoomContent] This will result in content being saved without an imageUrl, which will trigger regeneration on next visit`);
  }
  
  // Create basic movement choices from exits
  const availableChoices: Choice[] = [];
  if (validExits.north) {
    availableChoices.push({
      id: `move-north-${node.id}`,
      text: '[NORTH] Go North',
              actionPoints: 1,
      type: 'action',
      metadata: { direction: 'north' },
    });
  }
  if (validExits.south) {
    availableChoices.push({
      id: `move-south-${node.id}`,
      text: '[SOUTH] Go South',
      actionPoints: 1,
      type: 'action',
      metadata: { direction: 'south' },
    });
  }
  if (validExits.east) {
    availableChoices.push({
      id: `move-east-${node.id}`,
      text: '[EAST] Go East',
      actionPoints: 1,
      type: 'action',
      metadata: { direction: 'east' },
    });
  }
  if (validExits.west) {
    availableChoices.push({
      id: `move-west-${node.id}`,
      text: '[WEST] Go West',
      actionPoints: 1,
      type: 'action',
      metadata: { direction: 'west' },
    });
  }

  // Return content - caller should validate imageUrl before saving
  // If imageUrl is empty, caller should not save this content to avoid incomplete cache
  // Ensure segmentedMonsterUrl is a string or undefined (not null)
  const finalSegmentedUrl = segmentedMonsterUrl && typeof segmentedMonsterUrl === 'string' ? segmentedMonsterUrl : undefined;
  
  const result = {
    description: `You are in a ${node.type} room.`,
    imageUrl: imageUrl || '',
    availableChoices: availableChoices,
    isExplored: true,
    entities: monster ? [monster.name] : [],
    imagePrompt: imagePrompt, // Save prompt for potential re-segmentation
    segmentedMonsterUrl: finalSegmentedUrl, // Save segmented monster URL if available (must be string)
  };
  
  // Log detailed information about the result
  console.log(`[generateRoomContent] ====== FINAL RESULT FOR NODE ${node.id} ======`);
  console.log(`[generateRoomContent] Has imageUrl: ${!!result.imageUrl}`);
  console.log(`[generateRoomContent] Has segmentedMonsterUrl: ${!!result.segmentedMonsterUrl}`);
  if (result.segmentedMonsterUrl) {
    console.log(`[generateRoomContent] Segmented URL: ${result.segmentedMonsterUrl.substring(0, 100)}...`);
  }
  console.log(`[generateRoomContent] Image prompt saved: ${!!result.imagePrompt}`);
  console.log(`[generateRoomContent] ===========================================`);
  
  // Log warning if image generation failed
  if (!imageUrl) {
    console.warn(`[generateRoomContent] ⚠ Returning content without imageUrl for node ${node.id} - caller should not save this to cache`);
  }
  
  return result;
}

