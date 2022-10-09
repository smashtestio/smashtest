import chalk from 'chalk';
import { createRequire } from 'node:module';
import path from 'node:path';
import invariant from 'tiny-invariant';
import tsNode from 'ts-node';
import BrowserInstance from '../packages/js/browserinstance.js';
import Branch from './branch.js';
import * as Constants from './constants.js';
import Runner from './runner.js';
import Step from './step.js';
import StepNode from './stepnode.js';
import { isSmashError, SerializedSmashError, SmashError, VarBeingSet } from './types.js';
import * as utils from './utils.js';

const require = createRequire(import.meta.url);

tsNode.register({
    transpileOnly: true,
    compilerOptions: {
        // Make i('esm.js') work from non-module host projects. I don't know why
        // it's not picking it up from tsconfig.json
        allowJs: true
    }
});

const darkGray = chalk.hex('#303030');
const brightGray = chalk.hex('#B6B6B6');

/**
 * Represents a running test instance. Kind of like a "thread".
 */
class RunInstance {
    runner;

    tree; // Tree currently being executed
    currBranch: Branch | null = null; // Branch currently being executed
    currStep: Step | null = null; // Step currently being executed

    isPaused = false; // true if we're currently paused (and we can only pause if there's just one branch in this.tree)
    isStopped = false; // true if we're permanently stopping this RunInstance

    persistent; // persistent variables
    global: { [key: string]: unknown } = {}; // global variables
    local: { [key: string]: unknown } = {}; // local variables

    localStack: { [key: string]: unknown }[] = []; // Array of objects, where each object stores local vars
    localsPassedIntoFunc: { [key: string]: unknown } = {}; // local variables being passed into the function at the current step

    stepsRan = new Branch(); // record of all steps ran by this RunInstance, for inject()

    stepTimeout = 60; // default timeout for steps, in secs
    timer: NodeJS.Timeout | null = null; // timer used to enforce step timeout

    constructor(runner: Runner) {
        this.runner = runner;
        this.tree = this.runner.tree; // Tree currently being executed
        this.persistent = this.runner.persistent; // persistent variables
    }

    /**
     * Grabs branches and steps from this.tree and executes them
     * Exits when there's nothing left to execute, or if a pause or stop occurs
     * @return {Promise} Promise that gets resolved once done executing
     */
    async run() {
        utils.assert(!this.isStopped, 'Cannot run a stopped runner');

        let wasPaused = false;
        let overrideDebug = false;

        if (this.isPaused) {
            this.setPause(false); // resume if we're already paused
            wasPaused = true;
            overrideDebug = true;
        }
        else {
            // we're starting off from scratch (not paused)
            this.currBranch = this.tree.nextBranch();
            this.stepsRan = new Branch();
        }

        while (this.currBranch) {
            if (this.checkForStopped()) {
                return;
            }

            this.currBranch.timeStarted = new Date();

            // Reset variable state
            if (!wasPaused) {
                this.global = {};
                Object.assign(this.global, this.runner.globalInit);
                this.local = {};
                this.localStack = [];
            }

            // Execute Before Every Branch steps, if they didn't run already
            // NOTE: pauses can only happen if there's one branch in total
            if (this.currBranch.beforeEveryBranch && !wasPaused) {
                for (let i = 0; i < this.currBranch.beforeEveryBranch.length; i++) {
                    const step = this.currBranch.beforeEveryBranch[i];

                    await this.runHookStep(step, null, this.currBranch);
                    if (this.checkForStopped()) {
                        return;
                    }
                    else if (this.currBranch.isFailed) {
                        if (this.runner.consoleOutput && this.currBranch.error) {
                            const sn = this.tree.stepNodeIndex[step.id];
                            this.outputError(this.currBranch.error, sn);
                            console.log('');
                        }

                        // runHookStep() already marked the branch as a failure, so now just run all After Every Branch hooks
                        // and advance to the next branch
                        break;
                    }
                }
            }

            if (!this.currBranch.isComplete()) {
                // Move this.currStep to the next not-yet-completed step
                this.toNextReadyStep();

                // Execute steps in the branch
                while (this.currStep) {
                    await this.runStep(this.currStep, this.currBranch, overrideDebug);
                    await utils.breather();

                    overrideDebug = false; // only override a debug on the first step we run after an unpause
                    if (this.checkForPaused() || this.checkForStopped()) {
                        return;
                    }

                    this.toNextReadyStep();
                }
            }

            // Execute After Every Branch steps
            await this.runAfterEveryBranch(this.currBranch);

            this.currBranch = this.tree.nextBranch();
            this.stepsRan = new Branch();
        }
    }

    /**
     * Executes a step, and its corresponding beforeEveryStep and afterEveryStep steps (if a branch is passed in)
     * Sets this.isPaused if the step requires execution to pause
     * Marks the step as passed/failed, sets the step's error and log
     * Resolves immediately if step's debug modifier (~) is set (unless overrideDebug is true as well)
     * @param {Step} step - The Step to execute
     * @param {Branch} branch - The branch that contains the step to execute
     * @param {Boolean} [overrideDebug] - If true, ignores step's step node's debug modifier (prevents getting stuck on a ~ step)
     * @return {Promise} Promise that gets resolved when the step finishes execution
     * @throws {Error} If an error is thrown inside the step and error.fatal is set to true
     */
    async runStep(step: Step, branch: Branch, overrideDebug: boolean) {
        invariant(step.level !== undefined, 'Internal error: step.level is undefined in runStep');
        invariant(step.id !== undefined, 'Internal error: step.id is undefined in runStep');

        const stepNode = this.tree.stepNodeIndex[step.id];

        invariant(stepNode.text !== undefined, 'Internal error: stepNode.text is undefined in runStep');

        if (step.isSkipped) {
            return;
        }

        if (this.tree.getModifier(step, 'isBeforeDebug') && !overrideDebug && !this.tree.isExpressDebug) {
            this.setPause(true);
            return;
        }

        if (this.runner.consoleOutput) {
            console.log(
                `Start:     ${utils.getIndentWhitespace(step.level, 2)}${chalk.gray(
                    stepNode.text.trim() || '(anon)'
                )}     ${stepNode.filename ? chalk.gray(step.locString(this.tree.stepNodeIndex)) : ''}`
            );
        }

        this.stepsRan.steps.push(step);

        // Reset state
        delete step.isPassed;
        delete step.isFailed;
        delete step.isSkipped;
        delete step.error;

        let isPassed = null;
        let finishBranchNow = null;
        let error = null;

        // Execute Before Every Step hooks
        if (branch.beforeEveryStep) {
            for (let i = 0; i < branch.beforeEveryStep.length; i++) {
                const s = branch.beforeEveryStep[i];
                await this.runHookStep(s, step, branch);
                if (this.isStopped) {
                    return;
                }
                else if (step.isFailed) {
                    isPassed = false;
                    break;
                }
            }
        }

        if (isPassed !== false) {
            // A Before Every Step hook didn't fail this step and we didn't stop
            step.timeStarted = new Date();

            // Find the previous step
            let prevStep = null;
            const index = branch.steps.indexOf(step);
            if (index >= 1) {
                prevStep = branch.steps[index - 1];
            }

            // Handle the stack for {{local vars}}
            if (prevStep) {
                invariant(prevStep.id !== undefined, 'prevStep.id must be defined');
                invariant(prevStep.level !== undefined, 'prevStep.level must be defined');

                const prevStepNode = this.tree.stepNodeIndex[prevStep.id];
                const prevStepWasACodeBlockFunc = prevStepNode.isFunctionCall && this.tree.hasCodeBlock(prevStep);

                // Check change of step.level between this step and the previous one, push/pop this.localStack accordingly
                if (step.level > prevStep.level) {
                    // NOTE: when step.level > prevStep.level, step.level is always prevStep.level + 1
                    if (!prevStepWasACodeBlockFunc) {
                        // if previous step was a code block function, the push was already done
                        // Push existing local var context to stack, create fresh local var context
                        this.pushLocalStack();
                    }
                }
                else if (step.level < prevStep.level) {
                    // Pop one local var context for every level decrement
                    const diff = prevStep.level - step.level;
                    for (let i = 0; i < diff; i++) {
                        this.popLocalStack();
                    }

                    if (prevStepWasACodeBlockFunc) {
                        this.popLocalStack(); // on this step we're stepping out of the code block in the previous step
                    }
                }
                else {
                    // step.level == prevStep.level
                    if (prevStepWasACodeBlockFunc) {
                        this.popLocalStack(); // on this step we're stepping out of the code block in the previous step
                    }
                }
            }
            this.localsPassedIntoFunc = {};

            let inCodeBlock = false;

            // Execute the step
            try {
                const varsBeingSet = stepNode.getVarsBeingSet();

                // Passing inputs into function calls
                if (stepNode.isFunctionCall) {
                    invariant(step.fid, 'step.fid must be defined in runStep');

                    const functionDeclarationNode = this.tree.stepNodeIndex[step.fid];

                    // Set {vars} based on function declaration signature and function call signature

                    const varList = functionDeclarationNode.text.match(Constants.VAR);
                    if (varList) {
                        const inputList = stepNode.text.match(Constants.FUNCTION_INPUT);
                        if (inputList) {
                            if (varsBeingSet && varsBeingSet.length > 0) {
                                // step is a {{var}} = Function {{var2}} {{var3}}, so skip the first var
                                inputList.shift();
                            }

                            for (let i = 0; i < varList.length; i++) {
                                const isLocal = varList[i].includes('{{');
                                const varname = utils.stripBrackets(varList[i]);
                                let value = inputList[i];

                                if (value.match(Constants.STRING_LITERAL_WHOLE)) {
                                    // 'string', "string", or [string]
                                    value = utils.stripQuotes(value);
                                    value = this.replaceVars(value); // replace vars with their values
                                }
                                else if (value.match(Constants.VAR_WHOLE)) {
                                    // {var} or {{var}}
                                    const isLocal = value.startsWith('{{');
                                    value = utils.stripBrackets(value);
                                    value = this.findVarValue(value, isLocal);
                                }

                                if (isLocal) {
                                    // local
                                    this.setLocalPassedIn(varname, value);
                                }
                                else {
                                    // global
                                    this.setGlobal(varname, value);
                                }

                                this.appendToLog(
                                    `Function parameter ${varList[i]} is ${this.getLogValue(value)}`,
                                    step
                                );
                            }
                        }
                        // NOTE: else probably unreachable as varList and inputList are supposed to be the same size
                    }
                }

                // Step is {var}='str' [, {var2}='str', etc.]
                if (
                    !stepNode.isFunctionCall &&
                    !this.tree.hasCodeBlock(step) &&
                    varsBeingSet &&
                    varsBeingSet.length > 0
                ) {
                    for (let i = 0; i < varsBeingSet.length; i++) {
                        const varBeingSet = varsBeingSet[i];
                        let value = utils.stripQuotes(varBeingSet.value);
                        value = this.replaceVars(value);
                        this.setVarBeingSet(varBeingSet, value);

                        if (varBeingSet.isLocal) {
                            this.appendToLog(`Setting {{${varBeingSet.name}}} to ${this.getLogValue(value)}`, step);
                        }
                        else {
                            this.appendToLog(`Setting {${varBeingSet.name}} to ${this.getLogValue(value)}`, step);
                        }
                    }
                }

                // Step has a code block to execute
                if (this.tree.hasCodeBlock(step)) {
                    if (stepNode.isFunctionCall) {
                        // Push existing local var context to stack, create fresh local var context
                        this.pushLocalStack();
                    }

                    inCodeBlock = true;
                    const retVal = await this.evalCodeBlock(
                        this.tree.getCodeBlock(step),
                        stepNode.text,
                        this.getFilenameOfCodeBlock(step),
                        this.getLineNumberOffset(step),
                        step
                    );
                    inCodeBlock = false;

                    this.g('prev', retVal);

                    // Step is {var} = Func or Text { code block }
                    // NOTE: When Step is {var} = Func, where Func has children in format {x}='string', we don't need to do anything else
                    if (varsBeingSet && varsBeingSet.length == 1) {
                        // Grab return value from code and assign it to {var}
                        if (varsBeingSet[0].isLocal && stepNode.isFunctionCall) {
                            // {{local var}} = Function, necessitates setting {{local var}} which is already on the localStack
                            this.setLocalOnStack(varsBeingSet[0].name, retVal);
                        }
                        else {
                            this.setVarBeingSet(varsBeingSet[0], retVal);
                        }
                    }

                    // If this RunInstance was stopped, just exit without marking this step (which likely could have failed as the framework was being torn down)
                    if (this.isStopped) {
                        return;
                    }
                }
            }
            catch (err) {
                if (typeof err === 'object' && err && 'fatal' in err && err.fatal) {
                    // if fatal is set, the error will bubble all the way up to the console and end execution
                    throw err;
                }

                if (!this.isStopped) {
                    // if this RunInstance was stopped, just exit without marking this step (which likely could have failed as the framework was being torn down)
                    error = this.validateError(err);

                    error = this.fillErrorFromStep(error, step, inCodeBlock);

                    if (this.runner.outputErrors) {
                        this.outputError(error, stepNode);
                    }
                }
            }

            // Marks the step as passed/failed, sets the step's error and log
            isPassed = !error;
            finishBranchNow = false;
            if (error) {
                finishBranchNow = true;
                if (error.continue || this.runner.pauseOnFail) {
                    // do not finish off the branch if error.continue is set, or if we're doing a pauseOnFail
                    finishBranchNow = false;
                }
            }

            step.timeEnded = new Date();
            step.elapsed = Number(step.timeEnded) - Number(step.timeStarted);

            branch.markStep(isPassed ? 'pass' : 'fail', step, error, finishBranchNow, this.tree.stepDataMode);
        }

        // Execute After Every Step hooks (all of them, regardless if one fails - though a stop will terminate right away)
        if (branch.afterEveryStep) {
            for (let i = 0; i < branch.afterEveryStep.length; i++) {
                const s = branch.afterEveryStep[i];
                await this.runHookStep(s, step, branch);
                if (this.isStopped) {
                    return;
                }
            }
        }

        // Pause if pauseOnFail is set and the step failed
        if (this.runner.pauseOnFail && step.isFailed) {
            this.setPause(true);
        }

        if (this.runner.consoleOutput) {
            const seconds = step.elapsed !== undefined ? step.elapsed / 1000 : 0;

            let chalkToUse = null;
            const isGray = !this.tree.hasCodeBlock(step);
            if (isGray) {
                chalkToUse = brightGray;
            }
            else if (step.isPassed) {
                chalkToUse = chalk.green;
            }
            else {
                chalkToUse = chalk.red;
            }

            console.log(
                `End:       ${utils.getIndentWhitespace(step.level, 2)}` +
                    chalkToUse(stepNode.text.trim() || '(anon)') +
                    '    ' +
                    (!isGray
                        ? (step.isPassed ? chalk.green(' passed') : '') +
                          (step.isFailed ? chalk.red(' failed') : '') +
                          chalk.gray(` (${seconds} s)`)
                        : '')
            );

            if (step.error) {
                this.outputError(step.error, stepNode);
            }

            console.log('');
        }

        if (this.tree.getModifier(step, 'isAfterDebug') && !overrideDebug && !this.tree.isExpressDebug) {
            this.setPause(true);
            return;
        }
    }

    /**
     * Runs the given hook step
     * @param {Step} step - The hook step to run
     * @param {Step} [stepToGetError] - The Step that will get the error and marked failed, if a failure happens here
     * @param {Branch} [branchToGetError] - The Branch that will get the error and marked failed, if a failure happens here. If stepToGetError is also set, only stepToGetError will get the error obj, but branchToGetError will still be failed
     * @return {Boolean} True if the run was a success, false if there was a failure
     */
    async runHookStep(step: Step, stepToGetError: Step | null, branchToGetError: Branch | null) {
        if (step.isSkipped) {
            return;
        }

        const stepNode = this.tree.stepNodeIndex[step.id];
        const codeBlock = this.tree.getCodeBlock(step);

        try {
            await this.evalCodeBlock(
                codeBlock,
                stepNode.text,
                stepNode.filename,
                stepNode.lineNumber,
                stepToGetError || branchToGetError
            );
        }
        catch (err) {
            if (this.isStopped) {
                return true;
            }

            let ex = this.validateError(err);

            ex = this.fillErrorFromStep(ex, step, true);

            if (this.runner.outputErrors) {
                this.outputError(ex, stepNode);
            }

            if (stepToGetError) {
                this.tree.markHookStep('fail', stepToGetError, stepToGetError.error ? undefined : ex); // do not set stepToGetError.error if it's already set

                if (branchToGetError) {
                    branchToGetError.markBranch('fail', undefined, this.tree.stepDataMode);
                }
            }
            else if (branchToGetError) {
                // do not set branchToGetError.error if it's already set
                branchToGetError.markBranch('fail', branchToGetError.error ? undefined : ex, this.tree.stepDataMode);
            }

            return false;
        }

        return true;
    }

    /**
     * Sets the timer for the step timeout
     * @return {Promise} Promise that rejects when the timeout occurs
     */
    setStepTimer() {
        this.clearStepTimer();
        return new Promise(
            (resolve, reject) =>
                (this.timer = setTimeout(
                    () => reject(new Error(`Timeout of ${this.stepTimeout}s exceeded`)),
                    this.stepTimeout * 1000
                ))
        );
    }

    /**
     * Clears the current step timeout
     */
    clearStepTimer() {
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }
    }

    /**
     * Outputs the given error to the console, if allowed
     */
    outputError(error: SerializedSmashError, stepNode: StepNode) {
        const showTrace =
            (!this.tree.isDebug || this.tree.isExpressDebug) && this.stepsRan && this.stepsRan.steps.length > 0;

        this.c(
            (showTrace && this.currBranch ? chalk.gray(`Branch ${this.currBranch.hash}:\n\n`) : '') +
                (showTrace ? chalk.gray(this.stepsRan.output(this.tree.stepNodeIndex, 0)) + '\n' : '') +
                chalk.red.bold(stepNode.text) +
                '\n' +
                this.runner.formatStackTrace(error)
        );
    }

    /**
     * Permanently stops this RunInstance from running
     */
    stop() {
        this.isStopped = true;
        if (this.currBranch) {
            this.currBranch.stop();
        }
    }

    /**
     * Runs one step, then pauses
     * Only call if already paused
     * @return {Promise} Promise that resolves once the execution finishes, resolves to true if the branch is complete (including After Every Branch hooks), false otherwise
     */
    async runOneStep() {
        invariant(this.currBranch, 'this.currBranch must be defined in runOneStep');
        this.toNextReadyStep();
        if (this.currStep) {
            await this.runStep(this.currStep, this.currBranch, true);
            this.toNextReadyStep();
            this.setPause(true);
            return false;
        }
        else {
            // all steps in current branch finished running, finish off the branch
            await this.runAfterEveryBranch(this.currBranch);
            return true;
        }
    }

    /**
     * Skips over the next not-yet-completed step, then pauses
     * Only call if already paused
     * @return {Promise} Promise that resolves once the execution finishes, resolves to true if the branch is complete (including After Every Branch hooks), false otherwise
     */
    async skipOneStep() {
        invariant(this.currBranch, 'Internal error: this.currBranch is undefined');

        if (this.currStep) {
            this.toNextReadyStep(); // move to the next not-yet-completed step

            if (this.currStep) {
                // if we still have a currStep and didn't fall off the end of the branch
                this.currBranch.markStep('skip', this.currStep, undefined, false, this.tree.stepDataMode); // mark the current step as skipped
                this.currStep = this.tree.nextStep(this.currBranch, true, false); // advance to the next step (because we skipped the current one)

                this.setPause(true);
                return false;
            }
            else {
                // all steps in current branch finished running, finish off the branch
                await this.runAfterEveryBranch(this.currBranch);
                return true;
            }
        }
        else {
            // all steps in current branch finished running, finish off the branch
            await this.runAfterEveryBranch(this.currBranch);
            return true;
        }
    }

    /**
     * Reruns the previous step, then pauses again
     * @return {Promise} Promise that resolves once the execution finishes
     */
    async runLastStep() {
        const lastStep = this.getLastStep();
        if (lastStep) {
            invariant(this.currBranch, 'Internal error: this.currBranch is undefined when there is lastStep');
            await this.runStep(lastStep, this.currBranch, true);
        }
    }

    /**
     * @return {Step} The last step run, null if none
     */
    getLastStep() {
        const currStep = this.getNextReadyStep();
        if (currStep) {
            invariant(this.currBranch, 'Internal error: this.currBranch is undefined when there is currStep');
            const index = this.currBranch.steps.indexOf(currStep);
            if (index - 1 < 0) {
                return null;
            }
            else {
                return this.currBranch.steps[index - 1];
            }
        }
        else {
            if (this.currBranch && this.currBranch.isComplete()) {
                return this.currBranch.steps[this.currBranch.steps.length - 1];
            }
            else {
                return null;
            }
        }
    }

    /**
     * Runs the given step text, then pauses again
     * Only call if already paused
     * Stops execution upon the first failure, ignores $ and ~
     * @param {String} text - The step text to run
     * @return {Promise} Promise that gets resolved with a Branch of steps that were run, once done executing
     * @throws {Error} Any errors that may occur during a branchify() of the given step
     */
    async inject(text: string) {
        this.tree.parseIn(text, undefined, undefined, true);
        const keys = Object.keys(this.tree.stepNodeIndex);
        const stepNode = this.tree.stepNodeIndex[keys[keys.length - 1]];

        let branchAbove = this.stepsRan;
        if (!branchAbove || branchAbove.steps.length == 0) {
            // Create a fake, empty step that connects to the tree
            const tempStep = this.tree.newStepNode();
            tempStep.parent = this.tree.root;
            branchAbove = new Branch();
            branchAbove.push(new Step(tempStep.id), this.tree.stepNodeIndex);
        }

        const branchesToRun = this.tree.branchify(stepNode, branchAbove); // branchify so that if step is an already-defined function call, it will work

        invariant(branchesToRun, 'branchesToRun must not be null in RunInstance:inject()');

        const stepsToRun = branchesToRun[0];
        this.stepsRan.mergeToEnd(stepsToRun);

        for (let i = 0; i < stepsToRun.steps.length; i++) {
            const s = stepsToRun.steps[i];
            await this.runStep(s, stepsToRun, true);
            if (s.isFailed) {
                break;
            }
        }

        this.setPause(true);

        return stepsToRun;
    }

    /**
     * @return Value of the given persistent variable (can be undefined)
     */
    getPersistent(varname: string) {
        return this.runner.getPersistent(varname);
    }

    /**
     * @return Value of the given global variable (can be undefined)
     */
    getGlobal(varname: string) {
        return this.global[utils.keepCaseCanonicalize(varname)];
    }

    /**
     * @return Value of the given local variable (can be undefined)
     */
    getLocal(varname: string): unknown {
        varname = utils.keepCaseCanonicalize(varname);
        if (Object.prototype.hasOwnProperty.call(this.localsPassedIntoFunc, varname)) {
            return this.localsPassedIntoFunc[varname];
        }
        else {
            return this.local[varname];
        }
    }

    /**
     * Sets the given persistent variable to the given value
     */
    setPersistent<T>(varname: string, value: T) {
        return this.runner.setPersistent(varname, value);
    }

    /**
     * Sets the given global variable to the given value
     */
    setGlobal<T>(varname: string, value: T) {
        this.global[utils.keepCaseCanonicalize(varname)] = value;
        return value;
    }

    /**
     * Sets the given local variable to the given value
     */
    setLocal<T>(varname: string, value: T) {
        this.local[utils.keepCaseCanonicalize(varname)] = value;
        return value;
    }

    /**
     * Sets a local variable being passed into a function
     */
    setLocalPassedIn<T>(varname: string, value: T) {
        this.localsPassedIntoFunc[utils.keepCaseCanonicalize(varname)] = value;
        return value;
    }

    /**
     * Sets a local variable on the last item in localStack
     */
    setLocalOnStack(varname: string, value?: unknown) {
        const last = this.localStack.at(-1);
        invariant(last, 'last item in localStack is undefined');
        last[utils.keepCaseCanonicalize(varname)] = value;
        return value;
    }

    /**
     * Set/Get a persistent variable
     */
    p<T = BrowserInstance[]>(varname: 'browsers', value?: T): T;
    p<T>(varname: string, value?: T): T;
    p(varname: string, value?: undefined) {
        return this.runner.p(varname, value);
    }

    /**
     * Set/Get a global variable
     */
    g<T>(varname: string, value: T): T;
    g(varname: string, value: undefined): unknown {
        return value !== undefined ? this.setGlobal(varname, value) : this.getGlobal(varname);
    }

    /**
     * Set/Get a local variable
     */
    l<T>(varname: string, value: T): T;
    l(varname: string, value: undefined): unknown {
        return value !== undefined ? this.setLocal(varname, value) : this.getLocal(varname);
    }

    /**
     * @return Current step node, or null if there's no current step
     */
    getCurrStepNode() {
        if (!this.currStep) {
            return null;
        }

        invariant(this.currStep.id !== undefined, 'Internal error: this.currStep.id is undefined in getCurrStepNode');

        return this.tree.stepNodeIndex[this.currStep.id];
    }

    /**
     * Logs the given text
     */
    log(text: string) {
        const stepOrBranch = this.currStep || this.currBranch;
        invariant(stepOrBranch, 'Internal error: this.currStep or this.currBranch must be defined in log');
        this.appendToLog(text, stepOrBranch);
    }

    /**
     * Sets the timeout for all further steps in the branch, in secs
     */
    setStepTimeout(secs: number) {
        this.stepTimeout = secs;
    }

    /**
     * i(varName, packageName, filename) or i(packageName, undefined, filename)
     * Imports (via require() or import()) the given package, sets persistent var varName to the imported object and returns the imported object
     * If a persistent var with that name already exists, this function only returns the value of that var
     * If only a package name is included, the var name is generated from packageName, but camel cased (e.g., one-two-three --> oneTwoThree)
     * The filename is the filename of the step being executed
     */
    i(arg1: string | [string, string?], arg2: string | [string, string?] | undefined, filename?: string): unknown {
        const requireOrImportAndSet = (packageName: string, exportName: string, varName: string) => {
            try {
                const module = require(packageName);
                // See https://2ality.com/2017/01/babel-esm-spec-mode.html#how-does-the-spec-mode-work%3F
                const moduleIsTranspiledEsm = module?.__esModule === true;
                const value = !moduleIsTranspiledEsm || exportName === '*' ? module : module[exportName];
                this.setPersistent(varName, value);
                return value;
            }
            catch (err) {
                if (err instanceof Error && 'code' in err && err.code === 'ERR_REQUIRE_ESM') {
                    return import(packageName).then((module) => {
                        const value = exportName === '*' ? module : module[exportName];
                        this.setPersistent(varName, value);
                        return value;
                    });
                }
                else {
                    // e.code === 'MODULE_NOT_FOUND'
                    throw err;
                }
            }
        };

        const hasVarName = arg2 !== undefined;
        const wrappedPackageName = hasVarName ? arg2 : arg1;
        let packageName = Array.isArray(wrappedPackageName) ? wrappedPackageName[0] : (wrappedPackageName as string); // a little help for TS
        const exportName = Array.isArray(wrappedPackageName) ? wrappedPackageName[1] || 'default' : 'default';
        const varName = hasVarName
            ? (arg1 as string) // a little help for TS
            : packageName
                .replace(/-([a-z])/g, (m: string) => m.toUpperCase()) // camelCasing
                .replace(/-/g, '')
                .replace(/.*\//, ''); // remove path

        if (this.getPersistent(varName)) {
            return this.getPersistent(varName);
        }

        const isPath = packageName.match(/^(\.|\/)/);
        if (packageName.match(/^\.\/|^\.\.\//)) {
            invariant(filename !== undefined, 'Internal error: filename must be defined in i()\'ing a relative path');
            // local file (non-npm package)
            packageName = `${path.dirname(filename)}/${packageName}`;
        }

        try {
            return requireOrImportAndSet(packageName, exportName, varName);
        }
        catch (e) {
            if (!isPath) {
                invariant(filename !== undefined, 'Internal error: filename must be in i()');
                // search for node_modules in every directory up the file's path
                let currPath = path.dirname(filename);
                // eslint-disable-next-line no-constant-condition
                while (true) {
                    try {
                        const packageNameAttempt = path.join(currPath, 'node_modules', packageName);
                        return requireOrImportAndSet(packageNameAttempt, exportName, varName);
                    }
                    catch (e) {
                        if (currPath == path.dirname(currPath)) {
                            // we're at the highest directory, break out of the loop and throw an error
                            throw e;
                        }
                    }

                    currPath = path.dirname(currPath); // go up a directory
                }
            }
            else {
                throw e;
            }
        }
    }

    /**
     * Outputs string s to console.log
     * Inserts empty lines so s is completely clear of the progress bar in the console
     */
    c(s: string) {
        console.log('');
        console.log('');
        console.log(s);
        console.log('');
    }

    /**
     * Evals the given code block
     * @param {String} code - JS code to eval
     * @param {String} [funcName] - The name of the function associated with code
     * @param {String} [filename] - The filename of the file where the function resides
     * @param {Number} [lineNumber] - The line number of the function, used to properly adjust line numbers in stack traces (1 if omitted)
     * @param {Step or Branch} [logHere] - The Object to log to, if any
     * @param {Boolean} [isSync] - If true, the code will be executed synchronously
     * @return {Promise} Promise that gets resolved with what code returns
     */
    evalCodeBlock(
        code: string,
        funcName?: string,
        filename?: string,
        lineNumber = 1,
        logHere?: Step | Branch | null,
        isSync?: boolean
    ) {
        // Functions accessible from a code block
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const runInstance = this; // var so it's accesible in the eval()

        // eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
        function log(text: string) {
            invariant(logHere !== undefined, 'Internal error: logHere must be defined in log()');
            runInstance.appendToLog(text, logHere);
        }

        // eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
        function getPersistent(varname: string) {
            return runInstance.getPersistent(varname);
        }

        // eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
        function getGlobal(varname: string) {
            return runInstance.getGlobal(varname);
        }

        // eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
        function getLocal(varname: string) {
            return runInstance.getLocal(varname);
        }

        // eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
        function setPersistent(varname: string, value: unknown) {
            return runInstance.setPersistent(varname, value);
        }

        // eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
        function setGlobal(varname: string, value: unknown) {
            return runInstance.setGlobal(varname, value);
        }

        // eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
        function setLocal(varname: string, value: unknown) {
            return runInstance.setLocal(varname, value);
        }

        // eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
        function p(varname: string, value: unknown) {
            return runInstance.p(varname, value);
        }

        // eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
        function g(varname: string, value: unknown) {
            return runInstance.g(varname, value);
        }

        // eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
        function l(varname: string, value: unknown) {
            return runInstance.l(varname, value);
        }

        // eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
        function getCurrStepNode() {
            return runInstance.getCurrStepNode();
        }

        // eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
        function i(name1: string | [string, string?], name2?: string | [string, string?]): unknown {
            return runInstance.i(name1, name2, filename);
        }

        // eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
        function dir() {
            // Absolute directory of the file where the currently executing step is
            invariant(filename !== undefined, 'filename must be defined in dir()');
            return path.dirname(filename);
        }

        // eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
        function c(s: string) {
            console.log(''); // outputs empty lines so s is completely clear of the progress bar in the console
            console.log('');
            console.log(s);
            console.log('');
        }

        // eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
        function setStepTimeout(secs: number) {
            runInstance.setStepTimeout(secs);
        }

        // Generate code
        const JS_VARNAME_WHITELIST = /^[A-Za-z_$][A-Za-z0-9_$]*$/;
        const JS_VARNAME_BLACKLIST =
            /^(do|if|in|for|let|new|try|var|case|else|enum|eval|null|this|true|void|with|await|break|catch|class|const|false|super|throw|while|yield|delete|export|import|public|return|static|switch|typeof|default|extends|finally|package|private|continue|debugger|function|arguments|interface|protected|implements|instanceof)$/;

        // Make global, local, and persistent accessible as js vars
        let header = '';
        header = loadIntoJsVars(header, this.persistent, 'getPersistent');
        header = loadIntoJsVars(header, this.global, 'getGlobal');
        header = loadIntoJsVars(header, this.local, 'getLocal');
        header = loadIntoJsVars(header, this.localsPassedIntoFunc, 'getLocal');

        // Remove unsafe chars from funcName
        if (funcName) {
            funcName = funcName.replace(/\s+/g, '_').replace(/[^A-Za-z0-9_]/g, '');
            if (funcName !== '') {
                funcName = '_for_' + funcName;
            }
        }
        else {
            funcName = '';
        }

        // Pad the top of the code with empty comments so as to adjust line numbers in stack traces to match that of the code block's file
        let padding = '';
        for (let i = 1; i < lineNumber; i++) {
            padding += '//\n';
        }

        code =
            padding +
            '(' +
            (isSync ? '' : 'async') +
            ' function CodeBlock' +
            funcName +
            '(runInstance) { ' +
            header +
            '{' +
            code +
            '\n }})(this);'; // all on one line so line numbers in stack traces correspond to line numbers in code blocks, code enclosed in {} so you can declare vars with the same name as vars in header

        // Evaluate
        if (isSync) {
            return eval(code);
        }
        else {
            const timerPromise = this.setStepTimer();

            const mainPromise = new Promise((resolve) => {
                resolve(eval(code));
            });

            return Promise.race([mainPromise, timerPromise]).finally(() => {
                this.clearStepTimer();
            });
        }

        /**
         * Generates js code that converts variables into normal js vars, appends code to header, returns header
         */
        function loadIntoJsVars(
            header: string,
            arr: Record<string, unknown>,
            getter: 'getLocal' | 'getGlobal' | 'getPersistent'
        ) {
            for (let varname in arr) {
                if (Object.prototype.hasOwnProperty.call(arr, varname)) {
                    varname = utils.keepCaseCanonicalize(varname);
                    if (
                        varname.match(JS_VARNAME_WHITELIST) &&
                        !varname.toLowerCase().match(JS_VARNAME_BLACKLIST) &&
                        !varname.includes('\'')
                    ) {
                        header += `var ${varname} = ${getter}('${varname}');`;
                    }
                }
            }

            return header;
        }
    }

    /**
     * @param {String} text - The text whose vars the replace, escaped (i.e., has backslash-n but not the newline char)
     * @param {Boolean} [lookAnywhere] - If true, first checks if a var is already set, and if not, looks down the branch to the first place that var is set. Ignores the presence or absence of : in the variable name.
     * @return {String} text, with vars replaced with their values, with special chars unescaped (i.e., will have a newline char where a backslash-n once was)
     * @throws {Error} If there's a variable inside text that's never set
     */
    replaceVars(text: string, lookAnywhere?: boolean) {
        text = utils.unescape(text);
        const matches = text.match(Constants.VAR);
        if (matches) {
            for (let i = 0; i < matches.length; i++) {
                const match = matches[i];
                const name = utils.stripBrackets(match);
                const isLocal = match.startsWith('{{');
                let value = null;

                try {
                    value = this.findVarValue(name, isLocal, lookAnywhere);
                }
                catch (err) {
                    if (
                        err instanceof Error &&
                        err.name === 'RangeError' &&
                        err.message === 'Maximum call stack size exceeded'
                    ) {
                        utils.error('Infinite loop detected amongst variable references');
                    }
                    else {
                        throw err; // re-throw
                    }
                }

                if (['string', 'boolean', 'number'].indexOf(typeof value) == -1) {
                    utils.error(`The variable ${match} must be set to a string`);
                }

                text = text.replace(match, value);
            }
        }

        return text;
    }

    /**
     * @param {String} varname - The name of the variable, without braces (case insensitive)
     * @param {Boolean} isLocal - True of the variable is local, false if it's global
     * @param {Boolean} [lookAnywhere] - If true, first checks if a var is already set, and if not, looks down the branch to the first place that var is set. Ignores the presence or absence of : in the variable name.
     * @return {String} Value of the given variable at the given step and branch
     * @throws {Error} If the variable is never set
     */
    findVarValue(varname: string, isLocal: boolean, lookAnywhere?: boolean) {
        let variableFull = '';
        let variableFullLookahead = '';
        if (isLocal) {
            variableFull = `{{${varname}}}`;
            variableFullLookahead = `{{${varname}:}}`;
        }
        else {
            variableFull = `{${varname}}`;
            variableFullLookahead = `{${varname}:}`;
        }

        const isLookaheadVar = varname.trim().endsWith(':');
        varname = varname.replace(/:\s*$/, ''); // strip the : off the end

        if (!isLookaheadVar || lookAnywhere) {
            // look to the existing value
            // Return the value of the var immediately
            let value = null;
            if (isLocal) {
                value = this.getLocal(varname);
            }
            else {
                value = this.getGlobal(varname);
            }

            if (value !== undefined) {
                return value;
            }
            else if (!lookAnywhere) {
                // if it's a lookAnywhere, give it another chance in the next if statement below
                // Not found
                utils.error(
                    `The variable ${variableFull} wasn't set, but is needed for this step. If it's set later in the branch, try using ${variableFullLookahead}.`
                );
            }
        }

        // If we got to this point, look down the branch looking for {varname}= or {{varname}}=

        let branch = this.currBranch;
        const step = this.currStep;

        invariant(step, 'step is null');

        if (!branch) {
            branch = new Branch(); // temp branch that's going to be a container for the step
            branch.steps.push(step);
        }

        const index = branch.steps.indexOf(step);
        for (let i = index; i < branch.steps.length; i++) {
            const s = branch.steps[i];
            invariant(s.level !== undefined && step.level !== undefined, 'step levels must be filled in findVarValue');
            if (isLocal && s.level < step.level) {
                break; // you cannot look outside a function's scope for a local var
            }

            invariant(s.id !== undefined, 'step id must be filled in findVarValue');
            const sNode = this.tree.stepNodeIndex[s.id];
            const varsBeingSet = sNode.getVarsBeingSet();
            if (varsBeingSet) {
                for (let j = 0; j < varsBeingSet.length; j++) {
                    const varBeingSet = varsBeingSet[j];
                    if (
                        utils.canonicalize(varBeingSet.name) == utils.canonicalize(varname) &&
                        varBeingSet.isLocal == isLocal
                    ) {
                        let value = null;
                        if (this.tree.hasCodeBlock(s)) {
                            // {varname}=Function (w/ code block)
                            value = this.evalCodeBlock(
                                this.tree.getCodeBlock(s),
                                sNode.text,
                                sNode.filename,
                                sNode.lineNumber,
                                s,
                                true
                            );

                            // Note: {varname}=Function without code block, where another {varname}= is further below, had its varBeingSet removed already
                        }
                        else {
                            // {varname}='string'
                            value = utils.stripQuotes(varBeingSet.value);
                        }

                        if (['string', 'boolean', 'number'].indexOf(typeof value) !== -1) {
                            // only if value is a string, boolean, or number
                            value = this.replaceVars(value, true); // recursive call, start at original step passed in
                        }

                        this.appendToLog(
                            `The value of variable ${variableFull} is being set by a later step at ${sNode.filename}:${sNode.lineNumber}`,
                            step || branch
                        );
                        return value;
                    }
                }
            }
        }

        // Not found
        utils.error(`The variable ${variableFull} is never set, but is needed for this step`);
    }

    /**
     * Logs the given text to logHere
     */
    appendToLog(text: string, logHere: Step | Branch | null) {
        if (logHere && !this.isStopped) {
            logHere.appendToLog(text);
            if (this.runner.consoleOutput && typeof text === 'string') {
                console.log(darkGray(`   ${text}`));
            }
        }
    }

    // ***************************************
    // PRIVATE FUNCTIONS
    // Only use these internally
    // ***************************************

    /**
     * Sets the given variable to the given value
     * @param {Object} varBeingSet - A member of Step.varsBeingSet
     * @param {String} value - The value to set the variable
     */
    setVarBeingSet(varBeingSet: VarBeingSet, value: unknown) {
        if (varBeingSet.isLocal) {
            this.setLocal(varBeingSet.name, value);
        }
        else {
            this.setGlobal(varBeingSet.name, value);
        }
    }

    /**
     * Executes all After Every Branch steps, sequentially, and finishes off the branch
     * @return {Promise} Promise that resolves once all of them finish running
     */
    async runAfterEveryBranch(currBranch: Branch) {
        if (currBranch.afterEveryBranch) {
            for (let i = 0; i < currBranch.afterEveryBranch.length; i++) {
                const step = currBranch.afterEveryBranch[i];
                invariant(this.currBranch !== null, 'currBranch should be defined');
                await this.runHookStep(step, null, this.currBranch);
                if (this.checkForStopped()) {
                    return;
                }
                if (this.runner.consoleOutput && currBranch.error) {
                    invariant(step.id !== undefined, 'step.id is undefined');
                    const stepNode = this.tree.stepNodeIndex[step.id];
                    this.outputError(currBranch.error, stepNode);
                    console.log('');
                }
                // finish running all After Every Branch steps, even if one fails, and even if there was a pause
            }
        }

        currBranch.timeEnded = new Date();
        if (currBranch.elapsed !== -1) {
            // measure elapsed only if this RunInstance has never been paused
            currBranch.elapsed = Number(currBranch.timeEnded) - Number(currBranch.timeStarted);
        }

        if (this.runner.consoleOutput) {
            console.log('Branch complete');
            console.log('');
        }

        delete currBranch.isRunning;
    }

    /**
     * Moves this.currStep to the next not-yet-completed step, or to null if there are no more steps left in the branch
     */
    toNextReadyStep() {
        const nextReadyStep = this.getNextReadyStep();
        if (!nextReadyStep || this.currStep !== nextReadyStep) {
            this.currStep = this.tree.nextStep(this.currBranch, true, true);
        }
    }

    /**
     * @return {Step} The next not-yet-completed step, or null if the current branch is done
     */
    getNextReadyStep() {
        if (!this.currBranch || this.currBranch.isComplete()) {
            // branch completed
            return null;
        }
        else if (!this.currStep) {
            // we're at the start of the branch
            return this.tree.nextStep(this.currBranch);
        }
        else if (this.currStep.isComplete()) {
            return this.tree.nextStep(this.currBranch);
        }
        else {
            // this.currStep is not complete
            return this.currStep;
        }
    }

    /**
     * Push existing local var context to stack, create fresh local var context
     */
    pushLocalStack() {
        this.localStack.push(this.local);
        this.local = {};
        Object.assign(this.local, this.localsPassedIntoFunc); // merge localsPassedIntoFunc into local
        this.localsPassedIntoFunc = {};
    }

    /**
     * Pop one local var context
     */
    popLocalStack() {
        const ctx = this.localStack.pop();
        invariant(ctx, 'ctx should be defined in popLocalStack()');
        this.local = ctx;
    }

    /**
     * Takes an Error caught from the execution of a step and adds filename and lineNumber parameters to it
     */
    fillErrorFromStep(error: SmashError, step: Step, inCodeBlock: boolean) {
        invariant(step.id !== undefined, 'step.id is undefined');
        const stepNode = this.tree.stepNodeIndex[step.id];

        error.filename = stepNode.filename;
        error.lineNumber = stepNode.lineNumber;

        // If error occurred in a function's code block, we should reference the function declaration's line, not the function call's line
        // (except for hooks and packaged code blocks)
        if (
            stepNode.isFunctionCall &&
            inCodeBlock &&
            !this.tree.getModifier(step, 'isHook') &&
            !this.tree.getModifier(step, 'isPackaged')
        ) {
            invariant(step.fid !== undefined, 'step.fid must not be undefined when stepNode.isFunctionCall');
            const functionDeclarationNode = this.tree.stepNodeIndex[step.fid];
            error.filename = functionDeclarationNode.filename;
            error.lineNumber = functionDeclarationNode.lineNumber;
        }

        // If error occurred in a code block, set the lineNumber to be that from the stack trace rather than the first line of the code block
        if (inCodeBlock && !this.tree.getModifier(step, 'isPackaged')) {
            invariant(error.stack, 'Internal error: thrown error doesn\'t have a stack trace');

            let matches = error.stack.toString().match(/at CodeBlock[^\n]+<anonymous>:[0-9]+/g);
            if (matches) {
                matches = matches[0].match(/([0-9]+)$/g);
                if (matches) {
                    error.lineNumber = parseInt(matches[0]);
                }
            }
        }

        return error;
    }

    /**
     * If error is a valid object, returns it, otherwise returns an Error that says error is invalid
     */
    validateError(error: unknown): SmashError {
        if (!isSmashError(error)) {
            return new Error('A non-object was thrown inside this step. Only Error objects can be thrown.');
        }
        else {
            return error;
        }
    }

    /**
     * @return {Number} The line number offset for evalCodeBlock(), based on the given step
     */
    getLineNumberOffset(step: Step) {
        invariant(step.id !== undefined, 'step.id is undefined in getLineNumberOffset');
        const stepNode = this.tree.stepNodeIndex[step.id];
        if (stepNode.isFunctionCall && !this.tree.getModifier(step, 'isHook')) {
            invariant(step.fid !== undefined, 'step.fid must not be undefined when stepNode.isFunctionCall is true');
            const functionDeclarationNode = this.tree.stepNodeIndex[step.fid];
            return functionDeclarationNode.lineNumber;
        }
        else {
            return stepNode.lineNumber;
        }
    }

    /**
     * @return {String} The filename of the given step's code block
     */
    getFilenameOfCodeBlock(step: Step) {
        invariant(step.id !== undefined, 'step.id is undefined in getFilenameOfCodeBlock');

        const stepNode = this.tree.stepNodeIndex[step.id];
        if (stepNode.hasCodeBlock()) {
            return stepNode.filename;
        }
        else {
            invariant(step.fid !== undefined, 'step.fid is undefined in getFilenameOfCodeBlock');
            const functionDeclarationNode = this.tree.stepNodeIndex[step.fid];
            return functionDeclarationNode.filename;
        }
    }

    /**
     * @return {Boolean} True if the RunInstance is currently paused, false otherwise. Also sets the current branch's elapsed.
     */
    checkForPaused() {
        invariant(this.currBranch, 'Internal error: checkForPaused() called when no branch is running');

        if (this.isPaused) {
            this.currBranch.elapsed = -1;
            return true;
        }

        return false;
    }

    /**
     * @return {Boolean} True if the RunInstance is currently stopped, false otherwise. Also sets the current branch's elapsed.
     */
    checkForStopped() {
        invariant(this.currBranch, 'Internal error: checkForStopped() called when no branch is running');

        if (this.isStopped) {
            this.currBranch.timeEnded = new Date();
            this.currBranch.elapsed = Number(this.currBranch.timeEnded) - Number(this.currBranch.timeStarted);
            return true;
        }

        return false;
    }

    /**
     * Sets the pause state of this RunInstance and its Runner
     */
    setPause(isPaused: boolean) {
        this.isPaused = isPaused;
        this.runner.isPaused = isPaused;
    }

    /**
     * @return value, only with quotes attached if it's a string
     */
    getLogValue(value: unknown) {
        if (typeof value === 'string') {
            return `\`${value}\``;
        }
        else {
            return value;
        }
    }
}

export default RunInstance;
