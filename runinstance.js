/**
 * Represents a running test instance. Kind of like a "thread".
 */
class RunInstance {
    constructor(testRunner) {
        this.testRunner = testRunner;

        this.tree = this.testRunner.tree;               // Tree currently being executed
        this.currBranch = null;                         // Branch currently being executed
        this.currStep = null;                           // Step currently being executed

        this.isPaused = false;                          // true if we're currently paused

        this.persistant = this.testRunner.persistant;   // persistant variables
        this.global = [];                               // global variables
        this.local = [];                                // local variables
    }

    /**
     * Grabs branches and steps from this.testRunner.tree and executes them. Exits when there's nothing left to execute, or if a pause occurs.
     * @return {Promise} Promise that gets resolved with true once done executing, or gets resolved with false if a branch was paused
     */
    run() {
        return new Promise((resolve, reject) => {
            this.currBranch = this.tree.nextBranch();
            while(this.currBranch) {
                if(this.currBranch == 'wait') {





                }
                else { // this.currBranch is an actual Branch
                    // Remember, Tree.nextBranch() handles the whole Before/After Everything thing






                    // TODO: look to this.testRunner.pauseOnFail and this.testRunner.runOneStep (which you must clear right after)
                    // TODO: set this.isPaused when a pause occurs



                }

                this.currBranch = this.tree.nextBranch();
            }

            resolve(!this.isPaused);
        });
    }

    /**
     * Runs the given Step
     * @param {Step} step - The Step to run
     */
    async runStep(step) {
        // TODO: code blocks are eval()ed here





    }

    /**
     * Logs the given string to the current step
     */
    log(str) {
        if(this.currStep) {
            if(typeof this.currStep.log == 'undefined') {
                this.currStep.log = '';
            }

            this.currStep.log += str + '\n';
        }
    }

    /**
     * @return {Tree} The tree associated with the runner
     */
    getTree() {
        return this.testRunner.tree;
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
