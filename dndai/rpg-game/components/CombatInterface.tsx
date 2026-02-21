'use client';

import React, { useState, useEffect } from 'react';
import { Character } from '@/types/character';
import { EnemyData, CombatState } from '@/types/game';
import { Skill } from '@/lib/game/skills';
import { BuriedbornesStats, calculateTotalStats } from '@/lib/game/buriedbornes-stats';
import { playerUseSkill, enemyAttack, processStatusEffects } from '@/lib/game/buriedbornes-combat';
import { reduceCooldowns, getAvailableSkills } from '@/lib/game/skills';
import { useCharacter } from '@/lib/character/CharacterContext';
import { DamageNumber } from './DamageNumber';

interface CombatInterfaceProps {
  character: Character;
  enemy: EnemyData;
  onCombatEnd: (victory: boolean) => void;
  autoBattle?: boolean;
  setAutoBattle?: (auto: boolean) => void;
  enemyPosition?: { centerX: number; centerY: number } | null;
  setEnemyPosition?: (position: { centerX: number; centerY: number } | null) => void;
  monsterBounds?: { centerX: number; centerY: number; top: number; bottom: number; headTop: number; left: number; right: number; width: number; height: number } | null;
  onAttackAnimation?: (path: { fromX: number; fromY: number; toX: number; toY: number }) => void;
  onHitEffect?: (data: { x: number; y: number; isCritical: boolean }) => void;
  onEnemyHPUpdate?: (hp: { current: number; max: number }) => void;
  monsterImageUrl?: string;
  onEnemyDyingChange?: (isDying: boolean) => void;
  onDeathAnimationComplete?: () => void;
}

export function CombatInterface({ character, enemy, onCombatEnd, autoBattle = false, setAutoBattle, enemyPosition: propEnemyPosition, setEnemyPosition: propSetEnemyPosition, monsterBounds, onAttackAnimation, onHitEffect, onEnemyHPUpdate, monsterImageUrl, onEnemyDyingChange, onDeathAnimationComplete }: CombatInterfaceProps) {
  const { updateHP } = useCharacter();
  
  // Track enemy dying state
  const [isEnemyDying, setIsEnemyDying] = useState(false);

  // Test audio file accessibility on mount
  useEffect(() => {
    console.log('[Sound] Testing audio file accessibility...');
    const testAudio = new Audio('/sounds/attacks/basic-attack/slash/slash-1.mp3');
    testAudio.addEventListener('error', () => {
      const error = testAudio.error;
      console.error('[Sound] TEST FAILED: Slash file NOT accessible');
      console.error('[Sound] Error code:', error?.code, 'Message:', error?.message);
      console.error('[Sound] Attempted URL:', testAudio.src);
    });
    testAudio.addEventListener('canplaythrough', () => {
      console.log('[Sound] TEST SUCCESS: Slash file IS accessible at:', testAudio.src);
    });
    testAudio.load();
  }, []);

  // Sound effect functions - simple and direct approach
  const playSlashSound = () => {
    console.log('[Sound] ====== playSlashSound CALLED ======');
    const audio = new Audio('/sounds/attacks/basic-attack/slash/slash-1.mp3');
    audio.volume = 0.7;
    
    console.log('[Sound] Audio src:', audio.src);
    
    audio.addEventListener('error', (e) => {
      const error = audio.error;
      console.error('[Sound] SLASH AUDIO ERROR:', {
        code: error?.code,
        message: error?.message,
        networkState: audio.networkState,
        readyState: audio.readyState,
        src: audio.src,
        fullError: error,
      });
    });
    
    audio.addEventListener('canplaythrough', () => {
      console.log('[Sound] Slash audio ready, attempting play...');
      audio.play().catch(err => {
        console.error('[Sound] Play failed:', err);
      });
    });
    
    // Try to play immediately
    const playPromise = audio.play();
    if (playPromise) {
      playPromise
        .then(() => console.log('[Sound] ✓ Slash playing'))
        .catch(err => {
          console.error('[Sound] ✗ Play rejected:', err);
          // Try again when ready
          audio.addEventListener('canplaythrough', () => {
            audio.play().catch(e => console.error('[Sound] Retry failed:', e));
          }, { once: true });
        });
    }
  };

  const playBloodSplashSound = () => {
    console.log('[Sound] ====== playBloodSplashSound CALLED ======');
    setTimeout(() => {
      const audio = new Audio('/sounds/blood-spray/blood-splash-1.mp3');
      audio.volume = 0.6;
      
      console.log('[Sound] Blood splash audio src:', audio.src);
      
      audio.addEventListener('error', (e) => {
        const error = audio.error;
        console.error('[Sound] BLOOD SPLASH AUDIO ERROR:', {
          code: error?.code,
          message: error?.message,
          networkState: audio.networkState,
          readyState: audio.readyState,
          src: audio.src,
          fullError: error,
        });
      });
      
      audio.addEventListener('canplaythrough', () => {
        console.log('[Sound] Blood splash audio ready, attempting play...');
        audio.play().catch(err => {
          console.error('[Sound] Play failed:', err);
        });
      });
      
      // Try to play immediately
      const playPromise = audio.play();
      if (playPromise) {
        playPromise
          .then(() => console.log('[Sound] ✓ Blood splash playing'))
          .catch(err => {
            console.error('[Sound] ✗ Play rejected:', err);
            // Try again when ready
            audio.addEventListener('canplaythrough', () => {
              audio.play().catch(e => console.error('[Sound] Retry failed:', e));
            }, { once: true });
          });
      }
    }, 150);
  };

  // playHitSound removed - using playBloodSplashSound for attack sounds instead
  const [combatState, setCombatState] = useState<CombatState>({
    turn: 'player',
    round: 1,
    enemy,
    playerHP: character.hp.current,
    playerMaxHP: character.hp.max,
    playerStatusEffects: character.statusEffects || [],
    playerBuffs: character.buffs || {},
    combatLog: [],
  });
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [damageNumbers, setDamageNumbers] = useState<Array<{
    id: string;
    damage: number;
    isCritical: boolean;
    isHeal: boolean;
    position: { x: number; y: number };
  }>>([]);
  // Animation state removed - animations are now rendered at GameInterface level via callbacks
  
  // Use prop enemyPosition if provided
  const enemyPosition = propEnemyPosition;

  // Calculate total player stats (base + equipment)
  const equipmentStats: Partial<BuriedbornesStats> = Object.values(character.equipment).reduce((acc, item) => {
    if (item?.stats) {
      if (item.stats.STR) acc.STR = (acc.STR || 0) + item.stats.STR;
      if (item.stats.DEX) acc.DEX = (acc.DEX || 0) + item.stats.DEX;
      if (item.stats.INT) acc.INT = (acc.INT || 0) + item.stats.INT;
      if (item.stats.PIE) acc.PIE = (acc.PIE || 0) + item.stats.PIE;
      if (item.stats.maxHP) acc.maxHP = (acc.maxHP || 0) + item.stats.maxHP;
      if (item.stats.Power) acc.Power = (acc.Power || 0) + item.stats.Power;
      if (item.stats.Armor) acc.Armor = (acc.Armor || 0) + item.stats.Armor;
      if (item.stats.Resistance) acc.Resistance = (acc.Resistance || 0) + item.stats.Resistance;
      if (item.stats.Avoid) acc.Avoid = (acc.Avoid || 0) + item.stats.Avoid;
      if (item.stats.Parry) acc.Parry = (acc.Parry || 0) + item.stats.Parry;
      if (item.stats.Critical) acc.Critical = (acc.Critical || 0) + item.stats.Critical;
      if (item.stats.Reflect) acc.Reflect = (acc.Reflect || 0) + item.stats.Reflect;
      if (item.stats.Pursuit) acc.Pursuit = (acc.Pursuit || 0) + item.stats.Pursuit;
    }
    return acc;
  }, {} as Partial<BuriedbornesStats>);
  
  const playerStats = calculateTotalStats(character.baseStats, equipmentStats);

  // Auto-battle logic
  useEffect(() => {
    if (autoBattle && combatState.turn === 'player' && !isProcessing) {
      // AI selects best skill
      const availableSkills = getAvailableSkills(character.skills);
      if (availableSkills.length > 0) {
        // Prefer skills with highest damage potential
        const bestSkill = availableSkills.reduce((best, skill) => {
          const bestDamage = (best.primaryStat === 'STR' ? playerStats.STR : 
                             best.primaryStat === 'DEX' ? playerStats.DEX :
                             best.primaryStat === 'INT' ? playerStats.INT :
                             best.primaryStat === 'PIE' ? playerStats.PIE : playerStats.STR) + playerStats.Power;
          const skillDamage = (skill.primaryStat === 'STR' ? playerStats.STR : 
                              skill.primaryStat === 'DEX' ? playerStats.DEX :
                              skill.primaryStat === 'INT' ? playerStats.INT :
                              skill.primaryStat === 'PIE' ? playerStats.PIE : playerStats.STR) + playerStats.Power;
          return skillDamage > bestDamage ? skill : best;
        }, availableSkills[0]);
        
        setTimeout(() => {
          handleSkillUse(bestSkill);
        }, 500); // Small delay for visual feedback
      }
    }
  }, [autoBattle, combatState.turn, isProcessing, character.skills, playerStats]);

  // Check for combat end
  useEffect(() => {
    if (combatState.playerHP <= 0) {
      onCombatEnd(false); // Defeat
    } else if (combatState.enemy.hp.current <= 0 && !isEnemyDying) {
      // Enemy defeated - trigger death animation instead of immediately ending combat
      setIsEnemyDying(true);
      if (onEnemyDyingChange) {
        onEnemyDyingChange(true);
      }
      // Don't call onCombatEnd yet - wait for death animation to complete
    }
  }, [combatState.playerHP, combatState.enemy.hp.current, isEnemyDying, onCombatEnd, onEnemyDyingChange]);
  
  // Handle death animation completion
  useEffect(() => {
    if (onDeathAnimationComplete && isEnemyDying) {
      // This will be called when death animation completes
      // The actual combat end will be handled by GameInterface after animation
    }
  }, [isEnemyDying, onDeathAnimationComplete]);

  const handleSkillUse = async (skill: Skill) => {
    if (isProcessing || combatState.turn !== 'player') return;
    if (skill.currentCooldown > 0) return;

    setIsProcessing(true);
    setSelectedSkill(skill);

    // Trigger attack animation for basic attack (via callback to GameInterface)
    // Use diagonal slash from bottom-left to top-right of monster
    if (skill.id === 'basic-attack' && monsterBounds && onAttackAnimation) {
      const fromX = monsterBounds.left; // Bottom-left of monster
      const fromY = monsterBounds.bottom;
      const toX = monsterBounds.right; // Top-right of monster
      const toY = monsterBounds.top;
      onAttackAnimation({ fromX, fromY, toX, toY });
      playSlashSound(); // Play slash sound
      playBloodSplashSound(); // Play blood splash sound (delayed)
    }

    // Small delay to show animation before damage
    await new Promise(resolve => setTimeout(resolve, skill.id === 'basic-attack' ? 200 : 0));

    // Player uses skill
    const result = playerUseSkill(
      skill,
      playerStats,
      character.level,
      combatState.playerBuffs,
      combatState.enemy.stats,
      combatState.enemy.buffs
    );

    const newEnemyHP = Math.max(0, combatState.enemy.hp.current - result.damage);
    const newEnemy = {
      ...combatState.enemy,
      hp: {
        current: newEnemyHP,
        max: combatState.enemy.hp.max,
      },
    };

    // Show hit effect and damage number on enemy (via callback to GameInterface)
    if (result.damage > 0 && enemyPosition) {
      // Trigger hit effect via callback
      if (onHitEffect) {
        onHitEffect({
          x: enemyPosition.centerX,
          y: enemyPosition.centerY,
          isCritical: result.critical,
        });
      }
      // Note: playHitSound removed - using playBloodSplashSound instead for basic attacks

      const enemyDamageId = `enemy-${Date.now()}-${Math.random()}`;
      setDamageNumbers(prev => [...prev, {
        id: enemyDamageId,
        damage: result.damage,
        isCritical: result.critical,
        isHeal: false,
        position: { x: enemyPosition.centerX, y: enemyPosition.centerY - 50 },
      }]);
    }

    // Update skill cooldown
    const updatedSkills = character.skills.map(s => 
      s.id === skill.id ? { ...s, currentCooldown: s.cooldown } : s
    );

    // Process status effects on enemy
    if (result.statusEffects) {
      newEnemy.statusEffects = [
        ...(newEnemy.statusEffects || []),
        ...result.statusEffects,
      ];
    }

    const newLog = [...combatState.combatLog, result.message];

    setCombatState({
      ...combatState,
      turn: 'enemy',
      enemy: newEnemy,
      combatLog: newLog,
    });

    // Sync HP update to GameInterface for real-time HP bar updates
    if (onEnemyHPUpdate) {
      onEnemyHPUpdate({
        current: newEnemyHP,
        max: newEnemy.hp.max,
      });
    }

    // Update character skills
    character.skills = updatedSkills;

    // Reset processing state after player attack completes
    setIsProcessing(false);
    setSelectedSkill(null);

    // Enemy turn after delay
    setTimeout(() => {
      handleEnemyTurn();
    }, 1000);
  };

  const handleEnemyTurn = () => {
    // Get current enemy HP from state (use functional update to get latest)
    setCombatState(currentState => {
      if (currentState.enemy.hp.current <= 0) return currentState;

      // Enemy attacks
      const result = enemyAttack(
        currentState.enemy.stats,
        currentState.enemy.level,
        currentState.enemy.buffs,
        playerStats,
        currentState.playerBuffs
      );

      const newPlayerHP = Math.max(0, currentState.playerHP - result.damage);
      updateHP(newPlayerHP);

      // Show damage number on player
      if (result.damage > 0) {
        const playerDamageId = `player-${Date.now()}-${Math.random()}`;
        setDamageNumbers(prev => [...prev, {
          id: playerDamageId,
          damage: result.damage,
          isCritical: result.critical,
          isHeal: false,
          position: { x: window.innerWidth / 2 - 200, y: window.innerHeight / 2 - 100 },
        }]);
      }

      // Process status effects at end of turn
      const playerStatusResult = processStatusEffects(currentState.playerStatusEffects);
      // IMPORTANT: Remove regeneration from enemy status effects - monsters should NOT heal
      const enemyStatusEffectsNoRegen = (currentState.enemy.statusEffects || []).filter(e => e.type !== 'Regeneration');
      const enemyStatusResult = processStatusEffects(enemyStatusEffectsNoRegen);

      const finalPlayerHP = Math.max(0, newPlayerHP - playerStatusResult.damage + playerStatusResult.heal);
      // Use current enemy HP (already updated from player's attack)
      const finalEnemyHP = Math.max(0, currentState.enemy.hp.current - enemyStatusResult.damage); // Removed + enemyStatusResult.heal
      
      // Update enemy HP in state
      const updatedEnemy = {
        ...currentState.enemy,
        hp: {
          current: finalEnemyHP,
          max: currentState.enemy.hp.max,
        },
      };
      
      // Sync HP update to GameInterface for real-time HP bar updates
      if (onEnemyHPUpdate) {
        onEnemyHPUpdate({
          current: finalEnemyHP,
          max: updatedEnemy.hp.max,
        });
      }

      // Show status effect damage/heal numbers
      if (playerStatusResult.damage > 0) {
        const statusDamageId = `player-status-${Date.now()}-${Math.random()}`;
        setDamageNumbers(prev => [...prev, {
          id: statusDamageId,
          damage: playerStatusResult.damage,
          isCritical: false,
          isHeal: false,
          position: { x: window.innerWidth / 2 - 200, y: window.innerHeight / 2 - 150 },
        }]);
      }
      if (playerStatusResult.heal > 0) {
        const healId = `player-heal-${Date.now()}-${Math.random()}`;
        setDamageNumbers(prev => [...prev, {
          id: healId,
          damage: playerStatusResult.heal,
          isCritical: false,
          isHeal: true,
          position: { x: window.innerWidth / 2 - 200, y: window.innerHeight / 2 - 150 },
        }]);
      }
      if (enemyStatusResult.damage > 0) {
        const enemyStatusDamageId = `enemy-status-${Date.now()}-${Math.random()}`;
        setDamageNumbers(prev => [...prev, {
          id: enemyStatusDamageId,
          damage: enemyStatusResult.damage,
          isCritical: false,
          isHeal: false,
          position: { x: window.innerWidth / 2 + 200, y: window.innerHeight / 2 - 150 },
        }]);
      }

      // Reduce cooldowns
      const updatedSkills = reduceCooldowns(character.skills);

      // Update character
      character.skills = updatedSkills;
      character.statusEffects = playerStatusResult.updatedEffects;
      updateHP(finalPlayerHP);

      const newEnemy = {
        ...currentState.enemy,
        hp: {
          current: finalEnemyHP,
          max: currentState.enemy.hp.max,
        },
        statusEffects: enemyStatusResult.updatedEffects,
      };

      const newLog = [
        ...currentState.combatLog,
        result.message,
        ...(playerStatusResult.damage > 0 ? [`You take ${playerStatusResult.damage} damage from status effects!`] : []),
        ...(playerStatusResult.heal > 0 ? [`You heal ${playerStatusResult.heal} HP!`] : []),
        ...(enemyStatusResult.damage > 0 ? [`Enemy takes ${enemyStatusResult.damage} damage from status effects!`] : []),
      ];

      return {
        ...currentState,
        turn: 'player',
        round: currentState.round + 1,
        playerHP: finalPlayerHP,
        playerStatusEffects: playerStatusResult.updatedEffects,
        enemy: newEnemy,
        combatLog: newLog,
      };
    });

    setIsProcessing(false);
    setSelectedSkill(null);
  };

  const availableSkills = getAvailableSkills(character.skills);

  return (
    <div className="combat-interface w-full h-full flex flex-row gap-4">
      {/* Left Panel - Combat Info */}
      <div className="story-box">
        <div className="story-header flex items-center justify-between">
          <span>COMBAT - Round {combatState.round}</span>
          {setAutoBattle && (
            <button
              onClick={() => setAutoBattle(!autoBattle)}
              className={`px-2 py-0.5 text-xs rounded border transition-all ${
                autoBattle
                  ? 'bg-green-600 border-green-500 text-white'
                  : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {autoBattle ? 'AUTO' : 'MANUAL'}
            </button>
          )}
        </div>
        <div className="story-content">
          {/* Player HP Bar */}
          <div className="mb-3">
            <div className="flex justify-between items-center mb-1">
              <span className="text-white font-semibold text-sm">{character.name} (Lv.{character.level})</span>
              <span className="text-green-400 text-xs">{combatState.playerHP} / {combatState.playerMaxHP}</span>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-4 border border-gray-700">
              <div
                className="bg-green-600 h-4 rounded-full transition-all duration-300"
                style={{ width: `${Math.max(0, (combatState.playerHP / combatState.playerMaxHP) * 100)}%` }}
              />
            </div>
          </div>

          {/* Status Effects */}
          {(combatState.playerStatusEffects.length > 0 || (combatState.enemy.statusEffects?.length || 0) > 0) && (
            <div className="mb-3 pb-3 border-b border-gray-700">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <div className="text-white font-semibold mb-1">Your Status:</div>
                  {combatState.playerStatusEffects.length === 0 ? (
                    <div className="text-gray-500">None</div>
                  ) : (
                    combatState.playerStatusEffects.map((effect, index) => (
                      <div key={index} className="text-yellow-400">
                        {effect.type} ({effect.duration})
                      </div>
                    ))
                  )}
                </div>
                <div>
                  <div className="text-red-400 font-semibold mb-1">Enemy Status:</div>
                  {(combatState.enemy.statusEffects || []).length === 0 ? (
                    <div className="text-gray-500">None</div>
                  ) : (
                    (combatState.enemy.statusEffects || []).map((effect, index) => (
                      <div key={index} className="text-yellow-400">
                        {effect.type} ({effect.duration})
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Combat Log */}
          <div className="flex-1 overflow-y-auto">
            <div className="text-xs text-gray-400 mb-1">Combat Log:</div>
            <div className="space-y-1">
              {combatState.combatLog.length === 0 ? (
                <div className="text-gray-500 text-xs">Combat begins...</div>
              ) : (
                combatState.combatLog.slice(-10).map((message, index) => (
                  <div key={index} className="text-white text-xs">{message}</div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Skills/Actions */}
      <div className="action-box">
        <div className="action-header">
          {combatState.turn === 'player' ? 'YOUR TURN' : "ENEMY'S TURN"}
        </div>
        <div className="action-content">
          {combatState.turn === 'player' ? (
            <>
              {isProcessing && (
                <div className="text-center text-gray-400 text-sm mb-2">Processing...</div>
              )}
              {character.skills.map((skill, index) => {
                const isAvailable = skill.currentCooldown === 0;
                const isSelected = selectedSkill?.id === skill.id;
                const hotkey = (index + 1).toString();
                
                return (
                  <div
                    key={skill.id}
                    className={`choice-card ${
                      !isAvailable || isProcessing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                    } ${isSelected ? 'ring-2 ring-blue-500' : ''}`}
                    onClick={(e) => {
                      e.preventDefault();
                      if (isAvailable && !isProcessing) {
                        handleSkillUse(skill);
                      }
                    }}
                  >
                    <div className="choice-icon">
                      {isAvailable ? '⚔️' : '⏳'}
                    </div>
                    <div className="choice-text flex-1">
                      <div className="font-semibold">{skill.name}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{skill.description}</div>
                      {skill.currentCooldown > 0 && (
                        <div className="text-xs text-red-400 mt-0.5">
                          Cooldown: {skill.currentCooldown} turns
                        </div>
                      )}
                    </div>
                    <div className="choice-hotkey">{hotkey}</div>
                  </div>
                );
              })}
            </>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="text-xl font-semibold text-red-400 mb-2">Enemy's Turn...</div>
                {isProcessing && (
                  <div className="text-sm text-gray-400 animate-pulse">Processing attack...</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Attack animations and hit effects are now rendered at GameInterface level */}

      {/* Damage Numbers */}
      {damageNumbers.map((damageNum) => (
        <DamageNumber
          key={damageNum.id}
          damage={damageNum.damage}
          isCritical={damageNum.isCritical}
          isHeal={damageNum.isHeal}
          position={damageNum.position}
          onComplete={() => {
            setDamageNumbers(prev => prev.filter(d => d.id !== damageNum.id));
          }}
        />
      ))}
    </div>
  );
}

