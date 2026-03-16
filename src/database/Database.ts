import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = process.env.DB_PATH || './data/bot.db';

let db: Database.Database;

export function getDatabase(): Database.Database {
  if (!db) {
    const dbDir = path.dirname(DB_PATH);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initializeSchema(db);
  }
  return db;
}

function initializeSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS players (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS characters (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      pathway TEXT NOT NULL,
      sequence INTEGER NOT NULL DEFAULT 9,
      level INTEGER NOT NULL DEFAULT 1,
      experience INTEGER NOT NULL DEFAULT 0,
      health INTEGER NOT NULL DEFAULT 100,
      max_health INTEGER NOT NULL DEFAULT 100,
      spirit INTEGER NOT NULL DEFAULT 100,
      max_spirit INTEGER NOT NULL DEFAULT 100,
      strength INTEGER NOT NULL DEFAULT 10,
      dexterity INTEGER NOT NULL DEFAULT 10,
      willpower INTEGER NOT NULL DEFAULT 10,
      luck INTEGER NOT NULL DEFAULT 10,
      gold INTEGER NOT NULL DEFAULT 100,
      location TEXT NOT NULL DEFAULT 'backlund',
      wins INTEGER NOT NULL DEFAULT 0,
      losses INTEGER NOT NULL DEFAULT 0,
      tarot_member INTEGER NOT NULL DEFAULT 0,
      tarot_codename TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      last_active INTEGER NOT NULL DEFAULT (unixepoch()),
      FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS inventory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id TEXT NOT NULL,
      item_id TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      equipped INTEGER NOT NULL DEFAULT 0,
      slot TEXT,
      FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS quests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id TEXT NOT NULL,
      quest_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      progress TEXT NOT NULL DEFAULT '{}',
      started_at INTEGER NOT NULL DEFAULT (unixepoch()),
      completed_at INTEGER,
      FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS cooldowns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id TEXT NOT NULL,
      action TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      UNIQUE(player_id, action),
      FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS pvp_challenges (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      challenger_id TEXT NOT NULL,
      challenged_id TEXT NOT NULL,
      wager INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      FOREIGN KEY (challenger_id) REFERENCES players(id) ON DELETE CASCADE,
      FOREIGN KEY (challenged_id) REFERENCES players(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS combat_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id TEXT NOT NULL,
      combat_type TEXT NOT NULL,
      opponent TEXT NOT NULL,
      result TEXT NOT NULL,
      xp_gained INTEGER NOT NULL DEFAULT 0,
      gold_gained INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS custom_items (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      subtype TEXT,
      description TEXT NOT NULL,
      attack_bonus INTEGER DEFAULT 0,
      defense_bonus INTEGER DEFAULT 0,
      spirit_bonus INTEGER DEFAULT 0,
      heal_amount INTEGER DEFAULT 0,
      spirit_restore_amount INTEGER DEFAULT 0,
      xp_bonus INTEGER DEFAULT 0,
      price INTEGER NOT NULL DEFAULT 0,
      emoji TEXT NOT NULL,
      required_level INTEGER DEFAULT 1,
      created_by TEXT NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      FOREIGN KEY (created_by) REFERENCES players(id) ON DELETE CASCADE
    );
  `);
}

export default getDatabase;
