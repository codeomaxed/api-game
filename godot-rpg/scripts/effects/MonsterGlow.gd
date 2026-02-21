extends Node2D

## Monster Glow Effect Script
## Handles monster glow and hover effects

@onready var glow_sprite: Sprite2D = $GlowSprite
@onready var animation_player: AnimationPlayer = $AnimationPlayer

var monster_texture: Texture2D = null

func _ready():
	setup_glow()

## Setup glow effect
func setup_glow() -> void:
	if glow_sprite:
		# Create glow material
		var material = ShaderMaterial.new()
		# Use built-in glow shader or custom shader
		glow_sprite.material = material

## Set monster texture
func set_monster_texture(texture: Texture2D) -> void:
	monster_texture = texture
	if glow_sprite:
		glow_sprite.texture = texture

## Start glow animation
func start_glow() -> void:
	if animation_player:
		animation_player.play("glow")

## Stop glow animation
func stop_glow() -> void:
	if animation_player:
		animation_player.stop()

## Handle hover
func on_hover() -> void:
	start_glow()
	# Scale up slightly
	if glow_sprite:
		var tween = create_tween()
		tween.tween_property(glow_sprite, "scale", Vector2(1.05, 1.05), 0.2)

## Handle unhover
func on_unhover() -> void:
	stop_glow()
	# Scale back
	if glow_sprite:
		var tween = create_tween()
		tween.tween_property(glow_sprite, "scale", Vector2(1.0, 1.0), 0.2)




