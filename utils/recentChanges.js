const fetch = require("node-fetch");
const { opQuery } = require("./opWiki");

const EP_URL = "https://entry-point.fandom.com";
const OP_URL = "https://operators.wiki";

const CHANGE_LIMIT = 500;
const SEEN_LIMIT = 500;
const MAX_LOOKBACK = 3600;

let epSince, opSince;
let epSeen = [];
let opSeen = [];

let running = false;

const editKey = (edit) => `${edit.pageid}-${edit.revid}`;
const remember = (seen, edits) => [...seen, ...edits.map(editKey)].slice(-SEEN_LIMIT);
const isLogged = (seen) => (edit) => ["edit", "new"].includes(edit.type) && !seen.includes(editKey(edit));

module.exports = {
	recentChanges(interval, client) {
		epSince = opSince = Math.floor(Date.now() / 1000);

		setInterval(async () => {
			if (running) return;
			running = true;

			const now = Math.floor(Date.now() / 1000);
			epSince = Math.max(epSince, now - MAX_LOOKBACK);
			opSince = Math.max(opSince, now - MAX_LOOKBACK);

			// Make EP api call
			try {
				const response = await fetch(
					`${EP_URL}/api.php?action=query&list=recentchanges&rcprop=title|ids|sizes|comment|user|redirect` +
						`&rcnamespace=0|10&rcshow=!bot&rclimit=${CHANGE_LIMIT}&rcstart=${now}&rcend=${epSince}&format=json`
				);
				const jsonResponse = await response.json();

				let edits = jsonResponse.query.recentchanges.reverse().filter(isLogged(epSeen));
				epSeen = remember(epSeen, edits);
				epSince = now;

				// remove edits by wiki bot
				edits = edits.filter((edit) => edit.user !== "Entry Point Wiki Bot");

				await postEmbeds(client.wikiServer.epLog, generateEmbeds(edits, EP_URL + "/wiki/"));
			} catch (error) {
				console.error(`Failed to fetch EP recent changes: ${error.message}`);
			}

			// Make OP api call
			try {
				const query = await opQuery({
					list: "recentchanges",
					rcprop: "title|ids|sizes|comment|user|redirect",
					rcnamespace: "0|10",
					rcshow: "!bot",
					rclimit: CHANGE_LIMIT,
					rcstart: now,
					rcend: opSince
				});

				const edits = query.recentchanges.reverse().filter(isLogged(opSeen));
				opSeen = remember(opSeen, edits);
				opSince = now;

				await postEmbeds(client.wikiServer.opLog, generateEmbeds(edits, OP_URL + "/"));
			} catch (error) {
				console.error(`Failed to fetch OP recent changes: ${error.message}`);
			}

			running = false;
		}, interval);
	}
};

// Sent one at a time so the edits stay in chronological order
const postEmbeds = async (channel, embeds) => {
	for (const embed of embeds) {
		await channel.send({ embeds: [embed] }).catch((error) => console.error(error));
	}
};

const generateEmbeds = (edits, wikiUrl) => {
	// One malformed edit must not take out the rest of the batch
	return edits.flatMap((edit) => {
		try {
			return [generateEmbed(edit, wikiUrl)];
		} catch (error) {
			console.error(`Failed to build embed for revision ${edit.revid}: ${error.message}`);
			return [];
		}
	});
};

const generateEmbed = (edit, wikiUrl) => {
	let { type, title, user, comment, revid, old_revid, oldlen, newlen, redirect } = edit;
	// Underscores for valid links. A revision deleted edit hides its user or
	// summary, which means the API omits those fields entirely.
	title = (title ?? "").replaceAll(" ", "_");
	user = (user ?? "Hidden user").replaceAll(" ", "_");
	comment = comment ?? "";

	// Parse links in edit summary
	comment = comment.replace("User talk", "User");
	let wikiTextLinks = comment.match(/\[\[[^\]]+]]/g);
	if (wikiTextLinks)
		wikiTextLinks.forEach((match) => {
			let matchUrl = match.slice(2, -2);
			if (matchUrl.includes("|")) {
				matchUrl = `[${matchUrl.split("|")[1]}](${wikiUrl}${matchUrl.split("|")[0].replaceAll(" ", "_")})`;
			} else {
				matchUrl = `[${matchUrl}](${wikiUrl}${matchUrl.replaceAll(" ", "_")})`;
			}
			comment = comment.replace(match, matchUrl);
		});

	// Create embed
	const delta = (newlen - oldlen < 0 ? "" : "+") + (newlen - oldlen);
	const description =
		`[${title.replaceAll("_", " ")}](${wikiUrl}${title}) (${delta}) ([diff](${wikiUrl}${title}?type=revision&diff=${revid}&oldid=${old_revid})) ` +
		`| New ${redirect === "" ? "redirect" : type == "new" ? "page" : "edit"} by [${user.replaceAll("_", " ")}](${wikiUrl}User:${user})` +
		`\n${comment ? comment : "No edit summary"}`;

	return {
		color: global.colors.purple,
		description: description
	};
};
