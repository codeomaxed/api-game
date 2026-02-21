"""
Generic Character Breathing Animation
Creates a breathing effect by segmenting any character image and animating sections
with synchronized vertical movements. Works with any character regardless of shape or size.
"""

import math
import argparse
import os
from PIL import Image, ImageFilter
import numpy as np


def load_and_prepare_image(image_path):
    """Load image and ensure it has transparency."""
    img = Image.open(image_path)
    
    # Convert to RGBA if not already
    if img.mode != 'RGBA':
        img = img.convert('RGBA')
    
    return img


def find_character_bounds(img):
    """Find the bounding box of the character (non-transparent pixels)."""
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


def segment_character(img, bounds):
    """Segment character into sections for breathing animation.
    Uses adaptive proportional divisions that work for any character size.
    """
    # Crop to character bounds first to work with just the character area
    character_box = (bounds['min_x'], bounds['min_y'], bounds['max_x'] + 1, bounds['max_y'] + 1)
    character_img = img.crop(character_box)
    
    character_width = bounds['width']
    character_height = bounds['height']
    
    # Define section boundaries (as percentages of character height)
    # These proportions work for any character: skeleton, human, creature, etc.
    # Use natural boundaries with overlap for gap prevention
    # Max separation: chest ±4px, torso ±2.5px = 6.5px difference, so need at least 7px overlap
    # Using 12px to ensure smooth connection even with slight variations
    overlap = 12  # Overlap to prevent gaps during movement
    
    # Natural boundaries (proportional divisions that adapt to any character height)
    head_end = int(character_height * 0.20)
    chest_start_natural = int(character_height * 0.20)  # Upper torso/chest area
    chest_end_natural = int(character_height * 0.45)    # Primary breathing area
    torso_start_natural = int(character_height * 0.45)  # Mid torso
    torso_end_natural = int(character_height * 0.65)    # Lower torso
    pelvis_start_natural = int(character_height * 0.65) # Pelvis/lower body
    pelvis_end_natural = character_height
    
    # Crop boundaries (with overlap for gap prevention)
    chest_start_crop = max(0, chest_start_natural - overlap)
    chest_end_crop = chest_end_natural + overlap
    torso_start_crop = max(0, torso_start_natural - overlap)
    torso_end_crop = torso_end_natural + overlap
    pelvis_start_crop = max(0, pelvis_start_natural - overlap)
    
    sections = {}
    
    # Extract each section from the cropped character image
    # Head section
    head_box = (0, 0, character_width, head_end)
    sections['head'] = {
        'image': character_img.crop(head_box),
        'y_offset': 0,
        'crop_offset': 0,  # How much to crop from top when pasting
        'amplitude': 1.5  # Subtle movement
    }
    
    # Chest section (primary breathing area)
    chest_box = (0, chest_start_crop, character_width, chest_end_crop)
    sections['chest'] = {
        'image': character_img.crop(chest_box),
        'y_offset': chest_start_natural,  # Natural position
        'crop_offset': overlap,  # Crop overlap from top
        'amplitude': 4.0  # Most movement (primary breathing)
    }
    
    # Torso section
    torso_box = (0, torso_start_crop, character_width, torso_end_crop)
    sections['torso'] = {
        'image': character_img.crop(torso_box),
        'y_offset': torso_start_natural,  # Natural position
        'crop_offset': overlap,  # Crop overlap from top
        'amplitude': 2.5  # Moderate movement
    }
    
    # Pelvis section
    pelvis_box = (0, pelvis_start_crop, character_width, pelvis_end_natural)
    sections['pelvis'] = {
        'image': character_img.crop(pelvis_box),
        'y_offset': pelvis_start_natural,  # Natural position
        'crop_offset': overlap,  # Crop overlap from top
        'amplitude': 1.0  # Minimal movement
    }
    
    return sections


def apply_edge_feather(section_img, feather_size=6):
    """Apply blur to the edges of a section to blend cut lines.
    This makes the segmentation less visible by creating smooth transitions.
    """
    if feather_size <= 0:
        return section_img
    
    width, height = section_img.size
    
    # Apply stronger blur for better blending
    blurred_light = section_img.filter(ImageFilter.GaussianBlur(radius=0.6))
    blurred_medium = section_img.filter(ImageFilter.GaussianBlur(radius=1.2))
    
    # Create a smooth gradient mask for edges
    mask_array = np.ones((height, width), dtype=np.float32)
    
    # Feather top edge with smooth gradient
    top_feather = min(feather_size, height // 3)
    for y in range(top_feather):
        # Smooth curve: starts at 0.0 (full blur) at edge, transitions to 1.0 (original) in center
        # Using a smoother curve (ease-in-out)
        t = y / top_feather
        blend_factor = t * t * (3.0 - 2.0 * t)  # Smoothstep function
        mask_array[y, :] = blend_factor
    
    # Feather bottom edge with smooth gradient
    bottom_feather = min(feather_size, height // 3)
    for y in range(max(0, height - bottom_feather), height):
        # Smooth curve for bottom edge
        t = (height - y) / bottom_feather
        blend_factor = t * t * (3.0 - 2.0 * t)  # Smoothstep function
        mask_array[y, :] = blend_factor
    
    # Convert to arrays
    original_array = np.array(section_img, dtype=np.float32)
    blurred_light_array = np.array(blurred_light, dtype=np.float32)
    blurred_medium_array = np.array(blurred_medium, dtype=np.float32)
    
    # Expand mask to 4 channels (RGBA)
    mask_4d = np.stack([mask_array] * 4, axis=2)
    
    # Create inverse mask for blur blending
    blur_mask = 1.0 - mask_4d
    
    # Blend: use more blur at edges (where mask is low), original in center
    # At edges (mask=0.0): use medium blur
    # In transition (mask=0.5): use light blur
    # In center (mask=1.0): use original
    result_array = (
        original_array * mask_4d +
        blurred_light_array * blur_mask * 0.6 +
        blurred_medium_array * blur_mask * 0.4
    )
    
    # Preserve original alpha channel
    result_array[:, :, 3] = original_array[:, :, 3]
    
    result = Image.fromarray(np.clip(result_array, 0, 255).astype(np.uint8))
    return result


def create_breathing_frame(sections, frame, total_frames, bounds):
    """Create a single frame of the breathing animation."""
    # Calculate breathing offset using sine wave
    # Full cycle: 0 to 2π
    base_phase = (2 * math.pi * frame) / total_frames
    
    # Create a new transparent image (using character bounds dimensions)
    width = bounds['width']
    height = bounds['height']
    frame_img = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    
    # Composite each section with its vertical offset
    # Process sections from bottom to top so upper sections (head) stay on top
    # This ensures head/shoulders appear in front when chest moves up
    section_order = ['pelvis', 'torso', 'chest', 'head']
    
    for section_name in section_order:
        if section_name not in sections:
            continue
            
        section_data = sections[section_name]
        section_img = section_data['image']
        base_y = section_data['y_offset']  # Natural boundary position
        crop_offset = section_data['crop_offset']  # Amount to crop from top
        amplitude = section_data['amplitude']
        
        # Add phase offset for wave-like breathing effect
        # Torso lags slightly behind chest for more natural motion
        phase_offset = 0.0
        if section_name == 'torso':
            phase_offset = 0.15  # Slight delay (about 15% of cycle behind chest)
        elif section_name == 'pelvis':
            phase_offset = 0.25  # Pelvis lags even more
        
        # Calculate breathing factor with phase offset
        phase = base_phase - phase_offset
        breathing_factor = math.sin(phase)
        
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
        
        # Apply edge feathering to blend cut lines (except for head top)
        # This makes the segmentation less visible by creating smooth transitions
        if section_name != 'head':  # Don't feather head top edge
            section_img = apply_edge_feather(section_img, feather_size=6)
        else:
            # For head, only feather bottom edge (where it meets chest)
            # Apply feathering to bottom portion
            head_img = section_img.copy()
            width, head_height = head_img.size
            if head_height > 6:
                # Create a mask for bottom edge feathering
                bottom_region = head_img.crop((0, head_height - 6, width, head_height))
                bottom_feathered = apply_edge_feather(bottom_region, feather_size=6)
                # Only use the feathered version for the bottom part
                head_img.paste(bottom_feathered, (0, head_height - 6), bottom_feathered)
                section_img = head_img
        
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
    """Create the complete breathing animation for any character."""
    print(f"Loading image: {image_path}")
    img = load_and_prepare_image(image_path)
    
    print("Finding character bounds...")
    bounds = find_character_bounds(img)
    if bounds is None:
        raise ValueError("Could not find character in image (no non-transparent pixels)")
    
    print(f"Character bounds: {bounds}")
    
    print("Segmenting character into sections...")
    sections = segment_character(img, bounds)
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


def main():
    """Main entry point with command-line argument parsing."""
    parser = argparse.ArgumentParser(
        description='Create a breathing animation for any character image',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python animate_character.py assassin.png
  python animate_character.py skeleton.png skeleton_breathing.gif
  python animate_character.py character.png -o output.gif
        """
    )
    
    parser.add_argument(
        'input',
        help='Input image file path (PNG with transparency recommended)'
    )
    
    parser.add_argument(
        '-o', '--output',
        help='Output GIF file path (default: {input_name}_breathing.gif)',
        default=None
    )
    
    parser.add_argument(
        '--fps',
        type=int,
        default=18,
        help='Frames per second for animation (default: 18)'
    )
    
    parser.add_argument(
        '--duration',
        type=float,
        default=2.5,
        help='Animation duration in seconds (default: 2.5)'
    )
    
    args = parser.parse_args()
    
    # Validate input file exists
    if not os.path.exists(args.input):
        print(f"Error: Input file '{args.input}' not found.")
        return 1
    
    # Generate output filename if not provided
    if args.output is None:
        base_name = os.path.splitext(os.path.basename(args.input))[0]
        output_dir = os.path.dirname(args.input) if os.path.dirname(args.input) else '.'
        args.output = os.path.join(output_dir, f"{base_name}_breathing.gif")
    
    try:
        create_breathing_animation(args.input, args.output, args.fps, args.duration)
        print(f"\nSuccess! Animation saved to: {args.output}")
        return 0
    except Exception as e:
        print(f"\nError: {e}")
        import traceback
        traceback.print_exception(e)
        return 1


if __name__ == "__main__":
    exit(main())

