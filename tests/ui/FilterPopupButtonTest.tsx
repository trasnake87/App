import {fireEvent, render, screen} from '@testing-library/react-native';

import FilterPopupButton from '@components/Search/FilterDropdowns/FilterPopupButton';
import Text from '@components/Text';

import type * as ReactNavigationCore from '@react-navigation/core';
import type {ReactElement} from 'react';
import type {StyleProp, ViewProps, ViewStyle} from 'react-native';
import type * as RNKeyboardController from 'react-native-keyboard-controller';

import React from 'react';
import {StyleSheet, View} from 'react-native';

/** Height the mocked keyboard reports. The keyboard animation carries it as a negative offset while the keyboard is open. */
const MOCK_KEYBOARD_HEIGHT = 300;

const mockPopoverProps: Array<Record<string, unknown>> = [];
const mockSheetStyles: Array<StyleProp<ViewStyle>> = [];

/** Stands in for the bottom-docked modal, recording the props and the sheet style `FilterPopupButton` hands it. */
function mockRenderPopover({children, ...props}: {children: ReactElement<ViewProps>} & Record<string, unknown>) {
    mockPopoverProps.push(props);
    mockSheetStyles.push(children.props.style);
    return <View testID="popover">{children}</View>;
}

jest.mock('@components/PopoverWithMeasuredContent', () => ({
    __esModule: true,
    default: mockRenderPopover,
}));

jest.mock('react-native-keyboard-controller', () => ({
    ...jest.requireActual<typeof RNKeyboardController>('react-native-keyboard-controller/jest'),
    useReanimatedKeyboardAnimation: () => ({height: {get: () => -MOCK_KEYBOARD_HEIGHT}, progress: {get: () => 1}}),
}));

// The bug only shows on a narrow layout, where the popover renders as a bottom-docked sheet
jest.mock('@hooks/useResponsiveLayout', () => () => ({isSmallScreenWidth: true, shouldUseNarrowLayout: true, isInLandscapeMode: false}));
jest.mock('@hooks/useOnyx', () => () => [undefined, {status: 'loaded'}]);
jest.mock('@react-navigation/core', () => ({
    ...jest.requireActual<typeof ReactNavigationCore>('@react-navigation/core'),
    useIsFocused: () => true,
}));

describe('FilterPopupButton', () => {
    it('gives the sheet room for a keyboard raised by a filter input instead of leaving it to the modal', async () => {
        // Given a filter dropdown on a narrow layout, with the keyboard open over the sheet
        render(
            <FilterPopupButton
                PopoverComponent={() => <Text>Apply</Text>}
                renderButton={({onPress, ref}) => (
                    <View ref={ref}>
                        <Text onPress={onPress}>Withdrawal ID</Text>
                    </View>
                )}
            />,
        );

        // When the dropdown is opened, which mounts the sheet once the anchor measurement resolves
        fireEvent.press(screen.getByText('Withdrawal ID'));
        await screen.findByTestId('popover');

        // Then the sheet's own content reserves the keyboard's full height, so the Reset/Apply row stays above it
        expect(StyleSheet.flatten(mockSheetStyles.at(-1))?.paddingBottom).toBe(MOCK_KEYBOARD_HEIGHT);

        // And the modal-root KeyboardAvoidingView, which mis-measured that room across two Android windows, is no longer asked for
        expect(mockPopoverProps.at(-1)).not.toHaveProperty('avoidKeyboard', true);
    });
});
