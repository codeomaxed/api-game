'use client';

import React, { useState, useEffect } from 'react';
import { useDungeonStore } from '@/lib/dungeon/store';
import { useCharacter } from '@/lib/character/CharacterContext';
import { GameEngine } from '@/lib/game/GameEngine';
import { GameNode } from '@/types/game';

interface LoadingScreenProps {
  onComplete: () => void;
  preRenderAllRooms: boolean;
}

export function LoadingScreen({ onComplete, preRenderAllRooms }: LoadingScreenProps) {
  const { character } = useCharacter();
  const generateDungeon = useDungeonStore((state) => state.generateDungeon);
  const getCurrentNode = useDungeonStore((state) => state.getCurrentNode);
  const enterRoom = useDungeonStore((state) => state.enterRoom);
  const startNodeId = useDungeonStore((state) => state.startNodeId);

  const [loadingStage, setLoadingStage] = useState<'generating' | 'preparing' | 'ready'>('generating');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [currentRoomIndex, setCurrentRoomIndex] = useState(0);
  const [totalRooms, setTotalRooms] = useState(0);

  useEffect(() => {
    if (!character) {
      setError('No character found');
      return;
    }

    const loadDungeon = async () => {
      try {
        // Stage 1: Generate dungeon map and populate monsters
        setLoadingStage('generating');
        setProgress(0);
        
        const success = generateDungeon();
        if (!success) {
          setError('Failed to generate dungeon. Please try again.');
          return;
        }

        setProgress(33);

        // Wait a bit for state to update
        await new Promise(resolve => setTimeout(resolve, 100));

        // Stage 2: Pre-generate room content (conditional based on toggle)
        setLoadingStage('preparing');
        
        // Get all nodes from the dungeon store (get fresh state, don't subscribe)
        const storeState = useDungeonStore.getState();
        const allNodes = Array.from(storeState.nodes.values());
        setTotalRooms(allNodes.length);
        
        if (allNodes.length === 0) {
          setError('No rooms found in dungeon');
          return;
        }

        // Initialize game engine for room generation
        const initialNode: GameNode = {
          id: 'start',
          type: 'location',
          description: 'Preparing dungeon...',
          choices: [],
        };
        const gameEngine = new GameEngine(character, initialNode);

        if (preRenderAllRooms) {
          // Pre-generate all rooms sequentially
          // Progress range: 33% to 95% (62% range for room generation)
          const progressStart = 33;
          const progressRange = 62; // 95 - 33 = 62
          
          for (let i = 0; i < allNodes.length; i++) {
            const node = allNodes[i];
            setCurrentRoomIndex(i + 1);
            
            // Skip if room already has content (shouldn't happen, but safety check)
            if (node.content) {
              console.log(`Skipping room ${node.id} - already has content`);
              continue;
            }
            
            try {
              // Calculate progress: 33% + (currentIndex / totalRooms) * 62%
              const roomProgress = progressStart + (i / allNodes.length) * progressRange;
              setProgress(Math.floor(roomProgress));
              
              // Generate room content (story + image + entities)
              await enterRoom(node.id, character, gameEngine);
              
              console.log(`Generated room ${i + 1}/${allNodes.length}: ${node.id}`);
            } catch (roomError) {
              // Log error but continue with next room (don't block entire dungeon)
              console.error(`Error generating room ${node.id}:`, roomError);
              // Continue to next room
            }
          }

          // Finalization
          setProgress(95);
          await new Promise(resolve => setTimeout(resolve, 200));
        } else {
          // Old behavior: Just generate starting room
          const currentNode = getCurrentNode();
          if (!currentNode) {
            setError('Failed to get starting room');
            return;
          }
          
          setProgress(50);
          await enterRoom(currentNode.id, character, gameEngine);
          setProgress(75);
          await new Promise(resolve => setTimeout(resolve, 200));
        }
        
        setProgress(100);
        setLoadingStage('ready');
      } catch (err) {
        console.error('Error loading dungeon:', err);
        setError(err instanceof Error ? err.message : 'Failed to load dungeon');
      }
    };

    loadDungeon();
  }, [character, generateDungeon, getCurrentNode, enterRoom]);

  // Auto-call onComplete when loading stage becomes ready
  useEffect(() => {
    if (loadingStage === 'ready') {
      // Add a short delay (750ms) to let user see the completion state before auto-entering
      const timer = setTimeout(() => {
        onComplete();
      }, 750);
      return () => clearTimeout(timer);
    }
  }, [loadingStage, onComplete]);

  const getStageText = () => {
    switch (loadingStage) {
      case 'generating':
        return 'Generating dungeon map...';
      case 'preparing':
        if (preRenderAllRooms) {
          // Pre-rendering all rooms
          if (totalRooms > 0 && currentRoomIndex > 0) {
            return `Generating room ${currentRoomIndex} of ${totalRooms}...`;
          }
          return 'Preparing rooms...';
        } else {
          // Just generating starting room
          return 'Preparing starting room...';
        }
      case 'ready':
        return 'Ready!';
      default:
        return 'Loading...';
    }
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-bg">
        <div className="max-w-md w-full bg-dark-panel border-2 border-blood-red rounded-lg p-8 text-center">
          <h2 className="text-2xl font-cinzel text-crimson mb-4">Error</h2>
          <p className="text-dark-text mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-crimson text-white rounded hover:bg-crimson/80 transition-colors"
          >
            Reload
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-bg">
      <div className="max-w-md w-full bg-dark-panel border-2 border-glow rounded-lg p-8">
        <h1 className="text-3xl font-cinzel text-crimson mb-6 text-center">
          Preparing Your Adventure
        </h1>

        <div className="space-y-6">
          {/* Progress Bar */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-cinzel text-rose">{getStageText()}</span>
              <span className="text-sm text-dark-muted">{progress}%</span>
            </div>
            <div className="w-full bg-dark-bg border border-rose/30 rounded-full h-3 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-crimson to-rose transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Loading Animation */}
          {loadingStage !== 'ready' && (
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-crimson"></div>
            </div>
          )}

          {/* Auto-entering message when ready */}
          {loadingStage === 'ready' && (
            <div className="flex justify-center">
              <p className="text-sm font-cinzel text-rose animate-pulse">
                Entering dungeon...
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

