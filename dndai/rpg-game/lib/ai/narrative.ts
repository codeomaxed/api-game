import { GameEngine } from '@/lib/game/GameEngine';
import { AIResponse, Choice } from '@/types/game';
import { Character } from '@/types/character';

export interface NarrativePrompt {
  character: Character;
  gameContext: string;
  currentSituation: string;
  availableChoices: Choice[];
  storyHistory: string;
}

export async function generateNarrative(
  prompt: NarrativePrompt,
  choiceId: string,
  apiKey?: string
): Promise<AIResponse> {
  // Build comprehensive prompt
  const systemPrompt = `You are a Dungeon Master for a dark fantasy D&D 5e RPG game. 
The aesthetic is like Bloodborne, Dark Souls, and Buriedbornes - dark, gritty, gothic horror.
Generate immersive, choice-driven narrative content. Always respond in valid JSON format.
Make each response unique and dynamic based on the player's choices and story history.`;

  const chosenChoice = prompt.availableChoices.find(c => c.id === choiceId);
  const userPrompt = `
CHARACTER:
- Name: ${prompt.character.name}
- Level ${prompt.character.level} ${prompt.character.class.name}${prompt.character.subclass ? ` (${prompt.character.subclass.name})` : ''}
- Race: ${prompt.character.race.name}
- HP: ${prompt.character.hp.current}/${prompt.character.hp.max}
- ${prompt.character.resources.type}: ${prompt.character.resources.current}/${prompt.character.resources.max}
- Action Points: ${prompt.character.actionPoints}/${prompt.character.maxActionPoints}
- Equipment: ${Object.values(prompt.character.equipment).filter(Boolean).map(i => i!.name).join(', ') || 'None'}

CURRENT SITUATION:
${prompt.currentSituation}

STORY HISTORY (last 5 events):
${prompt.storyHistory || 'Beginning of adventure'}

AVAILABLE CHOICES:
${prompt.availableChoices.map(c => `- ${c.text} (${c.type}, ${c.actionPoints} AP)`).join('\n')}

PLAYER CHOSE: ${chosenChoice?.text || choiceId}

Generate the next game state. The response must be unique and different from previous responses. Consider the story history and make the narrative evolve naturally.

IMPORTANT FOR DUNGEON NAVIGATION: If the available choices include movement options (with direction metadata), you MUST generate immersive, narrative text choices for movement. Examples:
- Instead of "Go North", write "Walk towards the faint light in the North"
- Instead of "Move East", write "Open the heavy iron door to the East"
- Instead of "Go South", write "Descend the crumbling staircase to the South"
- Instead of "Move West", write "Investigate the shadowy passage to the West"

Each movement choice MUST include a "metadata" object with a "direction" field matching the available choice's direction metadata.

Respond with JSON in this exact format:
{
  "nextNode": {
    "id": "unique-node-id-${Date.now()}",
    "type": "encounter" | "combat" | "dialog" | "loot" | "event" | "location",
    "description": "Vivid, immersive description of what happens next (2-4 sentences, dark fantasy tone)",
    "choices": [
      {
        "id": "choice-id",
        "text": "Immersive choice text (for movement, use descriptive narrative like 'Walk towards the faint light in the North')",
        "actionPoints": 1,
        "type": "attack" | "spell" | "item" | "flee" | "talk" | "action" | "dialog",
        "metadata": {
          "direction": "north" | "south" | "east" | "west" (only for movement choices)
        }
      }
    ],
    "metadata": {}
  },
  "result": "Narrative description of what happened (1-2 sentences)",
  "xpGained": 0,
  "loot": [],
  "imagePrompt": "Dark fantasy image prompt for the scene (Bloodborne/Dark Souls aesthetic)"
}
`;

  // Use OpenRouter API (server-side only)
  const apiKeyToUse = apiKey;
  
  if (!apiKeyToUse) {
    console.error('OpenRouter API key not provided');
    throw new Error('API key is required');
  }

  try {
    console.log('Calling OpenRouter API with model: x-ai/grok-code-fast-1');
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKeyToUse}`,
        'HTTP-Referer': 'https://localhost:3001',
        'X-Title': 'D&D 5e AI RPG',
      },
      body: JSON.stringify({
        model: 'x-ai/grok-code-fast-1',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.9, // Higher temperature for more variety
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenRouter API error:', response.status, errorText);
      throw new Error(`OpenRouter API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;
    
    if (!content) {
      console.error('No content in API response:', data);
      throw new Error('No content in API response');
    }

    console.log('Received response from OpenRouter, parsing JSON...');
    const aiResponse: AIResponse = JSON.parse(content);
    console.log('Successfully parsed AI response');
    return aiResponse;
  } catch (error) {
    console.error('Error generating narrative:', error);
    // Don't fall back to mock - throw error so API route can handle it
    throw error;
  }
}

function generateMockResponse(
  prompt: NarrativePrompt,
  choiceId: string
): AIResponse {
  // Mock response for development/testing
  return {
    nextNode: {
      id: `node-${Date.now()}`,
      type: 'encounter',
      description: 'You proceed deeper into the dark dungeon. The air grows colder, and you hear distant sounds of scraping and moaning. Ancient torches flicker weakly, casting dancing shadows on the stone walls.',
      choices: [
        {
          id: 'continue',
          text: 'Continue forward',
          actionPoints: 1,
          type: 'action',
        },
        {
          id: 'investigate',
          text: 'Investigate the sounds',
          actionPoints: 1,
          type: 'action',
        },
        {
          id: 'retreat',
          text: 'Retreat to the entrance',
          actionPoints: 1,
          type: 'action',
        },
      ],
    },
    result: 'You move deeper into the dungeon, your footsteps echoing in the darkness.',
    xpGained: 10,
    loot: [],
    imagePrompt: 'Dark fantasy dungeon corridor, gothic architecture, Bloodborne aesthetic, dim torchlight, ominous atmosphere',
  };
}

