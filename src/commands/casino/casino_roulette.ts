import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { Command } from '../../client/BotClient';
import {
  getCharacter, upsertPlayer, modifyGold,
} from '../../database/PlayerRepository';
import { playRoulette, logGame } from '../../game/CasinoEngine';
import { errorEmbed } from '../../utils/embeds';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('casino_roulette')
    .setDescription('Spin the roulette wheel')
    .addStringOption(opt =>
      opt.setName('bet_type').setDescription('Type of bet').setRequired(true)
        .addChoices(
          { name: 'Number (36x)', value: 'number' },
          { name: 'Red (2x)', value: 'red' },
          { name: 'Black (2x)', value: 'black' },
          { name: 'Odd (2x)', value: 'odd' },
          { name: 'Even (2x)', value: 'even' },
          { name: 'Dozen (3x)', value: 'dozen' },
          { name: 'Column (3x)', value: 'column' }
        )
    )
    .addIntegerOption(opt =>
      opt.setName('amount').setDescription('Amount of gold to bet').setRequired(true)
    )
    .addIntegerOption(opt =>
      opt.setName('target').setDescription('Target (number: 0-36, dozen: 1-3, column: 1-3)').setRequired(false)
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    upsertPlayer(interaction.user.id, interaction.user.username);
    const char = getCharacter(interaction.user.id);
    if (!char) {
      await interaction.reply({ embeds: [errorEmbed('No character found. Use `/create` to begin.')], ephemeral: true });
      return;
    }

    const betType = interaction.options.getString('bet_type') as 'number' | 'red' | 'black' | 'odd' | 'even' | 'dozen' | 'column';
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

    const result = playRoulette(amount, betType, target, 10000, 20);

    if ('error' in result) {
      await interaction.reply({ embeds: [errorEmbed(result.error)] });
      return;
    }

    modifyGold(interaction.user.id, -amount);
    modifyGold(interaction.user.id, result.winnings);
    
    logGame(interaction.user.id, 'roulette', amount, result.win ? 'win' : 'loss', result.winnings);

    const colorEmoji = result.color === 'red' ? '🔴' : result.color === 'black' ? '⚫' : '🟢';

    const embed = new EmbedBuilder()
      .setColor(result.win ? 0x2ecc71 : 0xe74c3c)
      .setTitle('🎡 Roulette')
      .setDescription(`The ball landed on **${colorEmoji} ${result.result}** (${result.color})`)
      .addFields(
        { name: 'Bet', value: `${amount} gold`, inline: true },
        { name: 'Result', value: result.win ? `WIN!` : 'LOSE', inline: true },
        { name: 'Winnings', value: result.winnings > 0 ? `+${result.winnings} gold` : `-${amount} gold`, inline: true }
      );

    await interaction.reply({ embeds: [embed] });
  },
};

export default command;
