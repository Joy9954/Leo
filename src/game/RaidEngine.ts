import raidsData from '../data/raids.json';
import {
  getActiveRaids,
  getRaidById,
  createRaid as dbCreateRaid,
  updateRaidHealth,
  getRaidParticipants,
  joinRaid as dbJoinRaid,
  addRaidDamage,
  Raid,
  RaidParticipant,
} from '../database/PlayerRepository';

export interface RaidDef {
  id: string;
  name: string;
  description: string;
  health: number;
  attack: number;
  defense: number;
  emoji: string;
  minLevel: number;
  duration: number;
  rewards: {
    xp: number;
    gold: number;
    items: string[];
  };
}

const raids = raidsData as any;

export function getAllRaidDefs(): RaidDef[] {
  return raids.raids as RaidDef[];
}

export function getRaidDefById(raidId: string): RaidDef | undefined {
  return (raids.raids as RaidDef[]).find(r => r.id === raidId);
}

export function getAvailableRaids(): RaidDef[] {
  const activeRaids = getActiveRaids();
  const activeRaidIds = new Set(activeRaids.map(r => r.raid_id));
  return (raids.raids as RaidDef[]).filter(r => !activeRaidIds.has(r.id));
}

export function spawnRaid(raidId: string): { success: boolean; message: string } {
  const raidDef = getRaidDefById(raidId);
  if (!raidDef) {
    return { success: false, message: 'Raid not found.' };
  }

  const activeRaids = getActiveRaids();
  if (activeRaids.some(r => r.raid_id === raidId)) {
    return { success: false, message: 'This raid is already active.' };
  }

  const now = Math.floor(Date.now() / 1000);
  const endTime = now + raidDef.duration;
  
  dbCreateRaid(raidId, now, endTime, raidDef.health);
  
  return { 
    success: true, 
    message: `⚠️ **WORLD BOSS ALERT!**\n\n**${raidDef.emoji} ${raidDef.name}** has appeared!\n\n${raidDef.description}\n\nUse \`/raid join\` to join the battle!` 
  };
}

export function joinRaid(raidId: number, playerId: string): { success: boolean; message: string } {
  const raid = getRaidById(raidId);
  if (!raid) {
    return { success: false, message: 'Raid not found.' };
  }

  if (raid.status !== 'active') {
    return { success: false, message: 'This raid has already ended.' };
  }

  dbJoinRaid(raidId, playerId);
  return { success: true, message: 'You have joined the raid!' };
}

export function attackRaid(
  raidId: number,
  playerId: string,
  playerAttack: number,
  playerDefense: number
): { damage: number; bossDamage: number; hpRemaining: number; defeated: boolean; rewards?: { xp: number; gold: number; items: string[] } } {
  const raid = getRaidById(raidId);
  if (!raid || raid.status !== 'active') {
    return { damage: 0, bossDamage: 0, hpRemaining: 0, defeated: false };
  }

  const raidDef = getRaidDefById(raid.raid_id);
  if (!raidDef) {
    return { damage: 0, bossDamage: 0, hpRemaining: 0, defeated: false };
  }

  const playerDamage = Math.max(1, playerAttack + Math.floor(Math.random() * 20) - raidDef.defense);
  const bossDamage = Math.max(1, raidDef.attack + Math.floor(Math.random() * 15) - playerDefense);
  
  const newHp = raid.current_health - playerDamage;
  updateRaidHealth(raidId, newHp);
  addRaidDamage(raidId, playerId, playerDamage);

  const defeated = newHp <= 0;
  let rewards: { xp: number; gold: number; items: string[] } | undefined;

  if (defeated) {
    const participants = getRaidParticipants(raidId);
    const totalDamage = participants.reduce((sum, p) => sum + p.damage_dealt, 0);
    
    rewards = {
      xp: Math.floor(raidDef.rewards.xp * 0.5),
      gold: Math.floor(raidDef.rewards.gold * 0.5),
      items: [],
    };

    for (const item of raidDef.rewards.items) {
      if (Math.random() < 0.3) {
        rewards.items.push(item);
      }
    }

    const bonusMultiplier = participants.length > 1 ? 1 + (participants.length - 1) * 0.2 : 1;
    rewards.xp = Math.floor(rewards.xp * bonusMultiplier);
    rewards.gold = Math.floor(rewards.gold * bonusMultiplier);
  }

  return {
    damage: playerDamage,
    bossDamage,
    hpRemaining: Math.max(0, newHp),
    defeated,
    rewards,
  };
}

export function getRaidStatus(raidId: number): { raid: Raid; participants: RaidParticipant[]; raidDef?: RaidDef } | null {
  const raid = getRaidById(raidId);
  if (!raid) return null;

  const participants = getRaidParticipants(raidId);
  const raidDef = getRaidDefById(raid.raid_id);

  return { raid, participants, raidDef };
}

export function getRaidLeaderboard(raidId: number): Array<{ playerId: string; damage: number; percentage: number }> {
  const participants = getRaidParticipants(raidId);
  const totalDamage = participants.reduce((sum, p) => sum + p.damage_dealt, 0);
  
  return participants.map(p => ({
    playerId: p.player_id,
    damage: p.damage_dealt,
    percentage: totalDamage > 0 ? Math.floor((p.damage_dealt / totalDamage) * 100) : 0,
  }));
}

// Re-export from database for convenience
export { getActiveRaids, getRaidById } from '../database/PlayerRepository';