extends Node

## Dungeon Generator Singleton
## Generates procedural dungeons with rooms and connections

signal dungeon_generated(nodes: Dictionary, start_id: String, boss_id: String)
signal room_entered(node_id: String)

const CELL_SIZE = 45
const GRID_W = 12  # Narrower for portrait orientation
const GRID_H = 20  # Taller for vertical progression
const BRANCH_CHANCE = 0.60
const SUB_BRANCH_CHANCE = 0.30
const MIN_COMBAT_DISTANCE = 3

var nodes: Dictionary = {}  # {id: DungeonNode}
var start_node_id: String = ""
var boss_node_id: String = ""
var player_location: String = ""
var visited_nodes: Array[String] = []
var entry_direction: String = "north"  # north, south, east, west, or null

## Generate a new dungeon map
func generate_map() -> bool:
	nodes.clear()
	visited_nodes.clear()
	
	# 1. Define key points (waypoints) - Vertical orientation
	var start_x = int(GRID_W / 2.0)
	var start_y = GRID_H - 2  # Near bottom
	
	# Waypoint 1: Lower quarter
	var wp1_y = int(GRID_H * 0.75)
	var wp1_x = 2 if randf() > 0.5 else GRID_W - 2
	
	# Waypoint 2: Upper quarter
	var wp2_y = int(GRID_H * 0.35)
	var wp2_x = GRID_W - 2 if wp1_x < GRID_W / 2.0 else 2
	
	# Boss at top
	var boss_x = randi_range(2, GRID_W - 3)
	var boss_y = 2  # Near top
	
	# Create start node
	var start_node = create_node(start_x, start_y)
	start_node.type = DungeonNode.RoomType.START
	start_node.is_main_path = true
	start_node_id = start_node.id
	nodes[start_node.id] = start_node
	
	# 2. Create antechamber (required linear start)
	var antechamber_x = start_x
	var antechamber_y = start_y - 1  # Directly North of Start
	var antechamber_node = create_node(antechamber_x, antechamber_y)
	antechamber_node.is_main_path = true
	nodes[antechamber_node.id] = antechamber_node
	connect_nodes(start_node, antechamber_node)
	
	# 3. Connect the snake (from antechamber)
	var current = antechamber_node
	if not connect_points(current, Vector2i(wp1_x, wp1_y)):
		return false
	
	var wp1_id = str(wp1_x) + "," + str(wp1_y)
	if not nodes.has(wp1_id):
		return false
	current = nodes[wp1_id]
	
	if not connect_points(current, Vector2i(wp2_x, wp2_y)):
		return false
	
	var wp2_id = str(wp2_x) + "," + str(wp2_y)
	if not nodes.has(wp2_id):
		return false
	current = nodes[wp2_id]
	
	if not connect_points(current, Vector2i(boss_x, boss_y)):
		return false
	
	var boss_id = str(boss_x) + "," + str(boss_y)
	if not nodes.has(boss_id):
		return false
	var boss_node = nodes[boss_id]
	boss_node.type = DungeonNode.RoomType.BOSS
	boss_node_id = boss_node.id
	
	# 4. Generate branches
	var spine_nodes = nodes.values()
	for node in spine_nodes:
		if node.type == DungeonNode.RoomType.BOSS or node.type == DungeonNode.RoomType.START:
			continue
		if randf() < BRANCH_CHANCE:
			var branch_length = randi_range(1, 2)
			var tip = grow_branch(node, branch_length)
			if tip and randf() < SUB_BRANCH_CHANCE:
				grow_branch(tip, 1)
	
	# 5. Assign room types
	assign_room_types(start_node, boss_node)
	
	# 6. Calculate bitmasks
	calculate_masks()
	
	# 7. Assign monsters to combat rooms
	assign_monsters()
	
	if nodes.size() < 12:
		return false
	
	player_location = start_node_id
	dungeon_generated.emit(nodes, start_node_id, boss_node_id)
	return true

## Create a new node
func create_node(x: int, y: int) -> DungeonNode:
	var node = DungeonNode.new()
	node.id = str(x) + "," + str(y)
	node.x = x
	node.y = y
	node.type = DungeonNode.RoomType.NORMAL
	node.connections = {}
	return node

## Connect two points with a path
func connect_points(start_node: DungeonNode, target: Vector2i) -> bool:
	var current = start_node
	var safety = 0
	
	while (current.x != target.x or current.y != target.y) and safety < 100:
		safety += 1
		
		var dx = target.x - current.x
		var dy = target.y - current.y
		var moves: Array[Vector2i] = []
		
		# Vertical orientation: Prioritize Y-axis movement (UP = forward)
		if dy < 0:
			moves.append(Vector2i(0, -1))  # UP (North)
		if dx > 0:
			moves.append(Vector2i(1, 0))  # RIGHT (East)
		if dx < 0:
			moves.append(Vector2i(-1, 0))  # LEFT (West)
		if dy > 0:
			moves.append(Vector2i(0, 1))  # DOWN (South)
		
		# Random noise for organic feel
		if randf() < 0.3:
			if dy != 0:
				moves.append(Vector2i(1 if randf() > 0.5 else -1, 0))
			if dx != 0 and randf() < 0.5:
				moves.append(Vector2i(0, -1))
		
		# Shuffle moves
		moves.shuffle()
		
		var chosen_move: Vector2i = Vector2i.ZERO
		var found = false
		
		for move in moves:
			var nx = current.x + move.x
			var ny = current.y + move.y
			var nid = str(nx) + "," + str(ny)
			
			if nx < 1 or nx >= GRID_W - 1 or ny < 1 or ny >= GRID_H - 1:
				continue
			
			if nodes.has(nid):
				if nx == target.x and ny == target.y:
					chosen_move = Vector2i(nx, ny)
					found = true
					break
				continue
			
			chosen_move = Vector2i(nx, ny)
			found = true
			break
		
		if abs(dx) + abs(dy) <= 1:
			chosen_move = target
			found = true
		
		if found:
			var next_node: DungeonNode
			var nid = str(chosen_move.x) + "," + str(chosen_move.y)
			
			if nodes.has(nid):
				next_node = nodes[nid]
			else:
				next_node = create_node(chosen_move.x, chosen_move.y)
				nodes[nid] = next_node
			
			next_node.is_main_path = true
			connect_nodes(current, next_node)
			current = next_node
		else:
			return false
	
	return true

## Grow a branch from a source node
func grow_branch(source: DungeonNode, length: int) -> DungeonNode:
	var current = source
	var tip: DungeonNode = null
	
	for i in range(length):
		var dirs = [
			Vector2i(0, 1),
			Vector2i(0, -1),
			Vector2i(1, 0),
			Vector2i(-1, 0),
		]
		dirs.shuffle()
		
		var found = false
		for dir in dirs:
			var nx = current.x + dir.x
			var ny = current.y + dir.y
			var nid = str(nx) + "," + str(ny)
			
			if nx >= 1 and nx < GRID_W - 1 and ny >= 1 and ny < GRID_H - 1 and not nodes.has(nid):
				var branch = create_node(nx, ny)
				nodes[nid] = branch
				connect_nodes(current, branch)
				current = branch
				tip = branch
				found = true
				break
		
		if not found:
			break
	
	return tip

## Connect two nodes
func connect_nodes(n1: DungeonNode, n2: DungeonNode) -> void:
	# Determine connection type
	var connection_type = "arched_stone"  # Default
	
	if n1.type == DungeonNode.RoomType.BOSS or n2.type == DungeonNode.RoomType.BOSS:
		connection_type = "iron_bars" if randf() < 0.5 else "grand_double_doors"
	elif n1.type == DungeonNode.RoomType.TREASURE or n2.type == DungeonNode.RoomType.TREASURE:
		connection_type = "heavy_door"
	elif n1.type == DungeonNode.RoomType.MERCHANT or n2.type == DungeonNode.RoomType.MERCHANT:
		connection_type = "heavy_door"
	elif n1.type == DungeonNode.RoomType.COMBAT or n2.type == DungeonNode.RoomType.COMBAT:
		connection_type = "heavy_door"
	
	# Store connections in both directions
	n1.connections[n2.id] = connection_type
	n2.connections[n1.id] = connection_type

## Calculate bitmasks for all nodes
func calculate_masks() -> void:
	for node in nodes.values():
		var mask = 0
		
		for target_id in node.connections.keys():
			var target_node = nodes.get(target_id)
			if not target_node:
				continue
			
			var dx = target_node.x - node.x
			var dy = target_node.y - node.y
			
			if dx == 0 and dy == -1:
				mask += 1  # North
			if dx == 1 and dy == 0:
				mask += 2  # East
			if dx == 0 and dy == 1:
				mask += 4  # South
			if dx == -1 and dy == 0:
				mask += 8  # West
		
		node.mask = mask

## Assign room types
func assign_room_types(start: DungeonNode, boss: DungeonNode) -> void:
	# Find main path
	var main_path = find_main_path(start, boss)
	
	# Assign types along main path
	for i in range(main_path.size()):
		var node = main_path[i]
		var progress = float(i) / float(main_path.size())
		
		if progress < 0.2:
			# Early: mostly normal, some treasure
			if randf() < 0.1:
				node.type = DungeonNode.RoomType.TREASURE
		elif progress < 0.5:
			# Mid: mix of types
			var roll = randf()
			if roll < 0.1:
				node.type = DungeonNode.RoomType.TREASURE
			elif roll < 0.15:
				node.type = DungeonNode.RoomType.MERCHANT
			elif roll < 0.2:
				node.type = DungeonNode.RoomType.EVENT
		else:
			# Late: more treasure, merchant
			var roll = randf()
			if roll < 0.15:
				node.type = DungeonNode.RoomType.TREASURE
			elif roll < 0.2:
				node.type = DungeonNode.RoomType.MERCHANT
	
	# Assign combat rooms to non-main-path nodes
	var existing_combat_nodes: Array[String] = []
	for node in nodes.values():
		if node.type == DungeonNode.RoomType.COMBAT:
			existing_combat_nodes.append(node.id)
	
	for node in nodes.values():
		if node.is_main_path or node.type != DungeonNode.RoomType.NORMAL:
			continue
		
		if can_have_monster(node) and is_far_enough_from_combat(node, existing_combat_nodes):
			if randf() < 0.4:  # 40% chance for combat
				node.type = DungeonNode.RoomType.COMBAT
				existing_combat_nodes.append(node.id)

## Find main path from start to boss
func find_main_path(start: DungeonNode, boss: DungeonNode) -> Array[DungeonNode]:
	var start_path: Array[DungeonNode] = [start]
	var queue = [{"node": start, "path": start_path}]
	var visited = {}
	visited[start.id] = true
	
	while queue.size() > 0:
		var current = queue.pop_front()
		var node = current.node
		var path: Array[DungeonNode] = current.path
		
		for target_id in node.connections.keys():
			if visited.has(target_id):
				continue
			
			var target_node = nodes.get(target_id)
			if not target_node or not target_node.is_main_path:
				continue
			
			var new_path: Array[DungeonNode] = []
			for p in path:
				new_path.append(p)
			new_path.append(target_node)
			visited[target_id] = true
			
			if target_node == boss:
				# Exclude start and boss, return typed array
				var result: Array[DungeonNode] = []
				for i in range(1, new_path.size() - 1):
					result.append(new_path[i])
				return result
			
			queue.append({"node": target_node, "path": new_path})
	
	var empty_result: Array[DungeonNode] = []
	return empty_result

## Check if node can have monster
func can_have_monster(node: DungeonNode) -> bool:
	if is_crossroads(node):
		return false
	
	var connection_count = node.connections.size()
	
	# Reject straight paths (2 opposite connections)
	if connection_count == 2:
		var connected_ids = node.connections.keys()
		if connected_ids.size() == 2:
			var conn1 = nodes.get(connected_ids[0])
			var conn2 = nodes.get(connected_ids[1])
			if conn1 and conn2:
				var dx1 = conn1.x - node.x
				var dy1 = conn1.y - node.y
				var dx2 = conn2.x - node.x
				var dy2 = conn2.y - node.y
				
				# Check if opposite
				var is_opposite = (dx1 == 0 and dy1 == -1 and dx2 == 0 and dy2 == 1) or \
								  (dx1 == 0 and dy1 == 1 and dx2 == 0 and dy2 == -1) or \
								  (dx1 == 1 and dy1 == 0 and dx2 == -1 and dy2 == 0) or \
								  (dx1 == -1 and dy1 == 0 and dx2 == 1 and dy2 == 0)
				
				if is_opposite:
					return false
	
	return true

## Check if node is crossroads
func is_crossroads(node: DungeonNode) -> bool:
	var exits = {
		"north": false,
		"south": false,
		"east": false,
		"west": false
	}
	
	for target_id in node.connections.keys():
		var connected = nodes.get(target_id)
		if not connected:
			continue
		
		var dx = connected.x - node.x
		var dy = connected.y - node.y
		
		if dx == 0 and dy == -1:
			exits.north = true
		if dx == 0 and dy == 1:
			exits.south = true
		if dx == 1 and dy == 0:
			exits.east = true
		if dx == -1 and dy == 0:
			exits.west = true
	
	return exits.north and exits.south and exits.east and exits.west

## Check if node is far enough from combat nodes
func is_far_enough_from_combat(node: DungeonNode, combat_node_ids: Array[String], min_distance: int = MIN_COMBAT_DISTANCE) -> bool:
	for combat_id in combat_node_ids:
		var combat_node = nodes.get(combat_id)
		if not combat_node:
			continue
		
		var distance = get_path_distance(node, combat_node)
		if distance < min_distance:
			return false
	
	return true

## Get path distance between two nodes
func get_path_distance(node1: DungeonNode, node2: DungeonNode) -> int:
	if node1.id == node2.id:
		return 0
	
	var visited = {}
	var queue = [{"node": node1, "distance": 0}]
	visited[node1.id] = true
	
	while queue.size() > 0:
		var current = queue.pop_front()
		var node = current.node
		var distance = current.distance
		
		for connected_id in node.connections.keys():
			if connected_id == node2.id:
				return distance + 1
			
			if not visited.has(connected_id):
				var connected_node = nodes.get(connected_id)
				if connected_node:
					visited[connected_id] = true
					queue.append({"node": connected_node, "distance": distance + 1})
	
	return 999999  # No path found

## Assign monsters to combat rooms
func assign_monsters() -> void:
	if not CharacterManager.current_character:
		return
	
	var character_level = CharacterManager.current_character.level
	
	for node in nodes.values():
		if node.type == DungeonNode.RoomType.COMBAT:
			var monster = MonsterDatabase.get_random_monster(character_level)
			if monster:
				node.monster = MonsterDatabase.scale_monster_to_level(monster, character_level)

## Get current room node
func get_current_room() -> DungeonNode:
	if nodes.has(player_location):
		return nodes[player_location]
	return null

## Move to a connected room
func move_to_room(target_id: String, direction: String) -> bool:
	var current_room = get_current_room()
	if not current_room:
		return false
	
	if not current_room.connections.has(target_id):
		return false
	
	if not nodes.has(target_id):
		return false
	
	# Mark current room as visited
	if not visited_nodes.has(player_location):
		visited_nodes.append(player_location)
	
	# Update player location
	player_location = target_id
	entry_direction = get_opposite_direction(direction)
	
	# Mark new room as visited
	if not visited_nodes.has(player_location):
		visited_nodes.append(player_location)
	
	room_entered.emit(player_location)
	return true

## Get opposite direction
func get_opposite_direction(direction: String) -> String:
	match direction.to_upper():
		"NORTH", "N":
			return "south"
		"SOUTH", "S":
			return "north"
		"EAST", "E":
			return "west"
		"WEST", "W":
			return "east"
		_:
			return "north"

## Get room at coordinates
func get_room_at(x: int, y: int) -> DungeonNode:
	var id = str(x) + "," + str(y)
	return nodes.get(id)
