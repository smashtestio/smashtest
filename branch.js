const clonedeep = require('lodash/clonedeep');
const md5 = require('md5');
const Constants = require('./constants.js');
const utils = require('./utils.js');

/**
 * Represents a single branch containing steps
 */
class Branch {
    constructor(steps) {
        this.steps = [];                    // array of Step that are part of this Branch

        if(steps) {
            steps.forEach(s => this.push(s));
        }

        /*
        OPTIONAL

        this.nonParallelId = "";            // When multiple branches cannot be run in parallel (due to +), they are each given the same nonParallelId

        this.frequency = "";                // Frequency of this branch (either 'high', 'med', or 'low')
        this.groups = [];                   // The groups that this branch is a part of

        this.beforeEveryBranch = [];        // Array of Step, the steps to execute before this branch starts
        this.afterEveryBranch = [];         // Array of Step, the steps to execute after this branch is done
        this.beforeEveryStep = [];          // Array of Step, the steps to execute before each step in this branch starts
        this.afterEveryStep = [];           // Array of Step, the steps to execute after each step in this branch is done

        this.isSkipBranch = false;          // If true, a step in this branch has a $s
        this.isOnly = false;                // If true, a step in this branch has a $
        this.isDebug = false;               // If true, a step in this branch has a ~

        this.passedLastTime = false;        // If true, do not run this branch, but include it in the report
        this.isPassed = false;              // true if every step in this branch passed after being run
        this.isFailed = false;              // true if at least one step in this branch failed after being run
        this.isSkipped = false;             // true if this branch was skipped after an attempted run
        this.isRunning = false;             // true if this branch is currently running

        this.error = {};                    // If this branch failed, this is the Error that was thrown (only for failure that occurs within the branch but not within a particular step)
        this.log = [];                      // Array of objects that represent the logs of this branch (logs related to the branch but not to a particular step)

        this.elapsed = 0;                   // number of ms it took this step to execute
        this.timeStarted = {};              // Date object (time) of when this branch started being executed
        this.timeEnded = {};                // Date object (time) of when this branch ended execution

        this.hash = "";                     // hash value representing this branch
        */
    }

    /**
     * Pushes the given Step to the end of this Branch
     */
    push(step) {
        this.steps.push(step);
        step.isSkipBranch && (this.isSkipBranch = true);
        step.isOnly && (this.isOnly = true);
        step.isDebug && (this.isDebug = true);
    }

    /**
     * Pushes the given Step to the front of this Branch
     */
    unshift(step) {
        this.steps.unshift(step);
        step.isSkipBranch && (this.isSkipBranch = true);
        step.isOnly && (this.isOnly = true);
        step.isDebug && (this.isDebug = true);
    }

    /**
     * @return {Branch} A clone of this branch
     */
    clone() {
        return clonedeep(this);
    }

    /**
     * Attaches the given branch to the end of this branch
     * @param {Branch} branch - The branch to merge in
     * @return {Branch} This branch
     */
    mergeToEnd(branch) {
        this.steps = this.steps.concat(branch.steps);

        branch.nonParallelId && (this.nonParallelId = branch.nonParallelId);
        branch.frequency && (this.frequency = branch.frequency);

        if(branch.groups) {
            if(typeof this.groups == 'undefined') {
                this.groups = [];
            }

            branch.groups.forEach(group => {
                this.groups.push(group);
            });
        }

        branch.isSkipBranch && (this.isSkipBranch = true);
        branch.isOnly && (this.isOnly = true);
        branch.isDebug && (this.isDebug = true);

        let self = this;

        copyHooks("beforeEveryBranch", true); // Copy branch.beforeEveryBranch to the beginning of newBranch.beforeEveryBranch (so that packages comes first)
        copyHooks("afterEveryBranch", false); // Copy branch.afterEveryBranch to the end of newBranch.afterEveryBranch (so that packages comes last)
        copyHooks("beforeEveryStep", true); // Copy branch.beforeEveryStep to the beginning of newBranch.beforeEveryStep (so that packages comes first)
        copyHooks("afterEveryStep", false); // Copy branch.afterEveryStep to the end of newBranch.afterEveryStep (so that packages comes last)

        /**
         * Copies the given hook type from branch to newBranch
         */
        function copyHooks(name, toBeginning) {
            if(branch.hasOwnProperty(name)) {
                if(!self.hasOwnProperty(name)) {
                    self[name] = [];
                }

                if(toBeginning) {
                    self[name] = branch[name].concat(self[name]);
                }
                else {
                    self[name] = self[name].concat(branch[name]);
                }
            }
        }

        return this;
    }

    /**
     * @param {Function} stepNodeLookup - A function that takes in an id and returns the corresponding StepNode
     * @param {String} [branchName] - The name of this branch
     * @param {Number} [startIndent] - How many indents to put before the output, 0 if omitted
     * @return {String} The string representation of this branch
     */
    output(stepNodeLookup, branchName, startIndent) {
        if(typeof startIndent == 'undefined') {
            startIndent = 0;
        }

        let output = spaces(startIndent) + branchName + '\n';

        this.steps.forEach(step => {
            let stepNode = stepNodeLookup(step.id);
            output += spaces(step.level + startIndent + 1) + stepNode.text + '\n';
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
     * @param {Function} stepNodeLookup - A function that takes in an id and returns the corresponding StepNode
     * @return {String} A short string representation of this branch
     */
    quickOutput(stepNodeLookup) {
        let output = '';
        this.steps.forEach(step => {
            let stepNode = stepNodeLookup(step.id);
            output += stepNode.text + ' ';
        });
        return output;
    }

    /**
     * Returns whether or not this branch equals another
     * Does not take hooks into account
     * @param {Branch} branch - The branch we're comparing to this one
     * @param {Function} stepNodeLookup - A function that takes in an id and returns the corresponding StepNode
     * @param {Number} [n] - Only compare the first N steps, no limit if omitted
     * @return {Boolean} true if the given branch's steps are equal to this brach's steps, false otherwise
     */
     equals(branch, stepNodeLookup, n) {
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
             let stepNodeA = stepNodeLookup(this.steps[i].id);
             let stepNodeB = stepNodeLookup(branch.steps[i].id);

             if(getCanonicalStepText(stepNodeA) != getCanonicalStepText(stepNodeB)) {
                 return false;
             }

             if(stepNodeA.hasCodeBlock()) {
                 if(stepNodeA.codeBlock != stepNodeB.codeBlock) {
                     return false;
                 }
             }
             else {
                 if(this.steps[i].functionDeclarationId != branch.steps[i].functionDeclarationId) {
                     return false;
                 }
             }
         }

         return true;

         function getCanonicalStepText(stepNode) {
             let text = stepNode.text.replace(/\s+/g, ' ');
             if(stepNode.modifiers) {
                 stepNode.modifiers.forEach(modifier => {
                     if(modifier != '~' && modifier != '$' && modifier != '$s') {
                         text += ' ' + modifier;
                     }
                 });
             }

             return text;
         }
     }

     /**
      * @return {Boolean} True if the hash matches this branch, false otherwise
      */
     equalsHash(hash) {
         return hash == this.hash;
     }

     /**
      * Updates the hash of this branch
      * @param {Function} stepNodeLookup - A function that takes in an id and returns the corresponding StepNode
      */
     updateHash(stepNodeLookup) {
         let combinedStr = '';
         this.steps.forEach(step => {
             let stepNode = stepNodeLookup(step.id);
             combinedStr += utils.canonicalize(stepNode.text) + '\n';
         });
         this.hash = md5(combinedStr);
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

         delete this.isRunning;
     }

     /**
      * Marks this branch as passed or failed
      */
     markBranch(isPassed, error) {
         if(isPassed) {
             this.isPassed = true;
             delete this.isFailed;
             delete this.isRunning;
             delete this.isSkipped;
         }
         else {
             this.isFailed = true;
             delete this.isPassed;
             delete this.isRunning;
             delete this.isSkipped;
         }

         if(error) {
             this.error = error;
             this.error.msg = error.message.toString();
             this.error.stackTrace = error.stack.toString();
         }
     }

     /**
      * Marks this branch passed if all steps passed, failed if at least one step failed
      */
     finishOffBranch() {
         for(let i = 0; i < this.steps.length; i++) {
             let step = this.steps[i];
             if(step.isFailed) {
                 this.markBranch(false);
                 return;
             }
         }

         this.markBranch(true);
     }

     /**
      * Logs the given item to this Branch
      * @param {Object or String} item - The item to log
      */
     appendToLog(item) {
         if(!this.log) {
             this.log = [];
         }

         if(typeof item == 'string') {
             this.log.push( { text: item } );
         }
         else {
             this.log.push(item);
         }
     }

     /**
      * @return {Object} An Object representing this branch, but able to be converted to JSON and only containing the most necessary stuff for a report
      */
     serializeObj() {
         return utils.removeUndefineds({
             steps: this.steps,

             isPassed: this.isPassed || this.passedLastTime,
             isFailed: this.isFailed,
             isSkipped: this.isSkipped,
             isRunning: this.isRunning,

             error: this.error,
             log: this.log,

             elapsed: this.elapsed,

             hash: this.hash
         });
     }
}
module.exports = Branch;
