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

export function closeDatabase(): void {
  if (db) {
    db.close();
    console.log('✅ Database connection closed');
  }
}

function initializeSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS players (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL,
      banned INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
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

    -- Pets System
    CREATE TABLE IF NOT EXISTS pets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id TEXT NOT NULL,
      pet_id TEXT NOT NULL,
      nickname TEXT,
      level INTEGER DEFAULT 1,
      loyalty INTEGER DEFAULT 50,
      is_active INTEGER DEFAULT 0,
      earned_xp INTEGER DEFAULT 0,
      FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
    );

    -- Crafting Recipes
    CREATE TABLE IF NOT EXISTS recipes (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      materials TEXT NOT NULL,
      result_id TEXT NOT NULL,
      result_quantity INTEGER DEFAULT 1,
      required_level INTEGER DEFAULT 1,
      description TEXT
    );

    -- Raids
    CREATE TABLE IF NOT EXISTS raids (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      raid_id TEXT NOT NULL,
      spawn_time INTEGER NOT NULL,
      end_time INTEGER NOT NULL,
      current_health INTEGER NOT NULL,
      max_health INTEGER NOT NULL,
      status TEXT DEFAULT 'active'
    );

    CREATE TABLE IF NOT EXISTS raid_participants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      raid_id INTEGER NOT NULL,
      player_id TEXT NOT NULL,
      damage_dealt INTEGER DEFAULT 0,
      joined_at INTEGER DEFAULT (unixepoch()),
      FOREIGN KEY (raid_id) REFERENCES raids(id) ON DELETE CASCADE,
      FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
    );

    -- Casino
    CREATE TABLE IF NOT EXISTS casino_games (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id TEXT NOT NULL,
      game_type TEXT NOT NULL,
      bet_amount INTEGER NOT NULL,
      result TEXT NOT NULL,
      winnings INTEGER DEFAULT 0,
      created_at INTEGER DEFAULT (unixepoch()),
      FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS daily_pulls (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id TEXT NOT NULL,
      pulled_at INTEGER DEFAULT (unixepoch())
    );

    -- Trading
    CREATE TABLE IF NOT EXISTS trades (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      offerer_id TEXT NOT NULL,
      receiver_id TEXT NOT NULL,
      offered_items TEXT,
      offered_gold INTEGER DEFAULT 0,
      requested_items TEXT,
      requested_gold INTEGER DEFAULT 0,
      status TEXT DEFAULT 'pending',
      created_at INTEGER DEFAULT (unixepoch()),
      FOREIGN KEY (offerer_id) REFERENCES players(id) ON DELETE CASCADE,
      FOREIGN KEY (receiver_id) REFERENCES players(id) ON DELETE CASCADE
    );
  `);
}

export default getDatabase;
