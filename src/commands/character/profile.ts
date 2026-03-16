import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { Command } from '../../client/BotClient';
import { getCharacter, upsertPlayer } from '../../database/PlayerRepository';
import { buildCharacterEmbed, errorEmbed } from '../../utils/embeds';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('profile')
    .setDescription('View your character profile or another player\'s')
    .addUserOption(opt =>
      opt.setName('user').setDescription('The user whose profile to view').setRequired(false)
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const target = interaction.options.getUser('user') ?? interaction.user;
    upsertPlayer(interaction.user.id, interaction.user.username);

    const char = getCharacter(target.id);
    if (!char) {
      const msg = target.id === interaction.user.id
        ? 'You have no character yet. Use `/create` to begin your journey!'
        : `**${target.username}** has no character yet.`;
      await interaction.reply({ embeds: [errorEmbed(msg)], ephemeral: true });
      return;
    }

    const embed = buildCharacterEmbed(char, target.username);
    await interaction.reply({ embeds: [embed] });
  },
};

export default command;
