'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useCharacter } from '@/lib/character/CharacterContext';
import { GameEngine } from '@/lib/game/GameEngine';
import { GameNode, Choice } from '@/types/game';
import { DungeonMiniMap } from './DungeonMiniMap';
import { LoadingScreen } from './LoadingScreen';
import { useDungeonStore } from '@/lib/dungeon/store';
// ComfyUI doesn't need client-side initialization
import { useGameGeneration } from '@/lib/hooks/use-game-generation';
import { useAdventureLog } from '@/lib/adventure-log/AdventureLogContext';
import { CommandConsole } from './CommandConsole';
import { AtmosphericImage } from './AtmosphericImage';
import { MonsterHighlight } from './MonsterHighlight';
import { CombatInterface } from './CombatInterface';
import { AttackAnimation } from './AttackAnimation';
import { HitEffect } from './HitEffect';
import { scaleMonsterToLevel } from '@/lib/game/monsters';
import { calculateXP, gainXP } from '@/lib/game/xp-leveling';
import { shouldDropItem, generateItemForFloor } from '@/lib/game/items';
import { EnemyData } from '@/types/game';
import { LevelUpNotification } from './LevelUpNotification';
import { warmupSegmentationWorkflow } from '@/lib/ai/comfyui-images';

// Initial starting node (before entering dungeon)
const initialNode: GameNode = {
  id: 'start',
  type: 'location',
  description: 'You stand at the entrance to a dark dungeon. The air is cold and heavy with the scent of decay. Ancient stone steps lead downward into darkness. The entrance is marked with ominous runes that seem to pulse with a faint, malevolent energy.',
  choices: [
    {
      id: 'enter',
      text: 'Enter the dungeon',
      actionPoints: 1,
      type: 'action',
    },
  ],
};

// Helper function to get icon for a direction
function getIcon(direction: string): string | null {
  const icons: Record<string, string> = {
    'NORTH': '⬆️',
    'SOUTH': '⬇️',
    'EAST': '➡️',
    'WEST': '⬅️',
    'FORWARD': '⬆️',
    'LEFT': '⬅️',
    'RIGHT': '➡️',
    'BACK': '⬇️'
  };
  return icons[direction.toUpperCase()] || null;
}

// Helper function to ensure choice has correct [DIRECTION] format
// This fixes cached choices that may have been saved with generic "Go North" text
function ensureChoiceFormat(choice: Choice): Choice {
  // If already has [DIRECTION] format, check if it's generic and needs fixing
  if (choice.text.startsWith('[') && choice.text.includes(']')) {
    const closingBracketIndex = choice.text.indexOf(']');
    const tag = choice.text.substring(1, closingBracketIndex).toUpperCase();
    const content = choice.text.substring(closingBracketIndex + 1).trim();
    
    // Check if content is generic (e.g., "Go North", "Move North", etc.)
    const isGeneric = /^(Go|Move|Head|Walk)\s+(North|South|East|West)$/i.test(content);
    
    // If generic and we have direction metadata, we can't fix it without regenerating
    // But we can at least ensure the format is correct
    if (isGeneric) {
      console.warn(`[TRANSFORM] Warning: Cached choice has generic text: "${choice.text}" - Consider clearing cache for this room`);
    }
    
    return choice; // Return as-is (can't fix generic text without regenerating)
  }
  
  // If has direction metadata but no tag, add it
  if (choice.metadata?.direction) {
    const dir = choice.metadata.direction;
    const transformedText = `[${dir.toUpperCase()}] ${choice.text}`;
    console.log(`[TRANSFORM] Transforming choice: "${choice.text}" -> "${transformedText}"`);
    return {
      ...choice,
      text: transformedText
    };
  }
  
  // Otherwise return as-is (non-directional choice)
  return choice;
}

// Helper function to extract direction info from choice text using string slicing (more robust than regex)
function getDirectionInfo(choiceText: string): { direction: string | null, displayText: string, icon: string | null } {
  // Debug: Log what we're processing
  if (process.env.NODE_ENV === 'development') {
    console.log('[getDirectionInfo] Processing:', JSON.stringify(choiceText));
  }
  
  // Check for standard [DIRECTION] format using string slicing (bulletproof, handles any characters)
  if (choiceText.startsWith('[')) {
    const closingBracketIndex = choiceText.indexOf(']');
    if (closingBracketIndex > -1) {
      const tag = choiceText.substring(1, closingBracketIndex).toUpperCase(); // e.g., NORTH
      const content = choiceText.substring(closingBracketIndex + 1).trim(); // The immersive text
      
      if (process.env.NODE_ENV === 'development') {
        console.log('[getDirectionInfo] Found tag:', tag, 'content:', JSON.stringify(content), 'content length:', content.length);
      }
      
      // If content exists, USE IT. Do not fallback.
      if (content.length > 0) {
        const result = { 
          direction: tag, 
          displayText: content, // Force this!
          icon: getIcon(tag) 
        };
        if (process.env.NODE_ENV === 'development') {
          console.log('[getDirectionInfo] Returning:', result);
        }
        return result;
      } else {
        // Tag exists but no content - still return direction for icon, but empty displayText
        if (process.env.NODE_ENV === 'development') {
          console.log('[getDirectionInfo] Tag found but no content, returning empty displayText');
        }
        return {
          direction: tag,
          displayText: '',
          icon: getIcon(tag)
        };
      }
    }
  }
  // Only if no brackets, return the raw text
  if (process.env.NODE_ENV === 'development') {
    console.log('[getDirectionInfo] No brackets found, returning raw text');
  }
  return { direction: null, displayText: choiceText, icon: null };
}

interface GameInterfaceProps {
  showSegmentationBox?: boolean;
  pixelationEnabled?: boolean;
  pixelationMode?: 'simple' | '8bit';
}

export function GameInterface({ 
  showSegmentationBox = false,
  pixelationEnabled = false,
  pixelationMode = 'simple'
}: GameInterfaceProps) {
  const { character, updateXP, updateHP } = useCharacter();
  const { addEntry: addLogEntry } = useAdventureLog();
  const [currentNode, setCurrentNode] = useState<GameNode>(initialNode);
  const [storyLog, setStoryLog] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isInDungeon, setIsInDungeon] = useState(false);
  const [showLoadingScreen, setShowLoadingScreen] = useState(false);
  const [currentRoomImage, setCurrentRoomImage] = useState<string | undefined>(undefined);
  const [isInCombat, setIsInCombat] = useState(false);
  const [autoBattle, setAutoBattle] = useState(false);
  const [currentEnemy, setCurrentEnemy] = useState<EnemyData | null>(null);
  const [enemyPosition, setEnemyPosition] = useState<{ centerX: number; centerY: number } | null>(null);
  const [monsterBounds, setMonsterBounds] = useState<{ centerX: number; centerY: number; top: number; bottom: number; headTop?: number; left: number; right: number; width: number; height: number } | null>(null);
  const [levelUpNotification, setLevelUpNotification] = useState<number | null>(null);
  // Attack animation state (rendered at GameInterface level to appear over monster)
  const [showAttackAnimation, setShowAttackAnimation] = useState(false);
  const [attackAnimationPath, setAttackAnimationPath] = useState<{ fromX: number; fromY: number; toX: number; toY: number } | null>(null);
  const [showHitEffect, setShowHitEffect] = useState(false);
  const [hitEffectData, setHitEffectData] = useState<{ x: number; y: number; isCritical: boolean } | null>(null);
  // Track combat state HP separately from currentEnemy for real-time updates
  const [combatEnemyHP, setCombatEnemyHP] = useState<{ current: number; max: number } | null>(null);
  // Track enemy dying state for death animation
  const [isEnemyDying, setIsEnemyDying] = useState(false);
  const gameEngineRef = useRef<GameEngine | null>(null);
  const combatNodeRef = useRef<string | null>(null); // Track which node we've entered combat for
  const progression = useDungeonStore((state) => state.progression);
  const updateRoomContent = useDungeonStore((state) => state.updateRoomContent);
  
  // Toggle state with localStorage persistence (accessible before loading screen)
  const [preRenderAllRooms, setPreRenderAllRooms] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('preRenderAllRooms');
      return saved !== null ? saved === 'true' : false; // Default to false
    }
    return false;
  });
  
  // Save to localStorage when toggle changes
  const handleToggleChange = (value: boolean) => {
    setPreRenderAllRooms(value);
    if (typeof window !== 'undefined') {
      localStorage.setItem('preRenderAllRooms', value.toString());
    }
  };
  
  // Story generation disabled - no longer using the hook
  // const { storyText, imageUrl, imagePrompt, isLoading: isGenerating, generate: generateStream, reset: resetGeneration } = useGameGeneration();
  const storyText = '';
  const imageUrl = null;
  const imagePrompt = null;
  const isGenerating = false;
  
  // [FIX 1] Reset local image state immediately when moving to a new node
  useEffect(() => {
    setCurrentRoomImage(undefined);
  }, [currentNode.id]);
  
  // Debug: Log imageUrl changes
  useEffect(() => {
    if (imageUrl) {
      console.log('imageUrl from hook changed:', imageUrl);
    }
  }, [imageUrl]);

  const nodes = useDungeonStore((state) => state.nodes);
  const generateDungeon = useDungeonStore((state) => state.generateDungeon);
  const movePlayer = useDungeonStore((state) => state.movePlayer);
  const getCurrentNode = useDungeonStore((state) => state.getCurrentNode);
  const getExitsForCurrentNode = useDungeonStore((state) => state.getExitsForCurrentNode);
  const enterRoom = useDungeonStore((state) => state.enterRoom);
  const entryDirection = useDungeonStore((state) => state.entryDirection);
  const getPatternForNode = useDungeonStore((state) => state.getPatternForNode);
  const promptPatterns = useDungeonStore((state) => state.promptPatterns);
  const playerLocation = useDungeonStore((state) => state.playerLocation);

  // ComfyUI doesn't need client-side initialization - it's accessed via HTTP API
  // No initialization needed

  // Initialize game engine when character is created (only once)
  const gameEngineInitialized = useRef(false);
  useEffect(() => {
    if (character && !gameEngineRef.current && !gameEngineInitialized.current) {
      gameEngineRef.current = new GameEngine(character, initialNode);
      gameEngineInitialized.current = true;
      
      // REMOVED: Initial image generation - images should only be generated when entering rooms
      // The first room will generate its own image when handleEnterRoom is called
    } else if (character && gameEngineRef.current) {
      gameEngineRef.current.updateCharacter(character);
    }
  }, [character]); // Only depend on character, not currentNode or currentRoomImage

  // Auto-show loading screen when character is created and not in dungeon
  useEffect(() => {
    if (
      character &&
      gameEngineRef.current &&
      !isInDungeon &&
      !showLoadingScreen &&
      !playerLocation
    ) {
      // Small delay to ensure character is fully set up
      const timer = setTimeout(() => {
        startDungeonGeneration();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [character, isInDungeon, showLoadingScreen, playerLocation]);

  // Show loading screen to generate dungeon and pre-generate starting room
  const startDungeonGeneration = () => {
    if (!character || !gameEngineRef.current) {
      console.error('Cannot start dungeon generation: missing character or game engine');
      return;
    }
    setShowLoadingScreen(true);
  };

  // Guard to prevent onLoadingComplete from running multiple times
  const loadingCompleteCalledRef = useRef(false);
  
  // Called when loading screen completes (dungeon is generated and starting room is pre-generated)
  const onLoadingComplete = async () => {
    // Guard: Prevent multiple calls
    if (loadingCompleteCalledRef.current) {
      // #region agent log
      fetch('http://127.0.0.1:7249/ingest/08331948-86a3-4f5f-b660-2645d043da0c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'GameInterface.tsx:237',message:'onLoadingComplete already called, skipping',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      console.log('[GameInterface] onLoadingComplete already called, skipping duplicate');
      return;
    }
    
    loadingCompleteCalledRef.current = true;
    // #region agent log
    fetch('http://127.0.0.1:7249/ingest/08331948-86a3-4f5f-b660-2645d043da0c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'GameInterface.tsx:245',message:'onLoadingComplete called',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    
    setShowLoadingScreen(false);
    setIsInDungeon(true);
    
    // Mark that we're entering a room (the first room)
    isEnteringRoomRef.current = true;
    
    // Immediately get the first dungeon node and set currentNode to skip the static entrance screen
    const dungeonNode = getCurrentNode();
    if (dungeonNode) {
      const cachedNode = nodes.get(dungeonNode.id);
      const pattern = getPatternForNode(dungeonNode.id);
      
      // If room has cached content and no pattern, immediately set currentNode and skip handleRoomEntry
      // This skips the static entrance screen and avoids duplicate image generation
      if (cachedNode?.content && !pattern) {
        const roomContent = cachedNode.content;
        const transformedChoices = (roomContent.availableChoices || []).map(ensureChoiceFormat);
        
        const roomNode: GameNode = {
          id: dungeonNode.id,
          type: 'location',
          description: roomContent.description,
          choices: transformedChoices,
          imageUrl: roomContent.imageUrl,
        };
        
        setCurrentNode(roomNode);
        setStoryLog([roomContent.description]);
        addLogEntry(roomContent.description, 'info');
        if (roomContent.imageUrl) {
          setCurrentRoomImage(roomContent.imageUrl);
        }
        setIsLoading(false);
        // Skip handleRoomEntry since we've already loaded cached content
        return;
      } else {
        // Even if no cached content, set a placeholder node to avoid showing initialNode
        // handleRoomEntry will populate it with generated content
        const placeholderNode: GameNode = {
          id: dungeonNode.id,
          type: 'location',
          description: 'Entering the dungeon...',
          choices: [],
        };
        setCurrentNode(placeholderNode);
      }
    }
    
    // Now enter the pre-generated room (will handle any missing content or streaming)
    await handleRoomEntry();
    
    // After handleRoomEntry completes, ensure image is set from node content (for start node)
    // This is a fallback in case handleRoomEntry didn't set the image properly
    const dungeonNodeAfterEntry = getCurrentNode();
    if (dungeonNodeAfterEntry) {
      const nodeAfterEntry = nodes.get(dungeonNodeAfterEntry.id);
      // Ensure image is set from node content if it exists and UI state is missing
      if (nodeAfterEntry?.content?.imageUrl) {
        // Only update if UI state doesn't already have the image
        if (!currentRoomImage || !currentNode.imageUrl) {
          console.log(`[GameInterface] Setting image from node content for start node ${dungeonNodeAfterEntry.id}`);
          setCurrentRoomImage(nodeAfterEntry.content.imageUrl);
          setCurrentNode(prev => ({
            ...prev,
            imageUrl: nodeAfterEntry.content.imageUrl,
          }));
        }
      }
    }
  };

  // Initialize dungeon when entering (legacy - now handled by LoadingScreen)
  const enterDungeon = async () => {
    // Warm up segmentation models BEFORE starting dungeon generation
    // This ensures BigLama and SAM3 models are loaded and compiled for fast subsequent runs
    console.log('[GameInterface] ====== WARMING UP SEGMENTATION MODELS ======');
    console.log('[GameInterface] This will take ~15-20 seconds but ensures all combat rooms are fast...');
    
    try {
      const warmupStartTime = Date.now();
      await warmupSegmentationWorkflow();
      const warmupElapsed = Date.now() - warmupStartTime;
      console.log(`[GameInterface] ✓ Warmup completed in ${warmupElapsed}ms`);
      console.log('[GameInterface] ====== WARMUP COMPLETE - STARTING DUNGEON ======');
    } catch (error) {
      console.error('[GameInterface] ⚠ Warmup failed:', error);
      if (error instanceof Error) {
        console.error('[GameInterface] Warmup error details:', error.message);
        console.error('[GameInterface] Warmup error stack:', error.stack);
      }
      // Continue anyway - dungeon will still work, just slower first room
      console.warn('[GameInterface] Continuing with dungeon entry despite warmup failure');
    }
    
    // Start dungeon generation after warmup completes
    startDungeonGeneration();
  };

  // Handle entering a new room
  const handleRoomEntry = async () => {
    console.log('=== HANDLE ROOM ENTRY CALLED ===');
    if (!character || !gameEngineRef.current) {
      console.error('Cannot handle room entry: missing character or game engine');
      setIsLoading(false);
      return;
    }

    // Mark that we're entering a room (not exiting)
    isEnteringRoomRef.current = true;

    const dungeonNode = getCurrentNode();
    console.log('Dungeon node:', dungeonNode);
    
    if (!dungeonNode) {
      console.error('Cannot handle room entry: dungeon node is null');
      setIsLoading(false);
      return;
    }

    // PRIORITY 0: Check if room content is cached FIRST - before ANY other logic
    // This ensures previously visited nodes always use cached content and never regenerate
    // Patterns should NOT affect cached nodes - cached content takes absolute priority
    const cachedNode = nodes.get(dungeonNode.id);
    
    console.log(`[CACHE CHECK] Checking cache for node ${dungeonNode.id}`);
    console.log(`[CACHE CHECK]   Node exists: ${!!cachedNode}`);
    console.log(`[CACHE CHECK]   Node has content: ${!!cachedNode?.content}`);
    console.log(`[CACHE CHECK]   Content has imageUrl: ${!!cachedNode?.content?.imageUrl}`);
    
    if (cachedNode?.content) {
      const roomContent = cachedNode.content;
      
      // Only use cache if it has an image URL (complete cached content)
      if (roomContent.imageUrl) {
        console.log(`[CACHE HIT] ✓ Using cached content for previously visited node ${dungeonNode.id}`);
        console.log(`[CACHE HIT]   Cached image URL: ${roomContent.imageUrl.substring(0, 60)}...`);
        console.log(`[CACHE HIT]   Cached description: ${roomContent.description.substring(0, 50)}...`);
        console.log(`[CACHE HIT]   Cached choices count: ${roomContent.availableChoices?.length || 0}`);
        
        // Reset lastRegeneratedNodeRef to allow future visits to this node
        lastRegeneratedNodeRef.current = null;
        console.log(`[CACHE HIT]   Reset lastRegeneratedNodeRef to null`);
        
        // Use cached content - no streaming needed, no regeneration
        setStoryLog(prev => [...prev, roomContent.description]);
        addLogEntry(roomContent.description, 'info');
        
        // Set image URL from cached content
        setCurrentRoomImage(roomContent.imageUrl);
        
        // Transform cached choices to ensure they have correct [DIRECTION] format
        const transformedChoices = (roomContent.availableChoices || []).map(ensureChoiceFormat);
        
        const roomNode: GameNode = {
          id: dungeonNode.id,
          type: 'location',
          description: roomContent.description,
          choices: transformedChoices,
          imageUrl: roomContent.imageUrl, // Use cached image URL
        };
        setCurrentNode(roomNode);
        setIsLoading(false);
        console.log(`[CACHE HIT] ✓ Early return - using cached content, no generation needed`);
        return; // CRITICAL: Return early - do NOT proceed with any generation logic
      } else {
        console.log(`[CACHE INCOMPLETE] Node ${dungeonNode.id} has cached content but no image URL - will regenerate`);
        console.log(`[CACHE INCOMPLETE]   Content keys: ${Object.keys(roomContent).join(', ')}`);
      }
    } else {
      console.log(`[CACHE MISS] Node ${dungeonNode.id} has no cached content - will generate`);
      if (cachedNode) {
        console.log(`[CACHE MISS]   Node exists but content is: ${cachedNode.content === undefined ? 'undefined' : 'null'}`);
      } else {
        console.log(`[CACHE MISS]   Node does not exist in nodes map`);
      }
    }

    // #region agent log
    fetch('http://127.0.0.1:7249/ingest/08331948-86a3-4f5f-b660-2645d043da0c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'GameInterface.tsx:315',message:'handleEnterRoom called',data:{nodeId:dungeonNode.id,isGenerating,lastRegeneratedNode:lastRegeneratedNodeRef.current,currentNodeId:currentNode.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    
    // Guard: Prevent duplicate generation if already generating
    if (isGenerating) {
      // #region agent log
      fetch('http://127.0.0.1:7249/ingest/08331948-86a3-4f5f-b660-2645d043da0c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'GameInterface.tsx:320',message:'Guard blocked: isGenerating=true',data:{nodeId:dungeonNode.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
      console.log(`[GameInterface] Generation already in progress, skipping duplicate call for node ${dungeonNode.id}`);
      return;
    }
    
    // Guard: Check if we've already processed this node (only for NEW nodes, not cached ones)
    // This check happens AFTER cache check, so cached nodes won't hit this
    if (lastRegeneratedNodeRef.current === dungeonNode.id) {
      // #region agent log
      fetch('http://127.0.0.1:7249/ingest/08331948-86a3-4f5f-b660-2645d043da0c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'GameInterface.tsx:328',message:'Guard blocked: already processed node',data:{nodeId:dungeonNode.id,lastRegenerated:lastRegeneratedNodeRef.current},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
      console.log(`[GameInterface] Already processed node ${dungeonNode.id}, skipping duplicate call`);
      return;
    }
    
    // Set flag ONLY for NEW nodes that need generation (not cached nodes)
    // This happens AFTER cache check confirms node needs generation
    lastRegeneratedNodeRef.current = dungeonNode.id;
    console.log(`[GameInterface] Setting lastRegeneratedNodeRef for NEW node ${dungeonNode.id} (will generate)`);
    // #region agent log
    fetch('http://127.0.0.1:7249/ingest/08331948-86a3-4f5f-b660-2645d043da0c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'GameInterface.tsx:337',message:'Setting lastRegeneratedNodeRef for NEW node',data:{nodeId:dungeonNode.id,nowSetTo:lastRegeneratedNodeRef.current},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    
    setIsLoading(true);
    // Story generation disabled - no resetGeneration needed

    try {
      console.log('Processing room entry for node:', dungeonNode.id);
      
      // STORY GENERATION DISABLED - Only generate images
      // Calculate exits for image generation
      const validExits = Array.from(dungeonNode.connections.entries())
        .map(([targetId, connection]) => {
          const targetNode = nodes.get(targetId);
          if (!targetNode) return null;
          const dx = targetNode.x - dungeonNode.x;
          const dy = targetNode.y - dungeonNode.y;
          let direction: 'NORTH' | 'SOUTH' | 'EAST' | 'WEST' | null = null;
          if (dx === 0 && dy === -1) direction = 'NORTH';
          else if (dx === 0 && dy === 1) direction = 'SOUTH';
          else if (dx === 1 && dy === 0) direction = 'EAST';
          else if (dx === -1 && dy === 0) direction = 'WEST';
          
          if (direction) {
            return { direction, targetId, visualType: String(connection.type) };
          }
          return null;
        })
        .filter((exit): exit is { direction: 'NORTH' | 'SOUTH' | 'EAST' | 'WEST', targetId: string, visualType: string } => exit !== null);
      
      const nodeType = dungeonNode.type === 'NORMAL' ? 'normal' : dungeonNode.type.toLowerCase();
      const biome = 'Dungeon';
      const isCorridor = dungeonNode.type === 'NORMAL';
      const monster = dungeonNode.monster || null;
      
      // Generate new content (image only, story generation is disabled)
      // Note: Cache check already happened at the beginning of handleRoomEntry
      // If we reach here, the node definitely needs generation
      console.log(`[GameInterface] Generating new content for node ${dungeonNode.id}`);
      const { generateRoomContent } = await import('@/lib/dungeon/content');
      
      // Calculate exits for content generation
      const calculatedExits = {
        north: dungeonNode.connections.has(`${dungeonNode.x},${dungeonNode.y - 1}`),
        south: dungeonNode.connections.has(`${dungeonNode.x},${dungeonNode.y + 1}`),
        east: dungeonNode.connections.has(`${dungeonNode.x + 1},${dungeonNode.y}`),
        west: dungeonNode.connections.has(`${dungeonNode.x - 1},${dungeonNode.y}`),
      };
      
      // Read entryDirection directly from store to avoid stale closure value
      // The hook value might be stale if handleRoomEntry is called immediately after movePlayer
      const currentEntryDirection = useDungeonStore.getState().entryDirection;
      
      // Log entry direction for debugging
      console.log(`[GameInterface] Entry direction from store: ${currentEntryDirection || 'null'}`);
      if (currentEntryDirection === null && dungeonNode.type !== 'START') {
        console.warn(`[GameInterface] ⚠ WARNING: Entry direction is null for non-start node ${dungeonNode.id}`);
      }
      
      // #region agent log
      fetch('http://127.0.0.1:7249/ingest/08331948-86a3-4f5f-b660-2645d043da0c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'GameInterface.tsx:463',message:'handleRoomEntry: calling generateRoomContent',data:{nodeId:dungeonNode.id,nodeType:dungeonNode.type,entryDirectionFromStore:currentEntryDirection,calculatedExits,hasCachedContent:!!dungeonNode.content},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion

      const content = await generateRoomContent(
        dungeonNode,
        nodes,
        calculatedExits,
        character,
        gameEngineRef.current,
        currentEntryDirection, // Use value read directly from store
        getPatternForNode
      );

      // Verify content was generated (not from cache - cache check already happened earlier)
      if (content.imageUrl) {
        console.log(`[GameInterface] ✓ Content generated for NEW node ${dungeonNode.id}`);
        console.log(`[GameInterface]   Image URL: ${content.imageUrl.substring(0, 50)}...`);
      } else {
        console.warn(`[GameInterface] ⚠ Content generated but no imageUrl for node ${dungeonNode.id}`);
      }

      // Update UI with generated content
      setStoryLog(prev => [...prev, content.description]);
      addLogEntry(content.description, 'info');
      
      // NEW: Sync hook's imageUrl state with generated content
      // Since we can't directly access setImageUrl from the hook (it's commented out),
      // we ensure currentRoomImage is set immediately and the store is updated
      if (content.imageUrl) {
        setCurrentRoomImage(content.imageUrl);
        console.log(`[GameInterface] ✓ Set currentRoomImage to: ${content.imageUrl.substring(0, 50)}...`);
      } else {
        console.warn(`[GameInterface] ⚠ Generated content has no imageUrl for node ${dungeonNode.id}`);
        // Image generation failed - clear any cached content to force regeneration on next visit
        console.warn(`[GameInterface] Image generation failed for node ${dungeonNode.id} - clearing cached content`);
        // Use updateRoomContent to clear the content by setting it to undefined
        // We'll update the node directly through the store's internal mechanism
        const store = useDungeonStore.getState();
        const node = store.nodes.get(dungeonNode.id);
        if (node) {
          // Use updateRoomContent with empty values to effectively clear it
          // Or we can directly update through the store's set method via a callback
          useDungeonStore.setState((state) => {
            const updatedNodes = new Map(state.nodes);
            const updatedNode = { ...node, content: undefined };
            updatedNodes.set(dungeonNode.id, updatedNode);
            return { nodes: updatedNodes };
          });
        }
      }

      const roomNode: GameNode = {
        id: dungeonNode.id,
        type: 'location',
        description: content.description,
        choices: content.availableChoices.map(ensureChoiceFormat),
        imageUrl: content.imageUrl,
      };
      setCurrentNode(roomNode);

      // Save to store for persistence (ensures cache is saved for future visits)
      // Validation: Only save if imageUrl is present (don't save incomplete content)
      const store = useDungeonStore.getState();
      const nodeBeforeSave = store.nodes.get(dungeonNode.id);
      const hadContentBefore = !!nodeBeforeSave?.content;
      
      if (content.imageUrl) {
        store.updateRoomContent(dungeonNode.id, {
          description: content.description,
          imageUrl: content.imageUrl,
          availableChoices: content.availableChoices,
          isExplored: true,
          entities: content.entities,
          imagePrompt: content.imagePrompt, // Preserve image prompt
          segmentedMonsterUrl: content.segmentedMonsterUrl, // Preserve segmented URL
        });
        console.log(`[GameInterface] ✓ Saving content with imageUrl for node ${dungeonNode.id}`);
        if (content.segmentedMonsterUrl) {
          console.log(`[GameInterface] ✓✓✓ SEGMENTED MONSTER URL SAVED ✓✓✓`);
          console.log(`[GameInterface] Segmented URL: ${content.segmentedMonsterUrl.substring(0, 100)}...`);
        } else {
          console.warn(`[GameInterface] ⚠ Content saved but NO segmentedMonsterUrl for node ${dungeonNode.id}`);
        }
      } else {
        console.warn(`[GameInterface] ⚠ NOT saving content without imageUrl for node ${dungeonNode.id} - will trigger regeneration on next visit`);
        // Don't save incomplete content - it will be regenerated on next visit
      }

      // Verify content was saved
      const nodeAfterSave = store.nodes.get(dungeonNode.id);
      const hasContentAfter = !!nodeAfterSave?.content;
      const hasImageUrlAfter = !!nodeAfterSave?.content?.imageUrl;
      
      console.log(`[GameInterface] ✓ Content save operation completed for node ${dungeonNode.id}`);
      console.log(`[GameInterface]   Before: hadContent=${hadContentBefore}, After: hasContent=${hasContentAfter}, hasImageUrl=${hasImageUrlAfter}`);
      
      if (!hasContentAfter) {
        console.error(`[GameInterface] ⚠ CRITICAL: Content was NOT saved to node ${dungeonNode.id}!`);
      } else if (!hasImageUrlAfter) {
        console.warn(`[GameInterface] ⚠ Content saved but missing imageUrl for node ${dungeonNode.id}`);
      } else {
        console.log(`[GameInterface] ✓ Content successfully saved with imageUrl (will be reused on return visit)`);
      }
      
      console.log('Content processed, setting isLoading to false');
      setIsLoading(false);
    } catch (error) {
      console.error('Error processing room entry:', error);
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');
      const errorMsg = `Error: ${error instanceof Error ? error.message : 'Something went wrong. You continue forward...'}`;
      setStoryLog(prev => [...prev, errorMsg]);
      addLogEntry(errorMsg, 'danger');
      setIsLoading(false);
    }
  };

  // Note: Removed auto-regeneration logic - visited nodes should always use cached content
  // Patterns only apply to NEW nodes, not previously visited ones
  const lastRegeneratedNodeRef = useRef<string | null>(null);
  const isEnteringRoomRef = useRef<boolean>(false);
  
  // Reset regeneration tracking ONLY when moving to a DIFFERENT node
  // DO NOT reset when staying on the same node or when node is first set
  useEffect(() => {
    const currentDungeonNode = getCurrentNode();
    // #region agent log
    fetch('http://127.0.0.1:7249/ingest/08331948-86a3-4f5f-b660-2645d043da0c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'GameInterface.tsx:534',message:'useEffect checking lastRegeneratedNodeRef',data:{currentNodeId:currentDungeonNode?.id,lastRegenerated:lastRegeneratedNodeRef.current,playerLocation},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    // Only reset if:
    // 1. We have a current node
    // 2. We have a last regenerated node (not null)
    // 3. They are DIFFERENT nodes
    if (currentDungeonNode && lastRegeneratedNodeRef.current && lastRegeneratedNodeRef.current !== currentDungeonNode.id) {
      // Moving to a different node - reset the flag to allow generation for the new node
      // #region agent log
      fetch('http://127.0.0.1:7249/ingest/08331948-86a3-4f5f-b660-2645d043da0c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'GameInterface.tsx:540',message:'Resetting lastRegeneratedNodeRef for different node',data:{oldNode:lastRegeneratedNodeRef.current,newNode:currentDungeonNode.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
      lastRegeneratedNodeRef.current = null;
    } else {
      // #region agent log
      fetch('http://127.0.0.1:7249/ingest/08331948-86a3-4f5f-b660-2645d043da0c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'GameInterface.tsx:546',message:'NOT resetting lastRegeneratedNodeRef',data:{reason:!currentDungeonNode?'no node':!lastRegeneratedNodeRef.current?'no lastRegenerated':'same node',currentNodeId:currentDungeonNode?.id,lastRegenerated:lastRegeneratedNodeRef.current},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
    }
    // DO NOT reset if lastRegeneratedNodeRef is null (first time) or if it matches current node (same node)
  }, [currentNode.id, playerLocation]);

  // Story generation disabled - this useEffect is no longer needed
  // Update UI when streaming content arrives
  useEffect(() => {
    // Story generation disabled - skip all story processing
    return;
    if (false && storyText && !isGenerating) {
      // Stream complete, parse final content
      const dungeonNode = getCurrentNode();
      if (!dungeonNode) return;

      // Parse choices from story text - support both old format and new format
      // Try multiple patterns to catch different AI response formats
      let choicesMatch = storyText.match(/CHOICES?:?\s*\n((?:-.*\n?)+)/i);
      if (!choicesMatch) {
        // Try without "CHOICES:" header - just look for lines with [DIRECTION]
        choicesMatch = storyText.match(/((?:-\s*\[(?:NORTH|SOUTH|EAST|WEST)\].*\n?)+)/i);
      }
      if (!choicesMatch) {
        // Try looking for **Exits:** section
        choicesMatch = storyText.match(/\*\*Exits?:\*\*\s*\n((?:-.*\n?)+)/i);
      }
      // Extract description - remove both CHOICES and Exits sections
      const description = storyText.split(/(CHOICES?:|\*\*Exits?:\*\*)/i)[0].trim();
      let choices: Choice[] = [];

      if (choicesMatch) {
        const choicesText = choicesMatch[1];
        const choiceLines = choicesText.split('\n').filter(line => line.trim().startsWith('-'));
        console.log('[PARSER] ===== CHOICE PARSING START =====');
        console.log('[PARSER] Raw choices text:', JSON.stringify(choicesText));
        console.log('[PARSER] Found choice lines:', choiceLines.map(l => JSON.stringify(l)));
        
        const exitsMap = {
          north: dungeonNode.connections.has(`${dungeonNode.x},${dungeonNode.y - 1}`),
          south: dungeonNode.connections.has(`${dungeonNode.x},${dungeonNode.y + 1}`),
          east: dungeonNode.connections.has(`${dungeonNode.x + 1},${dungeonNode.y}`),
          west: dungeonNode.connections.has(`${dungeonNode.x - 1},${dungeonNode.y}`),
        };

        const parsedChoices: Choice[] = [];
        choiceLines.forEach((line, index) => {
          // Debug: Log raw line to see format
          console.log(`[PARSER] Processing line ${index}:`, JSON.stringify(line));
          
          // Try cardinal direction format: [NORTH] text, [SOUTH] text, etc.
          // Use [\s\S]+ to match any character including newlines
          let textMatch = line.match(/^-\s*\[(NORTH|SOUTH|EAST|WEST)\]\s*([\s\S]+)/i);
          if (textMatch) {
            const [, direction, text] = textMatch;
            const dir = direction.toLowerCase() as 'north' | 'south' | 'east' | 'west';
            console.log(`[PARSER] Matched cardinal direction: ${direction}, text: ${JSON.stringify(text)}`);
            
            if (exitsMap[dir]) {
              const fullText = `[${direction.toUpperCase()}] ${text.trim()}`;
              console.log(`[PARSER] Storing choice with full text: ${JSON.stringify(fullText)}`);
              parsedChoices.push({
                id: `move-${dir}-${index}`,
                text: fullText,
                actionPoints: 1,
                type: 'action',
                metadata: { direction: dir },
              });
              return;
            } else {
              console.log(`[PARSER] Direction ${dir} not in exitsMap`);
            }
          }
          
          // Fallback: try old relative format for backward compatibility
          textMatch = line.match(/^-\s*\[(FORWARD|LEFT|RIGHT|BACK)\]\s*([\s\S]+)/i);
          if (textMatch) {
            const [, visualDir, text] = textMatch;
            // Map relative to cardinal based on coordinates
            // This is a fallback - should not be needed with new system
            const targetConnections = Array.from(dungeonNode.connections.keys());
            for (const connectedId of targetConnections) {
              const targetNode = nodes.get(connectedId);
              if (!targetNode) continue;
              const dx = targetNode.x - dungeonNode.x;
              const dy = targetNode.y - dungeonNode.y;
              let matches = false;
              let mapDir: 'north' | 'south' | 'east' | 'west' | null = null;
              
              if (visualDir === 'FORWARD' && dx > 0) {
                mapDir = 'east';
                matches = true;
              } else if (visualDir === 'BACK' && dx < 0) {
                mapDir = 'west';
                matches = true;
              } else if (visualDir === 'LEFT' && dy < 0) {
                mapDir = 'north';
                matches = true;
              } else if (visualDir === 'RIGHT' && dy > 0) {
                mapDir = 'south';
                matches = true;
              }
              
              if (matches && mapDir && exitsMap[mapDir]) {
                // Preserve full text with direction tag for immersive display
                const fullText = `[${mapDir.toUpperCase()}] ${text.trim()}`;
                console.log(`[PARSER] Matched relative direction, storing: ${JSON.stringify(fullText)}`);
                parsedChoices.push({
                  id: `move-${mapDir}-${index}`,
                  text: fullText,
                  actionPoints: 1,
                  type: 'action',
                  metadata: { direction: mapDir },
                });
                return;
              }
            }
          }
          
          // Fallback to old format: text (direction: north)
          textMatch = line.match(/^-\s*(.+?)\s*\(direction:\s*(\w+)\)/i);
          if (textMatch) {
            const [, text, direction] = textMatch;
            const dir = direction.toLowerCase() as 'north' | 'south' | 'east' | 'west';
            console.log(`[PARSER] Matched old format, direction: ${direction}, text: ${JSON.stringify(text)}`);
            
            if (exitsMap[dir]) {
              // Preserve full text with direction tag for immersive display
              const fullText = `[${direction.toUpperCase()}] ${text.trim()}`;
              console.log(`[PARSER] Storing old format choice: ${JSON.stringify(fullText)}`);
              parsedChoices.push({
                id: `move-${dir}-${index}`,
                text: fullText,
                actionPoints: 1,
                type: 'action',
                metadata: { direction: dir },
              });
            }
          } else {
            console.log(`[PARSER] No regex match for line: ${JSON.stringify(line)}`);
          }
        });
        
        console.log('[PARSER] Final parsed choices:', parsedChoices.map(c => ({ id: c.id, text: c.text })));
        console.log('[PARSER] ===== CHOICE PARSING END =====');
        choices = parsedChoices;
      } else {
        console.log('[PARSER] No CHOICES section found in storyText');
      }

      // Fallback: create basic movement choices if none parsed
      // This should only happen if the AI didn't provide choices or parsing completely failed
      if (choices.length === 0) {
        console.warn('[PARSER] ⚠️ NO CHOICES PARSED - Using fallback generic choices');
        console.warn('[PARSER] This means the AI response format was not recognized or no choices were found');
        console.warn('[PARSER] Story text snippet:', storyText.substring(0, 500));
        
        const exitsMap = {
          north: dungeonNode.connections.has(`${dungeonNode.x},${dungeonNode.y - 1}`),
          south: dungeonNode.connections.has(`${dungeonNode.x},${dungeonNode.y + 1}`),
          east: dungeonNode.connections.has(`${dungeonNode.x + 1},${dungeonNode.y}`),
          west: dungeonNode.connections.has(`${dungeonNode.x - 1},${dungeonNode.y}`),
        };

        // Create generic choices with direction tags for consistency
        choices = Object.entries(exitsMap)
          .filter(([_, isValid]) => isValid)
          .map(([dir], idx) => {
            const directionUpper = dir.charAt(0).toUpperCase() + dir.slice(1);
            return {
              id: `move-${dir}-${idx}`,
              text: `[${dir.toUpperCase()}] Go ${directionUpper}`, // Include tag for consistency
              actionPoints: 1,
              type: 'action' as const,
              metadata: { direction: dir as 'north' | 'south' | 'east' | 'west' },
            };
          });
        console.log('[PARSER] Created fallback choices:', choices.map(c => ({ id: c.id, text: c.text })));
      }

      // Update story log
      setStoryLog(prev => {
        if (prev.includes(description)) {
          return prev; // Already added
        }
        return [...prev, description];
      });
      // Add to adventure log if not already there
      if (!storyLog.includes(description)) {
        addLogEntry(description, 'info');
      }

      // Update current node - ensure all choices have correct format
      const transformedChoicesForDisplay = choices.map(ensureChoiceFormat);
      const roomNode: GameNode = {
        id: dungeonNode.id,
        type: 'location',
        description,
        choices: transformedChoicesForDisplay,
        imageUrl: imageUrl || undefined,
      };
      setCurrentNode(roomNode);
      
      // Update image state immediately if available
      if (imageUrl) {
        setCurrentRoomImage(imageUrl);
      }

      // Save to store for persistence
      // Ensure all choices have correct format before saving
      const transformedChoicesForSave = choices.map(ensureChoiceFormat);
      console.log('[SAVE] Saving choices to cache:', transformedChoicesForSave.map(c => c.text));
      
      const store = useDungeonStore.getState();
      const node = store.nodes.get(dungeonNode.id);
      if (node && !node.content && description && transformedChoicesForSave.length > 0) {
        // Extract entities from node's monster property
        const entities: string[] = [];
        if (dungeonNode.monster) {
          entities.push(dungeonNode.monster.name);
        }
        
        store.updateRoomContent(dungeonNode.id, {
          description,
          imageUrl: imageUrl || '',
          availableChoices: transformedChoicesForSave,
          isExplored: true,
          entities: entities,
          imagePrompt: imagePrompt || undefined, // Store the image prompt for monster segmentation
        });
      }

      console.log('Content processed, setting isLoading to false');
      setIsLoading(false);
    }
  }, [storyText, imageUrl, isGenerating, nodes, getCurrentNode]);

  // Force State Sync: Listen specifically to imageUrl (from the hook) and immediately update currentRoomImage
  // Only update if the imageUrl is different from what we already have
  // Don't overwrite with null if we already have a valid image from store
  useEffect(() => {
    // Only update if imageUrl from hook is non-null AND different from current
    // Don't overwrite with null if we already have a valid image
    if (imageUrl && imageUrl !== currentRoomImage) {
      console.log("HOOK UPDATED IMAGE:", imageUrl);
      console.log("Setting currentRoomImage to:", imageUrl);
      setCurrentRoomImage(imageUrl);
      
      // Also update currentNode if it exists and we're in a dungeon
      if (isInDungeon) {
        const dungeonNode = getCurrentNode();
        if (dungeonNode && dungeonNode.content?.imageUrl !== imageUrl) {
          console.log("Updating currentNode with imageUrl:", imageUrl);
          setCurrentNode(prev => ({
            ...prev,
            imageUrl: imageUrl,
          }));
        }
      }
    } else if (!imageUrl && !currentRoomImage && currentNode.imageUrl) {
      // If hook has no image but store does, use store value as fallback
      console.log("Hook imageUrl is null, but store has imageUrl - using store value:", currentNode.imageUrl);
      setCurrentRoomImage(currentNode.imageUrl);
    } else if (!imageUrl && currentRoomImage) {
      // Hook is null but we have a valid image - don't overwrite, just log
      console.log("Hook imageUrl is null, but currentRoomImage is set - keeping existing value");
    } else if (!imageUrl) {
      console.log("imageUrl is falsy in sync effect:", imageUrl);
    } else {
      console.log("imageUrl unchanged, skipping sync");
    }
  }, [imageUrl, isInDungeon, currentRoomImage, currentNode.imageUrl]); // Add currentNode.imageUrl to dependencies

  // Store Persistence: Save image URL to store immediately when received from hook
  useEffect(() => {
    if (imageUrl && currentNode.id) {
      console.log("Saving Image to Store:", imageUrl, "for node:", currentNode.id);
      // Get current node from store
      const store = useDungeonStore.getState();
      const node = store.nodes.get(currentNode.id);
      if (node) {
        // Update the node's content with the image URL (if content exists)
        if (node.content) {
          updateRoomContent(currentNode.id, {
            imageUrl: imageUrl,
          });
          console.log("Image URL saved to node.content for node:", currentNode.id);
        } else {
          console.warn("Node content doesn't exist yet for node:", currentNode.id, "- will be created when room content is generated");
        }
        
        // Also update currentNode.imageUrl directly for immediate UI update
        setCurrentNode(prev => ({
          ...prev,
          imageUrl: imageUrl,
        }));
        console.log("Image URL saved to currentNode.imageUrl for immediate display");
      } else {
        console.warn("Node not found in store for ID:", currentNode.id);
      }
    }
  }, [imageUrl, currentNode.id, updateRoomContent]);

  // Handle choice selection (movement or other actions)
  const handleChoice = async (choice: Choice) => {
    console.log('handleChoice called with:', choice);
    if (!character || !gameEngineRef.current) {
      console.error('Cannot handle choice: missing character or game engine');
      return;
    }

    // Check if this is a movement choice
    const direction = choice.metadata?.direction as 'north' | 'south' | 'east' | 'west' | undefined;
    
    if (direction) {
      // Handle movement - entering a new room
      console.log('Handling movement choice:', direction);
      const moved = movePlayer(direction);
      if (!moved) {
        setStoryLog(prev => [...prev, 'You cannot move in that direction.']);
      addLogEntry('You cannot move in that direction.', 'info');
        return;
      }
      // Mark that we're entering a room (not exiting)
      isEnteringRoomRef.current = true;
      await handleRoomEntry();
    } else if (choice.id === 'enter') {
      // Handle initial dungeon entry
      console.log('Handling enter dungeon choice');
      await enterDungeon();
    } else {
      // Handle other choices (future expansion)
      console.log('Handling other choice:', choice.text);
      setStoryLog(prev => [...prev, `You chose: ${choice.text}`]);
      addLogEntry(`You chose: ${choice.text}`, 'info');
    }
  };

  const storyLogRef = useRef<HTMLDivElement>(null);

  // Auto-scroll story log to bottom when new content is added
  useEffect(() => {
    if (storyLogRef.current) {
      storyLogRef.current.scrollTop = storyLogRef.current.scrollHeight;
    }
  }, [storyLog]);

  // [FIX 2] Robust image source calculation
  // Prioritize: currentNode.imageUrl (from store, most reliable) > currentRoomImage (local state) > imageUrl (hook, often null)
  // The store is the source of truth since it persists across re-renders
  const displayImageUrl = currentNode.imageUrl || currentRoomImage || imageUrl;
  
  // Debug Logging
  console.log('=== IMAGE STATE DEBUG ===');
  console.log({ 
    isGenerating, 
    isLoading, 
    hasImage: !!displayImageUrl, 
    url: displayImageUrl,
    imageUrl_fromHook: imageUrl,
    currentRoomImage: currentRoomImage,
    currentNode_imageUrl: currentNode.imageUrl
  });
  console.log('========================');

  // Check if we should enter combat when entering a room with a monster
  // IMPORTANT: This hook must be BEFORE any early returns to maintain hook order
  useEffect(() => {
    // Only check for combat if we're in dungeon, not already in combat, and have a location
    if (!isInDungeon || isInCombat || !playerLocation) {
      // Reset combat node ref when moving to a different node (and not in combat)
      if (combatNodeRef.current && combatNodeRef.current !== playerLocation) {
        combatNodeRef.current = null;
      }
      return;
    }
    
    const dungeonNode = getCurrentNode();
    
    // Only enter combat if:
    // 1. Node type is COMBAT
    // 2. Node has a monster
    // 3. We haven't already entered combat for this node
    if (dungeonNode?.type === 'COMBAT' && dungeonNode?.monster && combatNodeRef.current !== dungeonNode.id) {
      // Convert monster to EnemyData format
      const scaledMonster = scaleMonsterToLevel(dungeonNode.monster, dungeonNode.monster.level || 1);
      const enemy: EnemyData = {
        id: scaledMonster.id,
        name: scaledMonster.name,
        level: scaledMonster.level || 1,
        hp: {
          current: scaledMonster.stats.maxHP,
          max: scaledMonster.stats.maxHP,
        },
        stats: scaledMonster.stats,
        statusEffects: [],
        buffs: {},
      };
      setCurrentEnemy(enemy);
      setCombatEnemyHP({ current: enemy.hp.current, max: enemy.hp.max }); // Initialize combat HP tracking
      setIsInCombat(true);
      combatNodeRef.current = dungeonNode.id; // Mark this node as having entered combat
    }
  }, [isInDungeon, playerLocation]); // Removed isInCombat and getCurrentNode from dependencies to prevent loop

  // Fix the Overlay Condition: Only show overlay if image is generating AND we don't have an image URL yet
  // Do NOT block the image if story (isLoading) is still generating
  const showOverlay = isGenerating && !displayImageUrl;

  // Show loading screen if needed
  if (showLoadingScreen) {
    return <LoadingScreen onComplete={onLoadingComplete} preRenderAllRooms={preRenderAllRooms} />;
  }

  // Get narrative text - use storyText if generating, otherwise use currentNode description or storyLog
  // Remove both CHOICES and Exits sections from the displayed text
  const narrativeText = isGenerating && storyText
    ? storyText.split(/(CHOICES?:|\*\*Exits?:\*\*)/i)[0].trim()
    : storyLog.length > 0
    ? storyLog[storyLog.length - 1]
    : currentNode.description;

  // Handle combat end
  const handleCombatEnd = async (victory: boolean) => {
    setIsInCombat(false);
    setCurrentEnemy(null);
    setCombatEnemyHP(null); // Clear combat HP tracking when combat ends
    setIsEnemyDying(false); // Reset dying state
    
    if (victory && currentEnemy) {
      // Calculate and gain XP
      const dungeonNode = getCurrentNode();
      const xpGained = calculateXP(
        currentEnemy.level,
        character.level,
        progression.currentFloor,
        dungeonNode?.type === 'BOSS',
        progression.stepsOnCurrentFloor
      );
      
      const levelResult = gainXP(character, xpGained);
      if (levelResult.leveledUp) {
        updateHP(levelResult.character.hp.current);
        addLogEntry(`Level up! You are now level ${levelResult.character.level}!`, 'success');
        setLevelUpNotification(levelResult.character.level);
      }
      updateXP(levelResult.character.xp);
      
      // Update character with leveled up stats
      Object.assign(character, levelResult.character);
      
      addLogEntry(`Victory! Gained ${xpGained} XP.`, 'success');
      
      // Check for item drop
      if (shouldDropItem(dungeonNode?.type || 'NORMAL', progression.currentFloor)) {
        const item = generateItemForFloor(progression.currentFloor);
        character.inventory.push(item as any);
        addLogEntry(`Found ${item.name}!`, 'info');
      }
      
      // Clear monster from node
      const updatedNodes = new Map(nodes);
      const node = updatedNodes.get(dungeonNode?.id || '');
      if (node) {
        node.monster = null;
        useDungeonStore.setState({ nodes: updatedNodes });
      }
      
      // Update room content to reflect monster defeat
      if (dungeonNode) {
        updateRoomContent(dungeonNode.id, {
          description: dungeonNode.content?.description || `You have defeated the ${currentEnemy.name}!`,
        });
      }
    } else if (!victory) {
      addLogEntry('Defeat! You have been slain...', 'error');
      // Handle death (could reset dungeon, etc.)
    }
    
    setCurrentEnemy(null);
  };

  return (
    <div className="main-view relative bg-black flex flex-col h-full">
      {/* Scene Layer - Background Image */}
      <div className="scene-layer">
        <AtmosphericImage 
          key={`${currentNode.id}-${displayImageUrl}`} 
          imageUrl={displayImageUrl}
          pixelationEnabled={pixelationEnabled}
          pixelationMode={pixelationMode}
        />

        {/* Monster Highlight Overlay - Only on combat nodes with monsters */}
        {(() => {
          const dungeonNode = getCurrentNode();
          // Only show monster highlight on combat nodes that have a monster
          if (dungeonNode?.type !== 'COMBAT') {
            return null;
          }
          const monster = dungeonNode?.monster || null;
          
          // Don't render if no monster (even on COMBAT nodes)
          if (!monster) {
            console.warn('[GameInterface] COMBAT node has no monster assigned:', dungeonNode.id);
            return null;
          }
          
          // Get image prompt from hook (current generation) or from saved content
          const currentImagePrompt = imagePrompt || dungeonNode?.content?.imagePrompt || null;
          
          // Get cached segmentation URL from room content
          const cachedSegmentationUrl = dungeonNode?.content?.segmentedMonsterUrl || null;
          
          // Detailed logging for debugging
          console.log('[GameInterface] ====== MONSTER HIGHLIGHT DEBUG ======');
          console.log('[GameInterface] Node ID:', dungeonNode?.id);
          console.log('[GameInterface] Node type:', dungeonNode?.type);
          console.log('[GameInterface] Has monster:', !!monster);
          console.log('[GameInterface] Monster name:', monster?.name);
          console.log('[GameInterface] Image URL:', displayImageUrl?.substring(0, 80) + '...');
          console.log('[GameInterface] Has image prompt:', !!currentImagePrompt);
          console.log('[GameInterface] Cached segmentation URL:', cachedSegmentationUrl ? cachedSegmentationUrl.substring(0, 100) + '...' : 'NULL');
          console.log('[GameInterface] Cached segmentation URL type:', typeof cachedSegmentationUrl);
          console.log('[GameInterface] Cached segmentation URL length:', cachedSegmentationUrl ? cachedSegmentationUrl.length : 0);
          console.log('[GameInterface] Full room content keys:', dungeonNode?.content ? Object.keys(dungeonNode.content).join(', ') : 'no content');
          if (dungeonNode?.content?.segmentedMonsterUrl) {
            console.log('[GameInterface] ✓✓✓ SEGMENTED URL FOUND IN ROOM CONTENT ✓✓✓');
            console.log('[GameInterface] Full segmented URL from content:', dungeonNode.content.segmentedMonsterUrl);
          } else {
            console.warn('[GameInterface] ⚠ NO SEGMENTED URL IN ROOM CONTENT');
            console.warn('[GameInterface] Room content object:', dungeonNode?.content ? JSON.stringify(Object.keys(dungeonNode.content)) : 'no content');
          }
          console.log('[GameInterface] ======================================');
          
          // Callback to save segmentation URL to room content
          const handleSegmentationComplete = (url: string) => {
            console.log('[GameInterface] handleSegmentationComplete called with URL:', url.substring(0, 100) + '...');
            updateRoomContent(dungeonNode.id, {
              segmentedMonsterUrl: url
            });
            console.log('[GameInterface] ✓ Saved segmentation URL to room content');
          };
          return <MonsterHighlight 
            monster={monster} 
            imageUrl={displayImageUrl} 
            imagePrompt={currentImagePrompt} 
            showDetectionBox={showSegmentationBox}
            cachedSegmentationUrl={cachedSegmentationUrl}
            onSegmentationComplete={handleSegmentationComplete}
            pixelationEnabled={pixelationEnabled}
            pixelationMode={pixelationMode}
            animationEnabled={true}
            enemyHP={isInCombat && (combatEnemyHP || currentEnemy) ? (combatEnemyHP || { current: currentEnemy!.hp.current, max: currentEnemy!.hp.max }) : undefined}
            enemyLevel={isInCombat && currentEnemy ? currentEnemy.level : undefined}
            isDying={isEnemyDying}
            onBoundsChange={(bounds) => {
              if (bounds) {
                setEnemyPosition({ centerX: bounds.centerX, centerY: bounds.centerY });
                setMonsterBounds(bounds);
              } else {
                setEnemyPosition(null);
                setMonsterBounds(null);
              }
            }}
            onDyingChange={(dying) => {
              const wasDying = isEnemyDying;
              setIsEnemyDying(dying);
              // When death animation completes (dying becomes false after being true), end combat
              if (!dying && wasDying) {
                // Small delay to ensure state is updated
                setTimeout(() => {
                  handleCombatEnd(true);
                }, 50);
              }
            }}
          />;
        })()}

        {/* Loading Overlay */}
        {showOverlay && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 z-10">
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 border-4 rounded-full animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }}></div>
              <p className="text-sm animate-pulse" style={{ color: 'var(--accent)' }}>
                Conjuring visuals...
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Left Gradient Overlay - outside scene-layer */}
      <div className="overlay-left"></div>

      {/* Right Gradient Overlay - outside scene-layer */}
      <div className="overlay-right"></div>

      {/* Pre-render Toggle - Only show when not in dungeon */}
      {!isInDungeon && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20 flex items-center justify-between p-3 rounded border" style={{ background: 'rgba(0,0,0,0.5)', borderColor: 'rgba(255,255,255,0.1)' }}>
          <label htmlFor="preRenderToggle" className="text-xs cursor-pointer flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
            <span className="font-cinzel" style={{ color: 'var(--gold)' }}>Pre-render all rooms</span>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>(Slower loading, instant gameplay)</span>
          </label>
          <button
            id="preRenderToggle"
            type="button"
            onClick={() => handleToggleChange(!preRenderAllRooms)}
            className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer"
            style={{ background: preRenderAllRooms ? 'var(--accent)' : 'rgba(102,102,102,0.5)' }}
            aria-label="Toggle pre-render all rooms"
          >
            <span
              className="inline-block h-3 w-3 transform rounded-full bg-white transition-transform"
              style={{ transform: preRenderAllRooms ? 'translateX(1.25rem)' : 'translateX(0.25rem)' }}
            />
          </button>
        </div>
      )}

      {/* Command Console - Bottom Center */}
      {(() => {
        // Calculate exit flags from current node to filter buttons
        const dungeonNode = getCurrentNode();
        const exitFlags = dungeonNode ? {
          hasNorth: dungeonNode.connections.has(`${dungeonNode.x},${dungeonNode.y - 1}`),
          hasEast: dungeonNode.connections.has(`${dungeonNode.x + 1},${dungeonNode.y}`),
          hasWest: dungeonNode.connections.has(`${dungeonNode.x - 1},${dungeonNode.y}`),
          hasSouth: dungeonNode.connections.has(`${dungeonNode.x},${dungeonNode.y + 1}`),
        } : { hasNorth: false, hasEast: false, hasWest: false, hasSouth: false };
        
        // Filter choices to only show valid exits
        const validChoices = currentNode.choices ? currentNode.choices.filter(choice => {
          const { direction } = getDirectionInfo(choice.text);
          if (!direction) return true; // Non-directional choices (e.g., actions) are always valid
          // Check if the direction has a valid exit
          if (direction === 'NORTH') return exitFlags.hasNorth;
          if (direction === 'EAST') return exitFlags.hasEast;
          if (direction === 'WEST') return exitFlags.hasWest;
          if (direction === 'SOUTH') return exitFlags.hasSouth;
          return true; // Unknown directions are allowed (fallback)
        }) : [];
        
        // Sort choices logically: North first, then East/West, then South
        const directionOrder: Record<string, number> = {
          'NORTH': 1,
          'EAST': 2,
          'WEST': 3,
          'SOUTH': 4,
        };
        
        const sortedChoices = [...validChoices].sort((a, b) => {
          const aDir = getDirectionInfo(a.text).direction || '';
          const bDir = getDirectionInfo(b.text).direction || '';
          const aOrder = directionOrder[aDir] || 99;
          const bOrder = directionOrder[bDir] || 99;
          return aOrder - bOrder;
        }).map(choice => ensureChoiceFormat(choice));
        
        return (
          <CommandConsole
            narrativeText={narrativeText}
            choices={sortedChoices}
            onChoiceSelect={handleChoice}
            isLoading={isLoading}
            isGenerating={isGenerating}
            isInCombat={isInCombat}
            character={character}
            enemy={currentEnemy}
            onCombatEnd={handleCombatEnd}
            autoBattle={autoBattle}
            setAutoBattle={setAutoBattle}
            enemyPosition={enemyPosition}
            setEnemyPosition={setEnemyPosition}
            monsterBounds={monsterBounds}
            onAttackAnimation={(path) => {
              setAttackAnimationPath(path);
              setShowAttackAnimation(true);
            }}
            onHitEffect={(data) => {
              setHitEffectData(data);
              setShowHitEffect(true);
            }}
            onEnemyHPUpdate={(hp) => {
              setCombatEnemyHP(hp);
              // Also update currentEnemy to keep it in sync
              if (currentEnemy) {
                setCurrentEnemy({
                  ...currentEnemy,
                  hp: hp,
                });
              }
            }}
            onEnemyDyingChange={(dying) => {
              setIsEnemyDying(dying);
            }}
          />
        );
      })()}

      {/* Level Up Notification */}
      {levelUpNotification && (
        <LevelUpNotification
          newLevel={levelUpNotification}
          onComplete={() => setLevelUpNotification(null)}
        />
      )}

      {/* Attack Animations - Rendered at GameInterface level to appear over monster */}
      {showAttackAnimation && attackAnimationPath && (
        <AttackAnimation
          fromX={attackAnimationPath.fromX}
          fromY={attackAnimationPath.fromY}
          toX={attackAnimationPath.toX}
          toY={attackAnimationPath.toY}
          onComplete={() => {
            setShowAttackAnimation(false);
            setAttackAnimationPath(null);
          }}
        />
      )}

      {/* Hit Effect - Rendered at GameInterface level to appear over monster */}
      {showHitEffect && hitEffectData && (
        <HitEffect
          x={hitEffectData.x}
          y={hitEffectData.y}
          isCritical={hitEffectData.isCritical}
          onComplete={() => {
            setShowHitEffect(false);
            setHitEffectData(null);
          }}
        />
      )}
    </div>
  );
}
