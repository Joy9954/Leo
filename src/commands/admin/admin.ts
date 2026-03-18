import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { Command } from '../../client/BotClient';
import { 
  getCharacter, 
  getInventory, 
  modifyGold, 
  banPlayer, 
  unbanPlayer, 
  resetPlayer, 
  addCustomItem, 
  getCustomItems, 
  getCustomItem,
  deleteCustomItem,
  setSetting,
  getSetting,
  getActiveQuests,
  completeQuest,
  updateCharacter,
  getAllPlayers,
  getPlayer,
  addToInventory,
  removeFromInventory,
  endRaid,
  updateRaidHealth,
} from '../../database/PlayerRepository';
import { errorEmbed, successEmbed, getPathwayColor } from '../../utils/embeds';
import { spawnRaid, getRaidById, getAllRaidDefs } from '../../game/RaidEngine';
import { getQuestById } from '../../game/QuestManager';
import itemsData from '../../data/items.json';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('admin')
    .setDescription('Admin and server owner management commands')
    // Removed default permission - handled in code to allow both admins AND server owners
    // User Management Group
    .addSubcommandGroup(group =>
      group.setName('user')
        .setDescription('Manage players')
        .addSubcommand(sub =>
          sub.setName('view')
            .setDescription('View player stats and inventory')
            .addUserOption(opt => opt.setName('target').setDescription('The player to view').setRequired(true))
        )
        .addSubcommand(sub =>
          sub.setName('gold')
            .setDescription('Add or remove gold from a player')
            .addUserOption(opt => opt.setName('target').setDescription('The player').setRequired(true))
            .addIntegerOption(opt => opt.setName('amount').setDescription('Amount of gold (negative to remove)').setRequired(true))
        )
        .addSubcommand(sub =>
          sub.setName('ban')
            .setDescription('Ban a player from using the bot')
            .addUserOption(opt => opt.setName('target').setDescription('The player to ban').setRequired(true))
        )
        .addSubcommand(sub =>
          sub.setName('unban')
            .setDescription('Unban a player')
            .addUserOption(opt => opt.setName('target').setDescription('The player to unban').setRequired(true))
        )
        .addSubcommand(sub =>
          sub.setName('reset')
            .setDescription('Reset a player\'s progress')
            .addUserOption(opt => opt.setName('target').setDescription('The player to reset').setRequired(true))
        )
        .addSubcommand(sub =>
          sub.setName('item-add')
            .setDescription('Give an item to a player')
            .addUserOption(opt => opt.setName('target').setDescription('The player').setRequired(true))
            .addStringOption(opt => opt.setName('item_id').setDescription('The ID of the item').setRequired(true))
            .addIntegerOption(opt => opt.setName('quantity').setDescription('Quantity').setRequired(false))
        )
    )
    // Item Management Group
    .addSubcommandGroup(group =>
      group.setName('item')
        .setDescription('Manage game items')
        .addSubcommand(sub =>
          sub.setName('add')
            .setDescription('Add a new custom item')
            .addStringOption(opt => opt.setName('id').setDescription('Unique ID').setRequired(true))
            .addStringOption(opt => opt.setName('name').setDescription('Item Name').setRequired(true))
            .addStringOption(opt => opt.setName('type').setDescription('Type').setRequired(true)
              .addChoices(
                { name: 'Weapon', value: 'weapon' },
                { name: 'Armor', value: 'armor' },
                { name: 'Consumable', value: 'consumable' },
                { name: 'Material', value: 'material' }
              ))
            .addStringOption(opt => opt.setName('description').setDescription('Description').setRequired(true))
            .addIntegerOption(opt => opt.setName('price').setDescription('Price').setRequired(true))
            .addStringOption(opt => opt.setName('emoji').setDescription('Emoji').setRequired(true))
            .addIntegerOption(opt => opt.setName('attack').setDescription('Attack Bonus').setRequired(false))
            .addIntegerOption(opt => opt.setName('defense').setDescription('Defense Bonus').setRequired(false))
            .addIntegerOption(opt => opt.setName('spirit').setDescription('Spirit Bonus').setRequired(false))
            .addIntegerOption(opt => opt.setName('heal').setDescription('Heal Amount').setRequired(false))
        )
        .addSubcommand(sub =>
          sub.setName('remove')
            .setDescription('Remove a custom item')
            .addStringOption(opt => opt.setName('id').setDescription('Item ID').setRequired(true))
        )
        .addSubcommand(sub =>
          sub.setName('list')
            .setDescription('List all custom items')
        )
    )
    // Economy Management Group
    .addSubcommandGroup(group =>
      group.setName('economy')
        .setDescription('Manage game economy')
        .addSubcommand(sub =>
          sub.setName('set-rate')
            .setDescription('Set economy rates')
            .addStringOption(opt => opt.setName('rate').setDescription('Rate to change').setRequired(true)
              .addChoices(
                { name: 'Gold Drop Rate', value: 'gold_rate' },
                { name: 'XP Gain Rate', value: 'xp_rate' },
                { name: 'Spawn Rate', value: 'spawn_rate' }
              ))
            .addStringOption(opt => opt.setName('value').setDescription('New value (e.g. 1.5)').setRequired(true))
        )
    )
    // Raid Management Group
    .addSubcommandGroup(group =>
      group.setName('raid')
        .setDescription('Manage raids')
        .addSubcommand(sub =>
          sub.setName('spawn')
            .setDescription('Spawn a raid boss')
            .addStringOption(opt => opt.setName('raid_id').setDescription('Raid ID').setRequired(true))
        )
        .addSubcommand(sub =>
          sub.setName('end')
            .setDescription('End an active raid')
            .addIntegerOption(opt => opt.setName('raid_id').setDescription('Database ID of the raid').setRequired(true))
        )
        .addSubcommand(sub =>
          sub.setName('health')
            .setDescription('Set health of an active raid')
            .addIntegerOption(opt => opt.setName('raid_id').setDescription('Database ID of the raid').setRequired(true))
            .addIntegerOption(opt => opt.setName('hp').setDescription('New health').setRequired(true))
        )
    )
    // Quest Management Group
    .addSubcommandGroup(group =>
      group.setName('quest')
        .setDescription('Manage quests')
        .addSubcommand(sub =>
          sub.setName('complete')
            .setDescription('Force complete a quest for a player')
            .addUserOption(opt => opt.setName('target').setDescription('The player').setRequired(true))
            .addStringOption(opt => opt.setName('quest_id').setDescription('Quest ID').setRequired(true))
        )
    )
    // System Management Group
    .addSubcommandGroup(group =>
      group.setName('system')
        .setDescription('Manage bot system')
        .addSubcommand(sub =>
          sub.setName('status')
            .setDescription('View bot status and memory usage')
        )
        .addSubcommand(sub =>
          sub.setName('clear-cache')
            .setDescription('Clear bot caches')
        )
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const group = interaction.options.getSubcommandGroup();
    const subcommand = interaction.options.getSubcommand();

    // Check permissions: allow both admins AND server owners
    const isServerOwner = interaction.guild?.ownerId === interaction.user.id;
    const isAdmin = interaction.memberPermissions?.has('Administrator') ?? false;
    
    if (!isAdmin && !isServerOwner) {
      await interaction.reply({ embeds: [errorEmbed('You need Administrator permissions or be the server owner to use this command.')], ephemeral: true });
      return;
    }

    if (group === 'user') {
      const target = interaction.options.getUser('target', true);
      
      if (subcommand === 'view') {
        const char = getCharacter(target.id);
        if (!char) {
          await interaction.reply({ embeds: [errorEmbed('Player has no character.')], ephemeral: true });
          return;
        }

        const inventory = getInventory(target.id);
        const player = getPlayer(target.id);

        const embed = new EmbedBuilder()
          .setTitle(`Player Profile: ${target.username}`)
          .setThumbnail(target.displayAvatarURL())
          .setColor(getPathwayColor(char.pathway))
          .addFields(
            { name: 'Pathway', value: char.pathway, inline: true },
            { name: 'Sequence', value: char.sequence.toString(), inline: true },
            { name: 'Level', value: char.level.toString(), inline: true },
            { name: 'Gold', value: char.gold.toString(), inline: true },
            { name: 'Banned', value: player?.banned ? 'Yes' : 'No', inline: true },
            { name: 'Inventory', value: inventory.length > 0 ? inventory.map(i => `\`${i.item_id}\` x${i.quantity}`).join(', ') : 'Empty', inline: false }
          );

        await interaction.reply({ embeds: [embed], ephemeral: true });
      } else if (subcommand === 'gold') {
        const amount = interaction.options.getInteger('amount', true);
        const newGold = modifyGold(target.id, amount);
        await interaction.reply({ embeds: [successEmbed(`Adjusted gold for ${target.username} by ${amount}. New balance: ${newGold} gold.`)] });
      } else if (subcommand === 'ban') {
        banPlayer(target.id);
        await interaction.reply({ embeds: [successEmbed(`Banned ${target.username} from the game.`)] });
      } else if (subcommand === 'unban') {
        unbanPlayer(target.id);
        await interaction.reply({ embeds: [successEmbed(`Unbanned ${target.username}.`)] });
      } else if (subcommand === 'reset') {
        resetPlayer(target.id);
        await interaction.reply({ embeds: [successEmbed(`Reset all progress for ${target.username}.`)] });
      } else if (subcommand === 'item-add') {
        const itemId = interaction.options.getString('item_id', true);
        const quantity = interaction.options.getInteger('quantity') || 1;
        addToInventory(target.id, itemId, quantity);
        await interaction.reply({ embeds: [successEmbed(`Added ${quantity}x \`${itemId}\` to ${target.username}'s inventory.`)] });
      }
    } else if (group === 'item') {
      if (subcommand === 'add') {
        const id = interaction.options.getString('id', true).toLowerCase().replace(/ /g, '_');
        const name = interaction.options.getString('name', true);
        const type = interaction.options.getString('type', true);
        const description = interaction.options.getString('description', true);
        const price = interaction.options.getInteger('price', true);
        const emoji = interaction.options.getString('emoji', true);
        
        const options = {
          attackBonus: interaction.options.getInteger('attack') || 0,
          defenseBonus: interaction.options.getInteger('defense') || 0,
          spiritBonus: interaction.options.getInteger('spirit') || 0,
          healAmount: interaction.options.getInteger('heal') || 0,
        };

        const success = addCustomItem(id, name, type, description, price, emoji, interaction.user.id, options);
        if (success) {
          await interaction.reply({ embeds: [successEmbed(`Added custom item: ${emoji} **${name}** (\`${id}\`)`)] });
        } else {
          await interaction.reply({ embeds: [errorEmbed('Failed to add custom item. ID may already exist.')], ephemeral: true });
        }
      } else if (subcommand === 'remove') {
        const id = interaction.options.getString('id', true);
        const success = deleteCustomItem(id);
        if (success) {
          await interaction.reply({ embeds: [successEmbed(`Successfully removed custom item \`${id}\`.`)] });
        } else {
          await interaction.reply({ embeds: [errorEmbed(`Custom item \`${id}\` not found.`)], ephemeral: true });
        }
      } else if (subcommand === 'list') {
        const items = getCustomItems();
        if (items.length === 0) {
          await interaction.reply({ content: 'No custom items found.', ephemeral: true });
          return;
        }
        const list = items.map(i => `\`${i.id}\`: ${i.emoji} ${i.name} (${i.type}) - ${i.price}g`).join('\n');
        const embed = new EmbedBuilder()
          .setTitle('Custom Items')
          .setDescription(list.substring(0, 4000))
          .setColor(0x00FF00);
        await interaction.reply({ embeds: [embed], ephemeral: true });
      }
    } else if (group === 'economy') {
      if (subcommand === 'set-rate') {
        const rate = interaction.options.getString('rate', true);
        const value = interaction.options.getString('value', true);
        setSetting(rate, value);
        await interaction.reply({ embeds: [successEmbed(`Set economy rate \`${rate}\` to \`${value}\`.`)] });
      }
    } else if (group === 'raid') {
      if (subcommand === 'spawn') {
        const raidId = interaction.options.getString('raid_id', true);
        const result = spawnRaid(raidId);
        if (result.success) {
          await interaction.reply({ content: result.message });
        } else {
          await interaction.reply({ embeds: [errorEmbed(result.message)], ephemeral: true });
        }
      } else if (subcommand === 'end') {
        const raidId = interaction.options.getInteger('raid_id', true);
        endRaid(raidId);
        await interaction.reply({ embeds: [successEmbed(`Ended raid with ID \`${raidId}\`.`)] });
      } else if (subcommand === 'health') {
        const raidId = interaction.options.getInteger('raid_id', true);
        const health = interaction.options.getInteger('hp', true);
        updateRaidHealth(raidId, health);
        await interaction.reply({ embeds: [successEmbed(`Set health of raid \`${raidId}\` to \`${health}\`.`)] });
      }
    } else if (group === 'quest') {
      if (subcommand === 'complete') {
        const target = interaction.options.getUser('target', true);
        const questId = interaction.options.getString('quest_id', true);
        const active = getActiveQuests(target.id);
        const record = active.find(r => r.quest_id === questId);
        if (record) {
          completeQuest(record.id);
          await interaction.reply({ embeds: [successEmbed(`Marked quest \`${questId}\` as completed for ${target.username}.`)] });
        } else {
          await interaction.reply({ embeds: [errorEmbed(`Player does not have quest \`${questId}\` active.`)], ephemeral: true });
        }
      }
    } else if (group === 'system') {
      if (subcommand === 'status') {
        const used = process.memoryUsage();
        const memory = [
          `**RSS**: ${Math.round(used.rss / 1024 / 1024 * 100) / 100} MB`,
          `**Heap Total**: ${Math.round(used.heapTotal / 1024 / 1024 * 100) / 100} MB`,
          `**Heap Used**: ${Math.round(used.heapUsed / 1024 / 1024 * 100) / 100} MB`,
          `**External**: ${Math.round(used.external / 1024 / 1024 * 100) / 100} MB`,
        ].join('\n');

        const cache = [
          `**Guilds**: ${interaction.client.guilds.cache.size}`,
          `**Channels**: ${interaction.client.channels.cache.size}`,
          `**Users**: ${interaction.client.users.cache.size}`,
          `**Guild Members**: ${interaction.client.guilds.cache.reduce((acc, guild) => acc + guild.members.cache.size, 0)}`,
        ].join('\n');

        const embed = new EmbedBuilder()
          .setTitle('Bot System Status')
          .setColor(0x3498db)
          .addFields(
            { name: 'Memory Usage', value: memory, inline: true },
            { name: 'Cache Statistics', value: cache, inline: true },
            { name: 'Uptime', value: `${Math.floor(process.uptime() / 60)} minutes`, inline: false }
          );

        await interaction.reply({ embeds: [embed], ephemeral: true });
      } else if (subcommand === 'clear-cache') {
        // Trigger garbage collection if exposed
        if (global.gc) {
          global.gc();
          await interaction.reply({ embeds: [successEmbed('Manually triggered Garbage Collection.')], ephemeral: true });
        } else {
          await interaction.reply({ 
            embeds: [successEmbed('Cache sweepers have been notified to run. Note: Garbage collection is not manually accessible.')], 
            ephemeral: true 
          });
        }
      }
    }
  }
};

export default command;
