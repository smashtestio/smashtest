import crypto from 'crypto';
import cloneDeep from 'lodash/cloneDeep.js';
import * as Constants from './constants.js';
import * as utils from './utils.js';

/**
 * Represents a single branch containing steps
 */
class Branch {
    constructor() {
        this.steps = []; // array of Step that are part of this Branch

        /*
        OPTIONAL

        this.nonParallelIds = [];           // When multiple branches cannot be run in parallel (due to !), they are each given the same nonParallelId

        this.frequency = "";                // Frequency of this branch (either 'high', 'med', or 'low')
        this.groups = [];                   // The groups that this branch is a part of

        this.beforeEveryBranch = [];        // Array of Step, the steps to execute before this branch starts
        this.afterEveryBranch = [];         // Array of Step, the steps to execute after this branch is done
        this.beforeEveryStep = [];          // Array of Step, the steps to execute before each step in this branch starts
        this.afterEveryStep = [];           // Array of Step, the steps to execute after each step in this branch is done

        this.isSkipBranch = false;          // If true, a step in this branch has a $s
        this.isOnly = false;                // If true, a step in this branch has a $
        this.isDebug = false;               // If true, a step in this branch has a ~ or ~~

        this.passedLastTime = false;        // If true, do not run this branch, but include it in the report
        this.isPassed = false;              // true if every step in this branch passed after being run
        this.isFailed = false;              // true if at least one step in this branch failed after being run
        this.isSkipped = false;             // true if this branch was skipped after an attempted run
        this.isRunning = false;             // true if this branch is currently running

        this.error = {};                    // If this branch failed, this represents the error that was thrown (only for failure that occurs within the branch but not within a particular step)
        this.log = [];                      // Array of objects that represent the logs of this branch (logs related to the branch but not to a particular step)

        this.elapsed = 0;                   // number of ms it took this step to execute
        this.timeStarted = {};              // Date object (time) of when this branch started being executed
        this.timeEnded = {};                // Date object (time) of when this branch ended execution

        this.hash = "";                     // hash value representing this branch
        */
    }

    /**
     * Pushes the given step to the end of this branch
     * @param {Step} step - The step to push onto the end of this branch
     * @param {Object} stepNodeIndex - An object that maps ids to StepNodes
     */
    push(step, stepNodeIndex) {
        this.steps.push(step);
        this.mergeModifiers(step, stepNodeIndex);
    }

    /**
     * Pushes the given step to the front of this branch
     * @param {Step} step - The step to push onto the end of this branch
     * @param {Object} stepNodeIndex - An object that maps ids to StepNodes
     */
    unshift(step, stepNodeIndex) {
        this.steps.unshift(step);
        this.mergeModifiers(step, stepNodeIndex, true);
    }

    /**
     * Updates modifier-related vars of this branch with the modifiers of the given step
     * @param {Step} step - The step whose modifiers to merge with those of this branch
     * @param {Object} stepNodeIndex - An object that maps ids to StepNodes
     * @param {Boolean} [toFront] - If true, step is being inserted to the front of this branch, false otherwise
     */
    mergeModifiers(step, stepNodeIndex, toFront) {
        const stepNode = stepNodeIndex[step.id];
        const functionDeclarationNode = stepNodeIndex[step.fid] || {};

        if (stepNode.isSkipBranch || functionDeclarationNode.isSkipBranch) {
            this.isSkipBranch = true;
        }
        if (stepNode.isOnly || functionDeclarationNode.isOnly) {
            this.isOnly = true;
        }
        if (stepNode.isDebug || functionDeclarationNode.isDebug) {
            this.isDebug = true;
        }
        if (stepNode.groups || functionDeclarationNode.groups) {
            const incomingGroups = (stepNode.groups || []).concat(functionDeclarationNode.groups || []);
            incomingGroups.forEach((g) => {
                if (Constants.FREQUENCIES.includes(g)) {
                    if (toFront) {
                        if (!this.frequency) {
                            this.frequency = g;
                        }
                    }
                    else {
                        this.frequency = g;
                    }
                }
                else {
                    if (!this.groups) {
                        this.groups = [];
                    }
                    if (!this.groups.includes(g)) {
                        this.groups.push(g);
                    }
                }
            });
        }
    }

    /**
     * @return {Branch} A clone of this branch
     */
    clone() {
        return cloneDeep(this);
    }

    /**
     * Attaches the given branch to the end of this branch
     * @param {Branch} branch - The branch to merge in
     * @return {Branch} This branch
     */
    mergeToEnd(branch) {
        this.steps = this.steps.concat(branch.steps);

        branch.nonParallelIds &&
            (this.nonParallelIds = [].concat(this.nonParallelIds || []).concat(branch.nonParallelIds));
        branch.frequency && (this.frequency = branch.frequency);

        if (branch.groups) {
            if (this.groups === undefined) {
                this.groups = [];
            }

            branch.groups.forEach((group) => {
                this.groups.push(group);
            });
        }

        branch.isSkipBranch && (this.isSkipBranch = true);
        branch.isOnly && (this.isOnly = true);
        branch.isDebug && (this.isDebug = true);

        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const self = this;

        copyHooks('beforeEveryBranch', true); // Copy branch.beforeEveryBranch to the beginning of newBranch.beforeEveryBranch (so that packages comes first)
        copyHooks('afterEveryBranch', false); // Copy branch.afterEveryBranch to the end of newBranch.afterEveryBranch (so that packages comes last)
        copyHooks('beforeEveryStep', true); // Copy branch.beforeEveryStep to the beginning of newBranch.beforeEveryStep (so that packages comes first)
        copyHooks('afterEveryStep', false); // Copy branch.afterEveryStep to the end of newBranch.afterEveryStep (so that packages comes last)

        /**
         * Copies the given hook type from branch to newBranch
         */
        function copyHooks(name, toBeginning) {
            if (Object.prototype.hasOwnProperty.call(branch, name)) {
                if (!Object.prototype.hasOwnProperty.call(self, name)) {
                    self[name] = [];
                }

                if (toBeginning) {
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
     * @param {Function} stepNodeIndex - A object that maps ids to StepNodes
     * @param {Number} [spaces] - Number of spaces before each line, 3 if omitted
     * @return {String} The string representation of this branch
     */
    output(stepNodeIndex, spaces) {
        let beginSpace = '   ';
        if (spaces !== undefined) {
            beginSpace = utils.getIndents(spaces, ' ');
        }

        let str = '';
        this.steps.forEach((s) => {
            const sn = stepNodeIndex[s.id];
            const indentedText = utils.addWhitespaceToEnd(`${utils.getIndents(s.level, 2)}${sn.text || ''}`, 50);

            str += `${beginSpace}${indentedText}   ${s.locString(stepNodeIndex)}\n`;
        });
        return str;
    }

    /**
     * Returns whether or not this branch equals another
     * Does not take hooks into account
     * @param {Branch} branch - The branch we're comparing to this one
     * @param {Function} stepNodeIndex - A object that maps ids to StepNodes
     * @param {Number} [n] - Only compare the first N steps, no limit if omitted
     * @return {Boolean} true if the given branch's steps are equal to this brach's steps, false otherwise
     */
    equals(branch, stepNodeIndex, n) {
        let thisLen = this.steps.length;
        let branchLen = branch.steps.length;
        if (n !== undefined) {
            if (n < thisLen) {
                thisLen = n;
            }
            if (n < branchLen) {
                branchLen = n;
            }
        }

        if (thisLen != branchLen) {
            return false;
        }

        for (let i = 0; i < thisLen; i++) {
            const stepNodeA = stepNodeIndex[this.steps[i].id];
            const stepNodeB = stepNodeIndex[branch.steps[i].id];

            if (getCanonicalStepText(stepNodeA) != getCanonicalStepText(stepNodeB)) {
                return false;
            }

            if (stepNodeA.hasCodeBlock()) {
                if (stepNodeA.codeBlock != stepNodeB.codeBlock) {
                    return false;
                }
            }
            else {
                if (this.steps[i].fid != branch.steps[i].fid) {
                    return false;
                }
            }
        }

        return true;

        function getCanonicalStepText(stepNode) {
            let text = stepNode.text.replace(/\s+/g, ' ');
            if (stepNode.modifiers) {
                stepNode.modifiers.forEach((modifier) => {
                    if (modifier != '~' && modifier != '$' && modifier != '$s') {
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
     * @param {Function} stepNodeIndex - A object that maps ids to StepNodes
     */
    updateHash(stepNodeIndex) {
        let combinedStr = '';
        this.steps.forEach((step) => {
            const stepNode = stepNodeIndex[step.id];
            let codeBlock = '';

            if (stepNode.hasCodeBlock()) {
                codeBlock = stepNode.codeBlock;
            }
            else if (Object.prototype.hasOwnProperty.call(step, 'fid')) {
                const functionDeclarationNode = stepNodeIndex[step.fid];
                if (functionDeclarationNode.hasCodeBlock()) {
                    codeBlock = functionDeclarationNode.codeBlock;
                }
            }

            combinedStr += utils.canonicalize(stepNode.text) + codeBlock + '\n';
        });
        this.hash = crypto.createHash('md5').update(combinedStr).digest('hex');
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
        this.steps.forEach((step) => {
            delete step.isRunning;
        });

        delete this.isRunning;
    }

    /**
     * Marks this branch as passed or failed
     * @param {String} state - 'pass' to pass, 'fail' to fail, 'skip' to skip
     * @param {Error} [error] - The Error object that caused the branch to fail (if an error occurred in a Step, that error should go into that Step, not here)
     * @param {String} [stepDataMode] - Keep data for all steps, steps in failed branches only, or no steps (valid values are 'all', 'fail', and 'none'). If omitted, defaults to 'all'.
     */
    markBranch(state, error, stepDataMode) {
        // Reset state
        delete this.isPassed;
        delete this.isFailed;
        delete this.isSkipped;

        if (state == 'pass') {
            this.isPassed = true;
        }
        else if (state == 'fail') {
            this.isFailed = true;
        }
        else if (state == 'skip') {
            this.isSkipped = true;
        }

        if (error) {
            this.error = utils.serializeError(error);
        }

        if (stepDataMode == 'none') {
            clearDataOfSteps(this);
        }
        else if (stepDataMode == 'fail') {
            if (state != 'fail') {
                clearDataOfSteps(this);
            }
        }

        function clearDataOfSteps(self) {
            for (let i = 0; i < self.steps.length; i++) {
                const step = self.steps[i];

                // Save the properties of step we want to keep
                const id = step.id;
                const fid = step.fid;
                const level = step.level;
                const isFailed = step.isFailed;
                const isSkipped = step.isSkipped;
                const isRunning = step.isRunning;
                let isPassed = undefined;
                if (!self.isPassed) {
                    // omit step.isPassed when the branch passes (it will be implied by the branch passing)
                    isPassed = step.isPassed;
                }

                // Clear out step
                for (const key in step) {
                    delete step[key];
                }

                // Restore properties of step we want to keep
                step.id = id;
                typeof fid != 'undefined' && (step.fid = fid);
                typeof level != 'undefined' && (step.level = level);

                isFailed && (step.isFailed = true);
                isSkipped && (step.isSkipped = true);
                isRunning && (step.isRunning = true);
                isPassed && (step.isPassed = true);
            }
        }
    }

    /**
     * Marks the given step as passed or failed (but does not clear step.isRunning)
     * Passes or fails the branch if step is the last step, or if finishBranchNow is set
     * @param {String} state - 'pass' to pass, 'fail' to fail, 'skip' to skip
     * @param {Step} step - The Step to mark
     * @param {Error} [error] - The Error object thrown during the execution of the step, if any
     * @param {Boolean} [finishBranchNow] - If true, marks the whole branch as passed or failed immediately
     * @param {String} [stepDataMode] - Keep data for all steps, steps in failed branches only, or no steps (valid values are 'all', 'fail', and 'none'). If omitted, defaults to 'all'.
     */
    markStep(state, step, error, finishBranchNow, stepDataMode) {
        // Reset state
        delete step.isPassed;
        delete step.isFailed;
        delete step.isSkipped;

        if (state == 'pass') {
            step.isPassed = true;
        }
        else if (state == 'fail') {
            step.isFailed = true;
        }
        else if (state == 'skip') {
            step.isSkipped = true;
        }

        if (error) {
            step.error = utils.serializeError(error);
        }

        // If this is the very last step in this branch, mark this branch as passed/failed
        if (finishBranchNow || this.steps.indexOf(step) + 1 == this.steps.length) {
            this.finishOffBranch(stepDataMode);
        }
    }

    /**
     * Marks this branch passed if all steps passed, failed if at least one step failed
     * @param {String} [stepDataMode] - Keep data for all steps, steps in failed branches only, or no steps (valid values are 'all', 'fail', and 'none'). If omitted, defaults to 'all'.
     */
    finishOffBranch(stepDataMode) {
        for (let i = 0; i < this.steps.length; i++) {
            const step = this.steps[i];
            if (step.isFailed) {
                this.markBranch('fail', undefined, stepDataMode);
                return;
            }
        }

        this.markBranch('pass', undefined, stepDataMode);
    }

    /**
     * Logs the given item to this Branch
     * @param {Object or String} item - The item to log
     */
    appendToLog(item) {
        if (!this.log) {
            this.log = [];
        }

        if (typeof item == 'string') {
            this.log.push({ text: item });
        }
        else {
            this.log.push(item);
        }
    }

    /**
     * @return {Object} An Object representing this branch, but able to be converted to JSON and only containing the most necessary stuff for a report
     */
    serialize() {
        const o = {
            steps: this.steps.map((step) => step.serialize())
        };

        (this.isPassed || this.passedLastTime) && (o.isPassed = true);

        utils.copyProps(o, this, ['isFailed', 'isSkipped', 'isRunning', 'error', 'log', 'elapsed', 'hash']);

        return o;
    }
}

export default Branch;
