class_name Skill
extends Resource

## Skill Resource

enum SkillStat {
	STR,
	DEX,
	INT,
	PIE,
	STR_INT,
	DEX_INT
}

@export var id: String = ""
@export var name: String = ""
@export var description: String = ""
@export var primary_stat: SkillStat = SkillStat.STR
@export var power: float = 10.0  # Base power value
@export var skill_power: float = 150.0  # Percentage multiplier (e.g., 150 = 150%)
@export var cooldown: int = 0  # Turns before can use again
@export var current_cooldown: int = 0  # Current cooldown counter

# Effects
@export var effects: Array[Dictionary] = []  # [{type: String, value: float, duration: int}]

# Modifiers
@export var modifiers: Array[String] = []  # ["Firststrike", "Legendary", "Pierce", etc.]

## Check if skill is available (cooldown ready)
func is_available() -> bool:
	return current_cooldown <= 0

## Reduce cooldown by 1
func reduce_cooldown() -> void:
	current_cooldown = max(0, current_cooldown - 1)

## Reset cooldown
func reset_cooldown() -> void:
	current_cooldown = cooldown

## Get primary stat as string
func get_primary_stat_string() -> String:
	match primary_stat:
		SkillStat.STR:
			return "STR"
		SkillStat.DEX:
			return "DEX"
		SkillStat.INT:
			return "INT"
		SkillStat.PIE:
			return "PIE"
		SkillStat.STR_INT:
			return "STR+INT"
		SkillStat.DEX_INT:
			return "DEX+INT"
		_:
			return "STR"




