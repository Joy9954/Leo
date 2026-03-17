import locationsData from '../data/locations.json';
import monstersData from '../data/monsters.json';
import { Character, getSetting } from '../database/PlayerRepository';

export interface LocationDef {
  id: string;
  name: string;
  description: string;
  emoji: string;
  minLevel: number;
  encounters: string[];
  resources: string[];
  events: string[];
}

export interface MonsterDef {
  id: string;
  name: string;
  description: string;
  tier: number;
  minLevel: number;
  maxLevel: number;
  health: number;
  attack: number;
  defense: number;
  xpReward: number;
  goldMin: number;
  goldMax: number;
  loot: string[];
  emoji: string;
}

export interface ExplorationResult {
  type: 'event' | 'encounter' | 'resource' | 'nothing';
  message: string;
  monster?: MonsterDef;
  resources?: string[];
  goldFound?: number;
}

const locations = locationsData as LocationDef[];
const monsters = monstersData as MonsterDef[];

export function getLocation(locationId: string): LocationDef | undefined {
  return locations.find(l => l.id === locationId);
}

export function getAllLocations(): LocationDef[] {
  return locations;
}

export function getAvailableLocations(level: number): LocationDef[] {
  return locations.filter(l => l.minLevel <= level);
}

export function getMonster(monsterId: string): MonsterDef | undefined {
  return monsters.find(m => m.id === monsterId);
}

export function getLocationMonster(locationId: string, playerLevel: number): MonsterDef | undefined {
  const location = getLocation(locationId);
  if (!location || location.encounters.length === 0) return undefined;

  const availableMonsters = location.encounters
    .map(id => monsters.find(m => m.id === id))
    .filter((m): m is MonsterDef => m !== undefined)
    .filter(m => playerLevel >= m.minLevel - 2);

  if (availableMonsters.length === 0) return undefined;
  return availableMonsters[Math.floor(Math.random() * availableMonsters.length)];
}

export function explore(char: Character): ExplorationResult {
  const location = getLocation(char.location);
  if (!location) {
    return { type: 'nothing', message: 'You wander aimlessly through the fog, finding nothing of note.' };
  }

  const roll = Math.random();
  const spawnRate = parseFloat(getSetting('spawn_rate', '1.0'));
  const goldRate = parseFloat(getSetting('gold_rate', '1.0'));

  if (roll < 0.35 * spawnRate) {
    const monster = getLocationMonster(char.location, char.level);
    if (monster) {
      return {
        type: 'encounter',
        message: `⚔️ **Encounter!** A **${monster.emoji} ${monster.name}** appears from the shadows!`,
        monster,
      };
    }
  }

  if (roll < 0.60 * (spawnRate > 1 ? 1 : spawnRate) && location.resources.length > 0) {
    const count = Math.floor(Math.random() * 2) + 1;
    const foundResources: string[] = [];
    for (let i = 0; i < count; i++) {
      const res = location.resources[Math.floor(Math.random() * location.resources.length)];
      foundResources.push(res);
    }
    const goldFound = Math.floor((Math.random() * 20 + 5) * goldRate);
    return {
      type: 'resource',
      message: `🔍 You search the area carefully and find some useful materials.`,
      resources: foundResources,
      goldFound,
    };
  }

  if (roll < 0.85 && location.events.length > 0) {
    const event = location.events[Math.floor(Math.random() * location.events.length)];
    return { type: 'event', message: `📜 ${event}` };
  }

  const nothingMessages = [
    '🌫️ The fog swirls around you but reveals nothing.',
    '🕯️ You light a match against the dark, but find only empty streets.',
    '🌙 The night passes uneventfully.',
    '🚶 You patrol the area and find it quiet.',
    '🦉 An owl watches you from above. Nothing else stirs.',
  ];
  return {
    type: 'nothing',
    message: nothingMessages[Math.floor(Math.random() * nothingMessages.length)],
  };
}

export function scaleMonsterToPlayer(monster: MonsterDef, playerLevel: number): MonsterDef {
  const levelDiff = Math.max(0, playerLevel - monster.minLevel);
  const scaleFactor = 1 + levelDiff * 0.08;
  return {
    ...monster,
    health: Math.floor(monster.health * scaleFactor),
    attack: Math.floor(monster.attack * scaleFactor),
    defense: Math.floor(monster.defense * scaleFactor),
    xpReward: Math.floor(monster.xpReward * (1 + levelDiff * 0.05)),
    goldMin: Math.floor(monster.goldMin * scaleFactor),
    goldMax: Math.floor(monster.goldMax * scaleFactor),
  };
}
