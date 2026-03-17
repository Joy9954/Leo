import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { Command } from '../../client/BotClient';
import {
  getCharacter, upsertPlayer, modifyGold, addToInventory,
} from '../../database/PlayerRepository';
import { doDailyPull, formatTime, getItemName } from '../../game/CasinoEngine';
import { errorEmbed, successEmbed } from '../../utils/embeds';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('casino_daily')
    .setDescription('Daily lucky pull'),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    upsertPlayer(interaction.user.id, interaction.user.username);
    const char = getCharacter(interaction.user.id);
    if (!char) {
      await interaction.reply({ embeds: [errorEmbed('No character found. Use `/create` to begin.')], ephemeral: true });
      return;
    }

    const result = doDailyPull(interaction.user.id);

    if (!result.canPull) {
      const nextTime = formatTime(result.nextPullTime || 0);
      await interaction.reply({ 
        embeds: [errorEmbed(`You've already claimed your daily pull. Come back in ${nextTime}!`)],
        ephemeral: true,
      });
      return;
    }

    modifyGold(interaction.user.id, result.gold);

    if (result.item) {
      addToInventory(interaction.user.id, result.item, 1);
    }

    const embed = new EmbedBuilder()
      .setColor(0xf1c40f)
      .setTitle('🎁 Daily Lucky Pull!')
      .setDescription(`You received:`)
      .addFields(
        { name: 'Gold', value: `+${result.gold} gold`, inline: true },
      );

    if (result.item) {
      embed.addFields({
        name: 'Item',
        value: getItemName(result.item),
        inline: true,
      });
    }

    await interaction.reply({ embeds: [embed] });
  },
};

export default command;
