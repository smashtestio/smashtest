const clonedeep = require('lodash/clonedeep');
const md5 = require('md5');
const Constants = require('./constants.js');
const utils = require('./utils.js');

/**
 * Represents a Branch from the test tree
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
     * @return {Branch} A new branch consisting of this branch with the steps and hooks of the given branch attached to the end
     * Copies over the other members, if they exist in branch
     */
    mergeToEnd(branch) {
        let newBranch = this.clone();
        branch = branch.clone();

        newBranch.steps = newBranch.steps.concat(branch.steps);

        branch.nonParallelId && (newBranch.nonParallelId = branch.nonParallelId);
        branch.frequency && (newBranch.frequency = branch.frequency);

        if(branch.groups) {
            if(typeof newBranch.groups == 'undefined') {
                newBranch.groups = [];
            }

            branch.groups.forEach(group => {
                newBranch.groups.push(group);
            });
        }

        branch.isSkipBranch && (newBranch.isSkipBranch = branch.isSkipBranch);
        branch.isOnly && (newBranch.isOnly = branch.isOnly);
        branch.isDebug && (newBranch.isDebug = branch.isDebug);

        copyHooks("beforeEveryBranch", true); // Copy branch.beforeEveryBranch to the beginning of newBranch.beforeEveryBranch (so that packages comes first)
        copyHooks("afterEveryBranch", false); // Copy branch.afterEveryBranch to the end of newBranch.afterEveryBranch (so that packages comes last)
        copyHooks("beforeEveryStep", true); // Copy branch.beforeEveryStep to the beginning of newBranch.beforeEveryStep (so that packages comes first)
        copyHooks("afterEveryStep", false); // Copy branch.afterEveryStep to the end of newBranch.afterEveryStep (so that packages comes last)

        /**
         * Copies the given hook type from branch to newBranch
         */
        function copyHooks(name, toBeginning) {
            if(branch.hasOwnProperty(name)) {
                if(!newBranch.hasOwnProperty(name)) {
                    newBranch[name] = [];
                }

                if(toBeginning) {
                    newBranch[name] = branch[name].concat(newBranch[name]);
                }
                else {
                    newBranch[name] = newBranch[name].concat(branch[name]);
                }
            }
        }

        return newBranch;
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
            if(this.hasOwnProperty(attr) && (['string', 'boolean', 'number'].indexOf(typeof this[attr]) != -1)) {
                clone[attr] = this[attr];
            }
        }

        if(this.groups) {
            clone.groups = [];
            this.groups.forEach(group => {
                clone.groups.push(group);
            });
        }

        cloneHooks("beforeEveryBranch", this);
        cloneHooks("afterEveryBranch", this);
        cloneHooks("beforeEveryStep", this);
        cloneHooks("afterEveryStep", this);

        function cloneHooks(name, self) {
            if(self.hasOwnProperty(name)) {
                clone[name] = [];
                self[name].forEach(step => {
                    clone[name].push(step.cloneForBranch(noRefs));
                });
            }
        }

        if(this.error) {
            clone.error = {};
            Object.assign(clone.error, this.error);
        }

        this.log && (clone.log = clonedeep(this.log));

        this.timeStarted && (clone.timeStarted = new Date(this.timeStarted.getTime()));
        this.timeEnded && (clone.timeEnded = new Date(this.timeEnded.getTime()));

        return clone;
    }

    /**
     * @return {String} The string representation of this branch
     */
    output(branchName, startIndent) {
        if(typeof startIndent == 'undefined') {
            startIndent = 0;
        }

        let output = spaces(startIndent) + branchName + '\n';

        this.steps.forEach(step => {
            output += spaces(step.level + startIndent + 1) + step.text + '\n';
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
     * @return {String} A short string representation of this branch
     */
    quickOutput() {
        let output = '';
        this.steps.forEach(step => {
            output += step.text + ' ';
        });
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

             if(this.steps[i].codeBlock != branch.steps[i].codeBlock) {
                 return false;
             }
         }

         return true;

         function getCanonicalStepText(step) {
             let text = step.text.replace(/\s+/g, ' ');
             if(step.modifiers) {
                 step.modifiers.forEach(modifier => {
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
         if(!this.hash) {
             this.updateHash();
         }
         return hash == this.hash;
     }

     /**
      * Updates the hash of this branch
      */
     updateHash() {
         this.hash = this.getHash();
     }

     /**
      * @return {String} A hash representing this branch
      */
     getHash() {
         let combinedStr = '';
         this.steps.forEach(step => {
             combinedStr += utils.canonicalize(step.text) + '\n';
         })

         return md5(combinedStr);
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
}
module.exports = Branch;
