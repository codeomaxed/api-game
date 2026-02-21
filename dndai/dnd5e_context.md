# D&D 5e Complete Game Context

This document contains comprehensive D&D 5e game mechanics, classes, races, backgrounds, spells, feats, and items for use in the AI-driven RPG game.

## Table of Contents

1. [Game Mechanics](#game-mechanics)
2. [Ability Scores](#ability-scores)
3. [Classes](#classes)
4. [Races/Lineages](#raceslineages)
5. [Backgrounds](#backgrounds)
6. [Spells](#spells)
7. [Feats](#feats)
8. [Items](#items)
9. [Combat Rules](#combat-rules)

---

## Game Mechanics

### Ability Scores

Six core ability scores determine a character's capabilities:

- **Strength (STR)**: Physical power, melee attacks, carrying capacity
- **Dexterity (DEX)**: Agility, ranged attacks, AC (with light armor), initiative
- **Constitution (CON)**: Endurance, HP per level, concentration saves
- **Intelligence (INT)**: Reasoning, memory, wizard spells, investigation
- **Wisdom (WIS)**: Awareness, insight, cleric/druid/ranger spells, perception
- **Charisma (CHA)**: Force of personality, bard/paladin/sorcerer/warlock spells, persuasion

**Ability Modifier**: `Math.floor((score - 10) / 2)`

**Ability Score Ranges**: 1-20 (typically 8-15 at character creation, can increase to 20+ with magic items)

### Proficiency Bonus

Scales with character level:
- Levels 1-4: +2
- Levels 5-8: +3
- Levels 9-12: +4
- Levels 13-16: +5
- Levels 17-20: +6

### Hit Points (HP)

**Hit Dice**: Each class has a hit die type (d6, d8, d10, d12)
**Level 1 HP**: Maximum hit die + CON modifier
**Subsequent Levels**: Roll hit die (or take average) + CON modifier

**HP Calculation Examples**:
- Fighter (d10) with CON +2 at level 1: 10 + 2 = 12 HP
- Wizard (d6) with CON +1 at level 1: 6 + 1 = 7 HP

### Armor Class (AC)

**Unarmored**: 10 + DEX modifier
**Light Armor**: Base AC + DEX modifier
**Medium Armor**: Base AC + DEX modifier (max +2)
**Heavy Armor**: Base AC (no DEX modifier)
**Shield**: +2 AC

### Saving Throws

Two saving throws are proficient (based on class) + proficiency bonus
Other saving throws use just ability modifier

### Skill System

18 skills grouped by ability:
- **Strength**: Athletics
- **Dexterity**: Acrobatics, Sleight of Hand, Stealth
- **Intelligence**: Arcana, History, Investigation, Nature, Religion
- **Wisdom**: Animal Handling, Insight, Medicine, Perception, Survival
- **Charisma**: Deception, Intimidation, Performance, Persuasion

**Skill Check**: d20 + ability modifier + proficiency bonus (if proficient)

### Spellcasting

**Spell Slots**: Limited-use spell casting resources
**Cantrips**: Level 0 spells, can cast unlimited times
**Spell Save DC**: 8 + proficiency bonus + spellcasting ability modifier
**Spell Attack Modifier**: proficiency bonus + spellcasting ability modifier

**Spell Levels**: 1-9 (higher level = more powerful)
**Spell Slots by Level**:
- Level 1: 2 slots (1st level)
- Level 2: 3 slots (1st level)
- Level 3: 4 slots (2x 1st, 2x 2nd)
- Level 4: 4 slots (3x 1st, 2x 2nd)
- Level 5: 4 slots (3x 1st, 2x 2nd, 1x 3rd)
- And so on...

---

## Classes

### Class Structure

Each class includes:
- Hit Dice
- Primary Ability
- Saving Throw Proficiencies
- Skill Proficiencies (choose from list)
- Starting Equipment
- Class Features (by level)
- Subclasses (chosen at specific levels)

---

### Artificer

**Hit Dice**: d8
**Primary Ability**: Intelligence
**Saving Throws**: Constitution, Intelligence
**Armor Proficiencies**: Light armor, medium armor, shields
**Weapon Proficiencies**: Simple weapons, firearms
**Tool Proficiencies**: Thieves' tools, tinker's tools, one type of artisan's tools

**Starting Equipment**: 
- Any simple weapon or handaxe
- Light crossbow and 20 bolts OR any simple weapon
- Studded leather armor OR scale mail
- Two daggers
- Any artisan's tools

**Class Features**:
- Level 1: Magical Tinkering, Spellcasting
- Level 2: Infuse Item
- Level 3: Artificer Specialist (subclass)
- Level 5: Artificer Specialist feature
- Level 6: Tool Expertise
- Level 7: Flash of Genius
- Level 9: Magic Item Adept
- Level 10: Magic Item Savant
- Level 11: Spell-Storing Item
- Level 14: Magic Item Master
- Level 18: Spell-Storing Item improvement
- Level 20: Soul of Artifice

**Spellcasting**: Intelligence-based, prepared spells

**Subclasses**:
1. **Alchemist** - Potions and elixirs
2. **Armorer** - Arcane armor, Guardian/Infiltrator
3. **Artillerist** - Arcane turrets
4. **Battle Smith** - Steel defender companion

---

### Barbarian

**Hit Dice**: d12
**Primary Ability**: Strength
**Saving Throws**: Strength, Constitution
**Armor Proficiencies**: Light armor, medium armor, shields
**Weapon Proficiencies**: Simple weapons, martial weapons
**Skill Proficiencies**: Choose 2 from Animal Handling, Athletics, Intimidation, Nature, Perception, Survival

**Starting Equipment**:
- Greataxe OR any martial melee weapon
- Two handaxes OR any simple weapon
- Explorer's pack and four javelins

**Class Features**:
- Level 1: Rage (2/day), Unarmored Defense
- Level 2: Reckless Attack, Danger Sense
- Level 3: Primal Path (subclass)
- Level 4: Ability Score Improvement
- Level 5: Extra Attack, Fast Movement
- Level 6: Primal Path feature
- Level 7: Feral Instinct
- Level 8: Ability Score Improvement
- Level 9: Brutal Critical (1 die)
- Level 10: Primal Path feature
- Level 11: Relentless Rage
- Level 12: Ability Score Improvement
- Level 13: Brutal Critical (2 dice)
- Level 14: Primal Path feature
- Level 15: Persistent Rage
- Level 16: Ability Score Improvement
- Level 17: Brutal Critical (3 dice)
- Level 18: Indomitable Might
- Level 19: Ability Score Improvement
- Level 20: Primal Champion

**Rage**: Bonus damage, advantage on STR checks/saves, resistance to physical damage

**Subclasses**:
1. **Path of the Ancestral Guardian** - Ancestral protectors
2. **Path of the Battlerager** - Spiked armor (Dwarf only)
3. **Path of the Beast** - Bestial transformations
4. **Path of the Berserker** - Frenzy
5. **Path of the Giant** - Giant powers
6. **Path of the Storm Herald** - Storm aura
7. **Path of the Totem Warrior** - Animal totems
8. **Path of Wild Magic** - Wild magic surges
9. **Path of the Zealot** - Divine fury

---

### Bard

**Hit Dice**: d8
**Primary Ability**: Charisma
**Saving Throws**: Dexterity, Charisma
**Armor Proficiencies**: Light armor
**Weapon Proficiencies**: Simple weapons, hand crossbows, longswords, rapiers, shortswords
**Skill Proficiencies**: Any 3 skills

**Starting Equipment**:
- Rapier OR longsword OR any simple weapon
- Diplomat's pack OR entertainer's pack
- Lute OR any other musical instrument
- Leather armor and a dagger

**Class Features**:
- Level 1: Spellcasting, Bardic Inspiration (d6)
- Level 2: Jack of All Trades, Song of Rest (d6)
- Level 3: Bard College (subclass), Expertise (2 skills)
- Level 4: Ability Score Improvement
- Level 5: Bardic Inspiration (d8), Font of Inspiration
- Level 6: Countercharm, Bard College feature
- Level 7: -
- Level 8: Ability Score Improvement
- Level 9: Song of Rest (d8)
- Level 10: Bardic Inspiration (d10), Expertise (2 more skills), Magical Secrets
- Level 11: -
- Level 12: Ability Score Improvement
- Level 13: -
- Level 14: Bard College feature, Magical Secrets
- Level 15: Bardic Inspiration (d12)
- Level 16: Ability Score Improvement
- Level 17: -
- Level 18: Magical Secrets
- Level 19: Ability Score Improvement
- Level 20: Superior Inspiration

**Spellcasting**: Charisma-based, known spells, ritual casting

**Bardic Inspiration**: d6 → d8 → d10 → d12 (bonus action, 1/short rest, then unlimited)

**Subclasses**:
1. **College of Creation** - Animating performance
2. **College of Eloquence** - Silver tongue
3. **College of Glamour** - Enthralling performance
4. **College of Lore** - Cutting words, extra skills
5. **College of Spirits** - Spiritual focus
6. **College of Swords** - Blade flourishes
7. **College of Valor** - Combat inspiration
8. **College of Whispers** - Psychic blades

---

### Cleric

**Hit Dice**: d8
**Primary Ability**: Wisdom
**Saving Throws**: Wisdom, Charisma
**Armor Proficiencies**: Light armor, medium armor, shields
**Weapon Proficiencies**: Simple weapons
**Skill Proficiencies**: Choose 2 from History, Insight, Medicine, Persuasion, Religion

**Starting Equipment**:
- Mace OR warhammer (if proficient)
- Scale mail OR leather armor OR chain mail (if proficient)
- Light crossbow and 20 bolts OR any simple weapon
- Priest's pack OR explorer's pack
- Shield and holy symbol

**Class Features**:
- Level 1: Spellcasting, Divine Domain (subclass)
- Level 2: Channel Divinity (1/rest), Divine Domain feature
- Level 3: -
- Level 4: Ability Score Improvement
- Level 5: Destroy Undead (CR 1/2)
- Level 6: Channel Divinity (2/rest), Divine Domain feature
- Level 7: -
- Level 8: Ability Score Improvement, Destroy Undead (CR 1), Divine Domain feature
- Level 9: -
- Level 10: Divine Intervention
- Level 11: Destroy Undead (CR 2)
- Level 12: Ability Score Improvement
- Level 13: -
- Level 14: Destroy Undead (CR 3)
- Level 15: -
- Level 16: Ability Score Improvement
- Level 17: Destroy Undead (CR 4), Divine Domain feature
- Level 18: Channel Divinity (3/rest)
- Level 19: Ability Score Improvement
- Level 20: Divine Intervention improvement

**Spellcasting**: Wisdom-based, prepared spells, ritual casting

**Divine Domains** (Subclasses):
1. **Arcana Domain** - Arcane magic
2. **Death Domain** - Death magic (DMG)
3. **Forge Domain** - Fire and creation
4. **Grave Domain** - Death and life balance
5. **Knowledge Domain** - Knowledge and secrets
6. **Life Domain** - Healing and protection
7. **Light Domain** - Light and fire
8. **Nature Domain** - Nature and animals
9. **Order Domain** - Law and order
10. **Peace Domain** - Unity and peace
11. **Tempest Domain** - Storms and sea
12. **Trickery Domain** - Deception and illusions
13. **Twilight Domain** - Twilight and dreams
14. **War Domain** - War and battle

---

### Druid

**Hit Dice**: d8
**Primary Ability**: Wisdom
**Saving Throws**: Intelligence, Wisdom
**Armor Proficiencies**: Light armor, medium armor, shields (non-metal)
**Weapon Proficiencies**: Clubs, daggers, darts, javelins, maces, quarterstaffs, scimitars, sickles, slings, spears
**Skill Proficiencies**: Choose 2 from Arcana, Animal Handling, Insight, Medicine, Nature, Perception, Religion, Survival

**Starting Equipment**:
- Wooden shield OR any simple weapon
- Scimitar OR any simple melee weapon
- Leather armor, explorer's pack, and druidic focus

**Class Features**:
- Level 1: Druidic, Spellcasting
- Level 2: Wild Shape (CR 1/4, no fly/swim), Druid Circle (subclass)
- Level 3: -
- Level 4: Ability Score Improvement, Wild Shape (CR 1/2, no fly)
- Level 5: -
- Level 6: Druid Circle feature
- Level 7: -
- Level 8: Ability Score Improvement, Wild Shape (CR 1, no fly)
- Level 9: -
- Level 10: Druid Circle feature
- Level 11: -
- Level 12: Ability Score Improvement
- Level 13: -
- Level 14: Druid Circle feature
- Level 15: -
- Level 16: Ability Score Improvement
- Level 17: -
- Level 18: Timeless Body, Beast Spells
- Level 19: Ability Score Improvement
- Level 20: Archdruid

**Spellcasting**: Wisdom-based, prepared spells, ritual casting

**Wild Shape**: Transform into beasts (CR and restrictions by level)

**Druid Circles** (Subclasses):
1. **Circle of Dreams** - Fey magic
2. **Circle of the Land** - Terrain specialization
3. **Circle of the Moon** - Enhanced wild shape
4. **Circle of the Shepherd** - Summoning
5. **Circle of Spores** - Fungus and decay
6. **Circle of Stars** - Starry form
7. **Circle of Wildfire** - Fire and rebirth

---

### Fighter

**Hit Dice**: d10
**Primary Ability**: Strength or Dexterity
**Saving Throws**: Strength, Constitution
**Armor Proficiencies**: All armor, shields
**Weapon Proficiencies**: Simple weapons, martial weapons
**Skill Proficiencies**: Choose 2 from Acrobatics, Animal Handling, Athletics, History, Insight, Intimidation, Perception, Survival

**Starting Equipment**:
- Chain mail OR leather armor, longbow, and 20 arrows
- Shield and martial weapon OR two martial weapons
- Light crossbow and 20 bolts OR two handaxes
- Dungeoneer's pack OR explorer's pack

**Class Features**:
- Level 1: Fighting Style, Second Wind
- Level 2: Action Surge (1 use)
- Level 3: Martial Archetype (subclass)
- Level 4: Ability Score Improvement
- Level 5: Extra Attack
- Level 6: Ability Score Improvement
- Level 7: Martial Archetype feature
- Level 8: Ability Score Improvement
- Level 9: Indomitable (1 use)
- Level 10: Martial Archetype feature
- Level 11: Extra Attack (2)
- Level 12: Ability Score Improvement
- Level 13: Indomitable (2 uses)
- Level 14: Ability Score Improvement
- Level 15: Martial Archetype feature
- Level 16: Ability Score Improvement
- Level 17: Action Surge (2 uses), Indomitable (3 uses)
- Level 18: Martial Archetype feature
- Level 19: Ability Score Improvement
- Level 20: Extra Attack (3)

**Fighting Styles**: Archery, Defense, Dueling, Great Weapon Fighting, Protection, Two-Weapon Fighting

**Martial Archetypes** (Subclasses):
1. **Arcane Archer** - Magic arrows
2. **Banneret** - Inspiring leader
3. **Battle Master** - Combat maneuvers
4. **Cavalier** - Mounted combat
5. **Champion** - Improved critical
6. **Echo Knight** - Echo duplicate
7. **Eldritch Knight** - Spellcasting
8. **Psi Warrior** - Psionic powers
9. **Rune Knight** - Giant runes
10. **Samurai** - Fighting spirit

---

### Monk

**Hit Dice**: d8
**Primary Ability**: Dexterity and Wisdom
**Saving Throws**: Strength, Dexterity
**Armor Proficiencies**: None
**Weapon Proficiencies**: Simple weapons, shortswords
**Skill Proficiencies**: Choose 2 from Acrobatics, Athletics, History, Insight, Religion, Stealth

**Starting Equipment**:
- Shortsword OR any simple weapon
- Dungeoneer's pack OR explorer's pack
- 10 darts

**Class Features**:
- Level 1: Unarmored Defense, Martial Arts (d4)
- Level 2: Ki (2 points), Unarmored Movement (+10 ft)
- Level 3: Monastic Tradition (subclass), Deflect Missiles
- Level 4: Ability Score Improvement, Slow Fall, Unarmored Movement (+15 ft)
- Level 5: Extra Attack, Stunning Strike, Martial Arts (d6)
- Level 6: Ki-Empowered Strikes, Monastic Tradition feature, Unarmored Movement (+20 ft)
- Level 7: Evasion, Stillness of Mind
- Level 8: Ability Score Improvement, Unarmored Movement (+25 ft)
- Level 9: Unarmored Movement improvement
- Level 10: Purity of Body, Unarmored Movement (+30 ft)
- Level 11: Monastic Tradition feature
- Level 12: Ability Score Improvement, Unarmored Movement (+35 ft)
- Level 13: Tongue of the Sun and Moon
- Level 14: Diamond Soul, Unarmored Movement (+40 ft)
- Level 15: Timeless Body
- Level 16: Ability Score Improvement, Unarmored Movement (+45 ft)
- Level 17: Monastic Tradition feature
- Level 18: Empty Body, Unarmored Movement (+50 ft)
- Level 19: Ability Score Improvement
- Level 20: Perfect Self

**Ki Points**: Equal to monk level, recharge on short rest
**Martial Arts Die**: d4 → d6 → d8 → d10

**Monastic Traditions** (Subclasses):
1. **Way of Mercy** - Healing hands
2. **Way of the Ascendant Dragon** - Dragon powers
3. **Way of the Astral Self** - Astral arms
4. **Way of the Drunken Master** - Drunken technique
5. **Way of the Four Elements** - Elemental disciplines
6. **Way of the Kensei** - Weapon mastery
7. **Way of the Long Death** - Death touch
8. **Way of the Open Hand** - Open hand technique
9. **Way of Shadow** - Shadow arts
10. **Way of the Sun Soul** - Radiant sun bolts

---

### Paladin

**Hit Dice**: d10
**Primary Ability**: Strength and Charisma
**Saving Throws**: Wisdom, Charisma
**Armor Proficiencies**: All armor, shields
**Weapon Proficiencies**: Simple weapons, martial weapons
**Skill Proficiencies**: Choose 2 from Athletics, Insight, Intimidation, Medicine, Persuasion, Religion

**Starting Equipment**:
- Martial weapon and shield OR two martial weapons
- Five javelins OR any simple melee weapon
- Priest's pack OR explorer's pack
- Chain mail and holy symbol

**Class Features**:
- Level 1: Divine Sense, Lay on Hands
- Level 2: Fighting Style, Spellcasting, Divine Smite
- Level 3: Sacred Oath (subclass), Divine Health
- Level 4: Ability Score Improvement
- Level 5: Extra Attack
- Level 6: Aura of Protection
- Level 7: Sacred Oath feature
- Level 8: Ability Score Improvement
- Level 9: -
- Level 10: Aura of Devotion
- Level 11: Improved Divine Smite
- Level 12: Ability Score Improvement
- Level 13: -
- Level 14: Cleansing Touch
- Level 15: Sacred Oath feature
- Level 16: Ability Score Improvement
- Level 17: -
- Level 18: Aura improvements
- Level 19: Ability Score Improvement
- Level 20: Sacred Oath capstone

**Spellcasting**: Charisma-based, prepared spells

**Sacred Oaths** (Subclasses):
1. **Oath of the Ancients** - Nature and light
2. **Oath of Conquest** - Domination
3. **Oath of the Crown** - Law and order
4. **Oath of Devotion** - Justice and virtue
5. **Oath of Glory** - Heroism
6. **Oath of Redemption** - Peace and mercy
7. **Oath of Vengeance** - Retribution
8. **Oath of the Watchers** - Extraplanar threats
9. **Oathbreaker** - Broken oath (DMG)

---

### Ranger

**Hit Dice**: d10
**Primary Ability**: Dexterity and Wisdom
**Saving Throws**: Strength, Dexterity
**Armor Proficiencies**: Light armor, medium armor, shields
**Weapon Proficiencies**: Simple weapons, martial weapons
**Skill Proficiencies**: Choose 3 from Animal Handling, Athletics, Insight, Investigation, Nature, Perception, Stealth, Survival

**Starting Equipment**:
- Scale mail OR leather armor
- Two shortswords OR two simple melee weapons
- Dungeoneer's pack OR explorer's pack
- Longbow and quiver of 20 arrows

**Class Features**:
- Level 1: Favored Enemy, Natural Explorer
- Level 2: Fighting Style, Spellcasting
- Level 3: Ranger Conclave (subclass), Primeval Awareness
- Level 4: Ability Score Improvement
- Level 5: Extra Attack
- Level 6: Favored Enemy improvement, Natural Explorer improvement
- Level 7: Ranger Conclave feature
- Level 8: Ability Score Improvement, Land's Stride
- Level 9: -
- Level 10: Natural Explorer improvement, Hide in Plain Sight
- Level 11: Ranger Conclave feature
- Level 12: Ability Score Improvement
- Level 13: -
- Level 14: Favored Enemy improvement, Vanish
- Level 15: Ranger Conclave feature
- Level 16: Ability Score Improvement
- Level 17: -
- Level 18: Feral Senses
- Level 19: Ability Score Improvement
- Level 20: Foe Slayer

**Spellcasting**: Wisdom-based, known spells

**Ranger Conclaves** (Subclasses):
1. **Beast Master Conclave** - Animal companion
2. **Drakewarden** - Drake companion
3. **Fey Wanderer** - Fey magic
4. **Gloom Stalker Conclave** - Shadow magic
5. **Horizon Walker Conclave** - Planar magic
6. **Hunter Conclave** - Hunter's prey
7. **Monster Slayer Conclave** - Monster hunting
8. **Swarmkeeper** - Swarm companion

---

### Rogue

**Hit Dice**: d8
**Primary Ability**: Dexterity
**Saving Throws**: Dexterity, Intelligence
**Armor Proficiencies**: Light armor
**Weapon Proficiencies**: Simple weapons, hand crossbows, longswords, rapiers, shortswords
**Skill Proficiencies**: Choose 4 from Acrobatics, Athletics, Deception, Insight, Intimidation, Investigation, Perception, Performance, Persuasion, Sleight of Hand, Stealth
**Tool Proficiencies**: Thieves' tools

**Starting Equipment**:
- Rapier OR shortsword
- Shortbow and quiver of 20 arrows OR shortsword
- Burglar's pack OR dungeoneer's pack OR explorer's pack
- Leather armor, two daggers, and thieves' tools

**Class Features**:
- Level 1: Expertise (2 skills), Sneak Attack (1d6), Thieves' Cant
- Level 2: Cunning Action
- Level 3: Roguish Archetype (subclass)
- Level 4: Ability Score Improvement
- Level 5: Uncanny Dodge, Sneak Attack (3d6)
- Level 6: Expertise (2 more skills)
- Level 7: Evasion, Sneak Attack (4d6)
- Level 8: Ability Score Improvement
- Level 9: Roguish Archetype feature, Sneak Attack (5d6)
- Level 10: Ability Score Improvement
- Level 11: Reliable Talent, Sneak Attack (6d6)
- Level 12: Ability Score Improvement
- Level 13: Roguish Archetype feature, Sneak Attack (7d6)
- Level 14: Blindsense
- Level 15: Slippery Mind, Sneak Attack (8d6)
- Level 16: Ability Score Improvement
- Level 17: Roguish Archetype feature, Sneak Attack (9d6)
- Level 18: Elusive
- Level 19: Ability Score Improvement
- Level 20: Stroke of Luck, Sneak Attack (10d6)

**Sneak Attack**: 1d6 per 2 levels (max 10d6), once per turn, requires advantage or ally adjacent

**Roguish Archetypes** (Subclasses):
1. **Arcane Trickster** - Spellcasting
2. **Assassin** - Assassinate
3. **Inquisitive** - Insightful fighting
4. **Mastermind** - Master of intrigue
5. **Phantom** - Death's friend
6. **Scout** - Skirmisher
7. **Soulknife** - Psionic blades
8. **Swashbuckler** - Panache
9. **Thief** - Fast hands

---

### Sorcerer

**Hit Dice**: d6
**Primary Ability**: Charisma
**Saving Throws**: Constitution, Charisma
**Armor Proficiencies**: None
**Weapon Proficiencies**: Daggers, darts, slings, quarterstaffs, light crossbows
**Skill Proficiencies**: Choose 2 from Arcana, Deception, Insight, Intimidation, Persuasion, Religion

**Starting Equipment**:
- Light crossbow and 20 bolts OR any simple weapon
- Component pouch OR arcane focus
- Dungeoneer's pack OR explorer's pack
- Two daggers

**Class Features**:
- Level 1: Spellcasting, Sorcerous Origin (subclass)
- Level 2: Font of Magic (2 sorcery points)
- Level 3: Metamagic (2 options)
- Level 4: Ability Score Improvement
- Level 5: -
- Level 6: Sorcerous Origin feature
- Level 7: -
- Level 8: Ability Score Improvement
- Level 9: -
- Level 10: Metamagic (1 more option)
- Level 11: -
- Level 12: Ability Score Improvement
- Level 13: -
- Level 14: Sorcerous Origin feature
- Level 15: -
- Level 16: Ability Score Improvement
- Level 17: Metamagic (1 more option)
- Level 18: Sorcerous Origin feature
- Level 19: Ability Score Improvement
- Level 20: Sorcerous Restoration

**Spellcasting**: Charisma-based, known spells

**Sorcery Points**: Equal to sorcerer level, can convert to/from spell slots

**Metamagic Options**: Careful Spell, Distant Spell, Empowered Spell, Extended Spell, Heightened Spell, Quickened Spell, Seeking Spell, Subtle Spell, Transmuted Spell, Twinned Spell

**Sorcerous Origins** (Subclasses):
1. **Aberrant Mind** - Psionic powers
2. **Clockwork Soul** - Order magic
3. **Draconic Bloodline** - Dragon ancestry
4. **Divine Soul** - Divine magic
5. **Lunar Sorcery** - Moon phases
6. **Shadow Magic** - Shadowfell
7. **Storm Sorcery** - Storm magic
8. **Wild Magic** - Wild magic surges

---

### Warlock

**Hit Dice**: d8
**Primary Ability**: Charisma
**Saving Throws**: Wisdom, Charisma
**Armor Proficiencies**: Light armor
**Weapon Proficiencies**: Simple weapons
**Skill Proficiencies**: Choose 2 from Arcana, Deception, History, Intimidation, Investigation, Nature, Religion

**Starting Equipment**:
- Light crossbow and 20 bolts OR any simple weapon
- Component pouch OR arcane focus
- Scholar's pack OR dungeoneer's pack
- Leather armor, any simple weapon, two daggers

**Class Features**:
- Level 1: Otherworldly Patron (subclass), Pact Magic
- Level 2: Eldritch Invocations (2)
- Level 3: Pact Boon
- Level 4: Ability Score Improvement
- Level 5: -
- Level 6: Otherworldly Patron feature
- Level 7: -
- Level 8: Ability Score Improvement
- Level 9: -
- Level 10: Otherworldly Patron feature
- Level 11: Mystic Arcanum (6th level)
- Level 12: Ability Score Improvement
- Level 13: Mystic Arcanum (7th level)
- Level 14: Otherworldly Patron feature
- Level 15: Mystic Arcanum (8th level)
- Level 16: Ability Score Improvement
- Level 17: Mystic Arcanum (9th level)
- Level 18: -
- Level 19: Ability Score Improvement
- Level 20: Eldritch Master

**Pact Magic**: Short rest spell slot recovery, spell slots scale (1st → 5th level slots)

**Eldritch Invocations**: Customize warlock abilities

**Pact Boons**: Pact of the Blade, Pact of the Chain, Pact of the Tome

**Otherworldly Patrons** (Subclasses):
1. **The Archfey** - Fey magic
2. **The Celestial** - Healing light
3. **The Fathomless** - Deep sea
4. **The Fiend** - Fiendish power
5. **The Genie** - Genie magic
6. **The Great Old One** - Cosmic horror
7. **The Hexblade** - Hex warrior
8. **The Undead** - Undeath
9. **The Undying** - Immortality

---

### Wizard

**Hit Dice**: d6
**Primary Ability**: Intelligence
**Saving Throws**: Intelligence, Wisdom
**Armor Proficiencies**: None
**Weapon Proficiencies**: Daggers, darts, slings, quarterstaffs, light crossbows
**Skill Proficiencies**: Choose 2 from Arcana, History, Insight, Investigation, Medicine, Religion

**Starting Equipment**:
- Quarterstaff OR dagger
- Component pouch OR arcane focus
- Scholar's pack OR explorer's pack
- Spellbook

**Class Features**:
- Level 1: Spellcasting, Arcane Recovery
- Level 2: Arcane Tradition (subclass)
- Level 3: -
- Level 4: Ability Score Improvement
- Level 5: -
- Level 6: Arcane Tradition feature
- Level 7: -
- Level 8: Ability Score Improvement
- Level 9: -
- Level 10: Arcane Tradition feature
- Level 11: -
- Level 12: Ability Score Improvement
- Level 13: -
- Level 14: Arcane Tradition feature
- Level 15: -
- Level 16: Ability Score Improvement
- Level 17: -
- Level 18: Spell Mastery
- Level 19: Ability Score Improvement
- Level 20: Signature Spells

**Spellcasting**: Intelligence-based, prepared spells, ritual casting, spellbook

**Arcane Traditions** (Subclasses):
1. **School of Abjuration** - Protection magic
2. **School of Bladesinging** - Bladesong (Elf/Half-Elf)
3. **School of Chronurgy** - Time magic
4. **School of Conjuration** - Summoning
5. **School of Divination** - Fortune telling
6. **School of Enchantment** - Mind control
7. **School of Evocation** - Damage spells
8. **School of Graviturgy** - Gravity magic
9. **School of Illusion** - Illusions
10. **School of Necromancy** - Death magic
11. **Order of Scribes** - Spellbook mastery
12. **School of Transmutation** - Transformation
13. **School of War Magic** - Combat magic

---

## Races/Lineages

### Common Races

#### Dragonborn
- **Ability Score Increase**: +2 STR, +1 CHA
- **Size**: Medium
- **Speed**: 30 ft
- **Traits**: Draconic Ancestry, Breath Weapon, Damage Resistance

#### Dwarf
- **Ability Score Increase**: +2 CON
- **Size**: Medium
- **Speed**: 25 ft (not reduced by armor)
- **Subraces**: Hill Dwarf (+1 WIS), Mountain Dwarf (+2 STR)
- **Traits**: Darkvision, Dwarven Resilience, Dwarven Combat Training, Stonecunning

#### Elf
- **Ability Score Increase**: +2 DEX
- **Size**: Medium
- **Speed**: 30 ft
- **Subraces**: High Elf (+1 INT), Wood Elf (+1 WIS), Drow (+1 CHA)
- **Traits**: Darkvision, Keen Senses, Fey Ancestry, Trance

#### Gnome
- **Ability Score Increase**: +2 INT
- **Size**: Small
- **Speed**: 25 ft
- **Subraces**: Forest Gnome (+1 DEX), Rock Gnome (+1 CON)
- **Traits**: Darkvision, Gnome Cunning

#### Half-Elf
- **Ability Score Increase**: +2 CHA, +1 to two other abilities
- **Size**: Medium
- **Speed**: 30 ft
- **Traits**: Darkvision, Fey Ancestry, Skill Versatility

#### Half-Orc
- **Ability Score Increase**: +2 STR, +1 CON
- **Size**: Medium
- **Speed**: 30 ft
- **Traits**: Darkvision, Menacing, Relentless Endurance, Savage Attacks

#### Halfling
- **Ability Score Increase**: +2 DEX
- **Size**: Small
- **Speed**: 25 ft
- **Subraces**: Lightfoot (+1 CHA), Stout (+1 CON)
- **Traits**: Lucky, Brave, Halfling Nimbleness

#### Human
- **Ability Score Increase**: +1 to all abilities (Standard) OR +1 to two abilities and a feat (Variant)
- **Size**: Medium
- **Speed**: 30 ft
- **Traits**: Variant Human gets a skill proficiency

#### Tiefling
- **Ability Score Increase**: +2 CHA, +1 INT
- **Size**: Medium
- **Speed**: 30 ft
- **Traits**: Darkvision, Hellish Resistance, Infernal Legacy

---

### Exotic Races

#### Aarakocra
- **Ability Score Increase**: +2 DEX, +1 WIS
- **Speed**: 25 ft, fly 50 ft
- **Traits**: Talons, Wind Caller

#### Aasimar
- **Ability Score Increase**: +2 CHA, +1 to one ability
- **Subraces**: Protector (+1 WIS), Scourge (+1 CON), Fallen (+1 STR)
- **Traits**: Darkvision, Celestial Resistance, Healing Hands, Light Bearer

#### Changeling
- **Ability Score Increase**: +2 CHA, +1 to one ability
- **Traits**: Shapechanger, Changeling Instincts, Divergent Persona

#### Deep Gnome (Svirfneblin)
- **Ability Score Increase**: +2 INT, +1 DEX
- **Traits**: Superior Darkvision, Stone Camouflage

#### Duergar
- **Ability Score Increase**: +2 CON, +1 STR
- **Traits**: Superior Darkvision, Duergar Resilience, Duergar Magic, Sunlight Sensitivity

#### Eladrin
- **Ability Score Increase**: +2 DEX, +1 CHA
- **Traits**: Fey Step (seasonal effects)

#### Fairy
- **Ability Score Increase**: +2 DEX, +1 to one ability
- **Size**: Small
- **Speed**: 30 ft
- **Traits**: Flight, Fairy Magic

#### Firbolg
- **Ability Score Increase**: +2 WIS, +1 STR
- **Traits**: Firbolg Magic, Hidden Step, Speech of Beast and Leaf, Powerful Build

#### Genasi
- **Ability Score Increase**: +2 CON, +1 based on element
- **Subraces**: Air (+1 DEX), Earth (+1 STR), Fire (+1 INT), Water (+1 WIS)
- **Traits**: Elemental resistance, spell based on element

#### Githyanki
- **Ability Score Increase**: +2 STR, +1 INT
- **Traits**: Decadent Mastery, Githyanki Psionics

#### Githzerai
- **Ability Score Increase**: +2 WIS, +1 INT
- **Traits**: Mental Discipline, Githzerai Psionics

#### Goliath
- **Ability Score Increase**: +2 STR, +1 CON
- **Traits**: Natural Athlete, Stone's Endurance, Powerful Build, Mountain Born

#### Harengon
- **Ability Score Increase**: +2 DEX, +1 to one ability
- **Traits**: Hare-Trigger, Leporine Senses, Lucky Footwork, Rabbit Hop

#### Kenku
- **Ability Score Increase**: +2 DEX, +1 WIS
- **Traits**: Expert Forgery, Kenku Training, Mimicry

#### Locathah
- **Ability Score Increase**: +2 STR, +1 WIS
- **Traits**: Amphibious, Leviathan Will, Natural Armor, Observant and Athletic

#### Owlin
- **Ability Score Increase**: +2 DEX, +1 WIS
- **Traits**: Darkvision, Flight, Silent Feathers

#### Satyr
- **Ability Score Increase**: +2 CHA, +1 DEX
- **Traits**: Ram, Magic Resistance, Mirthful Leaps, Reveler

#### Sea Elf
- **Ability Score Increase**: +2 DEX, +1 CON
- **Traits**: Child of the Sea, Friend of the Sea, Sea Elf Training, Darkvision, Fey Ancestry, Keen Senses, Trance

#### Shadar-Kai
- **Ability Score Increase**: +2 DEX, +1 CON
- **Traits**: Blessing of the Raven Queen, Necrotic Resistance, Trance

#### Tabaxi
- **Ability Score Increase**: +2 DEX, +1 CHA
- **Traits**: Darkvision, Feline Agility, Cat's Claws, Cat's Talent

#### Tortle
- **Ability Score Increase**: +2 STR, +1 WIS
- **Traits**: Natural Armor (AC 17), Claws, Hold Breath, Shell Defense

#### Triton
- **Ability Score Increase**: +1 STR, +1 CON, +1 CHA
- **Traits**: Amphibious, Control Air and Water, Emissary of the Sea, Guardian of the Depths

#### Verdan
- **Ability Score Increase**: +2 CON, +1 CHA
- **Traits**: Black Blood Healing, Limited Telepathy, Telepathic Insight

---

### Monstrous Races

#### Bugbear
- **Ability Score Increase**: +2 STR, +1 DEX
- **Traits**: Darkvision, Long-Limbed, Powerful Build, Sneaky, Surprise Attack

#### Centaur
- **Ability Score Increase**: +2 STR, +1 WIS
- **Traits**: Charge, Equine Build, Hooves, Natural Affinity

#### Goblin
- **Ability Score Increase**: +2 DEX, +1 CON
- **Size**: Small
- **Traits**: Darkvision, Fury of the Small, Nimble Escape

#### Grung
- **Ability Score Increase**: +2 DEX, +1 CON
- **Size**: Small
- **Traits**: Amphibious, Poison Immunity, Standing Leap, Water Dependency, Poisonous Skin

#### Hobgoblin
- **Ability Score Increase**: +2 CON, +1 INT
- **Traits**: Darkvision, Fey Ancestry, Fortune from the Many, Saving Face

#### Kobold
- **Ability Score Increase**: +2 DEX, -2 STR (or +2 DEX, +1 to one ability in newer versions)
- **Size**: Small
- **Traits**: Darkvision, Grovel, Cower, and Beg, Pack Tactics, Sunlight Sensitivity

#### Lizardfolk
- **Ability Score Increase**: +2 CON, +1 WIS
- **Traits**: Bite, Cunning Artisan, Hold Breath, Hunter's Lore, Natural Armor, Hungry Jaws

#### Minotaur
- **Ability Score Increase**: +2 STR, +1 CON
- **Traits**: Horns, Goring Rush, Hammering Horns, Labyrinthine Recall, Natural Cunning, Relentless Endurance

#### Orc
- **Ability Score Increase**: +2 STR, +1 CON
- **Traits**: Darkvision, Menacing, Relentless Endurance, Savage Attacks, Powerful Build

#### Shifter
- **Ability Score Increase**: +2 DEX, +1 to one ability
- **Subraces**: Beasthide (+1 CON), Longtooth (+1 STR), Swiftstride (+1 CHA), Wildhunt (+1 WIS)
- **Traits**: Darkvision, Shifting

#### Yuan-Ti
- **Ability Score Increase**: +2 CHA, +1 INT
- **Traits**: Darkvision, Innate Spellcasting, Magic Resistance, Poison Immunity, Serpentine Appearance

---

## Backgrounds

Backgrounds provide skill proficiencies, tool proficiencies, languages, and starting equipment.

### Common Backgrounds

#### Acolyte
- **Skills**: Insight, Religion
- **Languages**: Two of your choice
- **Equipment**: Holy symbol, prayer book, 5 sticks of incense, vestments, common clothes, belt pouch with 15 gp

#### Criminal
- **Skills**: Deception, Stealth
- **Tools**: One type of gaming set, thieves' tools
- **Equipment**: Crowbar, common clothes, belt pouch with 15 gp

#### Folk Hero
- **Skills**: Animal Handling, Survival
- **Tools**: One type of artisan's tools, vehicles (land)
- **Equipment**: Artisan's tools, shovel, iron pot, common clothes, belt pouch with 10 gp

#### Noble
- **Skills**: History, Persuasion
- **Tools**: One type of gaming set
- **Languages**: One of your choice
- **Equipment**: Fine clothes, signet ring, scroll of pedigree, purse with 25 gp

#### Sage
- **Skills**: Arcana, History
- **Languages**: Two of your choice
- **Equipment**: Bottle of black ink, quill, small knife, letter from a dead colleague, common clothes, belt pouch with 10 gp

#### Soldier
- **Skills**: Athletics, Intimidation
- **Tools**: One type of gaming set, vehicles (land)
- **Equipment**: Insignia of rank, trophy from fallen enemy, set of bone dice or deck of cards, common clothes, belt pouch with 10 gp

---

## Spells

Spells are organized by class and school. Each spell includes:
- **Level**: 0 (cantrip) through 9
- **School**: Abjuration, Conjuration, Divination, Enchantment, Evocation, Illusion, Necromancy, Transmutation
- **Casting Time**: Action, bonus action, reaction, 1 minute, etc.
- **Range**: Self, touch, 30 ft, etc.
- **Components**: V (verbal), S (somatic), M (material)
- **Duration**: Instantaneous, 1 round, 1 minute, concentration, etc.
- **Description**: What the spell does

### Spell Schools

1. **Abjuration**: Protection and barriers
2. **Conjuration**: Summoning and teleportation
3. **Divination**: Information gathering
4. **Enchantment**: Mind control and influence
5. **Evocation**: Damage and energy
6. **Illusion**: Deception and phantasms
7. **Necromancy**: Death and undeath
8. **Transmutation**: Transformation and alteration

### Notable Cantrips (Level 0)

- **Fire Bolt**: 1d10 fire damage, 120 ft range
- **Eldritch Blast**: 1d10 force damage, 120 ft range (Warlock)
- **Guidance**: +1d4 to ability check
- **Mage Hand**: Telekinetic hand
- **Minor Illusion**: Create sound or image
- **Prestidigitation**: Minor magical effects

### Notable 1st Level Spells

- **Magic Missile**: 3×1d4+1 force damage, auto-hit
- **Shield**: +5 AC as reaction
- **Cure Wounds**: 1d8+spellcasting modifier healing
- **Burning Hands**: 3d6 fire damage, 15 ft cone
- **Charm Person**: Charmed condition, 1 hour

---

## Feats

Feats provide special abilities or improvements. Characters can take a feat instead of an Ability Score Improvement.

### Notable Feats

#### Great Weapon Master
- On melee attack with heavy weapon, take -5 to hit for +10 damage
- On crit or kill with melee weapon, make bonus action attack

#### Sharpshooter
- Ignore half and three-quarters cover
- No disadvantage at long range
- Take -5 to hit for +10 damage with ranged weapon

#### War Caster
- Advantage on Constitution saves for concentration
- Can perform somatic components with weapons/shields
- Can cast spell as opportunity attack

#### Sentinel
- Opportunity attacks stop enemy movement
- Can make opportunity attacks when enemy attacks ally
- Enemies within 5 ft have disadvantage on opportunity attacks against you

#### Polearm Master
- Can make bonus action attack with polearm (1d4)
- Opportunity attacks when enemy enters reach

---

## Items

### Weapons

**Simple Melee**: Club (1d4), Dagger (1d4, finesse, thrown), Greatclub (1d8, two-handed), Handaxe (1d6, light, thrown), Javelin (1d6, thrown), Light hammer (1d4, light, thrown), Mace (1d6), Quarterstaff (1d6, versatile 1d8), Sickle (1d4, light), Spear (1d6, thrown, versatile 1d8)

**Simple Ranged**: Light crossbow (1d8, loading, two-handed, range 80/320), Dart (1d4, finesse, thrown), Shortbow (1d6, two-handed, range 80/320), Sling (1d4, range 30/120)

**Martial Melee**: Battleaxe (1d8, versatile 1d10), Flail (1d8), Glaive (1d10, heavy, reach, two-handed), Greataxe (1d12, heavy, two-handed), Greatsword (2d6, heavy, two-handed), Halberd (1d10, heavy, reach, two-handed), Lance (1d12, reach, special), Longsword (1d8, versatile 1d10), Maul (2d6, heavy, two-handed), Morningstar (1d8), Pike (1d10, heavy, reach, two-handed), Rapier (1d8, finesse), Scimitar (1d6, finesse, light), Shortsword (1d6, finesse, light), Trident (1d6, thrown, versatile 1d8), War pick (1d8), Warhammer (1d8, versatile 1d10), Whip (1d4, finesse, reach)

**Martial Ranged**: Blowgun (1, loading, range 25/100), Hand crossbow (1d6, light, loading, range 30/120), Heavy crossbow (1d10, heavy, loading, two-handed, range 100/400), Longbow (1d8, heavy, two-handed, range 150/600), Net (special, thrown, range 5/15)

### Armor

**Light Armor**: Padded (AC 11 + DEX), Leather (AC 11 + DEX), Studded Leather (AC 12 + DEX)

**Medium Armor**: Hide (AC 12 + DEX max 2), Chain Shirt (AC 13 + DEX max 2), Scale Mail (AC 14 + DEX max 2), Breastplate (AC 14 + DEX max 2), Half Plate (AC 15 + DEX max 2)

**Heavy Armor**: Ring Mail (AC 14), Chain Mail (AC 16, STR 13), Splint (AC 17, STR 15), Plate (AC 18, STR 15)

**Shields**: Shield (+2 AC)

### Wondrous Items

**Common**: Cloak of Billowing, Wand of Conducting, etc.
**Uncommon**: Bag of Holding, Boots of Elvenkind, Cloak of Protection, etc.
**Rare**: Belt of Giant Strength, Cloak of Displacement, etc.
**Very Rare**: Staff of Power, Vorpal Sword, etc.
**Legendary**: Holy Avenger, Robe of the Archmagi, etc.
**Artifact**: Hand of Vecna, etc.

---

## Combat Rules

### Turn Structure

1. **Initiative**: d20 + DEX modifier
2. **On Your Turn**: Move, Action, Bonus Action, Free Object Interaction
3. **Reactions**: Can use once per round, outside your turn

### Actions

- **Attack**: Make weapon or unarmed attack
- **Cast a Spell**: Cast spell with casting time of 1 action
- **Dash**: Double movement speed
- **Disengage**: Movement doesn't provoke opportunity attacks
- **Dodge**: Enemies have disadvantage, DEX saves have advantage
- **Help**: Give ally advantage on next ability check or attack
- **Hide**: Make Stealth check
- **Ready**: Prepare action for trigger
- **Search**: Make Perception or Investigation check
- **Use an Object**: Interact with object

### Attack Roll

d20 + proficiency bonus (if proficient) + ability modifier (STR for melee, DEX for ranged/finesse) vs. target's AC

### Damage Roll

Weapon damage die + ability modifier (STR for melee, DEX for ranged/finesse, unless weapon has finesse property)

### Critical Hit

Roll all damage dice twice (natural 20 on attack roll)

### Conditions

- **Blinded**: Can't see, fails sight-based checks, attacks have disadvantage, attacks against have advantage
- **Charmed**: Can't attack charmer, charmer has advantage on social checks
- **Frightened**: Disadvantage on ability checks/attacks while source in sight, can't willingly move closer
- **Grappled**: Speed 0, condition ends if grappler incapacitated or target removed from reach
- **Paralyzed**: Can't act, auto-fails STR/DEX saves, attacks have advantage, crits on hits within 5 ft
- **Poisoned**: Disadvantage on attack rolls and ability checks
- **Prone**: Can only crawl, disadvantage on attack rolls, attacks within 5 ft have advantage, attacks beyond 5 ft have disadvantage
- **Restrained**: Speed 0, disadvantage on DEX saves and attack rolls, attacks have advantage
- **Stunned**: Can't act, auto-fails STR/DEX saves, attacks have advantage
- **Unconscious**: Can't act, unaware, drops held items, auto-fails STR/DEX saves, attacks have advantage, crits on hits within 5 ft

---

*This document will be continuously updated as more content is scraped and documented from dnd5e.wikidot.com*














