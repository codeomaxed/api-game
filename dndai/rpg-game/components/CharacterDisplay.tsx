'use client';

import React from 'react';
import { useCharacter } from '@/lib/character/CharacterContext';

export function CharacterDisplay() {
  const { character, getTotalStats, getArmor, getResistance } = useCharacter();

  if (!character) {
    return (
      <div className="p-4 text-dark-muted">
        No character loaded
      </div>
    );
  }

  const totalStats = getTotalStats();
  const armor = getArmor();
  const resistance = getResistance();

  return (
    <div className="p-4 flex items-start gap-4">
      {/* Left: Character Portrait */}
      <div className="flex-shrink-0">
        <div className="w-36 h-36 border-2 border-glow rounded-lg bg-dark-panel flex items-center justify-center overflow-hidden">
          {character.portraitUrl ? (
            <img
              src={character.portraitUrl}
              alt={character.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="text-dark-muted text-center p-2">
              <div className="text-4xl mb-1">⚔️</div>
              <div className="text-sm">{character.name}</div>
            </div>
          )}
        </div>
        <div className="mt-1.5 text-center">
          <div className="font-cinzel text-base text-crimson">{character.name}</div>
          <div className="text-xs text-dark-muted">
            Level {character.level} {character.job.name}
          </div>
        </div>
      </div>

      {/* Middle: Stats Grid */}
      <div className="flex-shrink-0">
        <h3 className="text-sm font-cinzel text-crimson mb-2">Stats</h3>
        <div className="grid grid-cols-3 gap-2">
          {([
            { key: 'STR', label: 'STR', value: Math.floor(totalStats.STR) },
            { key: 'DEX', label: 'DEX', value: Math.floor(totalStats.DEX) },
            { key: 'INT', label: 'INT', value: Math.floor(totalStats.INT) },
            { key: 'PIE', label: 'PIE', value: Math.floor(totalStats.PIE) },
            { key: 'Power', label: 'PWR', value: Math.floor(totalStats.Power) },
            { key: 'HP', label: 'HP', value: Math.floor(totalStats.maxHP) },
          ] as const).map(stat => {
            return (
              <div
                key={stat.key}
                className="border border-dark-muted/30 bg-dark-panel/50 rounded p-2"
              >
                <div className="text-dark-muted uppercase text-[10px] font-semibold tracking-wide" style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.8)' }}>{stat.label}</div>
                <div className="text-lg font-bold text-rose" style={{ textShadow: '0 1px 3px rgba(0, 0, 0, 0.9), 0 0 4px rgba(220, 38, 38, 0.3)' }}>{stat.value}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right: Bars and Stats */}
      <div className="flex-shrink-0 space-y-2.5 min-w-[280px]">
        {/* HP Bar */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-dark-muted">Hit Points</span>
            <span className="text-rose">
              {character.hp.current} / {character.hp.max}
            </span>
          </div>
          <div className="w-full h-4 bg-dark-panel border border-dark-muted/30 rounded overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blood-red to-crimson transition-all"
              style={{
                width: `${Math.min(100, (character.hp.current / character.hp.max) * 100)}%`,
              }}
            />
          </div>
        </div>

        {/* Defense Stats */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="border border-dark-muted/30 bg-dark-panel/50 rounded p-2">
            <div className="text-dark-muted">Armor</div>
            <div className="text-lg font-bold text-crimson">{armor}</div>
          </div>
          <div className="border border-dark-muted/30 bg-dark-panel/50 rounded p-2">
            <div className="text-dark-muted">Resistance</div>
            <div className="text-lg font-bold text-crimson">{resistance}</div>
          </div>
        </div>

        {/* XP */}
        <div className="border border-dark-muted/30 bg-dark-panel/50 rounded p-2">
          <div className="text-dark-muted text-xs mb-1">XP</div>
          <div className="text-lg font-bold text-rose">{character.xp}</div>
          <div className="text-[10px] text-dark-muted">
            Next: {character.xpToNext}
          </div>
        </div>
      </div>
    </div>
  );
}
