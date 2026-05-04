import Onyx from 'react-native-onyx';
import {read, write} from '@libs/API';
import {READ_COMMANDS, WRITE_COMMANDS} from '@libs/API/types';
import ONYXKEYS from '@src/ONYXKEYS';
import type {AnyOnyxUpdate} from '@src/types/onyx/Request';

function openAgentsPage() {
    read(READ_COMMANDS.OPEN_AGENTS_PAGE, null);
}

function createAgent(agentName: string, prompt: string) {
    const optimisticAccountID = -Math.round(Math.random() * 1000000);

    const optimisticData: AnyOnyxUpdate[] = [
        {
            onyxMethod: Onyx.METHOD.MERGE,
            key: ONYXKEYS.PERSONAL_DETAILS_LIST,
            value: {
                [optimisticAccountID]: {
                    accountID: optimisticAccountID,
                    displayName: agentName,
                    isOptimisticPersonalDetail: true,
                },
            },
        },
        {
            onyxMethod: Onyx.METHOD.SET,
            key: `${ONYXKEYS.COLLECTION.SHARED_NVP_AGENT_PROMPT}${optimisticAccountID}`,
            value: {prompt},
        },
    ];

    const successData: AnyOnyxUpdate[] = [
        {
            onyxMethod: Onyx.METHOD.MERGE,
            key: ONYXKEYS.PERSONAL_DETAILS_LIST,
            value: {
                [optimisticAccountID]: null,
            },
        },
        {
            onyxMethod: Onyx.METHOD.SET,
            key: `${ONYXKEYS.COLLECTION.SHARED_NVP_AGENT_PROMPT}${optimisticAccountID}`,
            value: null,
        },
    ];

    const failureData: AnyOnyxUpdate[] = [
        {
            onyxMethod: Onyx.METHOD.MERGE,
            key: ONYXKEYS.PERSONAL_DETAILS_LIST,
            value: {
                [optimisticAccountID]: null,
            },
        },
        {
            onyxMethod: Onyx.METHOD.SET,
            key: `${ONYXKEYS.COLLECTION.SHARED_NVP_AGENT_PROMPT}${optimisticAccountID}`,
            value: null,
        },
    ];

    write(WRITE_COMMANDS.CREATE_AGENT, {agentName, prompt}, {optimisticData, successData, failureData});
}

export {openAgentsPage, createAgent};
