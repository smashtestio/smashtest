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
            let stepNodes = [ new StepNode(1), new StepNode(2), new StepNode(3) ];
            let steps = [ new Step(1), new Step(2), new Step(3) ];

            stepNodes[0].text = "A";
            steps[0].level = 0;

            stepNodes[1].text = "B";
            steps[1].level = 1;

            stepNodes[2].text = "C";
            stepNodes[2].isPackaged = true;
            steps[2].level = 2;

            let branch = new Branch;
            branch.steps = steps;

            expect(branch.output((id) => stepNodes[id-1], "Foo")).to.equal(`Foo
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

        let f = (id) => stepNodes[id-1];

        beforeEach(() => {
            for(let i = 1; i <= 6; i++) {
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
            expect(branch1.equals(branch2, ()=>{})).to.equal(true);
            expect(branch1.equals(branch2, ()=>{}, 1)).to.equal(true);
        });

        it("finds two equal branches to be equal", () => {
            branch1.steps = steps.slice(0, 3);
            branch2.steps = steps.slice(3, 6);

            expect(branch1.equals(branch2, f)).to.equal(true);
            expect(branch1.equals(branch2, f, 3)).to.equal(true);
            expect(branch1.equals(branch2, f, 2)).to.equal(true);
            expect(branch1.equals(branch2, f, 1)).to.equal(true);
        });

        it("finds two differently-sized branches to be not equal", () => {
            branch1.steps = steps.slice(0, 3);
            branch2.steps = steps.slice(3, 5);

            expect(branch1.equals(branch2, f)).to.equal(false);
            expect(branch1.equals(branch2, f, 3)).to.equal(false);
            expect(branch1.equals(branch2, f, 4)).to.equal(false);
        });

        it("finds two differently-sized branches to be equal if the first N steps are the same", () => {
            branch1.steps = steps.slice(0, 3);
            branch2.steps = steps.slice(3, 5);

            expect(branch1.equals(branch2, f, 1)).to.equal(true);
            expect(branch1.equals(branch2, f, 2)).to.equal(true);
        });

        it("finds two branches with different steps to be not equal", () => {
            stepNodes[4].text = "K";
            branch1.steps = steps.slice(0, 3);
            branch2.steps = steps.slice(3, 6);

            expect(branch1.equals(branch2, f)).to.equal(false);
            expect(branch1.equals(branch2, f, 2)).to.equal(false);
        });

        it("finds two branches with different steps to be equal if the first N steps are the same", () => {
            stepNodes[4].text = "K";
            branch1.steps = steps.slice(0, 3);
            branch2.steps = steps.slice(3, 6);

            expect(branch1.equals(branch2, f, 1)).to.equal(true);
        });

        it("finds two branches with the same steps but different code blocks to not be equal", () => {
            stepNodes[1].codeBlock = 'foo';
            branch1.steps = steps.slice(0, 3);
            branch2.steps = steps.slice(3, 6);

            expect(branch1.equals(branch2, f)).to.equal(false);

            stepNodes[1].codeBlock = 'foo';
            stepNodes[4].codeBlock = 'bar';
            branch1.steps = steps.slice(0, 3);
            branch2.steps = steps.slice(3, 6);

            expect(branch1.equals(branch2, f)).to.equal(false);

            delete stepNodes[1].codeBlock;
            steps[1].functionDeclarationId = 6;
            delete stepNodes[4].codeBlock;
            steps[4].functionDeclarationId = 7;
            branch1.steps = steps.slice(0, 3);
            branch2.steps = steps.slice(3, 6);

            expect(branch1.equals(branch2, f)).to.equal(false);
        });

        it("finds two branches with the same steps and the same code blocks to be equal", () => {
            stepNodes[1].codeBlock = 'foo';
            stepNodes[4].codeBlock = 'foo';
            branch1.steps = steps.slice(0, 3);
            branch2.steps = steps.slice(3, 6);

            expect(branch1.equals(branch2, f)).to.equal(true);

            delete stepNodes[1].codeBlock;
            steps[1].functionDeclarationId = 6;
            delete stepNodes[4].codeBlock;
            steps[4].functionDeclarationId = 6;
            branch1.steps = steps.slice(0, 3);
            branch2.steps = steps.slice(3, 6);

            expect(branch1.equals(branch2, f)).to.equal(true);
        });
    });

    describe("updateHash()", () => {
        it("generates the hash for the branch", () => {
            let stepNodes = [ new StepNode(1), new StepNode(2), new StepNode(3) ];
            let steps = [ new Step(1), new Step(2), new Step(3) ];

            stepNodes[0].text = "A";
            stepNodes[1].text = "B";
            stepNodes[2].text = "C";

            let branch = new Branch();
            branch.steps = steps;

            branch.updateHash((id) => stepNodes[id-1]);
            expect(branch.hash).to.equal("40c53c58fdafacc83cfff6ee3d2f6d69");
        });
    });

    describe("finishOffBranch()", () => {
        it("marks a branch passed when all steps passed", () => {
            let stepNodes = [];
            let steps = [];
            let f = (id) => stepNodes[id-1];

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
            let f = (id) => stepNodes[id-1];

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

    describe("serializeObj", () => {
        it("returns a serialized object", () => {
            let b = new Branch();

            b.nonParallelId = 4;
            b.isPassed = true;
            b.steps = [ new Step(1), new Step(2) ];

            let o = b.serializeObj();

            Comparer.expect(o).to.match({
                $exact: true,

                isPassed: true,
                steps: [
                    { id: 1 }, { id: 2 }
                ]
            });
        });
    });
});
