class_name Monster
extends Resource

## Monster Resource

enum MonsterTier {
	COMMON,
	UNCOMMON,
	BOSS
}

@export var id: String = ""
@export var name: String = ""
@export var visual_description: String = ""  # For image prompts
@export var combat_description: String = ""  # For narrative text
@export var tier: MonsterTier = MonsterTier.COMMON
@export var min_level: int = 1
@export var xp: int = 50

# Base stats (for level 1)
@export var base_stats: BuriedbornesStats

# Current level (for scaling)
@export var level: int = 1

## Get scaled stats based on level
func get_scaled_stats() -> BuriedbornesStats:
	# Scale stats based on level
	var stats = base_stats.duplicate()
	var level_multiplier = 1.0 + ((level - 1) * 0.2)  # 20% increase per level
	
	stats.STR *= level_multiplier
	stats.DEX *= level_multiplier
	stats.INT *= level_multiplier
	stats.PIE *= level_multiplier
	stats.maxHP *= level_multiplier
	stats.Power *= level_multiplier
	stats.Armor *= level_multiplier
	stats.Resistance *= level_multiplier
	
	return stats

## Get tier name as string
func get_tier_name() -> String:
	match tier:
		MonsterTier.COMMON:
			return "Common"
		MonsterTier.UNCOMMON:
			return "Uncommon"
		MonsterTier.BOSS:
			return "Boss"
		_:
			return "Unknown"




