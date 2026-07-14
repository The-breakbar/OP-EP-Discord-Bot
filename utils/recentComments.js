const fetch = require("node-fetch");

const OP_URL = "https://operators.wiki";
let opComments = [];

module.exports = {
	recentComments(interval, client) {
		setInterval(async () => {
			const now = Math.floor(Date.now() / 1000);
			const before = now - interval / 1000;

			let logResponse;
			try {
				logResponse = await fetch(`${OP_URL}/w/api.php?action=query&list=logevents&letype=commentstreams&lestart=${now}&leend=${before}&format=json`);
			} catch (error) {
				console.log(`Failed to fetch OP recent comments.`);
				return;
			}

			let logJson;
			try {
				logJson = await logResponse.json();
			} catch (error) {
				console.log(`Failed to parse OP recent comments.`);
				return;
			}

			let comments = logJson.query.logevents.reverse().filter((comment) => {
				return !opComments.some((prev) => prev.logid == comment.logid);
			});
			opComments = comments.slice();

			let embeds = await generateEmbed(comments);
			embeds
				.filter((embed) => embed !== undefined)
				.forEach(async (embed) => {
					client.wikiServer.opComments.send({ embeds: [await embed] }).catch((error) => console.error(error));
				});
		}, interval);
	}
};

const generateEmbed = async (comments) => {
	return await Promise.all(
		comments.map(async (comment) => {
			let { user, title, action } = comment;
			title = title.replaceAll(" ", "_");
			user = user.replaceAll(" ", "_");

			// Get raw comment
			let commentResponse = await fetch(`${OP_URL}/${title}?action=raw`);
			if (!commentResponse.ok) return undefined;
			let commentText = await commentResponse.text();

			// Remove {{DISPLAYTITLE: ...}} from comment
			commentText = commentText.replace(/{{DISPLAYTITLE:(.|\n)*}}/, "");

			// Create embed
			let description = "Invalid action";
			const userLink = `[${user}](${OP_URL}/User:${user})`;
			switch (action) {
				case "comment-create":
					description = `${userLink} posted: ${commentText}`;
					break;
				case "reply-create":
					description = `${userLink} replied: ${commentText}`;
					break;
				case "comment-edit":
				case "reply-edit":
					description = `${userLink} edited their comment: ${commentText}`;
					break;
				case "reply-delete":
				case "comment-delete":
					description = `${userLink} deleted their comment: ${commentText}`;
					break;
			}

			const embed = {
				color: global.colors.purple,
				description: description
			};

			return embed;
		})
	);
};
