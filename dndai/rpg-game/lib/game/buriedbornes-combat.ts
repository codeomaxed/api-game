// Buriedbornes Combat System

import { BuriedbornesStats, getStatForSkill } from './buriedbornes-stats';
import { Skill, StatusEffectType } from './skills';

export interface CombatResult {
  damage: number;
  hit: boolean;
  critical: boolean;
  message: string;
  statusEffects?: Array<{ type: StatusEffectType; value: number; duration: number }>;
}

export interface CombatState {
  turn: 'player' | 'enemy';
  round: number;
  playerHP: number;
  enemyHP: number;
  playerStatusEffects: Array<{ type: StatusEffectType; value: number; duration: number; stacks?: number }>;
  enemyStatusEffects: Array<{ type: StatusEffectType; value: number; duration: number; stacks?: number }>;
  playerBuffs: {
    Strengthen?: number;
    Weaken?: number;
    DamageReduce?: number;
  };
  enemyBuffs: {
    Strengthen?: number;
    Weaken?: number;
    DamageReduce?: number;
  };
}

// Calculate skill damage (Buriedbornes formula)
export function calculateSkillDamage(
  skill: Skill,
  playerStats: BuriedbornesStats,
  playerLevel: number,
  enemyStats?: BuriedbornesStats
): number {
  // Get relevant stat
  const relevantStat = getStatForSkill(playerStats, skill.primaryStat);
  
  // Base power from skill
  const skillPower = skill.power;
  
  // Level bonus (small)
  const levelBonus = playerLevel * 0.5;
  
  // Base damage = (STAT + Power) × (Skill Power / 100)
  // Add base multiplier to make player damage more impactful (ensures player can actually kill monsters)
  const baseDamage = (relevantStat + playerStats.Power + levelBonus) * (skill.skillPower / 100) * 1.3;
  
  // Apply random factor (0.85-1.15)
  const randomFactor = 0.85 + (Math.random() * 0.3);
  
  return Math.max(1, Math.floor(baseDamage * randomFactor));
}

// Apply modifiers to damage
export function applyDamageModifiers(
  baseDamage: number,
  attackerBuffs: { Strengthen?: number; Weaken?: number; DamageReduce?: number },
  defenderBuffs: { Strengthen?: number; Weaken?: number; DamageReduce?: number },
  isAttackerPlayer: boolean
): number {
  let damage = baseDamage;
  
  // Attacker's Strengthen increases damage
  if (attackerBuffs.Strengthen) {
    damage = damage * (1 + attackerBuffs.Strengthen / 100);
  }
  
  // Defender's Weaken reduces incoming damage
  if (defenderBuffs.Weaken) {
    damage = damage * (1 - defenderBuffs.Weaken / 100);
  }
  
  // Defender's Damage Reduce reduces damage
  if (defenderBuffs.DamageReduce) {
    damage = damage * (1 - defenderBuffs.DamageReduce / 100);
  }
  
  return Math.max(1, Math.floor(damage));
}

// Apply armor/resistance reduction
export function applyDefenseReduction(
  damage: number,
  armor: number,
  resistance: number,
  isPhysical: boolean
): number {
  let finalDamage = damage;
  
  if (isPhysical) {
    // Physical damage reduced by Armor
    finalDamage = Math.max(1, finalDamage - armor);
  } else {
    // Magic damage reduced by Resistance
    finalDamage = Math.max(1, finalDamage - resistance);
  }
  
  return finalDamage;
}

// Check for critical hit
export function checkCritical(criticalChance: number): boolean {
  return Math.random() * 100 < criticalChance;
}

// Check for avoid/parry
export function checkAvoid(avoidChance: number): boolean {
  return Math.random() * 100 < avoidChance;
}

export function checkParry(parryChance: number): boolean {
  return Math.random() * 100 < parryChance;
}

// Process status effects at end of turn
export function processStatusEffects(
  statusEffects: Array<{ type: StatusEffectType; value: number; duration: number; stacks?: number }>
): {
  updatedEffects: Array<{ type: StatusEffectType; value: number; duration: number; stacks?: number }>;
  damage: number;
  heal: number;
  preventedAction: boolean;
} {
  let damage = 0;
  let heal = 0;
  let preventedAction = false;
  const updatedEffects: Array<{ type: StatusEffectType; value: number; duration: number; stacks?: number }> = [];
  
  statusEffects.forEach(effect => {
    const newDuration = effect.duration - 1;
    
    // Process effect this turn
    switch (effect.type) {
      case 'Poison':
      case 'Burn':
      case 'Bleed':
        damage += effect.value * (effect.stacks || 1);
        break;
      case 'Regeneration':
        heal += effect.value * (effect.stacks || 1);
        break;
      case 'Freeze':
      case 'Stun':
        preventedAction = true;
        break;
    }
    
    // Keep effect if duration > 0
    if (newDuration > 0) {
      updatedEffects.push({
        ...effect,
        duration: newDuration,
      });
    }
  });
  
  return {
    updatedEffects,
    damage,
    heal,
    preventedAction,
  };
}

// Player uses skill on enemy
export function playerUseSkill(
  skill: Skill,
  playerStats: BuriedbornesStats,
  playerLevel: number,
  playerBuffs: { Strengthen?: number; Weaken?: number; DamageReduce?: number },
  enemyStats: BuriedbornesStats,
  enemyBuffs: { Strengthen?: number; Weaken?: number; DamageReduce?: number }
): CombatResult {
  // Check if skill can be used (cooldown)
  if (skill.currentCooldown > 0) {
    return {
      damage: 0,
      hit: false,
      critical: false,
      message: `${skill.name} is on cooldown!`,
    };
  }
  
  // Check for avoid/parry
  if (checkAvoid(enemyStats.Avoid)) {
    return {
      damage: 0,
      hit: false,
      critical: false,
      message: 'Enemy avoided the attack!',
    };
  }
  
  if (checkParry(enemyStats.Parry)) {
    return {
      damage: 0,
      hit: false,
      critical: false,
      message: 'Enemy parried the attack!',
    };
  }
  
  // Calculate base damage
  const isPhysical = skill.primaryStat === 'STR' || skill.primaryStat === 'DEX' || skill.primaryStat === 'STR+INT' || skill.primaryStat === 'DEX+INT';
  let damage = calculateSkillDamage(skill, playerStats, playerLevel);
  
  // Check for critical
  const isCritical = checkCritical(playerStats.Critical);
  if (isCritical) {
    damage = Math.floor(damage * 1.5);
  }
  
  // Apply modifiers
  damage = applyDamageModifiers(damage, playerBuffs, enemyBuffs, true);
  
  // Apply defense reduction
  damage = applyDefenseReduction(
    damage,
    enemyStats.Armor,
    enemyStats.Resistance,
    isPhysical
  );
  
  // Apply skill effects
  const statusEffects = skill.effects?.filter(e => e.type === 'status' || e.type === 'debuff').map(e => ({
    type: e.statusType!,
    value: e.value || 0,
    duration: e.duration || 1,
  }));
  
  return {
    damage,
    hit: true,
    critical: isCritical,
    message: isCritical
      ? `Critical hit! ${skill.name} deals ${damage} damage!`
      : `${skill.name} deals ${damage} damage!`,
    statusEffects,
  };
}

// Enemy attacks player
export function enemyAttack(
  enemyStats: BuriedbornesStats,
  enemyLevel: number,
  enemyBuffs: { Strengthen?: number; Weaken?: number; DamageReduce?: number },
  playerStats: BuriedbornesStats,
  playerBuffs: { Strengthen?: number; Weaken?: number; DamageReduce?: number }
): CombatResult {
  // Check for avoid/parry
  if (checkAvoid(playerStats.Avoid)) {
    return {
      damage: 0,
      hit: false,
      critical: false,
      message: 'You avoided the attack!',
    };
  }
  
  if (checkParry(playerStats.Parry)) {
    return {
      damage: 0,
      hit: false,
      critical: false,
      message: 'You parried the attack!',
    };
  }
  
  // Enemy basic attack (uses STR + Power)
  // Note: enemyStats are already scaled by level, so we don't add extra level scaling here
  const baseDamage = enemyStats.STR + enemyStats.Power;
  const randomFactor = 0.85 + (Math.random() * 0.3);
  let damage = Math.floor(baseDamage * randomFactor);
  
  // Check for critical
  const isCritical = checkCritical(enemyStats.Critical);
  if (isCritical) {
    damage = Math.floor(damage * 1.5);
  }
  
  // Apply modifiers
  damage = applyDamageModifiers(damage, enemyBuffs, playerBuffs, false);
  
  // Apply defense reduction (physical attack)
  damage = applyDefenseReduction(damage, playerStats.Armor, playerStats.Resistance, true);
  
  // Check for reflect
  if (playerStats.Reflect > 0 && Math.random() * 100 < playerStats.Reflect) {
    const reflectedDamage = Math.floor(damage * 0.5);
    return {
      damage: 0,
      hit: false,
      critical: false,
      message: `You reflected ${reflectedDamage} damage back!`,
    };
  }
  
  return {
    damage,
    hit: true,
    critical: isCritical,
    message: isCritical
      ? `Critical hit! Enemy deals ${damage} damage!`
      : `Enemy deals ${damage} damage!`,
  };
}

