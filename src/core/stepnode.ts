import invariant from 'tiny-invariant';
import * as Constants from './constants.js';
import StepBlockNode from './stepblocknode.js';
import { pickBy } from './typehelpers.js';
import { HookName, VarBeingSet } from './types.js';
import * as utils from './utils.js';

/**
 * Represents a step node within a Tree or StepBlock
 */
class StepNode {
    id: number; // number that uniquely identifies this step node (must be > 0)

    indents = -1; // number of indents before this step node's text, where an indent consists of SPACES_PER_INDENT spaces

    parent: StepNode | null = null; // StepNode or StepBlockNode that's the parent of this StepNode (null if this StepNode is itself part of a StepBlockNode)
    children: (StepNode | StepBlockNode)[] = []; // StepNode or StepBlockNode objects that are children of this StepNode ([] if this Step is itself part of a StepBlockNode)

    filename; // filename where this step node is from
    lineNumber; // line number where this step node is from

    text = ''; // text of the command of the step node (not including spaces in front, modifiers, comments, etc.)

    // OPTIONAL
    canon?: string; // canonicalized text of the step node

    modifiers?: string[]; // Array of String, each of which represents an modifier (e.g., ['..', '+']) in front or behind the step node
    frontModifiers?: string[]; // Array of String, modifiers in front of the step node's text
    backModifiers?: string[]; // Array of String, modifiers in back of the step node's text
    groups?: string[]; // Array of Strings, the group/freq hashtag modifiers
    codeBlock?: string; // code block contents that come after the { and not including the line with the }
    comment?: string; // text of the comment at the end of the line (e.g., '// comment here')

    isFunctionDeclaration?: boolean; // true if this is a function declaration
    isFunctionCall?: boolean; // true if this is a function call
    isPrivateFunctionDeclaration?: boolean; // true if this is a private function declaration
    isTextualStep?: boolean; // true if this is a textual (-) step node and not a function call

    isMultiBlockFunctionDeclaration?: boolean; // true if this is the '[' from a multi-level step block (implemented under the hood as a function call/declaration)
    isMultiBlockFunctionCall?: boolean; // true if this is the ']' from a multi-level step block (implemented under the hood as a function call/declaration)
    multiBlockFid?: number; // id of the multi-level step block function declaration being called
    isOpeningBracket?: boolean; // true if this step includes a '['

    isSkip?: boolean; // true if this step node has the skip modifier (-s)
    isSkipBelow?: boolean; // true if this step node has the skip below modifier (.s)
    isSkipBranch?: boolean; // true if this step node has the skip branch modifier ($s)
    isDebug?: boolean; // true if this step node has a debug or express debug modifier (~ or ~~)
    isBeforeDebug?: boolean; // true if this step node has the debug modifier (~) before the step text
    isAfterDebug?: boolean; // true if this step node has the debug modifier (~) after the step text
    isExpressDebug?: boolean; // true if this step node has the express debug modifier (~~)
    isOnly?: boolean; // true if this step node has the only modifier ($)
    isNonParallel?: boolean; // true if this step node has the non-parallel modifier (!)
    isNonParallelCond?: boolean; // true if this step node has the non-parallel (conditional) modifier (!!)
    isSequential?: boolean; // true if this step node has the sequential modifier (..)
    isCollapsed?: boolean; // true if this step node should be collapsed in the report (+)
    isHidden?: boolean; // true if this step node should be hidden in the report (+?)

    isHook?: boolean; // true if this step node is a hook
    isPackaged?: boolean; // true if this step node is from a package file

    containingStepBlock?: StepBlockNode; // the StepBlockNode that contains this StepNode

    used?: boolean; // set to true if this step node is used in a branch at least once

    /**
     *
     * @param {Number} id - number that uniquely identifies this step node (must be > 0)
     * @param {String} filename - The filename of the file where this step is from
     * @param {Integer} lineNumber - The line number of this step
     */
    constructor(id: number, filename?: string, lineNumber?: number) {
        this.id = id;
        this.filename = filename;
        this.lineNumber = lineNumber;
    }

    /**
     * @return {Boolean} True if this step node has a code block, false otherwise
     */
    hasCodeBlock(this: StepNode): this is StepNode & { codeBlock: string } {
        return this.codeBlock !== undefined;
    }

    /**
     * Parses a line into this StepNode
     * this.text will be set to '' if this is an empty line, and to '..' if the whole line is just '..'
     * @param {String} line - The full text of the line
     * @returns {StepNode} This StepNode
     * @throws {Error} If there is a parse error
     */
    parseLine(line: string) {
        const filename = this.filename;
        const lineNumber = this.lineNumber;

        if (line.trim() === '') {
            this.text = '';
            return this;
        }

        if (line.match(Constants.SEQ_MODIFIER_LINE)) {
            this.text = '..';
            return this;
        }

        const matches = line.match(Constants.LINE_WHOLE);

        utils.assert(matches, 'This step is not written correctly', filename, lineNumber); // NOTE: probably unreachable (LINE_WHOLE can match anything)

        // Parsed parts of the line
        this.text = matches[7].trim();

        // Parse function declarations and multi-level step blocks
        //   '* Step' is a function declaration
        //   '** Step' is a private function declaration
        //   '*** Step' is a hook function declaration
        //   'Step [' is a multi-step-block function declaration
        //   '[' is a multi-level-step-block function declaration
        //   ']' is a multi-level-step-block function call to the last multi-level-step-block function declaration
        this.isOpeningBracket = Boolean(
            (matches[5] && matches[5].trim() === '[') || (matches[20] && matches[20].trim() === '[')
        );

        if (matches[4] || this.isOpeningBracket) {
            if (this.isOpeningBracket && (!matches[4] || matches[4].trim() !== '*')) {
                this.isFunctionDeclaration = true;
                this.isPrivateFunctionDeclaration = true;
                this.isMultiBlockFunctionDeclaration = true;
                if (!this.text) {
                    this.text = ' ';
                }
            }
            if (matches[4]) {
                if (matches[4].trim() === '*') {
                    this.isFunctionDeclaration = true;
                }
                if (matches[4].trim() === '**') {
                    this.isFunctionDeclaration = true;
                    this.isPrivateFunctionDeclaration = true;
                }
                if (matches[4].trim() === '***') {
                    this.isFunctionDeclaration = true;
                    this.isHook = true;
                }
            }
            if (matches[5] && matches[5].trim() === ']') {
                this.isFunctionCall = true;
                this.isMultiBlockFunctionCall = true;
                this.text = ' ';
            }
        }

        if (matches[1]) {
            this.frontModifiers = matches[1].trim().split(/\s+/);
            this.modifiers = (this.modifiers || []).concat(this.frontModifiers);
        }
        if (matches[15]) {
            this.backModifiers = matches[15].trim().split(/\s+/);
            this.modifiers = (this.modifiers || []).concat(this.backModifiers);
        }
        if (matches[19] && matches[19].trim().startsWith('{')) {
            this.codeBlock = matches[19].replace(/^\{/, '');
        }
        if (matches[22]) {
            this.comment = matches[22];
        }

        // Validation against prohibited step texts
        if (this.text.replace(/\s+/g, '').match(Constants.NUMBERS_ONLY_WHOLE)) {
            utils.error('Invalid step name', filename, lineNumber);
        }

        // Function Declaration
        if (this.isFunctionDeclaration) {
            if (this.text.match(Constants.STRING_LITERAL)) {
                utils.error(
                    'A function declaration cannot have \'strings\', "strings", or [strings] inside of it',
                    filename,
                    lineNumber
                );
            }
        }
        else {
            // not a function declaration
            // Validate that a non-function declaration isn't using a hook step name
            if (Constants.HOOK_NAMES.indexOf(utils.canonicalize(this.text) as HookName) !== -1) {
                utils.error(
                    'You cannot have a function call with that name. That\'s reserved for hook function declarations.',
                    filename,
                    lineNumber
                );
            }
        }

        // Set modifier booleans and perform related validations
        if (this.frontModifiers) {
            if (this.frontModifiers.includes('~')) {
                this.isDebug = true;
                this.isBeforeDebug = true;
            }
        }
        if (this.backModifiers) {
            if (this.backModifiers.includes('~')) {
                this.isDebug = true;
                this.isAfterDebug = true;
            }
        }
        if (this.modifiers) {
            if (this.modifiers.includes('-s')) {
                this.isSkip = true;
                this.isTextualStep = true;
            }
            if (this.modifiers.includes('.s')) {
                this.isSkipBelow = true;
            }
            if (this.modifiers.includes('$s')) {
                this.isSkipBranch = true;
            }
            if (this.modifiers.includes('-')) {
                this.isTextualStep = true;

                if (this.isMultiBlockFunctionDeclaration) {
                    utils.error('A named step block ([) cannot be a textual step (-) as well', filename, lineNumber);
                }
                else if (this.isFunctionDeclaration) {
                    utils.error('A function declaration cannot be a textual step (-) as well', filename, lineNumber);
                }
                else if (this.hasCodeBlock()) {
                    utils.error('A step with a code block cannot be a textual step (-) as well', filename, lineNumber);
                }
            }
            if (this.modifiers.includes('~~')) {
                this.isDebug = true;
                this.isExpressDebug = true;
            }
            if (this.modifiers.includes('$')) {
                this.isOnly = true;
            }
            if (this.modifiers.includes('!')) {
                this.isNonParallel = true;
            }
            if (this.modifiers.includes('!!')) {
                this.isNonParallelCond = true;
            }
            if (this.modifiers.includes('..')) {
                this.isSequential = true;
            }
            if (this.modifiers.includes('+')) {
                this.isCollapsed = true;
            }
            if (this.modifiers.includes('+?')) {
                this.isHidden = true;
            }

            this.modifiers.forEach((mod) => {
                if (mod.startsWith('#')) {
                    if (!this.groups) {
                        this.groups = [];
                    }
                    this.groups.push(mod.slice(1));
                }
            });
        }

        // Validate hook steps
        if (this.isHook) {
            const canStepText = utils.canonicalize(this.text) as HookName;
            utils.assert(Constants.HOOK_NAMES.indexOf(canStepText) !== -1, 'Invalid hook name', filename, lineNumber);
            utils.assert(this.hasCodeBlock(), 'A hook must have a code block', filename, lineNumber);
            utils.assert(
                !this.modifiers || this.modifiers.length === 0,
                `A hook cannot have any modifiers (${this.modifiers?.[0]})`,
                filename,
                lineNumber
            );
        }

        // Steps that set variables
        if (this.text.match(Constants.VARS_SET_WHOLE)) {
            // This step is a {var1} = Val1, {var2} = Val2, {{var3}} = Val3, etc. (one or more vars)

            utils.assert(
                !this.isFunctionDeclaration,
                'A step setting {variables} cannot start with a *',
                filename,
                lineNumber
            );

            const varsBeingSet = this.getVarsBeingSet();

            for (let i = 0; i < varsBeingSet.length; i++) {
                const varBeingSet = varsBeingSet[i];

                // Generate variable name validations
                if (varBeingSet.name.replace(/\s+/g, '').match(Constants.NUMBERS_ONLY_WHOLE)) {
                    utils.error('A {variable name} cannot be just numbers', filename, lineNumber);
                }

                // Variable names cannot end in a * (that's reserved for lookahead vars)
                if (varBeingSet.name.match(/\*\s*$/)) {
                    utils.error('A variable name to the left of an = cannot end in a *', filename, lineNumber);
                }
            }

            if (varsBeingSet.length > 1) {
                // This step is {var1}='str1', {var2}='str2', etc. (two or more vars)

                // Validations
                for (let i = 0; i < varsBeingSet.length; i++) {
                    const varBeingSet = varsBeingSet[i];

                    if (varBeingSet.value.trim() === '') {
                        utils.error('A {variable} must be set to something', filename, lineNumber);
                    }
                    if (!varBeingSet.value.match(Constants.STRING_LITERAL_WHOLE)) {
                        utils.error(
                            'When multiple {variables} are being set on a single line, those {variables} can only be set to \'strings\', "strings", or [strings]',
                            filename,
                            lineNumber
                        );
                    }
                }
            }
            else {
                // This step is {var}=Func or {var}='str' (only one var being set)

                const varBeingSet = varsBeingSet[0];
                if (!varBeingSet.value.match(Constants.STRING_LITERAL_WHOLE)) {
                    // This step is {var}=Func

                    this.isFunctionCall = true;
                    if (this.hasCodeBlock()) {
                        // In {var} = Text {, the Text is not considered a function call
                        delete this.isFunctionCall;
                    }

                    // Validations
                    if (varBeingSet.value.trim() === '') {
                        utils.error('A {variable} must be set to something', filename, lineNumber);
                    }
                    if (varBeingSet.value.replace(/\s+/g, '').match(Constants.NUMBERS_ONLY_WHOLE)) {
                        utils.error(
                            '{vars} can only be set to \'strings\', "strings", or [strings]',
                            filename,
                            lineNumber
                        );
                    }
                    if (this.isTextualStep) {
                        utils.error(
                            'A textual step (ending in -) cannot also start with a {variable} assignment',
                            filename,
                            lineNumber
                        );
                    }
                }
            }
        }
        else {
            // this step is not a {var}= step
            // Set isFunctionCall
            if (!this.isTextualStep && !this.isFunctionDeclaration) {
                this.isFunctionCall = true;
                if (this.hasCodeBlock()) {
                    // In Text {, the Text is not considered a function call
                    delete this.isFunctionCall;
                }
            }
        }

        // Set canon
        if (this.isFunctionDeclaration) {
            this.canon = this.canonicalizeFunctionDeclarationText(this.text);
        }
        else if (this.isFunctionCall) {
            this.canon = this.canonicalizeFunctionCallText();
        }

        return this;
    }

    /**
     * @return {Array} Array of vars being set via the = operator in this step node, empty array if no vars are set
     * If this.text is in format {var1}=Step1, {{var2}}=Step2, etc., the returned array will contain objects {name: "var1", value: "Step1", isLocal: false}, {name: "var2", value: "Step2", isLocal: true} etc.
     */
    getVarsBeingSet() {
        const varsBeingSet: VarBeingSet[] = [];
        let textCopy = this.text + '';
        let matches = textCopy.match(Constants.VARS_SET_WHOLE);

        while (matches) {
            varsBeingSet.push({
                name: utils.stripBrackets(matches[2]),
                value: matches[6],
                isLocal: matches[2].includes('{{')
            });

            textCopy = textCopy.replace(matches[1], ''); // strip the leading {var}=Step from the string
            textCopy = textCopy.replace(/^,/, ''); // strip the leading comma, if there is one
            matches = textCopy.match(Constants.VARS_SET_WHOLE);
        }

        return varsBeingSet;
    }

    /**
     * @return {String} The text of the function call (without the leading {var}=, if one exists), null if step isn't a function call
     */
    getFunctionCallText() {
        if (this.isFunctionCall) {
            const varsBeingSet = this.getVarsBeingSet();
            if (varsBeingSet && varsBeingSet.length === 1) {
                // {var} = Func
                return varsBeingSet[0].value;
            }
            else {
                // Func
                return this.text;
            }
        }
        else {
            return null;
        }
    }

    /**
     * Checks to see if this step, which is a function call, matches the given function declaration node (case insensitive)
     * @param {StepNode} functionDeclarationNode - A function declaration node
     * @return {Boolean} true if they match, false if they don't
     * @throws {Error} if there's a case insensitive match but not a case sensitive match
     */
    isFunctionMatch(functionDeclarationNode: StepNode) {
        invariant(
            typeof this.canon === 'string',
            'this.canon must be a string when matching a function call with a function declaration'
        );
        let functionCallText = this.canon;
        const functionDeclarationText = functionDeclarationNode.canon;
        if (functionCallText === functionDeclarationText) {
            return true;
        }
        else {
            functionCallText = functionCallText.replace(/^\s*(given|when|then|and)\s*/i, '');
            return functionCallText === functionDeclarationText;
        }
    }

    /**
     * @return {String} Canonicalized text of this step node
     */
    canonicalizeFunctionDeclarationText(text: string) {
        let functionDeclarationText = text;

        // Canonicalize by replacing {vars} with {}'s
        functionDeclarationText = functionDeclarationText.replace(Constants.VAR, '{}');
        functionDeclarationText = utils.unescape(functionDeclarationText);
        functionDeclarationText = utils.canonicalize(functionDeclarationText);

        return functionDeclarationText;
    }

    /**
     * @return {String} Canonicalized text of this step node, if it's a function call
     */
    canonicalizeFunctionCallText() {
        let functionCallText = this.getFunctionCallText();

        invariant(
            typeof functionCallText === 'string',
            'this.getFunctionCallText() must return a string when canonicalizing a function call'
        );

        // Canonicalize by replacing {vars} and 'strings' with {}'s
        functionCallText = functionCallText.replace(Constants.STRING_LITERAL, '{}').replace(Constants.VAR, '{}');
        functionCallText = utils.unescape(functionCallText);
        functionCallText = utils.canonicalize(functionCallText);

        return functionCallText;
    }

    /**
     * @return {Object} An Object representing this step node, but able to be converted to JSON and only containing the most necessary stuff for a report
     */
    serialize() {
        const keys: (keyof StepNode)[] = [
            'text',
            'filename',
            'lineNumber',
            'frontModifiers',
            'backModifiers',
            'isCollapsed',
            'isHidden',
            'isFunctionCall',
            'isTextualStep',
            'isMultiBlockFunctionDeclaration',
            'isMultiBlockFunctionCall'
        ];

        return {
            id: this.id,
            hasCodeBlock: this.hasCodeBlock(),
            ...pickBy<StepNode>(this, (value, key) => value !== undefined && keys.includes(key))
        };
    }
}

export default StepNode;
