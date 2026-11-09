import {fireEvent, render, screen} from '@testing-library/react-native';

import MigratedUserWelcomeModal from '@components/MigratedUserWelcomeModal';
import OnyxListItemProvider from '@components/OnyxListItemProvider';

import ONYXKEYS from '@src/ONYXKEYS';

import type * as NativeNavigation from '@react-navigation/native';
import type {ViewProps} from 'react-native';
import type ReactNative from 'react-native';

import React from 'react';
import Onyx from 'react-native-onyx';

// Record the order of the root-stack dispatches the modal makes, so we can assert both land in the
// same tick instead of the second one being queued behind a transition that never starts on iOS.
const dispatchOrder: string[] = [];
const mockGoBack = jest.fn();
const mockNavigate = jest.fn();

jest.mock('@hooks/useLocalize', () => () => ({
    translate: (key: string) => key,
}));

jest.mock('@hooks/useBeforeRemove', () => () => {});

jest.mock('@hooks/useIsPaidPolicyAdmin', () => () => false);

jest.mock('@react-navigation/native', () => ({
    ...((): typeof NativeNavigation => jest.requireActual('@react-navigation/native'))(),
    useFocusEffect: jest.fn(),
}));

jest.mock('@libs/Navigation/Navigation', () => ({
    goBack: (...args: unknown[]) => {
        dispatchOrder.push('goBack');
        mockGoBack(...args);
    },
    navigate: (...args: unknown[]) => {
        dispatchOrder.push('navigate');
        mockNavigate(...args);
    },
}));

jest.mock('@libs/actions/Welcome', () => ({
    dismissProductTraining: jest.fn(),
}));

jest.mock('@components/RenderHTML', () => ({
    __esModule: true,
    default: () => null,
}));

jest.mock('@components/ImageSVG', () => {
    const {View} = require<typeof ReactNative>('react-native');
    return (props: ViewProps) => <View {...props} />;
});

describe('MigratedUserWelcomeModal', () => {
    beforeAll(() => {
        Onyx.init({keys: ONYXKEYS});
    });

    beforeEach(() => {
        dispatchOrder.length = 0;
        mockGoBack.mockClear();
        mockNavigate.mockClear();
    });

    it('navigates to the Reports search in the same tick as the dismissal', () => {
        // Given the welcome modal is open
        render(
            <OnyxListItemProvider>
                <MigratedUserWelcomeModal />
            </OnyxListItemProvider>,
        );

        // When the modal is dismissed through the full-screen backdrop that covers the window while
        // the dismissal plays, which runs the same handleClose as the confirm button
        fireEvent.press(screen.getByRole('button', {name: 'common.close'}));

        // Then the dismissal and the Reports navigation are both dispatched synchronously, with no
        // transition callback left to release the second one ~1s later and strand the fading overlay
        // over the screen the user came from.
        expect(dispatchOrder).toEqual(['goBack', 'navigate']);
        expect(mockGoBack).toHaveBeenCalledWith();
        expect(mockNavigate).toHaveBeenCalledTimes(1);
    });
});
