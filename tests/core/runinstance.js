const chai = require('chai');
const chaiAsPromised = require("chai-as-promised");
const expect = chai.expect;
const assert = chai.assert;
const util = require('util');
const Step = require('../../src/step.js');
const Branch = require('../../src/branch.js');
const Tree = require('../../src/tree.js');
const Runner = require('../../src/runner.js');
const RunInstance = require('../../src/runinstance.js');

chai.use(chaiAsPromised);

describe("RunInstance", () => {
    describe("run()", () => {
        context("generic tests", () => {
            it("runs a branch it pulls from the tree", async () => {
                let tree = new Tree();
                tree.parseIn(`
A -
    B {
        runInstance.ranStepB = true;
    }
        C {
            runInstance.ranStepC = true;
        }
                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                let runInstance = new RunInstance(runner);

                await runInstance.run();

                expect(runInstance.ranStepB).to.be.true;
                expect(runInstance.ranStepC).to.be.true;
            });

            it("runs multiple branches it pulls from the tree", async () => {
                let tree = new Tree();
                tree.parseIn(`
A -

    B {
        runInstance.ranStepB = true;
    }

        C {
            runInstance.ranStepC = true;
        }

    D {
        runInstance.ranStepD = true;
    }

        E {
            runInstance.ranStepE = true;
        }
                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                let runInstance = new RunInstance(runner);

                await runInstance.run();

                expect(runInstance.ranStepB).to.be.true;
                expect(runInstance.ranStepC).to.be.true;
                expect(runInstance.ranStepD).to.be.true;
                expect(runInstance.ranStepE).to.be.true;
            });

            it("clears local and global variables between different branches", async () => {
                let tree = new Tree();
                tree.parseIn(`
First branch -
    {var1}='foo'
        {{var2}}='bar'

Second branch -
    Check the vars {
        runInstance.var1 = getGlobal("var1");
        runInstance.var2 = getLocal("var2");
    }

                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                let runInstance = new RunInstance(runner);

                await runInstance.run();

                expect(runInstance.var1).to.be.undefined;
                expect(runInstance.var2).to.be.undefined;
            });

            it("resets global vars to their inits from the Runner", async () => {
                let tree = new Tree();
                tree.parseIn(`
Run one at a time - !
    Branch 1 -
        Verify vars
            {x}='33'
                {y}='44'
    Branch 2 -
        Verify vars

* Verify vars {
    if(x == '11' && y == '22' && getGlobal('x') == '11' && getGlobal('y') == '22') {
        runInstance.signOffs.push(true);
    }
}
                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                runner.globalInit = {
                    x: '11',
                    y: '22'
                }
                let runInstance = new RunInstance(runner);
                runInstance.signOffs = [];

                await runInstance.run();

                expect(runInstance.signOffs).to.have.lengthOf(2);
                expect(runInstance.signOffs[0]).to.be.true;
                expect(runInstance.signOffs[1]).to.be.true;
            });
        });

        context("failures", () => {
            it("handles a step that fails but doesn't end the branch", async () => {
                let tree = new Tree();
                tree.parseIn(`
A -

    B {
        runInstance.ranStepB = true;
        let e = new Error("oops");
        e.continue = true;
        throw e;
    }

        C {
            runInstance.ranStepC = true;
        }
                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                let runInstance = new RunInstance(runner);

                await runInstance.run();

                expect(runInstance.ranStepB).to.be.true;
                expect(runInstance.ranStepC).to.be.true;

                expect(tree.branches[0].isFailed).to.be.true;
            });

            it("handles a step that fails and ends the branch", async () => {
                let tree = new Tree();
                tree.parseIn(`
A -

    B {
        runInstance.ranStepB = true;
        throw new Error("oops");
    }

        C {
            runInstance.ranStepC = true;
        }
                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                let runInstance = new RunInstance(runner);

                await runInstance.run();

                expect(runInstance.ranStepB).to.be.true;
                expect(runInstance.ranStepC).to.be.undefined;

                expect(tree.branches[0].isFailed).to.be.true;
            });

            it("handles one branch that fails and one that passes", async () => {
                let tree = new Tree();
                tree.parseIn(`
A -
    B {
        throw new Error("oops");
    }
        C -
    D -
        E -
                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                let runInstance = new RunInstance(runner);

                await runInstance.run();

                expect(tree.branches[0].isPassed).to.be.undefined;
                expect(tree.branches[0].isFailed).to.be.true;

                expect(tree.branches[1].isPassed).to.be.true;
                expect(tree.branches[1].isFailed).to.be.undefined;
            });
        });

        context("pause and resume", () => {
            it("handles a ~ step that pauses execution before the step", async () => {
                let tree = new Tree();
                tree.parseIn(`
A -

    B {
        runInstance.ranStepB = true;
    }

        ~ C {
            runInstance.ranStepC = true;
        }

            D {
                runInstance.ranStepD = true;
            }
                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                let runInstance = new RunInstance(runner);

                await runInstance.run();

                expect(runInstance.ranStepB).to.be.true;
                expect(runInstance.ranStepC).to.be.undefined;
                expect(runInstance.ranStepD).to.be.undefined;

                expect(runInstance.isPaused).to.be.true;
                expect(tree.stepNodeIndex[runInstance.currStep.id].text).to.equal("C");

                expect(tree.branches[0].isPassed).to.be.undefined;
                expect(tree.branches[0].isFailed).to.be.undefined;
            });

            it("handles a ~ step that pauses execution after the step", async () => {
                let tree = new Tree();
                tree.parseIn(`
A -

    B {
        runInstance.ranStepB = true;
    }

        C ~ {
            runInstance.ranStepC = true;
        }

            D {
                runInstance.ranStepD = true;
            }
                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                let runInstance = new RunInstance(runner);

                await runInstance.run();

                expect(runInstance.ranStepB).to.be.true;
                expect(runInstance.ranStepC).to.be.true;
                expect(runInstance.ranStepD).to.be.undefined;

                expect(runInstance.isPaused).to.be.true;
                expect(tree.stepNodeIndex[runInstance.currStep.id].text).to.equal("C");

                expect(tree.branches[0].isPassed).to.be.undefined;
                expect(tree.branches[0].isFailed).to.be.undefined;
            });

            it("handles a failed step that pauses execution via pauseOnFail", async () => {
                let tree = new Tree();
                tree.parseIn(`
A -

    B {
        runInstance.ranStepB = true;
    }

        C {
            runInstance.ranStepC = true;
            throw new Error("oops");
        }

            D {
                runInstance.ranStepD = true;
            }
                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                runner.pauseOnFail = true;
                let runInstance = new RunInstance(runner);

                await runInstance.run();

                expect(runInstance.ranStepB).to.be.true;
                expect(runInstance.ranStepC).to.be.true;
                expect(runInstance.ranStepD).to.be.undefined;

                expect(tree.branches[0].isPassed).to.be.undefined;
                expect(tree.branches[0].isFailed).to.be.undefined;

            });

            it("handles a resume from a previous pause, where the current step never ran", async () => {
                let tree = new Tree();
                tree.parseIn(`
A -

    B {
        runInstance.ranStepB = true;
    }

        ~ C {
            runInstance.ranStepC = true;
        }

            D {
                runInstance.ranStepD = true;
            }
                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                let runInstance = new RunInstance(runner);

                await runInstance.run();

                expect(runInstance.ranStepB).to.be.true;
                expect(runInstance.ranStepC).to.be.undefined;
                expect(runInstance.ranStepD).to.be.undefined;

                expect(tree.branches[0].isPassed).to.be.undefined;
                expect(tree.branches[0].isFailed).to.be.undefined;

                await runInstance.run();

                expect(runInstance.ranStepB).to.be.true;
                expect(runInstance.ranStepC).to.be.true;
                expect(runInstance.ranStepD).to.be.true;

                expect(tree.branches[0].isPassed).to.be.true;
                expect(tree.branches[0].isFailed).to.be.undefined;
            });

            it("handles a resume from a previous pause, where the current step completed", async () => {
                let tree = new Tree();
                tree.parseIn(`
A -

    B {
        runInstance.ranStepB = true;
    }

        C ~ {
            runInstance.doubleRanStepC = (runInstance.ranStepC === true);
            runInstance.ranStepC = true;
        }

            D {
                runInstance.ranStepD = true;
            }
                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                runner.pauseOnFail = true;
                let runInstance = new RunInstance(runner);

                await runInstance.run();

                expect(runInstance.ranStepB).to.be.true;
                expect(runInstance.ranStepC).to.be.true;
                expect(runInstance.doubleRanStepC).to.be.false;
                expect(runInstance.ranStepD).to.be.undefined;

                await runInstance.run();

                expect(runInstance.ranStepB).to.be.true;
                expect(runInstance.ranStepC).to.be.true;
                expect(runInstance.doubleRanStepC).to.be.false;
                expect(runInstance.ranStepD).to.be.true;
            });

            it("handles a resume from a previous pause, where the current step has ~ before and after itself", async () => {
                let tree = new Tree();
                tree.parseIn(`
A -

    B {
        runInstance.ranStepB = true;
    }

        ~ C ~ {
            runInstance.doubleRanStepC = (runInstance.ranStepC === true);
            runInstance.ranStepC = true;
        }

            D {
                runInstance.ranStepD = true;
            }
                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                runner.pauseOnFail = true;
                let runInstance = new RunInstance(runner);

                await runInstance.run();

                expect(runInstance.ranStepB).to.be.true;
                expect(runInstance.ranStepC).to.be.undefined;
                expect(runInstance.doubleRanStepC).to.be.undefined;
                expect(runInstance.ranStepD).to.be.undefined;

                await runInstance.run();

                expect(runInstance.ranStepB).to.be.true;
                expect(runInstance.ranStepC).to.be.true;
                expect(runInstance.doubleRanStepC).to.be.false;
                expect(runInstance.ranStepD).to.be.true;
            });

            it("handles a resume from a previous pause, where the current step never ran and is the last step", async () => {
                let tree = new Tree();
                tree.parseIn(`
A  {
    runInstance.ranStepA = !runInstance.ranStepA;
}

    B {
        runInstance.ranStepB = !runInstance.ranStepB;
    }

        ~ C {
            runInstance.ranStepC = !runInstance.ranStepC;
        }

*** Before Every Branch {
    runInstance.beforeEveryBranchRan = !runInstance.beforeEveryBranchRan;
}

*** After Every Branch {
    runInstance.afterEveryBranchRan = !runInstance.afterEveryBranchRan;
}
                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                let runInstance = new RunInstance(runner);

                await runInstance.run();

                expect(runInstance.isPaused).to.be.true;
                expect(runInstance.ranStepA).to.be.true;
                expect(runInstance.ranStepB).to.be.true;
                expect(runInstance.ranStepC).to.be.undefined;
                expect(tree.branches[0].isPassed).to.be.undefined;
                expect(runInstance.afterEveryBranchRan).to.be.undefined;
                expect(runInstance.beforeEveryBranchRan).to.be.true;

                await runInstance.run();

                expect(runInstance.isPaused).to.be.false;
                expect(runInstance.ranStepA).to.be.true;
                expect(runInstance.ranStepB).to.be.true;
                expect(runInstance.ranStepC).to.be.true;
                expect(tree.branches[0].isPassed).to.be.true;
                expect(runInstance.afterEveryBranchRan).to.be.true;
                expect(runInstance.beforeEveryBranchRan).to.be.true;
            });

            it("handles a resume from a previous pause, where the current step completed and is the last step", async () => {
                let tree = new Tree();
                tree.parseIn(`
A {
    runInstance.ranStepA = !runInstance.ranStepA;
}

    B {
        runInstance.ranStepB = !runInstance.ranStepB;
    }

        C ~ {
            runInstance.ranStepC = !runInstance.ranStepC;
        }

*** Before Every Branch {
    runInstance.beforeEveryBranchRan = !runInstance.beforeEveryBranchRan;
}

*** After Every Branch {
    runInstance.afterEveryBranchRan = !runInstance.afterEveryBranchRan;
}
                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                runner.pauseOnFail = true;
                let runInstance = new RunInstance(runner);

                await runInstance.run();

                expect(runInstance.isPaused).to.be.true;
                expect(runInstance.ranStepA).to.be.true;
                expect(runInstance.ranStepB).to.be.true;
                expect(runInstance.ranStepC).to.be.true;
                expect(runInstance.afterEveryBranchRan).to.be.undefined; // doesn't run After Every Branch until one more runOneStep() call
                expect(runInstance.beforeEveryBranchRan).to.be.true;

                await runInstance.run();

                expect(runInstance.isPaused).to.be.false;
                expect(runInstance.ranStepA).to.be.true;
                expect(runInstance.ranStepB).to.be.true;
                expect(runInstance.ranStepC).to.be.true;
                expect(runInstance.afterEveryBranchRan).to.be.true;
                expect(runInstance.beforeEveryBranchRan).to.be.true;
            });

            it("handles a resume from a previous pause, where the current step completed in error, and is the last step", async () => {
                let tree = new Tree();
                tree.parseIn(`
A {
    runInstance.ranStepA = !runInstance.ranStepA;
}

    B {
        runInstance.ranStepB = !runInstance.ranStepB;
    }

        C {
            runInstance.ranStepC = !runInstance.ranStepC;
            let e = new Error();
            e.continue = true;
            throw e;
        }

*** Before Every Branch {
    runInstance.beforeEveryBranchRan = !runInstance.beforeEveryBranchRan;
}

*** After Every Branch {
    runInstance.afterEveryBranchRan = !runInstance.afterEveryBranchRan;
}
                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                runner.pauseOnFail = true;
                let runInstance = new RunInstance(runner);

                await runInstance.run();

                expect(runInstance.isPaused).to.be.true;
                expect(runInstance.ranStepA).to.be.true;
                expect(runInstance.ranStepB).to.be.true;
                expect(runInstance.ranStepC).to.be.true;
                expect(tree.branches[0].isFailed).to.be.true;
                expect(runInstance.afterEveryBranchRan).to.be.undefined; // doesn't run After Every Branch until one more runOneStep() call
                expect(runInstance.beforeEveryBranchRan).to.be.true;

                await runInstance.run();

                expect(runInstance.isPaused).to.be.false;
                expect(runInstance.ranStepA).to.be.true;
                expect(runInstance.ranStepB).to.be.true;
                expect(runInstance.ranStepC).to.be.true;
                expect(tree.branches[0].isFailed).to.be.true;
                expect(runInstance.afterEveryBranchRan).to.be.true;
                expect(runInstance.beforeEveryBranchRan).to.be.true;
            });

            it("handles a ~~ step, but doesn't pause", async () => {
                let tree = new Tree();
                tree.parseIn(`
A -

    B {
        runInstance.ranStepB = true;
    }

        ~~ C {
            runInstance.ranStepC = true;
        }

            D {
                runInstance.ranStepD = true;
            }
                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                let runInstance = new RunInstance(runner);

                await runInstance.run();

                expect(runInstance.ranStepB).to.be.true;
                expect(runInstance.ranStepC).to.be.true;
                expect(runInstance.ranStepD).to.be.true;

                expect(tree.branches[0].isPassed).to.be.true;
                expect(tree.branches[0].isFailed).to.be.undefined;
            });

            it("handles a ~ and ~~ on the same branch, but doesn't pause", async () => {
                let tree = new Tree();
                tree.parseIn(`
A -

    ~ B {
        runInstance.ranStepB = true;
    }

        ~~ C {
            runInstance.ranStepC = true;
        }

            D {
                runInstance.ranStepD = true;
            }
                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                let runInstance = new RunInstance(runner);

                await runInstance.run();

                expect(runInstance.ranStepB).to.be.true;
                expect(runInstance.ranStepC).to.be.true;
                expect(runInstance.ranStepD).to.be.true;

                expect(tree.branches[0].isPassed).to.be.true;
                expect(tree.branches[0].isFailed).to.be.undefined;
            });

            it("handles a ~ and ~~ on the same step, but doesn't pause", async () => {
                let tree = new Tree();
                tree.parseIn(`
A -

    B {
        runInstance.ranStepB = true;
    }

        ~ ~~ C {
            runInstance.ranStepC = true;
        }

            D {
                runInstance.ranStepD = true;
            }
                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                let runInstance = new RunInstance(runner);

                await runInstance.run();

                expect(runInstance.ranStepB).to.be.true;
                expect(runInstance.ranStepC).to.be.true;
                expect(runInstance.ranStepD).to.be.true;

                expect(tree.branches[0].isPassed).to.be.true;
                expect(tree.branches[0].isFailed).to.be.undefined;
            });
        });

        context("stops", () => {
            it("handles a stop during a step", async () => {
                let tree = new Tree();
                tree.parseIn(`
Wait 10ms, cause a stop, then wait 10 ms more {
    async function wait10() {
        await new Promise((resolve, reject) => {
            setTimeout(() => {
                resolve();
            }, 10);
        });
    }

    await wait10();
    runInstance.isStopped = true;
    await wait10();
}

    A {
        runInstance.ranStepA = true;
    }

Second branch -

    B {
        runInstance.ranStepB = true;
    }

                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                let runInstance = new RunInstance(runner);

                await runInstance.run();

                expect(runInstance.isStopped).to.be.true;
                expect(runInstance.ranStepA).to.be.undefined;
                expect(runInstance.ranStepB).to.be.undefined;
            });

            it("throws an error when trying to start a previously stopped RunInstance", async () => {
                let tree = new Tree();
                tree.parseIn(`
Cause a stop {
    runInstance.isStopped = true;
}
                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                let runInstance = new RunInstance(runner);

                await runInstance.run();
                await expect(runInstance.run()).to.be.rejectedWith("Cannot run a stopped runner");
            });
        });

        context("hooks", () => {
            it("runs a Before Every Branch hook", async () => {
                let tree = new Tree();
                tree.parseIn(`
A -

    B {
        runInstance.ranStepB = true;
    }

        C {
            runInstance.ranStepC = true;
        }

*** Before Every Branch {
    runInstance.beforeEveryBranchRan = true;
    runInstance.nothingElseRanYet = (runInstance.ranStepB !== true);
}

                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                let runInstance = new RunInstance(runner);

                await runInstance.run();

                expect(runInstance.beforeEveryBranchRan).to.be.true;
                expect(runInstance.nothingElseRanYet).to.be.true;
                expect(runInstance.ranStepB).to.be.true;
                expect(runInstance.ranStepC).to.be.true;

                expect(tree.branches[0].isPassed).to.be.true;
                expect(tree.branches[0].isFailed).to.be.undefined;
            });

            it("runs an After Every Branch hook", async () => {
                let tree = new Tree();
                tree.parseIn(`
A -

    B {
        runInstance.ranStepB = true;
    }

        C {
            runInstance.ranStepC = true;
        }

*** After Every Branch {
    runInstance.afterEveryBranchRan = true;
    runInstance.everythingElseRanAlready = (runInstance.ranStepB === true && runInstance.ranStepC === true);
}

                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                let runInstance = new RunInstance(runner);

                await runInstance.run();

                expect(runInstance.afterEveryBranchRan).to.be.true;
                expect(runInstance.everythingElseRanAlready).to.be.true;
                expect(runInstance.ranStepB).to.be.true;
                expect(runInstance.ranStepC).to.be.true;

                expect(tree.branches[0].isPassed).to.be.true;
                expect(tree.branches[0].isFailed).to.be.undefined;
            });

            it("runs multiple Before Every Branch and After Every Branch hooks, with multiple branches", async () => {
                let tree = new Tree();
                tree.parseIn(`
A -
    B -
        C -
    D -
        E -

*** Before Every Branch {
    runInstance.count += 1;
}

*** Before Every Branch {
    runInstance.count *= 2;
}

*** After Every Branch {
    runInstance.count += 3;
}

*** After Every Branch {
    runInstance.count *= 4;
}

                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                let runInstance = new RunInstance(runner);
                runInstance.count = 1;

                await runInstance.run();

                expect(runInstance.count).to.equal(208);
            });

            it("runs After Every Branch hooks even if a branch fails", async () => {
                let tree = new Tree();
                tree.parseIn(`
A -
    B {
        throw new Error("oops");
    }
        C -
    D -
        E -

*** After Every Branch {
    runInstance.count++;
}

*** After Every Branch {
    runInstance.count *= 2;
}
                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                let runInstance = new RunInstance(runner);
                runInstance.count = 1;

                await runInstance.run();

                expect(runInstance.count).to.equal(10);
            });

            it("handles an error inside a Before Every Branch hook", async () => {
                let tree = new Tree();
                tree.parseIn(`
A -
    B {
        runInstance.ranStepB = true;
    }

    C {
        runInstance.ranStepC = true;
    }

*** Before Every Branch {
    throw new Error("oops");
}

*** After Every Branch {
    runInstance.afterCount++;
}

                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                let runInstance = new RunInstance(runner);
                runInstance.afterCount = 0;

                await runInstance.run();

                expect(tree.branches[0].error.message).to.equal("oops");
                expect(tree.branches[0].error.filename).to.equal("file.txt");
                expect(tree.branches[0].error.lineNumber).to.equal(12);
                expect(tree.branches[0].isPassed).to.be.undefined;
                expect(tree.branches[0].isFailed).to.be.true;

                expect(tree.branches[1].error.message).to.equal("oops");
                expect(tree.branches[1].error.filename).to.equal("file.txt");
                expect(tree.branches[1].error.lineNumber).to.equal(12);
                expect(tree.branches[1].isPassed).to.be.undefined;
                expect(tree.branches[1].isFailed).to.be.true;

                expect(runInstance.ranStepB).to.be.undefined;
                expect(runInstance.ranStepC).to.be.undefined;
                expect(runInstance.afterCount).to.equal(2); // remaining After Every Branch hooks are still run
            });

            it("handles an error inside an After Every Branch hook", async () => {
                let tree = new Tree();
                tree.parseIn(`
A -
    B {
        runInstance.ranStepB = true;
    }

    C {
        runInstance.ranStepC = true;
    }

*** Before Every Branch {
    runInstance.beforeCount++;
}

*** After Every Branch {
    throw new Error("oops");
}

*** After Every Branch {
    runInstance.afterCount++;
}

                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                let runInstance = new RunInstance(runner);
                runInstance.afterCount = 0;
                runInstance.beforeCount = 0;

                await runInstance.run();

                expect(tree.branches[0].error.message).to.equal("oops");
                expect(tree.branches[0].error.filename).to.equal("file.txt");
                expect(tree.branches[0].error.lineNumber).to.equal(16);
                expect(tree.branches[0].isPassed).to.be.undefined;
                expect(tree.branches[0].isFailed).to.be.true;

                expect(tree.branches[1].error.message).to.equal("oops");
                expect(tree.branches[1].error.filename).to.equal("file.txt");
                expect(tree.branches[1].error.lineNumber).to.equal(16);
                expect(tree.branches[1].isPassed).to.be.undefined;
                expect(tree.branches[1].isFailed).to.be.true;

                expect(runInstance.ranStepB).to.be.true;
                expect(runInstance.ranStepC).to.be.true;
                expect(runInstance.afterCount).to.equal(2); // remaining After Every Branch hooks are still run
                expect(runInstance.beforeCount).to.equal(2);
            });

            it("handles a stop during a Before Every Branch hook execution", async () => {
                let tree = new Tree();
                tree.parseIn(`
A {
    runInstance.ranStepA = true;
}

B {
    runInstance.ranStepB = true;
}

*** Before Every Branch {
    runInstance.isStopped = true;
    runInstance.beforeCount++;

    // Wait 20 ms
    await new Promise((resolve, reject) => {
        setTimeout(() => {
            resolve();
        }, 20);
    });
}

                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                let runInstance = new RunInstance(runner);
                runInstance.beforeCount = 0;

                await runInstance.run();

                expect(runInstance.isStopped).to.be.true;
                expect(runInstance.ranStepA).to.be.undefined;
                expect(runInstance.ranStepB).to.be.undefined;
                expect(runInstance.beforeCount).to.equal(1);
            });

            it("handles a stop during an After Every Branch hook execution", async () => {
                let tree = new Tree();
                tree.parseIn(`
A {
    runInstance.ranStepA = true;
}

B {
    runInstance.ranStepB = true;
}

*** After Every Branch {
    runInstance.isStopped = true;
    runInstance.afterCount++;
}

*** After Every Branch {
    runInstance.afterCount++;
}

                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                let runInstance = new RunInstance(runner);
                runInstance.afterCount = 0;

                await runInstance.run();

                expect(runInstance.isStopped).to.be.true;
                expect(runInstance.ranStepA).to.be.true;
                expect(runInstance.ranStepB).to.be.undefined;
                expect(runInstance.afterCount).to.be.equal(1);
            });

            it("a {var} and {{var}} declared in a branch is accessible in an After Every Branch hook", async () => {
                let tree = new Tree();
                tree.parseIn(`
{var1}='foo'
    {{var2}}='bar'

*** After Every Branch {
    runInstance.var1 = var1;
    runInstance.var2 = var2;
}

                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                let runInstance = new RunInstance(runner);

                await runInstance.run();

                expect(runInstance.var1).to.equal("foo");
                expect(runInstance.var2).to.equal("bar");
            });
        });

        context("elapsed time", () => {
            it("sets branch.elapsed to how long it took the branch to execute", async () => {
                let tree = new Tree();
                tree.parseIn(`
Wait 20ms {
    await new Promise((resolve, reject) => {
        setTimeout(() => {
            resolve();
        }, 20);
    });
}
                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                let runInstance = new RunInstance(runner);

                await runInstance.run();

                expect(tree.branches[0].elapsed).to.be.above(15);
                expect(tree.branches[0].elapsed).to.be.below(50);
                expect(tree.branches[0].timeStarted instanceof Date).to.equal(true);
            });

            it("sets branch.elapsed to how long it took the branch to execute when a stop ocurred", async () => {
                let tree = new Tree();
                tree.parseIn(`
Wait '20' ms

    Cause a stop {
        this.isStopped = true;
    }

        Wait '100' ms // we never get here

* Wait {{N}} ms {
    await new Promise((resolve, reject) => {
        setTimeout(() => {
            resolve();
        }, N);
    });
}
                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                let runInstance = new RunInstance(runner);

                await runInstance.run();

                expect(tree.branches[0].elapsed).to.be.above(15);
                expect(tree.branches[0].elapsed).to.be.below(50);
                expect(tree.branches[0].timeStarted instanceof Date).to.equal(true);
            });

            it("sets branch.elapsed to -1 when a pause and when a resume occurred", async () => {
                let tree = new Tree();
                tree.parseIn(`
First step -

    Cause a pause {
        throw new Error("oops");
    }

        Third step -
                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                runner.pauseOnFail = true;
                let runInstance = new RunInstance(runner);

                await runInstance.run();

                expect(tree.branches[0].elapsed).to.equal(-1);
                expect(tree.branches[0].timeStarted instanceof Date).to.equal(true);

                await runInstance.run();

                expect(tree.branches[0].elapsed).to.equal(-1);
                expect(tree.branches[0].timeStarted instanceof Date).to.equal(true);
            });
        });
    });

    describe("runStep()", () => {
        context("generic tests", () => {
            it("executes a textual step", async () => {
                let tree = new Tree();
                tree.parseIn(`
A -
                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                let runInstance = new RunInstance(runner);

                await runInstance.runStep(tree.branches[0].steps[0], tree.branches[0], false);

                expect(tree.branches[0].error).to.equal(undefined);
                expect(tree.branches[0].steps[0].error).to.equal(undefined);
            });

            it("executes a step with a code block", async () => {
                let tree = new Tree();
                tree.parseIn(`
A {
    runInstance.flag = true;
}
                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                let runInstance = new RunInstance(runner);

                await runInstance.runStep(tree.branches[0].steps[0], tree.branches[0], false);

                expect(runInstance.flag).to.equal(true);

                expect(tree.branches[0].error).to.equal(undefined);
                expect(tree.branches[0].steps[0].error).to.equal(undefined);
            });

            it("sets step.elapsed to how long it took step to execute", async () => {
                let tree = new Tree();
                tree.stepDataMode = 'all';
                tree.parseIn(`
Wait 20ms {
    await new Promise((resolve, reject) => {
        setTimeout(() => {
            resolve();
        }, 20);
    });
}
                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                let runInstance = new RunInstance(runner);

                await runInstance.runStep(tree.branches[0].steps[0], tree.branches[0], false);

                expect(tree.branches[0].steps[0].elapsed).to.be.above(15);
                expect(tree.branches[0].steps[0].elapsed).to.be.below(50);
                expect(tree.branches[0].steps[0].timeStarted instanceof Date).to.equal(true);
            });

            it("a persistent variable set in one RunInstance is accessible in another RunInstance", async () => {
                let tree = new Tree();

                let runner = new Runner();
                runner.init(tree, true);

                let runInstance1 = new RunInstance(runner);
                let runInstance2 = new RunInstance(runner);

                runInstance1.setPersistent("foo", "bar");
                expect(runInstance2.getPersistent("foo")).to.equal("bar");
            });

            it("throws an error when a non-object is thrown inside a step", async () => {
                let tree = new Tree();
                tree.stepDataMode = 'all';
                tree.parseIn(`
Step {
    throw 5;
}
                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                let runInstance = new RunInstance(runner);

                await runInstance.runStep(tree.branches[0].steps[0], tree.branches[0], false);

                expect(tree.branches[0].steps[0].error.message).to.equal(`A non-object was thrown inside this step. Only objects can be thrown.`);
            });
        });

        context("functions", () => {
            it("executes a function call with no {{variables}} in its function declaration", async () => {
                let tree = new Tree();
                tree.parseIn(`
F

* F {
    runInstance.flag = true;
}
                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                let runInstance = new RunInstance(runner);

                await runInstance.runStep(tree.branches[0].steps[0], tree.branches[0], false);

                expect(runInstance.flag).to.equal(true);

                expect(tree.branches[0].error).to.equal(undefined);
                expect(tree.branches[0].steps[0].error).to.equal(undefined);
            });

            it("executes a function call with {{variables}} in its function declaration, passing in 'strings'", async () => {
                let tree = new Tree();
                tree.stepDataMode = 'all';
                tree.parseIn(`
My 'foo' Function 'bar'

* My {{one}} Function {{two}} {
    runInstance.one = one;
    runInstance.two = two;
}
                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                let runInstance = new RunInstance(runner);

                await runInstance.runStep(tree.branches[0].steps[0], tree.branches[0], false);

                expect(runInstance.one).to.equal("foo");
                expect(runInstance.two).to.equal("bar");

                expect(tree.branches[0].error).to.equal(undefined);
                expect(tree.branches[0].steps[0].error).to.equal(undefined);

                expect(tree.branches[0].steps[0].log).to.eql([
                    {text: "Calling function at file.txt:4"},
                    {text: "Function parameter {{one}} is 'foo'"},
                    {text: "Function parameter {{two}} is 'bar'"}
                ]);
            });

            it("executes a function call with {{variables}} in its function declaration, passing in \"strings\"", async () => {
                let tree = new Tree();
                tree.stepDataMode = 'all';
                tree.parseIn(`
"foo" My "bar"  Function 'blah\\n'

* {{first}} My {{second}} Function {{third}} {
    runInstance.first = first;
    runInstance.second = second;
    runInstance.third = third;
}
                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                let runInstance = new RunInstance(runner);

                await runInstance.runStep(tree.branches[0].steps[0], tree.branches[0], false);

                expect(runInstance.first).to.equal("foo");
                expect(runInstance.second).to.equal("bar");
                expect(runInstance.third).to.equal("blah\n");

                expect(tree.branches[0].error).to.equal(undefined);
                expect(tree.branches[0].steps[0].error).to.equal(undefined);

                expect(tree.branches[0].steps[0].log).to.eql([
                    {text: "Calling function at file.txt:4"},
                    {text: "Function parameter {{first}} is 'foo'"},
                    {text: "Function parameter {{second}} is 'bar'"},
                    {text: "Function parameter {{third}} is 'blah\\n'"}
                ]);
            });

            it("executes a function call with {{variables}} in its function declaration, passing in {variables}", async () => {
                let tree = new Tree();
                tree.parseIn(`
My {A} Function { b }

* My {{one}} Function {{two}} {
    runInstance.one = one;
    runInstance.two = two;
}
                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                let runInstance = new RunInstance(runner);
                runInstance.global.A = "foo";
                runInstance.global.b = "bar";

                await runInstance.runStep(tree.branches[0].steps[0], tree.branches[0], false);

                expect(runInstance.one).to.equal("foo");
                expect(runInstance.two).to.equal("bar");

                expect(tree.branches[0].error).to.equal(undefined);
                expect(tree.branches[0].steps[0].error).to.equal(undefined);
            });

            it("executes a function call with {{variables}} in its function declaration, passing in {variables} set to js objects", async () => {
                let tree = new Tree();
                tree.stepDataMode = 'all';
                tree.parseIn(`
Set vars {
    setGlobal("A", {foo:"bar"});
}

    My Function { A }

* My Function {{X}} {
    runInstance.one = X;
}
                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                let runInstance = new RunInstance(runner);

                await runInstance.runStep(tree.branches[0].steps[0], tree.branches[0], false);
                await runInstance.runStep(tree.branches[0].steps[1], tree.branches[0], false);

                expect(runInstance.one).to.eql({foo:"bar"});
                expect(tree.branches[0].steps[1].log[0]).to.eql( {text: "Calling function at file.txt:8"} );
                expect(tree.branches[0].steps[1].log[1]).to.eql( {text: "Function parameter {{X}} is [object Object]"} );
            });

            it("executes a function call with {{variables}} in its function declaration, passing in {{variables}}", async () => {
                let tree = new Tree();
                tree.parseIn(`
My {{A}} Function {{ b }} { a B  c }

* My {{one}} Function {{two}} {{three}} {
    runInstance.one = one;
    runInstance.two = two;
    runInstance.three = three;
}
                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                let runInstance = new RunInstance(runner);
                runInstance.local.A = "foo";
                runInstance.local.b = "bar";
                runInstance.global["a B c"] = "blah";

                await runInstance.runStep(tree.branches[0].steps[0], tree.branches[0], false);

                expect(runInstance.one).to.equal("foo");
                expect(runInstance.two).to.equal("bar");
                expect(runInstance.three).to.equal("blah");

                expect(tree.branches[0].error).to.equal(undefined);
                expect(tree.branches[0].steps[0].error).to.equal(undefined);
            });

            it("executes a function call with {{variables}} in its function declaration, passing in 'strings containing {variables}'", async () => {
                let tree = new Tree();
                tree.parseIn(`
My '{A} and { b }' Function '{b}'

* My {{one}} Function {{two}} {
    runInstance.one = one;
    runInstance.two = two;
}
                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                let runInstance = new RunInstance(runner);
                runInstance.global.A = "foo";
                runInstance.global.b = "b\"a'r";

                await runInstance.runStep(tree.branches[0].steps[0], tree.branches[0], false);

                expect(runInstance.one).to.equal("foo and b\"a'r");
                expect(runInstance.two).to.equal("b\"a'r");

                expect(tree.branches[0].error).to.equal(undefined);
                expect(tree.branches[0].steps[0].error).to.equal(undefined);
            });

            it("executes a function call with {{variables}} in its function declaration, passing in \"strings containing {{variables}}\"", async () => {
                let tree = new Tree();
                tree.parseIn(`
My "{A} and { b }" Function "{b}"

* My {{one}} Function {{two}} {
    runInstance.one = one;
    runInstance.two = two;
}
                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                let runInstance = new RunInstance(runner);
                runInstance.global.A = "foo";
                runInstance.global.b = "b\"a'r";

                await runInstance.runStep(tree.branches[0].steps[0], tree.branches[0], false);

                expect(runInstance.one).to.equal("foo and b\"a'r");
                expect(runInstance.two).to.equal("b\"a'r");

                expect(tree.branches[0].error).to.equal(undefined);
                expect(tree.branches[0].steps[0].error).to.equal(undefined);
            });

            it("executes a function call with {{variables}} in its function declaration, passing in [strings]", async () => {
                let tree = new Tree();
                tree.parseIn(`
My [4th 'Login' button next to 'something'] Function [ big link ]

* My {{one}} Function {{two}} {
    runInstance.one = one;
    runInstance.two = two;
}
                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                let runInstance = new RunInstance(runner);

                await runInstance.runStep(tree.branches[0].steps[0], tree.branches[0], false);

                expect(runInstance.one).to.equal("4th 'Login' button next to 'something'");
                expect(runInstance.two).to.equal(" big link ");

                expect(tree.branches[0].error).to.equal(undefined);
                expect(tree.branches[0].steps[0].error).to.equal(undefined);
            });

            it("executes a function call with {{variables}} in its function declaration, passing in [strings containing {variables}]", async () => {
                let tree = new Tree();
                tree.parseIn(`
My [{{N}}th 'Login {{A}}' {b} next to '{{ C }}'] Function [ big { d d } ]

* My {{one}} Function {{two}} {
    runInstance.one = one;
    runInstance.two = two;
}
                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                let runInstance = new RunInstance(runner);
                runInstance.local.A = "sign";
                runInstance.global.b = "small button";
                runInstance.local.C = "lots of CATS!";
                runInstance.local.N = 14;
                runInstance.global["d d"] = "link";

                await runInstance.runStep(tree.branches[0].steps[0], tree.branches[0], false);

                expect(runInstance.one).to.equal("14th 'Login sign' small button next to 'lots of CATS!'");
                expect(runInstance.two).to.equal(" big link ");

                expect(tree.branches[0].error).to.equal(undefined);
                expect(tree.branches[0].steps[0].error).to.equal(undefined);
            });

            it("executes a function call with {{variables}} in its function declaration, passing in 'strings', \"strings\", [strings], {variables}, {{variables}}, including strings with variables inside", async () => {
                let tree = new Tree();
                tree.parseIn(`
My 'first' Function "second" [third] { four th} Is {{fifth}} Here! "{sixth} six '6' \\\"66\\\"" [{{seventh}} seven 'th']

* My {{one}} Function {{two}} {{three}} {{fo ur}} Is {{five}} Here! {{six}} {{seven}} {
    runInstance.one = one;
    runInstance.two = two;
    runInstance.three = three;
    runInstance.four = getLocal("fo ur");
    runInstance.five = five;
    runInstance.six = six;
    runInstance.seven = seven;
}
                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                let runInstance = new RunInstance(runner);
                runInstance.global["four th"] = "4";
                runInstance.local["fifth"] = "5";
                runInstance.global["sixth"] = "6";
                runInstance.local["seventh"] = "7";

                await runInstance.runStep(tree.branches[0].steps[0], tree.branches[0], false);

                expect(runInstance.one).to.equal("first");
                expect(runInstance.two).to.equal("second");
                expect(runInstance.three).to.equal("third");
                expect(runInstance.four).to.equal("4");
                expect(runInstance.five).to.equal("5");
                expect(runInstance.six).to.equal("6 six '6' \"66\"");
                expect(runInstance.seven).to.equal("7 seven 'th'");

                expect(tree.branches[0].error).to.equal(undefined);
                expect(tree.branches[0].steps[0].error).to.equal(undefined);
            });

            it("executes a function call with {{variables}} in its function declaration, that has no code block, passing in 'strings', \"strings\", [strings], {variables}, {{variables}}, including strings with variables inside", async () => {
                let tree = new Tree();
                tree.parseIn(`
My 'first' Function "second" [third] { four th} Is {{fifth}} Here! "{sixth} six '6' \\\"66\\\"" [{{seventh}} seven 'th']

* My {{one}} Function {{two}} {{three}} {{fo ur}} Is {{five}} Here! {{six}} {{seven}}
    {A}='{{one}}', {B}='{{two}}'
        {C}='{{three}}'
            { D } = '{{ fo ur  }}', {E}='{{five}}'
                ..
                {F}='{{six}}'
                {G}='{{seven}}'

                    Final step {
                        runInstance.one = getLocal("one");
                        runInstance.two = two;
                        runInstance.three = three;
                        runInstance.four = getLocal("fo ur");
                        runInstance.five = five;
                        runInstance.six = six;
                        runInstance.seven = seven;
                    }
                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                let runInstance = new RunInstance(runner);
                runInstance.global["four th"] = "4";
                runInstance.local["fifth"] = "5";
                runInstance.global["sixth"] = "6";
                runInstance.local["seventh"] = "7";

                await runInstance.runStep(tree.branches[0].steps[0], tree.branches[0], false);

                expect(runInstance.getLocal("one")).to.equal("first");
                expect(runInstance.getLocal("two")).to.equal("second");
                expect(runInstance.getLocal("three")).to.equal("third");
                expect(runInstance.getLocal("fo ur")).to.equal("4");
                expect(runInstance.getLocal("five")).to.equal("5");
                expect(runInstance.getLocal("six")).to.equal("6 six '6' \"66\"");
                expect(runInstance.getLocal("seven")).to.equal("7 seven 'th'");

                await runInstance.runStep(tree.branches[0].steps[1], tree.branches[0], false);

                expect(runInstance.getLocal("one")).to.equal("first");
                expect(runInstance.getLocal("two")).to.equal("second");
                expect(runInstance.getLocal("three")).to.equal("third");
                expect(runInstance.getLocal("fo ur")).to.equal("4");
                expect(runInstance.getLocal("five")).to.equal("5");
                expect(runInstance.getLocal("six")).to.equal("6 six '6' \"66\"");
                expect(runInstance.getLocal("seven")).to.equal("7 seven 'th'");

                await runInstance.runStep(tree.branches[0].steps[2], tree.branches[0], false);

                expect(runInstance.getLocal("one")).to.equal("first");
                expect(runInstance.getLocal("two")).to.equal("second");
                expect(runInstance.getLocal("three")).to.equal("third");
                expect(runInstance.getLocal("fo ur")).to.equal("4");
                expect(runInstance.getLocal("five")).to.equal("5");
                expect(runInstance.getLocal("six")).to.equal("6 six '6' \"66\"");
                expect(runInstance.getLocal("seven")).to.equal("7 seven 'th'");

                await runInstance.runStep(tree.branches[0].steps[3], tree.branches[0], false);

                expect(runInstance.getLocal("one")).to.equal("first");
                expect(runInstance.getLocal("two")).to.equal("second");
                expect(runInstance.getLocal("three")).to.equal("third");
                expect(runInstance.getLocal("fo ur")).to.equal("4");
                expect(runInstance.getLocal("five")).to.equal("5");
                expect(runInstance.getLocal("six")).to.equal("6 six '6' \"66\"");
                expect(runInstance.getLocal("seven")).to.equal("7 seven 'th'");

                await runInstance.runStep(tree.branches[0].steps[4], tree.branches[0], false);

                expect(runInstance.getLocal("one")).to.equal("first");
                expect(runInstance.getLocal("two")).to.equal("second");
                expect(runInstance.getLocal("three")).to.equal("third");
                expect(runInstance.getLocal("fo ur")).to.equal("4");
                expect(runInstance.getLocal("five")).to.equal("5");
                expect(runInstance.getLocal("six")).to.equal("6 six '6' \"66\"");
                expect(runInstance.getLocal("seven")).to.equal("7 seven 'th'");

                await runInstance.runStep(tree.branches[0].steps[5], tree.branches[0], false);

                expect(runInstance.getGlobal("A")).to.equal("first");
                expect(runInstance.getGlobal("B")).to.equal("second");
                expect(runInstance.getGlobal("C")).to.equal("third");
                expect(runInstance.getGlobal("D")).to.equal("4");
                expect(runInstance.getGlobal("E")).to.equal("5");
                expect(runInstance.getGlobal("F")).to.equal("6 six '6' \"66\"");
                expect(runInstance.getGlobal("G")).to.equal("7 seven 'th'");

                await runInstance.runStep(tree.branches[0].steps[6], tree.branches[0], false);

                expect(runInstance.getGlobal("A")).to.equal("first");
                expect(runInstance.getGlobal("B")).to.equal("second");
                expect(runInstance.getGlobal("C")).to.equal("third");
                expect(runInstance.getGlobal("D")).to.equal("4");
                expect(runInstance.getGlobal("E")).to.equal("5");
                expect(runInstance.getGlobal("F")).to.equal("6 six '6' \"66\"");
                expect(runInstance.getGlobal("G")).to.equal("7 seven 'th'");

                expect(runInstance.one).to.equal("first");
                expect(runInstance.two).to.equal("second");
                expect(runInstance.three).to.equal("third");
                expect(runInstance.four).to.equal("4");
                expect(runInstance.five).to.equal("5");
                expect(runInstance.six).to.equal("6 six '6' \"66\"");
                expect(runInstance.seven).to.equal("7 seven 'th'");

                expect(tree.branches[0].error).to.equal(undefined);
                expect(tree.branches[0].steps[0].error).to.equal(undefined);
            });

            it("executes a function call where {variables} are passed in and are only set in a later step, which is in format {var}='string'", async () => {
                let tree = new Tree();
                tree.parseIn(`
My {var:} Function
    {var} = 'foobar'

* My {{one}} Function {
    runInstance.one = one;
}
                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                let runInstance = new RunInstance(runner);
                runInstance.currBranch = tree.branches[0];

                runInstance.currStep = tree.branches[0].steps[0];
                await runInstance.runStep(tree.branches[0].steps[0], tree.branches[0], false);

                expect(runInstance.one).to.equal("foobar");

                expect(tree.branches[0].error).to.equal(undefined);
                expect(tree.branches[0].steps[0].error).to.equal(undefined);
            });

            it("executes a function call where {variables} are passed in and are only set in a later step, which is a synchronous code block", async () => {
                let tree = new Tree();
                tree.parseIn(`
My {var:} Function
    {var} = Set that var {
        return 'foobar';
    }

* My {{one}} Function {
    runInstance.one = one;
}
                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                let runInstance = new RunInstance(runner);
                runInstance.currBranch = tree.branches[0];

                runInstance.currStep = tree.branches[0].steps[0];
                await runInstance.runStep(tree.branches[0].steps[0], tree.branches[0], false);

                expect(runInstance.one).to.equal("foobar");

                expect(tree.branches[0].error).to.equal(undefined);
                expect(tree.branches[0].steps[0].error).to.equal(undefined);
            });

            it("executes a function call has a {variable} passed in and it is only set in a later step, which is an asynchronous code block", async () => {
                let tree = new Tree();
                tree.parseIn(`
My {var:} Function
    {var} = Set that var {
        return new Promise((resolve, reject) => {});
    }

* My {{one}} Function {
    runInstance.one = one;
}
                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                let runInstance = new RunInstance(runner);
                runInstance.currBranch = tree.branches[0];

                runInstance.currStep = tree.branches[0].steps[0];
                await runInstance.runStep(tree.branches[0].steps[0], tree.branches[0], false);

                expect(runInstance.one instanceof Promise).to.equal(true);

                expect(tree.branches[0].error).to.equal(undefined);
                expect(tree.branches[0].steps[0].error).to.equal(undefined);
            });

            it("fails step if a function call has a {variable} passed in and it is never set", async () => {
                let tree = new Tree();
                tree.parseIn(`
My {var} Function

* My {{one}} Function {
    runInstance.one = one;
}
                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                let runInstance = new RunInstance(runner);

                await runInstance.runStep(tree.branches[0].steps[0], tree.branches[0], false);

                expect(tree.branches[0].steps[0].error.message).to.contain("The variable {var} wasn't set, but is needed for this step");
                expect(tree.branches[0].steps[0].error.filename).to.equal("file.txt");
                expect(tree.branches[0].steps[0].error.lineNumber).to.equal(2);

                expect(tree.branches[0].error).to.equal(undefined);
            });

            it("executes a function call where 'strings' containing vars are passed in and those vars are only set in a later step, which is in format {var}='string'", async () => {
                let tree = new Tree();
                tree.parseIn(`
My 'so called {var:}' Function
    {var} = 'foobar'

* My {{one}} Function {
    runInstance.one = one;
}
                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                let runInstance = new RunInstance(runner);
                runInstance.currBranch = tree.branches[0];

                runInstance.currStep = tree.branches[0].steps[0];
                await runInstance.runStep(tree.branches[0].steps[0], tree.branches[0], false);

                expect(runInstance.one).to.equal("so called foobar");

                expect(tree.branches[0].error).to.equal(undefined);
                expect(tree.branches[0].steps[0].error).to.equal(undefined);
            });

            it("executes a function call where 'strings' containing vars are passed in and those vars are only set in a later step, which is a synchronous code block", async () => {
                let tree = new Tree();
                tree.parseIn(`
My 'so called {var :}' Function
    {var} = Set that var {
        return 'foobar';
    }

* My {{one}} Function {
    runInstance.one = one;
}
                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                let runInstance = new RunInstance(runner);
                runInstance.currBranch = tree.branches[0];

                runInstance.currStep = tree.branches[0].steps[0];
                await runInstance.runStep(tree.branches[0].steps[0], tree.branches[0], false);

                expect(runInstance.one).to.equal("so called foobar");

                expect(tree.branches[0].error).to.equal(undefined);
                expect(tree.branches[0].steps[0].error).to.equal(undefined);
            });

            it("fails step if a function call has a 'string' containing a let passed in and that let is only set in a later step, which is an asynchronous code block", async () => {
                let tree = new Tree();
                tree.parseIn(`
My 'so called {var :}' Function
    {var} = Set that var {
        return new Promise((resolve, reject) => { resolve('foobar'); });
    }

* My {{one}} Function {
    runInstance.one = one;
}
                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                let runInstance = new RunInstance(runner);
                runInstance.currBranch = tree.branches[0];

                runInstance.currStep = tree.branches[0].steps[0];
                await runInstance.runStep(tree.branches[0].steps[0], tree.branches[0], false);

                expect(tree.branches[0].steps[0].error.message).to.contain("The variable {var :} must be set to a string");
                expect(tree.branches[0].steps[0].error.filename).to.equal("file.txt");
                expect(tree.branches[0].steps[0].error.lineNumber).to.equal(2);

                expect(tree.branches[0].error).to.equal(undefined);
            });

            it("fails step if a function call has a 'string' containing a let that is never set", async () => {
                let tree = new Tree();
                tree.parseIn(`
My 'so called {var}' Function

* My {{one}} Function {
    runInstance.one = one;
}
                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                let runInstance = new RunInstance(runner);

                await runInstance.runStep(tree.branches[0].steps[0], tree.branches[0], false);

                expect(tree.branches[0].steps[0].error.message).to.contain("The variable {var} wasn't set, but is needed for this step");
                expect(tree.branches[0].steps[0].error.filename).to.equal("file.txt");
                expect(tree.branches[0].steps[0].error.lineNumber).to.equal(2);

                expect(tree.branches[0].error).to.equal(undefined);
            });

            it("executes a function call where the function has no steps inside of it", async () => {
                let tree = new Tree();
                tree.parseIn(`
My Function

* My Function
                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                let runInstance = new RunInstance(runner);

                await runInstance.runStep(tree.branches[0].steps[0], tree.branches[0], false);

                expect(tree.branches[0].error).to.equal(undefined);
                expect(tree.branches[0].steps[0].error).to.equal(undefined);
            });

            it("executes a function call with only a {{variable}} in its function declaration", async () => {
                let tree = new Tree();
                tree.parseIn(`
'foobar'

* {{input}} {
    runInstance.one = input;
}
                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                let runInstance = new RunInstance(runner);

                await runInstance.runStep(tree.branches[0].steps[0], tree.branches[0], false);

                expect(runInstance.one).to.equal('foobar');

                expect(tree.branches[0].error).to.equal(undefined);
                expect(tree.branches[0].steps[0].error).to.equal(undefined);
            });

            it("executes a function call with only two {{variables}} in its function declaration", async () => {
                let tree = new Tree();
                tree.parseIn(`
'foo' 'bar'

* {{A}} {{B}} {
    runInstance.one = A;
    runInstance.two = B;
}
                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                let runInstance = new RunInstance(runner);

                await runInstance.runStep(tree.branches[0].steps[0], tree.branches[0], false);

                expect(runInstance.one).to.equal('foo');
                expect(runInstance.two).to.equal('bar');

                expect(tree.branches[0].error).to.equal(undefined);
                expect(tree.branches[0].steps[0].error).to.equal(undefined);
            });

            it("executes a multi-level step block", async () => {
                let tree = new Tree();
                tree.parseIn(`
[
    F {
        runInstance.one = true;
    }
]
                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                let runInstance = new RunInstance(runner);

                await runInstance.runStep(tree.branches[0].steps[0], tree.branches[0], false);
                await runInstance.runStep(tree.branches[0].steps[1], tree.branches[0], false);

                expect(runInstance.one).to.equal(true);

                expect(tree.branches[0].error).to.equal(undefined);
                expect(tree.branches[0].steps[0].error).to.equal(undefined);
                expect(tree.branches[0].steps[1].error).to.equal(undefined);
            });
        });

        context("passing in {vars}", () => {
            it("allows {{variables}} passed in through a function call to be accessed by steps inside the function", async () => {
                let tree = new Tree();
                tree.parseIn(`
My {var:} Function
    {var} = 'foobar'

* My {{one}} Function

    Another step {
        runInstance.one = one;
    }
                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                let runInstance = new RunInstance(runner);
                runInstance.currBranch = tree.branches[0];

                runInstance.currStep = tree.branches[0].steps[0];
                await runInstance.runStep(tree.branches[0].steps[0], tree.branches[0], false);

                runInstance.currStep = tree.branches[0].steps[1];
                await runInstance.runStep(tree.branches[0].steps[1], tree.branches[0], false);

                expect(runInstance.one).to.equal("foobar");

                expect(tree.branches[0].error).to.equal(undefined);
                expect(tree.branches[0].steps[0].error).to.equal(undefined);
                expect(tree.branches[0].steps[1].error).to.equal(undefined);
            });

            it("allows {{variables}} passed in through a function call to be accessed by the function's code block", async () => {
                let tree = new Tree();
                tree.parseIn(`
My {var:} Function
    {var} = 'foobar'

* My {{one}} Function {
    runInstance.one = one;
}
                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                let runInstance = new RunInstance(runner);
                runInstance.currBranch = tree.branches[0];

                runInstance.currStep = tree.branches[0].steps[0];
                await runInstance.runStep(tree.branches[0].steps[0], tree.branches[0], false);

                expect(runInstance.one).to.equal("foobar");

                expect(tree.branches[0].error).to.equal(undefined);
                expect(tree.branches[0].steps[0].error).to.equal(undefined);
            });

            it("allows {{variables}} to be accessed through a non-function-call code block", async () => {
                let tree = new Tree();
                tree.parseIn(`
{{var1}} = 'foobar'

    Another step {
        runInstance.one = var1;
    }
                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                let runInstance = new RunInstance(runner);

                await runInstance.runStep(tree.branches[0].steps[0], tree.branches[0], false);
                await runInstance.runStep(tree.branches[0].steps[1], tree.branches[0], false);

                expect(runInstance.one).to.equal("foobar");

                expect(tree.branches[0].error).to.equal(undefined);
                expect(tree.branches[0].steps[0].error).to.equal(undefined);
                expect(tree.branches[0].steps[1].error).to.equal(undefined);
            });

            it("{global} variables passed in retain their value after the end of the function", async () => {
                let tree = new Tree();
                tree.parseIn(`
My 'foo' and 'bar' and 'FU' and 'ba arr' Function

    Save var values {
        runInstance.globalOne = g("one");
        runInstance.globalTwo = g("two");
        runInstance.globalThree = g("three");
        runInstance.globalFour = g("four");

        runInstance.localOne = l("one");
        runInstance.localTwo = l("two");
        runInstance.localThree = l("three");
        runInstance.localFour = l("four");
    }

* My {{one}} and {two} and {three} and {{four}} Function {
    // something
}
                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                let runInstance = new RunInstance(runner);
                runInstance.currBranch = tree.branches[0];

                runInstance.currStep = tree.branches[0].steps[0];
                await runInstance.runStep(tree.branches[0].steps[0], tree.branches[0], false);

                runInstance.currStep = tree.branches[0].steps[1];
                await runInstance.runStep(tree.branches[0].steps[1], tree.branches[0], false);

                expect(runInstance.globalOne).to.equal(undefined);
                expect(runInstance.globalTwo).to.equal("bar");
                expect(runInstance.globalThree).to.equal("FU");
                expect(runInstance.globalFour).to.equal(undefined);

                expect(runInstance.localOne).to.equal(undefined);
                expect(runInstance.localTwo).to.equal(undefined);
                expect(runInstance.localThree).to.equal(undefined);
                expect(runInstance.localFour).to.equal(undefined);

                expect(tree.branches[0].error).to.equal(undefined);
                expect(tree.branches[0].steps[0].error).to.equal(undefined);
                expect(tree.branches[0].steps[1].error).to.equal(undefined);
            });

            it("allows {{variables}} passed in through a function call where there is no whitespace between them", async () => {
                let tree = new Tree();
                tree.parseIn(`
GET /api/something?param1='foo'&param2='bar'&param3=blah

* GET /api/something?param1={{one}}&param2={{two}}&param3=blah {
    runInstance.one = one;
    runInstance.two = two;
}
                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                let runInstance = new RunInstance(runner);
                runInstance.currBranch = tree.branches[0];

                runInstance.currStep = tree.branches[0].steps[0];
                await runInstance.runStep(tree.branches[0].steps[0], tree.branches[0], false);

                expect(runInstance.one).to.equal("foo");
                expect(runInstance.two).to.equal("bar");

                expect(tree.branches[0].error).to.equal(undefined);
                expect(tree.branches[0].steps[0].error).to.equal(undefined);
            });

            it("allows a {global} variable passed into a function to be accessible by functions declared within, when called in context", async () => {
                let tree = new Tree();
                tree.parseIn(`
Request '6'
    Verify

* Request {num} {
    // do the request
}

    * Verify {
        runInstance.one = num;
    }
                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                let runInstance = new RunInstance(runner);
                runInstance.currBranch = tree.branches[0];

                runInstance.currStep = tree.branches[0].steps[0];
                await runInstance.runStep(tree.branches[0].steps[0], tree.branches[0], false);

                runInstance.currStep = tree.branches[0].steps[1];
                await runInstance.runStep(tree.branches[0].steps[1], tree.branches[0], false);

                expect(runInstance.one).to.equal('6');

                expect(tree.branches[0].error).to.equal(undefined);
                expect(tree.branches[0].steps[0].error).to.equal(undefined);
                expect(tree.branches[0].steps[1].error).to.equal(undefined);
            });

            it("allows a {global} variable to be accessed within a multi-level step block", async () => {
                let tree = new Tree();
                tree.parseIn(`
{var1}='foobar'
    [
        F {
            runInstance.one = var1;
        }
    ]
                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                let runInstance = new RunInstance(runner);
                runInstance.currBranch = tree.branches[0];

                runInstance.currStep = tree.branches[0].steps[0];
                await runInstance.runStep(tree.branches[0].steps[0], tree.branches[0], false);

                runInstance.currStep = tree.branches[0].steps[1];
                await runInstance.runStep(tree.branches[0].steps[1], tree.branches[0], false);

                runInstance.currStep = tree.branches[0].steps[2];
                await runInstance.runStep(tree.branches[0].steps[2], tree.branches[0], false);

                expect(runInstance.one).to.equal('foobar');

                expect(tree.branches[0].error).to.equal(undefined);
                expect(tree.branches[0].steps[0].error).to.equal(undefined);
                expect(tree.branches[0].steps[1].error).to.equal(undefined);
                expect(tree.branches[0].steps[2].error).to.equal(undefined);
            });

            it("ignores {{variables}} inside the text of a textual step", async () => {
                let tree = new Tree();
                tree.parseIn(`
A textual step {{var1}} -

    {{var1}} = 'foobar'

        Another textual step {{var2}} -
                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                let runInstance = new RunInstance(runner);

                await runInstance.runStep(tree.branches[0].steps[0], tree.branches[0], false);
                await runInstance.runStep(tree.branches[0].steps[1], tree.branches[0], false);
                await runInstance.runStep(tree.branches[0].steps[2], tree.branches[0], false);

                expect(tree.branches[0].error).to.equal(undefined);
                expect(tree.branches[0].steps[0].error).to.equal(undefined);
                expect(tree.branches[0].steps[1].error).to.equal(undefined);
                expect(tree.branches[0].steps[2].error).to.equal(undefined);
            });

            it("ignores {{variables}} inside the text of a textual step with a code block, but those {{variables}} are still accessible inside the code block nonetheless", async () => {
                let tree = new Tree();
                tree.parseIn(`
{{var1}} = 'foobar'

    Another step {{var1}} {
        runInstance.one = var1;
    }
                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                let runInstance = new RunInstance(runner);

                await runInstance.runStep(tree.branches[0].steps[0], tree.branches[0], false);
                await runInstance.runStep(tree.branches[0].steps[1], tree.branches[0], false);

                expect(runInstance.one).to.equal("foobar");

                expect(tree.branches[0].error).to.equal(undefined);
                expect(tree.branches[0].steps[0].error).to.equal(undefined);
                expect(tree.branches[0].steps[1].error).to.equal(undefined);
            });

            it("executes a function call where 'string with {var}' is passed in, with another step being {var}='string with apos \' '", async () => {
                let tree = new Tree();
                tree.parseIn(`
My 'string with {var:}' Function
    {var} = 'string with apos \\\' '

* My {{one}} Function {
    runInstance.one = one;
}
                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                let runInstance = new RunInstance(runner);
                runInstance.currBranch = tree.branches[0];

                runInstance.currStep = tree.branches[0].steps[0];
                await runInstance.runStep(tree.branches[0].steps[0], tree.branches[0], false);

                expect(runInstance.one).to.equal("string with string with apos ' ");

                expect(tree.branches[0].error).to.equal(undefined);
                expect(tree.branches[0].steps[0].error).to.equal(undefined);
            });

            it("executes a function call where 'string with {var}' is passed in, with another step being {var}=\"string with apos ' \"", async () => {
                let tree = new Tree();
                tree.parseIn(`
My 'string with {var :}' Function
    {var} = "string with apos ' "

* My {{one}} Function {
    runInstance.one = one;
}
                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                let runInstance = new RunInstance(runner);
                runInstance.currBranch = tree.branches[0];

                runInstance.currStep = tree.branches[0].steps[0];
                await runInstance.runStep(tree.branches[0].steps[0], tree.branches[0], false);

                expect(runInstance.one).to.equal("string with string with apos ' ");

                expect(tree.branches[0].error).to.equal(undefined);
                expect(tree.branches[0].steps[0].error).to.equal(undefined);
            });

            it("executes a function call with nothing in its body", async () => {
                let tree = new Tree();
                tree.parseIn(`
My 'foobar' Function

* My {{one}} Function {
}
                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                let runInstance = new RunInstance(runner);

                await runInstance.runStep(tree.branches[0].steps[0], tree.branches[0], false);

                expect(runInstance.getLocal("one")).to.equal("foobar");

                expect(tree.branches[0].error).to.equal(undefined);
                expect(tree.branches[0].steps[0].error).to.equal(undefined);
            });

            it("handles a function declaration where multiple {{variables}} have the same name", async () => {
                let tree = new Tree();
                tree.parseIn(`
My 'foo' Function 'bar'

* My {{one}} Function {{one}} {
    runInstance.one = one;
    runInstance.two = getLocal("one");
}
                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                let runInstance = new RunInstance(runner);

                await runInstance.runStep(tree.branches[0].steps[0], tree.branches[0], false);

                expect(runInstance.one).to.equal("bar");
                expect(runInstance.two).to.equal("bar");

                expect(tree.branches[0].error).to.equal(undefined);
                expect(tree.branches[0].steps[0].error).to.equal(undefined);
            });

            it('step text is accessible via getCurrStepNode()', async () => {
                let tree = new Tree();
                tree.parseIn(`
My 'foo' Function 'bar' other text

* My {{one}} Function {{two}} other text {
    runInstance.one = one;
    runInstance.two = two;
    runInstance.three = getCurrStepNode().text;
}
                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                let runInstance = new RunInstance(runner);

                runInstance.currStep = tree.branches[0].steps[0];
                await runInstance.runStep(tree.branches[0].steps[0], tree.branches[0], false);

                expect(runInstance.one).to.equal("foo");
                expect(runInstance.two).to.equal("bar");
                expect(runInstance.three).to.equal("My 'foo' Function 'bar' other text");

                expect(tree.branches[0].error).to.equal(undefined);
                expect(tree.branches[0].steps[0].error).to.equal(undefined);
            });
        });

        context("{var}='string'", () => {
            it("executes a {var} = 'string' step", async () => {
                let tree = new Tree();
                tree.parseIn(`
{var1} = 'foobar'
                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                let runInstance = new RunInstance(runner);

                await runInstance.runStep(tree.branches[0].steps[0], tree.branches[0], false);

                expect(runInstance.getLocal("var1")).to.equal(undefined);
                expect(runInstance.getGlobal("var1")).to.equal("foobar");
                expect(runInstance.getPersistent("var1")).to.equal(undefined);

                expect(tree.branches[0].error).to.equal(undefined);
                expect(tree.branches[0].steps[0].error).to.equal(undefined);
            });

            it("executes a {var} is 'string' step", async () => {
                let tree = new Tree();
                tree.parseIn(`
{var1} is 'foobar'
                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                let runInstance = new RunInstance(runner);

                await runInstance.runStep(tree.branches[0].steps[0], tree.branches[0], false);

                expect(runInstance.getLocal("var1")).to.equal(undefined);
                expect(runInstance.getGlobal("var1")).to.equal("foobar");
                expect(runInstance.getPersistent("var1")).to.equal(undefined);

                expect(tree.branches[0].error).to.equal(undefined);
                expect(tree.branches[0].steps[0].error).to.equal(undefined);
            });

            it("executes a {var} = 'string' step where the string has escaped special chars", async () => {
                let tree = new Tree();
                tree.parseIn(`
{var1} = 'escaped single quote: \\' escaped backslash: \\\\ newline: \\n backslash-n: \\\\n'
    {var2} = '\\n\\0{var1}\\\\\\b'
                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                let runInstance = new RunInstance(runner);

                await runInstance.runStep(tree.branches[0].steps[0], tree.branches[0], false);
                expect(runInstance.g("var1")).to.equal("escaped single quote: ' escaped backslash: \\ newline: \n backslash-n: \\n");

                await runInstance.runStep(tree.branches[0].steps[1], tree.branches[0], false);
                expect(runInstance.g("var2")).to.equal("\n\0escaped single quote: ' escaped backslash: \\ newline: \n backslash-n: \\n\\\b");

                expect(tree.branches[0].error).to.equal(undefined);
                expect(tree.branches[0].steps[0].error).to.equal(undefined);
                expect(tree.branches[0].steps[1].error).to.equal(undefined);
            });

            it("executes a {{var}} = 'string' step", async () => {
                let tree = new Tree();
                tree.stepDataMode = 'all';
                tree.parseIn(`
{{var1}} = 'foobar'
                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                let runInstance = new RunInstance(runner);

                await runInstance.runStep(tree.branches[0].steps[0], tree.branches[0], false);

                expect(runInstance.getLocal("var1")).to.equal("foobar");
                expect(runInstance.getGlobal("var1")).to.equal(undefined);
                expect(runInstance.getPersistent("var1")).to.equal(undefined);

                expect(tree.branches[0].error).to.equal(undefined);
                expect(tree.branches[0].steps[0].error).to.equal(undefined);

                expect(tree.branches[0].steps[0].log).to.eql([
                    {text: "Setting {{var1}} to 'foobar'"},
                ]);
            });

            it("executes a {var} = \"string\" step", async () => {
                let tree = new Tree();
                tree.parseIn(`
{var1} = "foobar"
                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                let runInstance = new RunInstance(runner);

                await runInstance.runStep(tree.branches[0].steps[0], tree.branches[0], false);

                expect(runInstance.getLocal("var1")).to.equal(undefined);
                expect(runInstance.getGlobal("var1")).to.equal("foobar");
                expect(runInstance.getPersistent("var1")).to.equal(undefined);

                expect(tree.branches[0].error).to.equal(undefined);
                expect(tree.branches[0].steps[0].error).to.equal(undefined);
            });

            it("executes a {var} = [string] step", async () => {
                let tree = new Tree();
                tree.parseIn(`
{var1} = [foobar]
                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                let runInstance = new RunInstance(runner);

                await runInstance.runStep(tree.branches[0].steps[0], tree.branches[0], false);

                expect(runInstance.getLocal("var1")).to.equal(undefined);
                expect(runInstance.getGlobal("var1")).to.equal("foobar");
                expect(runInstance.getPersistent("var1")).to.equal(undefined);

                expect(tree.branches[0].error).to.equal(undefined);
                expect(tree.branches[0].steps[0].error).to.equal(undefined);
            });

            it("executes a {var} = '{other var}' step", async () => {
                let tree = new Tree();
                tree.parseIn(`
..
{var1} = 'foobar'
{var2} = '{var1} blah {var3:}'
{var3} = "bleh"
                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                let runInstance = new RunInstance(runner);
                runInstance.currBranch = tree.branches[0];

                runInstance.currStep = tree.branches[0].steps[0];
                await runInstance.runStep(tree.branches[0].steps[0], tree.branches[0], false);

                runInstance.currStep = tree.branches[0].steps[1];
                await runInstance.runStep(tree.branches[0].steps[1], tree.branches[0], false);

                runInstance.currStep = tree.branches[0].steps[2];
                await runInstance.runStep(tree.branches[0].steps[2], tree.branches[0], false);

                expect(runInstance.getGlobal("var1")).to.equal("foobar");
                expect(runInstance.getGlobal("var2")).to.equal("foobar blah bleh");
                expect(runInstance.getGlobal("var3")).to.equal("bleh");

                expect(tree.branches[0].error).to.equal(undefined);
                expect(tree.branches[0].steps[0].error).to.equal(undefined);
                expect(tree.branches[0].steps[1].error).to.equal(undefined);
                expect(tree.branches[0].steps[2].error).to.equal(undefined);
            });

            it("executes a {var1} = '{var2} {{var2}} [something]' step", async () => {
                let tree = new Tree();
                tree.stepDataMode = 'all';
                tree.parseIn(`
..
{var1} = 'foobar'
{var2} = '{var1} blah {{ var2 : }} [something]'
{{var2}} = "bleh"
                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                let runInstance = new RunInstance(runner);
                runInstance.currBranch = tree.branches[0];

                runInstance.currStep = tree.branches[0].steps[0];
                await runInstance.runStep(tree.branches[0].steps[0], tree.branches[0], false);

                runInstance.currStep = tree.branches[0].steps[1];
                await runInstance.runStep(tree.branches[0].steps[1], tree.branches[0], false);

                runInstance.currStep = tree.branches[0].steps[2];
                await runInstance.runStep(tree.branches[0].steps[2], tree.branches[0], false);

                expect(runInstance.getGlobal("var1")).to.equal("foobar");
                expect(runInstance.getGlobal("var2")).to.equal("foobar blah bleh [something]");
                expect(runInstance.getLocal("var2")).to.equal("bleh");

                expect(tree.branches[0].error).to.equal(undefined);
                expect(tree.branches[0].steps[0].error).to.equal(undefined);
                expect(tree.branches[0].steps[1].error).to.equal(undefined);
                expect(tree.branches[0].steps[2].error).to.equal(undefined);

                expect(tree.branches[0].steps[1].log[1]).to.eql( {text: "Setting {var2} to 'foobar blah bleh \\[something\\]'"} );
            });

            it("executes a {var1} = [ 'string {var2}' {{var3}} ] step", async () => {
                let tree = new Tree();
                tree.parseIn(`
..
{ var1 } = 'foobar'
{var2} = [ 'string {  var1  }' {{var2:}} ]
{{var2}} = "bleh"
                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                let runInstance = new RunInstance(runner);

                runInstance.currBranch = tree.branches[0];

                runInstance.currStep = tree.branches[0].steps[0];
                await runInstance.runStep(tree.branches[0].steps[0], tree.branches[0], false);

                runInstance.currStep = tree.branches[0].steps[1];
                await runInstance.runStep(tree.branches[0].steps[1], tree.branches[0], false);

                runInstance.currStep = tree.branches[0].steps[2];
                await runInstance.runStep(tree.branches[0].steps[2], tree.branches[0], false);

                expect(runInstance.getGlobal("var1")).to.equal("foobar");
                expect(runInstance.getGlobal("var2")).to.equal(" 'string foobar' bleh ");
                expect(runInstance.getLocal("var2")).to.equal("bleh");

                expect(tree.branches[0].error).to.equal(undefined);
                expect(tree.branches[0].steps[0].error).to.equal(undefined);
                expect(tree.branches[0].steps[1].error).to.equal(undefined);
                expect(tree.branches[0].steps[2].error).to.equal(undefined);
            });

            it("executes a {var1} = 'string1', {{var2}} = 'string2', {{var3}} = [string3] etc. step", async () => {
                let tree = new Tree();
                tree.parseIn(`
{var1} = 'one', {{var2}} = "two", {{ var 3 }}=[three]
                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                let runInstance = new RunInstance(runner);

                await runInstance.runStep(tree.branches[0].steps[0], tree.branches[0], false);

                expect(runInstance.getGlobal("var1")).to.equal("one");
                expect(runInstance.getLocal("var2")).to.equal("two");
                expect(runInstance.getLocal("var 3")).to.equal("three");

                expect(tree.branches[0].error).to.equal(undefined);
                expect(tree.branches[0].steps[0].error).to.equal(undefined);
            });

            it("executes a {var1} is 'string1', {{var2}} is 'string2', {{var3}} is [string3] etc. step", async () => {
                let tree = new Tree();
                tree.parseIn(`
{var1} is 'one', {{var2}} is "two", {{ var 3 }}is[three]
                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                let runInstance = new RunInstance(runner);

                await runInstance.runStep(tree.branches[0].steps[0], tree.branches[0], false);

                expect(runInstance.getGlobal("var1")).to.equal("one");
                expect(runInstance.getLocal("var2")).to.equal("two");
                expect(runInstance.getLocal("var 3")).to.equal("three");

                expect(tree.branches[0].error).to.equal(undefined);
                expect(tree.branches[0].steps[0].error).to.equal(undefined);
            });
        });

        context("{var}=Function", () => {
            it("executes a {var} = Text { code block } step", async () => {
                let tree = new Tree();
                tree.parseIn(`
{var1} = Text {
    return "foobar";
}
                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                let runInstance = new RunInstance(runner);

                await runInstance.runStep(tree.branches[0].steps[0], tree.branches[0], false);

                expect(runInstance.getGlobal("var1")).to.equal("foobar");

                expect(tree.branches[0].error).to.equal(undefined);
                expect(tree.branches[0].steps[0].error).to.equal(undefined);
            });

            it("executes a {var} = Function step, where the function declaration has a code block that returns a value", async () => {
                let tree = new Tree();
                tree.parseIn(`
{var1} = My function

* My function {
    return "foobar";
}
                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                let runInstance = new RunInstance(runner);

                await runInstance.runStep(tree.branches[0].steps[0], tree.branches[0], false);

                expect(runInstance.getGlobal("var1")).to.equal("foobar");

                expect(tree.branches[0].error).to.equal(undefined);
                expect(tree.branches[0].steps[0].error).to.equal(undefined);
            });

            it("executes a Function step, without {var}=, where the function declaration has a code block that returns a value", async () => {
                let tree = new Tree();
                tree.parseIn(`
My function

* My function {
    return "foobar";
}
                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                let runInstance = new RunInstance(runner);

                await runInstance.runStep(tree.branches[0].steps[0], tree.branches[0], false);

                expect(tree.branches[0].error).to.equal(undefined);
                expect(tree.branches[0].steps[0].error).to.equal(undefined);
            });

            it("executes a {var} = Function step, where the function declaration has a code block that returns a value asynchonously", async () => {
                let tree = new Tree();
                tree.parseIn(`
{var} = Set that var {
    return await new Promise((resolve, reject) => {
        setTimeout(() => {
            resolve("foobar");
        }, 1);
    });
}
    My {var} Function

* My {{one}} Function {
    runInstance.one = one;
}
                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                let runInstance = new RunInstance(runner);

                await runInstance.runStep(tree.branches[0].steps[0], tree.branches[0], false);
                await runInstance.runStep(tree.branches[0].steps[1], tree.branches[0], false);

                expect(runInstance.one).to.equal("foobar");

                expect(tree.branches[0].error).to.equal(undefined);
                expect(tree.branches[0].steps[0].error).to.equal(undefined);
                expect(tree.branches[0].steps[1].error).to.equal(undefined);
            });

            it("executes a {var} = Function step, where the function declaration has {{variables}} and has a code block that returns a value", async () => {
                let tree = new Tree();
                tree.parseIn(`
{var1} = My "foobar" function

* My {{one}} function {
    return one + ' blah!';
}
                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                let runInstance = new RunInstance(runner);

                await runInstance.runStep(tree.branches[0].steps[0], tree.branches[0], false);

                expect(runInstance.getGlobal("var1")).to.equal("foobar blah!");

                expect(tree.branches[0].error).to.equal(undefined);
                expect(tree.branches[0].steps[0].error).to.equal(undefined);
            });

            it("executes a {var} = Function with {vars passed in} step, where the function declaration has {{variables}} and has a code block that returns a value", async () => {
                let tree = new Tree();
                tree.parseIn(`
{var1} = My {var2:} function
    {var2}='foobar'

* My {{one}} function {
    return one + ' blah!';
}
                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                let runInstance = new RunInstance(runner);

                runInstance.currBranch = tree.branches[0];
                runInstance.currStep = tree.branches[0].steps[0];
                await runInstance.runStep(tree.branches[0].steps[0], tree.branches[0], false);

                expect(runInstance.getGlobal("var1")).to.equal("foobar blah!");

                expect(tree.branches[0].error).to.equal(undefined);
                expect(tree.branches[0].steps[0].error).to.equal(undefined);
            });

            it("executes a {var} = Function step, where the function declaration is in {x}='value' format", async () => {
                let tree = new Tree();
                tree.parseIn(`
{var1} = My function

* My function
    {x}='foobar'
                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                let runInstance = new RunInstance(runner);

                await runInstance.runStep(tree.branches[0].steps[0], tree.branches[0], false);
                expect(runInstance.getGlobal("var1")).to.equal(undefined); // not set yet, as {var1} will be set on the next step ({x}='foobar')

                await runInstance.runStep(tree.branches[0].steps[1], tree.branches[0], false);
                expect(runInstance.getGlobal("var1")).to.equal("foobar");

                expect(tree.branches[0].error).to.equal(undefined);
                expect(tree.branches[0].steps[0].error).to.equal(undefined);
                expect(tree.branches[0].steps[1].error).to.equal(undefined);
            });

            it("executes a {var} = Function step, where the function declaration is in {x}='value' and {x}=Func format", async () => {
                let tree = new Tree();
                tree.parseIn(`
{var1} = My function

* My function
    {x} = My function 2

* My function 2
    {y}='foobar'
                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                let runInstance = new RunInstance(runner);

                await runInstance.runStep(tree.branches[0].steps[0], tree.branches[0], false);
                expect(runInstance.getGlobal("var1")).to.equal(undefined);

                await runInstance.runStep(tree.branches[0].steps[1], tree.branches[0], false);
                expect(runInstance.getGlobal("var1")).to.equal(undefined);

                await runInstance.runStep(tree.branches[0].steps[2], tree.branches[0], false);
                expect(runInstance.getGlobal("var1")).to.equal("foobar");

                expect(tree.branches[0].error).to.equal(undefined);
                expect(tree.branches[0].steps[0].error).to.equal(undefined);
                expect(tree.branches[0].steps[1].error).to.equal(undefined);
                expect(tree.branches[0].steps[2].error).to.equal(undefined);
            });
        });

        context("code blocks", () => {
            it("allows a code block to get local, global, and persistent variables via getter functions", async () => {
                let tree = new Tree();
                tree.parseIn(`
Text {
    runInstance.one = p("one");
    runInstance.two = g("two");
    runInstance.three = l("three");
}
                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                let runInstance = new RunInstance(runner);
                runInstance.p("one", "first");
                runInstance.g("two", "second");
                runInstance.l("three", "third");

                await runInstance.runStep(tree.branches[0].steps[0], tree.branches[0], false);

                expect(runInstance.one).to.equal("first");
                expect(runInstance.two).to.equal("second");
                expect(runInstance.three).to.equal("third");

                expect(tree.branches[0].error).to.equal(undefined);
                expect(tree.branches[0].steps[0].error).to.equal(undefined);
            });

            it("allows a code block to set local, global, and persistent variables via setter functions", async () => {
                let tree = new Tree();
                tree.parseIn(`
Text {
    p("one", "first");
    g("two", "second");
    l("three", "third");
}
                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                let runInstance = new RunInstance(runner);

                await runInstance.runStep(tree.branches[0].steps[0], tree.branches[0], false);

                expect(runInstance.p("one")).to.equal("first");
                expect(runInstance.g("two")).to.equal("second");
                expect(runInstance.l("three")).to.equal("third");

                expect(tree.branches[0].error).to.equal(undefined);
                expect(tree.branches[0].steps[0].error).to.equal(undefined);
            });

            it("makes a passed-in {{variable}} accessible as a plain js variable inside a code block", async () => {
                let tree = new Tree();
                tree.parseIn(`
My 'foo' "bar" function

* My {{$One_two_123$}} {{three}} function {
    runInstance.one = $One_two_123$;
    runInstance.three = three;

    runInstance.four = getLocal("$One_two_123$");
    runInstance.five = getLocal("three");
}
                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                let runInstance = new RunInstance(runner);

                await runInstance.runStep(tree.branches[0].steps[0], tree.branches[0], false);

                expect(runInstance.one).to.equal("foo");
                expect(runInstance.three).to.equal("bar");
                expect(runInstance.four).to.equal("foo");
                expect(runInstance.five).to.equal("bar");

                expect(tree.branches[0].error).to.equal(undefined);
                expect(tree.branches[0].steps[0].error).to.equal(undefined);
            });

            it("does not make a passed-in {{variable}} accessible as a plain js variable inside a code block if it has non-whitelisted chars in its name", async () => {
                let tree = new Tree();
                tree.parseIn(`
My 'foobar' function

* My {{one%}} function {
    runInstance.one = one%;
}
                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                let runInstance = new RunInstance(runner);

                await runInstance.runStep(tree.branches[0].steps[0], tree.branches[0], false);

                expect(tree.branches[0].steps[0].error.message).to.contain("Unexpected token ;");
                expect(tree.branches[0].steps[0].error.filename).to.equal("file.txt");
                expect(tree.branches[0].steps[0].error.lineNumber).to.equal(4);

                expect(tree.branches[0].error).to.equal(undefined);
            });

            it("does not make a passed-in {{variable}} accessible as a plain js variable inside a code block if its name is blacklisted", async () => {
                let tree = new Tree();
                tree.parseIn(`
My 'foobar' function

* My {{for}} function {
    runInstance.one = for;
}
                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                let runInstance = new RunInstance(runner);

                await runInstance.runStep(tree.branches[0].steps[0], tree.branches[0], false);

                expect(tree.branches[0].steps[0].error.message).to.contain("Unexpected token for");
                expect(tree.branches[0].steps[0].error.filename).to.equal("file.txt");
                expect(tree.branches[0].steps[0].error.lineNumber).to.equal(4);

                expect(tree.branches[0].error).to.equal(undefined);
            });

            it("makes a {variable} accessible as a plain js variable inside a code block", async () => {
                let tree = new Tree();
                tree.parseIn(`
{one}='foobar'
    My function
        Other {
            runInstance.two = one;
        }

* My function {
    runInstance.one = one;
}
                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                let runInstance = new RunInstance(runner);

                await runInstance.runStep(tree.branches[0].steps[0], tree.branches[0], false);
                await runInstance.runStep(tree.branches[0].steps[1], tree.branches[0], false);
                await runInstance.runStep(tree.branches[0].steps[2], tree.branches[0], false);

                expect(runInstance.one).to.equal("foobar");
                expect(runInstance.two).to.equal("foobar");

                expect(tree.branches[0].error).to.equal(undefined);
                expect(tree.branches[0].steps[0].error).to.equal(undefined);
                expect(tree.branches[0].steps[1].error).to.equal(undefined);
                expect(tree.branches[0].steps[2].error).to.equal(undefined);
            });

            it("does not make a {{variable}} accessible as a plain js variable inside a function's code block", async () => {
                let tree = new Tree();
                tree.parseIn(`
{{one}}='foobar'
    My function

* My function {
    runInstance.one = one;
}
                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                let runInstance = new RunInstance(runner);

                await runInstance.runStep(tree.branches[0].steps[0], tree.branches[0], false);
                await runInstance.runStep(tree.branches[0].steps[1], tree.branches[0], false);

                expect(tree.branches[0].steps[1].error.message).to.contain("one is not defined");
                expect(tree.branches[0].steps[1].error.filename).to.equal("file.txt");
                expect(tree.branches[0].steps[1].error.lineNumber).to.equal(6);

                expect(tree.branches[0].error).to.equal(undefined);
                expect(tree.branches[0].steps[0].error).to.equal(undefined);
            });

            it("makes a {{variable}} accessible as a plain js variable inside a non-function code block", async () => {
                let tree = new Tree();
                tree.parseIn(`
{{one}}='foobar'
    Other {
        runInstance.one = one;
    }
        Other {
            runInstance.two = one;
        }
                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                let runInstance = new RunInstance(runner);

                await runInstance.runStep(tree.branches[0].steps[0], tree.branches[0], false);
                await runInstance.runStep(tree.branches[0].steps[1], tree.branches[0], false);

                expect(runInstance.one).to.equal("foobar");

                await runInstance.runStep(tree.branches[0].steps[2], tree.branches[0], false);

                expect(runInstance.two).to.equal("foobar");

                expect(tree.branches[0].error).to.equal(undefined);
                expect(tree.branches[0].steps[0].error).to.equal(undefined);
                expect(tree.branches[0].steps[1].error).to.equal(undefined);
                expect(tree.branches[0].steps[2].error).to.equal(undefined);
            });

            it("sets the plain js variable inside a code block to a passed-in {{variable}} when an existing {{variable}} of the same name is defined", async () => {
                let tree = new Tree();
                tree.parseIn(`
{{one}}='foo'

    Check that the original value is here {
        runInstance.one = one;
    }

        My 'bar' function

            Check that the original value is here {
                runInstance.three = one;
            }

* My {{one}} function {
    runInstance.two = one;
}
                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                let runInstance = new RunInstance(runner);

                await runInstance.runStep(tree.branches[0].steps[0], tree.branches[0], false);
                await runInstance.runStep(tree.branches[0].steps[1], tree.branches[0], false);
                await runInstance.runStep(tree.branches[0].steps[2], tree.branches[0], false);
                await runInstance.runStep(tree.branches[0].steps[3], tree.branches[0], false);

                expect(runInstance.one).to.equal("foo");
                expect(runInstance.two).to.equal("bar");
                expect(runInstance.three).to.equal("foo");

                expect(tree.branches[0].error).to.equal(undefined);
                expect(tree.branches[0].steps[0].error).to.equal(undefined);
                expect(tree.branches[0].steps[1].error).to.equal(undefined);
                expect(tree.branches[0].steps[2].error).to.equal(undefined);
                expect(tree.branches[0].steps[3].error).to.equal(undefined);
            });

            it("does not make a {{variable}} accessible as a plain js variable inside a code block if it has non-whitelisted chars in its name", async () => {
                let tree = new Tree();
                tree.parseIn(`
{{one%}}='foobar'
    My function

* My function {
    runInstance.one = one%;
}
                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                let runInstance = new RunInstance(runner);

                await runInstance.runStep(tree.branches[0].steps[0], tree.branches[0], false);
                await runInstance.runStep(tree.branches[0].steps[1], tree.branches[0], false);

                expect(tree.branches[0].steps[1].error.message).to.contain("Unexpected token ;");
                expect(tree.branches[0].steps[1].error.filename).to.equal("file.txt");
                expect(tree.branches[0].steps[1].error.lineNumber).to.equal(5);

                expect(tree.branches[0].error).to.equal(undefined);
                expect(tree.branches[0].steps[0].error).to.equal(undefined);
            });

            it("does not make a {{variable}} accessible as a plain js variable inside a code block if its name is blacklisted", async () => {
                let tree = new Tree();
                tree.parseIn(`
{{for}}='foobar'
    My function

* My function {
    runInstance.one = for;
}
                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                let runInstance = new RunInstance(runner);

                await runInstance.runStep(tree.branches[0].steps[0], tree.branches[0], false);
                await runInstance.runStep(tree.branches[0].steps[1], tree.branches[0], false);

                expect(tree.branches[0].steps[1].error.message).to.contain("Unexpected token for");
                expect(tree.branches[0].steps[1].error.filename).to.equal("file.txt");
                expect(tree.branches[0].steps[1].error.lineNumber).to.equal(5);

                expect(tree.branches[0].error).to.equal(undefined);
                expect(tree.branches[0].steps[0].error).to.equal(undefined);
            });

            it("when a {{var}} and {var} of the same name both exist and both get passed into a code block, the js variable is set to the local version", async () => {
                let tree = new Tree();
                tree.parseIn(`
{{var1}}='foo'
    {var1}='bar'
        Text {
            runInstance.one = var1;
            runInstance.two = getLocal("var1");
            runInstance.three = getGlobal("var1");
            runInstance.four = getPersistent("var1");
        }
                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                let runInstance = new RunInstance(runner);

                await runInstance.runStep(tree.branches[0].steps[0], tree.branches[0], false);
                await runInstance.runStep(tree.branches[0].steps[1], tree.branches[0], false);
                await runInstance.runStep(tree.branches[0].steps[2], tree.branches[0], false);

                expect(runInstance.one).to.equal("foo");
                expect(runInstance.two).to.equal("foo");
                expect(runInstance.three).to.equal("bar");
                expect(runInstance.four).to.equal(undefined);

                expect(tree.branches[0].error).to.equal(undefined);
                expect(tree.branches[0].steps[0].error).to.equal(undefined);
                expect(tree.branches[0].steps[1].error).to.equal(undefined);
                expect(tree.branches[0].steps[2].error).to.equal(undefined);
            });

            it("when a {{var}} and a persistent let of the same name both exist, the js variable for let is set to the local version", async () => {
                let tree = new Tree();
                tree.parseIn(`
{{var1}}='foo'
    Text {
        runInstance.one = var1;
        runInstance.two = l("var1");
        runInstance.three = g("var1");
        runInstance.four = p("var1");
    }
                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                let runInstance = new RunInstance(runner);
                runInstance.setPersistent("var1", "bar");

                await runInstance.runStep(tree.branches[0].steps[0], tree.branches[0], false);
                await runInstance.runStep(tree.branches[0].steps[1], tree.branches[0], false);

                expect(runInstance.one).to.equal("foo");
                expect(runInstance.two).to.equal("foo");
                expect(runInstance.three).to.equal(undefined);
                expect(runInstance.four).to.equal("bar");

                expect(tree.branches[0].error).to.equal(undefined);
                expect(tree.branches[0].steps[0].error).to.equal(undefined);
                expect(tree.branches[0].steps[1].error).to.equal(undefined);
            });

            it("when a {var} and a persistent let of the same name both exist, the js variable for let is set to the global version", async () => {
                let tree = new Tree();
                tree.parseIn(`
{var1}='foo'
    Text {
        runInstance.one = var1;
        runInstance.two = getLocal("var1");
        runInstance.three = getGlobal("var1");
        runInstance.four = getPersistent("var1");
    }
                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                let runInstance = new RunInstance(runner);
                runInstance.setPersistent("var1", "bar");

                await runInstance.runStep(tree.branches[0].steps[0], tree.branches[0], false);
                await runInstance.runStep(tree.branches[0].steps[1], tree.branches[0], false);

                expect(runInstance.one).to.equal("foo");
                expect(runInstance.two).to.equal(undefined);
                expect(runInstance.three).to.equal("foo");
                expect(runInstance.four).to.equal("bar");

                expect(tree.branches[0].error).to.equal(undefined);
                expect(tree.branches[0].steps[0].error).to.equal(undefined);
                expect(tree.branches[0].steps[1].error).to.equal(undefined);
            });

            it("makes the return value of the last code block available in {prev}", async () => {
                let tree = new Tree();
                tree.parseIn(`
One {
    return 7;
}
    Two {
        runInstance.one = prev;
    }
                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                let runInstance = new RunInstance(runner);

                await runInstance.runStep(tree.branches[0].steps[0], tree.branches[0], false);
                await runInstance.runStep(tree.branches[0].steps[1], tree.branches[0], false);

                expect(runInstance.one).to.equal(7);

                expect(tree.branches[0].error).to.equal(undefined);
                expect(tree.branches[0].steps[0].error).to.equal(undefined);
                expect(tree.branches[0].steps[1].error).to.equal(undefined);
            });
        });

        context("{var} accessibility", () => {
            it("a {{var}} is accessible in a later step", async () => {
                let tree = new Tree();
                tree.parseIn(`
{{var1}}='foo'
    {{var2}}='{{var1}}bar'
                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                let runInstance = new RunInstance(runner);

                await runInstance.runStep(tree.branches[0].steps[0], tree.branches[0], false);
                await runInstance.runStep(tree.branches[0].steps[1], tree.branches[0], false);

                expect(runInstance.getLocal("var2")).to.equal("foobar");

                expect(tree.branches[0].error).to.equal(undefined);
                expect(tree.branches[0].steps[0].error).to.equal(undefined);
                expect(tree.branches[0].steps[1].error).to.equal(undefined);
            });

            it("a {{var}} is accessible in a later step, with a function call without code block in between", async () => {
                let tree = new Tree();
                tree.parseIn(`
{{var1}}='foo'
    My function
        {{var2}}='{{var1}}bar'

* My function
    {{var1}}='blah'
                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                let runInstance = new RunInstance(runner);

                await runInstance.runStep(tree.branches[0].steps[0], tree.branches[0], false);
                await runInstance.runStep(tree.branches[0].steps[1], tree.branches[0], false);
                await runInstance.runStep(tree.branches[0].steps[2], tree.branches[0], false);
                await runInstance.runStep(tree.branches[0].steps[3], tree.branches[0], false);

                expect(runInstance.one).to.equal(undefined);
                expect(runInstance.getLocal("var2")).to.equal("foobar");

                expect(tree.branches[0].error).to.equal(undefined);
                expect(tree.branches[0].steps[0].error).to.equal(undefined);
                expect(tree.branches[0].steps[1].error).to.equal(undefined);
                expect(tree.branches[0].steps[2].error).to.equal(undefined);
                expect(tree.branches[0].steps[3].error).to.equal(undefined);
            });

            it("a {{var}} is accessible in a later step, with a function call with code block in between", async () => {
                let tree = new Tree();
                tree.parseIn(`
{{var1}}='foo'
    My function
        {{var2}}='{{var1}}bar'

* My function {
    runInstance.one = getLocal("var1");
}
                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                let runInstance = new RunInstance(runner);

                await runInstance.runStep(tree.branches[0].steps[0], tree.branches[0], false);
                await runInstance.runStep(tree.branches[0].steps[1], tree.branches[0], false);
                await runInstance.runStep(tree.branches[0].steps[2], tree.branches[0], false);

                expect(runInstance.one).to.equal(undefined);
                expect(runInstance.getLocal("var2")).to.equal("foobar");

                expect(tree.branches[0].error).to.equal(undefined);
                expect(tree.branches[0].steps[0].error).to.equal(undefined);
                expect(tree.branches[0].steps[1].error).to.equal(undefined);
                expect(tree.branches[0].steps[2].error).to.equal(undefined);
            });

            it("a {{var}} is accessible in a later step, with a non-function code block in between", async () => {
                let tree = new Tree();
                tree.parseIn(`
{{var1}}='foo'

    Something {
        runInstance.one = getLocal("var1");
    }

        {{var2}}='{{var1}}bar'
                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                let runInstance = new RunInstance(runner);

                await runInstance.runStep(tree.branches[0].steps[0], tree.branches[0], false);
                await runInstance.runStep(tree.branches[0].steps[1], tree.branches[0], false);
                await runInstance.runStep(tree.branches[0].steps[2], tree.branches[0], false);

                expect(runInstance.one).to.equal("foo");
                expect(runInstance.getLocal("var2")).to.equal("foobar");

                expect(tree.branches[0].error).to.equal(undefined);
                expect(tree.branches[0].steps[0].error).to.equal(undefined);
                expect(tree.branches[0].steps[1].error).to.equal(undefined);
                expect(tree.branches[0].steps[2].error).to.equal(undefined);
            });

            it("does not make a {{var}} declared outside and before a function call accessible to steps inside the function call", async () => {
                let tree = new Tree();
                tree.parseIn(`
{{var1}}='foo'
    My function

* My function
    {var2}='{{var1}}'
                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                let runInstance = new RunInstance(runner);

                await runInstance.runStep(tree.branches[0].steps[0], tree.branches[0], false);
                await runInstance.runStep(tree.branches[0].steps[1], tree.branches[0], false);
                await runInstance.runStep(tree.branches[0].steps[2], tree.branches[0], false);

                expect(tree.branches[0].steps[2].error.message).to.equal("The variable {{var1}} wasn't set, but is needed for this step. If it's set later in the branch, try using {{var1:}}.");
                expect(tree.branches[0].steps[2].error.filename).to.equal("file.txt");
                expect(tree.branches[0].steps[2].error.lineNumber).to.equal(6);

                expect(tree.branches[0].error).to.equal(undefined);
                expect(tree.branches[0].steps[0].error).to.equal(undefined);
                expect(tree.branches[0].steps[1].error).to.equal(undefined);
            });

            it("does not make a {{var}} declared outside and after a function call accessible to steps inside the function call", async () => {
                let tree = new Tree();
                tree.parseIn(`
My function
    {{var1}}='bar'

* My function
    {var2}='{{var1:}}'
                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                let runInstance = new RunInstance(runner);

                runInstance.currBranch = tree.branches[0];

                runInstance.currStep = tree.branches[0].steps[0];
                await runInstance.runStep(tree.branches[0].steps[0], tree.branches[0], false);

                runInstance.currStep = tree.branches[0].steps[1];
                await runInstance.runStep(tree.branches[0].steps[1], tree.branches[0], false);

                expect(tree.branches[0].steps[1].error.message).to.equal("The variable {{var1:}} is never set, but is needed for this step");
                expect(tree.branches[0].steps[1].error.filename).to.equal("file.txt");
                expect(tree.branches[0].steps[1].error.lineNumber).to.equal(6);

                expect(tree.branches[0].error).to.equal(undefined);
                expect(tree.branches[0].steps[0].error).to.equal(undefined);
            });

            it("does not make a {{var}} declared outside a function call accessible inside the function call's code block", async () => {
                let tree = new Tree();
                tree.parseIn(`
{{var1}}='foo'
    My function

* My function {
    runInstance.one = getLocal("var1");
}
                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                let runInstance = new RunInstance(runner);

                await runInstance.runStep(tree.branches[0].steps[0], tree.branches[0], false);
                await runInstance.runStep(tree.branches[0].steps[1], tree.branches[0], false);

                expect(runInstance.one).to.equal(undefined);

                expect(tree.branches[0].error).to.equal(undefined);
                expect(tree.branches[0].steps[0].error).to.equal(undefined);
                expect(tree.branches[0].steps[1].error).to.equal(undefined);
            });

            it("makes a {{var}} declared outside a function call accessible after the function call, where the function has steps inside it", async () => {
                let tree = new Tree();
                tree.parseIn(`
{{var1}}='foo'
    My function
        {{var2}}='{{var1}}bar'

* My function
    {{var1}}='blah'
                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                let runInstance = new RunInstance(runner);

                await runInstance.runStep(tree.branches[0].steps[0], tree.branches[0], false);
                await runInstance.runStep(tree.branches[0].steps[1], tree.branches[0], false);
                await runInstance.runStep(tree.branches[0].steps[2], tree.branches[0], false);

                expect(runInstance.getLocal("var1")).to.equal("blah");

                await runInstance.runStep(tree.branches[0].steps[3], tree.branches[0], false);

                expect(runInstance.getLocal("var1")).to.equal("foo");
                expect(runInstance.getLocal("var2")).to.equal("foobar");

                expect(tree.branches[0].error).to.equal(undefined);
                expect(tree.branches[0].steps[0].error).to.equal(undefined);
                expect(tree.branches[0].steps[1].error).to.equal(undefined);
                expect(tree.branches[0].steps[2].error).to.equal(undefined);
                expect(tree.branches[0].steps[3].error).to.equal(undefined);
            });

            it("makes a {{var}} declared outside a function call accessible after the function call, where the function has a code block only", async () => {
                let tree = new Tree();
                tree.parseIn(`
{{var1}}='foo'
    My function
        {{var2}}='{{var1}}bar'

* My function {
    setLocal("var1", "blah");
}
                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                let runInstance = new RunInstance(runner);

                await runInstance.runStep(tree.branches[0].steps[0], tree.branches[0], false);
                await runInstance.runStep(tree.branches[0].steps[1], tree.branches[0], false);

                expect(runInstance.getLocal("var1")).to.equal("blah");

                await runInstance.runStep(tree.branches[0].steps[2], tree.branches[0], false);

                expect(runInstance.getLocal("var1")).to.equal("foo");
                expect(runInstance.getLocal("var2")).to.equal("foobar");

                expect(tree.branches[0].error).to.equal(undefined);
                expect(tree.branches[0].steps[0].error).to.equal(undefined);
                expect(tree.branches[0].steps[1].error).to.equal(undefined);
                expect(tree.branches[0].steps[2].error).to.equal(undefined);
            });

            it("makes a {{var}} declared outside a function call accessible after the function call, where the function has a code block and has steps inside it", async () => {
                let tree = new Tree();
                tree.parseIn(`
{{var1}}='foo'
    My function
        {{var2}}='{{var1}}bar'

* My function {
    setLocal("var1", "blah");
}
    {{var1}}="blah2"
                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                let runInstance = new RunInstance(runner);

                await runInstance.runStep(tree.branches[0].steps[0], tree.branches[0], false);
                await runInstance.runStep(tree.branches[0].steps[1], tree.branches[0], false);

                expect(runInstance.getLocal("var1")).to.equal("blah");

                await runInstance.runStep(tree.branches[0].steps[2], tree.branches[0], false);

                expect(runInstance.getLocal("var1")).to.equal("blah2");

                await runInstance.runStep(tree.branches[0].steps[3], tree.branches[0], false);

                expect(runInstance.getLocal("var1")).to.equal("foo");
                expect(runInstance.getLocal("var2")).to.equal("foobar");

                expect(tree.branches[0].error).to.equal(undefined);
                expect(tree.branches[0].steps[0].error).to.equal(undefined);
                expect(tree.branches[0].steps[1].error).to.equal(undefined);
                expect(tree.branches[0].steps[2].error).to.equal(undefined);
                expect(tree.branches[0].steps[3].error).to.equal(undefined);
            });

            it("does not make a {{var}} declared inside a function accessible outside of it", async () => {
                let tree = new Tree();
                tree.parseIn(`
My function
    {var2}='{{var1}}'

* My function
    {{var1}}='bar'
                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                let runInstance = new RunInstance(runner);

                await runInstance.runStep(tree.branches[0].steps[0], tree.branches[0], false);
                await runInstance.runStep(tree.branches[0].steps[1], tree.branches[0], false);
                await runInstance.runStep(tree.branches[0].steps[2], tree.branches[0], false);

                expect(tree.branches[0].steps[2].error.message).to.equal("The variable {{var1}} wasn't set, but is needed for this step. If it's set later in the branch, try using {{var1:}}.");
                expect(tree.branches[0].steps[2].error.filename).to.equal("file.txt");
                expect(tree.branches[0].steps[2].error.lineNumber).to.equal(3);

                expect(tree.branches[0].error).to.equal(undefined);
                expect(tree.branches[0].steps[0].error).to.equal(undefined);
                expect(tree.branches[0].steps[1].error).to.equal(undefined);
            });

            it("clears {{local vars}} and reinstates previous {{local vars}} when exiting multiple levels of function calls", async () => {
                let tree = new Tree();
                tree.parseIn(`
{{var1}}='foo'
    My function
        E -
            Something {
                runInstance.one = getLocal("var1");
                runInstance.two = var1;

                setLocal("var1", "hehe");

                runInstance.three = getLocal("var1");
                runInstance.four = var1;
            }
                F -
                    My function
                        Silly function
                            G -
                                {{var1}}='foo2'

* My function
    A -
        {{var1}}='bar'
            Other function
                D -

        * Other function
            B -
                {{var1}}='bar2'
                    C -

* Silly function {
    runInstance.five = getLocal("var1");

    setLocal("var1", "blah");

    runInstance.six = getLocal("var1");
}
    {{var1}} = "blah2"
                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                let runInstance = new RunInstance(runner);

                /*
                 0) {{var1}}='foo'
                 1) My function
                 2)    A -
                 3)    {{var1}}='bar'
                 4)    Other function
                 5)        B -
                 6)        {{var1}}='bar2'
                 7)        C -
                 8)    D -
                 9) E -
                10) Something { code block }
                11) F -
                12) My function
                13)    A -
                14)    {{var1}}='bar'
                15)    Other function
                16)        B -
                17)        {{var1}}='bar2'
                18)        C -
                19)    D -
                20) Silly function { code block }
                21)    {{var1}} = "blah2"
                22) G -
                23) {{var1}}='foo2'
                */

                expect(runInstance.getLocal("var1")).to.equal(undefined);

                await runInstance.runStep(tree.branches[0].steps[0], tree.branches[0], false);
                expect(runInstance.getLocal("var1")).to.equal("foo");

                await runInstance.runStep(tree.branches[0].steps[1], tree.branches[0], false);
                expect(runInstance.getLocal("var1")).to.equal("foo");

                await runInstance.runStep(tree.branches[0].steps[2], tree.branches[0], false);
                expect(runInstance.getLocal("var1")).to.equal(undefined);

                await runInstance.runStep(tree.branches[0].steps[3], tree.branches[0], false);
                expect(runInstance.getLocal("var1")).to.equal("bar");

                await runInstance.runStep(tree.branches[0].steps[4], tree.branches[0], false);
                expect(runInstance.getLocal("var1")).to.equal("bar");

                await runInstance.runStep(tree.branches[0].steps[5], tree.branches[0], false);
                expect(runInstance.getLocal("var1")).to.equal(undefined);

                await runInstance.runStep(tree.branches[0].steps[6], tree.branches[0], false);
                expect(runInstance.getLocal("var1")).to.equal("bar2");

                await runInstance.runStep(tree.branches[0].steps[7], tree.branches[0], false);
                expect(runInstance.getLocal("var1")).to.equal("bar2");

                await runInstance.runStep(tree.branches[0].steps[8], tree.branches[0], false);
                expect(runInstance.getLocal("var1")).to.equal("bar");

                await runInstance.runStep(tree.branches[0].steps[9], tree.branches[0], false);
                expect(runInstance.getLocal("var1")).to.equal("foo");

                await runInstance.runStep(tree.branches[0].steps[10], tree.branches[0], false);
                expect(runInstance.one).to.equal("foo");
                expect(runInstance.two).to.equal("foo");
                expect(runInstance.getLocal("var1")).to.equal("hehe");
                expect(runInstance.three).to.equal("hehe");
                expect(runInstance.four).to.equal("foo");

                await runInstance.runStep(tree.branches[0].steps[11], tree.branches[0], false);
                expect(runInstance.getLocal("var1")).to.equal("hehe");

                await runInstance.runStep(tree.branches[0].steps[12], tree.branches[0], false);
                expect(runInstance.getLocal("var1")).to.equal("hehe");

                await runInstance.runStep(tree.branches[0].steps[13], tree.branches[0], false);
                expect(runInstance.getLocal("var1")).to.equal(undefined);

                await runInstance.runStep(tree.branches[0].steps[14], tree.branches[0], false);
                expect(runInstance.getLocal("var1")).to.equal("bar");

                await runInstance.runStep(tree.branches[0].steps[15], tree.branches[0], false);
                expect(runInstance.getLocal("var1")).to.equal("bar");

                await runInstance.runStep(tree.branches[0].steps[16], tree.branches[0], false);
                expect(runInstance.getLocal("var1")).to.equal(undefined);

                await runInstance.runStep(tree.branches[0].steps[17], tree.branches[0], false);
                expect(runInstance.getLocal("var1")).to.equal("bar2");

                await runInstance.runStep(tree.branches[0].steps[18], tree.branches[0], false);
                expect(runInstance.getLocal("var1")).to.equal("bar2");

                await runInstance.runStep(tree.branches[0].steps[19], tree.branches[0], false);
                expect(runInstance.getLocal("var1")).to.equal("bar");

                await runInstance.runStep(tree.branches[0].steps[20], tree.branches[0], false);
                expect(runInstance.five).to.equal(undefined);
                expect(runInstance.getLocal("var1")).to.equal("blah");
                expect(runInstance.six).to.equal("blah");

                await runInstance.runStep(tree.branches[0].steps[21], tree.branches[0], false);
                expect(runInstance.getLocal("var1")).to.equal("blah2");

                await runInstance.runStep(tree.branches[0].steps[22], tree.branches[0], false);
                expect(runInstance.getLocal("var1")).to.equal("hehe");

                await runInstance.runStep(tree.branches[0].steps[23], tree.branches[0], false);
                expect(runInstance.getLocal("var1")).to.equal("foo2");

                expect(tree.branches[0].error).to.equal(undefined);
                expect(tree.branches[0].steps[0].error).to.equal(undefined);
                expect(tree.branches[0].steps[1].error).to.equal(undefined);
                expect(tree.branches[0].steps[2].error).to.equal(undefined);
                expect(tree.branches[0].steps[3].error).to.equal(undefined);
                expect(tree.branches[0].steps[4].error).to.equal(undefined);
                expect(tree.branches[0].steps[5].error).to.equal(undefined);
                expect(tree.branches[0].steps[6].error).to.equal(undefined);
                expect(tree.branches[0].steps[7].error).to.equal(undefined);
                expect(tree.branches[0].steps[8].error).to.equal(undefined);
                expect(tree.branches[0].steps[9].error).to.equal(undefined);
                expect(tree.branches[0].steps[10].error).to.equal(undefined);
                expect(tree.branches[0].steps[11].error).to.equal(undefined);
                expect(tree.branches[0].steps[12].error).to.equal(undefined);
                expect(tree.branches[0].steps[13].error).to.equal(undefined);
                expect(tree.branches[0].steps[14].error).to.equal(undefined);
                expect(tree.branches[0].steps[15].error).to.equal(undefined);
                expect(tree.branches[0].steps[16].error).to.equal(undefined);
                expect(tree.branches[0].steps[17].error).to.equal(undefined);
                expect(tree.branches[0].steps[18].error).to.equal(undefined);
                expect(tree.branches[0].steps[19].error).to.equal(undefined);
                expect(tree.branches[0].steps[20].error).to.equal(undefined);
                expect(tree.branches[0].steps[21].error).to.equal(undefined);
                expect(tree.branches[0].steps[22].error).to.equal(undefined);
                expect(tree.branches[0].steps[23].error).to.equal(undefined);
            });

            it("a {var} is accessible in a later step", async () => {
                let tree = new Tree();
                tree.parseIn(`
{var1}='foo'
    {var2}='{var1}bar'
                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                let runInstance = new RunInstance(runner);

                await runInstance.runStep(tree.branches[0].steps[0], tree.branches[0], false);
                await runInstance.runStep(tree.branches[0].steps[1], tree.branches[0], false);

                expect(runInstance.getGlobal("var2")).to.equal("foobar");

                expect(tree.branches[0].error).to.equal(undefined);
                expect(tree.branches[0].steps[0].error).to.equal(undefined);
                expect(tree.branches[0].steps[1].error).to.equal(undefined);
            });

            it("a {var} is accessible in a later step, with a function call without code block in between", async () => {
                let tree = new Tree();
                tree.parseIn(`
{var1}='foo'
    My function
        {var2}='{var1}bar'

* My function
    {var1}='blah'
                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                let runInstance = new RunInstance(runner);

                await runInstance.runStep(tree.branches[0].steps[0], tree.branches[0], false);
                await runInstance.runStep(tree.branches[0].steps[1], tree.branches[0], false);
                await runInstance.runStep(tree.branches[0].steps[2], tree.branches[0], false);
                await runInstance.runStep(tree.branches[0].steps[3], tree.branches[0], false);

                expect(runInstance.one).to.equal(undefined);
                expect(runInstance.getGlobal("var2")).to.equal("blahbar");

                expect(tree.branches[0].error).to.equal(undefined);
                expect(tree.branches[0].steps[0].error).to.equal(undefined);
                expect(tree.branches[0].steps[1].error).to.equal(undefined);
                expect(tree.branches[0].steps[2].error).to.equal(undefined);
                expect(tree.branches[0].steps[3].error).to.equal(undefined);
            });

            it("a {var} is accessible in a later step, with a function call with code block in between", async () => {
                let tree = new Tree();
                tree.parseIn(`
{var1}='foo'
    My function
        {var2}='{var1}bar'

* My function {
    runInstance.one = getGlobal("var1");
    setGlobal("var1", "blah");
}
                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                let runInstance = new RunInstance(runner);

                await runInstance.runStep(tree.branches[0].steps[0], tree.branches[0], false);
                await runInstance.runStep(tree.branches[0].steps[1], tree.branches[0], false);
                await runInstance.runStep(tree.branches[0].steps[2], tree.branches[0], false);

                expect(runInstance.one).to.equal("foo");
                expect(runInstance.getGlobal("var2")).to.equal("blahbar");

                expect(tree.branches[0].error).to.equal(undefined);
                expect(tree.branches[0].steps[0].error).to.equal(undefined);
                expect(tree.branches[0].steps[1].error).to.equal(undefined);
                expect(tree.branches[0].steps[2].error).to.equal(undefined);
            });

            it("a {var} is accessible in a later step, with a non-function code block in between", async () => {
                let tree = new Tree();
                tree.parseIn(`
{var1}='foo'

    Something {
        runInstance.one = getGlobal("var1");
    }

        {var2}='{var1}bar'
                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                let runInstance = new RunInstance(runner);

                await runInstance.runStep(tree.branches[0].steps[0], tree.branches[0], false);
                await runInstance.runStep(tree.branches[0].steps[1], tree.branches[0], false);
                await runInstance.runStep(tree.branches[0].steps[2], tree.branches[0], false);

                expect(runInstance.one).to.equal("foo");
                expect(runInstance.getGlobal("var2")).to.equal("foobar");

                expect(tree.branches[0].error).to.equal(undefined);
                expect(tree.branches[0].steps[0].error).to.equal(undefined);
                expect(tree.branches[0].steps[1].error).to.equal(undefined);
                expect(tree.branches[0].steps[2].error).to.equal(undefined);
            });

            it("a {var} is accessible inside a function call's code block", async () => {
                let tree = new Tree();
                tree.parseIn(`
{var1}='foo'
    My function

* My function {
    runInstance.one = getGlobal("var1");
    runInstance.two = var1;
}
                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                let runInstance = new RunInstance(runner);

                await runInstance.runStep(tree.branches[0].steps[0], tree.branches[0], false);
                await runInstance.runStep(tree.branches[0].steps[1], tree.branches[0], false);

                expect(runInstance.one).to.equal("foo");
                expect(runInstance.two).to.equal("foo");

                expect(tree.branches[0].error).to.equal(undefined);
                expect(tree.branches[0].steps[0].error).to.equal(undefined);
                expect(tree.branches[0].steps[1].error).to.equal(undefined);
            });

            it("a {var} is accessible to steps inside a function call", async () => {
                let tree = new Tree();
                tree.parseIn(`
{var1}='foo'
    My function
        A -

* My function
    {var2}='{var1}bar'
                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                let runInstance = new RunInstance(runner);

                await runInstance.runStep(tree.branches[0].steps[0], tree.branches[0], false);
                await runInstance.runStep(tree.branches[0].steps[1], tree.branches[0], false);
                await runInstance.runStep(tree.branches[0].steps[2], tree.branches[0], false);
                await runInstance.runStep(tree.branches[0].steps[3], tree.branches[0], false);

                expect(runInstance.getGlobal("var2")).to.equal("foobar");

                expect(tree.branches[0].error).to.equal(undefined);
                expect(tree.branches[0].steps[0].error).to.equal(undefined);
                expect(tree.branches[0].steps[1].error).to.equal(undefined);
                expect(tree.branches[0].steps[2].error).to.equal(undefined);
                expect(tree.branches[0].steps[3].error).to.equal(undefined);
            });

            it("a {var} is accessible to code blocks of steps inside a function call", async () => {
                let tree = new Tree();
                tree.parseIn(`
{var1}='foo'
    My function
        A -

* My function
    Something {
        runInstance.one = getGlobal("var1");
        runInstance.two = var1;

        setGlobal("var1", "bar");
    }
                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                let runInstance = new RunInstance(runner);

                await runInstance.runStep(tree.branches[0].steps[0], tree.branches[0], false);
                await runInstance.runStep(tree.branches[0].steps[1], tree.branches[0], false);
                await runInstance.runStep(tree.branches[0].steps[2], tree.branches[0], false);
                await runInstance.runStep(tree.branches[0].steps[3], tree.branches[0], false);

                expect(runInstance.one).to.equal("foo");
                expect(runInstance.two).to.equal("foo");

                expect(runInstance.getGlobal("var1")).to.equal("bar");

                expect(tree.branches[0].error).to.equal(undefined);
                expect(tree.branches[0].steps[0].error).to.equal(undefined);
                expect(tree.branches[0].steps[1].error).to.equal(undefined);
                expect(tree.branches[0].steps[2].error).to.equal(undefined);
                expect(tree.branches[0].steps[3].error).to.equal(undefined);
            });

            it("a {var} declared inside a function call is accessible in steps after the function call", async () => {
                let tree = new Tree();
                tree.parseIn(`
My function
    {var2}='{var1}bar'

* My function
    {var1}='foo'
                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                let runInstance = new RunInstance(runner);

                await runInstance.runStep(tree.branches[0].steps[0], tree.branches[0], false);
                await runInstance.runStep(tree.branches[0].steps[1], tree.branches[0], false);
                await runInstance.runStep(tree.branches[0].steps[2], tree.branches[0], false);

                expect(runInstance.getGlobal("var1")).to.equal("foo");
                expect(runInstance.getGlobal("var2")).to.equal("foobar");

                expect(tree.branches[0].error).to.equal(undefined);
                expect(tree.branches[0].steps[0].error).to.equal(undefined);
                expect(tree.branches[0].steps[1].error).to.equal(undefined);
                expect(tree.branches[0].steps[2].error).to.equal(undefined);
            });

            it("a {var} declared in a branch is accessible in an After Every Step hook", async () => {
                let tree = new Tree();
                tree.parseIn(`
{var1}='foo'

*** After Every Step {
    runInstance.one = getGlobal('var1');
    runInstance.two = var1;
}

                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                let runInstance = new RunInstance(runner);

                await runInstance.runStep(tree.branches[0].steps[0], tree.branches[0], false);

                expect(runInstance.one).to.equal("foo");
                expect(runInstance.two).to.equal("foo");

                expect(tree.branches[0].error).to.equal(undefined);
                expect(tree.branches[0].steps[0].error).to.equal(undefined);
            });

            it("a {{var}} declared in a branch is accessible in an After Every Step hook, so long as it didn't go out of scope", async () => {
                let tree = new Tree();
                tree.parseIn(`
{{var1}}='foo'

*** After Every Step {
    runInstance.one = getLocal('var1');
    runInstance.two = var1;
}

                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                let runInstance = new RunInstance(runner);

                await runInstance.runStep(tree.branches[0].steps[0], tree.branches[0], false);

                expect(runInstance.one).to.equal("foo");
                expect(runInstance.two).to.equal("foo");

                expect(tree.branches[0].error).to.equal(undefined);
                expect(tree.branches[0].steps[0].error).to.equal(undefined);
            });
        });

        context("errors and logs", () => {
            it("executes a step that logs", async () => {
                let tree = new Tree();
                tree.stepDataMode = 'all';
                tree.parseIn(`
My function
    Something else {
        log("C");
        log("D");
    }

* My function {
    log("A");
    log("B");
}
                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                let runInstance = new RunInstance(runner);

                await runInstance.runStep(tree.branches[0].steps[0], tree.branches[0], false);
                await runInstance.runStep(tree.branches[0].steps[1], tree.branches[0], false);

                expect(tree.branches[0].steps[0].log).to.eql([
                    {text: "Calling function at file.txt:8"},
                    {text: "A"},
                    {text: "B"}
                ]);
                expect(tree.branches[0].steps[1].log).to.eql([
                    {text: "C"},
                    {text: "D"}
                ]);

                expect(tree.branches[0].error).to.equal(undefined);
                expect(tree.branches[0].steps[0].error).to.equal(undefined);
                expect(tree.branches[0].steps[1].error).to.equal(undefined);
            });

            it("sets the error's filename and lineNumber correctly when an error occurs inside a code block", async () => {
                let tree = new Tree();
                tree.parseIn(`
Something {
    let a = "a";
    let b = "b";
    cc; // will throw an exception
    let d = "d";
}
                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                let runInstance = new RunInstance(runner);

                await runInstance.runStep(tree.branches[0].steps[0], tree.branches[0], false);

                expect(tree.branches[0].steps[0].error.message).to.contain("c is not defined");
                expect(tree.branches[0].steps[0].error.filename).to.equal("file.txt");
                expect(tree.branches[0].steps[0].error.lineNumber).to.equal(5);

                expect(tree.branches[0].error).to.equal(undefined);
            });

            it("sets the error's filename and lineNumber correctly when an error occurs inside a function used inside a code block", async () => {
                let tree = new Tree();
                tree.parseIn(`
Something {
    let a = "a";
    let b = "b";
    runInstance.badFunc(); // will throw an exception
    let d = "d";
}
                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                let runInstance = new RunInstance(runner);

                runInstance.badFunc = () => {
                    let a = "a";
                    let b = "b";
                    cc;
                    let d = "d";
                };

                await runInstance.runStep(tree.branches[0].steps[0], tree.branches[0], false);

                expect(tree.branches[0].steps[0].error.message).to.contain("c is not defined");
                expect(tree.branches[0].steps[0].error.filename).to.equal("file.txt");
                expect(tree.branches[0].steps[0].error.lineNumber).to.equal(5);

                expect(!!tree.branches[0].steps[0].error.stack.match(/at RunInstance\.runInstance\.badFunc/)).to.equal(true);
                expect(!!tree.branches[0].steps[0].error.stack.match(/at CodeBlock_for_Something[^\n]+<anonymous>:5:17\)/)).to.equal(true);

                expect(tree.branches[0].error).to.equal(undefined);
            });

            it("sets the error's filename and lineNumber correctly when an error occurs inside a function from one code block that's used inside another code block", async () => {
                let tree = new Tree();
                tree.parseIn(`
First {
    runInstance.badFunc = () => {
        let a = "a";
        let b = "b";
        cc;
        let d = "d";
    };
}

    Second {
        let a = "a";
        let b = "b";
        runInstance.badFunc(); // will throw an exception
        let d = "d";
    }
                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                let runInstance = new RunInstance(runner);

                await runInstance.runStep(tree.branches[0].steps[0], tree.branches[0], false);
                await runInstance.runStep(tree.branches[0].steps[1], tree.branches[0], false);

                expect(tree.branches[0].steps[1].error.message).to.contain("c is not defined");
                expect(tree.branches[0].steps[1].error.filename).to.equal("file.txt");
                expect(tree.branches[0].steps[1].error.lineNumber).to.equal(14);

                expect(!!tree.branches[0].steps[1].error.stack.match(/at RunInstance\.runInstance\.badFunc[^\n]+<anonymous>:6:9\)/)).to.equal(true);
                expect(!!tree.branches[0].steps[1].error.stack.match(/at CodeBlock_for_Second[^\n]+<anonymous>:14:21\)/)).to.equal(true);

                expect(tree.branches[0].error).to.equal(undefined);
            });

            it("sets the error's filename and lineNumber correctly when an error occurs inside a js function implemented inside a code block", async () => {
                let tree = new Tree();
                tree.parseIn(`
Something {
    function func() {
        let a = "a";
        let b = "b";
        badFunc(); // will throw an exception
        let d = "d";
    }

    func();
}
                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                let runInstance = new RunInstance(runner);

                await runInstance.runStep(tree.branches[0].steps[0], tree.branches[0], false);

                expect(tree.branches[0].steps[0].error.message).to.contain("c is not defined");
                expect(tree.branches[0].steps[0].error.filename).to.equal("file.txt");
                expect(tree.branches[0].steps[0].error.lineNumber).to.equal(10);

                expect(!!tree.branches[0].steps[0].error.stack.match(/at func[^\n]+<anonymous>:6:9\)/)).to.equal(true);
                expect(!!tree.branches[0].steps[0].error.stack.match(/at CodeBlock_for_Something[^\n]+<anonymous>:10:5\)/)).to.equal(true);

                expect(tree.branches[0].error).to.equal(undefined);
            });

            it("sets the error's filename and lineNumber to the function call when an error occurs inside a packaged code block", async () => {
                let tree = new Tree();
                tree.parseIn(`
Packaged function
`, "file.txt");

tree.parseIn(`
* Packaged function {
    let a = "a";
    let b = "b";
    cc; // will throw an exception
    let d = "d";
}
                `, "package.txt", true);

                let runner = new Runner();
                runner.init(tree, true);
                let runInstance = new RunInstance(runner);

                await runInstance.runStep(tree.branches[0].steps[0], tree.branches[0], false);

                expect(tree.branches[0].steps[0].error.message).to.contain("c is not defined");
                expect(tree.branches[0].steps[0].error.filename).to.equal("file.txt");
                expect(tree.branches[0].steps[0].error.lineNumber).to.equal(2);

                expect(!!tree.branches[0].steps[0].error.stack.match(/at CodeBlock_for_Packaged_function[^\n]+<anonymous>:5:5\)/)).to.equal(true);

                expect(tree.branches[0].error).to.equal(undefined);
            });

            // NOTE: This test skipped because it fails when running nyc code coverage
            // The test right after this one is almost identical but nyc-friendly
            it.skip("sets the error's filename and lineNumber correctly when an error occurs inside a required function", async () => {
                let tree = new Tree();
                tree.parseIn(`
Something {
    let BF = require(process.cwd().replace(/smashtest.*/, 'smashtest/tests/core/badfunc.js')); // using process.cwd() because the relative path varies depending on if you run the tests with mocha vs. nyc
    BF.badFunc();
}
                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                let runInstance = new RunInstance(runner);

                await runInstance.runStep(tree.branches[0].steps[0], tree.branches[0], false);

                expect(tree.branches[0].steps[0].error.message).to.contain("c is not defined");
                expect(tree.branches[0].steps[0].error.filename).to.equal("file.txt");
                expect(tree.branches[0].steps[0].error.lineNumber).to.equal(4);

                expect(!!tree.branches[0].steps[0].error.stack.match(/at Object\.exports\.badFunc[^\n]+badfunc\.js:4:5\)/)).to.equal(true);
                expect(!!tree.branches[0].steps[0].error.stack.match(/at CodeBlock_for_Something[^\n]+<anonymous>:4:8\)/)).to.equal(true);

                expect(tree.branches[0].error).to.equal(undefined);
            });

            it("sets the error's filename and lineNumber correctly when an error occurs inside a required function (code coverage tool friendly)", async () => {
                let tree = new Tree();
                tree.parseIn(`
Something {
    let BF = require(process.cwd().replace(/smashtest.*/, 'smashtest/tests/core/badfunc.js')); // using process.cwd() because the relative path varies depending on if you run the tests with mocha vs. nyc
    BF.badFunc();
}
                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                let runInstance = new RunInstance(runner);

                await runInstance.runStep(tree.branches[0].steps[0], tree.branches[0], false);

                expect(tree.branches[0].steps[0].error.message).to.contain("c is not defined");
                expect(tree.branches[0].steps[0].error.filename).to.equal("file.txt");
                expect(tree.branches[0].steps[0].error.lineNumber).to.equal(4);

                // NOTE: commented out because nyc code coverage tool minifies the js, breaking the line number reference
                //expect(!!tree.branches[0].steps[0].error.stack.match(/at Object\.exports\.badFunc[^\n]+badfunc\.js:4:5\)/)).to.equal(true);

                expect(!!tree.branches[0].steps[0].error.stack.match(/at CodeBlock_for_Something[^\n]+<anonymous>:4:8\)/)).to.equal(true);

                expect(tree.branches[0].error).to.equal(undefined);
            });

            it("marks a step as failed when it fails", async () => {
                let tree = new Tree();
                tree.parseIn(`
My function

* My function {
    let a = 1 + 1;
    throw new Error("oops");
}

                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                let runInstance = new RunInstance(runner);

                tree.nextStep(tree.branches[0], true);
                await runInstance.runStep(tree.branches[0].steps[0], tree.branches[0], false);
                tree.nextStep(tree.branches[0], true);

                expect(tree.branches[0].steps[0].error.message).to.equal("oops");
                expect(tree.branches[0].steps[0].error.filename).to.equal("file.txt");
                expect(tree.branches[0].steps[0].error.lineNumber).to.equal(6);

                expect(tree.branches[0].steps[0].isPassed).to.equal(undefined);
                expect(tree.branches[0].steps[0].isFailed).to.equal(true);
                expect(tree.branches[0].steps[0].isSkipped).to.equal(undefined);

                expect(tree.branches[0].error).to.equal(undefined);
                expect(tree.branches[0].isPassed).to.equal(undefined);
                expect(tree.branches[0].isFailed).to.equal(true);
                expect(tree.branches[0].isSkipped).to.equal(undefined);
            });

            it("marks a step as passed when it passes", async () => {
                let tree = new Tree();
                tree.stepDataMode = 'all';
                tree.parseIn(`
My function

* My function {
    let a = 1 + 1;
}

                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                let runInstance = new RunInstance(runner);

                tree.nextStep(tree.branches[0], true);
                await runInstance.runStep(tree.branches[0].steps[0], tree.branches[0], false);
                tree.nextStep(tree.branches[0], true);

                expect(tree.branches[0].steps[0].error).to.equal(undefined);

                expect(tree.branches[0].steps[0].isPassed).to.equal(true);
                expect(tree.branches[0].steps[0].isFailed).to.equal(undefined);
                expect(tree.branches[0].steps[0].isSkipped).to.equal(undefined);

                expect(tree.branches[0].error).to.equal(undefined);
                expect(tree.branches[0].isPassed).to.equal(true);
                expect(tree.branches[0].isFailed).to.equal(undefined);
                expect(tree.branches[0].isSkipped).to.equal(undefined);
            });

            it("handles bad syntax in a code block step", async () => {
                let tree = new Tree();
                tree.parseIn(`
A -
    Something {
        let a = "A";
        let b = "B";
        cc;
        let d = "D";
    }
        My function

* My function {
    let a = "A";
    let b = "B";
    let c = "C";
    d;
}
                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                let runInstance = new RunInstance(runner);

                await runInstance.runStep(tree.branches[0].steps[0], tree.branches[0], false);
                await runInstance.runStep(tree.branches[0].steps[1], tree.branches[0], false);
                await runInstance.runStep(tree.branches[0].steps[2], tree.branches[0], false);

                expect(tree.branches[0].steps[1].error.message).to.contain("c is not defined");
                expect(tree.branches[0].steps[1].error.filename).to.equal("file.txt");
                expect(tree.branches[0].steps[1].error.lineNumber).to.equal(6);

                expect(tree.branches[0].steps[2].error.message).to.contain("d is not defined");
                expect(tree.branches[0].steps[2].error.filename).to.equal("file.txt");
                expect(tree.branches[0].steps[2].error.lineNumber).to.equal(15);

                expect(tree.branches[0].error).to.equal(undefined);
                expect(tree.branches[0].steps[0].error).to.equal(undefined);
            });

            it("doesn't finish off the branch if a step has an error and the error's continue flag is set", async () => {
                let tree = new Tree();
                tree.parseIn(`
My function
    A -

* My function {
    let e = new Error("oops");
    e.continue = true;
    throw e;
}

                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                let runInstance = new RunInstance(runner);

                tree.nextStep(tree.branches[0], true);
                await runInstance.runStep(tree.branches[0].steps[0], tree.branches[0], false);
                tree.nextStep(tree.branches[0], true);

                expect(tree.branches[0].steps[0].error.message).to.equal("oops");
                expect(tree.branches[0].steps[0].error.filename).to.equal("file.txt");
                expect(tree.branches[0].steps[0].error.lineNumber).to.equal(6);

                expect(tree.branches[0].steps[0].isPassed).to.equal(undefined);
                expect(tree.branches[0].steps[0].isFailed).to.equal(true);
                expect(tree.branches[0].steps[0].isSkipped).to.equal(undefined);

                expect(tree.branches[0].error).to.equal(undefined);
                expect(tree.branches[0].isPassed).to.equal(undefined);
                expect(tree.branches[0].isFailed).to.equal(undefined);
                expect(tree.branches[0].isSkipped).to.equal(undefined);
            });

            it("doesn't finish off the branch if a step has an error and pauseOnFail is set", async () => {
                let tree = new Tree();
                tree.parseIn(`
My function
    A -

* My function {
    let e = new Error("oops");
    throw e;
}

                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                runner.pauseOnFail = true;
                let runInstance = new RunInstance(runner);

                tree.nextStep(tree.branches[0], true);
                await runInstance.runStep(tree.branches[0].steps[0], tree.branches[0], false);
                tree.nextStep(tree.branches[0], true);

                expect(tree.branches[0].steps[0].error.message).to.equal("oops");
                expect(tree.branches[0].steps[0].error.filename).to.equal("file.txt");
                expect(tree.branches[0].steps[0].error.lineNumber).to.equal(6);

                expect(tree.branches[0].steps[0].isPassed).to.equal(undefined);
                expect(tree.branches[0].steps[0].isFailed).to.equal(true);
                expect(tree.branches[0].steps[0].isSkipped).to.equal(undefined);

                expect(tree.branches[0].error).to.equal(undefined);
                expect(tree.branches[0].isPassed).to.equal(undefined);
                expect(tree.branches[0].isFailed).to.equal(undefined);
                expect(tree.branches[0].isSkipped).to.equal(undefined);
            });
        });

        context("pause and resume", () => {
            it("pauses when a ~ step is encountered before the step", async () => {
                let tree = new Tree();
                tree.parseIn(`
A -
    ~ B -
        C -
                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                let runInstance = new RunInstance(runner);

                expect(runInstance.isPaused).to.equal(false);

                await runInstance.runStep(tree.branches[0].steps[0], tree.branches[0], false);
                expect(runInstance.isPaused).to.equal(false);

                await runInstance.runStep(tree.branches[0].steps[1], tree.branches[0], false);
                expect(runInstance.isPaused).to.equal(true);
            });

            it("pauses when a ~ step is encountered after the step", async () => {
                let tree = new Tree();
                tree.parseIn(`
A -
    B ~ -
        C -
                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                let runInstance = new RunInstance(runner);

                expect(runInstance.isPaused).to.equal(false);

                await runInstance.runStep(tree.branches[0].steps[0], tree.branches[0], false);
                expect(runInstance.isPaused).to.equal(false);

                await runInstance.runStep(tree.branches[0].steps[1], tree.branches[0], false);
                expect(runInstance.isPaused).to.equal(true);
            });

            it("when resuming from a pause on a ~, doesn't pause on the same ~ again, when the ~ is before the step", async () => {
                let tree = new Tree();
                tree.parseIn(`
A -
    ~ B -
        {var1}='foo'
                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                let runInstance = new RunInstance(runner);

                expect(runInstance.isPaused).to.equal(false);

                await runInstance.runStep(tree.branches[0].steps[0], tree.branches[0], false);
                expect(runInstance.isPaused).to.equal(false);

                await runInstance.runStep(tree.branches[0].steps[1], tree.branches[0], false);
                expect(runInstance.isPaused).to.equal(true);

                runInstance.isPaused = false;

                await runInstance.runStep(tree.branches[0].steps[2], tree.branches[0], false);
                expect(runInstance.isPaused).to.equal(false);
                expect(runInstance.getGlobal("var1")).to.equal("foo");
            });

            it("when resuming from a pause on a ~, doesn't pause on the same ~ again, when the ~ is after the step", async () => {
                let tree = new Tree();
                tree.parseIn(`
A -
    B - ~
        {var1}='foo'
                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                let runInstance = new RunInstance(runner);

                expect(runInstance.isPaused).to.equal(false);

                await runInstance.runStep(tree.branches[0].steps[0], tree.branches[0], false);
                expect(runInstance.isPaused).to.equal(false);

                await runInstance.runStep(tree.branches[0].steps[1], tree.branches[0], false);
                expect(runInstance.isPaused).to.equal(true);

                runInstance.isPaused = false;

                await runInstance.runStep(tree.branches[0].steps[2], tree.branches[0], false);
                expect(runInstance.isPaused).to.equal(false);
                expect(runInstance.getGlobal("var1")).to.equal("foo");
            });

            it("when resuming from a pause on a ~, doesn't pause on the same ~ again, when ~ is before and after the step", async () => {
                let tree = new Tree();
                tree.parseIn(`
A -
    ~ B ~ -
        {var1}='foo'
                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                let runInstance = new RunInstance(runner);

                expect(runInstance.isPaused).to.equal(false);

                await runInstance.runStep(tree.branches[0].steps[0], tree.branches[0], false);
                expect(runInstance.isPaused).to.equal(false);

                await runInstance.runStep(tree.branches[0].steps[1], tree.branches[0], false);
                expect(runInstance.isPaused).to.equal(true);

                runInstance.isPaused = false;

                await runInstance.runStep(tree.branches[0].steps[2], tree.branches[0], false);
                expect(runInstance.isPaused).to.equal(false);
                expect(runInstance.getGlobal("var1")).to.equal("foo");
            });

            it("pauses when pauseOnFail is set and a step fails", async () => {
                let tree = new Tree();
                tree.parseIn(`
A -
    B {
        throw new Error("oops");
    }
        C -
                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                runner.pauseOnFail = true;
                let runInstance = new RunInstance(runner);

                expect(runInstance.isPaused).to.equal(false);

                await runInstance.runStep(tree.branches[0].steps[0], tree.branches[0], false);
                expect(runInstance.isPaused).to.equal(false);

                await runInstance.runStep(tree.branches[0].steps[1], tree.branches[0], false);
                expect(runInstance.isPaused).to.equal(true);
            });

            it("doesn't pause when pauseOnFail is set and a step passes", async () => {
                let tree = new Tree();
                tree.parseIn(`
A -
    B -
        C -
                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                runner.pauseOnFail = true;
                let runInstance = new RunInstance(runner);

                expect(runInstance.isPaused).to.equal(false);

                await runInstance.runStep(tree.branches[0].steps[0], tree.branches[0], false);
                expect(runInstance.isPaused).to.equal(false);

                await runInstance.runStep(tree.branches[0].steps[1], tree.branches[0], false);
                expect(runInstance.isPaused).to.equal(false);
            });

            it("doesn't pause when pauseOnFail is not set and a step fails", async () => {
                let tree = new Tree();
                tree.parseIn(`
A -
    B {
        throw new Error("oops");
    }
        C -
                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                let runInstance = new RunInstance(runner);

                expect(runInstance.isPaused).to.equal(false);

                await runInstance.runStep(tree.branches[0].steps[0], tree.branches[0], false);
                expect(runInstance.isPaused).to.equal(false);

                await runInstance.runStep(tree.branches[0].steps[1], tree.branches[0], false);
                expect(runInstance.isPaused).to.equal(false);
            });
        });

        context("hooks", () => {
            it("runs a Before Every Step hook", async () => {
                let tree = new Tree();
                tree.parseIn(`
A -

*** Before Every Step {
    runInstance.one = "foo";
}
                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                let runInstance = new RunInstance(runner);

                await runInstance.runStep(tree.branches[0].steps[0], tree.branches[0], false);
                expect(runInstance.one).to.equal("foo");
            });

            it("runs multiple Before Every Step and After Every Step hooks", async () => {
                let tree = new Tree();
                tree.parseIn(`
A {
    runInstance.one += "THREE";
    runInstance.two += "FOUR";
}
    B {
        runInstance.one += "SEVEN";
        runInstance.two += "EIGHT";
    }

*** Before Every Step {
    runInstance.one = "one";
}

*** Before Every Step {
    runInstance.two = "two";
}

*** After Every Step {
    runInstance.one += "five";
}

*** After Every Step {
    runInstance.two += "six";
}
                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                let runInstance = new RunInstance(runner);

                await runInstance.runStep(tree.branches[0].steps[0], tree.branches[0], false);

                expect(runInstance.one).to.equal("oneTHREEfive");
                expect(runInstance.two).to.equal("twoFOURsix");

                await runInstance.runStep(tree.branches[0].steps[1], tree.branches[0], false);

                expect(runInstance.one).to.equal("oneSEVENfive");
                expect(runInstance.two).to.equal("twoEIGHTsix");
            });

            it("handles an error inside a Before Every Step hook", async () => {
                let tree = new Tree();
                tree.parseIn(`
A -

*** Before Every Step {
    var a = 2 + 2;
    throw new Error("oops");
}
                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                let runInstance = new RunInstance(runner);

                tree.nextStep(tree.branches[0], true);
                await runInstance.runStep(tree.branches[0].steps[0], tree.branches[0], false);
                tree.nextStep(tree.branches[0], true);

                expect(tree.branches[0].steps[0].error.message).to.equal("oops");
                expect(tree.branches[0].steps[0].error.filename).to.equal("file.txt");
                expect(tree.branches[0].steps[0].error.lineNumber).to.equal(6);
                expect(!!tree.branches[0].steps[0].error.stack.match(/at CodeBlock_for_Before_Every_Step[^\n]+<anonymous>:6:11\)/)).to.equal(true);

                expect(tree.branches[0].steps[0].isPassed).to.equal(undefined);
                expect(tree.branches[0].steps[0].isFailed).to.equal(true);
                expect(tree.branches[0].steps[0].isSkipped).to.equal(undefined);

                expect(tree.branches[0].error).to.equal(undefined);
                expect(tree.branches[0].isPassed).to.equal(undefined);
                expect(tree.branches[0].isFailed).to.equal(true);
                expect(tree.branches[0].isSkipped).to.equal(undefined);
            });

            it("handles an error inside an After Every Step hook", async () => {
                let tree = new Tree();
                tree.parseIn(`
A -

*** After Every Step {
    var a = 2 + 2;
    throw new Error("oops");
}
                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                let runInstance = new RunInstance(runner);

                tree.nextStep(tree.branches[0], true);
                await runInstance.runStep(tree.branches[0].steps[0], tree.branches[0], false);
                tree.nextStep(tree.branches[0], true);

                expect(tree.branches[0].steps[0].error.message).to.equal("oops");
                expect(tree.branches[0].steps[0].error.filename).to.equal("file.txt");
                expect(tree.branches[0].steps[0].error.lineNumber).to.equal(6);
                expect(!!tree.branches[0].steps[0].error.stack.match(/at CodeBlock_for_After_Every_Step[^\n]+<anonymous>:6:11\)/)).to.equal(true);

                expect(tree.branches[0].steps[0].isPassed).to.equal(undefined);
                expect(tree.branches[0].steps[0].isFailed).to.equal(true);
                expect(tree.branches[0].steps[0].isSkipped).to.equal(undefined);

                expect(tree.branches[0].error).to.equal(undefined);
                expect(tree.branches[0].isPassed).to.equal(undefined);
                expect(tree.branches[0].isFailed).to.equal(true);
                expect(tree.branches[0].isSkipped).to.equal(undefined);
            });

            it("stops running Before Every Step hooks when an error occurs inside a Before Every Step hook, doesn't run actual step, but runs all After Every Step hooks and doesn't override the existing error", async () => {
                let tree = new Tree();
                tree.parseIn(`
A {
    runInstance.one += "THREE"; // this step will be skipped
}

*** Before Every Step {
    runInstance.one += "TWO"; // this hook will be skipped
}

*** Before Every Step {
    throw new Error("oops1"); // this will run second
}

*** Before Every Step {
    runInstance.one = "one"; // this will run first
}

*** After Every Step {
    throw new Error("oops2"); // this will run third, but this error won't override the existing one
}

*** After Every Step {
    runInstance.one += "four"; // this will run fourth
}
                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                let runInstance = new RunInstance(runner);

                await runInstance.runStep(tree.branches[0].steps[0], tree.branches[0], false);

                expect(runInstance.one).to.equal("onefour");

                expect(tree.branches[0].steps[0].error.message).to.equal("oops1");
                expect(tree.branches[0].steps[0].error.filename).to.equal("file.txt");
                expect(tree.branches[0].steps[0].error.lineNumber).to.equal(11);
            });

            it("pauses when an error occurs inside a Before Every Step hook and pauseOnFail is set", async () => {
                let tree = new Tree();
                tree.parseIn(`
A -
    B -

*** Before Every Step {
    var a = 2 + 2;
    throw new Error("oops");
}
                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                runner.pauseOnFail = true;
                let runInstance = new RunInstance(runner);

                await runInstance.runStep(tree.branches[0].steps[0], tree.branches[0], false);

                expect(runInstance.isPaused).to.equal(true);
            });

            it("pauses when an error occurs inside an After Every Step hook and pauseOnFail is set", async () => {
                let tree = new Tree();
                tree.parseIn(`
A -
    B -

*** After Every Step {
    var a = 2 + 2;
    throw new Error("oops");
}
                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                runner.pauseOnFail = true;
                let runInstance = new RunInstance(runner);

                await runInstance.runStep(tree.branches[0].steps[0], tree.branches[0], false);

                expect(runInstance.isPaused).to.equal(true);
            });

            it("pauses when an error occurs inside a Before Every Step hook, pauseOnFail is set, and we we're at the last step of the branch", async () => {
                let tree = new Tree();
                tree.parseIn(`
A -

*** Before Every Step {
    var a = 2 + 2;
    throw new Error("oops");
}

*** After Every Branch {
    runInstance.afterEveryBranchRan = true;
}
                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                runner.pauseOnFail = true;
                let runInstance = new RunInstance(runner);

                await runInstance.runStep(tree.branches[0].steps[0], tree.branches[0], false);

                expect(runInstance.isPaused).to.equal(true);
                expect(runInstance.afterEveryBranchRan).to.equal(undefined);
            });

            it("pauses when an error occurs inside an After Every Step hook, pauseOnFail is set, and we we're at the last step of the branch", async () => {
                let tree = new Tree();
                tree.parseIn(`
A -

*** After Every Step {
    var a = 2 + 2;
    throw new Error("oops");
}

*** After Every Branch {
    runInstance.afterEveryBranchRan = true;
}
                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                runner.pauseOnFail = true;
                let runInstance = new RunInstance(runner);

                await runInstance.runStep(tree.branches[0].steps[0], tree.branches[0], false);

                expect(runInstance.isPaused).to.equal(true);
                expect(runInstance.afterEveryBranchRan).to.equal(undefined);
            });

            it("exits after running After Every Step hooks if an error occurs during a step", async () => {
                let tree = new Tree();
                tree.parseIn(`
First step {
    runInstance.firstStepRan = true;
    throw new Error("oops");
}

    Second step {
        runInstance.secondStepRan = true;
    }

*** Before Every Step {
    runInstance.beforeEveryStep2Ran = true;
}

*** Before Every Step {
    runInstance.beforeEveryStep1Ran = true;
}

*** After Every Step {
    runInstance.afterEveryStep1Ran = true;
}

*** After Every Step {
    runInstance.afterEveryStep2Ran = true;
}
                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                let runInstance = new RunInstance(runner);

                await runInstance.runStep(tree.branches[0].steps[0], tree.branches[0], false);

                expect(runInstance.beforeEveryStep1Ran).to.equal(true);
                expect(runInstance.beforeEveryStep2Ran).to.equal(true);
                expect(runInstance.firstStepRan).to.equal(true);
                expect(runInstance.secondStepRan).to.equal(undefined);
                expect(runInstance.afterEveryStep1Ran).to.equal(true);
                expect(runInstance.afterEveryStep2Ran).to.equal(true);
            });

            it("exits after running After Every Step hooks if an error occurs during a Before Every Step hook", async () => {
                let tree = new Tree();
                tree.parseIn(`
First step {
    runInstance.firstStepRan = true;
}

    Second step {
        runInstance.secondStepRan = true;
    }

*** Before Every Step {
    runInstance.beforeEveryStep2Ran = true;
}

*** Before Every Step {
    runInstance.beforeEveryStep1Ran = true;
    throw new Error("oops");
}

*** After Every Step {
    runInstance.afterEveryStep1Ran = true;
}

*** After Every Step {
    runInstance.afterEveryStep2Ran = true;
}
                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                let runInstance = new RunInstance(runner);

                await runInstance.runStep(tree.branches[0].steps[0], tree.branches[0], false);

                expect(runInstance.beforeEveryStep1Ran).to.equal(true);
                expect(runInstance.beforeEveryStep2Ran).to.equal(undefined);
                expect(runInstance.firstStepRan).to.equal(undefined);
                expect(runInstance.secondStepRan).to.equal(undefined);
                expect(runInstance.afterEveryStep1Ran).to.equal(true);
                expect(runInstance.afterEveryStep2Ran).to.equal(true);
            });

            it("exits after running After Every Step hooks if an error occurs during an After Every Step hook", async () => {
                let tree = new Tree();
                tree.parseIn(`
First step {
    runInstance.firstStepRan = true;
}

    Second step {
        runInstance.secondStepRan = true;
    }

*** Before Every Step {
    runInstance.beforeEveryStep2Ran = true;
}

*** Before Every Step {
    runInstance.beforeEveryStep1Ran = true;
}

*** After Every Step {
    runInstance.afterEveryStep1Ran = true;
    throw new Error("oops");
}

*** After Every Step {
    runInstance.afterEveryStep2Ran = true;
}
                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                let runInstance = new RunInstance(runner);

                await runInstance.runStep(tree.branches[0].steps[0], tree.branches[0], false);

                expect(runInstance.beforeEveryStep1Ran).to.equal(true);
                expect(runInstance.beforeEveryStep2Ran).to.equal(true);
                expect(runInstance.firstStepRan).to.equal(true);
                expect(runInstance.secondStepRan).to.equal(undefined);
                expect(runInstance.afterEveryStep1Ran).to.equal(true);
                expect(runInstance.afterEveryStep2Ran).to.equal(true);
            });
        });

        context("stops", () => {
            it("exits immediately if a stop occurs during a step", async () => {
                let tree = new Tree();
                tree.parseIn(`
First step {
    await new Promise((resolve, reject) => {
        setTimeout(() => {
            runInstance.firstStepRan = true;
            resolve();
        }, 20);

        runInstance.isStopped = true; // stop the RunInstance mid-step
    });
}

    Second step {
        runInstance.secondStepRan = true;
    }

*** Before Every Step {
    runInstance.beforeEveryStep2Ran = true;
}

*** Before Every Step {
    runInstance.beforeEveryStep1Ran = true;
}

*** After Every Step {
    runInstance.afterEveryStep1Ran = true;
}

*** After Every Step {
    runInstance.afterEveryStep2Ran = true;
}
                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                let runInstance = new RunInstance(runner);

                await runInstance.runStep(tree.branches[0].steps[0], tree.branches[0], false);

                expect(tree.branches[0].steps[0].elapsed).to.equal(undefined);

                expect(runInstance.beforeEveryStep1Ran).to.equal(true);
                expect(runInstance.beforeEveryStep2Ran).to.equal(true);
                expect(runInstance.firstStepRan).to.equal(true);
                expect(runInstance.secondStepRan).to.equal(undefined);
                expect(runInstance.afterEveryStep1Ran).to.equal(undefined);
                expect(runInstance.afterEveryStep2Ran).to.equal(undefined);
            });

            it("exits immediately if a stop occurs during a Before Every Step hook", async () => {
                let tree = new Tree();
                tree.parseIn(`
First step {
    runInstance.firstStepRan = true;
}

    Second step {
        runInstance.secondStepRan = true;
    }

*** Before Every Step {
    runInstance.beforeEveryStep2Ran = true;
}

*** Before Every Step {
    await new Promise((resolve, reject) => {
        setTimeout(() => {
            runInstance.beforeEveryStep1Ran = true;
            resolve();
        }, 20);

        runInstance.isStopped = true; // stop the RunInstance mid-step
    });
}

*** After Every Step {
    runInstance.afterEveryStep1Ran = true;
}

*** After Every Step {
    runInstance.afterEveryStep2Ran = true;
}
                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                let runInstance = new RunInstance(runner);

                await runInstance.runStep(tree.branches[0].steps[0], tree.branches[0], false);

                expect(tree.branches[0].steps[0].elapsed).to.equal(undefined);

                expect(runInstance.beforeEveryStep1Ran).to.equal(true);
                expect(runInstance.beforeEveryStep2Ran).to.equal(undefined);
                expect(runInstance.firstStepRan).to.equal(undefined);
                expect(runInstance.secondStepRan).to.equal(undefined);
                expect(runInstance.afterEveryStep1Ran).to.equal(undefined);
                expect(runInstance.afterEveryStep2Ran).to.equal(undefined);
            });

            it("exits immediately if a stop occurs during an After Every Step hook", async () => {
                let tree = new Tree();
                tree.parseIn(`
First step {
    runInstance.firstStepRan = true;
}

    Second step {
        runInstance.secondStepRan = true;
    }

*** Before Every Step {
    runInstance.beforeEveryStep2Ran = true;
}

*** Before Every Step {
    runInstance.beforeEveryStep1Ran = true;
}

*** After Every Step {
    await new Promise((resolve, reject) => {
        setTimeout(() => {
            runInstance.afterEveryStep1Ran = true;
            resolve();
        }, 20);

        runInstance.isStopped = true; // stop the RunInstance mid-step
    });
}

*** After Every Step {
    runInstance.afterEveryStep2Ran = true;
}
                `, "file.txt");

                let runner = new Runner();
                runner.init(tree, true);
                let runInstance = new RunInstance(runner);

                await runInstance.runStep(tree.branches[0].steps[0], tree.branches[0], false);

                expect(tree.branches[0].steps[0].elapsed).to.be.at.least(0);

                expect(runInstance.beforeEveryStep1Ran).to.equal(true);
                expect(runInstance.beforeEveryStep2Ran).to.equal(true);
                expect(runInstance.firstStepRan).to.equal(true);
                expect(runInstance.secondStepRan).to.equal(undefined);
                expect(runInstance.afterEveryStep1Ran).to.equal(true);
                expect(runInstance.afterEveryStep2Ran).to.equal(undefined);
            });
        });
    });

    describe("runHookStep()", () => {
        it("runs a passing hook step", async () => {
            let tree = new Tree();
            let sn = tree.newStepNode();
            sn.codeBlock = ``;

            let runner = new Runner();
            runner.init(tree, true);
            let runInstance = new RunInstance(runner);

            let retVal = await runInstance.runHookStep(new Step(sn.id));
            expect(retVal).to.equal(true);
        });

        it("runs a failing hook step with only a stepToGetError", async () => {
            let tree = new Tree();
            let sn = tree.newStepNode();
            sn.filename = "file1.txt";
            sn.lineNumber = 10;
            sn.codeBlock = `
                throw new Error("foobar");
            `;

            let stepToGetError = new Step(999);

            let runner = new Runner();
            runner.init(tree, true);
            let runInstance = new RunInstance(runner);

            let retVal = await runInstance.runHookStep(new Step(sn.id), stepToGetError);
            expect(retVal).to.equal(false);
            expect(stepToGetError.error.message).to.equal("foobar");
            expect(stepToGetError.error.filename).to.equal("file1.txt");
            expect(stepToGetError.error.lineNumber).to.equal(11);
        });

        it("runs a failing hook step with only a branchToGetError", async () => {
            let tree = new Tree();
            let sn = tree.newStepNode();
            sn.filename = "file1.txt";
            sn.lineNumber = 10;
            sn.codeBlock = `
                throw new Error("foobar");
            `;

            let branchToGetError = new Branch();

            let runner = new Runner();
            runner.init(tree, true);
            let runInstance = new RunInstance(runner);

            let retVal = await runInstance.runHookStep(new Step(sn.id), null, branchToGetError);
            expect(retVal).to.equal(false);
            expect(branchToGetError.error.message).to.equal("foobar");
            expect(branchToGetError.error.filename).to.equal("file1.txt");
            expect(branchToGetError.error.lineNumber).to.equal(11);
        });

        it("runs a failing hook step with only a branchToGetError, but branchToGetError already has an error set", async () => {
            let tree = new Tree();
            let sn = tree.newStepNode();
            sn.filename = "file1.txt";
            sn.lineNumber = 10;
            sn.codeBlock = `
                throw new Error("foobar");
            `;

            let branchToGetError = new Branch();
            branchToGetError.error = new Error("existing error");

            let runner = new Runner();
            runner.init(tree, true);
            let runInstance = new RunInstance(runner);

            let retVal = await runInstance.runHookStep(new Step(sn.id), null, branchToGetError);
            expect(retVal).to.equal(false);
            expect(branchToGetError.error.message).to.equal("existing error");
        });

        it("runs a failing hook step with both a stepToGetError and a branchToGetError", async () => {
            let tree = new Tree();
            let sn = tree.newStepNode();
            sn.filename = "file1.txt";
            sn.lineNumber = 10;
            sn.codeBlock = `
                throw new Error("foobar");
            `;

            let stepToGetError = new Step();
            stepToGetError.filename = "file2.txt";
            stepToGetError.lineNumber = 20;

            let branchToGetError = new Branch();

            let runner = new Runner();
            runner.init(tree, true);
            let runInstance = new RunInstance(runner);

            let retVal = await runInstance.runHookStep(new Step(sn.id), stepToGetError, branchToGetError);
            expect(retVal).to.equal(false);

            expect(stepToGetError.isFailed).to.equal(true);
            expect(stepToGetError.error.message).to.equal("foobar");
            expect(stepToGetError.error.filename).to.equal("file1.txt");
            expect(stepToGetError.error.lineNumber).to.equal(11);

            expect(branchToGetError.isFailed).to.equal(true);
            expect(branchToGetError.error).to.equal(undefined);
        });

        it("runs a failing hook step with no stepToGetError and no branchToGetError", async () => {
            let tree = new Tree();
            let sn = tree.newStepNode();
            sn.filename = "file1.txt";
            sn.lineNumber = 10;
            sn.codeBlock = `
                throw new Error("foobar");
            `;

            let runner = new Runner();
            runner.init(tree, true);
            let runInstance = new RunInstance(runner);

            let retVal = await runInstance.runHookStep(new Step(sn.id));
            expect(retVal).to.equal(false);
        });
    });

    describe("evalCodeBlock()", () => {
        it("evals a code and returns a value asynchonously", async () => {
            let runner = new Runner(new Tree());
            let runInstance = new RunInstance(runner);

            await expect(runInstance.evalCodeBlock("return 5;")).to.eventually.equal(5);
        });

        it("evals a code and returns a value synchronously", () => {
            let runner = new Runner(new Tree());
            let runInstance = new RunInstance(runner);

            expect(runInstance.evalCodeBlock("return 5;", undefined, undefined, 0, undefined, true)).to.equal(5);
        });

        it("returns undefined when executing code that has no return value synchronously", () => {
            let runner = new Runner(new Tree());
            let runInstance = new RunInstance(runner);

            expect(runInstance.evalCodeBlock("5;", undefined, undefined, 0, undefined, true)).to.equal(undefined);
        });

        it("makes the persistent, global, and local objects available", async () => {
            let runner = new Runner(new Tree());
            let runInstance = new RunInstance(runner);
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

        it("makes persistent, global, and local variables available as js variables", async () => {
            let runner = new Runner(new Tree());
            let runInstance = new RunInstance(runner);
            runInstance.setPersistent('a', "A");
            runInstance.setGlobal('b', "B");
            runInstance.setLocal('c', "C");

            await expect(runInstance.evalCodeBlock("return a;")).to.eventually.equal("A");
            await expect(runInstance.evalCodeBlock("return b;")).to.eventually.equal("B");
            await expect(runInstance.evalCodeBlock("return c;")).to.eventually.equal("C");
        });

        it("makes a local variable accessible as a js variable if both a local and global variable share the same name", async () => {
            let runner = new Runner(new Tree());
            let runInstance = new RunInstance(runner);
            runInstance.setGlobal('b', "B");
            runInstance.setLocal('b', "C");

            await expect(runInstance.evalCodeBlock("return b;")).to.eventually.equal("C");
        });

        it("makes a global variable accessible as a js variable if both a global and persistent variable share the same name", async () => {
            let runner = new Runner(new Tree());
            let runInstance = new RunInstance(runner);
            runInstance.setPersistent('b', "B");
            runInstance.setGlobal('b', "C");

            await expect(runInstance.evalCodeBlock("return b;")).to.eventually.equal("C");
        });

        it("makes a local variable accessible as a js variable if both a local and persistent variable share the same name", async () => {
            let runner = new Runner(new Tree());
            let runInstance = new RunInstance(runner);
            runInstance.setPersistent('b', "B");
            runInstance.setLocal('b', "C");

            await expect(runInstance.evalCodeBlock("return b;")).to.eventually.equal("C");
        });

        it("does not make a variable available as js variable if its name contains non-whitelisted characters", async () => {
            let runner = new Runner(new Tree());
            let runInstance = new RunInstance(runner);
            runInstance.setPersistent(" one two ", "A");
            runInstance.setGlobal("three four", "B");
            runInstance.setLocal("five>six", "C");
            runInstance.setLocal("seven", "D");

            await expect(runInstance.evalCodeBlock("return seven;")).to.eventually.equal("D");
        });

        it("does not make a variable available as js variable if its name is blacklisted", async () => {
            let runner = new Runner(new Tree());
            let runInstance = new RunInstance(runner);
            runInstance.setPersistent(" for ", "A");
            runInstance.setGlobal("await", "B");
            runInstance.setLocal("switch ", "C");
            runInstance.setLocal("seven", "D");

            await expect(runInstance.evalCodeBlock("return seven;")).to.eventually.equal("D");
        });

        it("allows for logging inside the code", async () => {
            let runner = new Runner(new Tree());
            let runInstance = new RunInstance(runner);
            let step = new Step();

            await runInstance.evalCodeBlock("log('foobar');", undefined, undefined, 0, step);

            expect(step.log).to.eql([
                {text: "foobar"}
            ]);
        });

        it("handles an error inside the code, with a function name and line number", async () => {
            let runner = new Runner(new Tree());
            let runInstance = new RunInstance(runner);
            let step = new Step();

            let errorThrown = false;
            try {
                await runInstance.evalCodeBlock(`
                    let a = 1;
                    let b = 2;
                    throw new Error('oops');`, "Oops function!", undefined, 10, step);
            }
            catch(e) {
                errorThrown = true;
                expect(e.message).to.equal("oops");
                expect(!!e.stack.match(/at CodeBlock_for_Oops_function[^\n]+<anonymous>:13:27\)/)).to.equal(true);
            }

            expect(errorThrown).to.be.true;
        });

        it("handles an error inside the code, with a function name and no filename or line number", async () => {
            let runner = new Runner(new Tree());
            let runInstance = new RunInstance(runner);
            let step = new Step();

            let errorThrown = false;
            try {
                await runInstance.evalCodeBlock(`
                    let a = 1;
                    let b = 2;
                    throw new Error('oops');`, "Oops function!", undefined, undefined, step);
            }
            catch(e) {
                errorThrown = true;
                expect(e.message).to.equal("oops");
                expect(!!e.stack.match(/at CodeBlock_for_Oops_function[^\n]+<anonymous>:4:27\)/)).to.equal(true);
            }

            expect(errorThrown).to.be.true;
        });

        it("handles an error inside the code, with a function name with all invalid chars", async () => {
            let runner = new Runner(new Tree());
            let runInstance = new RunInstance(runner);
            let step = new Step();

            let errorThrown = false;
            try {
                await runInstance.evalCodeBlock(`
                    let a = 1;
                    let b = 2;
                    throw new Error('oops');`, "@!#!!", undefined, 10, step);
            }
            catch(e) {
                errorThrown = true;
                expect(e.message).to.equal("oops");
                expect(!!e.stack.match(/at CodeBlock \([^\n]+<anonymous>:13:27\)/)).to.equal(true);
            }

            expect(errorThrown).to.be.true;
        });

        it("handles an error inside the code, with no function name", async () => {
            let runner = new Runner(new Tree());
            let runInstance = new RunInstance(runner);
            let step = new Step();

            let errorThrown = false;
            try {
                await runInstance.evalCodeBlock(`
                    let a = 1;
                    let b = 2;
                    throw new Error('oops');`, undefined, undefined, 20, step);
            }
            catch(e) {
                errorThrown = true;
                expect(e.message).to.equal("oops");
                expect(!!e.stack.match(/at CodeBlock \([^\n]+<anonymous>:23:27\)/)).to.equal(true);
            }

            expect(errorThrown).to.be.true;
        });

        it("can import packages", async () => {
            let runner = new Runner(new Tree());
            let runInstance = new RunInstance(runner);

            await expect(runInstance.evalCodeBlock(`
                let chai = i('chai');
                chai.expect(2+3).to.equal(2);
            `)).to.be.rejectedWith("expected 5 to equal 2");

            await expect(runInstance.evalCodeBlock(`
                i('chai');
                i('chai-as-promised');

                getPersistent('chai').expect(!!getPersistent('chaiAsPromised')).to.be.true;
                getPersistent('chai').expect(2+3).to.equal(2);
            `)).to.be.rejectedWith("expected 5 to equal 2");

            await expect(runInstance.evalCodeBlock(`
                i('chai', 'chai');
                i('chaiAsPromised', 'chai-as-promised');

                getPersistent('chai').expect(!!getPersistent('chaiAsPromised')).to.be.true;
                getPersistent('chai').expect(2+3).to.equal(2);
            `)).to.be.rejectedWith("expected 5 to equal 2");
        });
    });

    describe("i()", () => {
        it("includes a file with just a package name", async () => {
            let tree = new Tree();
            tree.parseIn(`
Step {
    i('chalk');
    runInstance.one = p('chalk');
}
            `, "file.txt");

            let runner = new Runner(tree);
            runner.init(tree, true);

            let runInstance = new RunInstance(runner);

            await runInstance.runStep(tree.branches[0].steps[0], tree.branches[0], false);

            expect(typeof runInstance.one).to.equal("function");
            expect(tree.branches[0].isFailed).to.equal(undefined);
            expect(tree.branches[0].steps[0].isFailed).to.equal(undefined);
        });

        it("includes a file with a package name and variable name", async () => {
            let tree = new Tree();
            tree.parseIn(`
Step {
    i('colorful', 'chalk');
    runInstance.one = p('colorful');
}
            `, "file.txt");

            let runner = new Runner(tree);
            runner.init(tree, true);

            let runInstance = new RunInstance(runner);

            await runInstance.runStep(tree.branches[0].steps[0], tree.branches[0], false);

            expect(typeof runInstance.one).to.equal("function");
            expect(tree.branches[0].isFailed).to.equal(undefined);
            expect(tree.branches[0].steps[0].isFailed).to.equal(undefined);
        });

        it("includes a file that has already been included", async () => {
            let tree = new Tree();
            tree.parseIn(`
Step {
    i('chalk');
    i('chalk');
    runInstance.one = p('chalk');
}
            `, "file.txt");

            let runner = new Runner(tree);
            runner.init(tree, true);

            let runInstance = new RunInstance(runner);

            await runInstance.runStep(tree.branches[0].steps[0], tree.branches[0], false);

            expect(typeof runInstance.one).to.equal("function");
            expect(tree.branches[0].isFailed).to.equal(undefined);
            expect(tree.branches[0].steps[0].isFailed).to.equal(undefined);
        });

        it("returns the object being included", async () => {
            let tree = new Tree();
            tree.parseIn(`
Step {
    runInstance.one = i('chalk');
}
            `, "file.txt");

            let runner = new Runner(tree);
            runner.init(tree, true);

            let runInstance = new RunInstance(runner);

            await runInstance.runStep(tree.branches[0].steps[0], tree.branches[0], false);

            expect(typeof runInstance.one).to.equal("function");
            expect(tree.branches[0].isFailed).to.equal(undefined);
            expect(tree.branches[0].steps[0].isFailed).to.equal(undefined);
        });

        // Skipped because the absolute path changes
        it.skip("includes a file with an absolute path", async () => {
            let tree = new Tree();
            tree.parseIn(`
Step {
    runInstance.one = i('/ABSOLUTE-PATH-HERE/smashtest/node_modules/chalk');
}
            `, "file.txt");

            let runner = new Runner(tree);
            runner.init(tree, true);

            let runInstance = new RunInstance(runner);

            await runInstance.runStep(tree.branches[0].steps[0], tree.branches[0], false);

            expect(typeof runInstance.one).to.equal("function");
            expect(tree.branches[0].isFailed).to.equal(undefined);
            expect(tree.branches[0].steps[0].isFailed).to.equal(undefined);
        });

        it("includes a file with a relative path that starts with .", async () => {
            let tree = new Tree();
            tree.parseIn(`
Step {
    runInstance.one = i('./branch.js');
}
            `, "file.txt");

            let runner = new Runner(tree);
            runner.init(tree, true);

            let runInstance = new RunInstance(runner);

            await runInstance.runStep(tree.branches[0].steps[0], tree.branches[0], false);

            expect(typeof runInstance.one).to.equal("function");
            expect(tree.branches[0].isFailed).to.equal(undefined);
            expect(tree.branches[0].steps[0].isFailed).to.equal(undefined);
        });

        it("includes a file with a relative path that starts with ..", async () => {
            let tree = new Tree();
            tree.parseIn(`
Step {
    runInstance.one = i('../../smashtest/node_modules/chalk');
}
            `, "file.txt");

            let runner = new Runner(tree);
            runner.init(tree, true);

            let runInstance = new RunInstance(runner);

            await runInstance.runStep(tree.branches[0].steps[0], tree.branches[0], false);

            expect(typeof runInstance.one).to.equal("function");
            expect(tree.branches[0].isFailed).to.equal(undefined);
            expect(tree.branches[0].steps[0].isFailed).to.equal(undefined);
        });

        it("includes a file using a module name, where the file resides in the executable's node_modules", async () => {
            let tree = new Tree();
            tree.parseIn(`
Step {
    runInstance.one = i('chalk');
}
            `, "file.txt");

            let runner = new Runner(tree);
            runner.init(tree, true);

            let runInstance = new RunInstance(runner);

            await runInstance.runStep(tree.branches[0].steps[0], tree.branches[0], false);

            expect(typeof runInstance.one).to.equal("function");
            expect(tree.branches[0].isFailed).to.equal(undefined);
            expect(tree.branches[0].steps[0].isFailed).to.equal(undefined);
        });

        // Skipped because the absolute path changes
        it.skip("includes a file using a module name, where the file resides in the node_modules of the file of the current step", async () => {
            let tree = new Tree();
            tree.parseIn(`
Step {
    runInstance.one = i('chalk');
}
            `, "/ABSOLUTE-PATH-HERE/file.txt");

            let runner = new Runner(tree);
            runner.init(tree, true);

            let runInstance = new RunInstance(runner);

            await runInstance.runStep(tree.branches[0].steps[0], tree.branches[0], false);

            expect(typeof runInstance.one).to.equal("function");
            expect(tree.branches[0].isFailed).to.equal(undefined);
            expect(tree.branches[0].steps[0].isFailed).to.equal(undefined);
        });

        it("rejects a file with an absolute path that cannot be found", async () => {
            let tree = new Tree();
            tree.parseIn(`
Step {
    i('/bad/path/chalk');
}
            `, "file.txt");

            let runner = new Runner(tree);
            runner.init(tree, true);

            let runInstance = new RunInstance(runner);

            await runInstance.runStep(tree.branches[0].steps[0], tree.branches[0], false);

            expect(tree.branches[0].isFailed).to.be.true;
            expect(tree.branches[0].steps[0].isFailed).to.be.true;
            expect(tree.branches[0].steps[0].error.message).to.equal(`Cannot find module '/bad/path/chalk'`);
        });

        it("rejects a file with a relative path that cannot be found", async () => {
            let tree = new Tree();
            tree.parseIn(`
Step {
    i('../bad/path/chalk');
}
            `, "file.txt");

            let runner = new Runner(tree);
            runner.init(tree, true);

            let runInstance = new RunInstance(runner);

            await runInstance.runStep(tree.branches[0].steps[0], tree.branches[0], false);

            expect(tree.branches[0].isFailed).to.be.true;
            expect(tree.branches[0].steps[0].isFailed).to.be.true;
            expect(tree.branches[0].steps[0].error.message).to.equal(`Cannot find module './../bad/path/chalk'`);
        });

        it("rejects a file with a module name that cannot be found", async () => {
            let tree = new Tree();
            tree.parseIn(`
Step {
    i('bad-module');
}
            `, "file.txt");

            let runner = new Runner(tree);
            runner.init(tree, true);

            let runInstance = new RunInstance(runner);

            await runInstance.runStep(tree.branches[0].steps[0], tree.branches[0], false);

            expect(tree.branches[0].isFailed).to.be.true;
            expect(tree.branches[0].steps[0].isFailed).to.be.true;
            expect(tree.branches[0].steps[0].error.message).to.equal(`Cannot find module 'node_modules/bad-module'`);
        });
    });

    describe("replaceVars()", () => {
        it("replaces {vars} and {{vars}} with their values", () => {
            let tree = new Tree();
            tree.parseIn(`
A -
    {var1}='value1'
        {{var2}} = 'value2'
            {var 3}= "value 3", {{var5}} ='value5',{var6}=[value6]
                {{ var 4 }}=" value 4 "
`, "file.txt");

            let runner = new Runner();
            runner.init(tree, true);
            let runInstance = new RunInstance(runner);
            runInstance.currBranch = tree.branches[0];
            runInstance.currStep = tree.branches[0].steps[0];
            runInstance.setGlobal("var0", "value0");

            expect(runInstance.replaceVars("{var0} {var1:} - {{var2:}}{var 3:}-{{var 4:}}  {{var5:}} {var6:}")).to.equal("value0 value1 - value2value 3- value 4   value5 value6");
        });

        it("handles a branch of null", () => {
            let tree = new Tree();
            tree.parseIn(`
{var1}='value1'
`, "file.txt");

            let runner = new Runner();
            runner.init(tree, true);
            let runInstance = new RunInstance(runner);
            runInstance.currBranch = null;
            runInstance.currStep = tree.branches[0].steps[0];
            runInstance.setGlobal("var0", "value0");

            expect(runInstance.replaceVars("{var0} {var1:}")).to.equal("value0 value1");
        });

        it("doesn't affect a string that doesn't contain variables", () => {
            let tree = new Tree();
            tree.parseIn(`
A -
`, "file.txt");

            let runner = new Runner();
            runner.init(tree, true);
            let runInstance = new RunInstance(runner);
            runInstance.currBranch = tree.branches[0];
            runInstance.currStep = tree.branches[0].steps[0];

            expect(runInstance.replaceVars("foo bar")).to.equal("foo bar");
        });

        // Skipped because it runs slow and we don't need to run it each time
        it.skip("throws an error when vars reference each other in an infinite loop", () => {
            let tree = new Tree();
            tree.parseIn(`
A -
    {var1}='{var1}'
`, "file.txt");

            let runner = new Runner();
            runner.init(tree, true);
            let runInstance = new RunInstance(runner);
            runInstance.currBranch = tree.branches[0];
            runInstance.currStep = tree.branches[0].steps[0];

            assert.throws(() => {
                runInstance.replaceVars("{var1:}");
            }, "Infinite loop detected amongst variable references");

            tree = new Tree();
            tree.parseIn(`
A -
    {var1}='{var2:} {var3:}'
        {var2}='foo'
            {var3}='bar{var1}'
`, "file.txt");

            runner = new Runner();
            runner.init(tree, true);
            runInstance = new RunInstance(runner);
            runInstance.currBranch = tree.branches[0];
            runInstance.currStep = tree.branches[0].steps[0];

            assert.throws(() => {
                expect(runInstance.replaceVars("{var1:}"));
            }, "Infinite loop detected amongst variable references");
        });

        it("replaces vars by looking above and below when lookAnywhere is set to true", () => {
            let tree = new Tree();
            tree.parseIn(`
A -
    {var1}='value1'
`, "file.txt");

            let runner = new Runner();
            runner.init(tree, true);
            let runInstance = new RunInstance(runner);
            runInstance.currBranch = tree.branches[0];
            runInstance.currStep = tree.branches[0].steps[0];
            runInstance.setGlobal("var0", "value0");

            expect(runInstance.replaceVars("{var0} {var1}", true)).to.equal("value0 value1");
        });

        it("throws an error when a var isn't set above or below and when lookAnywhere is set to true", () => {
            let tree = new Tree();
            tree.parseIn(`
A -
    {var1}='value1'
`, "file.txt");

            let runner = new Runner();
            runner.init(tree, true);
            let runInstance = new RunInstance(runner);
            runInstance.currBranch = tree.branches[0];
            runInstance.currStep = tree.branches[0].steps[0];

            assert.throws(() => {
                runInstance.replaceVars("{var2}", true);
            }, "The variable {var2} is never set, but is needed for this step");

            assert.throws(() => {
                runInstance.replaceVars("{var2 :}", true);
            }, "The variable {var2 :} is never set, but is needed for this step");
        });
    });

    describe("findVarValue()", () => {
        it("returns the value of a local variable that's already set", () => {
            let tree = new Tree();
            tree.parseIn(`
A -
`, "file.txt");

            let runner = new Runner();
            runner.init(tree, true);
            let runInstance = new RunInstance(runner);
            runInstance.setLocal("var0", "value0");
            runInstance.currBranch = tree.branches[0];
            runInstance.currStep = tree.branches[0].steps[0];

            expect(runInstance.findVarValue("var0", true)).to.equal("value0");
        });

        it("returns the value of a global variable that's already set", () => {
            let tree = new Tree();
            tree.parseIn(`
A -
`, "file.txt");

            let runner = new Runner();
            runner.init(tree, true);
            let runInstance = new RunInstance(runner);
            runInstance.setGlobal("var0", "value0");
            runInstance.currBranch = tree.branches[0];
            runInstance.currStep = tree.branches[0].steps[0];

            expect(runInstance.findVarValue("var0", false)).to.equal("value0");
        });

        it("returns the value of a variable with a branch of null", () => {
            let tree = new Tree();
            tree.parseIn(`
{var1}='value1'
`, "file.txt");

            let runner = new Runner();
            runner.init(tree, true);
            let runInstance = new RunInstance(runner);
            runInstance.currBranch = null;
            runInstance.currStep = tree.branches[0].steps[0];

            expect(runInstance.findVarValue("var1:", false)).to.equal("value1");
        });

        it("can find variables defined later on the same line", () => {
            let tree = new Tree();
            tree.parseIn(`
{var1}='foo {var2:}', {var2}='bar'
`, "file.txt");

            let runner = new Runner();
            runner.init(tree, true);
            let runInstance = new RunInstance(runner);
            runInstance.currBranch = null;
            runInstance.currStep = tree.branches[0].steps[0];

            expect(runInstance.findVarValue("var1:", false)).to.equal("foo bar");
        });

        it("returns the value of a variable that's not set yet and whose eventual value is a plain string", () => {
            let tree = new Tree();
            tree.parseIn(`
A -
    {var1}="value1"
`, "file.txt");

            let runner = new Runner();
            runner.init(tree, true);
            let runInstance = new RunInstance(runner);
            runInstance.currBranch = tree.branches[0];
            runInstance.currStep = tree.branches[0].steps[0];

            expect(runInstance.findVarValue("var1:", false)).to.equal("value1");
            expect(tree.branches[0].steps[0].log).to.eql([
                {text: "The value of variable {var1:} is being set by a later step at file.txt:3"}
            ]);
        });

        it("throws an error if a local variable is not yet set but is set outside the scope of the current function", () => {
            let tree = new Tree();
            tree.parseIn(`
My function
    {{var1}}="value1"

* My function
    A -
`, "file.txt");

            let runner = new Runner();
            runner.init(tree, true);
            let runInstance = new RunInstance(runner);
            runInstance.currBranch = tree.branches[0];
            runInstance.currStep = tree.branches[0].steps[1];

            assert.throws(() => {
                runInstance.findVarValue("var1:", true);
            }, "The variable {{var1:}} is never set, but is needed for this step");
        });

        it("returns the value of a variable given the same variable name in a different case", () => {
            let tree = new Tree();
            tree.parseIn(`
A -
    {var one}="value1"
`, "file.txt");

            let runner = new Runner();
            runner.init(tree, true);
            let runInstance = new RunInstance(runner);
            runInstance.currBranch = tree.branches[0];
            runInstance.currStep = tree.branches[0].steps[0];

            expect(runInstance.findVarValue("var ONE:", false)).to.equal("value1");
            expect(tree.branches[0].steps[0].log).to.eql([
                {text: "The value of variable {var ONE:} is being set by a later step at file.txt:3"}
            ]);
        });

        it("returns the value of a variable given the same variable name but with varying amounts of whitespace", () => {
            let tree = new Tree();
            tree.parseIn(`
A -
    { var  one  }="value1"
`, "file.txt");

            let runner = new Runner();
            runner.init(tree, true);
            let runInstance = new RunInstance(runner);
            runInstance.currBranch = tree.branches[0];
            runInstance.currStep = tree.branches[0].steps[0];

            expect(runInstance.findVarValue("var one:", false)).to.equal("value1");
            expect(tree.branches[0].steps[0].log).to.eql([
                { text: "The value of variable {var one:} is being set by a later step at file.txt:3" }
            ]);

            tree = new Tree();
            tree.parseIn(`
A -
    {var one}="value1"
`, "file.txt");

            runner = new Runner();
            runner.init(tree, true);
            runInstance = new RunInstance(runner);
            runInstance.currBranch = tree.branches[0];
            runInstance.currStep = tree.branches[0].steps[0];

            expect(runInstance.findVarValue("    var     ONE     : ", false)).to.equal("value1");
            expect(tree.branches[0].steps[0].log).to.eql([
                { text: "The value of variable {    var     ONE     : } is being set by a later step at file.txt:3" }
            ]);
        });

        it("returns the value of a variable that's not set yet and whose eventual value contains more variables", () => {
            // If the original step is A, and its vars are defined in B, then's B's vars are defined 1) before A, 2) between A and B, and 3) after B
            let tree = new Tree();
            tree.parseIn(`
A -
    {{var2}} = 'value2'
        {var1}='{{var2}} {var 3 :} . {var0} {{var5:}}'
            {var 3}= "-{{var 4  :}}-", {{var5}}='value5'
                B -
                    {{ var 4 }}=[ value 4 ]
`, "file.txt");

            let runner = new Runner();
            runner.init(tree, true);
            let runInstance = new RunInstance(runner);
            runInstance.currBranch = tree.branches[0];
            runInstance.currStep = tree.branches[0].steps[0];
            runInstance.setGlobal("var0", "value0");

            expect(runInstance.findVarValue("var1 :", false)).to.equal("value2 - value 4 - . value0 value5");
            expect(tree.branches[0].steps[0].log).to.eql([
                { text: "The value of variable {{var2}} is being set by a later step at file.txt:3" },
                { text: "The value of variable {{var 4  :}} is being set by a later step at file.txt:7" },
                { text: "The value of variable {var 3 :} is being set by a later step at file.txt:5" },
                { text: "The value of variable {{var5:}} is being set by a later step at file.txt:5" },
                { text: "The value of variable {var1 :} is being set by a later step at file.txt:4" }
            ]);
        });

        it("returns the value of a variable that's not set yet and whose eventual value is generated from a sync code block function", () => {
            let tree = new Tree();
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

            let runner = new Runner();
            runner.init(tree, true);
            let runInstance = new RunInstance(runner);
            runInstance.currBranch = tree.branches[0];
            runInstance.currStep = tree.branches[0].steps[0];

            expect(runInstance.findVarValue("var1 :", false)).to.equal("foobar");
            expect(tree.branches[0].steps[0].log).to.eql([
                { text: "The value of variable {var1 :} is being set by a later step at file.txt:3" }
            ]);

            expect(runInstance.findVarValue("var2:", false)).to.equal("blah");
            expect(tree.branches[0].steps[0].log).to.eql([
                { text: "The value of variable {var1 :} is being set by a later step at file.txt:3" },
                { text: "The value of variable {var2:} is being set by a later step at file.txt:7" }
            ]);
        });

        it("throws an error if the variable's value is not set", () => {
            let tree = new Tree();
            tree.parseIn(`
A -
    {var1}="value1"
`, "file.txt");

            let runner = new Runner();
            runner.init(tree, true);
            let runInstance = new RunInstance(runner);
            runInstance.currBranch = tree.branches[0];
            runInstance.currStep = tree.branches[0].steps[0];

            assert.throws(() => {
                runInstance.findVarValue("var2", false);
            }, "The variable {var2} wasn't set, but is needed for this step");
        });

        it("throws an error if the variable's value is set ahead, but the variable is not a lookahead", () => {
            let tree = new Tree();
            tree.parseIn(`
A -
    {var1}="value1"
`, "file.txt");

            let runner = new Runner();
            runner.init(tree, true);
            let runInstance = new RunInstance(runner);
            runInstance.currBranch = tree.branches[0];
            runInstance.currStep = tree.branches[0].steps[0];

            assert.throws(() => {
                runInstance.findVarValue("var1", false);
            }, "The variable {var1} wasn't set, but is needed for this step");
        });

        it("throws an error if the lookahead variable's value is never set", () => {
            let tree = new Tree();
            tree.parseIn(`
A -
    {var1}="value1"
`, "file.txt");

            let runner = new Runner();
            runner.init(tree, true);
            let runInstance = new RunInstance(runner);
            runInstance.currBranch = tree.branches[0];
            runInstance.currStep = tree.branches[0].steps[0];

            assert.throws(() => {
                runInstance.findVarValue("var2:", false);
            }, "The variable {var2:} is never set, but is needed for this step");
        });

        it("throws an error if the lookahead variable's value is set, but the * isn't used", () => {
            let tree = new Tree();
            tree.parseIn(`
A -
    {var1}="value1"
`, "file.txt");

            let runner = new Runner();
            runner.init(tree, true);
            let runInstance = new RunInstance(runner);
            runInstance.currBranch = tree.branches[0];
            runInstance.currStep = tree.branches[0].steps[0];

            assert.throws(() => {
                runInstance.findVarValue("var1", false);
            }, "The variable {var1} wasn't set, but is needed for this step");
        });

        it("uses the existing value if : isn't used", () => {
            let tree = new Tree();
            tree.parseIn(`
A -
    {var1}="bar"
`, "file.txt");

            let runner = new Runner();
            runner.init(tree, true);
            let runInstance = new RunInstance(runner);
            runInstance.g('var1', 'foo');
            runInstance.currBranch = tree.branches[0];
            runInstance.currStep = tree.branches[0].steps[0];

            expect(runInstance.findVarValue("var1", false)).to.equal("foo");
        });

        it("uses the value ahead if : is used", () => {
            let tree = new Tree();
            tree.parseIn(`
A -
    {var1}="bar"
`, "file.txt");

            let runner = new Runner();
            runner.init(tree, true);
            let runInstance = new RunInstance(runner);
            runInstance.g('var1', 'foo');
            runInstance.currBranch = tree.branches[0];
            runInstance.currStep = tree.branches[0].steps[0];

            expect(runInstance.findVarValue("var1:", false)).to.equal("bar");
        });

        it("throws an error if the variable's value contains more variables, but one of those variables is never set", () => {
            let tree = new Tree();
            tree.parseIn(`
A -
    {var1}="-{{var2:}}-"
        {{var3}}="-{var4}-"
`, "file.txt");

            let runner = new Runner();
            runner.init(tree, true);
            let runInstance = new RunInstance(runner);
            runInstance.currBranch = tree.branches[0];
            runInstance.currStep = tree.branches[0].steps[0];

            assert.throws(() => {
                runInstance.findVarValue("var1:", false);
            }, "The variable {{var2:}} is never set, but is needed for this step");

            assert.throws(() => {
                runInstance.findVarValue("var3:", true);
            }, "The variable {var4} is never set, but is needed for this step");
        });

        it("finds var values by looking above and below when lookAnywhere is set to true", () => {
            let tree = new Tree();
            tree.parseIn(`
A -
    {var1}='value1'
`, "file.txt");

            let runner = new Runner();
            runner.init(tree, true);
            let runInstance = new RunInstance(runner);
            runInstance.currBranch = tree.branches[0];
            runInstance.currStep = tree.branches[0].steps[0];
            runInstance.setGlobal("var0", "value0");

            expect(runInstance.findVarValue("var0", false, true)).to.equal("value0");
            expect(runInstance.findVarValue("var1", false, true)).to.equal("value1");
        });

        it("throws an error when a var isn't set above or below and when lookAnywhere is set to true", () => {
            let tree = new Tree();
            tree.parseIn(`
A -
    {var1}='value1'
`, "file.txt");

            let runner = new Runner();
            runner.init(tree, true);
            let runInstance = new RunInstance(runner);
            runInstance.currBranch = tree.branches[0];
            runInstance.currStep = tree.branches[0].steps[0];

            assert.throws(() => {
                runInstance.findVarValue("var2", false, true);
            }, "The variable {var2} is never set, but is needed for this step");

            assert.throws(() => {
                runInstance.findVarValue("var2 :", false, true);
            }, "The variable {var2 :} is never set, but is needed for this step");
        });
    });

    describe("appendToLog()", () => {
        it("logs a string to a step, where no other logs exist", () => {
            let step = new Step();
            let runner = new Runner(new Tree());
            let runInstance = new RunInstance(runner);

            runInstance.appendToLog("foobar", step);

            expect(step.log).to.eql([
                { text: "foobar" }
            ]);
        });

        it("logs a string to a step, where other logs exist", () => {
            let step = new Step();
            let branch = new Branch();
            let runner = new Runner(new Tree());
            let runInstance = new RunInstance(runner);

            branch.log = [
                { text: "foo" }
            ];
            runInstance.appendToLog("bar", step || branch);

            expect(step.log).to.eql([
                { text: "bar" }
            ]);
        });

        it("logs a string to a branch, where no other logs exist and where there is no step", () => {
            let branch = new Branch();
            let runner = new Runner(new Tree());
            let runInstance = new RunInstance(runner);

            runInstance.appendToLog("foobar", null || branch);

            expect(branch.log).to.eql([
                { text: "foobar" }
            ]);
        });

        it("logs a string to a branch, where other logs exist and where there is no step", () => {
            let branch = new Branch();
            let runner = new Runner(new Tree());
            let runInstance = new RunInstance(runner);

            branch.log = [
                { text: "foo" }
            ];
            runInstance.appendToLog("bar", null || branch);

            expect(branch.log).to.eql([
                { text: "foo" },
                { text: "bar" }
            ]);
        });

        it("fails silently when there is no step or branch", () => {
            let step = new Step();
            let runner = new Runner(new Tree());
            let runInstance = new RunInstance(runner);

            assert.doesNotThrow(() => {
                runInstance.appendToLog("foobar", null || null);
            });
        });
    });

    describe("stop()", () => {
        it("stops the RunInstance, time elapsed for the branches are properly measured, and no more steps are running", () => {
            let tree = new Tree();
            tree.parseIn(`
Wait 20ms {
    await new Promise((resolve, reject) => {
        setTimeout(() => {
            resolve();
        }, 20);
    });
}

    A {
        runInstance.ranStepA = true;
    }

Second branch -

    B {
        runInstance.ranStepB = true;
    }

`, "file.txt");

            let runner = new Runner();
            runner.init(tree, true);
            let runInstance = new RunInstance(runner);

            // The branches take 20 ms to run, but will be stopped 10ms in
            var runInstancePromise = runInstance.run();

            // 10 ms in
            setTimeout(() => {
                runInstance.stop();

                expect(runInstance.isStopped).to.be.true;
                expect(runInstance.ranStepA).to.be.undefined;
                expect(runInstance.ranStepB).to.be.undefined;

                expect(tree.branches[0].steps[0].isRunning).to.be.undefined;
                expect(tree.branches[0].steps[1].isRunning).to.be.undefined;
                expect(tree.branches[1].steps[0].isRunning).to.be.undefined;
                expect(tree.branches[1].steps[1].isRunning).to.be.undefined;
            }, 10);

            // 20 ms in, RunInstance is done and ends itself
            return runInstancePromise.then(() => {
                expect(runInstance.isStopped).to.be.true;
                expect(runInstance.ranStepA).to.be.undefined;
                expect(runInstance.ranStepB).to.be.undefined;

                expect(tree.branches[0].steps[0].isRunning).to.be.undefined;
                expect(tree.branches[0].steps[1].isRunning).to.be.undefined;
                expect(tree.branches[1].steps[0].isRunning).to.be.undefined;
                expect(tree.branches[1].steps[1].isRunning).to.be.undefined;

                expect(tree.branches[0].elapsed).to.be.above(15);
                expect(tree.branches[1].elapsed).to.be.undefined;
            });
        });

        it("doesn't log or error to branches or steps once a stop is made", () => {
            let tree = new Tree();
            tree.parseIn(`
Big step {
    await new Promise((resolve, reject) => {
        setTimeout(() => {
            resolve();
        }, 20);
    });

    // log and error happen after a stop occurred mid-step
    log("log from A");
    throw new Error("error from A");
}
`, "file.txt");

            let runner = new Runner();
            runner.init(tree, true);
            let runInstance = new RunInstance(runner);

            // The branches take 20 ms to run, but will be stopped 10ms in
            var runInstancePromise = runInstance.run();

            // 10 ms in
            setTimeout(() => {
                runInstance.stop();
            }, 10);

            // 20 ms in, RunInstance is done and ends itself
            return runInstancePromise.then(() => {
                expect(runInstance.isStopped).to.be.true;
                expect(tree.branches[0].steps[0].log).to.be.undefined;
                expect(tree.branches[0].steps[0].error).to.be.undefined;
            });
        });
    });

    describe("runOneStep()", async () => {
        it("runs the step currently paused on if it's not completed yet and then pauses again", async () => {
            let tree = new Tree();
            tree.parseIn(`
~ A {
    runInstance.ranStepA = !runInstance.ranStepA;
}

    B {
        runInstance.ranStepB = !runInstance.ranStepB;
    }

        C {
            runInstance.ranStepC = !runInstance.ranStepC;
        }

*** Before Every Branch {
    runInstance.beforeEveryBranchRan = !runInstance.beforeEveryBranchRan;
}

*** After Every Branch {
    runInstance.afterEveryBranchRan = !runInstance.afterEveryBranchRan;
}
`, "file.txt");

            let runner = new Runner();
            runner.init(tree, true);
            let runInstance = new RunInstance(runner);

            await runInstance.run();

            expect(runInstance.isPaused).to.be.true;
            expect(runInstance.ranStepA).to.be.undefined;
            expect(runInstance.ranStepB).to.be.undefined;
            expect(runInstance.ranStepC).to.be.undefined;
            expect(tree.branches[0].isPassed).to.be.undefined;
            expect(runInstance.afterEveryBranchRan).to.be.undefined;
            expect(runInstance.beforeEveryBranchRan).to.be.true;

            let isBranchComplete = await runInstance.runOneStep();

            expect(runInstance.isPaused).to.be.true;
            expect(runInstance.ranStepA).to.be.true;
            expect(runInstance.ranStepB).to.be.undefined;
            expect(runInstance.ranStepC).to.be.undefined;
            expect(tree.branches[0].isPassed).to.be.undefined;
            expect(runInstance.afterEveryBranchRan).to.be.undefined;
            expect(runInstance.beforeEveryBranchRan).to.be.true;
            expect(isBranchComplete).to.be.false;

            isBranchComplete = await runInstance.runOneStep();

            expect(runInstance.isPaused).to.be.true;
            expect(runInstance.ranStepA).to.be.true;
            expect(runInstance.ranStepB).to.be.true;
            expect(runInstance.ranStepC).to.be.undefined;
            expect(tree.branches[0].isPassed).to.be.undefined;
            expect(runInstance.afterEveryBranchRan).to.be.undefined;
            expect(runInstance.beforeEveryBranchRan).to.be.true;
            expect(isBranchComplete).to.be.false;

            isBranchComplete = await runInstance.runOneStep();

            expect(runInstance.isPaused).to.be.true;
            expect(runInstance.ranStepA).to.be.true;
            expect(runInstance.ranStepB).to.be.true;
            expect(runInstance.ranStepC).to.be.true;
            expect(tree.branches[0].isPassed).to.be.true;
            expect(runInstance.afterEveryBranchRan).to.be.undefined; // doesn't run After Every Branch until one more runOneStep() call
            expect(runInstance.beforeEveryBranchRan).to.be.true;
            expect(isBranchComplete).to.be.false;

            isBranchComplete = await runInstance.runOneStep();

            expect(runInstance.isPaused).to.be.true;
            expect(runInstance.ranStepA).to.be.true;
            expect(runInstance.ranStepB).to.be.true;
            expect(runInstance.ranStepC).to.be.true;
            expect(tree.branches[0].isPassed).to.be.true;
            expect(runInstance.afterEveryBranchRan).to.be.true;
            expect(runInstance.beforeEveryBranchRan).to.be.true;
            expect(isBranchComplete).to.be.true;
        });

        it("doesn't run the step currently paused on if it's completed already, runs the step after that, then pauses again", async () => {
            let tree = new Tree();
            tree.parseIn(`
A {
    runInstance.ranStepA = !runInstance.ranStepA;
    let e = new Error();
    e.continue = true;
    throw e;
}

    B {
        runInstance.ranStepB = !runInstance.ranStepB;
    }

        C {
            runInstance.ranStepC = !runInstance.ranStepC;
        }

*** Before Every Branch {
    runInstance.beforeEveryBranchRan = !runInstance.beforeEveryBranchRan;
}

*** After Every Branch {
    runInstance.afterEveryBranchRan = !runInstance.afterEveryBranchRan;
}
`, "file.txt");

            let runner = new Runner();
            runner.init(tree, true);
            runner.pauseOnFail = true;
            let runInstance = new RunInstance(runner);

            await runInstance.run();

            expect(runInstance.isPaused).to.be.true;
            expect(runInstance.ranStepA).to.be.true;
            expect(runInstance.ranStepB).to.be.undefined;
            expect(runInstance.ranStepC).to.be.undefined;
            expect(tree.branches[0].isFailed).to.be.undefined;
            expect(runInstance.afterEveryBranchRan).to.be.undefined;
            expect(runInstance.beforeEveryBranchRan).to.be.true;

            let isBranchComplete = await runInstance.runOneStep();

            expect(runInstance.isPaused).to.be.true;
            expect(runInstance.ranStepA).to.be.true;
            expect(runInstance.ranStepB).to.be.true;
            expect(runInstance.ranStepC).to.be.undefined;
            expect(tree.branches[0].isFailed).to.be.undefined;
            expect(runInstance.afterEveryBranchRan).to.be.undefined;
            expect(runInstance.beforeEveryBranchRan).to.be.true;
            expect(isBranchComplete).to.be.false;

            isBranchComplete = await runInstance.runOneStep();

            expect(runInstance.isPaused).to.be.true;
            expect(runInstance.ranStepA).to.be.true;
            expect(runInstance.ranStepB).to.be.true;
            expect(runInstance.ranStepC).to.be.true;
            expect(tree.branches[0].isFailed).to.be.true;
            expect(runInstance.afterEveryBranchRan).to.be.undefined; // doesn't run After Every Branch until one more runOneStep() call
            expect(runInstance.beforeEveryBranchRan).to.be.true;
            expect(isBranchComplete).to.be.false;

            isBranchComplete = await runInstance.runOneStep();

            expect(runInstance.isPaused).to.be.true;
            expect(runInstance.ranStepA).to.be.true;
            expect(runInstance.ranStepB).to.be.true;
            expect(runInstance.ranStepC).to.be.true;
            expect(tree.branches[0].isFailed).to.be.true;
            expect(runInstance.afterEveryBranchRan).to.be.true;
            expect(runInstance.beforeEveryBranchRan).to.be.true;
            expect(isBranchComplete).to.be.true;
        });

        it("works when currently paused on the last step, which has not completed yet", async () => {
            let tree = new Tree();
            tree.parseIn(`
A  {
    runInstance.ranStepA = !runInstance.ranStepA;
}

    B {
        runInstance.ranStepB = !runInstance.ranStepB;
    }

        ~ C {
            runInstance.ranStepC = !runInstance.ranStepC;
        }

*** Before Every Branch {
    runInstance.beforeEveryBranchRan = !runInstance.beforeEveryBranchRan;
}

*** After Every Branch {
    runInstance.afterEveryBranchRan = !runInstance.afterEveryBranchRan;
}
`, "file.txt");

            let runner = new Runner();
            runner.init(tree, true);
            let runInstance = new RunInstance(runner);

            await runInstance.run();

            expect(runInstance.isPaused).to.be.true;
            expect(runInstance.ranStepA).to.be.true;
            expect(runInstance.ranStepB).to.be.true;
            expect(runInstance.ranStepC).to.be.undefined;
            expect(tree.branches[0].isPassed).to.be.undefined;
            expect(runInstance.afterEveryBranchRan).to.be.undefined;
            expect(runInstance.beforeEveryBranchRan).to.be.true;

            let isBranchComplete = await runInstance.runOneStep();

            expect(runInstance.isPaused).to.be.true;
            expect(runInstance.ranStepA).to.be.true;
            expect(runInstance.ranStepB).to.be.true;
            expect(runInstance.ranStepC).to.be.true;
            expect(tree.branches[0].isPassed).to.be.true;
            expect(runInstance.afterEveryBranchRan).to.be.undefined; // doesn't run After Every Branch until one more runOneStep() call
            expect(runInstance.beforeEveryBranchRan).to.be.true;
            expect(isBranchComplete).to.be.false;

            isBranchComplete = await runInstance.runOneStep();

            expect(runInstance.isPaused).to.be.true;
            expect(runInstance.ranStepA).to.be.true;
            expect(runInstance.ranStepB).to.be.true;
            expect(runInstance.ranStepC).to.be.true;
            expect(tree.branches[0].isPassed).to.be.true;
            expect(runInstance.afterEveryBranchRan).to.be.true;
            expect(runInstance.beforeEveryBranchRan).to.be.true;
            expect(isBranchComplete).to.be.true;
        });

        it("works when currently paused on the last step, which has completed already", async () => {
            let tree = new Tree();
            tree.parseIn(`
A {
    runInstance.ranStepA = !runInstance.ranStepA;
}

    B {
        runInstance.ranStepB = !runInstance.ranStepB;
    }

        C {
            runInstance.ranStepC = !runInstance.ranStepC;
            let e = new Error();
            e.continue = true;
            throw e;
        }

*** Before Every Branch {
    runInstance.beforeEveryBranchRan = !runInstance.beforeEveryBranchRan;
}

*** After Every Branch {
    runInstance.afterEveryBranchRan = !runInstance.afterEveryBranchRan;
}
`, "file.txt");

            let runner = new Runner();
            runner.init(tree, true);
            runner.pauseOnFail = true;
            let runInstance = new RunInstance(runner);

            await runInstance.run();

            expect(runInstance.isPaused).to.be.true;
            expect(runInstance.ranStepA).to.be.true;
            expect(runInstance.ranStepB).to.be.true;
            expect(runInstance.ranStepC).to.be.true;
            expect(tree.branches[0].isFailed).to.be.true;
            expect(runInstance.afterEveryBranchRan).to.be.undefined; // doesn't run After Every Branch until one more runOneStep() call
            expect(runInstance.beforeEveryBranchRan).to.be.true;

            let isBranchComplete = await runInstance.runOneStep();

            expect(runInstance.isPaused).to.be.true;
            expect(runInstance.ranStepA).to.be.true;
            expect(runInstance.ranStepB).to.be.true;
            expect(runInstance.ranStepC).to.be.true;
            expect(tree.branches[0].isFailed).to.be.true;
            expect(runInstance.afterEveryBranchRan).to.be.true;
            expect(runInstance.beforeEveryBranchRan).to.be.true;
            expect(isBranchComplete).to.be.true;
        });
    });

    describe("runLastStep()", () => {
        it("fails gracefully when the branch hasn't started yet", async () => {
            let tree = new Tree();
            tree.parseIn(`
~ A {
    runInstance.ranStepA = !runInstance.ranStepA;
}

    B {
        runInstance.ranStepB = !runInstance.ranStepB;
    }

        C {
            runInstance.ranStepC = !runInstance.ranStepC;
        }

*** Before Every Branch {
    runInstance.beforeEveryBranchRan = !runInstance.beforeEveryBranchRan;
}

*** After Every Branch {
    runInstance.afterEveryBranchRan = !runInstance.afterEveryBranchRan;
}
`, "file.txt");

            let runner = new Runner();
            runner.init(tree, true);
            let runInstance = new RunInstance(runner);

            expect(runInstance.isPaused).to.be.false;
            expect(runInstance.ranStepA).to.be.undefined;
            expect(runInstance.ranStepB).to.be.undefined;
            expect(runInstance.ranStepC).to.be.undefined;
            expect(runInstance.afterEveryBranchRan).to.be.undefined;
            expect(runInstance.beforeEveryBranchRan).to.be.undefined;

            await runInstance.runLastStep();

            expect(runInstance.isPaused).to.be.false;
            expect(runInstance.ranStepA).to.be.undefined;
            expect(runInstance.ranStepB).to.be.undefined;
            expect(runInstance.ranStepC).to.be.undefined;
            expect(runInstance.afterEveryBranchRan).to.be.undefined;
            expect(runInstance.beforeEveryBranchRan).to.be.undefined;
        });

        it("fails gracefully when currently on the first step", async () => {
            let tree = new Tree();
            tree.parseIn(`
~ A {
    runInstance.ranStepA = !runInstance.ranStepA;
}

    B {
        runInstance.ranStepB = !runInstance.ranStepB;
    }

        C {
            runInstance.ranStepC = !runInstance.ranStepC;
        }

*** Before Every Branch {
    runInstance.beforeEveryBranchRan = !runInstance.beforeEveryBranchRan;
}

*** After Every Branch {
    runInstance.afterEveryBranchRan = !runInstance.afterEveryBranchRan;
}
`, "file.txt");

            let runner = new Runner();
            runner.init(tree, true);
            let runInstance = new RunInstance(runner);

            await runInstance.run();

            expect(runInstance.isPaused).to.be.true;
            expect(runInstance.ranStepA).to.be.undefined;
            expect(runInstance.ranStepB).to.be.undefined;
            expect(runInstance.ranStepC).to.be.undefined;
            expect(runInstance.afterEveryBranchRan).to.be.undefined;
            expect(runInstance.beforeEveryBranchRan).to.be.true;

            await runInstance.runLastStep();

            expect(runInstance.isPaused).to.be.true;
            expect(runInstance.ranStepA).to.be.undefined;
            expect(runInstance.ranStepB).to.be.undefined;
            expect(runInstance.ranStepC).to.be.undefined;
            expect(runInstance.afterEveryBranchRan).to.be.undefined;
            expect(runInstance.beforeEveryBranchRan).to.be.true;
        });

        it("runs the last step when currently in the middle of the branch, paused by a ~", async () => {
            let tree = new Tree();
            tree.parseIn(`
A {
    runInstance.ranStepA = !runInstance.ranStepA;
}

    B {
        runInstance.ranStepB = !runInstance.ranStepB;
    }

        ~ C {
            runInstance.ranStepC = !runInstance.ranStepC;
        }

*** Before Every Branch {
    runInstance.beforeEveryBranchRan = !runInstance.beforeEveryBranchRan;
}

*** After Every Branch {
    runInstance.afterEveryBranchRan = !runInstance.afterEveryBranchRan;
}
`, "file.txt");

            let runner = new Runner();
            runner.init(tree, true);
            runner.pauseOnFail = true;
            let runInstance = new RunInstance(runner);

            await runInstance.run();

            expect(runInstance.isPaused).to.be.true;
            expect(runInstance.ranStepA).to.be.true;
            expect(runInstance.ranStepB).to.be.true;
            expect(runInstance.ranStepC).to.be.undefined;
            expect(runInstance.afterEveryBranchRan).to.be.undefined;
            expect(runInstance.beforeEveryBranchRan).to.be.true;

            await runInstance.runLastStep();

            expect(runInstance.isPaused).to.be.true;
            expect(runInstance.ranStepA).to.be.true;
            expect(runInstance.ranStepB).to.be.false;
            expect(runInstance.ranStepC).to.be.undefined;
            expect(runInstance.afterEveryBranchRan).to.be.undefined;
            expect(runInstance.beforeEveryBranchRan).to.be.true;

            await runInstance.runLastStep();

            expect(runInstance.isPaused).to.be.true;
            expect(runInstance.ranStepA).to.be.true;
            expect(runInstance.ranStepB).to.be.true;
            expect(runInstance.ranStepC).to.be.undefined;
            expect(runInstance.afterEveryBranchRan).to.be.undefined;
            expect(runInstance.beforeEveryBranchRan).to.be.true;
        });

        it("runs the last step when currently in the middle of the branch, paused by an error", async () => {
            let tree = new Tree();
            tree.parseIn(`
A {
    runInstance.ranStepA = !runInstance.ranStepA;
}

    B {
        runInstance.ranStepB = !runInstance.ranStepB;
        throw new Error("oops");
    }

        C {
            runInstance.ranStepC = !runInstance.ranStepC;
        }

*** Before Every Branch {
    runInstance.beforeEveryBranchRan = !runInstance.beforeEveryBranchRan;
}

*** After Every Branch {
    runInstance.afterEveryBranchRan = !runInstance.afterEveryBranchRan;
}
`, "file.txt");

            let runner = new Runner();
            runner.init(tree, true);
            runner.pauseOnFail = true;
            let runInstance = new RunInstance(runner);

            await runInstance.run();

            expect(runInstance.isPaused).to.be.true;
            expect(runInstance.ranStepA).to.be.true;
            expect(runInstance.ranStepB).to.be.true;
            expect(runInstance.ranStepC).to.be.undefined;
            expect(runInstance.afterEveryBranchRan).to.be.undefined;
            expect(runInstance.beforeEveryBranchRan).to.be.true;

            await runInstance.runLastStep();

            expect(runInstance.isPaused).to.be.true;
            expect(runInstance.ranStepA).to.be.true;
            expect(runInstance.ranStepB).to.be.false;
            expect(runInstance.ranStepC).to.be.undefined;
            expect(runInstance.afterEveryBranchRan).to.be.undefined;
            expect(runInstance.beforeEveryBranchRan).to.be.true;

            await runInstance.runLastStep();

            expect(runInstance.isPaused).to.be.true;
            expect(runInstance.ranStepA).to.be.true;
            expect(runInstance.ranStepB).to.be.true;
            expect(runInstance.ranStepC).to.be.undefined;
            expect(runInstance.afterEveryBranchRan).to.be.undefined;
            expect(runInstance.beforeEveryBranchRan).to.be.true;
        });

        it("runs the last step when currently beyond the last step", async () => {
            let tree = new Tree();
            tree.parseIn(`
A {
    runInstance.ranStepA = !runInstance.ranStepA;
}

    B {
        runInstance.ranStepB = !runInstance.ranStepB;
    }

        C {
            runInstance.ranStepC = !runInstance.ranStepC;
            throw new Error("oops");
        }

*** Before Every Branch {
    runInstance.beforeEveryBranchRan = !runInstance.beforeEveryBranchRan;
}

*** After Every Branch {
    runInstance.afterEveryBranchRan = !runInstance.afterEveryBranchRan;
}
`, "file.txt");

            let runner = new Runner();
            runner.init(tree, true);
            runner.pauseOnFail = true;
            let runInstance = new RunInstance(runner);

            await runInstance.run();

            expect(runInstance.isPaused).to.be.true;
            expect(runInstance.ranStepA).to.be.true;
            expect(runInstance.ranStepB).to.be.true;
            expect(runInstance.ranStepC).to.be.true;
            expect(runInstance.afterEveryBranchRan).to.be.undefined;
            expect(runInstance.beforeEveryBranchRan).to.be.true;

            await runInstance.runLastStep();

            expect(runInstance.isPaused).to.be.true;
            expect(runInstance.ranStepA).to.be.true;
            expect(runInstance.ranStepB).to.be.true;
            expect(runInstance.ranStepC).to.be.false;
            expect(runInstance.afterEveryBranchRan).to.be.undefined;
            expect(runInstance.beforeEveryBranchRan).to.be.true;

            await runInstance.runLastStep();

            expect(runInstance.isPaused).to.be.true;
            expect(runInstance.ranStepA).to.be.true;
            expect(runInstance.ranStepB).to.be.true;
            expect(runInstance.ranStepC).to.be.true;
            expect(runInstance.afterEveryBranchRan).to.be.undefined;
            expect(runInstance.beforeEveryBranchRan).to.be.true;

        });

        it("fails silently when the branch completed already", async () => {
            let tree = new Tree();
            tree.parseIn(`
A {
    runInstance.ranStepA = !runInstance.ranStepA;
}

    B {
        runInstance.ranStepB = !runInstance.ranStepB;
    }

        C {
            runInstance.ranStepC = !runInstance.ranStepC;
        }

*** Before Every Branch {
    runInstance.beforeEveryBranchRan = !runInstance.beforeEveryBranchRan;
}

*** After Every Branch {
    runInstance.afterEveryBranchRan = !runInstance.afterEveryBranchRan;
}
`, "file.txt");

            let runner = new Runner();
            runner.init(tree, true);
            runner.pauseOnFail = true;
            let runInstance = new RunInstance(runner);

            await runInstance.run();

            expect(runInstance.isPaused).to.be.false;
            expect(runInstance.ranStepA).to.be.true;
            expect(runInstance.ranStepB).to.be.true;
            expect(runInstance.ranStepC).to.be.true;
            expect(runInstance.afterEveryBranchRan).to.be.true;
            expect(runInstance.beforeEveryBranchRan).to.be.true;

            await runInstance.runLastStep();

            expect(runInstance.isPaused).to.be.false;
            expect(runInstance.ranStepA).to.be.true;
            expect(runInstance.ranStepB).to.be.true;
            expect(runInstance.ranStepC).to.be.true;
            expect(runInstance.afterEveryBranchRan).to.be.true;
            expect(runInstance.beforeEveryBranchRan).to.be.true;
        });
    });

    describe("skipOneStep()", () => {
        it("skips the step currently paused on if it's not completed yet then pauses again", async () => {
            let tree = new Tree();
            tree.parseIn(`
~ A {
    runInstance.ranStepA = !runInstance.ranStepA;
}

    B {
        runInstance.ranStepB = !runInstance.ranStepB;
    }

        C {
            runInstance.ranStepC = !runInstance.ranStepC;
        }

*** Before Every Branch {
    runInstance.beforeEveryBranchRan = !runInstance.beforeEveryBranchRan;
}

*** After Every Branch {
    runInstance.afterEveryBranchRan = !runInstance.afterEveryBranchRan;
}
`, "file.txt");

            let runner = new Runner();
            runner.init(tree, true);
            let runInstance = new RunInstance(runner);

            await runInstance.run();

            expect(runInstance.isPaused).to.be.true;

            expect(runInstance.ranStepA).to.be.undefined;
            expect(runInstance.ranStepB).to.be.undefined;
            expect(runInstance.ranStepC).to.be.undefined;

            expect(tree.branches[0].steps[0].isSkipped).to.be.undefined;
            expect(tree.branches[0].steps[1].isSkipped).to.be.undefined;
            expect(tree.branches[0].steps[2].isSkipped).to.be.undefined;

            expect(tree.branches[0].isPassed).to.be.undefined;
            expect(runInstance.afterEveryBranchRan).to.be.undefined;
            expect(runInstance.beforeEveryBranchRan).to.be.true;

            let isBranchComplete = await runInstance.skipOneStep();

            expect(runInstance.isPaused).to.be.true;

            expect(runInstance.ranStepA).to.be.undefined;
            expect(runInstance.ranStepB).to.be.undefined;
            expect(runInstance.ranStepC).to.be.undefined;

            expect(tree.branches[0].steps[0].isSkipped).to.be.true;
            expect(tree.branches[0].steps[1].isSkipped).to.be.undefined;
            expect(tree.branches[0].steps[2].isSkipped).to.be.undefined;

            expect(tree.branches[0].isPassed).to.be.undefined;
            expect(runInstance.afterEveryBranchRan).to.be.undefined;
            expect(runInstance.beforeEveryBranchRan).to.be.true;
            expect(isBranchComplete).to.be.false;

            isBranchComplete = await runInstance.skipOneStep();

            expect(runInstance.isPaused).to.be.true;

            expect(runInstance.ranStepA).to.be.undefined;
            expect(runInstance.ranStepB).to.be.undefined;
            expect(runInstance.ranStepC).to.be.undefined;

            expect(tree.branches[0].steps[0].isSkipped).to.be.true;
            expect(tree.branches[0].steps[1].isSkipped).to.be.true;
            expect(tree.branches[0].steps[2].isSkipped).to.be.undefined;

            expect(tree.branches[0].isPassed).to.be.undefined;
            expect(runInstance.afterEveryBranchRan).to.be.undefined;
            expect(runInstance.beforeEveryBranchRan).to.be.true;
            expect(isBranchComplete).to.be.false;

            isBranchComplete = await runInstance.skipOneStep();

            expect(runInstance.isPaused).to.be.true;

            expect(runInstance.ranStepA).to.be.undefined;
            expect(runInstance.ranStepB).to.be.undefined;
            expect(runInstance.ranStepC).to.be.undefined;

            expect(tree.branches[0].steps[0].isSkipped).to.be.true;
            expect(tree.branches[0].steps[1].isSkipped).to.be.true;
            expect(tree.branches[0].steps[2].isSkipped).to.be.true;

            expect(tree.branches[0].isPassed).to.be.true;
            expect(runInstance.afterEveryBranchRan).to.be.undefined; // doesn't run After Every Branch until one more runOneStep() call
            expect(runInstance.beforeEveryBranchRan).to.be.true;
            expect(isBranchComplete).to.be.false;

            isBranchComplete = await runInstance.skipOneStep();

            expect(runInstance.isPaused).to.be.true;

            expect(runInstance.ranStepA).to.be.undefined;
            expect(runInstance.ranStepB).to.be.undefined;
            expect(runInstance.ranStepC).to.be.undefined;

            expect(tree.branches[0].steps[0].isSkipped).to.be.true;
            expect(tree.branches[0].steps[1].isSkipped).to.be.true;
            expect(tree.branches[0].steps[2].isSkipped).to.be.true;

            expect(tree.branches[0].isPassed).to.be.true;
            expect(runInstance.afterEveryBranchRan).to.be.true;
            expect(runInstance.beforeEveryBranchRan).to.be.true;
            expect(isBranchComplete).to.be.true;
        });

        it("skips the step currently paused on if it's completed already, skips the step after than, runs the step after that, then pauses again", async () => {
            let tree = new Tree();
            tree.parseIn(`
A {
    runInstance.ranStepA = !runInstance.ranStepA;
    let e = new Error();
    e.continue = true;
    throw e;
}

    B {
        runInstance.ranStepB = !runInstance.ranStepB;
    }

        C {
            runInstance.ranStepC = !runInstance.ranStepC;
        }

*** Before Every Branch {
    runInstance.beforeEveryBranchRan = !runInstance.beforeEveryBranchRan;
}

*** After Every Branch {
    runInstance.afterEveryBranchRan = !runInstance.afterEveryBranchRan;
}
`, "file.txt");

            let runner = new Runner();
            runner.init(tree, true);
            runner.pauseOnFail = true;
            let runInstance = new RunInstance(runner);

            await runInstance.run();

            expect(runInstance.isPaused).to.be.true;

            expect(runInstance.ranStepA).to.be.true;
            expect(runInstance.ranStepB).to.be.undefined;
            expect(runInstance.ranStepC).to.be.undefined;

            expect(tree.branches[0].steps[0].isSkipped).to.be.undefined;
            expect(tree.branches[0].steps[1].isSkipped).to.be.undefined;
            expect(tree.branches[0].steps[2].isSkipped).to.be.undefined;

            expect(tree.branches[0].isFailed).to.be.undefined;
            expect(runInstance.afterEveryBranchRan).to.be.undefined;
            expect(runInstance.beforeEveryBranchRan).to.be.true;

            let isBranchComplete = await runInstance.skipOneStep();

            expect(runInstance.isPaused).to.be.true;

            expect(runInstance.ranStepA).to.be.true;
            expect(runInstance.ranStepB).to.be.undefined;
            expect(runInstance.ranStepC).to.be.undefined;

            expect(tree.branches[0].steps[0].isSkipped).to.be.undefined;
            expect(tree.branches[0].steps[1].isSkipped).to.be.true;
            expect(tree.branches[0].steps[2].isSkipped).to.be.undefined;

            expect(tree.branches[0].isFailed).to.be.undefined;
            expect(runInstance.afterEveryBranchRan).to.be.undefined;
            expect(runInstance.beforeEveryBranchRan).to.be.true;
            expect(isBranchComplete).to.be.false;

            isBranchComplete = await runInstance.skipOneStep();

            expect(runInstance.isPaused).to.be.true;

            expect(runInstance.ranStepA).to.be.true;
            expect(runInstance.ranStepB).to.be.undefined;
            expect(runInstance.ranStepC).to.be.undefined;

            expect(tree.branches[0].steps[0].isSkipped).to.be.undefined;
            expect(tree.branches[0].steps[1].isSkipped).to.be.true;
            expect(tree.branches[0].steps[2].isSkipped).to.be.true;

            expect(tree.branches[0].isFailed).to.be.true;
            expect(runInstance.afterEveryBranchRan).to.be.undefined; // doesn't run After Every Branch until one more runOneStep() call
            expect(runInstance.beforeEveryBranchRan).to.be.true;
            expect(isBranchComplete).to.be.false;

            isBranchComplete = await runInstance.skipOneStep();

            expect(runInstance.isPaused).to.be.true;

            expect(runInstance.ranStepA).to.be.true;
            expect(runInstance.ranStepB).to.be.undefined;
            expect(runInstance.ranStepC).to.be.undefined;

            expect(tree.branches[0].steps[0].isSkipped).to.be.undefined;
            expect(tree.branches[0].steps[1].isSkipped).to.be.true;
            expect(tree.branches[0].steps[2].isSkipped).to.be.true;

            expect(tree.branches[0].isFailed).to.be.true;
            expect(runInstance.afterEveryBranchRan).to.be.true;
            expect(runInstance.beforeEveryBranchRan).to.be.true;
            expect(isBranchComplete).to.be.true;
        });

        it("works when currently paused on the second-to-last step, which has not completed yet", async () => {
            let tree = new Tree();
            tree.parseIn(`
A  {
    runInstance.ranStepA = !runInstance.ranStepA;
}

    ~ B {
        runInstance.ranStepB = !runInstance.ranStepB;
    }

        C {
            runInstance.ranStepC = !runInstance.ranStepC;
        }

*** Before Every Branch {
    runInstance.beforeEveryBranchRan = !runInstance.beforeEveryBranchRan;
}

*** After Every Branch {
    runInstance.afterEveryBranchRan = !runInstance.afterEveryBranchRan;
}
`, "file.txt");

            let runner = new Runner();
            runner.init(tree, true);
            let runInstance = new RunInstance(runner);

            await runInstance.run();

            expect(runInstance.isPaused).to.be.true;

            expect(runInstance.ranStepA).to.be.true;
            expect(runInstance.ranStepB).to.be.undefined;
            expect(runInstance.ranStepC).to.be.undefined;

            expect(tree.branches[0].steps[0].isSkipped).to.be.undefined;
            expect(tree.branches[0].steps[1].isSkipped).to.be.undefined;
            expect(tree.branches[0].steps[2].isSkipped).to.be.undefined;

            expect(tree.branches[0].isPassed).to.be.undefined;
            expect(runInstance.afterEveryBranchRan).to.be.undefined;
            expect(runInstance.beforeEveryBranchRan).to.be.true;

            let isBranchComplete = await runInstance.skipOneStep();

            expect(runInstance.isPaused).to.be.true;

            expect(runInstance.ranStepA).to.be.true;
            expect(runInstance.ranStepB).to.be.undefined;
            expect(runInstance.ranStepC).to.be.undefined;

            expect(tree.branches[0].steps[0].isSkipped).to.be.undefined;
            expect(tree.branches[0].steps[1].isSkipped).to.be.true;
            expect(tree.branches[0].steps[2].isSkipped).to.be.undefined;

            expect(tree.branches[0].isPassed).to.be.undefined;
            expect(runInstance.afterEveryBranchRan).to.be.undefined;
            expect(runInstance.beforeEveryBranchRan).to.be.true;
            expect(isBranchComplete).to.be.false;

            isBranchComplete = await runInstance.skipOneStep();

            expect(runInstance.isPaused).to.be.true;

            expect(runInstance.ranStepA).to.be.true;
            expect(runInstance.ranStepB).to.be.undefined;
            expect(runInstance.ranStepC).to.be.undefined;

            expect(tree.branches[0].steps[0].isSkipped).to.be.undefined;
            expect(tree.branches[0].steps[1].isSkipped).to.be.true;
            expect(tree.branches[0].steps[2].isSkipped).to.be.true;

            expect(tree.branches[0].isPassed).to.be.true;
            expect(runInstance.afterEveryBranchRan).to.be.undefined; // doesn't run After Every Branch until one more runOneStep() call
            expect(runInstance.beforeEveryBranchRan).to.be.true;
            expect(isBranchComplete).to.be.false;

            isBranchComplete = await runInstance.skipOneStep();

            expect(runInstance.isPaused).to.be.true;

            expect(runInstance.ranStepA).to.be.true;
            expect(runInstance.ranStepB).to.be.undefined;
            expect(runInstance.ranStepC).to.be.undefined;

            expect(tree.branches[0].steps[0].isSkipped).to.be.undefined;
            expect(tree.branches[0].steps[1].isSkipped).to.be.true;
            expect(tree.branches[0].steps[2].isSkipped).to.be.true;

            expect(tree.branches[0].isPassed).to.be.true;
            expect(runInstance.afterEveryBranchRan).to.be.true;
            expect(runInstance.beforeEveryBranchRan).to.be.true;
            expect(isBranchComplete).to.be.true;
        });

        it("works when currently paused on the last step, which has not completed yet", async () => {
            let tree = new Tree();
            tree.parseIn(`
A  {
    runInstance.ranStepA = !runInstance.ranStepA;
}

    B {
        runInstance.ranStepB = !runInstance.ranStepB;
    }

        ~ C {
            runInstance.ranStepC = !runInstance.ranStepC;
        }

*** Before Every Branch {
    runInstance.beforeEveryBranchRan = !runInstance.beforeEveryBranchRan;
}

*** After Every Branch {
    runInstance.afterEveryBranchRan = !runInstance.afterEveryBranchRan;
}
`, "file.txt");

            let runner = new Runner();
            runner.init(tree, true);
            let runInstance = new RunInstance(runner);

            await runInstance.run();

            expect(runInstance.isPaused).to.be.true;

            expect(runInstance.ranStepA).to.be.true;
            expect(runInstance.ranStepB).to.be.true;
            expect(runInstance.ranStepC).to.be.undefined;

            expect(tree.branches[0].steps[0].isSkipped).to.be.undefined;
            expect(tree.branches[0].steps[1].isSkipped).to.be.undefined;
            expect(tree.branches[0].steps[2].isSkipped).to.be.undefined;

            expect(tree.branches[0].isPassed).to.be.undefined;
            expect(runInstance.afterEveryBranchRan).to.be.undefined;
            expect(runInstance.beforeEveryBranchRan).to.be.true;

            let isBranchComplete = await runInstance.skipOneStep();

            expect(runInstance.isPaused).to.be.true;

            expect(runInstance.ranStepA).to.be.true;
            expect(runInstance.ranStepB).to.be.true;
            expect(runInstance.ranStepC).to.be.undefined;

            expect(tree.branches[0].steps[0].isSkipped).to.be.undefined;
            expect(tree.branches[0].steps[1].isSkipped).to.be.undefined;
            expect(tree.branches[0].steps[2].isSkipped).to.be.true;

            expect(tree.branches[0].isPassed).to.be.true;
            expect(runInstance.afterEveryBranchRan).to.be.undefined; // doesn't run After Every Branch until one more runOneStep() call
            expect(runInstance.beforeEveryBranchRan).to.be.true;
            expect(isBranchComplete).to.be.false;

            isBranchComplete = await runInstance.skipOneStep();

            expect(runInstance.isPaused).to.be.true;

            expect(runInstance.ranStepA).to.be.true;
            expect(runInstance.ranStepB).to.be.true;
            expect(runInstance.ranStepC).to.be.undefined;

            expect(tree.branches[0].steps[0].isSkipped).to.be.undefined;
            expect(tree.branches[0].steps[1].isSkipped).to.be.undefined;
            expect(tree.branches[0].steps[2].isSkipped).to.be.true;

            expect(tree.branches[0].isPassed).to.be.true;
            expect(runInstance.afterEveryBranchRan).to.be.true;
            expect(runInstance.beforeEveryBranchRan).to.be.true;
            expect(isBranchComplete).to.be.true;
        });

        it("works when currently paused on the second-to-last step, which has completed already", async () => {
            let tree = new Tree();
            tree.parseIn(`
A {
    runInstance.ranStepA = !runInstance.ranStepA;
}

    B {
        runInstance.ranStepB = !runInstance.ranStepB;
        let e = new Error();
        e.continue = true;
        throw e;
    }

        C {
            runInstance.ranStepC = !runInstance.ranStepC;
        }

*** Before Every Branch {
    runInstance.beforeEveryBranchRan = !runInstance.beforeEveryBranchRan;
}

*** After Every Branch {
    runInstance.afterEveryBranchRan = !runInstance.afterEveryBranchRan;
}
`, "file.txt");

            let runner = new Runner();
            runner.init(tree, true);
            runner.pauseOnFail = true;
            let runInstance = new RunInstance(runner);

            await runInstance.run();

            expect(runInstance.isPaused).to.be.true;

            expect(runInstance.ranStepA).to.be.true;
            expect(runInstance.ranStepB).to.be.true;
            expect(runInstance.ranStepC).to.be.undefined;

            expect(tree.branches[0].steps[0].isSkipped).to.be.undefined;
            expect(tree.branches[0].steps[1].isSkipped).to.be.undefined;
            expect(tree.branches[0].steps[2].isSkipped).to.be.undefined;

            expect(tree.branches[0].isFailed).to.be.undefined;
            expect(runInstance.afterEveryBranchRan).to.be.undefined;
            expect(runInstance.beforeEveryBranchRan).to.be.true;

            let isBranchComplete = await runInstance.skipOneStep();

            expect(runInstance.isPaused).to.be.true;

            expect(runInstance.ranStepA).to.be.true;
            expect(runInstance.ranStepB).to.be.true;
            expect(runInstance.ranStepC).to.be.undefined;

            expect(tree.branches[0].steps[0].isSkipped).to.be.undefined;
            expect(tree.branches[0].steps[1].isSkipped).to.be.undefined;
            expect(tree.branches[0].steps[2].isSkipped).to.be.true;

            expect(tree.branches[0].isFailed).to.be.true;
            expect(runInstance.afterEveryBranchRan).to.be.undefined; // doesn't run After Every Branch until one more runOneStep() call
            expect(runInstance.beforeEveryBranchRan).to.be.true;

            isBranchComplete = await runInstance.skipOneStep();

            expect(runInstance.isPaused).to.be.true;

            expect(runInstance.ranStepA).to.be.true;
            expect(runInstance.ranStepB).to.be.true;
            expect(runInstance.ranStepC).to.be.undefined;

            expect(tree.branches[0].steps[0].isSkipped).to.be.undefined;
            expect(tree.branches[0].steps[1].isSkipped).to.be.undefined;
            expect(tree.branches[0].steps[2].isSkipped).to.be.true;

            expect(tree.branches[0].isFailed).to.be.true;
            expect(runInstance.afterEveryBranchRan).to.be.true;
            expect(runInstance.beforeEveryBranchRan).to.be.true;
            expect(isBranchComplete).to.be.true;
        });

        it("works when currently paused on the last step, which has completed already", async () => {
            let tree = new Tree();
            tree.parseIn(`
A {
    runInstance.ranStepA = !runInstance.ranStepA;
}

    B {
        runInstance.ranStepB = !runInstance.ranStepB;
    }

        C {
            runInstance.ranStepC = !runInstance.ranStepC;
            let e = new Error();
            e.continue = true;
            throw e;
        }

*** Before Every Branch {
    runInstance.beforeEveryBranchRan = !runInstance.beforeEveryBranchRan;
}

*** After Every Branch {
    runInstance.afterEveryBranchRan = !runInstance.afterEveryBranchRan;
}
`, "file.txt");

            let runner = new Runner();
            runner.init(tree, true);
            runner.pauseOnFail = true;
            let runInstance = new RunInstance(runner);

            await runInstance.run();

            expect(runInstance.isPaused).to.be.true;

            expect(runInstance.ranStepA).to.be.true;
            expect(runInstance.ranStepB).to.be.true;
            expect(runInstance.ranStepC).to.be.true;

            expect(tree.branches[0].steps[0].isSkipped).to.be.undefined;
            expect(tree.branches[0].steps[1].isSkipped).to.be.undefined;
            expect(tree.branches[0].steps[2].isSkipped).to.be.undefined;

            expect(tree.branches[0].isFailed).to.be.true;
            expect(runInstance.afterEveryBranchRan).to.be.undefined; // doesn't run After Every Branch until one more runOneStep() call
            expect(runInstance.beforeEveryBranchRan).to.be.true;

            let isBranchComplete = await runInstance.skipOneStep();

            expect(runInstance.isPaused).to.be.true;

            expect(runInstance.ranStepA).to.be.true;
            expect(runInstance.ranStepB).to.be.true;
            expect(runInstance.ranStepC).to.be.true;

            expect(tree.branches[0].steps[0].isSkipped).to.be.undefined;
            expect(tree.branches[0].steps[1].isSkipped).to.be.undefined;
            expect(tree.branches[0].steps[2].isSkipped).to.be.undefined;

            expect(tree.branches[0].isFailed).to.be.true;
            expect(runInstance.afterEveryBranchRan).to.be.true;
            expect(runInstance.beforeEveryBranchRan).to.be.true;
            expect(isBranchComplete).to.be.true;
        });
    });

    describe("inject()", () => {
        it("runs a step, then pauses again", async () => {
            let tree = new Tree();
            tree.parseIn(`
A {
    runInstance.ranStepA = !runInstance.ranStepA;
}

    ~ B {
        runInstance.ranStepB = !runInstance.ranStepB;
    }

        C {
            runInstance.ranStepC = !runInstance.ranStepC;
        }
`, "file.txt");

            let runner = new Runner();
            runner.init(tree, true);
            let runInstance = new RunInstance(runner);

            await runInstance.run();

            expect(runInstance.isPaused).to.be.true;
            expect(runInstance.ranStepA).to.be.true;
            expect(runInstance.ranStepB).to.be.undefined;
            expect(runInstance.ranStepC).to.be.undefined;
            expect(runInstance.ranInjectedStep).to.be.undefined;

            await runInstance.inject(`
Step to Inject {
    runInstance.ranInjectedStep = true;
}`);

            expect(runInstance.isPaused).to.be.true;
            expect(runInstance.ranStepA).to.be.true;
            expect(runInstance.ranStepB).to.be.undefined;
            expect(runInstance.ranStepC).to.be.undefined;
            expect(runInstance.ranInjectedStep).to.be.true;
        });

        it("works when there is no current step or branch", async () => {
            let runner = new Runner(new Tree());
            runner.tree = new Tree();
            let runInstance = new RunInstance(runner);

            await runInstance.inject(`
Step to Inject {
    runInstance.ranInjectedStep = true;
}`);

            expect(runInstance.ranInjectedStep).to.be.true;
        });

        it("step has access to {{vars}} and {vars} that were defined at the time of the pause", async () => {
            let tree = new Tree();
            tree.parseIn(`
{var1}='foo'
    {{var2}}='bar'
        ~ B -
            C -
`, "file.txt");

            let runner = new Runner();
            runner.init(tree, true);
            let runInstance = new RunInstance(runner);

            await runInstance.run();

            await runInstance.inject(`
Step to Inject {
    runInstance.var1 = var1;
    runInstance.var2 = var2;
    runInstance.var3 = getGlobal("var1");
    runInstance.var4 = getLocal("var2");
}`);

            expect(runInstance.var1).to.equal("foo");
            expect(runInstance.var2).to.equal("bar");
            expect(runInstance.var3).to.equal("foo");
            expect(runInstance.var4).to.equal("bar");
        });

        it("step can be a function call for a function that was defined at the time of the pause", async () => {
            let tree = new Tree();
            tree.parseIn(`
~ A -

* My function
    {var1}='foo'
`, "file.txt");

            let runner = new Runner();
            runner.init(tree, true);
            let runInstance = new RunInstance(runner);

            await runInstance.run();

            let stepsRan = await runInstance.inject(`
My function
`);

            expect(runInstance.getGlobal("var1")).to.equal("foo");

            expect(stepsRan.steps).to.have.lengthOf(2);

            expect(tree.stepNodeIndex[stepsRan.steps[0].id].text).to.equal("My function");
            expect(stepsRan.steps[0].isPassed).to.be.true;
            expect(stepsRan.steps[0].isFailed).to.be.undefined;

            expect(tree.stepNodeIndex[stepsRan.steps[1].id].text).to.equal("{var1}='foo'");
            expect(stepsRan.steps[1].isPassed).to.be.true;
            expect(stepsRan.steps[1].isFailed).to.be.undefined;
        });

        it("step can be a function call for a function that was defined in context at the time of the pause", async () => {
            let tree = new Tree();
            tree.parseIn(`
B
    ~ A -

* B
    * My function
        {var1}='foo'
`, "file.txt");

            let runner = new Runner();
            runner.init(tree, true);
            let runInstance = new RunInstance(runner);

            await runInstance.run();

            let stepsRan = await runInstance.inject(`
My function
`);

            expect(runInstance.getGlobal("var1")).to.equal("foo");

            expect(stepsRan.steps).to.have.lengthOf(2);

            expect(tree.stepNodeIndex[stepsRan.steps[0].id].text).to.equal("My function");
            expect(stepsRan.steps[0].isPassed).to.be.true;
            expect(stepsRan.steps[0].isFailed).to.be.undefined;

            expect(tree.stepNodeIndex[stepsRan.steps[1].id].text).to.equal("{var1}='foo'");
            expect(stepsRan.steps[1].isPassed).to.be.true;
            expect(stepsRan.steps[1].isFailed).to.be.undefined;
        });

        it("can call a function that exposes another function in context, which can subsequently be called", async () => {
            let tree = new Tree();
            tree.parseIn(`
~ A -

* B
    * My function
        {var1}='foo'
`, "file.txt");

            let runner = new Runner();
            runner.init(tree, true);
            let runInstance = new RunInstance(runner);

            await runInstance.run();

            let stepsRan = await runInstance.inject(`B`);

            expect(runInstance.getGlobal("var1")).to.be.undefined;
            expect(stepsRan.steps).to.have.lengthOf(1);

            stepsRan = await runInstance.inject(`My function`);

            expect(runInstance.getGlobal("var1")).to.equal("foo");

            expect(stepsRan.steps).to.have.lengthOf(2);

            expect(tree.stepNodeIndex[stepsRan.steps[0].id].text).to.equal("My function");
            expect(stepsRan.steps[0].isPassed).to.be.true;
            expect(stepsRan.steps[0].isFailed).to.be.undefined;

            expect(tree.stepNodeIndex[stepsRan.steps[1].id].text).to.equal("{var1}='foo'");
            expect(stepsRan.steps[1].isPassed).to.be.true;
            expect(stepsRan.steps[1].isFailed).to.be.undefined;
        });

        it("step can be a function call for a function that was defined at the time of the pause, and if we're currently beyond the last step", async () => {
            let tree = new Tree();
            tree.parseIn(`
~ A -

* My function
    {var1}='foo'
`, "file.txt");

            let runner = new Runner();
            runner.init(tree, true);
            let runInstance = new RunInstance(runner);

            await runInstance.run();
            await runInstance.runOneStep(); // now we're right after A

            let stepsRan = await runInstance.inject(`
My function
`);

            expect(runInstance.getGlobal("var1")).to.equal("foo");

            expect(stepsRan.steps).to.have.lengthOf(2);

            expect(tree.stepNodeIndex[stepsRan.steps[0].id].text).to.equal("My function");
            expect(stepsRan.steps[0].isPassed).to.be.true;
            expect(stepsRan.steps[0].isFailed).to.be.undefined;

            expect(tree.stepNodeIndex[stepsRan.steps[1].id].text).to.equal("{var1}='foo'");
            expect(stepsRan.steps[1].isPassed).to.be.true;
            expect(stepsRan.steps[1].isFailed).to.be.undefined;
        });

        it("step can be a function call that's in the tree, but if there is no current branch", async () => {
            let tree = new Tree();
            tree.stepDataMode = 'all';
            tree.parseIn(`
* My function
    {var1}='foo'
`, "file.txt");

            let runner = new Runner();
            runner.init(tree, true);
            let runInstance = new RunInstance(runner);

            let stepsRan = await runInstance.inject(`
My function
`);

            expect(runInstance.getGlobal("var1")).to.equal("foo");

            expect(stepsRan.steps).to.have.lengthOf(2);

            expect(tree.stepNodeIndex[stepsRan.steps[0].id].text).to.equal("My function");
            expect(stepsRan.steps[0].isPassed).to.be.true;
            expect(stepsRan.steps[0].isFailed).to.be.undefined;

            expect(tree.stepNodeIndex[stepsRan.steps[1].id].text).to.equal("{var1}='foo'");
            expect(stepsRan.steps[1].isPassed).to.be.true;
            expect(stepsRan.steps[1].isFailed).to.be.undefined;
        });

        it("attaches an error to the step returned if it fails", async () => {
            let tree = new Tree();
            tree.parseIn(`
~ A -

* My function {
    throw new Error("oops");
}
`, "file.txt");

            let runner = new Runner();
            runner.init(tree, true);
            let runInstance = new RunInstance(runner);

            await runInstance.run();

            let stepsRan = await runInstance.inject(`
My function
`);

            expect(stepsRan.steps).to.have.lengthOf(1);

            expect(tree.stepNodeIndex[stepsRan.steps[0].id].text).to.equal("My function");
            expect(stepsRan.steps[0].isPassed).to.be.undefined;
            expect(stepsRan.steps[0].isFailed).to.be.true;

            expect(stepsRan.steps[0].error.message).to.equal("oops");
            expect(stepsRan.steps[0].error.filename).to.equal("file.txt");
            expect(stepsRan.steps[0].error.lineNumber).to.equal(5);

            expect(runInstance.currStep.error).to.equal(undefined);
            expect(runInstance.currBranch.error).to.equal(undefined);
        });

        it("throws an error for a function call that cannot be found", async () => {
            let tree = new Tree();
            tree.parseIn(`
~ A -
`, "file.txt");

            let runner = new Runner();
            runner.init(tree, true);
            let runInstance = new RunInstance(runner);

            await runInstance.run();

            await expect(runInstance.inject(`Some unknown function`)).to.be.rejectedWith("The function \`Some unknown function\` cannot be found. Is there a typo, or did you mean to make this a textual step (with a - at the end)?");
        });

        it("can handle two function calls that cannot be found", async () => {
            let tree = new Tree();
            tree.parseIn(`
A -
    ~ B -
`, "file.txt");

            let runner = new Runner();
            runner.init(tree, true);
            let runInstance = new RunInstance(runner);

            await runInstance.run();

            await expect(runInstance.inject(`Some unknown function`)).to.be.rejectedWith("The function \`Some unknown function\` cannot be found. Is there a typo, or did you mean to make this a textual step (with a - at the end)?");
            await expect(runInstance.inject(`Some unknown function`)).to.be.rejectedWith("The function \`Some unknown function\` cannot be found. Is there a typo, or did you mean to make this a textual step (with a - at the end)?");
        });

        it("the RunInstance can flawlessly resume from a pause, after an injected step has run", async () => {
            let tree = new Tree();
            tree.parseIn(`
A {
    runInstance.ranStepA = !runInstance.ranStepA;
}
    ~ B {
        runInstance.ranStepB = !runInstance.ranStepB;
    }
        C {
            runInstance.ranStepC = !runInstance.ranStepC;
        }

*** Before Every Branch {
    runInstance.beforeEveryBranchRan = !runInstance.beforeEveryBranchRan;
}

*** After Every Branch {
    runInstance.afterEveryBranchRan = !runInstance.afterEveryBranchRan;
}
`, "file.txt");

            let runner = new Runner();
            runner.init(tree, true);
            let runInstance = new RunInstance(runner);

            await runInstance.run();

            expect(runInstance.beforeEveryBranchRan).to.be.true;
            expect(runInstance.ranStepA).to.be.true;
            expect(runInstance.ranInjectedStep).to.be.undefined;
            expect(runInstance.ranStepB).to.be.undefined;
            expect(runInstance.ranStepC).to.be.undefined;
            expect(runInstance.afterEveryBranchRan).to.be.undefined;

            await runInstance.inject(`
Step to Inject {
    runInstance.ranInjectedStep = !runInstance.ranInjectedStep;
}`);

            expect(runInstance.beforeEveryBranchRan).to.be.true;
            expect(runInstance.ranStepA).to.be.true;
            expect(runInstance.ranInjectedStep).to.be.true;
            expect(runInstance.ranStepB).to.be.undefined;
            expect(runInstance.ranStepC).to.be.undefined;
            expect(runInstance.afterEveryBranchRan).to.be.undefined;

            await runInstance.run();

            expect(runInstance.beforeEveryBranchRan).to.be.true;
            expect(runInstance.ranStepA).to.be.true;
            expect(runInstance.ranInjectedStep).to.be.true;
            expect(runInstance.ranStepB).to.be.true;
            expect(runInstance.ranStepC).to.be.true;
            expect(runInstance.afterEveryBranchRan).to.be.true;
        });

        it("the RunInstance can flawlessly run single steps, after an injected step has run", async () => {
            let tree = new Tree();
            tree.parseIn(`
A {
    runInstance.ranStepA = !runInstance.ranStepA;
}
    ~ B {
        runInstance.ranStepB = !runInstance.ranStepB;
    }
        C {
            runInstance.ranStepC = !runInstance.ranStepC;
        }

*** Before Every Branch {
    runInstance.beforeEveryBranchRan = !runInstance.beforeEveryBranchRan;
}

*** After Every Branch {
    runInstance.afterEveryBranchRan = !runInstance.afterEveryBranchRan;
}
`, "file.txt");

            let runner = new Runner();
            runner.init(tree, true);
            let runInstance = new RunInstance(runner);

            await runInstance.run();

            expect(runInstance.beforeEveryBranchRan).to.be.true;
            expect(runInstance.ranStepA).to.be.true;
            expect(runInstance.ranInjectedStep).to.be.undefined;
            expect(runInstance.ranStepB).to.be.undefined;
            expect(runInstance.ranStepC).to.be.undefined;
            expect(runInstance.afterEveryBranchRan).to.be.undefined;

            await runInstance.inject(`
Step to Inject {
    runInstance.ranInjectedStep = !runInstance.ranInjectedStep;
}`);

            expect(runInstance.beforeEveryBranchRan).to.be.true;
            expect(runInstance.ranStepA).to.be.true;
            expect(runInstance.ranInjectedStep).to.be.true;
            expect(runInstance.ranStepB).to.be.undefined;
            expect(runInstance.ranStepC).to.be.undefined;
            expect(runInstance.afterEveryBranchRan).to.be.undefined;

            await runInstance.runOneStep();

            expect(runInstance.beforeEveryBranchRan).to.be.true;
            expect(runInstance.ranStepA).to.be.true;
            expect(runInstance.ranInjectedStep).to.be.true;
            expect(runInstance.ranStepB).to.be.true;
            expect(runInstance.ranStepC).to.be.undefined;
            expect(runInstance.afterEveryBranchRan).to.be.undefined;

            await runInstance.runOneStep();

            expect(runInstance.beforeEveryBranchRan).to.be.true;
            expect(runInstance.ranStepA).to.be.true;
            expect(runInstance.ranInjectedStep).to.be.true;
            expect(runInstance.ranStepB).to.be.true;
            expect(runInstance.ranStepC).to.be.true;
            expect(runInstance.afterEveryBranchRan).to.be.undefined;

            await runInstance.runOneStep();

            expect(runInstance.beforeEveryBranchRan).to.be.true;
            expect(runInstance.ranStepA).to.be.true;
            expect(runInstance.ranInjectedStep).to.be.true;
            expect(runInstance.ranStepB).to.be.true;
            expect(runInstance.ranStepC).to.be.true;
            expect(runInstance.afterEveryBranchRan).to.be.true;
        });

        it("the RunInstance can flawlessly skip steps, after an injected step has run", async () => {
            let tree = new Tree();
            tree.parseIn(`
A {
    runInstance.ranStepA = !runInstance.ranStepA;
}
    ~ B {
        runInstance.ranStepB = !runInstance.ranStepB;
    }
        C {
            runInstance.ranStepC = !runInstance.ranStepC;
        }

*** Before Every Branch {
    runInstance.beforeEveryBranchRan = !runInstance.beforeEveryBranchRan;
}

*** After Every Branch {
    runInstance.afterEveryBranchRan = !runInstance.afterEveryBranchRan;
}
`, "file.txt");

            let runner = new Runner();
            runner.init(tree, true);
            let runInstance = new RunInstance(runner);

            await runInstance.run();

            expect(runInstance.beforeEveryBranchRan).to.be.true;
            expect(runInstance.ranStepA).to.be.true;
            expect(runInstance.ranInjectedStep).to.be.undefined;
            expect(runInstance.ranStepB).to.be.undefined;
            expect(runInstance.ranStepC).to.be.undefined;
            expect(runInstance.afterEveryBranchRan).to.be.undefined;

            await runInstance.inject(`
Step to Inject {
    runInstance.ranInjectedStep = !runInstance.ranInjectedStep;
}`);

            expect(runInstance.beforeEveryBranchRan).to.be.true;
            expect(runInstance.ranStepA).to.be.true;
            expect(runInstance.ranInjectedStep).to.be.true;
            expect(runInstance.ranStepB).to.be.undefined;
            expect(runInstance.ranStepC).to.be.undefined;
            expect(runInstance.afterEveryBranchRan).to.be.undefined;

            await runInstance.skipOneStep();
            await runInstance.runOneStep();

            expect(runInstance.beforeEveryBranchRan).to.be.true;
            expect(runInstance.ranStepA).to.be.true;
            expect(runInstance.ranInjectedStep).to.be.true;
            expect(runInstance.ranStepB).to.be.undefined;
            expect(runInstance.ranStepC).to.be.true;
            expect(runInstance.afterEveryBranchRan).to.be.undefined;

            await runInstance.skipOneStep();

            expect(runInstance.beforeEveryBranchRan).to.be.true;
            expect(runInstance.ranStepA).to.be.true;
            expect(runInstance.ranInjectedStep).to.be.true;
            expect(runInstance.ranStepB).to.be.undefined;
            expect(runInstance.ranStepC).to.be.true;
            expect(runInstance.afterEveryBranchRan).to.be.true;
        });
    });
});
