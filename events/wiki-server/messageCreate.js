const redisClient = require("../../utils/redisClient.js");
const { mute } = require("../../utils/muteUtils");
const { Collection } = require("discord.js");

let spamMessages = {};
let warnings = {};
let badMessageCount = {};

let badWords = [];
redisClient.get("filter").then((badWordString) => {
	if (badWordString == null) {
		console.log("⚠️  Failed to get filter string");
	} else {
		badWords = badWordString.split(",").map((regexString) => {
			return new RegExp(regexString, "i");
		});
	}
});

const EP_URL = "https://entry-point.fandom.com/wiki/";
const OP_URL = "https://operators.wiki/";

module.exports = {
	name: "messageCreate",
	async execute(message, client) {
		// Handles message related processes in the wiki server
		if (message.guild != client.wikiServer.guild || message.author.bot) return;

		const authorId = message.author.id;
		const messageId = message.id;

		// Store message for spam detection
		if (spamMessages[authorId]) spamMessages[authorId].push(messageId);
		else spamMessages[authorId] = [messageId];

		// Warn/mute if more than 5 messages in 2 seconds
		if (spamMessages[authorId].length > 4) {
			if (warnings[authorId]) {
				let spamMessagesCopy = spamMessages[authorId].slice();
				delete spamMessages[authorId];
				delete warnings[authorId];

				// If user has been warned before, mute them for 6 hours
				// await mute(message.member, 21600000);
				await message.member.timeout(6 * 60 * 60 * 1000, "Message spam").catch((error) => console.error(error));

				// Delete spammed messages
				let collectionToBeDeleted = new Collection();
				await Promise.all(spamMessagesCopy.map((messageDeleteId) => message.channel.messages.fetch(messageDeleteId))).then((response) => {
					response.forEach((messageToBeDeleted) => {
						collectionToBeDeleted.set(messageToBeDeleted.id, messageToBeDeleted);
					});
				});
				await message.channel.bulkDelete(collectionToBeDeleted);

				// Notify user of mute
				const embed = {
					color: global.colors.purple,
					description: "You have been timed out for 6 hours for spamming.",
					timestamp: new Date()
				};
				message.member.send({ embeds: [embed] }).catch((error) => console.error(error));

				// Log spam mute
				const logEmbed = {
					color: global.colors.purple,
					description: `${message.member} was timed out for 6 hours for spamming.`,
					timestamp: new Date()
				};
				client.wikiServer.reports.send({ embeds: [logEmbed] }).catch((error) => console.error(error));
			} else {
				// Else send them a warning and reset counter
				let spamMessagesCopy = spamMessages[authorId].slice();
				warnings[authorId] = true;
				delete spamMessages[authorId];

				// Delete spammed messages
				let collectionToBeDeleted = new Collection();
				await Promise.all(spamMessagesCopy.map((messageDeleteId) => message.channel.messages.fetch(messageDeleteId))).then((response) => {
					response.forEach((messageToBeDeleted) => {
						collectionToBeDeleted.set(messageToBeDeleted.id, messageToBeDeleted);
					});
				});
				await message.channel.bulkDelete(collectionToBeDeleted);

				// Message user
				const embed = {
					color: global.colors.purple,
					description: "Please do not spam messages."
				};
				message.member.send({ embeds: [embed] }).catch((error) => console.error(error));
			}
		} else {
			// Remove message from list after 2 seconds
			setTimeout(() => {
				if (spamMessages[authorId]) {
					const index = spamMessages[authorId].indexOf(messageId);
					if (index >= 0) {
						spamMessages[authorId].splice(index, 1);
						if (spamMessages[authorId].length == 0) {
							delete spamMessages[authorId];
						}
					}
				}
			}, 2000);
		}

		// Filter for bad words
		if (badWords.some((regex) => regex.test(message.content))) {
			// Increase count by one
			if (badMessageCount[authorId]) badMessageCount[authorId]++;
			else badMessageCount[authorId] = 1;

			if (badMessageCount[authorId] > 3) {
				// If count reaches 4, mute for 6 hours
				delete badMessageCount[authorId];
				// await mute(message.member, 21600000);
				message.member.timeout(6 * 60 * 60 * 1000, "Inappropriate language").catch((error) => console.error(error));

				// Notify user of mute
				const embed = {
					color: global.colors.purple,
					description: "You have been timed out for 6 hours for inappropriate language.",
					timestamp: new Date()
				};
				message.member.send({ embeds: [embed] }).catch((error) => console.error(error));

				// Log spam mute
				const logEmbed = {
					color: global.colors.purple,
					description: `${message.member} was timed out for 6 hours for inappropriate language.`,
					timestamp: new Date()
				};
				client.wikiServer.reports.send({ embeds: [logEmbed] }).catch((error) => console.error(error));
			} else if (badMessageCount[authorId] == 3) {
				// Warn user on second message
				const embed = {
					color: global.colors.purple,
					description: "Please do not use inappropriate language in the server."
				};
				message.member.send({ embeds: [embed] }).catch((error) => console.error(error));
			}

			// Always delete message and remove count after 5 min
			message.delete().catch((error) => console.error(error));
			setTimeout(() => {
				if (badMessageCount[authorId] && badMessageCount[authorId] > 0) {
					badMessageCount[authorId]--;
				}
			}, 300000);
		} else if (/@everyone/i.test(message.content) && /nitro/i.test(message.content) && /http/i.test(message.content)) {
			// Nitro scam link filter
			message.delete().catch((error) => console.error(error));
			message.member.timeout(24 * 60 * 60 * 1000, "Scam link").catch((error) => console.error(error));

			// Notify user of mute
			const embed = {
				color: global.colors.purple,
				description: "You have been timed out for sending messages with possible malicious intent.",
				timestamp: new Date()
			};
			message.member.send({ embeds: [embed] }).catch((error) => console.error(error));

			// Log spam mute
			const logEmbed = {
				color: global.colors.purple,
				description: `${message.member} was timed out for 24 hours for sending a nitro scam link.`,
				timestamp: new Date()
			};
			client.wikiServer.reports.send({ embeds: [logEmbed] }).catch((error) => console.error(error));
		} else {
			// Channel/message specific processes
			if (message.channel.id == global.wConfig.channels["ep-art"] || message.channel.id == global.wConfig.channels["art"]) {
				if (message.attachments.size > 0 || message.content.includes("http")) message.react("❤️").catch((error) => console.error(error));
			} else if (
				message.type == "USER_PREMIUM_GUILD_SUBSCRIPTION" ||
				message.type == "USER_PREMIUM_GUILD_SUBSCRIPTION_TIER_1" ||
				message.type == "USER_PREMIUM_GUILD_SUBSCRIPTION_TIER_2" ||
				message.type == "USER_PREMIUM_GUILD_SUBSCRIPTION_TIER_3"
			) {
				message.react("❤️").catch((error) => console.error(error));
			}
		}

		let linkMatches = message.content.matchAll(/\[\[(ep|op):(.+?)\]\]/g);
		linkMatches = Array.from(linkMatches, (match) => {
			const prefix = match[1];
			let title = match[2];

			let displayTitle = title.trim().replace(/\b\w/g, (char) => char.toUpperCase());
			let linkTitle = displayTitle.replace(/ /g, "_");

			let url = prefix == "ep" ? EP_URL : OP_URL;
			url += linkTitle;

			return `[${displayTitle}](<${url}>)`;
		});

		if (linkMatches.length > 0) {
			message.channel.send(linkMatches.join(" "));
		}
	}
};
