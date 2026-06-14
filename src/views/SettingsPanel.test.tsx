import React from 'react';
import {fireEvent, render, screen} from '@testing-library/react';

import SettingsPanel from './SettingsPanel';
import {getRemoteKeyBinding} from '../utils/remoteKeySettings';

jest.mock('../utils/spotlight', () => ({
	createSpotlightContainer: () => ({children, className}: {children: React.ReactNode; className?: string}) => <div className={className}>{children}</div>,
}));

describe('SettingsPanel remote keys', () => {
	beforeEach(() => {
		window.localStorage.clear();
	});

	test('explains default remote key mappings', () => {
		render(<SettingsPanel />);

		expect(screen.getByRole('heading', {name: 'Remote keys'})).toBeTruthy();
		expect(screen.getByText('Start random slideshow')).toBeTruthy();
		expect(screen.getByText('Default: PLAY (415)')).toBeTruthy();
		expect(screen.getByText('Toggle diagnostics overlays')).toBeTruthy();
	});

	test('persists a changed remote key code and can reset it', () => {
		render(<SettingsPanel />);
		const input = screen.getByLabelText('Start random slideshow key code') as HTMLInputElement;

		fireEvent.change(input, {target: {value: '406'}});
		expect(getRemoteKeyBinding('randomPlay')).toBe(406);
		expect(input.value).toBe('406');

		fireEvent.click(screen.getByRole('button', {name: 'Reset Start random slideshow key code'}));
		expect(getRemoteKeyBinding('randomPlay')).toBe(415);
	});

	test('resets all remote key mappings', () => {
		render(<SettingsPanel />);
		fireEvent.change(screen.getByLabelText('Start random slideshow key code'), {target: {value: '406'}});

		fireEvent.click(screen.getByRole('button', {name: 'Reset all remote keys'}));

		expect(getRemoteKeyBinding('randomPlay')).toBe(415);
	});
});
