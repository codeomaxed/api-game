// Buriedbornes Stat System
// Replaces D&D 5e ability scores

export interface BuriedbornesStats {
  // Core Combat Stats
  STR: number; // Strength - Physical damage, melee attacks
  DEX: number; // Dexterity - Speed, dodge, ranged attacks
  INT: number; // Intelligence - Magic damage, spell power
  PIE: number; // Piety - Healing, support magic, resistance
  
  // Derived Stats
  maxHP: number; // Maximum Hit Points
  Power: number; // Base power stat (affects all damage)
  
  // Defense Stats
  Armor: number; // Physical damage reduction
  Resistance: number; // Magic damage reduction
  
  // Combat Stats
  Avoid: number; // Chance to dodge attacks (%)
  Parry: number; // Chance to parry attacks (%)
  Critical: number; // Critical hit chance (%)
  Reflect: number; // Damage reflection (%)
  Pursuit: number; // Additional attack chance (%)
}

// Base stat growth per level
export function calculateBaseStats(level: number): BuriedbornesStats {
  return {
    STR: 10 + (level * 0.5),
    DEX: 10 + (level * 0.5),
    INT: 10 + (level * 0.5),
    PIE: 10 + (level * 0.5),
    maxHP: 100 + (20 * level), // Level 1 = 120, Level 10 = 300 (increased for survivability)
    Power: 6.2 + (1.8 * level), // Level 1 = 8.0, Level 10 = 24.2
    Armor: 2 + (level * 0.5), // Level 1 = 2.5, Level 10 = 7 (base armor from level)
    Resistance: 1 + (level * 0.3), // Level 1 = 1.3, Level 10 = 4 (base resistance from level)
    Avoid: 0,
    Parry: 0,
    Critical: 0,
    Reflect: 0,
    Pursuit: 0,
  };
}

// Calculate total stats (base + equipment)
export function calculateTotalStats(
  baseStats: BuriedbornesStats,
  equipmentStats: Partial<BuriedbornesStats>
): BuriedbornesStats {
  return {
    STR: baseStats.STR + (equipmentStats.STR || 0),
    DEX: baseStats.DEX + (equipmentStats.DEX || 0),
    INT: baseStats.INT + (equipmentStats.INT || 0),
    PIE: baseStats.PIE + (equipmentStats.PIE || 0),
    maxHP: baseStats.maxHP + (equipmentStats.maxHP || 0),
    Power: baseStats.Power + (equipmentStats.Power || 0),
    Armor: baseStats.Armor + (equipmentStats.Armor || 0),
    Resistance: baseStats.Resistance + (equipmentStats.Resistance || 0),
    Avoid: baseStats.Avoid + (equipmentStats.Avoid || 0),
    Parry: baseStats.Parry + (equipmentStats.Parry || 0),
    Critical: baseStats.Critical + (equipmentStats.Critical || 0),
    Reflect: baseStats.Reflect + (equipmentStats.Reflect || 0),
    Pursuit: baseStats.Pursuit + (equipmentStats.Pursuit || 0),
  };
}

// Get stat value for skill calculation
export function getStatForSkill(
  stats: BuriedbornesStats,
  primaryStat: 'STR' | 'DEX' | 'INT' | 'PIE' | 'STR+INT' | 'DEX+INT'
): number {
  switch (primaryStat) {
    case 'STR':
      return stats.STR;
    case 'DEX':
      return stats.DEX;
    case 'INT':
      return stats.INT;
    case 'PIE':
      return stats.PIE;
    case 'STR+INT':
      return stats.STR + stats.INT;
    case 'DEX+INT':
      return stats.DEX + stats.INT;
    default:
      return stats.STR;
  }
}

