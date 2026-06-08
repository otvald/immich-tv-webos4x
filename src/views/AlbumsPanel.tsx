import React, {useCallback, useEffect, useState} from 'react';
import Scroller from '@enact/sandstone/Scroller';
import {AlbumCard} from '../components/AlbumCard';
import {QueryStateView} from '../components/QueryStateView';
import {LegacyDebugOverlay} from '../components/LegacyDebugOverlay';
import AlbumView from './AlbumView';
import {useAlbums} from '../hooks/useAlbums';
import {useRepository} from '../domain/RepositoryContext';
import {usePlatformFacade} from '../platform';
import {getAlbumTileScale, subscribeSlideshowSettingsChanges} from '../utils/slideshowSettings';
import type {Album} from '../domain/types';
import css from './AlbumsPanel.module.less';

interface AlbumsPanelProps {
	contentWidth: number;
}

const AlbumsPanel: React.FC<AlbumsPanelProps> = ({contentWidth}) => {
	const repository = useRepository();
	const platform = usePlatformFacade();
	const isLegacyTarget = platform.target === 'legacy';
	const [selectedAlbumId, setSelectedAlbumId] = useState<string | null>(null);
	const [albumTileScale, setAlbumTileScale] = useState(getAlbumTileScale);
	const [manualAlbums, setManualAlbums] = useState<{status: 'running' | 'success' | 'error'; albums: Album[]; error: string}>({status: 'running', albums: [], error: 'none'});
	const {data: albums, isLoading, error} = useAlbums();

	useEffect(() => {
		if (!isLegacyTarget) return undefined;

		let cancelled = false;
		void repository.getAlbums()
			.then((nextAlbums) => {
				if (cancelled) return;
				setManualAlbums({status: 'success', albums: nextAlbums, error: 'none'});
			})
			.catch((albumError) => {
				if (cancelled) return;
				setManualAlbums({status: 'error', albums: [], error: albumError instanceof Error ? albumError.message : String(albumError)});
			});

		return () => {
			cancelled = true;
		};
	}, [isLegacyTarget, repository]);

	useEffect(() => subscribeSlideshowSettingsChanges(() => setAlbumTileScale(getAlbumTileScale())), []);

	const displayedAlbums = isLegacyTarget ? manualAlbums.albums : albums;
	const displayedLoading = isLegacyTarget ? manualAlbums.status === 'running' : isLoading;
	const displayedError = isLegacyTarget && manualAlbums.status === 'error' ? manualAlbums.error : error;

	const handleSelectAlbum = useCallback((albumId: string) => {
		setSelectedAlbumId(albumId);
	}, []);

	const handleBack = useCallback(() => setSelectedAlbumId(null), []);

	if (selectedAlbumId) {
		return <AlbumView albumId={selectedAlbumId} onBack={handleBack} contentWidth={contentWidth} />;
	}

	return (
		<>
			<LegacyDebugOverlay
				title="Albums Debug"
				slot={2}
				lines={[
					{label: 'legacyManual', value: isLegacyTarget},
					{label: 'manualStatus', value: manualAlbums.status},
					{label: 'manualCount', value: manualAlbums.albums.length},
					{label: 'manualError', value: manualAlbums.error},
					{label: 'queryLoading', value: isLoading},
					{label: 'queryCount', value: albums?.length ?? 0},
				]}
			/>
			<QueryStateView
				isLoading={displayedLoading}
				error={displayedError}
				isEmpty={!displayedAlbums?.length}
				loadingText="Loading albums…"
				emptyText="No albums found."
			>
				<Scroller direction="vertical" scrollMode="native" verticalScrollbar="visible" className={css.scroller}>
					<div className={css.grid}>
						{displayedAlbums?.map((album) => (
							<AlbumCard key={album.id} album={album} onSelect={handleSelectAlbum} scale={albumTileScale} />
						))}
					</div>
				</Scroller>
			</QueryStateView>
		</>
	);
};

export default AlbumsPanel;
