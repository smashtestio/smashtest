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
        this.localsPassedIntoFunc = [];                 // local variables being passed into the function at the current step
    }

    /**
     * Grabs branches and steps from this.tree and executes them
     * Exits when there's nothing left to execute, or if a pause or stop occurs
     * @return {Promise} Promise that gets resolved once done executing
     */
    async run() {
        var wasPaused = false;
        var overrideDebug = false;
        if(this.isPaused) {
            this.isPaused = false; // resume if we're already paused
            wasPaused = true;
            overrideDebug = true;
        }
        else { // we're starting off from scratch (not paused)
            this.currBranch = this.tree.nextBranch();
        }

        while(this.currBranch) {
            var startTime = new Date();

            // Execute Before Every Branch steps, if they didn't run already (and remember, there is only one branch if pausing is possible)
            if(this.currBranch.beforeEveryBranch && !wasPaused) {
                for(var i = 0; i < this.currBranch.beforeEveryBranch.length; i++) {
                    var s = this.currBranch.beforeEveryBranch[i];

                    var isSuccess = await this.runHookStep(s, null, this.currBranch);
                    if(!isSuccess) {
                        // runHookStep() already marked the branch as a failure, so now just advance to the next branch
                        this.currBranch = this.tree.nextBranch();
                        continue;
                    }
                }
            }

            // Move this.currStep to the next not-yet-completed step
            this.nextStep();

            // Execute steps in the branch
            while(this.currStep) {
                await this.runStep(this.currStep, this.currBranch, overrideDebug);
                overrideDebug = false; // only override a debug on the first step we run after an unpause
                if(checkForPauseOrStop()) {
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

            if(this.currBranch.elapsed != -1) { // measue elapsed only if this RunInstance has never been paused
                this.currBranch.elapsed = new Date() - startTime;
            }

            this.currBranch = this.tree.nextBranch();
        }

        /**
         * @return {Boolean} True if the RunInstance is currently paused or stopped, false otherwise. Also sets the current branch's elapsed.
         */
        function checkForPauseOrStop() {
            if(this.isPaused) {
                this.currBranch.elapsed = -1;
                return true;
            }
            else if(this.isStopped) {
                this.currBranch.elapsed = new Date() - startTime;
                return true;
            }

            return false;
        }
    }

    /**
     * Executes a step, and its corresponding beforeEveryStep and afterEveryStep steps (if a branch is passed in)
     * Sets this.isPaused if the step requires execution to pause
     * Marks the step as passed/failed and expected/unexpected, sets the step's error and log
     * Resolves immediately if step.isDebug is true (unless overrideDebug is true as well)
     * @param {Step} step - The Step to execute
     * @param {Branch} [branch] - The branch that contains the step to execute, if any
     * @param {Boolean} [overrideDebug] - If true, ignores step.isDebug (prevents getting stuck on a ~ step)
     * @return {Promise} Promise that gets resolved when the step finishes execution
     */
    async runStep(step, branch, overrideDebug) {
        if(step.isDebug && !overrideDebug) {
            this.isPaused = true;
            return;
        }

        var startTime = new Date();

        // Execute Before Every Step hooks
        if(branch && branch.beforeEveryStep) {
            for(var i = 0; i < branch.beforeEveryStep.length; i++) {
                var s = branch.beforeEveryStep[i];
                var isSuccess = await this.runHookStep(s, step);
                if(!isSuccess) {
                    return;
                }
            }
        }

        // Find the previous step
        var prevStep = null;
        if(branch) {
            var index = branch.steps.indexOf(step);
            if(index >= 1) {
                prevStep = branch.steps[index - 1];
            }
        }

        // Handle the stack for {{local vars}}
        if(prevStep) {
            // Check change of step.branchIndents between this step and the previous one, push/pop this.localStack accordingly
            if(step.branchIndents > prevStep.branchIndents) { // NOTE: when step.branchIndents > prevStep.branchIndents, step.branchIndents is always prevStep.branchIndents + 1
                // Push existing local var context to stack, create fresh local var context
                this.localStack.push(this.local);
                this.local = {};
                this.local = this.local.concat(this.localsPassedIntoFunc);
            }
            else if(step.branchIndents < prevStep.branchIndents) {
                // Pop one local var context for every branchIndents decrement
                var diff = prevStep.branchIndents - step.branchIndents;
                for(var i = 0; i < diff; i++) {
                    this.local = this.localStack.pop();
                }
            }
        }
        this.localsPassedIntoFunc = [];

        var error = null;

        // Execute the step
        try {
            // Passing inputs into function calls
            if(step.isFunctionCall) {
                // Set {{local vars}} based on function declaration signature and function call signature

                var varList = step.functionDeclarationText.match(Constants.VAR);
                if(varList) {
                    if(step.varsBeingSet && step.varsBeingSet.length > 0) {
                        // step is a {{var}} = Function {{var2}} {{var3}}, so skip the first var
                        varList.shift();
                    }

                    var inputList = step.text.match(Constants.FUNCTION_INPUT);
                    if(inputList) {
                        for(var i = 0; i < varList.length; i++) {
                            var varname = utils.stripBrackets(varList[i]);
                            var value = inputList[i];

                            if(value.match(Constants.STRING_LITERAL_WHOLE)) { // 'string', "string", or [string]
                                value = utils.stripQuotes(value);
                                value = this.replaceVars(value, step, branch); // replace vars with their values
                            }
                            else if(value.match(Constants.VAR_WHOLE)) { // {var} or {{var}}
                                var isLocal = value.startsWith('{{');
                                value = utils.stripBrackets(value);
                                value = this.findVarValue(value, isLocal, step, branch);
                            }

                            this.setLocalPassedIn(varname, value);
                        }
                    }
                }
            }

            // Step is {var}='str' [, {var2}='str', etc.]
            if(!step.isFunctionCall && step.varsBeingSet && step.varsBeingSet.length > 0) {
                for(var i = 0; i < step.varsBeingSet.length; i++) {
                    var varBeingSet = step.varsBeingSet[i];
                    var value = utils.stripQuotes(varBeingSet.value);
                    value = this.replaceVars(value, step, branch);
                    this.setVarBeingSet(varBeingSet, value);
                }
            }

            // Step has a code block to execute
            if(typeof step.codeBlock != 'undefined') {
                var retVal = null;
                if(utils.canonicalize(step.text) == "execute in browser") {
                    retVal = await this.execInBrowser(step.codeBlock); // this function will be injected into RunInstance by a function in a built-in Before Everything hook
                }
                else {
                    retVal = await this.evalCodeBlock(step.codeBlock, false, step);
                }

                // Step is {var} = Func with code block
                // NOTE: When Step is {var} = Func, where Func has children in format {x}='string', we don't need to do anything else
                if(step.isFunctionCall && step.varsBeingSet && step.varsBeingSet.length == 1) {
                    // Grab return value from code and assign it to {var}
                    this.setVarBeingSet(step.varsBeingSet[0], value);
                }

                // If this RunInstance was stopped, just exit without marking this step (which likely could have failed as the framework was being torn down)
                // We'll pretend this step never ran in the first place
                if(this.isStopped) {
                    return;
                }
            }
        }
        catch(e) {
            error = e;
            error.filename = step.filename;
            error.lineNumber = step.lineNumber;

            throw e; // TODO: remove this
        }

        // Marks the step as passed/failed and expected/unexpected, sets the step's asExpected, error, and log
        var isPassed = false;
        var asExpected = false;
        if(step.isExpectedFail) {
            if(error) {
                isPassed = false;
                asExpected = true;
            }
            else {
                error = new Error("This step passed, but it was expected to fail (#)");
                error.filename = step.filename;
                error.lineNumber = step.lineNumber;

                isPassed = true;
                asExpected = false;
            }
        }
        else { // fail is not expected
            if(error) {
                isPassed = false;
                asExpected = false;
            }
            else {
                isPassed = true;
                asExpected = true;
            }
        }

        var finishBranchNow = true;
        if(error && (error.continue || this.runner.pauseOnFail)) { // do not finish off the branch if error.continue is set, or if we're doing a pauseOnFail
            finishBranchNow = false;
        }

        this.tree.markStep(step, branch, isPassed, asExpected, error, finishBranchNow, true);

        // Execute After Every Step hooks (all of them, regardless if one fails)
        if(branch && branch.afterEveryStep) {
            for(var i = 0; i < branch.afterEveryStep.length; i++) {
                var s = branch.afterEveryStep[i];
                await this.runHookStep(s, step);
            }
        }

        // Pause if pauseOnFail is set and the step failed or is unexpected
        if(this.runner.pauseOnFail && (!step.isPassed || !step.asExpected)) {
            this.isPaused = true;
        }

        step.elapsed = new Date() - startTime;
    }

    /**
     * Runs the given hook step
     * @param {Step} step - The hook step to run
     * @param {Step} [stepToGetError] - The Step that will get the error and marked failed, if a failure happens here
     * @param {Branch} [branchToGetError] - The Branch that will get the error and marked failed, if a failure happens here
     * @return {Boolean} True if the run was a success, false if there was a failure
     */
    async runHookStep(step, stepToGetError, branchToGetError) {
        try {
            await this.evalCodeBlock(step.codeBlock, false, stepToGetError || branchToGetError);
        }
        catch(e) {
            e.filename = step.filename;
            e.lineNumber = step.lineNumber;

            if(stepToGetError) {
                this.tree.markStep(stepToGetError, null, false, false, e);
            }

            if(branchToGetError) {
                branchToGetError.error = e;
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
     * @return {Promise} Promise that resolves once the execution finishes
     */
    async runOneStep() {
        this.nextStep();
        if(this.currStep) {
            await this.runStep(this.currStep, this.currBranch, true);
            this.isPaused = true;
        }
        else { // all steps in current branch finished running, finish off the branch
            await this.runAfterEveryBranch();
        }
    }

    /**
     * Skips over the next not-yet-completed step, then pauses
     * Only call if already paused
     */
    async skipOneStep() {
        this.skipStep();
        if(this.currStep) {
            this.isPaused = true;
        }
        else { // all steps in current branch finished running, finish off the branch
            await this.runAfterEveryBranch();
        }
    }

    /**
     * Runs the given step, then pauses again
     * Only call if already paused
     * @param {Step} step - The step to run
     * @return {Promise} Promise that gets resolved once done executing
     */
    async injectStep(step) {
        await this.runStep(step, null, true);
        this.isPaused = true;
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
            for(var i = 0; i < this.currBranch.afterEveryBranch.length; i++) {
                var s = this.currBranch.afterEveryBranch[i];
                await this.runHookStep(s, null, this.currBranch);
                // finish running all After Every Branch steps, even if one fails, and even if there was a pause or stop
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
     * Moves this.currStep to the step after the next not-yet-completed step
     */
    skipStep() {
        this.nextStep();
        this.currStep.isSkipped = true;
        this.currStep = this.tree.nextStep(this.currBranch, true, false);
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
            return this.local[utils.canonicalize(varname)];
        }
    }

    /**
     * Sets the given persistent variable to the given value
     */
    setPersistent(varname, value) {
        this.persistent[utils.canonicalize(varname)] = value;
    }

    /**
     * Sets the given global variable to the given value
     */
    setGlobal(varname, value) {
        this.global[utils.canonicalize(varname)] = value;
    }

    /**
     * Sets the given local variable to the given value
     */
    setLocal(varname, value) {
        this.local[utils.canonicalize(varname)] = value;
    }

    /**
     * Sets a local variable being passed into a function
     */
    setLocalPassedIn(varname, value) {
        this.localsPassedIntoFunc[utils.canonicalize(varname)] = value;
    }

    /**
     * Evals the given code block
     * @param {String} code - JS code to eval
     * @param {Boolean} [isSync] - If true, executes code synchronously, otherwise executes code asynchonously and returns a Promise
     * @param {Step or Branch} [logHere] - The Object to log to, if any
     * @return What the code returns via the return keyword
     */
    evalCodeBlock(code, isSync, logHere) {
        // Make global, local, and persistent accessible as js vars
        var header = `
            function log(text) {
                if(logHere) {
                    logHere.appendToLog(text);
                }
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
                    return runInstance.localsPassedIntoFunc[varname];
                }
                else {
                    return runInstance.local[utils.canonicalize(varname)];
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

        `;

        const VALID_JS_VAR = /^[A-Za-z0-9\-\_\.]+$/;

        header = loadIntoJsVars(header, this.persistent, "getPersistent");
        header = loadIntoJsVars(header, this.global, "getGlobal");
        header = loadIntoJsVars(header, this.local, "getLocal");
        header = loadIntoJsVars(header, this.localsPassedIntoFunc, "getLocal");

        code = `
            (` + (isSync ? `` : `async`) + ` function(runInstance) {
                ` + header + `
                ` + code + `
            })(this);`

        return eval(code);

        /**
         * Generates js code that converts variables into normal js vars, appends code to header, returns header
         */
        function loadIntoJsVars(header, arr, getter) {
            for(var varname in arr) {
                if(arr.hasOwnProperty(varname) && varname.match(VALID_JS_VAR)) {
                    header += "var " + varname + " = " + getter + "('" + varname + "');\n";
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
        var matches = text.match(Constants.VAR);
        if(matches) {
            for(var i = 0; i < matches.length; i++) {
                var match = matches[i];
                var name = utils.stripBrackets(match);
                var isLocal = match.startsWith('{{');
                var value = null;

                try {
                    value = this.findVarValue(name, isLocal, step, branch);
                }
                catch(e) {
                    if(e.name == "RangeError" && e.message == "Maximum call stack size exceeded") {
                        utils.error("Infinite loop detected amongst variable references", step.filename, step.lineNumber);
                    }
                    else {
                        throw e; // re-throw
                    }
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
        // If var is already set, return it immediately
        var value = null;
        if(isLocal) {
            value = this.getLocal(varname);
        }
        else {
            value = this.getGlobal(varname);
        }

        if(value) {
            return value;
        }

        var variableFull = "";
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

        var index = branch.steps.indexOf(step);
        for(var i = index; i < branch.steps.length; i++) {
            var s = branch.steps[i];
            if(s.varsBeingSet) {
                for(var j = 0; j < s.varsBeingSet.length; j++) {
                    var varBeingSet = s.varsBeingSet[j];
                    if(utils.canonicalize(varBeingSet.name) == utils.canonicalize(varname) && varBeingSet.isLocal == isLocal) {
                        var value = null;
                        if(typeof s.codeBlock != 'undefined') {
                            // {varname}=Function (w/ code block)
                            value = this.evalCodeBlock(s.codeBlock, true, s);
                        }
                        else {
                            // {varname}='string'
                            value = utils.stripQuotes(varBeingSet.value);
                        }

                        value = this.replaceVars(value, step, branch); // recursive call, start at original step passed in
                        this.appendToLog("The value of variable " + variableFull + " is being set by a later step at " + s.filename + ":" + s.lineNumber, step, branch);
                        return value;
                    }
                }
            }
        }

        // Not found
        utils.error("The variable " + variableFull + " is never set, but is needed for this step", step.filename, step.lineNumber);
    }

    /**
     * Logs the given text to the given step (or branch, if the step does not exist)
     */
    appendToLog(text, step, branch) {
        if(!this.isStopped) {
            if(step) {
                step.appendToLog(text);
            }
            else if(branch) {
                branch.appendToLog(text);
            }
        }
    }
}
module.exports = RunInstance;
