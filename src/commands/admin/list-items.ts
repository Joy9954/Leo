import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { Command } from '../../client/BotClient';
import { getCustomItems, deleteCustomItem } from '../../database/PlayerRepository';
import { errorEmbed, successEmbed } from '../../utils/embeds';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('a-list-items')
    .setDescription('[ADMIN] List or delete custom items')
    .addStringOption(opt =>
      opt.setName('action').setDescription('Action to perform').setRequired(true)
        .addChoices(
          { name: 'List All', value: 'list' },
          { name: 'Delete', value: 'delete' }
        )
    )
    .addStringOption(opt =>
      opt.setName('item_id').setDescription('Item ID to delete (required for delete action)').setRequired(false)
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    // Check if user has administrator permission
    if (!interaction.memberPermissions?.has('Administrator')) {
      await interaction.reply({ embeds: [errorEmbed('You need Administrator permission to use this command.')], ephemeral: true });
      return;
    }

    const action = interaction.options.getString('action', true);

    if (action === 'list') {
      const items = getCustomItems();
      if (items.length === 0) {
        await interaction.reply({ embeds: [errorEmbed('No custom items found.')], ephemeral: true });
        return;
      }

      const embed = new EmbedBuilder()
        .setColor(0x3498db)
        .setTitle('📋 Custom Items')
        .setDescription(`Total: ${items.length} items`);

      const weapons = items.filter(i => i.type === 'weapon');
      const armor = items.filter(i => i.type === 'armor');
      const consumables = items.filter(i => i.type === 'consumable');

      if (weapons.length > 0) {
        embed.addFields({
          name: '⚔️ Weapons',
          value: weapons.map(w => `${w.emoji} \`${w.id}\` ${w.name} (+${w.attack_bonus} ATK) - ${w.price}g`).join('\n'),
          inline: false
        });
      }

      if (armor.length > 0) {
        embed.addFields({
          name: '🛡️ Armor',
          value: armor.map(a => `${a.emoji} \`${a.id}\` ${a.name} (+${a.defense_bonus} DEF) - ${a.price}g`).join('\n'),
          inline: false
        });
      }

      if (consumables.length > 0) {
        embed.addFields({
          name: '🧪 Consumables',
          value: consumables.map(c => {
            const effects = [];
            if (c.heal_amount) effects.push(`❤️${c.heal_amount}`);
            if (c.spirit_restore_amount) effects.push(`💙${c.spirit_restore_amount}`);
            if (c.xp_bonus) effects.push(`⭐${c.xp_bonus}`);
            return `${c.emoji} \`${c.id}\` ${c.name} (${effects.join(', ')}) - ${c.price}g`;
          }).join('\n'),
          inline: false
        });
      }

      await interaction.reply({ embeds: [embed], ephemeral: true });

    } else if (action === 'delete') {
      const itemId = interaction.options.getString('item_id');
      if (!itemId) {
        await interaction.reply({ embeds: [errorEmbed('Please provide an item ID to delete.')], ephemeral: true });
        return;
      }

      const success = deleteCustomItem(itemId, interaction.user.id);
      if (!success) {
        await interaction.reply({ embeds: [errorEmbed('Item not found or you do not have permission to delete it.')], ephemeral: true });
        return;
      }

      await interaction.reply({ embeds: [successEmbed(`Successfully deleted custom item \`${itemId}\`.`)] });
    }
  },
};

export default command;