/**
 * Represents a Step block in the test tree
 */
class StepBlock {
    constructor() {
        this.steps = [];         // array of Step that are part of this StepBlock

        this.indents = -1;       // number of indents before the text of each step in steps, where an indent consists of SPACES_PER_INDENT spaces

        this.parent = null;      // parent Step or StepBlock
        this.children = [];      // array of Step or StepBlock that are children of this StepBlock

        this.filename = null;    // filename where this StepBlock is from
        this.lineNumber = null;  // line number where this StepBlock is from

        /*
        OPTIONAL

        this.isSequential = false;     // true if this StepBlock is precended with a ..
        */
    }
}
module.exports = StepBlock;
