'use client';

import React from 'react';
import { useCharacter } from '@/lib/character/CharacterContext';
import { useDungeonStore } from '@/lib/dungeon/store';

export function ProfileSection() {
  const { character, getTotalStats, getArmor, getResistance } = useCharacter();
  const progression = useDungeonStore((state) => state.progression);

  if (!character) {
    return null;
  }

  const totalStats = getTotalStats();
  const armor = getArmor();
  const resistance = getResistance();
  const hpPercent = (character.hp.current / character.hp.max) * 100;
  const xpForNextLevel = character.xp + character.xpToNext;
  const xpPercent = character.xpToNext > 0 ? (character.xp / xpForNextLevel) * 100 : 100;

  return (
    <div className="profile-section bg-[#080808] border-b border-[var(--border)] p-0 flex flex-row items-stretch gap-0 flex-shrink-0">
      {/* Left: Large Avatar - 1/4th width, full height */}
      <div className="profile-avatar-container-large">
        <div className="avatar-ring-large">
          {character.portraitUrl ? (
            <img
              src={character.portraitUrl}
              alt={character.name}
              className="avatar-img-large"
            />
          ) : (
            <div className="avatar-img-large flex items-center justify-center text-4xl">
              ⚔️
            </div>
          )}
          {/* Character name overlay at bottom */}
          <div className="avatar-name-overlay">
            {character.name}
          </div>
        </div>
      </div>

      {/* Right: All Character Information - 3/4th width */}
      <div className="profile-info-container flex-1 flex flex-col gap-1.5 min-w-0">
        {/* Top Row: Name/Level/Job on left, Stats on right */}
        <div className="profile-top-row">
          {/* Character Identity - Left side, bigger text */}
          <div className="profile-identity-left">
            <p className="char-class-large text-left">
              Lvl {character.level} {character.job.name}
            </p>
            <p className="char-race-large text-left">
              Floor {progression.currentFloor} • Power {Math.floor(totalStats.Power)}
            </p>
          </div>
          
          {/* Key Stats - Top right in a row */}
          <div className="profile-ability-mods-top-right">
            <span className="profile-mod-item">STR {Math.floor(totalStats.STR)}</span>
            <span className="profile-mod-item">DEX {Math.floor(totalStats.DEX)}</span>
            <span className="profile-mod-item">INT {Math.floor(totalStats.INT)}</span>
            <span className="profile-mod-item">PIE {Math.floor(totalStats.PIE)}</span>
            <span className="profile-mod-item">ARM {armor}</span>
          </div>
        </div>

        {/* Spacer to push bars down */}
        <div className="profile-bars-spacer"></div>

        {/* HP Bar - Full Width */}
        <div className="profile-stat-row-full">
          <div className="profile-stat-label">HP</div>
          <div className="profile-bar-container-full">
            <div className="profile-bar profile-bar-hp" style={{ width: `${hpPercent}%` }} />
          </div>
          <div className="profile-stat-value">
            {character.hp.current}/{character.hp.max}
          </div>
        </div>

        {/* XP Bar - Full Width */}
        <div className="profile-stat-row-full">
          <div className="profile-stat-label">XP</div>
          <div className="profile-bar-container-full">
            <div className="profile-bar profile-bar-xp" style={{ width: `${xpPercent}%` }} />
          </div>
          <div className="profile-stat-value">{character.xp}/{xpForNextLevel}</div>
        </div>
      </div>
    </div>
  );
}
