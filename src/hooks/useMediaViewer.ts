import {useCallback, useEffect, useState} from 'react';
import {getTimePerViewSeconds, subscribeSlideshowSettingsChanges} from '../utils/slideshowSettings';

interface ViewerState {
	assetIndex: number;
}

interface MediaViewerControls {
	state: ViewerState | null;
	isOpen: boolean;
	isSlideshowRunning: boolean;
	timePerViewSeconds: number;
	open: (index: number) => void;
	close: () => void;
	navigate: (direction: 'prev' | 'next') => void;
	startRandomSlideshow: () => void;
	stopSlideshow: () => void;
}

export const useMediaViewer = (totalAssets: number): MediaViewerControls => {
	const [state, setState] = useState<ViewerState | null>(null);
	const [isSlideshowRunning, setIsSlideshowRunning] = useState(false);
	const [timePerViewSeconds, setTimePerViewSecondsState] = useState(getTimePerViewSeconds);

	useEffect(() => subscribeSlideshowSettingsChanges(() => setTimePerViewSecondsState(getTimePerViewSeconds())), []);

	const open = useCallback((index: number) => {
		setState({assetIndex: index});
	}, []);

	const stopSlideshow = useCallback(() => setIsSlideshowRunning(false), []);

	const close = useCallback(() => {
		setIsSlideshowRunning(false);
		setState(null);
	}, []);

	const navigate = useCallback(
		(direction: 'prev' | 'next') => {
			setState((prev) => {
				if (!prev) return null;
				const newIndex =
					direction === 'prev'
						? Math.max(0, prev.assetIndex - 1)
						: Math.min(totalAssets - 1, prev.assetIndex + 1);
				return {...prev, assetIndex: newIndex};
			});
		},
		[totalAssets]
	);

	const startRandomSlideshow = useCallback(() => {
		if (totalAssets <= 0) return;
		setState({assetIndex: Math.floor(Math.random() * totalAssets)});
		setIsSlideshowRunning(true);
	}, [totalAssets]);

	useEffect(() => {
		if (!isSlideshowRunning || totalAssets <= 0) return;

		const timer = window.setInterval(() => {
			setState((prev) => {
				if (!prev) return null;
				if (totalAssets <= 1) return prev;

				let nextIndex = Math.floor(Math.random() * totalAssets);
				if (nextIndex === prev.assetIndex) {
					nextIndex = (nextIndex + 1) % totalAssets;
				}

				return {assetIndex: nextIndex};
			});
		}, timePerViewSeconds * 1000);

		return () => window.clearInterval(timer);
	}, [isSlideshowRunning, timePerViewSeconds, totalAssets]);

	return {state, isOpen: state !== null, isSlideshowRunning, timePerViewSeconds, open, close, navigate, startRandomSlideshow, stopSlideshow};
};
