import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { Command } from '../../client/BotClient';
import {
  getCharacter, upsertPlayer, getPlayerPets, setActivePet,
} from '../../database/PlayerRepository';
import { getPetById } from '../../game/PetEngine';
import { errorEmbed, successEmbed } from '../../utils/embeds';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('pet_setactive')
    .setDescription('Set your active pet for combat')
    .addIntegerOption(opt =>
      opt.setName('pet_number').setDescription('Pet number to set as active (from /pet_list)').setRequired(true)
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    upsertPlayer(interaction.user.id, interaction.user.username);
    const char = getCharacter(interaction.user.id);
    if (!char) {
      await interaction.reply({ embeds: [errorEmbed('No character found. Use `/create` to begin.')], ephemeral: true });
      return;
    }

    const petNumber = interaction.options.getInteger('pet_number')!;
    const pets = getPlayerPets(interaction.user.id);

    if (petNumber < 1 || petNumber > pets.length) {
      await interaction.reply({ embeds: [errorEmbed('Invalid pet number. Use `/pet_list` to see your pets.')], ephemeral: true });
      return;
    }

    const pet = pets[petNumber - 1];
    const petDef = getPetById(pet.pet_id);

    const success = setActivePet(interaction.user.id, pet.id);

    if (success) {
      const embed = new EmbedBuilder()
        .setColor(0x2ecc71)
        .setTitle('🐾 Active Pet Set')
        .setDescription(`**${petDef?.name || pet.pet_id}** is now your active pet!`);
      
      await interaction.reply({ embeds: [embed] });
    } else {
      await interaction.reply({ embeds: [errorEmbed('Failed to set active pet.')] });
    }
  },
};

export default command;
