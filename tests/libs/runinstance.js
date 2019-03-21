const chai = require('chai');
const chaiSubset = require('chai-subset');
const expect = chai.expect;
const assert = chai.assert;
const util = require('util');
const Step = require('../../step.js');
const Branch = require('../../branch.js');
const Tree = require('../../tree.js');
const Runner = require('../../runner.js');
const RunInstance = require('../../runinstance.js');

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

        it.skip("handles a resume from a previous pause", function() {
            // just call run() again after the pause
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

        it.skip("handles resumes from pauses from inside an After Every Branch hook", function() {
        });

        it.skip("a {var} declared in a branch is accessible in an After Every Branch hook", function() {
        });

        it.skip("a {{var}} declared in a branch is accessible in an After Every Branch hook", function() {
        });

        it.skip("clears local and global variables between different branches", function() {
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

        it.skip("runs an Execute in browser step", function() {
        });

        it.skip("creates a fresh local var context within a function call", function() {
            // branchIndents increased by 1
        });

        it.skip("clears local vars and reinstates previous local var context when exiting a function call", function() {
            // branchIndents fell by 1
        });

        it.skip("clears local vars and reinstates previous local var context when exiting multiple levels of function calls", function() {
            // branchIndents fell by 2 or more
        });

        it.skip("a {var} is accessible in a later step", function() {
        });

        it.skip("a {var} is accessible inside function calls", function() {
        });

        it.skip("a {var} declared inside a function call is accessible in steps after the function call", function() {
        });

        it.skip("a {var} declared in a branch is accessible in an After Every Step hook", function() {
        });

        it.skip("a {{var}} is accessible in a later step", function() {
        });

        it.skip("a {{var}} is not accessible inside function calls", function() {
        });

        it.skip("a {{var}} declared inside a function call is not accessible in steps after the function call", function() {
        });

        it.skip("a {{var}} declared in a branch is accessible in an After Every Step hook", function() {
        });







        it.skip("runs an After Every Step hook and sets its local vars", function() {
            // local vars are successful and error
        });

        it.skip("runs multiple After Every Step hooks", function() {
        });

        it.skip("handles an error inside an After Every Step hook", function() {
            // error goes into the normal step obj, error.filename/lineNumber point at the hook
        });

        it.skip("handles pauses from inside an After Every Step hook", function() {
        });

        it.skip("runs an After Every Branch hook and sets its local vars", function() {
            // local vars are successful and error
        });

        it.skip("runs multiple After Every Branch hooks", function() {
        });

        it.skip("handles an error inside an After Every Branch hook", function() {
            // error goes into the branch obj, error.filename/lineNumber point at the hook, branch is failed
        });

        it.skip("handles pauses from inside an After Every Step hook", function() {
        });

        it.skip("updates the report", function() {
        });
    });

    describe("replaceVars()", function() {
        it("replaces {vars} and {{vars}} with their values", function() {
            var tree = new Tree();
            tree.parseIn(`
A -
    {var1}='value1'
        {{var2}} = 'value2'
            {var 3}= "value 3"
                {{ var 4 }}=" value 4 "
`, "file.txt");

            tree.generateBranches();

            var runner = new Runner();
            runner.tree = tree;
            var runInstance = new RunInstance(runner);
            runInstance.global.var0 = "value0";

            expect(runInstance.replaceVars("{var0} {var1} - {{var2}}{var 3}-{{var 4}}", tree.branches[0].steps[0], tree.branches[0])).to.equal("value0 value1 - value2value 3- value 4 ");
        });

        it("doesn't affect a string that doesn't contain variables", function() {
            var tree = new Tree();
            tree.parseIn(`
A -
`, "file.txt");

            tree.generateBranches();

            var runner = new Runner();
            runner.tree = tree;
            var runInstance = new RunInstance(runner);

            expect(runInstance.replaceVars("foo bar", tree.branches[0].steps[0], tree.branches[0])).to.equal("foo bar");
        });
    });

    describe("findVarValue()", function() {
        it("returns the value of a local variable that's already set", function() {









            
        });

        it.skip("returns the value of a global variable that's already set", function() {
        });

        it.skip("returns the value of a variable that's not set yet and whose eventual value is a plain string", function() {
            // verify a look-down was logged
        });

        it.skip("returns the value of a variable that's not set yet and whose eventual value contains more variables", function() {
            // if the original step is A, and its vars are defined in B, then's B's vars are defined
            // 1) before A, 2) between A and B, and 3) after B
        });

        it.skip("returns the value of a variable that's not set yet and whose eventual value is generated from a code block function", function() {
        });

        it.skip("throws an error if the variable's value is never set", function() {
        });

        it.skip("throws an error if the variable's value contains more variables, but one of those variables is never set", function() {
        });
    });

    describe("log()", function() {
        it("logs a string to a step, where no other logs exist", function() {
            var step = new Step();
            var runner = new Runner();
            var runInstance = new RunInstance(runner);

            runInstance.log("foobar", step);

            expect(step.log).to.equal("foobar\n");
        });

        it("logs a string to a step, where other logs exist", function() {
            var step = new Step();
            var branch = new Branch();
            var runner = new Runner();
            var runInstance = new RunInstance(runner);

            step.log = "foo\n";
            runInstance.log("bar", step, branch);

            expect(step.log).to.equal("foo\nbar\n");
        });

        it("logs a string to a branch, where no other logs exist and where there is no step", function() {
            var branch = new Branch();
            var runner = new Runner();
            var runInstance = new RunInstance(runner);

            runInstance.log("foobar", null, branch);

            expect(branch.log).to.equal("foobar\n");
        });

        it("logs a string to a branch, where other logs exist and where there is no step", function() {
            var branch = new Branch();
            var runner = new Runner();
            var runInstance = new RunInstance(runner);

            branch.log = "foo\n";
            runInstance.log("bar", null, branch);

            expect(branch.log).to.equal("foo\nbar\n");
        });

        it("fails silently when there is no step or branch", function() {
            var step = new Step();
            var runner = new Runner();
            var runInstance = new RunInstance(runner);

            assert.doesNotThrow(() => {
                runInstance.log("foobar", null, null);
            });
        });
    });
});
