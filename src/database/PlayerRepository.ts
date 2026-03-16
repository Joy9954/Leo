import { getDatabase } from './Database';

export interface Player {
  id: string;
  username: string;
  created_at: number;
}

export interface Character {
  id: number;
  player_id: string;
  name: string;
  pathway: string;
  sequence: number;
  level: number;
  experience: number;
  health: number;
  max_health: number;
  spirit: number;
  max_spirit: number;
  strength: number;
  dexterity: number;
  willpower: number;
  luck: number;
  gold: number;
  location: string;
  wins: number;
  losses: number;
  tarot_member: number;
  tarot_codename: string | null;
  created_at: number;
  last_active: number;
}

export interface InventoryItem {
  id: number;
  player_id: string;
  item_id: string;
  quantity: number;
  equipped: number;
  slot: string | null;
}

export function upsertPlayer(id: string, username: string): void {
  const db = getDatabase();
  db.prepare(`
    INSERT INTO players (id, username) VALUES (?, ?)
    ON CONFLICT(id) DO UPDATE SET username = excluded.username
  `).run(id, username);
}

export function getPlayer(id: string): Player | undefined {
  const db = getDatabase();
  return db.prepare('SELECT * FROM players WHERE id = ?').get(id) as Player | undefined;
}

export function getCharacter(playerId: string): Character | undefined {
  const db = getDatabase();
  return db.prepare('SELECT * FROM characters WHERE player_id = ?').get(playerId) as Character | undefined;
}

export function createCharacter(
  playerId: string,
  name: string,
  pathway: string,
  stats: { strength: number; dexterity: number; willpower: number; luck: number }
): Character {
  const db = getDatabase();
  const maxHealth = 80 + stats.strength * 2 + stats.willpower;
  const maxSpirit = 80 + stats.willpower * 2 + stats.luck;
  db.prepare(`
    INSERT INTO characters (player_id, name, pathway, sequence, level, experience, health, max_health, spirit, max_spirit, strength, dexterity, willpower, luck, gold)
    VALUES (?, ?, ?, 9, 1, 0, ?, ?, ?, ?, ?, ?, ?, ?, 100)
  `).run(playerId, name, pathway, maxHealth, maxHealth, maxSpirit, maxSpirit, stats.strength, stats.dexterity, stats.willpower, stats.luck);
  return getCharacter(playerId)!;
}

export function updateCharacter(playerId: string, updates: Partial<Omit<Character, 'id' | 'player_id' | 'created_at'>>): void {
  const db = getDatabase();
  const fields = Object.keys(updates).map(k => `${k} = ?`).join(', ');
  const values = Object.values(updates);
  values.push(Math.floor(Date.now() / 1000));
  values.push(playerId);
  db.prepare(`UPDATE characters SET ${fields}, last_active = ? WHERE player_id = ?`).run(...values);
}

export function addExperience(playerId: string, xp: number): { leveledUp: boolean; newLevel: number; sequenceAdvanced: boolean; newSequence: number } {
  const db = getDatabase();
  const char = getCharacter(playerId);
  if (!char) return { leveledUp: false, newLevel: 1, sequenceAdvanced: false, newSequence: 9 };

  const newXp = char.experience + xp;
  const xpPerLevel = 100;
  const newLevel = Math.min(99, Math.floor(newXp / xpPerLevel) + 1);
  const leveledUp = newLevel > char.level;

  const newSequence = Math.max(1, 9 - Math.floor((newLevel - 1) / 10));
  const sequenceAdvanced = newSequence < char.sequence;

  const updates: Partial<Character> = { experience: newXp, level: newLevel, sequence: newSequence };
  if (leveledUp) {
    updates.max_health = 80 + char.strength * 2 + char.willpower + (newLevel - 1) * 5;
    updates.max_spirit = 80 + char.willpower * 2 + char.luck + (newLevel - 1) * 3;
    updates.health = updates.max_health;
    updates.spirit = updates.max_spirit;
  }

  db.prepare(`
    UPDATE characters SET experience = ?, level = ?, sequence = ?,
      max_health = ?, health = ?, max_spirit = ?, spirit = ?, last_active = unixepoch()
    WHERE player_id = ?
  `).run(newXp, newLevel, newSequence,
    updates.max_health ?? char.max_health,
    updates.health ?? char.health,
    updates.max_spirit ?? char.max_spirit,
    updates.spirit ?? char.spirit,
    playerId);

  return { leveledUp, newLevel, sequenceAdvanced, newSequence };
}

export function modifyGold(playerId: string, amount: number): number {
  const db = getDatabase();
  const char = getCharacter(playerId);
  if (!char) return 0;
  const newGold = Math.max(0, char.gold + amount);
  db.prepare('UPDATE characters SET gold = ? WHERE player_id = ?').run(newGold, playerId);
  return newGold;
}

export function modifyHealth(playerId: string, amount: number): { health: number; maxHealth: number } {
  const db = getDatabase();
  const char = getCharacter(playerId);
  if (!char) return { health: 0, maxHealth: 0 };
  const newHealth = Math.min(char.max_health, Math.max(0, char.health + amount));
  db.prepare('UPDATE characters SET health = ? WHERE player_id = ?').run(newHealth, playerId);
  return { health: newHealth, maxHealth: char.max_health };
}

export function modifySpirit(playerId: string, amount: number): { spirit: number; maxSpirit: number } {
  const db = getDatabase();
  const char = getCharacter(playerId);
  if (!char) return { spirit: 0, maxSpirit: 0 };
  const newSpirit = Math.min(char.max_spirit, Math.max(0, char.spirit + amount));
  db.prepare('UPDATE characters SET spirit = ? WHERE player_id = ?').run(newSpirit, playerId);
  return { spirit: newSpirit, maxSpirit: char.max_spirit };
}

export function getInventory(playerId: string): InventoryItem[] {
  const db = getDatabase();
  return db.prepare('SELECT * FROM inventory WHERE player_id = ?').all(playerId) as InventoryItem[];
}

export function addToInventory(playerId: string, itemId: string, quantity = 1): void {
  const db = getDatabase();
  const existing = db.prepare('SELECT * FROM inventory WHERE player_id = ? AND item_id = ?').get(playerId, itemId) as InventoryItem | undefined;
  if (existing) {
    db.prepare('UPDATE inventory SET quantity = quantity + ? WHERE player_id = ? AND item_id = ?').run(quantity, playerId, itemId);
  } else {
    db.prepare('INSERT INTO inventory (player_id, item_id, quantity) VALUES (?, ?, ?)').run(playerId, itemId, quantity);
  }
}

export function removeFromInventory(playerId: string, itemId: string, quantity = 1): boolean {
  const db = getDatabase();
  const item = db.prepare('SELECT * FROM inventory WHERE player_id = ? AND item_id = ?').get(playerId, itemId) as InventoryItem | undefined;
  if (!item || item.quantity < quantity) return false;
  if (item.quantity === quantity) {
    db.prepare('DELETE FROM inventory WHERE player_id = ? AND item_id = ?').run(playerId, itemId);
  } else {
    db.prepare('UPDATE inventory SET quantity = quantity - ? WHERE player_id = ? AND item_id = ?').run(quantity, playerId, itemId);
  }
  return true;
}

export function equipItem(playerId: string, itemId: string, slot: string): boolean {
  const db = getDatabase();
  const item = db.prepare('SELECT * FROM inventory WHERE player_id = ? AND item_id = ?').get(playerId, itemId) as InventoryItem | undefined;
  if (!item) return false;
  db.prepare('UPDATE inventory SET equipped = 0, slot = NULL WHERE player_id = ? AND slot = ?').run(playerId, slot);
  db.prepare('UPDATE inventory SET equipped = 1, slot = ? WHERE player_id = ? AND item_id = ?').run(slot, playerId, itemId);
  return true;
}

export function getEquippedItems(playerId: string): InventoryItem[] {
  const db = getDatabase();
  return db.prepare('SELECT * FROM inventory WHERE player_id = ? AND equipped = 1').all(playerId) as InventoryItem[];
}

export function getCooldown(playerId: string, action: string): number {
  const db = getDatabase();
  const row = db.prepare('SELECT expires_at FROM cooldowns WHERE player_id = ? AND action = ?').get(playerId, action) as { expires_at: number } | undefined;
  if (!row) return 0;
  const now = Math.floor(Date.now() / 1000);
  return Math.max(0, row.expires_at - now);
}

export function setCooldown(playerId: string, action: string, seconds: number): void {
  const db = getDatabase();
  const expiresAt = Math.floor(Date.now() / 1000) + seconds;
  db.prepare(`
    INSERT INTO cooldowns (player_id, action, expires_at) VALUES (?, ?, ?)
    ON CONFLICT(player_id, action) DO UPDATE SET expires_at = excluded.expires_at
  `).run(playerId, action, expiresAt);
}

export interface QuestRecord {
  id: number;
  player_id: string;
  quest_id: string;
  status: string;
  progress: string;
  started_at: number;
  completed_at: number | null;
}

export function getActiveQuests(playerId: string): QuestRecord[] {
  const db = getDatabase();
  return db.prepare("SELECT * FROM quests WHERE player_id = ? AND status = 'active'").all(playerId) as QuestRecord[];
}

export function getCompletedQuests(playerId: string): string[] {
  const db = getDatabase();
  const rows = db.prepare("SELECT quest_id FROM quests WHERE player_id = ? AND status = 'completed'").all(playerId) as { quest_id: string }[];
  return rows.map(r => r.quest_id);
}

export function startQuest(playerId: string, questId: string): void {
  const db = getDatabase();
  db.prepare('INSERT INTO quests (player_id, quest_id, progress) VALUES (?, ?, ?)').run(playerId, questId, JSON.stringify({}));
}

export function updateQuestProgress(questRecordId: number, progress: Record<string, number>): void {
  const db = getDatabase();
  db.prepare('UPDATE quests SET progress = ? WHERE id = ?').run(JSON.stringify(progress), questRecordId);
}

export function completeQuest(questRecordId: number): void {
  const db = getDatabase();
  db.prepare("UPDATE quests SET status = 'completed', completed_at = unixepoch() WHERE id = ?").run(questRecordId);
}

export function logCombat(playerId: string, combatType: string, opponent: string, result: string, xpGained: number, goldGained: number): void {
  const db = getDatabase();
  db.prepare('INSERT INTO combat_log (player_id, combat_type, opponent, result, xp_gained, gold_gained) VALUES (?, ?, ?, ?, ?, ?)').run(playerId, combatType, opponent, result, xpGained, goldGained);
}

export function getPvpChallenge(challengedId: string): { id: number; challenger_id: string; wager: number } | undefined {
  const db = getDatabase();
  const now = Math.floor(Date.now() / 1000);
  return db.prepare("SELECT * FROM pvp_challenges WHERE challenged_id = ? AND status = 'pending' AND created_at > ?").get(challengedId, now - 300) as { id: number; challenger_id: string; wager: number } | undefined;
}

export function createPvpChallenge(challengerId: string, challengedId: string, wager: number): number {
  const db = getDatabase();
  const result = db.prepare('INSERT INTO pvp_challenges (challenger_id, challenged_id, wager) VALUES (?, ?, ?)').run(challengerId, challengedId, wager);
  return result.lastInsertRowid as number;
}

export function resolvePvpChallenge(challengeId: number, status: 'accepted' | 'declined' | 'completed'): void {
  const db = getDatabase();
  db.prepare('UPDATE pvp_challenges SET status = ? WHERE id = ?').run(status, challengeId);
}

export function getLeaderboard(limit = 10): Character[] {
  const db = getDatabase();
  return db.prepare('SELECT * FROM characters ORDER BY level DESC, experience DESC LIMIT ?').all(limit) as Character[];
}

export function setTarotMembership(playerId: string, codename: string): void {
  const db = getDatabase();
  db.prepare('UPDATE characters SET tarot_member = 1, tarot_codename = ? WHERE player_id = ?').run(codename, playerId);
}

export interface CustomItem {
  id: string;
  name: string;
  type: string;
  subtype?: string;
  description: string;
  attack_bonus: number;
  defense_bonus: number;
  spirit_bonus: number;
  heal_amount: number;
  spirit_restore_amount: number;
  xp_bonus: number;
  price: number;
  emoji: string;
  required_level: number;
  created_by: string;
  created_at: number;
}

export function addCustomItem(
  id: string,
  name: string,
  type: string,
  description: string,
  price: number,
  emoji: string,
  createdBy: string,
  options: {
    subtype?: string;
    attackBonus?: number;
    defenseBonus?: number;
    spiritBonus?: number;
    healAmount?: number;
    spiritRestoreAmount?: number;
    xpBonus?: number;
    requiredLevel?: number;
  } = {}
): boolean {
  const db = getDatabase();
  try {
    db.prepare(`
      INSERT INTO custom_items (
        id, name, type, subtype, description, attack_bonus, defense_bonus, spirit_bonus,
        heal_amount, spirit_restore_amount, xp_bonus, price, emoji, required_level, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, name, type, options.subtype || null, description,
      options.attackBonus || 0, options.defenseBonus || 0, options.spiritBonus || 0,
      options.healAmount || 0, options.spiritRestoreAmount || 0, options.xpBonus || 0,
      price, emoji, options.requiredLevel || 1, createdBy
    );
    return true;
  } catch (error) {
    console.error('Failed to add custom item:', error);
    return false;
  }
}

export function getCustomItems(): CustomItem[] {
  const db = getDatabase();
  return db.prepare('SELECT * FROM custom_items ORDER BY created_at DESC').all() as CustomItem[];
}

export function getCustomItem(itemId: string): CustomItem | undefined {
  const db = getDatabase();
  return db.prepare('SELECT * FROM custom_items WHERE id = ?').get(itemId) as CustomItem | undefined;
}

export function deleteCustomItem(itemId: string, createdBy: string): boolean {
  const db = getDatabase();
  const item = getCustomItem(itemId);
  if (!item || item.created_by !== createdBy) return false;
  db.prepare('DELETE FROM custom_items WHERE id = ?').run(itemId);
  return true;
}
