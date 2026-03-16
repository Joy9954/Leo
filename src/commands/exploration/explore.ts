import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { Command } from '../../client/BotClient';
import {
  getCharacter, upsertPlayer, getCooldown, setCooldown,
  addToInventory, modifyGold,
} from '../../database/PlayerRepository';
import { explore, scaleMonsterToPlayer, getLocation } from '../../game/ExplorationEngine';
import { runPveCombat } from '../../game/CombatEngine';
import { updateQuestProgressForAction } from '../../game/QuestManager';
import { getEquippedItems } from '../../database/PlayerRepository';
import { buildCombatEmbed } from '../../utils/combatEmbed';
import { errorEmbed, formatCooldown, getPathwayColor } from '../../utils/embeds';

const EXPLORE_COOLDOWN = 30;

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('explore')
    .setDescription('Explore your current location for resources, events, and encounters'),

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

    const cooldown = getCooldown(interaction.user.id, 'explore');
    if (cooldown > 0) {
      await interaction.reply({ embeds: [errorEmbed(`You must wait **${formatCooldown(cooldown)}** before exploring again.`)], ephemeral: true });
      return;
    }

    setCooldown(interaction.user.id, 'explore', EXPLORE_COOLDOWN);

    const location = getLocation(char.location);
    const result = explore(char);

    updateQuestProgressForAction(interaction.user.id, 'explore');

    if (result.type === 'encounter' && result.monster) {
      const scaled = scaleMonsterToPlayer(result.monster, char.level);
      const equipped = getEquippedItems(interaction.user.id);
      const combatResult = runPveCombat(char, scaled, equipped);

      const completedQuests = updateQuestProgressForAction(
        interaction.user.id,
        'defeat_monster',
        result.monster.id
      );
      updateQuestProgressForAction(interaction.user.id, 'any_combat');

      await interaction.reply({ embeds: [buildCombatEmbed(char, scaled, combatResult, completedQuests)], ephemeral: false });
      return;
    }

    if (result.type === 'resource' && result.resources) {
      for (const res of result.resources) {
        addToInventory(interaction.user.id, res);
      }
      if (result.goldFound) {
        modifyGold(interaction.user.id, result.goldFound);
      }
    }

    const embed = new EmbedBuilder()
      .setColor(getPathwayColor(char.pathway))
      .setTitle(`${location?.emoji ?? '🗺️'} Exploring ${location?.name ?? char.location}`)
      .setDescription(result.message);

    if (result.type === 'resource' && result.resources) {
      embed.addFields({
        name: '📦 Found',
        value: result.resources.map(r => `\`${r}\``).join(', ') + (result.goldFound ? ` + **${result.goldFound}** gold` : ''),
        inline: false,
      });
    }

    embed.setFooter({ text: `⏱️ Explore cooldown: ${EXPLORE_COOLDOWN}s` });
    await interaction.reply({ embeds: [embed] });
  },
};

export default command;
