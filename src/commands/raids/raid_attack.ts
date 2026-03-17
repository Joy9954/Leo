import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { Command } from '../../client/BotClient';
import {
  getCharacter, upsertPlayer, getEquippedItems, modifyGold, addExperience, addToInventory, getCooldown, setCooldown,
} from '../../database/PlayerRepository';
import { attackRaid, getRaidById, getRaidDefById } from '../../game/RaidEngine';
import { getPetById, getPetCombatBonus } from '../../game/PetEngine';
import { getActivePet } from '../../database/PlayerRepository';
import { getEquippedAttackBonus, getEquippedDefenseBonus } from '../../game/CombatEngine';
import { errorEmbed, successEmbed, buildBar } from '../../utils/embeds';

const RAID_COOLDOWN = 30;

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('raid_attack')
    .setDescription('Attack a raid boss')
    .addIntegerOption(opt =>
      opt.setName('raid_id').setDescription('Raid ID to attack').setRequired(true)
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    upsertPlayer(interaction.user.id, interaction.user.username);
    const char = getCharacter(interaction.user.id);
    if (!char) {
      await interaction.reply({ embeds: [errorEmbed('No character found. Use `/create` to begin.')], ephemeral: true });
      return;
    }

    if (char.health <= 0) {
      await interaction.reply({ embeds: [errorEmbed('You are unconscious! Use `/rest` to recover.')], ephemeral: true });
      return;
    }

    const cooldown = getCooldown(interaction.user.id, 'raid_attack');
    if (cooldown > 0) {
      await interaction.reply({ embeds: [errorEmbed(`You must wait ${formatCooldown(cooldown)} before attacking again.`)], ephemeral: true });
      return;
    }

    const raidId = interaction.options.getInteger('raid_id')!;
    const raid = getRaidById(raidId);

    if (!raid || raid.status !== 'active') {
      await interaction.reply({ embeds: [errorEmbed('Raid not found or already completed. Use `/raid_list` to see active raids.')], ephemeral: true });
      return;
    }

    const raidDef = getRaidDefById(raid.raid_id);
    if (!raidDef) {
      await interaction.reply({ embeds: [errorEmbed('Raid data not found.')] });
      return;
    }

    if (char.level < raidDef.minLevel) {
      await interaction.reply({ embeds: [errorEmbed(`You need to be level ${raidDef.minLevel} to attack this raid.`)], ephemeral: true });
      return;
    }

    const equipped = getEquippedItems(interaction.user.id);
    const baseAttack = getEquippedAttackBonus(equipped);
    const baseDefense = getEquippedDefenseBonus(equipped);

    const activePet = getActivePet(interaction.user.id);
    let petBonus = { attackBonus: 0, defenseBonus: 0, healthBonus: 0 };
    if (activePet) {
      const petDef = getPetById(activePet.pet_id);
      if (petDef) {
        petBonus = getPetCombatBonus(petDef, activePet.level, activePet.loyalty);
      }
    }

    const playerAttack = char.strength + baseAttack + Math.floor(char.level * 0.5) + petBonus.attackBonus;
    const playerDefense = Math.floor(char.willpower / 2) + baseDefense + petBonus.defenseBonus;

    const result = attackRaid(raidId, interaction.user.id, playerAttack, playerDefense);

    setCooldown(interaction.user.id, 'raid_attack', RAID_COOLDOWN);

    const hpPercent = Math.floor((result.hpRemaining / raidDef.health) * 100);
    const hpBar = buildBar(result.hpRemaining, raidDef.health, '❤️');

    const embed = new EmbedBuilder()
      .setColor(result.defeated ? 0x2ecc71 : 0xe74c3c)
      .setTitle(`${raidDef.emoji} Raid Battle`)
      .setDescription(`**You dealt ${result.damage} damage!**\nBoss dealt ${result.bossDamage} damage to you.\n\n**Boss HP:** ${hpBar} ${result.hpRemaining}/${raidDef.health} (${hpPercent}%)`);

    if (result.defeated) {
      embed.setTitle('🎉 Raid Defeated!');
      
      if (result.rewards) {
        addExperience(interaction.user.id, result.rewards.xp);
        modifyGold(interaction.user.id, result.rewards.gold);
        
        for (const itemId of result.rewards.items) {
          addToInventory(interaction.user.id, itemId);
        }

        embed.addFields({
          name: '🏆 Rewards',
          value: `XP: +${result.rewards.xp}\nGold: +${result.rewards.gold}\nItems: ${result.rewards.items.join(', ') || 'None'}`,
          inline: false,
        });
      }
    }

    const newHealth = Math.max(1, char.health - result.bossDamage);
    const { updateCharacter } = await import('../../database/PlayerRepository');
    updateCharacter(interaction.user.id, { health: newHealth });

    await interaction.reply({ embeds: [embed] });
  },
};

function formatCooldown(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.ceil(seconds / 60)}m`;
  return `${Math.ceil(seconds / 3600)}h`;
}

export default command;
