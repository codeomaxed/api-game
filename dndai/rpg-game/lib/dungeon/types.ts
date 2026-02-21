// Core dungeon types matching the HTML prototype
import { Choice } from '@/types/game';
import { Monster } from '@/lib/game/monsters';

export type RoomType = 'START' | 'BOSS' | 'NORMAL' | 'TREASURE' | 'EVENT' | 'MERCHANT' | 'DEAD_END' | 'COMBAT';

// Connection types for visual continuity
export type ConnectionType = 'arched_stone' | 'heavy_door' | 'iron_bars' | 'collapsed_hole' | 'grand_double_doors';

export interface Connection {
  targetId: string;
  type: ConnectionType;
}

export const CONNECTION_TYPES: ConnectionType[] = [
  'arched_stone',
  'heavy_door',
  'iron_bars',
  'collapsed_hole',
  'grand_double_doors',
];

export interface RoomContent {
  description: string;      // The main story text
  imageUrl: string;         // The Fal.ai image URL
  availableChoices: Choice[]; // The options given to the player
  isExplored: boolean;      // Has the player been here?
  entities: string[];       // e.g., ["Goblin", "Chest"] - things that persist
  imagePrompt?: string;     // The image generation prompt used (for monster segmentation)
  segmentedMonsterUrl?: string; // Cached segmentation result URL (transparent PNG)
}

export interface DungeonNode {
  id: string; // "x,y"
  x: number;
  y: number;
  type: RoomType;
  connections: Map<string, Connection>; // Map of targetId -> Connection (includes visual type)
  isMainPath: boolean;
  visited: boolean; // For fog of war
  monster: Monster | null; // Pre-assigned monster (null for START, boss for BOSS, random for others)
  content?: RoomContent; // Optional: Undefined until first visit
  mask: number; // Bitmask representing room topology: North=1, East=2, South=4, West=8
}

export interface PromptPattern {
  id: string; // Unique pattern ID
  name: string; // User-friendly name (optional, auto-generated)
  topology: {
    north: boolean;
    south: boolean;
    east: boolean;
    west: boolean;
  }; // Exit configuration that defines the pattern
  promptIndex: number; // 0-11, the archetype prompt to use
  nodeIds: string[]; // Node IDs that were selected to create this pattern
  createdAt: number; // Timestamp for sorting/display
}

import { DungeonProgression } from './progression';

export interface DungeonState {
  nodes: Map<string, DungeonNode>; // Fast lookup
  startNodeId: string;
  bossNodeId: string;
  playerLocation: string; // Current node ID
  visitedNodes: Set<string>; // Track visited nodes for fog of war
  seenNodes: Set<string>; // Track nodes that have been seen (visible on minimap) - persistent
  entryDirection: 'north' | 'south' | 'east' | 'west' | null; // Direction player entered current room from
  progression: DungeonProgression; // Floor-based progression tracking
  promptPatterns: PromptPattern[]; // Patterns for prompt assignment
  nodePromptOverrides: Record<string, string>; // "ROOMTYPE:TOPOLOGY" -> custom prompt text (e.g., "NORMAL:S+W" -> "Grimdark fantasy masterpiece...")
  nodePromptIndexOverrides: Record<string, number>; // topologyPattern -> prompt index (0-11) for manual prompt selection (e.g., "E+W" -> 5)
  manualTopologyOverrides: Record<string, Exits>; // topologyPattern -> {north, south, east, west} - manual override of actual exits
  manualEntryDirectionOverrides: Record<string, 'north' | 'south' | 'east' | 'west' | null>; // topologyPattern -> entry direction - manual override of entry direction
  manualPromptIndexOverrides: Record<string, number>; // topologyPattern -> prompt index (0-11) - manual override of prompt index (same as nodePromptIndexOverrides, kept for clarity)
}

export interface Exits {
  north: boolean;
  south: boolean;
  east: boolean;
  west: boolean;
}

export interface RoomTypeConfig {
  color: string;
  radius: number;
  label: string;
}

export const ROOM_TYPES: Record<RoomType, RoomTypeConfig> = {
  START: { color: '#4ade80', radius: 6, label: 'START' },
  BOSS: { color: '#ef4444', radius: 12, label: 'BOSS' },
  NORMAL: { color: '#333', radius: 5, label: '' },
  TREASURE: { color: '#facc15', radius: 7, label: '$' },
  EVENT: { color: '#a855f7', radius: 6, label: '?' },
  MERCHANT: { color: '#f97316', radius: 8, label: 'SHOP' },
  DEAD_END: { color: '#222', radius: 4, label: '' },
  COMBAT: { color: '#dc2626', radius: 6, label: '⚔️' },
};

