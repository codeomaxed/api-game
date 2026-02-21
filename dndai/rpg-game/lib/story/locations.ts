import { LocationData } from '@/types/game';

export const STARTING_LOCATION: LocationData = {
  name: 'Dungeon Entrance',
  type: 'checkpoint',
  description: 'A dark, foreboding entrance to an ancient dungeon. The stone archway is weathered and covered in ominous runes.',
};

export const LOCATION_TYPES: Record<string, LocationData['type']> = {
  TOWN: 'town',
  VILLAGE: 'village',
  CITY: 'city',
  INN: 'inn',
  BAR: 'bar',
  DUNGEON: 'dungeon',
  WILDERNESS: 'wilderness',
  CHECKPOINT: 'checkpoint',
};

export function isCheckpoint(location: LocationData): boolean {
  return location.type === 'checkpoint' || 
         location.type === 'town' || 
         location.type === 'village' || 
         location.type === 'city';
}

export function getLocationDescription(location: LocationData): string {
  const typeDescriptions: Record<LocationData['type'], string> = {
    town: 'A small settlement with basic amenities',
    village: 'A tiny hamlet with few resources',
    city: 'A large urban center with many services',
    inn: 'A place to rest and recover',
    bar: 'A tavern where information can be found',
    dungeon: 'A dangerous underground complex',
    wilderness: 'Untamed lands full of danger',
    checkpoint: 'A significant location you can return to',
  };

  return typeDescriptions[location.type] || location.description;
}














