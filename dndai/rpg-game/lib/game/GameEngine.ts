import { GameNode, GameState, StoryContext, StoryEvent, AIResponse, CombatState } from '@/types/game';
import { Character } from '@/types/character';
import { constructRoomPrompt } from '@/lib/dungeon/prompts';
import { DungeonNode } from '@/lib/dungeon/types';

export class GameEngine {
  private state: GameState;
  private character: Character;

  constructor(character: Character, initialState: GameNode) {
    this.character = character;
    this.state = {
      currentNode: initialState,
      storyContext: {
        history: [],
        currentLocation: 'Dungeon Entrance',
        checkpoints: ['Dungeon Entrance'],
        choices: [],
        consequences: {},
      },
    };
  }

  getState(): GameState {
    return this.state;
  }

  getCurrentNode(): GameNode {
    return this.state.currentNode;
  }

  getStoryContext(): StoryContext {
    return this.state.storyContext;
  }

  getCombatState(): CombatState | undefined {
    return this.state.combatState;
  }

  // Process a player choice
  async processChoice(choiceId: string, aiResponse: AIResponse): Promise<void> {
    const choice = this.state.currentNode.choices.find(c => c.id === choiceId);
    if (!choice) {
      throw new Error(`Choice ${choiceId} not found`);
    }

    // Add to story history
    const event: StoryEvent = {
      id: `event-${Date.now()}`,
      timestamp: Date.now(),
      type: this.state.currentNode.type,
      description: this.state.currentNode.description,
      choice: choice.text,
      result: aiResponse.result,
    };

    this.state.storyContext.history.push(event);
    this.state.storyContext.choices.push(choice.text);

    // Update location if needed
    if (aiResponse.nextNode.metadata?.location) {
      this.state.storyContext.currentLocation = aiResponse.nextNode.metadata.location.name;
      if (aiResponse.nextNode.metadata.location.type === 'checkpoint') {
        if (!this.state.storyContext.checkpoints.includes(aiResponse.nextNode.metadata.location.name)) {
          this.state.storyContext.checkpoints.push(aiResponse.nextNode.metadata.location.name);
        }
      }
    }

    // Update current node
    this.state.currentNode = aiResponse.nextNode;

    // Handle combat state
    if (aiResponse.nextNode.type === 'combat' && aiResponse.nextNode.metadata?.enemy) {
      this.state.combatState = {
        turn: 'player',
        round: 1,
        enemy: aiResponse.nextNode.metadata.enemy,
        playerActions: [],
        enemyActions: [],
      };
    } else {
      this.state.combatState = undefined;
    }

    // Store consequences
    if (aiResponse.nextNode.metadata) {
      this.state.storyContext.consequences[choiceId] = aiResponse.nextNode.metadata;
    }
  }

  // Process combat turn
  processCombatTurn(action: string, result: string): void {
    if (!this.state.combatState) return;

    if (this.state.combatState.turn === 'player') {
      this.state.combatState.playerActions.push(action);
      this.state.combatState.turn = 'enemy';
    } else {
      this.state.combatState.enemyActions.push(action);
      this.state.combatState.turn = 'player';
      this.state.combatState.round++;
    }
  }

  // End combat
  endCombat(victory: boolean): void {
    this.state.combatState = undefined;
    // Combat end will be handled by AI response
  }

  // Update character reference
  updateCharacter(character: Character): void {
    this.character = character;
  }

  // Get character
  getCharacter(): Character {
    return this.character;
  }

  // Build context for AI prompt
  buildAIContext(spatialContext?: string): string {
    const context: string[] = [];

    // Character info
    context.push(`Character: ${this.character.name}`);
    context.push(`Level ${this.character.level} ${this.character.class.name}${this.character.subclass ? ` (${this.character.subclass.name})` : ''}`);
    context.push(`Race: ${this.character.race.name}`);
    context.push(`HP: ${this.character.hp.current}/${this.character.hp.max}`);
    if (this.character.resources.type !== 'None') {
      context.push(`${this.character.resources.type}: ${this.character.resources.current}/${this.character.resources.max}`);
    }
    context.push(`Action Points: ${this.character.actionPoints}/${this.character.maxActionPoints}`);

    // Equipment summary
    const equippedItems = Object.values(this.character.equipment)
      .filter(Boolean)
      .map(item => item!.name)
      .join(', ');
    if (equippedItems) {
      context.push(`Equipment: ${equippedItems}`);
    }

    // Current location
    context.push(`Location: ${this.state.storyContext.currentLocation}`);

    // Recent history (last 5 events)
    const recentHistory = this.state.storyContext.history.slice(-5);
    if (recentHistory.length > 0) {
      context.push('\nRecent Events:');
      recentHistory.forEach(event => {
        context.push(`- ${event.description}`);
        if (event.choice) {
          context.push(`  > ${event.choice}`);
        }
        if (event.result) {
          context.push(`  Result: ${event.result}`);
        }
      });
    }

    // Spatial context (dungeon awareness)
    if (spatialContext) {
      context.push(`\n${spatialContext}`);
    }

    // Current node
    context.push(`\nCurrent Situation: ${this.state.currentNode.description}`);

    // Available choices
    context.push('\nAvailable Actions:');
    this.state.currentNode.choices.forEach(choice => {
      context.push(`- ${choice.text} (${choice.type}, ${choice.actionPoints} AP)`);
    });

    return context.join('\n');
  }

  // Build AI context with dungeon spatial awareness
  buildAIContextWithDungeon(
    dungeonNode: DungeonNode,
    allNodes: Map<string, DungeonNode>
  ): string {
    const spatialPrompt = constructRoomPrompt(dungeonNode, allNodes);
    return this.buildAIContext(spatialPrompt);
  }
}


