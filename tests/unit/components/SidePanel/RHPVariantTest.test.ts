import SidePanelActions from '@libs/actions/SidePanel';
import Navigation from '@libs/Navigation/Navigation';

import CONST from '@src/CONST';
import ROUTES from '@src/ROUTES';

import type * as RHPVariantTest from '../../../../src/components/SidePanel/RHPVariantTest/index';

const mockIsReportTopmostSplitNavigator = jest.fn(() => false);

jest.mock('@expensify/react-native-hybrid-app', () => ({
    __esModule: true,
    default: {
        isHybridApp: jest.fn(() => false),
        shouldUseStaging: jest.fn(),
        closeReactNativeApp: jest.fn(),
        completeOnboarding: jest.fn(),
        switchAccount: jest.fn(),
        sendAuthToken: jest.fn(),
        getHybridAppSettings: jest.fn(() => Promise.resolve(null)),
        getInitialURL: jest.fn(() => Promise.resolve(null)),
        onURLListenerAdded: jest.fn(),
        signInToOldDot: jest.fn(),
        signOutFromOldDot: jest.fn(),
        startSignOut: jest.fn(),
        cancelSignOut: jest.fn(),
        clearOldDotAfterSignOut: jest.fn(),
    },
}));

jest.mock('react-native-onyx', () => ({
    __esModule: true,
    default: {
        connectWithoutView: jest.fn(),
    },
}));

jest.mock('@libs/Navigation/helpers/isReportTopmostSplitNavigator', () => ({
    __esModule: true,
    default: () => mockIsReportTopmostSplitNavigator(),
}));

jest.mock('@libs/Navigation/Navigation', () => ({
    __esModule: true,
    default: {
        navigate: jest.fn(),
    },
}));

jest.mock('@libs/actions/SidePanel', () => ({
    __esModule: true,
    default: {
        openSidePanel: jest.fn(),
    },
}));

const {handleRHPVariantNavigation} = jest.requireActual<typeof RHPVariantTest>('../../../../src/components/SidePanel/RHPVariantTest/index.ts');

describe('handleRHPVariantNavigation', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockIsReportTopmostSplitNavigator.mockReturnValue(false);
    });

    it('preserves the topmost report for the rhpHomePage variant', () => {
        // Given a report is already showing when the retired rhpHomePage arm exits onboarding
        mockIsReportTopmostSplitNavigator.mockReturnValue(true);

        // When the variant navigation runs
        handleRHPVariantNavigation('policyID', CONST.ONBOARDING_RHP_VARIANT.RHP_HOME_PAGE);

        // Then the report stays put and no side panel is opened over it
        expect(Navigation.navigate).not.toHaveBeenCalled();
        expect(SidePanelActions.openSidePanel).not.toHaveBeenCalled();
    });

    it('navigates home for the rhpHomePage variant when no report is topmost', () => {
        // Given nothing is revealed, so the retired rhpHomePage arm decides the landing page
        // When the variant navigation runs
        handleRHPVariantNavigation('policyID', CONST.ONBOARDING_RHP_VARIANT.RHP_HOME_PAGE);

        // Then the user lands on Home with the side panel closed, so Getting started is the only onboarding surface
        expect(Navigation.navigate).toHaveBeenCalledWith(ROUTES.HOME, undefined);
        expect(SidePanelActions.openSidePanel).not.toHaveBeenCalled();
    });

    it('navigates to the workspace overview for the rhpAdminsRoom variant without opening the side panel', () => {
        // Given an account still assigned the retired rhpAdminsRoom arm, which used to open #admins in the side panel
        // When the variant navigation runs
        handleRHPVariantNavigation('policyID', CONST.ONBOARDING_RHP_VARIANT.RHP_ADMINS_ROOM);

        // Then only the workspace overview opens; the side panel stays closed
        expect(Navigation.navigate).toHaveBeenCalledWith(ROUTES.WORKSPACE_OVERVIEW.getRoute('policyID'), undefined);
        expect(SidePanelActions.openSidePanel).not.toHaveBeenCalled();
    });
});
