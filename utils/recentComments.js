const { opQuery, opApiCall } = require("./opWiki");

const OP_URL = "https://operators.wiki";
const MAX_BODY_LENGTH = 1500;

const EVENT_LIMIT = 500;
const SEEN_LIMIT = 500;
const MAX_LOOKBACK = 3600;

let opSince;
let opSeen = [];
let running = false;

module.exports = {
	recentComments(interval, client) {
		opSince = Math.floor(Date.now() / 1000);

		setInterval(async () => {
			if (running) return;
			running = true;

			const now = Math.floor(Date.now() / 1000);
			opSince = Math.max(opSince, now - MAX_LOOKBACK);

			try {
				const query = await opQuery({
					list: "logevents",
					letype: "commentstreams",
					leprop: "ids|title|type|user|timestamp|details",
					lelimit: EVENT_LIMIT,
					lestart: now,
					leend: opSince
				});

				const comments = query.logevents.reverse().filter((comment) => !opSeen.includes(comment.logid));
				opSeen = [...opSeen, ...comments.map((comment) => comment.logid)].slice(-SEEN_LIMIT);
				opSince = now;

				const embeds = await generateEmbeds(comments);

				// Sent one at a time so the comments stay in chronological order
				for (const embed of embeds) {
					await client.wikiServer.opComments.send({ embeds: [embed] }).catch((error) => console.error(error));
				}
			} catch (error) {
				console.error(`Failed to fetch OP recent comments: ${error.message}`);
			}

			running = false;
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

const generateEmbeds = async (comments) => {
	const embeds = await Promise.all(
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

	return embeds.filter((embed) => embed !== undefined);
};
