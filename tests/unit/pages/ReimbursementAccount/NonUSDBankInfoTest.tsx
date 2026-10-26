import {fireEvent, render, screen} from '@testing-library/react-native';

import OnyxListItemProvider from '@components/OnyxListItemProvider';
import {PressableWithoutFeedback} from '@components/Pressable';

import {navigationRef} from '@libs/Navigation/Navigation';
import createPlatformStackNavigator from '@libs/Navigation/PlatformStackNavigation/createPlatformStackNavigator';
import type {ReimbursementAccountNavigatorParamList} from '@libs/Navigation/types';

import BankInfo from '@pages/ReimbursementAccount/NonUSD/BankInfo/BankInfo';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import SCREENS from '@src/SCREENS';

import type {ReactElement} from 'react';

import {NavigationContainer} from '@react-navigation/native';
import React from 'react';
import Onyx from 'react-native-onyx';

import waitForBatchedUpdates from '../../../utils/waitForBatchedUpdates';

const mockCreateCorpayBankAccount = jest.fn<void, unknown[]>();

// Only the three commands BankInfo calls are mocked - requiring the real module here pulls in a cycle that breaks the suite
jest.mock('@userActions/BankAccounts', () => ({
    createCorpayBankAccount: (...args: unknown[]) => mockCreateCorpayBankAccount(...args),
    getCorpayBankAccountFields: jest.fn(),
    clearReimbursementAccountBankCreation: jest.fn(),
}));

const mockConfirmation = jest.fn<ReactElement, [{onNext: () => void}]>();

// The real sub page renders Corpay form fields we don't need here - all the test needs is a way to fire the Confirm press
jest.mock('@pages/ReimbursementAccount/NonUSD/BankInfo/subSteps/Confirmation', () => ({
    __esModule: true,
    default: (props: {onNext: () => void}) => mockConfirmation(props),
}));

const POLICY_ID = '1';
const BANK_ACCOUNT_ID = 123;

const Stack = createPlatformStackNavigator<ReimbursementAccountNavigatorParamList>();

function renderBankInfo(onSubmit: () => void) {
    return render(
        <OnyxListItemProvider>
            <NavigationContainer
                ref={navigationRef}
                initialState={{
                    index: 0,
                    routes: [
                        {
                            name: SCREENS.REIMBURSEMENT_ACCOUNT_NON_USD,
                            params: {
                                policyID: POLICY_ID,
                                page: CONST.NON_USD_BANK_ACCOUNT.PAGE_NAME.BANK_INFO,
                                subPage: CONST.NON_USD_BANK_ACCOUNT.BANK_INFO_STEP.SUB_PAGE_NAMES.CONFIRMATION,
                            },
                        },
                    ],
                }}
            >
                <Stack.Navigator>
                    <Stack.Screen name={SCREENS.REIMBURSEMENT_ACCOUNT_NON_USD}>
                        {() => (
                            <BankInfo
                                onSubmit={onSubmit}
                                onBackButtonPress={jest.fn()}
                                policyID={POLICY_ID}
                            />
                        )}
                    </Stack.Screen>
                </Stack.Navigator>
            </NavigationContainer>
        </OnyxListItemProvider>,
    );
}

describe('NonUSD BankInfo', () => {
    beforeAll(() => {
        Onyx.init({keys: ONYXKEYS});
    });

    beforeEach(() => {
        mockCreateCorpayBankAccount.mockClear();
        mockConfirmation.mockImplementation(({onNext}) => (
            <PressableWithoutFeedback
                testID="confirm-button"
                accessibilityLabel="Confirm"
                role={CONST.ROLE.BUTTON}
                onPress={onNext}
            />
        ));
        return Onyx.clear().then(waitForBatchedUpdates);
    });

    it('moves to the next step instead of recreating the bank account when Confirm is pressed again after the account was created', async () => {
        // Given a non USD setup for this policy whose bank account was already created by an earlier Confirm press
        await Onyx.merge(ONYXKEYS.REIMBURSEMENT_ACCOUNT, {
            achData: {
                policyID: POLICY_ID,
                bankAccountID: BANK_ACCOUNT_ID,
                created: '2026-10-26 09:00:00',
            },
        });
        await waitForBatchedUpdates();

        const onSubmit = jest.fn();
        renderBankInfo(onSubmit);
        await waitForBatchedUpdates();

        // When the user goes back from Business info to this step's Confirmation page and presses Confirm again
        fireEvent.press(screen.getByTestId('confirm-button'));
        await waitForBatchedUpdates();

        // Then no duplicate BankAccount_CreateCorpay is sent, and the flow just advances to Business info,
        // so the raw backend rejection message can never land above Confirm
        expect(mockCreateCorpayBankAccount).not.toHaveBeenCalled();
        expect(onSubmit).toHaveBeenCalledTimes(1);
    });
});
