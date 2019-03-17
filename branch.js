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

        this.afterEveryBranch = [];         // Array of Branch, the branches to execute after this branch is done
        this.afterEveryStep = [];           // Array of Branch, the branches to execute after each step in this branch is done

        this.isOnly = false;                // If true, a Step in this Branch has a $
        this.isDebug = false;               // If true, a Step in this Branch has a ~
        this.isBuiltIn = false;             // If true, this is a built-in hook

        this.passedLastTime = false;        // if true, do not run this branch, but include it in the report
        this.isPassed = false;              // true if every step in this branch passed after being run
        this.isFailed = false;              // true if at least one step in this branch failed after being run
        this.isSkipped = false;             // true if this branch was skipped after an attempted run
        this.isRunning = false;             // true if this branch is currently running

        this.error = {};                    // if this branch failed, this is the Error that was thrown (only for failure that occurs within the branch but not within a particular step)
        this.log = "";                      // string of logs related to this branch (logs related to the branch but not to a particular step)
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

        // Copy booleans and strings
        for(var attr in this) {
            if(this.hasOwnProperty(attr) && (typeof this[attr] == 'boolean' || typeof this[attr] == 'string')) {
                clone[attr] = this[attr];
            }
        }

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
                if(!branch.isBuiltIn) {
                    output += '\n' + branch.output("* Before Every Branch", startIndent + 1);
                }
            });
        }

        if(this.afterEveryBranch) {
            this.afterEveryBranch.forEach(branch => {
                if(!branch.isBuiltIn) {
                    output += '\n' + branch.output("* After Every Branch", startIndent + 1);
                }
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
     * Returns whether or not this branch equals another
     * @param {Branch} branch - The branch we're comparing to this one
     * @param {Number} [n] - Only compare the first N steps, no limit if omitted
     * @return {Boolean} true if the given branch's steps are equal to this brach's steps, false otherwise
     */
     equals(branch, n) {
         var thisLen = this.steps.length;
         var branchLen = branch.steps.length;
         if(typeof n != 'undefined') {
             if(n < thisLen) {
                 thisLen = n;
             }
             if(n < branchLen) {
                 branchLen = n;
             }
         }

         if(thisLen != branchLen) {
             return false;
         }

         for(var i = 0; i < thisLen; i++) {
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

     /**
      * @return {Boolean} True if this branch completed already
      */
     isComplete() {
         return this.isPassed || this.isFailed || this.isSkipped || this.passedLastTime;
     }

     /**
      * @return {Boolean} True if this branch completed already or is still running
      */
     isCompleteOrRunning() {
         return this.isRunning || this.isComplete();
     }
}
module.exports = Branch;
