// Item Scaling System (Buriedbornes style)

import { Item, ItemRarity, StatModifiers } from '@/types/character';

/**
 * Calculate item power based on floor and rarity
 */
export function calculateItemPower(floor: number, rarity: ItemRarity): number {
  // Floor multiplier: 50% more per floor
  const floorMultiplier = 1 + ((floor - 1) * 0.5);
  
  // Rarity multipliers
  const rarityMultipliers: Record<ItemRarity, number> = {
    'Common': 1.0,
    'Uncommon': 1.5,
    'Rare': 2.5,
    'Very Rare': 4.0,
    'Legendary': 6.0,
    'Artifact': 10.0,
  };
  
  return floorMultiplier * rarityMultipliers[rarity];
}

/**
 * Generate item stats for a given floor and rarity
 */
export function generateItemStats(floor: number, rarity: ItemRarity, itemType: 'weapon' | 'armor' | 'accessory'): StatModifiers {
  const power = calculateItemPower(floor, rarity);
  
  // Base stats per item type
  // Equipment should be the PRIMARY source of stats (much more impactful than leveling)
  // Level 1 player: STR ~10, HP ~120, Power ~8
  // Equipment should provide significant boosts that scale with floor and rarity
  // Floor 1 Common weapon should give ~50-100 STR to be meaningful
  const baseStats: Record<string, Partial<StatModifiers>> = {
    weapon: {
      STR: 50, // Significant boost (5x base STR at level 1)
      Power: 20, // Significant boost (2.5x base Power at level 1)
      Critical: 5,
    },
    armor: {
      maxHP: 200, // Significant boost (~1.7x base HP at level 1)
      Armor: 10,
      Resistance: 5,
    },
    accessory: {
      DEX: 50, // Significant boost
      INT: 50,
      PIE: 50,
      Avoid: 5,
      Parry: 3,
    },
  };
  
  const base = baseStats[itemType] || {};
  const stats: StatModifiers = {};
  
  // Apply power multiplier to all stats
  Object.entries(base).forEach(([key, value]) => {
    if (value !== undefined) {
      stats[key as keyof StatModifiers] = Math.floor(value * power);
    }
  });
  
  return stats;
}

/**
 * Determine item rarity based on floor and random roll
 */
export function determineItemRarity(floor: number): ItemRarity {
  const rarityRoll = Math.random() * 100;
  
  if (floor <= 2) {
    // Early floors: mostly common/uncommon
    if (rarityRoll < 60) return 'Common';
    if (rarityRoll < 90) return 'Uncommon';
    if (rarityRoll < 98) return 'Rare';
    return 'Very Rare';
  } else if (floor <= 5) {
    // Mid floors: more rare items
    if (rarityRoll < 40) return 'Common';
    if (rarityRoll < 70) return 'Uncommon';
    if (rarityRoll < 90) return 'Rare';
    if (rarityRoll < 98) return 'Very Rare';
    return 'Legendary';
  } else {
    // Deep floors: mostly rare+
    if (rarityRoll < 20) return 'Common';
    if (rarityRoll < 50) return 'Uncommon';
    if (rarityRoll < 75) return 'Rare';
    if (rarityRoll < 90) return 'Very Rare';
    if (rarityRoll < 98) return 'Legendary';
    return 'Artifact';
  }
}

/**
 * Generate a random item for a given floor
 */
export function generateItemForFloor(floor: number): Partial<Item> {
  const rarity = determineItemRarity(floor);
  const itemTypes: Array<'weapon' | 'armor' | 'accessory'> = ['weapon', 'armor', 'accessory'];
  const itemType = itemTypes[Math.floor(Math.random() * itemTypes.length)];
  
  const stats = generateItemStats(floor, rarity, itemType);
  
  // Generate item name based on rarity and type
  const rarityPrefixes: Record<ItemRarity, string[]> = {
    'Common': ['Rusty', 'Old', 'Worn'],
    'Uncommon': ['Steel', 'Reinforced', 'Polished'],
    'Rare': ['Enchanted', 'Fine', 'Masterwork'],
    'Very Rare': ['Epic', 'Legendary', 'Ancient'],
    'Legendary': ['Mythic', 'Divine', 'Transcendent'],
    'Artifact': ['Primordial', 'Eternal', 'Ultimate'],
  };
  
  const typeNames: Record<string, string[]> = {
    weapon: ['Sword', 'Blade', 'Axe', 'Mace', 'Dagger'],
    armor: ['Armor', 'Plate', 'Mail', 'Vest', 'Guard'],
    accessory: ['Ring', 'Amulet', 'Talisman', 'Charm', 'Medallion'],
  };
  
  const prefix = rarityPrefixes[rarity][Math.floor(Math.random() * rarityPrefixes[rarity].length)];
  const typeName = typeNames[itemType][Math.floor(Math.random() * typeNames[itemType].length)];
  const name = `${prefix} ${typeName}`;
  
  return {
    id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name,
    rarity,
    slot: itemType,
    description: `A ${rarity.toLowerCase()} ${itemType} found on floor ${floor}.`,
    stats,
  };
}

/**
 * Check if item should drop (based on room type and floor)
 */
export function shouldDropItem(roomType: string, floor: number): boolean {
  // Drop rates by room type
  const dropRates: Record<string, number> = {
    'COMBAT': 0.3, // 30% chance
    'BOSS': 0.8, // 80% chance (bosses always drop good loot)
    'TREASURE': 0.9, // 90% chance
    'EVENT': 0.2, // 20% chance
    'DEAD_END': 0.4, // 40% chance
    'NORMAL': 0.1, // 10% chance
  };
  
  const dropRate = dropRates[roomType] || 0.1;
  return Math.random() < dropRate;
}

