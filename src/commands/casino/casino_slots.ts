import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { Command } from '../../client/BotClient';
import {
  getCharacter, upsertPlayer, modifyGold,
} from '../../database/PlayerRepository';
import { playSlots, logGame } from '../../game/CasinoEngine';
import { errorEmbed } from '../../utils/embeds';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('casino_slots')
    .setDescription('Play the slot machine')
    .addIntegerOption(opt =>
      opt.setName('amount').setDescription('Amount of gold to bet').setRequired(true)
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    upsertPlayer(interaction.user.id, interaction.user.username);
    const char = getCharacter(interaction.user.id);
    if (!char) {
      await interaction.reply({ embeds: [errorEmbed('No character found. Use `/create` to begin.')], ephemeral: true });
      return;
    }

    const amount = interaction.options.getInteger('amount')!;

    if (amount <= 0) {
      await interaction.reply({ embeds: [errorEmbed('Bet amount must be positive.')] });
      return;
    }

    if (amount > char.gold) {
      await interaction.reply({ embeds: [errorEmbed(`You don't have enough gold. You have ${char.gold}.`)] });
      return;
    }

    const result = playSlots(amount, 1000, 5);

    if ('error' in result) {
      await interaction.reply({ embeds: [errorEmbed(result.error)] });
      return;
    }

    modifyGold(interaction.user.id, -amount);
    modifyGold(interaction.user.id, result.winnings);
    
    logGame(interaction.user.id, 'slots', amount, result.win ? 'win' : 'loss', result.winnings);

    const embed = new EmbedBuilder()
      .setColor(result.win ? 0x2ecc71 : 0xe74c3c)
      .setTitle('🎰 Slot Machine')
      .setDescription(`| ${result.reels[0]} | ${result.reels[1]} | ${result.reels[2]} |`)
      .addFields(
        { name: 'Bet', value: `${amount} gold`, inline: true },
        { name: 'Result', value: result.win ? `WIN! ${result.prize}` : 'LOSE', inline: true },
        { name: 'Winnings', value: result.winnings > 0 ? `+${result.winnings} gold` : `-${amount} gold`, inline: true }
      );

    await interaction.reply({ embeds: [embed] });
  },
};

export default command;
