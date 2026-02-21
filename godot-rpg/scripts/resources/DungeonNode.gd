class_name DungeonNode
extends Resource

## Dungeon Node Resource

enum RoomType {
	START,
	BOSS,
	NORMAL,
	TREASURE,
	EVENT,
	MERCHANT,
	DEAD_END,
	COMBAT
}

@export var id: String = ""  # "x,y"
@export var x: int = 0
@export var y: int = 0
@export var type: RoomType = RoomType.NORMAL
@export var is_main_path: bool = false
@export var visited: bool = false
@export var mask: int = 0  # Bitmask: North=1, East=2, South=4, West=8

# Connections (target_id -> connection_type)
@export var connections: Dictionary = {}  # {target_id: connection_type}

# Monster (if combat room)
@export var monster: Monster = null

# Room content (generated on first visit)
@export var description: String = ""
@export var image_path: String = ""
@export var available_choices: Array[Dictionary] = []  # Array of choice dictionaries
@export var is_explored: bool = false
@export var entities: Array[String] = []  # Things that persist in the room
@export var segmented_monster_path: String = ""  # Path to segmented monster image

## Get room type name
func get_room_type_name() -> String:
	match type:
		RoomType.START:
			return "START"
		RoomType.BOSS:
			return "BOSS"
		RoomType.NORMAL:
			return "NORMAL"
		RoomType.TREASURE:
			return "TREASURE"
		RoomType.EVENT:
			return "EVENT"
		RoomType.MERCHANT:
			return "MERCHANT"
		RoomType.DEAD_END:
			return "DEAD_END"
		RoomType.COMBAT:
			return "COMBAT"
		_:
			return "UNKNOWN"

## Check if node has exit in direction
func has_exit(direction: String) -> bool:
	match direction.to_upper():
		"NORTH", "N":
			return (mask & 1) != 0
		"EAST", "E":
			return (mask & 2) != 0
		"SOUTH", "S":
			return (mask & 4) != 0
		"WEST", "W":
			return (mask & 8) != 0
		_:
			return false

## Get all exit directions
func get_exits() -> Array[String]:
	var exits: Array[String] = []
	if has_exit("NORTH"):
		exits.append("NORTH")
	if has_exit("EAST"):
		exits.append("EAST")
	if has_exit("SOUTH"):
		exits.append("SOUTH")
	if has_exit("WEST"):
		exits.append("WEST")
	return exits

