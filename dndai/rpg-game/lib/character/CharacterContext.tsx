'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import {
  Character,
  Equipment,
  Inventory,
  Item,
  EquipmentSlot,
  calculateTotalStats,
} from '@/types/character';
import { BuriedbornesStats, calculateTotalStats as calculateBuriedbornesStats } from '@/lib/game/buriedbornes-stats';
import { calculateXPToNextLevel } from '@/lib/game/xp-leveling';

interface CharacterContextType {
  character: Character | null;
  setCharacter: (character: Character) => void;
  updateStats: (stats: Partial<BuriedbornesStats>) => void;
  updateHP: (current: number, max?: number) => void;
  updateXP: (xp: number) => void;
  levelUp: () => void;
  equipItem: (item: Item, slot: EquipmentSlot) => void;
  unequipItem: (slot: EquipmentSlot) => void;
  addToInventory: (item: Item) => void;
  removeFromInventory: (itemId: string) => void;
  getTotalStats: () => BuriedbornesStats;
  getArmor: () => number;
  getResistance: () => number;
}

const CharacterContext = createContext<CharacterContextType | undefined>(undefined);

export function CharacterProvider({ children }: { children: ReactNode }) {
  const [character, setCharacterState] = useState<Character | null>(null);

  const setCharacter = useCallback((char: Character) => {
    setCharacterState(char);
  }, []);

  const updateStats = useCallback((stats: Partial<BuriedbornesStats>) => {
    if (!character) return;
    setCharacterState({
      ...character,
      baseStats: { ...character.baseStats, ...stats },
    });
  }, [character]);

  const updateHP = useCallback((current: number, max?: number) => {
    if (!character) return;
    const newMax = max ?? character.hp.max;
    setCharacterState({
      ...character,
      hp: {
        current: Math.max(0, Math.min(current, newMax)),
        max: newMax,
      },
    });
  }, [character]);


  const updateXP = useCallback((xp: number) => {
    if (!character) return;
    // XP is updated through the gainXP function in xp-leveling.ts
    // This function just updates the stored XP value
    setCharacterState({
      ...character,
      xp: xp,
    });
  }, [character]);

  const levelUp = useCallback(() => {
    // Level up is handled by gainXP function in xp-leveling.ts
    // This is kept for compatibility but doesn't need to do anything
  }, []);

  const equipItem = useCallback((item: Item, slot: EquipmentSlot) => {
    if (!character) return;
    
    // Check requirements
    if (item.requirements) {
      const totalStats = calculateBuriedbornesStats(character.baseStats, character.equipment);
      const meetsRequirements = Object.entries(item.requirements).every(
        ([stat, value]) => {
          const statKey = stat as keyof BuriedbornesStats;
          return (totalStats[statKey] || 0) >= (value || 0);
        }
      );
      if (!meetsRequirements) {
        console.warn(`Cannot equip ${item.name}: requirements not met`);
        return;
      }
    }
    
    // Unequip existing item if any
    const existingItem = character.equipment[slot];
    const newInventory = existingItem 
      ? [...character.inventory, existingItem]
      : character.inventory;
    
    // Remove from inventory if it was there
    const filteredInventory = newInventory.filter(i => i.id !== item.id);
    
    // Equip new item
    const newEquipment: Equipment = {
      ...character.equipment,
      [slot]: item,
    };
    
    // Recalculate HP if maxHP changed
    const oldStats = calculateBuriedbornesStats(character.baseStats, character.equipment);
    const newStats = calculateBuriedbornesStats(character.baseStats, newEquipment);
    const hpDiff = newStats.maxHP - oldStats.maxHP;
    
    setCharacterState({
      ...character,
      equipment: newEquipment,
      inventory: filteredInventory,
      hp: {
        ...character.hp,
        max: character.hp.max + hpDiff,
        current: Math.min(character.hp.current + hpDiff, character.hp.max + hpDiff),
      },
    });
  }, [character]);

  const unequipItem = useCallback((slot: EquipmentSlot) => {
    if (!character || !character.equipment[slot]) return;
    
    const item = character.equipment[slot];
    const newEquipment: Equipment = {
      ...character.equipment,
      [slot]: undefined,
    };
    
    // Recalculate HP if maxHP changed
    const oldStats = calculateBuriedbornesStats(character.baseStats, character.equipment);
    const newStats = calculateBuriedbornesStats(character.baseStats, newEquipment);
    const hpDiff = newStats.maxHP - oldStats.maxHP;
    
    setCharacterState({
      ...character,
      equipment: newEquipment,
      inventory: [...character.inventory, item],
      hp: {
        ...character.hp,
        max: Math.max(character.baseStats.maxHP, character.hp.max + hpDiff),
        current: Math.max(0, character.hp.current + hpDiff),
      },
    });
  }, [character]);

  const addToInventory = useCallback((item: Item) => {
    if (!character) return;
    setCharacterState({
      ...character,
      inventory: [...character.inventory, item],
    });
  }, [character]);

  const removeFromInventory = useCallback((itemId: string) => {
    if (!character) return;
    setCharacterState({
      ...character,
      inventory: character.inventory.filter(item => item.id !== itemId),
    });
  }, [character]);


  const getTotalStats = useCallback((): BuriedbornesStats => {
    if (!character) {
      return {
        STR: 10,
        DEX: 10,
        INT: 10,
        PIE: 10,
        maxHP: 50,
        Power: 8,
        Armor: 0,
        Resistance: 0,
        Avoid: 0,
        Parry: 0,
        Critical: 0,
        Reflect: 0,
        Pursuit: 0,
      };
    }
    return calculateBuriedbornesStats(character.baseStats, character.equipment);
  }, [character]);

  const getArmor = useCallback((): number => {
    if (!character) return 0;
    const totalStats = calculateBuriedbornesStats(character.baseStats, character.equipment);
    return totalStats.Armor;
  }, [character]);

  const getResistance = useCallback((): number => {
    if (!character) return 0;
    const totalStats = calculateBuriedbornesStats(character.baseStats, character.equipment);
    return totalStats.Resistance;
  }, [character]);

  const value: CharacterContextType = {
    character,
    setCharacter,
    updateStats,
    updateHP,
    updateXP,
    levelUp,
    equipItem,
    unequipItem,
    addToInventory,
    removeFromInventory,
    getTotalStats,
    getArmor,
    getResistance,
  };

  return (
    <CharacterContext.Provider value={value}>
      {children}
    </CharacterContext.Provider>
  );
}

export function useCharacter() {
  const context = useContext(CharacterContext);
  if (context === undefined) {
    throw new Error('useCharacter must be used within a CharacterProvider');
  }
  return context;
}














