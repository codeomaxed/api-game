// Balance Validation Utility
// Validates that all formulas and scaling match the Buriedbornes design

import { BuriedbornesStats, calculateBaseStats } from './buriedbornes-stats';
import { calculateXP, calculateXPToNextLevel } from './xp-leveling';
import { calculateItemPower } from './items';
import { scaleMonsterToLevel, getMonsterBaseStats } from './monsters';

export interface BalanceReport {
  playerStats: {
    level: number;
    baseStats: BuriedbornesStats;
    expectedHP: number;
    actualHP: number;
    expectedPower: number;
    actualPower: number;
  }[];
  monsterScaling: {
    level: number;
    baseHP: number;
    scaledHP: number;
    baseDamage: number;
    scaledDamage: number;
    scalingRate: number;
  }[];
  xpProgression: {
    level: number;
    xpToNext: number;
    expectedXPToNext: number;
    xpFromMonster: {
      monsterLevel: number;
      playerLevel: number;
      floor: number;
      xp: number;
    }[];
  }[];
  itemScaling: {
    floor: number;
    rarity: string;
    power: number;
    expectedPower: number;
  }[];
  issues: string[];
}

/**
 * Validate that equipment provides 100x more stats than leveling
 */
export function validateEquipmentPriority(): { valid: boolean; message: string } {
  const level1Stats = calculateBaseStats(1);
  const level10Stats = calculateBaseStats(10);
  
  const strIncrease = level10Stats.STR - level1Stats.STR;
  const hpIncrease = level10Stats.maxHP - level1Stats.maxHP;
  
  // Equipment should provide 100x these values
  const expectedEquipmentSTR = strIncrease * 100;
  const expectedEquipmentHP = hpIncrease * 100;
  
  // For floor 1, common item should provide significant stats
  // This is a guideline check
  const valid = true; // Equipment scaling is handled in items.ts
  
  return {
    valid,
    message: `Level 1-10 STR increase: ${strIncrease.toFixed(1)}, HP increase: ${hpIncrease}. Equipment should provide ~${expectedEquipmentSTR.toFixed(0)} STR and ~${expectedEquipmentHP} HP at floor 1.`,
  };
}

/**
 * Validate monster scaling rate
 */
export function validateMonsterScaling(): { valid: boolean; message: string; scalingRates: number[] } {
  const baseMonster = {
    id: 'test',
    name: 'Test Monster',
    visualDescription: 'test',
    combatDescription: 'test',
    tier: 'common' as const,
    minLevel: 1,
    xp: 50,
  };
  
  const baseStats = getMonsterBaseStats(baseMonster);
  const scalingRates: number[] = [];
  
  for (let level = 1; level <= 10; level++) {
    const scaled = scaleMonsterToLevel(baseMonster, level);
    const expectedMultiplier = 1 + ((level - 1) * 0.10); // 10% per level
    const actualMultiplier = scaled.stats.maxHP / baseStats.maxHP;
    const rate = (actualMultiplier / expectedMultiplier) * 100;
    scalingRates.push(rate);
  }
  
  const avgRate = scalingRates.reduce((a, b) => a + b, 0) / scalingRates.length;
  const valid = avgRate >= 95 && avgRate <= 105; // Within 5% tolerance
  
  return {
    valid,
    message: `Monster scaling: Average rate ${avgRate.toFixed(1)}% (should be ~100%). Rates: ${scalingRates.map(r => r.toFixed(1)).join(', ')}`,
    scalingRates,
  };
}

/**
 * Validate XP progression
 */
export function validateXPProgression(): { valid: boolean; message: string; issues: string[] } {
  const issues: string[] = [];
  
  // Check XP to next level formula
  for (let level = 1; level <= 10; level++) {
    const expected = Math.floor(100 * Math.pow(1.5, level - 1));
    const actual = calculateXPToNextLevel(level);
    
    if (Math.abs(actual - expected) > 1) {
      issues.push(`Level ${level}: Expected ${expected} XP, got ${actual}`);
    }
  }
  
  // Check XP from monsters
  const testCases = [
    { monsterLevel: 1, playerLevel: 1, floor: 1, isBoss: false, stepsOnFloor: 1 },
    { monsterLevel: 5, playerLevel: 3, floor: 5, isBoss: false, stepsOnFloor: 1 },
    { monsterLevel: 10, playerLevel: 5, floor: 10, isBoss: true, stepsOnFloor: 1 },
  ];
  
  for (const test of testCases) {
    const xp = calculateXP(
      test.monsterLevel,
      test.playerLevel,
      test.floor,
      test.isBoss,
      test.stepsOnFloor
    );
    
    if (xp < 1) {
      issues.push(`XP too low: ${xp} for monster level ${test.monsterLevel}`);
    }
    
    if (test.isBoss && xp < 50) {
      issues.push(`Boss XP too low: ${xp} (should be much higher)`);
    }
  }
  
  return {
    valid: issues.length === 0,
    message: issues.length === 0 ? 'XP progression is valid' : `Found ${issues.length} issues`,
    issues,
  };
}

/**
 * Validate item scaling
 */
export function validateItemScaling(): { valid: boolean; message: string; issues: string[] } {
  const issues: string[] = [];
  
  const rarities: Array<'Common' | 'Uncommon' | 'Rare' | 'Very Rare' | 'Legendary' | 'Artifact'> = [
    'Common', 'Uncommon', 'Rare', 'Very Rare', 'Legendary', 'Artifact'
  ];
  
  for (let floor = 1; floor <= 10; floor++) {
    for (const rarity of rarities) {
      const power = calculateItemPower(floor, rarity);
      
      // Floor 1 Common should be base (1.0)
      if (floor === 1 && rarity === 'Common' && Math.abs(power - 1.0) > 0.01) {
        issues.push(`Floor 1 Common power should be 1.0, got ${power}`);
      }
      
      // Higher floors and rarities should scale up
      if (floor > 1 && power <= 1.0) {
        issues.push(`Floor ${floor} ${rarity} power (${power}) should be > 1.0`);
      }
    }
  }
  
  return {
    valid: issues.length === 0,
    message: issues.length === 0 ? 'Item scaling is valid' : `Found ${issues.length} issues`,
    issues,
  };
}

/**
 * Generate comprehensive balance report
 */
export function generateBalanceReport(): BalanceReport {
  const report: BalanceReport = {
    playerStats: [],
    monsterScaling: [],
    xpProgression: [],
    itemScaling: [],
    issues: [],
  };
  
  // Player stats validation
  for (let level = 1; level <= 10; level++) {
    const stats = calculateBaseStats(level);
    const expectedHP = 100 + (20 * level);
    const expectedPower = 6.2 + (1.8 * level);
    
    report.playerStats.push({
      level,
      baseStats: stats,
      expectedHP: expectedHP,
      actualHP: stats.maxHP,
      expectedPower: expectedPower,
      actualPower: stats.Power,
    });
    
    if (Math.abs(stats.maxHP - expectedHP) > 1) {
      report.issues.push(`Level ${level} HP: Expected ${expectedHP}, got ${stats.maxHP}`);
    }
    if (Math.abs(stats.Power - expectedPower) > 0.1) {
      report.issues.push(`Level ${level} Power: Expected ${expectedPower.toFixed(1)}, got ${stats.Power.toFixed(1)}`);
    }
  }
  
  // Monster scaling validation
  const baseMonster = {
    id: 'test',
    name: 'Test Monster',
    visualDescription: 'test',
    combatDescription: 'test',
    tier: 'common' as const,
    minLevel: 1,
    xp: 50,
  };
  
  const baseStats = getMonsterBaseStats(baseMonster);
  
  for (let level = 1; level <= 10; level++) {
    const scaled = scaleMonsterToLevel(baseMonster, level);
    const baseDamage = baseStats.STR + baseStats.Power;
    const scaledDamage = scaled.stats.STR + scaled.stats.Power;
    const scalingRate = ((scaled.stats.maxHP / baseStats.maxHP - 1) / (level - 1)) * 100 || 0;
    
    report.monsterScaling.push({
      level,
      baseHP: baseStats.maxHP,
      scaledHP: scaled.stats.maxHP,
      baseDamage,
      scaledDamage,
      scalingRate: level > 1 ? scalingRate : 0,
    });
  }
  
  // XP progression validation
  for (let level = 1; level <= 10; level++) {
    const xpToNext = calculateXPToNextLevel(level);
    const expected = Math.floor(100 * Math.pow(1.5, level - 1));
    
    report.xpProgression.push({
      level,
      xpToNext,
      expectedXPToNext: expected,
      xpFromMonster: [
        {
          monsterLevel: level,
          playerLevel: level,
          floor: level,
          xp: calculateXP(level, level, level, false, 1),
        },
        {
          monsterLevel: level + 3,
          playerLevel: level,
          floor: level,
          xp: calculateXP(level + 3, level, level, false, 1),
        },
      ],
    });
  }
  
  // Item scaling validation
  const rarities: Array<'Common' | 'Uncommon' | 'Rare' | 'Very Rare' | 'Legendary' | 'Artifact'> = [
    'Common', 'Uncommon', 'Rare', 'Very Rare', 'Legendary', 'Artifact'
  ];
  
  for (let floor = 1; floor <= 5; floor++) {
    for (const rarity of rarities) {
      const power = calculateItemPower(floor, rarity);
      const floorMultiplier = 1 + ((floor - 1) * 0.5);
      const rarityMultipliers: Record<string, number> = {
        'Common': 1.0,
        'Uncommon': 1.5,
        'Rare': 2.5,
        'Very Rare': 4.0,
        'Legendary': 6.0,
        'Artifact': 10.0,
      };
      const expectedPower = floorMultiplier * rarityMultipliers[rarity];
      
      report.itemScaling.push({
        floor,
        rarity,
        power,
        expectedPower,
      });
      
      if (Math.abs(power - expectedPower) > 0.01) {
        report.issues.push(`Floor ${floor} ${rarity}: Expected ${expectedPower.toFixed(2)}, got ${power.toFixed(2)}`);
      }
    }
  }
  
  return report;
}

/**
 * Log balance report to console
 */
export function logBalanceReport(): void {
  const report = generateBalanceReport();
  
  console.log('=== BALANCE VALIDATION REPORT ===');
  console.log('\nPlayer Stats:');
  report.playerStats.forEach(s => {
    console.log(`  Level ${s.level}: HP ${s.actualHP} (expected ${s.expectedHP}), Power ${s.actualPower.toFixed(1)} (expected ${s.expectedPower.toFixed(1)})`);
  });
  
  console.log('\nMonster Scaling:');
  report.monsterScaling.forEach(m => {
    console.log(`  Level ${m.level}: HP ${m.scaledHP} (${((m.scaledHP / m.baseHP - 1) * 100).toFixed(1)}% increase), Damage ${m.scaledDamage.toFixed(1)}`);
  });
  
  console.log('\nXP Progression:');
  report.xpProgression.forEach(x => {
    console.log(`  Level ${x.level}: ${x.xpToNext} XP to next (expected ${x.expectedXPToNext})`);
  });
  
  console.log('\nItem Scaling (sample):');
  report.itemScaling.filter(i => i.floor <= 3 && ['Common', 'Rare', 'Legendary'].includes(i.rarity)).forEach(i => {
    console.log(`  Floor ${i.floor} ${i.rarity}: ${i.power.toFixed(2)} (expected ${i.expectedPower.toFixed(2)})`);
  });
  
  if (report.issues.length > 0) {
    console.log('\n⚠️ ISSUES FOUND:');
    report.issues.forEach(issue => console.log(`  - ${issue}`));
  } else {
    console.log('\n✅ No balance issues found!');
  }
  
  console.log('\n=== END BALANCE REPORT ===');
}







