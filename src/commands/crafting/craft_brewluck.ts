import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { Command } from '../../client/BotClient';
import {
  getCharacter, upsertPlayer, getInventory, addToInventory, removeFromInventory, modifyGold,
} from '../../database/PlayerRepository';
import { errorEmbed, successEmbed } from '../../utils/embeds';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('craft_brewluck')
    .setDescription('Brew a lucky potion using special materials'),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    upsertPlayer(interaction.user.id, interaction.user.username);
    const char = getCharacter(interaction.user.id);
    if (!char) {
      await interaction.reply({ embeds: [errorEmbed('No character found. Use `/create` to begin.')], ephemeral: true });
      return;
    }

    const cost = 500;
    const materials = {
      'moon_stone': 3,
      'chaos_fragment': 1,
      'arcane_dust': 2,
    };

    const inventory = getInventory(interaction.user.id);

    for (const [mat, qty] of Object.entries(materials)) {
      const item = inventory.find(i => i.item_id === mat);
      if (!item || item.quantity < qty) {
        await interaction.reply({ 
          embeds: [errorEmbed(`Missing materials. You need: moon_stone x3, chaos_fragment x1, arcane_dust x2. Cost: ${cost} gold.`)],
          ephemeral: true,
        });
        return;
      }
    }

    if (char.gold < cost) {
      await interaction.reply({ embeds: [errorEmbed(`You need ${cost} gold to brew a lucky potion.`)], ephemeral: true });
      return;
    }

    for (const [mat, qty] of Object.entries(materials)) {
      removeFromInventory(interaction.user.id, mat, qty);
    }
    modifyGold(interaction.user.id, -cost);
    addToInventory(interaction.user.id, 'lucky_potion', 1);

    const embed = new EmbedBuilder()
      .setColor(0xf1c40f)
      .setTitle('🍀 Lucky Potion Brewed!')
      .setDescription('You brewed a **Lucky Potion**!\n\nUse `/use lucky_potion` to gain +20 luck for your next 3 battles.');

    await interaction.reply({ embeds: [embed] });
  },
};

export default command;
