import {fireEvent, render, screen} from '@testing-library/react-native';

import ComposeProviders from '@components/ComposeProviders';
import {LocaleContextProvider} from '@components/LocaleContextProvider';
import MoneyRequestReportTransactionList from '@components/MoneyRequestReportView/MoneyRequestReportTransactionList';
import OnyxListItemProvider from '@components/OnyxListItemProvider';
import {SearchContextProvider} from '@components/Search/SearchContextProvider';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type {Report, Transaction, TransactionViolations} from '@src/types/onyx';

import type * as CoreNavigation from '@react-navigation/core';
import type * as NativeNavigation from '@react-navigation/native';
import React from 'react';
import {View} from 'react-native';
import Onyx from 'react-native-onyx';

import waitForBatchedUpdatesWithAct from '../utils/waitForBatchedUpdatesWithAct';

const REPORT_ID = '900001';
const POLICY_ID = 'POLICY_900001';
const ACCOUNT_ID = 15593135;
const EMAIL = 'sorttester@example.com';

type CapturedController = {
    tableColumnHeader: React.ReactElement | null;
    transactionListItems: Array<{type: string; transaction?: Transaction}>;
};

// Captures the controller MoneyRequestReportTransactionList hands to its list renderer, so the test
// reads the component's real sorted output (`transactionListItems`) instead of re-implementing it.
const mockCapturedControllers: CapturedController[] = [];

jest.mock('@components/MoneyRequestReportView/MoneyRequestReportUnifiedList', () => {
    return ({controller}: {controller: CapturedController}) => {
        mockCapturedControllers.push(controller);
        // Renders the real MoneyRequestReportTableHeader -> SortableTableHeader -> SortableHeaderText chain.
        return controller.tableColumnHeader;
    };
});

jest.mock('@components/MoneyRequestReportView/MoneyRequestReportTransactionLongPressModal', () => {
    const ReactMock = jest.requireActual<typeof React>('react');
    return ReactMock.forwardRef(() => null);
});

jest.mock('@hooks/useResponsiveLayoutOnWideRHP', () => jest.fn(() => ({shouldUseNarrowLayout: false, isSmallScreenWidth: false})));

jest.mock('@react-navigation/native', () => ({
    ...jest.requireActual<typeof NativeNavigation>('@react-navigation/native'),
    useNavigationState: () => true,
    useIsFocused: () => true,
    useNavigation: jest.fn(() => ({getState: jest.fn(() => undefined), setParams: jest.fn(), addListener: jest.fn(() => () => {})})),
    usePreventRemove: jest.fn(),
    useFocusEffect: jest.fn(),
    findFocusedRoute: jest.fn(() => undefined),
    useRoute: () => ({key: 'test-key', name: 'Report', params: {reportID: REPORT_ID}}),
}));

jest.mock('@react-navigation/core', () => ({
    ...jest.requireActual<typeof CoreNavigation>('@react-navigation/core'),
    useNavigation: jest.fn(() => ({getState: jest.fn(() => undefined), setParams: jest.fn(), addListener: jest.fn(() => () => {})})),
}));

jest.mock('@hooks/useRootNavigationState', () => jest.fn((selector: (state: undefined) => unknown) => selector(undefined)));

jest.mock('@libs/Navigation/Navigation', () => ({
    navigate: jest.fn(),
    navigationRef: {
        getRootState: jest.fn(() => ({routes: [{name: 'Report'}]})),
        getCurrentRoute: jest.fn(() => ({name: 'Report', params: {}})),
        getState: jest.fn(() => ({})),
    },
    getActiveRoute: jest.fn(() => 'activeRoute'),
    getActiveRouteWithoutParams: jest.fn(() => ''),
    isNavigationReady: jest.fn(() => Promise.resolve()),
    getDeepestFocusedScreen: jest.fn(() => undefined),
}));

jest.mock('@rnmapbox/maps', () => ({default: jest.fn(), MarkerView: jest.fn(), setAccessToken: jest.fn()}));

function buildTransaction(id: string, created: string, amount: number): Transaction {
    return {
        transactionID: id,
        reportID: REPORT_ID,
        amount,
        currency: CONST.CURRENCY.USD,
        created,
        merchant: `Merchant ${id}`,
        comment: {comment: ''},
        modifiedAmount: '',
        modifiedCreated: '',
        modifiedCurrency: '',
        modifiedMerchant: '',
        category: '',
        tag: '',
        billable: false,
        reimbursable: true,
    } as Transaction;
}

// Distinct dates AND distinct amounts, so ASC/DESC are always visually distinguishable and no
// comparison is a tie (two same-day expenses compare equal, which is why the OP steps look inert).
const OLDEST = buildTransaction('t-oldest', '2026-01-01', -100);
const MIDDLE = buildTransaction('t-middle', '2026-02-01', -300);
const NEWEST = buildTransaction('t-newest', '2026-03-01', -200);

const DATE_ASC = [OLDEST.transactionID, MIDDLE.transactionID, NEWEST.transactionID];
const DATE_DESC = [NEWEST.transactionID, MIDDLE.transactionID, OLDEST.transactionID];
const AMOUNT_DESC = [MIDDLE.transactionID, NEWEST.transactionID, OLDEST.transactionID];

const report = {
    reportID: REPORT_ID,
    policyID: POLICY_ID,
    type: CONST.REPORT.TYPE.EXPENSE,
    ownerAccountID: ACCOUNT_ID,
    total: -600,
    currency: CONST.CURRENCY.USD,
    stateNum: CONST.REPORT.STATE_NUM.OPEN,
    statusNum: CONST.REPORT.STATUS_NUM.OPEN,
} as Report;

function renderList() {
    mockCapturedControllers.length = 0;
    return render(
        <ComposeProviders components={[OnyxListItemProvider, LocaleContextProvider, SearchContextProvider]}>
            <MoneyRequestReportTransactionList
                report={report}
                transactions={[NEWEST, OLDEST, MIDDLE]}
                newTransactions={[]}
                reportActions={[]}
                hasComments={false}
                visibleReportActions={[]}
                renderReportAction={() => <View />}
                reportActionsExtraData={undefined}
                linkedReportActionID={undefined}
                listRef={null}
                accessibilityLabel="test-list"
                onListLayout={() => {}}
                onScroll={() => {}}
                onScrollBeginDrag={() => {}}
                onContentSizeChange={() => {}}
                onViewableItemsChanged={() => {}}
                onEndReached={() => {}}
                onStartReached={() => {}}
                contentContainerStyle={undefined}
                isLoadingInitialActions={false}
            />
        </ComposeProviders>,
    );
}

/** The visual row order the component actually produced. */
function currentOrder(): string[] {
    const controller = mockCapturedControllers.at(-1);
    return (controller?.transactionListItems ?? []).flatMap((item) => (item.type === 'transaction' && item.transaction ? [item.transaction.transactionID] : []));
}

async function pressHeader(label: string) {
    fireEvent.press(screen.getByText(label));
    await waitForBatchedUpdatesWithAct();
}

describe('MoneyRequestReportTransactionList - default sort (#91935)', () => {
    beforeAll(() => {
        Onyx.init({keys: ONYXKEYS, evictableKeys: [ONYXKEYS.COLLECTION.REPORT_ACTIONS]});
    });

    beforeEach(async () => {
        await Onyx.clear();
        await Onyx.set(ONYXKEYS.SESSION, {accountID: ACCOUNT_ID, email: EMAIL});
        await Onyx.set(ONYXKEYS.PERSONAL_DETAILS_LIST, {[ACCOUNT_ID]: {accountID: ACCOUNT_ID, login: EMAIL, displayName: 'Sort Tester'}});
        await Onyx.set(`${ONYXKEYS.COLLECTION.REPORT}${REPORT_ID}`, report);
        await waitForBatchedUpdatesWithAct();
    });

    it('restores the view default Date/ASC when the user clicks Date after sorting by Amount', async () => {
        // Given a report table that declares Date/ASC as its default sort
        renderList();
        await waitForBatchedUpdatesWithAct();
        expect(currentOrder()).toEqual(DATE_ASC);

        // When the user sorts by Amount (an inactive column, so the shared header emits DESC)
        await pressHeader('Amount');
        expect(currentOrder()).toEqual(AMOUNT_DESC);

        // And then clicks Date once to return to the default column
        await pressHeader('Date');

        // Then the table is back on Date/ASC, not Date/DESC
        expect(currentOrder()).toEqual(DATE_ASC);
    });

    it('re-enables the RBR-first ordering that isDefaultSort gates, after the same round trip', async () => {
        // Given the MIDDLE-dated expense carries a violation. It is first under neither Date/ASC
        // (that would be OLDEST) nor Date/DESC (that would be NEWEST), so it is first only when the
        // isDefaultSort-gated RBR pre-sort is actually running.
        const violations: TransactionViolations = [{name: CONST.VIOLATIONS.MISSING_CATEGORY, type: CONST.VIOLATION_TYPES.VIOLATION, showInReview: true}];
        await Onyx.merge(`${ONYXKEYS.COLLECTION.TRANSACTION_VIOLATIONS}${MIDDLE.transactionID}`, violations);
        await waitForBatchedUpdatesWithAct();

        renderList();
        await waitForBatchedUpdatesWithAct();

        // The flagged expense is pinned to the top by the default sort's RBR pre-sort
        expect(currentOrder()).toEqual([MIDDLE.transactionID, OLDEST.transactionID, NEWEST.transactionID]);

        // When the user sorts by Amount, the RBR pre-sort is intentionally off
        await pressHeader('Amount');
        expect(currentOrder()).toEqual(AMOUNT_DESC);

        // And then clicks Date once
        await pressHeader('Date');

        // Then the default sort is restored and the flagged expense is back on top
        expect(currentOrder()).toEqual([MIDDLE.transactionID, OLDEST.transactionID, NEWEST.transactionID]);
    });

    it('still toggles ASC <-> DESC when the already-active Date column is clicked', async () => {
        // Given the table is on its default Date/ASC
        renderList();
        await waitForBatchedUpdatesWithAct();
        expect(currentOrder()).toEqual(DATE_ASC);

        // When the user clicks the active Date column
        await pressHeader('Date');

        // Then it flips to DESC (unchanged behaviour)
        expect(currentOrder()).toEqual(DATE_DESC);

        // And clicking it again flips back to ASC
        await pressHeader('Date');
        expect(currentOrder()).toEqual(DATE_ASC);
    });

    it('still lands on DESC when switching to a non-default column', async () => {
        // Given the table is on its default Date/ASC
        renderList();
        await waitForBatchedUpdatesWithAct();

        // When the user switches to Amount and then to Merchant
        await pressHeader('Amount');
        expect(currentOrder()).toEqual(AMOUNT_DESC);

        await pressHeader('Merchant');

        // Then Merchant sorts descending by merchant name (unchanged behaviour):
        // 'Merchant t-oldest' > 'Merchant t-newest' > 'Merchant t-middle'
        expect(currentOrder()).toEqual([OLDEST.transactionID, NEWEST.transactionID, MIDDLE.transactionID]);
    });
});
