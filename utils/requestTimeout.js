const REQUEST_TIMEOUT = 8000;

const requestPath = require.resolve("request");
const request = require(requestPath);

if (!request.timeoutApplied) {
	const withTimeout = (...args) => {
		// request(options, callback) or request(url, options, callback)
		const index = typeof args[0] === "string" ? 1 : 0;
		if (typeof args[index] !== "object") args.splice(index, 0, {});
		args[index] = { timeout: REQUEST_TIMEOUT, ...args[index] };
		return request(...args);
	};

	Object.assign(withTimeout, request, { timeoutApplied: true });
	require.cache[requestPath].exports = withTimeout;
}

module.exports = { REQUEST_TIMEOUT };
