import {renderHook} from '@testing-library/react-native';

import useTabBarCoveredHeight from '@components/Navigation/TabBarBottomContent/useTabBarCoveredHeight/index.ios';

import variables from '@styles/variables';

const mockKeyboardState = {isKeyboardActive: false};

jest.mock('@hooks/useResponsiveLayout', () => () => ({shouldUseNarrowLayout: true}));
jest.mock('@hooks/useSafeAreaInsets', () => () => ({top: 0, bottom: 34, left: 0, right: 0}));
// The iOS KeyboardAvoidingView offsets by this padding, which is the scaled bottom inset on iOS.
jest.mock('@hooks/useSafeAreaPaddings', () => () => ({paddingBottom: 34 * 0.7}));
jest.mock('@libs/Navigation/AppNavigator/Navigators/NativeTabNavigator/useIsTabBarVertical', () => () => false);
jest.mock('@hooks/useKeyboardState', () => () => mockKeyboardState);

describe('useTabBarCoveredHeight', () => {
    it('reserves the bar only while the keyboard is down, and the padding left under the keyboard while it is up', () => {
        // Given a narrow iPhone layout with a 34pt home indicator inset and a horizontal UITabBar, keyboard down
        mockKeyboardState.isKeyboardActive = false;
        const {result, rerender} = renderHook(() => useTabBarCoveredHeight());
        const coveredWhileKeyboardDown = result.current;

        // When the keyboard opens over the tab bar, so that nothing of the bar is left to clear
        mockKeyboardState.isKeyboardActive = true;
        rerender(undefined);

        // Then the floating buttons and the inset are cleared only while the keyboard is down; while it is up the hook
        // returns just the bottom safe area padding the KeyboardAvoidingView leaves under the keyboard, so that the
        // footer sits on the keyboard instead of above a blank strip
        expect(coveredWhileKeyboardDown).toBe(variables.iosNativeTabBarFloatingButtonsBottom + 34);
        expect(result.current).toBeCloseTo(34 * variables.iosSafeAreaInsetsPercentage);
    });
});
