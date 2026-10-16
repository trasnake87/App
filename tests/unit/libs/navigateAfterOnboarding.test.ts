import SidePanelActions from '@libs/actions/SidePanel';
import {setOnboardingRHPVariant} from '@libs/actions/Welcome';
import {navigateToSubmitWorkspaceAfterOnboardingWithMicrotaskQueue} from '@libs/navigateAfterOnboarding';
import Navigation from '@libs/Navigation/Navigation';
import {buildCannedSearchQuery} from '@libs/SearchQueryUtils';

import CONST from '@src/CONST';
import ROUTES from '@src/ROUTES';

jest.mock('@libs/Navigation/Navigation', () => ({
    __esModule: true,
    default: {
        dismissModal: jest.fn((options?: {afterTransition?: () => void}) => options?.afterTransition?.()),
        navigate: jest.fn(),
        setNavigationActionToMicrotaskQueue: jest.fn((callback: () => void) => callback()),
    },
}));

jest.mock('@libs/actions/SidePanel', () => ({
    __esModule: true,
    default: {openSidePanel: jest.fn()},
}));

jest.mock('@libs/actions/Welcome', () => ({
    setOnboardingRHPVariant: jest.fn(),
}));

jest.mock('@libs/actions/Modal', () => ({
    setDisableDismissOnEscape: jest.fn(),
}));

const navigationMock = jest.mocked(Navigation);

describe('navigateToSubmitWorkspaceAfterOnboardingWithMicrotaskQueue', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('navigates to HOME without opening the side panel when policyID is missing', () => {
        navigateToSubmitWorkspaceAfterOnboardingWithMicrotaskQueue(undefined);

        expect(navigationMock.dismissModal).toHaveBeenCalledTimes(1);
        expect(navigationMock.navigate).toHaveBeenCalledTimes(1);
        expect(navigationMock.navigate).toHaveBeenCalledWith(ROUTES.HOME);
        // Without a workspace there is no #admins room to surface in the side panel.
        expect(setOnboardingRHPVariant).not.toHaveBeenCalled();
        expect(SidePanelActions.openSidePanel).not.toHaveBeenCalled();
    });

    it('navigates to Spend > Expenses without opening the side panel', () => {
        // Given a Submit workspace was created during onboarding, which keeps its own Expenses landing A/B test
        // When onboarding exits to that workspace
        navigateToSubmitWorkspaceAfterOnboardingWithMicrotaskQueue('test-policy-id');

        // Then Expenses still opens
        expect(navigationMock.dismissModal).toHaveBeenCalledTimes(1);
        expect(navigationMock.navigate).toHaveBeenCalledTimes(1);
        expect(navigationMock.navigate).toHaveBeenCalledWith(
            ROUTES.SEARCH_ROOT.getRoute({query: buildCannedSearchQuery({type: CONST.SEARCH.DATA_TYPES.EXPENSE}), searchKey: CONST.SEARCH.SEARCH_KEYS.EXPENSES}),
        );
        // Then no onboarding exit opens the side panel, so the #admins default is never assigned either
        expect(setOnboardingRHPVariant).not.toHaveBeenCalled();
        expect(SidePanelActions.openSidePanel).not.toHaveBeenCalled();
    });
});
