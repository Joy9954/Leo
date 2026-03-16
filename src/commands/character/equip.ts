import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { Command } from '../../client/BotClient';
import { getCharacter, getInventory, equipItem, getCustomItems } from '../../database/PlayerRepository';
import itemsData from '../../data/items.json';
import { errorEmbed, successEmbed } from '../../utils/embeds';

type ItemEntry = { id: string; name: string; type: string; subtype: string; requiredLevel: number; emoji: string };

function getAllEquipableItems(): ItemEntry[] {
  const jsonItems: ItemEntry[] = [
    ...(itemsData.weapons as ItemEntry[]),
    ...(itemsData.armor as ItemEntry[]),
  ];
  const customItems = getCustomItems()
    .filter(item => item.type === 'weapon' || item.type === 'armor')
    .map(item => ({
      id: item.id,
      name: item.name,
      type: item.type,
      subtype: item.type === 'weapon' ? 'custom_weapon' : 'custom_armor',
      requiredLevel: item.required_level,
      emoji: item.emoji,
    }));
  return [...jsonItems, ...customItems];
}

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('equip')
    .setDescription('Equip a weapon or armor from your inventory')
    .addStringOption(opt =>
      opt.setName('item').setDescription('The item ID to equip').setRequired(true)
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const char = getCharacter(interaction.user.id);
    if (!char) {
      await interaction.reply({ embeds: [errorEmbed('No character found.')], ephemeral: true });
      return;
    }

    const itemId = interaction.options.getString('item', true).toLowerCase().replace(/ /g, '_');
    const inv = getInventory(interaction.user.id);
    const invItem = inv.find(i => i.item_id === itemId);

    if (!invItem) {
      await interaction.reply({ embeds: [errorEmbed(`You don't have **${itemId}** in your inventory.`)], ephemeral: true });
      return;
    }

    const itemDef = getAllEquipableItems().find(i => i.id === itemId);
    if (!itemDef) {
      await interaction.reply({ embeds: [errorEmbed('This item cannot be equipped.')], ephemeral: true });
      return;
    }

    if (char.level < itemDef.requiredLevel) {
      await interaction.reply({ embeds: [errorEmbed(`You need to be level ${itemDef.requiredLevel} to equip this item.`)], ephemeral: true });
      return;
    }

    const slot = itemDef.type === 'weapon' ? 'weapon' : 'armor';
    equipItem(interaction.user.id, itemId, slot);

    await interaction.reply({ embeds: [successEmbed(`You equipped ${itemDef.emoji} **${itemDef.name}**!`)] });
  },
};

export default command;
