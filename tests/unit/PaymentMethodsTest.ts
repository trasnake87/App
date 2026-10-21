import {clearAddPaymentCardDraftCurrency, transferWalletBalance} from '@userActions/PaymentMethods';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type {AddPaymentCardForm} from '@src/types/form/AddPaymentCardForm';
import type WalletTransfer from '@src/types/onyx/WalletTransfer';

import type {OnyxEntry} from 'react-native-onyx';

import Onyx from 'react-native-onyx';

import createMockPaymentMethod from '../utils/collections/paymentMethods';
import * as TestHelper from '../utils/TestHelper';
import waitForBatchedUpdates from '../utils/waitForBatchedUpdates';
import waitForNetworkPromises from '../utils/waitForNetworkPromises';

function getWalletTransfer(): Promise<OnyxEntry<WalletTransfer>> {
    return new Promise((resolve) => {
        const connection = Onyx.connect({
            key: ONYXKEYS.WALLET_TRANSFER,
            callback: (value) => {
                Onyx.disconnect(connection);
                resolve(value);
            },
        });
    });
}

function getAddPaymentCardDraft(): Promise<OnyxEntry<AddPaymentCardForm>> {
    return new Promise((resolve) => {
        const connection = Onyx.connect({
            key: ONYXKEYS.FORMS.ADD_PAYMENT_CARD_FORM_DRAFT,
            callback: (value) => {
                Onyx.disconnect(connection);
                resolve(value);
            },
        });
    });
}

describe('clearAddPaymentCardDraftCurrency', () => {
    beforeAll(() => {
        Onyx.init({keys: ONYXKEYS});
    });

    afterEach(async () => {
        await Onyx.clear();
        await waitForBatchedUpdates();
    });

    // The currency picker persists its selection to ADD_PAYMENT_CARD_FORM_DRAFT.currency, and FormProvider hydrates a
    // draft value over an input's defaultValue whenever that draft value is `!== undefined`. Clearing the draft with
    // `Onyx.merge({currency: null})` therefore only works because Onyx treats a nested null as a deletion sentinel and
    // strips the key. A literal null (e.g. if this were ever changed to `Onyx.set`) would be hydrated by FormProvider
    // and clobber the preferred-currency default, blanking the selector / submitting a null currency. Guard that here.
    it('removes the currency key from the draft rather than storing a literal null', async () => {
        // Given a currency the user picked earlier, still sitting in the add-card draft
        await Onyx.merge(ONYXKEYS.FORMS.ADD_PAYMENT_CARD_FORM_DRAFT, {currency: CONST.PAYMENT_CARD_CURRENCY.GBP});
        await waitForBatchedUpdates();

        // When the draft currency is cleared
        await clearAddPaymentCardDraftCurrency();

        const draft = await getAddPaymentCardDraft();

        // Then the key is gone rather than null, so FormProvider falls back to the preferred currency
        expect(draft).not.toHaveProperty('currency');
        expect(draft?.currency).toBeUndefined();
    });
});

describe('transferWalletBalance', () => {
    const selectedAccount = createMockPaymentMethod({accountType: CONST.PAYMENT_METHODS.PERSONAL_BANK_ACCOUNT});
    let mockFetch: ReturnType<typeof TestHelper.getGlobalFetchMock>;

    beforeAll(() => {
        Onyx.init({keys: ONYXKEYS});
    });

    beforeEach(async () => {
        mockFetch = TestHelper.getGlobalFetchMock();
        global.fetch = mockFetch;
        await TestHelper.signInWithTestUser();
        await waitForBatchedUpdates();
    });

    afterEach(async () => {
        await Onyx.clear();
        await waitForBatchedUpdates();
    });

    // The transfer gate on TransferBalancePage compares userWallet.currentBalance against the balance a transfer was
    // already submitted for, and WALLET_TRANSFER is the only trace of that submit. An ACH transfer is not debited
    // until the batch settles, so the wallet can still report the same positive balance right after a successful
    // transfer — meaning the marker has to outlive the success screen (successData must not clear it) while a failed
    // transfer must release the gate. Guard both halves here.
    it('remembers the balance a transfer was submitted for on success and clears it on failure', async () => {
        // Given a wallet balance the user just submitted a transfer for
        transferWalletBalance(selectedAccount, 1000);
        await waitForNetworkPromises();

        // Then the submitted balance is still recorded after the transfer succeeds, so the gate can block a second one
        expect((await getWalletTransfer())?.pendingTransferBalance).toBe(1000);

        // When a later transfer for the same balance fails
        mockFetch.fail();
        transferWalletBalance(selectedAccount, 1000);
        await waitForNetworkPromises();

        // Then the marker is cleared, so the user can retry that transfer
        expect((await getWalletTransfer())?.pendingTransferBalance).toBeUndefined();
    });
});
