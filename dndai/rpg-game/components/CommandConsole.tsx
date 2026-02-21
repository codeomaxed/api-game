'use client';

import React from 'react';
import { Choice } from '@/types/game';
import { CombatInterface } from './CombatInterface';
import { Character } from '@/types/character';
import { EnemyData } from '@/types/game';

interface CommandConsoleProps {
  narrativeText: string;
  choices: Choice[];
  onChoiceSelect: (choice: Choice) => void;
  isLoading: boolean;
  isGenerating: boolean;
  // Combat props (optional)
  isInCombat?: boolean;
  character?: Character;
  enemy?: EnemyData;
  onCombatEnd?: (victory: boolean) => void;
  autoBattle?: boolean;
  setAutoBattle?: (auto: boolean) => void;
  enemyPosition?: { centerX: number; centerY: number } | null;
  setEnemyPosition?: (position: { centerX: number; centerY: number } | null) => void;
  monsterBounds?: { centerX: number; centerY: number; top: number; bottom: number; headTop?: number; left: number; right: number; width: number; height: number } | null;
  onAttackAnimation?: (path: { fromX: number; fromY: number; toX: number; toY: number }) => void;
  onHitEffect?: (data: { x: number; y: number; isCritical: boolean }) => void;
  onEnemyHPUpdate?: (hp: { current: number; max: number }) => void;
  onEnemyDyingChange?: (isDying: boolean) => void;
  onDeathAnimationComplete?: () => void;
}

// Helper function to get icon for a direction
function getIcon(direction: string): string | null {
  const icons: Record<string, string> = {
    'NORTH': '⬆️',
    'SOUTH': '⬇️',
    'EAST': '➡️',
    'WEST': '⬅️',
    'FORWARD': '⬆️',
    'LEFT': '⬅️',
    'RIGHT': '➡️',
    'BACK': '⬇️'
  };
  return icons[direction.toUpperCase()] || null;
}

// Helper function to extract direction info from choice text
function getDirectionInfo(choiceText: string): { direction: string | null, displayText: string, icon: string | null } {
  if (choiceText.startsWith('[')) {
    const closingBracketIndex = choiceText.indexOf(']');
    if (closingBracketIndex > -1) {
      const tag = choiceText.substring(1, closingBracketIndex).toUpperCase();
      const content = choiceText.substring(closingBracketIndex + 1).trim();
      
      if (content.length > 0) {
        return { 
          direction: tag, 
          displayText: content,
          icon: getIcon(tag) 
        };
      } else {
        return {
          direction: tag,
          displayText: '',
          icon: getIcon(tag)
        };
      }
    }
  }
  return { direction: null, displayText: choiceText, icon: null };
}

export function CommandConsole({ 
  narrativeText, 
  choices, 
  onChoiceSelect, 
  isLoading, 
  isGenerating,
  isInCombat = false,
  character,
  enemy,
  onCombatEnd,
  autoBattle = false,
  setAutoBattle,
  enemyPosition,
  setEnemyPosition,
  monsterBounds,
  onAttackAnimation,
  onHitEffect,
  onEnemyHPUpdate,
  monsterImageUrl,
  onEnemyDyingChange,
  onDeathAnimationComplete
}: CommandConsoleProps) {
  // If in combat, render CombatInterface instead of story/actions
  if (isInCombat && character && enemy && onCombatEnd) {
    return (
      <div className="command-console">
        <CombatInterface
          character={character}
          enemy={enemy}
          onCombatEnd={onCombatEnd}
          autoBattle={autoBattle}
          setAutoBattle={setAutoBattle}
          enemyPosition={enemyPosition}
          setEnemyPosition={setEnemyPosition}
          monsterBounds={monsterBounds}
          onAttackAnimation={onAttackAnimation}
          onHitEffect={onHitEffect}
          onEnemyHPUpdate={onEnemyHPUpdate}
          monsterImageUrl={monsterImageUrl}
          onEnemyDyingChange={onEnemyDyingChange}
          onDeathAnimationComplete={onDeathAnimationComplete}
        />
      </div>
    );
  }

  // Normal story/actions view
  return (
    <div className="command-console">
      {/* Story Box - Left Panel */}
      <div className="story-box">
        <div className="story-header">STORY</div>
        <div className="story-content">
          {narrativeText}
          {isGenerating && <span className="animate-pulse">|</span>}
        </div>
      </div>

      {/* Action Box - Right Panel */}
      <div className="action-box">
        <div className="action-header">ACTIONS</div>
        <div className="action-content">
          {choices && choices.length > 0 ? (
            choices.map((choice, index) => {
              const { direction, displayText, icon } = getDirectionInfo(choice.text);
              
              // Determine what text to display - always prefer immersive text
              let textToDisplay: string;
              if (direction && displayText && displayText.trim().length > 0) {
                // Always use the immersive displayText when available
                textToDisplay = displayText;
              } else {
                // Fallback to choice.text only if no displayText available
                textToDisplay = choice.text;
              }
              
              const hotkey = (index + 1).toString();

              return (
                <div
                  key={choice.id}
                  className="choice-card"
                  onClick={(e) => {
                    e.preventDefault();
                    if (!isLoading) {
                      onChoiceSelect(choice);
                    }
                  }}
                  style={{ opacity: isLoading ? 0.5 : 1, cursor: isLoading ? 'not-allowed' : 'pointer' }}
                >
                  <div className="choice-icon">{icon || '✨'}</div>
                  <div className="choice-text">{textToDisplay}</div>
                  <div className="choice-hotkey">{hotkey}</div>
                </div>
              );
            })
          ) : (
            <div className="no-choices">
              {isLoading ? 'Loading options...' : 'No options available'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

