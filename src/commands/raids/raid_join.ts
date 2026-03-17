import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { Command } from '../../client/BotClient';
import {
  getCharacter, upsertPlayer,
} from '../../database/PlayerRepository';
import { getRaidById, joinRaid as joinRaidEngine } from '../../game/RaidEngine';
import { errorEmbed, successEmbed } from '../../utils/embeds';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('raid_join')
    .setDescription('Join an active raid battle')
    .addIntegerOption(opt =>
      opt.setName('raid_id').setDescription('Raid ID to join').setRequired(true)
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    upsertPlayer(interaction.user.id, interaction.user.username);
    const char = getCharacter(interaction.user.id);
    if (!char) {
      await interaction.reply({ embeds: [errorEmbed('No character found. Use `/create` to begin.')], ephemeral: true });
      return;
    }

    const raidId = interaction.options.getInteger('raid_id')!;
    const raid = getRaidById(raidId);

    if (!raid) {
      await interaction.reply({ embeds: [errorEmbed('Raid not found. Use `/raid_list` to see active raids.')], ephemeral: true });
      return;
    }

    const result = joinRaidEngine(raidId, interaction.user.id);

    if (!result.success) {
      await interaction.reply({ embeds: [errorEmbed(result.message)] });
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(0xe74c3c)
      .setTitle('⚔️ Joined Raid!')
      .setDescription(result.message)
      .addFields({
        name: 'Battle',
        value: 'Use `/raid_attack` to deal damage to the boss!',
        inline: false,
      });

    await interaction.reply({ embeds: [embed] });
  },
};

export default command;
