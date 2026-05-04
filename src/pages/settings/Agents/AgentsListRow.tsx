import React from 'react';
import {View} from 'react-native';
import Button from '@components/Button';
import ReportActionAvatars from '@components/ReportActionAvatars';
import Text from '@components/Text';
import useCurrentUserPersonalDetails from '@hooks/useCurrentUserPersonalDetails';
import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';
import useStyleUtils from '@hooks/useStyleUtils';
import useThemeStyles from '@hooks/useThemeStyles';
import {connect} from '@libs/actions/Delegate';
import {navigateToAndOpenReportWithAccountIDs} from '@libs/actions/Report';
import variables from '@styles/variables';
import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import {hasSeenTourSelector} from '@src/selectors/Onboarding';

type AgentsListRowProps = {
    /** Account ID of the agent */
    accountID: number;

    /** Display name of the agent */
    displayName: string;

    /** Login email of the agent */
    login: string;
};

function AgentsListRow({accountID, displayName, login}: AgentsListRowProps) {
    const styles = useThemeStyles();
    const StyleUtils = useStyleUtils();
    const {translate} = useLocalize();
    const {accountID: currentUserAccountID} = useCurrentUserPersonalDetails();
    const [introSelected] = useOnyx(ONYXKEYS.NVP_INTRO_SELECTED);
    const [isSelfTourViewed] = useOnyx(ONYXKEYS.NVP_ONBOARDING, {selector: hasSeenTourSelector});
    const [betas] = useOnyx(ONYXKEYS.BETAS);
    const [account] = useOnyx(ONYXKEYS.ACCOUNT);
    const [credentials] = useOnyx(ONYXKEYS.CREDENTIALS);
    const [session] = useOnyx(ONYXKEYS.SESSION);
    const [activePolicyID] = useOnyx(ONYXKEYS.NVP_ACTIVE_POLICY_ID);

    const handleChat = () => {
        navigateToAndOpenReportWithAccountIDs([accountID], currentUserAccountID, introSelected, isSelfTourViewed, betas);
    };

    const handleCopilot = () => {
        connect({
            email: login,
            delegatedAccess: account?.delegatedAccess,
            credentials,
            session,
            activePolicyID,
        });
    };

    return (
        <View style={[styles.selectionListPressableItemWrapper, styles.mb2, styles.gap3]}>
            <ReportActionAvatars
                accountIDs={[accountID]}
                size={CONST.AVATAR_SIZE.LARGE_NORMAL}
                shouldShowTooltip={false}
                singleAvatarContainerStyle={[StyleUtils.getWidthAndHeightStyle(variables.avatarSizeLargeNormal)]}
            />
            <View style={[styles.flex1, styles.gap1]}>
                <Text
                    numberOfLines={1}
                    style={styles.textStrong}
                >
                    {displayName}
                </Text>
                <Text
                    numberOfLines={1}
                    style={styles.mutedNormalTextLabel}
                >
                    {login}
                </Text>
            </View>
            <View style={[styles.flexRow, styles.gap2]}>
                <Button
                    small
                    text={translate('agentsPage.chat')}
                    onPress={handleChat}
                />
                <Button
                    small
                    text={translate('agentsPage.copilot')}
                    onPress={handleCopilot}
                />
            </View>
        </View>
    );
}

export default AgentsListRow;
