'use client';

import { create } from 'zustand';
import { DungeonNode, DungeonState, Exits, RoomContent, PromptPattern } from './types';
import { DungeonGenerator, getExits } from './generator';
import { generateRoomContent } from './content';
import { getRandomMonster, getAllMonsters, getRandomMonsterFromPool, calculateMonsterLevel, scaleMonsterToLevel } from '@/lib/game/monsters';
import { determineVisualConfiguration, VisualConfiguration } from './geometry';
import { PROMPT_ARCHETYPE_NAMES, getRelativeExits } from './prompt-logic';
import { getInitialProgression, updateProgression, calculateFloorByDistance } from './progression';

/**
 * Check if a node matches STRAIGHT_PATH topology
 * Uses the visual configuration system to determine if this is a straight corridor
 * Straight corridors should not have monsters as they block door views
 */
function isStraightPathTopology(node: DungeonNode, allNodes: Map<string, DungeonNode>): boolean {
  // Calculate exits for this node
  const exits = getExits(node.id, allNodes);
  
  // For monster spawning, we need to check all possible entry directions
  // A node is a straight path if it has exactly 2 opposite connections
  // (which will always result in STRAIGHT_PATH visual config regardless of entry direction)
  if (node.connections.size !== 2) {
    return false;
  }

  // Get the two connected nodes
  const connectedIds = Array.from(node.connections.keys());
  const connected1 = allNodes.get(connectedIds[0]);
  const connected2 = allNodes.get(connectedIds[1]);

  if (!connected1 || !connected2) {
    return false;
  }

  // Calculate relative positions
  const dx1 = connected1.x - node.x;
  const dy1 = connected1.y - node.y;
  const dx2 = connected2.x - node.x;
  const dy2 = connected2.y - node.y;

  // Check if connections are opposite (NORTH-SOUTH or EAST-WEST)
  const isOpposite = 
    (dx1 === 0 && dy1 === -1 && dx2 === 0 && dy2 === 1) || // North-South
    (dx1 === 0 && dy1 === 1 && dx2 === 0 && dy2 === -1) || // South-North
    (dx1 === 1 && dy1 === 0 && dx2 === -1 && dy2 === 0) || // East-West
    (dx1 === -1 && dy1 === 0 && dx2 === 1 && dy2 === 0);    // West-East

  // If opposite, verify it results in STRAIGHT_PATH for any entry direction
  if (isOpposite) {
    // Test with a sample entry direction (north) - if it's truly straight, 
    // it will be STRAIGHT_PATH regardless of entry direction
    const config = determineVisualConfiguration(exits, 'north', node);
    return config === 'STRAIGHT_PATH';
  }

  return false;
}

interface DungeonStore extends DungeonState {
  // Actions
  generateDungeon: () => boolean;
  movePlayer: (direction: 'north' | 'south' | 'east' | 'west') => boolean;
  markVisited: (nodeId: string) => void;
  getCurrentNode: () => DungeonNode | null;
  getExitsForCurrentNode: () => Exits;
  getVisibleNodes: () => Set<string>; // Fog of war: current + visited + neighbors
  enterRoom: (nodeId: string, character: any, gameEngine: any) => Promise<RoomContent | null>;
  updateRoomContent: (nodeId: string, updates: Partial<RoomContent>) => void;
  reset: () => void;
  // Pattern management
  selectedNodes: Set<string>;
  addSelectedNode: (nodeId: string) => void;
  removeSelectedNode: (nodeId: string) => void;
  clearSelectedNodes: () => void;
  createPatternFromSelection: (promptIndex: number, name?: string) => PromptPattern | null;
  deletePattern: (patternId: string) => void;
  updatePattern: (patternId: string, updates: { promptIndex?: number; name?: string }) => void;
  getPatternForNode: (nodeId: string) => PromptPattern | null;
  // Node prompt override management
  setNodePromptOverride: (nodeId: string, promptText: string) => void;
  getNodePromptOverride: (nodeId: string) => string | null;
  clearNodePromptOverride: (nodeId: string) => void;
  clearAllNodePromptOverrides: () => void;
  // Node prompt index override management (manual prompt selection)
  setNodePromptIndexOverride: (nodeId: string, promptIndex: number | null) => void;
  getNodePromptIndexOverride: (nodeId: string) => number | null;
  clearNodePromptIndexOverride: (nodeId: string) => void;
  // Manual override management (topology, entry direction, prompt index)
  setManualTopologyOverride: (topologyPattern: string, exits: Exits | null) => void;
  getManualTopologyOverride: (topologyPattern: string) => Exits | null;
  setManualEntryDirectionOverride: (topologyPattern: string, entryDirection: 'north' | 'south' | 'east' | 'west' | null) => void;
  getManualEntryDirectionOverride: (topologyPattern: string) => 'north' | 'south' | 'east' | 'west' | null;
  setManualPromptIndexOverride: (topologyPattern: string, promptIndex: number | null) => void;
  getManualPromptIndexOverride: (topologyPattern: string) => number | null;
  clearAllManualOverrides: () => void;
  // Monster pool management
  // Structure: Map<topologyIndex, Map<monsterId, Map<entryDirection, customPrompt>>>
  // entryDirection can be 'north' | 'south' | 'east' | 'west' | null
  // null is used as fallback/default when entry direction isn't available
  // If customPrompt is empty string, monster won't appear in image
  monsterPools: Map<number, Map<string, Map<string | null, string>>>;
  getMonsterPool: (topologyIndex: number) => Map<string, Map<string | null, string>>;
  getMonsterPrompt: (topologyIndex: number, monsterId: string, entryDirection?: 'north' | 'south' | 'east' | 'west' | null) => string | null;
  addMonsterToPool: (topologyIndex: number, monsterId: string, customPrompt?: string, entryDirection?: 'north' | 'south' | 'east' | 'west' | null) => void;
  removeMonsterFromPool: (topologyIndex: number, monsterId: string) => void;
  setMonsterPrompt: (topologyIndex: number, monsterId: string, customPrompt: string, entryDirection?: 'north' | 'south' | 'east' | 'west' | null) => void;
  setMonsterPool: (topologyIndex: number, monsterIds: string[]) => void;
  clearMonsterPool: (topologyIndex: number) => void;
  resetAllMonsterPools: () => void;
  removeMonsterFromAllPools: (monsterId: string) => void;
}

// Load patterns from localStorage
const loadPatternsFromStorage = (): PromptPattern[] => {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem('dungeon-prompt-patterns');
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to load patterns from localStorage:', e);
  }
  return [];
};

// Save patterns to localStorage
const savePatternsToStorage = (patterns: PromptPattern[]) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('dungeon-prompt-patterns', JSON.stringify(patterns));
  } catch (e) {
    console.error('Failed to save patterns to localStorage:', e);
  }
};

/**
 * Create topology key string from exits (e.g., "N+E" or "N+S+W")
 */
export function getTopologyKey(exits: Exits): string {
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

// Load node prompt overrides from localStorage
const loadNodeOverridesFromStorage = (): Record<string, string> => {
  if (typeof window === 'undefined') return {};
  try {
    const stored = localStorage.getItem('dungeon-node-prompt-overrides-v2');
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to load node overrides from localStorage:', e);
  }
  return {};
};

// Save node prompt overrides to localStorage
const saveNodeOverridesToStorage = (overrides: Record<string, string>) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('dungeon-node-prompt-overrides-v2', JSON.stringify(overrides));
  } catch (e) {
    console.error('Failed to save node overrides to localStorage:', e);
  }
};

// Load node prompt index overrides from localStorage (now topology-based)
const loadNodePromptIndexOverridesFromStorage = (): Record<string, number> => {
  if (typeof window === 'undefined') return {};
  try {
    // Try new topology-based key first
    const stored = localStorage.getItem('dungeon-prompt-index-overrides-by-topology');
    if (stored) {
      return JSON.parse(stored);
    }
    // Fallback: try old nodeId-based key for migration
    const oldStored = localStorage.getItem('dungeon-node-prompt-index-overrides');
    if (oldStored) {
      console.log('[Migration] Found old nodeId-based overrides, migrating to topology-based...');
      // Old format won't be migrated automatically, user will need to re-set
      localStorage.removeItem('dungeon-node-prompt-index-overrides');
    }
  } catch (e) {
    console.error('Failed to load node prompt index overrides from localStorage:', e);
  }
  return {};
};

// Save node prompt index overrides to localStorage (topology-based)
const saveNodePromptIndexOverridesToStorage = (overrides: Record<string, number>) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('dungeon-prompt-index-overrides-by-topology', JSON.stringify(overrides));
  } catch (e) {
    console.error('Failed to save node prompt index overrides to localStorage:', e);
  }
};

// Load manual topology overrides from localStorage
const loadManualTopologyOverridesFromStorage = (): Record<string, Exits> => {
  if (typeof window === 'undefined') return {};
  try {
    const stored = localStorage.getItem('dungeon-manual-topology-overrides');
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to load manual topology overrides from localStorage:', e);
  }
  return {};
};

// Save manual topology overrides to localStorage
const saveManualTopologyOverridesToStorage = (overrides: Record<string, Exits>) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('dungeon-manual-topology-overrides', JSON.stringify(overrides));
  } catch (e) {
    console.error('Failed to save manual topology overrides to localStorage:', e);
  }
};

// Load manual entry direction overrides from localStorage
const loadManualEntryDirectionOverridesFromStorage = (): Record<string, 'north' | 'south' | 'east' | 'west' | null> => {
  if (typeof window === 'undefined') return {};
  try {
    const stored = localStorage.getItem('dungeon-manual-entry-direction-overrides');
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to load manual entry direction overrides from localStorage:', e);
  }
  return {};
};

// Save manual entry direction overrides to localStorage
const saveManualEntryDirectionOverridesToStorage = (overrides: Record<string, 'north' | 'south' | 'east' | 'west' | null>) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('dungeon-manual-entry-direction-overrides', JSON.stringify(overrides));
  } catch (e) {
    console.error('Failed to save manual entry direction overrides to localStorage:', e);
  }
};

// Load monster pools from localStorage
// Structure: Map<topologyIndex, Map<monsterId, Map<entryDirection, customPrompt>>>
const loadMonsterPoolsFromStorage = (): Map<number, Map<string, Map<string | null, string>>> => {
  if (typeof window === 'undefined') return new Map();
  try {
    const stored = localStorage.getItem('dungeon-monster-pools');
    if (stored) {
      const data = JSON.parse(stored);
      const pools = new Map<number, Map<string, Map<string | null, string>>>();
      for (const [key, value] of Object.entries(data)) {
        const topologyIndex = Number(key);
        const monsterMap = new Map<string, Map<string | null, string>>();
        
        // Handle old format (array of strings) - migrate to new format with null entry direction
        if (Array.isArray(value)) {
          (value as string[]).forEach(monsterId => {
            const entryMap = new Map<string | null, string>();
            entryMap.set(null, ''); // Old format stored under null key
            monsterMap.set(monsterId, entryMap);
          });
        } else if (typeof value === 'object' && value !== null) {
          // Handle old format (monsterId -> prompt) - migrate to new format
          for (const [monsterId, promptOrEntryMap] of Object.entries(value)) {
            const entryMap = new Map<string | null, string>();
            if (typeof promptOrEntryMap === 'string') {
              // Old format: direct prompt string - migrate to null key
              entryMap.set(null, promptOrEntryMap || '');
            } else if (typeof promptOrEntryMap === 'object' && promptOrEntryMap !== null) {
              // New format: entry direction -> prompt
              for (const [entryDir, prompt] of Object.entries(promptOrEntryMap)) {
                const entryKey = entryDir === 'null' ? null : entryDir;
                entryMap.set(entryKey, (prompt as string) || '');
              }
            }
            monsterMap.set(monsterId, entryMap);
          }
        }
        pools.set(topologyIndex, monsterMap);
      }
      return pools;
    }
  } catch (e) {
    console.error('Failed to load monster pools from localStorage:', e);
  }
  return new Map();
};

// Save monster pools to localStorage
const saveMonsterPoolsToStorage = (pools: Map<number, Map<string, Map<string | null, string>>>) => {
  if (typeof window === 'undefined') return;
  try {
    const data: Record<string, Record<string, Record<string, string>>> = {};
    pools.forEach((monsterMap, topologyIndex) => {
      const monsterData: Record<string, Record<string, string>> = {};
      monsterMap.forEach((entryMap, monsterId) => {
        const entryData: Record<string, string> = {};
        entryMap.forEach((prompt, entryDir) => {
          entryData[entryDir === null ? 'null' : entryDir] = prompt;
        });
        monsterData[monsterId] = entryData;
      });
      data[topologyIndex.toString()] = monsterData;
    });
    localStorage.setItem('dungeon-monster-pools', JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save monster pools to localStorage:', e);
  }
};

// Initialize monster pools with all monsters (default)
const initializeMonsterPools = (): Map<number, Map<string, Map<string | null, string>>> => {
  const allMonsters = getAllMonsters();
  
  const pools = new Map<number, Map<string, Map<string | null, string>>>();
  // Initialize all 8 topologies (0-7) with all monsters (empty prompts under null key)
  for (let i = 0; i < 8; i++) {
    const monsterMap = new Map<string, Map<string | null, string>>();
    allMonsters.forEach(monster => {
      const entryMap = new Map<string | null, string>();
      entryMap.set(null, ''); // Empty string = no monster in image
      monsterMap.set(monster.id, entryMap);
    });
    pools.set(i, monsterMap);
  }
  return pools;
};

export const useDungeonStore = create<DungeonStore>((set, get) => ({
  nodes: new Map(),
  startNodeId: '',
  bossNodeId: '',
  playerLocation: '',
  visitedNodes: new Set<string>(),
  seenNodes: new Set<string>(), // Track nodes that have been seen on minimap
  entryDirection: null, // Direction player entered current room from
  progression: getInitialProgression(),
  promptPatterns: loadPatternsFromStorage(),
  nodePromptOverrides: loadNodeOverridesFromStorage(),
  nodePromptIndexOverrides: loadNodePromptIndexOverridesFromStorage(),
  manualTopologyOverrides: loadManualTopologyOverridesFromStorage(),
  manualEntryDirectionOverrides: loadManualEntryDirectionOverridesFromStorage(),
  manualPromptIndexOverrides: loadNodePromptIndexOverridesFromStorage(), // Same storage as nodePromptIndexOverrides
  selectedNodes: new Set<string>(),
  monsterPools: (() => {
    const loaded = loadMonsterPoolsFromStorage();
    // If no pools in storage, initialize with all monsters
    if (loaded.size === 0) {
      return initializeMonsterPools();
    }
    // Ensure all 8 topologies exist (in case new topologies were added)
    const allMonsters = getAllMonsters();
    for (let i = 0; i < 8; i++) {
      if (!loaded.has(i)) {
        const monsterMap = new Map<string, Map<string | null, string>>();
        allMonsters.forEach(monster => {
          const entryMap = new Map<string | null, string>();
          entryMap.set(null, '');
          monsterMap.set(monster.id, entryMap);
        });
        loaded.set(i, monsterMap);
      } else {
        // Ensure all current monsters exist in pool (add new monsters with empty prompts)
        const existingPool = loaded.get(i)!;
        allMonsters.forEach(monster => {
          if (!existingPool.has(monster.id)) {
            const entryMap = new Map<string | null, string>();
            entryMap.set(null, '');
            existingPool.set(monster.id, entryMap);
          }
        });
      }
    }
    return loaded;
  })(),

  generateDungeon: () => {
    const generator = new DungeonGenerator();
    let attempts = 0;
    let success = false;

    while (attempts < 20 && !success) {
      success = generator.generateMap();
      if (!success) attempts++;
    }

    if (success) {
      const nodes = generator.getNodes();
      const startNodeId = generator.getStartNodeId();
      const bossNodeId = generator.getBossNodeId();

      if (!startNodeId) return false;

      // Populate monsters for all nodes (with topology-aware spawning)
      const updatedNodes = new Map(nodes);
      updatedNodes.forEach((node, nodeId) => {
        if (node.type === 'START') {
          // START room: no monster
          node.monster = null;
        } else if (node.type === 'BOSS') {
          // BOSS room: always has a boss monster
          node.monster = getRandomMonster(1, 'boss');
        } else if (node.type === 'COMBAT') {
          // COMBAT room: always has a monster (100% chance)
          // Calculate topology index for pool selection
          const exits = getExits(nodeId, updatedNodes);
          const { hasLeft, hasAhead, hasRight } = getRelativeExits(node, updatedNodes, null, exits);
          const topologyIndex = (hasLeft ? 4 : 0) + (hasAhead ? 2 : 0) + (hasRight ? 1 : 0);
          
          // Get monster from topology-specific pool
          const { monsterPools } = get();
          let monster = getRandomMonsterFromPool(topologyIndex, monsterPools, 1);
          
          // Fallback: if pool selection failed, try default behavior
          if (!monster) {
            monster = getRandomMonster(1, 'common');
          }
          if (!monster) {
            monster = getRandomMonster(1, 'uncommon');
          }
          if (!monster) {
            monster = getRandomMonster(1, 'boss');
          }
          
          // Final validation: COMBAT nodes should ALWAYS have a monster
          if (!monster) {
            console.error(`[DungeonStore] CRITICAL: COMBAT node ${nodeId} has no monster assigned after all fallbacks!`);
            // Last resort: try without forceTier (shouldn't happen if monsters exist)
            monster = getRandomMonster(1);
            if (!monster) {
              console.error(`[DungeonStore] CRITICAL: No monsters available at all for level 1!`);
            }
          }
          
          node.monster = monster;
        } else {
          // Topology-aware monster spawning
          // Skip STRAIGHT_PATH topology (they block door views)
          if (isStraightPathTopology(node, updatedNodes)) {
            node.monster = null;
          } else {
            // Prioritize dead ends (1 connection) for monster placement
            if (node.connections.size === 1) {
              // Dead ends: higher chance of monster (70% instead of default)
              const roll = Math.random();
              node.monster = roll < 0.7 ? getRandomMonster(1) : null;
            } else if (node.connections.size >= 3) {
              // Large rooms (3+ connections): only spawn if described as "standing in center"
              // For now, use default spawn chance but could be enhanced later
              node.monster = getRandomMonster(1);
            } else {
              // Corners/turns (2 connections that are NOT opposite): allow monsters
              node.monster = getRandomMonster(1);
            }
          }
        }
        updatedNodes.set(nodeId, node);
      });

      // Mark start node as visited
      const startNode = updatedNodes.get(startNodeId);
      const visitedNodes = new Set<string>();
      const seenNodes = new Set<string>();
      if (startNode) {
        startNode.visited = true;
        visitedNodes.add(startNodeId);
        seenNodes.add(startNodeId); // Start node is always seen
      }

      set({
        nodes: updatedNodes,
        startNodeId,
        bossNodeId: bossNodeId || '',
        playerLocation: startNodeId,
        visitedNodes,
        seenNodes,
        entryDirection: null, // Start room has no entry direction
        progression: getInitialProgression(), // Reset progression
      });

      return true;
    }

    return false;
  },

  movePlayer: (direction: 'north' | 'south' | 'east' | 'west') => {
    const { nodes, playerLocation, startNodeId, progression } = get();
    const currentNode = nodes.get(playerLocation);
    if (!currentNode) return false;

    const exits = getExits(playerLocation, nodes);
    if (!exits[direction]) return false;

    // Calculate target coordinates
    const dx = direction === 'east' ? 1 : direction === 'west' ? -1 : 0;
    const dy = direction === 'north' ? -1 : direction === 'south' ? 1 : 0;

    const targetX = currentNode.x + dx;
    const targetY = currentNode.y + dy;
    const targetId = `${targetX},${targetY}`;

    const targetNode = nodes.get(targetId);
    if (!targetNode) return false;

    // Calculate entry direction (opposite of movement direction)
    // If moving north, entering from south; if moving east, entering from west, etc.
    let entryDirection: 'north' | 'south' | 'east' | 'west' | null = null;
    if (direction === 'north') entryDirection = 'south';
    else if (direction === 'south') entryDirection = 'north';
    else if (direction === 'east') entryDirection = 'west';
    else if (direction === 'west') entryDirection = 'east';

    // #region agent log
    fetch('http://127.0.0.1:7249/ingest/08331948-86a3-4f5f-b660-2645d043da0c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'store.ts:287',message:'movePlayer: entryDirection calculated',data:{direction,movementDirection:direction,calculatedEntryDirection:entryDirection,fromNodeId:playerLocation,toNodeId:targetId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion

    // Update progression
    const startNode = nodes.get(startNodeId);
    if (!startNode) return false;
    
    const newProgression = updateProgression(progression, targetNode, startNode);
    
    // Spawn/scale monster for this room
    const floor = newProgression.currentFloor;
    const monsterLevel = calculateMonsterLevel(floor, targetNode.type);
    
    // Spawn monster based on room type
    let shouldSpawnMonster = false;
    let spawnChance = 0;
    
    switch (targetNode.type) {
      case 'COMBAT':
        shouldSpawnMonster = true; // 100% chance
        break;
      case 'BOSS':
        shouldSpawnMonster = true; // Always boss
        break;
      case 'NORMAL':
        spawnChance = 0.3; // 30% chance
        break;
      case 'TREASURE':
        spawnChance = 0.2; // 20% chance (weaker guardian)
        break;
      case 'EVENT':
        spawnChance = 0.1; // 10% chance
        break;
      case 'DEAD_END':
        spawnChance = 0.7; // 70% chance (higher risk/reward)
        break;
      case 'START':
      case 'MERCHANT':
        shouldSpawnMonster = false; // Never spawn
        break;
    }
    
    // Spawn or scale monster
    if (shouldSpawnMonster || (spawnChance > 0 && Math.random() < spawnChance)) {
      if (!targetNode.monster) {
        // Spawn new monster
        const topologyIndex = (() => {
          const exits = getExits(targetId, nodes);
          const { hasLeft, hasAhead, hasRight } = getRelativeExits(targetNode, nodes, entryDirection, exits);
          return (hasLeft ? 4 : 0) + (hasAhead ? 2 : 0) + (hasRight ? 1 : 0);
        })();
        
        const { monsterPools } = get();
        let monster = getRandomMonsterFromPool(topologyIndex, monsterPools, floor);
        
        if (!monster) {
          // Fallback
          monster = getRandomMonster(floor, targetNode.type === 'BOSS' ? 'boss' : undefined);
        }
        
        if (monster) {
          targetNode.monster = scaleMonsterToLevel(monster, monsterLevel);
        }
      } else {
        // Re-scale existing monster to current floor
        targetNode.monster = scaleMonsterToLevel(targetNode.monster, monsterLevel);
      }
    } else {
      // Clear monster if shouldn't spawn
      targetNode.monster = null;
    }

    // Mark target as visited and create new Map reference for Zustand
    targetNode.visited = true;
    const newNodes = new Map(nodes);
    newNodes.set(targetId, targetNode);
    
    // Update visited nodes set
    const { visitedNodes, seenNodes } = get();
    const newVisitedNodes = new Set(visitedNodes);
    newVisitedNodes.add(targetId);
    
    // Also mark as seen if not already
    const newSeenNodes = new Set(seenNodes);
    newSeenNodes.add(targetId);
    
    set({ 
      nodes: newNodes, 
      playerLocation: targetId, 
      visitedNodes: newVisitedNodes, 
      seenNodes: newSeenNodes,
      entryDirection: entryDirection,
      progression: newProgression,
    });
    return true;
  },

  markVisited: (nodeId: string) => {
    const { nodes } = get();
    const node = nodes.get(nodeId);
    if (node) {
      node.visited = true;
      set({ nodes: new Map(nodes) });
    }
  },

  getCurrentNode: () => {
    const { nodes, playerLocation } = get();
    return nodes.get(playerLocation) || null;
  },

  getExitsForCurrentNode: () => {
    const { nodes, playerLocation } = get();
    return getExits(playerLocation, nodes);
  },

  getVisibleNodes: () => {
    const { nodes, playerLocation, visitedNodes, seenNodes } = get();
    const visible = new Set<string>();
    const currentNode = nodes.get(playerLocation);
    
    if (!currentNode) return visible;
    
    // Always show current node
    visible.add(playerLocation);
    
    // Show visited nodes
    visitedNodes.forEach(id => visible.add(id));
    
    // Show all previously seen nodes (persistent visibility)
    seenNodes.forEach(id => visible.add(id));
    
    // Show direct neighbors (scouting range) - and mark them as seen
    const newSeenNodes = new Set(seenNodes);
    currentNode.connections.forEach((connection, targetId) => {
      visible.add(targetId);
      newSeenNodes.add(targetId); // Mark as seen
    });
    
    // Update seenNodes if new nodes were discovered
    if (newSeenNodes.size > seenNodes.size) {
      set({ seenNodes: newSeenNodes });
    }
    
    return visible;
  },

  enterRoom: async (nodeId: string, character: any, gameEngine: any): Promise<RoomContent | null> => {
    let { nodes, entryDirection, getPatternForNode } = get();
    let node = nodes.get(nodeId);
    
    // #region agent log
    fetch('http://127.0.0.1:7249/ingest/08331948-86a3-4f5f-b660-2645d043da0c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'store.ts:608',message:'enterRoom: entry',data:{nodeId,nodeType:node?.type,entryDirection,hasContent:!!node?.content},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    
    if (!node) return null;

    // For COMBAT nodes, always recalculate monster using actual entry direction
    // This ensures correct topology index for pool selection
    if (node.type === 'COMBAT') {
      // Always recalculate monster using actual entry direction
      // This ensures correct topology index for pool selection
      const exits = getExits(nodeId, nodes);
      
      // Get topology string for override check
      const topologyString = getTopologyKey(exits);
      
      // Use actual entry direction if available, otherwise fall back to null (defaults to NORTH)
      const effectiveEntryDirection = entryDirection !== null ? entryDirection : null;
      const { hasLeft, hasAhead, hasRight } = getRelativeExits(node, nodes, effectiveEntryDirection, exits);
      const calculatedTopologyIndex = (hasLeft ? 4 : 0) + (hasAhead ? 2 : 0) + (hasRight ? 1 : 0);
      
      // Check for manual prompt index override (CRITICAL FIX)
      // This ensures monster selection uses the same topology index as prompt generation
      const { getManualPromptIndexOverride, manualPromptIndexOverrides } = get();
      const manualOverride = getManualPromptIndexOverride(topologyString);
      const topologyIndexForMonster = manualOverride !== null ? manualOverride : calculatedTopologyIndex;
      
      // Enhanced diagnostic logging for Left/Right Branch debugging
      if (calculatedTopologyIndex === 6 || calculatedTopologyIndex === 3 || manualOverride === 6 || manualOverride === 3) {
        console.log(`[EnterRoom] === BRANCH TOPOLOGY DEBUG ===`);
        console.log(`[EnterRoom] Node: ${nodeId}, Topology string: "${topologyString}"`);
        console.log(`[EnterRoom] Calculated index: ${calculatedTopologyIndex} (${PROMPT_ARCHETYPE_NAMES[calculatedTopologyIndex]})`);
        console.log(`[EnterRoom] Manual override lookup result: ${manualOverride !== null ? `${manualOverride} (${PROMPT_ARCHETYPE_NAMES[manualOverride]})` : 'null'}`);
        console.log(`[EnterRoom] All manual overrides:`, Object.keys(manualPromptIndexOverrides).map(k => `${k} -> ${manualPromptIndexOverrides[k]}`).join(', ') || 'none');
        console.log(`[EnterRoom] Selected index for monster: ${topologyIndexForMonster} (${PROMPT_ARCHETYPE_NAMES[topologyIndexForMonster]})`);
        console.log(`[EnterRoom] Entry direction: ${effectiveEntryDirection || 'null (default NORTH)'}`);
        console.log(`[EnterRoom] Relative exits: hasLeft=${hasLeft}, hasAhead=${hasAhead}, hasRight=${hasRight}`);
        console.log(`[EnterRoom] === END BRANCH DEBUG ===`);
      }
      
      // Log which index is being used
      if (manualOverride !== null && manualOverride !== calculatedTopologyIndex) {
        console.log(`[EnterRoom] Using manual override: ${manualOverride} (${PROMPT_ARCHETYPE_NAMES[manualOverride]}) instead of calculated: ${calculatedTopologyIndex} (${PROMPT_ARCHETYPE_NAMES[calculatedTopologyIndex]}) for topology "${topologyString}"`);
      } else {
        console.log(`[EnterRoom] Using calculated topology index: ${calculatedTopologyIndex} (${PROMPT_ARCHETYPE_NAMES[calculatedTopologyIndex]}) for topology "${topologyString}"`);
      }
      
      // #region agent log
      fetch('http://127.0.0.1:7249/ingest/08331948-86a3-4f5f-b660-2645d043da0c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'store.ts:623',message:'enterRoom: topology calculation',data:{nodeId,entryDirection,effectiveEntryDirection,exits:{north:exits.north,south:exits.south,east:exits.east,west:exits.west},relativeExits:{hasLeft,hasAhead,hasRight},calculatedTopologyIndex,manualOverride,topologyIndexForMonster,topologyString},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      // #region agent log
      fetch('http://127.0.0.1:7249/ingest/08331948-86a3-4f5f-b660-2645d043da0c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'store.ts:624',message:'enterRoom: topology index calculated',data:{nodeId,calculatedTopologyIndex,topologyIndexForMonster,manualOverride,expectedTopology:'LEFT_TURN',effectiveEntryDirection},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
      
      console.log(`[EnterRoom] Recalculating monster for COMBAT node ${nodeId} - topology index: ${topologyIndexForMonster} (${PROMPT_ARCHETYPE_NAMES[topologyIndexForMonster]}), entry: ${effectiveEntryDirection || 'null (default NORTH)'}`);
      
      // Get monster from topology-specific pool (using topologyIndexForMonster, not calculated index)
      const { monsterPools } = get();
      const pool = monsterPools.get(topologyIndexForMonster);
      const poolSize = pool ? pool.size : 0;
      const poolMonsterIds = pool ? Array.from(pool.keys()) : [];
      console.log(`[EnterRoom] Pool for topology ${topologyIndexForMonster}: ${poolSize} monster(s) - IDs: ${poolMonsterIds.join(', ')}`);
      
      // Diagnostic: Check if Assassin exists and is in pool
      const { getAllMonsters } = await import('@/lib/game/monsters');
      const allMonsters = getAllMonsters();
      const assassinExists = allMonsters.some(m => m.id === 'assassin');
      const assassinInPool = pool?.has('assassin') || false;
      console.log(`[EnterRoom] Diagnostic - Assassin exists in getAllMonsters: ${assassinExists}, Assassin in pool: ${assassinInPool}`);
      if (assassinExists && !assassinInPool && (topologyIndexForMonster === 6 || topologyIndexForMonster === 3)) {
        console.warn(`[EnterRoom] ⚠ WARNING: Assassin exists but not in pool for topology ${topologyIndexForMonster}! This may prevent selection.`);
      }
      
      let monster = getRandomMonsterFromPool(topologyIndexForMonster, monsterPools, character?.level || 1);
      
      if (monster) {
        console.log(`[EnterRoom] Selected monster: ${monster.name} (id: ${monster.id}) from pool ${topologyIndexForMonster}`);
      } else {
        console.warn(`[EnterRoom] No monster selected from pool for topology ${topologyIndexForMonster}`);
      }
      
      // Fallback: if pool selection failed, try default behavior
      if (!monster) {
        console.warn(`[EnterRoom] Pool selection failed for topology ${topologyIndexForMonster}, trying fallback...`);
        monster = getRandomMonster(character?.level || 1, 'common');
      }
      if (!monster) {
        monster = getRandomMonster(character?.level || 1, 'uncommon');
      }
      if (!monster) {
        monster = getRandomMonster(character?.level || 1, 'boss');
      }
      
      // Final validation: COMBAT nodes should ALWAYS have a monster
      if (!monster) {
        console.error(`[EnterRoom] CRITICAL: Failed to assign monster to COMBAT node ${nodeId} after all fallbacks`);
        // Last resort
        monster = getRandomMonster(character?.level || 1);
      }
      
      // Update node with recalculated monster
      if (monster) {
        const updatedNodes = new Map(nodes);
        // Clear cached content when monster is recalculated to ensure new prompt is used
        const updatedNode = { ...node, monster, content: undefined };
        updatedNodes.set(nodeId, updatedNode);
        set({ nodes: updatedNodes });
        // Update local references for use below
        nodes = updatedNodes;
        node = updatedNode;
        // #region agent log
        fetch('http://127.0.0.1:7249/ingest/08331948-86a3-4f5f-b660-2645d043da0c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'store.ts:652',message:'enterRoom: monster assigned and cache cleared',data:{nodeId,monsterId:monster.id,monsterName:monster.name,topologyIndex,effectiveEntryDirection,contentCleared:true,poolSize:monsterPools.get(topologyIndex)?.size||0},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
        // #endregion
        console.log(`[EnterRoom] Assigned monster to COMBAT node ${nodeId}: ${monster.name} (topology: ${topologyIndex}, entry: ${effectiveEntryDirection || 'null'}, pool size: ${monsterPools.get(topologyIndex)?.size || 0})`);
        console.log(`[EnterRoom] Cleared cached content to ensure new prompt is used with entry direction: ${effectiveEntryDirection || 'null'}`);
      } else {
        console.error(`[EnterRoom] CRITICAL: No monster available for COMBAT node ${nodeId}`);
      }
    }

    // FAST PATH: Always use cached content if it exists - visited nodes should be persistent
    // Patterns only apply to NEW nodes, not previously visited ones
    if (node.content) {
      // Special case: Combat rooms without segmentation should regenerate to get segmentation
      const isCombatRoom = node.type === 'COMBAT';
      const hasSegmentedUrl = !!node.content.segmentedMonsterUrl;
      
      if (isCombatRoom && !hasSegmentedUrl) {
        console.warn(`[EnterRoom] ⚠ Combat room ${nodeId} has cached content but NO segmentedMonsterUrl`);
        console.warn(`[EnterRoom]   This room was generated before segmentation was implemented`);
        console.warn(`[EnterRoom]   Clearing cache to force regeneration with segmentation...`);
        // Clear the cached content to force regeneration
        const updatedNodes = new Map(nodes);
        const updatedNode = { ...node, content: undefined };
        updatedNodes.set(nodeId, updatedNode);
        set({ nodes: updatedNodes });
        // Fall through to SLOW PATH to regenerate
      } else {
        // #region agent log
        fetch('http://127.0.0.1:7249/ingest/08331948-86a3-4f5f-b660-2645d043da0c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'store.ts:670',message:'enterRoom: using cached content',data:{nodeId,hasContent:true,contentImageUrl:node.content?.imageUrl?.substring(0,50)||'none'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
        // #endregion
        console.log(`[EnterRoom] Using cached content for previously visited node ${nodeId}`);
        if (isCombatRoom && hasSegmentedUrl) {
          console.log(`[EnterRoom] ✓ Combat room has segmentedMonsterUrl: ${node.content.segmentedMonsterUrl.substring(0, 80)}...`);
        }
        return node.content;
      }
    }

    // SLOW PATH: Generate new content
    // Calculate exits from actual connections (strict validation)
    const exits = getExits(nodeId, nodes);
    
    // Double-check: ensure exits match actual connections
    const calculatedExits = {
      north: node.connections.has(`${node.x},${node.y - 1}`),
      south: node.connections.has(`${node.x},${node.y + 1}`),
      east: node.connections.has(`${node.x + 1},${node.y}`),
      west: node.connections.has(`${node.x - 1},${node.y}`),
    };
    
    // #region agent log
    fetch('http://127.0.0.1:7249/ingest/08331948-86a3-4f5f-b660-2645d043da0c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'store.ts:688',message:'enterRoom: calling generateRoomContent',data:{nodeId,entryDirection,calculatedExits:{north:calculatedExits.north,south:calculatedExits.south,east:calculatedExits.east,west:calculatedExits.west},monsterId:node.monster?.id,monsterName:node.monster?.name},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    // Use calculated exits (more reliable) and pass entry direction and pattern getter
    const content = await generateRoomContent(node, nodes, calculatedExits, character, gameEngine, entryDirection, getPatternForNode);

    // Only save content if imageUrl is present (don't save incomplete content)
    if (content.imageUrl) {
      const updatedNodes = new Map(nodes);
      const updatedNode = { ...node, content };
      updatedNodes.set(nodeId, updatedNode);
      set({ nodes: updatedNodes });
      console.log(`[EnterRoom] ✓ Saved content with imageUrl for node ${nodeId}`);
      if (content.segmentedMonsterUrl) {
        console.log(`[EnterRoom] ✓✓✓ SEGMENTED MONSTER URL SAVED TO STORE ✓✓✓`);
        console.log(`[EnterRoom] Segmented URL: ${content.segmentedMonsterUrl.substring(0, 100)}...`);
        console.log(`[EnterRoom] Full URL length: ${content.segmentedMonsterUrl.length}`);
      } else {
        console.warn(`[EnterRoom] ⚠ Content saved but NO segmentedMonsterUrl for node ${nodeId}`);
        console.warn(`[EnterRoom] This means segmentation did not complete or failed`);
      }
    } else {
      console.warn(`[EnterRoom] ⚠ NOT saving content without imageUrl for node ${nodeId} - will regenerate on next visit`);
      // Don't save incomplete content - it will trigger regeneration
    }

    return content;
  },

  updateRoomContent: (nodeId: string, updates: Partial<RoomContent>) => {
    const { nodes } = get();
    const node = nodes.get(nodeId);
    
    if (!node) {
      console.warn(`[updateRoomContent] Node ${nodeId} not found`);
      return;
    }

    // Create content if it doesn't exist, or merge updates if it does
    let updatedContent: RoomContent;
    if (node.content) {
      // Content exists - merge updates
      updatedContent = { ...node.content, ...updates };
      console.log(`[updateRoomContent] Updating existing content for node ${nodeId}`);
    } else {
      // Content doesn't exist - create it with provided updates
      // Use defaults for required fields if not provided
      updatedContent = {
        description: updates.description || `You are in a ${node.type} room.`,
        imageUrl: updates.imageUrl || '',
        availableChoices: updates.availableChoices || [],
        isExplored: updates.isExplored ?? true,
        entities: updates.entities || [],
        ...updates, // Override with any provided values
      };
      console.log(`[updateRoomContent] Creating new content for node ${nodeId}`);
      console.log(`[updateRoomContent]   Image URL: ${updatedContent.imageUrl ? updatedContent.imageUrl.substring(0, 50) + '...' : 'MISSING'}`);
    }

    const updatedNode = { ...node, content: updatedContent };
    const updatedNodes = new Map(nodes);
    updatedNodes.set(nodeId, updatedNode);
    set({ nodes: updatedNodes });
    
    console.log(`[updateRoomContent] ✓ Content saved to node ${nodeId} (hasImageUrl: ${!!updatedContent.imageUrl})`);
  },

  reset: () => {
    set({
      nodes: new Map(),
      startNodeId: '',
      bossNodeId: '',
      playerLocation: '',
      visitedNodes: new Set<string>(),
      seenNodes: new Set<string>(),
      entryDirection: null,
      promptPatterns: loadPatternsFromStorage(), // Keep patterns on reset
      selectedNodes: new Set<string>(),
    });
  },

  // Pattern management actions
  addSelectedNode: (nodeId: string) => {
    const { selectedNodes } = get();
    const newSelected = new Set(selectedNodes);
    newSelected.add(nodeId);
    set({ selectedNodes: newSelected });
  },

  removeSelectedNode: (nodeId: string) => {
    const { selectedNodes } = get();
    const newSelected = new Set(selectedNodes);
    newSelected.delete(nodeId);
    set({ selectedNodes: newSelected });
  },

  clearSelectedNodes: () => {
    set({ selectedNodes: new Set<string>() });
  },

  createPatternFromSelection: (promptIndex: number, name?: string): PromptPattern | null => {
    const { selectedNodes, nodes } = get();
    if (selectedNodes.size === 0) return null;

    // Get exits for all selected nodes
    const nodeExits: Exits[] = [];
    const nodeIds: string[] = [];
    
    for (const nodeId of selectedNodes) {
      const node = nodes.get(nodeId);
      if (!node) continue;
      
      const exits = getExits(nodeId, nodes);
      nodeExits.push(exits);
      nodeIds.push(nodeId);
    }

    if (nodeExits.length === 0) return null;

    // Validate all nodes have the same topology
    const firstExits = nodeExits[0];
    const allMatch = nodeExits.every(exits => 
      exits.north === firstExits.north &&
      exits.south === firstExits.south &&
      exits.east === firstExits.east &&
      exits.west === firstExits.west
    );

    if (!allMatch) {
      console.warn('Selected nodes have different topologies, cannot create pattern');
      return null;
    }

    // Create pattern
    const pattern: PromptPattern = {
      id: `pattern-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: name || `Pattern ${get().promptPatterns.length + 1}`,
      topology: firstExits,
      promptIndex,
      nodeIds,
      createdAt: Date.now(),
    };

    // Log pattern creation with details
    const topologyStr = `N:${firstExits.north ? '1' : '0'} S:${firstExits.south ? '1' : '0'} E:${firstExits.east ? '1' : '0'} W:${firstExits.west ? '1' : '0'}`;
    console.log(`[Pattern] Creating pattern: "${pattern.name}"`);
    console.log(`[Pattern]   Topology: ${topologyStr}`);
    console.log(`[Pattern]   Prompt index: ${promptIndex} (${PROMPT_ARCHETYPE_NAMES[promptIndex]})`);
    console.log(`[Pattern]   Based on ${nodeIds.length} selected node(s)`);

    // Add to patterns and save
    const newPatterns = [...get().promptPatterns, pattern];
    set({ promptPatterns: newPatterns });
    savePatternsToStorage(newPatterns);

    // Clear cached content for all nodes matching this topology
    // This ensures patterns are applied to future room visits
    const updatedNodes = new Map(nodes);
    let clearedCount = 0;
    nodes.forEach((node, nodeId) => {
      const exits = getExits(nodeId, nodes);
      if (
        exits.north === firstExits.north &&
        exits.south === firstExits.south &&
        exits.east === firstExits.east &&
        exits.west === firstExits.west &&
        node.content // Only clear if content exists
      ) {
        const updatedNode = { ...node, content: undefined };
        updatedNodes.set(nodeId, updatedNode);
        clearedCount++;
      }
    });
    
    if (clearedCount > 0) {
      console.log(`[Pattern] Cleared cached content for ${clearedCount} nodes matching pattern "${pattern.name}"`);
      set({ nodes: updatedNodes });
    }

    // Clear selection
    set({ selectedNodes: new Set<string>() });

    return pattern;
  },

  deletePattern: (patternId: string) => {
    const { promptPatterns, nodes } = get();
    const patternToDelete = promptPatterns.find(p => p.id === patternId);
    const newPatterns = promptPatterns.filter(p => p.id !== patternId);
    set({ promptPatterns: newPatterns });
    savePatternsToStorage(newPatterns);
    
    // Clear cached content for nodes matching the deleted pattern
    // This allows them to regenerate with auto-calculation
    if (patternToDelete) {
      const updatedNodes = new Map(nodes);
      let clearedCount = 0;
      nodes.forEach((node, nodeId) => {
        const exits = getExits(nodeId, nodes);
        if (
          exits.north === patternToDelete.topology.north &&
          exits.south === patternToDelete.topology.south &&
          exits.east === patternToDelete.topology.east &&
          exits.west === patternToDelete.topology.west &&
          node.content
        ) {
          const updatedNode = { ...node, content: undefined };
          updatedNodes.set(nodeId, updatedNode);
          clearedCount++;
        }
      });
      
      if (clearedCount > 0) {
        console.log(`[Pattern] Cleared cached content for ${clearedCount} nodes after deleting pattern "${patternToDelete.name}"`);
        set({ nodes: updatedNodes });
      }
    }
  },

  updatePattern: (patternId: string, updates: { promptIndex?: number; name?: string }) => {
    const { promptPatterns, nodes } = get();
    const patternIndex = promptPatterns.findIndex(p => p.id === patternId);
    
    if (patternIndex === -1) {
      console.warn(`[Pattern] Pattern ${patternId} not found for update`);
      return;
    }
    
    const pattern = promptPatterns[patternIndex];
    const updatedPattern = {
      ...pattern,
      ...updates,
    };
    
    const newPatterns = [...promptPatterns];
    newPatterns[patternIndex] = updatedPattern;
    set({ promptPatterns: newPatterns });
    savePatternsToStorage(newPatterns);
    
    // Clear cached content for nodes matching this pattern to force regeneration with new prompt
    const updatedNodes = new Map(nodes);
    let clearedCount = 0;
    nodes.forEach((node, nodeId) => {
      const exits = getExits(nodeId, nodes);
      if (
        exits.north === pattern.topology.north &&
        exits.south === pattern.topology.south &&
        exits.east === pattern.topology.east &&
        exits.west === pattern.topology.west &&
        node.content
      ) {
        const updatedNode = { ...node, content: undefined };
        updatedNodes.set(nodeId, updatedNode);
        clearedCount++;
      }
    });
    
    if (clearedCount > 0) {
      console.log(`[Pattern] Updated pattern "${updatedPattern.name}" - cleared cached content for ${clearedCount} nodes`);
      console.log(`[Pattern]   Old prompt index: ${pattern.promptIndex} (${PROMPT_ARCHETYPE_NAMES[pattern.promptIndex]})`);
      console.log(`[Pattern]   New prompt index: ${updatedPattern.promptIndex} (${PROMPT_ARCHETYPE_NAMES[updatedPattern.promptIndex]})`);
      set({ nodes: updatedNodes });
    }
  },

  getPatternForNode: (nodeId: string): PromptPattern | null => {
    const { nodes, promptPatterns } = get();
    const node = nodes.get(nodeId);
    if (!node) {
      console.log(`[PatternMatch] Node ${nodeId} not found`);
      return null;
    }

    // Get node's exits
    const exits = getExits(nodeId, nodes);
    const topologyStr = `N:${exits.north ? '1' : '0'} S:${exits.south ? '1' : '0'} E:${exits.east ? '1' : '0'} W:${exits.west ? '1' : '0'}`;
    console.log(`[PatternMatch] Checking node ${nodeId} with topology: ${topologyStr}`);
    console.log(`[PatternMatch] Searching through ${promptPatterns.length} patterns...`);

    // Find matching pattern (exact match on all four directions)
    for (const pattern of promptPatterns) {
      const patternTopologyStr = `N:${pattern.topology.north ? '1' : '0'} S:${pattern.topology.south ? '1' : '0'} E:${pattern.topology.east ? '1' : '0'} W:${pattern.topology.west ? '1' : '0'}`;
      const matches = 
        pattern.topology.north === exits.north &&
        pattern.topology.south === exits.south &&
        pattern.topology.east === exits.east &&
        pattern.topology.west === exits.west;
      
      if (matches) {
        console.log(`[PatternMatch] ✓ Found matching pattern: "${pattern.name}"`);
        console.log(`[PatternMatch]   Pattern topology: ${patternTopologyStr}`);
        console.log(`[PatternMatch]   Node topology: ${topologyStr}`);
        console.log(`[PatternMatch]   Assigned prompt index: ${pattern.promptIndex} (${PROMPT_ARCHETYPE_NAMES[pattern.promptIndex]})`);
        return pattern;
      } else {
        console.log(`[PatternMatch]   Pattern "${pattern.name}" doesn't match (${patternTopologyStr} vs ${topologyStr})`);
      }
    }

    console.log(`[PatternMatch] ✗ No matching pattern found for node ${nodeId}`);
    return null;
  },

  setNodePromptOverride: (nodeId: string, promptText: string) => {
    const { nodes } = get();
    const node = nodes.get(nodeId);
    if (!node) {
      console.warn(`[NodeOverride] Node ${nodeId} not found`);
      return;
    }

    // Get node's topology and room type
    const exits = getExits(nodeId, nodes);
    const compositeKey = getCompositeKey(node.type, exits);
    const topologyStr = getTopologyKey(exits);

    // Find all nodes with matching room type AND topology
    const matchingNodeIds: string[] = [];
    nodes.forEach((n, id) => {
      if (n.type === node.type) {
        const nExits = getExits(id, nodes);
        if (getTopologyKey(nExits) === topologyStr) {
          matchingNodeIds.push(id);
        }
      }
    });

    // Update overrides for all matching nodes
    const currentOverrides = { ...get().nodePromptOverrides };
    currentOverrides[compositeKey] = promptText;

    set({ nodePromptOverrides: currentOverrides });
    saveNodeOverridesToStorage(currentOverrides);

    console.log(`[NodeOverride] Set prompt override for ${compositeKey}`);
    console.log(`[NodeOverride]   Room Type: ${node.type}, Topology: ${topologyStr}`);
    console.log(`[NodeOverride]   Prompt preview: ${promptText.substring(0, 80)}...`);
    console.log(`[NodeOverride]   Applied to ${matchingNodeIds.length} matching node(s):`, matchingNodeIds);

    // Clear cached content for all matching nodes to force regeneration
    const updatedNodes = new Map(nodes);
    let clearedCount = 0;
    matchingNodeIds.forEach(id => {
      const n = updatedNodes.get(id);
      if (n && n.content) {
        updatedNodes.set(id, { ...n, content: undefined });
        clearedCount++;
      }
    });

    if (clearedCount > 0) {
      console.log(`[NodeOverride] Cleared cached content for ${clearedCount} node(s) to apply new prompt`);
      set({ nodes: updatedNodes });
    }
  },

  getNodePromptOverride: (nodeId: string): string | null => {
    const { nodes, nodePromptOverrides } = get();
    const node = nodes.get(nodeId);
    if (!node) return null;

    const exits = getExits(nodeId, nodes);
    const compositeKey = getCompositeKey(node.type, exits);
    return nodePromptOverrides[compositeKey] ?? null;
  },

  clearNodePromptOverride: (nodeId: string) => {
    const { nodes } = get();
    const node = nodes.get(nodeId);
    if (!node) {
      console.warn(`[NodeOverride] Node ${nodeId} not found`);
      return;
    }

    // Get node's topology and room type
    const exits = getExits(nodeId, nodes);
    const compositeKey = getCompositeKey(node.type, exits);
    const topologyStr = getTopologyKey(exits);

    // Find all nodes with matching room type AND topology
    const matchingNodeIds: string[] = [];
    nodes.forEach((n, id) => {
      if (n.type === node.type) {
        const nExits = getExits(id, nodes);
        if (getTopologyKey(nExits) === topologyStr) {
          matchingNodeIds.push(id);
        }
      }
    });

    // Remove override
    const currentOverrides = { ...get().nodePromptOverrides };
    delete currentOverrides[compositeKey];

    set({ nodePromptOverrides: currentOverrides });
    saveNodeOverridesToStorage(currentOverrides);

    console.log(`[NodeOverride] Cleared prompt override for ${compositeKey}`);
    console.log(`[NodeOverride]   Room Type: ${node.type}, Topology: ${topologyStr}`);
    console.log(`[NodeOverride]   Affected ${matchingNodeIds.length} node(s)`);

    // Clear cached content for all matching nodes to force regeneration
    const updatedNodes = new Map(nodes);
    let clearedCount = 0;
    matchingNodeIds.forEach(id => {
      const n = updatedNodes.get(id);
      if (n && n.content) {
        updatedNodes.set(id, { ...n, content: undefined });
        clearedCount++;
      }
    });

    if (clearedCount > 0) {
      console.log(`[NodeOverride] Cleared cached content for ${clearedCount} node(s) to remove override`);
      set({ nodes: updatedNodes });
    }
  },

  clearAllNodePromptOverrides: () => {
    const { nodes } = get();
    const currentOverrides = get().nodePromptOverrides;
    const affectedNodeIds: string[] = [];

    // Find all nodes that have overrides
    nodes.forEach((node, nodeId) => {
      const exits = getExits(nodeId, nodes);
      const compositeKey = getCompositeKey(node.type, exits);
      if (currentOverrides[compositeKey]) {
        affectedNodeIds.push(nodeId);
      }
    });

    set({ nodePromptOverrides: {} });
    saveNodeOverridesToStorage({});

    console.log(`[NodeOverride] Cleared all prompt overrides (${Object.keys(currentOverrides).length} override(s) removed)`);
    console.log(`[NodeOverride]   Affected ${affectedNodeIds.length} node(s)`);

    // Clear cached content for all affected nodes
    const updatedNodes = new Map(nodes);
    let clearedCount = 0;
    affectedNodeIds.forEach(id => {
      const n = updatedNodes.get(id);
      if (n && n.content) {
        updatedNodes.set(id, { ...n, content: undefined });
        clearedCount++;
      }
    });

    if (clearedCount > 0) {
      console.log(`[NodeOverride] Cleared cached content for ${clearedCount} node(s)`);
      set({ nodes: updatedNodes });
    }
  },

  setNodePromptIndexOverride: (nodeId: string, promptIndex: number | null) => {
    const { nodes } = get();
    const node = nodes.get(nodeId);
    if (!node) {
      console.warn(`[NodePromptIndexOverride] Node ${nodeId} not found`);
      return;
    }

    const currentOverrides = { ...get().nodePromptIndexOverrides };
    
    if (promptIndex === null) {
      // Clear override
      delete currentOverrides[nodeId];
      console.log(`[NodePromptIndexOverride] Cleared prompt index override for node ${nodeId}`);
    } else {
      // Validate prompt index
      if (promptIndex < 0 || promptIndex > 11) {
        console.warn(`[NodePromptIndexOverride] Invalid prompt index ${promptIndex}, must be 0-11`);
        return;
      }
      
      // Set override
      currentOverrides[nodeId] = promptIndex;
      console.log(`[NodePromptIndexOverride] Set prompt index override for node ${nodeId}: ${promptIndex} (${PROMPT_ARCHETYPE_NAMES[promptIndex]})`);
    }

    set({ nodePromptIndexOverrides: currentOverrides });
    saveNodePromptIndexOverridesToStorage(currentOverrides);

    // Clear cached content for this node to force regeneration with new prompt
    const updatedNodes = new Map(nodes);
    const n = updatedNodes.get(nodeId);
    if (n && n.content) {
      updatedNodes.set(nodeId, { ...n, content: undefined });
      set({ nodes: updatedNodes });
      console.log(`[NodePromptIndexOverride] Cleared cached content for node ${nodeId} to apply new prompt index`);
    }
  },

  getNodePromptIndexOverride: (nodeId: string): number | null => {
    const { nodePromptIndexOverrides } = get();
    return nodePromptIndexOverrides[nodeId] ?? null;
  },

  clearNodePromptIndexOverride: (nodeId: string) => {
    get().setNodePromptIndexOverride(nodeId, null);
  },

  setManualTopologyOverride: (topologyPattern: string, exits: Exits | null) => {
    const currentOverrides = { ...get().manualTopologyOverrides };
    
    if (exits === null) {
      delete currentOverrides[topologyPattern];
      console.log(`[ManualOverride] Cleared manual topology override for pattern "${topologyPattern}"`);
    } else {
      currentOverrides[topologyPattern] = exits;
      const topologyStr = getTopologyKey(exits);
      console.log(`[ManualOverride] Set manual topology override for pattern "${topologyPattern}": ${topologyStr}`);
    }

    set({ manualTopologyOverrides: currentOverrides });
    saveManualTopologyOverridesToStorage(currentOverrides);

    // Clear cached content for all nodes with this topology pattern
    const { nodes } = get();
    const updatedNodes = new Map(nodes);
    let clearedCount = 0;
    nodes.forEach((n, id) => {
      const nExits = getExits(id, nodes);
      const nTopology = getTopologyKey(nExits);
      if (nTopology === topologyPattern && n.content) {
        updatedNodes.set(id, { ...n, content: undefined });
        clearedCount++;
      }
    });

    if (clearedCount > 0) {
      set({ nodes: updatedNodes });
      console.log(`[ManualOverride] Cleared cached content for ${clearedCount} node(s) with topology "${topologyPattern}"`);
    }
  },

  getManualTopologyOverride: (topologyPattern: string): Exits | null => {
    const { manualTopologyOverrides } = get();
    return manualTopologyOverrides[topologyPattern] ?? null;
  },

  setManualEntryDirectionOverride: (topologyPattern: string, entryDirection: 'north' | 'south' | 'east' | 'west' | null) => {
    const currentOverrides = { ...get().manualEntryDirectionOverrides };
    
    if (entryDirection === null) {
      delete currentOverrides[topologyPattern];
      console.log(`[ManualOverride] Cleared manual entry direction override for pattern "${topologyPattern}"`);
    } else {
      currentOverrides[topologyPattern] = entryDirection;
      console.log(`[ManualOverride] Set manual entry direction override for pattern "${topologyPattern}": ${entryDirection}`);
    }

    set({ manualEntryDirectionOverrides: currentOverrides });
    saveManualEntryDirectionOverridesToStorage(currentOverrides);

    // Clear cached content for all nodes with this topology pattern
    const { nodes } = get();
    const updatedNodes = new Map(nodes);
    let clearedCount = 0;
    nodes.forEach((n, id) => {
      const nExits = getExits(id, nodes);
      const nTopology = getTopologyKey(nExits);
      if (nTopology === topologyPattern && n.content) {
        updatedNodes.set(id, { ...n, content: undefined });
        clearedCount++;
      }
    });

    if (clearedCount > 0) {
      set({ nodes: updatedNodes });
      console.log(`[ManualOverride] Cleared cached content for ${clearedCount} node(s) with topology "${topologyPattern}"`);
    }
  },

  getManualEntryDirectionOverride: (topologyPattern: string): 'north' | 'south' | 'east' | 'west' | null => {
    const { manualEntryDirectionOverrides } = get();
    return manualEntryDirectionOverrides[topologyPattern] ?? null;
  },

  setManualPromptIndexOverride: (topologyPattern: string, promptIndex: number | null) => {
    // This is the same as setNodePromptIndexOverride but uses topology pattern directly
    const { nodes } = get();

    const currentOverrides = { ...get().manualPromptIndexOverrides };
    
    if (promptIndex === null) {
      delete currentOverrides[topologyPattern];
      console.log(`[ManualOverride] Cleared manual prompt index override for pattern "${topologyPattern}"`);
    } else {
      if (promptIndex < 0 || promptIndex > 11) {
        console.warn(`[ManualOverride] Invalid prompt index ${promptIndex}, must be 0-11`);
        return;
      }
      
      currentOverrides[topologyPattern] = promptIndex;
      console.log(`[ManualOverride] Set manual prompt index override for pattern "${topologyPattern}": ${promptIndex} (${PROMPT_ARCHETYPE_NAMES[promptIndex]})`);
    }

    set({ manualPromptIndexOverrides: currentOverrides });
    saveNodePromptIndexOverridesToStorage(currentOverrides);

    // Clear cached content for all nodes with this topology pattern
    const updatedNodes = new Map(nodes);
    let clearedCount = 0;
    nodes.forEach((n, id) => {
      const nExits = getExits(id, nodes);
      const nTopology = getTopologyKey(nExits);
      if (nTopology === topologyPattern && n.content) {
        updatedNodes.set(id, { ...n, content: undefined });
        clearedCount++;
      }
    });

    if (clearedCount > 0) {
      set({ nodes: updatedNodes });
      console.log(`[ManualOverride] Cleared cached content for ${clearedCount} node(s) with topology "${topologyPattern}"`);
    }
  },

  getManualPromptIndexOverride: (topologyPattern: string): number | null => {
    const { manualPromptIndexOverrides } = get();
    return manualPromptIndexOverrides[topologyPattern] ?? null;
  },

  clearAllManualOverrides: () => {
    const { nodes } = get();
    const affectedTopologyPatterns = new Set<string>();
    
    // Find all topology patterns that have overrides
    const topologyOverrides = get().manualTopologyOverrides;
    const entryOverrides = get().manualEntryDirectionOverrides;
    const promptOverrides = get().manualPromptIndexOverrides;
    
    Object.keys(topologyOverrides).forEach(pattern => affectedTopologyPatterns.add(pattern));
    Object.keys(entryOverrides).forEach(pattern => affectedTopologyPatterns.add(pattern));
    Object.keys(promptOverrides).forEach(pattern => affectedTopologyPatterns.add(pattern));

    set({
      manualTopologyOverrides: {},
      manualEntryDirectionOverrides: {},
      manualPromptIndexOverrides: {},
    });
    
    saveManualTopologyOverridesToStorage({});
    saveManualEntryDirectionOverridesToStorage({});
    saveNodePromptIndexOverridesToStorage({});

    console.log(`[ManualOverride] Cleared all manual overrides (${affectedTopologyPatterns.size} topology pattern(s) affected)`);

    // Clear cached content for all affected nodes
    const updatedNodes = new Map(nodes);
    let clearedCount = 0;
    nodes.forEach((n, id) => {
      const nExits = getExits(id, nodes);
      const nTopology = getTopologyKey(nExits);
      if (affectedTopologyPatterns.has(nTopology) && n.content) {
        updatedNodes.set(id, { ...n, content: undefined });
        clearedCount++;
      }
    });

    if (clearedCount > 0) {
      set({ nodes: updatedNodes });
      console.log(`[ManualOverride] Cleared cached content for ${clearedCount} node(s)`);
    }
  },

  // Monster pool management
  getMonsterPool: (topologyIndex: number): Map<string, Map<string | null, string>> => {
    const { monsterPools } = get();
    return monsterPools.get(topologyIndex) || new Map<string, Map<string | null, string>>();
  },

  getMonsterPrompt: (topologyIndex: number, monsterId: string, entryDirection?: 'north' | 'south' | 'east' | 'west' | null): string | null => {
    const { monsterPools } = get();
    const pool = monsterPools.get(topologyIndex);
    if (!pool) {
      console.log(`[getMonsterPrompt] No pool found for topology ${topologyIndex}`);
      return null;
    }
    const entryMap = pool.get(monsterId);
    if (!entryMap) {
      console.log(`[getMonsterPrompt] No entry map found for monster ${monsterId} in topology ${topologyIndex}`);
      return null;
    }
    
    // Log available entry directions for debugging
    const availableDirections = Array.from(entryMap.keys());
    console.log(`[getMonsterPrompt] Looking for prompt: topology=${topologyIndex}, monster=${monsterId}, entryDirection=${entryDirection === null ? 'null' : entryDirection === undefined ? 'undefined' : entryDirection}, available keys: ${availableDirections.map(k => k === null ? 'null' : k).join(', ')}`);
    
    // #region agent log
    fetch('http://127.0.0.1:7249/ingest/08331948-86a3-4f5f-b660-2645d043da0c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'store.ts:1357',message:'getMonsterPrompt: lookup start',data:{topologyIndex,monsterId,entryDirection,entryDirectionType:entryDirection===null?'null':entryDirection===undefined?'undefined':'string',availableKeys:availableDirections.map(k=>k===null?'null':k),availableKeysCount:availableDirections.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    
    // If entry direction provided (including null), try that first, then fall back to null
    if (entryDirection !== undefined) {
      const prompt = entryMap.get(entryDirection);
      // #region agent log
      fetch('http://127.0.0.1:7249/ingest/08331948-86a3-4f5f-b660-2645d043da0c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'store.ts:1362',message:'getMonsterPrompt: lookup result',data:{topologyIndex,monsterId,entryDirection,lookupKey:entryDirection===null?'null':entryDirection,promptFound:prompt!==undefined,promptIsNull:prompt===null,promptIsEmpty:prompt==='',promptLength:prompt?.length||0,promptPreview:prompt?.substring(0,200)||'none',fullPromptText:prompt||'none',hasFacingSouth:prompt?.toLowerCase().includes('facing south')||false,hasFacingWest:prompt?.toLowerCase().includes('facing west')||false,hasFacingNorth:prompt?.toLowerCase().includes('facing north')||false,hasFacingEast:prompt?.toLowerCase().includes('facing east')||false},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      if (prompt !== undefined && prompt !== null && prompt.trim() !== '') {
        console.log(`[getMonsterPrompt] ✓ Found prompt for entry direction '${entryDirection === null ? 'null' : entryDirection}' (length: ${prompt.length}): ${prompt.substring(0, 150)}...`);
        return prompt;
      } else {
        if (prompt !== undefined) {
          console.log(`[getMonsterPrompt] Prompt exists for entry direction '${entryDirection === null ? 'null' : entryDirection}' but is empty or null`);
        } else {
          console.log(`[getMonsterPrompt] No prompt found for entry direction '${entryDirection === null ? 'null' : entryDirection}', falling back to null key`);
        }
      }
    }
    
    // Fall back to null key (default/legacy) only if entryDirection was not null
    if (entryDirection !== null) {
      const defaultPrompt = entryMap.get(null);
      if (defaultPrompt !== undefined && defaultPrompt !== null && defaultPrompt.trim() !== '') {
        console.log(`[getMonsterPrompt] Using null key prompt (length: ${defaultPrompt.length}): ${defaultPrompt.substring(0, 150)}...`);
        return defaultPrompt;
      }
    }
    console.log(`[getMonsterPrompt] ✗ No prompt found (neither for entry direction '${entryDirection === null ? 'null' : entryDirection === undefined ? 'undefined' : entryDirection}' nor null key)`);
    return null;
  },

  addMonsterToPool: (topologyIndex: number, monsterId: string, customPrompt?: string, entryDirection?: 'north' | 'south' | 'east' | 'west' | null): void => {
    const { monsterPools } = get();
    let pool = monsterPools.get(topologyIndex);
    if (!pool) {
      pool = new Map<string, Map<string | null, string>>();
      console.log(`[addMonsterToPool] Created new pool for topology ${topologyIndex}`);
    }
    
    let entryMap = pool.get(monsterId);
    const wasNewMonster = !entryMap;
    if (!entryMap) {
      entryMap = new Map<string | null, string>();
      pool.set(monsterId, entryMap);
      console.log(`[addMonsterToPool] Added monster ${monsterId} to pool for topology ${topologyIndex}`);
    } else {
      console.log(`[addMonsterToPool] Monster ${monsterId} already in pool for topology ${topologyIndex}`);
    }
    
    const entryKey = entryDirection !== undefined ? entryDirection : null;
    entryMap.set(entryKey, customPrompt || '');
    
    const updatedPools = new Map(monsterPools);
    updatedPools.set(topologyIndex, pool);
    set({ monsterPools: updatedPools });
    saveMonsterPoolsToStorage(updatedPools);
    
    // Verify the monster was actually added
    const verifyPool = updatedPools.get(topologyIndex);
    const verifyInPool = verifyPool?.has(monsterId);
    console.log(`[addMonsterToPool] Verification: Monster ${monsterId} in pool ${topologyIndex}: ${verifyInPool}, pool size: ${verifyPool?.size || 0}`);
    
    if (!verifyInPool) {
      console.error(`[addMonsterToPool] ⚠ ERROR: Monster ${monsterId} was not successfully added to pool ${topologyIndex}!`);
    }
  },

  removeMonsterFromPool: (topologyIndex: number, monsterId: string): void => {
    const { monsterPools } = get();
    const pool = monsterPools.get(topologyIndex);
    if (pool) {
      pool.delete(monsterId);
      const updatedPools = new Map(monsterPools);
      updatedPools.set(topologyIndex, pool);
      set({ monsterPools: updatedPools });
      saveMonsterPoolsToStorage(updatedPools);
    }
  },

  setMonsterPrompt: (topologyIndex: number, monsterId: string, customPrompt: string, entryDirection?: 'north' | 'south' | 'east' | 'west' | null): void => {
    const { monsterPools, nodes } = get();
    // Ensure pool exists - create if it doesn't
    let pool = monsterPools.get(topologyIndex);
    if (!pool) {
      pool = new Map<string, Map<string | null, string>>();
    }
    
    // Ensure monster is in pool (add if not present)
    let entryMap = pool.get(monsterId);
    if (!entryMap) {
      entryMap = new Map<string | null, string>();
      pool.set(monsterId, entryMap);
      console.log(`[setMonsterPrompt] Added monster ${monsterId} to pool for topology ${topologyIndex}`);
    }
    
    const entryKey = entryDirection !== undefined ? entryDirection : null;
    entryMap.set(entryKey, customPrompt);
    const updatedPools = new Map(monsterPools);
    updatedPools.set(topologyIndex, pool);
    set({ monsterPools: updatedPools });
    saveMonsterPoolsToStorage(updatedPools);
    
    console.log(`[setMonsterPrompt] Set prompt for monster ${monsterId} in topology ${topologyIndex}, entry direction: ${entryKey === null ? 'null' : entryKey}, prompt length: ${customPrompt.length}`);
    
    // Clear cached content for ALL COMBAT nodes with this monster (regardless of topology)
    // This ensures the new prompt is used on next visit, and also handles cases where
    // the topology might be recalculated based on entry direction
    const updatedNodes = new Map(nodes);
    let clearedCount = 0;
    nodes.forEach((node, nodeId) => {
      if (node.type === 'COMBAT' && node.monster?.id === monsterId && node.content) {
        updatedNodes.set(nodeId, { ...node, content: undefined });
        clearedCount++;
      }
    });
    
    if (clearedCount > 0) {
      set({ nodes: updatedNodes });
      console.log(`[setMonsterPrompt] Cleared cached content for ${clearedCount} COMBAT node(s) with ${monsterId} to apply new prompt`);
    }
  },

  setMonsterPool: (topologyIndex: number, monsterIds: string[]): void => {
    const { monsterPools } = get();
    const updatedPools = new Map(monsterPools);
    const newPool = new Map<string, Map<string | null, string>>();
    monsterIds.forEach(monsterId => {
      // Preserve existing entry maps if monster was already in pool, otherwise create new with null key
      const existingPool = monsterPools.get(topologyIndex);
      const existingEntryMap = existingPool?.get(monsterId);
      if (existingEntryMap) {
        newPool.set(monsterId, new Map(existingEntryMap));
      } else {
        const entryMap = new Map<string | null, string>();
        entryMap.set(null, '');
        newPool.set(monsterId, entryMap);
      }
    });
    updatedPools.set(topologyIndex, newPool);
    set({ monsterPools: updatedPools });
    saveMonsterPoolsToStorage(updatedPools);
  },

  clearMonsterPool: (topologyIndex: number): void => {
    const { monsterPools } = get();
    const updatedPools = new Map(monsterPools);
    updatedPools.set(topologyIndex, new Map<string, Map<string | null, string>>());
    set({ monsterPools: updatedPools });
    saveMonsterPoolsToStorage(updatedPools);
  },

  resetAllMonsterPools: (): void => {
    const resetPools = initializeMonsterPools();
    set({ monsterPools: resetPools });
    saveMonsterPoolsToStorage(resetPools);
  },

  removeMonsterFromAllPools: (monsterId: string): void => {
    const { monsterPools } = get();
    const updatedPools = new Map(monsterPools);
    
    for (let i = 0; i < 8; i++) {
      const pool = updatedPools.get(i);
      if (pool && pool.has(monsterId)) {
        pool.delete(monsterId);
        updatedPools.set(i, pool);
      }
    }
    
    set({ monsterPools: updatedPools });
    saveMonsterPoolsToStorage(updatedPools);
    console.log(`[MonsterPool] Removed ${monsterId} from all topology pools`);
  },
}));

