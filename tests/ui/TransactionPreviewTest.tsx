import {fireEvent, render, screen} from '@testing-library/react-native';

import ComposeProviders from '@components/ComposeProviders';
import OnyxListItemProvider from '@components/OnyxListItemProvider';
import TransactionPreview from '@components/ReportActionItem/TransactionPreview';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type {Report, ReportAction} from '@src/types/onyx';

import React from 'react';
import Onyx from 'react-native-onyx';

import waitForBatchedUpdatesWithAct from '../utils/waitForBatchedUpdatesWithAct';

// The component is rendered outside a NavigationContainer here, so the route it reads to detect the duplicate review screen has to be stubbed.
jest.mock('@react-navigation/native', () => ({
    ...jest.requireActual<Record<string, unknown>>('@react-navigation/native'),
    useRoute: () => ({key: 'route', name: 'Report_Screen', params: {}}),
}));

// Only the pressable wrapper around the preview matters for the press guard, so the preview body is replaced with a marker.
jest.mock('@components/ReportActionItem/TransactionPreview/TransactionPreviewContent', () => {
    const {Text} = jest.requireActual<Record<string, React.FC<Record<string, unknown>>>>('react-native');
    function MockTransactionPreviewContent() {
        return <Text>Transaction preview</Text>;
    }
    return MockTransactionPreviewContent;
});

const CHAT_REPORT_ID = 'chat_split_preview';
const SPLIT_TRANSACTION_ID = 'txn_split_preview';

const chatReport = {reportID: CHAT_REPORT_ID, type: CONST.REPORT.TYPE.CHAT} as Report;

// A split created in a DM: the action identifies the split, and its container transaction lives under SPLIT_REPORT_ID.
const splitAction = {
    reportActionID: 'split_action',
    reportID: CHAT_REPORT_ID,
    actionName: CONST.REPORT.ACTIONS.TYPE.IOU,
    created: '2026-10-20 00:00:00.000',
} as ReportAction;

describe('TransactionPreview', () => {
    beforeAll(() => {
        Onyx.init({keys: ONYXKEYS});
    });

    beforeEach(async () => {
        await Onyx.clear();
        await waitForBatchedUpdatesWithAct();
    });

    it('does not open the split details when the split transaction is not in Onyx yet', async () => {
        // Given a split preview whose container transaction has not been loaded into Onyx yet, as right after a cache reset
        const onPreviewPressed = jest.fn();
        render(
            <ComposeProviders components={[OnyxListItemProvider]}>
                <TransactionPreview
                    action={splitAction}
                    chatReport={chatReport}
                    reportID={CHAT_REPORT_ID}
                    iouReportID={CONST.REPORT.SPLIT_REPORT_ID}
                    transactionID={SPLIT_TRANSACTION_ID}
                    isBillSplit
                    isTrackExpense={false}
                    transactionPreviewWidth={300}
                    onPreviewPressed={onPreviewPressed}
                />
            </ComposeProviders>,
        );
        await waitForBatchedUpdatesWithAct();

        // When the card is pressed
        fireEvent.press(screen.getByText('Transaction preview'));

        // Then the press is swallowed, because the only page it could open is the split details of a transaction the client does not hold
        expect(onPreviewPressed).not.toHaveBeenCalled();
    });
});
