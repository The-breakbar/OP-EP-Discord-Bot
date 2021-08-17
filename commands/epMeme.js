// CHALLENGE: epmeme
// Send a random Entry Point meme from a list of links

const memes = require("../utils/epMemeData");

module.exports = {
	enabled: false,
	global: false,
	name: "epmeme",
	description: "Get a random Entry Point meme",
	async execute(interaction, client) {
		// Reply with random meme file link
		await interaction.deferReply();
		await interaction.editReply({ content: memes[Math.floor(Math.random() * memes.length)] });
	}
};
