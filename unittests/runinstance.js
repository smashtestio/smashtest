const chai = require('chai');
const chaiSubset = require('chai-subset');
const expect = chai.expect;
const assert = chai.assert;
const util = require('util');
const Step = require('../step.js');
const Tree = require('../tree.js');
const Runner = require('../runner.js');
const RunInstance = require('../runinstance.js');

chai.use(chaiSubset);

describe("RunInstance", function() {
    describe("run()", function() {
        it.skip("TEXT", function() {
        });
    });

    describe("runStep()", function() {
        it.skip("TEXT", function() {
        });
    });

    describe("log()", function() {
        it("logs the first log string to the current step", function() {
            var step = new Step();
            var runner = new Runner();
            var runInstance = new RunInstance(runner);

            runInstance.currStep = step;
            runInstance.log("foobar");

            expect(step.log).to.equal("foobar\n");
        });

        it("logs a log string to the current step if it has existing logs", function() {
            var step = new Step();
            var runner = new Runner();
            var runInstance = new RunInstance(runner);

            runInstance.currStep = step;
            step.log = "foo\n";
            runInstance.log("bar");

            expect(step.log).to.equal("foo\nbar\n");
        });

        it("fails silently when there is no current step", function() {
            var step = new Step();
            var runner = new Runner();
            var runInstance = new RunInstance(runner);

            assert.doesNotThrow(() => {
                runInstance.log("foobar");
            });
        });
    });
});
