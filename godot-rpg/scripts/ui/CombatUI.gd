extends Control

## Combat UI Script
## Controls the combat interface

@onready var player_hp_bar: ProgressBar = $PlayerHPBar
@onready var enemy_hp_bar: ProgressBar = $EnemyHPBar
@onready var player_name_label: Label = $PlayerNameLabel
@onready var enemy_name_label: Label = $EnemyNameLabel
@onready var skills_container: HBoxContainer = $SkillsContainer
@onready var combat_log: RichTextLabel = $CombatLog
@onready var monster_display: Control = $MonsterDisplay

func _ready():
	# Connect combat signals
	CombatManager.combat_started.connect(_on_combat_started)
	CombatManager.combat_ended.connect(_on_combat_ended)
	CombatManager.damage_dealt.connect(_on_damage_dealt)
	CombatManager.turn_changed.connect(_on_turn_changed)
	CombatManager.skill_used.connect(_on_skill_used)
	
	# Hide by default
	visible = false

## Handle combat started
func _on_combat_started(character: Character, enemy: Monster) -> void:
	visible = true
	
	# Update UI
	player_name_label.text = character.name
	enemy_name_label.text = enemy.name
	
	# Update HP bars
	update_hp_bars()
	
	# Load monster display
	load_monster_display(enemy)
	
	# Update skills
	update_skills()
	
	# Clear combat log
	combat_log.text = "Combat started!\n"

## Handle combat ended
func _on_combat_ended(victory: bool, enemy: Monster) -> void:
	if victory:
		if enemy:
			combat_log.text += "\nVictory! You defeated " + enemy.name + "!\n"
			# Gain XP
			CharacterManager.gain_xp(enemy.xp)
		else:
			combat_log.text += "\nVictory!\n"
	else:
		combat_log.text += "\nDefeat! You have been defeated...\n"
	
	# Hide after delay
	await get_tree().create_timer(3.0).timeout
	visible = false

## Update HP bars
func update_hp_bars() -> void:
	if not CharacterManager.current_character:
		return
	
	var character = CharacterManager.current_character
	player_hp_bar.max_value = character.max_hp
	player_hp_bar.value = CombatManager.player_hp
	player_hp_bar.get_node("Label").text = str(int(CombatManager.player_hp)) + " / " + str(int(character.max_hp))
	
	if CombatManager.current_enemy:
		var enemy_stats = CombatManager.current_enemy.get_scaled_stats()
		enemy_hp_bar.max_value = enemy_stats.maxHP
		enemy_hp_bar.value = CombatManager.enemy_hp
		enemy_hp_bar.get_node("Label").text = str(int(CombatManager.enemy_hp)) + " / " + str(int(enemy_stats.maxHP))

## Load monster display
func load_monster_display(monster: Monster) -> void:
	# Load monster background
	var background_texture = MonsterImageManager.load_monster_background(monster.id)
	if background_texture and monster_display.has_node("Background"):
		monster_display.get_node("Background").texture = background_texture
	
	# Load monster segmented
	var segmented_texture = MonsterImageManager.load_monster_segmented(monster.id)
	if segmented_texture and monster_display.has_node("Segmented"):
		monster_display.get_node("Segmented").texture = segmented_texture

## Update skills
func update_skills() -> void:
	# Clear existing skill buttons
	for child in skills_container.get_children():
		child.queue_free()
	
	# Add skill buttons
	var available_skills = CombatManager.get_available_skills()
	for skill in available_skills:
		var button = create_skill_button(skill)
		skills_container.add_child(button)

## Create skill button
func create_skill_button(skill: Skill) -> Button:
	var button = Button.new()
	button.text = skill.name
	if skill.current_cooldown > 0:
		button.text += " (CD: " + str(skill.current_cooldown) + ")"
		button.disabled = true
	button.pressed.connect(_on_skill_button_pressed.bind(skill.id))
	return button

## Handle skill button pressed
func _on_skill_button_pressed(skill_id: String) -> void:
	if CombatManager.current_turn != CombatManager.CombatTurn.PLAYER:
		return
	
	var result = CombatManager.use_skill(skill_id, "enemy")
	if result.size() > 0:
		update_hp_bars()
		update_skills()

## Handle damage dealt
func _on_damage_dealt(target: String, amount: float, is_critical: bool) -> void:
	var message = ""
	if target == "player":
		if amount < 0:
			message = "You healed for " + str(int(-amount)) + " HP!"
		else:
			message = "You took " + str(int(amount)) + " damage!"
			if is_critical:
				message += " (CRITICAL!)"
	else:
		if amount < 0:
			message = "Enemy healed for " + str(int(-amount)) + " HP!"
		else:
			message = "Enemy took " + str(int(amount)) + " damage!"
			if is_critical:
				message += " (CRITICAL!)"
	
	combat_log.text += message + "\n"
	update_hp_bars()

## Handle turn changed
func _on_turn_changed(turn: String) -> void:
	if turn == "player":
		combat_log.text += "\n--- Your Turn ---\n"
		update_skills()
	else:
		combat_log.text += "\n--- Enemy Turn ---\n"

## Handle skill used
func _on_skill_used(skill_id: String, target: String) -> void:
	var skill = CombatManager.skill_database.get(skill_id)
	if skill:
		combat_log.text += "You used " + skill.name + "!\n"

