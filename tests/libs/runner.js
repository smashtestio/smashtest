const chai = require('chai');
const chaiSubset = require('chai-subset');
const expect = chai.expect;
const assert = chai.assert;
const util = require('util');
const Tree = require('../../tree.js');
const Runner = require('../../runner.js');

chai.use(chaiSubset);

describe("Runner", function() {
    describe("run()", function() {
        it("throws an error when pauseOnFail is set but maxInstances isn't 1", function() {
            var runner = new Runner();
            var tree = new Tree();

            runner.pauseOnFail = true;
            runner.maxInstances = 2;
            runner.tree = tree;

            assert.throws(() => {
                runner.run();
            }, "maxInstances must be set to 1 since pauseOnFail is on");
        });

        it("throws an error when a ~ step exists but maxInstances isn't 1", function() {
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

            assert.throws(() => {
                runner.run();
            }, "maxInstances must be set to 1 since a ~ step exists");
        });

        it.skip("can spawn a single run instance that pauses", function() {
        });

        it.skip("can spawn a single run instance that completes", function() {
        });

        it.skip("can spawn a mulitple run instances, all of which complete", function() {
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
