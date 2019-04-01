const Step = require('./step.js');

/**
 * Represents a Step block in the test tree
 */
class StepBlock extends Step {
    constructor() {
        super();

        this.steps = [];         // array of Step that are part of this StepBlock
    }
}
module.exports = StepBlock;
