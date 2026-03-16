import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { Command } from '../../client/BotClient';
import { getCharacter, upsertPlayer, modifyHealth, modifySpirit, getCooldown, setCooldown } from '../../database/PlayerRepository';
import { errorEmbed, successEmbed, formatCooldown } from '../../utils/embeds';

const REST_COOLDOWN = 300;

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('rest')
    .setDescription('Rest to recover health and spirit'),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    upsertPlayer(interaction.user.id, interaction.user.username);
    const char = getCharacter(interaction.user.id);
    if (!char) {
      await interaction.reply({ embeds: [errorEmbed('No character found. Use `/create` to begin.')], ephemeral: true });
      return;
    }

    const cooldown = getCooldown(interaction.user.id, 'rest');
    if (cooldown > 0) {
      await interaction.reply({ embeds: [errorEmbed(`You must wait **${formatCooldown(cooldown)}** before resting again.`)], ephemeral: true });
      return;
    }

    setCooldown(interaction.user.id, 'rest', REST_COOLDOWN);

    const hpHeal = Math.floor(char.max_health * 0.5);
    const spRestore = Math.floor(char.max_spirit * 0.5);

    modifyHealth(interaction.user.id, hpHeal);
    modifySpirit(interaction.user.id, spRestore);

    const { health: newHp, maxHealth } = { health: Math.min(char.max_health, char.health + hpHeal), maxHealth: char.max_health };
    const { spirit: newSp, maxSpirit } = { spirit: Math.min(char.max_spirit, char.spirit + spRestore), maxSpirit: char.max_spirit };

    await interaction.reply({
      embeds: [
        successEmbed(
          `**${char.name}** rests in the fog...\n\n` +
          `❤️ Health: ${newHp}/${maxHealth} **(+${hpHeal})**\n` +
          `💙 Spirit: ${newSp}/${maxSpirit} **(+${spRestore})**\n\n` +
          `*Next rest available in ${formatCooldown(REST_COOLDOWN)}*`
        ),
      ],
    });
  },
};

export default command;
