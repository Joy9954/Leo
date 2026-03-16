import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { Command } from '../../client/BotClient';
import { getCharacter, upsertPlayer, updateCharacter, getCooldown, setCooldown } from '../../database/PlayerRepository';
import { getAvailableLocations, getAllLocations, getLocation } from '../../game/ExplorationEngine';
import { errorEmbed, formatCooldown, getPathwayColor } from '../../utils/embeds';

const TRAVEL_COOLDOWN = 60;

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('travel')
    .setDescription('Travel to a different location')
    .addStringOption(opt =>
      opt.setName('location').setDescription('Location to travel to (leave blank to see options)').setRequired(false)
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    upsertPlayer(interaction.user.id, interaction.user.username);
    const char = getCharacter(interaction.user.id);
    if (!char) {
      await interaction.reply({ embeds: [errorEmbed('No character found. Use `/create` to begin.')], ephemeral: true });
      return;
    }

    const locationArg = interaction.options.getString('location');

    if (!locationArg) {
      const available = getAvailableLocations(char.level);
      const all = getAllLocations();
      const lines = all.map(loc => {
        const unlocked = available.some(a => a.id === loc.id);
        const current = loc.id === char.location;
        return `${loc.emoji} **${loc.name}** \`${loc.id}\` — Min Level: ${loc.minLevel} ${current ? '*(current)*' : ''} ${unlocked ? '' : '🔒'}`;
      });
      const embed = new EmbedBuilder()
        .setColor(getPathwayColor(char.pathway))
        .setTitle('🗺️ Available Locations')
        .setDescription(lines.join('\n'))
        .setFooter({ text: 'Use /travel <location_id> to travel there' });
      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    const locationId = locationArg.toLowerCase().replace(/ /g, '_');
    const location = getLocation(locationId);
    if (!location) {
      await interaction.reply({ embeds: [errorEmbed(`Location \`${locationId}\` not found. Use \`/travel\` to see all locations.`)], ephemeral: true });
      return;
    }

    if (location.id === char.location) {
      await interaction.reply({ embeds: [errorEmbed(`You are already in **${location.name}**.`)], ephemeral: true });
      return;
    }

    if (char.level < location.minLevel) {
      await interaction.reply({ embeds: [errorEmbed(`You need to be level **${location.minLevel}** to travel to **${location.name}**. (Your level: ${char.level})`)], ephemeral: true });
      return;
    }

    const cooldown = getCooldown(interaction.user.id, 'travel');
    if (cooldown > 0) {
      await interaction.reply({ embeds: [errorEmbed(`You must wait **${formatCooldown(cooldown)}** before travelling again.`)], ephemeral: true });
      return;
    }

    setCooldown(interaction.user.id, 'travel', TRAVEL_COOLDOWN);
    updateCharacter(interaction.user.id, { location: locationId });

    const embed = new EmbedBuilder()
      .setColor(getPathwayColor(char.pathway))
      .setTitle(`${location.emoji} Arrived in ${location.name}`)
      .setDescription(location.description)
      .setFooter({ text: '⏱️ Travel cooldown: 60s' });

    await interaction.reply({ embeds: [embed] });
  },
};

export default command;
