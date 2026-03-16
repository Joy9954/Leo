import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { Command } from '../../client/BotClient';
import {
  getCharacter, upsertPlayer, getCooldown, setCooldown,
  getEquippedItems, addToInventory, modifyGold, addExperience,
  updateCharacter, logCombat,
} from '../../database/PlayerRepository';
import { getLocationMonster, scaleMonsterToPlayer, getMonster } from '../../game/ExplorationEngine';
import { runPveCombat } from '../../game/CombatEngine';
import { updateQuestProgressForAction } from '../../game/QuestManager';
import { buildCombatEmbed } from '../../utils/combatEmbed';
import { errorEmbed, formatCooldown } from '../../utils/embeds';

const FIGHT_COOLDOWN = 45;

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('fight')
    .setDescription('Fight a monster in your current location')
    .addStringOption(opt =>
      opt.setName('monster').setDescription('Specific monster ID to fight (optional)').setRequired(false)
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

    const cooldown = getCooldown(interaction.user.id, 'fight');
    if (cooldown > 0) {
      await interaction.reply({ embeds: [errorEmbed(`You must wait **${formatCooldown(cooldown)}** before fighting again.`)], ephemeral: true });
      return;
    }

    const monsterId = interaction.options.getString('monster');
    const monster = monsterId
      ? getMonster(monsterId)
      : getLocationMonster(char.location, char.level);

    if (!monster) {
      await interaction.reply({ embeds: [errorEmbed('No monsters found here. Try exploring or travelling to a different area.')], ephemeral: true });
      return;
    }

    const scaled = scaleMonsterToPlayer(monster, char.level);
    const equipped = getEquippedItems(interaction.user.id);
    const combatResult = runPveCombat(char, scaled, equipped);

    setCooldown(interaction.user.id, 'fight', FIGHT_COOLDOWN);

    const playerWon = combatResult.winner === 'player';

    if (playerWon) {
      addExperience(interaction.user.id, combatResult.xpGained);
      modifyGold(interaction.user.id, combatResult.goldGained);
      for (const loot of combatResult.lootGained) {
        addToInventory(interaction.user.id, loot);
      }
      updateCharacter(interaction.user.id, { wins: char.wins + 1, health: combatResult.playerHpRemaining });
    } else {
      updateCharacter(interaction.user.id, {
        losses: char.losses + 1,
        health: Math.max(1, Math.floor(char.max_health * 0.1)),
      });
      addExperience(interaction.user.id, combatResult.xpGained);
    }

    logCombat(interaction.user.id, 'pve', scaled.name, playerWon ? 'win' : 'loss', combatResult.xpGained, combatResult.goldGained);

    const completedQuests = playerWon
      ? [
          ...updateQuestProgressForAction(interaction.user.id, 'defeat_monster', monster.id),
          ...updateQuestProgressForAction(interaction.user.id, 'any_combat'),
        ]
      : [];

    await interaction.reply({ embeds: [buildCombatEmbed(char, scaled, combatResult, completedQuests)] });
  },
};

export default command;
