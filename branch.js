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
        this.isBuiltIn = false;             // If true, this is a built-in hook

        this.passedLastTime = false;              // if true, do not run this branch, but include it in the report
        this.isPassed = false;              // true if every step in this branch passed after being run
        this.isFailed = false;              // true if at least one step in this branch failed after being run

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
        branch.frequency ? this.frequency = branch.frequency : null;

        if(branch.groups) {
            if(typeof this.groups == 'undefined') {
                this.groups = [];
            }

            branch.groups.forEach(group => {
                this.groups.push(group);
            });
        }

        branch.isOnly ? this.isOnly = branch.isOnly : null;
        branch.isDebug ? this.isDebug = branch.isDebug : null;
        branch.isBuiltIn ? this.isBuiltIn = branch.isBuiltIn : null;

        branch.passedLastTime ? this.passedLastTime = branch.passedLastTime : null;
        branch.isPassed ? this.isPassed = branch.isPassed : null;
        branch.isFailed ? this.isFailed = branch.isFailed : null;

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
     * Clones this branch
     * @param {Boolean} [noRefs] - If true, the clone will contain no references to outside objects (such as Step.originalStepInTree)
     * @return {Branch} Cloned version of this branch
     */
    clone(noRefs) {
        var clone = new Branch();
        this.steps.forEach(step => {
            clone.steps.push(step.cloneForBranch(noRefs));
        });

        this.nonParallelId ? clone.nonParallelId = this.nonParallelId : null; // if this.nonParallelId doesn't exist, don't do anything (null)
        this.frequency ? clone.frequency = this.frequency : null;

        if(this.groups) {
            if(typeof clone.groups == 'undefined') {
                clone.groups = [];
            }

            this.groups.forEach(group => {
                clone.groups.push(group);
            });
        }

        this.isOnly ? clone.isOnly = this.isOnly : null;
        this.isDebug ? clone.isDebug = this.isDebug : null;
        this.isBuiltIn ? clone.isBuiltIn = this.isBuiltIn : null;

        this.passedLastTime ? clone.passedLastTime = this.passedLastTime : null;
        this.isPassed ? clone.isPassed = this.isPassed : null;
        this.isFailed ? clone.isFailed = this.isFailed : null;

        if(this.afterEveryBranch) {
            if(!clone.afterEveryBranch) {
                clone.afterEveryBranch = [];
            }

            this.afterEveryBranch.forEach(branch => {
                clone.afterEveryBranch.push(branch.clone(noRefs));
            });
        }

        if(this.afterEveryStep) {
            if(!clone.afterEveryStep) {
                clone.afterEveryStep = [];
            }

            this.afterEveryStep.forEach(branch => {
                clone.afterEveryStep.push(branch.clone(noRefs));
            });
        }

        return clone;
    }

    /**
     * @return {String} The string representation of Branch
     */
    output(branchName, startIndent) {
        if(typeof startIndent == 'undefined') {
            startIndent = 0;
        }

        var output = spaces(startIndent) + branchName + ' ..\n';

        this.steps.forEach(step => {
            var text = step.text;
            if(!step.isBuiltIn) {
                text += ' -';
            }
            output += spaces(step.branchIndents + startIndent + 1) + text + '\n';
        });

        if(this.beforeEveryBranch) {
            this.beforeEveryBranch.forEach(branch => {
                output += '\n' + branch.output("* Before Every Branch", startIndent + 1);
            });
        }

        if(this.afterEveryBranch) {
            this.afterEveryBranch.forEach(branch => {
                output += '\n' + branch.output("* After Every Branch", startIndent + 1);
            });
        }

        function spaces(indents) {
            var out = '';
            for(var i = 0; i < indents; i++) {
                for (var j = 0; j < Constants.SPACES_PER_INDENT; j++) {
                    out += ' ';
                }
            }
            return out;
        }

        return output;
    }

    /**
     * @return {Boolean} true if the given branch's steps are equal to this brach's steps, false otherwise
     */
     equals(branch) {
         if(this.steps.length != branch.steps.length) {
             return false;
         }

         for(var i = 0; i < this.steps.length; i++) {
             if(getCanonicalStepText(this.steps[i]) != getCanonicalStepText(branch.steps[i])) {
                 return false;
             }
         }

         function getCanonicalStepText(step) {
             var text = step.text.replace(/\s+/g, ' ');
             if(step.identifiers) {
                 step.identifiers.forEach(identifier => {
                     if(identifier != '~' && identifier != '$') {
                         text += ' ' + identifier;
                     }
                 });
             }

             return text;
         }

         return true;
     }
}
module.exports = Branch;
