/**
 * Represents a running test instance. Kind of like a "thread".
 */
class RunInstance {
    constructor(testRunner) {
        this.testRunner = testRunner;
        this.persistant = this.testRunner.persistant;
    }

    /**
     * Grabs branches and steps from this.testRunner.tree and executes them. Exits when there's nothing left to execute, or if a pause occurs
     * @return {Promise} Promise that gets resolved with true once done executing, or gets resolved with false if a branch was paused
     */
    run() {
        return new Promise((resolve, reject) => {


            // TODO: look to this.testRunner.pauseOnFail and this.testRunner.runOneStep (which you must clear right after)








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
     * @return {Tree} The tree associated with the runner
     */
    getTree() {
        return this.testRunner.tree;
    }

    getCurrentBranch() {

    }

    getCurrentStep() {

    }
}
module.exports = RunInstance;
