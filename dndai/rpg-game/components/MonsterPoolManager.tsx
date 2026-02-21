'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useDungeonStore } from '@/lib/dungeon/store';
import { PROMPT_ARCHETYPE_NAMES } from '@/lib/dungeon/prompt-logic';
import { getAllMonsters, Monster, createCustomMonster, getCustomMonsters, deleteCustomMonster, MonsterTier } from '@/lib/game/monsters';
import { populateAssassinPrompts } from '@/lib/dungeon/populate-assassin-prompts';
import { populateAllMonsterPrompts, populateTJunctionMonsterPrompts } from '@/lib/dungeon/populate-all-monster-prompts';

export function MonsterPoolManager() {
  const monsterPools = useDungeonStore((state) => state.monsterPools);
  const getMonsterPool = useDungeonStore((state) => state.getMonsterPool);
  const getMonsterPrompt = useDungeonStore((state) => state.getMonsterPrompt);
  const addMonsterToPool = useDungeonStore((state) => state.addMonsterToPool);
  const removeMonsterFromPool = useDungeonStore((state) => state.removeMonsterFromPool);
  const setMonsterPrompt = useDungeonStore((state) => state.setMonsterPrompt);
  const setMonsterPool = useDungeonStore((state) => state.setMonsterPool);
  const clearMonsterPool = useDungeonStore((state) => state.clearMonsterPool);
  const resetAllMonsterPools = useDungeonStore((state) => state.resetAllMonsterPools);

  const [selectedTopology, setSelectedTopology] = useState<number | null>(null);
  const [selectedMonsterToAdd, setSelectedMonsterToAdd] = useState<string>('');
  const [editingPrompts, setEditingPrompts] = useState<Map<string, string>>(new Map()); // topologyIndex-monsterId -> prompt
  const [newMonsterName, setNewMonsterName] = useState('');
  const [newMonsterTier, setNewMonsterTier] = useState<MonsterTier>('common');
  const [newMonsterMinLevel, setNewMonsterMinLevel] = useState(1);
  const [newMonsterXp, setNewMonsterXp] = useState(50);
  const [showCreateMonster, setShowCreateMonster] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0); // Force re-render when monsters change
  
  const removeMonsterFromAllPools = useDungeonStore((state) => state.removeMonsterFromAllPools);
  
  // Get all monsters (will include custom monsters)
  const allMonsters = useMemo(() => getAllMonsters(), [refreshKey]);
  
  // Remove Dire Wolf and Abyssal Horror from all pools on mount
  useEffect(() => {
    removeMonsterFromAllPools('wolf');
    removeMonsterFromAllPools('horror');
  }, [removeMonsterFromAllPools]);

  // Auto-populate ALL monster prompts for Left/Right Branch and T-Junction on mount
  // Wait for allMonsters to be loaded before populating
  useEffect(() => {
    // Only run if we have monsters loaded
    if (allMonsters.length === 0) return;
    
    // Check if prompts are already populated by checking if ALL monsters have prompts
    const leftBranchPool = getMonsterPool(6);
    const rightBranchPool = getMonsterPool(3);
    const tJunctionPool = getMonsterPool(5);
    
    // Check if all monsters have prompts set for both branches and T-Junction
    let allMonstersHavePrompts = true;
    for (const monster of allMonsters) {
      const leftHasNorth = leftBranchPool.get(monster.id)?.get('north');
      const leftHasSouth = leftBranchPool.get(monster.id)?.get('south');
      const leftHasEast = leftBranchPool.get(monster.id)?.get('east');
      const leftHasWest = leftBranchPool.get(monster.id)?.get('west');
      const rightHasNorth = rightBranchPool.get(monster.id)?.get('north');
      const rightHasSouth = rightBranchPool.get(monster.id)?.get('south');
      const rightHasEast = rightBranchPool.get(monster.id)?.get('east');
      const tJunctionHasNorth = tJunctionPool.get(monster.id)?.get('north');
      const tJunctionHasSouth = tJunctionPool.get(monster.id)?.get('south');
      const tJunctionHasEast = tJunctionPool.get(monster.id)?.get('east');
      const tJunctionHasWest = tJunctionPool.get(monster.id)?.get('west');
      
      // Check if this monster has all required prompts
      const hasAllLeftPrompts = leftHasNorth && leftHasSouth && leftHasEast && leftHasWest;
      const hasAllRightPrompts = rightHasNorth && rightHasSouth && rightHasEast;
      const hasAllTJunctionPrompts = tJunctionHasNorth && tJunctionHasSouth && tJunctionHasEast && tJunctionHasWest;
      
      if (!hasAllLeftPrompts || !hasAllRightPrompts || !hasAllTJunctionPrompts) {
        allMonstersHavePrompts = false;
        break;
      }
    }
    
    // Only auto-populate if prompts are missing
    if (!allMonstersHavePrompts) {
      console.log('[MonsterPoolManager] Auto-populating ALL monster prompts for Left/Right Branch and T-Junction...');
      Promise.all([
        populateAllMonsterPrompts(),
        populateTJunctionMonsterPrompts()
      ]).then(() => {
        setRefreshKey(prev => prev + 1);
        console.log('[MonsterPoolManager] ✓ All monster prompts populated successfully');
      }).catch(error => {
        console.error('[MonsterPoolManager] Error populating monster prompts:', error);
      });
    } else {
      console.log('[MonsterPoolManager] All monster prompts already populated, skipping auto-population');
    }
  }, [getMonsterPool, allMonsters.length]);

  // Get monsters in pool for a topology
  const getPoolMonsters = (topologyIndex: number): Monster[] => {
    const pool = getMonsterPool(topologyIndex);
    return allMonsters.filter(m => pool.has(m.id));
  };

  // Get monsters NOT in pool for a topology
  const getAvailableMonsters = (topologyIndex: number): Monster[] => {
    const pool = getMonsterPool(topologyIndex);
    return allMonsters.filter(m => !pool.has(m.id));
  };

  // Get valid entry directions for a topology
  // LEFT TURN (4) can only be entered from WEST or SOUTH
  // RIGHT TURN (1) can only be entered from EAST or SOUTH
  // T-JUNCTION (5) can be entered from any direction except the one with no exit
  // LEFT BRANCH (6) can be entered from 3 directions (the two opposite and one perpendicular)
  // RIGHT BRANCH (3) can be entered from 3 directions (the two opposite and one perpendicular)
  // DEAD END (0) can be entered from any direction
  const getValidEntryDirections = (topologyIndex: number): Array<'north' | 'south' | 'east' | 'west' | null> => {
    switch (topologyIndex) {
      case 4: // LEFT TURN - only WEST and SOUTH
        return ['west', 'south'];
      case 1: // RIGHT TURN - only EAST and SOUTH
        return ['east', 'south'];
      case 3: // RIGHT BRANCH - can only be entered from South, East, and North (not West)
        return ['south', 'east', 'north'];
      case 5: // T-JUNCTION - depends on which direction has no exit, but typically all except one
        return ['north', 'south', 'east', 'west'];
      case 6: // LEFT BRANCH - can be entered from 3 directions
        return ['north', 'south', 'east', 'west'];
      case 0: // DEAD END - can enter from any direction
        return ['north', 'south', 'east', 'west'];
      default:
        return ['north', 'south', 'east', 'west', null]; // Include null as fallback
    }
  };

  // Get custom prompt for a monster in a topology for a specific entry direction
  const getCustomPrompt = (topologyIndex: number, monsterId: string, entryDirection: 'north' | 'south' | 'east' | 'west' | null = null): string => {
    const prompt = getMonsterPrompt(topologyIndex, monsterId, entryDirection);
    return prompt !== null ? prompt : '';
  };

  // Handle prompt editing with entry direction
  const handlePromptChange = (topologyIndex: number, monsterId: string, entryDirection: 'north' | 'south' | 'east' | 'west' | null, prompt: string) => {
    const key = `${topologyIndex}-${monsterId}-${entryDirection}`;
    const newEditingPrompts = new Map(editingPrompts);
    newEditingPrompts.set(key, prompt);
    setEditingPrompts(newEditingPrompts);
  };

  const handleSavePrompt = (topologyIndex: number, monsterId: string, entryDirection: 'north' | 'south' | 'east' | 'west' | null) => {
    const key = `${topologyIndex}-${monsterId}-${entryDirection}`;
    const prompt = editingPrompts.get(key) || '';
    setMonsterPrompt(topologyIndex, monsterId, prompt, entryDirection);
    const newEditingPrompts = new Map(editingPrompts);
    newEditingPrompts.delete(key);
    setEditingPrompts(newEditingPrompts);
  };

  const handleAddMonster = (topologyIndex: number, monsterId: string) => {
    if (monsterId) {
      addMonsterToPool(topologyIndex, monsterId);
      setSelectedMonsterToAdd('');
    }
  };

  const handleRemoveMonster = (topologyIndex: number, monsterId: string) => {
    removeMonsterFromPool(topologyIndex, monsterId);
  };

  const handleClearPool = (topologyIndex: number) => {
    if (confirm(`Clear all monsters from ${PROMPT_ARCHETYPE_NAMES[topologyIndex]} pool?`)) {
      clearMonsterPool(topologyIndex);
    }
  };

  const handleResetAll = () => {
    if (confirm('Reset all monster pools to include all monsters? This will overwrite your current pools.')) {
      resetAllMonsterPools();
    }
  };

  return (
    <div style={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      backgroundColor: 'var(--bg-dark)',
      color: 'var(--text)',
      padding: '24px',
      overflow: 'auto'
    }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ 
          margin: '0 0 8px 0', 
          fontSize: '28px', 
          fontWeight: 'bold',
          color: 'var(--gold)',
          textTransform: 'uppercase',
          letterSpacing: '1px'
        }}>
          Monster Pool Manager
        </h2>
        <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
          Configure which monsters can appear in combat nodes for each topology. Combat nodes will randomly select from their topology's pool.
        </div>
      </div>

      {/* Global Actions */}
      <div style={{
        padding: '16px',
        backgroundColor: 'var(--bg-panel)',
        borderRadius: '8px',
        border: '1px solid var(--border)',
        marginBottom: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button
            onClick={handleResetAll}
            style={{
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: 'bold',
              backgroundColor: '#ef4444',
              border: 'none',
              borderRadius: '6px',
              color: 'white',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#dc2626';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#ef4444';
            }}
          >
            Reset All Pools to All Monsters
          </button>
          <button
            onClick={() => setShowCreateMonster(!showCreateMonster)}
            style={{
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: 'bold',
              backgroundColor: showCreateMonster ? '#3b82f6' : '#22c55e',
              border: 'none',
              borderRadius: '6px',
              color: 'white',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = showCreateMonster ? '#2563eb' : '#16a34a';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = showCreateMonster ? '#3b82f6' : '#22c55e';
            }}
          >
            {showCreateMonster ? 'Cancel' : 'Create Custom Monster'}
          </button>
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>
          This will reset all combat topology pools (Dead End, Right Turn, Left Turn, T-Junction, Right Branch, Left Branch) to include all available monsters.
        </div>
        
        {/* Populate Assassin Prompts Button */}
        <button
          onClick={async () => {
            if (confirm('Populate Assassin prompts for Left Branch and Right Branch? This will set prompts for all valid entry directions.')) {
              try {
                await populateAssassinPrompts();
                setRefreshKey(prev => prev + 1); // Force refresh
                alert('Assassin prompts have been populated for Left Branch (4 directions) and Right Branch (3 directions)!');
              } catch (error) {
                console.error('Error populating Assassin prompts:', error);
                alert('Error populating Assassin prompts. Check console for details.');
              }
            }
          }}
          style={{
            padding: '8px 16px',
            backgroundColor: '#7c3aed',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 'bold',
            marginBottom: '12px'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#9333ea';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#7c3aed';
          }}
        >
          Populate Assassin Prompts (Left & Right Branch)
        </button>
        
        {/* Force Refresh Assassin Button */}
        <button
          onClick={async () => {
            if (confirm('Force refresh Assassin? This will:\n1. Create Assassin if missing\n2. Add it to Left/Right Branch pools\n3. Set all prompts\n4. Force UI refresh')) {
              try {
                console.log('[MonsterPoolManager] Force refreshing Assassin...');
                await populateAssassinPrompts();
                setRefreshKey(prev => prev + 1);
                
                // Verify after refresh
                const assassinId = 'assassin';
                const leftBranchPool = getMonsterPool(6);
                const rightBranchPool = getMonsterPool(3);
                const inLeftBranch = leftBranchPool.has(assassinId);
                const inRightBranch = rightBranchPool.has(assassinId);
                const allMonstersCheck = getAllMonsters();
                const assassinExists = allMonstersCheck.some(m => m.id === assassinId);
                
                const status = `Assassin Status:\n- Exists: ${assassinExists}\n- In Left Branch pool: ${inLeftBranch}\n- In Right Branch pool: ${inRightBranch}`;
                alert(`Force refresh complete!\n\n${status}`);
                console.log('[MonsterPoolManager] Force refresh complete:', status);
              } catch (error) {
                console.error('Error force refreshing Assassin:', error);
                alert('Error force refreshing Assassin. Check console for details.');
              }
            }
          }}
          style={{
            padding: '8px 16px',
            backgroundColor: '#dc2626',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 'bold',
            marginBottom: '12px',
            marginLeft: '8px'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#ef4444';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#dc2626';
          }}
        >
          Force Refresh Assassin
        </button>
        
        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>
          Populate: Sets prompts for Left Branch (north, south, east, west) and Right Branch (south, east, north).<br/>
          Force Refresh: Creates Assassin if missing, adds to pools, sets prompts, and verifies status.
        </div>
        
        {/* Populate ALL Monster Prompts Button */}
        <button
          onClick={async () => {
            if (confirm(`Populate ALL monster prompts for Left Branch and Right Branch? This will set prompts for all ${allMonsters.length} monsters (${allMonsters.length * 4} Left Branch prompts + ${allMonsters.length * 3} Right Branch prompts).`)) {
              try {
                await populateAllMonsterPrompts();
                setRefreshKey(prev => prev + 1); // Force refresh
                alert(`All monster prompts have been populated!\n\nLeft Branch: ${allMonsters.length} monsters × 4 directions = ${allMonsters.length * 4} prompts\nRight Branch: ${allMonsters.length} monsters × 3 directions = ${allMonsters.length * 3} prompts`);
              } catch (error) {
                console.error('Error populating all monster prompts:', error);
                alert('Error populating monster prompts. Check console for details.');
              }
            }
          }}
          style={{
            padding: '8px 16px',
            backgroundColor: '#059669',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 'bold',
            marginBottom: '12px',
            marginTop: '12px'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#10b981';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#059669';
          }}
        >
          Populate ALL Monster Prompts (Left & Right Branch)
        </button>
        
        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>
          This will populate prompts for ALL monsters (built-in + custom) for Left Branch and Right Branch topologies. Each monster will be positioned on the opposite wall from entry, leaning against the solid wall.
        </div>
        
        {/* Populate T-Junction Monster Prompts Button */}
        <button
          onClick={async () => {
            if (confirm(`Populate ALL monster prompts for T-Junction? This will set prompts for all ${allMonsters.length} monsters (${allMonsters.length * 4} prompts). Monsters will ALWAYS be in the center, facing south, regardless of entry direction.`)) {
              try {
                await populateTJunctionMonsterPrompts();
                setRefreshKey(prev => prev + 1); // Force refresh
                alert(`All T-Junction monster prompts have been populated!\n\nT-Junction: ${allMonsters.length} monsters × 4 directions = ${allMonsters.length * 4} prompts\n\nNote: All monsters are positioned in the center, facing south, regardless of entry direction.`);
              } catch (error) {
                console.error('Error populating T-Junction monster prompts:', error);
                alert('Error populating T-Junction monster prompts. Check console for details.');
              }
            }
          }}
          style={{
            padding: '8px 16px',
            backgroundColor: '#7c3aed',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 'bold',
            marginBottom: '12px',
            marginTop: '12px'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#8b5cf6';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#7c3aed';
          }}
        >
          Populate T-Junction Monster Prompts
        </button>
        
        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>
          This will populate prompts for ALL monsters (built-in + custom) for T-Junction topology. Monsters will ALWAYS be positioned in the center of the room, facing south, regardless of which direction the player enters from.
        </div>
        
        {/* Create Custom Monster Form */}
        {showCreateMonster && (
          <div style={{
            padding: '16px',
            backgroundColor: 'var(--bg-dark)',
            borderRadius: '6px',
            border: '1px solid var(--border)',
            marginTop: '12px'
          }}>
            <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '12px', color: 'var(--gold)' }}>
              Create Custom Monster
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: 'var(--text)' }}>
                  Monster Name *
                </label>
                <input
                  type="text"
                  value={newMonsterName}
                  onChange={(e) => setNewMonsterName(e.target.value)}
                  placeholder="e.g., Fire Drake"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    fontSize: '14px',
                    backgroundColor: 'var(--bg-panel)',
                    border: '1px solid var(--border)',
                    borderRadius: '4px',
                    color: 'var(--text)',
                  }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: 'var(--text)' }}>
                    Tier
                  </label>
                  <select
                    value={newMonsterTier}
                    onChange={(e) => setNewMonsterTier(e.target.value as MonsterTier)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      fontSize: '14px',
                      backgroundColor: 'var(--bg-panel)',
                      border: '1px solid var(--border)',
                      borderRadius: '4px',
                      color: 'var(--text)',
                      cursor: 'pointer',
                    }}
                  >
                    <option value="common">Common</option>
                    <option value="uncommon">Uncommon</option>
                    <option value="boss">Boss</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: 'var(--text)' }}>
                    Min Level
                  </label>
                  <input
                    type="number"
                    value={newMonsterMinLevel}
                    onChange={(e) => setNewMonsterMinLevel(parseInt(e.target.value) || 1)}
                    min="1"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      fontSize: '14px',
                      backgroundColor: 'var(--bg-panel)',
                      border: '1px solid var(--border)',
                      borderRadius: '4px',
                      color: 'var(--text)',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: 'var(--text)' }}>
                    XP
                  </label>
                  <input
                    type="number"
                    value={newMonsterXp}
                    onChange={(e) => setNewMonsterXp(parseInt(e.target.value) || 50)}
                    min="1"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      fontSize: '14px',
                      backgroundColor: 'var(--bg-panel)',
                      border: '1px solid var(--border)',
                      borderRadius: '4px',
                      color: 'var(--text)',
                    }}
                  />
                </div>
              </div>
              <button
                onClick={() => {
                  if (!newMonsterName.trim()) {
                    alert('Please enter a monster name');
                    return;
                  }
                  const newMonster = createCustomMonster(newMonsterName.trim(), newMonsterTier, newMonsterMinLevel, newMonsterXp);
                  
                  // Add to all topology pools with empty prompts for all entry directions
                  const { addMonsterToPool } = useDungeonStore.getState();
                  for (let i = 0; i < 8; i++) {
                    addMonsterToPool(i, newMonster.id, '', null);
                    // Add entry direction variants
                    const validDirections = getValidEntryDirections(i);
                    validDirections.forEach(dir => {
                      if (dir !== null) {
                        addMonsterToPool(i, newMonster.id, '', dir);
                      }
                    });
                  }
                  
                  setNewMonsterName('');
                  setNewMonsterTier('common');
                  setNewMonsterMinLevel(1);
                  setNewMonsterXp(50);
                  setShowCreateMonster(false);
                  setRefreshKey(prev => prev + 1); // Force refresh to show new monster
                  alert(`Created "${newMonster.name}"! It has been added to all topology pools. You can now configure custom prompts for each topology and entry direction.`);
                }}
                disabled={!newMonsterName.trim()}
                style={{
                  padding: '10px 20px',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  backgroundColor: newMonsterName.trim() ? '#22c55e' : 'var(--bg-dark)',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  color: newMonsterName.trim() ? 'white' : 'var(--text-muted)',
                  cursor: newMonsterName.trim() ? 'pointer' : 'not-allowed',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  if (newMonsterName.trim()) {
                    e.currentTarget.style.backgroundColor = '#16a34a';
                  }
                }}
                onMouseLeave={(e) => {
                  if (newMonsterName.trim()) {
                    e.currentTarget.style.backgroundColor = '#22c55e';
                  }
                }}
              >
                Create Monster
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Topology Pools */}
      {/* Only show topologies that can have combat nodes: Dead End (0), Right Turn (1), Right Branch (3), Left Turn (4), T-Junction (5), Left Branch (6) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))',
        gap: '20px'
      }}>
        {[0, 1, 3, 4, 5, 6].map((topologyIndex) => {
          const poolMonsters = getPoolMonsters(topologyIndex);
          const availableMonsters = getAvailableMonsters(topologyIndex);
          const isExpanded = selectedTopology === topologyIndex;

          return (
            <div
              key={topologyIndex}
              style={{
                padding: '20px',
                backgroundColor: 'var(--bg-panel)',
                borderRadius: '8px',
                border: `2px solid ${isExpanded ? '#3b82f6' : 'var(--border)'}`,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onClick={() => setSelectedTopology(isExpanded ? null : topologyIndex)}
            >
              {/* Topology Header */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ 
                  fontSize: '18px', 
                  fontWeight: 'bold', 
                  marginBottom: '4px',
                  color: 'var(--gold)'
                }}>
                  {topologyIndex}: {PROMPT_ARCHETYPE_NAMES[topologyIndex]}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  {poolMonsters.length} monster(s) in pool
                </div>
              </div>

              {/* Expanded View */}
              {isExpanded && (
                <div onClick={(e) => e.stopPropagation()}>
                  {/* Monsters in Pool */}
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ 
                      fontSize: '14px', 
                      fontWeight: 'bold', 
                      marginBottom: '8px',
                      color: 'var(--text)'
                    }}>
                      Monsters in Pool:
                    </div>
                    {poolMonsters.length === 0 ? (
                      <div style={{ 
                        padding: '12px', 
                        backgroundColor: 'var(--bg-dark)', 
                        borderRadius: '4px',
                        fontSize: '12px',
                        color: 'var(--text-muted)',
                        fontStyle: 'italic'
                      }}>
                        Pool is empty. Monsters will fall back to default selection.
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {poolMonsters.map((monster) => {
                          const validEntryDirections = getValidEntryDirections(topologyIndex);
                          const defaultPrompt = monster.visualDescription;
                          
                          return (
                            <div
                              key={monster.id}
                              style={{
                                padding: '12px',
                                backgroundColor: 'var(--bg-dark)',
                                borderRadius: '4px',
                                border: '1px solid var(--border)',
                                marginBottom: '8px',
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '4px' }}>
                                    {monster.name}
                                  </div>
                                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', gap: '8px', marginBottom: '8px' }}>
                                    <span style={{
                                      padding: '2px 6px',
                                      backgroundColor: monster.tier === 'common' ? '#22c55e' : monster.tier === 'uncommon' ? '#3b82f6' : '#ef4444',
                                      borderRadius: '3px',
                                      fontSize: '10px',
                                    }}>
                                      {monster.tier}
                                    </span>
                                    <span>Level {monster.minLevel}+</span>
                                    <span>{monster.xp} XP</span>
                                  </div>
                                </div>
                                <button
                                  onClick={() => handleRemoveMonster(topologyIndex, monster.id)}
                                  style={{
                                    padding: '6px 12px',
                                    fontSize: '12px',
                                    backgroundColor: '#ef4444',
                                    border: 'none',
                                    borderRadius: '4px',
                                    color: 'white',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = '#dc2626';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = '#ef4444';
                                  }}
                                >
                                  Remove
                                </button>
                              </div>
                              
                              {/* Prompt Editors for each entry direction */}
                              <div style={{ marginTop: '8px' }}>
                                <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '8px', color: 'var(--text)' }}>
                                  Custom Prompts by Entry Direction:
                                </div>
                                {validEntryDirections.map((entryDir) => {
                                  const entryKey = entryDir || 'null';
                                  const promptKey = `${topologyIndex}-${monster.id}-${entryKey}`;
                                  const isEditing = editingPrompts.has(promptKey);
                                  const currentPrompt = isEditing 
                                    ? (editingPrompts.get(promptKey) || '')
                                    : getCustomPrompt(topologyIndex, monster.id, entryDir);
                                  const hasCustomPrompt = currentPrompt.trim() !== '';
                                  const entryLabel = entryDir ? `Entry from ${entryDir.toUpperCase()}` : 'Default (any entry)';
                                  
                                  return (
                                    <div key={entryKey} style={{ marginBottom: '12px', padding: '8px', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: '4px' }}>
                                      <div style={{ fontSize: '11px', fontWeight: 'bold', marginBottom: '4px', color: hasCustomPrompt ? '#3b82f6' : 'var(--text-muted)' }}>
                                        {entryLabel} {hasCustomPrompt && '✓'}
                                      </div>
                                      <textarea
                                        value={currentPrompt}
                                        onChange={(e) => handlePromptChange(topologyIndex, monster.id, entryDir, e.target.value)}
                                        placeholder={defaultPrompt}
                                        style={{
                                          width: '100%',
                                          minHeight: '60px',
                                          padding: '8px',
                                          fontSize: '12px',
                                          backgroundColor: 'var(--bg-dark)',
                                          border: '1px solid var(--border)',
                                          borderRadius: '4px',
                                          color: 'var(--text)',
                                          fontFamily: 'monospace',
                                          resize: 'vertical',
                                        }}
                                      />
                                      <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                                        <button
                                          onClick={() => handleSavePrompt(topologyIndex, monster.id, entryDir)}
                                          style={{
                                            padding: '4px 8px',
                                            fontSize: '11px',
                                            backgroundColor: '#22c55e',
                                            border: 'none',
                                            borderRadius: '4px',
                                            color: 'white',
                                            cursor: 'pointer',
                                          }}
                                        >
                                          Save
                                        </button>
                                        {hasCustomPrompt && (
                                          <button
                                            onClick={() => {
                                              handlePromptChange(topologyIndex, monster.id, entryDir, '');
                                              handleSavePrompt(topologyIndex, monster.id, entryDir);
                                            }}
                                            style={{
                                              padding: '4px 8px',
                                              fontSize: '11px',
                                              backgroundColor: 'var(--bg-dark)',
                                              border: '1px solid var(--border)',
                                              borderRadius: '4px',
                                              color: 'var(--text)',
                                              cursor: 'pointer',
                                            }}
                                          >
                                            Clear
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px', fontStyle: 'italic' }}>
                                  Default visual description: {defaultPrompt.substring(0, 80)}...
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Add Monster */}
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ 
                      fontSize: '14px', 
                      fontWeight: 'bold', 
                      marginBottom: '8px',
                      color: 'var(--text)'
                    }}>
                      Add Monster:
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <select
                        value={selectedMonsterToAdd}
                        onChange={(e) => setSelectedMonsterToAdd(e.target.value)}
                        style={{
                          flex: 1,
                          padding: '8px 12px',
                          fontSize: '14px',
                          backgroundColor: 'var(--bg-dark)',
                          border: '1px solid var(--border)',
                          borderRadius: '4px',
                          color: 'var(--text)',
                          cursor: 'pointer',
                        }}
                      >
                        <option value="">Select a monster...</option>
                        {availableMonsters.map((monster) => (
                          <option key={monster.id} value={monster.id}>
                            {monster.name} ({monster.tier}, Lv{monster.minLevel}+)
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => handleAddMonster(topologyIndex, selectedMonsterToAdd)}
                        disabled={!selectedMonsterToAdd}
                        style={{
                          padding: '8px 16px',
                          fontSize: '14px',
                          fontWeight: 'bold',
                          backgroundColor: selectedMonsterToAdd ? '#22c55e' : 'var(--bg-dark)',
                          border: '1px solid var(--border)',
                          borderRadius: '4px',
                          color: selectedMonsterToAdd ? 'white' : 'var(--text-muted)',
                          cursor: selectedMonsterToAdd ? 'pointer' : 'not-allowed',
                          transition: 'all 0.2s',
                        }}
                        onMouseEnter={(e) => {
                          if (selectedMonsterToAdd) {
                            e.currentTarget.style.backgroundColor = '#16a34a';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (selectedMonsterToAdd) {
                            e.currentTarget.style.backgroundColor = '#22c55e';
                          }
                        }}
                      >
                        Add
                      </button>
                    </div>
                  </div>

                  {/* Clear Pool Button */}
                  {poolMonsters.length > 0 && (
                    <button
                      onClick={() => handleClearPool(topologyIndex)}
                      style={{
                        width: '100%',
                        padding: '8px 16px',
                        fontSize: '14px',
                        backgroundColor: 'var(--bg-dark)',
                        border: '1px solid var(--border)',
                        borderRadius: '4px',
                        color: 'var(--text)',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.2)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--bg-dark)';
                      }}
                    >
                      Clear Pool
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

