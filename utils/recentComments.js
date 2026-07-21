const { opQuery, opGetArticle } = require("./opWiki");

const OP_URL = "https://operators.wiki";
let opComments = [];

module.exports = {
	recentComments(interval, client) {
		setInterval(async () => {
			const now = Math.floor(Date.now() / 1000);
			const before = now - interval / 1000;

			let query;
			try {
				query = await opQuery({
					list: "logevents",
					letype: "commentstreams",
					lestart: now,
					leend: before
				});
			} catch (error) {
				console.log(`Failed to fetch OP recent comments.`);
				return;
			}

			let comments = query.logevents.reverse().filter((comment) => {
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
			let commentText;
			try {
				commentText = await opGetArticle(title);
			} catch (error) {
				return undefined;
			}
			if (commentText == null) return undefined;

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
