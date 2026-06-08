import React, {useEffect, useMemo, useState} from 'react';
import Spotlight from '@enact/spotlight';
import Button from '@enact/sandstone/Button';
import ri from '@enact/ui/resolution';
import {useAlbumDetails} from '../hooks/useAlbumDetails';
import {useWebOSKeys} from '../hooks/useWebOSKeys';
import {useRepository} from '../domain/RepositoryContext';
import {usePlatformFacade} from '../platform';
import {createSpotlightContainer} from '../utils/spotlight';
import {GRID_INSET_LEFT_PX, GRID_INSET_RIGHT_PX} from '../utils/constants';
import {groupAssetsByDay} from '../domain/transforms';
import {TimelineGrid} from '../components/TimelineGrid/TimelineGrid';
import {QueryStateView} from '../components/QueryStateView';
import {LegacyDebugOverlay} from '../components/LegacyDebugOverlay';
import type {AlbumDetails} from '../domain/types';
import css from './AlbumView.module.less';

const GRID_SPOTLIGHT_ID = 'album-grid';
const Container = createSpotlightContainer({enterTo: 'last-focused'});
const GridContainer = createSpotlightContainer({enterTo: 'last-focused'});

interface AlbumViewProps {
	albumId: string;
	onBack: () => void;
	contentWidth: number;
}

interface ManualAlbumState {
	status: 'running' | 'success' | 'error';
	album: AlbumDetails | null;
	error: string;
}

const AlbumView: React.FC<AlbumViewProps> = ({albumId, onBack, contentWidth}) => {
	const repository = useRepository();
	const platform = usePlatformFacade();
	const isLegacyTarget = platform.target === 'legacy';
	const [manualAlbum, setManualAlbum] = useState<ManualAlbumState>({status: 'running', album: null, error: 'none'});
	const {data: album, isLoading, error} = useAlbumDetails(albumId);

	useEffect(() => {
		if (!isLegacyTarget) return undefined;

		let cancelled = false;
		void repository.getAlbum(albumId)
			.then((nextAlbum) => {
				if (cancelled) return;
				setManualAlbum({status: 'success', album: nextAlbum, error: 'none'});
			})
			.catch((albumError) => {
				if (cancelled) return;
				setManualAlbum({status: 'error', album: null, error: albumError instanceof Error ? albumError.message : String(albumError)});
			});

		return () => {
			cancelled = true;
		};
	}, [albumId, isLegacyTarget, repository]);

	const displayedAlbum = isLegacyTarget ? manualAlbum.album : album;
	const displayedLoading = isLegacyTarget ? manualAlbum.status === 'running' : isLoading;
	const displayedError = isLegacyTarget && manualAlbum.status === 'error' ? manualAlbum.error : error;

	useWebOSKeys({onBack});

	const loadedGroups = useMemo(() => groupAssetsByDay(displayedAlbum?.assets ?? [], displayedAlbum?.order), [displayedAlbum]);

	// When the album finishes loading, move focus into the photo grid so the user can start
	// navigating photos right away. The back button remains reachable via remote Back (above)
	// and via D-pad up from the top row. rAF defers focus to after VirtualList paints its first
	// items — calling Spotlight.focus before they mount silently no-ops.
	useEffect(() => {
		if (!displayedAlbum?.assets.length) return;
		const raf = requestAnimationFrame(() => Spotlight.focus(GRID_SPOTLIGHT_ID));
		return () => cancelAnimationFrame(raf);
	}, [displayedAlbum]);

	return (
		<>
			<LegacyDebugOverlay
				title="Album Detail Debug"
				slot={2}
				lines={[
					{label: 'legacyManual', value: isLegacyTarget},
					{label: 'manualStatus', value: manualAlbum.status},
					{label: 'manualAssets', value: manualAlbum.album?.assets.length ?? 0},
					{label: 'manualError', value: manualAlbum.error},
					{label: 'albumId', value: albumId},
				]}
			/>
			<QueryStateView
				isLoading={displayedLoading}
				error={displayedError}
				isEmpty={!displayedAlbum}
				loadingText="Loading…"
				emptyText=""
			>
				{displayedAlbum && (
					<Container className={css.view}>
						<div className={css.header} style={{paddingLeft: ri.scale(GRID_INSET_LEFT_PX)}}>
							<Button icon="arrowlargeleft" size="small" onClick={onBack} />
							<span className={css.title}>{displayedAlbum.albumName}</span>
							<span className={css.count}>{displayedAlbum.assetCount} items</span>
						</div>
						<GridContainer spotlightId={GRID_SPOTLIGHT_ID} className={css.listContainer}>
							<TimelineGrid
								groups={loadedGroups}
								contentWidth={contentWidth}
								style={{paddingLeft: ri.scale(GRID_INSET_LEFT_PX), paddingRight: ri.scale(GRID_INSET_RIGHT_PX)}}
							/>
						</GridContainer>
					</Container>
				)}
			</QueryStateView>
		</>
	);
};

export default AlbumView;
