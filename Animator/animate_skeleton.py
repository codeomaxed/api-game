"""
Skeleton Breathing Animation
Creates a breathing effect by segmenting the skeleton and animating sections
with synchronized vertical movements.
"""

import math
from PIL import Image
import numpy as np


def load_and_prepare_image(image_path):
    """Load image and ensure it has transparency."""
    img = Image.open(image_path)
    
    # Convert to RGBA if not already
    if img.mode != 'RGBA':
        img = img.convert('RGBA')
    
    return img


def find_skeleton_bounds(img):
    """Find the bounding box of the skeleton (non-transparent pixels)."""
    # Convert to numpy array for easier processing
    data = np.array(img)
    alpha = data[:, :, 3]
    
    # Find non-transparent pixels
    coords = np.column_stack(np.where(alpha > 0))
    
    if len(coords) == 0:
        return None
    
    min_y, min_x = coords.min(axis=0)
    max_y, max_x = coords.max(axis=0)
    
    return {
        'min_x': min_x,
        'min_y': min_y,
        'max_x': max_x,
        'max_y': max_y,
        'width': max_x - min_x + 1,
        'height': max_y - min_y + 1,
        'center_x': (min_x + max_x) // 2,
        'center_y': (min_y + max_y) // 2
    }


def segment_skeleton(img, bounds):
    """Segment skeleton into sections for breathing animation."""
    # Crop to skeleton bounds first to work with just the skeleton area
    skeleton_box = (bounds['min_x'], bounds['min_y'], bounds['max_x'] + 1, bounds['max_y'] + 1)
    skeleton_img = img.crop(skeleton_box)
    
    skeleton_width = bounds['width']
    skeleton_height = bounds['height']
    
    # Define section boundaries (as percentages of skeleton height)
    # Use natural boundaries with overlap for gap prevention
    # Max separation: ribcage ±4px, torso ±2.5px = 6.5px difference, so need at least 7px overlap
    # Using 12px to ensure smooth connection even with slight variations
    overlap = 12  # Overlap to prevent gaps during movement
    
    # Natural boundaries
    head_end = int(skeleton_height * 0.20)
    ribcage_start_natural = int(skeleton_height * 0.20)
    ribcage_end_natural = int(skeleton_height * 0.45)
    torso_start_natural = int(skeleton_height * 0.45)
    torso_end_natural = int(skeleton_height * 0.65)
    pelvis_start_natural = int(skeleton_height * 0.65)
    pelvis_end_natural = skeleton_height
    
    # Crop boundaries (with small overlap)
    ribcage_start_crop = max(0, ribcage_start_natural - overlap)
    ribcage_end_crop = ribcage_end_natural + overlap
    torso_start_crop = max(0, torso_start_natural - overlap)
    torso_end_crop = torso_end_natural + overlap
    pelvis_start_crop = max(0, pelvis_start_natural - overlap)
    
    sections = {}
    
    # Extract each section from the cropped skeleton image
    # Head section
    head_box = (0, 0, skeleton_width, head_end)
    sections['head'] = {
        'image': skeleton_img.crop(head_box),
        'y_offset': 0,
        'crop_offset': 0,  # How much to crop from top when pasting
        'amplitude': 1.5
    }
    
    # Ribcage section (primary breathing area)
    ribcage_box = (0, ribcage_start_crop, skeleton_width, ribcage_end_crop)
    sections['ribcage'] = {
        'image': skeleton_img.crop(ribcage_box),
        'y_offset': ribcage_start_natural,  # Natural position
        'crop_offset': overlap,  # Crop overlap from top
        'amplitude': 4.0
    }
    
    # Torso section
    torso_box = (0, torso_start_crop, skeleton_width, torso_end_crop)
    sections['torso'] = {
        'image': skeleton_img.crop(torso_box),
        'y_offset': torso_start_natural,  # Natural position
        'crop_offset': overlap,  # Crop overlap from top
        'amplitude': 2.5
    }
    
    # Pelvis section
    pelvis_box = (0, pelvis_start_crop, skeleton_width, pelvis_end_natural)
    sections['pelvis'] = {
        'image': skeleton_img.crop(pelvis_box),
        'y_offset': pelvis_start_natural,  # Natural position
        'crop_offset': overlap,  # Crop overlap from top
        'amplitude': 1.0
    }
    
    return sections


def create_breathing_frame(sections, frame, total_frames, bounds):
    """Create a single frame of the breathing animation."""
    # Calculate breathing offset using sine wave
    # Full cycle: 0 to 2π
    phase = (2 * math.pi * frame) / total_frames
    breathing_factor = math.sin(phase)
    
    # Create a new transparent image (using skeleton bounds dimensions)
    width = bounds['width']
    height = bounds['height']
    frame_img = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    
    # Composite each section with its vertical offset
    # Process sections in order from top to bottom to ensure proper layering
    section_order = ['head', 'ribcage', 'torso', 'pelvis']
    
    for section_name in section_order:
        if section_name not in sections:
            continue
            
        section_data = sections[section_name]
        section_img = section_data['image']
        base_y = section_data['y_offset']  # Natural boundary position
        crop_offset = section_data['crop_offset']  # Amount to crop from top
        amplitude = section_data['amplitude']
        
        # Calculate vertical offset for this section
        y_offset = int(breathing_factor * amplitude)
        y_position = base_y + y_offset
        
        # For sections with overlap, only crop a small amount to prevent duplication
        # Keep most of the overlap to fill gaps during movement
        if crop_offset > 0:
            # Only crop a small portion (2-3 pixels) to prevent visible duplication
            # Keep the rest for gap filling
            small_crop = min(3, crop_offset)
            if small_crop > 0 and small_crop < section_img.height:
                section_img = section_img.crop((0, small_crop, section_img.width, section_img.height))
                # Adjust position slightly to account for the small crop
                y_position = y_position - (crop_offset - small_crop)
        
        # For head section, ensure it never moves above the top (y=0)
        if section_name == 'head':
            y_position = max(0, y_position)
        
        # Ensure we don't go out of bounds
        if y_position < 0:
            y_position = 0
        if y_position + section_img.height > height:
            y_position = height - section_img.height
        
        # Paste section onto frame
        frame_img.paste(section_img, (0, y_position), section_img)
    
    return frame_img


def create_breathing_animation(image_path, output_path, fps=18, duration=2.5):
    """Create the complete breathing animation."""
    print(f"Loading image: {image_path}")
    img = load_and_prepare_image(image_path)
    
    print("Finding skeleton bounds...")
    bounds = find_skeleton_bounds(img)
    if bounds is None:
        raise ValueError("Could not find skeleton in image (no non-transparent pixels)")
    
    print(f"Skeleton bounds: {bounds}")
    
    print("Segmenting skeleton into sections...")
    sections = segment_skeleton(img, bounds)
    print(f"Created {len(sections)} sections: {list(sections.keys())}")
    
    # Calculate animation parameters
    total_frames = int(fps * duration)
    print(f"Creating {total_frames} frames at {fps} FPS ({duration}s duration)...")
    
    # Generate all frames
    frames = []
    for frame_num in range(total_frames):
        if (frame_num + 1) % 10 == 0:
            print(f"  Generating frame {frame_num + 1}/{total_frames}...")
        frame = create_breathing_frame(sections, frame_num, total_frames, bounds)
        frames.append(frame)
    
    print(f"Saving animation to {output_path}...")
    # Convert frames to P mode (palette mode) with transparency for GIF
    # We need to handle transparency carefully for GIF format
    gif_frames = []
    
    # First pass: convert all frames and find a common transparent color
    for frame in frames:
        if frame.mode == 'RGBA':
            # Quantize RGBA directly to P mode (this preserves transparency info)
            quantized = frame.quantize(colors=255, method=Image.Quantize.FASTOCTREE)
            gif_frames.append(quantized)
        else:
            gif_frames.append(frame.convert('P', palette=Image.ADAPTIVE))
    
    # Save as animated GIF
    # PIL will handle transparency automatically if the quantized images have it
    if gif_frames:
        gif_frames[0].save(
            output_path,
            save_all=True,
            append_images=gif_frames[1:],
            duration=int(1000 / fps),  # Duration in milliseconds
            loop=0,  # Infinite loop
            disposal=2,  # Clear to background between frames
            optimize=False  # Preserve quality
        )
    else:
        # Fallback: save as-is
        frames[0].save(
            output_path,
            save_all=True,
            append_images=frames[1:],
            duration=int(1000 / fps),
            loop=0
        )
    
    print(f"Animation saved successfully!")
    return output_path


if __name__ == "__main__":
    input_image = "skeleton.png"
    output_gif = "skeleton_breathing.gif"
    
    try:
        create_breathing_animation(input_image, output_gif)
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exception(e)

