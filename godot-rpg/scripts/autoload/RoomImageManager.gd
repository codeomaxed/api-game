extends Node

## Room Image Manager Singleton
## Manages loading of room background images

const ROOMS_BASE_PATH = "res://assets/rooms/"

var image_cache: Dictionary = {}  # Cache loaded images

## Get room type folder name
func get_room_type_folder(room_type: DungeonNode.RoomType) -> String:
	match room_type:
		DungeonNode.RoomType.START:
			return "Start"
		DungeonNode.RoomType.BOSS:
			return "Boss Chamber"
		DungeonNode.RoomType.TREASURE:
			return "Treasure Room"
		DungeonNode.RoomType.MERCHANT:
			return "Merchant"
		DungeonNode.RoomType.EVENT:
			return "Event"
		DungeonNode.RoomType.DEAD_END:
			return "Dead End"
		DungeonNode.RoomType.COMBAT:
			return "Combat"
		DungeonNode.RoomType.NORMAL:
			# Normal rooms use topology-based folders
			return "Normal"
		_:
			return "Normal"

## Get topology folder name from exits
func get_topology_folder(has_north: bool, has_south: bool, has_east: bool, has_west: bool) -> String:
	var exit_count = 0
	if has_north:
		exit_count += 1
	if has_south:
		exit_count += 1
	if has_east:
		exit_count += 1
	if has_west:
		exit_count += 1
	
	# Determine topology based on exit configuration
	if exit_count == 1:
		return "Dead End"
	elif exit_count == 2:
		# Check if opposite (straight) or adjacent (turn)
		if (has_north and has_south) or (has_east and has_west):
			return "Straight"
		elif (has_north and has_east) or (has_south and has_west):
			return "Turn Right"
		elif (has_north and has_west) or (has_south and has_east):
			return "Turn Left"
		else:
			return "Straight"  # Default fallback
	elif exit_count == 3:
		return "T Junction"
	elif exit_count == 4:
		return "crossroads"
	else:
		return "Dead End"  # Default fallback for 0 exits

## Load room image for a dungeon node
func load_room_image(node: DungeonNode) -> Texture2D:
	# Determine folder based on room type and topology
	var folder_name = get_room_type_folder(node.type)
	
	# For normal rooms, use topology
	if node.type == DungeonNode.RoomType.NORMAL:
		var exits = node.get_exits()
		var has_north = exits.has("NORTH")
		var has_south = exits.has("SOUTH")
		var has_east = exits.has("EAST")
		var has_west = exits.has("WEST")
		folder_name = get_topology_folder(has_north, has_south, has_east, has_west)
	
	var folder_path = ROOMS_BASE_PATH + folder_name
	
	# Use node.id for cache key (consistent, not random)
	var cache_key = folder_path + "_" + node.id
	if image_cache.has(cache_key):
		print("[RoomImageManager] Using cached image for room: ", node.id, " from folder: ", folder_path)
		return image_cache[cache_key]
	
	# Load random image from folder
	print("[RoomImageManager] Loading image for room: ", node.id, " (type: ", node.type, ") from folder: ", folder_path)
	var texture = AssetLoader.load_random_image(folder_path)
	if texture:
		image_cache[cache_key] = texture
		print("[RoomImageManager] Successfully loaded image for room: ", node.id, " - Size: ", texture.get_size())
	else:
		push_warning("[RoomImageManager] Failed to load image from folder: " + folder_path + " for room: " + node.id)
	
	return texture

## Preload room images for smooth transitions
func preload_room_images(room_types: Array[DungeonNode.RoomType]) -> void:
	for room_type in room_types:
		var folder_name = get_room_type_folder(room_type)
		var folder_path = ROOMS_BASE_PATH + folder_name
		var images = AssetLoader.get_images_in_folder(folder_path)
		
		# Preload first few images
		for i in range(min(3, images.size())):
			var texture = AssetLoader.load_image(images[i])
			if texture:
				image_cache[images[i]] = texture

## Clear image cache
func clear_cache() -> void:
	image_cache.clear()

