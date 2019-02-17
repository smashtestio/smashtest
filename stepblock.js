/**
 * Represents a Step block in the test tree
 */
class StepBlock {
    constructor() {
        this.steps = [];      // array of Step - steps that are part of this StepBlock

        this.children = [];   // array of Step of StepBlock that are children of this StepBlock
        this.parent = null;   // parent Step or StepBlock

        /*
        OPTIONAL

        this.isSequential = false;     // true if this StepBlock is precended with a ..
        */
    }
}
module.exports = StepBlock;
