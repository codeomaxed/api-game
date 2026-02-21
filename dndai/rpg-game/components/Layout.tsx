'use client';

import React, { useState } from 'react';
import { TopBar } from './TopBar';
import { ProfileSection } from './ProfileSection';
import { Inventory } from './Inventory';
import { GameInterface } from './GameInterface';
import { DungeonMiniMap } from './DungeonMiniMap';
import { useDungeonStore } from '@/lib/dungeon/store';
import { MonsterPoolManager } from './MonsterPoolManager';

export function Layout() {
  const isInDungeon = useDungeonStore((state) => state.playerLocation !== null);
  const [fogOfWarEnabled, setFogOfWarEnabled] = useState<boolean>(true);
  const [segmentationVisible, setSegmentationVisible] = useState<boolean>(false); // Off by default
  const [calibrationMode, setCalibrationMode] = useState<boolean>(false);
  const [showMonsterPoolManager, setShowMonsterPoolManager] = useState<boolean>(false);
  
  // Pixelation state - always enabled with Simple mode as default (no toggle UI)
  const pixelationEnabled = true;
  const pixelationMode: 'simple' | '8bit' = 'simple';

  return (
    <div className="flex flex-col h-screen" style={{ backgroundColor: 'var(--bg-dark)' }}>
      {/* Top Bar */}
      <TopBar />

      {/* Monster Pool Manager Modal */}
      {showMonsterPoolManager && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
          onClick={() => setShowMonsterPoolManager(false)}
        >
          <div
            style={{
              width: '90%',
              maxWidth: '1400px',
              height: '90%',
              backgroundColor: 'var(--bg-dark)',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              position: 'relative',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              zIndex: 10,
            }}>
              <button
                onClick={() => setShowMonsterPoolManager(false)}
                style={{
                  padding: '8px 16px',
                  fontSize: '14px',
                  backgroundColor: 'var(--bg-panel)',
                  border: '1px solid var(--border)',
                  borderRadius: '4px',
                  color: 'var(--text)',
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
            </div>
            <MonsterPoolManager />
          </div>
        </div>
      )}

      {/* Main Layout Grid */}
      <div className="layout-container grid flex-1 overflow-hidden" style={{ gridTemplateColumns: '1fr 1400px 1fr', height: 'calc(100vh - 64px)' }}>
        {/* Left Panel: Profile + Inventory */}
        <aside className="panel flex flex-col overflow-visible" style={{ backgroundColor: 'var(--bg-panel)', borderRight: '1px solid var(--border)' }}>
          <ProfileSection />
          <div className="panel-padding flex-grow flex flex-col overflow-visible p-2" style={{ flex: '1 1 0', minHeight: 0 }}>
            <Inventory />
          </div>
        </aside>

        {/* Center: Main Immersive View */}
        <main className="main-view relative flex flex-col overflow-hidden">
          <GameInterface 
            showSegmentationBox={segmentationVisible}
            pixelationEnabled={pixelationEnabled}
            pixelationMode={pixelationMode}
          />
        </main>

        {/* Right Panel: Map + Stats */}
        <aside className="panel panel-right flex flex-col overflow-hidden p-4" style={{ backgroundColor: 'var(--bg-panel)', borderLeft: '1px solid var(--border)', position: 'relative' }}>
          <div className="panel-padding flex flex-col flex-grow min-h-0" style={{ position: 'relative' }}>
            {/* Map */}
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-[0.75rem] font-cinzel" style={{ color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Map
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowMonsterPoolManager(true)}
                  style={{
                    padding: '4px 8px',
                    fontSize: '10px',
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid var(--border)',
                    borderRadius: '4px',
                    color: 'var(--text)',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  title="Manage monster pools for combat nodes"
                >
                  🎲 Monster Pools
                </button>
              </div>
              {isInDungeon && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setFogOfWarEnabled(!fogOfWarEnabled)}
                    style={{
                      padding: '4px 8px',
                      fontSize: '10px',
                      backgroundColor: fogOfWarEnabled ? 'rgba(59, 130, 246, 0.3)' : 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid var(--border)',
                      borderRadius: '4px',
                      color: 'var(--text)',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                    title={fogOfWarEnabled ? 'Fog of War: ON (hide unvisited nodes)' : 'Fog of War: OFF (show all nodes)'}
                  >
                    {fogOfWarEnabled ? '🌫️ Fog ON' : '👁️ Fog OFF'}
                  </button>
                  <button
                    onClick={() => setSegmentationVisible(!segmentationVisible)}
                    style={{
                      padding: '4px 8px',
                      fontSize: '10px',
                      backgroundColor: segmentationVisible ? 'rgba(59, 130, 246, 0.3)' : 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid var(--border)',
                      borderRadius: '4px',
                      color: 'var(--text)',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                    title={segmentationVisible ? 'Segmentation Box: ON (show detection box)' : 'Segmentation Box: OFF (hide detection box)'}
                  >
                    {segmentationVisible ? '🎯 Seg ON' : '🎯 Seg OFF'}
                  </button>
                  <button
                    onClick={() => setCalibrationMode(!calibrationMode)}
                    style={{
                      padding: '4px 8px',
                      fontSize: '10px',
                      backgroundColor: calibrationMode ? 'rgba(239, 68, 68, 0.3)' : 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid var(--border)',
                      borderRadius: '4px',
                      color: 'var(--text)',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                    title={calibrationMode ? 'Calibration Mode: ON (highlight nodes without manual overrides)' : 'Calibration Mode: OFF (normal view)'}
                  >
                    {calibrationMode ? '🔧 Cal ON' : '🔧 Cal OFF'}
                  </button>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }} title="Left-click any node to set its custom prompt">
                    Left-click nodes
                  </span>
                </div>
              )}
            </div>
            <div className="map-container w-full flex-1 relative" style={{ backgroundColor: '#000', border: '1px solid var(--border)', minHeight: 0 }}>
              {isInDungeon ? (
                <DungeonMiniMap disableFogOfWar={!fogOfWarEnabled} calibrationMode={calibrationMode} />
              ) : (
                <div className="w-full h-full flex items-center justify-center" style={{ color: 'var(--text-muted)' }}>
                  Enter dungeon to see map
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}


