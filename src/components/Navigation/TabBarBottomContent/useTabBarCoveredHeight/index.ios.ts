import useKeyboardState from '@hooks/useKeyboardState';
import useResponsiveLayout from '@hooks/useResponsiveLayout';
import useSafeAreaInsets from '@hooks/useSafeAreaInsets';
import useSafeAreaPaddings from '@hooks/useSafeAreaPaddings';

import useIsTabBarVertical from '@libs/Navigation/AppNavigator/Navigators/NativeTabNavigator/useIsTabBarVertical';
import {getFloatingButtonsBottom} from '@libs/Navigation/AppNavigator/Navigators/NativeTabNavigator/useNativeTabBarOptions';

/**
 * The translucent UITabBar and the home indicator inset under it cover the bottom of a narrow tab root screen. A tab bar
 * laid out as a column sits beside the content, so only the home indicator inset covers it then.
 */
function useTabBarCoveredHeight(): number {
    const {shouldUseNarrowLayout} = useResponsiveLayout();
    const {bottom: bottomInset} = useSafeAreaInsets();
    const isTabBarVertical = useIsTabBarVertical();
    const {paddingBottom: keyboardSafeAreaOffset} = useSafeAreaPaddings(true);
    const {isKeyboardActive} = useKeyboardState();

    if (!shouldUseNarrowLayout) {
        return 0;
    }
    if (isKeyboardActive) {
        // An open keyboard covers the bar, and the KeyboardAvoidingView leaves the padding it offsets by under it.
        return keyboardSafeAreaOffset;
    }
    return isTabBarVertical ? bottomInset : getFloatingButtonsBottom(bottomInset);
}

export default useTabBarCoveredHeight;
