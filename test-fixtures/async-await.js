// Test fixture: Async/await (ES2017) - UNSUPPORTED in Chrome 53
// This syntax should be rejected by the audit tool

// Async/await - not supported in Chromium 53
async function fetchData(url) {
	const response = await fetch(url);
	const data = await response.json();
	return data;
}

async function main() {
	try {
		const result = await fetchData('https://example.com/api');
		console.log('Result:', result);
	} catch (err) {
		console.error('Error:', err);
	}
}

main();

export default fetchData;
