import { Events, ChatInputCommandInteraction } from 'discord.js';
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

const token = process.env.DISCORD_TOKEN;
if (!token) {
  console.error('❌ DISCORD_TOKEN not set in environment. Please create a .env file based on .env.example');
  process.exit(1);
}

client.login(token).catch((err) => {
  console.error('❌ Failed to login:', err);
  process.exit(1);
});
