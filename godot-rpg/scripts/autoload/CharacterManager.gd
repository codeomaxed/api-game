extends Node

## Character Manager Singleton
## Manages character creation, stats, and progression

signal character_created(character: Character)
signal character_leveled_up(character: Character, new_level: int)
signal hp_changed(character: Character, current: float, max: float)
signal xp_gained(character: Character, amount: int)

var current_character: Character = null

## Create a new character
func create_character(character_name: String, job_name: String = "Warrior") -> Character:
	var character = Character.new()
	character.name = character_name
	character.level = 1
	
	# Load job definition
	var job = load_job(job_name)
	if not job:
		job = load_job("Warrior")  # Fallback to Warrior
	character.job = job
	
	# Calculate base stats
	character.base_stats = BuriedbornesStats.calculate_base_stats(1)
	
	# Apply job bonuses
	if job.stat_bonuses.size() > 0:
		for stat in job.stat_bonuses.keys():
			match stat:
				"STR":
					character.base_stats.STR += job.stat_bonuses[stat]
				"DEX":
					character.base_stats.DEX += job.stat_bonuses[stat]
				"INT":
					character.base_stats.INT += job.stat_bonuses[stat]
				"PIE":
					character.base_stats.PIE += job.stat_bonuses[stat]
				"maxHP":
					character.base_stats.maxHP += job.stat_bonuses[stat]
				"Power":
					character.base_stats.Power += job.stat_bonuses[stat]
				"Armor":
					character.base_stats.Armor += job.stat_bonuses[stat]
				"Resistance":
					character.base_stats.Resistance += job.stat_bonuses[stat]
				"Critical":
					character.base_stats.Critical += job.stat_bonuses[stat]
	
	# Set HP
	character.max_hp = character.base_stats.maxHP
	character.current_hp = character.max_hp
	
	# Set starting skills
	character.skills = job.starting_skills.duplicate()
	
	# Calculate XP to next level
	character.xp_to_next = calculate_xp_to_next(1)
	
	current_character = character
	character_created.emit(character)
	return character

## Load job definition from data file
func load_job(job_name: String) -> Job:
	# Try to load from data file
	var jobs_path = "res://data/jobs.json"
	if ResourceLoader.exists(jobs_path):
		var file = FileAccess.open(jobs_path, FileAccess.READ)
		if file:
			var json = JSON.new()
			var parse_result = json.parse(file.get_as_text())
			file.close()
			
			if parse_result == OK:
				var jobs_data = json.data
				if jobs_data.has(job_name):
					var job_data = jobs_data[job_name]
					var job = Job.new()
					job.name = job_data.get("name", job_name)
					job.description = job_data.get("description", "")
					job.primary_stat = job_data.get("primaryStat", "STR")
					
					# Properly convert starting_skills to Array[String]
					if job_data.has("startingSkills"):
						var skills_array: Array[String] = []
						for skill_id in job_data["startingSkills"]:
							if skill_id is String:
								skills_array.append(skill_id)
						job.starting_skills = skills_array
					
					job.stat_bonuses = job_data.get("statBonuses", {})
					return job
	
	# Fallback: create default jobs
	return create_default_job(job_name)

## Create default job (fallback)
func create_default_job(job_name: String) -> Job:
	var job = Job.new()
	job.name = job_name
	
	match job_name:
		"Warrior":
			job.description = "A melee fighter specializing in physical combat"
			job.primary_stat = "STR"
			job.starting_skills = ["basic-attack"]
			job.stat_bonuses = {"STR": 2, "maxHP": 20}
		"Mage":
			job.description = "A spellcaster specializing in magic damage"
			job.primary_stat = "INT"
			job.starting_skills = ["magic-missile"]
			job.stat_bonuses = {"INT": 2, "Power": 2}
		"Rogue":
			job.description = "A nimble fighter specializing in speed and critical hits"
			job.primary_stat = "DEX"
			job.starting_skills = ["basic-attack"]
			job.stat_bonuses = {"DEX": 2, "Critical": 5}
		"Cleric":
			job.description = "A support class specializing in healing and protection"
			job.primary_stat = "PIE"
			job.starting_skills = ["heal"]
			job.stat_bonuses = {"PIE": 2, "Resistance": 5}
		_:
			job.description = "A melee fighter specializing in physical combat"
			job.primary_stat = "STR"
			job.starting_skills = ["basic-attack"]
			job.stat_bonuses = {"STR": 2, "maxHP": 20}
	
	return job

## Calculate XP needed for next level
func calculate_xp_to_next(level: int) -> int:
	return int(100 * pow(1.5, level - 1))

## Gain XP
func gain_xp(amount: int) -> void:
	if not current_character:
		return
	
	current_character.xp += amount
	xp_gained.emit(current_character, amount)
	
	# Check for level up
	while current_character.xp >= current_character.xp_to_next:
		level_up()

## Level up
func level_up() -> void:
	if not current_character:
		return
	
	current_character.xp -= current_character.xp_to_next
	current_character.level += 1
	
	# Recalculate base stats for new level
	current_character.base_stats = BuriedbornesStats.calculate_base_stats(current_character.level)
	
	# Reapply job bonuses
	if current_character.job and current_character.job.stat_bonuses.size() > 0:
		for stat in current_character.job.stat_bonuses.keys():
			match stat:
				"STR":
					current_character.base_stats.STR += current_character.job.stat_bonuses[stat]
				"DEX":
					current_character.base_stats.DEX += current_character.job.stat_bonuses[stat]
				"INT":
					current_character.base_stats.INT += current_character.job.stat_bonuses[stat]
				"PIE":
					current_character.base_stats.PIE += current_character.job.stat_bonuses[stat]
				"maxHP":
					current_character.base_stats.maxHP += current_character.job.stat_bonuses[stat]
				"Power":
					current_character.base_stats.Power += current_character.job.stat_bonuses[stat]
				"Armor":
					current_character.base_stats.Armor += current_character.job.stat_bonuses[stat]
				"Resistance":
					current_character.base_stats.Resistance += current_character.job.stat_bonuses[stat]
				"Critical":
					current_character.base_stats.Critical += current_character.job.stat_bonuses[stat]
	
	# Update max HP
	var old_max_hp = current_character.max_hp
	current_character.max_hp = current_character.base_stats.maxHP
	# Heal by the difference
	current_character.current_hp += (current_character.max_hp - old_max_hp)
	
	# Calculate new XP requirement
	current_character.xp_to_next = calculate_xp_to_next(current_character.level)
	
	character_leveled_up.emit(current_character, current_character.level)

## Update HP
func update_hp(current: float, max_hp: float) -> void:
	if not current_character:
		return
	
	current_character.current_hp = current
	current_character.max_hp = max_hp
	hp_changed.emit(current_character, current, max_hp)

## Take damage
func take_damage(amount: float) -> void:
	if not current_character:
		return
	
	current_character.take_damage(amount)
	hp_changed.emit(current_character, current_character.current_hp, current_character.max_hp)

## Heal
func heal(amount: float) -> void:
	if not current_character:
		return
	
	current_character.heal(amount)
	hp_changed.emit(current_character, current_character.current_hp, current_character.max_hp)
