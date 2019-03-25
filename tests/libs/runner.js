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

        it.skip("can spawn a mulitple run instances, all of which complete", function() {
        });

        it.skip("can spawn a mulitple run instances, but due to +'es only some of them actually run'", function() {
        });

        it.skip("runs all Before Everything steps", function() {
        });

        it.skip("runs all After Everything steps", function() {
        });

        it.skip("runs all After Everything steps but not the Before Everything steps on resume", function() {
        });

        it.skip("stores errors from Before Everything steps and pauses execution", function() {
            // within the hook step itself
        });

        it.skip("stores errors from After Everything steps and pauses execution", function() {
            // within the hook step itself
        });

        it.skip("stores errors from Before Everything steps and continues execution", function() {
        });

        it.skip("stores errors from After Everything steps and continues execution", function() {
        });

        it.skip("sets tree.elapsed to how long all branches took to execute", function() {
            // tree.elapsed
        });

        it.skip("sets tree.elapsed to -1 if a pause occured", function() {
            // tree.elapsed == -1
        });
    });

    describe("stop()", function() {
        it.skip("stops all running run instances", function() {
        });

        it.skip("runs all After Everything steps after a stop occurs", function() {
        });

        it.skip("time elapsed for the Tree is properly measured", function() {
        });
    });

    describe("runNextStep()", function() {
        it.skip("runs the next step, then pauses again", function() {
        });
    });

    describe("injectStep()", function() {
        it.skip("injects a step and runs it, then pauses again", function() {
        });
    });
});
