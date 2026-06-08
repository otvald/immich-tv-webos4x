import React, {useCallback, useEffect, useState} from 'react';
import {SIDEBAR_COLLAPSED_WIDTH} from '../utils/constants';
import {createSpotlightContainer} from '../utils/spotlight';
import {NavigationRail} from '../components/NavigationRail/NavigationRail';
import {LegacyDebugOverlay} from '../components/LegacyDebugOverlay';
import MainPanel from './MainPanel';
import AlbumsPanel from './AlbumsPanel';
import SearchPanel from './SearchPanel';
import SettingsPanel from './SettingsPanel';
import DiagnosticsPanel from './DiagnosticsPanel/DiagnosticsPanel';
import type {View} from '../types/navigation';
import css from './AppLayout.module.less';

interface AppLayoutProps {
	onOpenAccount: () => void;
	accountLetter: string;
	accountGradient: string;
}

const ViewContainer = createSpotlightContainer({enterTo: 'last-focused'});

const DEFAULT_VIEW: View = 'photos';

function parseViewFromHash(hash: string): View {
	const candidate = hash.replace(/^#\/?/, '');
	return candidate === 'albums' || candidate === 'search' || candidate === 'settings' || candidate === 'diagnostics' || candidate === 'photos'
		? candidate
		: DEFAULT_VIEW;
}

const AppLayout: React.FC<AppLayoutProps> = ({onOpenAccount, accountLetter, accountGradient}) => {
	const [activeView, setActiveView] = useState<View>(() => parseViewFromHash(window.location.hash));
	const [contentWidth, setContentWidth] = useState(window.innerWidth - SIDEBAR_COLLAPSED_WIDTH);

	useEffect(() => {
		const handleResize = () => setContentWidth(window.innerWidth - SIDEBAR_COLLAPSED_WIDTH);
		const handleHashChange = () => setActiveView(parseViewFromHash(window.location.hash));
		window.addEventListener('resize', handleResize);
		window.addEventListener('hashchange', handleHashChange);
		return () => {
			window.removeEventListener('resize', handleResize);
			window.removeEventListener('hashchange', handleHashChange);
		};
	}, []);

	const handleNavigate = useCallback((view: View) => {
		window.location.hash = view === DEFAULT_VIEW ? '#/photos' : `#/${view}`;
		setActiveView(view);
	}, []);

	return (
		<div className={css.layout}>
			<LegacyDebugOverlay
				title="View Debug"
				slot={1}
				lines={[
					{label: 'activeView', value: activeView},
					{label: 'contentWidth', value: contentWidth},
				]}
			/>
			<NavigationRail
				activeView={activeView}
				onNavigate={handleNavigate}
				onOpenAccount={onOpenAccount}
				accountLetter={accountLetter}
				accountGradient={accountGradient}
			/>
			{/*
				MainPanel reste mounté (CSS-hidden) pour préserver la position de scroll de la VirtualList
				du timeline. Le cache TanStack survit déjà via QueryClientProvider en haut, donc l'unmount
				ne perdrait que la position scroll. Albums/Search réinitialisent leur navigation interne à
				chaque retour, ce qui est désiré côté UX.
			*/}
			<ViewContainer className={css.viewContainer}>
				<div className={activeView === 'photos' ? css.panelActive : css.panelHidden}>
					<MainPanel contentWidth={contentWidth} />
				</div>
				{activeView === 'albums' && (
					<div className={css.panelActive}>
						<AlbumsPanel contentWidth={contentWidth} />
					</div>
				)}
				{activeView === 'search' && (
					<div className={css.panelActive}>
						<SearchPanel contentWidth={contentWidth} />
					</div>
				)}
				{activeView === 'diagnostics' && (
					<div className={css.panelActive}>
						<DiagnosticsPanel />
					</div>
				)}
				{activeView === 'settings' && (
					<div className={css.panelActive}>
						<SettingsPanel />
					</div>
				)}
			</ViewContainer>
		</div>
	);
};

export default AppLayout;
