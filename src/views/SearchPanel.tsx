import React, {useCallback, useEffect, useState} from 'react';
import Input from '@enact/sandstone/Input';
import ri from '@enact/ui/resolution';
import {LegacyDebugOverlay} from '../components/LegacyDebugOverlay';
import {PeopleRibbon} from '../components/PeopleRibbon/PeopleRibbon';
import {QueryStateView} from '../components/QueryStateView';
import {TimelineGrid} from '../components/TimelineGrid/TimelineGrid';
import {usePeople} from '../hooks/usePeople';
import {useSearch} from '../hooks/useSearch';
import type {SearchQuery} from '../hooks/useSearch';
import {useRepository} from '../domain/RepositoryContext';
import {groupAssetsByDay} from '../domain/transforms';
import {usePlatformFacade} from '../platform';
import {createSpotlightContainer} from '../utils/spotlight';
import {GRID_INSET_LEFT_PX, GRID_INSET_RIGHT_PX} from '../utils/constants';
import type {DayGroup, Person} from '../domain/types';
import css from './SearchPanel.module.less';

interface SearchPanelProps {
	contentWidth: number;
}

const Container = createSpotlightContainer({enterTo: 'default-element'});

const SearchPanel: React.FC<SearchPanelProps> = ({contentWidth}) => {
	const repository = useRepository();
	const platform = usePlatformFacade();
	const isLegacyTarget = platform.target === 'legacy';
	const [activeQuery, setActiveQuery] = useState<SearchQuery | null>(null);
	const [inputValue, setInputValue] = useState('');
	const [manualPeople, setManualPeople] = useState<{status: 'running' | 'success' | 'error'; people: Person[]; error: string}>({status: 'running', people: [], error: 'none'});
	const [manualSearch, setManualSearch] = useState<{status: 'idle' | 'running' | 'success' | 'error'; groups: DayGroup[]; error: string}>({status: 'idle', groups: [], error: 'none'});

	const {data: people = [], isLoading: isPeopleLoading} = usePeople();
	const {groups, isLoading: isSearchLoading, error} = useSearch(activeQuery);

	useEffect(() => {
		if (!isLegacyTarget) return undefined;

		let cancelled = false;
		void repository.getPeople()
			.then((nextPeople) => {
				if (cancelled) return;
				setManualPeople({status: 'success', people: nextPeople, error: 'none'});
			})
			.catch((peopleError) => {
				if (cancelled) return;
				setManualPeople({status: 'error', people: [], error: peopleError instanceof Error ? peopleError.message : String(peopleError)});
			});

		return () => {
			cancelled = true;
		};
	}, [isLegacyTarget, repository]);

	useEffect(() => {
		if (!isLegacyTarget) return undefined;
		if (!activeQuery) {
			return undefined;
		}

		let cancelled = false;

		const request = activeQuery.type === 'smart'
			? repository.searchSmart(activeQuery.value)
			: repository.searchByPerson(activeQuery.value);

		void request
			.then((assets) => {
				if (cancelled) return;
				setManualSearch({status: 'success', groups: groupAssetsByDay(assets), error: 'none'});
			})
			.catch((searchError) => {
				if (cancelled) return;
				setManualSearch({status: 'error', groups: [], error: searchError instanceof Error ? searchError.message : String(searchError)});
			});

		return () => {
			cancelled = true;
		};
	}, [activeQuery, isLegacyTarget, repository]);

	const displayedPeople = isLegacyTarget ? manualPeople.people : people;
	const displayedPeopleLoading = isLegacyTarget ? manualPeople.status === 'running' : isPeopleLoading;
	const displayedGroups = isLegacyTarget ? manualSearch.groups : groups;
	const displayedSearchLoading = isLegacyTarget ? manualSearch.status === 'running' : isSearchLoading;
	const displayedError = isLegacyTarget && manualSearch.status === 'error' ? manualSearch.error : error;

	const handleInputChange = useCallback((e: any) => setInputValue(e.value ?? ''), []);

	const handleTextSearch = useCallback((e: any) => {
		const trimmed = (e.value ?? '').trim();
		if (trimmed) {
			setActiveQuery({type: 'smart', value: trimmed});
		}
	}, []);

	const handlePersonSearch = useCallback((personId: string) => {
		setActiveQuery({type: 'person', value: personId});
		setInputValue('');
	}, []);

	const selectedPersonId = activeQuery?.type === 'person' ? activeQuery.value : null;

	return (
		<Container className={css.searchPanel}>
			<LegacyDebugOverlay
				title="Search Debug"
				slot={2}
				lines={[
					{label: 'legacyManual', value: isLegacyTarget},
					{label: 'peopleStatus', value: manualPeople.status},
					{label: 'peopleCount', value: displayedPeople.length},
					{label: 'searchStatus', value: manualSearch.status},
					{label: 'groupsCount', value: displayedGroups.length},
					{label: 'searchError', value: manualSearch.error},
					{label: 'activeQuery', value: activeQuery ? `${activeQuery.type}:${activeQuery.value}` : 'none'},
				]}
			/>
			<div className={css.searchBar}>
				<div className={css.inputWrapper}>
					{/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
					<Input
						placeholder="Search…"
						value={inputValue}
						onChange={handleInputChange}
						size="small"
						iconBefore="search"
						data-spotlight-default-element
						className={css.searchInput}
						{...({onComplete: handleTextSearch} as any)}
					/>
				</div>
				<PeopleRibbon
					people={displayedPeople}
					selectedPersonId={selectedPersonId}
					onSelectPerson={handlePersonSearch}
					isLoading={displayedPeopleLoading}
				/>
			</div>
			<div className={css.results}>
				<QueryStateView
					isLoading={displayedSearchLoading}
					error={displayedError}
					isEmpty={!activeQuery || displayedGroups.length === 0}
					loadingText="Searching…"
					emptyText={!activeQuery ? 'Tap a face or type to search' : 'No results found.'}
				>
					<TimelineGrid
						groups={displayedGroups}
						contentWidth={contentWidth}
						style={{paddingLeft: ri.scale(GRID_INSET_LEFT_PX), paddingRight: ri.scale(GRID_INSET_RIGHT_PX)}}
					/>
				</QueryStateView>
			</div>
		</Container>
	);
};

export default SearchPanel;
