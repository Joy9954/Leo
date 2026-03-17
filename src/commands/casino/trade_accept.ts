import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { Command } from '../../client/BotClient';
import {
  getCharacter, upsertPlayer, modifyGold, getInventory, removeFromInventory, addToInventory,
  getTrade, updateTradeStatus, getPendingTradesForPlayer,
} from '../../database/PlayerRepository';
import { errorEmbed, successEmbed } from '../../utils/embeds';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('trade_accept')
    .setDescription('Accept or view pending trade offers')
    .addIntegerOption(opt =>
      opt.setName('trade_id').setDescription('Trade ID to accept (optional, or view all)').setRequired(false)
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    upsertPlayer(interaction.user.id, interaction.user.username);
    const char = getCharacter(interaction.user.id);
    if (!char) {
      await interaction.reply({ embeds: [errorEmbed('No character found. Use `/create` to begin.')], ephemeral: true });
      return;
    }

    const tradeId = interaction.options.getInteger('trade_id');

    if (tradeId) {
      const trade = getTrade(tradeId);
      if (!trade) {
        await interaction.reply({ embeds: [errorEmbed('Trade not found.')] });
        return;
      }

      if (trade.receiver_id !== interaction.user.id && trade.offerer_id !== interaction.user.id) {
        await interaction.reply({ embeds: [errorEmbed('This trade is not for you.')] });
        return;
      }

      if (trade.status !== 'pending') {
        await interaction.reply({ embeds: [errorEmbed(`This trade has already been ${trade.status}.`)] });
        return;
      }

      const isReceiver = trade.receiver_id === interaction.user.id;
      const otherPlayerId = isReceiver ? trade.offerer_id : trade.receiver_id;
      const otherChar = getCharacter(otherPlayerId);

      if (!otherChar) {
        await interaction.reply({ embeds: [errorEmbed('The other player no longer exists.')] });
        return;
      }

      const offererGold = trade.offered_gold;
      const requesterGold = trade.requested_gold;

      const offererItems = trade.offered_items ? JSON.parse(trade.offered_items) : [];
      const requesterItems = trade.requested_items ? JSON.parse(trade.requested_items) : [];

      if (isReceiver) {
        if (requesterGold > char.gold) {
          await interaction.reply({ embeds: [errorEmbed(`You don't have enough gold. You need ${requesterGold}.`)] });
          return;
        }
        const myInventory = getInventory(interaction.user.id);
        for (const itemId of requesterItems) {
          const invItem = myInventory.find(i => i.item_id === itemId);
          if (!invItem) {
            await interaction.reply({ embeds: [errorEmbed(`You don't have ${itemId}.`)], ephemeral: true });
            return;
          }
        }
      } else {
        if (offererGold > char.gold) {
          await interaction.reply({ embeds: [errorEmbed(`You don't have enough gold. You need ${offererGold}.`)] });
          return;
        }
        const myInventory = getInventory(interaction.user.id);
        for (const itemId of offererItems) {
          const invItem = myInventory.find(i => i.item_id === itemId);
          if (!invItem) {
            await interaction.reply({ embeds: [errorEmbed(`You don't have ${itemId}.`)], ephemeral: true });
            return;
          }
        }
      }

      if (isReceiver) {
        modifyGold(interaction.user.id, -requesterGold);
        modifyGold(otherPlayerId, requesterGold);
        for (const itemId of requesterItems) {
          removeFromInventory(interaction.user.id, itemId);
          addToInventory(otherPlayerId, itemId);
        }
        for (const itemId of offererItems) {
          removeFromInventory(otherPlayerId, itemId);
          addToInventory(interaction.user.id, itemId);
        }
      } else {
        modifyGold(interaction.user.id, -offererGold);
        modifyGold(otherPlayerId, offererGold);
        for (const itemId of offererItems) {
          removeFromInventory(interaction.user.id, itemId);
          addToInventory(otherPlayerId, itemId);
        }
        for (const itemId of requesterItems) {
          removeFromInventory(otherPlayerId, itemId);
          addToInventory(interaction.user.id, itemId);
        }
      }

      updateTradeStatus(tradeId, 'accepted');

      const embed = new EmbedBuilder()
        .setColor(0x2ecc71)
        .setTitle('✅ Trade Completed!')
        .setDescription(`Trade #${tradeId} has been accepted.`);

      await interaction.reply({ embeds: [embed] });
      return;
    }

    const pendingTrades = getPendingTradesForPlayer(interaction.user.id);

    if (pendingTrades.length === 0) {
      await interaction.reply({ embeds: [errorEmbed('You have no pending trade offers.')] });
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(0x3498db)
      .setTitle('📋 Pending Trade Offers')
      .setDescription('Use `/trade_accept <trade_id>` to accept a trade');

    for (const trade of pendingTrades.slice(0, 5)) {
      const isIncoming = trade.receiver_id === interaction.user.id;
      const otherId = isIncoming ? trade.offerer_id : trade.receiver_id;

      embed.addFields({
        name: `Trade #${trade.id} ${isIncoming ? '📥' : '📤'}`,
        value: `${isIncoming ? 'From' : 'To'}: <@${otherId}>\nOffer: ${trade.offered_gold > 0 ? `${trade.offered_gold}g` : 'Nothing'}\nRequest: ${trade.requested_gold > 0 ? `${trade.requested_gold}g` : 'Nothing'}`,
        inline: true,
      });
    }

    await interaction.reply({ embeds: [embed] });
  },
};

export default command;
