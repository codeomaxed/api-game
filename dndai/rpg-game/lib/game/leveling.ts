import { Character } from '@/types/character';
import { getAbilityModifier } from '@/types/character';

// XP Table (simplified)
export const XP_TABLE = [
  0,      // Level 1
  300,    // Level 2
  900,    // Level 3
  2700,   // Level 4
  6500,   // Level 5
  14000,  // Level 6
  23000,  // Level 7
  34000,  // Level 8
  48000,  // Level 9
  64000,  // Level 10
  85000,  // Level 11
  100000, // Level 12
  120000, // Level 13
  140000, // Level 14
  165000, // Level 15
  195000, // Level 16
  225000, // Level 17
  265000, // Level 18
  305000, // Level 19
  355000, // Level 20
];

export function getXPForLevel(level: number): number {
  if (level < 1) return 0;
  if (level > 20) return XP_TABLE[19];
  return XP_TABLE[level - 1];
}

export function getXPToNextLevel(currentXP: number, currentLevel: number): number {
  if (currentLevel >= 20) return 0;
  const nextLevelXP = getXPForLevel(currentLevel + 1);
  return Math.max(0, nextLevelXP - currentXP);
}

export function calculateLevelFromXP(xp: number): number {
  for (let level = 20; level >= 1; level--) {
    if (xp >= XP_TABLE[level - 1]) {
      return level;
    }
  }
  return 1;
}

export function addXP(character: Character, xpGained: number): {
  newXP: number;
  newLevel: number;
  leveledUp: boolean;
  xpToNext: number;
} {
  const newXP = character.xp + xpGained;
  const newLevel = calculateLevelFromXP(newXP);
  const leveledUp = newLevel > character.level;
  const xpToNext = getXPToNextLevel(newXP, newLevel);
  
  return {
    newXP,
    newLevel,
    leveledUp,
    xpToNext,
  };
}

export function calculateLevelUpHPIncrease(
  character: Character,
  hitDie: number,
  constitutionModifier: number
): number {
  // Use average or roll
  const average = Math.ceil(hitDie / 2) + 1; // Average rounded up
  return average + constitutionModifier;
}

export function applyLevelUp(
  character: Character
): Character {
  if (character.level >= 20) {
    return character; // Max level
  }
  
  const newLevel = character.level + 1;
  const conMod = getAbilityModifier(character.stats.constitution);
  const hpIncrease = calculateLevelUpHPIncrease(character, character.class.hitDie, conMod);
  
  // Ability Score Improvement at levels 4, 8, 12, 16, 19
  const abilityScoreImprovements = [4, 8, 12, 16, 19];
  const hasASI = abilityScoreImprovements.includes(newLevel);
  
  // TODO: Handle ASI and class features based on class
  
  return {
    ...character,
    level: newLevel,
    hp: {
      current: character.hp.max + hpIncrease,
      max: character.hp.max + hpIncrease,
      temporary: character.hp.temporary,
    },
    xpToNext: getXPToNextLevel(character.xp, newLevel),
    // Restore resources on level up
    resources: {
      ...character.resources,
      current: character.resources.max,
    },
    actionPoints: character.maxActionPoints,
  };
}














