import getAccountHolderDetails, {getSavedAccountHolderDetails, isAddressComplete, isLegalNameComplete} from '@pages/EnablePayments/Wallet/utils/getAccountHolderDetails';

import type {Country} from '@src/CONST';
import type {PrivatePersonalDetails} from '@src/types/onyx';

const SAVED_PROFILE: PrivatePersonalDetails = {
    legalFirstName: 'Rosa',
    legalLastName: 'Alvarez',
    addresses: [
        {street: '1 Old Rd', city: 'Boston', state: 'MA', zip: '02108', country: 'US', current: false},
        {street: '350 Fifth Avenue\nFloor 5', city: 'New York', state: 'NY', zip: '10118', country: 'US', current: true},
    ],
};

describe('getAccountHolderDetails', () => {
    describe('getSavedAccountHolderDetails', () => {
        it('returns the legal name and the current US address split into the bank account fields', () => {
            expect(getSavedAccountHolderDetails(SAVED_PROFILE)).toEqual({
                legalFirstName: 'Rosa',
                legalLastName: 'Alvarez',
                addressStreet: '350 Fifth Avenue',
                addressStreet2: 'Floor 5',
                addressCity: 'New York',
                addressState: 'NY',
                addressZipCode: '10118',
            });
        });

        it('keeps a unit saved in its own field and accepts an address saved with the country name', () => {
            // Older addresses can store the country name instead of its code
            // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- the country name is not a Country code, which is the legacy data being tested
            const legacyCountry = 'United States' as Country;
            const details = getSavedAccountHolderDetails({
                addresses: [{street: '350 Fifth Avenue', street2: 'Floor 5', city: 'New York', state: 'NY', zip: '10118', country: legacyCountry}],
            });

            expect(details.addressStreet).toBe('350 Fifth Avenue');
            expect(details.addressStreet2).toBe('Floor 5');
            expect(details.addressZipCode).toBe('10118');
        });

        it('treats an address saved without a country as a US one', () => {
            const details = getSavedAccountHolderDetails({addresses: [{street: '350 Fifth Avenue', city: 'New York', state: 'NY', zip: '10118', current: true}]});

            expect(details.addressStreet).toBe('350 Fifth Avenue');
            expect(details.addressCity).toBe('New York');
            expect(details.addressState).toBe('NY');
            expect(details.addressZipCode).toBe('10118');
        });

        it('leaves out an address in another country, since the wallet only supports US bank accounts', () => {
            const details = getSavedAccountHolderDetails({
                legalFirstName: 'Rosa',
                legalLastName: 'Alvarez',
                addresses: [{street: '10 Downing Street', city: 'London', state: '', zip: 'SW1A 2AA', country: 'GB', current: true}],
            });

            expect(details).toEqual({
                legalFirstName: 'Rosa',
                legalLastName: 'Alvarez',
                addressStreet: '',
                addressStreet2: '',
                addressCity: '',
                addressState: '',
                addressZipCode: '',
            });
        });

        it('returns empty values when nothing is saved', () => {
            expect(getSavedAccountHolderDetails(undefined)).toEqual({
                legalFirstName: '',
                legalLastName: '',
                addressStreet: '',
                addressStreet2: '',
                addressCity: '',
                addressState: '',
                addressZipCode: '',
            });
        });
    });

    it('sends the saved profile values for the pages that were skipped', () => {
        expect(getAccountHolderDetails(SAVED_PROFILE, {setupType: 'plaid'})).toEqual(getSavedAccountHolderDetails(SAVED_PROFILE));
    });

    it('prefers the values entered in the flow over the saved ones', () => {
        const details = getAccountHolderDetails(SAVED_PROFILE, {
            legalFirstName: 'Rosalind',
            legalLastName: 'Smith',
            addressStreet: '77 Harbor Way',
            addressCity: 'Portland',
            addressState: 'OR',
            addressZipCode: '97205',
        });

        expect(details).toEqual({
            legalFirstName: 'Rosalind',
            legalLastName: 'Smith',
            addressStreet: '77 Harbor Way',
            // The saved unit belongs to the saved street, so it is not sent with a different one
            addressStreet2: '',
            addressCity: 'Portland',
            addressState: 'OR',
            addressZipCode: '97205',
        });
    });

    it('keeps the saved unit when the street itself was not changed', () => {
        const details = getAccountHolderDetails(SAVED_PROFILE, {addressStreet: '350 Fifth Avenue', addressCity: 'New York', addressState: 'NY', addressZipCode: '10001'});

        expect(details.addressStreet2).toBe('Floor 5');
        expect(details.addressZipCode).toBe('10001');
    });

    it('fills a partially saved name from what was typed', () => {
        const details = getAccountHolderDetails({legalFirstName: 'Rosa'}, {legalLastName: 'Alvarez'});

        expect(details.legalFirstName).toBe('Rosa');
        expect(details.legalLastName).toBe('Alvarez');
    });

    describe('isLegalNameComplete', () => {
        it('needs both names with characters the legal name page accepts', () => {
            expect(isLegalNameComplete({legalFirstName: 'Rosa', legalLastName: 'Alvarez'})).toBe(true);
            expect(isLegalNameComplete({legalFirstName: 'Rosa', legalLastName: ''})).toBe(false);
            expect(isLegalNameComplete({legalFirstName: 'Rosa', legalLastName: 'Alv4rez'})).toBe(false);
        });
    });

    describe('isAddressComplete', () => {
        const address = {addressStreet: '350 Fifth Avenue', addressCity: 'New York', addressState: 'NY', addressZipCode: '10118'};

        it('accepts a complete physical US address', () => {
            expect(isAddressComplete(address)).toBe(true);
        });

        it('rejects a partial address', () => {
            expect(isAddressComplete({...address, addressState: ''})).toBe(false);
            expect(isAddressComplete({...address, addressStreet: ''})).toBe(false);
        });

        it('rejects values the US address page would not accept', () => {
            expect(isAddressComplete({...address, addressZipCode: 'SW1A 2AA'})).toBe(false);
            expect(isAddressComplete({...address, addressStreet: 'PO Box 123'})).toBe(false);
        });
    });
});
