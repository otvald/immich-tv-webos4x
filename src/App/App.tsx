import ThemeDecorator from '@enact/sandstone/ThemeDecorator';
import Panels from '@enact/sandstone/Panels';
import {QueryCache, QueryClient, QueryClientProvider} from '@tanstack/react-query';
import React, {useCallback, useEffect, useMemo, useState} from 'react';

import {useAccounts} from '../hooks/useAccounts';
import {RepositoryProvider} from '../domain/RepositoryContext';
import {APIError} from '../api/client';
import {createPlatformFacade, PlatformFacadeProvider, usePlatformFacade, type PlatformFacade} from '../platform';
import {LegacyDebugOverlay, type DebugLine} from '../components/LegacyDebugOverlay';
import {MusicPlayer} from '../components/MusicPlayer';
import {isDebugOverlayToggleKey, toggleDebugOverlaysEnabled} from '../debug/debugSettings';
import AppLayout from '../views/AppLayout';
import {AccountPanel} from '../views/AccountPanel/AccountPanel';
import {deriveLabel, pickGradient} from '../utils/accountVisual';
import {isEditableTarget} from '../compat/input-adapter';
import type {AuthFormPayload, AuthSubmitResult} from '../components/AuthForm/AuthForm';

import './attachErrorHandler';
import '../styles/tokens.less';

import css from './App.module.less';

export interface AppProps {
	platformFacade?: PlatformFacade;
}

const defaultPlatformFacade = createPlatformFacade();

const AppBase: React.FC = () => {
	const platform = usePlatformFacade();
	const {
		accounts,
		activeAccountId,
		defaultAccountId,
		repository,
		isValidating,
		validationError,
		addAccount,
		removeAccount,
		switchTo,
		setAsDefault,
	} = useAccounts();

	const [overlayOpen, setOverlayOpen] = useState(false);

	const openOverlay = useCallback(() => setOverlayOpen(true), []);
	const closeOverlay = useCallback(() => setOverlayOpen(false), []);

	useEffect(() => {
		const handleDebugToggle = (event: KeyboardEvent) => {
			if (!isDebugOverlayToggleKey(event)) return;
			toggleDebugOverlaysEnabled();
		};

		window.addEventListener('keydown', handleDebugToggle, {capture: true});
		return () => window.removeEventListener('keydown', handleDebugToggle, {capture: true});
	}, []);

	useEffect(() => {
		const handleBackspaceExit = (event: KeyboardEvent) => {
			if (event.keyCode !== 8 || isEditableTarget(event.target)) return;
			try {
				window.close();
			} catch {
				// Let the webOS/WAM default Backspace behavior continue if explicit close is unavailable.
			}
		};

		window.addEventListener('keydown', handleBackspaceExit, {capture: true});
		return () => window.removeEventListener('keydown', handleBackspaceExit, {capture: true});
	}, []);

	const activeAccount = accounts.find(a => a.id === activeAccountId) ?? null;

	const accountLetter = activeAccount
		? (deriveLabel(activeAccount).match(/\S/)?.[0] ?? '?').toUpperCase()
		: '?';
	const accountGradient = activeAccount ? pickGradient(activeAccount.id) : '#333';
	const appDebugLines: DebugLine[] = [
		{label: 'accounts', value: accounts.length},
		{label: 'activeAccountId', value: activeAccountId ?? 'none'},
		{label: 'defaultAccountId', value: defaultAccountId ?? 'none'},
		{label: 'repositoryReady', value: !!repository},
		{label: 'isValidating', value: isValidating},
		{label: 'fetchGate', value: platform.getCapability('fetch').status},
		{label: 'validationError', value: validationError ?? 'none'},
	];

	const handleSwitch = useCallback(
		(id: string) => {
			switchTo(id);
			closeOverlay();
		},
		[switchTo, closeOverlay],
	);

	const handleAddAccount = useCallback(
		async (payload: AuthFormPayload): Promise<AuthSubmitResult> => {
			const result = await addAccount(payload);
			if (result.success) closeOverlay();
			return result;
		},
		[addAccount, closeOverlay],
	);

	const makeQueryClient = useCallback(
		() =>
			new QueryClient({
				queryCache: new QueryCache({
					onError: (error) => {
						if (error instanceof APIError && error.status === 401) openOverlay();
					},
				}),
			}),
		// Re-create only when activeAccountId changes (cache reset on account switch).
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[activeAccountId],
	);

	const queryClient = useMemo(makeQueryClient, [makeQueryClient]);

	// Branch 1: no accounts at all → first-launch flow
	if (accounts.length === 0) {
		return (
			<div className={css.app}>
				<LegacyDebugOverlay title="App Debug" slot={0} lines={appDebugLines.concat({label: 'branch', value: 'first-launch'})} />
				<Panels>
					<AccountPanel
						mode="first-launch"
						accounts={accounts}
						activeAccountId={activeAccountId}
						defaultAccountId={defaultAccountId}
						onSwitch={handleSwitch}
						onSetDefault={setAsDefault}
						onRemove={removeAccount}
						onAddAccount={handleAddAccount}
					/>
				</Panels>
			</div>
		);
	}

	// Branch 2: accounts exist but no repository yet
	if (isValidating && !repository && !overlayOpen) {
		return (
			<div className={css.app} style={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh'}}>
				<LegacyDebugOverlay title="App Debug" slot={0} lines={appDebugLines.concat({label: 'branch', value: 'validating'})} />
				<p>Loading…</p>
			</div>
		);
	}

	if (!repository) {
		// 401 on boot or validation failed — force account switch/re-auth
		return (
			<div className={css.app}>
				<LegacyDebugOverlay title="App Debug" slot={0} lines={appDebugLines.concat({label: 'branch', value: 'no-repository'})} />
				{validationError && (
					<div style={{position: 'fixed', top: '1rem', right: '1rem', color: '#ff9999', background: 'rgba(40,0,0,0.8)', padding: '0.5rem 1rem', borderRadius: '0.3rem', zIndex: 200}}>
						{validationError}
					</div>
				)}
				<Panels>
					<AccountPanel
						mode="overlay"
						accounts={accounts}
						activeAccountId={activeAccountId}
						defaultAccountId={defaultAccountId}
						onSwitch={handleSwitch}
						onSetDefault={setAsDefault}
						onRemove={removeAccount}
						onAddAccount={handleAddAccount}
					/>
				</Panels>
			</div>
		);
	}

	// Branch 3: repository ready
	return (
		<QueryClientProvider client={queryClient}>
			<RepositoryProvider key={activeAccountId ?? undefined} repository={repository}>
				<div className={css.app}>
					<MusicPlayer />
					<LegacyDebugOverlay title="App Debug" slot={0} lines={appDebugLines.concat({label: 'branch', value: 'main'})} />
					{validationError && (
						<div style={{position: 'fixed', top: '1rem', right: '1rem', color: '#ff9999', background: 'rgba(40,0,0,0.8)', padding: '0.5rem 1rem', borderRadius: '0.3rem', zIndex: 200}}>
							{validationError}
						</div>
					)}
					<AppLayout
						onOpenAccount={openOverlay}
						accountLetter={accountLetter}
						accountGradient={accountGradient}
					/>
					{overlayOpen && (
						<AccountPanel
							mode="overlay"
							accounts={accounts}
							activeAccountId={activeAccountId}
							defaultAccountId={defaultAccountId}
							onSwitch={handleSwitch}
							onSetDefault={setAsDefault}
							onRemove={removeAccount}
							onAddAccount={handleAddAccount}
							onCloseOverlay={closeOverlay}
						/>
					)}
				</div>
			</RepositoryProvider>
		</QueryClientProvider>
	);
};

const DecoratedApp = ThemeDecorator(AppBase);

const App: React.FC<AppProps> = ({platformFacade = defaultPlatformFacade}) => (
	<PlatformFacadeProvider value={platformFacade}>
		<DecoratedApp />
	</PlatformFacadeProvider>
);

export default App;
