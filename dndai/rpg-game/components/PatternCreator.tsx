'use client';

import React, { useState, useMemo } from 'react';
import { useDungeonStore } from '@/lib/dungeon/store';
import { PROMPT_ARCHETYPE_NAMES } from '@/lib/dungeon/prompt-logic';
import { getExits } from '@/lib/dungeon/generator';
import { Exits } from '@/lib/dungeon/types';

/**
 * Component for creating prompt patterns from selected nodes
 */
export function PatternCreator() {
  const nodes = useDungeonStore((state) => state.nodes);
  const selectedNodes = useDungeonStore((state) => state.selectedNodes);
  const promptPatterns = useDungeonStore((state) => state.promptPatterns);
  const createPatternFromSelection = useDungeonStore((state) => state.createPatternFromSelection);
  const deletePattern = useDungeonStore((state) => state.deletePattern);
  const updatePattern = useDungeonStore((state) => state.updatePattern);
  const clearSelectedNodes = useDungeonStore((state) => state.clearSelectedNodes);
  const getPatternForNode = useDungeonStore((state) => state.getPatternForNode);

  const [selectedPromptIndex, setSelectedPromptIndex] = useState<number>(0);
  const [patternName, setPatternName] = useState<string>('');
  const [showPatterns, setShowPatterns] = useState<boolean>(false);
  const [editingPatternId, setEditingPatternId] = useState<string | null>(null);
  const [editingPromptIndex, setEditingPromptIndex] = useState<number>(0);

  // Calculate topology of selected nodes
  const selectedTopology = useMemo(() => {
    if (selectedNodes.size === 0) return null;

    const topologies: Exits[] = [];
    for (const nodeId of selectedNodes) {
      const exits = getExits(nodeId, nodes);
      topologies.push(exits);
    }

    if (topologies.length === 0) return null;

    // Check if all selected nodes have the same topology
    const first = topologies[0];
    const allMatch = topologies.every(t =>
      t.north === first.north &&
      t.south === first.south &&
      t.east === first.east &&
      t.west === first.west
    );

    if (!allMatch) return null;

    return first;
  }, [selectedNodes, nodes]);

  // Get topology string representation
  const getTopologyString = (topology: Exits): string => {
    const parts: string[] = [];
    if (topology.north) parts.push('N');
    if (topology.south) parts.push('S');
    if (topology.east) parts.push('E');
    if (topology.west) parts.push('W');
    return parts.length > 0 ? parts.join('+') : 'None';
  };

  // Find all nodes matching the selected topology
  const findMatchingNodes = (topology: Exits): string[] => {
    const matching: string[] = [];
    nodes.forEach((node, nodeId) => {
      const exits = getExits(nodeId, nodes);
      if (
        exits.north === topology.north &&
        exits.south === topology.south &&
        exits.east === topology.east &&
        exits.west === topology.west
      ) {
        matching.push(nodeId);
      }
    });
    return matching;
  };

  const handleCreatePattern = () => {
    if (selectedNodes.size === 0 || !selectedTopology) return;

    const pattern = createPatternFromSelection(
      selectedPromptIndex,
      patternName.trim() || undefined
    );

    if (pattern) {
      setPatternName('');
      setSelectedPromptIndex(0);
    }
  };

  const addSelectedNode = useDungeonStore((state) => state.addSelectedNode);

  const handleApplyToAllMatching = () => {
    if (!selectedTopology) return;

    const matchingNodes = findMatchingNodes(selectedTopology);
    if (matchingNodes.length === 0) return;

    // Clear current selection and select all matching nodes
    clearSelectedNodes();
    matchingNodes.forEach(nodeId => {
      addSelectedNode(nodeId);
    });

    // Create pattern from all matching nodes
    const pattern = createPatternFromSelection(
      selectedPromptIndex,
      patternName.trim() || `Pattern: ${getTopologyString(selectedTopology)}`
    );

    if (pattern) {
      setPatternName('');
      setSelectedPromptIndex(0);
      clearSelectedNodes();
    }
  };

  return (
    <div className="pattern-creator" style={{
      position: 'fixed',
      top: '20px',
      left: '20px',
      width: '320px',
      backgroundColor: 'rgba(0, 0, 0, 0.9)',
      border: '1px solid var(--border)',
      borderRadius: '8px',
      padding: '16px',
      zIndex: 1000,
      color: 'var(--text)',
      maxHeight: '80vh',
      overflowY: 'auto',
    }}>
      <div style={{ marginBottom: '16px' }}>
        <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 'bold' }}>
          Pattern Creator
        </h3>
        <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>
          Select nodes on the minimap to create prompt patterns
        </p>
      </div>

      {/* Selection Status */}
      <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: 'rgba(59, 130, 246, 0.1)', borderRadius: '4px' }}>
        <div style={{ fontSize: '14px', marginBottom: '4px' }}>
          <strong>Selected Nodes:</strong> {selectedNodes.size}
        </div>
        {selectedTopology ? (
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Topology: <strong>{getTopologyString(selectedTopology)}</strong>
            <br />
            <span style={{ color: '#4ade80' }}>✓ All nodes match</span>
          </div>
        ) : selectedNodes.size > 0 ? (
          <div style={{ fontSize: '12px', color: '#ef4444' }}>
            ⚠ Selected nodes have different topologies
          </div>
        ) : (
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            No nodes selected
          </div>
        )}
      </div>

      {/* Pattern Creation Form */}
      {selectedNodes.size > 0 && selectedTopology && (
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>
            Prompt Archetype:
          </label>
          <select
            value={selectedPromptIndex}
            onChange={(e) => setSelectedPromptIndex(Number(e.target.value))}
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
            {PROMPT_ARCHETYPE_NAMES.map((name, index) => (
              <option key={index} value={index}>
                {index}: {name}
              </option>
            ))}
          </select>

          <label style={{ display: 'block', marginTop: '12px', marginBottom: '8px', fontSize: '14px' }}>
            Pattern Name (optional):
          </label>
          <input
            type="text"
            value={patternName}
            onChange={(e) => setPatternName(e.target.value)}
            placeholder="Auto-generated if empty"
            style={{
              width: '100%',
              padding: '8px',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid var(--border)',
              borderRadius: '4px',
              color: 'var(--text)',
              fontSize: '14px',
            }}
          />

          <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
            <button
              onClick={handleCreatePattern}
              disabled={!selectedTopology}
              style={{
                flex: 1,
                padding: '8px 16px',
                backgroundColor: 'var(--accent)',
                border: 'none',
                borderRadius: '4px',
                color: 'white',
                fontSize: '14px',
                fontWeight: 'bold',
                cursor: selectedTopology ? 'pointer' : 'not-allowed',
                opacity: selectedTopology ? 1 : 0.5,
              }}
            >
              Create Pattern
            </button>
            <button
              onClick={handleApplyToAllMatching}
              disabled={!selectedTopology}
              style={{
                flex: 1,
                padding: '8px 16px',
                backgroundColor: 'rgba(139, 92, 246, 0.8)',
                border: 'none',
                borderRadius: '4px',
                color: 'white',
                fontSize: '14px',
                fontWeight: 'bold',
                cursor: selectedTopology ? 'pointer' : 'not-allowed',
                opacity: selectedTopology ? 1 : 0.5,
              }}
            >
              Apply to All Matching
            </button>
          </div>
        </div>
      )}

      {/* Existing Patterns */}
      <div style={{ marginTop: '16px' }}>
        <button
          onClick={() => setShowPatterns(!showPatterns)}
          style={{
            width: '100%',
            padding: '8px',
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid var(--border)',
            borderRadius: '4px',
            color: 'var(--text)',
            fontSize: '14px',
            cursor: 'pointer',
          }}
        >
          {showPatterns ? '▼' : '▶'} Existing Patterns ({promptPatterns.length})
        </button>

        {showPatterns && (
          <div style={{ marginTop: '8px' }}>
            {promptPatterns.length === 0 ? (
              <div style={{ padding: '12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                No patterns created yet
              </div>
            ) : (
              promptPatterns.map((pattern) => {
                const matchingCount = findMatchingNodes(pattern.topology).length;
                return (
                  <div
                    key={pattern.id}
                    style={{
                      padding: '12px',
                      marginBottom: '8px',
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid var(--border)',
                      borderRadius: '4px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '14px', fontWeight: 'bold' }}>
                          {pattern.name}
                        </div>
                        {editingPatternId === pattern.id ? (
                          <div style={{ marginTop: '8px' }}>
                            <select
                              value={editingPromptIndex}
                              onChange={(e) => setEditingPromptIndex(Number(e.target.value))}
                              style={{
                                width: '100%',
                                padding: '4px',
                                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                border: '1px solid var(--border)',
                                borderRadius: '4px',
                                color: 'var(--text)',
                                fontSize: '12px',
                                marginBottom: '4px',
                              }}
                            >
                              {PROMPT_ARCHETYPE_NAMES.map((name, index) => (
                                <option key={index} value={index}>
                                  {index}: {name}
                                </option>
                              ))}
                            </select>
                            <div style={{ display: 'flex', gap: '4px' }}>
                              <button
                                onClick={() => {
                                  updatePattern(pattern.id, { promptIndex: editingPromptIndex });
                                  setEditingPatternId(null);
                                }}
                                style={{
                                  flex: 1,
                                  padding: '4px 8px',
                                  backgroundColor: 'rgba(34, 197, 94, 0.2)',
                                  border: '1px solid #22c55e',
                                  borderRadius: '4px',
                                  color: '#22c55e',
                                  fontSize: '12px',
                                  cursor: 'pointer',
                                }}
                              >
                                Save
                              </button>
                              <button
                                onClick={() => setEditingPatternId(null)}
                                style={{
                                  flex: 1,
                                  padding: '4px 8px',
                                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                  border: '1px solid var(--border)',
                                  borderRadius: '4px',
                                  color: 'var(--text)',
                                  fontSize: '12px',
                                  cursor: 'pointer',
                                }}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                              {getTopologyString(pattern.topology)} → {PROMPT_ARCHETYPE_NAMES[pattern.promptIndex]}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                              {matchingCount} matching node{matchingCount !== 1 ? 's' : ''}
                            </div>
                          </>
                        )}
                      </div>
                      {editingPatternId !== pattern.id && (
                        <div style={{ display: 'flex', gap: '4px', flexDirection: 'column' }}>
                          <button
                            onClick={() => {
                              setEditingPatternId(pattern.id);
                              setEditingPromptIndex(pattern.promptIndex);
                            }}
                            style={{
                              padding: '4px 8px',
                              backgroundColor: 'rgba(59, 130, 246, 0.2)',
                              border: '1px solid #3b82f6',
                              borderRadius: '4px',
                              color: '#3b82f6',
                              fontSize: '12px',
                              cursor: 'pointer',
                            }}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => deletePattern(pattern.id)}
                            style={{
                              padding: '4px 8px',
                              backgroundColor: 'rgba(239, 68, 68, 0.2)',
                              border: '1px solid #ef4444',
                              borderRadius: '4px',
                              color: '#ef4444',
                              fontSize: '12px',
                              cursor: 'pointer',
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Clear Selection Button */}
      {selectedNodes.size > 0 && (
        <button
          onClick={clearSelectedNodes}
          style={{
            width: '100%',
            marginTop: '12px',
            padding: '8px',
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid var(--border)',
            borderRadius: '4px',
            color: 'var(--text)',
            fontSize: '14px',
            cursor: 'pointer',
          }}
        >
          Clear Selection
        </button>
      )}
    </div>
  );
}
