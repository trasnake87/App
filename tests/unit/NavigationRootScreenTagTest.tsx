import {render} from '@testing-library/react-native';

import {navigationRef} from '@libs/Navigation/Navigation';
import NavigationRoot from '@libs/Navigation/NavigationRoot';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import ROUTES from '@src/ROUTES';
import SCREENS from '@src/SCREENS';

import type * as ReactNavigation from '@react-navigation/native';
import type {NavigationState} from '@react-navigation/native';

import * as Sentry from '@sentry/react-native';
import React from 'react';
import Onyx from 'react-native-onyx';

import waitForBatchedUpdates from '../utils/waitForBatchedUpdates';

// The `mock` prefix lets the hoisted jest.mock factory expose the onStateChange handler NavigationRoot passes down.
let mockCapturedOnStateChange: ((state: NavigationState | undefined) => void) | undefined;

jest.mock('@react-navigation/native', () => {
    const actualNav = jest.requireActual<typeof ReactNavigation>('@react-navigation/native');
    return {
        ...actualNav,
        NavigationContainer: ({onStateChange}: {onStateChange?: (state: NavigationState | undefined) => void}) => {
            mockCapturedOnStateChange = onStateChange;
            return null;
        },
    };
});
jest.mock('@sentry/react-native', () => ({
    ...jest.requireActual<typeof Sentry>('@sentry/react-native'),
    setTag: jest.fn(),
    addBreadcrumb: jest.fn(),
}));
jest.mock('@libs/Navigation/AppNavigator', () => () => null);
jest.mock('@libs/NavigationFocusReturn', () => ({setupNavigationFocusReturn: jest.fn(), teardownNavigationFocusReturn: jest.fn()}));
jest.mock('@src/libs/telemetry/useStartSpansOnRender', () => jest.fn());
jest.mock('@hooks/useTheme', () => () => ({appBG: '#000000', colorScheme: 'dark'}));
jest.mock('@hooks/useResponsiveLayout', () => () => ({shouldUseNarrowLayout: true}));

describe('NavigationRoot screen tag', () => {
    beforeAll(() => {
        Onyx.init({keys: ONYXKEYS});
    });

    beforeEach(async () => {
        mockCapturedOnStateChange = undefined;
        jest.clearAllMocks();
        await Onyx.clear();
        await waitForBatchedUpdates();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('tags the active screen on every navigation so native app hang events can be grouped by screen', () => {
        // Given a mounted NavigationRoot whose navigation ref reports the report screen as the focused route
        jest.spyOn(navigationRef, 'getCurrentRoute').mockReturnValue({key: 'Report_Screen-1', name: SCREENS.REPORT, params: {reportID: '1'}});
        render(
            <NavigationRoot
                authenticated
                lastVisitedPath={ROUTES.HOME}
                initialUrl={null}
                onReady={() => {}}
            />,
        );

        // When React Navigation reports a state change, which is the only point where the topmost screen is known
        if (!mockCapturedOnStateChange) {
            throw new Error('NavigationRoot did not register an onStateChange handler');
        }
        mockCapturedOnStateChange({
            key: 'stack-1',
            index: 0,
            routeNames: [SCREENS.REPORT],
            routes: [{key: 'Report_Screen-1', name: SCREENS.REPORT, params: {reportID: '1'}}],
            type: 'stack',
            stale: false,
        });

        // Then the screen name is written to the Sentry scope as a tag, because breadcrumbs do not take part in
        // grouping and a native app hang event would otherwise only carry the uninformative watchdog stack
        expect(Sentry.setTag).toHaveBeenCalledWith(CONST.TELEMETRY.TAGS.SCREEN, SCREENS.REPORT);
    });
});
