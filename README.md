# 🃏 Lord of Mysteries — Discord RPG Bot

A feature-rich Discord RPG bot themed around the web novel *Lord of Mysteries* (诡秘之主) by Cuttlefish That Loves Diving.

## Features

- **22 Beyonder Pathways** — All tarot pathways (The Fool, The Magician, ..., Judgment) with 9 Sequences each
- **Character Creation** — Choose your pathway, name your character via Discord modal
- **Sequence Progression** — Advance from Sequence 9 to Sequence 1 as you level up
- **Beyonder Powers** — Unique abilities per pathway/sequence used in combat
- **PvE Combat** — Fight monsters scaled to your level with turn-based mechanics
- **PvP Combat** — Challenge other players to duels with optional gold wagers
- **OwO-Style Exploration** — Explore locations for resources, events, and random encounters
- **Weapon & Armor System** — Equip weapons and armor that affect combat stats
- **Quest System** — Story quests, daily quests, and the Tarot Club initiation
- **Shop & Economy** — Buy weapons, armor, and potions with gold
- **Tarot Club** — Secret organization with special membership and codenames
- **SQLite Persistence** — All player data saved with `better-sqlite3`
- **Leaderboard** — Top Beyonders ranked by level

## Quick Start

### 1. Create a Discord Application

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click **New Application**, give it a name
3. Go to **Bot** tab → Click **Add Bot**
4. Copy the **Token** (keep this secret!)
5. Go to **OAuth2 → General** and copy your **Client ID**
6. Under **OAuth2 → URL Generator**, select scopes: `bot`, `applications.commands`
7. Under Bot Permissions, select: `Send Messages`, `Use Slash Commands`, `Embed Links`
8. Copy the generated URL and invite your bot to your server

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env`:
```env
DISCORD_TOKEN=your_bot_token_here
CLIENT_ID=your_application_client_id_here
GUILD_ID=your_test_server_id_here   # Optional: for faster command registration
DB_PATH=./data/bot.db
```

### 3. Install & Run

```bash
npm install
npm run build
npm start
```

Or run in development mode:
```bash
npm run dev
```

## Commands

### 🧑 Character
| Command | Description |
|---------|-------------|
| `/create` | Create your Beyonder character (choose pathway via dropdown + modal) |
| `/profile [@user]` | View your or another user's character stats |
| `/inventory` | View your items |
| `/equip <item_id>` | Equip a weapon or armor |

### 🗺️ Exploration
| Command | Description |
|---------|-------------|
| `/explore` | Explore your current location (30s cooldown) |
| `/travel [location]` | Move to a new location (60s cooldown) |

### ⚔️ Combat
| Command | Description |
|---------|-------------|
| `/fight [monster_id]` | Fight a monster in your area (45s cooldown) |
| `/pvp @user [wager]` | Challenge another player to a duel |
| `/rest` | Recover 50% HP and Spirit (5min cooldown) |

### 🛒 Economy
| Command | Description |
|---------|-------------|
| `/shop browse` | Browse available items |
| `/shop buy <item_id>` | Purchase an item |
| `/use <item_id>` | Use a consumable |

### 📜 Quests
| Command | Description |
|---------|-------------|
| `/quest list` | View available and active quests |
| `/quest start <quest_id>` | Begin a quest |
| `/quest progress` | View your quest progress |

### 🃏 Tarot & Info
| Command | Description |
|---------|-------------|
| `/tarot club` | View the Tarot Club and its members |
| `/tarot pathways` | List all 22 Beyonder pathways |
| `/tarot pathway <id>` | Detailed pathway and sequence info |
| `/tarot leaderboard` | Top Beyonders ranking |
| `/help` | Show all commands |

## The 22 Beyonder Pathways

| # | Pathway | Chinese | Starting Sequence |
|---|---------|---------|------------------|
| 0 | The Fool | 愚者 | Seer |
| 1 | The Magician | 魔术师 | Apprentice |
| 2 | The High Priestess | 女祭司 | Secrets Suppliant |
| 3 | The Empress | 皇后 | Bard |
| 4 | The Emperor | 皇帝 | Soldier |
| 5 | The Hierophant | 教皇 | Arbiter |
| 6 | The Lovers | 恋人 | Daydreamer |
| 7 | The Chariot | 战车 | Hunter |
| 8 | Justice | 正义 | Priest of Light |
| 9 | The Hermit | 隐者 | Clairvoyant |
| 10 | Wheel of Fortune | 命运 | Lucky One |
| 11 | Strength | 力量 | Beastmaster |
| 12 | The Hanged Man | 倒吊人 | Marauder |
| 13 | Death | 死亡 | Gravedigger |
| 14 | Temperance | 节制 | Apothecary |
| 15 | The Devil | 恶魔 | Criminal |
| 16 | The Tower | 塔 | Arsonist |
| 17 | The Star | 星星 | Sailor |
| 18 | The Moon | 月亮 | Dragon Seed |
| 19 | The Sun | 太阳 | Bard |
| 20 | The World | 世界 | Marauder |
| 21 | Judgment | 审判 | Criminal |

## Sequence Progression

Characters start at **Sequence 9** and advance toward **Sequence 1** as they gain levels:
- Level 1–9: Sequence 9
- Level 10–19: Sequence 8
- Level 20–29: Sequence 7
- ... and so on to Sequence 1 at Level 80+

## Project Structure

```
src/
├── index.ts                     # Bot entry point
├── client/
│   └── BotClient.ts             # Discord client & command registration
├── database/
│   ├── Database.ts              # SQLite connection & schema
│   └── PlayerRepository.ts      # All database operations
├── game/
│   ├── CombatEngine.ts          # PvE and PvP combat logic
│   ├── ExplorationEngine.ts     # Exploration and location system
│   └── QuestManager.ts          # Quest tracking and rewards
├── commands/
│   ├── character/               # create, profile, inventory, equip
│   ├── combat/                  # fight, pvp, rest
│   ├── exploration/             # explore, travel
│   ├── economy/                 # shop, use
│   ├── quest/                   # quests
│   ├── tarot/                   # tarot club, pathways, leaderboard
│   └── help.ts                  # help command
├── utils/
│   ├── embeds.ts                # Discord embed builders
│   └── combatEmbed.ts           # Combat result embeds
└── data/
    ├── pathways.json            # All 22 pathways and sequences
    ├── monsters.json            # 11 monster types with scaling
    ├── items.json               # Weapons, armor, consumables, materials
    ├── locations.json           # 8 explorable locations
    └── quests.json              # Story and daily quests
```

## Tech Stack

- **Runtime**: Node.js v18+
- **Language**: TypeScript
- **Discord Library**: discord.js v14
- **Database**: better-sqlite3 (SQLite, synchronous)
- **Environment**: dotenv

## License

MIT
