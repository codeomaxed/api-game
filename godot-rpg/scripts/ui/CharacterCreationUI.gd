extends Control

## Character Creation UI Script

@onready var name_input: LineEdit = $VBoxContainer/NameInput
@onready var job_selector: OptionButton = $VBoxContainer/JobSelector
@onready var create_button: Button = $VBoxContainer/CreateButton

signal character_created(character: Character)

func _ready():
	# Populate job selector
	populate_jobs()
	
	# Connect signals
	create_button.pressed.connect(_on_create_pressed)

## Populate job selector
func populate_jobs() -> void:
	var jobs = ["Warrior", "Mage", "Rogue", "Cleric"]
	for job in jobs:
		job_selector.add_item(job)

## Handle create button pressed
func _on_create_pressed() -> void:
	var character_name = name_input.text.strip_edges()
	if character_name == "":
		character_name = "Adventurer"
	
	var job_name = job_selector.get_item_text(job_selector.selected)
	
	var character = CharacterManager.create_character(character_name, job_name)
	if character:
		character_created.emit(character)
		visible = false
