import {render, screen} from '@testing-library/react-native';

import ComposeProviders from '@components/ComposeProviders';
import {LocaleContextProvider} from '@components/LocaleContextProvider';
import OnyxListItemProvider from '@components/OnyxListItemProvider';
import type {CompareItemsCallback, TableColumn} from '@components/Table';
import WorkspaceCompanyCardsTable from '@components/Tables/WorkspaceCompanyCardsTable';
import type {WorkspaceCompanyCardTableItemData} from '@components/Tables/WorkspaceCompanyCardsTable/WorkspaceCompanyCardsTableRow';

import type {UseCompanyCardsResult} from '@hooks/useCompanyCards';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type {Card} from '@src/types/onyx';
import type {CompanyCardFeedWithDomainID, CompanyCardFeedWithNumber} from '@src/types/onyx/CardFeeds';

import type {PartialDeep} from 'type-fest';

import React from 'react';
import Onyx from 'react-native-onyx';

import createMock from '../utils/createMock';
import * as TestHelper from '../utils/TestHelper';
import waitForBatchedUpdates from '../utils/waitForBatchedUpdates';

TestHelper.setupApp();

const POLICY_ID = 'policy123';
const DOMAIN_OR_WORKSPACE_ACCOUNT_ID = 11111111;
const FEED_NAME = `${CONST.COMPANY_CARD.FEED_BANK_NAME.CHASE}#${DOMAIN_OR_WORKSPACE_ACCOUNT_ID}` as CompanyCardFeedWithDomainID;
const BANK_NAME = CONST.COMPANY_CARD.FEED_BANK_NAME.CHASE as CompanyCardFeedWithNumber;
const ACCOUNT_ID = 1;

let capturedColumns: Array<TableColumn<string, WorkspaceCompanyCardTableItemData>> = [];
let capturedData: WorkspaceCompanyCardTableItemData[] = [];
let capturedCompareItems: CompareItemsCallback<WorkspaceCompanyCardTableItemData, string> | undefined;

jest.mock('@hooks/useLazyAsset', () => ({
    useMemoizedLazyIllustrations: () => ({}),
    useMemoizedLazyExpensifyIcons: () => ({}),
}));

jest.mock('@hooks/useCardFeedErrors', () => ({
    __esModule: true,
    default: () => ({cardFeedErrors: {}}),
}));

jest.mock('@hooks/useNetwork', () => ({
    __esModule: true,
    default: () => ({isOffline: false}),
}));

jest.mock('@hooks/useResponsiveLayout', () => ({
    __esModule: true,
    default: () => ({shouldUseNarrowLayout: false, isMediumScreenWidth: false}),
}));

jest.mock('@components/ActivityIndicator', () => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const {View} = require('react-native');
    return () => <View testID="WorkspaceCompanyCardsTableLoadingIndicator" />;
});

jest.mock('@pages/workspace/companyCards/WorkspaceCompanyCardPageEmptyState', () => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const {View} = require('react-native');
    return () => <View testID="WorkspaceCompanyCardPageEmptyState" />;
});

type MockTableProps = {
    children?: React.ReactNode;
    columns: Array<TableColumn<string, WorkspaceCompanyCardTableItemData>>;
    data: WorkspaceCompanyCardTableItemData[];
    compareItems: CompareItemsCallback<WorkspaceCompanyCardTableItemData, string>;
};

// The real Table drives a FlashList and its own text measurement, neither of which this test needs: it only checks
// what WorkspaceCompanyCardsTable computes and hands to Table, so the mock captures those props instead of rendering
// the grid.
jest.mock('@components/Table', () => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const {View} = require('react-native');

    // Kept outside MockTable, which the React Compiler treats as a component: capturing render props into a module
    // variable is only for this test's assertions and would otherwise look like an impure component body.
    function captureTableProps(columns: MockTableProps['columns'], data: MockTableProps['data'], compareItems: MockTableProps['compareItems']) {
        capturedColumns = columns;
        capturedData = data;
        capturedCompareItems = compareItems;
    }

    function MockTable({children, columns, data, compareItems}: MockTableProps) {
        captureTableProps(columns, data, compareItems);
        return <View testID="WorkspaceCompanyCardsTable">{children}</View>;
    }

    MockTable.FilterBar = () => <View testID="WorkspaceCompanyCardsTableFilterBar" />;
    MockTable.Header = () => <View testID="WorkspaceCompanyCardsTableHeader" />;
    MockTable.ListHeader = ({children}: {children?: React.ReactNode}) => children ?? null;
    MockTable.Body = () => <View testID="WorkspaceCompanyCardsTableBody" />;
    MockTable.EmptyState = () => <View testID="WorkspaceCompanyCardsTableEmptyState" />;
    MockTable.NoResultsState = () => <View testID="WorkspaceCompanyCardsTableNoResultsState" />;
    MockTable.LoadingState = () => <View testID="WorkspaceCompanyCardsTableLoadingIndicator" />;
    return {
        __esModule: true,
        default: MockTable,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        composeTableListHeader: jest.requireActual('@components/Table/composeTableListHeader').default,
    };
});

jest.mock('@components/CardFeedIcon', () => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const {View} = require('react-native');
    return () => <View testID="CardFeedIcon" />;
});

jest.mock('@components/Tables/WorkspaceCompanyCardsTable/WorkspaceCompanyCardsTableHeaderButtons', () => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const {View} = require('react-native');
    return () => <View testID="WorkspaceCompanyCardsTableHeaderButtons" />;
});

function buildAssignedCard(overrides?: PartialDeep<Card, {recurseIntoArrays: true}>): Card {
    return createMock<Card>({
        cardID: 555,
        accountID: ACCOUNT_ID,
        bank: BANK_NAME,
        state: CONST.EXPENSIFY_CARD.STATE.OPEN,
        domainName: 'test.exfy',
        fraud: 'none',
        lastUpdated: '',
        nameValuePairs: {},
        ...overrides,
    });
}

function buildCompanyCards(assignedCard?: Card): UseCompanyCardsResult {
    return createMock<UseCompanyCardsResult>({
        feedName: FEED_NAME,
        bankName: BANK_NAME,
        assignedCards: assignedCard ? {[assignedCard.cardID]: assignedCard} : {},
        companyCardEntries: [
            {
                cardName: '4321',
                encryptedCardNumber: 'enc-4321',
                isAssigned: !!assignedCard,
                assignedCard,
            },
        ],
        workspaceCardFeedsStatus: {[DOMAIN_OR_WORKSPACE_ACCOUNT_ID]: {isLoading: false}},
        selectedFeed: {feed: BANK_NAME, status: {}},
        isInitiallyLoadingFeeds: false,
        isNoFeed: false,
        isFeedPending: false,
        isFeedAdded: true,
        onyxMetadata: {
            cardListMetadata: {status: 'loaded'},
            allCardFeedsMetadata: {status: 'loaded'},
            lastSelectedFeedMetadata: {status: 'loaded'},
        },
    });
}

function renderTable(companyCards: UseCompanyCardsResult) {
    return render(
        <ComposeProviders components={[OnyxListItemProvider, LocaleContextProvider]}>
            <WorkspaceCompanyCardsTable
                policyID={POLICY_ID}
                isPolicyLoaded
                isPageFetchPending={false}
                domainOrWorkspaceAccountID={DOMAIN_OR_WORKSPACE_ACCOUNT_ID}
                companyCards={companyCards}
                onAssignCard={jest.fn()}
                isAssigningCardDisabled={false}
                canWriteCompanyCards
                isSelectionModeEnabled={false}
                onReloadPage={jest.fn()}
                onReloadFeed={jest.fn()}
            />
        </ComposeProviders>,
    );
}

describe('WorkspaceCompanyCardsTable Last synced column', () => {
    beforeEach(async () => {
        await Onyx.clear();
        await Onyx.merge(ONYXKEYS.PERSONAL_DETAILS_LIST, {
            [ACCOUNT_ID]: {accountID: ACCOUNT_ID, displayName: 'Alice Smith', login: 'alice@example.com'},
        });
        await waitForBatchedUpdates();
    });

    it('leaves the cell blank for an unassigned card', async () => {
        // Given an unassigned card, which has no Card record and so no sync to report
        renderTable(buildCompanyCards(undefined));
        await waitForBatchedUpdates();

        // Then the row carries no title at all, so the cell renders empty rather than Never
        expect(capturedData.at(0)?.isAssigned).toBe(false);
        expect(capturedData.at(0)?.lastSyncedTitle).toBeUndefined();
    });

    it('shows the column and the card datetime formatted as a one-line date', async () => {
        // Given an assigned card whose last successful sync is an Expensify DB datetime
        const card = buildAssignedCard({lastScrape: '2024-11-27 11:00:53'});

        // When the company cards table builds its columns and row data
        renderTable(buildCompanyCards(card));
        await waitForBatchedUpdates();

        // Then the table offers a sortable Last synced column, because the admin should not have to open each card
        expect(screen.getByTestId('WorkspaceCompanyCardsTable')).toBeTruthy();
        const lastSyncedColumn = capturedColumns.find((column) => column.key === 'lastSynced');
        expect(lastSyncedColumn?.label).toBe(TestHelper.translateLocal('workspace.moreFeatures.companyCards.lastSynced'));
        expect(lastSyncedColumn?.sortable).toBe(true);

        // Then the cell carries the abbreviated date rather than the details page's wrapping datetime. The day can
        // land either side of the UTC instant depending on the test timezone, so only the format is asserted.
        expect(capturedData.at(0)?.lastSyncedTitle).toMatch(/^Nov 2[67], 2024$/);
        expect(capturedData.at(0)?.lastSyncedAt).toBe(new Date('2024-11-27T11:00:53Z').getTime());
    });

    it('reports the in-flight sync instead of the stale timestamp', async () => {
        // Given a card mid-sync, which keeps its previous lastScrape while the update is in flight
        const card = buildAssignedCard({lastScrape: '2024-11-27 11:00:53', isLoadingLastUpdated: true});

        // When the company cards table builds its row data
        renderTable(buildCompanyCards(card));
        await waitForBatchedUpdates();

        // Then the cell matches the details page and says it is updating, rather than showing the superseded instant
        expect(capturedData.at(0)?.lastSyncedTitle).toBe(TestHelper.translateLocal('workspace.moreFeatures.companyCards.updating'));
    });

    it('reads Never for an assigned card with an empty timestamp', async () => {
        // Given an assigned card that has never synced, which the API represents as an empty lastScrape
        const card = buildAssignedCard({lastScrape: ''});

        // When the company cards table builds its row data
        renderTable(buildCompanyCards(card));
        await waitForBatchedUpdates();

        // Then the cell says Never instead of formatting "now", and sorts as the oldest card
        expect(capturedData.at(0)?.lastSyncedTitle).toBe(TestHelper.translateLocal('workspace.moreFeatures.companyCards.neverUpdated'));
        expect(capturedData.at(0)?.lastSyncedAt).toBeUndefined();
    });

    it('sorts by the parsed sync instant, falling back to the card name on ties', async () => {
        // Given two synced cards and a never-synced one
        renderTable(buildCompanyCards(buildAssignedCard({lastScrape: '2024-11-27 11:00:53'})));
        await waitForBatchedUpdates();
        expect(capturedCompareItems).toBeDefined();

        const olderRow = createMock<WorkspaceCompanyCardTableItemData>({
            keyForList: 'a',
            cardName: '1111',
            isAssigned: true,
            isCardDeleted: false,
            lastSyncedTitle: 'Nov 27, 2024',
            lastSyncedAt: new Date('2024-11-27T11:00:53Z').getTime(),
        });
        const newerRow = createMock<WorkspaceCompanyCardTableItemData>({
            ...olderRow,
            keyForList: 'b',
            cardName: '2222',
            lastSyncedTitle: 'Dec 1, 2024',
            lastSyncedAt: new Date('2024-12-01T11:00:53Z').getTime(),
        });

        // When the Last synced column drives the comparator
        // Then the older sync comes first ascending and last descending
        expect(capturedCompareItems?.(olderRow, newerRow, {columnKey: 'lastSynced', order: CONST.SEARCH.SORT_ORDER.ASC})).toBeLessThan(0);
        expect(capturedCompareItems?.(olderRow, newerRow, {columnKey: 'lastSynced', order: CONST.SEARCH.SORT_ORDER.DESC})).toBeGreaterThan(0);

        // Then a never-synced card sorts oldest, since it is the one the admin is looking for
        const neverSyncedRow = createMock<WorkspaceCompanyCardTableItemData>({...olderRow, keyForList: 'c', cardName: '3333', lastSyncedTitle: 'Never', lastSyncedAt: undefined});
        expect(capturedCompareItems?.(neverSyncedRow, olderRow, {columnKey: 'lastSynced', order: CONST.SEARCH.SORT_ORDER.ASC})).toBeLessThan(0);

        // Then cards synced at the same instant keep a stable order by card name
        const sameInstantRow = createMock<WorkspaceCompanyCardTableItemData>({...olderRow, keyForList: 'd', cardName: '0000'});
        expect(capturedCompareItems?.(olderRow, sameInstantRow, {columnKey: 'lastSynced', order: CONST.SEARCH.SORT_ORDER.ASC})).toBeGreaterThan(0);
    });
});
