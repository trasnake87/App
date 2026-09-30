import CommonAddressStep from '@components/SubStepForms/AddressStep';

import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';
import usePersonalBankAccountDetailsFormSubmit from '@hooks/usePersonalBankAccountDetailsFormSubmit';
import type {SubPageProps} from '@hooks/useSubPage/types';

import {getSavedAccountHolderDetails} from '@pages/EnablePayments/Wallet/utils/getAccountHolderDetails';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import INPUT_IDS from '@src/types/form/PersonalBankAccountForm';

import React from 'react';

const BANK_INFO_STEP_KEYS = INPUT_IDS.BANK_INFO_STEP;

const INPUT_KEYS = {
    street: BANK_INFO_STEP_KEYS.STREET,
    city: BANK_INFO_STEP_KEYS.CITY,
    state: BANK_INFO_STEP_KEYS.STATE,
    zipCode: BANK_INFO_STEP_KEYS.ZIP_CODE,
};

const STEP_FIELDS = [BANK_INFO_STEP_KEYS.STREET, BANK_INFO_STEP_KEYS.CITY, BANK_INFO_STEP_KEYS.STATE, BANK_INFO_STEP_KEYS.ZIP_CODE];

/** The wallet only supports US bank accounts, so this uses the same US address form as the wallet's personal info step. */
function AddressStep({onNext, onMove, isEditing}: SubPageProps) {
    const {translate} = useLocalize();
    const [privatePersonalDetails] = useOnyx(ONYXKEYS.PRIVATE_PERSONAL_DETAILS);

    const savedDetails = getSavedAccountHolderDetails(privatePersonalDetails);
    const defaultValues = {
        street: savedDetails.addressStreet,
        city: savedDetails.addressCity,
        state: savedDetails.addressState,
        zipCode: savedDetails.addressZipCode,
        country: CONST.COUNTRY.US,
    };

    const handleSubmit = usePersonalBankAccountDetailsFormSubmit({
        fieldIds: STEP_FIELDS,
        onNext,
        shouldSaveDraft: isEditing,
    });

    return (
        <CommonAddressStep<typeof ONYXKEYS.FORMS.PERSONAL_BANK_ACCOUNT_FORM>
            isEditing={isEditing}
            onNext={onNext}
            onMove={onMove}
            formID={ONYXKEYS.FORMS.PERSONAL_BANK_ACCOUNT_FORM}
            formTitle={translate('personalInfoStep.whatsYourAddress')}
            formPOBoxDisclaimer={translate('personalInfoStep.addressSubtitle')}
            onSubmit={handleSubmit}
            stepFields={STEP_FIELDS}
            inputFieldsIDs={INPUT_KEYS}
            defaultValues={defaultValues}
            shouldAllowCountryChange={false}
            shouldShowHelpLinks
            forwardedFSClass={CONST.FULLSTORY.CLASS.MASK}
        />
    );
}

export default AddressStep;
