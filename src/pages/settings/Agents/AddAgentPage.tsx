import React from 'react';
import {View} from 'react-native';
import AvatarButtonWithIcon from '@components/AvatarButtonWithIcon';
import FormProvider from '@components/Form/FormProvider';
import InputWrapper from '@components/Form/InputWrapper';
import type {FormOnyxValues} from '@components/Form/types';
import HeaderWithBackButton from '@components/HeaderWithBackButton';
import {usePersonalDetails} from '@components/OnyxListItemProvider';
import ScreenWrapper from '@components/ScreenWrapper';
import TextInput from '@components/TextInput';
import {useMemoizedLazyExpensifyIcons, useMemoizedLazyIllustrations} from '@hooks/useLazyAsset';
import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';
import useTheme from '@hooks/useTheme';
import useThemeStyles from '@hooks/useThemeStyles';
import Navigation from '@libs/Navigation/Navigation';
import {createAgent} from '@userActions/Agent';
import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import INPUT_IDS from '@src/types/form/AddAgentForm';
import type {Errors} from '@src/types/onyx/OnyxCommon';

function AddAgentPage() {
    const {translate} = useLocalize();
    const styles = useThemeStyles();
    const theme = useTheme();
    const illustrations = useMemoizedLazyIllustrations(['AiBot']);
    const expensifyIcons = useMemoizedLazyExpensifyIcons(['Sync']);
    const personalDetailsList = usePersonalDetails();
    const [session] = useOnyx(ONYXKEYS.SESSION);

    const currentUserDisplayName = personalDetailsList?.[session?.accountID ?? CONST.DEFAULT_NUMBER_ID]?.displayName ?? '';
    const defaultAgentName = `${currentUserDisplayName}'s Agent`;

    const avatarStyle = [styles.avatarXLarge, styles.alignSelfCenter];

    const validate = (values: FormOnyxValues<typeof ONYXKEYS.FORMS.ADD_AGENT_FORM>): Errors => {
        const errors: Errors = {};
        if (!values[INPUT_IDS.FIRST_NAME].trim()) {
            errors[INPUT_IDS.FIRST_NAME] = translate('common.error.fieldRequired');
        }
        if (!values[INPUT_IDS.PROMPT].trim()) {
            errors[INPUT_IDS.PROMPT] = translate('common.error.fieldRequired');
        }
        return errors;
    };

    const handleSubmit = (values: FormOnyxValues<typeof ONYXKEYS.FORMS.ADD_AGENT_FORM>) => {
        createAgent(values[INPUT_IDS.FIRST_NAME].trim(), values[INPUT_IDS.PROMPT].trim());
        Navigation.goBack();
    };

    return (
        <ScreenWrapper
            testID={AddAgentPage.displayName}
            includeSafeAreaPaddingBottom
            offlineIndicatorStyle={styles.mtAuto}
        >
            <HeaderWithBackButton
                title={translate('addAgentPage.title')}
                onBackButtonPress={() => Navigation.goBack()}
            />
            <FormProvider
                formID={ONYXKEYS.FORMS.ADD_AGENT_FORM}
                onSubmit={handleSubmit}
                validate={validate}
                submitButtonText={translate('addAgentPage.createAgent')}
                style={[styles.flex1, styles.ph5]}
                shouldUseScrollView={false}
                submitFlexEnabled={false}
                enabledWhenOffline
            >
                <View style={[styles.alignItemsCenter, styles.mt5, styles.mb4]}>
                    <AvatarButtonWithIcon
                        text={translate('addAgentPage.switchAvatar')}
                        source={illustrations.AiBot}
                        onPress={() => {}}
                        size={CONST.AVATAR_SIZE.X_LARGE}
                        avatarStyle={avatarStyle}
                        editIcon={expensifyIcons.Sync}
                        editIconStyle={styles.smallEditIconAgent}
                        editIconFill={theme.textLight}
                        sentryLabel={CONST.SENTRY_LABEL.ADD_AGENT_PAGE.AVATAR}
                    />
                </View>
                <View style={styles.mb4}>
                    <InputWrapper
                        InputComponent={TextInput}
                        inputID={INPUT_IDS.FIRST_NAME}
                        label={translate('addAgentPage.agentName')}
                        accessibilityLabel={translate('addAgentPage.agentName')}
                        role={CONST.ROLE.PRESENTATION}
                        defaultValue={defaultAgentName}
                        autoCapitalize="words"
                        spellCheck={false}
                    />
                </View>
                <View style={[styles.flex1, styles.mb4]}>
                    <InputWrapper
                        InputComponent={TextInput}
                        inputID={INPUT_IDS.PROMPT}
                        label={translate('addAgentPage.instructions')}
                        accessibilityLabel={translate('addAgentPage.instructions')}
                        role={CONST.ROLE.PRESENTATION}
                        multiline
                        containerStyles={[styles.flex1]}
                        touchableInputWrapperStyle={[styles.flex1]}
                        textInputContainerStyles={[styles.flex1]}
                        inputStyle={[styles.flex1]}
                    />
                </View>
            </FormProvider>
        </ScreenWrapper>
    );
}

AddAgentPage.displayName = 'AddAgentPage';

export default AddAgentPage;
