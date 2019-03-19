const chai = require('chai');
const chaiSubset = require('chai-subset');
const expect = chai.expect;
const assert = chai.assert;
const util = require('util');
const Step = require('../step.js');
const Branch = require('../branch.js');
const Tree = require('../tree.js');
const Runner = require('../runner.js');
const RunInstance = require('../runinstance.js');

chai.use(chaiSubset);

describe("RunInstance", function() {
    describe("run()", function() {
        it.skip("runs a branches it pulls from the tree", function() {
        });

        it.skip("waits while other RunInstances finish Before Everything hooks that are already running", function() {
        });

        it.skip("waits while other RunInstances finish steps before moving on to After Everything hooks", function() {
        });

        it.skip("handles a step that fails", function() {
        });

        it.skip("handles a step that fails the whole branch", function() {
        });

        it.skip("handles a step that pauses execution", function() {
        });

        it.skip("runs an After Every Branch hook and sets its local vars", function() {
            // local vars are successful and error
        });

        it.skip("runs multiple After Every Branch hooks", function() {
        });

        it.skip("handles an error inside an After Every Branch hook", function() {
            // error goes into the Branch object, but Branch doesn't fail
        });

        it.skip("handles pauses from inside an After Every Branch hook", function() {
        });
    });

    describe("runStep()", function() {
        it.skip("pauses when a ~ step is encountered", function() {
        });

        it.skip("pauses when runOneStep is set and after running one step", function() {
        });

        it.skip("doesn't pause when runOneStep is not set and after running one step", function() {
        });

        it.skip("pauses when pauseOnFail is set and a step fails", function() {
        });

        it.skip("pauses when pauseOnFail is set and a step unexpectedly passes", function() {
        });

        it.skip("doesn't pause when pauseOnFail is not set and a step fails", function() {
        });

        it.skip("marks a step as expectedly failed when it expectedly fails", function() {
            // also sets asExpected, error, and log in the step
        });

        it.skip("marks a step as unexpectedly failed when it unexpectedly fails", function() {
            // also sets asExpected, error, and log in the step
        });

        it.skip("marks a step as expectedly passed when it expectedly passes", function() {
            // also sets asExpected, error, and log in the step
        });

        it.skip("marks a step as unexpectedly passed when it unexpectedly passes", function() {
            // also sets asExpected, error, and log in the step
        });

        it.skip("executes a code block step", function() {
        });

        it.skip("handles bad syntax in a code block step", function() {
        });







        it.skip("runs an After Every Step hook and sets its local vars", function() {
            // local vars are successful and error
        });

        it.skip("runs multiple After Every Step hooks", function() {
        });

        it.skip("handles an error inside an After Every Step hook", function() {
            // error goes into the Branch object, but Branch doesn't fail
        });

        it.skip("handles pauses from inside an After Every Step hook", function() {
        });

        it.skip("updates the report", function() {
        });
    });

    describe("log()", function() {
        it("logs a string to the current step, where no other logs exist", function() {
            var step = new Step();
            var runner = new Runner();
            var runInstance = new RunInstance(runner);

            runInstance.currStep = step;
            runInstance.log("foobar");

            expect(step.log).to.equal("foobar\n");
        });

        it("logs a string to the current step, where other logs exist", function() {
            var step = new Step();
            var runner = new Runner();
            var runInstance = new RunInstance(runner);

            runInstance.currStep = step;
            step.log = "foo\n";
            runInstance.log("bar");

            expect(step.log).to.equal("foo\nbar\n");
        });

        it("logs a string to the current branch, where no other logs exist and where there is no current step", function() {
            var branch = new Branch();
            var runner = new Runner();
            var runInstance = new RunInstance(runner);

            runInstance.currBranch = branch;
            runInstance.log("foobar");

            expect(branch.log).to.equal("foobar\n");
        });

        it("logs a string to the current branch, where other logs exist and where there is no current step", function() {
            var branch = new Branch();
            var runner = new Runner();
            var runInstance = new RunInstance(runner);

            runInstance.currBranch = branch;
            branch.log = "foo\n";
            runInstance.log("bar");

            expect(branch.log).to.equal("foo\nbar\n");
        });

        it("fails silently when there is no current step or branch", function() {
            var step = new Step();
            var runner = new Runner();
            var runInstance = new RunInstance(runner);

            assert.doesNotThrow(() => {
                runInstance.log("foobar");
            });
        });
    });
});
