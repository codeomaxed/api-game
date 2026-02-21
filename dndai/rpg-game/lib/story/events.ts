import { NodeType } from '@/types/game';

export interface EventWeight {
  type: NodeType;
  weight: number; // Higher = more likely
}

export interface EventConfig {
  combat: number;
  dialog: number;
  loot: number;
  event: number;
  location: number;
}

export const DEFAULT_EVENT_WEIGHTS: EventConfig = {
  combat: 30,
  dialog: 25,
  loot: 15,
  event: 20,
  location: 10,
};

export function getRandomEventType(weights: EventConfig = DEFAULT_EVENT_WEIGHTS): NodeType {
  const totalWeight = Object.values(weights).reduce((sum, w) => sum + w, 0);
  let random = Math.random() * totalWeight;

  for (const [type, weight] of Object.entries(weights)) {
    random -= weight;
    if (random <= 0) {
      return type as NodeType;
    }
  }

  return 'event'; // Fallback
}

export function adjustWeightsForLocation(
  location: string,
  baseWeights: EventConfig = DEFAULT_EVENT_WEIGHTS
): EventConfig {
  const adjusted = { ...baseWeights };

  // Towns/cities have more dialog, less combat
  if (location.toLowerCase().includes('town') || location.toLowerCase().includes('city')) {
    adjusted.dialog += 20;
    adjusted.combat -= 15;
    adjusted.location += 10;
  }

  // Dungeons have more combat
  if (location.toLowerCase().includes('dungeon')) {
    adjusted.combat += 20;
    adjusted.loot += 10;
    adjusted.dialog -= 15;
  }

  // Wilderness has more events
  if (location.toLowerCase().includes('wilderness')) {
    adjusted.event += 15;
    adjusted.combat += 10;
  }

  return adjusted;
}

export function shouldTriggerCombat(
  location: string,
  recentCombatCount: number,
  weights: EventConfig = DEFAULT_EVENT_WEIGHTS
): boolean {
  // Less likely to have combat if we just had combat
  if (recentCombatCount > 0) {
    return Math.random() < (weights.combat / 100) * 0.5;
  }

  return Math.random() < (weights.combat / 100);
}














