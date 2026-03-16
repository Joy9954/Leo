import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { Command } from '../../client/BotClient';
import { getCharacter, upsertPlayer, addToInventory, modifyGold, getCustomItems } from '../../database/PlayerRepository';
import itemsData from '../../data/items.json';
import { errorEmbed, successEmbed, getPathwayColor } from '../../utils/embeds';

type ShopItem = { id: string; name: string; type: string; description: string; emoji: string; price: number; requiredLevel?: number; attackBonus?: number; defenseBonus?: number; spiritBonus?: number; healAmount?: number };

function getAllShopItems(): ShopItem[] {
  const jsonItems: ShopItem[] = [
    ...(itemsData.weapons as ShopItem[]),
    ...(itemsData.armor as ShopItem[]),
    ...(itemsData.consumables as ShopItem[]),
  ];
  const customItems = getCustomItems().map(item => ({
    id: item.id,
    name: item.name,
    type: item.type,
    description: item.description,
    emoji: item.emoji,
    price: item.price,
    requiredLevel: item.required_level,
    attackBonus: item.attack_bonus,
    defenseBonus: item.defense_bonus,
    spiritBonus: item.spirit_bonus,
    healAmount: item.heal_amount,
  }));
  return [...jsonItems, ...customItems];
}

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('shop')
    .setDescription('Browse and buy items from the shop')
    .addStringOption(opt =>
      opt.setName('action').setDescription('View shop or buy an item').setRequired(true)
        .addChoices(
          { name: 'Browse', value: 'browse' },
          { name: 'Buy', value: 'buy' }
        )
    )
    .addStringOption(opt =>
      opt.setName('item').setDescription('Item ID to purchase (required when action is buy)').setRequired(false)
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    upsertPlayer(interaction.user.id, interaction.user.username);
    const char = getCharacter(interaction.user.id);
    if (!char) {
      await interaction.reply({ embeds: [errorEmbed('No character found. Use `/create` to begin.')], ephemeral: true });
      return;
    }

    const action = interaction.options.getString('action', true);

    if (action === 'browse') {
      const available = getAllShopItems().filter(i => (i.requiredLevel ?? 1) <= char.level + 5);
      const weapons = available.filter(i => i.type === 'weapon');
      const armor = available.filter(i => i.type === 'armor');
      const consumables = available.filter(i => i.type === 'consumable');

      const formatItem = (item: ShopItem) => {
        const stats: string[] = [];
        if (item.attackBonus) stats.push(`ATK +${item.attackBonus}`);
        if (item.defenseBonus) stats.push(`DEF +${item.defenseBonus}`);
        if (item.spiritBonus) stats.push(`SPI +${item.spiritBonus}`);
        if (item.healAmount) stats.push(`Heals ${item.healAmount} HP`);
        const lvlReq = item.requiredLevel ? ` *(Lv.${item.requiredLevel}+)*` : '';
        return `${item.emoji} \`${item.id}\` **${item.name}**${lvlReq} — ${item.price}g${stats.length > 0 ? ` | ${stats.join(', ')}` : ''}`;
      };

      const embed = new EmbedBuilder()
        .setColor(getPathwayColor(char.pathway))
        .setTitle('🏪 Beyonder Shop — Backlund')
        .setDescription(`💰 Your gold: **${char.gold.toLocaleString()}**\n\nUse \`/shop buy <item_id>\` to purchase.\n\u200b`)
        .addFields(
          { name: '⚔️ Weapons', value: weapons.map(formatItem).join('\n') || 'None available', inline: false },
          { name: '🛡️ Armor', value: armor.map(formatItem).join('\n') || 'None available', inline: false },
          { name: '🧪 Consumables', value: consumables.map(formatItem).join('\n') || 'None available', inline: false },
        );

      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    const itemId = interaction.options.getString('item');
    if (!itemId) {
      await interaction.reply({ embeds: [errorEmbed('Please provide an item ID to buy. Use `/shop browse` first.')], ephemeral: true });
      return;
    }

    const item = getAllShopItems().find(i => i.id === itemId.toLowerCase().replace(/ /g, '_'));
    if (!item) {
      await interaction.reply({ embeds: [errorEmbed(`Item \`${itemId}\` not found in the shop.`)], ephemeral: true });
      return;
    }

    if (item.requiredLevel && char.level < item.requiredLevel) {
      await interaction.reply({ embeds: [errorEmbed(`You need to be level **${item.requiredLevel}** to buy this item.`)], ephemeral: true });
      return;
    }

    if (char.gold < item.price) {
      await interaction.reply({ embeds: [errorEmbed(`Not enough gold! You need **${item.price}g** but only have **${char.gold}g**.`)], ephemeral: true });
      return;
    }

    modifyGold(interaction.user.id, -item.price);
    addToInventory(interaction.user.id, item.id);

    await interaction.reply({
      embeds: [successEmbed(`Purchased ${item.emoji} **${item.name}** for **${item.price}g**!\nRemaining gold: **${char.gold - item.price}g**`)],
    });
  },
};

export default command;
