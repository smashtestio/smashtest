const RunInstance = require('./runinstance.js');
const utils = require('./utils.js');

/**
 * Test runner
 */
class Runner {
    /**
     * Generates the runner
     */
    constructor(tree) {
        this.tree = tree;                // The tree to run (tree.generateBranches() must have been already called)
        this.reporter = {};              // the reporter to use

        this.maxInstances = 5;           // The maximum number of simultaneous branches to run
        this.noDebug = false;            // If true, a compile error will occur if a $ or ~ is present anywhere in the tree
        this.pauseOnFail = false;        // If true, pause and debug when a step fails (this.maxInstances must be set to 1)

        this.persistent = {};            // stores variables which persist from branch to branch, for the life of the Runner
        this.runInstances = [];          // the currently-running RunInstance objects, each running a branch

        this.isStopped = false;          // True if this runner has been stopped
    }

    /**
     * Starts or resumes running the branches from this.tree
     * Parallelizes runs to up to this.maxInstances simultaneously running tests
     * @return {Promise} Promise that gets resolved when completed or paused
     */
    async run() {
        this.tree.timeStarted = new Date();

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

        if(this.hasStopped()) { // starting from a stop
            utils.error("Cannot run a stopped runner");
        }
        else if(this.hasPaused()) { // starting from a pause
            await this.runInstances[0].run(); // resume that one branch that was paused
            if(this.hasPaused()) {
                this.tree.elapsed = -1;
            }
            else {
                await this.end();
            }
        }
        else { // starting from the beginning
            if(await this.runBeforeEverything()) {
                // Before Everythings passed
                await this.runBranches(numInstances);
                await this.end();
            }
            else {
                await this.end();
            }
        }
    }

    /**
     * Ends all running RunInstances and runs afterEverything steps
     * @return {Promise} Promise that resolves as soon as the stop is complete
     */
    async stop() {
        this.isStopped = true;
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
        if(!this.hasPaused()) {
            utils.error("Must be paused to run a step");
        }

        let isBranchComplete = await this.runInstances[0].runOneStep();
        if(isBranchComplete) {
            await this.runAfterEverything();
        }

        return isBranchComplete;
    }

    /**
     * Skips the next step, then pauses
     * Call only when already paused
     * @return {Promise} Promise that resolves once the execution finishes, resolves to true if the branch is complete (including After Every Branch hooks), false otherwise
     */
    async skipOneStep() {
        if(!this.hasPaused()) {
            utils.error("Must be paused to skip a step");
        }

        let isBranchComplete = await this.runInstances[0].skipOneStep();
        if(isBranchComplete) {
            await this.runAfterEverything();
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
    async injectStep(step) {
        if(!this.hasPaused()) {
            utils.error("Must be paused to run a step");
        }

        return await this.runInstances[0].injectStep(step);
    }

    /**
     * @return {Boolean} True if we're paused, false otherwise
     */
    hasPaused() {
        return this.runInstances.length == 1 && this.runInstances[0].isPaused;
    }

    /**
     * @return {Boolean} True if we're stopped, false otherwise
     */
    hasStopped() {
        return this.isStopped;
    }

    // ***************************************
    // PRIVATE FUNCTIONS
    // Only use these internally
    // ***************************************

    /**
     * Executes all Before Everything steps, sequentially
     * @return {Promise} Promise that resolves to true if all of them passed, false if one of them failed
     */
    async runBeforeEverything() {
        let hookExecInstance = new RunInstance(this);
        for(let i = 0; i < this.tree.beforeEverything.length; i++) {
            let s = this.tree.beforeEverything[i];
            await hookExecInstance.runHookStep(s, s, null);
            if(s.error || this.hasStopped()) {
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

    /**
     * Ending tasks, such as Run After Everything hooks
     */
    async end() {
        if(this.hasStopped()) {
            // don't do anything, since stop() will call runAfterEverything() immediately
        }
        else if(this.hasPaused()) {
            this.tree.elapsed = -1;
        }
        else {
            await this.runAfterEverything();
        }
    }
}
module.exports = Runner;
