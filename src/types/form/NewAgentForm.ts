import type {ValueOf} from 'type-fest';
import type Form from './Form';

const INPUT_IDS = {
    AGENT_NAME: 'agentName',
    INSTRUCTIONS: 'instructions',
} as const;

type InputID = ValueOf<typeof INPUT_IDS>;

type NewAgentForm = Form<
    InputID,
    {
        [INPUT_IDS.AGENT_NAME]: string;
        [INPUT_IDS.INSTRUCTIONS]: string;
    }
>;

export type {NewAgentForm};
export default INPUT_IDS;
