extends Node

## Narrative Manager Singleton
## Manages loading of pre-generated narrative text

const NARRATIVES_BASE_PATH = "res://data/narratives/"

var narrative_cache: Dictionary = {}  # Cache loaded narratives

## Load room description
func load_room_description(room_type: String, topology: String, variation: int = -1) -> Dictionary:
	var folder_path = NARRATIVES_BASE_PATH + "room_descriptions/"
	var file_pattern = room_type.to_lower() + "_" + topology.to_lower()
	
	# Get all matching files
	var matching_files: Array[String] = []
	var dir = DirAccess.open(folder_path)
	if dir:
		dir.list_dir_begin()
		var file_name = dir.get_next()
		while file_name != "":
			if file_name.begins_with(file_pattern) and file_name.ends_with(".json"):
				matching_files.append(folder_path + file_name)
			file_name = dir.get_next()
	
	if matching_files.size() == 0:
		push_warning("No narrative files found for: " + file_pattern)
		return {}
	
	# Select variation
	var selected_file = ""
	if variation >= 0 and variation < matching_files.size():
		selected_file = matching_files[variation]
	else:
		selected_file = matching_files[randi() % matching_files.size()]
	
	# Check cache
	if narrative_cache.has(selected_file):
		return narrative_cache[selected_file]
	
	# Load JSON file
	var file = FileAccess.open(selected_file, FileAccess.READ)
	if not file:
		push_warning("Cannot open narrative file: " + selected_file)
		return {}
	
	var json = JSON.new()
	var parse_result = json.parse(file.get_as_text())
	file.close()
	
	if parse_result != OK:
		push_warning("Failed to parse narrative JSON: " + selected_file)
		return {}
	
	var narrative_data = json.data
	narrative_cache[selected_file] = narrative_data
	return narrative_data

## Load combat description
func load_combat_description(monster_id: String, action_type: String = "attack", variation: int = -1) -> Dictionary:
	var folder_path = NARRATIVES_BASE_PATH + "combat_descriptions/"
	var file_pattern = monster_id + "_" + action_type
	
	# Get all matching files
	var matching_files: Array[String] = []
	var dir = DirAccess.open(folder_path)
	if dir:
		dir.list_dir_begin()
		var file_name = dir.get_next()
		while file_name != "":
			if file_name.begins_with(file_pattern) and file_name.ends_with(".json"):
				matching_files.append(folder_path + file_name)
			file_name = dir.get_next()
	
	if matching_files.size() == 0:
		push_warning("No combat narrative files found for: " + file_pattern)
		return {}
	
	# Select variation
	var selected_file = ""
	if variation >= 0 and variation < matching_files.size():
		selected_file = matching_files[variation]
	else:
		selected_file = matching_files[randi() % matching_files.size()]
	
	# Check cache
	if narrative_cache.has(selected_file):
		return narrative_cache[selected_file]
	
	# Load JSON file
	var file = FileAccess.open(selected_file, FileAccess.READ)
	if not file:
		push_warning("Cannot open combat narrative file: " + selected_file)
		return {}
	
	var json = JSON.new()
	var parse_result = json.parse(file.get_as_text())
	file.close()
	
	if parse_result != OK:
		push_warning("Failed to parse combat narrative JSON: " + selected_file)
		return {}
	
	var narrative_data = json.data
	narrative_cache[selected_file] = narrative_data
	return narrative_data

## Load story event
func load_story_event(event_id: String) -> Dictionary:
	var file_path = NARRATIVES_BASE_PATH + "story_events/" + event_id + ".json"
	
	# Check cache
	if narrative_cache.has(file_path):
		return narrative_cache[file_path]
	
	# Load JSON file
	var file = FileAccess.open(file_path, FileAccess.READ)
	if not file:
		push_warning("Cannot open story event file: " + file_path)
		return {}
	
	var json = JSON.new()
	var parse_result = json.parse(file.get_as_text())
	file.close()
	
	if parse_result != OK:
		push_warning("Failed to parse story event JSON: " + file_path)
		return {}
	
	var narrative_data = json.data
	narrative_cache[file_path] = narrative_data
	return narrative_data

## Clear narrative cache
func clear_cache() -> void:
	narrative_cache.clear()

