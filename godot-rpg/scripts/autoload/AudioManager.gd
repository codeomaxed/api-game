extends Node

## Audio Manager Singleton
## Manages sound effects and music

const SFX_BASE_PATH = "res://audio/sfx/"
const MUSIC_BASE_PATH = "res://audio/music/"

var sfx_players: Array[AudioStreamPlayer] = []
var music_player: AudioStreamPlayer = null

func _ready():
	# Create music player
	music_player = AudioStreamPlayer.new()
	add_child(music_player)
	
	# Create pool of SFX players
	for i in range(10):
		var player = AudioStreamPlayer.new()
		sfx_players.append(player)
		add_child(player)

## Play sound effect
func play_sfx(sfx_path: String, volume: float = 1.0) -> void:
	var full_path = SFX_BASE_PATH + sfx_path
	
	if not ResourceLoader.exists(full_path):
		push_warning("SFX not found: " + full_path)
		return
	
	# Find available player
	var player = null
	for p in sfx_players:
		if not p.playing:
			player = p
			break
	
	# If all players busy, use first one (will interrupt)
	if not player:
		player = sfx_players[0]
	
	# Load and play
	var stream = load(full_path) as AudioStream
	if stream:
		player.stream = stream
		player.volume_db = linear_to_db(volume)
		player.play()

## Play music
func play_music(music_path: String, volume: float = 0.5, loop: bool = true) -> void:
	var full_path = MUSIC_BASE_PATH + music_path
	
	if not ResourceLoader.exists(full_path):
		push_warning("Music not found: " + full_path)
		return
	
	var stream = load(full_path) as AudioStream
	if stream:
		music_player.stream = stream
		music_player.volume_db = linear_to_db(volume)
		if stream is AudioStreamOggVorbis:
			stream.loop = loop
		music_player.play()

## Stop music
func stop_music() -> void:
	music_player.stop()

## Set music volume
func set_music_volume(volume: float) -> void:
	music_player.volume_db = linear_to_db(volume)

## Set SFX volume
func set_sfx_volume(volume: float) -> void:
	for player in sfx_players:
		player.volume_db = linear_to_db(volume)




