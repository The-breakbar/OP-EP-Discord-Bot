const { MessageActionRow, MessageButton, ButtonBuilder, ActionRowBuilder, ButtonStyle, ApplicationCommandOptionType } = require("discord.js");
const fetch = require("node-fetch");

module.exports = {
	global: true,
	name: "search-op",
	description: "Search for an Operators wiki page",
	options: [{ name: "query", type: ApplicationCommandOptionType.String, description: "Term to search for on the Operators wiki", required: true }],
	async execute(interaction, client) {
		// Defer reply
		await interaction.deferReply();

		// Make API call to wiki
		const query = interaction.options.getString("query");
		const queryDisplay = query.length > 50 ? query.slice(0, 50) + "..." : query;
		const URI = encodeURI(`https://operators.wiki/w/api.php?action=opensearch&format=json&search=${query}&namespace=0&limit=5&redirects=resolve`);
		const response = await fetch(URI).catch((error) => {
			console.error(error);
		});

		if (response?.ok) {
			const data = await response.json();
			if (data[1].length == 0) {
				const failEmbed = {
					color: global.colors.purple,
					description: `There were no search results for "${queryDisplay}"`
				};
				interaction.editReply({ embeds: [failEmbed] });
			} else {
				// Parse response
				const links = data[3];
				const linkTitels = data[1];

				const row = new ActionRowBuilder().addComponents(
					links.map((link, index) => {
						return new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel(linkTitels[index]).setURL(link);
					})
				);

				const embed = {
					color: global.colors.purple,
					description: `Search results for "${queryDisplay}"`
				};

				// Reply with links
				interaction.editReply({ embeds: [embed], components: [row] });
			}
		} else {
			const errorEmbed = {
				color: global.colors.purple,
				description: "There was an error while searching, please try again."
			};
			interaction.editReply({ embeds: [errorEmbed] });
		}
	}
};
