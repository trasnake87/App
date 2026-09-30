import {getCountryCode} from '@libs/CountryUtils';
import {getCurrentAddress, getStreetLines} from '@libs/PersonalDetailsUtils';
import {isValidAddress, isValidLegalName, isValidZipCode} from '@libs/ValidationUtils';

import CONST from '@src/CONST';
import type {PersonalBankAccountForm} from '@src/types/form';
import type {PersonalInfoStepProps} from '@src/types/form/WalletAdditionalDetailsForm';
import type {PrivatePersonalDetails} from '@src/types/onyx';

import type {OnyxEntry} from 'react-native-onyx';

/** The owner's legal name and address, in the fields AddPersonalBankAccount takes them from */
type AccountHolderDetails = {
    legalFirstName: string;
    legalLastName: string;
    addressStreet: string;
    addressStreet2: string;
    addressCity: string;
    addressState: string;
    addressZipCode: string;
};

/** The same details in the wallet personal info form */
type WalletPersonalInfoValues = Pick<PersonalInfoStepProps, 'legalFirstName' | 'legalLastName' | 'addressStreet' | 'addressCity' | 'addressState' | 'addressZipCode'>;

/**
 * The legal name and address saved in the profile. The wallet only supports US bank accounts, so an address in
 * another country is left out rather than prefilled or sent.
 */
function getSavedAccountHolderDetails(privatePersonalDetails: OnyxEntry<PrivatePersonalDetails>): AccountHolderDetails {
    const address = getCurrentAddress(privatePersonalDetails);
    // Like BankAccountUtils, an address saved without a country counts as a US one, and older addresses can store the
    // country name instead of its code
    const usAddress = !address?.country || getCountryCode(address.country) === CONST.COUNTRY.US ? address : undefined;
    const [street1, street2] = getStreetLines(usAddress?.street);

    return {
        legalFirstName: privatePersonalDetails?.legalFirstName ?? '',
        legalLastName: privatePersonalDetails?.legalLastName ?? '',
        addressStreet: street1 ?? '',
        // The unit can be stored after a newline in `street` or in its own field
        addressStreet2: street2 ?? usAddress?.street2 ?? usAddress?.addressLine2 ?? '',
        addressCity: usAddress?.city ?? '',
        addressState: usAddress?.state ?? '',
        addressZipCode: usAddress?.zip ?? '',
    };
}

/**
 * Builds the AddPersonalBankAccount name and address one field at a time. A field typed on this flow's legal name or
 * address page is used as typed; any other field comes from the profile, the same as for a page that was skipped.
 */
function getAccountHolderDetails(privatePersonalDetails: OnyxEntry<PrivatePersonalDetails>, draft: OnyxEntry<Partial<PersonalBankAccountForm>>): AccountHolderDetails {
    const savedDetails = getSavedAccountHolderDetails(privatePersonalDetails);
    const addressStreet = draft?.addressStreet ?? savedDetails.addressStreet;

    return {
        legalFirstName: draft?.legalFirstName ?? savedDetails.legalFirstName,
        legalLastName: draft?.legalLastName ?? savedDetails.legalLastName,
        addressStreet,
        // The form has a single street line, so the saved unit is only kept with the saved street it belongs to
        addressStreet2: addressStreet === savedDetails.addressStreet ? savedDetails.addressStreet2 : (draft?.addressStreet2 ?? ''),
        addressCity: draft?.addressCity ?? savedDetails.addressCity,
        addressState: draft?.addressState ?? savedDetails.addressState,
        addressZipCode: draft?.addressZipCode ?? savedDetails.addressZipCode,
    };
}

/** Whether both legal names are filled in with values the legal name page accepts */
function isLegalNameComplete({legalFirstName, legalLastName}: Pick<AccountHolderDetails, 'legalFirstName' | 'legalLastName'>): boolean {
    return !!legalFirstName && !!legalLastName && isValidLegalName(legalFirstName) && isValidLegalName(legalLastName);
}

/** Whether the address is filled in with values the US address page accepts */
function isAddressComplete({
    addressStreet,
    addressCity,
    addressState,
    addressZipCode,
}: Pick<AccountHolderDetails, 'addressStreet' | 'addressCity' | 'addressState' | 'addressZipCode'>): boolean {
    return isValidAddress(addressStreet) && !!addressCity && !!addressState && isValidZipCode(addressZipCode);
}

/** The details as the wallet personal info form holds them: it has a single street field, so a unit goes on that line */
function getWalletPersonalInfoValues(details: AccountHolderDetails): WalletPersonalInfoValues {
    return {
        legalFirstName: details.legalFirstName,
        legalLastName: details.legalLastName,
        addressStreet: details.addressStreet2 ? `${details.addressStreet}, ${details.addressStreet2}` : details.addressStreet,
        addressCity: details.addressCity,
        addressState: details.addressState,
        addressZipCode: details.addressZipCode,
    };
}

/**
 * The profile's legal name and address for whichever of the two the wallet personal info step has no complete value
 * for. Each is taken whole, and only when the profile's own value is complete, so sources are never mixed.
 */
function getPersonalInfoValuesFromProfile(values: WalletPersonalInfoValues, privatePersonalDetails: OnyxEntry<PrivatePersonalDetails>): Partial<WalletPersonalInfoValues> {
    const profileValues = getWalletPersonalInfoValues(getSavedAccountHolderDetails(privatePersonalDetails));
    const {legalFirstName, legalLastName, ...address} = profileValues;

    return {
        ...(!isLegalNameComplete(values) && isLegalNameComplete(profileValues) ? {legalFirstName, legalLastName} : {}),
        ...(!isAddressComplete(values) && isAddressComplete(profileValues) ? address : {}),
    };
}

export default getAccountHolderDetails;
export {getPersonalInfoValuesFromProfile, getSavedAccountHolderDetails, getWalletPersonalInfoValues, isAddressComplete, isLegalNameComplete};
export type {AccountHolderDetails, WalletPersonalInfoValues};
