import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
} from 'discord.js';
import { Command } from '../../client/BotClient';
import {
  getCharacter, upsertPlayer, getCooldown, setCooldown,
  createPvpChallenge, getPvpChallenge, resolvePvpChallenge,
  addExperience, modifyGold, updateCharacter, logCombat,
  getEquippedItems,
} from '../../database/PlayerRepository';
import { runPvpCombat } from '../../game/CombatEngine';
import { buildPvpCombatEmbed } from '../../utils/combatEmbed';
import { errorEmbed, formatCooldown, getPathwayColor, getSequenceName } from '../../utils/embeds';

const PVP_COOLDOWN = 120;

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('pvp')
    .setDescription('Challenge another player to a Beyonder duel')
    .addUserOption(opt => opt.setName('opponent').setDescription('The player to challenge').setRequired(true))
    .addIntegerOption(opt => opt.setName('wager').setDescription('Amount of gold to wager (optional)').setRequired(false).setMinValue(0).setMaxValue(10000)),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    upsertPlayer(interaction.user.id, interaction.user.username);
    const challenger = getCharacter(interaction.user.id);
    if (!challenger) {
      await interaction.reply({ embeds: [errorEmbed('No character found. Use `/create` to begin.')], ephemeral: true });
      return;
    }

    const opponent = interaction.options.getUser('opponent', true);
    if (opponent.id === interaction.user.id) {
      await interaction.reply({ embeds: [errorEmbed('You cannot challenge yourself!')], ephemeral: true });
      return;
    }

    const challenged = getCharacter(opponent.id);
    if (!challenged) {
      await interaction.reply({ embeds: [errorEmbed(`**${opponent.username}** has no character yet.`)], ephemeral: true });
      return;
    }

    const cooldown = getCooldown(interaction.user.id, 'pvp');
    if (cooldown > 0) {
      await interaction.reply({ embeds: [errorEmbed(`You must wait **${formatCooldown(cooldown)}** before initiating another PvP.`)], ephemeral: true });
      return;
    }

    const wager = interaction.options.getInteger('wager') ?? 0;
    if (wager > 0 && challenger.gold < wager) {
      await interaction.reply({ embeds: [errorEmbed(`You don't have enough gold to wager **${wager}**.`)], ephemeral: true });
      return;
    }

    if (wager > 0 && challenged.gold < wager) {
      await interaction.reply({ embeds: [errorEmbed(`**${challenged.name}** doesn't have enough gold to match a wager of **${wager}**.`)], ephemeral: true });
      return;
    }

    createPvpChallenge(interaction.user.id, opponent.id, wager);

    const challengeEmbed = new EmbedBuilder()
      .setColor(getPathwayColor(challenger.pathway))
      .setTitle('⚔️ Beyonder Duel Challenge!')
      .setDescription(
        `**${challenger.name}** (${getSequenceName(challenger.pathway, challenger.sequence)}) ` +
        `challenges **${challenged.name}** (${getSequenceName(challenged.pathway, challenged.sequence)}) to a duel!` +
        (wager > 0 ? `\n\n💰 Wager: **${wager}** gold each` : '')
      )
      .addFields(
        { name: `⚔️ ${challenger.name}`, value: `Level ${challenger.level} | HP: ${challenger.health}/${challenger.max_health}`, inline: true },
        { name: `⚔️ ${challenged.name}`, value: `Level ${challenged.level} | HP: ${challenged.health}/${challenged.max_health}`, inline: true },
      )
      .setFooter({ text: 'Challenge expires in 60 seconds' });

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId('accept_pvp').setLabel('⚔️ Accept').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('decline_pvp').setLabel('🏳️ Decline').setStyle(ButtonStyle.Secondary),
    );

    await interaction.reply({ content: `<@${opponent.id}>`, embeds: [challengeEmbed], components: [row] });

    const collector = interaction.channel?.createMessageComponentCollector({
      componentType: ComponentType.Button,
      filter: i => i.user.id === opponent.id && ['accept_pvp', 'decline_pvp'].includes(i.customId),
      time: 60000,
      max: 1,
    });

    if (!collector) return;

    collector.on('collect', async (btnInteraction) => {
      if (btnInteraction.customId === 'decline_pvp') {
        const challenge = getPvpChallenge(opponent.id);
        if (challenge) resolvePvpChallenge(challenge.id, 'declined');
        await btnInteraction.update({ embeds: [errorEmbed(`**${challenged.name}** declined the duel.`)], components: [] });
        return;
      }

      const challenge = getPvpChallenge(opponent.id);
      if (!challenge) return;
      resolvePvpChallenge(challenge.id, 'completed');

      const freshChallenger = getCharacter(interaction.user.id)!;
      const freshChallenged = getCharacter(opponent.id)!;
      const cEquipped = getEquippedItems(interaction.user.id);
      const dEquipped = getEquippedItems(opponent.id);

      const { result, challengerWon } = runPvpCombat(freshChallenger, freshChallenged, cEquipped, dEquipped);

      setCooldown(interaction.user.id, 'pvp', PVP_COOLDOWN);
      setCooldown(opponent.id, 'pvp', PVP_COOLDOWN);

      addExperience(interaction.user.id, result.xpGained);
      addExperience(opponent.id, result.xpGained);

      const winner = challengerWon ? interaction.user.id : opponent.id;
      const loser = challengerWon ? opponent.id : interaction.user.id;

      updateCharacter(winner, { wins: (challengerWon ? freshChallenger : freshChallenged).wins + 1 });
      updateCharacter(loser, { losses: (challengerWon ? freshChallenged : freshChallenger).losses + 1 });

      if (wager > 0) {
        modifyGold(loser, -wager);
        modifyGold(winner, wager);
      }

      logCombat(interaction.user.id, 'pvp', challenged.name, challengerWon ? 'win' : 'loss', result.xpGained, challengerWon ? wager : -wager);
      logCombat(opponent.id, 'pvp', challenger.name, challengerWon ? 'loss' : 'win', result.xpGained, challengerWon ? -wager : wager);

      const embed = buildPvpCombatEmbed(freshChallenger, freshChallenged, result, challengerWon, wager);
      await btnInteraction.update({ embeds: [embed], components: [] });
    });

    collector.on('end', async (collected) => {
      if (collected.size === 0) {
        await interaction.editReply({ embeds: [errorEmbed('The duel challenge expired.')], components: [] });
      }
    });
  },
};

export default command;
