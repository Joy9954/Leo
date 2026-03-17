import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { Command } from '../../client/BotClient';
import {
  getCharacter, upsertPlayer,
} from '../../database/PlayerRepository';
import { getRaidById, getRaidStatus, getRaidLeaderboard } from '../../game/RaidEngine';
import { errorEmbed, buildBar } from '../../utils/embeds';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('raid_status')
    .setDescription('View raid progress and leaderboard')
    .addIntegerOption(opt =>
      opt.setName('raid_id').setDescription('Raid ID to check').setRequired(true)
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    upsertPlayer(interaction.user.id, interaction.user.username);
    const char = getCharacter(interaction.user.id);
    if (!char) {
      await interaction.reply({ embeds: [errorEmbed('No character found. Use `/create` to begin.')], ephemeral: true });
      return;
    }

    const raidId = interaction.options.getInteger('raid_id')!;
    const status = getRaidStatus(raidId);

    if (!status) {
      await interaction.reply({ embeds: [errorEmbed('Raid not found.')] });
      return;
    }

    const { raid, participants, raidDef } = status;
    const hpPercent = Math.floor((raid.current_health / raid.max_health) * 100);
    const hpBar = buildBar(raid.current_health, raid.max_health, '❤️');

    const embed = new EmbedBuilder()
      .setColor(0xe74c3c)
      .setTitle(`${raidDef?.emoji || '⚔️'} ${raidDef?.name || 'World Boss'}`)
      .setDescription(`${raidDef?.description || ''}\n\n**HP:** ${hpBar} ${raid.current_health}/${raid.max_health} (${hpPercent}%)`)
      .addFields({
        name: '👥 Participants',
        value: participants.length > 0 ? `${participants.length} fighters` : 'No participants yet',
        inline: true,
      });

    if (participants.length > 0) {
      const leaderboard = getRaidLeaderboard(raidId);
      const top5 = leaderboard.slice(0, 5).map((p, i) => {
        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '  ';
        return `${medal} <@${p.playerId}>: ${p.damage} damage (${p.percentage}%)`;
      }).join('\n');

      embed.addFields({
        name: '🏆 Damage Leaderboard',
        value: top5,
        inline: false,
      });
    }

    await interaction.reply({ embeds: [embed] });
  },
};

export default command;
