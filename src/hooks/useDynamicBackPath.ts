import findAllMatchingDynamicSuffixes from '@libs/Navigation/helpers/dynamicRoutesUtils/findAllMatchingDynamicSuffixes';
import getPathWithoutDynamicSuffix from '@libs/Navigation/helpers/dynamicRoutesUtils/getPathWithoutDynamicSuffix';
import getPathFromState from '@libs/Navigation/helpers/getPathFromState';
import type {State} from '@libs/Navigation/types';

import type {DynamicRouteSuffix, Route} from '@src/ROUTES';
import ROUTES from '@src/ROUTES';

import {useEffect, useRef} from 'react';

import useRootNavigationState from './useRootNavigationState';

/**
 * Removes the given dynamic suffix from the end of the current URL to produce a "back" path.
 *
 * Supported suffix types: static (`/edit`), parametric (`/:reportID`),
 * and parametric with optional params (`/:reportID/:reportActionID?`).
 *
 * If the suffix doesn't match the tail of the current path, returns the path as-is.
 *
 * @param dynamicRouteSuffix - The dynamic route pattern to remove from the current URL.
 * @param isEnabled - Pass false from a caller that discards the result, to skip the work behind it. Serializing the
 * navigation tree and matching every suffix against it runs on each navigation event, for each mounted caller.
 * @returns The back path for the dynamic route.
 */
function useDynamicBackPath(dynamicRouteSuffix: DynamicRouteSuffix, isEnabled = true): Route {
    const path = useRootNavigationState((state) => {
        if (!isEnabled || !state) {
            return undefined;
        }

        return getPathFromState(state as State);
    });

    const pathWithoutLeadingSlash = (path ?? '').replaceAll(/^\/+/g, '');
    const match = findAllMatchingDynamicSuffixes(pathWithoutLeadingSlash).find((m) => m.pattern === dynamicRouteSuffix);
    const matchedBackPath = match ? getPathWithoutDynamicSuffix(match.pathUsedForMatching, match.actualSuffix, match.pattern) : undefined;

    // The active path stops carrying our suffix as soon as another screen is stacked over this one, and
    // callers that navigate after that (deferred/on-focus) must not be handed the covering screen's route.
    const lastMatchedBackPath = useRef<Route | undefined>(undefined);
    useEffect(() => {
        if (!matchedBackPath) {
            return;
        }
        lastMatchedBackPath.current = matchedBackPath;
    }, [matchedBackPath]);

    if (!path) {
        return ROUTES.HOME;
    }

    // The ref is only ever written from the effect above and read as a fallback for a path that cannot produce a back
    // path of our own, so it never needs to drive a render of its own.
    // eslint-disable-next-line react-hooks/refs
    return matchedBackPath ?? lastMatchedBackPath.current ?? (pathWithoutLeadingSlash as Route);
}

export default useDynamicBackPath;
