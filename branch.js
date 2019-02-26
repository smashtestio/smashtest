/**
 * Represents a Branch from the test tree
 */
class Branch {
    constructor() {
        this.steps = [];                    // array of Step that are part of this Branch

        /*
        OPTIONAL

        this.prevSequentialBranch = {};     // When multiple branches cannot be run in parallel (due to +), they are sequentially linked here, where this var either points to the previous Branch in the sequence, or to null
        */
    }
}
module.exports = Branch;
