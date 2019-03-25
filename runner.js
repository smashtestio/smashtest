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
     * @return {Promise} Promise that gets resolved when completed or paused
     */
    async run() {
        var startTime = new Date();
        var hookExecInstance = null;

        // If pauseOnFail is set, maxInstances must be 1
        if(this.pauseOnFail && this.maxInstances != 1) {
            utils.error("maxInstances must be set to 1 since pauseOnFail is on");
        }

        // If isDebug is set on any step, maxInstances must be 1
        if(this.tree.isDebug && this.maxInstances != 1) {
            utils.error("maxInstances must be set to 1 since a ~ step exists");
        }

        if(this.runInstances.length == 0) { // we're starting from the beginning, as opposed to starting from a pause
            // Execute Before Everything steps
            hookExecInstance = new RunInstance(this);
            for(var i = 0; i < this.tree.beforeEverything.length; i++) {
                var s = this.tree.beforeEverything[i];
                await hookExecInstance.runStep(s, null, s, null);
            }

            // Spawn this.maxInstances RunInstances, which will run in parallel
            for(var i = 0; i < this.maxInstances; i++) {
                var runInstance = new RunInstance(this);
                this.runInstances.push(runInstance);
                this.runInstancePromises.push(runInstance.run());
            }
        }
        else if(this.runInstances.length == 1 && this.runInstances[0].isPaused) { // we're starting from a pause
            this.runInstancePromises.push(runInstance[0].run());
        }

        return Promise.all(this.runInstancePromises)
            .then(async (values) => {
                this.runInstancePromises = [];

                if(this.runInstances.length != 1 || !this.runInstances[0].isPaused) { // the tree was completely executed (or stopped) and we are not paused
                    // Execute After Everything steps
                    hookExecInstance = new RunInstance(this);
                    for(var i = 0; i < this.tree.afterEverything.length; i++) {
                        var s = this.tree.afterEverything[i];
                        await hookExecInstance.runStep(s, null, s, null);
                    }

                    this.tree.elapsed = new Date() - startTime;
                }
                else { // pause occured
                    this.tree.elapsed = -1;
                }
            });
    }

    /**
     * Ends all running RunInstances and runs afterEverything steps
     */
    stop() {
        this.runInstances.forEach(runInstance => {
            runInstance.stop();
        })
    }

    /**
     * Runs the next step, then pauses
     * Call only when already paused
     * @return {Promise} Promise that gets resolved once done executing
     */
    runNextStep() {
        this.runOneStep = true;
        return this.run();
    }

    /**
     * Runs the given step in the context of the first RunInstance in this.runInstances, then pauses
     * Call only when already paused
     * @param {Step} step - The step to run
     * @return {Promise} Promise that gets resolved once done executing
     */
    injectStep(step) {
        return this.runInstances[0].injectStep(step);
    }
}
module.exports = Runner;
