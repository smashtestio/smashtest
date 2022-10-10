import { WebElement } from 'selenium-webdriver';
import { ComparerNode } from '../packages/js/comparer.js';
import ElementFinder from '../packages/js/elementfinder.js';
import Branch from './branch.js';
import { FREQUENCIES, HOOK_NAMES } from './constants.js';
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

export class SmashError extends Error {
    fatal?: boolean;
    filename?: string;
    lineNumber?: number;
    continue?: boolean;

    constructor(message: string) {
        super(message);
    }
}

export type SerializedSmashError = Omit<SmashError, 'name'>;

export function isSmashError(error: unknown): error is SmashError {
    return error instanceof Error;
}

export function checkUnknownProp<Prop extends string>(obj: Record<string, unknown>, prop: Prop): unknown {
    return typeof obj === 'object' && obj && prop in obj && obj[prop];
}

export type FunctionProp = (elems: Element[], input?: string) => Element[];

export type PropItem = FunctionProp | string | (ElementFinder | BrowserElementFinder);

export type Prop = PropItem[];

export type Props = {
    [key: string]: PropItem[];
};

export type SerializedProps = {
    [key: string]: Prop;
};

export type PropDefinition = {
    prop: string;
    def: string;
    input?: string | null | number;
    not?: true | undefined;
};

export type Frequency = typeof FREQUENCIES[number];

export type HookField = 'beforeEveryBranch' | 'afterEveryBranch' | 'beforeEveryStep' | 'afterEveryStep';
export type HookName = typeof HOOK_NAMES[number];

export type Modifier = '~' | '$';

export type BrowserParams<Options = unknown> = {
    name: 'chrome' | 'firefox' | 'safari' | 'internet explorer' | 'MicrosoftEdge';
    version?: string;
    platform?: 'linux' | 'mac' | 'windows';
    width?: number;
    height?: number;
    deviceEmulation?: string;
    isHeadless?: boolean;
    testServer?: string | undefined;
    serverUrl?: string | undefined;
    options?: Options;
    capabilities?: unknown;
};

export type ConstraintsInstruction = {
    $typeof?: string;
    $regex: RegExp;
    $contains: unknown;
    $max: number;
    $min: number;
    $code: unknown;
    $length: number;
    $maxLength: number;
    $minLength: number;
    $subset: unknown;
    $anyOrder: unknown;
    $exact: unknown;
    $every: Constraints;
};

export type Constraints = Record<string, unknown> & ConstraintsInstruction;

export type ComparisonBase =
    | ComparisonBase[]
    | ComparerNode[]
    | { [index: string]: ComparisonBase }
    | string
    | number
    | boolean
    | undefined
    | object
    | null;

export type Snapshot = {
    tree?: Tree;
    branches: ReturnType<Branch['serialize']>[];
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
        '[1] definitions': PropItem[];
        '[2] before': Element[] | null;
        '[3] after': Element[];
    }[];
    '[4] after': Element[];
};

export type SerializedBranch = Pick<Branch, typeof Branch['serializeKeys'][number]>;

export type VarBeingSet = {
    name: string;
    value: string;
    isLocal: boolean;
};
