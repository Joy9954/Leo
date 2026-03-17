import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { Command } from '../../client/BotClient';
import {
  getCharacter, upsertPlayer, getPlayerPets, removePet,
} from '../../database/PlayerRepository';
import { getPetById } from '../../game/PetEngine';
import { errorEmbed, successEmbed } from '../../utils/embeds';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('pet_release')
    .setDescription('Release a pet back into the wild')
    .addIntegerOption(opt =>
      opt.setName('pet_number').setDescription('Pet number to release (from /pet_list)').setRequired(true)
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
      await interaction.reply({ embeds: [errorEmbed(`Invalid pet number. Use \`/pet_list\` to see your pets.`)], ephemeral: true });
      return;
    }

    const pet = pets[petNumber - 1];
    const petDef = getPetById(pet.pet_id);

    const success = removePet(pet.id, interaction.user.id);

    if (success) {
      const embed = new EmbedBuilder()
        .setColor(0xe74c3c)
        .setTitle('🐾 Pet Released')
        .setDescription(`You released **${petDef?.name || pet.pet_id}** back into the wild.`);
      
      await interaction.reply({ embeds: [embed] });
    } else {
      await interaction.reply({ embeds: [errorEmbed('Failed to release pet.')] });
    }
  },
};

export default command;
