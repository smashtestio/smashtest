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
        it("can spawn a single run instance that pauses", async function() {
            let tree = new Tree();
            tree.parseIn(`




`, "file.txt");

            tree.generateBranches();

            let runner = new Runner(tree);

            await runner.run();

            expect(true).to.be.true;











        });

        it.skip("can resume a paused run instance", async function() {
        });

        it.skip("can spawn a single run instance that completes", async function() {
        });

        it.skip("can spawn a multiple run instances, all of which complete", async function() {
        });

        it.skip("can spawn a multiple run instances, but due to +'es only some of them actually run'", async function() {
        });

        it.skip("pauses before a ~ step is executed", async function() {
        });

        it.skip("pauses after an unexpected fail occurs on a step that's inside a branch with ~ anywhere", async function() {
        });

        it.skip("when resuming from a pause on a ~, doesn't pause on the same ~ again", async function() {
        });

        it.skip("runs all Before Everything steps", async function() {
        });

        it.skip("runs all After Everything steps", async function() {
        });

        it.skip("runs all After Everything steps but not the Before Everything steps on resume", async function() {
        });

        it.skip("stores errors from Before Everything steps and stops execution", async function() {
            // within the hook step itself
            // stops all execution at that failing hook
        });

        it.skip("stores errors from After Everything steps", async function() {
            // an error within After Everything doesn't stop execution of the other After Everythings
        });

        it.skip("sets tree.elapsed to how long it took the tree to execute", async function() {
            // Try two different trees, one that runs longer than the other, and assert that one > other
        });

        it.skip("sets tree.elapsed to how long it took the tree to execute when a stop ocurred", async function() {
        });

        it.skip("sets tree.elapsed to -1 when a pause occurred", async function() {
        });

        it.skip("sets tree.elapsed to -1 when a pause and resume occurred", async function() {
        });
    });

    describe("stop()", function() {
        it.skip("stops all running run instances, time elapsed for the Tree is properly measured", async function() {
            // have multiple branches running at the same time
        });

        it.skip("runs all After Everything steps immediately after a stop occurs", async function() {
            // doesn't wait for all runInstances to end
        });
    });

    describe("runOneStep()", function() {
        it.skip("runs the next step, then pauses again", async function() {
        });

        it.skip("works properly when paused at the very last step in the branch, which is not yet completed", async function() {
        });

        it.skip("works properly when paused at the very last step in the branch, which completed already", async function() {
            // After Everythings run
        });
    });

    describe("skipOneStep()", function() {
        it.skip("skips the next step, then pauses again", async function() {
        });

        it.skip("works properly when paused at the very last step in the branch, which is not yet completed", async function() {
            // After Everythings run
        });

        it.skip("works properly when paused at the very last step in the branch, which completed already", async function() {
            // After Everythings run
        });
    });

    describe("injectStep()", function() {
        it("injects a step and runs it, then pauses again", async function() {
            let tree = new Tree();
            tree.parseIn(`
A {
    runInstance.runner.ranStepA = !runInstance.runner.ranStepA;
}

    B ~ {
        runInstance.runner.ranStepB = !runInstance.runner.ranStepB;
    }

        C {
            runInstance.runner.ranStepC = !runInstance.runner.ranStepC;
        }
`, "file.txt");

            tree.generateBranches();

            let runner = new Runner(tree);

            await runner.run();

            expect(runner.isPaused()).to.be.true;
            expect(runner.ranStepA).to.be.true;
            expect(runner.ranStepB).to.be.undefined;
            expect(runner.ranStepC).to.be.undefined;
            expect(runner.ranInjectedStep).to.be.undefined;

            let t = new Tree();
            t.parseIn(`
Step to Inject {
    runInstance.runner.ranInjectedStep = !runInstance.runner.ranInjectedStep;
}`);

            await runner.injectStep(t.root.children[0]);

            expect(runner.isPaused()).to.be.true;
            expect(runner.ranStepA).to.be.true;
            expect(runner.ranStepB).to.be.undefined;
            expect(runner.ranStepC).to.be.undefined;
            expect(runner.ranInjectedStep).to.be.true;
        });
    });
});
