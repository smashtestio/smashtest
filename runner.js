const Tree = require('./tree.js');
const Step = require('./step.js');
const Branch = require('./branch.js');

/**
 * Test runner
 */
class Runner {
    /**
     * Generates the runner
     * @param {Object} config - Configuration with the following parameters
     *      {Number} maxInstances - The maximum number of simultaneous branches to run
     *      {Tree} tree - The tree to run (tree.finalize() must have been already called)
     */
    constructor(config) {
        this.maxInstances = config.maxInstances;
        this.tree = config.tree;
    }

    /**
     * Runs the tests from this.tree
     * Parallelizes runs to up to this.maxInstances simultaneously running tests
     * @return {boolean} true if the entire tree was completed (regardless of passing or failing steps), false if a branch was paused due to step.isDebug being set
     */
    runTests() {
        // TODO: read jsdoc above
    }

    /**
     * Resumes running branch after it was paused due to step.isDebug being set on a step
     * There should only be one branch inside this.tree.branches, if isDebug is set inside any step
     */
    resumeTests() {
        // TODO: read jsdoc above
    }

    /**
     * Runs the given branch
     * @param {Branch} branch - The branch to run, from this.tree.branches
     */
    runBranch(branch) {

    }

    /**
     * Runs the given Step
     * @param {Step} step - The Step to run
     */
    runStep(step) {

    }
}
