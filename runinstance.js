/**
 * Represents a running test instance. Kind of like a "thread".
 */
class RunInstance {
    constructor(testRunner) {
        this.testRunner = testRunner;
        this.persistant = this.testRunner.persistant;
    }

    /**
     * Runs the given branch
     * @param {Branch} branch - The Branch to run
     */
    runBranch(branch) {
        // probably calls something in this.testRunner
    }

    /**
     * Runs the given Step
     * @param {Step} step - The Step to run
     */
    runStep(step) {
        // TODO:
        // code blocks are eval()ed here
    }
}
