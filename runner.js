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
        this.tree = null;                // The tree to run (just parsed in)
        this.reporter = null;            // The Reporter to use

        this.flags = [];                 // Array of strings, the flags passed in through the command line (e.g., ['-maxInstances=7', '-noDebug', '-groups="one two"] )

        this.groups = undefined;         // Only run branches that are a part of one of these groups, no restrictions if this is undefined
        this.minFrequency = undefined;   // Only run branches at or above this frequency, no restrictions if this is undefined
        this.noDebug = false;            // If true, a compile error will occur if a $ or ~ is present anywhere in the tree
        this.noReport = false;           // If true, do not output a report
        this.maxInstances = 5;           // The maximum number of simultaneous branches to run
        this.skipPassed = undefined; // If true, don't run and carry over branches that passed last time
        this.repl = false;               // If true, run the REPL immediately

        this.pauseOnFail = false;        // If true, pause when a step fails (there must only be one branch in the tree)
        this.consoleOutput = false;      // If true, output debug info to console

        this.persistent = {};            // stores variables which persist from branch to branch, for the life of the Runner
        this.globalInit = {};            // init each branch with these global variables
        this.runInstances = [];          // the currently-running RunInstance objects, each running a branch

        this.isPaused = false;           // True if this runner has been paused (set by the RunInstance within this.runInstances)
        this.isStopped = false;          // True if this runner has been stopped
        this.isComplete = false;         // True if this runner is done running its tree
    }

    /**
     * Initializes the runner with a tree and reporter
     */
    init(tree, reporter) {
        if(!this.noReport) {
            this.reporter = reporter;
        }
        this.tree = tree;

        this.tree.generateBranches(this.groups, this.minFrequency, this.noDebug);
    }

    /**
     * Starts or resumes running the branches from this.tree
     * Parallelizes runs to up to this.maxInstances simultaneously running tests
     * @return {Promise} Promise that gets resolved with true if completed, false otherwise
     */
    async run() {
        this.tree.timeStarted = new Date();
        await this.startReporter();

        let numInstances = Math.min(this.maxInstances, this.tree.branches.length);

        // If isDebug is set on any step, pauseOnFail will be set
        if(this.tree.isDebug) {
            this.pauseOnFail = true;
        }

        if(this.isStopped) { // starting from a stop
            utils.error("Cannot run a stopped runner");
        }
        else if(this.isPaused) { // starting from a pause
            await this.runInstances[0].run(); // resume that one branch that was paused
            if(this.isPaused) {
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

        await this.stopReporter();

        return this.getNextReadyStep() == null;
    }

    /**
     * Ends all running RunInstances and runs all After Everything hooks synchronously
     */
    stop() {
        if(!this.isStopped) {
            this.isStopped = true;
            this.runInstances.forEach(runInstance => {
                runInstance.stop();
            })
            this.runAfterEverything(true);
        }
    }

    /**
     * Runs the next step, then pauses
     * Call only when already paused
     * @return {Promise} Promise that resolves once the execution finishes, resolves to true if the branch is complete (including After Every Branch hooks), false otherwise
     */
    async runOneStep() {
        if(!this.isPaused) {
            utils.error("Must be paused to run a step");
        }

        await this.startReporter();

        let isBranchComplete = await this.runInstances[0].runOneStep();
        if(isBranchComplete) {
            await this.runAfterEverything();
        }

        await this.stopReporter();

        return isBranchComplete;
    }

    /**
     * Skips the next step, then pauses
     * Call only when already paused
     * @return {Promise} Promise that resolves once the execution finishes, resolves to true if the branch is complete (including After Every Branch hooks), false otherwise
     */
    async skipOneStep() {
        if(!this.isPaused) {
            utils.error("Must be paused to skip a step");
        }

        await this.startReporter();

        let isBranchComplete = await this.runInstances[0].skipOneStep();
        if(isBranchComplete) {
            await this.runAfterEverything();
        }

        await this.stopReporter();

        return isBranchComplete;
    }

    /**
     * Reruns the previous step
     * @return {Promise} Promise that resolves once the execution finishes
     */
    async runLastStep() {
        if(!this.isPaused) {
            utils.error("Must be paused to run a step");
        }

        await this.runInstances[0].runLastStep();
    }

    /**
     * Runs the given step in the context of the first RunInstance in this.runInstances, then pauses
     * Call only when already paused
     * @param {Step} step - The step to run
     * @return {Promise} Promise that gets resolved with a Branch of steps that were run, once done executing
     * @throws {Error} Any errors that may occur during a branchify() of the given step, or if this Runner isn't paused
     */
    async injectStep(step) {
        if(!this.isPaused) {
            utils.error("Must be paused to run a step");
        }

        let branchRan = await this.runInstances[0].injectStep(step);

        return branchRan;
    }

    /**
     * @return {Step} The next not-yet-completed step in the first RunInstance, or null if the first RunInstance's branch is done
     */
    getNextReadyStep() {
        if(this.runInstances.length == 0) {
            return null;
        }
        else {
            return this.runInstances[0].getNextReadyStep();
        }
    }

    /**
     * @return {Step} The last step run, null if none
     */
    getLastStep() {
        return this.runInstances[0].getLastStep();
    }

    /**
     * Creates a single empty RunInstance and pauses it
     * Will be used by -repl
     */
    createEmptyRunner() {
        this.runInstances = [ new RunInstance(this) ];
        this.runInstances[0].isPaused = true;
    }

    /**
     * @return {String} JSON representation of this Runner, but without variables, runInstances, tree, reporter, or other complex objects (that may have circular references)
     */
    serialize() {
        let obj = {};
        const BLACKLIST = [ 'persistent', 'globalInit', 'runInstances', 'tree', 'reporter' ];

        for(let property in this) {
            if(this.hasOwnProperty(property) && BLACKLIST.indexOf(property) == -1) {
                obj[property] = this[property];
            }
        }

        return JSON.stringify(obj);
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
            if(s.error || this.isStopped) {
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
     * @param {Boolean} [isSync] - If true, runs all After Everything steps synchronously
     * @return {Promise} Promise that resolves once all of them finish running
     */
    async runAfterEverything(isSync) {
        let hookExecInstance = new RunInstance(this);
        for(let i = 0; i < this.tree.afterEverything.length; i++) {
            let s = this.tree.afterEverything[i];
            if(isSync) {
                hookExecInstance.runHookStep(s, s, null, true);
            }
            else {
                await hookExecInstance.runHookStep(s, s, null);
            }
        }

        this.tree.timeEnded = new Date();
        if(this.tree.elapsed != -1) {
            this.tree.elapsed = this.tree.timeEnded - this.tree.timeStarted; // only measure elapsed if we've never been paused
        }

        this.isComplete = true;
    }

    /**
     * Ending tasks, such as Run After Everything hooks
     */
    async end() {
        if(this.isStopped) {
            // don't do anything, since stop() will call runAfterEverything() immediately
        }
        else if(this.isPaused) {
            this.tree.elapsed = -1;
        }
        else {
            await this.runAfterEverything();
        }
    }

    /**
     * Starts the reporter, if there is one
     */
    async startReporter() {
        if(this.reporter) {
            await this.reporter.start();
        }
    }

    /**
     * Stops the reporter, if there is one
     */
    async stopReporter() {
        if(this.reporter) {
            await this.reporter.stop();
        }
    }
}
module.exports = Runner;
