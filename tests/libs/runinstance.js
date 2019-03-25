const chai = require('chai');
const chaiSubset = require('chai-subset');
const chaiAsPromised = require("chai-as-promised");
const expect = chai.expect;
const assert = chai.assert;
const util = require('util');
const Step = require('../../step.js');
const Branch = require('../../branch.js');
const Tree = require('../../tree.js');
const Runner = require('../../runner.js');
const RunInstance = require('../../runinstance.js');

chai.use(chaiSubset);
chai.use(chaiAsPromised);

describe("RunInstance", function() {
    describe("run()", function() {
        it.skip("runs a branch it pulls from the tree", function() {
        });

        it.skip("runs multiple branches it pulls from the tree", function() {
        });

        it.skip("handles a step that fails but doesn't stop execution", function() {
        });

        it.skip("handles a step that fails and ends executing the branch", function() {
        });

        it.skip("handles a step that pauses execution", function() {
        });

        it.skip("handles a resume from a previous pause, where the current step never ran", function() {
            // current step is run
            // just call run() again after the pause
        });

        it.skip("handles a resume from a previous pause, where the current step completed", function() {
            // next step is pulled out
        });

        it.skip("runs a Before Every Branch hook", function() {
        });

        it.skip("runs an After Every Branch hook and sets its local vars", function() {
            // local vars are successful and error
        });

        it.skip("runs multiple Before Every Branch and After Every Branch hooks", function() {
        });

        it.skip("handles an error inside a Before Every Branch hook", function() {
            // error goes into the Branch object, Branch fails
        });

        it.skip("handles an error inside an After Every Branch hook", function() {
            // error goes into the Branch object, Branch fails
        });

        it.skip("handles a pause from inside a Before Every Branch hook", function() {
        });

        it.skip("handles a pause from inside an After Every Branch hook", function() {
        });

        it.skip("handles resumes from pauses from inside a Before Every Branch hook", function() {
            // the same branch runs again, starting from the same Before Every Branch step
        });

        it.skip("handles resumes from pauses from inside an After Every Branch hook", function() {

        });

        it.skip("a {var} and {{var}} declared in a branch is accessible in an After Every Branch hook", function() {
        });

        it.skip("clears local and global variables between different branches", function() {
        });

        it.skip("sets branch.elapsed to how long it took branch to execute", function() {
            // branch.elapsed
        });

        it.skip("sets branch.elapsed to -1 if a pause occured", function() {
            // tree.elapsed == -1
        });
    });

    describe("runStep()", function() {
        it.skip("executes a textual step", function() {
        });

        it.skip("executes a step with a code block", function() {
            // have code block set a flag in RunInstance, then verify here that this flag was set
        });

        it.skip("executes a function call with no {{variables}} in its function declaration", function() {
        });

        it.skip("executes a function call with {{variables}} in its function declaration, passing in 'strings'", function() {
        });

        it.skip("executes a function call with {{variables}} in its function declaration, passing in \"strings\"", function() {
        });

        it.skip("executes a function call with {{variables}} in its function declaration, passing in {variables}", function() {
            // trim vars
        });

        it.skip("executes a function call with {{variables}} in its function declaration, passing in {{variables}}", function() {
            // trim vars
        });

        it.skip("executes a function call with {{variables}} in its function declaration, passing in 'strings containing {variables}'", function() {
        });

        it.skip("executes a function call with {{variables}} in its function declaration, passing in \"strings containing {{variables}}\"", function() {
        });

        it.skip("executes a function call with {{variables}} in its function declaration, passing in [ElementFinders]", function() {
        });

        it.skip("executes a function call with {{variables}} in its function declaration, passing in [ElementFinders containing {variables}]", function() {
        });

        it.skip("executes a function call with {{variables}} in its function declaration, passing in 'strings', \"strings\", {variables}, and [ElementFinders]", function() {
        });

        it.skip("executes a function call where {variables} are passed in and are only set in a later step, which is in format {var}='string'", function() {
        });

        it.skip("executes a function call where {variables} are passed in and are only set in a later step, which is a synchronous code block", function() {
        });

        it.skip("throws an error if a function call has a {variable} passed in and it is only set in a later step, which is an asynchronous code block", function() {
        });

        it.skip("executes a function call where 'strings' containing vars are passed in and those vars are only set in a later step, which is in format {var}='string'", function() {
        });

        it.skip("executes a function call where 'strings' containing vars are passed in and those vars are only set in a later step, which is a synchronous code block", function() {
        });

        it.skip("throws an error if a function call has a 'string' containing a var passed in and that var is only set in a later step, which is an asynchronous code block", function() {
        });

        it.skip("executes a function call where [ElementFinders] containing vars are passed in and those vars are only set in a later step, which is in format {var}='string'", function() {
        });

        it.skip("executes a function call where [ElementFinders] containing vars are passed in and those vars are only set in a later step, which is a synchronous code block", function() {
        });

        it.skip("throws an error if a function call has an [ElementFinder] containing a var passed in and that var is only set in a later step, which is an asynchronous code block", function() {
        });

        it.skip("executes a function call where the function has no steps inside of it", function() {
        });

        it.skip("allows {{variables}} passed in through a function call to be accessed by steps inside the function", function() {
        });

        it.skip("allows {{variables}} passed in through a function call to be accessed by the function's code block", function() {
        });

        it.skip("ignores {{variables}} inside the text of a textual step", function() {
        });

        it.skip("ignores {{variables}} inside the text of a textual step with a code block, but those {{variables}} are still accessible inside the code block nonetheless", function() {
        });

        it.skip("executes a {var} = 'string' step", function() {
        });

        it.skip("executes a {{var}} = 'string' step", function() {
        });

        it.skip("executes a {var} = '{other var}' step", function() {
        });

        it.skip("executes a {var1} = '{var2} {{var3}} etc.' step", function() {
            // trim vars
        });

        it.skip("executes a {var1} = '{var2} {{var3}} etc.' step that needs to look down the branch for the values of some variables", function() {
            // trim vars
        });

        it.skip("executes a {var1} = 'string1', {{var2}} = 'string2', etc. step", function() {
            // trim vars
        });

        it.skip("executes a {var} = Text { code block } step", function() {
        });

        it.skip("executes a {var} = Function step, where the function declaration has a code block that returns a value", function() {
        });

        it.skip("executes a {var} = Function step, where the function declaration is in {x}='value' format", function() {
        });

        it.skip("allows a code block to get variables via the local, global, and persistent objects", function() {
        });

        it.skip("makes a passed-in {variable} accessible as a plain js variable inside a code block", function() {
            // verify the change reflected in the global obj after the function ran
        });

        it.skip("makes a passed-in {{variable}} accessible as a plain js variable inside a code block", function() {
            // verify the change reflected in the local obj after the function ran
        });

        it.skip("does not make a passed-in {{variable}} accessible as a plain js variable inside a code block if it has non-whitelisted chars in its name", function() {
            // whitelisted chars = [A-Za-z0-9\-\_\.]
        });

        it.skip("makes a {variable} accessible as a plain js variable inside a code block", function() {
            // verify the change reflected in the global obj after the function ran
        });

        it.skip("makes a {{variable}} accessible as a plain js variable inside a code block", function() {
            // verify the change reflected in the local obj after the function ran
        });

        it.skip("does not make a {{variable}} accessible as a plain js variable inside a code block if it has non-whitelisted chars in its name", function() {
            // whitelisted chars = [A-Za-z0-9\-\_\.]
        });

        it.skip("runs an Execute In Browser step", function() {
            // inject runinstance.execInBrowser(code) function first
        });

        it.skip("executes a step that throws an error", function() {
        });

        it.skip("executes a step that logs", function() {
        });

        it.skip("pauses when a ~ step is encountered", function() {
        });

        it.skip("runs one step and pauses again when runOneStep is set", function() {
        });

        it.skip("skips a step and pauses again when skipNextStep is set", function() {
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

        it.skip("handles bad syntax in a code block step", function() {
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

        it.skip("a {{var}} declared in a branch is accessible in an After Every Step hook, so long as it didn't go out of scope", function() {
        });

        it.skip("runs a Before Every Step hook", function() {
        });

        it.skip("runs an After Every Step hook and sets its local vars", function() {
            // local vars are successful and error
        });

        it.skip("runs multiple Before Every Step and After Every Step hooks", function() {
        });

        it.skip("handles an error inside a Before Every Step hook", function() {
            // error goes into the normal step obj, error.filename/lineNumber point at the hook
        });

        it.skip("handles an error inside an After Every Step hook", function() {
            // error goes into the normal step obj, error.filename/lineNumber point at the hook
        });

        it.skip("handles pauses from inside a Before Every Step hook", function() {
        });

        it.skip("handles pauses from inside an After Every Step hook", function() {
        });

        it.skip("updates the report", function() {
        });

        it.skip("sets step.elapsed to how long it took step to execute", function() {
            // step.elapsed
        });
    });

    describe("replaceVars()", function() {
        it("replaces {vars} and {{vars}} with their values", function() {
            var tree = new Tree();
            tree.parseIn(`
A -
    {var1}='value1'
        {{var2}} = 'value2'
            {var 3}= "value 3", {{var5}} ='value5',{var6}="value6"
                {{ var 4 }}=" value 4 "
`, "file.txt");

            tree.generateBranches();

            var runner = new Runner();
            runner.tree = tree;
            var runInstance = new RunInstance(runner);
            runInstance.setGlobal("var0", "value0");

            expect(runInstance.replaceVars("{var0} {var1} - {{var2}}{var 3}-{{var 4}}  {{var5}} {var6}", tree.branches[0].steps[0], tree.branches[0])).to.equal("value0 value1 - value2value 3- value 4   value5 value6");
        });

        it("handles a branch of null", function() {
            var tree = new Tree();
            tree.parseIn(`
{var1}='value1'
`, "file.txt");

            tree.generateBranches();

            var runner = new Runner();
            runner.tree = tree;
            var runInstance = new RunInstance(runner);
            runInstance.setGlobal("var0", "value0");

            expect(runInstance.replaceVars("{var1} {var1}", tree.branches[0].steps[0], null)).to.equal("value1 value1");
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

        it("throws an error when vars reference each other in an infinite loop", function() {
            var tree = new Tree();
            tree.parseIn(`
A -
    {var1}='{var1}'
`, "file.txt");

            tree.generateBranches();

            var runner = new Runner();
            runner.tree = tree;
            var runInstance = new RunInstance(runner);

            assert.throws(() => {
                runInstance.replaceVars("{var1}", tree.branches[0].steps[0], tree.branches[0]);
            }, "Infinite loop detected amongst variable references [file.txt:2]");

            tree = new Tree();
            tree.parseIn(`
A -
    {var1}='{var2} {var3}'
        {var2}='foo'
            {var3}='bar{var1}'
`, "file.txt");

            tree.generateBranches();

            var runner = new Runner();
            runner.tree = tree;
            var runInstance = new RunInstance(runner);

            assert.throws(() => {
                expect(runInstance.replaceVars("{var1}", tree.branches[0].steps[0], tree.branches[0]));
            }, "Infinite loop detected amongst variable references [file.txt:2]");
        });
    });

    describe("evalCodeBlock()", function() {
        it("evals a code and returns a value asynchonously", async function() {
            var runner = new Runner();
            var runInstance = new RunInstance(runner);

            await expect(runInstance.evalCodeBlock("return 5;")).to.eventually.equal(5);
        });

        it("evals a code and returns a value synchronously", function() {
            var runner = new Runner();
            var runInstance = new RunInstance(runner);

            expect(runInstance.evalCodeBlock("return 5;", true)).to.equal(5);
        });

        it("returns undefined when executing code that has no return value synchronously", function() {
            var runner = new Runner();
            var runInstance = new RunInstance(runner);

            expect(runInstance.evalCodeBlock("5;", true)).to.equal(undefined);
        });

        it("makes the persistent, global, and local objects available", async function() {
            var runner = new Runner();
            var runInstance = new RunInstance(runner);
            runInstance.setPersistent("a", "A");
            runInstance.setGlobal("b", "B");
            runInstance.setLocal("c", "C");

            await expect(runInstance.evalCodeBlock("return getPersistent('a');")).to.eventually.equal("A");
            await expect(runInstance.evalCodeBlock("return getGlobal('b');")).to.eventually.equal("B");
            await expect(runInstance.evalCodeBlock("return getLocal('c');")).to.eventually.equal("C");

            await runInstance.evalCodeBlock("setPersistent('a', 'AA'); setGlobal('b', 'BB'); setLocal('c', 'CC');");

            expect(runInstance.getPersistent("a")).to.equal("AA");
            expect(runInstance.getGlobal("b")).to.equal("BB");
            expect(runInstance.getLocal("c")).to.equal("CC");
        });

        it("makes persistent, global, and local variables available as js variables", async function() {
            var runner = new Runner();
            var runInstance = new RunInstance(runner);
            runInstance.setPersistent('a', "A");
            runInstance.setGlobal('b', "B");
            runInstance.setLocal('c', "C");

            await expect(runInstance.evalCodeBlock("return a;")).to.eventually.equal("A");
            await expect(runInstance.evalCodeBlock("return b;")).to.eventually.equal("B");
            await expect(runInstance.evalCodeBlock("return c;")).to.eventually.equal("C");
        });

        it("makes a local variable accessible as a js variable if both a local and global variable share the same name", async function() {
            var runner = new Runner();
            var runInstance = new RunInstance(runner);
            runInstance.setGlobal('b', "B");
            runInstance.setLocal('b', "C");

            await expect(runInstance.evalCodeBlock("return b;")).to.eventually.equal("C");
        });

        it("makes a global variable accessible as a js variable if both a global and persistent variable share the same name", async function() {
            var runner = new Runner();
            var runInstance = new RunInstance(runner);
            runInstance.setPersistent('b', "B");
            runInstance.setGlobal('b', "C");

            await expect(runInstance.evalCodeBlock("return b;")).to.eventually.equal("C");
        });

        it("makes a local variable accessible as a js variable if both a local and persistent variable share the same name", async function() {
            var runner = new Runner();
            var runInstance = new RunInstance(runner);
            runInstance.setPersistent('b', "B");
            runInstance.setLocal('b', "C");

            await expect(runInstance.evalCodeBlock("return b;")).to.eventually.equal("C");
        });

        it("does not make a variable available as js variable if its name contains non-whitelisted characters", async function() {
            var runner = new Runner();
            var runInstance = new RunInstance(runner);
            runInstance.setPersistent(" one two ", "A");
            runInstance.setGlobal("three four", "B");
            runInstance.setLocal("five>six", "C");
            runInstance.setLocal("seven", "D");

            await expect(runInstance.evalCodeBlock("return seven;")).to.eventually.equal("D");
        });

        it("allows for logging inside the code", async function() {
            var runner = new Runner();
            var runInstance = new RunInstance(runner);
            var step = new Step();

            await runInstance.evalCodeBlock("log('foobar');", false, step);

            expect(step.log).to.equal("foobar\n");
        });
    });

    describe("findVarValue()", function() {
        it("returns the value of a local variable that's already set", function() {
            var tree = new Tree();
            tree.parseIn(`
A -
`, "file.txt");

            tree.generateBranches();

            var runner = new Runner();
            runner.tree = tree;
            var runInstance = new RunInstance(runner);
            runInstance.setLocal("var0", "value0");

            expect(runInstance.findVarValue("var0", true, tree.branches[0].steps[0], tree.branches[0])).to.equal("value0");
        });

        it("returns the value of a global variable that's already set", function() {
            var tree = new Tree();
            tree.parseIn(`
A -
`, "file.txt");

            tree.generateBranches();

            var runner = new Runner();
            runner.tree = tree;
            var runInstance = new RunInstance(runner);
            runInstance.setGlobal("var0", "value0");

            expect(runInstance.findVarValue("var0", false, tree.branches[0].steps[0], tree.branches[0])).to.equal("value0");
        });

        it("returns the value of a variable that's set on the same line, and with a branch of null", function() {
            var tree = new Tree();
            tree.parseIn(`
{var1}='value1'
`, "file.txt");

            tree.generateBranches();

            var runner = new Runner();
            runner.tree = tree;
            var runInstance = new RunInstance(runner);

            expect(runInstance.findVarValue("var1", false, tree.branches[0].steps[0], null)).to.equal("value1");
        });

        it("returns the value of a variable that's not set yet and whose eventual value is a plain string", function() {
            var tree = new Tree();
            tree.parseIn(`
A -
    {var1}="value1"
`, "file.txt");

            tree.generateBranches();

            var runner = new Runner();
            runner.tree = tree;
            var runInstance = new RunInstance(runner);

            expect(runInstance.findVarValue("var1", false, tree.branches[0].steps[0], tree.branches[0])).to.equal("value1");
            expect(tree.branches[0].steps[0].log).to.equal("The value of variable {var1} is being set by a later step at file.txt:3\n");
        });

        it("returns the value of a variable given the same variable name in a different case", function() {
            var tree = new Tree();
            tree.parseIn(`
A -
    {var one}="value1"
`, "file.txt");

            tree.generateBranches();

            var runner = new Runner();
            runner.tree = tree;
            var runInstance = new RunInstance(runner);

            expect(runInstance.findVarValue("VAR ONE", false, tree.branches[0].steps[0], tree.branches[0])).to.equal("value1");
            expect(tree.branches[0].steps[0].log).to.equal("The value of variable {VAR ONE} is being set by a later step at file.txt:3\n");
        });

        it("returns the value of a variable given the same variable name but with varying amounts of whitespace", function() {
            var tree = new Tree();
            tree.parseIn(`
A -
    { var  one  }="value1"
`, "file.txt");

            tree.generateBranches();

            var runner = new Runner();
            runner.tree = tree;
            var runInstance = new RunInstance(runner);

            expect(runInstance.findVarValue("var one", false, tree.branches[0].steps[0], tree.branches[0])).to.equal("value1");
            expect(tree.branches[0].steps[0].log).to.equal("The value of variable {var one} is being set by a later step at file.txt:3\n");

            tree = new Tree();
            tree.parseIn(`
A -
    {var one}="value1"
`, "file.txt");

            tree.generateBranches();

            var runner = new Runner();
            runner.tree = tree;
            var runInstance = new RunInstance(runner);

            expect(runInstance.findVarValue("    Var     ONE     ", false, tree.branches[0].steps[0], tree.branches[0])).to.equal("value1");
            expect(tree.branches[0].steps[0].log).to.equal("The value of variable {    Var     ONE     } is being set by a later step at file.txt:3\n");
        });

        it("returns the value of a variable that's not set yet and whose eventual value contains more variables", function() {
            // If the original step is A, and its vars are defined in B, then's B's vars are defined 1) before A, 2) between A and B, and 3) after B
            var tree = new Tree();
            tree.parseIn(`
A -
    {{var2}} = 'value2'
        {var1}='{{var2}} {var 3} . {var0} {{var5}}'
            {var 3}= "-{{var 4}}-", {{var5}}='value5'
                B -
                    {{ var 4 }}=" value 4 "
`, "file.txt");

            tree.generateBranches();

            var runner = new Runner();
            runner.tree = tree;
            var runInstance = new RunInstance(runner);
            runInstance.setGlobal("var0", "value0");

            expect(runInstance.findVarValue("var1", false, tree.branches[0].steps[0], tree.branches[0])).to.equal("value2 - value 4 - . value0 value5");
            expect(tree.branches[0].steps[0].log).to.equal(`The value of variable {{var2}} is being set by a later step at file.txt:3
The value of variable {{var 4}} is being set by a later step at file.txt:7
The value of variable {var 3} is being set by a later step at file.txt:5
The value of variable {{var5}} is being set by a later step at file.txt:5
The value of variable {var1} is being set by a later step at file.txt:4
`);
        });

        it("returns the value of a variable that's not set yet and whose eventual value is generated from a sync code block function", function() {
            var tree = new Tree();
            tree.parseIn(`
A -
    {var1} = F {
        return "foobar";
    }

        {var2} = F2

        * F2 {
            return "blah";
        }
`, "file.txt");

            tree.generateBranches();

            var runner = new Runner();
            runner.tree = tree;
            var runInstance = new RunInstance(runner);

            expect(runInstance.findVarValue("var1", false, tree.branches[0].steps[0], tree.branches[0])).to.equal("foobar");
            expect(tree.branches[0].steps[0].log).to.equal("The value of variable {var1} is being set by a later step at file.txt:3\n");

            expect(runInstance.findVarValue("var2", false, tree.branches[0].steps[0], tree.branches[0])).to.equal("blah");
            expect(tree.branches[0].steps[0].log).to.equal(`The value of variable {var1} is being set by a later step at file.txt:3
The value of variable {var2} is being set by a later step at file.txt:7
`);
        });

        it("throws an error if the variable's value is never set", function() {
            var tree = new Tree();
            tree.parseIn(`
A -
    {var1}="value1"
`, "file.txt");

            tree.generateBranches();

            var runner = new Runner();
            runner.tree = tree;
            var runInstance = new RunInstance(runner);

            assert.throws(() => {
                runInstance.findVarValue("var2", false, tree.branches[0].steps[0], tree.branches[0]);
            }, "The variable {var2} is never set, but is needed for this step [file.txt:2]");
        });

        it("throws an error if the variable's value contains more variables, but one of those variables is never set", function() {
            var tree = new Tree();
            tree.parseIn(`
A -
    {var1}="-{{var2}}-"
        {{var3}}="-{var4}-"
`, "file.txt");

            tree.generateBranches();

            var runner = new Runner();
            runner.tree = tree;
            var runInstance = new RunInstance(runner);

            assert.throws(() => {
                runInstance.findVarValue("var1", false, tree.branches[0].steps[0], tree.branches[0]);
            }, "The variable {{var2}} is never set, but is needed for this step [file.txt:2]");

            assert.throws(() => {
                runInstance.findVarValue("var3", true, tree.branches[0].steps[0], tree.branches[0]);
            }, "The variable {var4} is never set, but is needed for this step [file.txt:2]");
        });
    });

    describe("appendToLog()", function() {
        it("logs a string to a step, where no other logs exist", function() {
            var step = new Step();
            var runner = new Runner();
            var runInstance = new RunInstance(runner);

            runInstance.appendToLog("foobar", step);

            expect(step.log).to.equal("foobar\n");
        });

        it("logs a string to a step, where other logs exist", function() {
            var step = new Step();
            var branch = new Branch();
            var runner = new Runner();
            var runInstance = new RunInstance(runner);

            step.log = "foo\n";
            runInstance.appendToLog("bar", step, branch);

            expect(step.log).to.equal("foo\nbar\n");
        });

        it("logs a string to a branch, where no other logs exist and where there is no step", function() {
            var branch = new Branch();
            var runner = new Runner();
            var runInstance = new RunInstance(runner);

            runInstance.appendToLog("foobar", null, branch);

            expect(branch.log).to.equal("foobar\n");
        });

        it("logs a string to a branch, where other logs exist and where there is no step", function() {
            var branch = new Branch();
            var runner = new Runner();
            var runInstance = new RunInstance(runner);

            branch.log = "foo\n";
            runInstance.appendToLog("bar", null, branch);

            expect(branch.log).to.equal("foo\nbar\n");
        });

        it("fails silently when there is no step or branch", function() {
            var step = new Step();
            var runner = new Runner();
            var runInstance = new RunInstance(runner);

            assert.doesNotThrow(() => {
                runInstance.appendToLog("foobar", null, null);
            });
        });
    });

    describe("injectStep()", function() {
        it.skip("runs a step, then pauses again", function() {
        });

        it.skip("step has access to {{vars}} and {vars} that were defined at the time of the pause", function() {
        });

        it.skip("attaches an error to the step passed in if it fails", function() {
            // and doesn't attach the error to this.currStep or this.currBranch
        });

        it.skip("the RunInstance can flawlessly resume from a pause, after an injected step has run", function() {
            // make sure the right next step is executed
        });
    });

    describe("stop()", function() {
        it.skip("stops the RunInstance, time elapsed for the Branch is properly measured, and no more steps are running", function() {
            // check Step.isRunning of all steps
        });
    });
});
