import {
  Client,
  GatewayIntentBits,
  Collection,
  ChatInputCommandInteraction,
  REST,
  Routes,
  RESTPostAPIChatInputApplicationCommandsJSONBody,
} from 'discord.js';

export interface Command {
  data: { name: string; toJSON(): RESTPostAPIChatInputApplicationCommandsJSONBody };
  execute(interaction: ChatInputCommandInteraction): Promise<void>;
}

export class BotClient extends Client {
  public commands: Collection<string, Command> = new Collection();

  constructor() {
    super({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
      ],
    });
  }

  async registerCommands(commands: Command[]): Promise<void> {
    const token = process.env.DISCORD_TOKEN;
    const clientId = process.env.CLIENT_ID;
    const guildId = process.env.GUILD_ID;

    if (!token || !clientId) {
      console.error('Missing DISCORD_TOKEN or CLIENT_ID in environment.');
      return;
    }

    for (const command of commands) {
      this.commands.set(command.data.name, command);
    }

    const rest = new REST({ version: '10' }).setToken(token);
    const commandData = commands.map(c => c.data.toJSON());

    try {
      if (guildId) {
        await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commandData });
        console.log(`✅ Registered ${commands.length} guild commands to guild ${guildId}`);
      } else {
        await rest.put(Routes.applicationCommands(clientId), { body: commandData });
        console.log(`✅ Registered ${commands.length} global commands`);
      }
    } catch (error) {
      console.error('Failed to register commands:', error);
    }
  }
}
