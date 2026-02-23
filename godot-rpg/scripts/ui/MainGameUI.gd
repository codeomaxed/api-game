extends Control

## Main Game UI — rebuilt to match ui_update.html exactly.
## Layout: Header | LeftPanel (Equipment + Inventory) | CenterPanel (Room + HUD) | RightPanel (Map + Movement)

# ─── Node references ───────────────────────────────────────────────
@onready var header: PanelContainer = $MainVBox/Header
@onready var header_label: RichTextLabel = $MainVBox/Header/HeaderHBox/HeaderLabel

@onready var left_panel: PanelContainer = $MainVBox/MainLayout/LeftPanel
@onready var left_vbox: VBoxContainer = $MainVBox/MainLayout/LeftPanel/LeftVBox
@onready var equipment_section: VBoxContainer = $MainVBox/MainLayout/LeftPanel/LeftVBox/EquipmentSection
@onready var equipment_label: Label = $MainVBox/MainLayout/LeftPanel/LeftVBox/EquipmentSection/EquipmentHeader/EquipmentLabel
@onready var equipment_wrapper: HBoxContainer = $MainVBox/MainLayout/LeftPanel/LeftVBox/EquipmentSection/EquipmentWrapper
@onready var left_slots: VBoxContainer = $MainVBox/MainLayout/LeftPanel/LeftVBox/EquipmentSection/EquipmentWrapper/LeftSlots
@onready var center_equip: PanelContainer = $MainVBox/MainLayout/LeftPanel/LeftVBox/EquipmentSection/EquipmentWrapper/CenterEquip
@onready var sword_icon: Label = $MainVBox/MainLayout/LeftPanel/LeftVBox/EquipmentSection/EquipmentWrapper/CenterEquip/CenterEquipInner/SwordIcon
@onready var center_text: Label = $MainVBox/MainLayout/LeftPanel/LeftVBox/EquipmentSection/EquipmentWrapper/CenterEquip/CenterEquipInner/CenterText
@onready var right_slots: VBoxContainer = $MainVBox/MainLayout/LeftPanel/LeftVBox/EquipmentSection/EquipmentWrapper/RightSlots
@onready var inventory_section: PanelContainer = $MainVBox/MainLayout/LeftPanel/LeftVBox/InventorySection
@onready var inventory_grid: GridContainer = $MainVBox/MainLayout/LeftPanel/LeftVBox/InventorySection/InventoryGrid

@onready var center_panel: Control = $MainVBox/MainLayout/CenterPanel
@onready var room_image: TextureRect = $MainVBox/MainLayout/CenterPanel/RoomImage
@onready var environment_fog: ColorRect = $MainVBox/MainLayout/CenterPanel/EnvironmentFog
@onready var atmospheric_effects: Node2D = $MainVBox/MainLayout/CenterPanel/AtmosphericEffects
@onready var hud_container: HBoxContainer = $MainVBox/MainLayout/CenterPanel/HUDContainer
@onready var portrait_box: PanelContainer = $MainVBox/MainLayout/CenterPanel/HUDContainer/PortraitBox
@onready var portrait_text: Label = $MainVBox/MainLayout/CenterPanel/HUDContainer/PortraitBox/PortraitInner/PortraitText
@onready var portrait_image: TextureRect = $MainVBox/MainLayout/CenterPanel/HUDContainer/PortraitBox/PortraitInner/Portrait
@onready var char_class_label: Label = $MainVBox/MainLayout/CenterPanel/HUDContainer/StatsInfo/StatsTop/CharClass
@onready var attributes_hbox: HBoxContainer = $MainVBox/MainLayout/CenterPanel/HUDContainer/StatsInfo/StatsTop/Attributes
@onready var hp_bar: ProgressBar = $MainVBox/MainLayout/CenterPanel/HUDContainer/StatsInfo/HPBarWrapper/HPBarBG/HPBar
@onready var hp_value_label: Label = $MainVBox/MainLayout/CenterPanel/HUDContainer/StatsInfo/HPBarWrapper/HPBarBG/HPValueLabel
@onready var hp_label: Label = $MainVBox/MainLayout/CenterPanel/HUDContainer/StatsInfo/HPBarWrapper/HPLabel
@onready var xp_bar: ProgressBar = $MainVBox/MainLayout/CenterPanel/HUDContainer/StatsInfo/XPBarWrapper/XPBarBG/XPBar
@onready var xp_value_label: Label = $MainVBox/MainLayout/CenterPanel/HUDContainer/StatsInfo/XPBarWrapper/XPBarBG/XPValueLabel
@onready var xp_label: Label = $MainVBox/MainLayout/CenterPanel/HUDContainer/StatsInfo/XPBarWrapper/XPLabel

@onready var right_panel: PanelContainer = $MainVBox/MainLayout/RightPanel
@onready var map_title: Label = $MainVBox/MainLayout/RightPanel/RightVBox/MapSection/MapHeader/MapTitle
@onready var map_label: Label = $MainVBox/MainLayout/RightPanel/RightVBox/MapSection/MapHeader/MapControls/MapLabel
@onready var fog_check: CheckButton = $MainVBox/MainLayout/RightPanel/RightVBox/MapSection/MapHeader/MapControls/FogCheck
@onready var cal_check: CheckButton = $MainVBox/MainLayout/RightPanel/RightVBox/MapSection/MapHeader/MapControls/CalCheck
@onready var test_button: Button = $MainVBox/MainLayout/RightPanel/RightVBox/MapSection/MapHeader/MapControls/TestButton
@onready var minimap: Control = $MainVBox/MainLayout/RightPanel/RightVBox/MapSection/MiniMap
@onready var movement_label: Label = $MainVBox/MainLayout/RightPanel/RightVBox/MovementSection/MovementHeader/MovementLabel
@onready var movement_buttons: VBoxContainer = $MainVBox/MainLayout/RightPanel/RightVBox/MovementSection/MovementButtons

@onready var calibration_popup: PopupPanel = $CalibrationPopup
@onready var character_creation_ui: Control = $CharacterCreationUI

var current_room: DungeonNode = null

var pixelation_enabled: bool = true
var pixel_size: int = 4
var _pixelation_shader: Shader = null
var _pixelation_material: ShaderMaterial = null
var _transition_overlay: ColorRect = null
var _combat_monster_overlay: Node2D = null
var _combat_node_id: String = ""

# ─── Ready ─────────────────────────────────────────────────────────
func _ready():
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	var main_vbox = get_node_or_null("MainVBox")
	if main_vbox:
		main_vbox.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)

	_apply_all_styles()
	_build_equipment_slots()
	_build_inventory_grid()
	_build_attribute_labels()
	_setup_embers()

	DungeonGenerator.room_entered.connect(_on_room_entered)
	CombatManager.combat_started.connect(_on_combat_started)
	CombatManager.combat_ended.connect(_on_combat_ended)
	CombatManager.turn_changed.connect(_on_turn_changed)
	CharacterManager.hp_changed.connect(_on_hp_changed)
	CharacterManager.xp_gained.connect(_on_xp_gained)
	CharacterManager.character_leveled_up.connect(_on_leveled_up)
	if not InventoryManager.inventory_changed.is_connected(_on_inventory_changed):
		InventoryManager.inventory_changed.connect(_on_inventory_changed)
	if not InventoryManager.equipment_changed.is_connected(_on_equipment_changed):
		InventoryManager.equipment_changed.connect(_on_equipment_changed)

	if fog_check and minimap and minimap.has_method("set_fog_of_war"):
		fog_check.toggled.connect(_on_fog_toggled)
		minimap.set_fog_of_war(fog_check.button_pressed)
	if cal_check and minimap and minimap.has_method("set_calibration_mode"):
		cal_check.toggled.connect(_on_cal_toggled)
		minimap.set_calibration_mode(cal_check.button_pressed)
	if minimap:
		minimap.node_clicked_for_calibration.connect(_on_node_clicked_for_calibration)
	if test_button:
		test_button.pressed.connect(_on_test_node_clicked)
	if calibration_popup and calibration_popup.has_signal("override_applied"):
		calibration_popup.override_applied.connect(_on_calibration_override_applied)

	if not CharacterManager.current_character:
		if character_creation_ui:
			character_creation_ui.visible = true
			character_creation_ui.character_created.connect(_on_character_created)
		_set_game_panels_visible(false)
	else:
		start_game()

# ─── Style Application ─────────────────────────────────────────────
func _apply_all_styles() -> void:
	# Header
	if header:
		header.add_theme_stylebox_override("panel", AAA.make_header_style())
	if header_label:
		header_label.add_theme_font_size_override("normal_font_size", 15)
		header_label.add_theme_color_override("default_color", AAA.GOLD_MUTED)

	# Left Panel
	if left_panel:
		left_panel.add_theme_stylebox_override("panel", AAA.make_panel_style())
		var lp_style := left_panel.get_theme_stylebox("panel") as StyleBoxFlat
		if lp_style:
			lp_style.border_width_right = 2
			lp_style.border_color = AAA.IRON_TRIM
		AAA.add_panel_gradient(left_panel, true)

	# Right Panel
	if right_panel:
		right_panel.add_theme_stylebox_override("panel", AAA.make_panel_style())
		var rp_style := right_panel.get_theme_stylebox("panel") as StyleBoxFlat
		if rp_style:
			rp_style.border_width_left = 2
			rp_style.border_color = AAA.IRON_TRIM
		AAA.add_panel_gradient(right_panel, false)

	# Equipment section styling
	if equipment_section:
		var eq_margin := MarginContainer.new()
		equipment_section.add_theme_constant_override("separation", 0)
	if equipment_label:
		equipment_label.add_theme_color_override("font_color", AAA.GOLD_MUTED)
		equipment_label.add_theme_font_size_override("font_size", 15)
	if equipment_wrapper:
		equipment_wrapper.add_theme_constant_override("separation", 15)

	# Center Equipment panel
	if center_equip:
		center_equip.add_theme_stylebox_override("panel", AAA.make_center_equip_style())
	if sword_icon:
		sword_icon.add_theme_font_size_override("font_size", 52)
		sword_icon.add_theme_color_override("font_color", AAA.BONE)
		_start_sword_pulse()
	if center_text:
		center_text.add_theme_font_size_override("font_size", 19)
		center_text.add_theme_color_override("font_color", AAA.BONE)

	# Inventory section
	if inventory_section:
		inventory_section.add_theme_stylebox_override("panel", AAA.make_inventory_section_style())

	# Portrait box
	if portrait_box:
		portrait_box.add_theme_stylebox_override("panel", AAA.make_portrait_style())
	if portrait_text:
		portrait_text.add_theme_font_size_override("font_size", 12)
		portrait_text.add_theme_color_override("font_color", AAA.BONE)

	# HUD bar labels
	for lbl in [hp_label, xp_label]:
		if lbl:
			lbl.add_theme_font_size_override("font_size", 11)
			lbl.add_theme_color_override("font_color", AAA.ASH)

	# HP / XP Bars
	if hp_bar:
		hp_bar.add_theme_stylebox_override("background", AAA.make_bar_bg_style())
		hp_bar.add_theme_stylebox_override("fill", AAA.make_hp_fill_style())
	if xp_bar:
		xp_bar.add_theme_stylebox_override("background", AAA.make_bar_bg_style())
		xp_bar.add_theme_stylebox_override("fill", AAA.make_xp_fill_style())

	# Bar value labels
	for lbl in [hp_value_label, xp_value_label]:
		if lbl:
			lbl.add_theme_font_size_override("font_size", 11)
			lbl.add_theme_color_override("font_color", AAA.BONE)

	# Char class label
	if char_class_label:
		char_class_label.add_theme_font_size_override("font_size", 16)
		char_class_label.add_theme_color_override("font_color", AAA.BONE)

	# Map section
	if map_title:
		map_title.add_theme_font_size_override("font_size", 15)
		map_title.add_theme_color_override("font_color", AAA.BONE)
	if map_label:
		map_label.add_theme_font_size_override("font_size", 12)
		map_label.add_theme_color_override("font_color", AAA.GOLD_MUTED)
	for ctrl in [fog_check, cal_check]:
		if ctrl:
			ctrl.add_theme_font_size_override("font_size", 12)
			ctrl.add_theme_color_override("font_color", AAA.ASH)
	if test_button:
		test_button.add_theme_font_size_override("font_size", 12)
		test_button.add_theme_color_override("font_color", AAA.ASH)

	# Movement header
	if movement_label:
		movement_label.add_theme_font_size_override("font_size", 15)
		movement_label.add_theme_color_override("font_color", AAA.GOLD_MUTED)

	# Enemy profile section styling
	var enemy_section := get_node_or_null("MainVBox/MainLayout/CenterPanel/EnemyProfileSection")
	if enemy_section:
		var es := AAA.make_panel_style()
		es.border_color = AAA.BRASS_TARNISHED
		es.set_border_width_all(1)
		es.content_margin_left = 8
		es.content_margin_right = 8
		es.content_margin_top = 8
		es.content_margin_bottom = 8
		enemy_section.add_theme_stylebox_override("panel", es)
		var name_lbl = enemy_section.get_node_or_null("EnemyVBox/NameLabel")
		if name_lbl:
			name_lbl.add_theme_color_override("font_color", AAA.GOLD_MUTED)
			name_lbl.add_theme_font_size_override("font_size", 12)
		var ehp_bar = enemy_section.get_node_or_null("EnemyVBox/HPBarRow/HPBarContainer/HPBar")
		if ehp_bar:
			ehp_bar.add_theme_stylebox_override("background", AAA.make_bar_bg_style())
			ehp_bar.add_theme_stylebox_override("fill", AAA.make_hp_fill_style())

	# Map section padding
	var map_section = get_node_or_null("MainVBox/MainLayout/RightPanel/RightVBox/MapSection")
	if map_section:
		map_section.add_theme_constant_override("separation", 4)
	var map_header = get_node_or_null("MainVBox/MainLayout/RightPanel/RightVBox/MapSection/MapHeader")
	if map_header:
		map_header.add_theme_constant_override("separation", 20)

	# Movement section border-top
	var move_section = get_node_or_null("MainVBox/MainLayout/RightPanel/RightVBox/MovementSection")
	if move_section:
		move_section.add_theme_constant_override("separation", 8)

# ─── Equipment Slots ───────────────────────────────────────────────
var _left_column_slots := ["head", "shoulder", "chest", "ring1", "ring2"]
var _right_column_slots := ["neck", "cape", "hands", "feet", "weapon"]

func _slot_label(slot: String) -> String:
	var labels := {
		"head": "HEAD", "shoulder": "SHOULDER", "chest": "CHEST",
		"ring1": "RING 1", "ring2": "RING 2", "neck": "NECK",
		"cape": "CAPE", "hands": "HANDS", "feet": "FEET", "weapon": "WEAPON"
	}
	return labels.get(slot, slot.capitalize())

func _build_equipment_slots() -> void:
	if not left_slots or not right_slots:
		return
	for child in left_slots.get_children():
		child.queue_free()
	for child in right_slots.get_children():
		child.queue_free()

	left_slots.add_theme_constant_override("separation", 8)
	right_slots.add_theme_constant_override("separation", 8)

	var left_margin := MarginContainer.new()
	left_margin.add_theme_constant_override("margin_left", 10)
	left_margin.size_flags_horizontal = Control.SIZE_FILL
	left_margin.size_flags_vertical = Control.SIZE_EXPAND_FILL
	var left_inner := VBoxContainer.new()
	left_inner.add_theme_constant_override("separation", 8)
	left_margin.add_child(left_inner)
	left_slots.add_child(left_margin)
	for slot in _left_column_slots:
		left_inner.add_child(_create_equip_slot(slot))

	var right_margin := MarginContainer.new()
	right_margin.add_theme_constant_override("margin_right", 10)
	right_margin.size_flags_horizontal = Control.SIZE_FILL
	right_margin.size_flags_vertical = Control.SIZE_EXPAND_FILL
	var right_inner := VBoxContainer.new()
	right_inner.add_theme_constant_override("separation", 8)
	right_margin.add_child(right_inner)
	right_slots.add_child(right_margin)
	for slot in _right_column_slots:
		right_inner.add_child(_create_equip_slot(slot))

func _create_equip_slot(slot: String) -> Button:
	var btn := Button.new()
	btn.custom_minimum_size = Vector2(90, 90)
	btn.size_flags_horizontal = Control.SIZE_SHRINK_BEGIN
	btn.add_theme_font_size_override("font_size", 11)
	btn.add_theme_color_override("font_color", AAA.ASH)
	btn.add_theme_color_override("font_hover_color", AAA.GOLD_BRIGHT)
	btn.add_theme_stylebox_override("normal", AAA.make_equip_slot_style())
	btn.add_theme_stylebox_override("hover", AAA.make_equip_slot_hover_style())
	btn.add_theme_stylebox_override("pressed", AAA.make_equip_slot_hover_style())
	btn.add_theme_stylebox_override("focus", StyleBoxEmpty.new())

	var character = CharacterManager.current_character
	if character and character.equipment.has(slot):
		var item = character.equipment[slot]
		if item:
			btn.text = item.name if item.name else str(item)
			btn.tooltip_text = item.description if item.get("description") else "Equipped: " + item.name
		else:
			btn.text = _slot_label(slot)
	else:
		btn.text = _slot_label(slot)
	btn.pressed.connect(_on_equipment_slot_clicked.bind(slot))
	return btn

func _on_equipment_slot_clicked(slot: String) -> void:
	print("Clicked equipment slot: ", slot)

# ─── Inventory Grid (4 columns × 6 rows = 24 cells) ──────────────
func _build_inventory_grid() -> void:
	if not inventory_grid:
		return
	for child in inventory_grid.get_children():
		child.queue_free()

	var character = CharacterManager.current_character
	var items: Array = character.inventory if character else []
	for i in range(24):
		var item = items[i] if i < items.size() else null
		inventory_grid.add_child(_create_inv_cell(item))

func _create_inv_cell(item) -> Button:
	var btn := Button.new()
	btn.custom_minimum_size = Vector2(0, 60)
	btn.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	btn.size_flags_vertical = Control.SIZE_EXPAND_FILL
	btn.add_theme_stylebox_override("normal", AAA.make_inv_cell_style())
	btn.add_theme_stylebox_override("hover", AAA.make_inv_cell_hover_style())
	btn.add_theme_stylebox_override("pressed", AAA.make_inv_cell_hover_style())
	btn.add_theme_stylebox_override("focus", StyleBoxEmpty.new())
	btn.add_theme_color_override("font_color", AAA.ASH)
	btn.add_theme_color_override("font_hover_color", AAA.GOLD_BRIGHT)
	btn.add_theme_font_size_override("font_size", 9)
	if item:
		var name_str: String = str(item.get("name", "")) if item is Dictionary else str(item.name)
		btn.text = name_str.substr(0, 6) if name_str.length() > 6 else name_str
		btn.tooltip_text = name_str
		btn.pressed.connect(_on_inv_item_clicked.bind(item))
	else:
		btn.text = ""
		btn.disabled = true
	return btn

func _on_inv_item_clicked(item) -> void:
	var name_str: String = str(item.get("name", "")) if item is Dictionary else str(item.name)
	print("Selected item: ", name_str)

# ─── Attribute Labels (STR, DEX, INT, PIE, ARM) ───────────────────
var _attr_labels: Dictionary = {}

func _build_attribute_labels() -> void:
	if not attributes_hbox:
		return
	for child in attributes_hbox.get_children():
		child.queue_free()
	for stat_name in ["STR", "DEX", "INT", "PIE", "ARM"]:
		var hb := HBoxContainer.new()
		hb.add_theme_constant_override("separation", 2)
		var name_lbl := Label.new()
		name_lbl.text = stat_name
		name_lbl.add_theme_font_size_override("font_size", 15)
		name_lbl.add_theme_color_override("font_color", Color("#f0c860"))
		name_lbl.add_theme_constant_override("shadow_offset_x", 1)
		name_lbl.add_theme_constant_override("shadow_offset_y", 1)
		name_lbl.add_theme_color_override("font_shadow_color", Color(0, 0, 0, 0.9))
		name_lbl.add_theme_constant_override("outline_size", 3)
		name_lbl.add_theme_color_override("font_outline_color", Color(0, 0, 0, 0.8))
		hb.add_child(name_lbl)
		var val_lbl := Label.new()
		val_lbl.text = "10"
		val_lbl.add_theme_font_size_override("font_size", 15)
		val_lbl.add_theme_color_override("font_color", Color.WHITE)
		val_lbl.add_theme_constant_override("shadow_offset_x", 1)
		val_lbl.add_theme_constant_override("shadow_offset_y", 1)
		val_lbl.add_theme_color_override("font_shadow_color", Color(0, 0, 0, 0.9))
		val_lbl.add_theme_constant_override("outline_size", 3)
		val_lbl.add_theme_color_override("font_outline_color", Color(0, 0, 0, 0.8))
		hb.add_child(val_lbl)
		attributes_hbox.add_child(hb)
		_attr_labels[stat_name] = val_lbl

# ─── Ember Particles (Grace + Ash) ────────────────────────────────
func _setup_embers() -> void:
	if not center_panel:
		return
	var embers := CPUParticles2D.new()
	embers.name = "EmberParticles"
	embers.z_index = 3
	embers.amount = 50
	embers.lifetime = 15.0
	embers.explosiveness = 0.0
	embers.randomness = 1.0
	embers.emission_shape = CPUParticles2D.EMISSION_SHAPE_RECTANGLE
	embers.emission_rect_extents = Vector2(600, 10)
	embers.direction = Vector2(0, -1)
	embers.spread = 30.0
	embers.gravity = Vector2(0, 0)
	embers.initial_velocity_min = 15.0
	embers.initial_velocity_max = 40.0
	embers.scale_amount_min = 0.5
	embers.scale_amount_max = 1.5
	embers.color = Color(1.0, 0.91, 0.64, 0.6)
	var grad := Gradient.new()
	grad.set_color(0, Color(1.0, 0.91, 0.64, 0.0))
	grad.set_offset(0, 0.0)
	grad.add_point(0.2, Color(1.0, 0.91, 0.64, 0.7))
	grad.add_point(0.8, Color(1.0, 0.91, 0.64, 0.3))
	grad.set_color(1, Color(1.0, 0.91, 0.64, 0.0))
	embers.color_ramp = grad
	center_panel.add_child(embers)
	call_deferred("_position_embers", embers)

func _position_embers(embers: CPUParticles2D) -> void:
	if center_panel:
		embers.position = Vector2(center_panel.size.x / 2.0, center_panel.size.y + 20)
		embers.emission_rect_extents = Vector2(center_panel.size.x / 2.0, 10)

# ─── Sword Pulse Animation ────────────────────────────────────────
func _start_sword_pulse() -> void:
	if not sword_icon:
		return
	var tween := create_tween().set_loops()
	tween.tween_property(sword_icon, "modulate", Color(1.2, 1.15, 1.0, 1.0), 2.0).set_ease(Tween.EASE_IN_OUT).set_trans(Tween.TRANS_SINE)
	tween.tween_property(sword_icon, "modulate", Color(1.0, 1.0, 1.0, 0.9), 2.0).set_ease(Tween.EASE_IN_OUT).set_trans(Tween.TRANS_SINE)

# ─── Character / HUD Update ───────────────────────────────────────
func _update_hud() -> void:
	var character = CharacterManager.current_character
	if not character:
		return
	var total_stats = character.get_total_stats()
	if char_class_label:
		char_class_label.text = "Lvl " + str(character.level) + " " + character.job.name
	if portrait_text:
		portrait_text.text = character.name
	if center_text:
		center_text.text = character.name

	# Attributes
	var stat_map := {"STR": total_stats.STR, "DEX": total_stats.DEX, "INT": total_stats.INT, "PIE": total_stats.PIE, "ARM": total_stats.Armor}
	for key in stat_map:
		if _attr_labels.has(key):
			_attr_labels[key].text = str(int(stat_map[key]))

	# Floor / Power
	if map_title:
		map_title.text = "Floor 1 • Power " + str(int(total_stats.Power))

	_update_hp()
	_update_xp()

func _update_hp() -> void:
	var character = CharacterManager.current_character
	if not character:
		return
	if hp_bar:
		hp_bar.max_value = character.max_hp
		hp_bar.value = character.current_hp
	if hp_value_label:
		hp_value_label.text = str(int(character.current_hp)) + "/" + str(int(character.max_hp))

func _update_xp() -> void:
	var character = CharacterManager.current_character
	if not character:
		return
	var total_needed = character.xp + character.xp_to_next
	if xp_bar:
		xp_bar.max_value = total_needed
		xp_bar.value = character.xp
	if xp_value_label:
		xp_value_label.text = str(character.xp) + "/" + str(total_needed)

func _on_hp_changed(_character: Character, _current: float, _max: float) -> void:
	_update_hp()

func _on_xp_gained(_character: Character, _amount: int) -> void:
	_update_xp()

func _on_leveled_up(_character: Character, _new_level: int) -> void:
	_update_hud()

func _on_inventory_changed() -> void:
	_build_inventory_grid()

func _on_equipment_changed() -> void:
	_build_equipment_slots()

# ─── Game Flow ─────────────────────────────────────────────────────
func _set_game_panels_visible(vis: bool) -> void:
	for p in [left_panel, center_panel, right_panel]:
		if p:
			p.visible = vis

func _on_character_created(_character: Character) -> void:
	if character_creation_ui:
		character_creation_ui.visible = false
	_set_game_panels_visible(true)
	start_game()
	_build_equipment_slots()
	_build_inventory_grid()
	_update_hud()

func start_game() -> void:
	if not DungeonGenerator.get_current_room():
		DungeonGenerator.generate_map()
	_set_game_panels_visible(true)
	call_deferred("_deferred_start")

func _deferred_start() -> void:
	_update_hud()
	update_ui()

func update_ui() -> void:
	current_room = DungeonGenerator.get_current_room()
	if current_room:
		load_room_description()
		update_minimap()
		call_deferred("_load_room_image_for_room", current_room)
	update_choices()

# ─── Movement / Action Choices ─────────────────────────────────────
func update_choices() -> void:
	if not movement_buttons:
		return
	for child in movement_buttons.get_children():
		child.queue_free()

	if CombatManager.in_combat:
		if movement_label:
			movement_label.text = "ACTIONS"
		var skills = CombatManager.get_available_skills()
		for skill in skills:
			movement_buttons.add_child(_create_skill_button(skill))
		return

	if movement_label:
		movement_label.text = "MOVEMENT"

	var exits: Array = []
	if current_room:
		exits = current_room.get_exits()

	var directions := ["NORTH", "SOUTH", "EAST", "WEST"]
	var arrows := {"NORTH": "↑", "SOUTH": "↓", "EAST": "→", "WEST": "←"}
	for dir in directions:
		var enabled := exits.has(dir)
		var btn := Button.new()
		btn.text = arrows[dir] + "   Go " + dir
		btn.alignment = HORIZONTAL_ALIGNMENT_LEFT
		btn.disabled = not enabled
		btn.add_theme_font_size_override("font_size", 15)
		btn.add_theme_color_override("font_color", AAA.ASH if enabled else Color(AAA.ASH.r, AAA.ASH.g, AAA.ASH.b, 0.25))
		btn.add_theme_color_override("font_hover_color", AAA.BONE)
		btn.add_theme_color_override("font_disabled_color", Color(AAA.ASH.r, AAA.ASH.g, AAA.ASH.b, 0.25))
		btn.add_theme_stylebox_override("normal", AAA.make_move_btn_normal_style())
		btn.add_theme_stylebox_override("hover", AAA.make_move_btn_hover_style())
		btn.add_theme_stylebox_override("disabled", AAA.make_move_btn_disabled_style())
		btn.add_theme_stylebox_override("pressed", AAA.make_move_btn_hover_style())
		btn.add_theme_stylebox_override("focus", StyleBoxEmpty.new())
		if enabled:
			btn.mouse_default_cursor_shape = Control.CURSOR_POINTING_HAND
			btn.pressed.connect(_on_choice_selected.bind(dir))
		movement_buttons.add_child(btn)

	if current_room and current_room.monster and not CombatManager.in_combat:
		var cbtn := Button.new()
		cbtn.text = "⚔   Fight " + current_room.monster.name
		cbtn.alignment = HORIZONTAL_ALIGNMENT_LEFT
		cbtn.add_theme_font_size_override("font_size", 15)
		cbtn.add_theme_color_override("font_color", Color(0.839, 0.236, 0.236))
		cbtn.add_theme_color_override("font_hover_color", AAA.BONE)
		cbtn.add_theme_stylebox_override("normal", AAA.make_move_btn_normal_style())
		cbtn.add_theme_stylebox_override("hover", AAA.make_move_btn_hover_style())
		cbtn.add_theme_stylebox_override("pressed", AAA.make_move_btn_hover_style())
		cbtn.add_theme_stylebox_override("focus", StyleBoxEmpty.new())
		cbtn.mouse_default_cursor_shape = Control.CURSOR_POINTING_HAND
		cbtn.pressed.connect(_on_combat_selected)
		movement_buttons.add_child(cbtn)

func _create_skill_button(skill: Skill) -> Button:
	var enabled := skill.current_cooldown <= 0 and CombatManager.current_turn == CombatManager.CombatTurn.PLAYER
	var btn := Button.new()
	var txt := skill.name
	if skill.current_cooldown > 0:
		txt += " (CD " + str(skill.current_cooldown) + ")"
	btn.text = "⚔   " + txt
	btn.alignment = HORIZONTAL_ALIGNMENT_LEFT
	btn.disabled = not enabled
	btn.add_theme_font_size_override("font_size", 15)
	btn.add_theme_color_override("font_color", Color(0.839, 0.236, 0.236) if enabled else Color(0.5, 0.4, 0.4, 0.7))
	btn.add_theme_color_override("font_hover_color", AAA.BONE)
	btn.add_theme_stylebox_override("normal", AAA.make_move_btn_normal_style())
	btn.add_theme_stylebox_override("hover", AAA.make_move_btn_hover_style())
	btn.add_theme_stylebox_override("disabled", AAA.make_move_btn_disabled_style())
	btn.add_theme_stylebox_override("pressed", AAA.make_move_btn_hover_style())
	btn.add_theme_stylebox_override("focus", StyleBoxEmpty.new())
	if enabled:
		btn.mouse_default_cursor_shape = Control.CURSOR_POINTING_HAND
		btn.pressed.connect(_on_skill_selected.bind(skill.id))
	return btn

func _on_turn_changed(_turn: String) -> void:
	update_choices()

# ─── Choice / Combat Handlers ─────────────────────────────────────
func _on_choice_selected(direction: String) -> void:
	if not current_room:
		return
	var target_id := find_room_in_direction(direction)
	if target_id == "":
		return
	if center_panel:
		var overlay := _get_transition_overlay()
		overlay.visible = true
		overlay.color = Color(0, 0, 0, 0)
		var steps := 8
		var tween := create_tween()
		tween.set_ease(Tween.EASE_OUT)
		tween.tween_method(
			func(linear: float) -> void:
				var a: float = floor(linear * float(steps)) / float(steps)
				overlay.color = Color(0, 0, 0, a),
			0.0, 1.0, 0.25
		)
		tween.tween_callback(func():
			DungeonGenerator.move_to_room(target_id, direction)
		)
		tween.tween_interval(0.08)
		tween.tween_method(
			func(linear: float) -> void:
				var a: float = 1.0 - (floor(linear * float(steps)) / float(steps))
				overlay.color = Color(0, 0, 0, a),
			0.0, 1.0, 0.28
		).set_ease(Tween.EASE_IN)
		tween.tween_callback(func(): overlay.visible = false)
	else:
		DungeonGenerator.move_to_room(target_id, direction)

func find_room_in_direction(direction: String) -> String:
	if not current_room:
		return ""
	var dx := 0
	var dy := 0
	match direction.to_upper():
		"NORTH", "N": dy = -1
		"SOUTH", "S": dy = 1
		"EAST", "E": dx = 1
		"WEST", "W": dx = -1
	var target_id := str(current_room.x + dx) + "," + str(current_room.y + dy)
	if current_room.connections.has(target_id):
		return target_id
	return ""

func _on_combat_selected() -> void:
	var room := DungeonGenerator.get_current_room()
	if not room or not room.monster:
		return
	if not CharacterManager.current_character:
		return
	CombatManager.start_combat(CharacterManager.current_character, room.monster)

func _on_skill_selected(skill_id: String) -> void:
	if CombatManager.current_turn != CombatManager.CombatTurn.PLAYER:
		return
	if skill_id == "basic-attack" and center_panel and _combat_monster_overlay:
		_play_attack_slash()
	await get_tree().create_timer(0.15).timeout
	var result := CombatManager.use_skill(skill_id, "enemy")
	if result.size() > 0:
		var combat_ui = get_node_or_null("CombatUI")
		if combat_ui and combat_ui.has_method("update_hp_bars"):
			combat_ui.update_hp_bars()
		update_choices()

func _play_attack_slash() -> void:
	if not center_panel:
		return
	var eff = center_panel.get_node_or_null("AttackSlashEffect")
	if eff and eff.has_method("play_slash"):
		var sz := center_panel.size
		eff.play_slash(Vector2(sz.x * 0.28, sz.y * 0.92), Vector2(sz.x * 0.72, sz.y * 0.45))

# ─── Combat Events ────────────────────────────────────────────────
func _on_combat_started(_character: Character, enemy: Monster) -> void:
	var combat_ui = get_node_or_null("CombatUI")
	if combat_ui:
		combat_ui.visible = true
	if center_panel and enemy:
		_remove_combat_overlay()
		if not center_panel.has_node("AttackSlashEffect"):
			var slash_script = load("res://scripts/effects/AttackSlashEffect.gd") as GDScript
			if slash_script:
				var slash_eff := Node2D.new()
				slash_eff.name = "AttackSlashEffect"
				slash_eff.set_script(slash_script)
				center_panel.add_child(slash_eff)
		var overlay := Node2D.new()
		overlay.name = "CombatMonsterOverlay"
		var script_res = load("res://scripts/effects/CombatMonsterOverlay.gd") as GDScript
		if script_res:
			overlay.set_script(script_res)
		center_panel.add_child(overlay)
		_combat_monster_overlay = overlay
		overlay.call_deferred("load_monster", enemy)

func _on_combat_ended(victory: bool, _enemy: Monster) -> void:
	_combat_node_id = ""
	_remove_combat_overlay()
	if victory and current_room:
		current_room.monster = null
	update_choices()

func _remove_combat_overlay() -> void:
	if _combat_monster_overlay and is_instance_valid(_combat_monster_overlay):
		if _combat_monster_overlay.has_method("clear_monster"):
			_combat_monster_overlay.clear_monster()
		_combat_monster_overlay.queue_free()
	_combat_monster_overlay = null

# ─── Room Image ────────────────────────────────────────────────────
func _load_room_image_for_room(room: DungeonNode) -> void:
	if not room or not room_image:
		return
	room_image.visible = true
	var texture = RoomImageManager.load_room_image(room)
	if not texture:
		texture = _create_placeholder_room_texture()
	room_image.texture = texture
	room_image.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	room_image.stretch_mode = TextureRect.STRETCH_SCALE
	room_image.modulate = Color.WHITE

	if pixelation_enabled and texture:
		if _pixelation_shader == null:
			_pixelation_shader = load("res://shaders/room_pixelation.gdshader") as Shader
		if _pixelation_shader and _pixelation_material == null:
			_pixelation_material = ShaderMaterial.new()
			_pixelation_material.shader = _pixelation_shader
		if _pixelation_material:
			_pixelation_material.set_shader_parameter("room_texture", texture)
			_pixelation_material.set_shader_parameter("pixel_size", float(pixel_size))
			room_image.material = _pixelation_material
	else:
		room_image.material = null

	if atmospheric_effects and atmospheric_effects.has_method("update_from_room_texture"):
		var cache_key := RoomImageManager.get_room_cache_key(room)
		atmospheric_effects.call_deferred("update_from_room_texture", texture, room_image, cache_key, room.type)

func load_room_description() -> void:
	pass

func get_topology_string() -> String:
	if not current_room:
		return ""
	var entry_dir: String = "south"
	if DungeonGenerator:
		entry_dir = DungeonGenerator.entry_direction
	var topology := RoomImageManager.get_topology_for_room(current_room, entry_dir)
	return topology["name"]

func _create_placeholder_room_texture() -> ImageTexture:
	var img_size := 256
	var img := Image.create(img_size, img_size, false, Image.FORMAT_RGBA8)
	for y in img_size:
		for x in img_size:
			var g := 0.08 + (sin(x * 0.1) * 0.02 + sin(y * 0.1) * 0.02)
			img.set_pixel(x, y, Color(g, g * 0.95, g * 1.1, 1.0))
	return ImageTexture.create_from_image(img)

# ─── Map / Calibration ────────────────────────────────────────────
func update_minimap() -> void:
	if minimap and minimap.has_method("queue_redraw"):
		minimap.queue_redraw()

func _on_fog_toggled(button_pressed: bool) -> void:
	if minimap and minimap.has_method("set_fog_of_war"):
		minimap.set_fog_of_war(button_pressed)

func _on_cal_toggled(button_pressed: bool) -> void:
	if minimap and minimap.has_method("set_calibration_mode"):
		minimap.set_calibration_mode(button_pressed)

func _on_test_node_clicked() -> void:
	if DungeonGenerator.teleport_to_test_node():
		update_ui()

func _on_node_clicked_for_calibration(node: DungeonNode) -> void:
	if not calibration_popup or not node:
		return
	var topology_str := RoomImageManager.get_topology_string_for_node(node)
	calibration_popup.open_for_node(node, topology_str)

func _on_calibration_override_applied() -> void:
	if current_room:
		_load_room_image_for_room(current_room)
	if minimap:
		minimap.queue_redraw()

func _on_room_entered(_node_id: String) -> void:
	update_ui()
	var room := DungeonGenerator.get_current_room()
	if room and room.type == DungeonNode.RoomType.COMBAT and room.monster:
		if not CombatManager.in_combat and _combat_node_id != room.id:
			if CharacterManager.current_character:
				_combat_node_id = room.id
				CombatManager.start_combat(CharacterManager.current_character, room.monster)

# ─── Transition Overlay ───────────────────────────────────────────
func _get_transition_overlay() -> ColorRect:
	if _transition_overlay == null and center_panel:
		_transition_overlay = ColorRect.new()
		_transition_overlay.name = "TransitionOverlay"
		_transition_overlay.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
		_transition_overlay.color = Color(0, 0, 0, 0)
		_transition_overlay.mouse_filter = Control.MOUSE_FILTER_IGNORE
		_transition_overlay.visible = false
		_transition_overlay.z_index = 100
		center_panel.add_child(_transition_overlay)
	return _transition_overlay

# ─── Input ─────────────────────────────────────────────────────────
func _input(event: InputEvent) -> void:
	if event is InputEventKey:
		var key_ev := event as InputEventKey
		if key_ev.pressed and key_ev.keycode == KEY_F5:
			if not CombatManager.in_combat and DungeonGenerator.player_location == DungeonGenerator.TEST_NODE_ID:
				DungeonGenerator.refresh_test_node()
				if current_room and current_room.id == DungeonGenerator.TEST_NODE_ID:
					current_room = DungeonGenerator.get_current_room()
					_load_room_image_for_room(current_room)
					update_choices()
					update_minimap()
				get_viewport().set_input_as_handled()
