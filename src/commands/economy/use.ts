import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { Command } from '../../client/BotClient';
import { getCharacter, upsertPlayer, getInventory, removeFromInventory, modifyHealth, modifySpirit, addExperience, getCustomItems } from '../../database/PlayerRepository';
import itemsData from '../../data/items.json';
import { errorEmbed, successEmbed } from '../../utils/embeds';

type ConsumableItem = { id: string; name: string; type: string; emoji: string; healAmount?: number; spiritRestoreAmount?: number; xpBonus?: number };

function getAllConsumables(): ConsumableItem[] {
  const jsonConsumables = itemsData.consumables as ConsumableItem[];
  const customConsumables = getCustomItems()
    .filter(item => item.type === 'consumable')
    .map(item => ({
      id: item.id,
      name: item.name,
      type: item.type,
      emoji: item.emoji,
      healAmount: item.heal_amount || undefined,
      spiritRestoreAmount: item.spirit_restore_amount || undefined,
      xpBonus: item.xp_bonus || undefined,
    }));
  return [...jsonConsumables, ...customConsumables];
}

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('use')
    .setDescription('Use a consumable item from your inventory')
    .addStringOption(opt =>
      opt.setName('item').setDescription('Item ID to use').setRequired(true)
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    upsertPlayer(interaction.user.id, interaction.user.username);
    const char = getCharacter(interaction.user.id);
    if (!char) {
      await interaction.reply({ embeds: [errorEmbed('No character found.')], ephemeral: true });
      return;
    }

    const itemId = interaction.options.getString('item', true).toLowerCase().replace(/ /g, '_');
    const inv = getInventory(interaction.user.id);
    const invItem = inv.find(i => i.item_id === itemId);

    if (!invItem || invItem.quantity < 1) {
      await interaction.reply({ embeds: [errorEmbed(`You don't have **${itemId}** in your inventory.`)], ephemeral: true });
      return;
    }

    const item = getAllConsumables().find(i => i.id === itemId);
    if (!item) {
      await interaction.reply({ embeds: [errorEmbed('This item cannot be used directly.')], ephemeral: true });
      return;
    }

    const effects: string[] = [];

    if (item.healAmount) {
      const { health: newHp } = modifyHealth(interaction.user.id, item.healAmount);
      effects.push(`❤️ Restored **${Math.min(item.healAmount, char.max_health - char.health)}** health (${newHp}/${char.max_health})`);
    }

    if (item.spiritRestoreAmount) {
      const { spirit: newSp } = modifySpirit(interaction.user.id, item.spiritRestoreAmount);
      effects.push(`💙 Restored **${Math.min(item.spiritRestoreAmount, char.max_spirit - char.spirit)}** spirit (${newSp}/${char.max_spirit})`);
    }

    if (item.xpBonus) {
      const { leveledUp, newLevel } = addExperience(interaction.user.id, item.xpBonus);
      effects.push(`⭐ Gained **${item.xpBonus}** XP${leveledUp ? ` — **Level Up! Now level ${newLevel}!**` : ''}`);
    }

    if (effects.length === 0) {
      await interaction.reply({ embeds: [errorEmbed('This item has no usable effect.')], ephemeral: true });
      return;
    }

    removeFromInventory(interaction.user.id, itemId, 1);
    await interaction.reply({ embeds: [successEmbed(`Used ${item.emoji} **${item.name}**:\n${effects.join('\n')}`)] });
  },
};

export default command;
