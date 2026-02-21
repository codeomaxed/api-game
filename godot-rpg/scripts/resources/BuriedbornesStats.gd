class_name BuriedbornesStats
extends Resource

## Buriedbornes Stat System
## Replaces D&D 5e ability scores

@export var STR: float = 10.0  # Strength - Physical damage, melee attacks
@export var DEX: float = 10.0  # Dexterity - Speed, dodge, ranged attacks
@export var INT: float = 10.0  # Intelligence - Magic damage, spell power
@export var PIE: float = 10.0  # Piety - Healing, support magic, resistance

# Derived Stats
@export var maxHP: float = 100.0  # Maximum Hit Points
@export var Power: float = 6.2  # Base power stat (affects all damage)

# Defense Stats
@export var Armor: float = 2.0  # Physical damage reduction
@export var Resistance: float = 1.0  # Magic damage reduction

# Combat Stats
@export var Avoid: float = 0.0  # Chance to dodge attacks (%)
@export var Parry: float = 0.0  # Chance to parry attacks (%)
@export var Critical: float = 0.0  # Critical hit chance (%)
@export var Reflect: float = 0.0  # Damage reflection (%)
@export var Pursuit: float = 0.0  # Additional attack chance (%)

## Calculate base stats from level
static func calculate_base_stats(level: int) -> BuriedbornesStats:
	var stats = BuriedbornesStats.new()
	stats.STR = 10.0 + (level * 0.5)
	stats.DEX = 10.0 + (level * 0.5)
	stats.INT = 10.0 + (level * 0.5)
	stats.PIE = 10.0 + (level * 0.5)
	stats.maxHP = 100.0 + (20.0 * level)
	stats.Power = 6.2 + (1.8 * level)
	stats.Armor = 2.0 + (level * 0.5)
	stats.Resistance = 1.0 + (level * 0.3)
	stats.Avoid = 0.0
	stats.Parry = 0.0
	stats.Critical = 0.0
	stats.Reflect = 0.0
	stats.Pursuit = 0.0
	return stats

## Calculate total stats (base + equipment)
static func calculate_total_stats(base_stats: BuriedbornesStats, equipment_stats: Dictionary) -> BuriedbornesStats:
	var totals = base_stats.duplicate()
	
	if equipment_stats.has("STR"):
		totals.STR += equipment_stats["STR"]
	if equipment_stats.has("DEX"):
		totals.DEX += equipment_stats["DEX"]
	if equipment_stats.has("INT"):
		totals.INT += equipment_stats["INT"]
	if equipment_stats.has("PIE"):
		totals.PIE += equipment_stats["PIE"]
	if equipment_stats.has("maxHP"):
		totals.maxHP += equipment_stats["maxHP"]
	if equipment_stats.has("Power"):
		totals.Power += equipment_stats["Power"]
	if equipment_stats.has("Armor"):
		totals.Armor += equipment_stats["Armor"]
	if equipment_stats.has("Resistance"):
		totals.Resistance += equipment_stats["Resistance"]
	if equipment_stats.has("Avoid"):
		totals.Avoid += equipment_stats["Avoid"]
	if equipment_stats.has("Parry"):
		totals.Parry += equipment_stats["Parry"]
	if equipment_stats.has("Critical"):
		totals.Critical += equipment_stats["Critical"]
	if equipment_stats.has("Reflect"):
		totals.Reflect += equipment_stats["Reflect"]
	if equipment_stats.has("Pursuit"):
		totals.Pursuit += equipment_stats["Pursuit"]
	
	return totals

## Get stat value for skill calculation
func get_stat_for_skill(primary_stat: String) -> float:
	match primary_stat:
		"STR":
			return STR
		"DEX":
			return DEX
		"INT":
			return INT
		"PIE":
			return PIE
		"STR+INT":
			return STR + INT
		"DEX+INT":
			return DEX + INT
		_:
			return STR




