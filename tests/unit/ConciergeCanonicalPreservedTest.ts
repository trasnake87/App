/**
 * Regression test for issue #92364.
 *
 * When the server's canonical Concierge reply (same optimisticConciergeReportActionID,
 * carrying the next <followup-list>) lands in REPORT_ACTIONS BEFORE the binary-reveal
 * timer fires, applyPendingConciergeAction must defer to it: the canonical HTML (and its
 * followup options) is preserved, the pending response is discarded, and the followup
 * skeleton is NOT armed — the options render immediately instead of a skeleton that
 * waits out the TTL.
 */
import {renderHook} from '@testing-library/react-native';
import Onyx from 'react-native-onyx';
import usePendingConciergeResponse from '@hooks/usePendingConciergeResponse';
import {parseFollowupsFromHtml} from '@libs/ReportActionFollowupUtils';
import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type {ReportAction} from '@src/types/onyx';
import getOnyxValue from '../utils/getOnyxValue';
import waitForBatchedUpdates from '../utils/waitForBatchedUpdates';

const REPORT_ID = '1';
const OPTIMISTIC_ID = '100';
const DELAY_MS = 300;

const OPTIMISTIC_HTML = '<p>To set up QuickBooks, go to Settings.</p>';
const CANONICAL_HTML =
    '<p>To set up QuickBooks, go to Settings.</p>' +
    '<followup-list>' +
    '<followup><followup-text>How do I invite my team?</followup-text></followup>' +
    '<followup><followup-text>How do I set up categories?</followup-text></followup>' +
    '</followup-list>';

// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
const optimisticAction = {
    reportActionID: OPTIMISTIC_ID,
    actorAccountID: CONST.ACCOUNT_ID.CONCIERGE,
    actionName: CONST.REPORT.ACTIONS.TYPE.ADD_COMMENT,
    message: [{html: OPTIMISTIC_HTML, text: 'To set up QuickBooks, go to Settings.', type: CONST.REPORT.MESSAGE.TYPE.COMMENT}],
} as ReportAction;

const canonicalAction: ReportAction = {
    ...optimisticAction,
    message: [{html: CANONICAL_HTML, text: 'To set up QuickBooks, go to Settings. How do I invite my team? How do I set up categories?', type: CONST.REPORT.MESSAGE.TYPE.COMMENT}],
};

function delay(ms: number): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

function getActionHtml(actions: Record<string, ReportAction> | undefined | null): string {
    const message = actions?.[OPTIMISTIC_ID]?.message;
    const first = Array.isArray(message) ? message.at(0) : message;
    return first && 'html' in first ? (first.html ?? '') : '';
}

describe('Concierge canonical preservation (issue #92364 regression)', () => {
    beforeAll(() => {
        Onyx.init({keys: ONYXKEYS});
    });

    beforeEach(async () => {
        await Onyx.clear();
        await waitForBatchedUpdates();
    });

    it('keeps the canonical followup-list and does not arm the skeleton when the canonical landed before the binary timer fired', async () => {
        // Given an optimistic Concierge answer queued for binary reveal after the delay
        await Onyx.set(`${ONYXKEYS.COLLECTION.PENDING_CONCIERGE_RESPONSE}${REPORT_ID}`, {
            reportAction: optimisticAction,
            displayAfter: Date.now() + DELAY_MS,
        });
        await waitForBatchedUpdates();

        renderHook(() => usePendingConciergeResponse(REPORT_ID));
        await waitForBatchedUpdates();

        // When the server's canonical reply (same reportActionID, carrying the next
        // <followup-list>) lands in REPORT_ACTIONS inside the displayAfter window
        await Onyx.merge(`${ONYXKEYS.COLLECTION.REPORT_ACTIONS}${REPORT_ID}`, {[OPTIMISTIC_ID]: canonicalAction});
        await waitForBatchedUpdates();
        const followupsBeforeTimer = parseFollowupsFromHtml(getActionHtml(await getOnyxValue(`${ONYXKEYS.COLLECTION.REPORT_ACTIONS}${REPORT_ID}`)));
        expect(followupsBeforeTimer?.length).toBe(2);

        // ...and the binary-reveal timer then fires
        await delay(DELAY_MS + 100);
        await waitForBatchedUpdates();

        const htmlAfterTimer = getActionHtml(await getOnyxValue(`${ONYXKEYS.COLLECTION.REPORT_ACTIONS}${REPORT_ID}`));
        const followupsAfterTimer = parseFollowupsFromHtml(htmlAfterTimer);
        const pendingFollowupList = await getOnyxValue(`${ONYXKEYS.COLLECTION.CONCIERGE_PENDING_FOLLOWUP_LIST}${REPORT_ID}`);
        const pendingResponse = await getOnyxValue(`${ONYXKEYS.COLLECTION.PENDING_CONCIERGE_RESPONSE}${REPORT_ID}`);

        // The canonical followup-list survives the timer...
        expect(followupsAfterTimer?.length).toBe(2);
        expect(htmlAfterTimer).toBe(CANONICAL_HTML);
        // ...the skeleton is never armed (options render immediately)...
        expect(pendingFollowupList).toBeFalsy();
        // ...and the pending optimistic state is cleaned up.
        expect(pendingResponse).toBeFalsy();
    });

    it('still applies the optimistic action and arms the skeleton when no canonical has arrived (unchanged base behavior)', async () => {
        await Onyx.set(`${ONYXKEYS.COLLECTION.PENDING_CONCIERGE_RESPONSE}${REPORT_ID}`, {
            reportAction: optimisticAction,
            displayAfter: Date.now() + DELAY_MS,
        });
        await waitForBatchedUpdates();

        renderHook(() => usePendingConciergeResponse(REPORT_ID));
        await waitForBatchedUpdates();

        await delay(DELAY_MS + 100);
        await waitForBatchedUpdates();

        const htmlAfterTimer = getActionHtml(await getOnyxValue(`${ONYXKEYS.COLLECTION.REPORT_ACTIONS}${REPORT_ID}`));
        const pendingFollowupList = await getOnyxValue(`${ONYXKEYS.COLLECTION.CONCIERGE_PENDING_FOLLOWUP_LIST}${REPORT_ID}`);

        // No canonical present at reveal time -> optimistic applied + skeleton armed, exactly as before the fix.
        expect(htmlAfterTimer).toBe(OPTIMISTIC_HTML);
        expect(pendingFollowupList?.reportActionID).toBe(OPTIMISTIC_ID);
    });
});
