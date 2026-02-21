'use client';

import React, { useState, useMemo } from 'react';
import { useDungeonStore, getTopologyKey } from '@/lib/dungeon/store';
import { RoomType, DungeonNode } from '@/lib/dungeon/types';
import { getExits } from '@/lib/dungeon/generator';
import { PROMPT_ARCHETYPE_NAMES } from '@/lib/dungeon/prompt-logic';
import { NodePromptManager } from './NodePromptManager';

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
    COMBAT: 'Combat',
  };
  return displayNames[roomType] || roomType;
}

interface NodeRowData {
  nodeId: string;
  node: DungeonNode;
  roomType: string;
  topology: string;
  hasManualPromptIndex: boolean;
  hasCustomText: boolean;
  promptIndex: number | null;
  isConfigured: boolean;
  exits: { north: boolean; south: boolean; east: boolean; west: boolean };
}

type WizardStep = 'overview' | 'select' | 'method' | 'configure' | 'review';

type ConfigurationMethod = 'standard' | 'custom' | null;

export function NodesManager() {
  const nodes = useDungeonStore((state) => state.nodes);
  const getManualPromptIndexOverride = useDungeonStore((state) => state.getManualPromptIndexOverride);
  const getNodePromptOverride = useDungeonStore((state) => state.getNodePromptOverride);
  const setManualPromptIndexOverride = useDungeonStore((state) => state.setManualPromptIndexOverride);
  const setNodePromptOverride = useDungeonStore((state) => state.setNodePromptOverride);

  const [wizardStep, setWizardStep] = useState<WizardStep>('overview');
  const [selectedNodeIds, setSelectedNodeIds] = useState<Set<string>>(new Set());
  const [configMethod, setConfigMethod] = useState<ConfigurationMethod>(null);
  const [selectedPromptIndex, setSelectedPromptIndex] = useState<number | null>(null);
  const [customPromptText, setCustomPromptText] = useState<string>('');
  const [showUnconfiguredOnly, setShowUnconfiguredOnly] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Process all nodes into row data
  const nodeRows = useMemo(() => {
    const rows: NodeRowData[] = [];
    
    nodes.forEach((node, nodeId) => {
      const exits = getExits(nodeId, nodes);
      const topology = getTopologyKey(exits);
      
      const manualPromptIndex = getManualPromptIndexOverride(topology);
      const customText = getNodePromptOverride(nodeId);
      
      const hasManualPromptIndex = manualPromptIndex !== null;
      const hasCustomText = customText !== null && customText.trim() !== '';
      
      const isConfigured = hasManualPromptIndex || hasCustomText;
      
      rows.push({
        nodeId,
        node,
        roomType: getRoomTypeDisplayName(node.type),
        topology,
        hasManualPromptIndex,
        hasCustomText,
        promptIndex: manualPromptIndex,
        isConfigured,
        exits,
      });
    });
    
    return rows.sort((a, b) => {
      if (a.isConfigured !== b.isConfigured) {
        return a.isConfigured ? 1 : -1; // Unconfigured first
      }
      if (a.roomType !== b.roomType) {
        return a.roomType.localeCompare(b.roomType);
      }
      return a.nodeId.localeCompare(b.nodeId);
    });
  }, [nodes, getManualPromptIndexOverride, getNodePromptOverride]);

  // Filter nodes
  const filteredRows = useMemo(() => {
    let filtered = nodeRows;
    
    if (showUnconfiguredOnly) {
      filtered = filtered.filter(row => !row.isConfigured);
    }
    
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(row => 
        row.nodeId.toLowerCase().includes(query) ||
        row.roomType.toLowerCase().includes(query) ||
        row.topology.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  }, [nodeRows, showUnconfiguredOnly, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const total = nodeRows.length;
    const configured = nodeRows.filter(r => r.isConfigured).length;
    const unconfigured = total - configured;
    
    return { total, configured, unconfigured };
  }, [nodeRows]);

  // Visual Topology Component
  const TopologyVisual = ({ exits }: { exits: { north: boolean; south: boolean; east: boolean; west: boolean } }) => {
    const size = 60;
    const center = size / 2;
    const arrowLength = 20;
    
    return (
      <svg width={size} height={size} style={{ display: 'block' }}>
        {/* Room center */}
        <circle cx={center} cy={center} r={8} fill="var(--text-muted)" opacity={0.3} />
        
        {/* North arrow */}
        <line
          x1={center} y1={0}
          x2={center} y2={exits.north ? arrowLength : 12}
          stroke={exits.north ? '#22c55e' : 'var(--text-muted)'}
          strokeWidth={exits.north ? 3 : 1}
          opacity={exits.north ? 1 : 0.3}
        />
        {exits.north && (
          <polygon
            points={`${center},${arrowLength} ${center - 4},${arrowLength + 8} ${center + 4},${arrowLength + 8}`}
            fill="#22c55e"
          />
        )}
        <text x={center} y={exits.north ? 8 : 6} fontSize="8" fill={exits.north ? '#22c55e' : 'var(--text-muted)'} textAnchor="middle" opacity={exits.north ? 1 : 0.5}>N</text>
        
        {/* South arrow */}
        <line
          x1={center} y1={size}
          x2={center} y2={exits.south ? size - arrowLength : size - 12}
          stroke={exits.south ? '#22c55e' : 'var(--text-muted)'}
          strokeWidth={exits.south ? 3 : 1}
          opacity={exits.south ? 1 : 0.3}
        />
        {exits.south && (
          <polygon
            points={`${center},${size - arrowLength} ${center - 4},${size - arrowLength - 8} ${center + 4},${size - arrowLength - 8}`}
            fill="#22c55e"
          />
        )}
        <text x={center} y={size - (exits.south ? 4 : 2)} fontSize="8" fill={exits.south ? '#22c55e' : 'var(--text-muted)'} textAnchor="middle" opacity={exits.south ? 1 : 0.5}>S</text>
        
        {/* East arrow */}
        <line
          x1={size} y1={center}
          x2={exits.east ? size - arrowLength : size - 12} y2={center}
          stroke={exits.east ? '#22c55e' : 'var(--text-muted)'}
          strokeWidth={exits.east ? 3 : 1}
          opacity={exits.east ? 1 : 0.3}
        />
        {exits.east && (
          <polygon
            points={`${size - arrowLength},${center} ${size - arrowLength - 8},${center - 4} ${size - arrowLength - 8},${center + 4}`}
            fill="#22c55e"
          />
        )}
        <text x={size - (exits.east ? 2 : 4)} y={center + 3} fontSize="8" fill={exits.east ? '#22c55e' : 'var(--text-muted)'} textAnchor="middle" opacity={exits.east ? 1 : 0.5}>E</text>
        
        {/* West arrow */}
        <line
          x1={0} y1={center}
          x2={exits.west ? arrowLength : 12} y2={center}
          stroke={exits.west ? '#22c55e' : 'var(--text-muted)'}
          strokeWidth={exits.west ? 3 : 1}
          opacity={exits.west ? 1 : 0.3}
        />
        {exits.west && (
          <polygon
            points={`${arrowLength},${center} ${arrowLength + 8},${center - 4} ${arrowLength + 8},${center + 4}`}
            fill="#22c55e"
          />
        )}
        <text x={exits.west ? 8 : 6} y={center + 3} fontSize="8" fill={exits.west ? '#22c55e' : 'var(--text-muted)'} textAnchor="middle" opacity={exits.west ? 1 : 0.5}>W</text>
      </svg>
    );
  };

  // Node Card Component
  const NodeCard = ({ row, isSelected, onToggle }: { row: NodeRowData; isSelected: boolean; onToggle: () => void }) => {
    return (
      <div
        onClick={onToggle}
        style={{
          padding: '16px',
          backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.2)' : 'var(--bg-panel)',
          border: `2px solid ${isSelected ? '#3b82f6' : row.isConfigured ? '#22c55e' : '#ef4444'}`,
          borderRadius: '8px',
          cursor: 'pointer',
          transition: 'all 0.2s',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
        }}
        onMouseEnter={(e) => {
          if (!isSelected) {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
          }
        }}
        onMouseLeave={(e) => {
          if (!isSelected) {
            e.currentTarget.style.backgroundColor = 'var(--bg-panel)';
          }
        }}
      >
        <div style={{ fontSize: '24px' }}>
          {isSelected ? '✓' : row.isConfigured ? '✓' : '○'}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '4px' }}>
            {row.nodeId}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{
              padding: '2px 8px',
              backgroundColor: 'var(--bg-dark)',
              borderRadius: '4px',
              fontSize: '11px',
            }}>
              {row.roomType}
            </span>
            <span style={{ color: 'var(--text-muted)' }}>•</span>
            <span>{row.topology}</span>
            {row.promptIndex !== null && (
              <>
                <span style={{ color: 'var(--text-muted)' }}>•</span>
                <span style={{ color: '#22c55e' }}>
                  Prompt: {row.promptIndex} ({PROMPT_ARCHETYPE_NAMES[row.promptIndex]})
                </span>
              </>
            )}
          </div>
        </div>
        <div>
          <TopologyVisual exits={row.exits} />
        </div>
      </div>
    );
  };

  // Quick Actions
  const handleQuickConfigureByTopology = (topology: string) => {
    const nodesWithTopology = filteredRows.filter(r => r.topology === topology);
    setSelectedNodeIds(new Set(nodesWithTopology.map(r => r.nodeId)));
    setWizardStep('select');
  };

  const handleQuickConfigureByRoomType = (roomType: RoomType) => {
    const nodesWithType = filteredRows.filter(r => r.node.type === roomType);
    setSelectedNodeIds(new Set(nodesWithType.map(r => r.nodeId)));
    setWizardStep('select');
  };

  const handleSelectAllUnconfigured = () => {
    setSelectedNodeIds(new Set(filteredRows.map(r => r.nodeId)));
  };

  const handleStartConfiguration = () => {
    setSelectedNodeIds(new Set(filteredRows.map(r => r.nodeId)));
    setWizardStep('select');
  };

  const handleNextStep = () => {
    if (wizardStep === 'select') {
      if (selectedNodeIds.size === 0) {
        alert('Please select at least one node to configure.');
        return;
      }
      setWizardStep('method');
    } else if (wizardStep === 'method') {
      if (!configMethod) {
        alert('Please select a configuration method.');
        return;
      }
      setWizardStep('configure');
    } else if (wizardStep === 'configure') {
      if (configMethod === 'standard' && selectedPromptIndex === null) {
        alert('Please select a prompt index.');
        return;
      }
      if (configMethod === 'custom' && customPromptText.trim() === '') {
        alert('Please enter a custom prompt.');
        return;
      }
      setWizardStep('review');
    }
  };

  const handleConfirm = () => {
    // Group selected nodes by topology
    const topologyGroups = new Map<string, string[]>();
    selectedNodeIds.forEach(nodeId => {
      const row = nodeRows.find(r => r.nodeId === nodeId);
      if (row) {
        if (!topologyGroups.has(row.topology)) {
          topologyGroups.set(row.topology, []);
        }
        topologyGroups.get(row.topology)!.push(nodeId);
      }
    });

    if (configMethod === 'standard' && selectedPromptIndex !== null) {
      // Apply prompt index override to each topology
      topologyGroups.forEach((nodeIds, topology) => {
        setManualPromptIndexOverride(topology, selectedPromptIndex);
      });
    } else if (configMethod === 'custom' && customPromptText.trim() !== '') {
      // Apply custom text to each node
      selectedNodeIds.forEach(nodeId => {
        setNodePromptOverride(nodeId, customPromptText.trim());
      });
    }

    // Reset wizard
    setSelectedNodeIds(new Set());
    setConfigMethod(null);
    setSelectedPromptIndex(null);
    setCustomPromptText('');
    setWizardStep('overview');
  };

  const handleBack = () => {
    if (wizardStep === 'method') {
      setWizardStep('select');
    } else if (wizardStep === 'configure') {
      setWizardStep('method');
    } else if (wizardStep === 'review') {
      setWizardStep('configure');
    }
  };

  // Get unique topologies and room types for quick actions
  const uniqueTopologies = useMemo(() => {
    const topologies = new Set<string>();
    filteredRows.forEach(row => topologies.add(row.topology));
    return Array.from(topologies).sort();
  }, [filteredRows]);

  const uniqueRoomTypes = useMemo(() => {
    const types = new Set<RoomType>();
    filteredRows.forEach(row => types.add(row.node.type));
    return Array.from(types).sort();
  }, [filteredRows]);

  // Render based on wizard step
  if (wizardStep === 'overview') {
    return (
      <div style={{ 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column',
        backgroundColor: 'var(--bg-dark)',
        color: 'var(--text)',
        padding: '24px',
        overflow: 'auto'
      }}>
        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ 
            margin: '0 0 8px 0', 
            fontSize: '28px', 
            fontWeight: 'bold',
            color: 'var(--gold)',
            textTransform: 'uppercase',
            letterSpacing: '1px'
          }}>
            Nodes Manager
          </h2>
          <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
            Configure your dungeon nodes step-by-step. We'll guide you through the process.
          </div>
        </div>

        {/* Statistics */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(3, 1fr)', 
          gap: '16px', 
          marginBottom: '24px'
        }}>
          <div style={{
            padding: '20px',
            backgroundColor: 'var(--bg-panel)',
            borderRadius: '8px',
            border: '1px solid var(--border)',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '8px' }}>Total Nodes</div>
            <div style={{ fontSize: '32px', fontWeight: 'bold' }}>{stats.total}</div>
          </div>
          <div style={{
            padding: '20px',
            backgroundColor: 'var(--bg-panel)',
            borderRadius: '8px',
            border: '1px solid var(--border)',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '8px' }}>Configured</div>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#22c55e' }}>{stats.configured}</div>
          </div>
          <div style={{
            padding: '20px',
            backgroundColor: 'var(--bg-panel)',
            borderRadius: '8px',
            border: '1px solid var(--border)',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '8px' }}>Need Configuration</div>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#ef4444' }}>{stats.unconfigured}</div>
          </div>
        </div>

        {/* Quick Actions */}
        {stats.unconfigured > 0 && (
          <div style={{
            padding: '20px',
            backgroundColor: 'var(--bg-panel)',
            borderRadius: '8px',
            border: '1px solid var(--border)',
            marginBottom: '24px'
          }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 'bold' }}>Quick Actions</h3>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
              <button
                onClick={handleStartConfiguration}
                style={{
                  padding: '12px 24px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  backgroundColor: '#ef4444',
                  border: 'none',
                  borderRadius: '8px',
                  color: 'white',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#dc2626';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#ef4444';
                }}
              >
                Start Configuration ({stats.unconfigured} nodes)
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <label style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Configure by Topology:</label>
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      handleQuickConfigureByTopology(e.target.value);
                    }
                  }}
                  defaultValue=""
                  style={{
                    padding: '8px 12px',
                    fontSize: '14px',
                    backgroundColor: 'var(--bg-dark)',
                    border: '1px solid var(--border)',
                    borderRadius: '4px',
                    color: 'var(--text)',
                    cursor: 'pointer',
                  }}
                >
                  <option value="">Select topology...</option>
                  {uniqueTopologies.map(topo => (
                    <option key={topo} value={topo}>{topo}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <label style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Configure by Type:</label>
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      handleQuickConfigureByRoomType(e.target.value as RoomType);
                    }
                  }}
                  defaultValue=""
                  style={{
                    padding: '8px 12px',
                    fontSize: '14px',
                    backgroundColor: 'var(--bg-dark)',
                    border: '1px solid var(--border)',
                    borderRadius: '4px',
                    color: 'var(--text)',
                    cursor: 'pointer',
                  }}
                >
                  <option value="">Select room type...</option>
                  {uniqueRoomTypes.map(type => (
                    <option key={type} value={type}>{getRoomTypeDisplayName(type)}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div style={{
          padding: '16px',
          backgroundColor: 'var(--bg-panel)',
          borderRadius: '8px',
          border: '1px solid var(--border)',
          marginBottom: '24px',
          display: 'flex',
          gap: '16px',
          alignItems: 'center',
          flexWrap: 'wrap'
        }}>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by node ID, room type, or topology..."
              style={{
                width: '100%',
                padding: '10px 12px',
                fontSize: '14px',
                backgroundColor: 'var(--bg-dark)',
                border: '1px solid var(--border)',
                borderRadius: '4px',
                color: 'var(--text)',
              }}
            />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={showUnconfiguredOnly}
              onChange={(e) => setShowUnconfiguredOnly(e.target.checked)}
              style={{ cursor: 'pointer', width: '18px', height: '18px' }}
            />
            Show only unconfigured nodes
          </label>
        </div>

        {/* Node Cards */}
        {filteredRows.length === 0 ? (
          <div style={{
            padding: '40px',
            textAlign: 'center',
            color: 'var(--text-muted)',
            fontSize: '16px'
          }}>
            {showUnconfiguredOnly ? 'All nodes are configured! 🎉' : 'No nodes match your search.'}
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))',
            gap: '16px'
          }}>
            {filteredRows.map(row => (
              <div
                key={row.nodeId}
                onClick={() => setSelectedNodeId(row.nodeId)}
                style={{
                  padding: '16px',
                  backgroundColor: 'var(--bg-panel)',
                  border: `2px solid ${row.isConfigured ? '#22c55e' : '#ef4444'}`,
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--bg-panel)';
                }}
              >
                <div style={{ fontSize: '24px', color: row.isConfigured ? '#22c55e' : '#ef4444' }}>
                  {row.isConfigured ? '✓' : '○'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '4px' }}>
                    {row.nodeId}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{
                      padding: '2px 8px',
                      backgroundColor: 'var(--bg-dark)',
                      borderRadius: '4px',
                      fontSize: '11px',
                    }}>
                      {row.roomType}
                    </span>
                    <span style={{ color: 'var(--text-muted)' }}>•</span>
                    <span>{row.topology}</span>
                    {row.promptIndex !== null && (
                      <>
                        <span style={{ color: 'var(--text-muted)' }}>•</span>
                        <span style={{ color: '#22c55e', fontSize: '11px' }}>
                          {PROMPT_ARCHETYPE_NAMES[row.promptIndex]}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <div>
                  <TopologyVisual exits={row.exits} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Node Detail Editor Modal */}
        {selectedNodeId && (
          <NodePromptManager
            nodeId={selectedNodeId}
            onClose={() => setSelectedNodeId(null)}
          />
        )}
      </div>
    );
  }

  // Wizard Steps
  const stepTitles = {
    select: 'Step 1: Select Nodes',
    method: 'Step 2: Choose Method',
    configure: 'Step 3: Configure',
    review: 'Step 4: Review & Confirm',
  };

  const stepNumber = wizardStep === 'select' ? 1 : wizardStep === 'method' ? 2 : wizardStep === 'configure' ? 3 : 4;

  return (
    <div style={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      backgroundColor: 'var(--bg-dark)',
      color: 'var(--text)',
      padding: '24px',
      overflow: 'auto'
    }}>
      {/* Progress Indicator */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          {[1, 2, 3, 4].map((step) => (
            <React.Fragment key={step}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                backgroundColor: step <= stepNumber ? '#3b82f6' : 'var(--bg-panel)',
                color: step <= stepNumber ? 'white' : 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold',
                border: step === stepNumber ? '3px solid #60a5fa' : '2px solid var(--border)',
              }}>
                {step < stepNumber ? '✓' : step}
              </div>
              {step < 4 && (
                <div style={{
                  flex: 1,
                  height: '2px',
                  backgroundColor: step < stepNumber ? '#3b82f6' : 'var(--border)',
                }} />
              )}
            </React.Fragment>
          ))}
        </div>
        <h2 style={{ margin: '0', fontSize: '24px', fontWeight: 'bold' }}>
          {stepTitles[wizardStep]}
        </h2>
      </div>

      {/* Step 1: Select Nodes */}
      {wizardStep === 'select' && (
        <div>
          <div style={{ marginBottom: '16px', padding: '16px', backgroundColor: 'var(--bg-panel)', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <p style={{ margin: '0 0 12px 0', fontSize: '14px', color: 'var(--text-muted)' }}>
              Select the nodes you want to configure. You can click individual cards or use the buttons below.
            </p>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <button
                onClick={handleSelectAllUnconfigured}
                style={{
                  padding: '8px 16px',
                  fontSize: '14px',
                  backgroundColor: 'var(--bg-dark)',
                  border: '1px solid var(--border)',
                  borderRadius: '4px',
                  color: 'var(--text)',
                  cursor: 'pointer',
                }}
              >
                Select All ({filteredRows.length} nodes)
              </button>
              <button
                onClick={() => setSelectedNodeIds(new Set())}
                style={{
                  padding: '8px 16px',
                  fontSize: '14px',
                  backgroundColor: 'var(--bg-dark)',
                  border: '1px solid var(--border)',
                  borderRadius: '4px',
                  color: 'var(--text)',
                  cursor: 'pointer',
                }}
              >
                Clear Selection
              </button>
              <div style={{ flex: 1, textAlign: 'right', padding: '8px 0', fontSize: '14px', color: 'var(--text-muted)' }}>
                {selectedNodeIds.size} node(s) selected
              </div>
            </div>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))',
            gap: '16px',
            marginBottom: '24px'
          }}>
            {filteredRows.map(row => (
              <NodeCard
                key={row.nodeId}
                row={row}
                isSelected={selectedNodeIds.has(row.nodeId)}
                onToggle={() => {
                  const newSelected = new Set(selectedNodeIds);
                  if (newSelected.has(row.nodeId)) {
                    newSelected.delete(row.nodeId);
                  } else {
                    newSelected.add(row.nodeId);
                  }
                  setSelectedNodeIds(newSelected);
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Step 2: Choose Method */}
      {wizardStep === 'method' && (
        <div>
          <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: 'var(--bg-panel)', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: 'var(--text-muted)' }}>
              Choose how you want to configure the selected nodes:
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div
                onClick={() => setConfigMethod('standard')}
                style={{
                  padding: '20px',
                  backgroundColor: configMethod === 'standard' ? 'rgba(59, 130, 246, 0.2)' : 'var(--bg-dark)',
                  border: `2px solid ${configMethod === 'standard' ? '#3b82f6' : 'var(--border)'}`,
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px' }}>
                  Use Standard Prompt
                </div>
                <div style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  Select from predefined prompt templates (0-11). Recommended for most cases.
                </div>
                <div style={{ fontSize: '12px', color: '#22c55e' }}>
                  ✓ Easy to use<br />
                  ✓ Consistent results<br />
                  ✓ Works with topology
                </div>
              </div>
              <div
                onClick={() => setConfigMethod('custom')}
                style={{
                  padding: '20px',
                  backgroundColor: configMethod === 'custom' ? 'rgba(59, 130, 246, 0.2)' : 'var(--bg-dark)',
                  border: `2px solid ${configMethod === 'custom' ? '#3b82f6' : 'var(--border)'}`,
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px' }}>
                  Set Custom Prompt
                </div>
                <div style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  Write your own custom prompt text. Use this for special cases.
                </div>
                <div style={{ fontSize: '12px', color: '#f59e0b' }}>
                  ⚠ Advanced option<br />
                  ⚠ Requires prompt knowledge<br />
                  ⚠ More control
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Configure */}
      {wizardStep === 'configure' && (
        <div>
          <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: 'var(--bg-panel)', borderRadius: '8px', border: '1px solid var(--border)' }}>
            {configMethod === 'standard' ? (
              <>
                <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: 'var(--text-muted)' }}>
                  Select a prompt template. This will apply to all {selectedNodeIds.size} selected node(s).
                </p>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 'bold' }}>
                  Prompt Template:
                </label>
                <select
                  value={selectedPromptIndex ?? ''}
                  onChange={(e) => setSelectedPromptIndex(e.target.value ? parseInt(e.target.value) : null)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    fontSize: '16px',
                    backgroundColor: 'var(--bg-dark)',
                    border: '1px solid var(--border)',
                    borderRadius: '4px',
                    color: 'var(--text)',
                    cursor: 'pointer',
                  }}
                >
                  <option value="">Select a prompt template...</option>
                  {PROMPT_ARCHETYPE_NAMES.map((name, index) => (
                    <option key={index} value={index}>
                      {index}: {name}
                    </option>
                  ))}
                </select>
                {selectedPromptIndex !== null && (
                  <div style={{ marginTop: '12px', padding: '12px', backgroundColor: 'var(--bg-dark)', borderRadius: '4px', fontSize: '12px', color: 'var(--text-muted)' }}>
                    <strong>Selected:</strong> {PROMPT_ARCHETYPE_NAMES[selectedPromptIndex]}
                  </div>
                )}
              </>
            ) : (
              <>
                <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: 'var(--text-muted)' }}>
                  Enter your custom prompt. This will apply to all {selectedNodeIds.size} selected node(s).
                </p>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 'bold' }}>
                  Custom Prompt:
                </label>
                <textarea
                  value={customPromptText}
                  onChange={(e) => setCustomPromptText(e.target.value)}
                  placeholder="Enter your custom prompt here..."
                  style={{
                    width: '100%',
                    minHeight: '200px',
                    padding: '12px',
                    fontSize: '14px',
                    backgroundColor: 'var(--bg-dark)',
                    border: '1px solid var(--border)',
                    borderRadius: '4px',
                    color: 'var(--text)',
                    fontFamily: 'monospace',
                    resize: 'vertical',
                  }}
                />
              </>
            )}
          </div>
        </div>
      )}

      {/* Step 4: Review & Confirm */}
      {wizardStep === 'review' && (
        <div>
          <div style={{ marginBottom: '24px', padding: '20px', backgroundColor: 'var(--bg-panel)', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 'bold' }}>Review Configuration</h3>
            <div style={{ marginBottom: '12px' }}>
              <strong>Nodes to configure:</strong> {selectedNodeIds.size} node(s)
            </div>
            <div style={{ marginBottom: '12px' }}>
              <strong>Method:</strong> {configMethod === 'standard' ? 'Standard Prompt' : 'Custom Prompt'}
            </div>
            {configMethod === 'standard' && selectedPromptIndex !== null && (
              <div style={{ marginBottom: '12px' }}>
                <strong>Prompt Template:</strong> {selectedPromptIndex} - {PROMPT_ARCHETYPE_NAMES[selectedPromptIndex]}
              </div>
            )}
            {configMethod === 'custom' && (
              <div style={{ marginBottom: '12px' }}>
                <strong>Custom Prompt Preview:</strong>
                <div style={{ marginTop: '8px', padding: '12px', backgroundColor: 'var(--bg-dark)', borderRadius: '4px', fontSize: '12px', color: 'var(--text-muted)', maxHeight: '150px', overflow: 'auto' }}>
                  {customPromptText.substring(0, 200)}{customPromptText.length > 200 ? '...' : ''}
                </div>
              </div>
            )}
            <div style={{ marginTop: '16px', padding: '12px', backgroundColor: 'rgba(59, 130, 246, 0.1)', borderRadius: '4px', fontSize: '12px', color: 'var(--text-muted)' }}>
              <strong>Note:</strong> This configuration will apply to all selected nodes. Nodes with the same topology will share the same prompt index override.
            </div>
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'auto', paddingTop: '24px' }}>
        <button
          onClick={wizardStep === 'select' ? () => setWizardStep('overview') : handleBack}
          style={{
            padding: '12px 24px',
            fontSize: '16px',
            backgroundColor: 'var(--bg-panel)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            color: 'var(--text)',
            cursor: 'pointer',
          }}
        >
          {wizardStep === 'select' ? 'Back to Overview' : 'Back'}
        </button>
        <div style={{ display: 'flex', gap: '12px' }}>
          {wizardStep !== 'review' ? (
            <button
              onClick={handleNextStep}
              style={{
                padding: '12px 24px',
                fontSize: '16px',
                fontWeight: 'bold',
                backgroundColor: '#3b82f6',
                border: 'none',
                borderRadius: '8px',
                color: 'white',
                cursor: 'pointer',
              }}
            >
              Next →
            </button>
          ) : (
            <button
              onClick={handleConfirm}
              style={{
                padding: '12px 24px',
                fontSize: '16px',
                fontWeight: 'bold',
                backgroundColor: '#22c55e',
                border: 'none',
                borderRadius: '8px',
                color: 'white',
                cursor: 'pointer',
              }}
            >
              ✓ Confirm & Apply
            </button>
          )}
        </div>
      </div>

      {/* Node Detail Editor Modal */}
      {selectedNodeId && (
        <NodePromptManager
          nodeId={selectedNodeId}
          onClose={() => setSelectedNodeId(null)}
        />
      )}
    </div>
  );
}
