import React from 'react';
import {fireEvent, render, screen} from '@testing-library/react';

import AppLayout from './AppLayout';

jest.mock('../utils/spotlight', () => ({
	createSpotlightContainer: () => ({children, className}: {children: React.ReactNode; className?: string}) => <div className={className}>{children}</div>,
}));

jest.mock('../components/NavigationRail/NavigationRail', () => ({
	NavigationRail: ({onNavigate}: {onNavigate: (view: 'photos' | 'albums' | 'search' | 'settings' | 'diagnostics') => void}) => (
		<nav>
			<button onClick={() => onNavigate('photos')}>Photos</button>
			<button onClick={() => onNavigate('settings')}>Settings</button>
			<button onClick={() => onNavigate('diagnostics')}>Diagnostics</button>
		</nav>
	),
}));

jest.mock('./MainPanel', () => () => <div>Main Panel</div>);
jest.mock('./AlbumsPanel', () => () => <div>Albums Panel</div>);
jest.mock('./SearchPanel', () => () => <div>Search Panel</div>);
jest.mock('./SettingsPanel', () => () => <div>Settings Panel</div>);
jest.mock('./DiagnosticsPanel/DiagnosticsPanel', () => () => <div>Diagnostics Panel</div>);

describe('AppLayout diagnostics routing', () => {
	beforeEach(() => {
		window.location.hash = '#/photos';
	});

	test('renders diagnostics panel from URL hash', () => {
		window.location.hash = '#/diagnostics';

		render(<AppLayout onOpenAccount={() => {}} accountLetter="A" accountGradient="#333" />);

		expect(screen.getByText('Diagnostics Panel')).toBeTruthy();
	});

	test('navigates to diagnostics and updates hash', () => {
		render(<AppLayout onOpenAccount={() => {}} accountLetter="A" accountGradient="#333" />);

		fireEvent.click(screen.getByRole('button', {name: 'Diagnostics'}));

		expect(window.location.hash).toBe('#/diagnostics');
		expect(screen.getByText('Diagnostics Panel')).toBeTruthy();
	});

	test('renders settings panel from URL hash', () => {
		window.location.hash = '#/settings';

		render(<AppLayout onOpenAccount={() => {}} accountLetter="A" accountGradient="#333" />);

		expect(screen.getByText('Settings Panel')).toBeTruthy();
	});

	test('navigates to settings and updates hash', () => {
		render(<AppLayout onOpenAccount={() => {}} accountLetter="A" accountGradient="#333" />);

		fireEvent.click(screen.getByRole('button', {name: 'Settings'}));

		expect(window.location.hash).toBe('#/settings');
		expect(screen.getByText('Settings Panel')).toBeTruthy();
	});
});
