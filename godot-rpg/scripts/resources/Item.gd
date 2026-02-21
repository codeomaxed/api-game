class_name Item
extends Resource

## Item Resource

enum ItemRarity {
	COMMON,
	UNCOMMON,
	RARE,
	VERY_RARE,
	LEGENDARY,
	ARTIFACT
}

enum EquipmentSlot {
	WEAPON,
	ARMOR,
	ACCESSORY1,
	ACCESSORY2,
	ACCESSORY3,
	OTHER
}

@export var id: String = ""
@export var name: String = ""
@export var rarity: ItemRarity = ItemRarity.COMMON
@export var slot: EquipmentSlot = EquipmentSlot.OTHER
@export var description: String = ""
@export var image_path: String = ""

# Stat modifiers
@export var stat_modifiers: Dictionary = {}  # {STR: float, DEX: float, etc.}

# Requirements
@export var requirements: Dictionary = {}  # {STR: int, level: int, etc.}

# Class restrictions
@export var class_restrictions: Array[String] = []

## Get stat modifiers as dictionary
func get_stat_modifiers() -> Dictionary:
	return stat_modifiers.duplicate()

## Check if character can equip this item
func can_equip(character: Character) -> bool:
	# Check class restrictions
	if class_restrictions.size() > 0:
		if not character.job or not class_restrictions.has(character.job.name):
			return false
	
	# Check requirements
	if requirements.size() > 0:
		var total_stats = character.get_total_stats()
		for req_stat in requirements.keys():
			var required_value = requirements[req_stat]
			var current_value = 0.0
			
			match req_stat:
				"STR":
					current_value = total_stats.STR
				"DEX":
					current_value = total_stats.DEX
				"INT":
					current_value = total_stats.INT
				"PIE":
					current_value = total_stats.PIE
				"level":
					current_value = character.level
			
			if current_value < required_value:
				return false
	
	return true

## Get rarity name as string
func get_rarity_name() -> String:
	match rarity:
		ItemRarity.COMMON:
			return "Common"
		ItemRarity.UNCOMMON:
			return "Uncommon"
		ItemRarity.RARE:
			return "Rare"
		ItemRarity.VERY_RARE:
			return "Very Rare"
		ItemRarity.LEGENDARY:
			return "Legendary"
		ItemRarity.ARTIFACT:
			return "Artifact"
		_:
			return "Unknown"




