extends Control

## Profile Section UI Script
## Shows detailed character stats and info (left panel)

@onready var portrait: TextureRect = $HBoxContainer/PortraitContainer/Portrait
@onready var name_label: Label = $HBoxContainer/PortraitContainer/NameLabel
@onready var level_job_label: Label = $HBoxContainer/InfoContainer/TopRow/LevelRow/LevelJobLabel
@onready var floor_power_label: Label = $HBoxContainer/InfoContainer/TopRow/LevelRow/FloorPowerLabel
@onready var str_label: Label = $HBoxContainer/InfoContainer/TopRow/StatsContainer/STRLabel
@onready var dex_label: Label = $HBoxContainer/InfoContainer/TopRow/StatsContainer/DEXLabel
@onready var int_label: Label = $HBoxContainer/InfoContainer/TopRow/StatsContainer/INTLabel
@onready var pie_label: Label = $HBoxContainer/InfoContainer/TopRow/StatsContainer/PIELabel
@onready var armor_label: Label = $HBoxContainer/InfoContainer/TopRow/StatsContainer/ArmorLabel
@onready var hp_bar: ProgressBar = $HBoxContainer/InfoContainer/BarsContainer/HPBar
@onready var hp_label: Label = $HBoxContainer/InfoContainer/BarsContainer/HPBar/HPLabel
@onready var xp_bar: ProgressBar = $HBoxContainer/InfoContainer/BarsContainer/XPBar
@onready var xp_label: Label = $HBoxContainer/InfoContainer/BarsContainer/XPBar/XPLabel

func _ready():
	# Connect signals
	CharacterManager.hp_changed.connect(_on_hp_changed)
	CharacterManager.xp_gained.connect(_on_xp_gained)
	CharacterManager.character_leveled_up.connect(_on_leveled_up)
	
	# Initial update
	update_display()

func update_display() -> void:
	if not CharacterManager.current_character:
		return
	
	var character = CharacterManager.current_character
	var total_stats = character.get_total_stats()
	
	# Update name
	if name_label:
		name_label.text = character.name
	
	# Update level/job
	if level_job_label:
		level_job_label.text = "Lvl " + str(character.level) + " " + character.job.name
	
	# Update floor/power (we'll add floor tracking later)
	if floor_power_label:
		floor_power_label.text = "Floor 1 • Power " + str(int(total_stats.Power))
	
	# Update stats
	if str_label:
		str_label.text = "STR " + str(int(total_stats.STR))
	if dex_label:
		dex_label.text = "DEX " + str(int(total_stats.DEX))
	if int_label:
		int_label.text = "INT " + str(int(total_stats.INT))
	if pie_label:
		pie_label.text = "PIE " + str(int(total_stats.PIE))
	if armor_label:
		armor_label.text = "ARM " + str(int(total_stats.Armor))
	
	# Update HP
	update_hp()
	
	# Update XP
	update_xp()
	
	# Update portrait (if available)
	update_portrait()

func update_hp() -> void:
	if not CharacterManager.current_character:
		return
	
	var character = CharacterManager.current_character
	var current_hp = character.current_hp
	var max_hp = character.max_hp
	
	if hp_bar:
		hp_bar.max_value = max_hp
		hp_bar.value = current_hp
	
	if hp_label:
		hp_label.text = str(int(current_hp)) + "/" + str(int(max_hp))

func update_xp() -> void:
	if not CharacterManager.current_character:
		return
	
	var character = CharacterManager.current_character
	var current_xp = character.xp
	var xp_to_next = character.xp_to_next
	var total_xp_needed = current_xp + xp_to_next
	
	if xp_bar:
		xp_bar.max_value = total_xp_needed
		xp_bar.value = current_xp
	
	if xp_label:
		xp_label.text = str(current_xp) + "/" + str(total_xp_needed)

func update_portrait() -> void:
	# Load character portrait if available
	# For now, we'll leave it empty or use a default
	pass

func _on_hp_changed(_character: Character, _current: float, _max: float) -> void:
	update_hp()

func _on_xp_gained(_character: Character, _amount: int) -> void:
	update_xp()

func _on_leveled_up(_character: Character, _new_level: int) -> void:
	update_display()



