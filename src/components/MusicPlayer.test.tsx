import React from 'react';
import {act, fireEvent, render, waitFor} from '@testing-library/react';

import {MusicPlayer} from './MusicPlayer';
import {setMusicEnabled} from '../utils/slideshowSettings';

describe('MusicPlayer', () => {
	let playSpy: jest.SpyInstance<Promise<void>, []>;
	let pauseSpy: jest.SpyInstance<void, []>;
	let randomSpy: jest.SpyInstance<number, []>;

	beforeEach(() => {
		window.localStorage.clear();
		playSpy = jest.spyOn(window.HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
		pauseSpy = jest.spyOn(window.HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
		randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0);
	});

	afterEach(() => {
		playSpy.mockRestore();
		pauseSpy.mockRestore();
		randomSpy.mockRestore();
	});

	test('renders audio but pauses while music is disabled', () => {
		const {container} = render(<MusicPlayer />);
		const audio = container.querySelector('audio');

		expect(audio).toBeTruthy();
		expect(playSpy).not.toHaveBeenCalled();
		expect(pauseSpy).toHaveBeenCalledTimes(1);
	});

	test('starts playback when music is enabled from settings', async () => {
		render(<MusicPlayer />);

		act(() => {
			setMusicEnabled(true);
		});

		await waitFor(() => expect(playSpy).toHaveBeenCalledTimes(1));
	});

	test('swallows play rejection from browser gesture restrictions', async () => {
		playSpy.mockRejectedValueOnce(new DOMException('gesture required', 'NotAllowedError'));

		expect(() => {
			render(<MusicPlayer />);
			act(() => {
				setMusicEnabled(true);
			});
		}).not.toThrow();

		await waitFor(() => expect(playSpy).toHaveBeenCalledTimes(1));
	});

	test('advances to the next shuffled track when current audio ends', async () => {
		const {container} = render(<MusicPlayer />);
		const audio = container.querySelector('audio');

		if (!audio) throw new Error('MusicPlayer did not render audio');

		act(() => {
			setMusicEnabled(true);
		});

		await waitFor(() => expect(audio.getAttribute('src')).toBe('./mp3/Perspectives.mp3'));

		fireEvent.ended(audio);

		await waitFor(() => expect(audio.getAttribute('src')).toBe('./mp3/Inner%20Light.mp3'));
	});
});
