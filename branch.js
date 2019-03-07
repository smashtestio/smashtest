const Constants = require('./constants.js');

/**
 * Represents a Branch from the test tree
 */
class Branch {
    constructor() {
        this.steps = [];                    // array of Step that are part of this Branch

        /*
        OPTIONAL

        this.nonParallelId = "";            // When multiple branches cannot be run in parallel (due to +), they are each given the same nonParallelId
        this.afterBranches = [];            // Array of Branch, the branches to execute after this branch is done
        this.frequency = "";                // Frequency of this Branch (either 'high', 'med', or 'low')
        */
    }

    /**
     * Attaches branch.steps to the end of this.steps
     * Attaches branch.afterBranches to the end of this.afterBranches (so that built-in comes last)
     * Copies over branch.nonParallelId, if it exists
     */
    mergeToEnd(branch) {
        this.steps = this.steps.concat(branch.steps);

        if(branch.afterBranches) {
            if(!this.afterBranches) {
                this.afterBranches = [];
            }

            this.afterBranches = branch.afterBranches.concat(this.afterBranches);
        }

        if(branch.nonParallelId) {
            this.nonParallelId = branch.nonParallelId
        }
    }

    /**
     * @return {Branch} Cloned version of this branch
     */
    clone() {
        var clone = new Branch();
        this.steps.forEach(step => {
            clone.steps.push(step.cloneForBranch());
        });

        this.nonParallelId ? clone.nonParallelId = this.nonParallelId : null; // if this.nonParallelId doesn't exist, don't do anything ("null;")

        if(this.afterBranches) {
            this.afterBranches.forEach(afterBranch => {
                if(!clone.afterBranches) {
                    clone.afterBranches = [];
                }
                clone.afterBranches.push(afterBranch.clone());
            });
        }

        this.frequency ? clone.frequency = this.frequency : null;

        return clone;
    }

    /**
     * @return {String} The string representation of Branch
     */
    output(branchName) {
        var output = branchName + ' ..\n';

        this.steps.forEach(step => {
            for(var i = 0; i <= step.branchIndents; i++) {
                for (var j = 0; j < Constants.SPACES_PER_INDENT; j++) {
                    output += ' ';
                }
            }

            output += step.text + '\n';
        });

        return output;
    }
}
module.exports = Branch;
