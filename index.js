// Imports
const { Client, Collection, GatewayIntentBits } = require("discord.js");
const { getJsFiles } = require("./utils/fileUtils");

// Store wiki server ids and embed color in global for ease of access, won't overwrite anything in the environment
global.wConfig = require("./config.json");
global.colors = {
	purple: 0xb33fe6,
	red: 0xed4245,
	blue: 0x3498db,
	orange: 0xe67e22,
	green: 0x57f287,
	darkBlue: 0x71368a,
	gold: 0xf1c40f
};

// Configure client
const client = new Client({
	intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildBans],
	allowedMentions: {
		roles: [
			global.wConfig.roles["Stealth Ping"],
			global.wConfig.roles["Loud Ping"],
			global.wConfig.roles["Ironman Ping"],
			global.wConfig.roles["Shadow War Ping"],
			global.wConfig.roles["Freelance Heist Ping"],
			global.wConfig.roles["Night Heist Ping"],
			global.wConfig.roles["Daily Challenge Ping"]
		]
	}
});
client.commands = new Collection();
client.contextMenus = new Collection();

process.on("uncaughtException", (error) => console.error("Uncaught exception:", error?.stack ?? error));
process.on("unhandledRejection", (reason) => console.error("Unhandled rejection:", reason?.stack ?? reason));

// Get all event handlers
const allEvents = [...getJsFiles("./events"), ...getJsFiles("./events/command"), ...getJsFiles("./events/wiki-server"), ...getJsFiles("./events/log")];

// Bind event handlers
allEvents.forEach((file) => {
	const event = require(`./${file}`);
	if (event.once) {
		client.once(event.name, (...args) => {
			try {
				event.execute(...args, client);
			} catch (error) {
				console.error(error);
			}
		});
	} else {
		client.on(event.name, (...args) => {
			try {
				event.execute(...args, client);
			} catch (error) {
				console.error(error);
			}
		});
	}
});

// Get commands
const allCommands = [...getJsFiles("./commands"), ...getJsFiles("./commands/wiki-server")];

// Store commands in client
allCommands.forEach((file) => {
	const command = require(`./${file}`);
	if (!command?.disabled) client.commands.set(command.name, command);
});

// Client login
client.login(process.env.TOKEN);
