// Floor-based progression system for Buriedbornes

import { DungeonNode } from './types';

export interface DungeonProgression {
  roomsEntered: number; // Total rooms entered this run
  currentFloor: number; // Calculated floor (1, 2, 3...)
  stepsOnCurrentFloor: number; // Steps since last floor change
  lastFloorNodeId: string | null; // Node ID where floor last changed
}

// Calculate floor based on Manhattan distance from start
export function calculateFloorByDistance(
  startNode: DungeonNode,
  currentNode: DungeonNode
): number {
  // Manhattan distance (works with grid system)
  const dx = Math.abs(currentNode.x - startNode.x);
  const dy = Math.abs(currentNode.y - startNode.y);
  const distance = dx + dy;
  
  // Every 3.5 units = 1 floor
  // Distance 0-3: Floor 1
  // Distance 4-7: Floor 2
  // Distance 8-11: Floor 3
  // etc.
  return Math.floor(distance / 3.5) + 1;
}

// Update progression when entering a room
export function updateProgression(
  currentProgression: DungeonProgression,
  currentNode: DungeonNode,
  startNode: DungeonNode
): DungeonProgression {
  const newFloor = calculateFloorByDistance(startNode, currentNode);
  const floorChanged = newFloor !== currentProgression.currentFloor;
  
  return {
    roomsEntered: currentProgression.roomsEntered + 1,
    currentFloor: newFloor,
    stepsOnCurrentFloor: floorChanged ? 1 : currentProgression.stepsOnCurrentFloor + 1,
    lastFloorNodeId: floorChanged ? currentNode.id : currentProgression.lastFloorNodeId,
  };
}

// Get initial progression
export function getInitialProgression(): DungeonProgression {
  return {
    roomsEntered: 0,
    currentFloor: 1,
    stepsOnCurrentFloor: 0,
    lastFloorNodeId: null,
  };
}







