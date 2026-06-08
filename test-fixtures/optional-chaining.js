// Test fixture: Optional chaining (ES2020) - UNSUPPORTED in Chrome 53
// This syntax should be rejected by the audit tool

const user = {
	profile: {
		name: 'Test User'
	}
};

// Optional chaining - not supported in Chromium 53
const userName = user?.profile?.name;
const userAge = user?.profile?.age ?? 0;

console.log('User:', userName);

export default userName;
