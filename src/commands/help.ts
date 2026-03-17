import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { Command } from '../client/BotClient';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('View all commands and how to play'),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const embed = new EmbedBuilder()
      .setColor(0x9b59b6)
      .setTitle('📖 Lord of Mysteries RPG Bot — Help')
      .setDescription(
        'Welcome to the world of *Lord of Mysteries*! You are a **Beyonder** — a human who has consumed a Beyonder potion and gained supernatural abilities.\n\n' +
        'Your goal is to advance through the 9 Sequences of your chosen pathway, gain power, complete quests, and perhaps join the legendary **Tarot Club**.\n\n' +
        '**Commands can be used with slash commands (`/command`) or prefix commands (`!command`).**'
      )
      .addFields(
        {
          name: '🧑 Character Commands',
          value: [
            '`/create` — Create your Beyonder character',
            '`/profile [@user]` — View character stats',
            '`/inventory` — View your items',
            '`/equip <item_id>` — Equip a weapon or armor',
          ].join('\n'),
          inline: false,
        },
        {
          name: '🗺️ Exploration Commands',
          value: [
            '`/explore` — Explore your current location *(30s cooldown)*',
            '`/travel [location]` — Move to a new location *(60s cooldown)*',
          ].join('\n'),
          inline: false,
        },
        {
          name: '⚔️ Combat Commands',
          value: [
            '`/fight [monster_id]` — Fight a monster *(45s cooldown)*',
            '`/pvp @user [wager]` — Challenge a player to a duel',
            '`/rest` — Recover health and spirit *(5min cooldown)*',
          ].join('\n'),
          inline: false,
        },
        {
          name: '🛒 Economy Commands',
          value: [
            '`/shop browse` — Browse available items',
            '`/shop buy <item_id>` — Purchase an item',
            '`/use <item_id>` — Use a consumable item',
          ].join('\n'),
          inline: false,
        },
        {
          name: '📜 Quest Commands',
          value: [
            '`/quest list` — View available and active quests',
            '`/quest start <quest_id>` — Begin a quest',
            '`/quest progress` — View quest progress',
          ].join('\n'),
          inline: false,
        },
        {
          name: '🐾 Pet Commands',
          value: [
            '`/pet_list` — List all your tamed pets',
            '`/pet_tame` — Attempt to tame a creature',
            '`/pet_release <pet_id>` — Release a pet',
            '`/pet_stats <pet_id>` — View pet statistics',
            '`/pet_setactive <pet_id>` — Set a pet as your active companion',
          ].join('\n'),
          inline: false,
        },
        {
          name: '⚗️ Crafting Commands',
          value: [
            '`/craft_list` — View available crafting recipes',
            '`/craft_create <recipe_id>` — Craft an item from materials',
            '`/craft_extract <item_id>` — Extract essence from items',
            '`/craft_brewluck` — Brew a luck potion for bonuses',
          ].join('\n'),
          inline: false,
        },
        {
          name: '🏰 Raid Commands',
          value: [
            '`/raid_list` — View available raid bosses',
            '`/raid_join <raid_id>` — Join a raid party',
            '`/raid_status` — Check current raid status',
            '`/raid_attack` — Attack the raid boss',
          ].join('\n'),
          inline: false,
        },
        {
          name: '🎰 Casino & Trade Commands',
          value: [
            '`/casino_dice <amount> <guess>` — Bet on dice roll (1-6)',
            '`/casino_roulette <amount> <type>` — Play roulette',
            '`/casino_slots <amount>` — Spin the slot machine',
            '`/casino_daily` — Claim your daily reward',
            '`/trade_offer @user <item_id>` — Offer an item for trade',
            '`/trade_accept <trade_id>` — Accept a pending trade',
          ].join('\n'),
          inline: false,
        },
        {
          name: '🃏 Tarot & Info Commands',
          value: [
            '`/tarot club` — View the Tarot Club members',
            '`/tarot pathways` — List all 22 Beyonder pathways',
            '`/tarot pathway <id>` — Detailed pathway info',
            '`/tarot leaderboard` — Top Beyonders ranking',
          ].join('\n'),
          inline: false,
        },
        {
          name: '👑 Admin Commands (Server Admins Only)',
          value: [
            '`/a-add-item` — Add custom weapons, armor, or consumables',
            '`/a-list-items` — List or delete custom items',
            '`/a-give-gold @user <amount>` — Give gold to a player',
            '`/a-remove-gold @user <amount>` — Remove gold from a player',
            '`/a-reset-player @user` — Reset a player character',
            '`/a-spawn-raid` — Spawn a new raid boss',
            '`/a-end-raid <raid_id>` — End an active raid',
          ].join('\n'),
          inline: false,
        },
        {
          name: '💡 Getting Started',
          value: [
            '1. Use `/create` to create your character and choose a pathway',
            '2. Use `/explore` to look for resources and fights',
            '3. Use `/fight` to battle monsters for XP and gold',
            '4. Use `/quest list` and `/quest start` to begin quests',
            '5. Use `/shop browse` and `/shop buy` to equip yourself',
            '6. Advance through Sequences as you level up!',
          ].join('\n'),
          inline: false,
        }
      )
      .setFooter({ text: 'Lord of Mysteries RPG Bot | The 22 Tarot Pathways Await' });

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};

export default command;
