// Buriedbornes Character System (replaces D&D 5e)

import { BuriedbornesStats } from '@/lib/game/buriedbornes-stats';
import { Skill } from '@/lib/game/skills';

// Job/Class (Buriedbornes style)
export type JobName = 
  | 'Warrior'
  | 'Mage'
  | 'Rogue'
  | 'Cleric'
  | 'Paladin'
  | 'Necromancer'
  | 'Assassin'
  | 'Berserker';

export interface Job {
  name: JobName;
  description: string;
  primaryStat: 'STR' | 'DEX' | 'INT' | 'PIE';
  startingSkills: string[]; // Skill IDs
  statBonuses?: Partial<BuriedbornesStats>; // Starting stat bonuses
}

// Equipment Slot (Buriedbornes style)
export type EquipmentSlot = 
  | 'weapon' | 'armor' | 'accessory1' | 'accessory2' | 'accessory3';

// Item
export type ItemRarity = 'Common' | 'Uncommon' | 'Rare' | 'Very Rare' | 'Legendary' | 'Artifact';

export interface StatModifiers {
  STR?: number;
  DEX?: number;
  INT?: number;
  PIE?: number;
  maxHP?: number;
  Power?: number;
  Armor?: number;
  Resistance?: number;
  Avoid?: number;
  Parry?: number;
  Critical?: number;
  Reflect?: number;
  Pursuit?: number;
}

export interface AttributeRequirements {
  STR?: number;
  DEX?: number;
  INT?: number;
  PIE?: number;
  level?: number;
}

export interface Item {
  id: string;
  name: string;
  rarity: ItemRarity;
  slot: EquipmentSlot | 'other';
  description: string;
  imageUrl?: string;
  stats?: StatModifiers;
  requirements?: AttributeRequirements;
  classRestrictions?: ClassName[];
}

// Equipment (equipped items) - Buriedbornes style
export interface Equipment {
  weapon?: Item;
  armor?: Item;
  accessory1?: Item;
  accessory2?: Item;
  accessory3?: Item;
}

// Inventory (backpack)
export type Inventory = Item[];

// Character (Buriedbornes style)
export interface Character {
  // Identity
  name: string;
  job: Job;
  level: number;
  
  // Stats (base stats from leveling)
  baseStats: BuriedbornesStats;
  
  // Health
  hp: {
    current: number;
    max: number;
  };
  
  // Progression
  xp: number;
  xpToNext: number;
  
  // Skills (4-6 skill slots)
  skills: Skill[];
  maxSkillSlots: number; // Usually 4-6
  
  // Equipment & Inventory
  equipment: Equipment;
  inventory: Inventory;
  
  // Status Effects
  statusEffects: Array<{
    type: string;
    value: number;
    duration: number;
    stacks?: number;
  }>;
  
  // Buffs/Debuffs
  buffs: {
    Strengthen?: number; // Damage increase %
    Weaken?: number; // Damage reduction %
    DamageReduce?: number; // Damage reduction %
  };
  
  // Portrait
  portraitUrl?: string;
}

// Calculate total stats with equipment (Buriedbornes)
export function calculateTotalStats(
  baseStats: BuriedbornesStats,
  equipment: Equipment
): BuriedbornesStats {
  const totals = { ...baseStats };
  
  Object.values(equipment).forEach(item => {
    if (item?.stats) {
      if (item.stats.STR) totals.STR += item.stats.STR;
      if (item.stats.DEX) totals.DEX += item.stats.DEX;
      if (item.stats.INT) totals.INT += item.stats.INT;
      if (item.stats.PIE) totals.PIE += item.stats.PIE;
      if (item.stats.maxHP) totals.maxHP += item.stats.maxHP;
      if (item.stats.Power) totals.Power += item.stats.Power;
      if (item.stats.Armor) totals.Armor += item.stats.Armor;
      if (item.stats.Resistance) totals.Resistance += item.stats.Resistance;
      if (item.stats.Avoid) totals.Avoid += item.stats.Avoid;
      if (item.stats.Parry) totals.Parry += item.stats.Parry;
      if (item.stats.Critical) totals.Critical += item.stats.Critical;
      if (item.stats.Reflect) totals.Reflect += item.stats.Reflect;
      if (item.stats.Pursuit) totals.Pursuit += item.stats.Pursuit;
    }
  });
  
  return totals;
}














