// Game Node Types
export type NodeType = 'encounter' | 'combat' | 'dialog' | 'loot' | 'event' | 'location';

// Choice
export interface Choice {
  id: string;
  text: string;
  actionPoints: number;
  type: 'attack' | 'spell' | 'item' | 'flee' | 'talk' | 'action' | 'dialog';
  metadata?: {
    weaponId?: string;
    spellId?: string;
    itemId?: string;
    dialogOption?: string;
    direction?: 'north' | 'south' | 'east' | 'west';
  };
}

// Game Node
export interface GameNode {
  id: string;
  type: NodeType;
  imageUrl?: string;
  description: string;
  choices: Choice[];
  metadata?: NodeMetadata;
}

// Node Metadata
export interface NodeMetadata {
  enemy?: EnemyData;
  location?: LocationData;
  loot?: LootData[];
  eventType?: string;
  triggers?: string[];
}

import { BuriedbornesStats } from '@/lib/game/buriedbornes-stats';
import { StatusEffectType } from '@/lib/game/skills';

// Enemy Data (Buriedbornes style)
export interface EnemyData {
  id: string;
  name: string;
  level: number;
  hp: {
    current: number;
    max: number;
  };
  stats: BuriedbornesStats;
  statusEffects: Array<{ type: StatusEffectType; value: number; duration: number; stacks?: number }>;
  buffs: {
    Strengthen?: number;
    Weaken?: number;
    DamageReduce?: number;
  };
  imageUrl?: string;
}

// Location Data
export interface LocationData {
  name: string;
  type: 'town' | 'village' | 'city' | 'inn' | 'bar' | 'dungeon' | 'wilderness' | 'checkpoint';
  description: string;
  imageUrl?: string;
}

// Loot Data
export interface LootData {
  itemId: string;
  name: string;
  rarity: 'Common' | 'Uncommon' | 'Rare' | 'Very Rare' | 'Legendary' | 'Artifact';
  imageUrl?: string;
}

// Story Context
export interface StoryContext {
  history: StoryEvent[];
  currentLocation: string;
  checkpoints: string[]; // Reached checkpoints
  choices: string[]; // Recent player choices
  consequences: Record<string, any>; // Choice consequences
}

export interface StoryEvent {
  id: string;
  timestamp: number;
  type: NodeType;
  description: string;
  choice?: string;
  result?: string;
}

// Game State
export interface GameState {
  currentNode: GameNode;
  storyContext: StoryContext;
  combatState?: CombatState;
  dungeonState?: {
    isInDungeon: boolean;
  };
}

// Combat State (Buriedbornes style)
export interface CombatState {
  turn: 'player' | 'enemy';
  round: number;
  enemy: EnemyData;
  playerHP: number;
  playerMaxHP: number;
  playerStatusEffects: Array<{ type: StatusEffectType; value: number; duration: number; stacks?: number }>;
  playerBuffs: {
    Strengthen?: number;
    Weaken?: number;
    DamageReduce?: number;
  };
  combatLog: string[]; // Messages from combat
}

// AI Response Format
export interface AIResponse {
  nextNode: {
    id: string;
    type: NodeType;
    description: string;
    choices: Choice[];
    metadata?: NodeMetadata;
  };
  result: string; // Narrative result of the choice
  xpGained?: number;
  loot?: LootData[];
  imagePrompt?: string; // For generating scene image
}


