const Step = require('./step.js');

/**
 * Represents a Step block in the test tree
 */
class StepBlock extends Step {
    constructor() {
        super();

        this.steps = [];         // array of Step that are part of this StepBlock

        /*
        OPTIONAL

        this.isSequential = false;     // true if this StepBlock is precended with a ..
        */
    }
}
module.exports = StepBlock;
