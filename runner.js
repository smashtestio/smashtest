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
        this.skipNextStep = false;       // If true, skips the next step, then pauses

        this.persistent = {};            // stores variables which persist from branch to branch, for the life of the Runner

        this.runInstances = [];          // the currently-running RunInstance objects, each running a branch

        this.reporter = {};              // the reporter to use for reports
    }

    /**
     * Starts or resumes running the branches from this.tree
     * Parallelizes runs to up to this.maxInstances simultaneously running tests
     * @return {Promise} Promise that gets resolved when completed or paused
     */
    async run() {
        this.tree.timeStarted = new Date();

        if(this.isStopped()) {
            utils.error("Cannot run a stopped runner");
        }

        let numInstances = Math.min(this.maxInstances, this.tree.branches.length);

        // If isDebug is set on any step, pauseOnFail will be set
        if(this.tree.isDebug) {
            this.pauseOnFail = true;
        }

        if(this.pauseOnFail && this.tree.branches.length > 1) {
            utils.error("Cannot set pauseOnFail when there is more than 1 branch");
        }

        if(this.isDebug && this.tree.branches.length > 1) {
            utils.error("Cannot debug when there is more than 1 branch");
            // NOTE: since Tree automatically outputs only 1 branch if there's a ~, this code is most probably unreachable
        }

        if(this.isPaused()) { // starting from a pause
            await this.resumeBranch();
            if(this.isPaused()) {
                this.tree.elapsed = -1;
            }
            else { // if we're done or we're stopped
                await this.runAfterEverything();
            }
        }
        else { // starting from the beginning
            if(await this.runBeforeEverything()) {
                // Before Everythings passed
                await this.runBranches(numInstances);
                if(this.isPaused()) {
                    this.tree.elapsed = -1;
                }
                else if(this.isStopped()) {
                    // don't do anything, since stop() will call runAfterEverything() immediately (as opposed to waiting for runBranches() to exit)
                }
                else { // if we're done or we're stopped
                    await this.runAfterEverything();
                }
            }
        }
    }

    /**
     * Ends all running RunInstances and runs afterEverything steps
     * @return {Promise} Promise that resolves as soon as the stop is complete
     */
    async stop() {
        this.runInstances.forEach(runInstance => {
            runInstance.stop();
        })
        await this.runAfterEverything();
    }

    /**
     * Runs the next step, then pauses
     * Call only when already paused
     * @return {Promise} Promise that resolves once the execution finishes, resolves to true if the branch is complete (including After Every Branch hooks), false otherwise
     */
    async runOneStep() {
        if(!this.isPaused()) {
            utils.error("Must already be paused to run one step");
        }

        let isBranchComplete = await this.runInstances[0].runOneStep();
        if(isBranchComplete) {
            await this.run(); // finish running After Everything hooks, etc.
        }

        return isBranchComplete;
    }

    /**
     * Skips the next step, then pauses
     * Call only when already paused
     * @return {Promise} Promise that resolves once the execution finishes, resolves to true if the branch is complete (including After Every Branch hooks), false otherwise
     */
    async skipOneStep() {
        if(!this.isPaused()) {
            utils.error("Must already be paused to skip a step");
        }

        let isBranchComplete = await this.runInstances[0].skipOneStep();
        if(isBranchComplete) {
            await this.run(); // finish running After Everything hooks, etc.
        }

        return isBranchComplete;
    }

    /**
     * Runs the given step in the context of the first RunInstance in this.runInstances, then pauses
     * Call only when already paused
     * @param {Step} step - The step to run
     * @return {Promise} Promise that gets resolved once done executing
     * @throws {Error} Any errors that may occur during a branchify() of the given step, or if this Runner isn't paused
     */
    injectStep(step) {
        if(!this.isPaused()) {
            utils.error("Must already be paused to run a step");
        }

        return this.runInstances[0].injectStep(step);
    }

    /**
     * @return {Boolean} True if we're paused, false otherwise
     */
    isPaused() {
        return this.runInstances.length == 1 && this.runInstances[0].isPaused;
    }

    /**
     * @return {Boolean} True if we're stopped, false otherwise
     */
    isStopped() {
        return this.runInstances.length > 0 && this.runInstances[0].isStopped;
    }

    // ***************************************
    // PRIVATE FUNCTIONS
    // Only use these internally
    // ***************************************

    /**
     * Resumes running the branch that was paused
     * @return {Promise} Promise that resolves once the branch finishes running, or a stop or pause occurs
     */
    async resumeBranch() {
        await this.runInstances[0].run();
    }

    /**
     * Executes all Before Everything steps, sequentially
     * @return {Promise} Promise that resolves to true if all of them passed, false if one of them failed
     */
    async runBeforeEverything() {
        let hookExecInstance = new RunInstance(this);
        for(let i = 0; i < this.tree.beforeEverything.length; i++) {
            let s = this.tree.beforeEverything[i];
            await hookExecInstance.runHookStep(s, s, null);
            if(s.error) {
                return false;
            }
        }

        return true;
    }

    /**
     * Executes all normal branches and steps, in parallel
     * @param {Number} numInstances - The maximum number of branches to run in parallel
     * @return {Promise} Promise that resolves once all of them finish running, or a stop or pause occurs
     */
    runBranches(numInstances) {
        // Spawn RunInstances, which will run in parallel
        let runInstancePromises = [];
        for(let i = 0; i < numInstances; i++) {
            let runInstance = new RunInstance(this);
            this.runInstances.push(runInstance);
            runInstancePromises.push(runInstance.run());
        }

        return Promise.all(runInstancePromises);
    }

    /**
     * Executes all After Everything steps, sequentially
     * @return {Promise} Promise that resolves once all of them finish running
     */
    async runAfterEverything() {
        let hookExecInstance = new RunInstance(this);
        for(let i = 0; i < this.tree.afterEverything.length; i++) {
            let s = this.tree.afterEverything[i];
            await hookExecInstance.runHookStep(s, s, null);
        }

        if(this.tree.elapsed != -1) {
            this.tree.elapsed = new Date() - this.tree.timeStarted; // only measure elapsed if we've never been paused
        }
    }
}
module.exports = Runner;
