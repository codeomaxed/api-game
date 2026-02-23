extends Node2D

## Atmospheric Effects - dndai-style canvas drawing
## Fog puffs (radial gradients), fire glow, dust, occasional water drops with splashes

# Fog puffs - fewer for subtle effect
const PUFF_COUNT := 16
var fog_puffs: Array = []

# Fire glow positions (from image analysis) - supports multiple torches
var fire_positions: Array[Vector2] = []
var fire_pos: Vector2 = Vector2.ZERO  # Primary (first) for dust spawn etc
var fire_breathe_phase: float = 0.0

# Dust particles (spawn near light, drift up)
var dust_particles: Array = []
var dust_spawn_timer: float = 0.0

# Water drops (one every 10-20 sec)
var water_drops: Array = []
var water_spawn_timer: float = 0.0

# Splashes from water impacts
var splash_particles: Array = []
# Floating embers near light sources
var ember_particles: Array = []
var ember_spawn_timer: float = 0.0

# Pre-made soft circle texture for fog
var _fog_puff_texture: ImageTexture
var _glow_texture: ImageTexture
var _haze_texture: ImageTexture
var _glow_sprite: Sprite2D
var _haze_sprite: Sprite2D
const MAX_LIGHTS := 3
var _extra_glow_sprites: Array[Sprite2D] = []
var _extra_haze_sprites: Array[Sprite2D] = []

# Bounds (from parent Control)
var _bounds: Rect2 = Rect2(0, 0, 0, 0)

# For rejection-sampling spawn (particles only in bright warm areas)
var _room_image: Image = null
var _display_rect: Rect2 = Rect2()

const FIRE_ANALYSIS_SIZE := 256  # Downsample to this for analysis (higher = more accurate light placement)
var _fire_pos_cache: Dictionary = {}  # room_cache_key -> Array
var _fog_initialized := false  # Defer until bounds valid
var _room_type: int = 0  # DungeonNode.RoomType for atmosphere tuning

func _ready() -> void:
	_create_fog_texture()
	_create_glow_texture()
	_create_haze_texture()
	_setup_light_sprites()
	call_deferred("_update_bounds")

func _create_fog_texture() -> void:
	# Radial gradient: opaque center to transparent edge (128px radius)
	var img_size := 256
	var img := Image.create(img_size, img_size, false, Image.FORMAT_RGBA8)
	var center := img_size / 2.0
	for y in img_size:
		for x in img_size:
			var dx := x - center
			var dy := y - center
			var dist := sqrt(dx * dx + dy * dy)
			var t := clampf(dist / center, 0.0, 1.0)
			var a := 1.0 - t * t  # Soft falloff
			img.set_pixel(x, y, Color(0.82, 0.88, 1.0, a))
	_fog_puff_texture = ImageTexture.create_from_image(img)

func _create_glow_texture() -> void:
	# dndai inner glow: rgba(255,100,0), fades by 0.6 - screen blend
	var img_size := 512
	var img := Image.create(img_size, img_size, false, Image.FORMAT_RGBA8)
	var center := img_size / 2.0
	var max_r := center - 1
	for y in img_size:
		for x in img_size:
			var dx := x - center
			var dy := y - center
			var dist := sqrt(dx * dx + dy * dy)
			var t := clampf(dist / max_r, 0.0, 1.0)
			var a := (1.0 - t / 0.6) if t < 0.6 else 0.0  # dndai: 0 at 0.6
			img.set_pixel(x, y, Color(1.0, 0.39, 0.0, a * 0.5))
	_glow_texture = ImageTexture.create_from_image(img)

func _create_haze_texture() -> void:
	# dndai outer haze: 450px, color-dodge - lights up surrounding area
	var img_size := 900  # 450 radius
	var img := Image.create(img_size, img_size, false, Image.FORMAT_RGBA8)
	var center := img_size / 2.0
	var max_r := center - 1
	for y in img_size:
		for x in img_size:
			var dx := x - center
			var dy := y - center
			var dist := sqrt(dx * dx + dy * dy)
			var t := clampf(dist / max_r, 0.0, 1.0)
			var a := 0.0
			var r := 1.0
			var g := 0.55
			var b := 0.16
			if t < 0.4:
				a = lerpf(0.2, 0.05, t / 0.4)
				g = lerpf(0.55, 0.24, t / 0.4)
				b = lerpf(0.16, 0.04, t / 0.4)
			elif t < 0.7:
				a = lerpf(0.05, 0.0, (t - 0.4) / 0.3)
				g = lerpf(0.24, 0.04, (t - 0.4) / 0.3)
				b = 0.04
			img.set_pixel(x, y, Color(r, g, b, a * 0.6))
	_haze_texture = ImageTexture.create_from_image(img)

func _setup_light_sprites() -> void:
	# Fog layer first (so it draws behind) - ADD blend for screen-like brightening
	var fog_layer := Node2D.new()
	fog_layer.name = "FogLayer"
	fog_layer.set_script(load("res://scripts/effects/FogLayer.gd"))
	var fog_mat := CanvasItemMaterial.new()
	fog_mat.blend_mode = CanvasItemMaterial.BLEND_MODE_ADD
	fog_layer.material = fog_mat
	add_child(fog_layer)
	move_child(fog_layer, 0)  # Draw first (behind)
	
	# Additive blend for lights
	var add_material := CanvasItemMaterial.new()
	add_material.blend_mode = CanvasItemMaterial.BLEND_MODE_ADD
	# Primary light
	_haze_sprite = Sprite2D.new()
	_haze_sprite.texture = _haze_texture
	_haze_sprite.material = add_material.duplicate()
	_haze_sprite.centered = true
	add_child(_haze_sprite)
	_glow_sprite = Sprite2D.new()
	_glow_sprite.texture = _glow_texture
	_glow_sprite.material = add_material.duplicate()
	_glow_sprite.centered = true
	add_child(_glow_sprite)
	# Extra lights for multi-torch support
	for i in MAX_LIGHTS - 1:
		var h = Sprite2D.new()
		h.texture = _haze_texture
		h.material = add_material.duplicate()
		h.centered = true
		add_child(h)
		_extra_haze_sprites.append(h)
		var g = Sprite2D.new()
		g.texture = _glow_texture
		g.material = add_material.duplicate()
		g.centered = true
		add_child(g)
		_extra_glow_sprites.append(g)

func _init_fog_puffs() -> void:
	fog_puffs.clear()
	for i in PUFF_COUNT:
		fog_puffs.append(_create_fog_puff(true))

func _get_room_atmosphere_mod() -> float:
	# Room-type variations: BOSS/TREASURE = calmer, COMBAT = more intense
	match _room_type:
		1: return 0.75  # BOSS - lighter fog
		3: return 0.8   # TREASURE - calmer
		7: return 1.15  # COMBAT - slightly denser
		0: return 0.9   # START - softer
		_: return 1.0

func _create_fog_puff(random_x: bool) -> Dictionary:
	var mod := _get_room_atmosphere_mod()
	var w := maxf(_bounds.size.x, 400.0)
	var h := maxf(_bounds.size.y, 300.0)
	var x := -200.0 if not random_x else randf() * w
	var top_limit := h * 0.4
	var range_y := h * 0.6
	var y := top_limit + randf() * range_y
	return {
		"x": x,
		"y": y,
		"vx": (0.008 + randf() * 0.012),
		"radius": 80.0 + randf() * 70.0,
		"max_opacity": (0.002 + randf() * 0.003) * mod,
		"opacity": 0.0,
		"fade_state": 1,
		"fade_speed": 0.000015 + randf() * 0.000025,
	}

func _update_bounds() -> void:
	var parent = get_parent()
	if parent is Control:
		var c: Control = parent
		_bounds = Rect2(Vector2.ZERO, c.size)

func get_fog_draw_data() -> Dictionary:
	return {"texture": _fog_puff_texture, "puffs": fog_puffs, "bounds": _bounds}

## Get spawn anchor (light position) - center of display if no fire positions
func _get_spawn_anchor() -> Vector2:
	if fire_positions.size() > 0:
		return fire_positions[randi() % fire_positions.size()]
	if _display_rect.size.x > 0 and _display_rect.size.y > 0:
		return Vector2(_display_rect.position.x + _display_rect.size.x * 0.5, _display_rect.position.y + _display_rect.size.y * 0.5)
	return Vector2(_bounds.size.x * 0.5, _bounds.size.y * 0.5)

func _process(delta: float) -> void:
	_update_bounds()
	if _bounds.size.x <= 0 or _bounds.size.y <= 0:
		return
	# Defer fog init until bounds are valid (prevents fog spawning "in the air")
	if not _fog_initialized:
		_init_fog_puffs()
		_fog_initialized = true
	
	# Update fog puffs (frame-rate independent, match dndai speed)
	for puff in fog_puffs:
		puff.x += puff.vx * 60.0 * delta
		puff.y += sin(Time.get_ticks_msec() * 0.0005 + puff.x) * 0.05
		puff.opacity += puff.fade_speed * puff.fade_state
		if puff.opacity >= puff.max_opacity:
			puff.opacity = puff.max_opacity
			puff.fade_state = -1
		elif puff.opacity <= 0 and puff.fade_state == -1:
			if puff.x > _bounds.size.x + 150 or randf() > 0.99:
				var new_puff = _create_fog_puff(true)
				puff.x = new_puff.x
				puff.y = new_puff.y
				puff.vx = new_puff.vx
				puff.radius = new_puff.radius
				puff.max_opacity = new_puff.max_opacity
				puff.opacity = 0
				puff.fade_state = 1
				puff.fade_speed = new_puff.fade_speed
			else:
				puff.fade_state = 1
		if puff.x > _bounds.size.x + 300:
			var new_puff = _create_fog_puff(true)
			puff.x = new_puff.x
			puff.y = new_puff.y
			puff.vx = new_puff.vx
			puff.radius = new_puff.radius
			puff.max_opacity = new_puff.max_opacity
			puff.opacity = 0
			puff.fade_state = 1
			puff.fade_speed = new_puff.fade_speed
	
	# Fire breathe + subtle flicker (torch flame)
	fire_breathe_phase += 0.001
	var breathe := sin(fire_breathe_phase * TAU) * 0.1 + 1.0
	var base_opacity := 0.5 + sin(fire_breathe_phase * TAU) * 0.1
	var flicker := 0.98 + sin(Time.get_ticks_msec() * 0.02) * 0.008  # Very subtle torch flicker
	var opacity := base_opacity * flicker
	# Update light sprites - additive blend lights up the area
	var positions := fire_positions as Array
	if positions.is_empty():
		positions = [fire_pos]
	for i in MAX_LIGHTS:
		var pos: Vector2 = positions[i] if i < positions.size() else Vector2(-9999, -9999)
		if i == 0:
			if _haze_sprite:
				_haze_sprite.position = pos
				_haze_sprite.visible = positions.size() > 0
				_haze_sprite.scale = Vector2.ONE * breathe
				_haze_sprite.modulate = Color(1, 1, 1, opacity * 0.6)
			if _glow_sprite:
				_glow_sprite.position = pos
				_glow_sprite.visible = positions.size() > 0
				_glow_sprite.scale = Vector2(500.0 / 512.0, 500.0 / 512.0)
				_glow_sprite.modulate = Color(1, 1, 1, opacity * 0.5)
		elif i - 1 < _extra_haze_sprites.size():
			_extra_haze_sprites[i - 1].position = pos
			_extra_haze_sprites[i - 1].visible = i < positions.size()
			_extra_haze_sprites[i - 1].scale = Vector2.ONE * breathe
			_extra_haze_sprites[i - 1].modulate = Color(1, 1, 1, opacity * 0.5)
			_extra_glow_sprites[i - 1].position = pos
			_extra_glow_sprites[i - 1].visible = i < positions.size()
			_extra_glow_sprites[i - 1].scale = Vector2(500.0 / 512.0, 500.0 / 512.0)
			_extra_glow_sprites[i - 1].modulate = Color(1, 1, 1, opacity * 0.45)
	
	# Dust spawn (every ~100ms near light)
	dust_spawn_timer += delta
	if dust_spawn_timer >= 0.1:
		dust_spawn_timer = 0.0
		_spawn_dust()
	# Ember spawn (every ~200ms near primary light)
	ember_spawn_timer += delta
	if ember_spawn_timer >= 0.2:
		ember_spawn_timer = 0.0
		_spawn_ember()
	
	# Update dust
	for i in range(dust_particles.size() - 1, -1, -1):
		var d = dust_particles[i]
		d.y -= 0.2 * 60.0 * delta
		if d.phase == 0:
			d.opacity += 0.02 * 60.0 * delta
			if d.opacity >= 0.8:
				d.phase = 1
		else:
			d.opacity -= 0.005 * 60.0 * delta
		if d.opacity <= 0 or d.y < 0:
			dust_particles.remove_at(i)
	# Update embers (float up, fade)
	for i in range(ember_particles.size() - 1, -1, -1):
		var e = ember_particles[i]
		e.y -= 15.0 * delta
		e.x += sin(e.phase) * 8.0 * delta
		e.phase += 4.0 * delta
		e.life -= 0.8 * delta
		if e.life <= 0 or e.y < -10:
			ember_particles.remove_at(i)
	
	# Water spawn (every 10-20 sec)
	water_spawn_timer += delta
	if water_spawn_timer >= 10.0 + randf() * 10.0:
		water_spawn_timer = 0.0
		_spawn_water_drop()
	
	# Update water drops: fast fall like real rain
	for i in range(water_drops.size() - 1, -1, -1):
		var w = water_drops[i]
		w.speed += 3800.0 * delta  # Strong gravity for fast drop
		w.y += w.speed * delta
		if w.y >= w.floor_y or w.y >= _bounds.size.y:
			# Splash
			var count := 8 + randi() % 5
			for j in count:
				splash_particles.append({
					"x": w.x,
					"y": minf(w.floor_y, _bounds.size.y),
					"vx": (randf() - 0.5) * 6 * w.scale,
					"vy": -(randf() * 4 + 3) * w.scale,
					"life": 1.0,
					"scale": w.scale,
				})
			water_drops.remove_at(i)
	
	# Update splashes
	for i in range(splash_particles.size() - 1, -1, -1):
		var s = splash_particles[i]
		s.x += s.vx * delta * 60
		s.y += s.vy * delta * 60
		s.vy += 0.3 * delta * 60
		s.life -= 0.02 * 60 * delta
		if s.life <= 0:
			splash_particles.remove_at(i)
	
	queue_redraw()
	var fog_layer = get_node_or_null("FogLayer")
	if fog_layer:
		fog_layer.queue_redraw()

const DUST_RADIUS := 250.0  # dndai: dist = random * 250
const EMBER_RADIUS := 120.0  # Tighter around light

func _spawn_ember() -> void:
	if _bounds.size.x <= 0:
		return
	var anchor := _get_spawn_anchor()
	var angle := randf() * TAU
	var dist := randf() * EMBER_RADIUS
	var px := anchor.x + cos(angle) * dist
	var py := anchor.y + sin(angle) * dist
	px = clampf(px, 0, _bounds.size.x)
	py = clampf(py, 0, _bounds.size.y)
	ember_particles.append({
		"x": px,
		"y": py,
		"phase": randf() * TAU,
		"life": 0.4 + randf() * 0.5,
		"size": 1.5 + randf() * 1.5,
	})

func _spawn_dust() -> void:
	if _bounds.size.x <= 0:
		return
	var anchor := _get_spawn_anchor()
	var angle := randf() * TAU
	var dist := randf() * DUST_RADIUS
	var px := anchor.x + cos(angle) * dist
	var py := anchor.y + sin(angle) * dist
	px = clampf(px, 0, _bounds.size.x)
	py = clampf(py, 0, _bounds.size.y)
	dust_particles.append({
		"x": px,
		"y": py,
		"size": randf() * 2 + 1,
		"opacity": 0,
		"phase": 0,
	})

func _spawn_water_drop() -> void:
	if _bounds.size.x <= 0 or _bounds.size.y <= 0:
		return
	water_drops.append({
		"x": randf() * _bounds.size.x,
		"y": -20,
		"speed": 450.0,  # Fast initial fall
		"scale": 0.6 + randf() * 0.4,
		"floor_y": _bounds.size.y * (0.9 + randf() * 0.08),
	})

func _draw() -> void:
	if _bounds.size.x <= 0 or _bounds.size.y <= 0:
		return
	
	# 1. Fog puffs: drawn by FogLayer child (ADD blend) for screen-like brightening
	
	# 2. Fire glow: drawn by _glow_sprite and _haze_sprite (ADD blend) - updates in _process
	
	# 3. Dust particles (lifecycle opacity only - like dndai)
	for d in dust_particles:
		if d.opacity <= 0:
			continue
		draw_circle(Vector2(d.x, d.y), d.size / 2.0, Color(1, 0.86, 0.71, d.opacity * 0.8))
	
	# 4. Water drops - blocky to match room pixelation (grid 4)
	const PIXEL_GRID := 4.0
	for w in water_drops:
		if w.y < -20 or w.y > _bounds.size.y:
			continue
		var px: float = floor(w.x / PIXEL_GRID) * PIXEL_GRID
		var py: float = floor(w.y / PIXEL_GRID) * PIXEL_GRID
		var ww: float = maxf(PIXEL_GRID, floor((1.5 * w.scale) / PIXEL_GRID) * PIXEL_GRID)
		var hh: float = maxf(PIXEL_GRID, floor((4.0 * w.scale) / PIXEL_GRID) * PIXEL_GRID)
		draw_rect(Rect2(px, py, ww, hh), Color(0.88, 0.97, 1, 0.5))
	
	# 5. Ember particles (lifecycle opacity only - like dndai)
	for e in ember_particles:
		if e.life <= 0:
			continue
		draw_circle(Vector2(e.x, e.y), e.size * 0.5, Color(1.0, 0.6, 0.2, e.life))
	
	# 6. Splash particles - blocky to match pixelation
	for s in splash_particles:
		if s.life <= 0:
			continue
		var sx: float = floor(s.x / PIXEL_GRID) * PIXEL_GRID
		var sy: float = floor(s.y / PIXEL_GRID) * PIXEL_GRID
		var r: float = maxf(PIXEL_GRID, floor((1.5 * s.scale) / PIXEL_GRID) * PIXEL_GRID)
		draw_rect(Rect2(sx, sy, r, r), Color(0.88, 0.97, 1, s.life))

## Image analysis for fire positions - dndai-style grid aggregation
## Grid cells (40px), sum warmth per cell, find top cells, refine to centroid of warm pixels
func find_fire_positions(texture: Texture2D, display_rect: Rect2, room_cache_key: String = "") -> Array:
	if room_cache_key and _fire_pos_cache.has(room_cache_key):
		return _fire_pos_cache[room_cache_key]
	var default_center := Vector2(display_rect.position.x + display_rect.size.x / 2.0, display_rect.position.y + display_rect.size.y / 2.0)
	if not texture:
		return [default_center]
	var img := texture.get_image()
	if not img or img.is_empty():
		return [default_center]
	if img.is_compressed():
		img.decompress()
	var orig_w := img.get_width()
	var orig_h := img.get_height()
	if orig_w <= 0 or orig_h <= 0:
		return [default_center]
	if orig_w > FIRE_ANALYSIS_SIZE or orig_h > FIRE_ANALYSIS_SIZE:
		var scale_factor := minf(float(FIRE_ANALYSIS_SIZE) / orig_w, float(FIRE_ANALYSIS_SIZE) / orig_h)
		var new_w := clampi(int(orig_w * scale_factor), 16, orig_w)
		var new_h := clampi(int(orig_h * scale_factor), 16, orig_h)
		img.resize(new_w, new_h)
	var w := img.get_width()
	var h := img.get_height()
	const GRID_CELL := 40
	var cols := ceili(w / float(GRID_CELL))
	var rows := ceili(h / float(GRID_CELL))
	var grid: Array[Array] = []
	for r in rows:
		var row_arr: Array = []
		row_arr.resize(cols)
		row_arr.fill(0.0)
		grid.append(row_arr)
	for y in h:
		for x in w:
			var c := img.get_pixel(x, y)
			var warmth: float = c.r * 2.0 + c.g * 0.5 - c.b * 2.5
			if c.r + c.g + c.b < 0.2:
				warmth = 0.0
			if warmth > 0.2:
				var col := clampi(int(x / GRID_CELL), 0, cols - 1)
				var row := clampi(int(y / GRID_CELL), 0, rows - 1)
				grid[row][col] += warmth
	var candidates: Array = []
	for r in rows:
		for c in cols:
			if grid[r][c] > 0.001:
				candidates.append({"row": r, "col": c, "score": grid[r][c]})
	candidates.sort_custom(func(a, b): return a.score > b.score)
	var result: Array = []
	var min_dist_sq := 2500.0
	var scale_x: float = display_rect.size.x / w
	var scale_y: float = display_rect.size.y / h
	for idx in mini(MAX_LIGHTS, candidates.size()):
		var cell = candidates[idx]
		var total_x := 0.0
		var total_y := 0.0
		var count := 0
		for r in range(cell.row - 1, cell.row + 2):
			for c in range(cell.col - 1, cell.col + 2):
				if r < 0 or c < 0 or r >= rows or c >= cols:
					continue
				var start_x := c * GRID_CELL
				var end_x := mini(start_x + GRID_CELL, w)
				var start_y := r * GRID_CELL
				var end_y := mini(start_y + GRID_CELL, h)
				for py in range(start_y, end_y):
					for px in range(start_x, end_x):
						if py < h and px < w:
							var pc := img.get_pixel(px, py)
							var pw := pc.r * 2.0 + pc.g * 0.5 - pc.b * 2.5
							if pc.r + pc.g + pc.b >= 0.2 and pw > 0.2:
								total_x += px
								total_y += py
								count += 1
		if count < 5:
			continue
		var tex_x := total_x / count
		var tex_y := total_y / count
		var pos := Vector2(
			display_rect.position.x + tex_x * scale_x,
			display_rect.position.y + tex_y * scale_y
		)
		var too_close := false
		for p in result:
			if pos.distance_squared_to(p) < min_dist_sq:
				too_close = true
				break
		if not too_close:
			result.append(pos)
	if result.is_empty():
		result = [default_center]
	if room_cache_key:
		_fire_pos_cache[room_cache_key] = result
		if _fire_pos_cache.size() > 32:
			var keys := _fire_pos_cache.keys()
			_fire_pos_cache.erase(keys[0])
	return result

func update_from_room_texture(texture: Texture2D, room_image_control: Control, room_cache_key: String = "", room_type: int = 0) -> void:
	# Wait one frame so layout is finalized (RoomImage has correct size/position)
	await get_tree().process_frame
	_update_bounds()
	var container_size := _bounds.size
	if room_image_control and room_image_control.size.x > 0 and room_image_control.size.y > 0:
		container_size = room_image_control.size
	if container_size.x <= 0 or container_size.y <= 0:
		return
	var tex_size := Vector2(64, 64)
	if texture:
		tex_size = texture.get_size()
	var draw_scale: float = mini(container_size.x / tex_size.x, container_size.y / tex_size.y)
	var draw_size := tex_size * draw_scale
	var offset := (container_size - draw_size) / 2.0
	_room_type = room_type
	var display_rect := Rect2(offset, draw_size)
	_display_rect = display_rect
	_room_image = texture.get_image() if texture else null
	if _room_image and _room_image.is_compressed():
		_room_image.decompress()
	var positions := find_fire_positions(texture, display_rect, room_cache_key)
	fire_positions.clear()
	for p in positions:
		fire_positions.append(p)
	fire_pos = fire_positions[0] if fire_positions.size() > 0 else Vector2(display_rect.position.x + display_rect.size.x / 2, display_rect.position.y + display_rect.size.y / 2)
	queue_redraw()

func update_light_position(light_pos: Vector2) -> void:
	fire_pos = light_pos

func set_effects_enabled(_enabled: bool) -> void:
	# All effects always on for now
	pass
