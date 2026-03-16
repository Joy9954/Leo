import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { Command } from '../../client/BotClient';
import { getCharacter, getInventory, InventoryItem } from '../../database/PlayerRepository';
import itemsData from '../../data/items.json';
import { errorEmbed, getPathwayColor } from '../../utils/embeds';

type ItemEntry = { id: string; name: string; type: string; description: string; emoji: string; attackBonus?: number; defenseBonus?: number; spiritBonus?: number; healAmount?: number; price: number };
const allItems: ItemEntry[] = [
  ...(itemsData.weapons as ItemEntry[]),
  ...(itemsData.armor as ItemEntry[]),
  ...(itemsData.consumables as ItemEntry[]),
  ...(itemsData.materials as ItemEntry[]),
];

function getItemData(itemId: string): ItemEntry | undefined {
  return allItems.find(i => i.id === itemId);
}

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('inventory')
    .setDescription('View your inventory'),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const char = getCharacter(interaction.user.id);
    if (!char) {
      await interaction.reply({ embeds: [errorEmbed('No character found. Use `/create` to begin.')], ephemeral: true });
      return;
    }

    const inv = getInventory(interaction.user.id);
    if (inv.length === 0) {
      await interaction.reply({ embeds: [errorEmbed('Your inventory is empty.')], ephemeral: true });
      return;
    }

    const grouped: Record<string, InventoryItem[]> = {};
    for (const item of inv) {
      if (!grouped[item.item_id]) grouped[item.item_id] = [];
      grouped[item.item_id].push(item);
    }

    const weapons: string[] = [];
    const armors: string[] = [];
    const consumables: string[] = [];
    const materials: string[] = [];

    for (const [itemId, items] of Object.entries(grouped)) {
      const data = getItemData(itemId);
      if (!data) continue;
      const qty = items.reduce((s, i) => s + i.quantity, 0);
      const equip = items.some(i => i.equipped) ? ' *(equipped)*' : '';
      const line = `${data.emoji} **${data.name}** x${qty}${equip}`;
      if (data.type === 'weapon') weapons.push(line);
      else if (data.type === 'armor') armors.push(line);
      else if (data.type === 'consumable') consumables.push(line);
      else materials.push(line);
    }

    const embed = new EmbedBuilder()
      .setColor(getPathwayColor(char.pathway))
      .setTitle(`🎒 ${char.name}'s Inventory`)
      .setDescription(`💰 **${char.gold.toLocaleString()}** gold sovereigns`);

    if (weapons.length > 0) embed.addFields({ name: '⚔️ Weapons', value: weapons.join('\n'), inline: false });
    if (armors.length > 0) embed.addFields({ name: '🛡️ Armor', value: armors.join('\n'), inline: false });
    if (consumables.length > 0) embed.addFields({ name: '🧪 Consumables', value: consumables.join('\n'), inline: false });
    if (materials.length > 0) embed.addFields({ name: '📦 Materials', value: materials.slice(0, 20).join('\n') + (materials.length > 20 ? `\n*...and ${materials.length - 20} more*` : ''), inline: false });

    await interaction.reply({ embeds: [embed] });
  },
};

export default command;
