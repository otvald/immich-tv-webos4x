import React from 'react';
import {render, screen} from '@testing-library/react';

import {MediaControls} from './MediaControls';

jest.mock('@enact/sandstone/Button', () => ({icon, onClick}: {icon: string; onClick?: () => void}) => <button onClick={onClick}>{icon}</button>);

const defaultProps = {
	currentIndex: 0,
	totalCount: 3,
	onPrev: jest.fn(),
	onNext: jest.fn(),
	onClose: jest.fn(),
	canGoPrev: true,
	canGoNext: true,
};

describe('MediaControls slideshow status', () => {
	test('renders random slideshow status even when controls are hidden', () => {
		render(<MediaControls {...defaultProps} controlsVisible={false} isSlideshowRunning timePerViewSeconds={7} />);

		expect(screen.getByText('Random play every 7s · STOP to stop')).toBeTruthy();
	});

	test('does not render slideshow status when slideshow is stopped', () => {
		render(<MediaControls {...defaultProps} controlsVisible={false} isSlideshowRunning={false} timePerViewSeconds={7} />);

		expect(screen.queryByText('Random play every 7s · STOP to stop')).toBeNull();
	});
});
