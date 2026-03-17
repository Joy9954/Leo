import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { Command } from '../../client/BotClient';
import {
  getCharacter, upsertPlayer, getInventory, addToInventory, removeFromInventory,
} from '../../database/PlayerRepository';
import { getCraftingRecipeById, craftItem } from '../../game/CraftingEngine';
import { errorEmbed, successEmbed } from '../../utils/embeds';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('craft_create')
    .setDescription('Craft an item using materials')
    .addStringOption(opt =>
      opt.setName('recipe').setDescription('Recipe ID to craft').setRequired(true)
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    upsertPlayer(interaction.user.id, interaction.user.username);
    const char = getCharacter(interaction.user.id);
    if (!char) {
      await interaction.reply({ embeds: [errorEmbed('No character found. Use `/create` to begin.')], ephemeral: true });
      return;
    }

    const recipeId = interaction.options.getString('recipe')!;
    const recipe = getCraftingRecipeById(recipeId);

    if (!recipe) {
      await interaction.reply({ embeds: [errorEmbed('Recipe not found. Use `/craft_list` to see available recipes.')], ephemeral: true });
      return;
    }

    const inventory = getInventory(interaction.user.id);
    const result = craftItem(recipe, inventory, char.level);

    if (!result.success) {
      await interaction.reply({ embeds: [errorEmbed(result.message)] });
      return;
    }

    for (const [materialId, qty] of Object.entries(recipe.materials)) {
      removeFromInventory(interaction.user.id, materialId, qty);
    }

    if (result.itemId) {
      addToInventory(interaction.user.id, result.itemId, result.quantity || 1);
    }

    const embed = new EmbedBuilder()
      .setColor(0x2ecc71)
      .setTitle('⚒️ Crafting Success!')
      .setDescription(result.message);

    await interaction.reply({ embeds: [embed] });
  },
};

export default command;
