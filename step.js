/**
 * Represents a Step within a Tree or StepBlock
 */
class Step {
    constructor() {
        this.line = "";                    // entire text of the step, including spaces at the front, comments, etc.

        this.text = "";                    // text of the command of the step (not including spaces in front, identifiers, comments, etc.)
        this.identifiers = [];             // array of strings, each of which represents an identifier (e.g., ['..', '+', '#something'])
        this.codeBlock = "";               // if this is a code block step, contains the '{' followed by the code
        this.comment = "";                 // text of the comment at the end of the line (e.g., '// comment here')

        this.isOneLineCodeBlock = false;   // true if this step is a code block and is only one line ({ and } are on the same line)
        this.isFunction = false;           // true if this step is a * Function Declaration
        this.isFunctionCall = false;       // true if this step is a Function Call *
        this.isTODO = false;               // true if this step has the To Do identifier (-TODO)
        this.isMANUAL = false;             // true if this step has the manual identifier (-MANUAL)
        this.isDebug = false;              // true if this step has the debug identifier (~)
        this.isStepByStepDebug = false;    // true if this step has the step-by-step debug identifier (~~)
        this.isNonParallel = false;        // true if this step has the non-parallel identifier (+)
        this.isSequential = false;         // true if this step has the sequential identifier (..)
        this.isExpectedFail = false;       // true if this step has the expected fail indentifier (#)
        this.expectedFailNote = "";        // if this step has the expected fail identifier (#), this is the string that comes after it
        this.varBeingSet = "";             // if this step is in the format {var}=Step, this is set to the var's name (var)
        this.localVarBeingSet = "";        // if this step is in the format {{var}}=Step, this is set to the var's name (var)

        this.children = [];                // Step or StepBlock objects that are children of this Step
        this.parent = null;                // Step or StepBlock that's the parent of this Step

        this.filename = null;              // filename where this step is from
        this.lineNumber = null;            // line number where this step is from
    }
}
module.exports = Step;
