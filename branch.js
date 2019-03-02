const clonedeep = require('lodash/clonedeep');

/**
 * Represents a Branch from the test tree
 */
class Branch {
    constructor() {
        this.steps = [];                    // array of Step that are part of this Branch

        /*
        OPTIONAL

        this.prevSequentialBranch = {};     // When multiple branches cannot be run in parallel (due to +), they are sequentially linked here, where this var either points to the previous Branch in the sequence, or to null
        this.afterBranches = [];            // Array of Branch, the branches to execute after this branch is done
        this.frequency = "";                // Frequency of this Branch (either 'high', 'med', or 'low')
        */
    }

    /**
     * @return {Branch} A deep clone of this Branch
     */
    clone() {
        return clonedeep(this);
    }

    /**
     * Attaches branch.steps to the end of this.steps, copies member vars from branch into this one
     */
    attachToEnd(branch) {
        this.steps = this.steps.concat(branch.steps);
        this.prevSequentialBranch = branch.prevSequentialBranch;
        this.afterBranches = branch.afterBranches;
        this.frequency = branch.frequency;
    }
}
module.exports = Branch;
