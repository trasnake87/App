import {renderHook} from '@testing-library/react-native';

import type * as WebModule from '@hooks/useAnchorLayoutObserver/index.ts';

// The fix only exists on web: `@hooks/useAnchorLayoutObserver` resolves to the native no-op under Jest.
const useAnchorLayoutObserver = jest.requireActual<typeof WebModule>('@hooks/useAnchorLayoutObserver/index.ts').default;

type ObserverRecord = {
    observed: Element[];
    disconnected: boolean;
    trigger: () => void;
};

const observers: ObserverRecord[] = [];

class FakeResizeObserver implements ResizeObserver {
    private readonly record: ObserverRecord;

    constructor(callback: ResizeObserverCallback) {
        this.record = {observed: [], disconnected: false, trigger: () => callback([], this)};
        observers.push(this.record);
    }

    observe(target: Element) {
        this.record.observed.push(target);
    }

    unobserve(target: Element) {
        this.record.observed = this.record.observed.filter((element) => element !== target);
    }

    disconnect() {
        this.record.disconnected = true;
    }
}

/** Builds `body > grandparent > parent > anchor` so the hook has a real ancestor chain to walk. */
const renderAnchorChain = () => {
    const grandparent = document.createElement('div');
    const parent = document.createElement('div');
    const anchor = document.createElement('div');
    grandparent.appendChild(parent);
    parent.appendChild(anchor);
    document.body.appendChild(grandparent);
    return {grandparent, parent, anchor};
};

describe('useAnchorLayoutObserver', () => {
    beforeEach(() => {
        observers.length = 0;
        document.body.innerHTML = '';
        window.ResizeObserver = FakeResizeObserver;
    });

    afterEach(() => {
        // jsdom has no ResizeObserver, so the key itself has to go — the hook checks `'ResizeObserver' in window`.
        Reflect.deleteProperty(window, 'ResizeObserver');
    });

    it('re-measures when a layout ancestor resizes, without observing document.body', () => {
        // Given an open popover anchored to an element nested inside a list cell the window resize can move
        const {grandparent, parent, anchor} = renderAnchorChain();
        const onLayoutChange = jest.fn();

        const {unmount} = renderHook(() => useAnchorLayoutObserver({current: anchor}, true, onLayoutChange));

        // Then every ancestor whose box can move the anchor is observed, stopping short of the portal target
        expect(observers).toHaveLength(1);
        expect(observers.at(0)?.observed).toEqual([anchor, parent, grandparent]);
        expect(observers.at(0)?.observed).not.toContain(document.body);

        // When the cell commits its new width — after the window-dimension tick the component's effect keys on
        observers.at(0)?.trigger();

        // Then the anchor is re-measured off the geometry change itself rather than the stale pre-resize box
        expect(onLayoutChange).toHaveBeenCalledTimes(1);

        // When the popover closes
        unmount();

        // Then the observer is torn down so it costs nothing while no menu is open
        expect(observers.at(0)?.disconnected).toBe(true);
    });

    it('does not observe anything while the popover is closed', () => {
        // Given a closed popover
        const {anchor} = renderAnchorChain();
        const onLayoutChange = jest.fn();

        // When the hook runs with observation disabled
        renderHook(() => useAnchorLayoutObserver({current: anchor}, false, onLayoutChange));

        // Then no observer is created, so resizes stay free until a menu opens
        expect(observers).toHaveLength(0);
        expect(onLayoutChange).not.toHaveBeenCalled();
    });

    it('calls the latest handler after a re-render', () => {
        // Given an open popover whose re-measure closure is recreated on every render
        const {anchor} = renderAnchorChain();
        const anchorRef = {current: anchor};
        const firstHandler = jest.fn();
        const latestHandler = jest.fn();

        const {rerender} = renderHook(({onLayoutChange}: {onLayoutChange: () => void}) => useAnchorLayoutObserver(anchorRef, true, onLayoutChange), {
            initialProps: {onLayoutChange: firstHandler},
        });

        // When the component re-renders with a new handler and the layout then changes
        rerender({onLayoutChange: latestHandler});
        observers.at(0)?.trigger();

        // Then the observer reads the handler through the ref instead of resubscribing with a stale closure
        expect(observers).toHaveLength(1);
        expect(firstHandler).not.toHaveBeenCalled();
        expect(latestHandler).toHaveBeenCalledTimes(1);
    });
});
