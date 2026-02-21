extends Node

## Asset Loader Singleton
## Base class for loading assets from organized folder structures

## Load a random image from a folder
func load_random_image(folder_path: String) -> Texture2D:
	var images = get_images_in_folder(folder_path)
	if images.size() == 0:
		push_warning("No images found in folder: " + folder_path)
		return null
	
	var random_index = randi() % images.size()
	var image_path = images[random_index]
	return load_image(image_path)

## Get all image paths in a folder
func get_images_in_folder(folder_path: String) -> Array[String]:
	var images: Array[String] = []
	var dir = DirAccess.open(folder_path)
	
	if not dir:
		push_warning("Cannot open folder: " + folder_path)
		return images
	
	dir.list_dir_begin()
	var file_name = dir.get_next()
	
	while file_name != "":
		if not dir.current_is_dir():
			if file_name.ends_with(".png") or file_name.ends_with(".jpg") or file_name.ends_with(".jpeg"):
				images.append(folder_path + "/" + file_name)
		file_name = dir.get_next()
	
	return images

## Load an image from a path
func load_image(image_path: String) -> Texture2D:
	if not ResourceLoader.exists(image_path):
		push_warning("Image not found: " + image_path)
		return null
	
	var texture = load(image_path) as Texture2D
	return texture

## Check if a path exists
func path_exists(path: String) -> bool:
	return ResourceLoader.exists(path) or DirAccess.dir_exists_absolute(path)
