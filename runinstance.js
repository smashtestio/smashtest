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

        this.isPaused = false;                          // true if we're currently paused

        this.persistent = this.runner.persistent;       // persistent variables
        this.global = {};                               // global variables
        this.local = {};                                // local variables

        this.localStack = [];                           // Array of objects, where each object stores local vars
    }

    /**
     * Grabs branches and steps from this.tree and executes them. Exits when there's nothing left to execute, or if a pause occurs.
     * @return {Promise} Promise that gets resolved once done executing
     */
    async run() {
        this.isPaused = false;
        this.currBranch = this.tree.nextBranch();
        while(this.currBranch) {
            // Execute Before Every Branch steps
            for(var i = 0; i < this.currBranch.beforeEveryBranch.length; i++) {
                var s = this.currBranch.beforeEveryBranch[i];
                await runStep(s, null, null, this.currBranch);
            }

            // Execute steps in the branch
            this.currStep = this.tree.nextStep(this.currBranch, true, true);
            while(this.currStep) {
                await this.runStep(this.currStep, this.currBranch, this.currStep, this.currBranch);

                if(this.isPaused) { // the current step caused a pause
                    return;
                }

                this.currStep = this.tree.nextStep(this.currBranch, true, true);
            }

            // Execute After Every Branch steps
            this.local.successful = this.currBranch.isPassed;
            this.local.error = this.currBranch.error;
            for(var i = 0; i < this.currBranch.afterEveryBranch.length; i++) {
                var s = this.currBranch.afterEveryBranch[i];
                await runStep(s, null, null, this.currBranch);
            }

            // clear variable state
            this.global = {};
            this.local = {};
            this.localStack = [];

            this.currBranch = this.tree.nextBranch();
        }
    }

    /**
     * Executes a step
     * Sets this.isPaused if the step requires execution to pause
     * Sets passed/failed status on step, sets the step's error and log
     * @param {Step} step - The Step to execute
     * @param {Branch} [branch] - The branch that contains the step to execute, if any
     * @param {Step} stepToTakeError - The Step that will take the Error object (usually the same as step), null if branchToTakeError should take the error
     * @param {Branch} branchToTakeError - The Branch that will take the Error object (usually the same as branch)
     * @return {Promise} Promise that gets resolved when the step finishes execution
     */
    async runStep(step, branch, stepToTakeError, branchToTakeError) {
        if(step.isDebug) {
            this.isPaused = true;
            return;
        }

        // Execute Before Every Step hooks
        if(branch) {
            for(var i = 0; i < branch.beforeEveryStep.length; i++) {
                var s = branch.beforeEveryStep[i];
                await runStep(s, null, this.currStep, this.currBranch);
            }
        }

        var prevStep = null;
        if(branch) {
            var index = branch.steps.indexOf(step);
            if(index >= 1) {
                prevStep = branch.steps[index - 1];
            }
        }

        // For function call steps, replace {vars}/{{vars}} inside 'strings' and [ElementFinders]
        if(step.isFunctionCall) {
            step.processedText = step.text + '';
            replaceVarsInStep(Constants.STRING_LITERAL_REGEX);
            replaceVarsInStep(Constants.BRACKET_REGEX);

            function replaceVarsInStep(regex) {
                var matches = step.processedText.match(regex);
                if(matches) {
                    for(var i = 0; i < matches.length; i++) {
                        var match = matches[i];
                        var text = utils.stripQuotes(match);
                        text = this.replaceVars(text, step, branch);
                        step.processedText = step.processedText.replace(match, text);
                    }
                }
            }
        }

        // Check change of step.branchIndents between this step and the previous one, push/pop this.localStack accordingly
        if(prevStep) {
            if(step.branchIndents > prevStep.branchIndents) {
                // Push existing local var context to stack, create fresh local var context
                this.localStack.push(this.local);
                this.local = {};

                if(prevStep.isFunctionCall) {
                    // This is the first step inside a function call
                    // Set {{local vars}} based on function declaration signature (step.functionDeclarationText) and step's function call signature

                    // TODO











                }
            }
            else if(step.branchIndents < prevStep.branchIndents) {
                // Pop one local var context for every branchIndents decrement
                var diff = prevStep.branchIndents - step.branchIndents;
                for(var i = 0; i < diff; i++) {
                    this.local = this.localStack.pop();
                }
            }
        }

        // Step is {var}='str' [, {var2}='str', etc.]
        if(!step.isFunctionCall && step.varsBeingSet.length > 0) {
            for(var i = 0; i < step.varsBeingSet.length; i++) {
                var varBeingSet = step.varsBeingSet[i];
                if(varBeingSet.isLocal) {
                    this.local[varBeingSet.name] = this.replaceVars(varBeingSet.value, step, branch);
                }
                else {
                    this.global[varBeingSet.name] = this.replaceVars(varBeingSet.value, step, branch);
                }
            }
        }

        // Step has a code block to execute
        if(typeof step.codeBlock != 'undefined') {
            var code = step.codeBlock;
            var error = null;

            try {
                if(utils.canonicalize(step.text) == "execute in browser") {
                    await this.execInBrowser(code); // this function will be injected into RunInstance by a built-in function during Before Everything
                }
                else {





                    await this.evalCodeBlock(code);

                    // Step is {var} = Func
                    if(step.isFunctionCall && step.varsBeingSet.length == 1) {
                        // TODO: grab return value from code and assign it to {var}







                    }
                }
            }
            catch(e) {
                error = e;
                error.filename = step.filename;
                error.lineNumber = step.lineNumber;
            }

            // Marks the step as passed/failed, sets the step's asExpected, error, and log
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

            if(stepToTakeError) {
                this.tree.markStep(branchToTakeError, stepToTakeError, isPassed, asExpected, error, error ? error.failBranchNow : false, true);
            }
            else {
                // Attach the error to the Branch and fail it
                branchToTakeError.error = error;
                this.tree.markBranch(branchToTakeError, false);
            }

            // Pause if the step failed or is unexpected
            if(this.runner.pauseOnFail && (!isPassed || !asExpected)) {
                this.isPaused = true;
                return;
            }
        }

        // Execute After Every Step hooks
        if(branch) {
            this.local.successful = step.isPassed;
            this.local.error = step.error;
            for(var i = 0; i < branch.afterEveryStep.length; i++) {
                var s = branch.afterEveryStep[i];
                await runStep(s, null, this.currStep, this.currBranch);
            }
        }

        // Update the report
        this.runner.reporter.generateReport();

        // If we're only meant to run one step before a pause
        if(this.runner.runOneStep) {
            this.runner.runOneStep = false; // clear out flag
            this.isPaused = true;
        }
    }

    /**
     * Evals the given code block
     * @param {String} code - JS code to eval
     * @param {Boolean} [isSync] - If true, executes code synchronously, otherwise executes code asynchonously and returns a Promise
     * @return What the code returns via the return keyword
     */
    evalCodeBlock(code, isSync) {
        // Make global, local, and persistent accessible as js vars
        var header = "";
        header += "var persistent = runInstance.persistent;\n";
        header += "var global = runInstance.global;\n";
        header += "var local = runInstance.local;\n";

        // Load persistent into js vars
        for(var varname in this.persistent) {
            if(this.persistent.hasOwnProperty(varname) && varname.match(/^[A-Za-z0-9\-\_\.]+$/)) {
                header += "var " + varname + " = persistent['" + varname + "'];\n";
            }
        }

        // Load global into js vars
        for(var varname in this.global) {
            if(this.global.hasOwnProperty(varname) && varname.match(/^[A-Za-z0-9\-\_\.]+$/)) {
                header += "var " + varname + " = global['" + varname + "'];\n";
            }
        }

        // Load local into js vars, potentially overriding global vars
        for(var varname in this.local) {
            if(this.local.hasOwnProperty(varname) && varname.match(/^[A-Za-z0-9\-\_\.]+$/)) {
                header += "var " + varname + " = local['" + varname + "'];\n";
            }
        }

        code = `
            (` + (isSync ? `` : `async`) + ` function(runInstance) {
                ` + header + `
                ` + code + `
            })(this);`

        return eval(code);
    }

    /**
     * @param {String} text - The text whose vars the replace
     * @param {Step} step - We're finiding the value of variables at this step
     * @param {Branch} [branch] - The branch containing step, if any
     * @return {String} text, with vars replaced with their values
     * @throws {Error} If there's a variable inside text that's never set
     */
    replaceVars(text, step, branch) {
        var matches = text.match(Constants.VAR_REGEX);
        if(matches) {
            for(var i = 0; i < matches.length; i++) {
                var match = matches[i];
                var name = match.replace(/\{|\}/g, '').trim();
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
        var container = this.global;
        if(isLocal) {
            container = this.local;
        }
        if(typeof container[varname] != 'undefined') {
            return container[varname];
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
                            value = this.evalCodeBlock(s.codeBlock, true);
                        }
                        else {
                            // {varname}='string'
                            value = utils.stripQuotes(varBeingSet.value);
                        }

                        value = this.replaceVars(value, step, branch); // recursive call, start at original step passed in
                        this.log("The value of variable " + variableFull + " is being set by a later step at " + s.filename + ":" + s.lineNumber, step, branch);
                        return value;
                    }
                }
            }
        }

        // Not found
        utils.error("The variable " + variableFull + " is never set, but is needed for this step", step.filename, step.lineNumber);
    }

    /**
     * Runs the given step, then pauses again
     * Call when already paused
     * @param {Step} step - The step to run
     * @return {Promise} Promise that gets resolved once done executing
     */
    async injectStep(step) {
        if(!this.isPaused) {
            return; // fail gracefully
        }

        this.isPaused = false; // un-pause for now
        await this.runStep(step, this.currBranch, step, this.currBranch);
        this.isPaused = true;
    }

    /**
     * Logs the given string to the given step or branch
     */
    log(str, step, branch) {
        if(step) {
            logToObj(step);
        }
        else if(branch) {
            logToObj(branch);
        }

        function logToObj(obj) {
            if(typeof obj.log == 'undefined') {
                obj.log = '';
            }

            obj.log += str + '\n';
        }
    }

    /**
     * @return {Tree} The tree associated with the runner
     */
    getTree() {
        return this.runner.tree;
    }

    /**
     * @return {Branch} The Branch currently being executed
     */
    getCurrentBranch() {
        return this.currBranch;
    }

    /**
     * @return {Step} The Step currently being executed
     */
    getCurrentStep() {
        return this.currStep;
    }
}
module.exports = RunInstance;
