'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useDungeonStore } from '@/lib/dungeon/store';
import { RoomType } from '@/lib/dungeon/types';
import { getExits } from '@/lib/dungeon/generator';
import { PROMPT_ARCHETYPE_NAMES, getRelativeExits } from '@/lib/dungeon/prompt-logic';

interface NodePromptManagerProps {
  nodeId: string;
  onClose: () => void;
}

/**
 * Get user-friendly display name for room type
 */
function getRoomTypeDisplayName(roomType: RoomType): string {
  const displayNames: Record<RoomType, string> = {
    NORMAL: 'Path',
    MERCHANT: 'Merchant',
    TREASURE: 'Treasure',
    EVENT: 'Event',
    BOSS: 'Boss',
    START: 'Start',
    DEAD_END: 'Dead End',
  };
  return displayNames[roomType] || roomType;
}

/**
 * Create topology key string from exits (e.g., "N+E" or "N+S+W")
 */
function getTopologyKey(exits: { north: boolean; south: boolean; east: boolean; west: boolean }): string {
  const parts: string[] = [];
  if (exits.north) parts.push('N');
  if (exits.south) parts.push('S');
  if (exits.east) parts.push('E');
  if (exits.west) parts.push('W');
  return parts.length > 0 ? parts.join('+') : 'None';
}

export function NodePromptManager({ nodeId, onClose }: NodePromptManagerProps) {
  const nodes = useDungeonStore((state) => state.nodes);
  const getNodePromptOverride = useDungeonStore((state) => state.getNodePromptOverride);
  const setNodePromptOverride = useDungeonStore((state) => state.setNodePromptOverride);
  const clearNodePromptOverride = useDungeonStore((state) => state.clearNodePromptOverride);
  const getNodePromptIndexOverride = useDungeonStore((state) => state.getNodePromptIndexOverride);
  const setNodePromptIndexOverride = useDungeonStore((state) => state.setNodePromptIndexOverride);
  const getManualTopologyOverride = useDungeonStore((state) => state.getManualTopologyOverride);
  const setManualTopologyOverride = useDungeonStore((state) => state.setManualTopologyOverride);
  const getManualEntryDirectionOverride = useDungeonStore((state) => state.getManualEntryDirectionOverride);
  const setManualEntryDirectionOverride = useDungeonStore((state) => state.setManualEntryDirectionOverride);
  const getManualPromptIndexOverride = useDungeonStore((state) => state.getManualPromptIndexOverride);
  const setManualPromptIndexOverride = useDungeonStore((state) => state.setManualPromptIndexOverride);
  const entryDirection = useDungeonStore((state) => state.entryDirection);

  const [customPromptText, setCustomPromptText] = useState<string>('');
  const [selectedPromptIndex, setSelectedPromptIndex] = useState<number | null>(null);
  const [manualTopology, setManualTopology] = useState<{north: boolean, south: boolean, east: boolean, west: boolean} | null>(null);
  const [manualEntryDirection, setManualEntryDirection] = useState<'north' | 'south' | 'east' | 'west' | null | 'calculated'>(null);

  const node = nodes.get(nodeId);
  const currentTextOverride = getNodePromptOverride(nodeId);

  // Get topology for display - memoize to prevent infinite loop
  const exits = useMemo(() => {
    if (!node) return null;
    return getExits(nodeId, nodes);
  }, [nodeId, node?.x, node?.y, node?.connections, nodes]);
  
  // Create stable key for exits to use in dependency arrays
  const exitsKey = useMemo(() => {
    if (!exits) return null;
    return `${exits.north}-${exits.south}-${exits.east}-${exits.west}`;
  }, [exits?.north, exits?.south, exits?.east, exits?.west]);
  
  const topologyStr = exits ? getTopologyKey(exits) : '';
  const roomTypeDisplayName = node ? getRoomTypeDisplayName(node.type) : '';
  
  // Get manual overrides for this topology pattern
  const manualTopologyOverride = topologyStr ? getManualTopologyOverride(topologyStr) : null;
  const manualEntryDirectionOverride = topologyStr ? getManualEntryDirectionOverride(topologyStr) : null;
  const manualPromptIndexOverride = topologyStr ? getManualPromptIndexOverride(topologyStr) : null;
  
  // Initialize manual override states - use stable exitsKey instead of exits object
  useEffect(() => {
    if (manualTopologyOverride) {
      setManualTopology(manualTopologyOverride);
    } else if (exits) {
      setManualTopology({ ...exits });
    }
  }, [manualTopologyOverride, exitsKey]); // Use stable key instead of object
  
  useEffect(() => {
    if (manualEntryDirectionOverride !== null && manualEntryDirectionOverride !== undefined) {
      setManualEntryDirection(manualEntryDirectionOverride);
    } else {
      setManualEntryDirection('calculated');
    }
  }, [manualEntryDirectionOverride]);
  
  useEffect(() => {
    if (manualPromptIndexOverride !== null) {
      setSelectedPromptIndex(manualPromptIndexOverride);
    } else {
      setSelectedPromptIndex(null);
    }
  }, [manualPromptIndexOverride]);

  // Calculate expected prompt index based on topology and entry direction
  const calculatedPromptIndex = useMemo(() => {
    if (!node || !exits) return null;
    try {
      const { hasLeft, hasAhead, hasRight } = getRelativeExits(node, nodes, entryDirection, exits);
      return (hasLeft ? 4 : 0) + (hasAhead ? 2 : 0) + (hasRight ? 1 : 0);
    } catch (e) {
      console.error('Error calculating prompt index:', e);
      return null;
    }
  }, [node, exits, entryDirection, nodes]);

  // Initialize state with current overrides
  useEffect(() => {
    if (currentTextOverride !== null) {
      setCustomPromptText(currentTextOverride);
      setSelectedPromptIndex(null); // Clear index override when text override exists
    } else {
      setCustomPromptText('');
    }
  }, [currentTextOverride]);

  useEffect(() => {
    if (manualPromptIndexOverride !== null) {
      setSelectedPromptIndex(manualPromptIndexOverride);
      setCustomPromptText(''); // Clear text override when index override exists
    } else {
      setSelectedPromptIndex(null);
    }
  }, [manualPromptIndexOverride]);

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-node-prompt-manager]')) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  const handleSetTextOverride = () => {
    if (customPromptText.trim()) {
      // Clear index override when setting text override
      if (topologyStr && manualPromptIndexOverride !== null) {
        setManualPromptIndexOverride(topologyStr, null);
      }
      setNodePromptOverride(nodeId, customPromptText.trim());
      onClose();
    }
  };

  const handleSetIndexOverride = () => {
    if (selectedPromptIndex !== null && topologyStr) {
      // Clear text override when setting index override
      if (currentTextOverride !== null) {
        clearNodePromptOverride(nodeId);
      }
      setManualPromptIndexOverride(topologyStr, selectedPromptIndex);
      onClose();
    }
  };

  const handleClearTextOverride = () => {
    clearNodePromptOverride(nodeId);
    onClose();
  };

  const handleClearIndexOverride = () => {
    if (topologyStr) {
      setManualPromptIndexOverride(topologyStr, null);
    }
    onClose();
  };

  const handleUseCalculated = () => {
    setNodePromptIndexOverride(nodeId, null);
    setSelectedPromptIndex(null);
  };

  const handleSetManualTopology = () => {
    if (manualTopology && topologyStr) {
      setManualTopologyOverride(topologyStr, manualTopology);
      onClose();
    }
  };

  const handleClearManualTopology = () => {
    if (topologyStr) {
      setManualTopologyOverride(topologyStr, null);
      if (exits) {
        setManualTopology({ ...exits });
      }
    }
  };

  const handleSetManualEntryDirection = () => {
    if (topologyStr) {
      const entryDir = manualEntryDirection === 'calculated' ? null : manualEntryDirection;
      setManualEntryDirectionOverride(topologyStr, entryDir);
      onClose();
    }
  };

  const handleClearManualEntryDirection = () => {
    if (topologyStr) {
      setManualEntryDirectionOverride(topologyStr, null);
      setManualEntryDirection('calculated');
    }
  };

  if (!node || !exits) {
    return null;
  }

  return (
    <div
      data-node-prompt-manager
      style={{
        position: 'fixed',
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 1000,
        backgroundColor: 'rgba(0, 0, 0, 0.95)',
        border: '2px solid var(--border)',
        borderRadius: '8px',
        padding: '16px',
        minWidth: '400px',
        maxWidth: '600px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
      }}
    >
      <div style={{ marginBottom: '12px' }}>
        <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: 'bold', color: 'var(--text)' }}>
          Node Prompt Override
        </h3>
        <div style={{ fontSize: '14px', color: 'var(--text)', marginBottom: '4px', fontWeight: '500' }}>
          {roomTypeDisplayName} {topologyStr}
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>
          Node ID: {nodeId}
        </div>
        {currentTextOverride !== null && (
          <div style={{ fontSize: '12px', color: '#facc15', marginBottom: '8px' }}>
            ✓ Custom text prompt is set for all {roomTypeDisplayName} {topologyStr} nodes
          </div>
        )}
        {manualPromptIndexOverride !== null && (
          <div style={{ fontSize: '12px', color: '#facc15', marginBottom: '8px' }}>
            ✓ Manual prompt index override is set: {manualPromptIndexOverride} ({PROMPT_ARCHETYPE_NAMES[manualPromptIndexOverride]}) for topology "{topologyStr}"
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
              This override applies to ALL nodes with topology "{topologyStr}"
            </div>
          </div>
        )}
        {manualTopologyOverride && (
          <div style={{ fontSize: '12px', color: '#facc15', marginBottom: '8px' }}>
            ✓ Manual topology override is set for "{topologyStr}": {getTopologyKey(manualTopologyOverride)}
          </div>
        )}
        {manualEntryDirectionOverride !== null && manualEntryDirectionOverride !== undefined && (
          <div style={{ fontSize: '12px', color: '#facc15', marginBottom: '8px' }}>
            ✓ Manual entry direction override is set for "{topologyStr}": {manualEntryDirectionOverride}
          </div>
        )}
      </div>

      {/* Manual Topology Override Section */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--text)', marginBottom: '8px' }}>
          Manual Topology Override:
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>
          Set which exits (N/S/E/W) should exist for topology pattern "{topologyStr}"
        </div>
        {manualTopology && (
          <div style={{ display: 'flex', gap: '12px', marginBottom: '8px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={manualTopology.north}
                onChange={(e) => setManualTopology({ ...manualTopology, north: e.target.checked })}
                style={{ cursor: 'pointer' }}
              />
              <span>North</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={manualTopology.south}
                onChange={(e) => setManualTopology({ ...manualTopology, south: e.target.checked })}
                style={{ cursor: 'pointer' }}
              />
              <span>South</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={manualTopology.east}
                onChange={(e) => setManualTopology({ ...manualTopology, east: e.target.checked })}
                style={{ cursor: 'pointer' }}
              />
              <span>East</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={manualTopology.west}
                onChange={(e) => setManualTopology({ ...manualTopology, west: e.target.checked })}
                style={{ cursor: 'pointer' }}
              />
              <span>West</span>
            </label>
          </div>
        )}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={handleSetManualTopology}
            style={{
              padding: '6px 12px',
              backgroundColor: 'var(--accent)',
              border: 'none',
              borderRadius: '4px',
              color: 'white',
              fontSize: '12px',
              fontWeight: 'bold',
              cursor: 'pointer',
            }}
          >
            Set Topology Override
          </button>
          {manualTopologyOverride && (
            <button
              onClick={handleClearManualTopology}
              style={{
                padding: '6px 12px',
                backgroundColor: 'rgba(239, 68, 68, 0.8)',
                border: 'none',
                borderRadius: '4px',
                color: 'white',
                fontSize: '12px',
                fontWeight: 'bold',
                cursor: 'pointer',
              }}
            >
              Use Generated
            </button>
          )}
        </div>
      </div>

      {/* Manual Entry Direction Override Section */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--text)', marginBottom: '8px' }}>
          Manual Entry Direction Override:
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>
          Set which direction player enters from for topology pattern "{topologyStr}"
        </div>
        <select
          value={manualEntryDirection === 'calculated' ? '' : manualEntryDirection || ''}
          onChange={(e) => {
            const value = e.target.value === '' ? 'calculated' : e.target.value as 'north' | 'south' | 'east' | 'west';
            setManualEntryDirection(value);
          }}
          style={{
            width: '100%',
            padding: '8px',
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            border: '1px solid var(--border)',
            borderRadius: '4px',
            color: 'var(--text)',
            fontSize: '14px',
            marginBottom: '8px',
          }}
        >
          <option value="">Use Calculated ({entryDirection || 'null'})</option>
          <option value="north">North</option>
          <option value="south">South</option>
          <option value="east">East</option>
          <option value="west">West</option>
        </select>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={handleSetManualEntryDirection}
            style={{
              padding: '6px 12px',
              backgroundColor: 'var(--accent)',
              border: 'none',
              borderRadius: '4px',
              color: 'white',
              fontSize: '12px',
              fontWeight: 'bold',
              cursor: 'pointer',
            }}
          >
            Set Entry Direction Override
          </button>
          {manualEntryDirectionOverride !== null && manualEntryDirectionOverride !== undefined && (
            <button
              onClick={handleClearManualEntryDirection}
              style={{
                padding: '6px 12px',
                backgroundColor: 'rgba(239, 68, 68, 0.8)',
                border: 'none',
                borderRadius: '4px',
                color: 'white',
                fontSize: '12px',
                fontWeight: 'bold',
                cursor: 'pointer',
              }}
            >
              Use Calculated
            </button>
          )}
        </div>
      </div>

      {/* Diagnostics Section */}
      <div style={{ 
        marginBottom: '16px', 
        padding: '12px', 
        backgroundColor: 'rgba(255, 255, 255, 0.05)', 
        borderRadius: '4px',
        border: '1px solid var(--border)'
      }}>
        <div style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text)', marginBottom: '8px' }}>
          Diagnostics
        </div>
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: '1.6' }}>
          <div>
            Topology: <strong style={{ color: 'var(--text)' }}>{topologyStr}</strong>
            {manualTopologyOverride && (
              <span style={{ color: '#facc15', marginLeft: '4px' }}>(Manual: {getTopologyKey(manualTopologyOverride)})</span>
            )}
          </div>
          <div>
            Entry Direction: <strong style={{ color: entryDirection ? 'var(--text)' : '#facc15' }}>{entryDirection || 'null (start room)'}</strong>
            {manualEntryDirectionOverride !== null && manualEntryDirectionOverride !== undefined && (
              <span style={{ color: '#facc15', marginLeft: '4px' }}>(Manual: {manualEntryDirectionOverride})</span>
            )}
            {!entryDirection && node?.type !== 'START' && (
              <span style={{ color: '#facc15', marginLeft: '4px' }}>⚠ Warning: null for non-start node</span>
            )}
          </div>
          {calculatedPromptIndex !== null && (
            <>
              <div>
                Calculated Prompt Index: <strong style={{ color: 'var(--text)' }}>{calculatedPromptIndex} ({PROMPT_ARCHETYPE_NAMES[calculatedPromptIndex]})</strong>
                {manualPromptIndexOverride !== null && (
                  <span style={{ color: '#facc15', marginLeft: '4px' }}>(Manual: {manualPromptIndexOverride} ({PROMPT_ARCHETYPE_NAMES[manualPromptIndexOverride]}))</span>
                )}
              </div>
              {manualPromptIndexOverride !== null && manualPromptIndexOverride !== calculatedPromptIndex && (
                <div style={{ color: '#facc15', marginTop: '4px' }}>
                  ⚠ Manual override ({manualPromptIndexOverride}) differs from calculated ({calculatedPromptIndex})
                </div>
              )}
            </>
          )}
          <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--border)' }}>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
              All overrides apply to ALL nodes with topology "{topologyStr}" and persist across reloads
            </div>
          </div>
        </div>
      </div>

      {/* Prompt Index Selector */}
      <div style={{ marginBottom: '12px' }}>
        <label
          style={{
            display: 'block',
            marginBottom: '8px',
            fontSize: '14px',
            color: 'var(--text)',
          }}
        >
          Prompt Index Override:
        </label>
        <select
          value={selectedPromptIndex !== null ? selectedPromptIndex : ''}
          onChange={(e) => {
            const value = e.target.value === '' ? null : parseInt(e.target.value, 10);
            setSelectedPromptIndex(value);
            if (value !== null) {
              setCustomPromptText(''); // Clear text when selecting index
            }
          }}
          style={{
            width: '100%',
            padding: '8px',
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            border: '1px solid var(--border)',
            borderRadius: '4px',
            color: 'var(--text)',
            fontSize: '14px',
          }}
        >
          <option value="">Use Calculated ({calculatedPromptIndex !== null ? `${calculatedPromptIndex} (${PROMPT_ARCHETYPE_NAMES[calculatedPromptIndex]})` : 'N/A'})</option>
          {PROMPT_ARCHETYPE_NAMES.map((name, index) => (
            <option key={index} value={index}>
              {index}: {name} {index === calculatedPromptIndex ? '(calculated)' : ''}
            </option>
          ))}
        </select>
        {selectedPromptIndex !== null && (
          <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
            <button
              onClick={handleSetIndexOverride}
              style={{
                flex: 1,
                padding: '6px 12px',
                backgroundColor: 'var(--accent)',
                border: 'none',
                borderRadius: '4px',
                color: 'white',
                fontSize: '12px',
                fontWeight: 'bold',
                cursor: 'pointer',
              }}
            >
              Set Index Override
            </button>
            {manualPromptIndexOverride !== null && (
              <button
                onClick={handleClearIndexOverride}
                style={{
                  flex: 1,
                  padding: '6px 12px',
                  backgroundColor: 'rgba(239, 68, 68, 0.8)',
                  border: 'none',
                  borderRadius: '4px',
                  color: 'white',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                }}
              >
                Clear Index Override
              </button>
            )}
          </div>
        )}
      </div>

      {/* Custom Text Override */}
      <div style={{ marginBottom: '12px' }}>
        <label
          style={{
            display: 'block',
            marginBottom: '8px',
            fontSize: '14px',
            color: 'var(--text)',
          }}
        >
          Custom Text Prompt:
        </label>
        <textarea
          value={customPromptText}
          onChange={(e) => {
            setCustomPromptText(e.target.value);
            if (e.target.value.trim()) {
              setSelectedPromptIndex(null); // Clear index when entering text
            }
          }}
          placeholder="Enter your custom prompt here. This will apply to all nodes with the same room type and topology."
          style={{
            width: '100%',
            minHeight: '150px',
            padding: '8px',
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            border: '1px solid var(--border)',
            borderRadius: '4px',
            color: 'var(--text)',
            fontSize: '14px',
            fontFamily: 'monospace',
            resize: 'vertical',
          }}
        />
        {customPromptText.trim() && (
          <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
            <button
              onClick={handleSetTextOverride}
              style={{
                flex: 1,
                padding: '6px 12px',
                backgroundColor: 'var(--accent)',
                border: 'none',
                borderRadius: '4px',
                color: 'white',
                fontSize: '12px',
                fontWeight: 'bold',
                cursor: 'pointer',
              }}
            >
              Set Text Override
            </button>
            {currentTextOverride !== null && (
              <button
                onClick={handleClearTextOverride}
                style={{
                  flex: 1,
                  padding: '6px 12px',
                  backgroundColor: 'rgba(239, 68, 68, 0.8)',
                  border: 'none',
                  borderRadius: '4px',
                  color: 'white',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                }}
              >
                Clear Text Override
              </button>
            )}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={onClose}
          style={{
            padding: '8px 16px',
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            border: '1px solid var(--border)',
            borderRadius: '4px',
            color: 'var(--text)',
            fontSize: '14px',
            cursor: 'pointer',
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

