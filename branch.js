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
     * Attaches branch.steps to the end of this.steps
     */
    mergeToEnd(branch) {
        this.steps = this.steps.concat(branch.steps);
    }

    /**
     * @return {Branch} Cloned version of this branch
     */
    clone() {
        var clone = new Branch();
        this.steps.forEach((step) => {
            clone.steps.push(step.cloneForBranch());
        });

        this.prevSequentialBranch ? clone.prevSequentialBranch = this.prevSequentialBranch : null; // if this.prevSequentialBranch doesn't exist, don't do anything ("null;")

        if(this.afterBranches) {
            this.afterBranches.forEach((afterBranch) => {
                if(!clone.afterBranches) {
                    clone.afterBranches = [];
                }
                clone.afterBranches.push(afterBranch.clone());
            });
        }

        this.frequency ? clone.frequency = this.frequency : null;

        return clone;
    }
}
module.exports = Branch;
