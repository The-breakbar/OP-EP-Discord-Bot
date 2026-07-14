const WikiBot = require("nodemw");

const client = new WikiBot({
	protocol: "https",
	server: "operators.wiki",
	path: "/w",
	userAgent: "Operators Wiki Bot operated by User:Breakbar",
	concurrency: 1
});

let loginPromise = null;

const ensureLogin = () => {
	if (!loginPromise) {
		const username = process.env.OP_WIKI_USERNAME;
		const password = process.env.OP_WIKI_PASSWORD;

		loginPromise = new Promise((resolve, reject) => {
			if (!username || !password) {
				reject(new Error("OP_WIKI_USERNAME / OP_WIKI_PASSWORD are not set"));
				return;
			}

			client.logIn(username, password, (err) => (err ? reject(err) : resolve()));

		}).catch((err) => {
			console.error(`operators.wiki login failed: ${err.message}`);
			loginPromise = null; // allow another attempt on the next call
			throw err;
		});
	}

	return loginPromise;
};

const withLogin = async (fn, retried = false) => {
	await ensureLogin();

	try {
		return await fn();
	} catch (error) {
		if (!retried) {
			loginPromise = null;
			return withLogin(fn, true);
		}

		throw error;
	}
};

const opQuery = (params) =>
	withLogin(
		() =>
			new Promise((resolve, reject) => {
				client.api.call({ action: "query", ...params }, (err, info, next, data) => {
					if (err) reject(err);
					else resolve(data.query);
				});
			})
	);

const opGetArticle = (title) =>
	withLogin(
		() =>
			new Promise((resolve, reject) => {
				client.getArticle(title, (err, content) => {
					if (err) reject(err);
					else resolve(content);
				});
			})
	);

module.exports = { opQuery, opGetArticle };
