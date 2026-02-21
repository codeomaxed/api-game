extends Control

## Inventory UI Script
## Shows equipment slots and inventory items

@onready var equipment_grid: GridContainer = $VBoxContainer/EquipmentSection/EquipmentGrid
@onready var inventory_list: ItemList = $VBoxContainer/InventorySection/InventoryList

func _ready():
	# Connect signals
	if not InventoryManager.inventory_changed.is_connected(_on_inventory_changed):
		InventoryManager.inventory_changed.connect(_on_inventory_changed)
	
	if not InventoryManager.equipment_changed.is_connected(_on_equipment_changed):
		InventoryManager.equipment_changed.connect(_on_equipment_changed)
	
	# Initial update
	update_display()

func update_display() -> void:
	if not CharacterManager.current_character:
		return
	
	update_equipment()
	update_inventory()

func update_equipment() -> void:
	if not equipment_grid:
		return
	
	# Clear existing equipment slots
	for child in equipment_grid.get_children():
		child.queue_free()
	
	# Equipment slots - using the actual Character equipment structure
	# For now, show common slots that might exist
	var slots = ["weapon", "armor", "accessory1", "accessory2", "accessory3"]
	
	# Also try to show browser-style slots if they exist
	var character = CharacterManager.current_character
	if character:
		# Check if character has browser-style equipment slots
		var browser_slots = ["head", "neck", "shoulder", "cape", "chest", "hands", "ring1", "feet", "ring2"]
		for slot in browser_slots:
			if character.equipment.has(slot):
				if not slots.has(slot):
					slots.append(slot)
	
	for slot in slots:
		var slot_button = create_equipment_slot(slot)
		equipment_grid.add_child(slot_button)

func create_equipment_slot(slot: String) -> Button:
	var button = Button.new()
	button.custom_minimum_size = Vector2(40, 40)
	
	var character = CharacterManager.current_character
	if character and character.equipment.has(slot):
		var item = character.equipment[slot]
		if item:
			button.text = item.name if item.has("name") else str(item)
			if item.has("description"):
				button.tooltip_text = item.description
			else:
				button.tooltip_text = "Equipped: " + str(item)
		else:
			button.text = slot.capitalize()
			button.tooltip_text = "Empty " + slot + " slot"
	else:
		button.text = slot.capitalize()
		button.tooltip_text = "Empty " + slot + " slot"
	
	button.pressed.connect(_on_equipment_slot_clicked.bind(slot))
	return button

func update_inventory() -> void:
	if not inventory_list:
		return
	
	inventory_list.clear()
	
	var character = CharacterManager.current_character
	if not character:
		return
	
	for item in character.inventory:
		inventory_list.add_item(item.name)
	
	if not inventory_list.item_selected.is_connected(_on_inventory_item_selected):
		inventory_list.item_selected.connect(_on_inventory_item_selected)

func _on_equipment_slot_clicked(slot: String) -> void:
	# Show inventory to equip item
	# For now, just log
	print("Clicked equipment slot: ", slot)

func _on_inventory_item_selected(index: int) -> void:
	var character = CharacterManager.current_character
	if not character or index < 0 or index >= character.inventory.size():
		return
	
	var item = character.inventory[index]
	print("Selected item: ", item.name)
	# Show item details and equip option

func _on_inventory_changed() -> void:
	update_inventory()

func _on_equipment_changed() -> void:
	update_equipment()
