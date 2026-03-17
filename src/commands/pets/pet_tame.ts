import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { Command } from '../../client/BotClient';
import {
  getCharacter, upsertPlayer, getPlayerPets, addPet, getCooldown, setCooldown,
} from '../../database/PlayerRepository';
import { getAllPets, getPetById, attemptTame } from '../../game/PetEngine';
import { errorEmbed, successEmbed } from '../../utils/embeds';

const TAME_COOLDOWN = 120;

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('pet_tame')
    .setDescription('Attempt to tame a wild pet')
    .addStringOption(opt =>
      opt.setName('pet_id').setDescription('Specific pet ID to tame (optional)').setRequired(false)
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    upsertPlayer(interaction.user.id, interaction.user.username);
    const char = getCharacter(interaction.user.id);
    if (!char) {
      await interaction.reply({ embeds: [errorEmbed('No character found. Use `/create` to begin.')], ephemeral: true });
      return;
    }

    const cooldown = getCooldown(interaction.user.id, 'pet_tame');
    if (cooldown > 0) {
      await interaction.reply({ embeds: [errorEmbed(`You must wait ${formatCooldown(cooldown)} before taming again.`)], ephemeral: true });
      return;
    }

    const pets = getPlayerPets(interaction.user.id);
    if (pets.length >= 10) {
      await interaction.reply({ embeds: [errorEmbed('You have too many pets (max 10). Release some first.')], ephemeral: true });
      return;
    }

    const petId = interaction.options.getString('pet_id');
    let targetPet;

    if (petId) {
      targetPet = getPetById(petId);
      if (!targetPet) {
        await interaction.reply({ embeds: [errorEmbed('Pet not found. Use `/pet_list` to see available pets.')], ephemeral: true });
        return;
      }
    } else {
      targetPet = getAllPets()[Math.floor(Math.random() * getAllPets().length)];
    }

    const result = attemptTame(targetPet, char.luck);

    const embed = new EmbedBuilder()
      .setColor(result.success ? 0x2ecc71 : 0xe74c3c)
      .setTitle(`🐾 Taming Attempt`)
      .setDescription(result.message)
      .addFields(
        {
          name: 'Pet Details',
          value: `${targetPet.emoji} **${targetPet.name}** (${targetPet.rarity})\n${targetPet.description}`,
          inline: false,
        }
      );

    if (result.success) {
      addPet(interaction.user.id, targetPet.id);
      embed.addFields({
        name: 'Stats',
        value: `Attack: ${targetPet.baseAttack} | Defense: ${targetPet.baseDefense} | Health: ${targetPet.baseHealth}`,
        inline: true,
      });
    }

    setCooldown(interaction.user.id, 'pet_tame', TAME_COOLDOWN);

    await interaction.reply({ embeds: [embed] });
  },
};

function formatCooldown(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.ceil(seconds / 60)}m`;
  return `${Math.ceil(seconds / 3600)}h`;
}

export default command;
