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
        this.frequency = "";                // Frequency of this Branch (either 'high', 'med', or 'low')
        this.groups = [];                   // The groups that this Branch is a part of
        this.isOnly = false;                // If true, a Step in this Branch has a $
        this.isDebug = false;               // If true, a Step in this Branch has a ~

        this.afterEveryBranch = [];         // Array of Branch, the branches to execute after this branch is done
        this.afterEveryStep = [];           // Array of Branch, the branches to execute after each step in this branch is done
        */
    }

    /**
     * Attaches branch.steps to the end of this.steps
     * Attaches branch.afterEveryBranch to the end of this.afterEveryBranch (so that built-in comes last)
     * Attaches branch.afterEveryStep to the end of this.afterEveryStep (so that built-in comes last)
     * Copies over the other members, if they exist in branch
     */
    mergeToEnd(branch) {
        this.steps = this.steps.concat(branch.steps);

        branch.nonParallelId ? this.nonParallelId = branch.nonParallelId : null; // if branch.nonParallelId doesn't exist, don't do anything (null)
        branch.isOnly ? this.isOnly = branch.isOnly : null;
        branch.isDebug ? this.isDebug = branch.isDebug : null;
        branch.frequency ? this.frequency = branch.frequency : null;

        if(branch.groups) {
            if(typeof this.groups == 'undefined') {
                this.groups = [];
            }

            branch.groups.forEach(group => {
                this.groups.push(group);
            });
        }

        if(branch.afterEveryBranch) {
            if(!this.afterEveryBranch) {
                this.afterEveryBranch = [];
            }

            this.afterEveryBranch = branch.afterEveryBranch.concat(this.afterEveryBranch);
        }

        if(branch.afterEveryStep) {
            if(!this.afterEveryStep) {
                this.afterEveryStep = [];
            }

            this.afterEveryStep = branch.afterEveryStep.concat(this.afterEveryStep);
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

        this.nonParallelId ? clone.nonParallelId = this.nonParallelId : null; // if this.nonParallelId doesn't exist, don't do anything (null)
        this.isOnly ? clone.isOnly = this.isOnly : null;
        this.isDebug ? clone.isDebug = this.isDebug : null;
        this.frequency ? clone.frequency = this.frequency : null;

        if(this.groups) {
            if(typeof clone.groups == 'undefined') {
                clone.groups = [];
            }

            this.groups.forEach(group => {
                clone.groups.push(group);
            });
        }

        if(this.afterEveryBranch) {
            if(!clone.afterEveryBranch) {
                clone.afterEveryBranch = [];
            }

            this.afterEveryBranch.forEach(branch => {
                clone.afterEveryBranch.push(branch.clone());
            });
        }

        if(this.afterEveryStep) {
            if(!clone.afterEveryStep) {
                clone.afterEveryStep = [];
            }

            this.afterEveryStep.forEach(branch => {
                clone.afterEveryStep.push(branch.clone());
            });
        }

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
