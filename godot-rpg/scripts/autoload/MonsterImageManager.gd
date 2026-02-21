extends Node

## Monster Image Manager Singleton
## Manages loading of monster images (background and segmented)

const MONSTERS_BASE_PATH = "res://assets/monsters/"

var image_cache: Dictionary = {}  # Cache loaded images

## Load monster background image
func load_monster_background(monster_id: String) -> Texture2D:
	var folder_path = MONSTERS_BASE_PATH + monster_id
	
	# Check cache
	var cache_key = folder_path + "_background"
	if image_cache.has(cache_key):
		return image_cache[cache_key]
	
	# Try to load background.png
	var background_path = folder_path + "/background.png"
	if AssetLoader.path_exists(background_path):
		var bg_texture = AssetLoader.load_image(background_path)
		if bg_texture:
			image_cache[cache_key] = bg_texture
			return bg_texture
	
	# Fallback: load any image from folder
	var fallback_texture = AssetLoader.load_random_image(folder_path)
	if fallback_texture:
		image_cache[cache_key] = fallback_texture
	
	return fallback_texture

## Load monster segmented image (transparent cutout)
func load_monster_segmented(monster_id: String) -> Texture2D:
	var folder_path = MONSTERS_BASE_PATH + monster_id
	
	# Check cache
	var cache_key = folder_path + "_segmented"
	if image_cache.has(cache_key):
		return image_cache[cache_key]
	
	# Try to load segmented.png
	var segmented_path = folder_path + "/segmented.png"
	if AssetLoader.path_exists(segmented_path):
		var seg_texture = AssetLoader.load_image(segmented_path)
		if seg_texture:
			image_cache[cache_key] = seg_texture
			return seg_texture
	
	# Fallback: try segmented_animated.png
	var animated_path = folder_path + "/segmented_animated.png"
	if AssetLoader.path_exists(animated_path):
		var anim_texture = AssetLoader.load_image(animated_path)
		if anim_texture:
			image_cache[cache_key] = anim_texture
			return anim_texture
	
	push_warning("No segmented image found for monster: " + monster_id)
	return null

## Load monster animated image (if available)
func load_monster_animated(monster_id: String) -> Texture2D:
	var folder_path = MONSTERS_BASE_PATH + monster_id
	
	# Check cache
	var cache_key = folder_path + "_animated"
	if image_cache.has(cache_key):
		return image_cache[cache_key]
	
	# Try to load segmented_animated.png
	var animated_path = folder_path + "/segmented_animated.png"
	if AssetLoader.path_exists(animated_path):
		var anim_texture = AssetLoader.load_image(animated_path)
		if anim_texture:
			image_cache[cache_key] = anim_texture
			return anim_texture
	
	# Fallback to regular segmented
	return load_monster_segmented(monster_id)

## Preload monster images
func preload_monster_images(monster_ids: Array[String]) -> void:
	for monster_id in monster_ids:
		load_monster_background(monster_id)
		load_monster_segmented(monster_id)

## Clear image cache
func clear_cache() -> void:
	image_cache.clear()

