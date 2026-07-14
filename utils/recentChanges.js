const fetch = require("node-fetch");

const EP_URL = "https://entry-point.fandom.com";
const OP_URL = "https://operators.wiki";
let epChanges = [];
let opChanges = [];

module.exports = {
	// Callback hell
	recentChanges(interval, client) {
		setInterval(() => {
			const now = Math.floor(Date.now() / 1000);
			const before = now - interval / 1000;

			// Make EP api call
			fetch(
				`${EP_URL}/api.php?action=query&list=recentchanges&rcprop=title|ids|sizes|comment|user|redirect&rcnamespace=0|10&rcshow=!bot&rcstart=${now}&rcend=${before}&format=json`
			)
				.then((response) => {
					response
						.json()
						.then((jsonResponse) => {
							try {
								let edits = jsonResponse.query.recentchanges.reverse().filter((edit) => {
									return ["edit", "new"].includes(edit.type) && !epChanges.some((prev) => prev.pageid == edit.pageid && prev.revid == edit.revid);
								});
								epChanges = edits.slice();

								// remove edits by wiki bot
								edits = edits.filter((edit) => edit.user !== "Entry Point Wiki Bot");

								let embeds = generateEmbed(edits, EP_URL + "/wiki/");
								embeds.forEach((embed) => {
									client.wikiServer.epLog.send({ embeds: [embed] }).catch((error) => console.error(error));
								});
							} catch (error) {
								console.error(error);
							}
						})
						.catch((error) => console.log(`Failed to parse EP recent changes.`));
				})
				.catch((error) => console.log(`Failed to fetch EP recent changes.`));

			// Make operators api call
			fetch(
				`${OP_URL}/w/api.php?action=query&list=recentchanges&rcprop=title|ids|sizes|comment|user|redirect&rcnamespace=0|10&rcshow=!bot&rcstart=${now}&rcend=${before}&format=json`
			)
				.then((response) => {
					response
						.json()
						.then((jsonResponse) => {
							try {
								let edits = jsonResponse.query.recentchanges.reverse().filter((edit) => {
									return ["edit", "new"].includes(edit.type) && !opChanges.some((prev) => prev.pageid == edit.pageid && prev.revid == edit.revid);
								});
								opChanges = edits.slice();

								let embeds = generateEmbed(edits, OP_URL + "/");
								embeds.forEach((embed) => {
									client.wikiServer.opLog.send({ embeds: [embed] }).catch((error) => console.error(error));
								});
							} catch (error) {
								console.error(error);
							}
						})
						.catch((error) => console.log(`Failed to parse OP recent changes.`));
				})
				.catch((error) => console.log(`Failed to fetch OP recent changes.`));
		}, interval);
	}
};

const generateEmbed = (edits, wikiUrl) => {
	return edits.map((edit) => {
		let { type, title, user, comment, revid, old_revid, oldlen, newlen, redirect } = edit;
		// Underscores for valid links
		title = title.replaceAll(" ", "_");
		user = user.replaceAll(" ", "_");

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
		const embed = {
			color: global.colors.purple,
			description: description
		};

		return embed;
	});
};
