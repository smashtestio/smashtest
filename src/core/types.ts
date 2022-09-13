import { FREQUENCIES } from './constants.js';
import StepNode from './stepnode.js';
import { RESERVED_KEYWORDS } from '../packages/js/comparer.js';
import Branch from './branch.js';
import Tree from './tree.js';

export type UserValue = unknown;

export type StepNodeIndex = { [key: number]: StepNode };

export type BlockError = {
    blockError: true;
    text: string;
    obj: unknown;
    key?: string;
};
export type Error = (string & { blockError?: undefined }) | BlockError;

export type Props = {
    [key: string]: [(elems: Element[], input?: string) => Element[]];
};

export type Prop = {
    prop: string;
    def: string;
    input?: string;
    not?: true | undefined;
};

export type Frequency = typeof FREQUENCIES[number];

export type HookField = 'beforeEveryBranch' | 'afterEveryBranch' | 'beforeEveryStep' | 'afterEveryStep';

export type Modifier = '~' | '$';

export type BrowserParams<Options> = Partial<{
    name: 'chrome' | 'firefox' | 'safari' | 'internet explorer' | 'MicrosoftEdge';
    version: string;
    platform: 'linux' | 'mac' | 'windows';
    width: number;
    height: number;
    deviceEmulation: string;
    isHeadless: boolean;
    testServer: string | undefined;
    options: Options;
    capabilities: unknown;
}>;

export type Constraints = {
    [Key in typeof RESERVED_KEYWORDS[number]]: unknown;
};

export type Snapshot = {
    branches: Branch[];
};

export type StepDataMode = Tree['stepDataMode'];

export type BranchState = 'pass' | 'fail' | 'skip';
