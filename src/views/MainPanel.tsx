import React, {useEffect, useMemo, useState} from 'react';
import ri from '@enact/ui/resolution';
import {QueryStateView} from '../components/QueryStateView';
import {TimelineGrid} from '../components/TimelineGrid/TimelineGrid';
import {LegacyDebugOverlay} from '../components/LegacyDebugOverlay';
import {useInfiniteTimeline} from '../hooks/useAssets';
import {useRepository} from '../domain/RepositoryContext';
import {usePlatformFacade} from '../platform';
import {GRID_INSET_LEFT_PX, GRID_INSET_RIGHT_PX} from '../utils/constants';
import type {DayGroup, TimelineBucket, TimelinePage} from '../domain/types';

interface MainPanelProps {
	contentWidth: number;
}

function flattenTimelineGroups(pages: TimelinePage[] | undefined): DayGroup[] {
	if (!pages) return [];

	const groups: DayGroup[] = [];
	for (const page of pages) {
		groups.push(...page.groups);
	}
	return groups;
}

interface ManualTimelineState {
	status: 'running' | 'success' | 'error';
	buckets: TimelineBucket[];
	groups: DayGroup[];
	error: string;
}

const MainPanel: React.FC<MainPanelProps> = ({contentWidth}) => {
	const repository = useRepository();
	const platform = usePlatformFacade();
	const isLegacyTarget = platform.target === 'legacy';
	const [manualTimeline, setManualTimeline] = useState<ManualTimelineState>({
		status: 'running',
		buckets: [],
		groups: [],
		error: 'none',
	});
	const {
		data,
		isLoading,
		isError,
		error,
		fetchNextPage,
		hasNextPage,
		isFetchingNextPage,
		allBuckets,
		bucketsError,
		bucketsStatus,
		isBucketsLoading,
		isTimelineEnabled,
		timelineStatus,
		totalBucketCount,
	} = useInfiniteTimeline();

	const queryGroups = useMemo(() => flattenTimelineGroups(data?.pages), [data]);
	const loadedGroups = isLegacyTarget ? manualTimeline.groups : queryGroups;
	const loadedAssetCount = useMemo(() => loadedGroups.reduce((sum, group) => sum + group.assets.length, 0), [loadedGroups]);
	const pagination = useMemo(
		() => ({allBuckets: isLegacyTarget ? manualTimeline.buckets : allBuckets, hasNextPage: isLegacyTarget ? false : !!hasNextPage, isFetchingNextPage: isLegacyTarget ? false : isFetchingNextPage, fetchNextPage}),
		[allBuckets, fetchNextPage, hasNextPage, isFetchingNextPage, isLegacyTarget, manualTimeline.buckets]
	);
	const timelineError = error ?? bucketsError;
	const displayError = isLegacyTarget && manualTimeline.status === 'error' ? manualTimeline.error : timelineError;
	const displayLoading = isLegacyTarget ? manualTimeline.status === 'running' : isLoading;
	const displayBucketCount = isLegacyTarget ? manualTimeline.buckets.length : totalBucketCount;
	const isEmpty = !displayLoading && !displayError && displayBucketCount === 0;

	useEffect(() => {
		let cancelled = false;

		void (async () => {
			const buckets = await repository.getBuckets();
			const page = buckets.length > 0 ? await repository.getTimelinePage(buckets, 0, 3) : null;

			if (cancelled) return;
			setManualTimeline({
				status: 'success',
				buckets,
				groups: page?.groups ?? [],
				error: 'none',
			});
		})().catch((manualError) => {
				if (cancelled) return;
				setManualTimeline({
					status: 'error',
					buckets: [],
					groups: [],
					error: manualError instanceof Error ? manualError.message : String(manualError),
				});
			});

		return () => {
			cancelled = true;
		};
	}, [repository]);

	return (
		<>
			<LegacyDebugOverlay
				title="Timeline Debug"
				slot={2}
				lines={[
					{label: 'manualStatus', value: manualTimeline.status},
					{label: 'manualBuckets', value: manualTimeline.buckets.length},
					{label: 'manualGroups', value: manualTimeline.groups.length},
					{label: 'manualError', value: manualTimeline.error},
					{label: 'bucketsStatus', value: bucketsStatus},
					{label: 'bucketsLoading', value: isBucketsLoading},
					{label: 'bucketsCount', value: totalBucketCount},
					{label: 'legacyManual', value: isLegacyTarget},
					{label: 'timelineEnabled', value: isTimelineEnabled},
					{label: 'timelineStatus', value: timelineStatus},
					{label: 'groupsCount', value: loadedGroups.length},
					{label: 'assetsCount', value: loadedAssetCount},
					{label: 'hasNextPage', value: !!hasNextPage},
					{label: 'isError', value: isError},
				]}
			/>
			<QueryStateView
				isLoading={displayLoading}
				error={displayError}
				isEmpty={isEmpty}
				loadingText="Loading photos…"
				emptyText="No timeline buckets returned. API login works, but Immich returned no visible photos for this key/user."
			>
				<TimelineGrid
					groups={loadedGroups}
					contentWidth={contentWidth}
					style={{paddingLeft: ri.scale(GRID_INSET_LEFT_PX), paddingRight: ri.scale(GRID_INSET_RIGHT_PX)}}
					pagination={pagination}
				/>
			</QueryStateView>
		</>
	);
};

export default MainPanel;
