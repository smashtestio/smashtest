const clonedeep = require('lodash/clonedeep');
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
        this.functionDeclaration = {};        // Step that corresponds to the function declaration, if this step is a function call

        this.isMustTest = false;              // true if this step is a Must Test step
        this.mustTestText = "";               // what comes after Must Test in this.text (doesn't include the *)
        this.mustTestTree = {};               // if this is a Must Test X step, X and its children are copied under here

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
     * @return {Step} A distinct copy of this Step, but with parent and containingStepBlock set to null and no children array
     */
    clone() {
        // We don't want the clone to walk the tree into this.parent and beyond (same with this.containingStepBlock)
        var originalParent = this.parent;
        this.parent = null;

        var originalContainingBlock = this.containingStepBlock;
        this.containingStepBlock = null;

        var originalChildren = this.children;
        this.children = undefined;

        var clone = clonedeep(this);
        clone.originalStep = this;

        // Restore originals
        this.parent = originalParent;
        this.containingStepBlock = originalContainingBlock;
        this.children = originalChildren;

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
     */
    getCanonicalText() {
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
            .replace(Constants.VAR_REGEX, '{}');

        functionCallText = functionCallText
            .trim()
            .replace(/\s+/g, ' ')
            .replace(Constants.STRING_LITERAL_REGEX, '{}')
            .replace(Constants.BRACKET_REGEX, '{}')
            .replace(Constants.VAR_REGEX, '{}');

        if(functionDeclarationText == functionCallText) {
            return true;
        }
        else if(functionDeclarationText.toLowerCase() == functionCallText.toLowerCase()) {
            this.error("The function call '" + functionCallText + "' matches function declaration '" + functionDeclarationText + "', but must match case sensitively", this.filename, this.lineNumber);
        }
        else {
            return false;
        }
    }

    /**
     * @return {String} The text of the function call (without {var}= or Must Test), null if step isn't a function call
     */
    getFunctionCallText() {
        if(this.isMustTest) { // Must Test X
            if(this.varsBeingSet && this.varsBeingSet.length == 1) { // Must Test {var} = Func
                return this.varsBeingSet[0].value;
            }
            else { // Must Test Func
                return this.mustTestText;
            }
        }
        else if(this.isFunctionCall) {
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
}
module.exports = Step;
