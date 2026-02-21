/**
 * Placeholder sound effects using Web Audio API
 * Generates simple tones for different combat events
 */

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioContext;
}

/**
 * Generate a simple tone
 */
function generateTone(
  frequency: number,
  duration: number,
  type: 'sine' | 'square' | 'sawtooth' | 'triangle' = 'sine',
  volume: number = 0.3
): void {
  try {
    const ctx = getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.type = type;
    oscillator.frequency.value = frequency;

    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration);
  } catch (error) {
    // Silently fail if audio context is not available
    console.warn('Sound effect failed:', error);
  }
}

/**
 * Play hit sound effect
 */
export function playHitSound(isCritical: boolean = false): void {
  if (isCritical) {
    // Critical hit: higher pitch, longer duration
    generateTone(400, 0.15, 'square', 0.2);
    setTimeout(() => {
      generateTone(600, 0.1, 'square', 0.15);
    }, 50);
  } else {
    // Normal hit: medium pitch
    generateTone(300, 0.1, 'square', 0.15);
  }
}

/**
 * Play slash sound effect
 */
export function playSlashSound(): void {
  // Quick whoosh sound
  generateTone(200, 0.08, 'sawtooth', 0.1);
  setTimeout(() => {
    generateTone(150, 0.06, 'sawtooth', 0.08);
  }, 30);
}

/**
 * Play death sound effect
 */
export function playDeathSound(): void {
  // Descending tone for death
  generateTone(300, 0.2, 'sine', 0.2);
  setTimeout(() => {
    generateTone(200, 0.3, 'sine', 0.15);
  }, 100);
  setTimeout(() => {
    generateTone(100, 0.4, 'sine', 0.1);
  }, 200);
}

/**
 * Play explosion sound effect
 */
export function playExplosionSound(): void {
  // Low rumble for explosion
  generateTone(80, 0.3, 'sawtooth', 0.25);
  setTimeout(() => {
    generateTone(60, 0.2, 'square', 0.2);
  }, 100);
}







