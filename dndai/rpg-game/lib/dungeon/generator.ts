import { DungeonNode, RoomType, ROOM_TYPES, ConnectionType, Connection, CONNECTION_TYPES } from './types';

// Configuration constants - Vertical orientation (Bottom to Top)
const CELL_SIZE = 45;
const GRID_W = 12;  // Narrower for portrait orientation
const GRID_H = 20;  // Taller for vertical progression
const BRANCH_CHANCE = 0.60;
const SUB_BRANCH_CHANCE = 0.30;

export class DungeonGenerator {
  private nodes: Map<string, DungeonNode> = new Map();

  generateMap(): boolean {
    this.nodes.clear();

    // 1. DEFINE KEY POINTS (Waypoints) - Vertical orientation
    // Start at bottom center
    const startX = Math.floor(GRID_W / 2);
    const startY = GRID_H - 2; // Near bottom

    // Waypoints to force vertical snaking (Bottom to Top)
    // Waypoint 1: Lower quarter (75% from top = lower on screen)
    const wp1Y = Math.floor(GRID_H * 0.75);
    const wp1X = Math.random() > 0.5 ? 2 : GRID_W - 2; // Oscillate left/right
    
    // Waypoint 2: Upper quarter (35% from top = higher on screen)
    const wp2Y = Math.floor(GRID_H * 0.35);
    const wp2X = (wp1X < GRID_W / 2) ? GRID_W - 2 : 2; // Opposite side for snake shape
    
    // Boss at top (random horizontal position)
    const bossX = Math.floor(Math.random() * (GRID_W - 4)) + 2;
    const bossY = 2; // Near top

    const startNode = new Node(startX, startY);
    startNode.type = 'START';
    startNode.isMainPath = true;
    this.nodes.set(startNode.id, startNode);

    // 2. CREATE ANTECHAMBER (Required linear start)
    // Start node must ALWAYS have exactly one connection: NORTH
    const antechamberX = startX;
    const antechamberY = startY - 1; // Directly North of Start
    const antechamberNode = new Node(antechamberX, antechamberY);
    antechamberNode.isMainPath = true;
    this.nodes.set(antechamberNode.id, antechamberNode);
    this.connect(startNode, antechamberNode); // Connect Start -> Antechamber (North)

    // 3. CONNECT THE SNAKE (Start from Antechamber, NOT Start)
    let current = antechamberNode;
    if (!this.connectPoints(current, { x: wp1X, y: wp1Y })) return false;
    
    const wp1Node = this.nodes.get(`${wp1X},${wp1Y}`);
    if (!wp1Node) return false;
    current = wp1Node;

    if (!this.connectPoints(current, { x: wp2X, y: wp2Y })) return false;
    
    const wp2Node = this.nodes.get(`${wp2X},${wp2Y}`);
    if (!wp2Node) return false;
    current = wp2Node;

    if (!this.connectPoints(current, { x: bossX, y: bossY })) return false;

    const bossNode = this.nodes.get(`${bossX},${bossY}`);
    if (!bossNode) return false;
    bossNode.type = 'BOSS';

    // 4. GENERATE BRANCHES (Skip Start node - it must remain single entrance)
    const spineNodes = Array.from(this.nodes.values());
    spineNodes.forEach(node => {
      if (node.type === 'BOSS' || node.type === 'START') return; // Skip Start and Boss
      if (Math.random() < BRANCH_CHANCE) {
        const len = Math.floor(Math.random() * 2) + 1;
        const tip = this.growBranch(node, len);
        if (tip && Math.random() < SUB_BRANCH_CHANCE) {
          this.growBranch(tip, 1);
        }
      }
    });

    // 5. ASSIGN TYPES (Loot Scarcity & Hidden Merchant)
    this.assignRoomTypes(startNode, bossNode);

    // 6. CALCULATE BITMASKS for all nodes
    this.calculateMasks();
    
    // #region agent log
    // Final verification: Check ALL nodes for COMBAT on crossroads AFTER everything is done
    const allNodesFinal = Array.from(this.nodes.values());
    const allCombatNodes = allNodesFinal.filter(n => n.type === 'COMBAT');
    const allCrossroadsNodes = allNodesFinal.filter(n => n.connections.size === 4);
    const combatOnCrossroads = allNodesFinal.filter(n => n.type === 'COMBAT' && this.isCrossroads(n));
    
    const combatInfo = allCombatNodes.map(n => ({id:n.id,connections:n.connections.size,isMainPath:n.isMainPath,connectionIds:Array.from(n.connections.keys())}));
    const crossroadsInfo = allCrossroadsNodes.map(n => ({id:n.id,type:n.type,connections:n.connections.size,isMainPath:n.isMainPath}));
    
    if (combatOnCrossroads.length > 0) {
      const problematicNodes = combatOnCrossroads.map(n => ({id:n.id,connections:n.connections.size,connectionIds:Array.from(n.connections.keys()),isMainPath:n.isMainPath}));
      fetch('http://127.0.0.1:7249/ingest/08331948-86a3-4f5f-b660-2645d043da0c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'generator.ts:91',message:'generateMap: FINAL VERIFICATION - COMBAT on crossroads found',data:{count:combatOnCrossroads.length,problematicNodes,allCombatNodes:combatInfo,allCrossroads:crossroadsInfo},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
    } else {
      fetch('http://127.0.0.1:7249/ingest/08331948-86a3-4f5f-b660-2645d043da0c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'generator.ts:95',message:'generateMap: FINAL VERIFICATION - no COMBAT on crossroads',data:{totalNodes:allNodesFinal.length,totalCombat:allCombatNodes.length,totalCrossroads:allCrossroadsNodes.length,combatInfo,crossroadsInfo},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
    }
    // #endregion

    if (this.nodes.size < 12) return false;
    return true;
  }

  private connectPoints(startNode: DungeonNode, target: { x: number; y: number }): boolean {
    let current = startNode;
    let safety = 0;

    while ((current.x !== target.x || current.y !== target.y) && safety < 100) {
      safety++;

      const dx = target.x - current.x;
      const dy = target.y - current.y;
      const moves: Array<{ x: number; y: number }> = [];

      // Vertical orientation: Prioritize Y-axis movement (UP = forward)
      // Primary: Move UP (decrease Y) when target is above
      if (dy < 0) moves.push({ x: 0, y: -1 }); // UP (North) - highest priority
      
      // Secondary: Lateral movements for snake shape
      if (dx > 0) moves.push({ x: 1, y: 0 }); // RIGHT (East)
      if (dx < 0) moves.push({ x: -1, y: 0 }); // LEFT (West)
      
      // Tertiary: Move DOWN only if necessary (backtracking)
      if (dy > 0) moves.push({ x: 0, y: 1 }); // DOWN (South) - lowest priority

      // Random Noise for organic feel (but still prioritize vertical)
      if (Math.random() < 0.3) {
        if (dy !== 0) {
          // Prefer lateral noise when moving vertically
          moves.push({ x: Math.random() > 0.5 ? 1 : -1, y: 0 });
        }
        if (dx !== 0 && Math.random() < 0.5) {
          // Occasional vertical noise when moving laterally
          moves.push({ x: 0, y: -1 }); // Prefer up over down
        }
      }

      // Shuffle but keep some priority for vertical movement
      moves.sort(() => Math.random() - 0.5);

      let chosenMove: { x: number; y: number } | null = null;

      for (const m of moves) {
        const nx = current.x + m.x;
        const ny = current.y + m.y;
        const id = `${nx},${ny}`;

        if (nx < 1 || nx >= GRID_W - 1 || ny < 1 || ny >= GRID_H - 1) continue;

        if (this.nodes.has(id)) {
          if (nx === target.x && ny === target.y) {
            chosenMove = { x: nx, y: ny };
            break;
          }
          continue;
        }

        chosenMove = { x: nx, y: ny };
        break;
      }

      if (Math.abs(dx) + Math.abs(dy) <= 1) {
        chosenMove = { x: target.x, y: target.y };
      }

      if (chosenMove) {
        let nextNode: DungeonNode;
        const id = `${chosenMove.x},${chosenMove.y}`;

        if (this.nodes.has(id)) {
          nextNode = this.nodes.get(id)!;
        } else {
          nextNode = new Node(chosenMove.x, chosenMove.y);
          this.nodes.set(id, nextNode);
        }

        nextNode.isMainPath = true;
        this.connect(current, nextNode);
        current = nextNode;
      } else {
        return false;
      }
    }

    return true;
  }

  private growBranch(source: DungeonNode, length: number): DungeonNode | null {
    let current = source;
    let tip: DungeonNode | null = null;

    for (let i = 0; i < length; i++) {
      const dirs = [
        { x: 0, y: 1 },
        { x: 0, y: -1 },
        { x: 1, y: 0 },
        { x: -1, y: 0 },
      ];

      dirs.sort(() => Math.random() - 0.5);

      let found = false;
      for (const dir of dirs) {
        const nx = current.x + dir.x;
        const ny = current.y + dir.y;
        const nid = `${nx},${ny}`;

        if (
          nx >= 1 &&
          nx < GRID_W - 1 &&
          ny >= 1 &&
          ny < GRID_H - 1 &&
          !this.nodes.has(nid)
        ) {
          const branch = new Node(nx, ny);
          this.nodes.set(nid, branch);
          this.connect(current, branch);
          current = branch;
          tip = branch;
          found = true;
          break;
        }
      }

      if (!found) break;
    }

    return tip;
  }

  private connect(n1: DungeonNode, n2: DungeonNode): void {
    // Determine connection type based on target node types
    // Priority: BOSS > TREASURE/MERCHANT > COMBAT > NORMAL
    let connectionType: ConnectionType;
    
    if (n1.type === 'BOSS' || n2.type === 'BOSS') {
      // Boss connections: iron_bars or grand_double_doors
      connectionType = Math.random() < 0.5 ? 'iron_bars' : 'grand_double_doors';
    } else if (n1.type === 'TREASURE' || n2.type === 'TREASURE') {
      connectionType = 'heavy_door';
    } else if (n1.type === 'MERCHANT' || n2.type === 'MERCHANT') {
      connectionType = 'heavy_door';
    } else if (n1.type === 'COMBAT' || n2.type === 'COMBAT') {
      // Combat connections: use heavy_door for dramatic effect
      connectionType = 'heavy_door';
    } else {
      // NORMAL nodes (and START/EVENT/DEAD_END default to NORMAL behavior)
      connectionType = 'arched_stone';
    }
    
    // Create Connection objects for both directions
    const conn1: Connection = { targetId: n2.id, type: connectionType };
    const conn2: Connection = { targetId: n1.id, type: connectionType };
    
    // Store in both nodes' connection Maps
    n1.connections.set(n2.id, conn1);
    n2.connections.set(n1.id, conn2);
  }

  /**
   * Calculate bitmask for each node based on its connections
   * Bitmask: North=1, East=2, South=4, West=8
   */
  private calculateMasks(): void {
    this.nodes.forEach((node) => {
      let mask = 0;

      // Check each direction for connections
      node.connections.forEach((connection, targetId) => {
        const targetNode = this.nodes.get(targetId);
        if (!targetNode) return;

        const dx = targetNode.x - node.x;
        const dy = targetNode.y - node.y;

        // Calculate mask based on direction
        if (dx === 0 && dy === -1) mask += 1; // North
        if (dx === 1 && dy === 0) mask += 2;  // East
        if (dx === 0 && dy === 1) mask += 4;  // South
        if (dx === -1 && dy === 0) mask += 8; // West
      });

      node.mask = mask;
    });
  }

  /**
   * Find the main path from start to boss using BFS
   * Returns array of nodes in order from start to boss (excluding start and boss)
   */
  private findMainPath(start: DungeonNode, boss: DungeonNode): DungeonNode[] {
    // Use BFS to find path from start to boss
    const queue: Array<{ node: DungeonNode; path: DungeonNode[] }> = [{ node: start, path: [start] }];
    const visited = new Set<string>();
    visited.add(start.id);

    while (queue.length > 0) {
      const { node, path } = queue.shift()!;

      // Check all connections
      for (const [targetId, connection] of node.connections) {
        if (visited.has(targetId)) continue;

        const targetNode = this.nodes.get(targetId);
        if (!targetNode) continue;

        // Only follow main path nodes
        if (!targetNode.isMainPath) continue;

        const newPath = [...path, targetNode];
        visited.add(targetId);

        // Found boss!
        if (targetNode === boss) {
          // Return path excluding start and boss
          return newPath.slice(1, -1);
        }

        queue.push({ node: targetNode, path: newPath });
      }
    }

    // If no path found, return empty array
    return [];
  }

  /**
   * Check if a node can have a monster based on its topology
   * Monsters can only be placed in: Dead End (1), Right Turn (2 non-opposite), Left Turn (2 non-opposite), T-Junction (3)
   * Cannot be placed in: Straight Path (2 opposite), Right Branch (3 with ahead), Left Branch (3 with ahead), Crossroads (4)
   * 
   * For 3-connection nodes, we need to check if ANY entry direction would result in a door ahead.
   * A true T-Junction has exits Left, Right, and one other (not opposite), so no entry direction creates hasAhead=true.
   * A Branch has two opposite exits, so entering from the third direction creates hasAhead=true.
   * Both T-Junctions and Branches are now allowed for combat, as monsters can be positioned on side walls.
   */
  /**
   * Calculate the minimum path distance between two nodes (BFS)
   * Returns the number of steps needed to travel from node1 to node2
   */
  private getPathDistance(node1: DungeonNode, node2: DungeonNode): number {
    if (node1.id === node2.id) return 0;
    
    const visited = new Set<string>();
    const queue: Array<{ node: DungeonNode; distance: number }> = [{ node: node1, distance: 0 }];
    visited.add(node1.id);
    
    while (queue.length > 0) {
      const { node, distance } = queue.shift()!;
      
      for (const [connectedId] of node.connections) {
        if (connectedId === node2.id) {
          return distance + 1;
        }
        
        if (!visited.has(connectedId)) {
          const connectedNode = this.nodes.get(connectedId);
          if (connectedNode) {
            visited.add(connectedId);
            queue.push({ node: connectedNode, distance: distance + 1 });
          }
        }
      }
    }
    
    return Infinity; // No path found
  }
  
  /**
   * Check if a node is too close to any existing combat nodes
   * Returns true if the node is at least MIN_COMBAT_DISTANCE steps away from all combat nodes
   */
  private isFarEnoughFromCombat(node: DungeonNode, existingCombatNodes: Set<string>, minDistance: number = 3): boolean {
    for (const combatNodeId of existingCombatNodes) {
      const combatNode = this.nodes.get(combatNodeId);
      if (!combatNode) continue;
      
      const distance = this.getPathDistance(node, combatNode);
      if (distance < minDistance) {
        return false;
      }
    }
    return true;
  }

  /**
   * Check if a node is a crossroads
   * A crossroads is defined as a node that has exits in all 4 cardinal directions (N, S, E, W)
   * OR a node that appears as a crossroads from any entry direction (calculatedIndex 7)
   * Crossroads nodes CANNOT have combat rooms
   */
  private isCrossroads(node: DungeonNode): boolean {
    // Check if node has connections in all 4 cardinal directions
    const exits = {
      north: false,
      south: false,
      east: false,
      west: false,
    };
    
    node.connections.forEach((connection, targetId) => {
      const connected = this.nodes.get(targetId);
      if (!connected) return;
      
      const dx = connected.x - node.x;
      const dy = connected.y - node.y;
      
      if (dx === 0 && dy === -1) exits.north = true;
      if (dx === 0 && dy === 1) exits.south = true;
      if (dx === 1 && dy === 0) exits.east = true;
      if (dx === -1 && dy === 0) exits.west = true;
    });
    
    // Primary check: all 4 cardinal directions have exits
    if (exits.north && exits.south && exits.east && exits.west) {
      return true;
    }
    
    // Secondary check: node appears as crossroads from any entry direction
    // This catches nodes with 3 connections that form a crossroads from player perspective
    // A node is a relative crossroads if it has exits in all 3 relative directions (left, ahead, right)
    // from at least one entry direction, which means calculatedIndex would be 7
    
    // Check all 4 possible entry directions
    const entryDirections: Array<'north' | 'south' | 'east' | 'west' | null> = ['north', 'south', 'east', 'west'];
    
    for (const entryDir of entryDirections) {
      // Determine facing direction (inverse of entry)
      let facing: 'NORTH' | 'SOUTH' | 'EAST' | 'WEST' = 'NORTH';
      if (entryDir === 'south') facing = 'NORTH';
      else if (entryDir === 'north') facing = 'SOUTH';
      else if (entryDir === 'west') facing = 'EAST';
      else if (entryDir === 'east') facing = 'WEST';
      
      // Map absolute exits to relative exits based on facing
      let hasLeft = false, hasAhead = false, hasRight = false;
      switch (facing) {
        case 'NORTH':
          hasLeft = exits.west; hasAhead = exits.north; hasRight = exits.east;
          break;
        case 'SOUTH':
          hasLeft = exits.east; hasAhead = exits.south; hasRight = exits.west;
          break;
        case 'EAST':
          hasLeft = exits.north; hasAhead = exits.east; hasRight = exits.south;
          break;
        case 'WEST':
          hasLeft = exits.south; hasAhead = exits.west; hasRight = exits.north;
          break;
      }
      
      // If all 3 relative directions have exits, it's a crossroads from this entry direction
      // calculatedIndex = (hasLeft ? 4 : 0) + (hasAhead ? 2 : 0) + (hasRight ? 1 : 0) = 7
      if (hasLeft && hasAhead && hasRight) {
        return true;
      }
    }
    
    return false;
  }

  private canHaveMonster(node: DungeonNode): boolean {
    // Reject crossroads (all 4 cardinal directions) - always has door ahead
    if (this.isCrossroads(node)) {
      return false;
    }
    
    const connectionCount = node.connections.size;
    
    // Reject straight paths (2 opposite connections) - always has door ahead
    if (connectionCount === 2) {
      const connectedIds = Array.from(node.connections.keys());
      const connected1 = this.nodes.get(connectedIds[0]);
      const connected2 = this.nodes.get(connectedIds[1]);
      
      if (connected1 && connected2) {
        const dx1 = connected1.x - node.x;
        const dy1 = connected1.y - node.y;
        const dx2 = connected2.x - node.x;
        const dy2 = connected2.y - node.y;
        
        // Check if connections are opposite
        const isOpposite = 
          (dx1 === 0 && dy1 === -1 && dx2 === 0 && dy2 === 1) || // North-South
          (dx1 === 0 && dy1 === 1 && dx2 === 0 && dy2 === -1) || // South-North
          (dx1 === 1 && dy1 === 0 && dx2 === -1 && dy2 === 0) || // East-West
          (dx1 === -1 && dy1 === 0 && dx2 === 1 && dy2 === 0);    // West-East
        
        if (isOpposite) {
          return false; // Straight path - cannot have monster
        }
      }
    }
    
    // For 3-connection nodes, allow both T-Junctions and Branches
    // T-Junctions: 3 connections without opposite exits (e.g., N, E, W)
    // Branches: 3 connections with opposite exits + one perpendicular (e.g., N, S, E or N, S, W)
    // Branches are now allowed because monsters can be positioned on side walls, not blocking the door ahead
    if (connectionCount === 3) {
      // All 3-connection nodes are allowed (both T-Junctions and Branches)
      return true;
    }
    
    // Allow: Dead End (1), Turns (2 non-opposite), T-Junction (3 without opposite exits), Branches (3 with opposite exits)
    return true;
  }

  private assignRoomTypes(start: DungeonNode, boss: DungeonNode): void {
    const all = Array.from(this.nodes.values());

    // #region agent log
    fetch('http://127.0.0.1:7249/ingest/08331948-86a3-4f5f-b660-2645d043da0c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'generator.ts:378',message:'assignRoomTypes: ENTRY',data:{totalNodes:all.length,startId:start.id,bossId:boss.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion

    // 1. PLACE COMBAT NODES ON MAIN PATH
    const mainPath = this.findMainPath(start, boss);
    
    // #region agent log
    const mainPathInfo = mainPath.map(n => ({id:n.id,connections:n.connections.size,type:n.type}));
    fetch('http://127.0.0.1:7249/ingest/08331948-86a3-4f5f-b660-2645d043da0c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'generator.ts:382',message:'assignRoomTypes: mainPath found',data:{mainPathLength:mainPath.length,mainPathInfo},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    
    // CRITICAL: Filter out crossroads nodes from mainPath BEFORE we start assigning
    // This ensures crossroads nodes are NEVER considered for combat assignment
    const mainPathFiltered = mainPath.filter((node) => {
      const connectionCount = node.connections.size;
      const isCrossroads = this.isCrossroads(node);
      
      // #region agent log
      if (isCrossroads) {
        fetch('http://127.0.0.1:7249/ingest/08331948-86a3-4f5f-b660-2645d043da0c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'generator.ts:386',message:'assignRoomTypes: filtering crossroads from mainPath',data:{nodeId:node.id,connectionCount,isCrossroads:true},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      }
      // #endregion
      
      return !isCrossroads;
    });
    
    // #region agent log
    fetch('http://127.0.0.1:7249/ingest/08331948-86a3-4f5f-b660-2645d043da0c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'generator.ts:393',message:'assignRoomTypes: after filtering',data:{originalLength:mainPath.length,filteredLength:mainPathFiltered.length,filteredOut:mainPath.length-mainPathFiltered.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    
    if (mainPathFiltered.length > 0) {
      // Determine number of combat nodes (4-5, or adjust based on path length)
      let numCombatNodes: number;
      if (mainPath.length < 8) {
        numCombatNodes = 3;
      } else if (mainPath.length > 12) {
        numCombatNodes = 6;
      } else {
        numCombatNodes = 4 + Math.floor(Math.random() * 2); // 4 or 5
      }

      // Ensure we don't exceed available nodes (use filtered path)
      numCombatNodes = Math.min(numCombatNodes, mainPathFiltered.length);

      // Distribute evenly along path, but find valid alternatives if needed
      const assignedCombatNodes = new Set<string>(); // Track which nodes we've assigned
      let combatNodesAssigned = 0;
      
      if (numCombatNodes > 0) {
        const step = mainPathFiltered.length / (numCombatNodes + 1);
        
        for (let i = 1; i <= numCombatNodes; i++) {
          const targetIndex = Math.floor(step * i);
          
          // Try to find a valid combat node starting from the target position
          // Search in a small radius around the target index
          let found = false;
          const searchRadius = 3; // Search up to 3 nodes away in each direction
          
          for (let offset = 0; offset <= searchRadius && !found; offset++) {
            // Try positions: target, target±1, target±2, target±3
            const positions = offset === 0 
              ? [targetIndex]
              : [targetIndex - offset, targetIndex + offset];
            
            for (const index of positions) {
              // Skip invalid indices
              if (index < 0 || index >= mainPathFiltered.length) continue; // Use filtered path length
              
              const node = mainPathFiltered[index];
              if (!node || node === start || node === boss) continue;
              if (assignedCombatNodes.has(node.id)) continue; // Already assigned
              
              // Crossroads are already filtered out from mainPathFiltered, but double-check
              if (node.connections.size === 4) {
                console.error(`[assignRoomTypes] ⚠ ERROR: Crossroads node ${node.id} found in filtered mainPath!`);
                continue;
              }
              
              // Check if node can have monster and is far enough from other combat nodes
              if (this.canHaveMonster(node) && this.isFarEnoughFromCombat(node, assignedCombatNodes, 3)) {
                // #region agent log
                const connectionCountBefore = node.connections.size;
                const isCrossroadsBefore = this.isCrossroads(node);
                fetch('http://127.0.0.1:7249/ingest/08331948-86a3-4f5f-b660-2645d043da0c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'generator.ts:444',message:'assignRoomTypes: ASSIGNING COMBAT to mainPath node',data:{nodeId:node.id,connectionCount:connectionCountBefore,isCrossroads:isCrossroadsBefore},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
                // #endregion
                
                node.type = 'COMBAT';
                assignedCombatNodes.add(node.id);
                combatNodesAssigned++;
                found = true;
                break;
              }
            }
          }
          
          // If we still haven't found a valid node, try searching nearby nodes on the main path
          // that are connected to the main path nodes (within 1 step)
          if (!found) {
            for (let index = Math.max(0, targetIndex - searchRadius); 
                 index <= Math.min(mainPathFiltered.length - 1, targetIndex + searchRadius) && !found; 
                 index++) {
              
              const node = mainPathFiltered[index];
              if (!node || node === start || node === boss) continue;
              if (assignedCombatNodes.has(node.id)) continue;
              
              // Check connected nodes (1 step away from main path)
              // CRITICAL: Filter out crossroads from connected nodes BEFORE processing
              const validConnectedNodes: DungeonNode[] = [];
              for (const [connectedId] of node.connections) {
                const connectedNode = this.nodes.get(connectedId);
                if (!connectedNode || connectedNode === start || connectedNode === boss) continue;
                if (assignedCombatNodes.has(connectedNode.id)) continue;
                if (connectedNode.type !== 'NORMAL') continue;
                // FILTER OUT CROSSROADS HERE
                if (connectedNode.connections.size === 4) {
                  continue; // Skip crossroads entirely
                }
                validConnectedNodes.push(connectedNode);
              }
              
              // Now process only the valid (non-crossroads) connected nodes
              for (const connectedNode of validConnectedNodes) {
                if (this.canHaveMonster(connectedNode) && this.isFarEnoughFromCombat(connectedNode, assignedCombatNodes, 3)) {
                  // #region agent log
                  const connectionCountBefore = connectedNode.connections.size;
                  const isCrossroadsBefore = this.isCrossroads(connectedNode);
                  fetch('http://127.0.0.1:7249/ingest/08331948-86a3-4f5f-b660-2645d043da0c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'generator.ts:477',message:'assignRoomTypes: ASSIGNING COMBAT to connected node',data:{nodeId:connectedNode.id,connectionCount:connectionCountBefore,isCrossroads:isCrossroadsBefore,parentNodeId:node.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
                  // #endregion
                  
                  connectedNode.type = 'COMBAT';
                  assignedCombatNodes.add(connectedNode.id);
                  combatNodesAssigned++;
                  found = true;
                  break;
                }
              }
            }
          }
        }
        
        // If we still don't have enough combat nodes, try to find more from the entire filtered main path
        if (combatNodesAssigned < numCombatNodes) {
          const remainingNeeded = numCombatNodes - combatNodesAssigned;
          let found = 0;
          
          // Search through all filtered main path nodes (crossroads already excluded)
          for (let index = 0; index < mainPathFiltered.length && found < remainingNeeded; index++) {
            const node = mainPathFiltered[index];
            if (!node || node === start || node === boss) continue;
            if (assignedCombatNodes.has(node.id)) continue;
            if (node.type !== 'NORMAL') continue; // Only consider normal nodes
            
            // Crossroads already filtered, but verify
            if (node.connections.size === 4) {
              console.error(`[assignRoomTypes] ⚠ ERROR: Crossroads in filtered path at index ${index}`);
              continue;
            }
            
            // Check if node can have monster and is far enough from other combat nodes
            if (this.canHaveMonster(node) && this.isFarEnoughFromCombat(node, assignedCombatNodes, 3)) {
              // #region agent log
              const connectionCountBefore = node.connections.size;
              const isCrossroadsBefore = this.isCrossroads(node);
              fetch('http://127.0.0.1:7249/ingest/08331948-86a3-4f5f-b660-2645d043da0c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'generator.ts:521',message:'assignRoomTypes: ASSIGNING COMBAT in fallback search',data:{nodeId:node.id,connectionCount:connectionCountBefore,isCrossroads:isCrossroadsBefore},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
              // #endregion
              
              node.type = 'COMBAT';
              assignedCombatNodes.add(node.id);
              found++;
            }
          }
          
          // If still not enough, search nodes connected to filtered main path
          if (found < remainingNeeded) {
            for (let index = 0; index < mainPathFiltered.length && found < remainingNeeded; index++) {
              const node = mainPathFiltered[index];
              if (!node || node === start || node === boss) continue;
              
              // Collect valid (non-crossroads) connected nodes first
              const validConnectedNodes: DungeonNode[] = [];
              for (const [connectedId] of node.connections) {
                const connectedNode = this.nodes.get(connectedId);
                if (!connectedNode || connectedNode === start || connectedNode === boss) continue;
                if (assignedCombatNodes.has(connectedNode.id)) continue;
                if (connectedNode.type !== 'NORMAL') continue;
                
                // #region agent log
                const connCount = connectedNode.connections.size;
                const isCrossroads = this.isCrossroads(connectedNode);
                if (isCrossroads) {
                  fetch('http://127.0.0.1:7249/ingest/08331948-86a3-4f5f-b660-2645d043da0c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'generator.ts:560',message:'assignRoomTypes: filtering crossroads in final fallback',data:{nodeId:connectedNode.id,connectionCount:connCount,parentNodeId:node.id,isMainPath:connectedNode.isMainPath},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
                }
                // #endregion
                
                // FILTER OUT CROSSROADS
                if (this.isCrossroads(connectedNode)) {
                  continue; // Skip crossroads entirely
                }
                validConnectedNodes.push(connectedNode);
              }
              
              // Process only valid connected nodes
              for (const connectedNode of validConnectedNodes) {
                if (this.canHaveMonster(connectedNode) && this.isFarEnoughFromCombat(connectedNode, assignedCombatNodes, 3)) {
                  // #region agent log
                  const connectionCountBefore = connectedNode.connections.size;
                  const isCrossroadsBefore = this.isCrossroads(connectedNode);
                  fetch('http://127.0.0.1:7249/ingest/08331948-86a3-4f5f-b660-2645d043da0c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'generator.ts:554',message:'assignRoomTypes: ASSIGNING COMBAT in final fallback',data:{nodeId:connectedNode.id,connectionCount:connectionCountBefore,isCrossroads:isCrossroadsBefore,parentNodeId:node.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
                  // #endregion
                  
                  connectedNode.type = 'COMBAT';
                  assignedCombatNodes.add(connectedNode.id);
                  found++;
                  if (found >= remainingNeeded) break;
                }
              }
            }
          }
        }
      }
      
      // ADDITIONAL PASS: Assign extra combat nodes to branch nodes (not on main path)
      // This ensures we have a good mix of main path and branch combat encounters
      const branchCombatTarget = 2 + Math.floor(Math.random() * 2); // 2-3 additional branch combat nodes
      let branchCombatAssigned = 0;
      
      // Collect all branch nodes (not on main path, not start/boss, normal type, not crossroads)
      const branchNodes: DungeonNode[] = [];
      for (const node of this.nodes.values()) {
        if (node === start || node === boss) continue;
        if (node.isMainPath) continue; // Skip main path nodes
        if (node.type !== 'NORMAL') continue; // Only normal nodes
        if (assignedCombatNodes.has(node.id)) continue; // Already assigned
        if (this.isCrossroads(node)) continue; // Skip crossroads
        if (!this.canHaveMonster(node)) continue; // Must be able to have monster
        
        branchNodes.push(node);
      }
      
      // Shuffle branch nodes for random selection
      for (let i = branchNodes.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [branchNodes[i], branchNodes[j]] = [branchNodes[j], branchNodes[i]];
      }
      
      // Assign combat to branch nodes (ensuring minimum distance from other combat nodes)
      for (const branchNode of branchNodes) {
        if (branchCombatAssigned >= branchCombatTarget) break;
        
        // Check if this branch node is far enough from all existing combat nodes
        if (!this.isFarEnoughFromCombat(branchNode, assignedCombatNodes, 3)) {
          continue; // Skip if too close to another combat node
        }
        
        // #region agent log
        const connectionCountBefore = branchNode.connections.size;
        const isCrossroadsBefore = this.isCrossroads(branchNode);
        fetch('http://127.0.0.1:7249/ingest/08331948-86a3-4f5f-b660-2645d043da0c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'generator.ts:690',message:'assignRoomTypes: ASSIGNING COMBAT to branch node',data:{nodeId:branchNode.id,connectionCount:connectionCountBefore,isCrossroads:isCrossroadsBefore,isMainPath:branchNode.isMainPath},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
        // #endregion
        
        branchNode.type = 'COMBAT';
        assignedCombatNodes.add(branchNode.id);
        branchCombatAssigned++;
      }
    }

    // FINAL SAFEGUARD: Remove COMBAT from any crossroads nodes that may have slipped through
    // This is a failsafe to ensure NO crossroads nodes ever have COMBAT type
    // Check ALL nodes, not just the ones we processed
    const allNodesFinal = Array.from(this.nodes.values());
    let removedCount = 0;
    allNodesFinal.forEach((node) => {
      // Check using helper function (checks all 4 cardinal directions)
      const connectionCount = node.connections.size;
      const isCrossroadsDirect = this.isCrossroads(node);
      const isCrossroadsHelper = this.isCrossroads(node);
      
      // #region agent log
      if (node.type === 'COMBAT') {
        fetch('http://127.0.0.1:7249/ingest/08331948-86a3-4f5f-b660-2645d043da0c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'generator.ts:577',message:'assignRoomTypes: checking COMBAT node in cleanup',data:{nodeId:node.id,connectionCount,isCrossroadsDirect,isCrossroadsHelper,type:node.type},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      }
      // #endregion
      
      if (node.type === 'COMBAT' && (isCrossroadsDirect || isCrossroadsHelper)) {
        // #region agent log
        fetch('http://127.0.0.1:7249/ingest/08331948-86a3-4f5f-b660-2645d043da0c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'generator.ts:582',message:'assignRoomTypes: REMOVING COMBAT from crossroads',data:{nodeId:node.id,connectionCount,connectionIds:Array.from(node.connections.keys())},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
        // #endregion
        
        console.error(`[assignRoomTypes] ⚠⚠⚠ REMOVING COMBAT from crossroads node ${node.id}`);
        console.error(`[assignRoomTypes]   Connections: ${node.connections.size}`);
        console.error(`[assignRoomTypes]   Direct check: ${isCrossroadsDirect}, Helper check: ${isCrossroadsHelper}`);
        console.error(`[assignRoomTypes]   Connection IDs: ${Array.from(node.connections.keys()).join(', ')}`);
        node.type = 'NORMAL'; // Reset to normal
        removedCount++;
      }
    });
    
    if (removedCount > 0) {
      // #region agent log
      fetch('http://127.0.0.1:7249/ingest/08331948-86a3-4f5f-b660-2645d043da0c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'generator.ts:588',message:'assignRoomTypes: cleanup removed COMBAT from crossroads',data:{removedCount},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
      console.error(`[assignRoomTypes] ⚠⚠⚠ REMOVED COMBAT from ${removedCount} crossroads node(s) - THIS SHOULD NOT HAPPEN!`);
    }

    // 2. FILTER DEAD ENDS (Nodes with 1 connection)
    let deadEnds = all.filter(
      (n) => n.connections.size === 1 && n !== start && n !== boss && n.type !== 'COMBAT'
    );

    // Shuffle Dead Ends randomly
    deadEnds.sort(() => Math.random() - 0.5);

    // 3. PLACE MERCHANT (Must be off-path if possible)
    let merchantSpot = deadEnds.find((n) => !n.isMainPath);

    if (merchantSpot) {
      merchantSpot.type = 'MERCHANT';
      deadEnds = deadEnds.filter((n) => n !== merchantSpot);
    } else {
      // Fallback: Use any dead end
      if (deadEnds.length > 0) {
        deadEnds[0].type = 'MERCHANT';
        deadEnds.shift();
      }
    }

    // 4. ASSIGN SCARCE LOOT to dead ends
    deadEnds.forEach((n) => {
      const r = Math.random();
      if (r < 0.3) {
        // 30% Chance: Treasure
        n.type = 'TREASURE';
      } else if (r < 0.6) {
        // 30% Chance: Event
        n.type = 'EVENT';
      } else {
        // 40% Chance: Empty / Combat (No Icon)
        n.type = 'DEAD_END';
      }
    });

    // 5. ASSIGN SPECIAL ROOMS EVENLY ACROSS THE DUNGEON
    // Collect all available nodes (not start, boss, combat, merchant, or already assigned)
    const availableNodes: DungeonNode[] = [];
    for (const node of this.nodes.values()) {
      if (node === start || node === boss) continue;
      if (node.type !== 'NORMAL') continue; // Skip already assigned types
      if (this.isCrossroads(node)) continue; // Skip crossroads
      availableNodes.push(node);
    }
    
    // Shuffle for random selection
    for (let i = availableNodes.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [availableNodes[i], availableNodes[j]] = [availableNodes[j], availableNodes[i]];
    }
    
    // Calculate target counts based on dungeon size
    const totalNodes = this.nodes.size;
    const targetTreasure = Math.max(2, Math.floor(totalNodes * 0.08)); // ~8% treasure
    const targetEvent = Math.max(2, Math.floor(totalNodes * 0.08)); // ~8% event
    const targetMerchant = Math.max(1, Math.floor(totalNodes * 0.03)); // ~3% merchant (if not already placed)
    
    // Track assigned special rooms for distance checking
    const assignedSpecialRooms = new Set<string>();
    const allAssignedRooms = new Set<string>();
    
    // Add existing special rooms to tracking
    for (const node of this.nodes.values()) {
      if (node.type === 'TREASURE' || node.type === 'MERCHANT' || node.type === 'EVENT') {
        assignedSpecialRooms.add(node.id);
        allAssignedRooms.add(node.id);
      }
      if (node.type === 'COMBAT') {
        allAssignedRooms.add(node.id);
      }
    }
    
    // Helper to check if node is far enough from special rooms
    const isFarEnoughFromSpecial = (node: DungeonNode, minDistance: number = 2): boolean => {
      for (const specialRoomId of assignedSpecialRooms) {
        const specialRoom = this.nodes.get(specialRoomId);
        if (!specialRoom) continue;
        const distance = this.getPathDistance(node, specialRoom);
        if (distance < minDistance) {
          return false;
        }
      }
      return true;
    };
    
    // Assign TREASURE rooms
    let treasureAssigned = Array.from(this.nodes.values()).filter(n => n.type === 'TREASURE').length;
    for (const node of availableNodes) {
      if (treasureAssigned >= targetTreasure) break;
      if (node.type !== 'NORMAL') continue; // Still check in case it was changed
      if (!isFarEnoughFromSpecial(node, 2)) continue; // At least 2 steps from other special rooms
      if (!this.isFarEnoughFromCombat(node, allAssignedRooms, 2)) continue; // At least 2 steps from combat
      
      node.type = 'TREASURE';
      assignedSpecialRooms.add(node.id);
      allAssignedRooms.add(node.id);
      treasureAssigned++;
    }
    
    // Assign EVENT rooms
    let eventAssigned = Array.from(this.nodes.values()).filter(n => n.type === 'EVENT').length;
    for (const node of availableNodes) {
      if (eventAssigned >= targetEvent) break;
      if (node.type !== 'NORMAL') continue; // Still check in case it was changed
      if (!isFarEnoughFromSpecial(node, 2)) continue; // At least 2 steps from other special rooms
      if (!this.isFarEnoughFromCombat(node, allAssignedRooms, 2)) continue; // At least 2 steps from combat
      
      node.type = 'EVENT';
      assignedSpecialRooms.add(node.id);
      allAssignedRooms.add(node.id);
      eventAssigned++;
    }
    
    // Assign additional MERCHANT rooms if needed (only if not already placed on dead end)
    let merchantAssigned = Array.from(this.nodes.values()).filter(n => n.type === 'MERCHANT').length;
    if (merchantAssigned < targetMerchant) {
      for (const node of availableNodes) {
        if (merchantAssigned >= targetMerchant) break;
        if (node.type !== 'NORMAL') continue; // Still check in case it was changed
        if (!isFarEnoughFromSpecial(node, 3)) continue; // Merchants need more space (3 steps)
        if (!this.isFarEnoughFromCombat(node, allAssignedRooms, 2)) continue;
        
        node.type = 'MERCHANT';
        assignedSpecialRooms.add(node.id);
        allAssignedRooms.add(node.id);
        merchantAssigned++;
      }
    }

    // ABSOLUTE FINAL SAFEGUARD: One more pass right before returning
    // Check ALL nodes one final time to ensure NO crossroads has COMBAT
    const finalCheck = Array.from(this.nodes.values());
    let finalRemovedCount = 0;
    const combatNodesFinal = finalCheck.filter(n => n.type === 'COMBAT');
    
    // #region agent log
    const combatNodesInfo = combatNodesFinal.map(n => ({id:n.id,connections:n.connections.size,isCrossroads:this.isCrossroads(n)}));
    fetch('http://127.0.0.1:7249/ingest/08331948-86a3-4f5f-b660-2645d043da0c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'generator.ts:633',message:'assignRoomTypes: FINAL CHECK - all COMBAT nodes',data:{totalCombatNodes:combatNodesFinal.length,combatNodesInfo},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
    // #endregion
    
    finalCheck.forEach((node) => {
      if (node.type === 'COMBAT') {
        const connectionCount = node.connections.size;
        if (connectionCount === 4) {
          // #region agent log
          fetch('http://127.0.0.1:7249/ingest/08331948-86a3-4f5f-b660-2645d043da0c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'generator.ts:636',message:'assignRoomTypes: FINAL CHECK removing COMBAT from crossroads',data:{nodeId:node.id,connectionCount,connectionIds:Array.from(node.connections.keys())},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
          // #endregion
          
          console.error(`[assignRoomTypes] ⚠⚠⚠ FINAL CHECK: Removing COMBAT from crossroads ${node.id} with ${connectionCount} connections`);
          console.error(`[assignRoomTypes]   This should NEVER happen - all previous checks failed!`);
          node.type = 'NORMAL';
          finalRemovedCount++;
        }
      }
    });
    
    if (finalRemovedCount > 0) {
      // #region agent log
      fetch('http://127.0.0.1:7249/ingest/08331948-86a3-4f5f-b660-2645d043da0c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'generator.ts:645',message:'assignRoomTypes: FINAL CHECK removed COMBAT',data:{finalRemovedCount},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
      console.error(`[assignRoomTypes] ⚠⚠⚠ FINAL CHECK REMOVED COMBAT from ${finalRemovedCount} crossroads node(s)!`);
      console.error(`[assignRoomTypes] ⚠⚠⚠ THIS IS A CRITICAL BUG - all previous safeguards failed!`);
    }
    
    // #region agent log
    const finalCombatNodes = Array.from(this.nodes.values()).filter(n => n.type === 'COMBAT');
    const finalCombatInfo = finalCombatNodes.map(n => ({id:n.id,connections:n.connections.size,isCrossroads:this.isCrossroads(n)}));
    fetch('http://127.0.0.1:7249/ingest/08331948-86a3-4f5f-b660-2645d043da0c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'generator.ts:648',message:'assignRoomTypes: EXIT - final state',data:{totalCombatNodes:finalCombatNodes.length,finalCombatInfo},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
    // #endregion
  }

  getNodes(): Map<string, DungeonNode> {
    return this.nodes;
  }

  getStartNodeId(): string | null {
    const startNode = Array.from(this.nodes.values()).find((n) => n.type === 'START');
    return startNode?.id || null;
  }

  getBossNodeId(): string | null {
    const bossNode = Array.from(this.nodes.values()).find((n) => n.type === 'BOSS');
    return bossNode?.id || null;
  }
}

// Node class matching the HTML prototype
class Node implements DungeonNode {
  x: number;
  y: number;
  type: RoomType;
  connections: Map<string, Connection>;
  id: string;
  isMainPath: boolean;
  visited: boolean;
  monster: import('./types').Monster | null;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.type = 'NORMAL';
    this.connections = new Map();
    this.id = `${x},${y}`;
    this.isMainPath = false;
    this.visited = false;
    this.monster = null; // Will be populated during dungeon generation
    this.mask = 0; // Will be calculated after all connections are established
  }
}

// Helper function to get exits for a node
export function getExits(
  nodeId: string,
  allNodes: Map<string, DungeonNode>
): { north: boolean; south: boolean; east: boolean; west: boolean } {
  const node = allNodes.get(nodeId);
  if (!node) {
    return { north: false, south: false, east: false, west: false };
  }

  const exits = {
    north: false,
    south: false,
    east: false,
    west: false,
  };

  node.connections.forEach((connection, targetId) => {
    const connected = allNodes.get(targetId);
    if (!connected) return;

    const dx = connected.x - node.x;
    const dy = connected.y - node.y;

    if (dx === 0 && dy === -1) exits.north = true;
    if (dx === 0 && dy === 1) exits.south = true;
    if (dx === 1 && dy === 0) exits.east = true;
    if (dx === -1 && dy === 0) exits.west = true;
  });

  return exits;
}

/**
 * Calculate exits for image generation (image-relative directions)
 * For vertical orientation (Bottom->Top):
 * - North (Y-1) = "forward" (main progression)
 * - South (Y+1) = "back" (retreat)
 * - East (X+1) = "right"
 * - West (X-1) = "left"
 * Returns array like ['forward', 'left', 'right'] or [] for dead end
 */
export function calculateExitsForImage(
  node: DungeonNode,
  allNodes: Map<string, DungeonNode>
): string[] {
  const exits: string[] = [];

  node.connections.forEach((connection, targetId) => {
    const connected = allNodes.get(targetId);
    if (!connected) return;

    const dx = connected.x - node.x;
    const dy = connected.y - node.y;

    // Vertical orientation: Y decreases = North = Forward
    if (dx === 0 && dy === -1) exits.push('forward'); // North
    if (dx === 0 && dy === 1) exits.push('back'); // South
    if (dx === 1 && dy === 0) exits.push('right'); // East
    if (dx === -1 && dy === 0) exits.push('left'); // West
  });

  return exits;
}

/**
 * Calculate relative exits for strict directional mapping
 * Maps map coordinates to first-person visual directions:
 * - Map East (x increases) → FORWARD (progressing deeper)
 * - Map North (y decreases) → LEFT
 * - Map South (y increases) → RIGHT
 * - Map West (x decreases) → BACK
 * Returns array with type and nodeId: [{type: "FORWARD", nodeId: "1,2"}, ...]
 */
export function calculateRelativeExits(
  node: DungeonNode,
  allNodes: Map<string, DungeonNode>
): Array<{type: string, nodeId: string}> {
  const relativeExits: Array<{type: string, nodeId: string}> = [];

  node.connections.forEach((connection, targetId) => {
    const connected = allNodes.get(targetId);
    if (!connected) return;

    const dx = connected.x - node.x;
    const dy = connected.y - node.y;

    let direction: string | null = null;

    // Map coordinates to visual directions
    if (dx > 0) {
      direction = 'FORWARD'; // East = Forward (progressing deeper)
    } else if (dx < 0) {
      direction = 'BACK'; // West = Back
    } else if (dy < 0) {
      direction = 'LEFT'; // North = Left
    } else if (dy > 0) {
      direction = 'RIGHT'; // South = Right
    }

    if (direction) {
      relativeExits.push({ type: direction, nodeId: targetId });
    }
  });

  return relativeExits;
}

