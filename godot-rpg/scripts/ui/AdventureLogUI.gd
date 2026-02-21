extends Control

## Adventure Log UI Script
## Displays adventure log entries

@onready var log_text: RichTextLabel = $LogText
@onready var scroll_container: ScrollContainer = $ScrollContainer

var log_entries: Array[String] = []

func _ready():
	clear_log()

## Add log entry
func add_entry(text: String) -> void:
	log_entries.append(text)
	update_display()

## Clear log
func clear_log() -> void:
	log_entries.clear()
	update_display()

## Update display
func update_display() -> void:
	var full_text = ""
	for entry in log_entries:
		full_text += entry + "\n"
	log_text.text = full_text
	
	# Scroll to bottom
	await get_tree().process_frame
	if scroll_container:
		scroll_container.scroll_vertical = scroll_container.get_v_scroll_bar().max_value




