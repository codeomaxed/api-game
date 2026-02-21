import { BuriedbornesStats } from './buriedbornes-stats';

export type MonsterTier = 'common' | 'uncommon' | 'boss';

export interface Monster {
  id: string;
  name: string;
  visualDescription: string; // Detailed description for image prompt (Buriedbornes style)
  combatDescription: string; // Description for text narrative
  tier: MonsterTier;
  minLevel: number;
  xp: number;
  // Buriedbornes stats (base stats for level 1)
  baseStats?: BuriedbornesStats;
  // Current level (for scaling)
  level?: number;
}

// Monster database optimized for Buriedbornes & Gustave Doré engraving style
const MONSTERS: Monster[] = [
  {
    id: 'skeleton',
    name: 'Skeleton',
    visualDescription: 'a skeletal warrior clad in rusted chainmail, its empty eye sockets glowing with a faint crimson light, wielding a notched longsword. The bones are yellowed with age, and tattered cloth hangs from its frame. Heavy cross-hatching shadows define its form.',
    combatDescription: 'A skeletal warrior rises from the shadows, its bones clicking as it moves. Rusted chainmail hangs loosely from its frame, and crimson light flickers in its empty eye sockets.',
    tier: 'common',
    minLevel: 1,
    xp: 50,
  },
  {
    id: 'slime',
    name: 'Gelatinous Slime',
    visualDescription: 'a massive translucent ooze, its body a sickly green-yellow with visible bones and debris suspended within. It pulses and quivers, leaving a corrosive trail. Ink-wash technique shows its semi-transparent nature against the dark stone floor.',
    combatDescription: 'A gelatinous slime oozes forward, its translucent body revealing the bones of previous victims. It leaves a corrosive trail that sizzles on the stone floor.',
    tier: 'common',
    minLevel: 1,
    xp: 25,
  },
  {
    id: 'animated-armor',
    name: 'Animated Armor',
    visualDescription: 'a suit of blackened plate armor standing empty yet animated, its joints creaking with each movement. The metal is pitted and scarred, with crimson light bleeding from the gaps. Ornate engravings are visible through the ink-wash technique.',
    combatDescription: 'An empty suit of blackened plate armor clanks to life, its joints creaking. Crimson light bleeds from the gaps between plates, and it moves with unnatural purpose.',
    tier: 'uncommon',
    minLevel: 2,
    xp: 150,
  },
  {
    id: 'shadow-stalker',
    name: 'Shadow Stalker',
    visualDescription: 'a humanoid figure made of pure shadow and darkness, its form constantly shifting and writhing. Only its burning red eyes remain constant. The shadow is rendered with heavy ink washes, creating a void-like presence in the center of the room.',
    combatDescription: 'A shadowy figure materializes from the darkness, its form constantly shifting. Only its burning red eyes remain fixed on you, and the air grows cold around it.',
    tier: 'uncommon',
    minLevel: 3,
    xp: 200,
  },
  {
    id: 'corrupted-priest',
    name: 'Corrupted Priest',
    visualDescription: 'a hunched figure in tattered black robes, its face hidden beneath a hood with only glowing green eyes visible. It clutches a twisted staff topped with a skull, and dark energy writhes around its form. Heavy cross-hatching defines the folds of its robes and the corruption spreading across its body.',
    combatDescription: 'A corrupted priest emerges from the shadows, its tattered robes billowing. Dark energy crackles around its twisted staff, and its glowing eyes fix upon you with malevolent intent.',
    tier: 'common',
    minLevel: 2,
    xp: 75,
  },
  {
    id: 'bone-hound',
    name: 'Bone Hound',
    visualDescription: 'a massive skeletal canine, its bones bleached white and held together by dark magic. Flames flicker in its empty eye sockets, and its jaws are lined with jagged, broken teeth. The creature moves with unnatural grace, its claws scraping against the stone floor. Ink-wash technique emphasizes the stark contrast between bone and shadow.',
    combatDescription: 'A bone hound snarls, its skeletal frame moving with predatory grace. Flames dance in its empty eye sockets as it circles, ready to pounce.',
    tier: 'common',
    minLevel: 1,
    xp: 40,
  },
  {
    id: 'wraith',
    name: 'Wraith',
    visualDescription: 'a spectral figure of ethereal mist and shadow, its form barely visible as it drifts through the air. Tattered remnants of clothing cling to its incorporeal body, and its face is a hollow void with only two pinpricks of cold blue light. The wraith is rendered with subtle ink washes, creating a ghostly, translucent appearance.',
    combatDescription: 'A wraith materializes from the darkness, its ethereal form drifting toward you. The air grows frigid, and you hear the whisper of long-forgotten words.',
    tier: 'uncommon',
    minLevel: 3,
    xp: 180,
  },
  {
    id: 'cave-troll',
    name: 'Cave Troll',
    visualDescription: 'a hulking brute with mottled gray-green skin covered in scars and warts. Its massive frame is hunched, with powerful arms ending in claws. The troll\'s face is brutish with small, beady eyes and a wide mouth filled with jagged teeth. Heavy cross-hatching defines its muscular form and the rough texture of its hide.',
    combatDescription: 'A cave troll lumbers forward, its massive frame blocking the passage. It snarls, revealing rows of jagged teeth, and raises its clawed hands.',
    tier: 'uncommon',
    minLevel: 4,
    xp: 250,
  },
  {
    id: 'cursed-knight',
    name: 'Cursed Knight',
    visualDescription: 'a knight in blackened, rusted plate armor, its helm cracked and revealing a glimpse of glowing red eyes. The armor is adorned with tattered banners and broken heraldry. A massive two-handed sword, pitted and scarred, is gripped in its gauntleted hands. Dark energy seeps from the joints of the armor, and heavy cross-hatching defines the intricate details of the cursed plate.',
    combatDescription: 'A cursed knight steps forward, its blackened armor creaking. Red light glows from beneath its helm, and it raises its massive sword with deadly intent.',
    tier: 'uncommon',
    minLevel: 3,
    xp: 220,
  },
  {
    id: 'spider-swarm',
    name: 'Spider Swarm',
    visualDescription: 'a writhing mass of oversized arachnids, their bodies a mix of black and dark brown with glowing red eyes. The swarm moves as one entity, with countless legs skittering across the stone floor. Individual spiders are visible within the mass, their fangs dripping with venom. Ink-wash technique captures the chaotic, churning nature of the swarm.',
    combatDescription: 'A swarm of spiders pours from the darkness, their countless legs skittering across the stone. The mass moves as one, a writhing carpet of venomous death.',
    tier: 'common',
    minLevel: 2,
    xp: 60,
  },
  {
    id: 'ghoul',
    name: 'Ghoul',
    visualDescription: 'a gaunt, emaciated humanoid with pale, mottled skin stretched tight over its bones. Its fingers end in long, curved claws, and its mouth is filled with needle-like teeth. The creature moves with jerky, unnatural motions, and its eyes burn with an insatiable hunger. Heavy cross-hatching emphasizes its skeletal frame and the corruption that has consumed it.',
    combatDescription: 'A ghoul lurches forward, its gaunt frame moving with unnatural speed. Its eyes burn with hunger, and it extends its clawed hands toward you.',
    tier: 'common',
    minLevel: 2,
    xp: 80,
  },
  {
    id: 'dark-mage',
    name: 'Dark Mage',
    visualDescription: 'a figure cloaked in deep purple robes adorned with arcane symbols that glow with an eerie light. The mage\'s face is partially obscured by a hood, revealing only a glowing pair of eyes and a skeletal hand gripping a staff of twisted bone. Dark energy crackles around the staff\'s tip, and arcane runes float in the air around the figure. Ink-wash technique creates dramatic shadows around the magical effects.',
    combatDescription: 'A dark mage raises its staff, arcane energy crackling around it. The air shimmers with dark magic as it prepares to unleash a spell.',
    tier: 'uncommon',
    minLevel: 4,
    xp: 280,
  },
  {
    id: 'rotting-zombie',
    name: 'Rotting Zombie',
    visualDescription: 'a shambling corpse with decaying flesh hanging from its bones. Its skin is gray-green and mottled, with exposed bone visible through tears in the flesh. One eye dangles from its socket, and its jaw hangs at an unnatural angle. The creature moves with a slow, dragging gait, leaving a trail of putrid fluid. Heavy cross-hatching defines the decay and rot that has consumed it.',
    combatDescription: 'A rotting zombie shambles forward, its decaying form leaving a trail of putrid slime. The stench of death fills the air as it reaches for you with clawed hands.',
    tier: 'common',
    minLevel: 1,
    xp: 35,
  },
  {
    id: 'spectral-guardian',
    name: 'Spectral Guardian',
    visualDescription: 'a towering figure of ethereal blue-white energy, its form vaguely humanoid but constantly shifting. It wears the remnants of ancient armor that flicker in and out of existence. A massive spectral sword is gripped in its hands, and its face is a featureless mask of light. The guardian is rendered with subtle ink washes and glowing effects, creating an otherworldly presence.',
    combatDescription: 'A spectral guardian materializes, its ethereal form towering above you. The air crackles with otherworldly energy as it raises its glowing sword.',
    tier: 'uncommon',
    minLevel: 5,
    xp: 350,
  },
];

/**
 * Get a random monster based on weighted probabilities
 * @param level - Player level to filter monsters by minLevel
 * @param forceTier - Optional: Force a specific tier (bypasses no-monster chance)
 * @returns Monster object or null (if no monster spawns)
 */
export function getRandomMonster(level: number, forceTier?: MonsterTier): Monster | null {
  // If forceTier is provided, skip the no-monster chance
  if (!forceTier) {
    // Base chance: 30% no monster
    const noMonsterRoll = Math.random();
    if (noMonsterRoll < 0.3) {
      return null;
    }
  }

  // Filter monsters by level
  const availableMonsters = MONSTERS.filter(m => m.minLevel <= level);

  if (availableMonsters.length === 0) {
    return null;
  }

  // Determine tier based on weighted roll
  let targetTier: MonsterTier;
  if (forceTier) {
    targetTier = forceTier;
  } else {
    const tierRoll = Math.random();
    if (tierRoll < 0.70) {
      // 70% Common
      targetTier = 'common';
    } else if (tierRoll < 0.95) {
      // 25% Uncommon (70% + 25% = 95%)
      targetTier = 'uncommon';
    } else {
      // 5% Boss (95% + 5% = 100%)
      targetTier = 'boss';
    }
  }

  // Filter by tier
  const tierMonsters = availableMonsters.filter(m => m.tier === targetTier);

  // If no monsters of target tier available, fall back to any available monster
  const pool = tierMonsters.length > 0 ? tierMonsters : availableMonsters;

  // Random selection from pool
  const randomIndex = Math.floor(Math.random() * pool.length);
  return pool[randomIndex];
}

/**
 * Get monster by ID (checks both built-in and custom monsters)
 */
export function getMonsterById(id: string): Monster | undefined {
  const builtIn = MONSTERS.find(m => m.id === id);
  if (builtIn) return builtIn;
  return loadCustomMonsters().find(m => m.id === id);
}

// Custom monsters stored in localStorage
const CUSTOM_MONSTERS_STORAGE_KEY = 'dungeon-custom-monsters';

/**
 * Load custom monsters from localStorage
 */
function loadCustomMonsters(): Monster[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(CUSTOM_MONSTERS_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to load custom monsters from localStorage:', e);
  }
  return [];
}

/**
 * Save custom monsters to localStorage
 */
function saveCustomMonsters(monsters: Monster[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CUSTOM_MONSTERS_STORAGE_KEY, JSON.stringify(monsters));
  } catch (e) {
    console.error('Failed to save custom monsters to localStorage:', e);
  }
}

/**
 * Get all custom monsters
 */
export function getCustomMonsters(): Monster[] {
  return loadCustomMonsters();
}

/**
 * Create a new custom monster
 */
export function createCustomMonster(name: string, tier: MonsterTier = 'common', minLevel: number = 1, xp: number = 50): Monster {
  const customMonsters = loadCustomMonsters();
  
  // Generate a unique ID from the name
  const baseId = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  let id = baseId;
  let counter = 1;
  while (customMonsters.some(m => m.id === id) || MONSTERS.some(m => m.id === id)) {
    id = `${baseId}-${counter}`;
    counter++;
  }
  
  const newMonster: Monster = {
    id,
    name,
    visualDescription: `a ${name.toLowerCase()}`,
    combatDescription: `A ${name.toLowerCase()} appears.`,
    tier,
    minLevel,
    xp,
  };
  
  customMonsters.push(newMonster);
  saveCustomMonsters(customMonsters);
  
  return newMonster;
}

/**
 * Delete a custom monster
 */
export function deleteCustomMonster(monsterId: string): boolean {
  const customMonsters = loadCustomMonsters();
  const index = customMonsters.findIndex(m => m.id === monsterId);
  if (index === -1) return false;
  
  customMonsters.splice(index, 1);
  saveCustomMonsters(customMonsters);
  return true;
}

/**
 * Get all monsters (for debugging/admin) - includes both built-in and custom monsters
 */
export function getAllMonsters(): Monster[] {
  return [...MONSTERS, ...loadCustomMonsters()];
}

/**
 * Get a random monster from a topology-specific pool
 * @param topologyIndex - The prompt index (0-7) representing the topology
 * @param pools - Map of topology indices to maps of monsterId -> Map<entryDirection, customPrompt>
 * @param level - Player level to filter monsters by minLevel
 * @returns Monster object or null (if pool is empty or no valid monsters)
 */
export function getRandomMonsterFromPool(
  topologyIndex: number,
  pools: Map<number, Map<string, Map<string | null, string>>>,
  level: number
): Monster | null {
  const pool = pools.get(topologyIndex);
  
  console.log(`[getRandomMonsterFromPool] Topology ${topologyIndex}, pool exists: ${!!pool}, pool size: ${pool?.size || 0}`);
  
  // If pool doesn't exist or is empty, fall back to default behavior
  if (!pool || pool.size === 0) {
    console.log(`[getRandomMonsterFromPool] Pool empty or missing, falling back to getRandomMonster`);
    return getRandomMonster(level, 'common');
  }

  // Filter monsters by level and pool membership (check if monster exists in pool, regardless of entry direction)
  // Include both built-in and custom monsters
  const allMonsters = getAllMonsters();
  const poolMonsterIds = Array.from(pool.keys());
  console.log(`[getRandomMonsterFromPool] All monsters count: ${allMonsters.length}, Pool monster IDs: ${poolMonsterIds.join(', ')}`);
  
  const availableMonsters = allMonsters.filter(
    m => m.minLevel <= level && pool.has(m.id)
  );

  console.log(`[getRandomMonsterFromPool] Available monsters after filtering (level <= ${level}, in pool): ${availableMonsters.length}`);
  console.log(`[getRandomMonsterFromPool] Available monster IDs: ${availableMonsters.map(m => `${m.id} (${m.name}, minLevel: ${m.minLevel})`).join(', ')}`);
  
  // Check specifically for Assassin
  const assassinInAllMonsters = allMonsters.some(m => m.id === 'assassin');
  const assassinInPool = pool.has('assassin');
  const assassinAvailable = availableMonsters.some(m => m.id === 'assassin');
  console.log(`[getRandomMonsterFromPool] Assassin check - in getAllMonsters: ${assassinInAllMonsters}, in pool: ${assassinInPool}, available: ${assassinAvailable}`);

  if (availableMonsters.length === 0) {
    // Fallback if no monsters in pool match level requirements
    console.log(`[getRandomMonsterFromPool] No available monsters, falling back to getRandomMonster`);
    return getRandomMonster(level, 'common');
  }

  // Random selection from available pool
  const randomIndex = Math.floor(Math.random() * availableMonsters.length);
  const selected = availableMonsters[randomIndex];
  console.log(`[getRandomMonsterFromPool] Selected monster: ${selected.name} (id: ${selected.id}) from ${availableMonsters.length} available`);
  return selected;
}

/**
 * Calculate monster level based on floor
 */
export function calculateMonsterLevel(floor: number, roomType: 'NORMAL' | 'COMBAT' | 'BOSS' | 'TREASURE' | 'EVENT' | 'DEAD_END'): number {
  let baseLevel = floor;
  
  switch (roomType) {
    case 'NORMAL':
      baseLevel = floor;
      break;
    case 'COMBAT':
      baseLevel = floor; // Changed from floor + 1 to match floor (less aggressive)
      break;
    case 'BOSS':
      baseLevel = floor + 3; // Reduced from +5 to +3
      break;
    case 'TREASURE':
      baseLevel = Math.max(1, floor - 1); // Treasure rooms are easier
      break;
    case 'EVENT':
      baseLevel = floor;
      break;
    case 'DEAD_END':
      baseLevel = floor; // Changed from floor + 1 to match floor
      break;
  }
  
  return Math.max(1, baseLevel);
}

/**
 * Get base stats for a monster (default if not specified)
 */
function getMonsterBaseStats(monster: Monster): BuriedbornesStats {
  // If monster has base stats, use them
  if (monster.baseStats) {
    return monster.baseStats;
  }
  
  // Default base stats based on tier
  const tierMultipliers = {
    common: 1.0,
    uncommon: 1.5,
    boss: 3.0,
  };
  
  const multiplier = tierMultipliers[monster.tier];
  
  return {
    STR: Math.floor(8 * multiplier), // Reduced from 10
    DEX: Math.floor(6 * multiplier), // Reduced from 8
    INT: Math.floor(6 * multiplier), // Reduced from 8
    PIE: Math.floor(6 * multiplier), // Reduced from 8
    maxHP: Math.floor(60 * multiplier), // Further reduced from 80 to 60
    Power: Math.floor(6 * multiplier), // Reduced from 8
    Armor: Math.floor(3 * multiplier), // Reduced from 5
    Resistance: Math.floor(2 * multiplier), // Reduced from 3
    Avoid: Math.floor(3 * multiplier), // Reduced from 5
    Parry: 0,
    Critical: Math.floor(3 * multiplier), // Reduced from 5
    Reflect: 0,
    Pursuit: 0,
  };
}

/**
 * Scale monster to a specific level
 */
export function scaleMonsterToLevel(monster: Monster, level: number): Monster & { level: number; stats: BuriedbornesStats } {
  const baseStats = getMonsterBaseStats(monster);
  
  // Stat scaling: 10% per level above 1 (reduced from 15% to make scaling less aggressive)
  const levelMultiplier = 1 + ((level - 1) * 0.10);
  
  const scaledStats: BuriedbornesStats = {
    STR: Math.floor(baseStats.STR * levelMultiplier),
    DEX: Math.floor(baseStats.DEX * levelMultiplier),
    INT: Math.floor(baseStats.INT * levelMultiplier),
    PIE: Math.floor(baseStats.PIE * levelMultiplier),
    maxHP: Math.floor(baseStats.maxHP * levelMultiplier),
    Power: Math.floor(baseStats.Power * levelMultiplier),
    Armor: Math.floor(baseStats.Armor * levelMultiplier),
    Resistance: Math.floor(baseStats.Resistance * levelMultiplier),
    Avoid: Math.floor(baseStats.Avoid * levelMultiplier),
    Parry: Math.floor(baseStats.Parry * levelMultiplier),
    Critical: Math.floor(baseStats.Critical * levelMultiplier),
    Reflect: Math.floor(baseStats.Reflect * levelMultiplier),
    Pursuit: Math.floor(baseStats.Pursuit * levelMultiplier),
  };
  
  return {
    ...monster,
    level,
    stats: scaledStats,
  };
}


