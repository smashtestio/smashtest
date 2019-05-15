const utils = require('./utils.js');
const Constants = require('./constants.js');

/**
 * Represents a step within a Branch
 */
class Step {
    constructor(id) {
        this.id = id || -1;                   // id of the corresponding StepNode

        /*
        OPTIONAL

        this.functionDeclarationId = -1;      // id of StepNode that corresponds to the function declaration, if this step is a function call

        this.level = 0;                       // number of function calls deep this step is within its branch

        this.isPassed = false;                // true if this step passed after being run
        this.isFailed = false;                // true if this step failed after being run
        this.isSkipped = false;               // true if this step was skipped
        this.isRunning = false;               // true if this step is currently running

        this.error = {};                      // if this step failed, this is the Error that was thrown
        this.log = [];                        // Array of objects that represent the logs of this step

        this.elapsed = 0;                     // number of ms it took this step to execute
        this.timeStarted = {};                // Date object (time) of when this step started being executed
        this.timeEnded = {};                  // Date object (time) of when this step ended execution

        reportTemplate = "";                  // points to object whose html property contains html that represents this step in reports
        reportView = {};                      // object that replaces {{{mustache templates}}} in reportTemplate
        */
    }

    /**
     * Checks to see if this step, which is a function call, matches the given function declaration node (case insensitive)
     * @param {StepNode} functionDeclaration - A function declaration node
     * @return {Boolean} true if they match, false if they don't
     * @throws {Error} if there's a case insensitive match but not a case sensitive match
     */
    isFunctionMatch(functionDeclaration) {
        let functionCallText = this.getFunctionCallText();
        let functionDeclarationText = functionDeclaration.text;

        // When hooking up functions, canonicalize by trim(), toLowerCase(), and replace \s+ with a single space
        // functionDeclarationText can have {{variables}}
        // functionCallText can have {{vars}}, {vars}, 'strings', "strings", and [strings]

        functionDeclarationText = functionDeclarationText
            .replace(Constants.VAR, '{}');
        functionDeclarationText = utils.unescape(functionDeclarationText);
        functionDeclarationText = utils.canonicalize(functionDeclarationText);

        functionCallText = functionCallText
            .replace(Constants.STRING_LITERAL, '{}')
            .replace(Constants.VAR, '{}');
        functionCallText = utils.unescape(functionCallText);
        functionCallText = utils.canonicalize(functionCallText);

        if(functionDeclarationText.endsWith('*')) {
            return functionCallText.startsWith(functionDeclarationText.replace(/\*$/, ''));
        }
        else {
            return functionCallText == functionDeclarationText;
        }
    }

    /**
     * @return {String} The text of the function call (without the leading {var}=, if one exists), null if step isn't a function call
     */
    getFunctionCallText() {
        if(this.isFunctionCall) {
            let varsBeingSet = []; // TODO: call originalStepNode.getVarsBeingSet()
            if(varsBeingSet && varsBeingSet.length == 1) { // {var} = Func
                return varsBeingSet[0].value;
            }
            else { // Func
                return this.text;
            }
        }
        else {
            return null;
        }
    }

    /**
     * Merges functionDeclaration into this Step (modifier booleans are OR'ed in from functionDeclaration into this)
     * This step must be a function call
     * @param {StepNode} functionDeclaration - The function declaration that corresponds to this step
     */
    mergeInFunctionDeclaration(functionDeclaration) {
        this.functionDeclaration = functionDeclaration;
        this.functionDeclarationText = functionDeclaration.text;

        let isSkip = this.isSkip || functionDeclaration.isSkip;
        isSkip && (this.isSkip = isSkip);

        let isSkipBelow = this.isSkipBelow || functionDeclaration.isSkipBelow;
        isSkipBelow && (this.isSkipBelow = isSkipBelow);

        let isSkipBranch = this.isSkipBranch || functionDeclaration.isSkipBranch;
        isSkipBranch && (this.isSkipBranch = isSkipBranch);

        let isDebug = this.isDebug || functionDeclaration.isDebug;
        isDebug && (this.isDebug = isDebug);

        let isBeforeDebug = this.isBeforeDebug || functionDeclaration.isBeforeDebug;
        isBeforeDebug && (this.isBeforeDebug = isBeforeDebug);

        let isAfterDebug = this.isAfterDebug || functionDeclaration.isAfterDebug;
        isAfterDebug && (this.isAfterDebug = isAfterDebug);

        let isOnly = this.isOnly || functionDeclaration.isOnly;
        isOnly && (this.isOnly = isOnly);

        let isNonParallel = this.isNonParallel || functionDeclaration.isNonParallel;
        isNonParallel && (this.isNonParallel = isNonParallel);

        let isSequential = this.isSequential || functionDeclaration.isSequential;
        isSequential && (this.isSequential = isSequential);

        let isCollapsed = this.isCollapsed || functionDeclaration.isCollapsed;
        isCollapsed && (this.isCollapsed = isCollapsed);

        // we don't need to copy over isHidden

        let isHook = this.isHook || functionDeclaration.isHook;
        isHook && (this.isHook = isHook);

        let isPackaged = this.isPackaged || functionDeclaration.isPackaged;
        isPackaged && (this.isPackaged = isPackaged);

        if(functionDeclaration.hasCodeBlock()) {
            this.codeBlock = functionDeclaration.codeBlock;
        }
    }

    /**
     * @return {Step} clone of this function declaration step (using this.cloneForBranch()), converted into a function call step
     */
    cloneAsFunctionCall() {
        let clone = this.cloneForBranch();
        clone.isFunctionDeclaration = false;
        clone.isFunctionCall = true;
        return clone;
    }

    /**
     * Logs the given item to this Step
     * @param {Object or String} item - The item to log
     */
    appendToLog(item) {
        if(!this.log) {
            this.log = [];
        }

        if(typeof item == 'string') {
            this.log.push( { text: item } );
        }
        else {
            this.log.push(item);
        }
    }

    /**
     * @return {Boolean} True if this Step completed already
     */
    isComplete() {
        return this.isPassed || this.isFailed || this.isSkipped;
    }

    /**
     * @return {Boolean} True if this step has a code block, false otherwise
     */
    hasCodeBlock() {
        return typeof this.codeBlock != 'undefined';
    }

    getVarsList() {
        // TODO







    }
}
module.exports = Step;
