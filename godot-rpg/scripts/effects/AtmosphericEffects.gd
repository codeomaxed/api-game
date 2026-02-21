extends Node2D

## Atmospheric Effects Script
## Handles fog, water drops, and lighting effects

@onready var fog_particles: GPUParticles2D = $FogParticles
@onready var water_particles: GPUParticles2D = $WaterParticles
@onready var light_2d: Light2D = $Light2D

func _ready():
	setup_fog_particles()
	setup_water_particles()
	setup_lighting()

## Setup fog particle system
func setup_fog_particles() -> void:
	if not fog_particles:
		return
	
	# Configure fog particles (similar to browser version)
	fog_particles.amount = 80
	fog_particles.lifetime = 10.0
	fog_particles.emitting = true
	
	# Set particle material properties
	var material = fog_particles.process_material as ParticleProcessMaterial
	if material:
		material.direction = Vector3(1, 0, 0)
		material.initial_velocity_min = 0.04
		material.initial_velocity_max = 0.11
		material.gravity = Vector3(0, 0, 0)

## Setup water drop particle system
func setup_water_particles() -> void:
	if not water_particles:
		return
	
	# Configure water particles
	water_particles.amount = 25
	water_particles.lifetime = 5.0
	water_particles.emitting = true
	
	# Set particle material
	var material = water_particles.process_material as ParticleProcessMaterial
	if material:
		material.direction = Vector3(0, 1, 0)
		material.initial_velocity_min = 2.0
		material.initial_velocity_max = 4.0
		material.gravity = Vector3(0, 9.8, 0)

## Setup lighting
func setup_lighting() -> void:
	if not light_2d:
		return
	
	# Configure torch-like lighting
	light_2d.enabled = true
	light_2d.texture_scale = 2.0
	light_2d.energy = 0.6

## Update light position based on image analysis (similar to browser version)
func update_light_position(position: Vector2) -> void:
	if light_2d:
		light_2d.global_position = position

## Enable/disable effects
func set_effects_enabled(enabled: bool) -> void:
	if fog_particles:
		fog_particles.emitting = enabled
	if water_particles:
		water_particles.emitting = enabled
	if light_2d:
		light_2d.enabled = enabled




