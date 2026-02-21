extends Control

## Character Display UI Script
## Shows character stats and info

@onready var name_label: Label = $VBoxContainer/NameLabel
@onready var level_label: Label = $VBoxContainer/LevelLabel
@onready var hp_label: Label = $VBoxContainer/HPLabel
@onready var hp_bar: ProgressBar = $VBoxContainer/HPBar

func _ready():
	# Connect signals
	CharacterManager.hp_changed.connect(_on_hp_changed)
	CharacterManager.character_leveled_up.connect(_on_leveled_up)
	
	# Initial update
	update_display()

func update_display() -> void:
	if not CharacterManager.current_character:
		return
	
	var character = CharacterManager.current_character
	
	# Update name
	if name_label:
		name_label.text = character.name
	
	# Update level
	if level_label:
		level_label.text = "Level " + str(character.level)
	
	# Update HP
	update_hp()

func update_hp() -> void:
	if not CharacterManager.current_character:
		return
	
	var character = CharacterManager.current_character
	var current_hp = character.current_hp
	var max_hp = character.max_hp
	
	if hp_label:
		hp_label.text = "HP: " + str(int(current_hp)) + " / " + str(int(max_hp))
	
	if hp_bar:
		hp_bar.max_value = max_hp
		hp_bar.value = current_hp
		hp_bar.show_percentage = false

func _on_hp_changed(_character: Character, _current: float, _max: float) -> void:
	update_hp()

func _on_leveled_up(_character: Character, _new_level: int) -> void:
	update_display()
