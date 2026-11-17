import playSound, {SOUNDS} from '@libs/Sound';
import Visibility from '@libs/Visibility';

import {createAudioPlayer} from 'expo-audio';

import waitForBatchedUpdates from '../utils/waitForBatchedUpdates';

type MockPlayer = {
    play: jest.Mock;
    remove: jest.Mock;
    addListener: jest.Mock;
};

const mockSubscriptionRemove = jest.fn();

// The player stands in for the native `AudioPlayer`: `play()` is the synchronous JSI call that
// throws "Session activation failed" when iOS refuses to activate the `.ambient` audio session.
let mockPlayer: MockPlayer;

jest.mock('expo-audio', () => ({
    setAudioModeAsync: jest.fn(() => Promise.resolve()),
    createAudioPlayer: jest.fn(() => mockPlayer),
}));

jest.mock('@libs/Visibility', () => ({
    isVisible: jest.fn(() => true),
    hasFocus: jest.fn(() => true),
    onVisibilityChange: jest.fn(() => () => {}),
}));

jest.mock('@libs/Log', () => ({
    hmmm: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    alert: jest.fn(),
}));

describe('playSound on native', () => {
    beforeEach(() => {
        mockSubscriptionRemove.mockClear();
        mockPlayer = {
            play: jest.fn(),
            remove: jest.fn(),
            addListener: jest.fn(() => ({remove: mockSubscriptionRemove})),
        };
        jest.mocked(createAudioPlayer).mockClear();
        jest.mocked(Visibility.isVisible).mockReturnValue(true);
    });

    it('skips playback when the app stopped being active while the sound was queued', async () => {
        // Given an app that was active when the caller asked for a sound, but is no longer active by the
        // time the queued call awaits the audio mode (the user locked the device within the 300ms throttle)
        jest.mocked(Visibility.isVisible).mockReturnValue(false);

        // When the sound is played
        await playSound(SOUNDS.DONE);
        await waitForBatchedUpdates();

        // Then no player is created, so `play()` can never ask iOS to activate a backgrounded session
        expect(createAudioPlayer).not.toHaveBeenCalled();
    });

    it('releases the player instead of rejecting when the audio session refuses to activate', async () => {
        // Given an active app whose audio session iOS still refuses to activate, because another app owns it
        mockPlayer.play.mockImplementation(() => {
            throw new Error('UnexpectedException: Session activation failed');
        });

        // When the sound is played
        await expect(playSound(SOUNDS.DONE)).resolves.toBeUndefined();
        await waitForBatchedUpdates();

        // Then the failure is swallowed and the player that never started is released, instead of
        // leaking in the native registry and surfacing as an unhandled promise rejection
        expect(mockPlayer.play).toHaveBeenCalled();
        expect(mockSubscriptionRemove).toHaveBeenCalled();
        expect(mockPlayer.remove).toHaveBeenCalled();
    });
});
