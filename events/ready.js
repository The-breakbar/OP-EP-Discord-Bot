const { syncMuted } = require("../utils/muteUtils");
const { recentChanges } = require("../utils/recentChanges");
const { ActivityType } = require("discord.js");
const { initDaily } = require("../utils/dailyService");
const { recentComments } = require("../utils/recentComments");

module.exports = {
	name: "ready",
	once: true,
	async execute(client) {
		// Fetch wiki server info
		client.wikiServer = {};
		client.wikiServer.guild = await client.guilds.fetch(global.wConfig.guild);
		client.wikiServer.reports = await client.wikiServer.guild.channels.cache.get(global.wConfig.channels.reports);
		client.wikiServer.log = await client.wikiServer.guild.channels.cache.get(global.wConfig.channels.log);
		client.wikiServer.epLog = await client.wikiServer.guild.channels.cache.get(global.wConfig.channels["ep-edits"]);
		client.wikiServer.opLog = await client.wikiServer.guild.channels.cache.get(global.wConfig.channels["op-edits"]);
		client.wikiServer.opComments = await client.wikiServer.guild.channels.cache.get(global.wConfig.channels["op-comments"]);

		// Initialize daily service
		initDaily();

		// Sync unmutes on bot restart
		syncMuted(client);

		// Checks wiki for new edits periodically
		recentChanges(20000, client);
		recentComments(60000, client);

		// Set status, change status every hour
		const startingStatus = activities[Math.floor(Math.random() * activities.length)];
		client.user.setActivity(startingStatus[1], { type: startingStatus[0] });
		setInterval(() => {
			const randomStatus = activities[Math.floor(Math.random() * activities.length)];
			client.user.setActivity(randomStatus[1], { type: randomStatus[0] });
		}, 3600000);

		// Client has logged in
		console.log(`✅ Logged in as ${client.user.tag}, connected to ${client.guilds.cache.size} guilds`);
	}
};

// Playing / Watching / Listening to / Competing in
const activities = [
	[ActivityType.Playing, "Ironman legend stealth"],
	[ActivityType.Playing, "with a Thumper in the Shooting Range"],
	[ActivityType.Playing, "PvP Deathmatch completely alone"],
	[ActivityType.Playing, "Band Hero"],
	[ActivityType.Playing, "Notoriety"],
	[ActivityType.Playing, "Entry Point 2"],
	[ActivityType.Playing, "Entry Point 2: Electric Boogaloo"],
	[ActivityType.Playing, "The Freelancer Legend Loud"],
	[ActivityType.Playing, "Operators 2"],
	[ActivityType.Playing, "Sudoku on the hacking tablet"],
	[ActivityType.Watching, "@Xx_SparrowPlays_xX"],
	[ActivityType.Watching, "@PhoenixRising"],
	[ActivityType.Watching, "people die in Ironman"],
	[ActivityType.Watching, "Ryan Ross fall down a skyscraper"],
	[ActivityType.Watching, "the EP Wiki"],
	[ActivityType.Watching, "a legend stealth tutorial"],
	[ActivityType.Watching, "bars break"],
	[ActivityType.Watching, "the Operators Wiki"],
	[ActivityType.Listening, "Full Force"],
	[ActivityType.Listening, "the Cache alt track"],
	[ActivityType.Listening, "breakbar's commands"],
	[ActivityType.Listening, "the Gala speech"],
	[ActivityType.Competing, "a Shadow War 1v1"],
	[ActivityType.Competing, "Band Hero"]
];
