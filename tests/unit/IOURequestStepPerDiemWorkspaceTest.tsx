import {act, render, screen} from '@testing-library/react-native';

import {fetchPerDiemRates} from '@libs/actions/Policy/PerDiem';
import Navigation from '@libs/Navigation/Navigation';

import BaseRequestStepWorkspace from '@pages/iou/request/step/BaseRequestStepWorkspace';

import {setMoneyRequestParticipants} from '@userActions/IOU/MoneyRequest';

import CONST from '@src/CONST';
import type {Policy, Transaction} from '@src/types/onyx';

import type {ComponentType} from 'react';

import React from 'react';
// eslint-disable-next-line no-restricted-imports
import {ActivityIndicator} from 'react-native';

import createMock from '../utils/createMock';

const POLICY_ID = 'policy123';
const TRANSACTION_ID = 'transaction456';

// The page is wrapped in a data-fetching HOC; make it pass-through so the inner component can be rendered directly.
jest.mock('@pages/iou/request/step/withFullTransactionOrNotFound', () => (Component: ComponentType) => Component);

// The workspace list is only rendered to capture the onSelectWorkspace callback the picker hands it.
jest.mock('@pages/iou/request/step/BaseRequestStepWorkspace', () => jest.fn(() => null));

jest.mock('@hooks/useThemeStyles', () => ({
    __esModule: true,
    default: () => ({}),
}));

jest.mock('@hooks/useNetwork', () => ({
    __esModule: true,
    default: () => ({isOffline: false}),
}));

jest.mock('@hooks/useCurrentUserPersonalDetails', () => ({
    __esModule: true,
    default: () => ({accountID: 1}),
}));

jest.mock('@hooks/useDefaultExpensePolicy', () => ({
    __esModule: true,
    default: () => undefined,
}));

jest.mock('@hooks/usePersonalPolicy', () => ({
    __esModule: true,
    default: () => undefined,
}));

// Nothing in this test depends on Onyx data: the picked policy is handed to onSelectWorkspace directly.
jest.mock('@hooks/useOnyx', () => ({
    __esModule: true,
    default: () => [undefined],
}));

// The target report is the workspace chat of the picked policy, so Destination could resolve the policy on its own.
jest.mock('@libs/IOUUtils', () => ({
    getInitialPerDiemTargetReport: () => ({
        targetReport: {reportID: 'report789', policyID: 'policy123'},
        targetIouType: 'submit',
        transactionReportID: 'report789',
    }),
}));

jest.mock('@libs/actions/Policy/PerDiem', () => ({
    fetchPerDiemRates: jest.fn(),
}));

jest.mock('@userActions/IOU/MoneyRequest', () => ({
    setCustomUnitID: jest.fn(),
    setMoneyRequestCategory: jest.fn(),
    setMoneyRequestParticipants: jest.fn(),
    setMoneyRequestParticipantsFromReport: jest.fn(),
}));

jest.mock('@userActions/Transaction', () => ({
    setTransactionReport: jest.fn(),
}));

jest.mock('@libs/Navigation/Navigation', () => ({
    __esModule: true,
    default: {navigate: jest.fn()},
}));

const IOURequestStepPerDiemWorkspace = require<{
    default: ComponentType<{
        route: {params: {action: string; iouType: string; transactionID: string}};
        navigation: unknown;
        transaction?: Transaction;
    }>;
}>('@pages/iou/request/step/IOURequestStepPerDiemWorkspace').default;

const renderPage = () =>
    render(
        <IOURequestStepPerDiemWorkspace
            route={{params: {action: CONST.IOU.ACTION.CREATE, iouType: CONST.IOU.TYPE.CREATE, transactionID: TRANSACTION_ID}}}
            navigation={{}}
            transaction={createMock<Transaction>({transactionID: TRANSACTION_ID, isFromGlobalCreate: true})}
        />,
    );

const pickWorkspace = (policy: Policy) => {
    const props = jest.mocked(BaseRequestStepWorkspace).mock.calls.at(-1)?.[0];
    if (!props) {
        throw new Error('BaseRequestStepWorkspace was not rendered');
    }
    act(() => {
        props.onSelectWorkspace?.(policy);
    });
};

describe('IOURequestStepPerDiemWorkspace', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('waits in the tab for the rates when the picked policy has a per diem unit without rates', () => {
        // Given a policy whose per diem custom unit arrived from OpenApp without its rates
        renderPage();
        const policy = createMock<Policy>({
            id: POLICY_ID,
            customUnits: {
                perDiem: {customUnitID: 'unit1', name: CONST.CUSTOM_UNITS.NAME_PER_DIEM_INTERNATIONAL, rates: undefined},
            },
        });

        // When that workspace is picked on a slow connection
        pickWorkspace(policy);

        // Then the rates are fetched from the tab and the pick waits there, so Destination is not pushed over the tab
        // bar with its own header and loader (the reported extra "<" above the spinner)
        expect(fetchPerDiemRates).toHaveBeenCalledWith(POLICY_ID);
        expect(Navigation.navigate).not.toHaveBeenCalled();
        expect(setMoneyRequestParticipants).not.toHaveBeenCalled();
        expect(screen.UNSAFE_queryByType(ActivityIndicator)).not.toBeNull();
    });
});
