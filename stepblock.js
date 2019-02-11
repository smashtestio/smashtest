/**
 * Represents a Step block in the test tree
 */
class StepBlock {
    /**
     * @param {Step} parent - The parent StepBlock
     */
    constructor(parent) {
        this.steps = [];                // array of Step - steps that are part of this StepBlock

        this.children = [];             // array of Step of StepBlock that are children of this StepBlock
        this.parent = parent || null;   // parent Step or StepBlock
    }
}
module.exports = StepBlock;
