import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuInteraction,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ComponentType,
  ModalSubmitInteraction,
} from 'discord.js';
import { Command } from '../../client/BotClient';
import { upsertPlayer, getCharacter, createCharacter } from '../../database/PlayerRepository';
import pathwaysData from '../../data/pathways.json';
import { getPathwayColor, errorEmbed } from '../../utils/embeds';

interface PathwayData {
  id: string;
  name: string;
  chineseName: string;
  description: string;
  color: string;
  sequences: Array<{ number: number; name: string; description: string }>;
}

const pathways = pathwaysData as PathwayData[];

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('create')
    .setDescription('Create your Beyonder character and choose a pathway'),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const existing = getCharacter(interaction.user.id);
    if (existing) {
      await interaction.reply({ embeds: [errorEmbed(`You already have a character: **${existing.name}**. Use \`/profile\` to view it.`)], ephemeral: true });
      return;
    }

    const pathwayOptions = pathways.map(p => ({
      label: `${p.name} (${p.chineseName})`,
      description: p.description.substring(0, 100),
      value: p.id,
    }));

    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('select_pathway')
        .setPlaceholder('Choose your pathway...')
        .addOptions(pathwayOptions.slice(0, 25))
    );

    const embed = new EmbedBuilder()
      .setColor(0x9b59b6)
      .setTitle('🃏 Choose Your Beyonder Pathway')
      .setDescription(
        'The 22 pathways of the Lord of Mysteries are before you.\n\n' +
        'Each pathway represents a unique journey through the Beyonder world.\n' +
        'Choose wisely — this decision will define your character forever.\n\n' +
        '*(Select a pathway from the dropdown below)*'
      )
      .setFooter({ text: 'Lord of Mysteries RPG Bot' });

    await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });

    const collector = interaction.channel?.createMessageComponentCollector({
      componentType: ComponentType.StringSelect,
      filter: i => i.user.id === interaction.user.id && i.customId === 'select_pathway',
      time: 60000,
      max: 1,
    });

    if (!collector) return;

    collector.on('collect', async (selectInteraction: StringSelectMenuInteraction) => {
      const pathwayId = selectInteraction.values[0];
      const pathway = pathways.find(p => p.id === pathwayId);
      if (!pathway) return;

      const modal = new ModalBuilder()
        .setCustomId(`name_modal_${pathwayId}`)
        .setTitle(`${pathway.name} — Name Your Character`);

      const nameInput = new TextInputBuilder()
        .setCustomId('character_name')
        .setLabel('Character Name (2–32 characters)')
        .setStyle(TextInputStyle.Short)
        .setMinLength(2)
        .setMaxLength(32)
        .setPlaceholder('Enter your character name...')
        .setRequired(true);

      modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(nameInput));
      await selectInteraction.showModal(modal);

      let modalInteraction: ModalSubmitInteraction;
      try {
        modalInteraction = await selectInteraction.awaitModalSubmit({
          filter: i => i.user.id === interaction.user.id && i.customId === `name_modal_${pathwayId}`,
          time: 60000,
        });
      } catch {
        await interaction.followUp({ embeds: [errorEmbed('Character creation timed out.')], ephemeral: true });
        return;
      }

      const name = modalInteraction.fields.getTextInputValue('character_name').trim();
      const seq9 = pathway.sequences.find(s => s.number === 9);

      const statRoll = () => Math.floor(Math.random() * 6) + 5;
      const stats = {
        strength: statRoll(),
        dexterity: statRoll(),
        willpower: statRoll(),
        luck: statRoll(),
      };

      upsertPlayer(interaction.user.id, interaction.user.username);
      const char = createCharacter(interaction.user.id, name, pathwayId, stats);

      const successEmbed = new EmbedBuilder()
        .setColor(getPathwayColor(pathwayId))
        .setTitle('✨ Character Created!')
        .setDescription(
          `Welcome to the world of Lord of Mysteries, **${char.name}**!\n\n` +
          `You have chosen the **${pathway.name}** pathway.\n` +
          `You begin your journey as a **${seq9?.name ?? 'Beyonder'}** at Sequence 9.`
        )
        .addFields(
          { name: '💪 Strength', value: `${stats.strength}`, inline: true },
          { name: '🏃 Dexterity', value: `${stats.dexterity}`, inline: true },
          { name: '🧠 Willpower', value: `${stats.willpower}`, inline: true },
          { name: '🍀 Luck', value: `${stats.luck}`, inline: true },
          { name: '❤️ Max Health', value: `${char.max_health}`, inline: true },
          { name: '💙 Max Spirit', value: `${char.max_spirit}`, inline: true },
        )
        .setFooter({ text: 'Use /profile to view your character. Use /explore to begin your adventure!' });

      await modalInteraction.reply({ embeds: [successEmbed] });
    });

    collector.on('end', async (collected) => {
      if (collected.size === 0) {
        await interaction.editReply({ embeds: [errorEmbed('Character creation timed out.')], components: [] });
      }
    });
  },
};

export default command;
