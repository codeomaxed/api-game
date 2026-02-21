extends Node

## Combat Manager Singleton
## Manages turn-based combat system

signal combat_started(character: Character, enemy: Monster)
signal combat_ended(victory: bool, enemy: Monster)
signal turn_changed(turn: String)  # "player" or "enemy"
signal damage_dealt(target: String, amount: float, is_critical: bool)  # "player" or "enemy"
signal skill_used(skill_id: String, target: String)
# Note: status_effect_applied signal reserved for future use

enum CombatTurn {
	PLAYER,
	ENEMY
}

var in_combat: bool = false
var current_turn: CombatTurn = CombatTurn.PLAYER
var current_round: int = 1
var current_enemy: Monster = null

# Combat state
var player_hp: float = 0.0
var enemy_hp: float = 0.0
var player_status_effects: Array[Dictionary] = []
var enemy_status_effects: Array[Dictionary] = []
var player_buffs: Dictionary = {}
var enemy_buffs: Dictionary = {}

# Skills
var player_skills: Array[Skill] = []
var skill_database: Dictionary = {}  # {id: Skill}

func _ready():
	load_skills()

## Load skills from data file
func load_skills() -> void:
	var skills_path = "res://data/skills.json"
	
	if ResourceLoader.exists(skills_path):
		var file = FileAccess.open(skills_path, FileAccess.READ)
		if file:
			var json = JSON.new()
			var parse_result = json.parse(file.get_as_text())
			file.close()
			
			if parse_result == OK:
				var skills_data = json.data
				if skills_data is Array:
					for skill_data in skills_data:
						var skill = create_skill_from_data(skill_data)
						skill_database[skill.id] = skill
				return
	
	# Fallback: create default skills
	create_default_skills()

## Create skill from data
func create_skill_from_data(data: Dictionary) -> Skill:
	var skill = Skill.new()
	skill.id = data.get("id", "")
	skill.name = data.get("name", "")
	skill.description = data.get("description", "")
	skill.power = data.get("power", 10.0)
	skill.skill_power = data.get("skillPower", 150.0)
	skill.cooldown = data.get("cooldown", 0)
	
	# Set primary stat
	var stat_str = data.get("primaryStat", "STR")
	match stat_str:
		"STR":
			skill.primary_stat = Skill.SkillStat.STR
		"DEX":
			skill.primary_stat = Skill.SkillStat.DEX
		"INT":
			skill.primary_stat = Skill.SkillStat.INT
		"PIE":
			skill.primary_stat = Skill.SkillStat.PIE
		"STR+INT":
			skill.primary_stat = Skill.SkillStat.STR_INT
		"DEX+INT":
			skill.primary_stat = Skill.SkillStat.DEX_INT
	
	# Load effects - properly convert to Array[Dictionary]
	if data.has("effects"):
		var effects_array: Array[Dictionary] = []
		for effect in data["effects"]:
			if effect is Dictionary:
				effects_array.append(effect)
		skill.effects = effects_array
	
	# Load modifiers - properly convert to Array[String]
	if data.has("modifiers"):
		var modifiers_array: Array[String] = []
		for modifier in data["modifiers"]:
			if modifier is String:
				modifiers_array.append(modifier)
		skill.modifiers = modifiers_array
	
	return skill

## Create default skills
func create_default_skills() -> void:
	# Basic Attack
	var basic_attack = Skill.new()
	basic_attack.id = "basic-attack"
	basic_attack.name = "Basic Attack"
	basic_attack.description = "A simple physical attack"
	basic_attack.primary_stat = Skill.SkillStat.STR
	basic_attack.power = 10.0
	basic_attack.skill_power = 150.0
	basic_attack.cooldown = 0
	skill_database["basic-attack"] = basic_attack
	
	# Magic Missile
	var magic_missile = Skill.new()
	magic_missile.id = "magic-missile"
	magic_missile.name = "Magic Missile"
	magic_missile.description = "A basic magic attack"
	magic_missile.primary_stat = Skill.SkillStat.INT
	magic_missile.power = 15.0
	magic_missile.skill_power = 180.0
	magic_missile.cooldown = 2
	skill_database["magic-missile"] = magic_missile
	
	# Heal
	var heal = Skill.new()
	heal.id = "heal"
	heal.name = "Heal"
	heal.description = "Restores HP"
	heal.primary_stat = Skill.SkillStat.PIE
	heal.power = 20.0
	heal.skill_power = 100.0
	heal.cooldown = 3
	heal.effects = [{"type": "heal", "value": 50.0}]
	skill_database["heal"] = heal

## Start combat
func start_combat(character: Character, enemy: Monster) -> void:
	if not character or not enemy:
		push_error("Cannot start combat: missing character or enemy")
		return
	
	in_combat = true
	current_turn = CombatTurn.PLAYER
	current_round = 1
	current_enemy = enemy
	
	# Set HP
	player_hp = character.current_hp
	enemy_hp = enemy.get_scaled_stats().maxHP
	
	# Reset status effects
	player_status_effects.clear()
	enemy_status_effects.clear()
	player_buffs.clear()
	enemy_buffs.clear()
	
	# Load player skills
	player_skills.clear()
	for skill_id in character.skills:
		if skill_database.has(skill_id):
			var skill = skill_database[skill_id].duplicate()
			skill.current_cooldown = 0
			player_skills.append(skill)
	
	combat_started.emit(character, enemy)
	turn_changed.emit("player")

## End combat
func end_combat(victory: bool) -> void:
	if not in_combat:
		return
	
	in_combat = false
	
	var defeated_enemy = current_enemy  # Store before clearing
	
	# Update character HP if player won
	if victory and CharacterManager.current_character:
		CharacterManager.update_hp(player_hp, CharacterManager.current_character.max_hp)
	
	combat_ended.emit(victory, defeated_enemy)
	current_enemy = null

## Use skill
func use_skill(skill_id: String, target: String = "enemy") -> Dictionary:
	if not in_combat:
		return {}
	
	if current_turn != CombatTurn.PLAYER:
		return {}
	
	# Find skill
	var skill: Skill = null
	for s in player_skills:
		if s.id == skill_id:
			skill = s
			break
	
	if not skill:
		push_warning("Skill not found: " + skill_id)
		return {}
	
	if not skill.is_available():
		push_warning("Skill on cooldown: " + skill_id)
		return {}
	
	# Use skill
	var result = execute_skill(skill, target)
	
	# Set cooldown
	skill.reset_cooldown()
	
	skill_used.emit(skill_id, target)
	
	# End player turn
	end_player_turn()
	
	return result

## Execute skill
func execute_skill(skill: Skill, target: String) -> Dictionary:
	if not CharacterManager.current_character:
		return {}
	
	var character = CharacterManager.current_character
	var total_stats = character.get_total_stats()
	
	# Calculate damage
	var damage = 0.0
	if target == "enemy" and current_enemy:
		damage = calculate_skill_damage(skill, total_stats, character.level)
		
		# Apply modifiers
		damage = apply_damage_modifiers(damage, player_buffs, enemy_buffs, true)
		
		# Apply defense
		var enemy_stats = current_enemy.get_scaled_stats()
		var is_physical = skill.primary_stat == Skill.SkillStat.STR or skill.primary_stat == Skill.SkillStat.DEX
		damage = apply_defense_reduction(damage, enemy_stats.Armor, enemy_stats.Resistance, is_physical)
		
		# Check critical
		var is_critical = check_critical(total_stats.Critical)
		if is_critical:
			damage *= 2.0
		
		# Apply damage
		enemy_hp = max(0.0, enemy_hp - damage)
		damage_dealt.emit("enemy", damage, is_critical)
		
		# Check if enemy defeated
		if enemy_hp <= 0:
			end_combat(true)
			return {"damage": damage, "critical": is_critical, "victory": true}
	
	# Process effects
	for effect in skill.effects:
		match effect.get("type", ""):
			"heal":
				if target == "player":
					var heal_amount = effect.get("value", 0.0)
					player_hp = min(CharacterManager.current_character.max_hp, player_hp + heal_amount)
					damage_dealt.emit("player", -heal_amount, false)  # Negative for heal
			"buff":
				# Apply buff
				pass
			"debuff":
				# Apply debuff
				pass
	
	return {"damage": damage, "critical": false}

## Calculate skill damage
func calculate_skill_damage(skill: Skill, stats: BuriedbornesStats, level: int) -> float:
	var relevant_stat = stats.get_stat_for_skill(skill.get_primary_stat_string())
	var skill_power = skill.power
	var level_bonus = level * 0.5
	
	# Base damage = (STAT + Power) × (Skill Power / 100) × 1.3
	var base_damage = (relevant_stat + stats.Power + level_bonus) * (skill.skill_power / 100.0) * 1.3
	
	# Random factor (0.85-1.15)
	var random_factor = 0.85 + (randf() * 0.3)
	
	return max(1.0, floor(base_damage * random_factor))

## Apply damage modifiers
func apply_damage_modifiers(base_damage: float, attacker_buffs: Dictionary, defender_buffs: Dictionary, _is_attacker_player: bool) -> float:
	var damage = base_damage
	
	# Attacker's Strengthen
	if attacker_buffs.has("Strengthen"):
		damage = damage * (1.0 + attacker_buffs["Strengthen"] / 100.0)
	
	# Defender's Weaken
	if defender_buffs.has("Weaken"):
		damage = damage * (1.0 - defender_buffs["Weaken"] / 100.0)
	
	# Defender's Damage Reduce
	if defender_buffs.has("DamageReduce"):
		damage = damage * (1.0 - defender_buffs["DamageReduce"] / 100.0)
	
	return max(1.0, floor(damage))

## Apply defense reduction
func apply_defense_reduction(damage: float, armor: float, resistance: float, is_physical: bool) -> float:
	if is_physical:
		return max(1.0, damage - armor)
	else:
		return max(1.0, damage - resistance)

## Check critical hit
func check_critical(critical_chance: float) -> bool:
	return randf() * 100.0 < critical_chance

## End player turn
func end_player_turn() -> void:
	# Reduce cooldowns
	for skill in player_skills:
		skill.reduce_cooldown()
	
	# Process status effects
	process_status_effects("player")
	
	# Switch to enemy turn
	current_turn = CombatTurn.ENEMY
	turn_changed.emit("enemy")
	
	# Enemy attacks
	enemy_attack()

## Enemy attack
func enemy_attack() -> void:
	if not in_combat or not current_enemy or not CharacterManager.current_character:
		return
	
	var character = CharacterManager.current_character
	var total_stats = character.get_total_stats()
	var enemy_stats = current_enemy.get_scaled_stats()
	
	# Simple enemy attack (can be enhanced later)
	var base_damage = enemy_stats.Power * 1.5
	var damage = apply_damage_modifiers(base_damage, enemy_buffs, player_buffs, false)
	damage = apply_defense_reduction(damage, total_stats.Armor, total_stats.Resistance, true)
	
	# Check avoid/parry
	if check_avoid(total_stats.Avoid):
		damage_dealt.emit("player", 0.0, false)
		end_enemy_turn()
		return
	
	if check_parry(total_stats.Parry):
		damage *= 0.5  # Reduce damage on parry
	
	# Apply damage
	player_hp = max(0.0, player_hp - damage)
	damage_dealt.emit("player", damage, false)
	
	# Check if player defeated
	if player_hp <= 0:
		end_combat(false)
		return
	
	end_enemy_turn()

## Check avoid
func check_avoid(avoid_chance: float) -> bool:
	return randf() * 100.0 < avoid_chance

## Check parry
func check_parry(parry_chance: float) -> bool:
	return randf() * 100.0 < parry_chance

## End enemy turn
func end_enemy_turn() -> void:
	# Process status effects
	process_status_effects("enemy")
	
	# Switch to player turn
	current_turn = CombatTurn.PLAYER
	current_round += 1
	turn_changed.emit("player")

## Process status effects
func process_status_effects(target: String) -> void:
	var effects = player_status_effects if target == "player" else enemy_status_effects
	var updated_effects: Array[Dictionary] = []
	var damage = 0.0
	var heal = 0.0
	
	for effect in effects:
		var new_duration = effect.get("duration", 0) - 1
		if new_duration <= 0:
			continue
		
		var effect_type = effect.get("type", "")
		match effect_type:
			"Poison", "Burn", "Bleed":
				var stacks = effect.get("stacks", 1)
				damage += effect.get("value", 0.0) * stacks
			"Regeneration":
				var stacks = effect.get("stacks", 1)
				heal += effect.get("value", 0.0) * stacks
			"Freeze", "Stun":
				# Prevent action (handled elsewhere)
				pass
		
		var updated_effect = effect.duplicate()
		updated_effect["duration"] = new_duration
		updated_effects.append(updated_effect)
	
	# Update effects
	if target == "player":
		player_status_effects = updated_effects
		if damage > 0:
			player_hp = max(0.0, player_hp - damage)
			damage_dealt.emit("player", damage, false)
		if heal > 0:
			player_hp = min(CharacterManager.current_character.max_hp, player_hp + heal)
			damage_dealt.emit("player", -heal, false)
	else:
		enemy_status_effects = updated_effects
		if damage > 0:
			enemy_hp = max(0.0, enemy_hp - damage)
			damage_dealt.emit("enemy", damage, false)
		if heal > 0:
			enemy_hp += heal
			damage_dealt.emit("enemy", -heal, false)

## Get available skills
func get_available_skills() -> Array[Skill]:
	var available: Array[Skill] = []
	for skill in player_skills:
		if skill.is_available():
			available.append(skill)
	return available
