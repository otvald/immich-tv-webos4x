import React from 'react';
import {render, screen} from '@testing-library/react';

import App from './App';
import {createPlatformFacade} from '../platform';

jest.mock('@enact/sandstone/ThemeDecorator', () => ({
	__esModule: true,
	default: (Component: React.ComponentType) => Component,
}));

jest.mock('@enact/sandstone/Panels', () => ({
	__esModule: true,
	default: ({children}: {children: React.ReactNode}) => <div>{children}</div>,
}));

jest.mock('../hooks/useAccounts', () => ({
	useAccounts: () => ({
		accounts: [{id: 'account-1', baseUrl: 'https://immich.example', email: 'user@example.com'}],
		activeAccountId: 'account-1',
		defaultAccountId: 'account-1',
		repository: {
			thumbnailUrl: jest.fn(),
			previewUrl: jest.fn(),
			originalUrl: jest.fn(),
			videoPlaybackUrl: jest.fn(),
		},
		isValidating: false,
		validationError: '',
		addAccount: jest.fn(),
		removeAccount: jest.fn(),
		switchTo: jest.fn(),
		setAsDefault: jest.fn(),
	}),
}));

jest.mock('../views/AccountPanel/AccountPanel', () => ({
	AccountPanel: () => <div>Account Panel</div>,
}));

jest.mock('../views/AppLayout', () => ({
	__esModule: true,
	default: function MockAppLayout() {
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		const {usePlatformFacade} = require('../platform');
		const platform = usePlatformFacade();
		return (
			<div>
				<div data-testid="platform-target">{platform.target}</div>
				<div data-testid="photo-capability">{platform.getCapability('originalPhoto').status}</div>
			</div>
		);
	},
}));

describe('App platform facade integration', () => {
	test('renders with the modern profile facade', () => {
		render(<App platformFacade={createPlatformFacade({target: 'modern'})} />);

		expect(screen.getByTestId('platform-target').textContent).toBe('modern');
		expect(screen.getByTestId('photo-capability').textContent).toBe('supported');
	});

	test('renders with the legacy profile facade', () => {
		render(<App platformFacade={createPlatformFacade({target: 'legacy'})} />);

		expect(screen.getByTestId('platform-target').textContent).toBe('legacy');
		expect(screen.getByTestId('photo-capability').textContent).toBe('server-proxy-required');
	});
});
