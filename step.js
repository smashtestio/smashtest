const clonedeep = require('lodash/clonedeep');
const utils = require('./utils.js');
const Constants = require('./constants.js');

/**
 * Represents a Step within a Tree or StepBlock
 */
class Step {
    constructor() {
        this.indents = -1;                    // number of indents before this step's text, where an indent consists of SPACES_PER_INDENT spaces

        this.parent = null;                   // Step or StepBlock that's the parent of this Step (null if this Step is itself part of a StepBlock)
        this.children = [];                   // Step or StepBlock objects that are children of this Step ([] if this Step is itself part of a StepBlock)

        this.filename = null;                 // filename where this step is from
        this.lineNumber = null;               // line number where this step is from

        /*
        OPTIONAL

        this.line = "";                       // entire text of the step, including spaces at the front, comments, etc.
        this.text = "";                       // text of the command of the step (not including spaces in front, identifiers, comments, etc.)
        this.identifiers = [];                // array of strings, each of which represents an identifier (e.g., ['..', '+', '#something'])
        this.codeBlock = "";                  // if this is a code block step, contains the '{' followed by the code
        this.comment = "";                    // text of the comment at the end of the line (e.g., '// comment here')

        this.isFunctionDeclaration = false;   // true if this step is a * Function Declaration
        this.isFunctionCall = false;          // true if this step is a function call
        this.isTextualStep = false;           // true if this step is textual (-) and not a function call
        this.functionDeclarationInTree = {};  // Step that corresponds to the function declaration, if this step is a function call

        this.isToDo = false;                  // true if this step has the To Do identifier (-T)
        this.isManual = false;                // true if this step has the manual identifier (-M)
        this.isDebug = false;                 // true if this step has the debug identifier (~)
        this.isStepByStepDebug = false;       // true if this step has the step-by-step debug identifier (~~)
        this.isOnly = false;                  // true if this step has the only identifier ($)
        this.isNonParallel = false;           // true if this step has the non-parallel identifier (+)
        this.isSequential = false;            // true if this step has the sequential identifier (..)
        this.isExpectedFail = false;          // true if this step has the expected fail indentifier (#)

        this.varsBeingSet = [];               // if this step is in the format {var1}=Step1, {{var2}}=Step2, etc., this array will contain objects {name: "var1", value: "Step1", isLocal: false}, {name: "var2", value: "Step2", isLocal: true} etc.
        this.varsList = [];                   // array of objects with format {name: "var1", isLocal: false} representing all the variables included in this step
        this.elementFinderList = [];          // array of objects with format {name: "contents of elementFinder", elementFinder: {Object} } representing all the elementFinders included in this step

        this.containingStepBlock = {};        // the StepBlock that contains this Step

        this.isBuiltIn = false;               // true if this step is from a built-in file

        this.afterEveryBranch = [];           // array of Step, which represent the steps to execute after every branch that traverses through this step is complete

        this.originalStep = {};               // when this step is cloned, the clone's originalStep points to the Step from which it was cloned
        this.branchIndents = 0;               // when this step is included in a Branch, this indicates the number of indents to use when printing the Branch out, so as to preserve function calling hierarchies (i.e., steps under a function are indented under that function's call)
        */
    }

    /**
     * Generates a clone of this Step, ready to be placed into a Branch
     * Cannot be called if this is a StepBlock
     * @return {Step} A distinct copy of this Step, but with parent, children, containingStepBlock, and functionDeclarationInTree deleted, and originalStep set
     */
    cloneForBranch() {
        // We don't want the clone to walk the tree into other Step objects, such as this.parent
        // Therefore, temporarily remove references to other Steps
        var originalParent = this.parent;
        delete this.parent;

        var originalChildren = this.children;
        delete this.children;

        var originalFunctionDeclarationInTree = this.functionDeclarationInTree;
        delete this.functionDeclarationInTree; // delete because this variable is optional and is undefined by default

        var originalContainingStepBlock = this.containingStepBlock;
        delete this.containingStepBlock; // delete because this variable is optional and is undefined by default

        var originalOriginalStep = this.originalStep;
        delete this.originalStep;

        // Clone
        var clone = clonedeep(this);
        clone.originalStep = originalOriginalStep ? originalOriginalStep : this; // double-cloning a Step retains originalStep pointing at the original step under this.root

        // Restore originals
        this.parent = originalParent;
        this.children = originalChildren;
        originalFunctionDeclarationInTree ? this.functionDeclarationInTree = originalFunctionDeclarationInTree : null; // if originalFunctionDeclarationInTree is undefined, don't do anything ("null;")
        originalContainingStepBlock ? this.containingStepBlock = originalContainingStepBlock : null;
        originalOriginalStep ? this.originalStep = originalOriginalStep : null;

        return clone;
    }

    /**
     * @return {Array} Array of Step, which are the leaves of this step's underlying tree, [ this ] if this is itself a leaf
     */
    getLeaves() {
        if(this.children.length == 0) {
            // this is a leaf
            return [ this ];
        }
        else {
            var arr = [];
            this.children.forEach((child) => {
                arr = arr.concat(child.getLeaves());
            });
            return arr;
        }
    }

    /**
     * @return {String} The text of this step, but in a canonical format (trimmed, all lowercase, and all whitespace replaced with a single space)
     * NOTE: Only use this function if this step is a hook function declaration
     */
    getHookCanonicalText() {
        return this.text.trim().toLowerCase().replace(/\s+/g, ' ');
    }

    /**
     * Checks to see if this step, which is a function call, matches the given function declaration
     * @param {Step} functionDeclaration - A function declaration step
     * @return {Boolean} true if they match, false if they don't
     * @throws {Error} if there's a case insensitive match but not a case sensitive match
     */
    isFunctionMatch(functionDeclaration) {
        var functionCallText = this.getFunctionCallText();
        var functionDeclarationText = functionDeclaration.text;

        // When hooking up functions, canonicalize by trim(), replace \s+ with a single space
        // functionDeclarationText can have {{variables}}
        // functionCallText can have {{vars}}, {vars}, 'strings', "strings", and [elementFinders]

        functionDeclarationText = functionDeclarationText
            .trim()
            .replace(/\s+/g, ' ')
            .replace(Constants.VAR_REGEX, '{}')
            .replace(Constants.ESCAPED_SINGLE_QUOTE, '\''); // replace \' with '

        functionCallText = functionCallText
            .trim()
            .replace(/\s+/g, ' ')
            .replace(Constants.STRING_LITERAL_REGEX, '{}')
            .replace(Constants.BRACKET_REGEX, '{}')
            .replace(Constants.VAR_REGEX, '{}')
            .replace(Constants.ESCAPED_SINGLE_QUOTE, '\''); // replace \' with '

        if(functionDeclarationText == functionCallText) {
            return true;
        }
        else if(functionDeclarationText.toLowerCase() == functionCallText.toLowerCase()) {
            utils.error("The function call '" + functionCallText + "' matches function declaration '" + functionDeclarationText + "', but must match case sensitively", this.filename, this.lineNumber);
        }
        else {
            return false;
        }
    }

    /**
     * @return {String} The text of the function call (without the leading {var}=, if one exists), null if step isn't a function call
     */
    getFunctionCallText() {
        if(this.isFunctionCall) {
            if(this.varsBeingSet && this.varsBeingSet.length == 1) { // {var} = Func
                return this.varsBeingSet[0].value;
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
     * Merges this.functionDeclarationStep into this Step (this Step must be a function call)
     * Identifier booleans are OR'ed in from this.functionDeclarationStep into this
     * If this.functionDeclarationStep has a code block, it is copied into this
     */
    mergeInFunctionDeclaration() {
        var isToDo = this.isToDo || this.functionDeclarationStep.isToDo;
        isToDo ? this.isToDo = isToDo : null; // don't do anything ("null;") if isTodo isn't true

        var isManual = this.isManual || this.functionDeclarationStep.isManual;
        isManual ? this.isManual = isManual : null;

        var isDebug = this.isDebug || this.functionDeclarationStep.isDebug;
        isDebug ? this.isDebug = isDebug : null;

        var isStepByStepDebug = this.isStepByStepDebug || this.functionDeclarationStep.isStepByStepDebug;
        isStepByStepDebug ? this.isStepByStepDebug = isStepByStepDebug : null;

        var isOnly = this.isOnly || this.functionDeclarationStep.isOnly;
        isOnly ? this.isOnly = isOnly : null;

        var isNonParallel = this.isNonParallel || this.functionDeclarationStep.isNonParallel;
        isNonParallel ? this.isNonParallel = isNonParallel : null;

        var isSequential = this.isSequential || this.functionDeclarationStep.isSequential;
        isSequential ? this.isSequential = isSequential : null;

        var isExpectedFail = this.isExpectedFail || this.functionDeclarationStep.isExpectedFail;
        isExpectedFail ? this.isExpectedFail = isExpectedFail : null;

        var isBuiltIn = this.isBuiltIn || this.functionDeclarationStep.isBuiltIn;
        isBuiltIn ? this.isBuiltIn = isBuiltIn : null;

        if(typeof this.functionDeclarationStep.codeBlock != 'undefined') {
            this.codeBlock = this.functionDeclarationStep.codeBlock;
        }
    }

    /**
     * @return {Step} clone of this function declaration step (using this.cloneForBranch()), converted into a function call step
     */
    cloneAsFunctionCall() {
        var clone = this.cloneForBranch();
        clone.isFunctionDeclaration = false;
        clone.isFunctionCall = true;
        return clone;
    }
}
module.exports = Step;
