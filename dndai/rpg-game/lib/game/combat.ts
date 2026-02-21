import { Character } from '@/types/character';
import { EnemyData, EnemyAttack } from '@/types/game';
import { getAbilityModifier, getProficiencyBonus } from '@/types/character';

export interface CombatResult {
  damage: number;
  hit: boolean;
  critical: boolean;
  message: string;
}

// Calculate attack roll
export function calculateAttackRoll(
  character: Character,
  weapon: { toHit: number; damage: string },
  advantage: boolean = false
): { roll: number; total: number; critical: boolean } {
  const proficiencyBonus = getProficiencyBonus(character.level);
  const totalStats = calculateTotalStats(character);
  
  // Determine ability modifier (STR for melee, DEX for ranged/finesse)
  const abilityMod = getAbilityModifier(totalStats.strength); // Simplified - should check weapon type
  
  const baseRoll = Math.floor(Math.random() * 20) + 1;
  const advantageRoll = advantage ? Math.floor(Math.random() * 20) + 1 : baseRoll;
  const roll = advantage ? Math.max(baseRoll, advantageRoll) : baseRoll;
  
  const critical = roll === 20;
  const total = roll + proficiencyBonus + abilityMod + weapon.toHit;
  
  return { roll, total, critical };
}

// Calculate damage
export function calculateDamage(
  character: Character,
  weapon: { damage: string },
  critical: boolean = false
): number {
  const totalStats = calculateTotalStats(character);
  const abilityMod = getAbilityModifier(totalStats.strength); // Simplified
  
  // Parse damage dice (e.g., "1d8+3")
  const match = weapon.damage.match(/(\d+)d(\d+)([+-]\d+)?/);
  if (!match) return 0;
  
  const numDice = parseInt(match[1]);
  const dieSize = parseInt(match[2]);
  const modifier = match[3] ? parseInt(match[3]) : 0;
  
  let total = 0;
  const diceToRoll = critical ? numDice * 2 : numDice;
  
  for (let i = 0; i < diceToRoll; i++) {
    total += Math.floor(Math.random() * dieSize) + 1;
  }
  
  return total + modifier + abilityMod;
}

// Calculate total stats (helper - should use from character context)
function calculateTotalStats(character: Character) {
  // This should use the actual calculation from CharacterContext
  return character.stats; // Simplified
}

// Player attacks enemy
export function playerAttack(
  character: Character,
  enemy: EnemyData,
  weapon: { toHit: number; damage: string }
): CombatResult {
  const attack = calculateAttackRoll(character, weapon);
  const hit = attack.total >= enemy.ac || attack.critical;
  
  if (!hit) {
    return {
      damage: 0,
      hit: false,
      critical: false,
      message: `You miss ${enemy.name}!`,
    };
  }
  
  const damage = calculateDamage(character, weapon, attack.critical);
  const actualDamage = Math.max(1, damage);
  
  return {
    damage: actualDamage,
    hit: true,
    critical: attack.critical,
    message: attack.critical
      ? `Critical hit! You deal ${actualDamage} damage to ${enemy.name}!`
      : `You hit ${enemy.name} for ${actualDamage} damage!`,
  };
}

// Enemy attacks player
export function enemyAttack(
  enemy: EnemyData,
  character: Character,
  attack: EnemyAttack
): CombatResult {
  const roll = Math.floor(Math.random() * 20) + 1;
  const critical = roll === 20;
  const total = roll + attack.toHit;
  
  const characterAC = 10; // Simplified - should get from character context
  const hit = total >= characterAC || critical;
  
  if (!hit) {
    return {
      damage: 0,
      hit: false,
      critical: false,
      message: `${enemy.name} misses you!`,
    };
  }
  
  // Parse damage
  const match = attack.damage.match(/(\d+)d(\d+)([+-]\d+)?/);
  if (!match) {
    return {
      damage: 0,
      hit: false,
      critical: false,
      message: 'Invalid attack damage',
    };
  }
  
  const numDice = parseInt(match[1]);
  const dieSize = parseInt(match[2]);
  const modifier = match[3] ? parseInt(match[3]) : 0;
  
  let total = 0;
  const diceToRoll = critical ? numDice * 2 : numDice;
  
  for (let i = 0; i < diceToRoll; i++) {
    total += Math.floor(Math.random() * dieSize) + 1;
  }
  
  const damage = total + modifier;
  const actualDamage = Math.max(1, damage);
  
  return {
    damage: actualDamage,
    hit: true,
    critical,
    message: critical
      ? `Critical hit! ${enemy.name} deals ${actualDamage} damage to you!`
      : `${enemy.name} hits you for ${actualDamage} damage!`,
  };
}

// Calculate spell damage (simplified)
export function calculateSpellDamage(
  spellLevel: number,
  damageDice: string,
  spellcastingModifier: number
): number {
  const match = damageDice.match(/(\d+)d(\d+)([+-]\d+)?/);
  if (!match) return 0;
  
  const numDice = parseInt(match[1]) + spellLevel - 1; // Scale with level
  const dieSize = parseInt(match[2]);
  const modifier = match[3] ? parseInt(match[3]) : 0;
  
  let total = 0;
  for (let i = 0; i < numDice; i++) {
    total += Math.floor(Math.random() * dieSize) + 1;
  }
  
  return total + modifier + spellcastingModifier;
}














