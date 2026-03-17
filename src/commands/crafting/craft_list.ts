import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { Command } from '../../client/BotClient';
import {
  getCharacter, upsertPlayer,
} from '../../database/PlayerRepository';
import { getAllCraftingRecipes, getCraftingRecipesByType, getAvailableRecipesForPlayer, getItemName } from '../../game/CraftingEngine';
import { errorEmbed } from '../../utils/embeds';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('craft_list')
    .setDescription('View available crafting recipes')
    .addStringOption(opt =>
      opt.setName('type').setDescription('Filter by type').setRequired(false)
        .addChoices(
          { name: 'Potions', value: 'potion' },
          { name: 'Weapons', value: 'weapon' },
          { name: 'Armor', value: 'armor' },
          { name: 'Buffs', value: 'buff' },
          { name: 'Special', value: 'special' }
        )
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    upsertPlayer(interaction.user.id, interaction.user.username);
    const char = getCharacter(interaction.user.id);
    if (!char) {
      await interaction.reply({ embeds: [errorEmbed('No character found. Use `/create` to begin.')], ephemeral: true });
      return;
    }

    const typeFilter = interaction.options.getString('type');
    let recipes;

    if (typeFilter) {
      recipes = getCraftingRecipesByType(typeFilter);
    } else {
      recipes = getAvailableRecipesForPlayer(char.level);
    }

    if (recipes.length === 0) {
      await interaction.reply({ embeds: [errorEmbed('No recipes found.')] });
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(0xf1c40f)
      .setTitle('⚒️ Crafting Recipes')
      .setDescription('Use `/craft_create` to craft items');

    for (const recipe of recipes.slice(0, 10)) {
      const materialsList = Object.entries(recipe.materials)
        .map(([id, qty]) => `${getItemName(id)} x${qty}`)
        .join(', ');

      embed.addFields({
        name: `${recipe.name} (Lv.${recipe.requiredLevel})`,
        value: `${recipe.description || 'No description'}\n**Materials:** ${materialsList}\n**Result:** ${getItemName(recipe.resultId)} x${recipe.resultQuantity}`,
        inline: false,
      });
    }

    await interaction.reply({ embeds: [embed] });
  },
};

export default command;
