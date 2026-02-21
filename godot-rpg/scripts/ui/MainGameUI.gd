extends Control

## Main Game UI Script
## Controls the main game interface

@onready var left_panel: Control = $MainLayout/LeftPanel
@onready var center_panel: Control = $MainLayout/CenterPanel
@onready var right_panel: Control = $MainLayout/RightPanel
@onready var room_image: TextureRect = $MainLayout/CenterPanel/RoomImage
@onready var description_label: RichTextLabel = $MainLayout/CenterPanel/DescriptionLabel
@onready var choices_container: VBoxContainer = $MainLayout/CenterPanel/ChoicesContainer
@onready var minimap: Control = $MainLayout/RightPanel/MiniMap
@onready var profile_section: Control = $MainLayout/LeftPanel/ProfileSection
@onready var inventory_section: Control = $MainLayout/LeftPanel/InventorySection
@onready var character_creation_ui: Control = $CharacterCreationUI

var current_room: DungeonNode = null

func _ready():
	# Verify ChoicesContainer is correct
	if choices_container:
		var parent = choices_container.get_parent()
		print("[MainGameUI] ChoicesContainer parent: ", parent.name if parent else "null")
		print("[MainGameUI] ChoicesContainer path: ", choices_container.get_path())
		if parent and parent.name != "CenterPanel":
			push_error("[MainGameUI] ChoicesContainer is in wrong parent! Expected CenterPanel, got: " + parent.name)
	
	# Ensure UI elements are visible and on top
	setup_ui_visibility()
	
	# Connect signals
	DungeonGenerator.room_entered.connect(_on_room_entered)
	CombatManager.combat_started.connect(_on_combat_started)
	
	# Check if character exists
	if not CharacterManager.current_character:
		# Show character creation UI
		if character_creation_ui:
			character_creation_ui.visible = true
			character_creation_ui.character_created.connect(_on_character_created)
		# Hide main game UI
		if left_panel:
			left_panel.visible = false
		if center_panel:
			center_panel.visible = false
		if right_panel:
			right_panel.visible = false
	else:
		# Character exists, start game
		start_game()

## Handle character created
func _on_character_created(_character: Character) -> void:
	# Hide character creation UI
	if character_creation_ui:
		character_creation_ui.visible = false
	
	# Show main game UI
	if left_panel:
		left_panel.visible = true
	if center_panel:
		center_panel.visible = true
	if right_panel:
		right_panel.visible = true
	
	# Initialize dungeon and start game
	start_game()

## Start the game
func start_game() -> void:
	# Generate dungeon if not already generated
	if not DungeonGenerator.get_current_room():
		DungeonGenerator.generate_map()
	
	# Show UI elements
	if left_panel:
		left_panel.visible = true
	if center_panel:
		center_panel.visible = true
	if right_panel:
		right_panel.visible = true
	
	# Setup UI visibility (backgrounds, mouse filters, etc.)
	setup_ui_visibility()
	
	# Initialize UI
	update_ui()

## Update UI based on current room
func update_ui() -> void:
	current_room = DungeonGenerator.get_current_room()
	if not current_room:
		return
	
	# Load room image
	load_room_image()
	
	# Load room description
	load_room_description()
	
	# Update choices
	update_choices()
	
	# Update minimap
	update_minimap()

## Load room image
func load_room_image() -> void:
	if not current_room or not room_image:
		return
	
	# Ensure room image is visible
	room_image.visible = true
	
	print("[MainGameUI] Loading room image for room: ", current_room.id, " (type: ", current_room.type, ")")
	var texture = RoomImageManager.load_room_image(current_room)
	if texture:
		room_image.texture = texture
		room_image.expand_mode = TextureRect.EXPAND_FIT_WIDTH_PROPORTIONAL
		room_image.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT
		# Set a dark background color as fallback (in case image has transparency)
		room_image.modulate = Color.WHITE
		print("[MainGameUI] Successfully loaded room image for room: ", current_room.id, " - Texture size: ", texture.get_size())
	else:
		# If no texture, clear it - the background ColorRect will show instead
		room_image.texture = null
		room_image.modulate = Color.WHITE  # Reset modulate
		# Ensure background is visible
		var parent = room_image.get_parent()
		if parent:
			var bg = parent.get_node_or_null("RoomImageBackground")
			if bg:
				bg.visible = true
		var room_type = current_room.get_room_type_name()
		var topology = get_topology_string()
		var expected_folder = "res://assets/rooms/" + (topology if current_room.type == DungeonNode.RoomType.NORMAL else room_type)
		push_warning("[MainGameUI] No room image found for room: " + current_room.id + " (type: " + str(current_room.type) + ") - Expected folder: " + expected_folder)

## Load room description
func load_room_description() -> void:
	if not current_room or not description_label:
		return
	
	var room_type = current_room.get_room_type_name()
	var topology = get_topology_string()
	var narrative = NarrativeManager.load_room_description(room_type, topology)
	
	if narrative.has("description"):
		description_label.text = narrative["description"]
	else:
		description_label.text = "You enter a dark dungeon room..."
	
	# Ensure description is visible
	description_label.visible = true
	description_label.modulate = Color.WHITE

## Get topology string from current room
func get_topology_string() -> String:
	if not current_room:
		return ""
	
	var exits = current_room.get_exits()
	var has_north = exits.has("NORTH")
	var has_south = exits.has("SOUTH")
	var has_east = exits.has("EAST")
	var has_west = exits.has("WEST")
	
	return RoomImageManager.get_topology_folder(has_north, has_south, has_east, has_west)

## Update choices/actions
func update_choices() -> void:
	if not choices_container:
		push_warning("[MainGameUI] ChoicesContainer is null!")
		return
	
	# Verify ChoicesContainer is in CenterPanel
	var parent = choices_container.get_parent()
	if parent and parent.name != "CenterPanel":
		push_error("[MainGameUI] ChoicesContainer is in wrong parent: " + parent.name + " (expected CenterPanel)")
		return
	
	# Clear existing choices
	for child in choices_container.get_children():
		if child.name != "ChoicesBackground":  # Don't remove background
			child.queue_free()
	
	if not current_room:
		return
	
	# Ensure container is visible and properly positioned
	choices_container.visible = true
	choices_container.z_index = 10
	choices_container.mouse_filter = Control.MOUSE_FILTER_STOP
	
	# Verify container position
	print("[MainGameUI] ChoicesContainer position: ", choices_container.position, " size: ", choices_container.size)
	print("[MainGameUI] ChoicesContainer parent: ", parent.name if parent else "null", " at path: ", choices_container.get_path())
	
	# Add movement choices based on exits
	var exits = current_room.get_exits()
	for direction in exits:
		var button = create_choice_button(direction)
		choices_container.add_child(button)
		# Verify button was added correctly
		if button.get_parent() == choices_container:
			print("[MainGameUI] ✓ Button 'Go ", direction, "' added to ChoicesContainer")
		else:
			push_error("[MainGameUI] ✗ Button 'Go ", direction, "' added to wrong parent: ", button.get_parent().name if button.get_parent() else "null")
	
	# Add combat choice if monster present
	if current_room.monster:
		var combat_button = create_combat_button()
		choices_container.add_child(combat_button)

## Create choice button
func create_choice_button(direction: String) -> Button:
	var button = Button.new()
	button.text = "Go " + direction
	button.pressed.connect(_on_choice_selected.bind(direction))
	# Make button more visible
	button.custom_minimum_size = Vector2(150, 40)
	button.add_theme_color_override("font_color", Color.WHITE)
	button.add_theme_color_override("font_hover_color", Color.YELLOW)
	# Ensure button is properly configured
	button.z_index = 11  # Above ChoicesContainer
	button.visible = true
	button.mouse_filter = Control.MOUSE_FILTER_STOP
	# Verify button will be added to correct parent
	if choices_container:
		print("[MainGameUI] Creating button 'Go ", direction, "' - will add to ChoicesContainer at path: ", choices_container.get_path())
	return button

## Create combat button
func create_combat_button() -> Button:
	var button = Button.new()
	button.text = "Fight " + current_room.monster.name
	button.pressed.connect(_on_combat_selected)
	# Make button more visible
	button.custom_minimum_size = Vector2(150, 40)
	button.add_theme_color_override("font_color", Color(1.0, 0.5, 0.5))  # Reddish for combat
	button.add_theme_color_override("font_hover_color", Color.RED)
	return button

## Handle choice selection
func _on_choice_selected(direction: String) -> void:
	if not current_room:
		return
	
	# Find connected room in that direction
	var target_id = find_room_in_direction(direction)
	if target_id != "":
		DungeonGenerator.move_to_room(target_id, direction)
		update_ui()

## Find room in direction
func find_room_in_direction(direction: String) -> String:
	if not current_room:
		return ""
	
	var dx = 0
	var dy = 0
	match direction.to_upper():
		"NORTH", "N":
			dy = -1
		"SOUTH", "S":
			dy = 1
		"EAST", "E":
			dx = 1
		"WEST", "W":
			dx = -1
	
	var target_x = current_room.x + dx
	var target_y = current_room.y + dy
	var target_id = str(target_x) + "," + str(target_y)
	
	# Check if connection exists
	if current_room.connections.has(target_id):
		return target_id
	
	return ""

## Handle combat selection
func _on_combat_selected() -> void:
	if not current_room or not current_room.monster:
		return
	
	if not CharacterManager.current_character:
		push_warning("No character to fight with")
		return
	
	CombatManager.start_combat(CharacterManager.current_character, current_room.monster)

## Handle room entered
func _on_room_entered(_node_id: String) -> void:
	update_ui()

## Handle combat started
func _on_combat_started(_character: Character, _enemy: Monster) -> void:
	# Switch to combat UI (will be implemented in CombatUI scene)
	pass

## Update minimap
func update_minimap() -> void:
	if minimap and minimap.has_method("queue_redraw"):
		minimap.queue_redraw()

## Setup UI visibility
func setup_ui_visibility() -> void:
	# Ensure ProfileSection is visible and on top
	if profile_section:
		profile_section.visible = true
		profile_section.z_index = 2  # Above inventory section
	
	# Ensure InventorySection is visible but below ProfileSection
	if inventory_section:
		inventory_section.visible = true
		inventory_section.z_index = 1
	
	# Ensure room image is configured properly (scene already sets it to fill CenterPanel)
	if room_image:
		room_image.mouse_filter = Control.MOUSE_FILTER_IGNORE
		room_image.z_index = -1  # Behind UI elements
		room_image.visible = true
		# Ensure proper display modes (don't modify anchors/offsets - scene handles that)
		room_image.expand_mode = TextureRect.EXPAND_FIT_WIDTH_PROPORTIONAL
		room_image.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT
		
		# Add background ColorRect behind RoomImage for when there's no texture
		var parent = room_image.get_parent()
		if parent and not parent.has_node("RoomImageBackground"):
			var bg = ColorRect.new()
			bg.name = "RoomImageBackground"
			bg.color = Color(0.05, 0.05, 0.05, 1.0)  # Dark background
			bg.mouse_filter = Control.MOUSE_FILTER_IGNORE
			bg.visible = true
			parent.add_child(bg)
			# Position behind RoomImage
			var room_index = room_image.get_index()
			parent.move_child(bg, room_index)
			bg.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
			bg.z_index = room_image.z_index - 1  # Behind room image
	
	# Ensure description label is visible with background
	if description_label and description_label.get_parent():
		description_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
		# Add background panel matching description size
		var parent = description_label.get_parent()
		var bg = parent.get_node_or_null("DescriptionBackground")
		if not bg:
			bg = ColorRect.new()
			bg.name = "DescriptionBackground"
			bg.color = Color(0, 0, 0, 0.8)
			bg.mouse_filter = Control.MOUSE_FILTER_IGNORE
			bg.visible = true
			parent.add_child(bg)
			# Match description label's anchors and offsets
			bg.set_anchors_preset(Control.PRESET_CENTER)
			bg.offset_left = description_label.offset_left - 10
			bg.offset_top = description_label.offset_top - 10
			bg.offset_right = description_label.offset_right + 10
			bg.offset_bottom = description_label.offset_bottom + 10
			# Move background to be before description in the tree
			var desc_index = description_label.get_index()
			parent.move_child(bg, desc_index)
		# Ensure proper z-index (background behind text, but above room image)
		bg.z_index = 0  # Above room image (-1), below text (default 0)
		bg.visible = true
		print("[MainGameUI] Description background created/updated")
	
	# Ensure choices container is visible and properly positioned
	if choices_container and choices_container.get_parent():
		choices_container.mouse_filter = Control.MOUSE_FILTER_STOP
		choices_container.visible = true
		choices_container.z_index = 10  # Above room image
		# Verify it's in CenterPanel and get parent
		var parent = choices_container.get_parent()
		if parent.name != "CenterPanel":
			push_error("[MainGameUI] ChoicesContainer is not in CenterPanel! Parent: " + parent.name)
		else:
			print("[MainGameUI] ✓ ChoicesContainer correctly in CenterPanel")
		# Add background panel matching choices container size
		var bg = parent.get_node_or_null("ChoicesBackground")
		if not bg:
			bg = ColorRect.new()
			bg.name = "ChoicesBackground"
			bg.color = Color(0, 0, 0, 0.8)
			bg.mouse_filter = Control.MOUSE_FILTER_IGNORE
			bg.visible = true
			parent.add_child(bg)
			# Match choices container's anchors and offsets
			bg.set_anchors_preset(Control.PRESET_BOTTOM_LEFT)
			bg.offset_left = choices_container.offset_left - 10
			bg.offset_top = choices_container.offset_top - 10
			bg.offset_right = choices_container.offset_right + 10
			bg.offset_bottom = choices_container.offset_bottom + 10
			# Move background to be before choices in the tree
			var choices_index = choices_container.get_index()
			parent.move_child(bg, choices_index)
		# Ensure proper z-index (background behind buttons, but above room image)
		bg.z_index = 0  # Above room image (-1), below buttons (default 0)
		bg.visible = true
		print("[MainGameUI] Choices background created/updated")
