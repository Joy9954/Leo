import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, User } from 'discord.js';
import { Command } from '../../client/BotClient';
import {
  getCharacter, upsertPlayer, modifyGold, getInventory, removeFromInventory, addToInventory,
  createTrade, getTrade, updateTradeStatus, getPendingTradesForPlayer, getPlayer,
} from '../../database/PlayerRepository';
import { errorEmbed, successEmbed } from '../../utils/embeds';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('trade_offer')
    .setDescription('Offer a trade to another player')
    .addUserOption(opt =>
      opt.setName('player').setDescription('Player to trade with').setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('offer_items').setDescription('Items to offer (comma-separated IDs)').setRequired(false)
    )
    .addIntegerOption(opt =>
      opt.setName('offer_gold').setDescription('Gold to offer').setRequired(false)
    )
    .addStringOption(opt =>
      opt.setName('request_items').setDescription('Items to request (comma-separated IDs)').setRequired(false)
    )
    .addIntegerOption(opt =>
      opt.setName('request_gold').setDescription('Gold to request').setRequired(false)
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    upsertPlayer(interaction.user.id, interaction.user.username);
    const char = getCharacter(interaction.user.id);
    if (!char) {
      await interaction.reply({ embeds: [errorEmbed('No character found. Use `/create` to begin.')], ephemeral: true });
      return;
    }

    const targetUser = interaction.options.getUser('player')!;
    if (targetUser.id === interaction.user.id) {
      await interaction.reply({ embeds: [errorEmbed('You cannot trade with yourself.')] });
      return;
    }

    upsertPlayer(targetUser.id, targetUser.username);
    const targetChar = getCharacter(targetUser.id);
    if (!targetChar) {
      await interaction.reply({ embeds: [errorEmbed('Target player has not created a character yet.')] });
      return;
    }

    const offerGold = interaction.options.getInteger('offer_gold') || 0;
    const requestGold = interaction.options.getInteger('request_gold') || 0;

    if (offerGold > char.gold) {
      await interaction.reply({ embeds: [errorEmbed(`You don't have enough gold. You have ${char.gold}.`)] });
      return;
    }

    const offerItemsStr = interaction.options.getString('offer_items');
    const requestItemsStr = interaction.options.getString('request_items');
    const offerItems = offerItemsStr ? offerItemsStr.split(',').map(s => s.trim()) : [];
    const requestItems = requestItemsStr ? requestItemsStr.split(',').map(s => s.trim()) : [];

    const inventory = getInventory(interaction.user.id);
    for (const itemId of offerItems) {
      const invItem = inventory.find(i => i.item_id === itemId);
      if (!invItem) {
        await interaction.reply({ embeds: [errorEmbed(`You don't have ${itemId}.`)], ephemeral: true });
        return;
      }
    }

    const tradeId = createTrade(
      interaction.user.id,
      targetUser.id,
      JSON.stringify(offerItems),
      offerGold,
      JSON.stringify(requestItems),
      requestGold
    );

    const embed = new EmbedBuilder()
      .setColor(0x3498db)
      .setTitle('🤝 Trade Offer Sent!')
      .setDescription(`Trade #${tradeId} sent to <@${targetUser.id}>`)
      .addFields(
        { name: 'You Offer', value: offerGold > 0 ? `${offerGold} gold` : 'Nothing', inline: true },
        { name: 'You Request', value: requestGold > 0 ? `${requestGold} gold` : 'Nothing', inline: true },
      )
      .setFooter({ text: 'Trade expires in 5 minutes' });

    if (offerItems.length > 0) {
      embed.addFields({ name: 'Items You Offer', value: offerItems.join(', '), inline: false });
    }
    if (requestItems.length > 0) {
      embed.addFields({ name: 'Items You Request', value: requestItems.join(', '), inline: false });
    }

    await interaction.reply({ embeds: [embed] });
  },
};

export default command;
