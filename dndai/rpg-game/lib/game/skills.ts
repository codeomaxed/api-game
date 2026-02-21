// Buriedbornes Skill System

export type SkillStat = 'STR' | 'DEX' | 'INT' | 'PIE' | 'STR+INT' | 'DEX+INT';

export interface Skill {
  id: string;
  name: string;
  description: string;
  primaryStat: SkillStat;
  power: number; // Base power value
  skillPower: number; // Percentage multiplier (e.g., 150 = 150%)
  cooldown: number; // Turns before can use again
  currentCooldown: number; // Current cooldown counter
  effects?: SkillEffect[];
  modifiers?: SkillModifier[];
}

export interface SkillEffect {
  type: 'damage' | 'heal' | 'buff' | 'debuff' | 'status';
  value?: number;
  statusType?: StatusEffectType;
  duration?: number;
}

export type SkillModifier = 
  | 'Firststrike' // Activates at start of combat
  | 'Legendary' // Enhanced effects
  | 'Pierce' // Ignores armor
  | 'MultiHit' // Hits multiple times
  | 'Lifesteal' // Heals for damage dealt
  | 'Critical' // Higher crit chance
  | 'CooldownReduction'; // Reduces cooldown

export type StatusEffectType =
  | 'Poison' // Damage over time
  | 'Burn' // Fire damage over time
  | 'Freeze' // Prevents action
  | 'Stun' // Prevents action
  | 'Bleed' // Physical damage over time
  | 'Shield' // Damage absorption
  | 'Haste' // Increased speed
  | 'Slow' // Reduced speed
  | 'Regeneration' // Heal over time
  | 'Strengthen' // Increased damage
  | 'Weaken' // Reduced damage
  | 'DamageReduce'; // Damage reduction

export interface StatusEffect {
  type: StatusEffectType;
  value: number; // Effect value (damage, heal amount, percentage, etc.)
  duration: number; // Turns remaining
  stacks?: number; // For stackable effects
}

// Default skills for starting characters
export const DEFAULT_SKILLS: Skill[] = [
  {
    id: 'basic-attack',
    name: 'Basic Attack',
    description: 'A simple physical attack',
    primaryStat: 'STR',
    power: 10,
    skillPower: 150, // Increased from 100 to 150 (50% more damage)
    cooldown: 0,
    currentCooldown: 0,
  },
  {
    id: 'magic-missile',
    name: 'Magic Missile',
    description: 'A basic magic attack',
    primaryStat: 'INT',
    power: 15,
    skillPower: 180, // Increased from 120 to 180 (50% more damage)
    cooldown: 2,
    currentCooldown: 0,
  },
  {
    id: 'heal',
    name: 'Heal',
    description: 'Restores HP',
    primaryStat: 'PIE',
    power: 20,
    skillPower: 100,
    cooldown: 3,
    currentCooldown: 0,
    effects: [
      {
        type: 'heal',
        value: 50,
      },
    ],
  },
];

// Reduce cooldowns by 1 (called at end of each turn)
export function reduceCooldowns(skills: Skill[]): Skill[] {
  return skills.map(skill => ({
    ...skill,
    currentCooldown: Math.max(0, skill.currentCooldown - 1),
  }));
}

// Get available skills (cooldown = 0)
export function getAvailableSkills(skills: Skill[]): Skill[] {
  return skills.filter(skill => skill.currentCooldown === 0);
}

// Use a skill (set cooldown)
export function useSkill(skill: Skill): Skill {
  return {
    ...skill,
    currentCooldown: skill.cooldown,
  };
}

