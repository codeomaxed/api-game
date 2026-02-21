'use client';

import React, { useMemo, useState } from 'react';
import { useDungeonStore } from '@/lib/dungeon/store';
import { DungeonNode } from '@/lib/dungeon/types';
import { NodePromptManager } from './NodePromptManager';
import { getExits } from '@/lib/dungeon/generator';

const CELL_SIZE = 80; // Increased spacing between nodes for better visibility
const GRID_W = 12;
const GRID_H = 12; // Reduced from 20 to make SVG smaller and fit better in viewport

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

// Node styling constants (scaled for medium map - 10% smaller than before)
const NODE_RADIUS_BASE = 27; // Base radius for normal nodes (10% smaller: 30 * 0.9)
const NODE_RADIUS_BOSS = 38; // Boss nodes are larger (10% smaller: 42 * 0.9)
const LABEL_OFFSET = 20; // Distance above node for labels
// Calculate offset dynamically based on actual node positions to keep them visible near bottom
// This will be calculated in the component based on visible nodes

/**
 * Calculate orthogonal (Manhattan-style) path between two points
 * Returns array of waypoints for a polyline with 90-degree turns
 */
function calculateOrthogonalPath(
  from: { x: number; y: number },
  to: { x: number; y: number }
): Array<{ x: number; y: number }> {
  const waypoints: Array<{ x: number; y: number }> = [from];
  
  // Strategy: Move horizontally first, then vertically
  // This creates a cleaner visual flow for left-to-right progression
  if (from.x !== to.x) {
    waypoints.push({ x: to.x, y: from.y });
  }
  
  if (from.y !== to.y) {
    waypoints.push(to);
  }
  
  return waypoints;
}

/**
 * Calculate the point on a line segment that's at a given distance from the start point
 * Used to find where the line should stop at the edge of a circle
 */
function getPointOnLineAtDistance(
  start: { x: number; y: number },
  end: { x: number; y: number },
  distance: number
): { x: number; y: number } {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const totalDistance = Math.sqrt(dx * dx + dy * dy);
  
  if (totalDistance === 0) return start;
  
  const ratio = distance / totalDistance;
  return {
    x: start.x + dx * ratio,
    y: start.y + dy * ratio,
  };
}

/**
 * Calculate edge points where line should connect to squares
 * Returns adjusted start and end points that stop at square edges
 */
function calculateEdgePoints(
  from: { x: number; y: number },
  to: { x: number; y: number },
  fromRadius: number,
  toRadius: number
): { start: { x: number; y: number }; end: { x: number; y: number } } {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  if (distance === 0) {
    return { start: from, end: to };
  }
  
  // For squares, we need to find where the line intersects the square's perimeter
  // Square extends from (center - radius) to (center + radius) in both dimensions
  
  // Calculate intersection point for the "from" square
  const fromEdge = getSquareEdgeIntersection(from, to, fromRadius);
  
  // Calculate intersection point for the "to" square (reverse direction)
  const toEdge = getSquareEdgeIntersection(to, from, toRadius);
  
  return { start: fromEdge, end: toEdge };
}

/**
 * Find where a line from center to target intersects a square's edge
 */
function getSquareEdgeIntersection(
  center: { x: number; y: number },
  target: { x: number; y: number },
  radius: number
): { x: number; y: number } {
  const dx = target.x - center.x;
  const dy = target.y - center.y;
  
  if (dx === 0 && dy === 0) {
    return center;
  }
  
  // Square bounds
  const left = center.x - radius;
  const right = center.x + radius;
  const top = center.y - radius;
  const bottom = center.y + radius;
  
  // Calculate intersection with each edge
  // We'll find which edge the line hits first
  
  let t = Infinity;
  let intersectionX = target.x;
  let intersectionY = target.y;
  
  // Check intersection with left edge
  if (dx < 0) {
    const tLeft = (left - center.x) / dx;
    const yAtLeft = center.y + dy * tLeft;
    if (yAtLeft >= top && yAtLeft <= bottom && tLeft > 0 && tLeft < t) {
      t = tLeft;
      intersectionX = left;
      intersectionY = yAtLeft;
    }
  }
  
  // Check intersection with right edge
  if (dx > 0) {
    const tRight = (right - center.x) / dx;
    const yAtRight = center.y + dy * tRight;
    if (yAtRight >= top && yAtRight <= bottom && tRight > 0 && tRight < t) {
      t = tRight;
      intersectionX = right;
      intersectionY = yAtRight;
    }
  }
  
  // Check intersection with top edge
  if (dy < 0) {
    const tTop = (top - center.y) / dy;
    const xAtTop = center.x + dx * tTop;
    if (xAtTop >= left && xAtTop <= right && tTop > 0 && tTop < t) {
      t = tTop;
      intersectionX = xAtTop;
      intersectionY = top;
    }
  }
  
  // Check intersection with bottom edge
  if (dy > 0) {
    const tBottom = (bottom - center.y) / dy;
    const xAtBottom = center.x + dx * tBottom;
    if (xAtBottom >= left && xAtBottom <= right && tBottom > 0 && tBottom < t) {
      t = tBottom;
      intersectionX = xAtBottom;
      intersectionY = bottom;
    }
  }
  
  return { x: intersectionX, y: intersectionY };
}

/**
 * Get node styling based on type and state
 */
function getNodeStyle(
  node: DungeonNode,
  isCurrent: boolean,
  isVisited: boolean
): {
  fill: string;
  stroke: string;
  strokeWidth: number;
  radius: number;
  glow?: { color: string; blur: number };
} {
  // Current node (player location)
  if (isCurrent) {
    return {
      fill: '#4ade80', // Vibrant green
      stroke: 'none',
      strokeWidth: 0,
      radius: NODE_RADIUS_BASE,
    };
  }

  // Handle special room types
  switch (node.type) {
    case 'BOSS':
      if (isVisited) {
        // Visited: Solid red fill
        return {
          fill: '#ef4444',
          stroke: 'none',
          strokeWidth: 0,
          radius: NODE_RADIUS_BOSS,
          glow: { color: '#ef4444', blur: 8 },
        };
      } else {
        // Unvisited: Hollow red border
        return {
          fill: 'none',
          stroke: '#ef4444',
          strokeWidth: 3,
          radius: NODE_RADIUS_BOSS,
          glow: { color: '#ef4444', blur: 8 },
        };
      }
    case 'TREASURE':
      if (isVisited) {
        // Visited: Solid golden/yellow fill
        return {
          fill: '#eab308',
          stroke: 'none',
          strokeWidth: 0,
          radius: NODE_RADIUS_BASE,
          glow: { color: '#eab308', blur: 4 },
        };
      } else {
        // Unvisited: Hollow golden/yellow border
        return {
          fill: 'none',
          stroke: '#eab308',
          strokeWidth: 3,
          radius: NODE_RADIUS_BASE,
          glow: { color: '#eab308', blur: 4 },
        };
      }
    case 'MERCHANT':
      if (isVisited) {
        // Visited: Solid orange fill
        return {
          fill: '#f97316',
          stroke: 'none',
          strokeWidth: 0,
          radius: NODE_RADIUS_BASE,
        };
      } else {
        // Unvisited: Hollow orange border
        return {
          fill: 'none',
          stroke: '#f97316',
          strokeWidth: 3,
          radius: NODE_RADIUS_BASE,
        };
      }
    case 'EVENT':
      if (isVisited) {
        // Visited: Solid purple fill
        return {
          fill: '#a855f7',
          stroke: 'none',
          strokeWidth: 0,
          radius: NODE_RADIUS_BASE,
          glow: { color: '#a855f7', blur: 4 },
        };
      } else {
        // Unvisited: Hollow purple border
        return {
          fill: 'none',
          stroke: '#a855f7',
          strokeWidth: 3,
          radius: NODE_RADIUS_BASE,
          glow: { color: '#a855f7', blur: 4 },
        };
      }
    case 'COMBAT':
      if (isVisited) {
        // Visited: Solid dark red fill
        return {
          fill: '#dc2626',
          stroke: 'none',
          strokeWidth: 0,
          radius: NODE_RADIUS_BASE,
          glow: { color: '#dc2626', blur: 4 },
        };
      } else {
        // Unvisited: Hollow dark red border
        return {
          fill: 'none',
          stroke: '#dc2626',
          strokeWidth: 3,
          radius: NODE_RADIUS_BASE,
          glow: { color: '#dc2626', blur: 4 },
        };
      }
    case 'TRAP':
      if (isVisited) {
        // Visited: Solid red fill
        return {
          fill: '#dc2626',
          stroke: 'none',
          strokeWidth: 0,
          radius: NODE_RADIUS_BASE,
          glow: { color: '#dc2626', blur: 4 },
        };
      } else {
        // Unvisited: Hollow red border
        return {
          fill: 'none',
          stroke: '#dc2626',
          strokeWidth: 3,
          radius: NODE_RADIUS_BASE,
          glow: { color: '#dc2626', blur: 4 },
        };
      }
    case 'START':
      if (isVisited) {
        // Visited: Solid white fill (only current node should be green)
        return {
          fill: '#FFFFFF',
          stroke: 'none',
          strokeWidth: 0,
          radius: NODE_RADIUS_BASE,
        };
      } else {
        // Unvisited: Hollow white border
        return {
          fill: 'none',
          stroke: '#FFFFFF',
          strokeWidth: 3,
          radius: NODE_RADIUS_BASE,
        };
      }
    default:
      // Normal nodes
      if (isVisited) {
        // Visited: Solid white fill
        return {
          fill: '#FFFFFF',
          stroke: 'none',
          strokeWidth: 0,
          radius: NODE_RADIUS_BASE,
        };
      } else {
        // Unvisited: Hollow white border
        return {
          fill: 'none',
          stroke: '#FFFFFF',
          strokeWidth: 3,
          radius: NODE_RADIUS_BASE,
        };
      }
  }
}

/**
 * Get label text for special nodes
 */
function getNodeLabel(node: DungeonNode): string | null {
  switch (node.type) {
    case 'START':
      return 'Dungeon Entrance';
    case 'BOSS':
      return 'BOSS';
    case 'MERCHANT':
      return 'SHOP';
    case 'COMBAT':
      return '⚔️';
    case 'TRAP':
      return '⚠';
    default:
      return null;
  }
}

interface DungeonMiniMapProps {
  disableFogOfWar?: boolean; // When true, show all nodes regardless of fog of war
  calibrationMode?: boolean; // When true, highlight nodes without manual prompt index overrides
}

export function DungeonMiniMap({ disableFogOfWar = false, calibrationMode = false }: DungeonMiniMapProps = {}) {
  const nodes = useDungeonStore((state) => state.nodes);
  const playerLocation = useDungeonStore((state) => state.playerLocation);
  const visitedNodes = useDungeonStore((state) => state.visitedNodes);
  const getVisibleNodes = useDungeonStore((state) => state.getVisibleNodes);
  const getNodePromptOverride = useDungeonStore((state) => state.getNodePromptOverride);
  const getManualPromptIndexOverride = useDungeonStore((state) => state.getManualPromptIndexOverride);
  
  const [managerNodeId, setManagerNodeId] = useState<string | null>(null);

  // Calculate visible nodes based on fog of war
  const visibleNodes = useMemo(() => {
    if (!playerLocation) return new Set<string>();
    if (disableFogOfWar) {
      // Show all nodes when fog of war is disabled
      return new Set(nodes.keys());
    }
    return getVisibleNodes();
  }, [playerLocation, nodes, getVisibleNodes, disableFogOfWar]);

  // Collect nodes for rendering based on fog of war setting
  // If fog of war is enabled, only show visible nodes. Otherwise show all nodes.
  const nodesToRender = useMemo(() => {
    if (disableFogOfWar) {
      return Array.from(nodes.values());
    }
    return Array.from(nodes.values()).filter((node) => visibleNodes.has(node.id));
  }, [nodes, visibleNodes, disableFogOfWar]);

  // Calculate canvas dimensions - keep original height, nodes are offset within this space
  const canvasWidth = GRID_W * CELL_SIZE;
  const canvasHeight = GRID_H * CELL_SIZE;
  const VISIBLE_HEIGHT = 1200; // Actual container height in pixels

  // Calculate vertical offset to position nodes with entrance at bottom
  // Find the min and max y values of all nodes (for proper positioning)
  let minY = Infinity;
  let maxY = -Infinity;
  nodes.forEach((node) => {
    minY = Math.min(minY, node.y);
    maxY = Math.max(maxY, node.y);
  });

  // Calculate offset: position entrance (maxY) at the bottom of the visible container
  // The entrance should be at the bottom edge (900px) with minimal space for its label below
  // We want: maxY * CELL_SIZE + VERTICAL_OFFSET = VISIBLE_HEIGHT - (minimal padding)
  // This allows negative offsets when node positions extend beyond visible height
  const BOTTOM_PADDING = 10; // Minimal padding from bottom edge for label visibility
  const VERTICAL_OFFSET = maxY !== -Infinity 
    ? Math.floor(VISIBLE_HEIGHT - BOTTOM_PADDING - maxY * CELL_SIZE)
    : 0;

  // Early return if no data
  if (!playerLocation || nodes.size === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: '#000', border: '1px solid var(--border)' }}>
        <span style={{ color: 'var(--text-muted)' }}>Loading...</span>
      </div>
    );
  }

  // Collect all connections for path rendering
  // When fog of war is disabled, show all connections. Otherwise only show connections between visible nodes.
  const connections: Array<{
    from: { x: number; y: number; id: string; isVisited: boolean };
    to: { x: number; y: number; id: string; isVisited: boolean };
    isMainPath: boolean;
  }> = [];

  nodes.forEach((node) => {
    // Only process nodes that should be visible
    if (!disableFogOfWar && !visibleNodes.has(node.id)) return;

    node.connections.forEach((connection, targetId) => {
      const connected = nodes.get(targetId);
      if (!connected) return;
      // Only show connections to nodes that should be visible
      if (!disableFogOfWar && !visibleNodes.has(targetId)) return;

      connections.push({
        from: { 
          x: node.x, 
          y: node.y, 
          id: node.id,
          isVisited: visitedNodes.has(node.id)
        },
        to: { 
          x: connected.x, 
          y: connected.y, 
          id: targetId,
          isVisited: visitedNodes.has(targetId)
        },
        isMainPath: node.isMainPath && connected.isMainPath,
      });
    });
  });

  return (
    <div className="w-full h-full" style={{ backgroundColor: '#000', border: '1px solid var(--border)' }}>
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
        style={{ background: '#000', display: 'block' }}
        preserveAspectRatio="xMidYMid meet"
      >
        {/* SVG Filters for glow effects */}
        <defs>
          <filter id="glow-red" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="glow-yellow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          {/* Clip paths for each node to constrain icons */}
          {nodesToRender.map((node) => {
            const style = getNodeStyle(node, node.id === playerLocation, visitedNodes.has(node.id));
            const cx = node.x * CELL_SIZE;
            const cy = node.y * CELL_SIZE + VERTICAL_OFFSET;
            const squareSize = style.radius * 2;
            const squareX = cx - style.radius;
            const squareY = cy - style.radius;
            return (
              <clipPath key={`clip-${node.id}`} id={`clip-${node.id}`}>
                <rect x={squareX} y={squareY} width={squareSize} height={squareSize} />
              </clipPath>
            );
          })}
        </defs>

        {/* Paths layer (rendered first, behind nodes) */}
        <g className="paths">
          {connections.map((conn, idx) => {
            // Get node radii for edge calculation
            const fromNode = nodes.get(conn.from.id);
            const toNode = nodes.get(conn.to.id);
            const fromRadius = fromNode?.type === 'BOSS' ? NODE_RADIUS_BOSS : NODE_RADIUS_BASE;
            const toRadius = toNode?.type === 'BOSS' ? NODE_RADIUS_BOSS : NODE_RADIUS_BASE;
            
            // Calculate orthogonal path waypoints (in grid coordinates)
            const waypoints = calculateOrthogonalPath(
              { x: conn.from.x, y: conn.from.y },
              { x: conn.to.x, y: conn.to.y }
            );
            
            // Convert to pixel coordinates with vertical offset
            const pixelWaypoints = waypoints.map(wp => ({
              x: wp.x * CELL_SIZE,
              y: wp.y * CELL_SIZE + VERTICAL_OFFSET,
            }));
            
            // Calculate edge points for first and last segments
            const pathPoints: Array<{ x: number; y: number }> = [];
            
            if (pixelWaypoints.length === 2) {
              // Direct connection (straight line)
              const edgePoints = calculateEdgePoints(
                pixelWaypoints[0],
                pixelWaypoints[1],
                fromRadius,
                toRadius
              );
              pathPoints.push(edgePoints.start, edgePoints.end);
            } else {
              // Orthogonal path with turns
              // First segment: from edge of first circle to first intermediate point
              const firstEdge = calculateEdgePoints(
                pixelWaypoints[0],
                pixelWaypoints[1],
                fromRadius,
                0
              );
              pathPoints.push(firstEdge.start);
              
              // Add intermediate waypoints (skip first, include middle ones)
              for (let i = 1; i < pixelWaypoints.length - 1; i++) {
                pathPoints.push(pixelWaypoints[i]);
              }
              
              // Last segment: from last intermediate point to edge of second circle
              const lastEdge = calculateEdgePoints(
                pixelWaypoints[pixelWaypoints.length - 2],
                pixelWaypoints[pixelWaypoints.length - 1],
                0,
                toRadius
              );
              pathPoints.push(lastEdge.end);
            }
            
            // Line is white if either node has been visited, otherwise grey
            const isVisited = conn.from.isVisited || conn.to.isVisited;
            const strokeColor = isVisited ? '#FFFFFF' : (conn.isMainPath ? '#FFFFFF' : '#333333');
            const strokeWidth = isVisited ? 12 : (conn.isMainPath ? 12 : 10);

            return (
              <polyline
                key={`path-${conn.from.id}-${conn.to.id}-${idx}`}
                points={pathPoints
                  .map((wp) => `${wp.x},${wp.y}`)
                  .join(' ')}
                fill="none"
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
                pointerEvents="none"
              />
            );
          })}
        </g>

        {/* Nodes layer (rendered second, on top of paths) */}
        <g className="nodes">
          {nodesToRender.map((node) => {
            const isCurrent = node.id === playerLocation;
            const isVisited = visitedNodes.has(node.id);
            const isVisible = visibleNodes.has(node.id);
            const style = getNodeStyle(node, isCurrent, isVisited);
            const cx = node.x * CELL_SIZE;
            const cy = node.y * CELL_SIZE + VERTICAL_OFFSET;
            
            // When fog of war is enabled, unvisited nodes are hidden completely (not in nodesToRender)
            // When fog of war is disabled, all nodes are shown at full opacity
            const nodeOpacity = 1;

            // Determine filter for glow effects
            let filter = undefined;
            if (style.glow) {
              filter =
                style.glow.color === '#ef4444' || style.glow.color === '#dc2626'
                  ? 'url(#glow-red)' // Boss red or combat dark red
                  : style.glow.color === '#eab308'
                  ? 'url(#glow-yellow)'
                  : style.glow.color === '#a855f7'
                  ? 'url(#glow-yellow)' // Use yellow glow for purple (or add purple glow filter)
                  : undefined;
            }

            // Check if node has prompt override
            const hasOverride = getNodePromptOverride(node.id) !== null;
            
            // Check if node has manual prompt index override (for calibration mode)
            let hasManualPromptIndexOverride = false;
            if (calibrationMode) {
              const exits = getExits(node.id, nodes);
              const topologyStr = getTopologyKey(exits);
              hasManualPromptIndexOverride = getManualPromptIndexOverride(topologyStr) !== null;
            }
            
            // Handle left-click to open prompt manager
            const handleNodeClick = (e: React.MouseEvent) => {
              e.stopPropagation();
              setManagerNodeId(node.id);
            };

            // Calculate square dimensions (radius becomes half-width/height)
            const squareSize = style.radius * 2;
            const clickableSize = Math.max(style.radius + 10, 40) * 2;
            const squareX = cx - style.radius;
            const squareY = cy - style.radius;
            const clickableX = cx - (clickableSize / 2);
            const clickableY = cy - (clickableSize / 2);

            return (
              <g key={node.id}>
                {/* Invisible larger clickable area for easier clicking */}
                <rect
                  x={clickableX}
                  y={clickableY}
                  width={clickableSize}
                  height={clickableSize}
                  fill="transparent"
                  style={{ cursor: 'pointer', pointerEvents: 'all' }}
                  onClick={handleNodeClick}
                />
                {/* Visible node square */}
                <rect
                  x={squareX}
                  y={squareY}
                  width={squareSize}
                  height={squareSize}
                  fill={style.fill}
                  stroke={
                    calibrationMode && !hasManualPromptIndexOverride
                      ? '#ef4444' // Red border for nodes without manual override in calibration mode
                      : hasOverride 
                      ? '#facc15' // Gold border for nodes with override
                      : style.stroke
                  }
                  strokeWidth={
                    calibrationMode && !hasManualPromptIndexOverride
                      ? 4 // Thicker red border for calibration mode
                      : hasOverride 
                      ? 3 // Thicker border for override indicator
                      : style.strokeWidth
                  }
                  filter={filter}
                  opacity={nodeOpacity}
                  style={{ cursor: 'pointer', pointerEvents: 'all' }}
                  onClick={handleNodeClick}
                />
                {/* Calibration mode warning indicator */}
                {calibrationMode && !hasManualPromptIndexOverride && (
                  <text
                    x={cx}
                    y={cy - style.radius - 8}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill="#ef4444"
                    fontSize="12"
                    fontWeight="bold"
                    pointerEvents="none"
                    opacity={nodeOpacity}
                  >
                    ⚠
                  </text>
                )}
                {/* Override indicator - small gold star */}
                {hasOverride && (
                  <text
                    x={cx + style.radius * 0.6}
                    y={cy + style.radius * 0.6}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill="#facc15"
                    fontSize="10"
                    fontWeight="bold"
                    pointerEvents="none"
                    opacity={nodeOpacity}
                  >
                    ★
                  </text>
                )}
                {/* Icons for special nodes - only show on unvisited nodes (hollow) */}
                {!isVisited && node.type === 'TREASURE' && (
                  <g clipPath={`url(#clip-${node.id})`}>
                    <text
                      x={cx}
                      y={cy}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fill="#eab308"
                      fontSize="14"
                      fontWeight="bold"
                      pointerEvents="none"
                      opacity={nodeOpacity}
                    >
                      $
                    </text>
                  </g>
                )}
                {!isVisited && node.type === 'EVENT' && (
                  <g clipPath={`url(#clip-${node.id})`}>
                    <text
                      x={cx}
                      y={cy}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fill="#a855f7"
                      fontSize="14"
                      fontWeight="bold"
                      pointerEvents="none"
                      opacity={nodeOpacity}
                    >
                      ?
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </g>

        {/* Labels layer (rendered last, on top of everything) */}
        <g className="labels">
          {nodesToRender.map((node) => {
            const label = getNodeLabel(node);
            if (!label) return null;

            const cx = node.x * CELL_SIZE;
            const cy = node.y * CELL_SIZE + VERTICAL_OFFSET;
            const isVisited = visitedNodes.has(node.id);
            const style = getNodeStyle(node, node.id === playerLocation, isVisited);
            const squareSize = style.radius * 2;
            
            // For COMBAT nodes, render icon inside the square instead of above
            if (node.type === 'COMBAT') {
              return (
                <g key={`label-${node.id}`} clipPath={`url(#clip-${node.id})`}>
                  <text
                    x={cx}
                    y={cy}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill={isVisited ? "#f87171" : "#dc2626"}
                    fontSize="32"
                    fontWeight="bold"
                    pointerEvents="none"
                    opacity={1}
                  >
                    {label}
                  </text>
                </g>
              );
            }
            
            // Calculate label Y position for other node types
            let labelY: number;
            if (node.type === 'START') {
              // Position below the node
              labelY = cy + LABEL_OFFSET + NODE_RADIUS_BASE;
            } else if (node.type === 'BOSS') {
              // Position above the node
              labelY = cy - LABEL_OFFSET - NODE_RADIUS_BOSS;
            } else {
              // Default: above for other special nodes
              labelY = cy - LABEL_OFFSET - NODE_RADIUS_BASE;
            }

            return (
              <text
                key={`label-${node.id}`}
                x={cx}
                y={labelY}
                textAnchor="middle"
                dominantBaseline={node.type === 'START' ? 'hanging' : 'text-before-edge'}
                fill="#FFFFFF"
                fontSize="36"
                fontWeight="bold"
                className="uppercase"
                style={{ fontFamily: 'Inter, Roboto, sans-serif', pointerEvents: 'none' }}
              >
                {label}
              </text>
            );
          })}
        </g>
      </svg>
      
      {/* Node Prompt Manager - shown on left-click */}
      {managerNodeId && (
        <NodePromptManager
          nodeId={managerNodeId}
          onClose={() => {
            setManagerNodeId(null);
          }}
        />
      )}
    </div>
  );
}
