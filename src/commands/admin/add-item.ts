import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { Command } from '../../client/BotClient';
import { addCustomItem } from '../../database/PlayerRepository';
import { errorEmbed } from '../../utils/embeds';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('a-add-item')
    .setDescription('[ADMIN] Add a custom item to the game')
    .addStringOption(opt =>
      opt.setName('id').setDescription('Unique item ID').setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('name').setDescription('Item name').setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('type').setDescription('Item type').setRequired(true)
        .addChoices(
          { name: 'Weapon', value: 'weapon' },
          { name: 'Armor', value: 'armor' },
          { name: 'Consumable', value: 'consumable' }
        )
    )
    .addStringOption(opt =>
      opt.setName('description').setDescription('Item description').setRequired(true)
    )
    .addIntegerOption(opt =>
      opt.setName('price').setDescription('Item price in gold').setRequired(true).setMinValue(0)
    )
    .addStringOption(opt =>
      opt.setName('emoji').setDescription('Item emoji').setRequired(true)
    )
    .addIntegerOption(opt =>
      opt.setName('attack_bonus').setDescription('Attack bonus (weapons only)').setRequired(false).setMinValue(0)
    )
    .addIntegerOption(opt =>
      opt.setName('defense_bonus').setDescription('Defense bonus (armor only)').setRequired(false).setMinValue(0)
    )
    .addIntegerOption(opt =>
      opt.setName('spirit_bonus').setDescription('Spirit bonus').setRequired(false).setMinValue(0)
    )
    .addIntegerOption(opt =>
      opt.setName('heal_amount').setDescription('Heal amount (consumables only)').setRequired(false).setMinValue(0)
    )
    .addIntegerOption(opt =>
      opt.setName('spirit_restore').setDescription('Spirit restore amount (consumables only)').setRequired(false).setMinValue(0)
    )
    .addIntegerOption(opt =>
      opt.setName('xp_bonus').setDescription('XP bonus (consumables only)').setRequired(false).setMinValue(0)
    )
    .addIntegerOption(opt =>
      opt.setName('required_level').setDescription('Required level to use/buy').setRequired(false).setMinValue(1)
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    // Check if user has administrator permission
    if (!interaction.memberPermissions?.has('Administrator')) {
      await interaction.reply({ embeds: [errorEmbed('You need Administrator permission to use this command.')], ephemeral: true });
      return;
    }

    const id = interaction.options.getString('id', true).toLowerCase().replace(/ /g, '_');
    const name = interaction.options.getString('name', true);
    const type = interaction.options.getString('type', true);
    const description = interaction.options.getString('description', true);
    const price = interaction.options.getInteger('price', true);
    const emoji = interaction.options.getString('emoji', true);

    const options: {
      attackBonus?: number;
      defenseBonus?: number;
      spiritBonus?: number;
      healAmount?: number;
      spiritRestoreAmount?: number;
      xpBonus?: number;
      requiredLevel?: number;
    } = {
      attackBonus: interaction.options.getInteger('attack_bonus') || 0,
      defenseBonus: interaction.options.getInteger('defense_bonus') || 0,
      spiritBonus: interaction.options.getInteger('spirit_bonus') || 0,
      healAmount: interaction.options.getInteger('heal_amount') || 0,
      spiritRestoreAmount: interaction.options.getInteger('spirit_restore') || 0,
      xpBonus: interaction.options.getInteger('xp_bonus') || 0,
      requiredLevel: interaction.options.getInteger('required_level') || 1,
    };

    // Validate based on type
    if (type === 'weapon' && !options.attackBonus) {
      await interaction.reply({ embeds: [errorEmbed('Weapons must have an attack bonus.')], ephemeral: true });
      return;
    }
    if (type === 'armor' && !options.defenseBonus) {
      await interaction.reply({ embeds: [errorEmbed('Armor must have a defense bonus.')], ephemeral: true });
      return;
    }
    if (type === 'consumable' && !options.healAmount && !options.spiritRestoreAmount && !options.xpBonus) {
      await interaction.reply({ embeds: [errorEmbed('Consumables must have at least one effect (heal, spirit restore, or XP bonus).')], ephemeral: true });
      return;
    }

    const success = addCustomItem(id, name, type, description, price, emoji, interaction.user.id, options);

    if (!success) {
      await interaction.reply({ embeds: [errorEmbed('Failed to add item. Item ID might already exist.')], ephemeral: true });
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(0x2ecc71)
      .setTitle('✅ Custom Item Added')
      .addFields(
        { name: 'ID', value: `\`${id}\``, inline: true },
        { name: 'Name', value: `${emoji} ${name}`, inline: true },
        { name: 'Type', value: type, inline: true },
        { name: 'Price', value: `${price} gold`, inline: true },
        { name: 'Required Level', value: `${options.requiredLevel}`, inline: true },
      )
      .setDescription(description)
      .setFooter({ text: `Added by ${interaction.user.username}` });

    if (type === 'weapon') {
      embed.addFields({ name: 'Attack Bonus', value: `+${options.attackBonus}`, inline: true });
    } else if (type === 'armor') {
      embed.addFields({ name: 'Defense Bonus', value: `+${options.defenseBonus}`, inline: true });
    } else if (type === 'consumable') {
      const effects = [];
      if (options.healAmount) effects.push(`❤️ Heal ${options.healAmount} HP`);
      if (options.spiritRestoreAmount) effects.push(`💙 Restore ${options.spiritRestoreAmount} Spirit`);
      if (options.xpBonus) effects.push(`⭐ +${options.xpBonus} XP`);
      embed.addFields({ name: 'Effects', value: effects.join('\n'), inline: false });
    }

    if (options.spiritBonus) {
      embed.addFields({ name: 'Spirit Bonus', value: `+${options.spiritBonus}`, inline: true });
    }

    await interaction.reply({ embeds: [embed] });
  },
};

export default command;