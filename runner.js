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
        this.tree = new Tree();          // The tree to run (tree.generateBranches() must have been already called)

        this.maxInstances = 5;           // The maximum number of simultaneous branches to run
        this.pauseOnFail = false;        // If true, pause and debug when a step fails (this.maxInstances must be set to 1)
        this.noDebug = false;            // If true, a compile error will occur if a $ or ~ is present anywhere in the tree

        this.persistant = {};            // stores variables which persist from branch to branch, for the life of the Runner

        this.runInstances = [];          // the currently-running RunInstance objects, each running a branch
        this.runInstancePromises = [];   // the promises returned from each RunInstance object
    }

    /**
     * Starts or resumes running the branches from this.tree
     * Parallelizes runs to up to this.maxInstances simultaneously running tests
     * @return {Promise} Promise that gets resolved with true if the entire tree was completed (regardless of passing or failing steps), resolved with false if a branch was paused
     */
    run() {
        if(this.pauseOnFail && this.maxInstances != 1) {
            utils.error("If pauseOnFail is on, maxInstances must be set to 1");
        }

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

    runNextStep() {

    }

    exec(tree) {

    }
}
