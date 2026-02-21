import { NextRequest } from 'next/server';
import { ConnectionType } from '@/lib/dungeon/types';
import { buildVisualContextString, ExitInfo } from '@/lib/dungeon/images';

/**
 * Maps ConnectionType to descriptive visual strings for prompts
 */
function getConnectionTypeDescription(connectionType: string): string {
  // If it's already a descriptive string, return it
  if (connectionType.includes(' ') || connectionType.includes('_')) {
    // Check if it's a ConnectionType enum value
    const typeMap: Record<string, string> = {
      'arched_stone': 'arched stone passageway',
      'heavy_door': 'heavy wooden door',
      'iron_bars': 'iron-barred gate',
      'collapsed_hole': 'collapsed hole in the wall',
      'grand_double_doors': 'grand double doors',
    };
    
    if (typeMap[connectionType]) {
      return typeMap[connectionType];
    }
    
    // Already a descriptive string, return as-is
    return connectionType;
  }
  
  // Default mapping for ConnectionType enum values
  const typeMap: Record<string, string> = {
    'arched_stone': 'arched stone passageway',
    'heavy_door': 'heavy wooden door',
    'iron_bars': 'iron-barred gate',
    'collapsed_hole': 'collapsed hole in the wall',
    'grand_double_doors': 'grand double doors',
  };
  
  return typeMap[connectionType] || connectionType;
}

/**
 * Construct deterministic visual prompt using Three-Lane Composition algorithm
 * Ensures image geometry strictly matches map topology with Fixed North perspective
 * Uses specific visual descriptors for each exit to maintain visual continuity
 * Now supports monster injection in the center
 */
function constructVisualPrompt(
  northExitVisual: string,
  eastExitVisual: string,
  westExitVisual: string,
  southExitVisual: string,
  biome: string,
  monsterDescription?: string | null
): string {
  // Base: Start with wide-angle interior view
  let prompt = `Wide-angle interior view of a ${biome.toLowerCase()}. `;
  
  // Left Lane (West) - use connection type description
  if (westExitVisual !== 'none') {
    const westDesc = getConnectionTypeDescription(westExitVisual);
    prompt += `To the LEFT, a ${westDesc} leads to the next chamber. `;
  } else {
    prompt += 'The LEFT wall is solid and impenetrable. ';
  }
  
  // Center Lane (North) - use connection type description
  if (northExitVisual !== 'none') {
    const northDesc = getConnectionTypeDescription(northExitVisual);
    prompt += `DIRECTLY AHEAD, a ${northDesc} opens into the corridor. `;
  } else {
    prompt += 'DIRECTLY AHEAD, the room ends at a solid wall. ';
  }
  
  // Right Lane (East) - use connection type description
  if (eastExitVisual !== 'none') {
    const eastDesc = getConnectionTypeDescription(eastExitVisual);
    prompt += `To the RIGHT, a ${eastDesc} stands ready. `;
  } else {
    prompt += 'The RIGHT wall is unbroken stone. ';
  }
  
  // South (retreat path) - mentioned if present, use connection type description
  if (southExitVisual !== 'none') {
    const southDesc = getConnectionTypeDescription(southExitVisual);
    prompt += `Behind you, a ${southDesc} marks the way you came. `;
  }
  
  // Monster injection (if present) - placed in center to avoid wall merging
  if (monsterDescription) {
    prompt += `STANDING IN THE CENTER of the room is ${monsterDescription}. It looks hostile. `;
  } else {
    prompt += 'The room is empty and silent. ';
  }
  
  // Atmosphere: Biome-specific details
  const atmosphereDetails: Record<string, string> = {
    'Dungeon': 'Damp stone walls, flickering torchlight casting long shadows, moss growing in cracks.',
    'Cave': 'Rough-hewn rock walls, stalactites dripping water, dim natural light filtering through.',
    'Temple': 'Polished stone surfaces, ornate carvings, braziers with sacred flames.',
    'Crypt': 'Ancient stone sarcophagi, dust motes in the air, cold and silent.',
    'Forest': 'Earthen walls with tree roots, dappled sunlight, the smell of damp earth.',
  };
  
  const atmosphere = atmosphereDetails[biome] || atmosphereDetails['Dungeon'];
  prompt += atmosphere;
  
  return prompt;
}

/**
 * Streaming story generation API route
 * Uses Gemini Flash for speed and returns streaming text response
 * Format: [Visual Subject] ||| [Narrative Story]
 */
export async function POST(request: NextRequest) {
  try {
    // #region agent log
    const fs = require('fs');
    const logPath = 'c:\\Projects\\Api Game\\.cursor\\debug.log';
    const logEntry = JSON.stringify({location:'generate-story/route.ts:POST',message:'POST /api/generate-story called',data:{timestamp:Date.now()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})+'\n';
    try { fs.appendFileSync(logPath, logEntry); } catch(e) {}
    // #endregion
    const body = await request.json();
    const { prompt, previousContext, storyHistory, validExits, hasNorth, hasEast, hasWest, hasSouth, northExitVisual, eastExitVisual, westExitVisual, southExitVisual, nodeType, biome, isCorridor, monsterDescription, entryDirection } = body;

    if (!prompt) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: prompt' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Handle storyHistory (array of previous narrative paragraphs)
    const historyArray = Array.isArray(storyHistory) ? storyHistory : [];
    const historyText = historyArray.length > 0 
      ? historyArray.join('\n\n')
      : '';

    // Handle validExits (array of {direction: 'NORTH'|'SOUTH'|'EAST'|'WEST', targetId, visualType} objects)
    const exitsArray = Array.isArray(validExits) ? validExits : [];
    const exitDirections = exitsArray.map((e: any) => e.direction || '').filter(Boolean);
    const nodeTypeValue = nodeType || 'normal';
    const biomeValue = biome || 'Dungeon';
    
    // Get visual descriptors from request (preferred) or extract from validExits (fallback)
    const exitVisuals = {
      northExitVisual: northExitVisual ?? exitsArray.find((e: any) => e.direction === 'NORTH')?.visualType ?? 'none',
      eastExitVisual: eastExitVisual ?? exitsArray.find((e: any) => e.direction === 'EAST')?.visualType ?? 'none',
      westExitVisual: westExitVisual ?? exitsArray.find((e: any) => e.direction === 'WEST')?.visualType ?? 'none',
      southExitVisual: southExitVisual ?? exitsArray.find((e: any) => e.direction === 'SOUTH')?.visualType ?? 'none',
    };
    
    // Get exit flags for system prompt (backward compatibility)
    const exitFlags = {
      hasNorth: hasNorth ?? exitDirections.includes('NORTH'),
      hasEast: hasEast ?? exitDirections.includes('EAST'),
      hasWest: hasWest ?? exitDirections.includes('WEST'),
      hasSouth: hasSouth ?? exitDirections.includes('SOUTH'),
    };
    
    // Extract exit visual types for system prompt enforcement
    const exitDefinitions: Record<string, string> = {};
    exitsArray.forEach((exit: any) => {
      if (exit.direction && exit.visualType) {
        exitDefinitions[exit.direction] = exit.visualType;
      }
    });
    
    // Build ExitInfo array from validExits for visual context generation
    const exitInfos: ExitInfo[] = exitsArray
      .filter((exit: any) => exit.direction && exit.visualType)
      .map((exit: any) => ({
        direction: exit.direction.toLowerCase() as 'north' | 'south' | 'east' | 'west',
        visualType: exit.visualType as ConnectionType,
        relativePosition: '', // Will be calculated in buildVisualContextString
      }));
    
    // Determine entry connection type (if we have entry direction)
    let entryConnectionType: ConnectionType | null = null;
    if (entryDirection) {
      const entryExit = exitsArray.find((e: any) => 
        e.direction && e.direction.toLowerCase() === entryDirection.toLowerCase()
      );
      if (entryExit && entryExit.visualType) {
        entryConnectionType = entryExit.visualType as ConnectionType;
      }
    }
    
    // Generate shared visual context string using the same logic as image generator
    const visualContextString = buildVisualContextString(
      exitInfos,
      entryDirection || null,
      entryConnectionType
    );
    
    console.log('[API] Visual context string:', visualContextString);
    
    // Keep old constructVisualPrompt for backward compatibility (used in header)
    const deterministicImagePrompt = constructVisualPrompt(
      exitVisuals.northExitVisual,
      exitVisuals.eastExitVisual,
      exitVisuals.westExitVisual,
      exitVisuals.southExitVisual,
      biomeValue,
      monsterDescription
    );
    
    console.log('[API] Deterministic image prompt (legacy):', deterministicImagePrompt);
    
    // Note: Visual geometry is now determined programmatically via constructVisualPrompt
    // The deterministic prompt is used for image generation, not for LLM story generation

    // Sensory Roulette: Randomly select a sensory focus to force variety
    const sensoryFocuses = [
      "SOUND (creaking, dripping, whispering)",
      "TEMPERATURE (freezing, humid, drafty)",
      "TEXTURE (slick, rough, crumbling)",
      "SMELL (metallic, ozone, rot)",
      "LIGHTING (shadows, flickering, pitch black)"
    ];
    
    // Pick one randomly for this generation
    const currentFocus = sensoryFocuses[Math.floor(Math.random() * sensoryFocuses.length)];
    console.log('[API] Selected sensory focus:', currentFocus);

    // Get OpenRouter API key
    const apiKeyToUse = process.env.NEXT_PUBLIC_OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY;

    if (!apiKeyToUse) {
      return new Response(
        JSON.stringify({ error: 'API key not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Build system prompt with few-shot examples (positive reinforcement)
    const systemPrompt = `You are the Narrator for a gritty, dark fantasy RPG. Your writing style is visceral, concise, and grounded.

STYLE RULES:

1. **Show, Don't Tell:** Never describe the "air," "atmosphere," or "feeling." Describe the physical evidence.
   - BAD: "The air was heavy with fear."
   - GOOD: "Your breath mists in the cold. Condensation drips from the iron bars."

2. **Active Voice:** Avoid passive observation ("You see a chest"). Use active interaction ("A chest rots in the corner").

3. **Sensory Focus:** You will be given a specific sense to focus on (Sound, Smell, etc.). Lean into it.

VISUAL FIDELITY RULE:

You are acting as the "Eyes" of the player. You must describe the scene EXACTLY as defined in the visual layout below.

STRICT VISUAL LAYOUT (YOU MUST ADHERE TO THIS EXACTLY):
${visualContextString}

CRITICAL: You MUST strictly adhere to this visual layout. Do not invent exits or features that contradict this. If the layout says "The wall to your right is solid, unbroken damp stone", you MUST NOT describe any door, window, or opening on the right. If it says "To your left is a heavy wooden door", you MUST describe a wooden door (not an archway or gate) on the left.

STRICT CONSTRAINTS:
- If the visuals say "Stone Walls", do NOT describe "Pipes", "Machinery", "Metal", or "Industrial" elements.
- If the visuals say "Torches", do NOT describe "Electric Lights", "Glowing Crystals", or modern lighting.
- If the visuals say "Wooden Door", do NOT describe "Iron Gate" or "Stone Archway".
- If the visuals say "Damp Stone", do NOT describe "Dry Concrete" or "Polished Marble".

MATERIAL CONSISTENCY RULE:
Your narrative description must match the materials and objects described in the visual layout. If the visual shows stone walls, do NOT mention wooden beams, metal pipes, or other materials not present. Ensure your descriptions are logically consistent - a stone corridor should not have wooden structural elements unless explicitly mentioned in the visual layout. Read the visual layout carefully and describe ONLY what is physically present. Do not invent materials, objects, or architectural features.

You may add atmospheric sensations (cold, smell, sound) that MATCH the visual setting, but you must NOT invent physical objects or materials not present in the visual description.

Examples:
- Visuals: "Stone walls, torchlight, wooden door"
- CORRECT: "The torchlight flickers across rough-hewn stone. A wooden door creaks in the draft."
- WRONG: "Rusted pipes line the walls. The machinery hums with electricity."

- Visuals: "Stone corridor, damp stone walls"
- CORRECT: "The rough-hewn stone walls press in on you. Water drips from cracks in the ceiling."
- WRONG: "Creaking wooden beams echo overhead. The timber supports groan under the weight."

GEOMETRY CONTEXT:

You are describing a room where the user is facing NORTH. The exits are exactly as defined:
- North: ${exitFlags.hasNorth ? 'OPEN' : 'BLOCKED'}
- East: ${exitFlags.hasEast ? 'OPEN' : 'BLOCKED'}
- West: ${exitFlags.hasWest ? 'OPEN' : 'BLOCKED'}
- South: ${exitFlags.hasSouth ? 'OPEN (retreat path)' : 'BLOCKED'}

The visual geometry has been determined programmatically. Your narrative should match this geometry exactly. Do not describe exits that are BLOCKED as open, and do not ignore exits that are OPEN.

EXIT DEFINITIONS:

The following exits are available and their specific visual types:
${exitFlags.hasNorth ? `- NORTH Exit is a: ${exitDefinitions['NORTH'] || 'passage'}` : '- NORTH: BLOCKED (solid wall)'}
${exitFlags.hasEast ? `- EAST Exit is a: ${exitDefinitions['EAST'] || 'passage'}` : '- EAST: BLOCKED (solid wall)'}
${exitFlags.hasWest ? `- WEST Exit is a: ${exitDefinitions['WEST'] || 'passage'}` : '- WEST: BLOCKED (solid wall)'}
${exitFlags.hasSouth ? `- SOUTH Exit is a: ${exitDefinitions['SOUTH'] || 'passage'} (retreat path)` : '- SOUTH: BLOCKED (solid wall)'}

CONSTRAINT: When writing Choice Button text, you MUST describe the specific exit type defined above.
- If North is 'reinforced wooden door', button must say: '[NORTH] Open the heavy door...' or '[NORTH] Push through the reinforced door...'
- If North is 'open stone archway', button must say: '[NORTH] Step through the archway...' or '[NORTH] Pass through the stone arch...'
- If North is 'rusted iron gate', button must say: '[NORTH] Approach the iron gate...' or '[NORTH] Push through the rusted gate...'
- If North is 'jagged hole in the wall', button must say: '[NORTH] Squeeze through the hole...' or '[NORTH] Crawl through the opening...'
- If North is 'ornate double doors', button must say: '[NORTH] Open the ornate doors...' or '[NORTH] Push through the double doors...'

The exit type in your choice text MUST match the exit type defined above. Do not describe a door as an archway, or an archway as a door.

VISUAL PROMPT RULES:

You must describe an INTERIOR scene. Never describe an isolated object.

Topology: You MUST match the geometry context above exactly.

Corridors: If this is a corridor, describe it as a long, narrow passage. Do not make it a square room.

CHOICE LABEL RULES:

CRITICAL RULE: You are provided a list of validExits with cardinal directions. You MUST generate exactly one navigation choice for each exit in that list.
You MUST NOT generate choices for directions NOT in the list.
If validExits does not contain 'WEST', you must describe the West wall as solid/blocked. Same applies to NORTH, SOUTH, and EAST.

CHOICE FORMAT: [DIRECTION] <Immersive Action Phrase>

Each choice MUST start with a directional label in brackets: [NORTH], [SOUTH], [EAST], or [WEST].
After the bracket, provide an immersive, descriptive action phrase that matches the dark fantasy tone.

CRITICAL: The action phrase MUST reference the specific exit type from the EXIT DEFINITIONS above.
- If the exit is a door (e.g., 'reinforced wooden door'), use verbs like "Open", "Push through", "Force open", "Unbar"
- If the exit is an archway (e.g., 'open stone archway'), use verbs like "Step through", "Pass through", "Enter through", "Walk beneath"
- If the exit is a gate (e.g., 'rusted iron gate'), use verbs like "Approach", "Push through", "Unlock", "Force open"
- If the exit is a hole (e.g., 'jagged hole in the wall'), use verbs like "Squeeze through", "Crawl through", "Climb through", "Wriggle through"
- If the exit is double doors (e.g., 'ornate double doors'), use verbs like "Open", "Push through", "Enter through", "Unbar"

Examples matching exit types:
- Exit type: 'reinforced wooden door' → "[NORTH] Push through the heavy wooden door into the darkness"
- Exit type: 'open stone archway' → "[NORTH] Step through the mossy archway into the corridor"
- Exit type: 'rusted iron gate' → "[NORTH] Approach the rusted iron gate and force it open"
- Exit type: 'jagged hole in the wall' → "[NORTH] Squeeze through the jagged opening in the stone"
- Exit type: 'ornate double doors' → "[NORTH] Push open the ornate double doors"

Bad examples (generic or mismatched):
- Bad: "[NORTH] Go North" (too generic)
- Bad: "[NORTH] Step through the archway" when exit is actually a 'reinforced wooden door' (mismatched type)
- Bad: "Step through the archway." (missing direction tag)

Do NOT use generic phrases like "Go North" or "Head East". Be specific and atmospheric. Describe the action the player takes, matching the exact exit type defined in EXIT DEFINITIONS.

Only generate choices for the exits provided in validExits. Do not hallucinate exits.

Valid exits: ${exitDirections.join(', ') || 'NONE (Dead End)'}

EXAMPLES (Mimic this style):

<Bad_Generic_Output>
You enter a dark room. The air is heavy with mildew. You see a goblin standing there. Exits are north and south.
</Bad_Generic_Output>

<Good_Immersive_Output>
You step into the chamber. The stone floor is slick with slime, nearly sending you sprawling. A rhythmic *drip-drip-drip* echoes from the darkness above, drowning out your own footsteps. In the center, a rusted iron cage swings gently, though there is no wind. Inside, a Goblin sharpens a jagged bone shiv against the bars.

**Exits:**
- [NORTH] Continue north through the archway
- [EAST] Approach the cage
</Good_Immersive_Output>

<Bad_Generic_Output>
You stand in a corridor. It is very quiet. Faint light comes from ahead.
</Bad_Generic_Output>

<Bad_Material_Mismatch>
You proceed down the narrow corridor. Creaking wooden beams and scuttling sounds echo off rough-hewn blocks.
</Bad_Material_Mismatch>
<Note>WRONG: This describes "wooden beams" in a stone corridor. If the visual shows stone walls, the narrative must describe stone, not wood.</Note>

<Good_Immersive_Output>
Dust motes dance in the beam of your torch. The walls here are narrow, pressing in on your shoulders. Deep, parallel gouges mar the limestone at waist height—something with claws passed this way recently. A draft chills the sweat on your neck, carrying the metallic tang of old blood.

**Exits:**
- [NORTH] Continue north through the corridor
- [SOUTH] Retreat south the way you came
</Good_Immersive_Output>

Example Visual Output:
'First-person view inside a narrow stone corridor. To the north, the hall continues into torchlight. To the west, an archway leads to another passage. Damp stone floor, low ceiling.'

VISUAL FIDELITY EXAMPLE:

<Visual_Scene>
"Wide-angle interior view of a dungeon. To the LEFT, an open stone archway leads to the next chamber. DIRECTLY AHEAD, a reinforced wooden door opens into the corridor. Damp stone walls, flickering torchlight casting long shadows, moss growing in cracks."
</Visual_Scene>

<Correct_Narrative>
The torchlight flickers across damp stone walls. Moss clings to the cracks between rough-hewn blocks. To your left, an open stone archway reveals another passage. Ahead, a reinforced wooden door stands slightly ajar, its iron bands catching the torch's glow.
</Correct_Narrative>

<Wrong_Narrative>
Rusted pipes line the metal walls. The machinery hums with electricity. An iron gate blocks the way forward.
</Wrong_Narrative>

The CORRECT narrative matches the visual scene exactly: stone walls, torchlight, stone archway, wooden door. The WRONG narrative invents objects (pipes, machinery, iron gate) not present in the visual description.

STRICT RESPONSE FORMAT:
[Visual Prompt] ||| [Transition & Description]

RULES for [Visual Prompt]:
- Must describe the PHYSICAL SCENE only.
- Must match the [Description] exactly.
- Max 15 words.
- NO art style tags (no "dark fantasy", "gothic", etc.)
- Focus on what is physically present

RULES for [Transition & Description]:
- START by acknowledging the action: "You head West..." or "You open the chest..." or "You step North..."
- DESCRIBE the new environment immediately after the transition.
- Maintain dark fantasy tone (Bloodborne, Dark Souls aesthetic).
- END with 2-3 clear, bolded exit options in this format:

**Exits:**
- [Immersive choice text for direction/action]
- [Immersive choice text for direction/action]

STRICT WORD LIMIT: Your narrative description (the part after |||, before the **Exits:** section) must be exactly 15-20 words. Count carefully. Do not exceed 20 words. This is a hard limit.

VARIETY REQUIREMENTS:
- Each room must feel DISTINCTLY different from previous rooms. Avoid repeating phrases like "damp stone walls", "cold air", "flickering torchlight", or "pressing in on you".
- Rotate your sensory focus: sometimes emphasize sound, sometimes smell, sometimes texture, sometimes a unique visual detail.
- Each room should have ONE unique, memorable detail that distinguishes it from others.
- If there's a monster, focus on it briefly. If it's a treasure room, highlight the treasure. If it's a dead end, emphasize the claustrophobia.
- Use varied synonyms: instead of "damp stone", try "rough-hewn blocks", "cracked masonry", "weathered rock", or "moss-covered walls".

TASK: Write the next scene. No clichés. No "air is heavy". Keep it concise and unique.`;

    // Construct user message with explicit player action, history, and sensory focus
    const playerAction = typeof prompt === 'string' 
      ? prompt 
      : JSON.stringify(prompt);
    
    let userPrompt = `The player just performed this action: "${playerAction}"

Previous Room Context: ${previousContext || 'the entrance'}

Focus primarily on: ${currentFocus}.`;

    // Inject history if available
    if (historyText) {
      userPrompt += `

RECENT NARRATIVE HISTORY:

${historyText}

CRITICAL VARIETY REQUIREMENT: Compare your description to the recent history above. Your description must be DISTINCTLY different. 
- Avoid repeating the same sensory details, wall descriptions, or atmospheric phrases from the history.
- If previous rooms mentioned "damp stone", use different descriptors like "rough-hewn blocks", "cracked masonry", "weathered rock", or "moss-covered walls".
- If previous rooms mentioned "cold air" or "chill", focus on a different sense like sound, texture, or visual detail.
- If previous rooms mentioned "flickering torchlight", describe lighting differently or focus on shadows, darkness, or other visual elements.
- Each room should feel like a NEW, UNIQUE space, not a repetition of previous rooms.

TASK: Write the NEXT part. Make the environment distinct and memorable with unique details not seen in the history above.`;
    }

    // Inject shared visual context string as source of truth
    userPrompt += `

VISUAL LAYOUT (STRICT - DO NOT DEVIATE): ${visualContextString}

CRITICAL: You must describe this EXACT visual layout. The layout above is the authoritative source - your narrative must match it precisely. Do not add exits, doors, or openings that are not described above. If a wall is described as "solid, unbroken damp stone", it has NO openings.

MATERIAL CONSISTENCY: Your narrative must describe ONLY the materials, objects, and features explicitly mentioned in the visual layout above. Do not add wooden elements to stone rooms, metal pipes to stone corridors, or any other materials not present in the visual description. If the visual says "stone walls", your narrative should describe stone, not wood, metal, or other materials. Ensure logical consistency - a stone corridor should not have wooden structural elements unless explicitly mentioned in the visual layout.`;

    // Add room type and monster context
    const roomTypeContext = nodeTypeValue ? `Room Type: ${nodeTypeValue.toUpperCase()}` : '';
    const corridorContext = isCorridor ? 'This is a CORRIDOR (long, narrow passage) - describe it as such, not as a square room.' : 'This is a ROOM (wider space).';
    const monsterContext = monsterDescription ? `MONSTER PRESENT: ${monsterDescription}. Briefly mention the monster in your description - it's the most important detail in this room.` : 'No monster present. Focus on the environment and atmosphere.';
    
    // Room type specific guidance
    let roomTypeGuidance = '';
    switch (nodeTypeValue?.toLowerCase()) {
      case 'treasure':
        roomTypeGuidance = 'TREASURE ROOM: Highlight the treasure or valuable items. Make it feel rewarding.';
        break;
      case 'boss':
        roomTypeGuidance = 'BOSS ROOM: This is a significant encounter. Emphasize the scale, danger, and importance.';
        break;
      case 'merchant':
        roomTypeGuidance = 'MERCHANT ROOM: Describe the merchant or shop setup. Make it feel like a safe haven.';
        break;
      case 'event':
        roomTypeGuidance = 'EVENT ROOM: Something unusual is happening here. Focus on the unique event or anomaly.';
        break;
      case 'dead_end':
        roomTypeGuidance = 'DEAD END: Emphasize the claustrophobia and finality. No way forward except back.';
        break;
      default:
        roomTypeGuidance = 'NORMAL ROOM: Focus on what makes this particular room unique and memorable.';
    }

    userPrompt += `

CONTEXT:
${roomTypeContext}
${corridorContext}
${monsterContext}
${roomTypeGuidance}
Biome: ${biomeValue}

Generate the next room based on this action. Follow the STRICT RESPONSE FORMAT exactly. Start by acknowledging the player's action, then describe the new environment matching the CURRENT SCENE VISUALS, and end with clear exit options.`;

    console.log('Calling OpenRouter API with model: anthropic/claude-3.5-haiku (streaming)');

    // Call OpenRouter with streaming enabled
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKeyToUse}`,
        'HTTP-Referer': 'https://localhost:3001',
        'X-Title': 'D&D 5e AI RPG',
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3.5-haiku',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        stream: true, // Enable streaming
        temperature: 0.8, // Slightly higher for Claude Haiku's creative writing
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenRouter API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: `OpenRouter API error: ${response.status}` }),
        { status: response.status, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Return streaming response (OpenRouter already returns SSE format)
    // Include deterministic image prompt in custom header for frontend to use
    return new Response(response.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Image-Prompt': encodeURIComponent(deterministicImagePrompt),
      },
    });
  } catch (error) {
    console.error('Error in generate-story API:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate story';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
