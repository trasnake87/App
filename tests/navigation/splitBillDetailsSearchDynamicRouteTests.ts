import createDynamicRoute from '@libs/Navigation/helpers/dynamicRoutesUtils/createDynamicRoute';
import findAllMatchingDynamicSuffixes from '@libs/Navigation/helpers/dynamicRoutesUtils/findAllMatchingDynamicSuffixes';
import getPathWithoutDynamicSuffix from '@libs/Navigation/helpers/dynamicRoutesUtils/getPathWithoutDynamicSuffix';
import findFocusedRouteWithOnyxTabGuard from '@libs/Navigation/helpers/findFocusedRouteWithOnyxTabGuard';
import getMatchingFullScreenRoute from '@libs/Navigation/helpers/getMatchingFullScreenRoute';
import getStateFromPath from '@libs/Navigation/helpers/getStateFromPath';
import type {State} from '@libs/Navigation/types';

import type {Route} from '@src/ROUTES';
import {DYNAMIC_ROUTES} from '@src/ROUTES';
import SCREENS from '@src/SCREENS';

import {findFocusedRoute} from '@react-navigation/native';

const CHAT_REPORT_ID = '8951981506501769';
const REPORT_ACTION_ID = '1122334455667788';
const SEARCH_QUERY = encodeURIComponent('type:chat');
const SEARCH_PATH = `search?q=${SEARCH_QUERY}`;

function getFocusedRoute(path: string) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- these URLs are composed at runtime, so they are not entries in the production Route union
    return findFocusedRouteWithOnyxTabGuard(getStateFromPath(path as Route) as State);
}

describe('split bill details dynamic route opened from the Search list', () => {
    // Given a chat search row pressed on the Search page, the split details suffix is appended to the live `search?q=…` route
    it('resolves over the filtered Search list instead of the not-found page', () => {
        const url = createDynamicRoute(DYNAMIC_ROUTES.SPLIT_BILL_DETAILS.getRoute(REPORT_ACTION_ID, CHAT_REPORT_ID), `/${SEARCH_PATH}`);

        // When the composed URL is parsed, as it is on an in-app navigation and on a browser refresh
        const route = getFocusedRoute(url);

        // Then the split details page is focused with the two params its HOC reads, not the catch-all not-found screen
        expect(route?.name).toBe(SCREENS.SPLIT_DETAILS.DYNAMIC_ROOT);
        expect(route?.params).toMatchObject({reportActionID: REPORT_ACTION_ID, reportID: CHAT_REPORT_ID});
        if (!route) {
            throw new Error('expected a focused route');
        }

        // Then the filtered Search list stays underneath the RHP, keeping its query
        const fullScreenRoute = getMatchingFullScreenRoute(route, true);
        const searchRoute = fullScreenRoute ? findFocusedRoute({routes: [fullScreenRoute]} as State) : undefined;
        expect(searchRoute?.name).toBe(SCREENS.SEARCH.ROOT);
        expect(searchRoute?.params).toMatchObject({q: 'type:chat'});

        // Then stripping the suffix drops the `reportID` it added, so Back returns to those same results
        const match = findAllMatchingDynamicSuffixes(url.replace(/^\/+/, '')).find((candidate) => candidate.pattern === DYNAMIC_ROUTES.SPLIT_BILL_DETAILS.path);
        expect(getPathWithoutDynamicSuffix(match?.pathUsedForMatching ?? '', match?.actualSuffix ?? '', match?.pattern)).toBe(SEARCH_PATH);
    });
});
