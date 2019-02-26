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

    /**
     * @return {Array} Cloned array of this.steps
     */
    cloneSteps() {
        var cloneArr = [];
        this.steps.forEach((step) => {
            cloneArr.push(step.clone());
        });
        return cloneArr;
    }
}
module.exports = StepBlock;
