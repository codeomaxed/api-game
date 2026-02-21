extends Node2D

## Monster Display Script
## Handles monster segmentation display, animations, and interaction

@onready var background_sprite: Sprite2D = $BackgroundSprite
@onready var segmented_sprite: Sprite2D = $SegmentedSprite
@onready var glow_effect: Node2D = $GlowEffect
@onready var animation_player: AnimationPlayer = $AnimationPlayer

var current_monster: Monster = null
var is_hovering: bool = false

func _ready():
	setup_animations()

## Setup animations
func setup_animations() -> void:
	if animation_player:
		# Create breathing animation
		var animation = Animation.new()
		animation.length = 2.0
		animation.loop_mode = Animation.LOOP_LINEAR
		
		var track_index = animation.add_track(Animation.TYPE_VALUE)
		animation.track_set_path(track_index, NodePath("SegmentedSprite:scale"))
		animation.track_insert_key(track_index, 0.0, Vector2(1.0, 1.0))
		animation.track_insert_key(track_index, 1.0, Vector2(1.02, 1.02))
		animation.track_insert_key(track_index, 2.0, Vector2(1.0, 1.0))
		
		animation_player.add_animation("breathing", animation)

## Load monster
func load_monster(monster: Monster) -> void:
	current_monster = monster
	if not monster:
		visible = false
		return
	
	visible = true
	
	# Load background image
	var background_texture = MonsterImageManager.load_monster_background(monster.id)
	if background_texture and background_sprite:
		background_sprite.texture = background_texture
	
	# Load segmented image
	var segmented_texture = MonsterImageManager.load_monster_segmented(monster.id)
	if segmented_texture and segmented_sprite:
		segmented_sprite.texture = segmented_texture
		# Start breathing animation
		if animation_player:
			animation_player.play("breathing")
	
	# Setup glow effect
	if glow_effect:
		glow_effect.set_monster_texture(segmented_texture)

## Handle mouse enter
func _on_mouse_entered() -> void:
	is_hovering = true
	if glow_effect:
		glow_effect.on_hover()

## Handle mouse exit
func _on_mouse_exited() -> void:
	is_hovering = false
	if glow_effect:
		glow_effect.on_unhover()

## Handle mouse click
func _on_input_event(_viewport: Node, event: InputEvent, _shape_idx: int) -> void:
	if event is InputEventMouseButton and event.pressed and event.button_index == MOUSE_BUTTON_LEFT:
		if current_monster:
			# Trigger combat
			if CharacterManager.current_character:
				CombatManager.start_combat(CharacterManager.current_character, current_monster)




