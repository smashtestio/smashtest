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

        this.beforeEveryBranch = [];        // Array of Step, the steps to execute before this branch starts
        this.afterEveryBranch = [];         // Array of Step, the steps to execute after this branch is done
        this.beforeEveryStep = [];          // Array of Step, the steps to execute before each step in this branch starts
        this.afterEveryStep = [];           // Array of Step, the steps to execute after each step in this branch is done

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

        this.elapsed = 0;                   // number of ms it took this step to execute
        this.timeStarted = {};              // Date object (time) of when this branch started being executed
        */
    }

    /**
     * Attaches the steps and hooks of the given Branch to the end of this Branch
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

        // Attach branch.beforeEveryBranch to the beginning of this.beforeEveryBranch (so that built-in comes first)
        if(branch.beforeEveryBranch) {
            if(!this.beforeEveryBranch) {
                this.beforeEveryBranch = [];
            }

            this.beforeEveryBranch = branch.beforeEveryBranch.concat(this.beforeEveryBranch);
        }

        // Attach branch.afterEveryBranch to the end of this.afterEveryBranch (so that built-in comes last)
        if(branch.afterEveryBranch) {
            if(!this.afterEveryBranch) {
                this.afterEveryBranch = [];
            }

            this.afterEveryBranch = this.afterEveryBranch.concat(branch.afterEveryBranch);
        }

        // Attach branch.beforeEveryStep to the beginning of this.beforeEveryStep (so that built-in comes first)
        if(branch.beforeEveryStep) {
            if(!this.beforeEveryStep) {
                this.beforeEveryStep = [];
            }

            this.beforeEveryStep = branch.beforeEveryStep.concat(this.beforeEveryStep);
        }

        // Attach branch.afterEveryStep to the end of this.afterEveryStep (so that built-in comes last)
        if(branch.afterEveryStep) {
            if(!this.afterEveryStep) {
                this.afterEveryStep = [];
            }

            this.afterEveryStep = this.afterEveryStep.concat(branch.afterEveryStep);
        }
    }

    /**
     * Clones this branch
     * @param {Boolean} [noRefs] - If true, the clone will contain no references to outside objects (such as Step.originalStepInTree)
     * @return {Branch} Cloned version of this branch
     */
    clone(noRefs) {
        let clone = new Branch();
        this.steps.forEach(step => {
            clone.steps.push(step.cloneForBranch(noRefs));
        });

        // Copy booleans and strings
        for(let attr in this) {
            if(this.hasOwnProperty(attr) && (typeof this[attr] == 'boolean' || typeof this[attr] == 'string')) {
                clone[attr] = this[attr];
            }
        }

        if(this.groups) {
            clone.groups = [];
            this.groups.forEach(group => {
                clone.groups.push(group);
            });
        }

        cloneHookArray("beforeEveryBranch", this);
        cloneHookArray("afterEveryBranch", this);
        cloneHookArray("beforeEveryStep", this);
        cloneHookArray("afterEveryStep", this);

        function cloneHookArray(name, self) {
            if(self[name]) {
                clone[name] = [];
                self[name].forEach(step => {
                    clone[name].push(step.cloneForBranch(noRefs));
                });
            }
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

        let output = spaces(startIndent) + branchName + ' ..\n';

        this.steps.forEach(step => {
            let text = step.text;
            if(!step.isBuiltIn) {
                text += ' -';
            }
            output += spaces(step.branchIndents + startIndent + 1) + text + '\n';
        });

        function spaces(indents) {
            let out = '';
            for(let i = 0; i < indents; i++) {
                for (let j = 0; j < Constants.SPACES_PER_INDENT; j++) {
                    out += ' ';
                }
            }
            return out;
        }

        return output;
    }

    /**
     * Returns whether or not this branch equals another
     * Does not take hooks into account
     * @param {Branch} branch - The branch we're comparing to this one
     * @param {Number} [n] - Only compare the first N steps, no limit if omitted
     * @return {Boolean} true if the given branch's steps are equal to this brach's steps, false otherwise
     */
     equals(branch, n) {
         let thisLen = this.steps.length;
         let branchLen = branch.steps.length;
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

         for(let i = 0; i < thisLen; i++) {
             if(getCanonicalStepText(this.steps[i]) != getCanonicalStepText(branch.steps[i])) {
                 return false;
             }
         }

         function getCanonicalStepText(step) {
             let text = step.text.replace(/\s+/g, ' ');
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

     /**
      * Marks all steps not running
      */
     stop() {
         this.steps.forEach(step => {
            delete step.isRunning;
         });
     }

     /**
      * Marks this branch as passed or failed
      */
     markBranch(isPassed) {
         if(isPassed) {
             this.isPassed = true;
             delete this.isFailed;
             delete this.isSkipped;
             delete this.isRunning;
         }
         else {
             this.isFailed = true;
             delete this.isPassed;
             delete this.isSkipped;
             delete this.isRunning;
         }
     }

     /**
      * Marks this branch passed if all steps passed, failed if at least one step passed or failed not as expected
      */
     finishOffBranch() {
         let badStepExists = false;

         for(let i = 0; i < this.steps.length; i++) {
             let step = this.steps[i];
             if(step.asExpected === false) { // we're looking for false, not undefined
                 badStepExists = true;
                 break;
             }
         }

         if(badStepExists) {
             this.markBranch(false);
         }
         else {
             this.markBranch(true);
         }
     }

     /**
      * Logs the given text to this Branch
      */
     appendToLog(text) {
         if(!this.log) {
             this.log = "";
         }

         this.log += text + "\n";
     }
}
module.exports = Branch;
