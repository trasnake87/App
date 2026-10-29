import type {RefObject} from 'react';

import {useEffect, useRef} from 'react';

/**
 * Re-measures an anchored popover whenever the anchor's own box or any of its layout ancestors change size.
 *
 * The window-dimension effect in the anchoring component fires before virtualized list cells have committed
 * their new width, so the anchor is measured against its pre-resize box. Observing the ancestor chain lets the
 * geometry change itself drive the re-measure, in the frame it lands.
 */
export default function useAnchorLayoutObserver(anchorRef: RefObject<unknown>, isEnabled: boolean, onLayoutChange: () => void) {
    const callbackRef = useRef(onLayoutChange);

    // The ResizeObserver outlives renders, so it reads the latest handler through a ref.
    useEffect(() => {
        callbackRef.current = onLayoutChange;
    }, [onLayoutChange]);

    useEffect(() => {
        const anchor = anchorRef.current;
        if (!isEnabled || !(anchor instanceof HTMLElement) || !('ResizeObserver' in window)) {
            return;
        }
        const observer = new ResizeObserver(() => callbackRef.current());

        // Stops at document.body, which the popover portals into.
        for (let node: HTMLElement | null = anchor; node && node !== document.body; node = node.parentElement) {
            observer.observe(node);
        }
        return () => observer.disconnect();
    }, [anchorRef, isEnabled]);
}
