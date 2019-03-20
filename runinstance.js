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

        this.persistant = this.runner.persistant;       // persistant variables
        this.global = {};                               // global variables
        this.local = {};                                // local variables

        this.localStack = [];                           // Array of objects, where each object stores local vars
    }

    /**
     * Grabs branches and steps from this.tree and executes them. Exits when there's nothing left to execute, or if a pause occurs.
     * @return {Promise} Promise that gets resolved with true once done executing, or gets resolved with false if a branch was paused
     */
    run() {
        this.isPaused = false;
        return new Promise(async (resolve, reject) => {
            this.currBranch = this.tree.nextBranch();
            while(this.currBranch) {
                if(this.currBranch == 'wait') {
                    // wait 1 sec
                    await new Promise((resolve, reject) => {
                        setTimeout(() => { resolve(); }, 1000);
                    });
                }
                else { // this.currBranch is an actual Branch
                    this.currStep = this.tree.nextStep(this.currBranch, true, true);
                    while(this.currStep) {
                        runStep(this.currStep, this.currBranch, this.currStep, this.currBranch);

                        if(this.isPaused) { // the current step caused a pause
                            resolve(false);
                            break;
                        }

                        this.currStep = this.tree.nextStep(this.currBranch, true, true);
                    }

                    // NOTE: Tree.nextBranch() handles serving up Before/After Everything branches
                    // NOTE: Tree.nextStep() handles serving up After Every Branch steps

                    // Execute After Every Branch hooks
                    this.local.successful = this.currBranch.isPassed;
                    this.local.error = this.currBranch.error;
                    this.currBranch.afterEveryBranch.forEach(b => {
                        b.steps.forEach(s => {
                            runStep(s, b, null, this.currBranch);
                        });
                    });
                }

                this.currBranch = this.tree.nextBranch();

                // clear variable state
                this.global = {};
                this.local = {};
                this.localStack = [];
            }

            resolve(!this.isPaused);
        });
    }

    /**
     * Executes a step
     * Sets this.isPaused if the step requires execution to pause
     * Sets passed/failed status on step, sets the step's error and log
     * @param {Step} step - The Step to execute
     * @param {Branch} branch - The branch that contains the step to execute
     * @param {Step} stepToTakeError - The Step that will take the Error object (usually the same as step), null if branchToTakeError should take the error
     * @param {Branch} branchToTakeError - The Branch that will take the Error object (usually the same as branch)
     */
    runStep(step, branch, stepToTakeError, branchToTakeError) {
        if(step.isDebug) {
            this.isPaused = true;
            return;
        }

        var prevStep = null;
        var index = branch.steps.indexOf(step);
        if(index >= 1) {
            prevStep = branch.steps[index - 1];
        }

        // Replace {vars}/{{vars}} in the step's text
        // TODO









        // Check change of step.branchIndents between this step and the previous one, push/pop this.localStack accordingly
        if(prevStep) {
            if(step.branchIndents > prevStep.branchIndents) {
                // Push existing local var context to stack, create fresh local var context
                this.localStack.push(this.local);
                this.local = {};

                if(step.isFunctionCall) {
                    // Set {{local vars}} based on function declaration signature (in original step in tree) and step's function call signature
                    // TODO
                    // TODO: this is where ElementFinders are converted to objects too






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
            // TODO








        }

        // Step has a code block to execute
        if(typeof step.codeBlock != 'undefined') {
            var code = step.codeBlock;
            var error = null;

            try {
                if(utils.canonicalize(step.text) == "execute in browser") {
                    this.execInBrowser(code); // this function will be injected into RunInstance by a built-in function during Before Everything
                }
                else {






                    eval(code);

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
                this.runner.pauseOnFail = false;
                this.isPaused = true;
                return;
            }
        }

        // Execute After Every Step hooks
        this.local.successful = step.isPassed;
        this.local.error = step.error;
        this.currBranch.afterEveryStep.forEach(b => {
            b.steps.forEach(s => {
                runStep(s, b, this.currStep, this.currBranch);
            });
        });

        // Update the report
        this.runner.reporter.generateReport();

        // If we're only meant to run one step before a pause
        if(this.runner.runOneStep) {
            this.runner.runOneStep = false; // clear out flag
            this.isPaused = true;
        }
    }

    /**
     * Replaces vars in text with their values at the current step and branch
     */
    replaceVars(text) {

    }

    /**
     * @return {String} Value of the given variable at the current step and branch
     */
    findVarValue(varname) {

    }

    /**
     * Runs the given branch, then pauses
     * Call when already paused
     */
    injectAndRun(branch) {
        if(!this.isPaused) {
            return; // fail gracefully
        }






    }

    /**
     * Logs the given string to the current step
     */
    log(str) {
        if(this.currStep) {
            logToObj(this.currStep)
        }
        else if(this.currBranch) {
            logToObj(this.currBranch)
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
