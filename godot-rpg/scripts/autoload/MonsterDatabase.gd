extends Node

## Monster Database Singleton
## Manages monster definitions and loading

var monsters: Dictionary = {}  # {id: Monster}

func _ready():
	load_monsters()

## Load monsters from data file
func load_monsters() -> void:
	var monsters_path = "res://data/monsters.json"
	
	if not ResourceLoader.exists(monsters_path):
		push_warning("Monsters data file not found: " + monsters_path)
		create_default_monsters()
		return
	
	var file = FileAccess.open(monsters_path, FileAccess.READ)
	if not file:
		push_warning("Cannot open monsters file: " + monsters_path)
		create_default_monsters()
		return
	
	var json = JSON.new()
	var parse_result = json.parse(file.get_as_text())
	file.close()
	
	if parse_result != OK:
		push_warning("Failed to parse monsters JSON")
		create_default_monsters()
		return
	
	var monsters_data = json.data
	if not monsters_data is Array:
		push_warning("Monsters data is not an array")
		create_default_monsters()
		return
	
	# Load each monster
	for monster_data in monsters_data:
		var monster = Monster.new()
		monster.id = monster_data.get("id", "")
		monster.name = monster_data.get("name", "")
		monster.visual_description = monster_data.get("visualDescription", "")
		monster.combat_description = monster_data.get("combatDescription", "")
		monster.min_level = monster_data.get("minLevel", 1)
		monster.xp = monster_data.get("xp", 50)
		
		# Set tier
		var tier_str = monster_data.get("tier", "common")
		match tier_str:
			"common":
				monster.tier = Monster.MonsterTier.COMMON
			"uncommon":
				monster.tier = Monster.MonsterTier.UNCOMMON
			"boss":
				monster.tier = Monster.MonsterTier.BOSS
		
		# Load base stats if provided
		if monster_data.has("baseStats"):
			var stats_data = monster_data["baseStats"]
			monster.base_stats = BuriedbornesStats.new()
			monster.base_stats.STR = stats_data.get("STR", 10.0)
			monster.base_stats.DEX = stats_data.get("DEX", 10.0)
			monster.base_stats.INT = stats_data.get("INT", 10.0)
			monster.base_stats.PIE = stats_data.get("PIE", 10.0)
			monster.base_stats.maxHP = stats_data.get("maxHP", 100.0)
			monster.base_stats.Power = stats_data.get("Power", 6.2)
			monster.base_stats.Armor = stats_data.get("Armor", 2.0)
			monster.base_stats.Resistance = stats_data.get("Resistance", 1.0)
		else:
			# Default stats
			monster.base_stats = BuriedbornesStats.calculate_base_stats(1)
		
		monsters[monster.id] = monster

## Create default monsters (fallback)
func create_default_monsters() -> void:
	# Skeleton
	var skeleton = Monster.new()
	skeleton.id = "skeleton"
	skeleton.name = "Skeleton"
	skeleton.visual_description = "a skeletal warrior clad in rusted chainmail, its empty eye sockets glowing with a faint crimson light, wielding a notched longsword. The bones are yellowed with age, and tattered cloth hangs from its frame. Heavy cross-hatching shadows define its form."
	skeleton.combat_description = "A skeletal warrior rises from the shadows, its bones clicking as it moves. Rusted chainmail hangs loosely from its frame, and crimson light flickers in its empty eye sockets."
	skeleton.tier = Monster.MonsterTier.COMMON
	skeleton.min_level = 1
	skeleton.xp = 50
	skeleton.base_stats = BuriedbornesStats.calculate_base_stats(1)
	monsters["skeleton"] = skeleton
	
	# Add more default monsters as needed...

## Get monster by ID
func get_monster(id: String) -> Monster:
	if monsters.has(id):
		return monsters[id]
	push_warning("Monster not found: " + id)
	return null

## Get all monsters for a given level
func get_monsters_for_level(level: int) -> Array[Monster]:
	var available: Array[Monster] = []
	for monster in monsters.values():
		if monster.min_level <= level:
			available.append(monster)
	return available

## Get random monster for level
func get_random_monster(level: int) -> Monster:
	var available = get_monsters_for_level(level)
	if available.size() == 0:
		return null
	return available[randi() % available.size()]

## Scale monster to level
func scale_monster_to_level(monster: Monster, level: int) -> Monster:
	var scaled = monster.duplicate()
	scaled.level = level
	return scaled
