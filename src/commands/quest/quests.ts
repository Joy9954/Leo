import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { Command } from '../../client/BotClient';
import { getCharacter, upsertPlayer, getActiveQuests } from '../../database/PlayerRepository';
import { getAvailableQuests, beginQuest, getQuestProgress } from '../../game/QuestManager';
import { errorEmbed, getPathwayColor } from '../../utils/embeds';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('quest')
    .setDescription('Manage your quests')
    .addSubcommand(sub =>
      sub.setName('list').setDescription('View available and active quests')
    )
    .addSubcommand(sub =>
      sub.setName('start').setDescription('Start a quest')
        .addStringOption(opt => opt.setName('quest_id').setDescription('Quest ID to start').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('progress').setDescription('View your active quest progress')
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    upsertPlayer(interaction.user.id, interaction.user.username);
    const char = getCharacter(interaction.user.id);
    if (!char) {
      await interaction.reply({ embeds: [errorEmbed('No character found. Use `/create` to begin.')], ephemeral: true });
      return;
    }

    const sub = interaction.options.getSubcommand();

    if (sub === 'list') {
      const available = getAvailableQuests(interaction.user.id);
      const active = getActiveQuests(interaction.user.id);

      const embed = new EmbedBuilder()
        .setColor(getPathwayColor(char.pathway))
        .setTitle('📜 Quest Board');

      if (active.length > 0) {
        embed.addFields({
          name: '⚡ Active Quests',
          value: active.map(q => {
            const progress = getQuestProgress(q);
            const progressStr = progress.map(p => `  • ${p.objective.description}: ${p.current}/${p.max}`).join('\n');
            return `**${q.quest_id}**\n${progressStr}`;
          }).join('\n\n'),
          inline: false,
        });
      }

      if (available.length > 0) {
        embed.addFields({
          name: '📋 Available Quests',
          value: available.map(q =>
            `\`${q.id}\` **${q.name}** *(Lv.${q.minLevel}+)*\n  ${q.description}\n  Rewards: **${q.rewards.xp}** XP, **${q.rewards.gold}** gold`
          ).join('\n\n'),
          inline: false,
        });
      }

      if (active.length === 0 && available.length === 0) {
        embed.setDescription('No quests available right now. Level up or complete prerequisites to unlock more!');
      }

      embed.setFooter({ text: 'Use /quest start <quest_id> to begin a quest' });
      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    if (sub === 'start') {
      const questId = interaction.options.getString('quest_id', true);
      const { success, message } = beginQuest(interaction.user.id, questId);
      if (!success) {
        await interaction.reply({ embeds: [errorEmbed(message)], ephemeral: true });
      } else {
        const embed = new EmbedBuilder()
          .setColor(0x2ecc71)
          .setDescription(`📜 ${message}`);
        await interaction.reply({ embeds: [embed] });
      }
      return;
    }

    if (sub === 'progress') {
      const active = getActiveQuests(interaction.user.id);
      if (active.length === 0) {
        await interaction.reply({ embeds: [errorEmbed('You have no active quests. Use `/quest list` to find quests.')], ephemeral: true });
        return;
      }

      const embed = new EmbedBuilder()
        .setColor(getPathwayColor(char.pathway))
        .setTitle('📊 Quest Progress');

      for (const q of active) {
        const progress = getQuestProgress(q);
        const lines = progress.map(p => {
          const bar = `[${'▓'.repeat(Math.round((p.current / p.max) * 10))}${'░'.repeat(10 - Math.round((p.current / p.max) * 10))}]`;
          return `${bar} ${p.current}/${p.max} — ${p.objective.description}`;
        });
        embed.addFields({ name: `📜 ${q.quest_id}`, value: lines.join('\n'), inline: false });
      }

      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
  },
};

export default command;
