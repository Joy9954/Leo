import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { Command } from '../../client/BotClient';
import {
  getCharacter, upsertPlayer, getPlayerPets, getActivePet,
} from '../../database/PlayerRepository';
import { getPetById, getPetCombatBonus } from '../../game/PetEngine';
import { errorEmbed, successEmbed } from '../../utils/embeds';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('pet_list')
    .setDescription('View your pets'),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    upsertPlayer(interaction.user.id, interaction.user.username);
    const char = getCharacter(interaction.user.id);
    if (!char) {
      await interaction.reply({ embeds: [errorEmbed('No character found. Use `/create` to begin.')], ephemeral: true });
      return;
    }

    const pets = getPlayerPets(interaction.user.id);
    const activePet = getActivePet(interaction.user.id);

    if (pets.length === 0) {
      await interaction.reply({ embeds: [infoEmbed('🐾 Your Pets', 'You have no pets yet. Use `/pet_tame` to find a companion!')] });
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(0x9b59b6)
      .setTitle('🐾 Your Pets');

    const petFields = pets.map(pet => {
      const petDef = getPetById(pet.pet_id);
      if (!petDef) return null;

      const isActive = activePet?.id === pet.id;
      const bonuses = getPetCombatBonus(petDef, pet.level, pet.loyalty);

      return {
        name: `${isActive ? '⭐ ' : ''}${petDef.emoji} ${pet.nickname || petDef.name}`,
        value: `Level: **${pet.level}** | Loyalty: **${pet.loyalty}**\nAttack: +${bonuses.attackBonus} | Defense: +${bonuses.defenseBonus}`,
        inline: true,
      };
    }).filter(Boolean);

    embed.addFields(petFields as any);

    await interaction.reply({ embeds: [embed] });
  },
};

function infoEmbed(title: string, message: string): EmbedBuilder {
  return new EmbedBuilder().setColor(0x3498db).setTitle(title).setDescription(message);
}

export default command;
