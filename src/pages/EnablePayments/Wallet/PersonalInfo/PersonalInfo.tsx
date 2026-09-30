import FullScreenLoadingIndicator from '@components/FullscreenLoadingIndicator';
import InteractiveStepWrapper from '@components/InteractiveStepWrapper';

import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';
import useSubPage from '@hooks/useSubPage';
import type {SubPageProps} from '@hooks/useSubPage/types';

import getWalletPersonalDetailsParams from '@pages/EnablePayments/shared/getWalletPersonalDetailsParams';
import IdologyQuestions from '@pages/EnablePayments/shared/IdologyQuestions';
import useWalletPhoneValidateCode from '@pages/EnablePayments/shared/useWalletPhoneValidateCode';
import {getPersonalInfoValuesFromProfile, isAddressComplete, isLegalNameComplete} from '@pages/EnablePayments/Wallet/utils/getAccountHolderDetails';
import getInitialSubstepForPersonalInfo from '@pages/EnablePayments/Wallet/utils/getInitialSubstepForPersonalInfo';
import getSubstepValues from '@pages/EnablePayments/Wallet/utils/getSubstepValues';

import {setDraftValues} from '@userActions/FormActions';
import {setAdditionalDetailsQuestions, updateCurrentStep} from '@userActions/Wallet';

import CONST from '@src/CONST';
import type {EnablePaymentsSubPageType} from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import ROUTES from '@src/ROUTES';
import INPUT_IDS from '@src/types/form/WalletAdditionalDetailsForm';
import {isEmptyObject} from '@src/types/utils/EmptyObject';

import {useEffect, useMemo, useState} from 'react';

import Address from './substeps/AddressStep';
import Confirmation from './substeps/ConfirmationStep';
import DateOfBirth from './substeps/DateOfBirthStep';
import LegalName from './substeps/LegalNameStep';
import PhoneNumber from './substeps/PhoneNumberStep';
import SocialSecurityNumber from './substeps/SocialSecurityNumberStep';

const PERSONAL_INFO_STEP_KEYS = INPUT_IDS.PERSONAL_INFO_STEP;
const PERSONAL_INFO_SUB_PAGES = CONST.ENABLE_PAYMENTS.PERSONAL_INFO_STEP.SUB_PAGE_NAMES;

const formPages = [
    {pageName: PERSONAL_INFO_SUB_PAGES.LEGAL_NAME, component: LegalName},
    {pageName: PERSONAL_INFO_SUB_PAGES.DATE_OF_BIRTH, component: DateOfBirth},
    {pageName: PERSONAL_INFO_SUB_PAGES.ADDRESS, component: Address},
    {pageName: PERSONAL_INFO_SUB_PAGES.PHONE_NUMBER, component: PhoneNumber},
    {pageName: PERSONAL_INFO_SUB_PAGES.SSN, component: SocialSecurityNumber},
    {pageName: PERSONAL_INFO_SUB_PAGES.CONFIRMATION, component: Confirmation},
];

function PersonalInfoPage() {
    const {translate} = useLocalize();

    const [walletAdditionalDetails] = useOnyx(ONYXKEYS.WALLET_ADDITIONAL_DETAILS);
    const [walletAdditionalDetailsDraft] = useOnyx(ONYXKEYS.FORMS.WALLET_ADDITIONAL_DETAILS_DRAFT);
    const [privatePersonalDetails] = useOnyx(ONYXKEYS.PRIVATE_PERSONAL_DETAILS);

    const showIdologyQuestions = walletAdditionalDetails?.questions && walletAdditionalDetails?.questions.length > 0;

    const {submitPersonalDetails} = useWalletPhoneValidateCode();

    const stepValues = useMemo(
        () => getSubstepValues(PERSONAL_INFO_STEP_KEYS, walletAdditionalDetailsDraft, walletAdditionalDetails),
        [walletAdditionalDetails, walletAdditionalDetailsDraft],
    );

    // The bank account step passes its name and address on through the draft, which a new session or another device
    // doesn't have. AddPersonalBankAccount also saved them to the profile, so a missing name or address comes from there.
    const valuesFromProfile = useMemo(() => getPersonalInfoValuesFromProfile(stepValues, privatePersonalDetails), [privatePersonalDetails, stepValues]);
    const values = useMemo(() => ({...stepValues, ...valuesFromProfile}), [stepValues, valuesFromProfile]);

    // The confirmation and edit pages, and the validate code page a new phone number goes through, read the draft, so
    // the profile values are copied there as well
    useEffect(() => {
        if (isEmptyObject(valuesFromProfile)) {
            return;
        }
        setDraftValues(ONYXKEYS.FORMS.WALLET_ADDITIONAL_DETAILS, valuesFromProfile);
    }, [valuesFromProfile]);

    const submit = () => {
        submitPersonalDetails(getWalletPersonalDetailsParams(values));
    };

    const startFrom = useMemo(() => getInitialSubstepForPersonalInfo(values), [values]);

    // The name and address are collected before the bank account is added, so their pages are skipped once complete.
    // Computed from the values present on entry and then frozen: if it tracked the draft, filling in a name or address on
    // this step would remove that same page from the Back path.
    const [skipPages] = useState(() => {
        const pagesToSkip: EnablePaymentsSubPageType[] = [];
        if (isLegalNameComplete(values)) {
            pagesToSkip.push(PERSONAL_INFO_SUB_PAGES.LEGAL_NAME);
        }
        if (isAddressComplete(values)) {
            pagesToSkip.push(PERSONAL_INFO_SUB_PAGES.ADDRESS);
        }
        return pagesToSkip;
    });

    const {CurrentPage, isEditing, pageIndex, nextPage, prevPage, moveTo, isRedirecting} = useSubPage<SubPageProps, EnablePaymentsSubPageType>({
        pages: formPages,
        skipPages,
        startFrom,
        onFinished: submit,
        buildRoute: (pageName, action) =>
            ROUTES.SETTINGS_ENABLE_PAYMENTS.getRoute({
                page: CONST.ENABLE_PAYMENTS.PAGE_NAMES.PERSONAL_INFO,
                subPage: pageName,
                action,
            }),
    });

    const handleBackButtonPress = () => {
        if (isEditing) {
            moveTo(formPages.length - 1, false);
            return;
        }

        if (showIdologyQuestions) {
            setAdditionalDetailsQuestions(null, '');
            return;
        }

        if (formPages.slice(0, pageIndex).every((page) => skipPages.includes(page.pageName))) {
            // Step back to the Add Bank Account step; the URL correction in EnablePaymentsPage navigates there.
            updateCurrentStep(CONST.WALLET.STEP.ADD_BANK_ACCOUNT);
            return;
        }
        prevPage();
    };

    if (isRedirecting) {
        return <FullScreenLoadingIndicator />;
    }

    return (
        <InteractiveStepWrapper
            wrapperID="PersonalInfoPage"
            headerTitle={translate('personalInfoStep.personalInfo')}
            handleBackButtonPress={handleBackButtonPress}
            startStepIndex={1}
            stepNames={CONST.WALLET.STEP_NAMES}
        >
            {showIdologyQuestions ? (
                <IdologyQuestions
                    questions={walletAdditionalDetails?.questions ?? []}
                    idNumber={walletAdditionalDetails?.idNumber ?? ''}
                />
            ) : (
                <CurrentPage
                    isEditing={isEditing}
                    onNext={nextPage}
                    onMove={moveTo}
                />
            )}
        </InteractiveStepWrapper>
    );
}

export default PersonalInfoPage;
