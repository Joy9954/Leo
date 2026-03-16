import { EmbedBuilder } from 'discord.js';
import { Character } from '../database/PlayerRepository';
import { MonsterDef } from '../game/ExplorationEngine';
import { CombatResult } from '../game/CombatEngine';
import { buildBar, getSequenceName } from './embeds';
import itemsData from '../data/items.json';

type ItemEntry = { id: string; name: string };
const allItems: ItemEntry[] = [
  ...(itemsData.materials as ItemEntry[]),
  ...(itemsData.weapons as ItemEntry[]),
  ...(itemsData.armor as ItemEntry[]),
  ...(itemsData.consumables as ItemEntry[]),
];

function getItemName(itemId: string): string {
  return allItems.find(i => i.id === itemId)?.name ?? itemId;
}

export function buildCombatEmbed(
  char: Character,
  monster: MonsterDef,
  result: CombatResult,
  completedQuests: string[] = []
): EmbedBuilder {
  const playerWon = result.winner === 'player';
  const color = playerWon ? 0x2ecc71 : 0xe74c3c;
  const title = playerWon
    ? `⚔️ Victory! You defeated ${monster.emoji} ${monster.name}!`
    : `💀 Defeated! ${monster.emoji} ${monster.name} overpowered you!`;

  const roundLines = result.rounds.slice(0, 5).map(r =>
    `**Round ${r.round}:** You dealt **${r.playerDamage}** dmg${r.playerUsedPower ? ` *(${r.powerName})*` : ''} | ${monster.emoji} dealt **${r.opponentDamage}** dmg`
  );
  if (result.rounds.length > 5) {
    roundLines.push(`*...and ${result.rounds.length - 5} more rounds*`);
  }

  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(title)
    .addFields({
      name: '⚔️ Battle Log',
      value: roundLines.join('\n') || 'No rounds recorded.',
      inline: false,
    });

  const seqName = getSequenceName(char.pathway, char.sequence);
  embed.addFields(
    {
      name: `🧑 ${char.name} (${seqName})`,
      value: `${buildBar(result.playerHpRemaining, char.max_health, '❤️')} ${result.playerHpRemaining}/${char.max_health} HP`,
      inline: true,
    },
    {
      name: `${monster.emoji} ${monster.name}`,
      value: `${buildBar(Math.max(0, result.opponentHpRemaining), monster.health, '❤️')} ${Math.max(0, result.opponentHpRemaining)}/${monster.health} HP`,
      inline: true,
    }
  );

  if (playerWon) {
    const rewards: string[] = [
      `⭐ **+${result.xpGained}** XP`,
      `💰 **+${result.goldGained}** gold`,
    ];
    if (result.lootGained.length > 0) {
      rewards.push(`📦 Loot: ${result.lootGained.map(l => `**${getItemName(l)}**`).join(', ')}`);
    }
    embed.addFields({ name: '🎁 Rewards', value: rewards.join('\n'), inline: false });
  } else {
    embed.addFields({
      name: '💔 Defeat',
      value: `You were defeated and lost consciousness. Your health has been reduced to 10%. Use \`/rest\` to recover.`,
      inline: false,
    });
  }

  if (completedQuests.length > 0) {
    embed.addFields({
      name: '📜 Quest Progress',
      value: completedQuests.map(q => `✅ Quest completed: \`${q}\``).join('\n'),
      inline: false,
    });
  }

  return embed;
}

export function buildPvpCombatEmbed(
  challenger: Character,
  challenged: Character,
  result: CombatResult,
  challengerWon: boolean,
  wager: number
): EmbedBuilder {
  const color = 0x9b59b6;
  const winner = challengerWon ? challenger : challenged;
  const loser = challengerWon ? challenged : challenger;

  const roundLines = result.rounds.slice(0, 5).map(r =>
    `**Round ${r.round}:** ${challenger.name} dealt **${r.playerDamage}** dmg${r.playerUsedPower ? ` *(${r.powerName})*` : ''} | ${challenged.name} dealt **${r.opponentDamage}** dmg`
  );

  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(`⚔️ PvP Combat: ${challenger.name} vs ${challenged.name}`)
    .addFields(
      {
        name: '⚔️ Battle Log',
        value: roundLines.join('\n') || 'No rounds recorded.',
        inline: false,
      },
      {
        name: `🏆 Winner: ${winner.name}`,
        value: `${buildBar(challengerWon ? result.playerHpRemaining : result.opponentHpRemaining, winner.max_health, '❤️')}`,
        inline: true,
      },
      {
        name: `💀 Loser: ${loser.name}`,
        value: `${buildBar(challengerWon ? result.opponentHpRemaining : result.playerHpRemaining, loser.max_health, '❤️')}`,
        inline: true,
      }
    );

  if (wager > 0) {
    embed.addFields({
      name: '💰 Wager',
      value: `**${winner.name}** wins **${wager * 2}** gold!`,
      inline: false,
    });
  }

  embed.addFields({
    name: '⭐ XP Gained',
    value: `Both combatants gain **${result.xpGained}** XP`,
    inline: false,
  });

  return embed;
}
