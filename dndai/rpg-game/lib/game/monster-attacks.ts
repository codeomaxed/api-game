import { Monster, MonsterTier } from './monsters';

export interface AttackPattern {
  id: string;
  name: string;
  description: string;
  icon: string; // Emoji or icon identifier
  type: 'physical' | 'magic' | 'special';
}

// Default attack patterns based on Buriedbornes style
const BASIC_ATTACK: AttackPattern = {
  id: 'basic-attack',
  name: 'Basic Attack',
  description: 'A simple physical attack using strength and power.',
  icon: '⚔️',
  type: 'physical',
};

const MAGIC_ATTACK: AttackPattern = {
  id: 'magic-attack',
  name: 'Magic Attack',
  description: 'A magical attack that deals damage based on intelligence.',
  icon: '✨',
  type: 'magic',
};

const SPECIAL_ATTACK: AttackPattern = {
  id: 'special-attack',
  name: 'Special Attack',
  description: 'A powerful special ability unique to this monster.',
  icon: '💥',
  type: 'special',
};

// Get attack patterns for a monster based on tier
export function getMonsterAttackPatterns(monster: Monster): AttackPattern[] {
  const patterns: AttackPattern[] = [BASIC_ATTACK]; // All monsters have basic attack

  switch (monster.tier) {
    case 'common':
      // Common monsters only have basic attack
      return patterns;
    
    case 'uncommon':
      // Uncommon monsters have basic + magic
      return [...patterns, MAGIC_ATTACK];
    
    case 'boss':
      // Bosses have all three
      return [...patterns, MAGIC_ATTACK, SPECIAL_ATTACK];
    
    default:
      return patterns;
  }
}

// Get attack pattern by ID
export function getAttackPatternById(id: string): AttackPattern | null {
  const allPatterns = [BASIC_ATTACK, MAGIC_ATTACK, SPECIAL_ATTACK];
  return allPatterns.find(p => p.id === id) || null;
}







