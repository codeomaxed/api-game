import { StoryContext, StoryEvent } from '@/types/game';

export class StoryContextManager {
  private context: StoryContext;

  constructor(initialContext?: StoryContext) {
    this.context = initialContext || {
      history: [],
      currentLocation: 'Dungeon Entrance',
      checkpoints: ['Dungeon Entrance'],
      choices: [],
      consequences: {},
    };
  }

  getContext(): StoryContext {
    return this.context;
  }

  addEvent(event: StoryEvent): void {
    this.context.history.push(event);
    // Keep only last 100 events
    if (this.context.history.length > 100) {
      this.context.history = this.context.history.slice(-100);
    }
  }

  addChoice(choice: string): void {
    this.context.choices.push(choice);
    // Keep only last 20 choices
    if (this.context.choices.length > 20) {
      this.context.choices = this.context.choices.slice(-20);
    }
  }

  setLocation(location: string, isCheckpoint: boolean = false): void {
    this.context.currentLocation = location;
    if (isCheckpoint && !this.context.checkpoints.includes(location)) {
      this.context.checkpoints.push(location);
    }
  }

  addConsequence(choiceId: string, consequence: any): void {
    this.context.consequences[choiceId] = consequence;
  }

  getConsequence(choiceId: string): any {
    return this.context.consequences[choiceId];
  }

  hasReachedCheckpoint(location: string): boolean {
    return this.context.checkpoints.includes(location);
  }

  getRecentChoices(count: number = 5): string[] {
    return this.context.choices.slice(-count);
  }

  getRecentEvents(count: number = 5): StoryEvent[] {
    return this.context.history.slice(-count);
  }

  // Build summary for AI
  buildSummary(): string {
    const summary: string[] = [];

    summary.push(`Current Location: ${this.context.currentLocation}`);
    summary.push(`Checkpoints Reached: ${this.context.checkpoints.join(', ')}`);

    const recentChoices = this.getRecentChoices(5);
    if (recentChoices.length > 0) {
      summary.push(`Recent Choices: ${recentChoices.join(' → ')}`);
    }

    const recentEvents = this.getRecentEvents(3);
    if (recentEvents.length > 0) {
      summary.push('\nRecent Events:');
      recentEvents.forEach(event => {
        summary.push(`- ${event.description}`);
      });
    }

    return summary.join('\n');
  }
}














