const WikiBot = require("nodemw");

const client = new WikiBot({
	protocol: "https",
	server: "operators.wiki",
	path: "/w",
	userAgent: "Operators Wiki Bot operated by User:Breakbar",
	concurrency: 1
});

const opQuery = (params) =>
	new Promise((resolve, reject) => {
		client.api.call({ action: "query", ...params }, (err, info, next, data) => {
			if (err) reject(err);
			else resolve(data.query);
		});
	});

const opGetArticle = (title) =>
	new Promise((resolve, reject) => {
		client.getArticle(title, (err, content) => {
			if (err) reject(err);
			else resolve(content);
		});
	});

const opApiCall = (params) =>
	new Promise((resolve, reject) => {
		client.api.call(params, (err, info, next, data) => {
			if (err) reject(err);
			else resolve(data);
		});
	});

module.exports = { opQuery, opGetArticle, opApiCall };
