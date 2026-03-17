import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { Command } from '../../client/BotClient';
import {
  getCharacter, upsertPlayer, modifyGold,
} from '../../database/PlayerRepository';
import { playDice, logGame } from '../../game/CasinoEngine';
import { errorEmbed, successEmbed } from '../../utils/embeds';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('casino_dice')
    .setDescription('Play dice games')
    .addStringOption(opt =>
      opt.setName('bet_type').setDescription('Type of bet').setRequired(true)
        .addChoices(
          { name: 'Exact Sum (6x)', value: 'exact' },
          { name: 'Range (2x)', value: 'range' },
          { name: 'High 9+ (1.95x)', value: 'high' },
          { name: 'Low 6- (1.95x)', value: 'low' }
        )
    )
    .addIntegerOption(opt =>
      opt.setName('amount').setDescription('Amount of gold to bet').setRequired(true)
    )
    .addIntegerOption(opt =>
      opt.setName('target').setDescription('Target number (for exact: 2-12, for range: 7/9/11)').setRequired(false)
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    upsertPlayer(interaction.user.id, interaction.user.username);
    const char = getCharacter(interaction.user.id);
    if (!char) {
      await interaction.reply({ embeds: [errorEmbed('No character found. Use `/create` to begin.')], ephemeral: true });
      return;
    }

    const betType = interaction.options.getString('bet_type') as 'exact' | 'range' | 'high' | 'low';
    const amount = interaction.options.getInteger('amount')!;
    const target = interaction.options.getInteger('target');

    if (amount <= 0) {
      await interaction.reply({ embeds: [errorEmbed('Bet amount must be positive.')] });
      return;
    }

    if (amount > char.gold) {
      await interaction.reply({ embeds: [errorEmbed(`You don't have enough gold. You have ${char.gold}.`)] });
      return;
    }

    const result = playDice(amount, betType, target, 5000, 10);

    if ('error' in result) {
      await interaction.reply({ embeds: [errorEmbed(result.error)] });
      return;
    }

    modifyGold(interaction.user.id, -amount);
    modifyGold(interaction.user.id, result.winnings);
    
    logGame(interaction.user.id, 'dice', amount, result.win ? 'win' : 'loss', result.winnings);

    const embed = new EmbedBuilder()
      .setColor(result.win ? 0x2ecc71 : 0xe74c3c)
      .setTitle('🎲 Dice Game')
      .setDescription(`You rolled: **${result.result[0]}** + **${result.result[1]}** = **${result.result[0] + result.result[1]}**`)
      .addFields(
        { name: 'Bet', value: `${amount} gold`, inline: true },
        { name: 'Result', value: result.win ? `WIN!` : 'LOSE', inline: true },
        { name: 'Winnings', value: result.winnings > 0 ? `+${result.winnings} gold` : `-${amount} gold`, inline: true }
      );

    await interaction.reply({ embeds: [embed] });
  },
};

export default command;
