// XP and Leveling System (Buriedbornes style)

import { Character } from '@/types/character';
import { calculateBaseStats } from './buriedbornes-stats';

/**
 * Calculate XP to next level
 * Formula: 100 × (1.5 ^ (level - 1))
 */
export function calculateXPToNextLevel(currentLevel: number): number {
  return Math.floor(100 * Math.pow(1.5, currentLevel - 1));
}

/**
 * Calculate XP gained from defeating a monster
 */
export function calculateXP(
  monsterLevel: number,
  playerLevel: number,
  floor: number,
  isBoss: boolean,
  stepsOnFloor: number
): number {
  // Base XP = 10 × monster level
  let baseXP = 10 * monsterLevel;
  
  // Boss multiplier (10x XP)
  const bossMultiplier = isBoss ? 10 : 1;
  
  // Floor multiplier (20% more per floor)
  const floorMultiplier = 1 + ((floor - 1) * 0.2);
  
  // Level difference bonus/penalty
  const levelDiff = monsterLevel - playerLevel;
  let levelMultiplier = 1.0;
  if (levelDiff > 0) {
    // Fighting higher level = more XP
    levelMultiplier = 1 + (levelDiff * 0.15);
  } else if (levelDiff < -3) {
    // Fighting much lower level = less XP
    levelMultiplier = Math.max(0.1, 1 + (levelDiff * 0.2));
  }
  
  // XP penalty for staying on same floor too long
  let floorPenalty = 1.0;
  if (stepsOnFloor > 16) {
    const excessSteps = stepsOnFloor - 16;
    floorPenalty = Math.max(0.1, 1 - (excessSteps * 0.05)); // -5% per step over 16
  }
  
  const totalXP = baseXP * bossMultiplier * floorMultiplier * levelMultiplier * floorPenalty;
  return Math.max(1, Math.floor(totalXP));
}

/**
 * Add XP to character and check for level up
 */
export function gainXP(character: Character, xpGained: number): {
  character: Character;
  leveledUp: boolean;
  levelsGained: number;
} {
  let newCharacter = { ...character };
  let leveledUp = false;
  let levelsGained = 0;
  
  newCharacter.xp += xpGained;
  
  // Check for level ups (can level multiple times)
  while (newCharacter.xp >= newCharacter.xpToNext) {
    const excessXP = newCharacter.xp - newCharacter.xpToNext;
    newCharacter.level += 1;
    newCharacter.xp = excessXP;
    newCharacter.xpToNext = calculateXPToNextLevel(newCharacter.level);
    leveledUp = true;
    levelsGained += 1;
    
    // Level up benefits
    newCharacter = applyLevelUp(newCharacter);
  }
  
  return {
    character: newCharacter,
    leveledUp,
    levelsGained,
  };
}

/**
 * Apply level up benefits
 */
function applyLevelUp(character: Character): Character {
  // Calculate new base stats
  const newBaseStats = calculateBaseStats(character.level);
  
  // Full HP restoration (critical for survival)
  const newMaxHP = newBaseStats.maxHP;
  
  // Update character
  return {
    ...character,
    baseStats: newBaseStats,
    hp: {
      current: newMaxHP, // Full HP restoration
      max: newMaxHP,
    },
    // May unlock new skill slot at certain levels
    maxSkillSlots: character.level >= 5 && character.maxSkillSlots < 5 ? 5 :
                   character.level >= 10 && character.maxSkillSlots < 6 ? 6 :
                   character.maxSkillSlots,
  };
}







