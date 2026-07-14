const { ApplicationCommandOptionType } = require("discord.js");
const redis = require("../../utils/redisClient");

module.exports = {
	disabled: true,
	name: "unmute",
	description: "Unmute command for server staff",
	options: [{ name: "user", type: ApplicationCommandOptionType.User, description: "A user ping, or their user id", required: true }],
	async execute(interaction, client) {
		// Defer reply
		await interaction.deferReply({ ephemeral: true });

		const member = interaction.options.getMember("user");

		// Only unmute if user is muted
		if (member.roles.cache.some((role) => role.name == "Muted")) {
			await redis.del(member.user.id);
			await member.roles.remove(member.guild.roles.cache.find((role) => role.name == "Muted"));
			await interaction.editReply({ content: `${member.user} was unmuted.` });

			// Log command usage
			const embed = {
				color: global.colors.purple,
				description: `${member.user} was unmuted.`,
				timestamp: new Date()
			};
			await client.wikiServer.reports.send({ embeds: [embed] }).catch((error) => console.error(error));
		} else {
			await interaction.editReply({ content: "The user is not muted." });
		}
	}
};
