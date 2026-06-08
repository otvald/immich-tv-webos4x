module.exports = {
	testEnvironment: 'jsdom',
	moduleNameMapper: {
		'^react$': '<rootDir>/node_modules/react/index.js',
		'^react/jsx-runtime$': '<rootDir>/node_modules/react/jsx-runtime.js',
		'^react/jsx-dev-runtime$': '<rootDir>/node_modules/react/jsx-dev-runtime.js',
		'^react-dom$': '<rootDir>/node_modules/react-dom/index.js',
		'^react-dom/client$': '<rootDir>/node_modules/react-dom/client.js',
		'^@testing-library/react$': '<rootDir>/node_modules/@testing-library/react/dist/index.js',
		'\\.(css|less|png|jpg|gif)$': '<rootDir>/__mocks__/fileMock.js',
	},
	transform: {
		'^.+\\.(js|jsx|ts|tsx)$': 'babel-jest',
	},
	testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx', '**/*.test.ts', '**/*.test.tsx'],
	collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/*.d.ts'],
};
