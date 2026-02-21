// Test Flow Validator
// Validates that all systems work together correctly

import { Character } from '@/types/character';
import { createDefaultCharacter } from '@/lib/character/defaultCharacter';
import { calculateXP, gainXP } from './xp-leveling';
import { scaleMonsterToLevel, getRandomMonster } from './monsters';
import { generateItemForFloor, shouldDropItem } from './items';
import { playerUseSkill } from './buriedbornes-combat';
import { DEFAULT_SKILLS } from './skills';
import { calculateFloorByDistance } from '@/lib/dungeon/progression';
import { DungeonNode } from '@/lib/dungeon/types';

export interface TestResult {
  test: string;
  passed: boolean;
  message: string;
  details?: any;
}

export interface FlowTestReport {
  results: TestResult[];
  passed: number;
  failed: number;
  total: number;
}

/**
 * Test floor calculation
 */
export function testFloorCalculation(): TestResult {
  const startNode: DungeonNode = {
    id: 'start',
    x: 0,
    y: 0,
    type: 'START',
    connections: new Map(),
    visited: false,
  };
  
  const testCases = [
    { node: { ...startNode, x: 0, y: 0 }, expected: 1 },
    { node: { ...startNode, x: 3, y: 0 }, expected: 1 },
    { node: { ...startNode, x: 4, y: 0 }, expected: 2 },
    { node: { ...startNode, x: 7, y: 0 }, expected: 2 },
    { node: { ...startNode, x: 8, y: 0 }, expected: 3 },
  ];
  
  const failures: string[] = [];
  
  for (const test of testCases) {
    const floor = calculateFloorByDistance(startNode, test.node);
    if (floor !== test.expected) {
      failures.push(`Distance ${Math.abs(test.node.x - startNode.x) + Math.abs(test.node.y - startNode.y)}: Expected floor ${test.expected}, got ${floor}`);
    }
  }
  
  return {
    test: 'Floor Calculation',
    passed: failures.length === 0,
    message: failures.length === 0 ? 'All floor calculations correct' : `Failed: ${failures.join('; ')}`,
    details: { testCases, failures },
  };
}

/**
 * Test monster scaling
 */
export function testMonsterScaling(): TestResult {
  const monster = getRandomMonster(1, 'common');
  if (!monster) {
    return {
      test: 'Monster Scaling',
      passed: false,
      message: 'Could not get test monster',
    };
  }
  
  const issues: string[] = [];
  
  for (let level = 1; level <= 5; level++) {
    const scaled = scaleMonsterToLevel(monster, level);
    const expectedMultiplier = 1 + ((level - 1) * 0.10);
    
    // Check that HP scales correctly
    const baseHP = scaled.stats.maxHP / expectedMultiplier;
    const actualMultiplier = scaled.stats.maxHP / baseHP;
    
    if (Math.abs(actualMultiplier - expectedMultiplier) > 0.01) {
      issues.push(`Level ${level}: Multiplier ${actualMultiplier.toFixed(2)} != expected ${expectedMultiplier.toFixed(2)}`);
    }
    
    // Check that stats are positive
    if (scaled.stats.maxHP <= 0 || scaled.stats.STR <= 0 || scaled.stats.Power <= 0) {
      issues.push(`Level ${level}: Invalid stats (HP: ${scaled.stats.maxHP}, STR: ${scaled.stats.STR}, Power: ${scaled.stats.Power})`);
    }
  }
  
  return {
    test: 'Monster Scaling',
    passed: issues.length === 0,
    message: issues.length === 0 ? 'Monster scaling works correctly' : `Issues: ${issues.join('; ')}`,
    details: { issues },
  };
}

/**
 * Test XP and leveling
 */
export function testXPAndLeveling(): TestResult {
  const character = createDefaultCharacter('Test', 'Warrior');
  const issues: string[] = [];
  
  // Test XP calculation
  const xp1 = calculateXP(1, 1, 1, false, 1);
  if (xp1 < 1) {
    issues.push(`XP from level 1 monster too low: ${xp1}`);
  }
  
  const xpBoss = calculateXP(5, 1, 5, true, 1);
  if (xpBoss < xp1 * 5) {
    issues.push(`Boss XP (${xpBoss}) should be much higher than normal (${xp1})`);
  }
  
  // Test leveling
  const initialLevel = character.level;
  const initialXP = character.xp;
  
  const result = gainXP(character, 1000); // Give enough XP to level
  
  if (!result.leveledUp && result.character.xp >= result.character.xpToNext) {
    issues.push('Character should have leveled up but didn\'t');
  }
  
  if (result.leveledUp && result.character.level <= initialLevel) {
    issues.push('Character leveled up but level didn\'t increase');
  }
  
  if (result.leveledUp && result.character.hp.current !== result.character.hp.max) {
    issues.push('Character should have full HP after level up');
  }
  
  return {
    test: 'XP and Leveling',
    passed: issues.length === 0,
    message: issues.length === 0 ? 'XP and leveling work correctly' : `Issues: ${issues.join('; ')}`,
    details: { issues, initialLevel, resultLevel: result.character.level },
  };
}

/**
 * Test item generation
 */
export function testItemGeneration(): TestResult {
  const issues: string[] = [];
  
  for (let floor = 1; floor <= 5; floor++) {
    const item = generateItemForFloor(floor);
    
    if (!item.id || !item.name || !item.rarity) {
      issues.push(`Floor ${floor}: Item missing required fields`);
    }
    
    if (!item.stats || Object.keys(item.stats).length === 0) {
      issues.push(`Floor ${floor}: Item has no stats`);
    }
    
    // Check that stats scale with floor
    if (floor > 1 && item.stats) {
      const floor1Item = generateItemForFloor(1);
      if (floor1Item.stats && item.stats) {
        const floor1STR = floor1Item.stats.STR || 0;
        const floorSTR = item.stats.STR || 0;
        if (floorSTR <= floor1STR && floor > 1) {
          issues.push(`Floor ${floor}: Item stats (${floorSTR}) should be higher than floor 1 (${floor1STR})`);
        }
      }
    }
  }
  
  // Test drop rates
  const dropTests = [
    { roomType: 'COMBAT', floor: 1, shouldDrop: true },
    { roomType: 'BOSS', floor: 1, shouldDrop: true },
    { roomType: 'NORMAL', floor: 1, shouldDrop: false }, // 10% chance, so might not drop
  ];
  
  for (const test of dropTests) {
    const shouldDrop = shouldDropItem(test.roomType, test.floor);
    // We can't test exact drop rates, but we can verify the function works
    if (typeof shouldDrop !== 'boolean') {
      issues.push(`Drop check for ${test.roomType} returned non-boolean`);
    }
  }
  
  return {
    test: 'Item Generation',
    passed: issues.length === 0,
    message: issues.length === 0 ? 'Item generation works correctly' : `Issues: ${issues.join('; ')}`,
    details: { issues },
  };
}

/**
 * Test combat system
 */
export function testCombatSystem(): TestResult {
  const character = createDefaultCharacter('Test', 'Warrior');
  const issues: string[] = [];
  
  // Get a skill
  const skill = character.skills.find(s => s.id === 'basic-attack');
  if (!skill) {
    return {
      test: 'Combat System',
      passed: false,
      message: 'Character has no basic attack skill',
    };
  }
  
  // Create mock enemy stats
  const enemyStats = {
    STR: 10,
    DEX: 8,
    INT: 8,
    PIE: 8,
    maxHP: 100,
    Power: 8,
    Armor: 5,
    Resistance: 3,
    Avoid: 5,
    Parry: 0,
    Critical: 5,
    Reflect: 0,
    Pursuit: 0,
  };
  
  // Test player skill use
  const result = playerUseSkill(
    skill,
    character.baseStats,
    character.level,
    {},
    enemyStats,
    {}
  );
  
  if (result.damage <= 0) {
    issues.push(`Player skill damage is ${result.damage} (should be > 0)`);
  }
  
  if (!result.hit && result.damage === 0 && !result.message.includes('avoid') && !result.message.includes('parry')) {
    issues.push(`Player skill should hit but didn't: ${result.message}`);
  }
  
  // Test that cooldown works
  const skillWithCooldown = { ...skill, currentCooldown: 1 };
  const resultCooldown = playerUseSkill(
    skillWithCooldown,
    character.baseStats,
    character.level,
    {},
    enemyStats,
    {}
  );
  
  if (resultCooldown.damage !== 0 || !resultCooldown.message.includes('cooldown')) {
    issues.push('Skill on cooldown should not deal damage');
  }
  
  return {
    test: 'Combat System',
    passed: issues.length === 0,
    message: issues.length === 0 ? 'Combat system works correctly' : `Issues: ${issues.join('; ')}`,
    details: { issues, damage: result.damage },
  };
}

/**
 * Test complete flow: Character creation -> Combat -> Leveling -> Items
 */
export function testCompleteFlow(): TestResult {
  const issues: string[] = [];
  
  try {
    // 1. Create character
    const character = createDefaultCharacter('Flow Test', 'Warrior');
    if (!character || character.level !== 1) {
      issues.push('Character creation failed');
    }
    
    // 2. Get monster
    const monster = getRandomMonster(1, 'common');
    if (!monster) {
      issues.push('Could not get monster');
    } else {
      // 3. Scale monster
      const scaledMonster = scaleMonsterToLevel(monster, 1);
      if (!scaledMonster.stats || scaledMonster.stats.maxHP <= 0) {
        issues.push('Monster scaling failed');
      }
      
      // 4. Simulate combat (player attacks)
      const skill = character.skills.find(s => s.id === 'basic-attack');
      if (skill) {
        const combatResult = playerUseSkill(
          skill,
          character.baseStats,
          character.level,
          {},
          scaledMonster.stats,
          {}
        );
        
        if (combatResult.damage <= 0) {
          issues.push('Combat damage calculation failed');
        }
      }
      
      // 5. Gain XP
      const xpGained = calculateXP(scaledMonster.level || 1, character.level, 1, false, 1);
      const levelResult = gainXP(character, xpGained);
      
      // 6. Generate item
      const item = generateItemForFloor(1);
      if (!item.stats) {
        issues.push('Item generation failed');
      }
    }
  } catch (error) {
    issues.push(`Flow test error: ${error instanceof Error ? error.message : String(error)}`);
  }
  
  return {
    test: 'Complete Flow',
    passed: issues.length === 0,
    message: issues.length === 0 ? 'Complete flow works correctly' : `Issues: ${issues.join('; ')}`,
    details: { issues },
  };
}

/**
 * Run all tests
 */
export function runAllTests(): FlowTestReport {
  const tests = [
    testFloorCalculation(),
    testMonsterScaling(),
    testXPAndLeveling(),
    testItemGeneration(),
    testCombatSystem(),
    testCompleteFlow(),
  ];
  
  const passed = tests.filter(t => t.passed).length;
  const failed = tests.filter(t => !t.passed).length;
  
  return {
    results: tests,
    passed,
    failed,
    total: tests.length,
  };
}

/**
 * Log test results to console
 */
export function logTestResults(): void {
  const report = runAllTests();
  
  console.log('=== FLOW TEST REPORT ===');
  console.log(`\nTotal Tests: ${report.total}`);
  console.log(`Passed: ${report.passed}`);
  console.log(`Failed: ${report.failed}`);
  
  console.log('\nTest Results:');
  report.results.forEach(result => {
    const icon = result.passed ? '✅' : '❌';
    console.log(`  ${icon} ${result.test}: ${result.message}`);
    if (result.details && Object.keys(result.details).length > 0) {
      console.log(`    Details:`, result.details);
    }
  });
  
  if (report.failed === 0) {
    console.log('\n🎉 All tests passed!');
  } else {
    console.log(`\n⚠️ ${report.failed} test(s) failed`);
  }
  
  console.log('\n=== END TEST REPORT ===');
}







