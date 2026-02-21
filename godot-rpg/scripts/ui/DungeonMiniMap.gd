extends Control

## Dungeon MiniMap Script
## Displays the dungeon map

const CELL_SIZE = 15
const NODE_RADIUS = 4

var minimap_texture: ImageTexture
var minimap_image: Image

func _ready():
	# Connect signals
	if not DungeonGenerator.dungeon_generated.is_connected(_on_dungeon_generated):
		DungeonGenerator.dungeon_generated.connect(_on_dungeon_generated)
	
	if not DungeonGenerator.room_entered.is_connected(_on_room_entered):
		DungeonGenerator.room_entered.connect(_on_room_entered)
	
	# Draw minimap
	queue_redraw()

func _draw():
	# Draw background for visibility
	draw_rect(Rect2(Vector2.ZERO, size), Color(0.1, 0.1, 0.1, 0.9))
	
	# Draw minimap
	draw_minimap()

## Draw minimap
func draw_minimap() -> void:
	if DungeonGenerator.nodes.size() == 0:
		# No dungeon generated yet, nothing to draw
		return
	
	# Find bounds
	var min_x = 999
	var min_y = 999
	var max_x = -999
	var max_y = -999
	
	for node_id in DungeonGenerator.nodes.keys():
		var node = DungeonGenerator.nodes[node_id]
		min_x = min(min_x, node.x)
		min_y = min(min_y, node.y)
		max_x = max(max_x, node.x)
		max_y = max(max_y, node.y)
	
	# Calculate offset to center the map
	var offset_x = (size.x / 2.0) - ((min_x + max_x) / 2.0) * CELL_SIZE
	var offset_y = (size.y / 2.0) - ((min_y + max_y) / 2.0) * CELL_SIZE
	
	# Draw connections first (so they appear behind nodes)
	for node_id in DungeonGenerator.nodes.keys():
		var node = DungeonGenerator.nodes[node_id]
		draw_connections(node, offset_x, offset_y)
	
	# Draw nodes
	for node_id in DungeonGenerator.nodes.keys():
		var node = DungeonGenerator.nodes[node_id]
		draw_node(node, offset_x, offset_y)

## Draw a node
func draw_node(node: DungeonNode, offset_x: float, offset_y: float) -> void:
	var color = get_node_color(node)
	var node_position = Vector2(
		node.x * CELL_SIZE + offset_x,
		node.y * CELL_SIZE + offset_y
	)
	
	# Draw visited/unvisited
	var is_visited = DungeonGenerator.visited_nodes.has(node.id)
	var alpha = 0.4 if not is_visited else 1.0
	color.a = alpha
	
	# Draw node circle with better visibility
	draw_circle(node_position, NODE_RADIUS, color)
	
	# Draw border for better definition
	var border_color = Color(0.3, 0.3, 0.3, alpha)
	draw_arc(node_position, NODE_RADIUS, 0, TAU, 32, border_color, 1.5)
	
	# Highlight current room with more prominent indicator
	if node.id == DungeonGenerator.player_location:
		# Outer yellow ring
		draw_circle(node_position, NODE_RADIUS + 3, Color.YELLOW, false, 2.5)
		# Inner white ring
		draw_circle(node_position, NODE_RADIUS + 1.5, Color.WHITE, false, 1.5)
		# Center highlight
		draw_circle(node_position, NODE_RADIUS, Color(1.0, 1.0, 0.8, 1.0))

## Get node color based on type
func get_node_color(node: DungeonNode) -> Color:
	match node.type:
		DungeonNode.RoomType.START:
			return Color.GREEN
		DungeonNode.RoomType.BOSS:
			return Color.RED
		DungeonNode.RoomType.TREASURE:
			return Color.YELLOW
		DungeonNode.RoomType.MERCHANT:
			return Color.ORANGE
		DungeonNode.RoomType.EVENT:
			return Color.PURPLE
		DungeonNode.RoomType.COMBAT:
			return Color(0.86, 0.15, 0.15)  # Dark red
		DungeonNode.RoomType.DEAD_END:
			return Color(0.3, 0.3, 0.3)  # Gray
		_:
			return Color(0.5, 0.5, 0.5)  # Light gray

## Draw connections
func draw_connections(node: DungeonNode, offset_x: float, offset_y: float) -> void:
	var start_pos = Vector2(
		node.x * CELL_SIZE + offset_x,
		node.y * CELL_SIZE + offset_y
	)
	
	for target_id in node.connections.keys():
		var target_node = DungeonGenerator.nodes.get(target_id)
		if not target_node:
			continue
		
		var end_pos = Vector2(
			target_node.x * CELL_SIZE + offset_x,
			target_node.y * CELL_SIZE + offset_y
		)
		
		# Draw line with better visibility
		var line_color = Color(0.5, 0.5, 0.5, 0.5)
		if DungeonGenerator.visited_nodes.has(node.id) and DungeonGenerator.visited_nodes.has(target_id):
			line_color = Color(0.7, 0.7, 0.7, 0.8)
		else:
			line_color = Color(0.4, 0.4, 0.4, 0.3)
		
		draw_line(start_pos, end_pos, line_color, 1.5)

## Handle dungeon generated
func _on_dungeon_generated(_nodes: Dictionary, _start_id: String, _boss_id: String) -> void:
	queue_redraw()

## Handle room entered
func _on_room_entered(_node_id: String) -> void:
	queue_redraw()
