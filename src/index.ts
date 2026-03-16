import { Events, ChatInputCommandInteraction, Message } from 'discord.js';
import dotenv from 'dotenv';
import { BotClient } from './client/BotClient';

dotenv.config();

import createCommand from './commands/character/create';
import profileCommand from './commands/character/profile';
import inventoryCommand from './commands/character/inventory';
import equipCommand from './commands/character/equip';
import exploreCommand from './commands/exploration/explore';
import travelCommand from './commands/exploration/travel';
import fightCommand from './commands/combat/fight';
import pvpCommand from './commands/combat/pvp';
import restCommand from './commands/combat/rest';
import shopCommand from './commands/economy/shop';
import useCommand from './commands/economy/use';
import questCommand from './commands/quest/quests';
import tarotCommand from './commands/tarot/tarot';
import helpCommand from './commands/help';
import addItemCommand from './commands/admin/add-item';
import listItemsCommand from './commands/admin/list-items';

const client = new BotClient();

const allCommands = [
  createCommand,
  profileCommand,
  inventoryCommand,
  equipCommand,
  exploreCommand,
  travelCommand,
  fightCommand,
  pvpCommand,
  restCommand,
  shopCommand,
  useCommand,
  questCommand,
  tarotCommand,
  helpCommand,
  addItemCommand,
  listItemsCommand,
];

client.once(Events.ClientReady, async (readyClient) => {
  console.log(`✅ Logged in as ${readyClient.user.tag}`);
  await client.registerCommands(allCommands);
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction as ChatInputCommandInteraction);
  } catch (error) {
    console.error(`Error executing command ${interaction.commandName}:`, error);
    const errorMsg = { content: '❌ An error occurred while executing this command.', ephemeral: true };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(errorMsg).catch(console.error);
    } else {
      await interaction.reply(errorMsg).catch(console.error);
    }
  }
});

const PREFIX = '!';

client.on(Events.MessageCreate, async (message: Message) => {
  if (message.author.bot || !message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const commandName = args.shift()?.toLowerCase();

  if (!commandName) return;

  // Map prefix commands to slash command names
  const commandMap: Record<string, string> = {
    'create': 'create',
    'profile': 'profile',
    'inventory': 'inventory',
    'inv': 'inventory',
    'equip': 'equip',
    'explore': 'explore',
    'travel': 'travel',
    'fight': 'fight',
    'pvp': 'pvp',
    'rest': 'rest',
    'shop': 'shop',
    'use': 'use',
    'quest': 'quest',
    'quests': 'quest',
    'tarot': 'tarot',
    'help': 'help',
    'a-add-item': 'a-add-item',
    'a-list-items': 'a-list-items',
  };

  const slashCommandName = commandMap[commandName];
  if (!slashCommandName) return;

  const command = client.commands.get(slashCommandName);
  if (!command) return;

  // Create a mock interaction object for prefix commands
  const mockInteraction = {
    isPrefixCommand: true,
    user: message.author,
    guild: message.guild,
    channel: message.channel,
    member: message.member,
    memberPermissions: message.member?.permissions,
    options: {
      getString: (name: string, required?: boolean) => {
        if (commandName === 'create') {
          if (name === 'pathway') return args[0];
          if (name === 'name') return args.slice(1).join(' ');
        }
        const index = commandName === 'profile' && name === 'user' ? 0 :
                     commandName === 'travel' && name === 'location' ? 0 :
                     commandName === 'fight' && name === 'monster' ? 0 :
                     commandName === 'pvp' && name === 'opponent' ? 0 :
                     commandName === 'shop' && name === 'action' ? 0 :
                     commandName === 'shop' && name === 'item' ? 1 :
                     commandName === 'use' && name === 'item' ? 0 :
                     commandName === 'quest' && name === 'quest_id' ? 0 :
                     commandName === 'tarot' && name === 'name' ? 0 :
                     commandName === 'a-add-item' && name === 'id' ? 0 :
                     commandName === 'a-add-item' && name === 'name' ? 1 :
                     commandName === 'a-add-item' && name === 'type' ? 2 :
                     commandName === 'a-add-item' && name === 'description' ? 3 :
                     commandName === 'a-add-item' && name === 'price' ? 4 :
                     commandName === 'a-add-item' && name === 'emoji' ? 5 :
                     commandName === 'a-list-items' && name === 'action' ? 0 :
                     commandName === 'a-list-items' && name === 'item_id' ? 1 :
                     -1;
        return index >= 0 && args[index] ? args[index] : (required ? null : undefined);
      },
      getInteger: (name: string) => {
        const index = commandName === 'pvp' && name === 'wager' ? 1 :
                     commandName === 'a-add-item' && name === 'attack_bonus' ? 6 :
                     commandName === 'a-add-item' && name === 'defense_bonus' ? 6 :
                     commandName === 'a-add-item' && name === 'spirit_bonus' ? 7 :
                     commandName === 'a-add-item' && name === 'heal_amount' ? 6 :
                     commandName === 'a-add-item' && name === 'spirit_restore' ? 7 :
                     commandName === 'a-add-item' && name === 'xp_bonus' ? 8 :
                     commandName === 'a-add-item' && name === 'required_level' ? 9 :
                     -1;
        return index >= 0 && args[index] ? parseInt(args[index]) : undefined;
      },
      getUser: (name: string) => {
        if (name === 'user' && commandName === 'profile' && args[0]) {
          return message.mentions.users.first() || message.guild?.members.cache.find(m => m.user.username.toLowerCase() === args[0].toLowerCase() || m.user.id === args[0])?.user;
        }
        if (name === 'opponent' && commandName === 'pvp' && args[0]) {
          return message.mentions.users.first() || message.guild?.members.cache.find(m => m.user.username.toLowerCase() === args[0].toLowerCase() || m.user.id === args[0])?.user;
        }
        return undefined;
      },
    },
    reply: async (options: any) => {
      return message.reply(options);
    },
    followUp: async (options: any) => {
      return message.reply(options);
    },
    editReply: async (options: any) => {
      return message.reply(options);
    },
    deferReply: async () => {},
    replied: false,
    deferred: false,
  };

  try {
    await command.execute(mockInteraction as any);
  } catch (error) {
    console.error(`Error executing prefix command ${commandName}:`, error);
    await message.reply('❌ An error occurred while executing this command.').catch(console.error);
  }
});

const token = process.env.DISCORD_TOKEN;
if (!token) {
  console.error('❌ DISCORD_TOKEN not set in environment. Please create a .env file based on .env.example');
  process.exit(1);
}

client.login(token).catch((err) => {
  console.error('❌ Failed to login:', err);
  process.exit(1);
});
