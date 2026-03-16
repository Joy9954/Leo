import { EmbedBuilder } from 'discord.js';
import { Character } from '../database/PlayerRepository';
import pathwaysData from '../data/pathways.json';

interface PathwayData {
  id: string;
  name: string;
  chineseName: string;
  color: string;
  sequences: Array<{ number: number; name: string; description: string }>;
}

const pathways = pathwaysData as PathwayData[];

export function getPathwayColor(pathwayId: string): number {
  const pathway = pathways.find(p => p.id === pathwayId);
  if (!pathway) return 0x7289da;
  return parseInt(pathway.color.replace('#', ''), 16);
}

export function getPathwayName(pathwayId: string): string {
  return pathways.find(p => p.id === pathwayId)?.name ?? pathwayId;
}

export function getSequenceName(pathwayId: string, sequence: number): string {
  const pathway = pathways.find(p => p.id === pathwayId);
  const seq = pathway?.sequences.find(s => s.number === sequence);
  return seq?.name ?? `Sequence ${sequence}`;
}

export function buildCharacterEmbed(char: Character, _username: string): EmbedBuilder {
  const color = getPathwayColor(char.pathway);
  const pathwayName = getPathwayName(char.pathway);
  const seqName = getSequenceName(char.pathway, char.sequence);
  const pathway = pathways.find(p => p.id === char.pathway);
  const hpBar = buildBar(char.health, char.max_health, '❤️');
  const spBar = buildBar(char.spirit, char.max_spirit, '💙');
  const xpForNext = (char.level) * 100;
  const xpCurrent = char.experience % 100;
  const xpBar = buildBar(xpCurrent, xpForNext, '⭐');

  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(`${char.tarot_member ? '🃏 ' : ''}${char.name}`)
    .setDescription(char.tarot_member && char.tarot_codename ? `*Tarot Club Codename: **${char.tarot_codename}***` : '*A Beyonder walking the path of mystery*')
    .addFields(
      {
        name: '🃏 Pathway & Sequence',
        value: `**${pathwayName}** (${pathway?.chineseName ?? ''})\nSequence ${char.sequence} — **${seqName}**`,
        inline: true,
      },
      {
        name: '📊 Level',
        value: `**Level ${char.level}**\n${xpBar} ${xpCurrent}/${xpForNext} XP`,
        inline: true,
      },
      {
        name: '💰 Gold',
        value: `**${char.gold.toLocaleString()}** gold sovereigns`,
        inline: true,
      },
      {
        name: '❤️ Health',
        value: `${hpBar} ${char.health}/${char.max_health}`,
        inline: true,
      },
      {
        name: '💙 Spirit',
        value: `${spBar} ${char.spirit}/${char.max_spirit}`,
        inline: true,
      },
      {
        name: '📍 Location',
        value: char.location.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        inline: true,
      },
      {
        name: '⚔️ Stats',
        value: `STR **${char.strength}** | DEX **${char.dexterity}** | WIL **${char.willpower}** | LCK **${char.luck}**`,
        inline: false,
      },
      {
        name: '🏆 Combat Record',
        value: `Wins: **${char.wins}** | Losses: **${char.losses}**`,
        inline: true,
      }
    )
    .setFooter({ text: `Discord ID: ${char.player_id}` })
    .setTimestamp();

  return embed;
}

export function buildBar(current: number, max: number, emoji: string): string {
  const filled = Math.round((current / Math.max(1, max)) * 10);
  const empty = 10 - filled;
  return `${emoji} ${'█'.repeat(filled)}${'░'.repeat(empty)}`;
}

export function formatCooldown(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.ceil(seconds / 60)}m`;
  return `${Math.ceil(seconds / 3600)}h`;
}

export function errorEmbed(message: string): EmbedBuilder {
  return new EmbedBuilder().setColor(0xe74c3c).setDescription(`❌ ${message}`);
}

export function successEmbed(message: string): EmbedBuilder {
  return new EmbedBuilder().setColor(0x2ecc71).setDescription(`✅ ${message}`);
}

export function infoEmbed(title: string, message: string): EmbedBuilder {
  return new EmbedBuilder().setColor(0x3498db).setTitle(title).setDescription(message);
}
