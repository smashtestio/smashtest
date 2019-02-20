/**
 * Represents a Step within a Tree or StepBlock
 */
class Step {
    constructor() {
        this.line = "";                       // entire text of the step, including spaces at the front, comments, etc.
        this.indents = -1;                    // number of indents before this step's text, where an indent consists of SPACES_PER_INDENT spaces

        this.parent = null;                   // Step or StepBlock that's the parent of this Step (null if this Step is itself part of a StepBlock)
        this.children = [];                   // Step or StepBlock objects that are children of this Step ([] if this Step is itself part of a StepBlock)

        this.filename = null;                 // filename where this step is from
        this.lineNumber = null;               // line number where this step is from

        /*
        OPTIONAL

        this.text = "";                       // text of the command of the step (not including spaces in front, identifiers, comments, etc.)
        this.identifiers = [];                // array of strings, each of which represents an identifier (e.g., ['..', '+', '#something'])
        this.codeBlock = "";                  // if this is a code block step, contains the '{' followed by the code
        this.comment = "";                    // text of the comment at the end of the line (e.g., '// comment here')

        this.isFunctionDeclaration = false;   // true if this step is a * Function Declaration
        this.isFunctionCall = false;          // true if this step is a function call
        this.isTextualStep = false;           // true if this step is textual (-) and not a function call

        this.isMustTest = false;              // true if this step is a Must Test step
        this.mustTestText = "";               // what comes after Must Test in this.text (doesn't include the *)

        this.isToDo = false;                  // true if this step has the To Do identifier (-T)
        this.isManual = false;                // true if this step has the manual identifier (-M)
        this.isDebug = false;                 // true if this step has the debug identifier (~)
        this.isStepByStepDebug = false;       // true if this step has the step-by-step debug identifier (~~)
        this.isNonParallel = false;           // true if this step has the non-parallel identifier (+)
        this.isSequential = false;            // true if this step has the sequential identifier (..)
        this.isExpectedFail = false;          // true if this step has the expected fail indentifier (#)

        this.varsBeingSet = [];               // if this step is in the format {var1}=Step1, {{var2}}=Step2, etc., this array will contain objects {name: "var1", value: "Step1", isLocal: false}, {name: "var2", value: "Step2", isLocal: true} etc.
        this.varsList = [];                   // array of objects with format {name: "var1", isLocal: false} representing all the variables included in this step

        this.elementFinderList = [];          // array of objects with format {name: "contents of elementFinder", elementFinder: {Object} } representing all the elementFinders included in this step

        this.containingStepBlock = {};        // the StepBlock that contains this Step
        */
    }
}
module.exports = Step;
