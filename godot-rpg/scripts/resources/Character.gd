class_name Character
extends Resource

## Character Resource (Buriedbornes style)

@export var name: String = "Adventurer"
@export var job: Job
@export var level: int = 1

# Stats (base stats from leveling)
@export var base_stats: BuriedbornesStats

# Health
@export var current_hp: float = 100.0
@export var max_hp: float = 100.0

# Progression
@export var xp: int = 0
@export var xp_to_next: int = 100

# Skills (4-6 skill slots)
@export var skills: Array[String] = []  # Skill IDs
@export var max_skill_slots: int = 4  # Usually 4-6

# Equipment & Inventory
@export var equipment: Dictionary = {}  # {weapon: Item, armor: Item, accessory1: Item, etc.}
@export var inventory: Array = []  # Array of Item resources

# Status Effects
@export var status_effects: Array[Dictionary] = []  # [{type: String, value: float, duration: int, stacks: int}]

# Buffs/Debuffs
@export var buffs: Dictionary = {}  # {Strengthen: float, Weaken: float, DamageReduce: float}

# Portrait
@export var portrait_path: String = "res://assets/ui/characters/Human2.png"

## Calculate total stats with equipment
func get_total_stats() -> BuriedbornesStats:
	var equipment_stats = {}
	
	# Sum up stats from all equipped items
	for slot in equipment.keys():
		var item = equipment[slot]
		if item and item.has_method("get_stat_modifiers"):
			var modifiers = item.get_stat_modifiers()
			for stat in modifiers.keys():
				if not equipment_stats.has(stat):
					equipment_stats[stat] = 0.0
				equipment_stats[stat] += modifiers[stat]
	
	return BuriedbornesStats.calculate_total_stats(base_stats, equipment_stats)

## Get current HP percentage
func get_hp_percentage() -> float:
	if max_hp <= 0:
		return 0.0
	return current_hp / max_hp

## Take damage
func take_damage(amount: float) -> void:
	current_hp = max(0.0, current_hp - amount)

## Heal
func heal(amount: float) -> void:
	current_hp = min(max_hp, current_hp + amount)

## Check if character is alive
func is_alive() -> bool:
	return current_hp > 0.0




