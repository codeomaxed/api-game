extends Node

## Inventory Manager Singleton
## Manages character inventory and equipment

signal item_equipped(character: Character, item: Item, slot: String)
signal item_unequipped(character: Character, item: Item, slot: String)
signal item_added(character: Character, item: Item)
signal item_removed(character: Character, item: Item)
signal inventory_changed()
signal equipment_changed()

## Equip item to character
func equip_item(character: Character, item: Item, slot: String) -> bool:
	if not character:
		push_warning("Cannot equip item: no character")
		return false
	
	if not item:
		push_warning("Cannot equip item: no item")
		return false
	
	# Check if item can be equipped
	if not item.can_equip(character):
		push_warning("Cannot equip item: requirements not met")
		return false
	
	# Check if slot is valid
	var valid_slots = ["weapon", "armor", "accessory1", "accessory2", "accessory3"]
	if not valid_slots.has(slot):
		push_warning("Invalid equipment slot: " + slot)
		return false
	
	# Unequip existing item in slot if any
	if character.equipment.has(slot) and character.equipment[slot]:
		unequip_item(character, slot)
	
	# Equip new item
	character.equipment[slot] = item
	
	# Remove from inventory
	remove_item_from_inventory(character, item)
	
	item_equipped.emit(character, item, slot)
	equipment_changed.emit()
	inventory_changed.emit()
	return true

## Unequip item from character
func unequip_item(character: Character, slot: String) -> bool:
	if not character:
		push_warning("Cannot unequip item: no character")
		return false
	
	if not character.equipment.has(slot) or not character.equipment[slot]:
		return false
	
	var item = character.equipment[slot]
	character.equipment[slot] = null
	
	# Add back to inventory
	add_item_to_inventory(character, item)
	
	item_unequipped.emit(character, item, slot)
	equipment_changed.emit()
	inventory_changed.emit()
	return true

## Add item to inventory
func add_item_to_inventory(character: Character, item: Item) -> void:
	if not character:
		return
	
	if not item:
		return
	
	character.inventory.append(item)
	item_added.emit(character, item)
	inventory_changed.emit()

## Remove item from inventory
func remove_item_from_inventory(character: Character, item: Item) -> bool:
	if not character:
		return false
	
	var index = character.inventory.find(item)
	if index >= 0:
		character.inventory.remove_at(index)
		item_removed.emit(character, item)
		inventory_changed.emit()
		return true
	
	return false

## Get equipment slot name from Item slot enum
func get_slot_name(item_slot: Item.EquipmentSlot) -> String:
	match item_slot:
		Item.EquipmentSlot.WEAPON:
			return "weapon"
		Item.EquipmentSlot.ARMOR:
			return "armor"
		Item.EquipmentSlot.ACCESSORY1:
			return "accessory1"
		Item.EquipmentSlot.ACCESSORY2:
			return "accessory2"
		Item.EquipmentSlot.ACCESSORY3:
			return "accessory3"
		_:
			return ""

