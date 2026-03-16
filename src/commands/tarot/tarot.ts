import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { Command } from '../../client/BotClient';
import { getCharacter, upsertPlayer, getLeaderboard } from '../../database/PlayerRepository';
import { errorEmbed, getPathwayName } from '../../utils/embeds';
import pathwaysData from '../../data/pathways.json';

interface PathwayData {
  id: string;
  name: string;
  chineseName: string;
  description: string;
  color: string;
  sequences: Array<{ number: number; name: string; description: string }>;
}

const pathways = pathwaysData as PathwayData[];

const TAROT_LORE = `
The **Tarot Club** is a mysterious secret organization in the world of Lord of Mysteries. 
Its members are powerful Beyonders who meet in a spiritual space created by their enigmatic leader.

Members are identified by their **Tarot codenames** rather than their real identities. 
The Club operates beyond the reach of any church or government, pursuing knowledge and power 
while maintaining a careful balance between the world's great forces.

*"I do not wish to harm you — but if you wish to test me, I welcome it."*
— The Fool
`;

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('tarot')
    .setDescription('Tarot Club and pathway information')
    .addSubcommand(sub => sub.setName('club').setDescription('View the Tarot Club members'))
    .addSubcommand(sub => sub.setName('pathways').setDescription('View all Beyonder pathways'))
    .addSubcommand(sub =>
      sub.setName('pathway')
        .setDescription('View details about a specific pathway')
        .addStringOption(opt => opt.setName('name').setDescription('Pathway ID').setRequired(true))
    )
    .addSubcommand(sub => sub.setName('leaderboard').setDescription('View the top Beyonders')),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    upsertPlayer(interaction.user.id, interaction.user.username);
    const sub = interaction.options.getSubcommand();

    if (sub === 'club') {
      const char = getCharacter(interaction.user.id);
      const members = getLeaderboard(20).filter(c => c.tarot_member);

      const embed = new EmbedBuilder()
        .setColor(0x9b59b6)
        .setTitle('🃏 The Tarot Club')
        .setDescription(TAROT_LORE);

      if (members.length > 0) {
        embed.addFields({
          name: '🎭 Current Members',
          value: members.map(m =>
            `**${m.tarot_codename ?? 'Unknown'}** — ${getPathwayName(m.pathway)} Seq.${m.sequence} (Lv.${m.level})`
          ).join('\n'),
          inline: false,
        });
      } else {
        embed.addFields({
          name: '🎭 Members',
          value: '*The Tarot Club awaits worthy Beyonders...*\n*Complete the Tarot Initiation quest to join!*',
          inline: false,
        });
      }

      if (char?.tarot_member && char.tarot_codename) {
        embed.setFooter({ text: `Your codename: ${char.tarot_codename}` });
      }

      await interaction.reply({ embeds: [embed] });
      return;
    }

    if (sub === 'pathways') {
      const lines = pathways.map(p =>
        `\`${p.id}\` **${p.name}** (${p.chineseName}) — *${p.description.substring(0, 60)}...*`
      );
      const embed = new EmbedBuilder()
        .setColor(0x9b59b6)
        .setTitle('🃏 The 22 Beyonder Pathways')
        .setDescription(lines.join('\n'))
        .setFooter({ text: 'Use /tarot pathway <id> for full details' });
      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    if (sub === 'pathway') {
      const pathwayId = interaction.options.getString('name', true).toLowerCase().replace(/ /g, '_');
      const pathway = pathways.find(p => p.id === pathwayId);
      if (!pathway) {
        await interaction.reply({ embeds: [errorEmbed(`Pathway \`${pathwayId}\` not found. Use \`/tarot pathways\` to see all pathways.`)], ephemeral: true });
        return;
      }

      const color = parseInt(pathway.color.replace('#', ''), 16);
      const seqList = pathway.sequences
        .sort((a, b) => b.number - a.number)
        .map(s => `**Seq.${s.number}** — **${s.name}**: *${s.description}*`)
        .join('\n');

      const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle(`🃏 ${pathway.name} (${pathway.chineseName})`)
        .setDescription(pathway.description)
        .addFields({ name: '📋 Sequences (9 → 1)', value: seqList, inline: false });

      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    if (sub === 'leaderboard') {
      const top = getLeaderboard(10);
      if (top.length === 0) {
        await interaction.reply({ embeds: [errorEmbed('No Beyonders yet!')], ephemeral: true });
        return;
      }

      const medals = ['🥇', '🥈', '🥉'];
      const lines = top.map((c, i) => {
        const medal = medals[i] ?? `**${i + 1}.**`;
        const tarot = c.tarot_member && c.tarot_codename ? ` *(${c.tarot_codename})*` : '';
        return `${medal} **${c.name}**${tarot} — ${getPathwayName(c.pathway)} Seq.${c.sequence} | Lv.**${c.level}**`;
      });

      const embed = new EmbedBuilder()
        .setColor(0xf1c40f)
        .setTitle('🏆 Beyonder Leaderboard')
        .setDescription(lines.join('\n'));

      await interaction.reply({ embeds: [embed] });
    }
  },
};

export default command;
