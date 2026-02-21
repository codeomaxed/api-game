'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { generateImage } from '@/lib/ai/images';
import { generateImageWithSegmentation } from '@/lib/ai/comfyui-images';
import { buildRoomPrompt } from '@/lib/dungeon/images';
import { Monster } from '@/lib/game/monsters';
import { ConnectionType, DungeonNode } from '@/lib/dungeon/types';
import { useDungeonStore } from '@/lib/dungeon/store';
import { getPromptByIndex, getRelativeExits, getStrictPrompt, PROMPT_ARCHETYPE_NAMES, getRoomTypePromptIndex, ROOM_TYPE_PROMPT_CONFIGS } from '@/lib/dungeon/prompt-logic';

interface UseGameGenerationReturn {
  storyText: string;
  imageUrl: string | null;
  imagePrompt: string | null; // The image prompt used for generation
  isLoading: boolean;
  error: string | null;
  generate: (nodeId: string, prompt: string, previousContext?: string, validExits?: Array<{direction: 'NORTH' | 'SOUTH' | 'EAST' | 'WEST', targetId: string, visualType: string}>, nodeType?: string, biome?: string, isCorridor?: boolean, monster?: Monster | null, entryDirection?: 'north' | 'south' | 'east' | 'west' | null, currentNode?: DungeonNode | null) => Promise<void>;
  reset: () => void;
}

// Updated to match new digital painting style (fallback only - buildRoomPrompt includes this)
const STYLE_SUFFIX = ' 8k resolution, distinct digital painting style, semi-realistic textures, wet stone surfaces, volumetric lighting, deep depth of field, sharp focus everywhere, dark fantasy masterpiece.';

/**
 * Custom hook for "Visuals First, Split-Stream" generation
 * Detects ||| separator mid-stream to trigger ComfyUI image generation immediately
 */
export function useGameGeneration(): UseGameGenerationReturn {
  const [storyText, setStoryText] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imagePrompt, setImagePrompt] = useState<string | null>(null); // Store the image prompt used
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contextHistory, setContextHistory] = useState<string[]>([]);
  const [storyHistory, setStoryHistory] = useState<string[]>([]); // Track last 2-3 narrative paragraphs
  const abortControllerRef = useRef<AbortController | null>(null);
  const isGeneratingRef = useRef<boolean>(false); // Track if generation is in progress
  const currentGeneratingNodeRef = useRef<string | null>(null); // Track which node is being generated
  const { updateRoomContent } = useDungeonStore();
  const storyApiCallInProgressRef = useRef<boolean>(false); // Track if story API call is in progress
  
  // Access nodes and pattern getter from store for grid-based topology calculation
  const nodes = useDungeonStore((state) => state.nodes);
  const getPatternForNode = useDungeonStore((state) => state.getPatternForNode);
  
  // Client-side cache for visited rooms (includes promptIndex for smart cache validation)
  const cache = useRef<Map<string, { story: string, imageUrl: string, promptIndex: number }>>(new Map());

  // ComfyUI doesn't need initialization - it's accessed via HTTP API
  // No initialization needed

  // Track current nodeId and promptIndex for cache saving
  const currentNodeIdRef = useRef<string | null>(null);
  const currentPromptIndexRef = useRef<number | null>(null);

  const generate = useCallback(async (nodeId: string, prompt: string, previousContext?: string, validExits?: Array<{direction: 'NORTH' | 'SOUTH' | 'EAST' | 'WEST', targetId: string, visualType: string}>, nodeType?: string, biome?: string, isCorridor?: boolean, monster?: Monster | null, entryDirection?: 'north' | 'south' | 'east' | 'west' | null, currentNode?: DungeonNode | null) => {
    // STORY GENERATION DISABLED - Return early
    // #region agent log
    fetch('http://127.0.0.1:7249/ingest/08331948-86a3-4f5f-b660-2645d043da0c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'use-game-generation.ts:48',message:'generate() called but STORY GENERATION IS DISABLED - returning early',data:{nodeId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    console.log('[HOOK] Story generation is disabled - generate() called but returning early');
    return; // Story generation disabled
    
    // Guard: Prevent concurrent generation calls
    if (isGeneratingRef.current) {
      if (currentGeneratingNodeRef.current === nodeId) {
        // #region agent log
        fetch('http://127.0.0.1:7249/ingest/08331948-86a3-4f5f-b660-2645d043da0c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'use-game-generation.ts:52',message:'Guard blocked: already generating same node',data:{nodeId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
        // #endregion
        console.log(`[HOOK] Generation already in progress for node ${nodeId}, skipping duplicate call`);
        return; // Already generating for this node
      } else {
        // #region agent log
        fetch('http://127.0.0.1:7249/ingest/08331948-86a3-4f5f-b660-2645d043da0c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'use-game-generation.ts:58',message:'Aborting previous generation for different node',data:{nodeId,previousNode:currentGeneratingNodeRef.current},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
        // #endregion
        console.log(`[HOOK] Generation in progress for different node (${currentGeneratingNodeRef.current}), aborting previous and starting new`);
        // Abort previous generation if it's for a different node
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
      }
    }
    
    // Mark generation as in progress
    isGeneratingRef.current = true;
    currentGeneratingNodeRef.current = nodeId;
    // #region agent log
    fetch('http://127.0.0.1:7249/ingest/08331948-86a3-4f5f-b660-2645d043da0c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'use-game-generation.ts:68',message:'Generation marked as in progress',data:{nodeId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    
    // Extract visual descriptors for each exit direction (needed for promptIndex calculation)
    const northExit = validExits?.find(e => e.direction === 'NORTH');
    const eastExit = validExits?.find(e => e.direction === 'EAST');
    const westExit = validExits?.find(e => e.direction === 'WEST');
    const southExit = validExits?.find(e => e.direction === 'SOUTH');
    
    // Also calculate boolean flags for backward compatibility
    const hasNorth = !!northExit;
    const hasEast = !!eastExit;
    const hasWest = !!westExit;
    const hasSouth = !!southExit;

    // Calculate target promptIndex BEFORE cache check (for smart cache validation)
    let targetPromptIndex: number;
    const pattern = getPatternForNode(nodeId);
    
    if (pattern) {
      // CASE A: Custom Pattern (Merchant, etc)
      targetPromptIndex = pattern.promptIndex;
      console.log(`[HOOK] Pattern found for Node ${nodeId}: "${pattern.name}" (Index ${targetPromptIndex})`);
    } else if (currentNode && validExits && entryDirection !== undefined) {
      // CASE B: Standard Topology - calculate index from relative exits
      // Convert validExits array to Exits object format
      const exits = {
        north: hasNorth,
        south: hasSouth,
        east: hasEast,
        west: hasWest,
      };
      
      // Calculate relative exits using getRelativeExits
      const { hasLeft, hasAhead, hasRight } = getRelativeExits(currentNode, nodes, entryDirection, exits);
      targetPromptIndex = (hasLeft ? 4 : 0) + (hasAhead ? 2 : 0) + (hasRight ? 1 : 0);
      console.log(`[HOOK] No pattern for Node ${nodeId} - calculated topology index: ${targetPromptIndex}`);
    } else {
      // Fallback: default to 0 if we can't calculate
      targetPromptIndex = 0;
      console.log(`[HOOK] Cannot calculate promptIndex for Node ${nodeId}, defaulting to 0`);
    }

    // Smart cache check: validate promptIndex matches before returning cached data
    const cached = cache.current.get(nodeId);
    if (cached && cached.promptIndex === targetPromptIndex) {
      console.log(`[HOOK] Loading from cache for node: ${nodeId} (promptIndex: ${targetPromptIndex} matches)`);
      setStoryText(cached.story);
      setImageUrl(cached.imageUrl);
      setIsLoading(false);
      currentNodeIdRef.current = nodeId;
      currentPromptIndexRef.current = targetPromptIndex;
      // Note: Don't add cached story to history - it's already been added when originally generated
      return; // Early return - no API call needed
    } else if (cached) {
      console.log(`[HOOK] Cache exists but promptIndex mismatch (cached: ${cached.promptIndex}, target: ${targetPromptIndex}) - regenerating`);
    }

    // Check if node already has an image in the store to prevent duplicate generation
    // This will be checked again later before actually generating the image

    // Reset state
    // [IMPORTANT] Clear previous image immediately when starting new generation
    console.log(`[HOOK] generate() called for node: ${nodeId}, prompt length: ${prompt.length}`);
    console.log(`[HOOK] ValidExits:`, validExits, `NodeType:`, nodeType, `Biome:`, biome);
    setStoryText('');
    setImageUrl(null);
    setError(null);
      setIsLoading(true);
    currentNodeIdRef.current = nodeId;
    currentPromptIndexRef.current = targetPromptIndex;

    const northExitVisual = northExit?.visualType || 'none';
    const eastExitVisual = eastExit?.visualType || 'none';
    const westExitVisual = westExit?.visualType || 'none';
    const southExitVisual = southExit?.visualType || 'none';

    // Abort any previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      // Call streaming API
      console.log('[HOOK] Calling /api/generate-story...');
      console.log('[HOOK] Sending story history (last', storyHistory.length, 'entries):', storyHistory);
      console.log('[HOOK] Exit visuals:', { northExitVisual, eastExitVisual, westExitVisual, southExitVisual });
      // Guard: Prevent duplicate story API calls (atomic check-and-set)
      // Use a synchronous check-and-set pattern to prevent race conditions
      if (storyApiCallInProgressRef.current) {
        // #region agent log
        fetch('http://127.0.0.1:7249/ingest/08331948-86a3-4f5f-b660-2645d043da0c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'use-game-generation.ts:174',message:'Guard blocked: story API call already in progress',data:{nodeId,currentFlag:storyApiCallInProgressRef.current},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
        // #endregion
        console.log(`[HOOK] Story API call already in progress for node ${nodeId}, skipping duplicate call`);
        // Reset generation flags since we're aborting
        isGeneratingRef.current = false;
        currentGeneratingNodeRef.current = null;
        return;
      }
      
      // Set flag IMMEDIATELY and synchronously to prevent race condition
      // This must happen before any async operations
      storyApiCallInProgressRef.current = true;
      // #region agent log
      fetch('http://127.0.0.1:7249/ingest/08331948-86a3-4f5f-b660-2645d043da0c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'use-game-generation.ts:186',message:'Story API call flag set to true (atomic)',data:{nodeId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      // #region agent log
      fetch('http://127.0.0.1:7249/ingest/08331948-86a3-4f5f-b660-2645d043da0c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'use-game-generation.ts:180',message:'About to call /api/generate-story',data:{nodeId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      const response = await fetch('/api/generate-story', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          previousContext: previousContext || (contextHistory.length > 0 ? contextHistory[contextHistory.length - 1] : undefined),
          storyHistory: storyHistory, // Send last 2-3 narrative paragraphs
          validExits: validExits || [],
          hasNorth,
          hasEast,
          hasWest,
          hasSouth,
          northExitVisual,
          eastExitVisual,
          westExitVisual,
          southExitVisual,
          nodeType: nodeType || 'normal',
          biome: biome || 'Dungeon',
          isCorridor: isCorridor ?? false,
          entryDirection: entryDirection || null,
        }),
        signal: abortControllerRef.current.signal,
      });

      console.log('[HOOK] Response status:', response.status, response.ok);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate story');
      }

      // Generate image prompt using buildRoomPrompt (deterministic) for all nodes with valid exits
      // Only fall back to extracted prompt if buildRoomPrompt can't be used
      let fullImagePrompt: string | null = null;
      let fullImageNegativePrompt: string | null = null;
      let imageAlreadyGenerated = false;
      
      // Use buildRoomPrompt if we have validExits and nodeType (monster can be null or undefined)
      if (validExits && nodeType) {
        // Use new buildRoomPrompt with dynamic camera framing
        console.log('[HOOK] Using buildRoomPrompt with monster:', monster?.name || 'none');
        
        // Map nodeType to room type description
        const roomTypeMap: Record<string, string> = {
          'start': 'dungeon entrance',
          'boss': 'boss chamber',
          'treasure': 'treasure room',
          'merchant': 'hidden merchant room',
          'event': 'event room',
          'dead_end': 'dead end room',
          'normal': 'dungeon room',
        };
        const roomTypeDesc = roomTypeMap[nodeType.toLowerCase()] || 'dungeon room';
        
        // Calculate relative exits (Left/Ahead/Right) based on perspective
        // Determine facing direction from entry direction (opposite of entry)
        let facing: 'NORTH' | 'SOUTH' | 'EAST' | 'WEST' = 'NORTH';
        if (entryDirection === 'south') facing = 'NORTH';
        else if (entryDirection === 'north') facing = 'SOUTH';
        else if (entryDirection === 'west') facing = 'EAST';
        else if (entryDirection === 'east') facing = 'WEST';

        // Convert validExits array to Exits object format
        const exits = {
          north: hasNorth,
          south: hasSouth,
          east: hasEast,
          west: hasWest,
        };

        // Calculate relative exits based on facing direction (needed for both pattern check and auto-calculation)
        let hasLeft = false;
        let hasAhead = false;
        let hasRight = false;

        if (facing === 'NORTH') {
          hasLeft = exits.west;
          hasAhead = exits.north;
          hasRight = exits.east;
        } else if (facing === 'SOUTH') {
          hasLeft = exits.east;
          hasAhead = exits.south;
          hasRight = exits.west;
        } else if (facing === 'EAST') {
          hasLeft = exits.north;
          hasAhead = exits.east;
          hasRight = exits.south;
        } else if (facing === 'WEST') {
          hasLeft = exits.south;
          hasAhead = exits.west;
          hasRight = exits.north;
        }
        
        // PRIORITY 1: Check for node-specific override (highest priority)
        let nodeOverride: string | null = null;
        if (currentNode && nodeType) {
          // Get exits for the current node
          const exits = {
            north: hasNorth,
            south: hasSouth,
            east: hasEast,
            west: hasWest,
          };
          
          // Create topology key
          const topologyParts: string[] = [];
          if (exits.north) topologyParts.push('N');
          if (exits.south) topologyParts.push('S');
          if (exits.east) topologyParts.push('E');
          if (exits.west) topologyParts.push('W');
          const topologyKey = topologyParts.length > 0 ? topologyParts.join('+') : 'None';
          const compositeKey = `${nodeType.toUpperCase()}:${topologyKey}`;
          
          // Check for override
          const store = useDungeonStore.getState();
          const allNodes = store.nodes;
          const currentNodeFromStore = allNodes.get(nodeId);
          if (currentNodeFromStore) {
            nodeOverride = store.getNodePromptOverride(nodeId);
          }
        }
        
        if (nodeOverride !== null) {
          // Use node-specific override (custom prompt text)
          fullImagePrompt = nodeOverride;
          fullImageNegativePrompt = '';
          console.log(`[HOOK] ✓ Node override found for Node ${nodeId}`);
          console.log(`[HOOK]   Using custom override prompt`);
          console.log(`[HOOK]   Prompt preview: ${fullImagePrompt.substring(0, 100)}...`);
          imageAlreadyGenerated = true;
        }
        // PRIORITY 2: Check if this room type has special prompts configured
        else if (nodeType) {
          // Convert nodeType string to RoomType (handle both lowercase and uppercase)
          const roomType = nodeType.toUpperCase() as any;
          const roomTypeConfig = ROOM_TYPE_PROMPT_CONFIGS.find(c => c.roomType === roomType);
          
          if (roomTypeConfig) {
            const roomTypeIndex = getRoomTypePromptIndex(roomType, hasLeft, hasAhead, hasRight);
            
            if (roomTypeIndex !== null) {
              // Use room type-specific prompt
              fullImagePrompt = getPromptByIndex(roomTypeIndex);
              fullImageNegativePrompt = '';
              const roomTypePromptName = PROMPT_ARCHETYPE_NAMES[roomTypeIndex];
              console.log(`[HOOK] ✓ ${roomType} room detected for Node ${nodeId}`);
              console.log(`[HOOK]   Entry direction: ${entryDirection || 'null (start room)'}`);
              console.log(`[HOOK]   Relative exits: L:${hasLeft} A:${hasAhead} R:${hasRight} -> ${roomType} index: ${roomTypeIndex} (${roomTypePromptName})`);
              console.log(`[HOOK]   Using ${roomType} prompt: ${roomTypePromptName}`);
              console.log(`[HOOK]   Prompt preview: ${fullImagePrompt.substring(0, 100)}...`);
              imageAlreadyGenerated = true;
            } else {
              // Room type configured but topology doesn't match - fall through to standard logic
              console.log(`[HOOK] ⚠ ${roomType} room Node ${nodeId} has complex topology - falling back to standard prompts`);
              const { prompt, negativePrompt } = buildRoomPrompt(hasLeft, hasAhead, hasRight);
              fullImagePrompt = prompt;
              fullImageNegativePrompt = negativePrompt;
              const calculatedIndex = (hasLeft ? 4 : 0) + (hasAhead ? 2 : 0) + (hasRight ? 1 : 0);
              console.log(`[HOOK]   Using standard prompt index: ${calculatedIndex} (${PROMPT_ARCHETYPE_NAMES[calculatedIndex]})`);
              imageAlreadyGenerated = true;
            }
          }
        }
        // Check for pattern match (only if not room type with special prompts or fallback)
        if (!imageAlreadyGenerated && getPatternForNode) {
          const pattern = getPatternForNode(nodeId);
          if (pattern) {
            // Pattern found - use pattern's prompt directly
            const calculatedIndex = (hasLeft ? 4 : 0) + (hasAhead ? 2 : 0) + (hasRight ? 1 : 0);
            console.log(`[HOOK] ✓ Pattern match found for Node ${nodeId}`);
            console.log(`[HOOK]   Pattern: "${pattern.name}" (assigned index: ${pattern.promptIndex})`);
            console.log(`[HOOK]   Entry direction: ${entryDirection || 'null (start room)'}`);
            console.log(`[HOOK]   Relative exits: L:${hasLeft} A:${hasAhead} R:${hasRight} -> Calculated index: ${calculatedIndex}`);
            
            if (calculatedIndex !== pattern.promptIndex) {
              console.warn(`[HOOK] ⚠ WARNING: Pattern index (${pattern.promptIndex}) differs from calculated index (${calculatedIndex})`);
              console.warn(`[HOOK]   Using pattern's assigned index (${pattern.promptIndex}) as user's explicit choice.`);
            }
            
            // Use pattern's prompt directly
            fullImagePrompt = getPromptByIndex(pattern.promptIndex);
            fullImageNegativePrompt = '';
            console.log(`[HOOK]   Using prompt archetype: ${PROMPT_ARCHETYPE_NAMES[pattern.promptIndex]}`);
            console.log(`[HOOK]   Prompt preview: ${fullImagePrompt.substring(0, 100)}...`);
            imageAlreadyGenerated = true;
          } else {
            // No pattern match - use buildRoomPrompt with calculated relative exits
            const { prompt, negativePrompt } = buildRoomPrompt(
              hasLeft,
              hasAhead,
              hasRight
            );
            fullImagePrompt = prompt;
            fullImageNegativePrompt = negativePrompt;
            const calculatedIndex = (hasLeft ? 4 : 0) + (hasAhead ? 2 : 0) + (hasRight ? 1 : 0);
            console.log(`[HOOK] No pattern match for Node ${nodeId} - using auto-calculation`);
            console.log(`[HOOK]   Entry direction: ${entryDirection || 'null (start room)'}`);
            console.log(`[HOOK]   Relative exits: L:${hasLeft} A:${hasAhead} R:${hasRight} -> Index: ${calculatedIndex} (${PROMPT_ARCHETYPE_NAMES[calculatedIndex]})`);
          console.log('[HOOK] Generated prompt with buildRoomPrompt:', fullImagePrompt.substring(0, 100) + '...');
          imageAlreadyGenerated = true; // Mark that we're using buildRoomPrompt
          }
        } else if (!imageAlreadyGenerated) {
          // No pattern getter provided, use automatic calculation
          const { prompt, negativePrompt } = buildRoomPrompt(hasLeft, hasAhead, hasRight);
          fullImagePrompt = prompt;
          fullImageNegativePrompt = negativePrompt;
          const calculatedIndex = (hasLeft ? 4 : 0) + (hasAhead ? 2 : 0) + (hasRight ? 1 : 0);
          console.log(`[HOOK] No pattern getter provided for Node ${nodeId} - using auto-calculation`);
          console.log(`[HOOK]   Entry direction: ${entryDirection || 'null (start room)'}`);
          console.log(`[HOOK]   Relative exits: L:${hasLeft} A:${hasAhead} R:${hasRight} -> Index: ${calculatedIndex} (${PROMPT_ARCHETYPE_NAMES[calculatedIndex]})`);
          imageAlreadyGenerated = true;
        }
      } else {
        // Fallback to API's deterministic prompt
        const deterministicImagePrompt = response.headers.get('X-Image-Prompt');
        if (deterministicImagePrompt) {
          const imagePrompt = decodeURIComponent(deterministicImagePrompt);
          console.log('[HOOK] Using deterministic image prompt from header (fallback):', imagePrompt);
          // Store in context history
          setContextHistory(prev => [...prev.slice(-4), imagePrompt]); // Keep last 5
          
          const perspectivePrefix = 'Interior view, central perspective, architectural photography, wide angle, ';
          fullImagePrompt = `${perspectivePrefix}${imagePrompt}${STYLE_SUFFIX}`;
          imageAlreadyGenerated = true; // Mark that we're using API prompt
        }
      }
      
      // Trigger image generation if we have a prompt
      // First check if image already exists in node content to prevent duplicate generation
      const store = useDungeonStore.getState();
      const existingNode = store.nodes.get(nodeId);
      const existingImageUrl = existingNode?.content?.imageUrl;
      
      if (fullImagePrompt && !existingImageUrl && !imageAlreadyGenerated) {
        // #region agent log
        fetch('http://127.0.0.1:7249/ingest/08331948-86a3-4f5f-b660-2645d043da0c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'use-game-generation.ts:392',message:'Triggering image generation',data:{nodeId,hasFullImagePrompt:!!fullImagePrompt,hasExistingImageUrl:!!existingImageUrl,imageAlreadyGenerated,isCombatRoom:nodeType==='COMBAT'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
        // #endregion
        console.log('[HOOK] Triggering image generation with prompt:', fullImagePrompt.substring(0, 100) + '...');
        
        // Store the image prompt for later use (e.g., monster segmentation)
        setImagePrompt(fullImagePrompt);
        
        // Check if this is a combat room for automatic segmentation
        const isCombatRoom = nodeType === 'COMBAT';
        
        if (isCombatRoom) {
          // Use segmentation-enabled generation for combat rooms
          generateImageWithSegmentation(
            fullImagePrompt,
            true, // isCombatRoom
            'square'
          )
            .then(result => {
              if (result && result.imageUrl) {
                console.log('[HOOK] Image generated with segmentation, URL:', result.imageUrl);
                if (result.segmentedUrl) {
                  console.log('[HOOK] Segmented monster URL:', result.segmentedUrl);
                }
                setImageUrl(result.imageUrl);
                
                // Save segmented URL to room content if available
                if (result.segmentedUrl && currentNode) {
                  updateRoomContent(currentNode.id, {
                    segmentedMonsterUrl: result.segmentedUrl
                  });
                  console.log('[HOOK] Saved segmented monster URL to room content');
                }
                
                // Force a state update to ensure React re-renders
                setTimeout(() => {
                  setImageUrl(prev => prev ? prev : result.imageUrl);
                }, 100);
              }
            })
            .catch(err => {
              console.error('[HOOK] Image generation with segmentation failed:', err);
              // Fallback to regular generation
              generateImage({
                prompt: fullImagePrompt,
                negativePrompt: fullImageNegativePrompt || undefined,
                aspectRatio: 'square',
                size: '1024',
              })
                .then(url => {
                  if (url) {
                    setImageUrl(url);
                  }
                })
                .catch(fallbackErr => {
                  console.error('[HOOK] Fallback image generation failed:', fallbackErr);
                });
            });
        } else {
          // Regular image generation for non-combat rooms
          generateImage({
            prompt: fullImagePrompt,
            negativePrompt: fullImageNegativePrompt || undefined,
            aspectRatio: 'square',
            size: '1024',
          })
            .then(url => {
              if (url) {
                console.log('[HOOK] Image generated, URL:', url);
                setImageUrl(url);
                // Force a state update to ensure React re-renders
                setTimeout(() => {
                  setImageUrl(prev => prev ? prev : url);
                }, 100);
              }
            })
            .catch(err => {
              console.error('[HOOK] Image generation failed:', err);
              // Don't throw - image failure shouldn't block story
            });
        }
      } else if (existingImageUrl) {
        // Image already exists - use it without generating
        console.log('[HOOK] Using existing image from node content:', existingImageUrl);
        setImageUrl(existingImageUrl);
        setImagePrompt(null); // Clear prompt since we're not generating
      } else if (imageAlreadyGenerated) {
        console.log('[HOOK] Image generation already handled by API route');
      }

      if (!response.body) {
        throw new Error('Response body is null');
      }

      console.log('[HOOK] Response body received, starting stream parsing...');

      // Set up stream reader
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let separatorFound = imageAlreadyGenerated; // If we already generated image, skip separator detection
      let storyBuffer = '';
      let imagePrompt = ''; // Initialize for stream parsing (only used if image not already generated)

      // Process stream chunk by chunk (OpenRouter returns SSE format)
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          // Stream complete
          let finalNarrative = '';
          if (!separatorFound && buffer.trim()) {
            // No separator found, treat entire buffer as story
            storyBuffer = buffer;
            finalNarrative = storyBuffer;
            // Remove Exits/CHOICES sections for display
            const displayStory = finalNarrative.split(/(CHOICES?:|\*\*Exits?:\*\*)/i)[0].trim();
            setStoryText(displayStory);
          } else if (separatorFound) {
            // Final chunk of story
            finalNarrative = storyBuffer;
            // Remove Exits/CHOICES sections for display
            const displayStory = finalNarrative.split(/(CHOICES?:|\*\*Exits?:\*\*)/i)[0].trim();
            setStoryText(displayStory);
          }
          
          // Safety check: Remove any ||| prefix that might remain
          if (finalNarrative && finalNarrative.includes('|||')) {
            const separatorIndex = finalNarrative.indexOf('|||');
            finalNarrative = finalNarrative.substring(separatorIndex + 3).trim();
            // Update storyText if it was already set
            if (storyBuffer.includes('|||')) {
              // Also remove Exits/CHOICES sections for display
              const displayStory = finalNarrative.split(/(CHOICES?:|\*\*Exits?:\*\*)/i)[0].trim();
              setStoryText(displayStory);
            }
          }
          
          // Extract clean narrative (remove CHOICES and Exits sections if present) and add to history
          if (finalNarrative) {
            const cleanNarrative = finalNarrative.split(/(CHOICES?:|\*\*Exits?:\*\*)/i)[0].trim();
            if (cleanNarrative) {
              setStoryHistory(prev => {
                const updated = [...prev.slice(-2), cleanNarrative]; // Keep last 3 entries (slice(-2) + new = 3 total)
                console.log('[HOOK] Updated story history, now has', updated.length, 'entries');
                return updated;
              });
            }
          }
          break;
        }

        // Decode chunk and add to buffer
        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;

        // Parse SSE format: "data: {...}" or "data: [DONE]"
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6); // Remove "data: " prefix
            if (data === '[DONE]') {
              continue;
            }

            try {
              const json = JSON.parse(data);
              const content = json.choices?.[0]?.delta?.content || json.choices?.[0]?.message?.content || '';
              
              if (content) {
                console.log('[HOOK] Received content chunk:', content.substring(0, 50));
                
                // Check for separator in accumulated content
                if (!separatorFound) {
                  // Build current accumulated text (storyBuffer should be empty before separator)
                  const currentText = (imagePrompt + content);
                  const separatorIndex = currentText.indexOf('|||');
                  
                  if (separatorIndex !== -1) {
                    // Separator found!
                    console.log('[HOOK] ||| SEPARATOR DETECTED!');
                    separatorFound = true;
                    
                    // Split at separator - only content AFTER separator goes to story
                    const beforeSeparator = currentText.substring(0, separatorIndex);
                    const afterSeparator = currentText.substring(separatorIndex + 3);
                    
                    imagePrompt = beforeSeparator.trim();
                    storyBuffer = afterSeparator; // Start with only content after separator

                    console.log('[HOOK] Image prompt extracted:', imagePrompt);
                    console.log('[HOOK] Story buffer after separator:', storyBuffer.substring(0, 50));

                    // Fallback: If no image was generated yet, use extracted prompt
                    if (!imageAlreadyGenerated) {
                      // Store image prompt in context history
                      if (imagePrompt) {
                        setContextHistory(prev => [...prev.slice(-4), imagePrompt]); // Keep last 5
                      }

                      // Trigger image generation immediately (don't await)
                      // Prepend perspective keywords to ensure first-person interior view
                      const perspectivePrefix = 'Interior view, central perspective, architectural photography, wide angle, ';
                      const fullImagePrompt = `${perspectivePrefix}${imagePrompt}${STYLE_SUFFIX}`;
                      
                      // Store the full image prompt for monster segmentation
                      setImagePrompt(fullImagePrompt);
                      
                      console.log('[HOOK] Triggering image generation with extracted prompt:', fullImagePrompt);
                      
                      generateImage({
                        prompt: fullImagePrompt,
                        aspectRatio: 'square',
                        size: '1024',
                      })
                        .then(url => {
                          if (url) {
                            console.log('[HOOK] Image generated, URL:', url);
                            setImageUrl(url);
                            // Force a state update to ensure React re-renders
                            setTimeout(() => {
                              setImageUrl(prev => prev ? prev : url);
                            }, 100);
                          }
                        })
                        .catch(err => {
                          console.error('[HOOK] Image generation failed:', err);
                          // Don't throw - image failure shouldn't block story
                        });
                    }

                    // Start streaming story text - only content after separator, never the prefix
                    // Also strip any Exits/CHOICES sections that might be in the stream
                    if (storyBuffer && storyBuffer.trim()) {
                      // Remove any prefix that might have leaked in
                      let cleanStory = storyBuffer;
                      if (cleanStory.includes('|||')) {
                        const separatorIndex = cleanStory.indexOf('|||');
                        cleanStory = cleanStory.substring(separatorIndex + 3).trim();
                      }
                      // Remove Exits/CHOICES sections for display
                      cleanStory = cleanStory.split(/(CHOICES?:|\*\*Exits?:\*\*)/i)[0].trim();
                      setStoryText(cleanStory);
                    }
                  } else {
                    // No separator yet, accumulate in imagePrompt silently (NEVER display this)
                    imagePrompt += content;
                    console.log('[HOOK] Accumulating image prompt silently, length:', imagePrompt.length);
                    // DO NOT call setStoryText here - prefix must never be displayed
                  }
                } else {
                  // Separator already found, continue streaming story
                  storyBuffer += content;
                  // Safety check: ensure no prefix leaked in and remove Exits/CHOICES sections
                  let cleanStory = storyBuffer;
                  if (cleanStory.includes('|||')) {
                    // If somehow prefix got in, strip it
                    const separatorIndex = cleanStory.indexOf('|||');
                    cleanStory = cleanStory.substring(separatorIndex + 3).trim();
                    storyBuffer = cleanStory; // Update storyBuffer to cleaned version
                  }
                  // Remove Exits/CHOICES sections for display (keep in buffer for parsing)
                  const displayStory = cleanStory.split(/(CHOICES?:|\*\*Exits?:\*\*)/i)[0].trim();
                  setStoryText(displayStory);
                }
              }
            } catch (e) {
              // Not JSON, might be plain text (fallback)
              if (!separatorFound && !imageAlreadyGenerated) {
                // Build current text (storyBuffer should be empty before separator)
                const currentText = (imagePrompt + data);
                const separatorIndex = currentText.indexOf('|||');
                
                if (separatorIndex !== -1) {
                  separatorFound = true;
                  imagePrompt = currentText.substring(0, separatorIndex).trim();
                  storyBuffer = currentText.substring(separatorIndex + 3); // Only content after separator
                  
                  // Fallback: If no image was generated yet, use extracted prompt
                  if (!imageAlreadyGenerated) {
                    if (imagePrompt) {
                      setContextHistory(prev => [...prev.slice(-4), imagePrompt]);
                    }
                    
                    // Prepend perspective keywords to ensure first-person interior view
                    const perspectivePrefix = 'Interior view, central perspective, architectural photography, wide angle, ';
                    const fullImagePrompt = `${perspectivePrefix}${imagePrompt}${STYLE_SUFFIX}`;
                    
                    // Store the full image prompt for monster segmentation
                    setImagePrompt(fullImagePrompt);
                    
                    generateImage({
                      prompt: fullImagePrompt,
                      aspectRatio: 'square',
                      size: '1024',
                    }).then(url => {
                      if (url) {
                        setImageUrl(url);
                      }
                    }).catch(console.error);
                  }
                  
                  // Only set story text if there's clean content after separator
                  // Remove Exits/CHOICES sections for display
                  if (storyBuffer && storyBuffer.trim()) {
                    let cleanStory = storyBuffer;
                    if (cleanStory.includes('|||')) {
                      const separatorIndex = cleanStory.indexOf('|||');
                      cleanStory = cleanStory.substring(separatorIndex + 3).trim();
                    }
                    const displayStory = cleanStory.split(/(CHOICES?:|\*\*Exits?:\*\*)/i)[0].trim();
                    setStoryText(displayStory);
                  }
                } else {
                  // Accumulate silently in imagePrompt, NEVER display
                  imagePrompt += data;
                  // DO NOT call setStoryText here - prefix must never be displayed
                }
              } else {
                // Separator already found, continue streaming story
                storyBuffer += data;
                // Safety check: strip prefix and remove Exits/CHOICES sections
                let cleanStory = storyBuffer;
                if (cleanStory.includes('|||')) {
                  // If somehow prefix got in, strip it immediately
                  const separatorIndex = cleanStory.indexOf('|||');
                  cleanStory = cleanStory.substring(separatorIndex + 3).trim();
                  storyBuffer = cleanStory; // Update storyBuffer to cleaned version
                }
                // Remove Exits/CHOICES sections for display (keep in buffer for parsing)
                const displayStory = cleanStory.split(/(CHOICES?:|\*\*Exits?:\*\*)/i)[0].trim();
                setStoryText(displayStory);
              }
            }
          }
        }
      }

      setIsLoading(false);
      // Reset generation flag on success
      isGeneratingRef.current = false;
      currentGeneratingNodeRef.current = null;
      storyApiCallInProgressRef.current = false;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        // Request was aborted, ignore
        isGeneratingRef.current = false;
        currentGeneratingNodeRef.current = null;
        storyApiCallInProgressRef.current = false;
        return;
      }
      console.error('Error in generate:', err);
      setError(err.message || 'Failed to generate story');
      setIsLoading(false);
      // Reset generation flag on error
      isGeneratingRef.current = false;
      currentGeneratingNodeRef.current = null;
      storyApiCallInProgressRef.current = false;
    }
  }, [contextHistory, storyHistory]);

  // Save to cache when both story and image are ready
  useEffect(() => {
    const nodeId = currentNodeIdRef.current;
    const promptIndex = currentPromptIndexRef.current;
    if (nodeId && storyText && imageUrl && !isLoading && promptIndex !== null) {
      // Only save if not already in cache (avoid overwriting with partial data)
      if (!cache.current.has(nodeId)) {
        cache.current.set(nodeId, { story: storyText, imageUrl: imageUrl, promptIndex: promptIndex });
        console.log(`[HOOK] Saved to cache for node: ${nodeId} (story: ${storyText.length} chars, image: ${imageUrl}, promptIndex: ${promptIndex})`);
      }
    }
  }, [storyText, imageUrl, isLoading]);

  const reset = useCallback(() => {
    setStoryText('');
    setImageUrl(null);
    setImagePrompt(null);
    setError(null);
    setIsLoading(false);
    currentNodeIdRef.current = null;
    currentPromptIndexRef.current = null;
    // Note: Don't reset storyHistory - we want to keep context across resets
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  return {
    storyText,
    imageUrl,
    imagePrompt,
    isLoading,
    error,
    generate,
    reset,
  };
}

