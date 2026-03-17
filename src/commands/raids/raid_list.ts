import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { Command } from '../../client/BotClient';
import {
  getCharacter, upsertPlayer,
} from '../../database/PlayerRepository';
import { getAllRaidDefs, getActiveRaids } from '../../game/RaidEngine';
import { errorEmbed } from '../../utils/embeds';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('raid_list')
    .setDescription('View available and active raids'),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    upsertPlayer(interaction.user.id, interaction.user.username);
    const char = getCharacter(interaction.user.id);
    if (!char) {
      await interaction.reply({ embeds: [errorEmbed('No character found. Use `/create` to begin.')], ephemeral: true });
      return;
    }

    const activeRaids = getActiveRaids();
    const allRaids = getAllRaidDefs();

    const embed = new EmbedBuilder()
      .setColor(0xe74c3c)
      .setTitle('⚔️ World Boss Raids');

    if (activeRaids.length > 0) {
      embed.setDescription('⚠️ Active raids - Join now!');
      
      for (const active of activeRaids) {
        const raidDef = allRaids.find(r => r.id === active.raid_id);
        if (!raidDef) continue;

        const hpPercent = Math.floor((active.current_health / active.max_health) * 100);
        
        embed.addFields({
          name: `${raidDef.emoji} ${raidDef.name}`,
          value: `HP: ${active.current_health}/${active.max_health} (${hpPercent}%)\n${raidDef.description}\nUse \`/raid_join ${active.id}\` to join!`,
          inline: false,
        });
      }
    } else {
      embed.setDescription('No active raids. Check back later!');
    }

    embed.addFields({
      name: '📋 Available Raids',
      value: allRaids
        .filter(r => r.minLevel <= char.level)
        .map(r => `${r.emoji} ${r.name} (Lv.${r.minLevel}+)`)
        .join('\n') || 'None available for your level',
      inline: false,
    });

    await interaction.reply({ embeds: [embed] });
  },
};

export default command;
