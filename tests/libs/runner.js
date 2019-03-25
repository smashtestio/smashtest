const chai = require('chai');
const chaiSubset = require('chai-subset');
const chaiAsPromised = require("chai-as-promised");
const expect = chai.expect;
const assert = chai.assert;
const util = require('util');
const Tree = require('../../tree.js');
const Runner = require('../../runner.js');

chai.use(chaiSubset);
chai.use(chaiAsPromised);

describe("Runner", function() {
    describe("run()", function() {
        it("throws an error when pauseOnFail is set but maxInstances isn't 1", async function() {
            var runner = new Runner();
            var tree = new Tree();

            runner.pauseOnFail = true;
            runner.maxInstances = 2;
            runner.tree = tree;

            await expect(runner.run()).to.be.rejectedWith("maxInstances must be set to 1 since pauseOnFail is on");
        });

        it("throws an error when a ~ step exists but maxInstances isn't 1", async function() {
            var runner = new Runner();
            var tree = new Tree();

            tree.parseIn(`
A -
    B - ~
C -
`);
            tree.generateBranches();

            runner.maxInstances = 5;
            runner.tree = tree;

            await expect(runner.run()).to.be.rejectedWith("maxInstances must be set to 1 since a ~ step exists");
        });

        it.skip("can spawn a single run instance that pauses", function() {
        });

        it.skip("can resume a paused run instance", function() {
        });

        it.skip("can spawn a single run instance that completes", function() {
        });

        it.skip("can spawn a multiple run instances, all of which complete", function() {
        });

        it.skip("can spawn a multiple run instances, but due to +'es only some of them actually run'", function() {
        });

        it.skip("runs all Before Everything steps", function() {
        });

        it.skip("runs all After Everything steps", function() {
        });

        it.skip("runs all After Everything steps but not the Before Everything steps on resume", function() {
        });

        it.skip("stores errors from Before Everything steps and stops execution", function() {
            // within the hook step itself
            // stops all execution at that failing hook
        });

        it.skip("stores errors from After Everything steps", function() {
            // an error within After Everything doesn't stop execution of the other After Everythings
        });

        it.skip("sets tree.elapsed to how long it took the tree to execute", function() {
            // Try two different trees, one that runs longer than the other, and assert that one > other
        });

        it.skip("sets tree.elapsed to how long it took the tree to execute when a stop ocurred", function() {
        });

        it.skip("sets tree.elapsed to -1 when a pause occurred", function() {
        });

        it.skip("sets tree.elapsed to -1 when a pause and resume occurred", function() {
        });
    });

    describe("stop()", function() {
        it.skip("stops all running run instances, time elapsed for the Tree is properly measured", function() {
        });

        it.skip("runs all After Everything steps immediately after a stop occurs", function() {
            // doesn't wait for all runInstances to end
        });
    });

    describe("runOneStep()", function() {
        it.skip("runs the next step, then pauses again", function() {
        });

        it.skip("works properly when paused at the very last step in the branch, which is not yet completed", function() {
        });

        it.skip("works properly when paused at the very last step in the branch, which completed already", function() {
            // After Everythings run
        });
    });

    describe("skipOneStep()", function() {
        it.skip("skips the next step, then pauses again", function() {
        });

        it.skip("works properly when paused at the very last step in the branch, which is not yet completed", function() {
            // After Everythings run
        });

        it.skip("works properly when paused at the very last step in the branch, which completed already", function() {
            // After Everythings run
        });
    });

    describe("injectStep()", function() {
        it.skip("injects a step and runs it, then pauses again", function() {
        });
    });
});
