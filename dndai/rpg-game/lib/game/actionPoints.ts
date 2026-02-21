import { Character } from '@/types/character';

export interface ActionPointConfig {
  attack: number;
  spell: number;
  item: number;
  flee: number;
  talk: number;
  action: number;
  dialog: number;
}

export const DEFAULT_AP_COSTS: ActionPointConfig = {
  attack: 2,
  spell: 3,
  item: 1,
  flee: 1,
  talk: 1,
  action: 1,
  dialog: 1,
};

export function getActionPointCost(
  actionType: keyof ActionPointConfig,
  config: ActionPointConfig = DEFAULT_AP_COSTS
): number {
  return config[actionType] || 1;
}

export function canAffordAction(
  character: Character,
  actionType: keyof ActionPointConfig,
  config: ActionPointConfig = DEFAULT_AP_COSTS
): boolean {
  const cost = getActionPointCost(actionType, config);
  return character.actionPoints >= cost;
}

export function restoreActionPoints(
  character: Character,
  amount?: number
): Character {
  return {
    ...character,
    actionPoints: amount ?? character.maxActionPoints,
  };
}

export function regenerateActionPoints(
  character: Character,
  amount: number = 1
): Character {
  return {
    ...character,
    actionPoints: Math.min(
      character.maxActionPoints,
      character.actionPoints + amount
    ),
  };
}














