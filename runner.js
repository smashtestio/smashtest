const RunInstance = require('./runinstance.js');
const utils = require('./utils.js');

/**
 * Test runner
 */
class Runner {
    /**
     * Generates the runner
     */
    constructor() {
        this.tree = {};                  // The tree to run (tree.generateBranches() must have been already called)

        this.maxInstances = 5;           // The maximum number of simultaneous branches to run
        this.noDebug = false;            // If true, a compile error will occur if a $ or ~ is present anywhere in the tree

        this.pauseOnFail = false;        // If true, pause and debug when a step fails (this.maxInstances must be set to 1)
        this.runOneStep = false;         // If true, runs the next step, then pauses

        this.persistent = {};            // stores variables which persist from branch to branch, for the life of the Runner

        this.runInstances = [];          // the currently-running RunInstance objects, each running a branch
        this.runInstancePromises = [];   // the promises returned from each RunInstance object

        this.reporter = {};              // the reporter to use for reports
    }

    /**
     * Starts or resumes running the branches from this.tree
     * Parallelizes runs to up to this.maxInstances simultaneously running tests
     * @return {Promise} Promise that gets resolved with true if the entire tree was completed (regardless of passing or failing steps), resolved with false if a branch was paused
     */
    run() {
        // If pauseOnFail is set, maxInstances must be 1
        if(this.pauseOnFail && this.maxInstances != 1) {
            utils.error("maxInstances must be set to 1 since pauseOnFail is on");
        }

        // If isDebug is set on any step, maxInstances must be 1
        if(this.tree.isDebug && this.maxInstances != 1) {
            utils.error("maxInstances must be set to 1 since a ~ step exists");
        }

        // Spawn this.maxInstances RunInstances
        for(var i = 0; i < this.maxInstances; i++) {
            var runInstance = new RunInstance(this);
            this.runInstances.push(runInstance);
            this.runInstancePromises.push(runInstance.run());
        }

        return Promise.all(this.runInstancePromises)
            .then((values) => {
                if(this.pauseOnFail) {
                    return values[0];
                }
                else {
                    return true;
                }
            });
    }

    /**
     * Runs the next step, then pauses
     * Call only when already paused
     * @return {Promise} Same Promise that comes out of this.run()
     */
    runNextStep() {
        this.runOneStep = true;
        return this.run();
    }

    /**
     * Runs the given tree in the context of the first RunInstance in this.runInstances, then pause
     * Call only when already paused
     * The tree must have already had Tree.generateBranches() called
     * @return {Promise} Same Promise that comes out of this.run()
     * @throws {Error} If tree contains multiple branches, a Before Everything, or After Everything
     */
    injectAndRun(tree) {
        if(tree.branches.length > 1) {
            utils.error("What you inputted has multiple branches, and only one is allowed");
        }
        if(tree.beforeEverything.length > 1) {
            utils.error("What you inputted has a * Before Everything, and that's not allowed");
        }
        if(tree.afterEverything.length > 1) {
            utils.error("What you inputted has an * After Everything, and that's not allowed");
        }

        this.runInstances[0].injectAndRun(tree.branches[0]);
    }
}
module.exports = Runner;
