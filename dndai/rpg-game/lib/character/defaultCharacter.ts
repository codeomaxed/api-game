import { Character, Job } from '@/types/character';
import { calculateBaseStats } from '@/lib/game/buriedbornes-stats';
import { DEFAULT_SKILLS, Skill } from '@/lib/game/skills';

// Default job definitions (Buriedbornes style)
export const DEFAULT_JOBS: Record<string, Job> = {
  Warrior: {
    name: 'Warrior',
    description: 'A melee fighter specializing in physical combat',
    primaryStat: 'STR',
    startingSkills: ['basic-attack'],
    statBonuses: {
      STR: 2,
      maxHP: 20,
    },
  },
  Mage: {
    name: 'Mage',
    description: 'A spellcaster specializing in magic damage',
    primaryStat: 'INT',
    startingSkills: ['magic-missile'],
    statBonuses: {
      INT: 2,
      Power: 2,
    },
  },
  Rogue: {
    name: 'Rogue',
    description: 'A nimble fighter specializing in speed and critical hits',
    primaryStat: 'DEX',
    startingSkills: ['basic-attack'],
    statBonuses: {
      DEX: 2,
      Critical: 5,
    },
  },
  Cleric: {
    name: 'Cleric',
    description: 'A support class specializing in healing and protection',
    primaryStat: 'PIE',
    startingSkills: ['heal'],
    statBonuses: {
      PIE: 2,
      Resistance: 5,
    },
  },
};

// Create default character (Buriedbornes style)
export function createDefaultCharacter(
  name: string = 'Adventurer',
  jobName: string = 'Warrior'
): Character {
  const job = DEFAULT_JOBS[jobName] || DEFAULT_JOBS.Warrior;
  const level = 1;
  
  // Calculate base stats from level
  const baseStats = calculateBaseStats(level);
  
  // Apply job bonuses
  if (job.statBonuses) {
    if (job.statBonuses.STR) baseStats.STR += job.statBonuses.STR;
    if (job.statBonuses.DEX) baseStats.DEX += job.statBonuses.DEX;
    if (job.statBonuses.INT) baseStats.INT += job.statBonuses.INT;
    if (job.statBonuses.PIE) baseStats.PIE += job.statBonuses.PIE;
    if (job.statBonuses.maxHP) baseStats.maxHP += job.statBonuses.maxHP;
    if (job.statBonuses.Power) baseStats.Power += job.statBonuses.Power;
    if (job.statBonuses.Armor) baseStats.Armor += job.statBonuses.Armor;
    if (job.statBonuses.Resistance) baseStats.Resistance += job.statBonuses.Resistance;
    if (job.statBonuses.Critical) baseStats.Critical += job.statBonuses.Critical;
  }
  
  // Get starting skills
  const skills: Skill[] = job.startingSkills
    .map(skillId => DEFAULT_SKILLS.find(s => s.id === skillId))
    .filter((s): s is Skill => s !== undefined);
  
  // Add basic attack if not already present
  if (!skills.find(s => s.id === 'basic-attack')) {
    const basicAttack = DEFAULT_SKILLS.find(s => s.id === 'basic-attack');
    if (basicAttack) skills.push(basicAttack);
  }
  
  // Calculate XP to next level
  const xpToNext = Math.floor(100 * Math.pow(1.5, level - 1));
  
  return {
    name,
    job,
    level,
    baseStats,
    hp: {
      current: baseStats.maxHP,
      max: baseStats.maxHP,
    },
    xp: 0,
    xpToNext,
    skills,
    maxSkillSlots: 4, // Start with 4, can increase to 6
    equipment: {},
    inventory: [],
    statusEffects: [],
    buffs: {},
    portraitUrl: '/characters/Human2.png',
  };
}
