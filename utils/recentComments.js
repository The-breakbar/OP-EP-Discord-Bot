const { opQuery, opApiCall } = require("./opWiki");

const OP_URL = "https://operators.wiki";
const MAX_BODY_LENGTH = 1500;
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
					leprop: "ids|title|type|user|timestamp|details",
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

const parseEntityId = (target) => {
	const match = /#cs-comment-(\d+)$/.exec(target || "");
	return match ? match[1] : null;
};

const verbs = {
	"comment-create": "posted",
	"reply-create": "replied",
	"comment-edit": "edited their comment",
	"reply-edit": "edited their reply",
	"comment-delete": "deleted their comment",
	"reply-delete": "deleted their reply"
};

// The API returns wikitext with entities still encoded
const decodeEntities = (text) =>
	text
		.replace(/&#0?39;/g, "'")
		.replace(/&quot;/g, '"')
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&nbsp;/g, " ")
		.replace(/&amp;/g, "&");

const generateEmbed = async (comments) => {
	return await Promise.all(
		comments.map(async (event) => {
			const { user, title, action, params } = event;
			const kind = action.replace(/-v\d+$/, "");
			const verb = verbs[kind];
			if (!verb) return undefined;

			const isReply = kind.startsWith("reply-");
			const linkTarget = (isReply ? params?.replyLinkTarget : params?.commentLinkTarget) || title;
			const entityId = parseEntityId(linkTarget);

			// A deleted comment can no longer be fetched, so it is announced without its body
			let body = "";
			let commentTitle = params?.commentName;
			if (entityId && !kind.endsWith("-delete")) {
				try {
					const data = await opApiCall({ action: isReply ? "csqueryreply" : "csquerycomment", entityid: entityId });
					const entity = isReply ? data.csqueryreply : data.csquerycomment;
					body = decodeEntities(entity?.wikitext || "");
					commentTitle = entity?.commenttitle || commentTitle;
				} catch (error) {
					return undefined;
				}
			}

			if (body.length > MAX_BODY_LENGTH) body = body.slice(0, MAX_BODY_LENGTH) + "...";

			// Create embed
			const userLink = `[${user}](${OP_URL}/User:${user.replaceAll(" ", "_")})`;
			const pageLink = `[${title}](${OP_URL}/${linkTarget.replaceAll(" ", "_")})`;
			const description =
				`${userLink} ${verb} on ${pageLink}` + (commentTitle ? ` | ${commentTitle}` : "") + (body ? `\n${body}` : "");

			const embed = {
				color: global.colors.purple,
				description: description
			};

			return embed;
		})
	);
};
