import { WebElement } from 'selenium-webdriver';
import { RESERVED_KEYWORDS } from '../packages/js/comparer.js';
import ElementFinder from '../packages/js/elementfinder.js';
import Branch from './branch.js';
import { FREQUENCIES } from './constants.js';
import StepNode from './stepnode.js';
import Tree from './tree.js';

export type StepNodeIndex = { [key: number]: StepNode };

export type BlockError = {
    blockError: true;
    text: string;
    obj: unknown;
    key?: string;
};

export type EFBlockError = {
    header: string;
    body: string;
};

export type ElementFinderError = (string & { blockError?: undefined }) | BlockError;

export type SmashError = {
    message?: string | undefined;
    fatal?: boolean;
    stack?: string | undefined;
    filename?: string;
    lineNumber?: number;
    continue?: boolean;
};

export function isSmashError(error: unknown | SmashError): error is SmashError {
    return error instanceof Error;
}

export type Props = {
    [key: string]: [(elems: Element[], input?: string) => Element[]];
};

export type SerializedProps = {
    [key: string]: readonly [string];
};

export type PropDefinition = {
    prop: string;
    def: string;
    input?: string;
    not?: true | undefined;
};

export type Frequency = typeof FREQUENCIES[number];

export type HookField = 'beforeEveryBranch' | 'afterEveryBranch' | 'beforeEveryStep' | 'afterEveryStep';

export type Modifier = '~' | '$';

export type BrowserParams<Options = unknown> = Partial<{
    name: 'chrome' | 'firefox' | 'safari' | 'internet explorer' | 'MicrosoftEdge';
    version: string;
    platform: 'linux' | 'mac' | 'windows';
    width: number;
    height: number;
    deviceEmulation: string;
    isHeadless: boolean;
    testServer: string | undefined;
    serverUrl: string | undefined;
    options: Options;
    capabilities: unknown;
}>;

export type Constraints = {
    [Key in typeof RESERVED_KEYWORDS[number]]: unknown;
};

export type Snapshot = {
    tree: Tree;
    branches: Branch[];
};

export type StepDataMode = Tree['stepDataMode'];

export type BranchState = 'pass' | 'fail' | 'skip';

export type EFElement = string | ElementFinder | WebElement;

export type ElementFinderPayload = {
    ef: ReturnType<typeof ElementFinder.prototype['serialize']>;
    definedProps: SerializedProps;
};

export type BrowserElementFinder = Pick<
    typeof ElementFinder.prototype,
    'line' | 'counter' | 'props' | 'matchMeElems' | 'matchedElems'
> & {
    matchMe: typeof ElementFinder.prototype['matchMe'] | undefined;
    isElemArray: typeof ElementFinder.prototype['isElemArray'] | undefined;
    isAnyOrder: typeof ElementFinder.prototype['isAnyOrder'] | undefined;
    children: BrowserElementFinder[];
    // Amended in the browser
    fullStr?: string;
    blockErrors?: EFBlockError[];
    error?: string | boolean | null;
};

export type SearchRecordEntry = {
    'Searching for EF': string;
    '[1] divide into props': string[];
    '[2] before': Element[];
    '[3] apply each prop': {
        'Applying prop': string;
        '[1] definitions': string[];
        '[2] before': Element[];
        '[3] after': Element;
    }[];
    '[4] after': Element[];
};

export type SerializedBranch = Pick<Branch, typeof Branch['serializeKeys'][number]>;

export type VarBeingSet = {
    name: string;
    value: string;
    isLocal: boolean;
};
