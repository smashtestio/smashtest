/* globals describe, it */
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import Runner from '../../src/core/runner.js';
import Tree from '../../src/core/tree.js';
import Comparer from '../../src/packages/js/comparer.js';

const expect = chai.expect;

chai.use(chaiAsPromised);

describe('Runner', () => {
    describe('run()', () => {
        it('runs an empty tree', async () => {
            const tree = new Tree();
            const runner = new Runner(tree);
            runner.init(true);
            await runner.run();
        });

        it('can spawn a single run instance that completes', async () => {
            const tree = new Tree();
            tree.parseIn(
                `
A -
    B -
        C {
            runInstance.runner.ranStepC = true;
        }



`,
                'file.txt'
            );

            const runner = new Runner(tree);
            runner.init(true);
            const isComplete = await runner.run();

            expect(runner.ranStepC).to.be.true;
            expect(isComplete).to.be.true;
        });

        it('can spawn a single run instance that pauses and resumes', async () => {
            const tree = new Tree();
            tree.parseIn(
                `
A {
    runInstance.runner.ranStepA = true;
}
    ~ B {
        runInstance.runner.ranStepB = true;
    }
        C {
            runInstance.runner.ranStepC = true;
        }
`,
                'file.txt'
            );

            const runner = new Runner(tree);
            runner.init(true);
            let isComplete = await runner.run();

            expect(runner.isPaused).to.be.true;
            expect(runner.ranStepA).to.be.true;
            expect(runner.ranStepB).to.be.undefined;
            expect(runner.ranStepC).to.be.undefined;
            expect(isComplete).to.be.false;

            isComplete = await runner.run();

            expect(runner.isPaused).to.be.false;
            expect(runner.ranStepA).to.be.true;
            expect(runner.ranStepB).to.be.true;
            expect(runner.ranStepC).to.be.true;
            expect(isComplete).to.be.true;
        });

        it('can spawn a multiple run instances, all of which complete', async () => {
            const tree = new Tree();
            tree.parseIn(
                `
A -
    B -
        C {
            runInstance.runner.ranStepC = true;
        }

    D -

        E {
            runInstance.runner.ranStepE = true;
        }

F {
    runInstance.runner.ranStepF = true;
}
`,
                'file.txt'
            );

            const runner = new Runner(tree);
            runner.init(true);
            await runner.run();

            expect(runner.ranStepC).to.be.true;
            expect(runner.ranStepE).to.be.true;
            expect(runner.ranStepF).to.be.true;
        });

        it('runs multiple run instances in parallel', async () => {
            const tree = new Tree();
            tree.parseIn(
                `
Branch 1 -
    Wait '20' ms

Branch 2 -
    Wait '20' ms

Branch 3 -
    Wait '20' ms

Branch 4 -
    Wait '20' ms

Branch 5 -
    Wait '20' ms

Branch 6 -
    Wait '20' ms

* Wait {{N}} ms {
    await new Promise((resolve, reject) => {
        setTimeout(() => {
            resolve();
        }, N);
    });
}
`,
                'file.txt'
            );

            const runner = new Runner(tree);
            runner.init(true);
            runner.maxParallel = 6;
            await runner.run();

            expect(tree.elapsed).to.be.above(15);
            expect(tree.elapsed).to.be.below(35);
        });

        it('runs multiple run instances in parallel where maxParallel limits the number of simultaneous run instances', async () => {
            const tree = new Tree();
            tree.parseIn(
                `
Branch 1 -
    Wait '20' ms

Branch 2 -
    Wait '20' ms

Branch 3 -
    Wait '20' ms

Branch 4 -
    Wait '20' ms

Branch 5 -
    Wait '20' ms

Branch 6 -
    Wait '20' ms

* Wait {{N}} ms {
    await new Promise((resolve, reject) => {
        setTimeout(() => {
            resolve();
        }, N);
    });
}
`,
                'file.txt'
            );

            const runner = new Runner(tree);
            runner.init(true);
            runner.maxParallel = 2;
            await runner.run();

            expect(tree.elapsed).to.be.above(55);
            expect(tree.elapsed).to.be.below(90);
        });

        it('runs multiple run instances in parallel where maxParallel is 1', async () => {
            const tree = new Tree();
            tree.parseIn(
                `
Branch 1 -
    Wait '20' ms

Branch 2 -
    Wait '20' ms

Branch 3 -
    Wait '20' ms

* Wait {{N}} ms {
    await new Promise((resolve, reject) => {
        setTimeout(() => {
            resolve();
        }, N);
    });
}
`,
                'file.txt'
            );

            const runner = new Runner(tree);
            runner.init(true);
            runner.maxParallel = 1;
            await runner.run();

            expect(tree.elapsed).to.be.above(55);
            expect(tree.elapsed).to.be.below(90);
        });

        it('can spawn a multiple run instances, but due to ! only a subset of them run at a time', async () => {
            const tree = new Tree();
            tree.parseIn(
                `
Branch Group 1 - !
    Branch 1 -
        Wait '20' ms
            Log '1'

    Branch 2 -
        Wait '20' ms
            Log '2'

    Branch 3 -
        Wait '20' ms
            Log '3'

Branch Group 2 - !
    Branch 4 -
        Wait '20' ms
            Log '4'

    Branch 5 -
        Wait '20' ms
            Log '5'

    Branch 6 -
        Wait '20' ms
            Log '6'

* Wait {{N}} ms {
    await new Promise((resolve, reject) => {
        setTimeout(() => {
            resolve();
        }, N);
    });
}

* Log {{N}} {
    runInstance.runner.numArr.push(N);
}
`,
                'file.txt'
            );

            const runner = new Runner(tree);
            runner.init(true);
            runner.maxParallel = 2;
            runner.numArr = [];
            await runner.run();

            expect(tree.elapsed).to.be.above(55);
            expect(tree.elapsed).to.be.below(100);

            expect(runner.numArr).to.eql(['1', '4', '2', '5', '3', '6']);
        });

        it('runs multiple run instances for multiple branches, where one branch fails and one branch passes', async () => {
            const tree = new Tree();
            tree.parseIn(
                `
Passing branch -
    A -

Failing branch -
    {var1}='{var2}'
`,
                'file.txt'
            );

            const runner = new Runner(tree);
            runner.init(true);
            runner.maxParallel = 1;
            await runner.run();

            expect(tree.branches[0].isPassed).to.be.true;

            expect(tree.branches[1].isFailed).to.be.true;
            expect(tree.branches[1].steps[1].isFailed).to.be.true;
            expect(tree.branches[1].steps[1].error.message).to.equal(
                'The variable {var2} wasn\'t set, but is needed for this step. If it\'s set later in the branch, try using {var2:}.'
            );
        });

        it('pauses before a ~ step is executed, doesn\'t pause on the same step when resumed', async () => {
            const tree = new Tree();
            tree.parseIn(
                `
A {
    runInstance.runner.ranStepA = true;
}
    ~ B {
        runInstance.runner.ranStepB = true;
    }
        C {
            runInstance.runner.ranStepC = true;
        }
`,
                'file.txt'
            );

            const runner = new Runner(tree);
            runner.init(true);
            let isComplete = await runner.run();

            expect(runner.isPaused).to.be.true;
            expect(runner.ranStepA).to.be.true;
            expect(runner.ranStepB).to.be.undefined;
            expect(runner.ranStepC).to.be.undefined;
            expect(isComplete).to.be.false;

            isComplete = await runner.run();

            expect(runner.isPaused).to.be.false;
            expect(runner.ranStepA).to.be.true;
            expect(runner.ranStepB).to.be.true;
            expect(runner.ranStepC).to.be.true;
            expect(isComplete).to.be.true;
        });

        it('pauses after a fail occurs on a step that\'s inside a branch with ~ anywhere', async () => {
            const tree = new Tree();
            tree.parseIn(
                `
A {
    runInstance.runner.ranStepA = true;
    throw new Error();
}
    B {
        runInstance.runner.ranStepB = true;
    }
        C {
            runInstance.runner.ranStepC = true;
        }
            ~ D {
                runInstance.runner.ranStepD = true;
            }
`,
                'file.txt'
            );

            const runner = new Runner(tree);
            runner.init(true);
            let isComplete = await runner.run();

            expect(runner.isPaused).to.be.true;
            expect(runner.ranStepA).to.be.true;
            expect(runner.ranStepB).to.be.undefined;
            expect(runner.ranStepC).to.be.undefined;
            expect(runner.ranStepD).to.be.undefined;
            expect(isComplete).to.be.false;

            isComplete = await runner.run();

            expect(runner.isPaused).to.be.true;
            expect(runner.ranStepA).to.be.true;
            expect(runner.ranStepB).to.be.true;
            expect(runner.ranStepC).to.be.true;
            expect(runner.ranStepD).to.be.undefined;
            expect(isComplete).to.be.false;

            isComplete = await runner.run();

            expect(runner.isPaused).to.be.false;
            expect(runner.ranStepA).to.be.true;
            expect(runner.ranStepB).to.be.true;
            expect(runner.ranStepC).to.be.true;
            expect(runner.ranStepD).to.be.true;
            expect(isComplete).to.be.true;
        });

        it('runs all Before Everything and After Everything steps', async () => {
            const tree = new Tree();
            tree.parseIn(
                `
A
    B
C

* A {
    runInstance.runner.count++;
}

* B {
    runInstance.runner.count++;
}

* C {
    runInstance.runner.count++;
}

*** Before Everything {
    runInstance.runner.count *= 3;
}

*** Before Everything {
    runInstance.runner.count *= 2;
}

*** After Everything {
    runInstance.runner.count *= 4;
}

*** After Everything {
    runInstance.runner.count *= 5;
}

`,
                'file.txt'
            );

            const runner = new Runner(tree);
            runner.init(true);
            runner.count = 1;
            await runner.run();

            expect(runner.count).to.equal(180);
        });

        it('runs all After Everything steps but not the Before Everything steps on resume', async () => {
            const tree = new Tree();
            tree.parseIn(
                `
A
    B
C

* A {
    runInstance.runner.count++;
}

~ * B {
    runInstance.runner.count++;
}

* C {
    runInstance.runner.count++;
}

*** Before Everything {
    runInstance.runner.count *= 3;
}

*** Before Everything {
    runInstance.runner.count *= 2;
}

*** After Everything {
    runInstance.runner.count *= 4;
}

*** After Everything {
    runInstance.runner.count *= 5;
}

`,
                'file.txt'
            );

            const runner = new Runner(tree);
            runner.init(true);
            runner.count = 1;

            await runner.run();
            expect(runner.count).to.equal(7);

            await runner.run();
            expect(runner.count).to.equal(160);
        });

        it('stores errors from Before Everything steps and stops execution', async () => {
            const tree = new Tree();
            tree.parseIn(
                `
A

* A {
    runInstance.runner.ranStepA = true;
}

*** Before Everything {
    runInstance.runner.ranBeforeEverything2 = true;
}

*** Before Everything {
    runInstance.runner.ranBeforeEverything1 = true;
    throw new Error("oops");
}

*** After Everything {
    runInstance.runner.ranAfterEverything1 = true;
}

*** After Everything {
    runInstance.runner.ranAfterEverything2 = true;
}
`,
                'file.txt'
            );

            const runner = new Runner(tree);
            runner.init(true);

            await runner.run();

            expect(runner.ranBeforeEverything1).to.be.true;
            expect(runner.ranBeforeEverything2).to.be.undefined;
            expect(runner.ranStepA).to.be.undefined;
            expect(runner.ranAfterEverything1).to.be.true;
            expect(runner.ranAfterEverything2).to.be.true;

            expect(tree.beforeEverything[0].error.message).to.equal('oops');
            expect(tree.beforeEverything[0].error.filename).to.equal('file.txt');
            expect(tree.beforeEverything[0].error.lineNumber).to.equal(14);
        });

        it('stores errors from After Everything steps', async () => {
            const tree = new Tree();
            tree.parseIn(
                `
A

* A {
    runInstance.runner.ranStepA = true;
}

*** Before Everything {
    runInstance.runner.ranBeforeEverything2 = true;
}

*** Before Everything {
    runInstance.runner.ranBeforeEverything1 = true;
}

*** After Everything {
    runInstance.runner.ranAfterEverything1 = true;
    throw new Error("oops");
}

*** After Everything {
    runInstance.runner.ranAfterEverything2 = true;
}
`,
                'file.txt'
            );

            const runner = new Runner(tree);
            runner.init(true);

            await runner.run();

            expect(runner.ranBeforeEverything1).to.be.true;
            expect(runner.ranBeforeEverything2).to.be.true;
            expect(runner.ranStepA).to.be.true;
            expect(runner.ranAfterEverything1).to.be.true;
            expect(runner.ranAfterEverything2).to.be.true;

            expect(tree.afterEverything[0].error.message).to.equal('oops');
            expect(tree.afterEverything[0].error.filename).to.equal('file.txt');
            expect(tree.afterEverything[0].error.lineNumber).to.equal(18);
        });

        it('when a stop occurs while in a Before Everything hook, stops executing Before Everything hooks and executes all After Everything hooks', async () => {
            const tree = new Tree();
            tree.parseIn(
                `
A

* A {
    runInstance.runner.ranStepA = true;
}

*** Before Everything {
    runInstance.runner.ranBeforeEverything2 = true;
}

*** Before Everything {
    runInstance.runner.ranBeforeEverything1 = true;
    await runInstance.runner.stop();
}

*** After Everything {
    runInstance.runner.ranAfterEverything1 = true;
}

*** After Everything {
    runInstance.runner.ranAfterEverything2 = true;
}
`,
                'file.txt'
            );

            const runner = new Runner(tree);
            runner.init(true);

            await runner.run();

            expect(runner.ranBeforeEverything1).to.be.true;
            expect(runner.ranBeforeEverything2).to.be.undefined;
            expect(runner.ranStepA).to.be.undefined;
            expect(runner.ranAfterEverything1).to.be.true;
            expect(runner.ranAfterEverything2).to.be.true;
        });

        it('when a stop occurs while in an After Everything hook, finishes executing the rest of the After Everything hooks', async () => {
            const tree = new Tree();
            tree.parseIn(
                `
A

* A {
    runInstance.runner.ranStepA = true;
}

*** Before Everything {
    runInstance.runner.ranBeforeEverything2 = true;
}

*** Before Everything {
    runInstance.runner.ranBeforeEverything1 = true;
}

*** After Everything {
    runInstance.runner.ranAfterEverything1 = true;
    await runInstance.runner.stop();
}

*** After Everything {
    runInstance.runner.ranAfterEverything2 = true;
}
`,
                'file.txt'
            );

            const runner = new Runner(tree);
            runner.init(true);

            await runner.run();

            expect(runner.ranBeforeEverything1).to.be.true;
            expect(runner.ranBeforeEverything2).to.be.true;
            expect(runner.ranStepA).to.be.true;
            expect(runner.ranAfterEverything1).to.be.true;
            expect(runner.ranAfterEverything2).to.be.true;
        });

        it('when a stop occurs while executing branches, stops executing branches and executes all After Everything hooks', async () => {
            const tree = new Tree();
            tree.parseIn(
                `
A

* A {
    runInstance.runner.ranStepA = true;
    await runInstance.runner.stop();
}

*** Before Everything {
    runInstance.runner.ranBeforeEverything2 = true;
}

*** Before Everything {
    runInstance.runner.ranBeforeEverything1 = true;
}

*** After Everything {
    runInstance.runner.ranAfterEverything1 = true;
}

*** After Everything {
    runInstance.runner.ranAfterEverything2 = true;
}
`,
                'file.txt'
            );

            const runner = new Runner(tree);
            runner.init(true);

            await runner.run();

            expect(runner.ranBeforeEverything1).to.be.true;
            expect(runner.ranBeforeEverything2).to.be.true;
            expect(runner.ranStepA).to.be.true;
            expect(runner.ranAfterEverything1).to.be.true;
            expect(runner.ranAfterEverything2).to.be.true;
        });

        it('sets tree.elapsed to how long it took the tree to execute', async () => {
            const tree = new Tree();
            tree.parseIn(
                `
Wait 20 ms {
    await new Promise((resolve, reject) => {
        setTimeout(() => {
            resolve();
        }, 20);
    });
}
`,
                'file.txt'
            );

            const runner = new Runner(tree);
            runner.init(true);
            await runner.run();

            expect(tree.elapsed).to.be.above(15);
            expect(tree.elapsed).to.be.below(35);
        });

        it('sets tree.elapsed to how long it took the tree to execute when a stop ocurred', async () => {
            const tree = new Tree();
            tree.parseIn(
                `
Wait 20 ms {
    await new Promise((resolve, reject) => {
        setTimeout(() => {
            resolve();
        }, 20);
    });
}

    Stop me {
        await runInstance.runner.stop();
    }

        Wait 100 ms {
            await new Promise((resolve, reject) => {
                setTimeout(() => {
                    resolve();
                }, 100);
            });
        }
`,
                'file.txt'
            );

            const runner = new Runner(tree);
            runner.init(true);
            await runner.run();

            expect(tree.elapsed).to.be.above(15);
            expect(tree.elapsed).to.be.below(35);
        });

        it('sets tree.elapsed to -1 when a pause and resume occurred', async () => {
            const tree = new Tree();
            tree.parseIn(
                `
A -
    ~ B -
        C -
`,
                'file.txt'
            );

            const runner = new Runner(tree);
            runner.init(true);
            await runner.run();
            expect(tree.elapsed).to.equal(-1);

            await runner.run();
            expect(tree.elapsed).to.equal(-1);
        });

        it('throws an error if the Runner was already stopped before', async () => {
            const tree = new Tree();
            tree.parseIn(
                `
A -
    B {
        await runInstance.runner.stop();
    }
        C -
`,
                'file.txt'
            );

            const runner = new Runner(tree);
            runner.init(true);
            await runner.run();

            await expect(runner.run()).to.be.rejectedWith('Cannot run a stopped runner');
        });
    });

    describe('stop()', () => {
        it('stops all running run instances, time elapsed for the Tree is properly measured', function (done) {
            const tree = new Tree();
            tree.parseIn(
                `
Branch 1 -
    Wait '20' ms

Branch 2 -
    Wait '20' ms

Branch 3 -
    Wait '20' ms

* Wait {{N}} ms {
    await new Promise((resolve, reject) => {
        setTimeout(() => {
            resolve();
        }, N);
    });
}
`,
                'file.txt'
            );

            const runner = new Runner(tree);
            runner.init(true);
            const promise = runner.run();

            // do a stop() after 10 ms
            setTimeout(async () => {
                await runner.stop();

                expect(tree.elapsed).to.be.above(8);
                expect(tree.elapsed).to.be.below(20);

                await promise;

                done();
            }, 10);
        });

        it('runs all After Everything steps asynchronously after a stop occurs', function (done) {
            const tree = new Tree();
            tree.parseIn(
                `
Branch 1 -
    Wait '20' ms

Branch 2 -
    Wait '20' ms

Branch 3 -
    Wait '20' ms

*** After Everything {
    await new Promise((resolve, reject) => {
        setTimeout(() => {
            runInstance.runner.afterEverythingRan = true;
            resolve();
        }, 1);
    });
}

* Wait {{N}} ms {
    await new Promise((resolve, reject) => {
        setTimeout(() => {
            resolve();
        }, N);
    });
}
`,
                'file.txt'
            );

            const runner = new Runner(tree);
            runner.init(true);
            const promise = runner.run();

            // do a stop() after 10 ms
            setTimeout(async () => {
                await runner.stop();

                expect(tree.elapsed).to.be.above(8);
                expect(tree.elapsed).to.be.below(20);
                expect(runner.afterEverythingRan).to.be.true;

                await promise;

                done();
            }, 10);
        });
    });

    describe('runOneStep()', () => {
        it('runs the next step, then pauses again', async () => {
            const tree = new Tree();
            tree.parseIn(
                `
A {
    runInstance.runner.ranStepA = true;
}
    ~ B {
        runInstance.runner.ranStepB = true;
    }
        C {
            runInstance.runner.ranStepC = true;
        }

*** After Everything {
    runInstance.runner.afterEverythingRan = true;
}
`,
                'file.txt'
            );

            const runner = new Runner(tree);
            runner.init(true);
            await runner.run();

            expect(runner.isPaused).to.be.true;
            expect(runner.ranStepA).to.be.true;
            expect(runner.ranStepB).to.be.undefined;
            expect(runner.ranStepC).to.be.undefined;
            expect(runner.afterEverythingRan).to.be.undefined;

            let isBranchComplete = await runner.runOneStep();

            expect(runner.isPaused).to.be.true;
            expect(runner.ranStepA).to.be.true;
            expect(runner.ranStepB).to.be.true;
            expect(runner.ranStepC).to.be.undefined;
            expect(runner.afterEverythingRan).to.be.undefined;
            expect(isBranchComplete).to.be.false;

            isBranchComplete = await runner.runOneStep();

            expect(runner.isPaused).to.be.true;
            expect(runner.ranStepA).to.be.true;
            expect(runner.ranStepB).to.be.true;
            expect(runner.ranStepC).to.be.true;
            expect(runner.afterEverythingRan).to.be.undefined;
            expect(isBranchComplete).to.be.false;

            isBranchComplete = await runner.runOneStep();

            expect(runner.isPaused).to.be.true;
            expect(runner.ranStepA).to.be.true;
            expect(runner.ranStepB).to.be.true;
            expect(runner.ranStepC).to.be.true;
            expect(runner.afterEverythingRan).to.be.true;
            expect(isBranchComplete).to.be.true;
        });

        it('the Runner is able to resume after pausing and running one step', async () => {
            const tree = new Tree();
            tree.parseIn(
                `
A {
    runInstance.runner.ranStepA = true;
}
    ~ B {
        runInstance.runner.ranStepB = true;
    }
        C {
            runInstance.runner.ranStepC = true;
        }

*** After Everything {
    runInstance.runner.afterEverythingRan = true;
}
`,
                'file.txt'
            );

            const runner = new Runner(tree);
            runner.init(true);
            await runner.run();

            expect(runner.isPaused).to.be.true;
            expect(runner.ranStepA).to.be.true;
            expect(runner.ranStepB).to.be.undefined;
            expect(runner.ranStepC).to.be.undefined;
            expect(runner.afterEverythingRan).to.be.undefined;

            const isBranchComplete = await runner.runOneStep();

            expect(runner.isPaused).to.be.true;
            expect(runner.ranStepA).to.be.true;
            expect(runner.ranStepB).to.be.true;
            expect(runner.ranStepC).to.be.undefined;
            expect(runner.afterEverythingRan).to.be.undefined;
            expect(isBranchComplete).to.be.false;

            await runner.run();

            expect(runner.ranStepA).to.be.true;
            expect(runner.ranStepB).to.be.true;
            expect(runner.ranStepC).to.be.true;
            expect(runner.afterEverythingRan).to.be.true;
        });

        it('the Runner is able to resume after pausing, running one step, and ending up beyond the last step', async () => {
            const tree = new Tree();
            tree.parseIn(
                `
A {
    runInstance.runner.ranStepA = true;
}
    ~ B {
        runInstance.runner.ranStepB = true;
    }
        C {
            runInstance.runner.ranStepC = true;
        }

*** After Everything {
    runInstance.runner.afterEverythingRan = true;
}
`,
                'file.txt'
            );

            const runner = new Runner(tree);
            runner.init(true);
            await runner.run();

            expect(runner.isPaused).to.be.true;
            expect(runner.ranStepA).to.be.true;
            expect(runner.ranStepB).to.be.undefined;
            expect(runner.ranStepC).to.be.undefined;
            expect(runner.afterEverythingRan).to.be.undefined;

            let isBranchComplete = await runner.runOneStep();

            expect(runner.isPaused).to.be.true;
            expect(runner.ranStepA).to.be.true;
            expect(runner.ranStepB).to.be.true;
            expect(runner.ranStepC).to.be.undefined;
            expect(runner.afterEverythingRan).to.be.undefined;
            expect(isBranchComplete).to.be.false;

            isBranchComplete = await runner.runOneStep();

            expect(runner.isPaused).to.be.true;
            expect(runner.ranStepA).to.be.true;
            expect(runner.ranStepB).to.be.true;
            expect(runner.ranStepC).to.be.true;
            expect(runner.afterEverythingRan).to.be.undefined;
            expect(isBranchComplete).to.be.false;

            await runner.run();

            expect(runner.ranStepA).to.be.true;
            expect(runner.ranStepB).to.be.true;
            expect(runner.ranStepC).to.be.true;
            expect(runner.afterEverythingRan).to.be.true;
        });

        it('throws error if not paused', async () => {
            const tree = new Tree();
            const runner = new Runner(tree);
            runner.init(true);
            await expect(runner.runOneStep()).to.be.rejectedWith('Must be paused to run a step');
        });
    });

    describe('skipOneStep()', () => {
        it('skips the next step, then pauses again', async () => {
            const tree = new Tree();
            tree.parseIn(
                `
A {
    runInstance.runner.ranStepA = true;
}
    ~ B {
        runInstance.runner.ranStepB = true;
    }
        C {
            runInstance.runner.ranStepC = true;
        }

*** After Everything {
    runInstance.runner.afterEverythingRan = true;
}
`,
                'file.txt'
            );

            const runner = new Runner(tree);
            runner.init(true);
            await runner.run();

            expect(runner.isPaused).to.be.true;
            expect(runner.ranStepA).to.be.true;
            expect(runner.ranStepB).to.be.undefined;
            expect(runner.ranStepC).to.be.undefined;
            expect(runner.afterEverythingRan).to.be.undefined;

            let isBranchComplete = await runner.skipOneStep();

            // We are at the start of C
            expect(runner.isPaused).to.be.true;
            expect(runner.ranStepA).to.be.true;
            expect(runner.ranStepB).to.be.undefined;
            expect(runner.ranStepC).to.be.undefined;
            expect(runner.afterEverythingRan).to.be.undefined;
            expect(isBranchComplete).to.be.false;

            isBranchComplete = await runner.skipOneStep();

            // We are at the start of After Everythings
            expect(runner.isPaused).to.be.true;
            expect(runner.ranStepA).to.be.true;
            expect(runner.ranStepB).to.be.undefined;
            expect(runner.ranStepC).to.be.undefined;
            expect(runner.afterEverythingRan).to.be.undefined;
            expect(isBranchComplete).to.be.false;

            isBranchComplete = await runner.skipOneStep();

            // We finished the branch
            expect(runner.isPaused).to.be.true;
            expect(runner.ranStepA).to.be.true;
            expect(runner.ranStepB).to.be.undefined;
            expect(runner.ranStepC).to.be.undefined;
            expect(runner.afterEverythingRan).to.be.true;
            expect(isBranchComplete).to.be.true;
        });

        it('the Runner is able to resume after pausing and skipping steps', async () => {
            const tree = new Tree();
            tree.parseIn(
                `
A {
    runInstance.runner.ranStepA = true;
}
    ~ B {
        runInstance.runner.ranStepB = true;
    }
        C {
            runInstance.runner.ranStepC = true;
        }

*** After Everything {
    runInstance.runner.afterEverythingRan = true;
}
`,
                'file.txt'
            );

            const runner = new Runner(tree);
            runner.init(true);
            await runner.run();

            expect(runner.isPaused).to.be.true;
            expect(runner.ranStepA).to.be.true;
            expect(runner.ranStepB).to.be.undefined;
            expect(runner.ranStepC).to.be.undefined;
            expect(runner.afterEverythingRan).to.be.undefined;

            const isBranchComplete = await runner.skipOneStep();

            // We are at the start of C
            expect(runner.isPaused).to.be.true;
            expect(runner.ranStepA).to.be.true;
            expect(runner.ranStepB).to.be.undefined;
            expect(runner.ranStepC).to.be.undefined;
            expect(runner.afterEverythingRan).to.be.undefined;
            expect(isBranchComplete).to.be.false;

            await runner.run();

            expect(runner.ranStepA).to.be.true;
            expect(runner.ranStepB).to.be.undefined;
            expect(runner.ranStepC).to.be.true;
            expect(runner.afterEverythingRan).to.be.true;
        });

        it('the Runner is able to resume after pausing, skipping steps, and ending up beyond the last step', async () => {
            const tree = new Tree();
            tree.parseIn(
                `
A {
    runInstance.runner.ranStepA = true;
}
    ~ B {
        runInstance.runner.ranStepB = true;
    }
        C {
            runInstance.runner.ranStepC = true;
        }

*** After Everything {
    runInstance.runner.afterEverythingRan = true;
}
`,
                'file.txt'
            );

            const runner = new Runner(tree);
            runner.init(true);
            await runner.run();

            expect(runner.isPaused).to.be.true;
            expect(runner.ranStepA).to.be.true;
            expect(runner.ranStepB).to.be.undefined;
            expect(runner.ranStepC).to.be.undefined;
            expect(runner.afterEverythingRan).to.be.undefined;

            let isBranchComplete = await runner.skipOneStep();

            // We are at the start of C
            expect(runner.isPaused).to.be.true;
            expect(runner.ranStepA).to.be.true;
            expect(runner.ranStepB).to.be.undefined;
            expect(runner.ranStepC).to.be.undefined;
            expect(runner.afterEverythingRan).to.be.undefined;
            expect(isBranchComplete).to.be.false;

            isBranchComplete = await runner.skipOneStep();

            // We are at the start of After Everythings
            expect(runner.isPaused).to.be.true;
            expect(runner.ranStepA).to.be.true;
            expect(runner.ranStepB).to.be.undefined;
            expect(runner.ranStepC).to.be.undefined;
            expect(runner.afterEverythingRan).to.be.undefined;
            expect(isBranchComplete).to.be.false;

            await runner.run();

            expect(runner.ranStepA).to.be.true;
            expect(runner.ranStepB).to.be.undefined;
            expect(runner.ranStepC).to.be.undefined;
            expect(runner.afterEverythingRan).to.be.true;
        });

        it('throws error if not paused', async () => {
            const tree = new Tree();
            const runner = new Runner(tree);
            runner.init(true);
            await expect(runner.skipOneStep()).to.be.rejectedWith('Must be paused to skip a step');
        });
    });

    describe('inject()', () => {
        it('throws error if not paused', async () => {
            const tree = new Tree();
            const runner = new Runner(tree);
            runner.init(true);
            await expect(runner.inject('')).to.be.rejectedWith('Must be paused to run a step');
        });

        it('injects a step and runs it, then pauses again', async () => {
            const tree = new Tree();
            tree.parseIn(
                `
A {
    runInstance.runner.ranStepA = !runInstance.runner.ranStepA;
}

    ~ B {
        runInstance.runner.ranStepB = !runInstance.runner.ranStepB;
    }

        C {
            runInstance.runner.ranStepC = !runInstance.runner.ranStepC;
        }
`,
                'file.txt'
            );

            const runner = new Runner(tree);
            runner.init(true);
            await runner.run();

            expect(runner.isPaused).to.be.true;
            expect(runner.ranStepA).to.be.true;
            expect(runner.ranStepB).to.be.undefined;
            expect(runner.ranStepC).to.be.undefined;
            expect(runner.ranInjectedStep).to.be.undefined;

            await runner.inject(`
Step to Inject {
    runInstance.runner.ranInjectedStep = !runInstance.runner.ranInjectedStep;
}`);

            expect(runner.isPaused).to.be.true;
            expect(runner.ranStepA).to.be.true;
            expect(runner.ranStepB).to.be.undefined;
            expect(runner.ranStepC).to.be.undefined;
            expect(runner.ranInjectedStep).to.be.true;
        });
    });

    describe('serialize()', () => {
        it('returns a serialized object', async () => {
            const tree = new Tree();
            const runner = new Runner(tree);
            runner.init(true);

            runner.persistent = { a: 1, b: 2 };
            runner.isComplete = true;

            const obj = runner.serialize();

            Comparer.expect(obj).to.match({
                isComplete: true,
                persistent: undefined
            });
        });
    });
});
