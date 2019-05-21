const chai = require('chai');
const expect = chai.expect;
const assert = chai.assert;
const utils = require('../../utils.js');
const Step = require('../../step.js');
const StepNode = require('../../stepnode.js');
const Branch = require('../../branch.js');
const Comparer = require('../../packages/js/comparer.js');

describe("Branch", () => {
    describe("mergeToEnd()", () => {
        it("merges one branch to the end of another branch", () => {
            let stepA = new Step();
            stepA.text = "A";

            let stepB = new Step();
            stepB.text = "B";

            let stepC = new Step();
            stepC.text = "C";

            let branch1 = new Branch;
            branch1.steps = [ stepA ];
            branch1.groups = [ "1" ];
            branch1.frequency = "low";
            branch1.isDebug = true;
            branch1.isPassed = true;

            let branch2 = new Branch;
            branch2.steps = [ stepB, stepC ];
            branch2.nonParallelId = "ppppp";
            branch2.frequency = "high";
            branch2.groups = [ "2", "3" ];
            branch2.isSkipBranch = true;
            branch2.isOnly = true;

            branch1.mergeToEnd(branch2);

            expect(branch1.steps.length).to.equal(3);
            expect(branch2.steps.length).to.equal(2);

            Comparer.expect(branch1).to.match({
                steps: [
                    { text: "A" },
                    { text: "B" },
                    { text: "C" }
                ],
                nonParallelId: "ppppp",
                frequency: "high",
                groups: [ "1", "2", "3" ],
                isSkipBranch: true,
                isOnly: true,
                isDebug: true
            });
        });

        it("merges hook arrays", () => {
            let stepA = new Step();
            stepA.text = "A";

            let stepB = new Step();
            stepB.text = "B";

            let stepC = new Step();
            stepC.text = "C";

            let stepD = new Step();
            stepD.text = "D";

            let stepE = new Step();
            stepE.text = "E";

            let stepF = new Step();
            stepF.text = "F";

            let stepG = new Step();
            stepG.text = "G";

            let branch1 = new Branch;
            branch1.steps = [ stepA ];

            let branch2 = new Branch;
            branch2.steps = [ stepB, stepC ];

            branch1.beforeEveryBranch = [ stepG, stepE ];
            branch2.beforeEveryBranch = [ stepF ];

            branch1.afterEveryBranch = [ stepE ];
            branch2.afterEveryBranch = [ stepF, stepG ];

            branch1.beforeEveryStep = [ stepG, stepF ];
            branch2.beforeEveryStep = [ stepE ];

            branch1.afterEveryStep = [ stepG ];
            branch2.afterEveryStep = [ stepE, stepF ];

            branch1.mergeToEnd(branch2);

            expect(branch1.steps.length).to.equal(3);
            expect(branch2.steps.length).to.equal(2);

            expect(branch1.beforeEveryBranch.length).to.equal(3);
            expect(branch2.beforeEveryBranch.length).to.equal(1);

            expect(branch1.afterEveryBranch.length).to.equal(3);
            expect(branch2.afterEveryBranch.length).to.equal(2);

            expect(branch1.beforeEveryStep.length).to.equal(3);
            expect(branch2.beforeEveryStep.length).to.equal(1);

            expect(branch1.afterEveryStep.length).to.equal(3);
            expect(branch2.afterEveryStep.length).to.equal(2);

            Comparer.expect(branch1).to.match({
                steps: [
                    { text: "A" },
                    { text: "B" },
                    { text: "C" }
                ],
                beforeEveryBranch: [
                    { text: "F" }, { text: "G" }, { text: "E" }
                ],
                afterEveryBranch: [
                    { text: "E" }, { text: "F" }, { text: "G" }
                ],
                beforeEveryStep: [
                    { text: "E" }, { text: "G" }, { text: "F" }
                ],
                afterEveryStep: [
                    { text: "G" }, { text: "E" }, { text: "F" }
                ]
            });
        });
    });

    describe("output()", () => {
        it("outputs the right text", () => {
            let stepNodes = [ new StepNode(0), new StepNode(1), new StepNode(2) ];
            let steps = [ new Step(0), new Step(1), new Step(2) ];

            stepNodes[0].text = "A";
            steps[0].level = 0;

            stepNodes[1].text = "B";
            steps[1].level = 1;

            stepNodes[2].text = "C";
            stepNodes[2].isPackaged = true;
            steps[2].level = 2;

            let branch = new Branch;
            branch.steps = steps;

            expect(branch.output(stepNodes, "Foo")).to.equal(`Foo
    A
        B
            C
`);
        });
    });

    describe("equals()", () => {
        let stepNodes = [];
        let steps = [];

        let branch1 = null;
        let branch2 = null;

        beforeEach(() => {
            for(let i = 0; i < 6; i++) {
                stepNodes.push(new StepNode(i));
                steps.push(new Step(i));
            }

            stepNodes[0].text = "A";
            stepNodes[0].modifiers = [ '-' ];

            stepNodes[1].text = "B";
            stepNodes[1].modifiers = [ '+' ];

            stepNodes[2].text = "C";
            stepNodes[2].modifiers = [];

            stepNodes[3].text = "A";
            stepNodes[3].modifiers = [ '-' ];

            stepNodes[4].text = "B";
            stepNodes[4].modifiers = [ '$', '+' ];

            stepNodes[5].text = "C";
            stepNodes[5].modifiers = [];

            branch1 = new Branch();
            branch2 = new Branch();
        });

        it("finds two empty branches to be equal", () => {
            expect(branch1.equals(branch2, {})).to.equal(true);
            expect(branch1.equals(branch2, {}, 1)).to.equal(true);
        });

        it("finds two equal branches to be equal", () => {
            branch1.steps = steps.slice(0, 3);
            branch2.steps = steps.slice(3, 6);

            expect(branch1.equals(branch2, stepNodes)).to.equal(true);
            expect(branch1.equals(branch2, stepNodes, 3)).to.equal(true);
            expect(branch1.equals(branch2, stepNodes, 2)).to.equal(true);
            expect(branch1.equals(branch2, stepNodes, 1)).to.equal(true);
        });

        it("finds two differently-sized branches to be not equal", () => {
            branch1.steps = steps.slice(0, 3);
            branch2.steps = steps.slice(3, 5);

            expect(branch1.equals(branch2, stepNodes)).to.equal(false);
            expect(branch1.equals(branch2, stepNodes, 3)).to.equal(false);
            expect(branch1.equals(branch2, stepNodes, 4)).to.equal(false);
        });

        it("finds two differently-sized branches to be equal if the first N steps are the same", () => {
            branch1.steps = steps.slice(0, 3);
            branch2.steps = steps.slice(3, 5);

            expect(branch1.equals(branch2, stepNodes, 1)).to.equal(true);
            expect(branch1.equals(branch2, stepNodes, 2)).to.equal(true);
        });

        it("finds two branches with different steps to be not equal", () => {
            stepNodes[4].text = "K";
            branch1.steps = steps.slice(0, 3);
            branch2.steps = steps.slice(3, 6);

            expect(branch1.equals(branch2, stepNodes)).to.equal(false);
            expect(branch1.equals(branch2, stepNodes, 2)).to.equal(false);
        });

        it("finds two branches with different steps to be equal if the first N steps are the same", () => {
            stepNodes[4].text = "K";
            branch1.steps = steps.slice(0, 3);
            branch2.steps = steps.slice(3, 6);

            expect(branch1.equals(branch2, stepNodes, 1)).to.equal(true);
        });

        it("finds two branches with the same steps but different code blocks to not be equal", () => {
            stepNodes[1].codeBlock = 'foo';
            branch1.steps = steps.slice(0, 3);
            branch2.steps = steps.slice(3, 6);

            expect(branch1.equals(branch2, stepNodes)).to.equal(false);

            stepNodes[1].codeBlock = 'foo';
            stepNodes[4].codeBlock = 'bar';
            branch1.steps = steps.slice(0, 3);
            branch2.steps = steps.slice(3, 6);

            expect(branch1.equals(branch2, stepNodes)).to.equal(false);

            delete stepNodes[1].codeBlock;
            steps[1].fid = 6;
            delete stepNodes[4].codeBlock;
            steps[4].fid = 7;
            branch1.steps = steps.slice(0, 3);
            branch2.steps = steps.slice(3, 6);

            expect(branch1.equals(branch2, stepNodes)).to.equal(false);
        });

        it("finds two branches with the same steps and the same code blocks to be equal", () => {
            stepNodes[1].codeBlock = 'foo';
            stepNodes[4].codeBlock = 'foo';
            branch1.steps = steps.slice(0, 3);
            branch2.steps = steps.slice(3, 6);

            expect(branch1.equals(branch2, stepNodes)).to.equal(true);

            delete stepNodes[1].codeBlock;
            steps[1].fid = 6;
            delete stepNodes[4].codeBlock;
            steps[4].fid = 6;
            branch1.steps = steps.slice(0, 3);
            branch2.steps = steps.slice(3, 6);

            expect(branch1.equals(branch2, stepNodes)).to.equal(true);
        });
    });

    describe("updateHash()", () => {
        it("generates the hash for the branch", () => {
            let stepNodes = [ new StepNode(0), new StepNode(1), new StepNode(2) ];
            let steps = [ new Step(0), new Step(1), new Step(2) ];

            stepNodes[0].text = "A";
            stepNodes[1].text = "B";
            stepNodes[2].text = "C";

            let branch = new Branch();
            branch.steps = steps;

            branch.updateHash(stepNodes);
            expect(branch.hash).to.equal("40c53c58fdafacc83cfff6ee3d2f6d69");
        });
    });

    describe("markBranch()", () => {
        let branch = null;

        beforeEach(() => {
            branch = new Branch;

            branch.steps = [];
            branch.steps.push(new Step(1));
            branch.steps.push(new Step(2));
            branch.steps.push(new Step(3));

            branch.steps[0].appendToLog('foobar');
            branch.steps[1].appendToLog('foobar');
            branch.steps[2].appendToLog('foobar');
        });

        context("passing a branch", () => {
            it("doesn't clear step data if stepData is set to 'all'", () => {
                branch.markBranch('pass', null, 'all');

                expect(branch.isPassed).to.be.true;
                expect(branch.isFailed).to.be.undefined;
                expect(branch.isSkipped).to.be.undefined;

                expect(branch.steps[0].log[0].text).to.equal('foobar');
                expect(branch.steps[1].log[0].text).to.equal('foobar');
                expect(branch.steps[2].log[0].text).to.equal('foobar');
            });

            it("clears step data if stepData is set to 'fail'", () => {
                branch.markBranch('pass', null, 'fail');

                expect(branch.isPassed).to.be.true;
                expect(branch.isFailed).to.be.undefined;
                expect(branch.isSkipped).to.be.undefined;

                expect(branch.steps[0].log).to.be.undefined;
                expect(branch.steps[1].log).to.be.undefined;
                expect(branch.steps[2].log).to.be.undefined;
            });

            it("clears step data if stepData is set to 'none'", () => {
                branch.markBranch('pass', null, 'none');

                expect(branch.isPassed).to.be.true;
                expect(branch.isFailed).to.be.undefined;
                expect(branch.isSkipped).to.be.undefined;

                expect(branch.steps[0].log).to.be.undefined;
                expect(branch.steps[1].log).to.be.undefined;
                expect(branch.steps[2].log).to.be.undefined;
            });
        });

        context("failing a branch", () => {
            it("doesn't clear step data if stepData is set to 'all'", () => {
                branch.markBranch('fail', new Error('oops'), 'all');

                expect(branch.isPassed).to.be.undefined;
                expect(branch.isFailed).to.be.true;
                expect(branch.isSkipped).to.be.undefined;

                expect(branch.steps[0].log[0].text).to.equal('foobar');
                expect(branch.steps[1].log[0].text).to.equal('foobar');
                expect(branch.steps[2].log[0].text).to.equal('foobar');
            });

            it("doesn't clear step data if stepData is set to 'fail'", () => {
                branch.markBranch('fail', new Error('oops'), 'fail');

                expect(branch.isPassed).to.be.undefined;
                expect(branch.isFailed).to.be.true;
                expect(branch.isSkipped).to.be.undefined;

                expect(branch.steps[0].log[0].text).to.equal('foobar');
                expect(branch.steps[1].log[0].text).to.equal('foobar');
                expect(branch.steps[2].log[0].text).to.equal('foobar');
            });

            it("clears step data if stepData is set to 'none'", () => {
                branch.markBranch('fail', new Error('oops'), 'none');

                expect(branch.isPassed).to.be.undefined;
                expect(branch.isFailed).to.be.true;
                expect(branch.isSkipped).to.be.undefined;

                expect(branch.steps[0].log).to.be.undefined;
                expect(branch.steps[1].log).to.be.undefined;
                expect(branch.steps[2].log).to.be.undefined;
            });
        });

        context("skipping a branch", () => {
            it("doesn't clear step data if stepData is set to 'all'", () => {
                branch.markBranch('skip', null, 'all');

                expect(branch.isPassed).to.be.undefined;
                expect(branch.isFailed).to.be.undefined;
                expect(branch.isSkipped).to.be.true;

                expect(branch.steps[0].log[0].text).to.equal('foobar');
                expect(branch.steps[1].log[0].text).to.equal('foobar');
                expect(branch.steps[2].log[0].text).to.equal('foobar');
            });

            it("clears step data if stepData is set to 'fail'", () => {
                branch.markBranch('skip', null, 'fail');

                expect(branch.isPassed).to.be.undefined;
                expect(branch.isFailed).to.be.undefined;
                expect(branch.isSkipped).to.be.true;

                expect(branch.steps[0].log).to.be.undefined;
                expect(branch.steps[1].log).to.be.undefined;
                expect(branch.steps[2].log).to.be.undefined;
            });

            it("clears step data if stepData is set to 'none'", () => {
                branch.markBranch('skip', null, 'none');

                expect(branch.isPassed).to.be.undefined;
                expect(branch.isFailed).to.be.undefined;
                expect(branch.isSkipped).to.be.true;

                expect(branch.steps[0].log).to.be.undefined;
                expect(branch.steps[1].log).to.be.undefined;
                expect(branch.steps[2].log).to.be.undefined;
            });
        });
    });

    describe("finishOffBranch()", () => {
        it("marks a branch passed when all steps passed", () => {
            let stepNodes = [];
            let steps = [];

            for(let i = 1; i <= 4; i++) {
                stepNodes.push(new StepNode(i));
                steps.push(new Step(i));
            }

            stepNodes[0].text = "A";
            steps[0].isPassed = true;

            stepNodes[1].text = "B";
            steps[1].isPassed = true;

            stepNodes[2].text = "C";
            steps[2].isPassed = true;

            stepNodes[3].text = "D";
            steps[3].isPassed = true;

            let branch = new Branch();
            branch.steps = steps;

            branch.finishOffBranch();

            Comparer.expect(branch).to.match({
                isPassed: true,
                isFailed: undefined
            });
        });

        it("marks a branch failed when one of the steps failed", () => {
            let stepNodes = [];
            let steps = [];

            for(let i = 1; i <= 4; i++) {
                stepNodes.push(new StepNode(i));
                steps.push(new Step(i));
            }

            stepNodes[0].text = "A";
            steps[0].isPassed = true;

            stepNodes[1].text = "B";
            steps[1].isFailed = true;

            stepNodes[2].text = "C";
            steps[2].isPassed = true;

            stepNodes[3].text = "D";
            steps[3].isPassed = true;

            let branch = new Branch();
            branch.steps = steps;

            branch.finishOffBranch();

            Comparer.expect(branch).to.match({
                isPassed: undefined,
                isFailed: true
            });
        });
    });

    describe("serialize()", () => {
        it("returns a serialized object", () => {
            let b = new Branch();

            b.nonParallelId = 4;
            b.isPassed = true;
            b.steps = [ new Step(0), new Step(1) ];

            let o = b.serialize();

            Comparer.expect(o).to.match({
                $exact: true,

                isPassed: true,
                passedLastTime: undefined,
                steps: [
                    { id: 0 }, { id: 1 }
                ]
            });
        });

        it("returns a serialized object for a branch that passed last time", () => {
            let b = new Branch();

            b.nonParallelId = 4;
            b.passedLastTime = true;
            b.steps = [ new Step(0), new Step(1) ];

            let o = b.serialize();

            Comparer.expect(o).to.match({
                $exact: true,

                isPassed: true,
                passedLastTime: undefined,
                steps: [
                    { id: 0 }, { id: 1 }
                ]
            });
        });
    });
});
