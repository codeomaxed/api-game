extends Control

## Dungeon MiniMap — Elden Ring aesthetic with circular nodes,
## radial gradient coloring, and faded dashed connection lines.

signal node_clicked_for_calibration(node: DungeonNode)

const CELL_SIZE = 80
const NODE_RADIUS = 10
const NODE_RADIUS_BOSS = 14

var fog_of_war_enabled: bool = true
var calibration_mode_enabled: bool = false

func set_fog_of_war(enabled: bool) -> void:
	fog_of_war_enabled = enabled
	queue_redraw()

func set_calibration_mode(enabled: bool) -> void:
	calibration_mode_enabled = enabled
	queue_redraw()

func _ready():
	if not DungeonGenerator.dungeon_generated.is_connected(_on_dungeon_generated):
		DungeonGenerator.dungeon_generated.connect(_on_dungeon_generated)
	if not DungeonGenerator.room_entered.is_connected(_on_room_entered):
		DungeonGenerator.room_entered.connect(_on_room_entered)
	queue_redraw()

func _draw():
	draw_rect(Rect2(Vector2.ZERO, size), Color(0, 0, 0, 1))
	_draw_minimap()

# ─── Core Drawing ──────────────────────────────────────────────────
func _draw_minimap() -> void:
	if DungeonGenerator.nodes.size() == 0:
		return

	var visible_nodes: Dictionary = {}
	if fog_of_war_enabled:
		visible_nodes = DungeonGenerator.get_visible_nodes()
	else:
		for node_id in DungeonGenerator.nodes.keys():
			visible_nodes[node_id] = true

	var min_x := 999
	var min_y := 999
	var max_x := -999
	var max_y := -999
	for node_id in DungeonGenerator.nodes.keys():
		if node_id == DungeonGenerator.TEST_NODE_ID:
			continue
		var node: DungeonNode = DungeonGenerator.nodes[node_id]
		min_x = min(min_x, node.x)
		min_y = min(min_y, node.y)
		max_x = max(max_x, node.x)
		max_y = max(max_y, node.y)

	var map_w := (max_x - min_x + 1) * CELL_SIZE
	var map_h := (max_y - min_y + 1) * CELL_SIZE
	var zoom := min(size.x / map_w, size.y / map_h) if map_w > 0 and map_h > 0 else 1.0
	zoom = min(zoom, 1.0)

	var offset_x = (size.x / 2.0) - ((min_x + max_x) / 2.0) * CELL_SIZE * zoom
	var offset_y = (size.y / 2.0) - ((min_y + max_y) / 2.0) * CELL_SIZE * zoom

	# Connections first (behind nodes)
	for node_id in DungeonGenerator.nodes.keys():
		if node_id == DungeonGenerator.TEST_NODE_ID:
			continue
		if not visible_nodes.get(node_id, false):
			continue
		_draw_connections(DungeonGenerator.nodes[node_id], offset_x, offset_y, zoom, visible_nodes)

	# Then nodes
	for node_id in DungeonGenerator.nodes.keys():
		if node_id == DungeonGenerator.TEST_NODE_ID:
			continue
		if not visible_nodes.get(node_id, false):
			continue
		var node: DungeonNode = DungeonGenerator.nodes[node_id]
		var is_visited := DungeonGenerator.visited_nodes.has(node.id)
		var has_override := false
		if calibration_mode_enabled and CalibrationOverrideManager:
			var topo_str := _get_topology_str_for_node(node)
			has_override = CalibrationOverrideManager.get_override(topo_str) >= 0
		_draw_node(node, offset_x, offset_y, zoom, is_visited, has_override)

# ─── Node Drawing (Circles) ───────────────────────────────────────
func _draw_node(node: DungeonNode, ox: float, oy: float, zoom: float, is_visited: bool, has_override: bool) -> void:
	var pos := Vector2(node.x * CELL_SIZE * zoom + ox, node.y * CELL_SIZE * zoom + oy)
	var is_boss := node.type == DungeonNode.RoomType.BOSS
	var r := (NODE_RADIUS_BOSS if is_boss else NODE_RADIUS) * zoom
	var is_current := node.id == DungeonGenerator.player_location

	if is_current:
		# Gold glow — current position
		var fill := AAA.GOLD_BRIGHT
		draw_circle(pos, r, fill)
		draw_arc(pos, r, 0, TAU, 32, Color.WHITE, max(1.0, 2.0 * zoom))
		# Outer glow ring
		draw_arc(pos, r + 3 * zoom, 0, TAU, 32, Color(AAA.GOLD_BRIGHT.r, AAA.GOLD_BRIGHT.g, AAA.GOLD_BRIGHT.b, 0.4), max(1.0, 1.5 * zoom))
		return

	var col := _get_node_color(node)

	if is_visited:
		draw_circle(pos, r, col)
		var border_color := Color(1, 1, 1, 0.05)
		if is_boss:
			border_color = Color(0.839, 0.236, 0.236, 0.8)
		draw_arc(pos, r, 0, TAU, 32, border_color, max(1.0, 2.0 * zoom))
	else:
		# Unvisited but scouted — hollow
		draw_arc(pos, r, 0, TAU, 32, Color(col.r, col.g, col.b, 0.7), max(2.0, 3.0 * zoom))

	if calibration_mode_enabled:
		var cal_color := Color(0.29, 0.87, 0.5, 1) if has_override else Color(0.9, 0.2, 0.2, 1)
		draw_arc(pos, r + 2 * zoom, 0, TAU, 32, cal_color, max(2.0, 3.0 * zoom))

func _get_node_color(node: DungeonNode) -> Color:
	match node.type:
		DungeonNode.RoomType.BOSS:
			return Color(0.702, 0.141, 0.141)  # Deep red
		DungeonNode.RoomType.COMBAT:
			return Color(0.361, 0.345, 0.318)  # Grey
		DungeonNode.RoomType.TREASURE:
			return Color(0.902, 0.827, 0.647)  # Gold
		DungeonNode.RoomType.EVENT:
			return Color(0.271, 0.478, 0.271)  # Muted green
		DungeonNode.RoomType.START:
			return Color(0.271, 0.478, 0.271)  # Green
		DungeonNode.RoomType.DEAD_END:
			return Color(0.2, 0.18, 0.16)  # Dark grey, nearly invisible
		DungeonNode.RoomType.MERCHANT:
			return Color(0.549, 0.471, 0.263)  # XP gold
		_:
			return Color(0.361, 0.345, 0.318)

# ─── Connection Drawing (Dashed Lines) ────────────────────────────
func _draw_connections(node: DungeonNode, ox: float, oy: float, zoom: float, visible_nodes: Dictionary) -> void:
	var start := Vector2(node.x * CELL_SIZE * zoom + ox, node.y * CELL_SIZE * zoom + oy)
	for target_id in node.connections.keys():
		if target_id == DungeonGenerator.TEST_NODE_ID:
			continue
		if not visible_nodes.get(target_id, false):
			continue
		var target: DungeonNode = DungeonGenerator.nodes.get(target_id)
		if not target:
			continue
		# Avoid drawing both directions
		if target.id < node.id:
			continue
		var end := Vector2(target.x * CELL_SIZE * zoom + ox, target.y * CELL_SIZE * zoom + oy)
		var both_visited := DungeonGenerator.visited_nodes.has(node.id) and DungeonGenerator.visited_nodes.has(target.id)
		var line_color := Color(1, 1, 1, 0.15) if both_visited else Color(1, 1, 1, 0.07)
		_draw_dashed_line(start, end, line_color, max(1.0, 1.5 * zoom), 6.0 * zoom, 4.0 * zoom)

func _draw_dashed_line(from: Vector2, to: Vector2, color: Color, width: float, dash_len: float, gap_len: float) -> void:
	var dir := (to - from)
	var total := dir.length()
	if total < 0.01:
		return
	dir = dir.normalized()
	var drawn := 0.0
	var drawing := true
	while drawn < total:
		var seg := dash_len if drawing else gap_len
		seg = min(seg, total - drawn)
		if drawing:
			draw_line(from + dir * drawn, from + dir * (drawn + seg), color, width)
		drawn += seg
		drawing = not drawing

# ─── Topology Helper ──────────────────────────────────────────────
func _get_topology_str_for_node(node: DungeonNode) -> String:
	var has_n := (node.mask & 1) != 0
	var has_e := (node.mask & 2) != 0
	var has_s := (node.mask & 4) != 0
	var has_w := (node.mask & 8) != 0
	return CalibrationOverrideManager.get_topology_string(has_n, has_s, has_e, has_w)

# ─── Signals ──────────────────────────────────────────────────────
func _on_dungeon_generated(_nodes: Dictionary, _start_id: String, _boss_id: String) -> void:
	queue_redraw()

func _on_room_entered(_node_id: String) -> void:
	queue_redraw()

# ─── Click-to-Calibrate ───────────────────────────────────────────
func _gui_input(event: InputEvent) -> void:
	if not event is InputEventMouseButton:
		return
	var ev := event as InputEventMouseButton
	if not ev.pressed or ev.button_index != MOUSE_BUTTON_LEFT:
		return
	if not calibration_mode_enabled or DungeonGenerator.nodes.is_empty():
		return
	var hit := _get_node_at_position(ev.position)
	if hit:
		node_clicked_for_calibration.emit(hit)

func _get_node_at_position(local_pos: Vector2) -> DungeonNode:
	var min_x := 999
	var min_y := 999
	var max_x := -999
	var max_y := -999
	for node_id in DungeonGenerator.nodes.keys():
		if node_id == DungeonGenerator.TEST_NODE_ID:
			continue
		var n: DungeonNode = DungeonGenerator.nodes[node_id]
		min_x = min(min_x, n.x)
		min_y = min(min_y, n.y)
		max_x = max(max_x, n.x)
		max_y = max(max_y, n.y)
	var map_w := (max_x - min_x + 1) * CELL_SIZE
	var map_h := (max_y - min_y + 1) * CELL_SIZE
	var zoom := min(size.x / map_w, size.y / map_h) if map_w > 0 and map_h > 0 else 1.0
	zoom = min(zoom, 1.0)
	var offset_x = (size.x / 2.0) - ((min_x + max_x) / 2.0) * CELL_SIZE * zoom
	var offset_y = (size.y / 2.0) - ((min_y + max_y) / 2.0) * CELL_SIZE * zoom
	for node_id in DungeonGenerator.nodes.keys():
		if node_id == DungeonGenerator.TEST_NODE_ID:
			continue
		var node: DungeonNode = DungeonGenerator.nodes[node_id]
		var pos := Vector2(node.x * CELL_SIZE * zoom + offset_x, node.y * CELL_SIZE * zoom + offset_y)
		var r := (NODE_RADIUS_BOSS if node.type == DungeonNode.RoomType.BOSS else NODE_RADIUS) * zoom
		if pos.distance_to(local_pos) <= r + 5:
			return node
	return null
