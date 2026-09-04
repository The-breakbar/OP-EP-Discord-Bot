require("./requestTimeout");
const WikiBot = require("nodemw");

const client = new WikiBot({
	protocol: "https",
	server: "operators.wiki",
	path: "/w",
	userAgent: "Operators Wiki Bot operated by User:Breakbar",
	concurrency: 1
});

const MAX_ATTEMPTS = 3;
const RETRY_DELAY = 2000;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isTransient = (error) => error.message.startsWith("Request to API failed");

const singleCall = (params) =>
	new Promise((resolve, reject) => {
		client.api.call(params, (err, info, next, data) => {
			if (err) reject(err);
			else resolve(data);
		});
	});

const opApiCall = async (params) => {
	for (let attempt = 1; ; attempt++) {
		try {
			return await singleCall(params);
		} catch (error) {
			if (attempt >= MAX_ATTEMPTS || !isTransient(error)) throw error;
			await sleep(RETRY_DELAY * attempt);
		}
	}
};

const opQuery = async (params) => {
	const data = await opApiCall({ action: "query", ...params });
	return data.query;
};

const opGetArticle = (title) =>
	new Promise((resolve, reject) => {
		client.getArticle(title, (err, content) => {
			if (err) reject(err);
			else resolve(content);
		});
	});

module.exports = { opQuery, opGetArticle, opApiCall };
