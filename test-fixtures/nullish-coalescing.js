// Test fixture: Nullish coalescing (ES2020) - UNSUPPORTED in Chrome 53
// This syntax should be rejected by the audit tool

function getConfig(options) {
	// Nullish coalescing - not supported in Chromium 53
	const timeout = options.timeout ?? 5000;
	const retries = options.retries ?? 3;
	
	return {
		timeout,
		retries
	};
}

const config = getConfig({});
console.log('Config:', config);

export default getConfig;
