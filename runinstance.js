const Constants = require('./constants.js');
const Branch = require('./branch.js');
const utils = require('./utils.js');

/**
 * Represents a running test instance. Kind of like a "thread".
 */
class RunInstance {
    constructor(runner) {
        this.runner = runner;

        this.tree = this.runner.tree;                   // Tree currently being executed
        this.currBranch = null;                         // Branch currently being executed
        this.currStep = null;                           // Step currently being executed

        this.isPaused = false;                          // true if we're currently paused (and we can only pause if there's just one branch in this.tree)
        this.isStopped = false;                         // true if we're permanently stopping this RunInstance

        this.persistent = this.runner.persistent;       // persistent variables
        this.global = {};                               // global variables
        this.local = {};                                // local variables

        this.localStack = [];                           // Array of objects, where each object stores local vars
        this.localsPassedIntoFunc = {};                 // local variables being passed into the function at the current step
    }

    /**
     * Grabs branches and steps from this.tree and executes them
     * Exits when there's nothing left to execute, or if a pause or stop occurs
     * @return {Promise} Promise that gets resolved once done executing
     */
    async run() {
        if(this.isStopped) {
            utils.error("Cannot run a stopped runner");
        }

        let wasPaused = false;
        let overrideDebug = false;
        if(this.isPaused) {
            this.isPaused = false; // resume if we're already paused
            wasPaused = true;
            overrideDebug = true;
        }
        else { // we're starting off from scratch (not paused)
            this.currBranch = this.tree.nextBranch();
        }

        while(this.currBranch) {
            if(this.checkForStopped()) {
                return;
            }

            this.currBranch.timeStarted = new Date();

            // Execute Before Every Branch steps, if they didn't run already
            // NOTE: pauses can only happen if there's one branch in total
            if(this.currBranch.beforeEveryBranch && !wasPaused) {
                let continueToNextBranch = false;
                for(let i = 0; i < this.currBranch.beforeEveryBranch.length; i++) {
                    let s = this.currBranch.beforeEveryBranch[i];

                    await this.runHookStep(s, null, this.currBranch);
                    if(this.checkForStopped()) {
                        return;
                    }
                    else if(this.currBranch.isFailed) {
                        // runHookStep() already marked the branch as a failure, so now just run all
                        // After Every Branch hooks and advance to the next branch
                        await this.runAfterEveryBranch();

                        if(this.currBranch.elapsed != -1) { // measure elapsed only if this RunInstance has never been paused
                            this.currBranch.elapsed = new Date() - this.currBranch.timeStarted;
                        }
                        // NOTE: else is probably unreachable because a branch auto-completes as failed if a Before Every Branch error occurs (and pauses are only allowed when there 1 branch)

                        this.currBranch = this.tree.nextBranch();

                        continueToNextBranch = true;
                        break;
                    }
                }

                if(continueToNextBranch) {
                    continue;
                }
            }

            // Move this.currStep to the next not-yet-completed step
            this.nextStep();

            // Execute steps in the branch
            while(this.currStep) {
                await this.runStep(this.currStep, this.currBranch, overrideDebug);
                overrideDebug = false; // only override a debug on the first step we run after an unpause
                if(this.checkForPaused() || this.checkForStopped()) {
                    return;
                }

                this.nextStep();
            }

            // Execute After Every Branch steps
            await this.runAfterEveryBranch();

            // clear variable state
            this.global = {};
            this.local = {};
            this.localStack = [];

            if(this.currBranch.elapsed != -1) { // measure elapsed only if this RunInstance has never been paused
                this.currBranch.elapsed = new Date() - this.currBranch.timeStarted;
            }

            this.currBranch = this.tree.nextBranch();
        }
    }

    /**
     * Executes a step, and its corresponding beforeEveryStep and afterEveryStep steps (if a branch is passed in)
     * Sets this.isPaused if the step requires execution to pause
     * Marks the step as passed/failed and expected/unexpected, sets the step's error and log
     * Resolves immediately if step.isDebug is true (unless overrideDebug is true as well)
     * @param {Step} step - The Step to execute
     * @param {Branch} branch - The branch that contains the step to execute
     * @param {Boolean} [overrideDebug] - If true, ignores step.isDebug (prevents getting stuck on a ~ step)
     * @return {Promise} Promise that gets resolved when the step finishes execution
     */
    async runStep(step, branch, overrideDebug) {
        if(step.isDebug && !overrideDebug) {
            this.isPaused = true;
            return;
        }

        step.timeStarted = new Date();

        // Execute Before Every Step hooks
        if(branch.beforeEveryStep) {
            for(let i = 0; i < branch.beforeEveryStep.length; i++) {
                let s = branch.beforeEveryStep[i];
                await this.runHookStep(s, step, branch);
                if(this.isStopped) {
                    return;
                }
                else if(step.isFailed) {
                    break;
                }
            }
        }

        if(!step.isFailed) { // A Before Every Step hook did not fail the step and we did not stop
            // Find the previous step
            let prevStep = null;
            let index = branch.steps.indexOf(step);
            if(index >= 1) {
                prevStep = branch.steps[index - 1];
            }

            // Handle the stack for {{local vars}}
            if(prevStep) {
                let prevStepWasACodeBlockFunc = prevStep.isFunctionCall && typeof prevStep.codeBlock != 'undefined';

                // Check change of step.branchIndents between this step and the previous one, push/pop this.localStack accordingly
                if(step.branchIndents > prevStep.branchIndents) { // NOTE: when step.branchIndents > prevStep.branchIndents, step.branchIndents is always prevStep.branchIndents + 1
                    if(!prevStepWasACodeBlockFunc) { // if previous step was a code block function, the push was already done
                        // Push existing local let context to stack, create fresh local let context
                        this.pushLocalStack();
                    }
                }
                else if(step.branchIndents < prevStep.branchIndents) {
                    // Pop one local let context for every branchIndents decrement
                    let diff = prevStep.branchIndents - step.branchIndents;
                    for(let i = 0; i < diff; i++) {
                        this.popLocalStack();
                    }
                }
                else { // step.branchIndents == prevStep.branchIndents
                    if(prevStepWasACodeBlockFunc) {
                        this.popLocalStack(); // on this step we're stepping out of the code block in the previous step
                    }
                }
            }
            this.localsPassedIntoFunc = {};

            let error = undefined;
            let inCodeBlock = false;

            // Execute the step
            try {
                // Passing inputs into function calls
                if(step.isFunctionCall) {
                    // Set {{local vars}} based on function declaration signature and function call signature

                    let varList = step.functionDeclarationText.match(Constants.VAR);
                    if(varList) {
                        let inputList = step.text.match(Constants.FUNCTION_INPUT);
                        if(inputList) {
                            if(step.varsBeingSet && step.varsBeingSet.length > 0) {
                                // step is a {{var}} = Function {{var2}} {{var3}}, so skip the first var
                                inputList.shift();
                            }

                            for(let i = 0; i < varList.length; i++) {
                                let varname = utils.stripBrackets(varList[i]);
                                let value = inputList[i];

                                if(value.match(Constants.STRING_LITERAL_WHOLE)) { // 'string', "string", or [string]
                                    value = utils.stripQuotes(value);
                                    value = this.replaceVars(value, step, branch); // replace vars with their values
                                    value = utils.unescape(value);
                                }
                                else if(value.match(Constants.VAR_WHOLE)) { // {var} or {{var}}
                                    let isLocal = value.startsWith('{{');
                                    value = utils.stripBrackets(value);
                                    value = this.findVarValue(value, isLocal, step, branch);
                                }

                                this.setLocalPassedIn(varname, value);
                            }
                        }
                        // NOTE: else probably unreachable as varList and inputList are supposed to be the same size
                    }
                }

                // Step is {var}='str' [, {var2}='str', etc.]
                if(!step.isFunctionCall && typeof step.codeBlock == 'undefined' && step.varsBeingSet && step.varsBeingSet.length > 0) {
                    for(let i = 0; i < step.varsBeingSet.length; i++) {
                        let varBeingSet = step.varsBeingSet[i];
                        let value = utils.stripQuotes(varBeingSet.value);
                        value = this.replaceVars(value, step, branch);
                        this.setVarBeingSet(varBeingSet, value);
                    }
                }

                // Step has a code block to execute
                if(typeof step.codeBlock != 'undefined') {
                    if(step.isFunctionCall) {
                        // Push existing local let context to stack, create fresh local let context
                        this.pushLocalStack();
                    }

                    let retVal = null;
                    inCodeBlock = true;
                    if(utils.canonicalize(step.text) == "execute in browser") {
                        retVal = await this.execInBrowser(step.codeBlock); // this function will be injected into RunInstance by a function in a packaged Before Everything hook
                    }
                    else {
                        retVal = await this.evalCodeBlock(step.codeBlock, step.text, this.getLineNumberOffset(step), step);
                    }
                    inCodeBlock = false;

                    // Step is {var} = Func or Text { code block }
                    // NOTE: When Step is {var} = Func, where Func has children in format {x}='string', we don't need to do anything else
                    if(step.varsBeingSet && step.varsBeingSet.length == 1) {
                        // Grab return value from code and assign it to {var}
                        this.setVarBeingSet(step.varsBeingSet[0], retVal);
                    }

                    // If this RunInstance was stopped, just exit without marking this step (which likely could have failed as the framework was being torn down)
                    if(this.isStopped) {
                        return;
                    }
                }
            }
            catch(e) {
                if(!this.isStopped) { // if this RunInstance was stopped, just exit without marking this step (which likely could have failed as the framework was being torn down)
                    error = e;
                    this.fillErrorFromStep(error, step, inCodeBlock);
                }
            }

            // Marks the step as passed/failed and expected/unexpected, sets the step's asExpected, error, and log
            let isPassed = !error;
            if(step.isExpectedFail && isPassed) {
                error = new Error("This step passed, but it was expected to fail (#)");
                error.filename = step.filename;
                error.lineNumber = step.lineNumber;
            }

            let finishBranchNow = false;
            if(!isPassed) {
                finishBranchNow = true;
                if(error.continue || this.runner.pauseOnFail) { // do not finish off the branch if error.continue is set, or if we're doing a pauseOnFail
                    finishBranchNow = false;
                }
            }

            this.tree.markStep(step, branch, isPassed, !!step.isExpectedFail == !isPassed, error, finishBranchNow, true);
        }

        // Execute After Every Step hooks (all of them, regardless if one fails - though a stop will terminate right away)
        if(branch.afterEveryStep) {
            for(let i = 0; i < branch.afterEveryStep.length; i++) {
                let s = branch.afterEveryStep[i];
                await this.runHookStep(s, step, branch);
                if(this.isStopped) {
                    return;
                }
            }
        }

        // Pause if pauseOnFail is set and the step failed or is unexpected
        if(this.runner.pauseOnFail && (!step.isPassed || !step.asExpected)) {
            this.isPaused = true;
        }

        step.elapsed = new Date() - step.timeStarted;
    }

    /**
     * Runs the given hook step
     * @param {Step} step - The hook step to run
     * @param {Step} [stepToGetError] - The Step that will get the error and marked failed, if a failure happens here
     * @param {Branch} [branchToGetError] - The Branch that will get the error and marked failed, if a failure happens here. If stepToGetError is also set, only stepToGetError will get the error obj, but branchToGetError will still be failed
     * @return {Boolean} True if the run was a success, false if there was a failure
     */
    async runHookStep(step, stepToGetError, branchToGetError) {
        try {
            await this.evalCodeBlock(step.codeBlock, step.text, step.lineNumber, stepToGetError || branchToGetError);
        }
        catch(e) {
            this.fillErrorFromStep(e, step, true);

            if(stepToGetError) {
                this.tree.markStep(stepToGetError, null, false, false, stepToGetError.error ? undefined : e); // do not set stepToGetError.error if it's already set

                if(branchToGetError) {
                    branchToGetError.markBranch(false);
                }
            }
            else if(branchToGetError) {
                if(!branchToGetError.error) { // do not set branchToGetError.error if it's already set
                    branchToGetError.error = e;
                }
                branchToGetError.markBranch(false);
            }

            return false;
        }

        return true;
    }

    /**
     * Permanently stops this RunInstance from running
     * Not immediate - just marks the branches as stopped
     * run() and runStep() will eventually notice that a stop occurred and will exit itself
     */
    stop() {
        this.isStopped = true;
        if(this.currBranch) {
            this.currBranch.stop();
        }
    }

    /**
     * Runs one step, then pauses
     * Only call if already paused
     * @return {Promise} Promise that resolves once the execution finishes, resolves to true if the branch is complete (including After Every Branch hooks), false otherwise
     */
    async runOneStep() {
        this.nextStep();
        if(this.currStep) {
            await this.runStep(this.currStep, this.currBranch, true);
            this.isPaused = true;
            return false;
        }
        else { // all steps in current branch finished running, finish off the branch
            await this.runAfterEveryBranch();
            return true;
        }
    }

    /**
     * Skips over the next not-yet-completed step, then pauses
     * Only call if already paused
     * @return {Promise} Promise that resolves once the execution finishes, resolves to true if the branch is complete (including After Every Branch hooks), false otherwise
     */
    async skipOneStep() {
        if(this.currStep) {
            this.nextStep(); // move to the next not-yet-completed step

            if(this.currStep) { // if we still have a currStep and didn't fall off the end of the branch
                this.tree.markStepSkipped(this.currStep, this.currBranch); // mark the current step as skipped
                this.currStep = this.tree.nextStep(this.currBranch, true, false); // advance to the next step (because we skipped the current one)

                this.isPaused = true;
                return false;
            }
            else { // all steps in current branch finished running, finish off the branch
                await this.runAfterEveryBranch();
                return true;
            }
        }
        else { // all steps in current branch finished running, finish off the branch
            await this.runAfterEveryBranch();
            return true;
        }
    }

    /**
     * Runs the given step, then pauses again
     * Only call if already paused
     * Stops execution upon the first failure, ignores # and ~
     * @param {Step} step - The step to run
     * @return {Promise} Promise that gets resolved with a Branch of steps that were run, once done executing
     * @throws {Error} Any errors that may occur during a branchify() of the given step
     */
    async injectStep(step) {
        if(step.isFunctionDeclaration) {
            utils.error("Cannot define a * Function Declaration here");
        }

        // Fill stepsAbove to be all the Steps above the current step
        let stepsAbove = [];
        if(this.currBranch && this.currStep) {
            stepsAbove = this.currBranch.steps.slice(0, this.currBranch.steps.indexOf(this.currStep) + 1);
        }

        let branchesToRun = this.tree.branchify(step, undefined, undefined, undefined, stepsAbove); // branchify so that if step is an already-defined function call, it will work
        let stepsToRun = branchesToRun[0];

        for(let i = 0; i < stepsToRun.steps.length; i++) {
            let s = stepsToRun.steps[i];
            await this.runStep(s, stepsToRun, true);
            if(s.isFailed) {
                break;
            }
        }

        this.isPaused = true;

        return stepsToRun;
    }

    /**
     * @return Value of the given persistent variable (can be undefined)
     */
    getPersistent(varname) {
        return this.persistent[utils.canonicalize(varname)];
    }

    /**
     * @return Value of the given global variable (can be undefined)
     */
    getGlobal(varname) {
        return this.global[utils.canonicalize(varname)];
    }

    /**
     * @return Value of the given local variable (can be undefined)
     */
    getLocal(varname) {
        varname = utils.canonicalize(varname);
        if(this.localsPassedIntoFunc.hasOwnProperty(varname)) {
            return this.localsPassedIntoFunc[varname];
        }
        else {
            return this.local[varname];
        }
    }

    /**
     * Sets the given persistent variable to the given value
     */
    setPersistent(varname, value) {
        this.persistent[utils.canonicalize(varname)] = value;
        this.persistent[utils.keepCaseCanonicalize(varname)] = value; // used to keep track of original casing so we create a js var in this casing for code blocks (getters will never reach this)
    }

    /**
     * Sets the given global variable to the given value
     */
    setGlobal(varname, value) {
        this.global[utils.canonicalize(varname)] = value;
        this.global[utils.keepCaseCanonicalize(varname)] = value; // used to keep track of original casing so we create a js var in this casing for code blocks (getters will never reach this)
    }

    /**
     * Sets the given local variable to the given value
     */
    setLocal(varname, value) {
        this.local[utils.canonicalize(varname)] = value;
        this.local[utils.keepCaseCanonicalize(varname)] = value; // used to keep track of original casing so we create a js var in this casing for code blocks (getters will never reach this)
    }

    /**
     * Sets a local variable being passed into a function
     */
    setLocalPassedIn(varname, value) {
        this.localsPassedIntoFunc[utils.canonicalize(varname)] = value;
        this.localsPassedIntoFunc[utils.keepCaseCanonicalize(varname)] = value; // used to keep track of original casing so we create a js var in this casing for code blocks (getters will never reach this)
    }

    /**
     * Evals the given code block
     * @param {String} code - JS code to eval
     * @param {String} [funcName] - The name of the function associated with code
     * @param {Number} [lineNumber] - The line number of the function, used to properly adjust line numbers in stack traces (1 if omitted)
     * @param {Step or Branch} [logHere] - The Object to log to, if any
     * @param {Boolean} [isSync] - If true, the code will be executed synchronously
     * @return {Promise} Promise that gets resolved with what code returns
     */
    evalCodeBlock(code, funcName, lineNumber, logHere, isSync) {
        if(typeof lineNumber == 'undefined') {
            lineNumber = 1;
        }

        // Functions accessible from a code block
        var runInstance = this; // var so it's accesible in the eval()

        function log(text) {
            runInstance.appendToLog(text, logHere);
        }

        function getPersistent(varname) {
            return runInstance.persistent[utils.canonicalize(varname)];
        }

        function getGlobal(varname) {
            return runInstance.global[utils.canonicalize(varname)];
        }

        function getLocal(varname) {
            varname = utils.canonicalize(varname);
            if(runInstance.localsPassedIntoFunc.hasOwnProperty(varname)) {
                return runInstance.localsPassedIntoFunc[varname]; // probably unreachable from within a code block
            }
            else {
                return runInstance.local[varname];
            }
        }

        function setPersistent(varname, value) {
            runInstance.persistent[utils.canonicalize(varname)] = value;
        }

        function setGlobal(varname, value) {
            runInstance.global[utils.canonicalize(varname)] = value;
        }

        function setLocal(varname, value) {
            runInstance.local[utils.canonicalize(varname)] = value;
        }

        // Generate code
        const JS_VARNAME_WHITELIST = /^[A-Za-z\_\$][A-Za-z0-9\_\$]*$/;
        const JS_VARNAME_BLACKLIST = /^(do|if|in|for|let|new|try|var|case|else|enum|eval|null|this|true|void|with|await|break|catch|class|const|false|super|throw|while|yield|delete|export|import|public|return|static|switch|typeof|default|extends|finally|package|private|continue|debugger|function|arguments|interface|protected|implements|instanceof)$/;

        // Make global, local, and persistent accessible as js vars
        let header = '';
        header = loadIntoJsVars(header, this.persistent, "getPersistent");
        header = loadIntoJsVars(header, this.global, "getGlobal");
        header = loadIntoJsVars(header, this.local, "getLocal");
        header = loadIntoJsVars(header, this.localsPassedIntoFunc, "getLocal");

        // Remove unsafe chars from funcName
        if(funcName) {
            funcName = funcName.replace(/\s+/g, '_').replace(/[^A-Za-z0-9\_]/g, '');
            if(funcName != '') {
                funcName = '_for_' + funcName;
            }
        }
        else {
            funcName = '';
        }

        // Pad the top of the code with empty comments so as to adjust line numbers in stack traces to match that of the code block's file
        var padding = '';
        for(let i = 1; i < lineNumber; i++) {
            padding += '//\n';
        }

        code = padding + `(` + (isSync ? `` : `async`) + ` function CodeBlock` + funcName + `(runInstance) { ` + header + code + ` })(this);`; // all on one line so line numbers in stack traces correspond to line numbers in code blocks

        // Evaluate
        if(isSync) {
            return eval(code);
        }
        else {
            // Doing this instead of putting async on top of evalCodeBlock(), because we want evalCodeBlock() to return both values and promises, depending on the value of isSync
            return new Promise(async (resolve, reject) => {
                let error = null;
                let retVal = null;
                try {
                    retVal = await eval(code);
                }
                catch(e) {
                    error = e;
                    reject(e);
                }
                if(!error) {
                    resolve(retVal);
                }
            });
        }

        /**
         * Generates js code that converts variables into normal js vars, appends code to header, returns header
         */
        function loadIntoJsVars(header, arr, getter) {
            for(let varname in arr) {
                if(arr.hasOwnProperty(varname) && varname.match(JS_VARNAME_WHITELIST) && !varname.match(JS_VARNAME_BLACKLIST)) {
                    header += "var " + varname + " = " + getter + "('" + varname + "');";
                }
            }

            return header;
        }
    }

    /**
     * @param {String} text - The text whose vars the replace
     * @param {Step} step - We're finiding the value of variables at this step
     * @param {Branch} [branch] - The branch containing step, if any
     * @return {String} text, with vars replaced with their values
     * @throws {Error} If there's a variable inside text that's never set
     */
    replaceVars(text, step, branch) {
        let matches = text.match(Constants.VAR);
        if(matches) {
            for(let i = 0; i < matches.length; i++) {
                let match = matches[i];
                let name = utils.stripBrackets(match);
                let isLocal = match.startsWith('{{');
                let value = null;

                try {
                    value = this.findVarValue(name, isLocal, step, branch);
                }
                catch(e) {
                    if(e.name == "RangeError" && e.message == "Maximum call stack size exceeded") {
                        utils.error("Infinite loop detected amongst variable references");
                    }
                    else {
                        throw e; // re-throw
                    }
                }

                if(['string', 'boolean', 'number'].indexOf(typeof value) == -1) {
                    utils.error("The variable " + match + " must be set to a string");
                }

                text = text.replace(match, value);
            }
        }

        return text;
    }

    /**
     * @param {String} varname - The name of the variable, without braces (case insensitive)
     * @param {Boolean} isLocal - True of the variable is local, false if it's global
     * @param {Step} step - We're finiding the value of the variable at this step
     * @param {Branch} [branch] - The branch containing step, if any
     * @return {String} Value of the given variable at the given step and branch
     * @throws {Error} If the variable is never set
     */
    findVarValue(varname, isLocal, step, branch) {
        // If let is already set, return it immediately
        let value = null;
        if(isLocal) {
            value = this.getLocal(varname);
        }
        else {
            value = this.getGlobal(varname);
        }

        if(value) {
            return value;
        }

        let variableFull = "";
        if(isLocal) {
            variableFull = "{{" + varname + "}}";
        }
        else {
            variableFull = "{" + varname + "}";
        }

        // Go down the branch looking for {varname}= or {{varname}}=

        if(!branch) {
            branch = new Branch(); // temp branch that's going to be a container for the step
            branch.steps.push(step);
        }

        let index = branch.steps.indexOf(step);
        for(let i = index; i < branch.steps.length; i++) {
            let s = branch.steps[i];
            if(isLocal && s.branchIndents < step.branchIndents) {
                break; // you cannot look outside a function's scope for a local var
            }

            if(s.varsBeingSet) {
                for(let j = 0; j < s.varsBeingSet.length; j++) {
                    let varBeingSet = s.varsBeingSet[j];
                    if(utils.canonicalize(varBeingSet.name) == utils.canonicalize(varname) && varBeingSet.isLocal == isLocal) {
                        let value = null;
                        if(typeof s.codeBlock != 'undefined') {
                            // {varname}=Function (w/ code block)
                            value = this.evalCodeBlock(s.codeBlock, s.text, s.lineNumber, s, true);
                        }
                        else {
                            // {varname}='string'
                            value = utils.stripQuotes(varBeingSet.value);
                            value = utils.unescape(value);
                        }

                        if(['string', 'boolean', 'number'].indexOf(typeof value) != -1) { // only if value is a string, boolean, or number
                            value = this.replaceVars(value, step, branch); // recursive call, start at original step passed in
                        }

                        this.appendToLog("The value of variable " + variableFull + " is being set by a later step at " + s.filename + ":" + s.lineNumber, step || branch);
                        return value;
                    }
                }
            }
        }

        // Not found
        utils.error("The variable " + variableFull + " is never set, but is needed for this step");
    }

    /**
     * Logs the given text to logHere
     */
    appendToLog(text, logHere) {
        if(logHere && !this.isStopped) {
            logHere.appendToLog(text);
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
    setVarBeingSet(varBeingSet, value) {
        if(varBeingSet.isLocal) {
            this.setLocal(varBeingSet.name, value);
        }
        else {
            this.setGlobal(varBeingSet.name, value);
        }
    }

    /**
     * Executes all After Every Branch steps, sequentially
     * @return {Promise} Promise that resolves once all of them finish running
     */
    async runAfterEveryBranch() {
        if(this.currBranch.afterEveryBranch) {
            for(let i = 0; i < this.currBranch.afterEveryBranch.length; i++) {
                let s = this.currBranch.afterEveryBranch[i];
                await this.runHookStep(s, null, this.currBranch);
                if(this.checkForStopped()) {
                    return;
                }
                // finish running all After Every Branch steps, even if one fails, and even if there was a pause
            }
        }
    }

    /**
     * Moves this.currStep to the next not-yet-completed step
     * (Keeps this.currStep on its current position if it's pointing at a step not yet executed)
     * Sets this.currStep to null if there are no more steps in this.currBranch
     */
    nextStep() {
        // Get the next step, but only if the current step is complete or nonexistant
        if(!this.currStep || this.currStep.isComplete()) {
            this.currStep = this.tree.nextStep(this.currBranch, true, true);
        }
    }

    /**
     * Push existing local let context to stack, create fresh local let context
     */
    pushLocalStack() {
        this.localStack.push(this.local);
        this.local = {};
        Object.assign(this.local, this.localsPassedIntoFunc); // merge localsPassedIntoFunc into local
        this.localsPassedIntoFunc = {};
    }

    /**
     * Pop one local let context
     */
    popLocalStack() {
        this.local = this.localStack.pop();
    }

    /**
     * Takes an Error caught from the execution of a step and adds filename and lineNumber parameters to it
     */
    fillErrorFromStep(error, step, inCodeBlock) {
        error.filename = step.filename;
        error.lineNumber = step.lineNumber;

        // If error occurred in a function's code block, we should reference the function declaration's line, not the function call's line
        // (except for hooks and packaged code blocks)
        if(step.isFunctionCall && inCodeBlock && !step.isHook && !step.isPackaged) {
            error.filename = step.originalStepInTree.functionDeclarationInTree.filename;
            error.lineNumber = step.originalStepInTree.functionDeclarationInTree.lineNumber;
        }

        // If error occurred in a code block, set the lineNumber to be that from the stack trace rather than the first line of the code block
        if(inCodeBlock && !step.isPackaged) {
            let matches = error.stack.toString().match(/at CodeBlock[^\n]+<anonymous>:[0-9]+/g);
            if(matches) {
                matches = matches[0].match(/([0-9]+)$/g);
                if(matches) {
                    error.lineNumber = parseInt(matches[0]);
                }
            }
        }
    }

    /**
     * @return {Number} The line number offset for evalCodeBlock(), based on the given step
     */
    getLineNumberOffset(step) {
        if(step.isFunctionCall && !step.isPackaged && !step.isHook) {
            return step.originalStepInTree.functionDeclarationInTree.lineNumber;
        }
        else {
            return step.lineNumber;
        }
    }

    /**
     * @return {Boolean} True if the RunInstance is currently paused, false otherwise. Also sets the current branch's elapsed.
     */
    checkForPaused() {
        if(this.isPaused) {
            this.currBranch.elapsed = -1;
            return true;
        }

        return false;
    }

    /**
     * @return {Boolean} True if the RunInstance is currently stopped, false otherwise. Also sets the current branch's elapsed.
     */
    checkForStopped() {
        if(this.isStopped) {
            this.currBranch.elapsed = new Date() - this.currBranch.timeStarted;
            return true;
        }

        return false;
    }
}
module.exports = RunInstance;
