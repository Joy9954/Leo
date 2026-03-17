import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { Command } from '../../client/BotClient';
import {
  getCharacter, upsertPlayer, getInventory, addToInventory,
} from '../../database/PlayerRepository';
import { attemptExtraction, getItemName } from '../../game/CraftingEngine';
import { errorEmbed, successEmbed } from '../../utils/embeds';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('craft_extract')
    .setDescription('Extract Beyonder characteristics from a defeated enemy')
    .addStringOption(opt =>
      opt.setName('enemy_type').setDescription('Type of enemy defeated').setRequired(true)
        .addChoices(
          { name: 'Mutated Rat', value: 'mutated_rat' },
          { name: 'Werewolf', value: 'werewolf' },
          { name: 'Ghost', value: 'ghost' },
          { name: 'Deep Sea Horror', value: 'deepsea_horror' },
          { name: 'Evil Dragon', value: 'evil_dragon' },
          { name: 'Guler', value: 'guler' },
          { name: 'Dark Prophet', value: 'dark_prophet' },
          { name: 'Titan Golem', value: 'titan_golem' },
          { name: 'Demon Lord', value: 'demon_lord' }
        )
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    upsertPlayer(interaction.user.id, interaction.user.username);
    const char = getCharacter(interaction.user.id);
    if (!char) {
      await interaction.reply({ embeds: [errorEmbed('No character found. Use `/create` to begin.')], ephemeral: true });
      return;
    }

    if (char.level < 10) {
      await interaction.reply({ embeds: [errorEmbed('You need to be at least level 10 to extract characteristics.')], ephemeral: true });
      return;
    }

    const enemyType = interaction.options.getString('enemy_type')!;
    const result = attemptExtraction(enemyType, char.luck);

    if (!result.success || result.extracted.length === 0) {
      await interaction.reply({ 
        embeds: [errorEmbed('The extraction failed. No characteristics could be obtained from this enemy.')] 
      });
      return;
    }

    for (const item of result.extracted) {
      addToInventory(interaction.user.id, item, 1);
    }

    const extractedList = result.extracted.map(i => getItemName(i)).join(', ');

    const embed = new EmbedBuilder()
      .setColor(0x9b59b6)
      .setTitle('🧬 Extraction Complete')
      .setDescription(`You successfully extracted characteristics!`)
      .addFields({
        name: 'Extracted',
        value: extractedList,
        inline: false,
      });

    await interaction.reply({ embeds: [embed] });
  },
};

export default command;
