// Test fixture: Object spread/rest (ES2018) - UNSUPPORTED in Chrome 53
// This syntax should be rejected by the audit tool

const defaults = {
	theme: 'dark',
	language: 'en',
	notifications: true
};

const userSettings = {
	language: 'fr'
};

// Object spread - not supported in Chromium 53
const finalSettings = { ...defaults, ...userSettings };

console.log('Settings:', finalSettings);

// Rest properties - also not supported
const { theme, ...otherSettings } = finalSettings;
console.log('Theme:', theme);
console.log('Other:', otherSettings);

export default finalSettings;
