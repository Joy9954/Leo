import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { Command } from '../../client/BotClient';
import {
  getCharacter, upsertPlayer, getPlayerPets,
} from '../../database/PlayerRepository';
import { getPetById, getPetCombatBonus } from '../../game/PetEngine';
import { errorEmbed } from '../../utils/embeds';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('pet_stats')
    .setDescription('View detailed stats for a pet')
    .addIntegerOption(opt =>
      opt.setName('pet_number').setDescription('Pet number (from /pet_list)').setRequired(true)
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

    if (!petDef) {
      await interaction.reply({ embeds: [errorEmbed('Pet data not found.')] });
      return;
    }

    const bonuses = getPetCombatBonus(petDef, pet.level, pet.loyalty);
    const petDefAny = petDef as any;
    const evolution = pet.level >= 20 && petDefAny.rarity === 'common' ? 'Ready to evolve!' : 
                      pet.level >= 40 && petDefAny.rarity === 'rare' ? 'Ready to evolve!' : 'N/A';

    const embed = new EmbedBuilder()
      .setColor(0x9b59b6)
      .setTitle(`${petDef.emoji} ${pet.nickname || petDef.name}`)
      .setDescription(petDef.description)
      .addFields(
        { name: 'Rarity', value: petDef.rarity.charAt(0).toUpperCase() + petDef.rarity.slice(1), inline: true },
        { name: 'Type', value: petDef.type, inline: true },
        { name: 'Level', value: `${pet.level}`, inline: true },
        { name: 'Loyalty', value: `${pet.loyalty}/100`, inline: true },
        { name: 'XP', value: `${pet.earned_xp}`, inline: true },
        { name: 'Evolution', value: evolution, inline: true },
        { name: '⚔️ Combat Bonuses', value: `Attack: **+${bonuses.attackBonus}**\nDefense: **+${bonuses.defenseBonus}**\nHealth: **+${bonuses.healthBonus}**`, inline: false },
        { name: 'Base Stats', value: `Attack: ${petDef.baseAttack} | Defense: ${petDef.baseDefense} | Health: ${petDef.baseHealth}`, inline: false }
      );

    await interaction.reply({ embeds: [embed] });
  },
};

export default command;
