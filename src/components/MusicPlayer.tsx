import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {musicTracks, type MusicTrackManifestEntry} from '../generated/musicManifest';
import {isMusicEnabled, subscribeSlideshowSettingsChanges} from '../utils/slideshowSettings';

function shuffleTracks(tracks: MusicTrackManifestEntry[]): MusicTrackManifestEntry[] {
	const next = tracks.slice();
	for (let i = next.length - 1; i > 0; i -= 1) {
		const j = Math.floor(Math.random() * (i + 1));
		const current = next[i]!;
		next[i] = next[j]!;
		next[j] = current;
	}
	return next;
}

export const MusicPlayer: React.FC = () => {
	const audioRef = useRef<HTMLAudioElement | null>(null);
	const [enabled, setEnabled] = useState(isMusicEnabled);
	const [trackIndex, setTrackIndex] = useState(0);
	const [playlist, setPlaylist] = useState<MusicTrackManifestEntry[]>(() => shuffleTracks(musicTracks));

	useEffect(() => subscribeSlideshowSettingsChanges(() => setEnabled(isMusicEnabled())), []);

	const currentTrack = playlist[trackIndex] ?? null;

	const advanceTrack = useCallback(() => {
		setTrackIndex((current) => {
			if (playlist.length <= 1) return 0;
			if (current < playlist.length - 1) return current + 1;
			setPlaylist(shuffleTracks(musicTracks));
			return 0;
		});
	}, [playlist.length]);

	useEffect(() => {
		const audio = audioRef.current;
		if (!audio) return;

		if (!enabled || !currentTrack) {
			audio.pause();
			return;
		}

		audio.volume = 0.45;
		void audio.play().catch(() => {
			// Some webOS/browser profiles require a user gesture before audio starts.
		});
	}, [enabled, currentTrack]);

	const source = useMemo(() => currentTrack?.url ?? '', [currentTrack]);

	if (musicTracks.length === 0) return null;

	return <audio ref={audioRef} src={source} onEnded={advanceTrack} preload="auto" />;
};

export default MusicPlayer;
