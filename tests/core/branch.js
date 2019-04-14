const chai = require('chai');
const chaiSubset = require('chai-subset');
const chaiSubsetInOrder = require('chai-subset-in-order');
const expect = chai.expect;
const assert = chai.assert;
const util = require('util');
const utils = require('../../utils.js');
const Step = require('../../step.js');
const Branch = require('../../branch.js');

chai.use(chaiSubset);
chai.use(chaiSubsetInOrder);

describe("Branch", function() {
    describe("mergeToEnd()", function() {
        it("merges one branch to the end of another branch", function() {
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
            branch2.isOnly = true;

            branch1 = branch1.mergeToEnd(branch2);

            expect(branch1.steps.length).to.equal(3);
            expect(branch2.steps.length).to.equal(2);

            expect(branch1).to.containSubsetInOrder({
                steps: [
                    { text: "A" },
                    { text: "B" },
                    { text: "C" }
                ],
                nonParallelId: "ppppp",
                frequency: "high",
                groups: [ "1", "2", "3" ],
                isOnly: true,
                isDebug: true
            });
        });

        it("merges hook arrays", function() {
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

            branch1 = branch1.mergeToEnd(branch2);

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

            expect(branch1).to.containSubsetInOrder({
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

    describe("clone()", function() {
        it("clones an empty branch", function() {
            let branch = new Branch();
            let clonedBranch = branch.clone();

            expect(clonedBranch).to.containSubset({
                steps: [],
                nonParallelId: undefined,
                frequency: undefined,
                groups: undefined,
                isOnly: undefined,
                isDebug: undefined,
                passedLastTime: undefined,
                isPassed: undefined,
                isFailed: undefined,
                isSkipped: undefined,
                isRunning: undefined,
                beforeEveryBranch: undefined,
                afterEveryBranch: undefined,
                beforeEveryStep: undefined,
                afterEveryStep: undefined,
                error: undefined,
                log: undefined,
                elapsed: undefined,
                timeStarted: undefined,
                timeEnded: undefined
            });

            expect(branch.steps).to.have.lengthOf(0);
        });

        it("clones a branch with steps", function() {
            let stepA = new Step();
            stepA.text = "A";

            let stepB = new Step();
            stepB.text = "B";

            let branch = new Branch();
            branch.steps = [ stepA, stepB ];

            let clonedBranch = branch.clone();

            expect(clonedBranch).to.containSubset({
                steps: [
                    { text: "A" },
                    { text: "B" }
                ],
                nonParallelId: undefined,
                frequency: undefined,
                groups: undefined,
                isOnly: undefined,
                isDebug: undefined,
                passedLastTime: undefined,
                isPassed: undefined,
                isFailed: undefined,
                isSkipped: undefined,
                isRunning: undefined,
                beforeEveryBranch: undefined,
                afterEveryBranch: undefined,
                beforeEveryStep: undefined,
                afterEveryStep: undefined,
                error: undefined,
                log: undefined,
                elapsed: undefined,
                timeStarted: undefined,
                timeEnded: undefined
            });

            expect(clonedBranch.steps).to.have.lengthOf(2);

            expect(branch).to.containSubset({
                steps: [
                    { text: "A" },
                    { text: "B" }
                ],
                nonParallelId: undefined,
                frequency: undefined,
                groups: undefined,
                isOnly: undefined,
                isDebug: undefined,
                passedLastTime: undefined,
                isPassed: undefined,
                isFailed: undefined,
                isSkipped: undefined,
                isRunning: undefined,
                beforeEveryBranch: undefined,
                afterEveryBranch: undefined,
                beforeEveryStep: undefined,
                afterEveryStep: undefined,
                error: undefined,
                log: undefined,
                elapsed: undefined,
                timeStarted: undefined,
                timeEnded: undefined
            });

            expect(branch.steps).to.have.lengthOf(2);
        });

        it("clones a branch with all member vars set", function() {
            let stepA = new Step();
            stepA.text = "A";

            let stepB = new Step();
            stepB.text = "B";

            let stepD = new Step();
            stepD.text = "D";

            let stepE = new Step();
            stepE.text = "E";

            let stepF = new Step();
            stepF.text = "F";

            let stepG = new Step();
            stepG.text = "G";

            let afterBranch1 = new Branch();
            afterBranch1.steps = [ stepD, stepE ];

            let afterBranch2 = new Branch();
            afterBranch2.steps = [ stepF ];

            let afterBranch3 = new Branch();
            afterBranch3.steps = [ stepG ];

            let branch = new Branch();
            branch.steps = [ stepA, stepB ];
            branch.nonParallelId = "foobarId";
            branch.frequency = "high";
            branch.groups = ['big', 'small'];
            branch.isOnly = true;
            branch.isDebug = true;
            branch.passedLastTime = true;
            branch.isPassed = true;
            branch.isFailed = true;
            branch.isSkipped = true;
            branch.isRunning = true,
            branch.beforeEveryBranch = [ stepD ];
            branch.afterEveryBranch = [ stepD, stepE ];
            branch.beforeEveryStep = [ stepG ];
            branch.afterEveryStep = [ stepF, stepG ];
            branch.error = new Error("oops");
            branch.error.msg = "oops2";
            branch.log = [{text: 'one'}, {text: 'two'}];
            branch.elapsed = 45;
            branch.timeStarted = new Date();
            branch.timeEnded = new Date();

            let clonedBranch = branch.clone();

            expect(clonedBranch).to.containSubset({
                steps: [
                    { text: "A" },
                    { text: "B" }
                ],
                nonParallelId: "foobarId",
                frequency: "high",
                groups: [ "big", "small" ],
                isOnly: true,
                isDebug: true,
                passedLastTime: true,
                isPassed: true,
                isFailed: true,
                isSkipped: true,
                isRunning: true,
                beforeEveryBranch: [
                    { text: "D" }
                ],
                afterEveryBranch: [
                    { text: "D" },
                    { text: "E" }
                ],
                beforeEveryStep: [
                    { text: "G" }
                ],
                afterEveryStep: [
                    { text: "F" },
                    { text: "G" }
                ],
                error: {
                    msg: "oops2"
                },
                log: [
                    {text: 'one'},
                    {text: 'two'}
                ],
                elapsed: 45,
                timeStarted: {},
                timeEnded: {}
            });

            expect(clonedBranch.timeStarted instanceof Date).to.be.true;
            expect(clonedBranch.timeEnded instanceof Date).to.be.true;
            expect(clonedBranch.steps).to.have.lengthOf(2);

            expect(branch).to.containSubset({
                steps: [
                    { text: "A" },
                    { text: "B" }
                ],
                nonParallelId: "foobarId",
                frequency: "high",
                groups: [ "big", "small" ],
                isOnly: true,
                isDebug: true,
                passedLastTime: true,
                isPassed: true,
                isFailed: true,
                isSkipped: true,
                isRunning: true,
                beforeEveryBranch: [
                    { text: "D" }
                ],
                afterEveryBranch: [
                    { text: "D" },
                    { text: "E" }
                ],
                beforeEveryStep: [
                    { text: "G" }
                ],
                afterEveryStep: [
                    { text: "F" },
                    { text: "G" }
                ],
                error: {
                    msg: "oops2"
                },
                log: [
                    {text: 'one'},
                    {text: 'two'}
                ],
                elapsed: 45,
                timeStarted: {},
                timeEnded: {}
            });

            expect(branch.timeStarted instanceof Date).to.be.true;
            expect(branch.timeEnded instanceof Date).to.be.true;
            expect(branch.steps).to.have.lengthOf(2);
        });
    });

    describe("output()", function() {
        it("outputs the right text", function() {
            let stepA = new Step();
            stepA.text = "A";
            stepA.branchIndents = 0;

            let stepB = new Step();
            stepB.text = "B";
            stepB.branchIndents = 1;

            let stepC = new Step();
            stepC.text = "C";
            stepC.branchIndents = 2;
            stepC.isPackaged = true;

            let branch = new Branch;
            branch.steps = [ stepA, stepB, stepC ];

            expect(branch.output("Foo")).to.equal(`Foo
    A
        B
            C
`);
        });
    });

    describe("equals()", function() {
        it("finds two empty branches to be equal", function() {
            let branch1 = new Branch();
            let branch2 = new Branch();

            expect(branch1.equals(branch2)).to.equal(true);
            expect(branch1.equals(branch2, 1)).to.equal(true);
        });

        it("finds two equal branches to be equal", function() {
            let stepA1 = new Step();
            stepA1.text = 'A';
            stepA1.identifiers = [ '-' ];

            let stepB1 = new Step();
            stepB1.text = 'B';
            stepB1.identifiers = [ '+' ];

            let stepC1 = new Step();
            stepC1.text = 'C';
            stepC1.identifiers = [];

            let stepA2 = new Step();
            stepA2.text = 'A';
            stepA2.identifiers = [ '-' ];

            let stepB2 = new Step();
            stepB2.text = 'B';
            stepB2.identifiers = [ '$', '+' ];

            let stepC2 = new Step();
            stepC2.text = 'C';
            stepC2.identifiers = [];

            let branch1 = new Branch();
            branch1.steps = [ stepA1, stepB1, stepC1 ];

            let branch2 = new Branch();
            branch2.steps = [ stepA2, stepB2, stepC2 ];

            expect(branch1.equals(branch2)).to.equal(true);
            expect(branch1.equals(branch2, 3)).to.equal(true);
            expect(branch1.equals(branch2, 2)).to.equal(true);
            expect(branch1.equals(branch2, 1)).to.equal(true);
        });

        it("finds two differently-sized branches to be not equal", function() {
            let stepA1 = new Step();
            stepA1.text = 'A';
            stepA1.identifiers = [ '-' ];

            let stepB1 = new Step();
            stepB1.text = 'B';
            stepB1.identifiers = [ '+' ];

            let stepC1 = new Step();
            stepC1.text = 'C';
            stepC1.identifiers = [];

            let stepA2 = new Step();
            stepA2.text = 'A';
            stepA2.identifiers = [ '-' ];

            let stepB2 = new Step();
            stepB2.text = 'B';
            stepB2.identifiers = [ '$', '+' ];

            let branch1 = new Branch();
            branch1.steps = [ stepA1, stepB1, stepC1 ];

            let branch2 = new Branch();
            branch2.steps = [ stepA2, stepB2 ];

            expect(branch1.equals(branch2)).to.equal(false);
            expect(branch1.equals(branch2, 3)).to.equal(false);
            expect(branch1.equals(branch2, 4)).to.equal(false);
        });

        it("finds two differently-sized branches to be equal if the first N steps are the same", function() {
            let stepA1 = new Step();
            stepA1.text = 'A';
            stepA1.identifiers = [ '-' ];

            let stepB1 = new Step();
            stepB1.text = 'B';
            stepB1.identifiers = [ '+' ];

            let stepC1 = new Step();
            stepC1.text = 'C';
            stepC1.identifiers = [];

            let stepA2 = new Step();
            stepA2.text = 'A';
            stepA2.identifiers = [ '-' ];

            let stepB2 = new Step();
            stepB2.text = 'B';
            stepB2.identifiers = [ '$', '+' ];

            let branch1 = new Branch();
            branch1.steps = [ stepA1, stepB1, stepC1 ];

            let branch2 = new Branch();
            branch2.steps = [ stepA2, stepB2 ];

            expect(branch1.equals(branch2, 1)).to.equal(true);
            expect(branch1.equals(branch2, 2)).to.equal(true);
        });

        it("finds two branches with different steps to be not equal", function() {
            let stepA1 = new Step();
            stepA1.text = 'A';
            stepA1.identifiers = [ '-' ];

            let stepB1 = new Step();
            stepB1.text = 'B';
            stepB1.identifiers = [ '+' ];

            let stepC1 = new Step();
            stepC1.text = 'C';
            stepC1.identifiers = [];

            let stepA2 = new Step();
            stepA2.text = 'A';
            stepA2.identifiers = [ '-' ];

            let stepK2 = new Step();
            stepK2.text = 'K';
            stepK2.identifiers = [ '$', '+' ];

            let stepC2 = new Step();
            stepC2.text = 'C';
            stepC2.identifiers = [];

            let branch1 = new Branch();
            branch1.steps = [ stepA1, stepB1, stepC1 ];

            let branch2 = new Branch();
            branch2.steps = [ stepA2, stepK2, stepC2 ];

            expect(branch1.equals(branch2)).to.equal(false);
            expect(branch1.equals(branch2, 2)).to.equal(false);
        });

        it("finds two branches with different steps to be equal if the first N steps are the same", function() {
            let stepA1 = new Step();
            stepA1.text = 'A';
            stepA1.identifiers = [ '-' ];

            let stepB1 = new Step();
            stepB1.text = 'B';
            stepB1.identifiers = [ '+' ];

            let stepC1 = new Step();
            stepC1.text = 'C';
            stepC1.identifiers = [];

            let stepA2 = new Step();
            stepA2.text = 'A';
            stepA2.identifiers = [ '-' ];

            let stepK2 = new Step();
            stepK2.text = 'K';
            stepK2.identifiers = [ '$', '+' ];

            let stepC2 = new Step();
            stepC2.text = 'C';
            stepC2.identifiers = [];

            let branch1 = new Branch();
            branch1.steps = [ stepA1, stepB1, stepC1 ];

            let branch2 = new Branch();
            branch2.steps = [ stepA2, stepK2, stepC2 ];

            expect(branch1.equals(branch2, 1)).to.equal(true);
        });

        it("finds two branches with the same steps but different code blocks to not be equal", function() {
            let stepA1 = new Step();
            stepA1.text = 'A';
            stepA1.codeBlock = "foo";

            let stepB1 = new Step();
            stepB1.text = 'A';

            let branch1 = new Branch();
            branch1.steps = [ stepA1 ];

            let branch2 = new Branch();
            branch2.steps = [ stepB1 ];

            expect(branch1.equals(branch2)).to.equal(false);

            stepA1 = new Step();
            stepA1.text = 'A';
            stepA1.codeBlock = "foo";

            stepB1 = new Step();
            stepB1.text = 'A';
            stepB1.codeBlock = "bar";

            branch1 = new Branch();
            branch1.steps = [ stepA1 ];

            branch2 = new Branch();
            branch2.steps = [ stepB1 ];

            expect(branch1.equals(branch2)).to.equal(false);
        });

        it("finds two branches with the same steps and the same code blocks to be equal", function() {
            let stepA1 = new Step();
            stepA1.text = 'A';
            stepA1.codeBlock = "foo";

            let stepB1 = new Step();
            stepB1.text = 'A';
            stepB1.codeBlock = "foo";

            let branch1 = new Branch();
            branch1.steps = [ stepA1 ];

            let branch2 = new Branch();
            branch2.steps = [ stepB1 ];

            expect(branch1.equals(branch2)).to.equal(true);
        });
    });

    describe("getHash()", function() {
        it("generates the hash for the branch", function() {
            let stepA = new Step();
            stepA.text = "A";

            let stepB = new Step();
            stepB.text = "B";

            let stepC = new Step();
            stepC.text = "C";

            let stepD = new Step();
            stepD.text = "D";

            let branch = new Branch();

            branch.steps = [ stepA, stepB, stepC, stepD ];

            expect(branch.getHash()).to.equal("47ece2e49e5c0333677fc34e044d8257");
        });
    });

    describe("finishOffBranch()", function() {
        it("marks a branch passed when all steps passed as expected", function() {
            let stepA = new Step();
            stepA.text = "A";
            stepA.isPassed = true;
            stepA.asExpected = true;

            let stepB = new Step();
            stepB.text = "B";
            stepB.isPassed = true;
            stepB.asExpected = true;

            let stepC = new Step();
            stepC.text = "C";
            stepC.isPassed = true;
            stepC.asExpected = true;

            let stepD = new Step();
            stepD.text = "D";
            stepD.isPassed = true;
            stepD.asExpected = true;

            let branch = new Branch();

            branch.steps = [ stepA, stepB, stepC, stepD ];

            branch.finishOffBranch();

            expect(branch).to.containSubsetInOrder({
                isPassed: true,
                isFailed: undefined
            });
        });

        it("marks a branch passed when all steps passed or failed as expected", function() {
            let stepA = new Step();
            stepA.text = "A";
            stepA.isPassed = true;
            stepA.asExpected = true;

            let stepB = new Step();
            stepB.text = "B";
            stepB.isPassed = true;
            stepB.asExpected = true;

            let stepC = new Step();
            stepC.text = "C";
            stepC.isFailed = true;
            stepC.asExpected = true;

            let stepD = new Step();
            stepD.text = "D";
            stepD.isPassed = true;
            stepD.asExpected = true;

            let branch = new Branch();

            branch.steps = [ stepA, stepB, stepC, stepD ];

            branch.finishOffBranch();

            expect(branch).to.containSubsetInOrder({
                isPassed: true,
                isFailed: undefined
            });
        });

        it("marks a branch failed when one of the steps failed not as expected", function() {
            let stepA = new Step();
            stepA.text = "A";
            stepA.isPassed = true;
            stepA.asExpected = true;

            let stepB = new Step();
            stepB.text = "B";
            stepB.isFailed = true;
            stepB.asExpected = false;

            let stepC = new Step();
            stepC.text = "C";
            stepC.isPassed = true;
            stepC.asExpected = true;

            let stepD = new Step();
            stepD.text = "D";
            stepD.isPassed = true;
            stepD.asExpected = true;

            let branch = new Branch();

            branch.steps = [ stepA, stepB, stepC, stepD ];

            branch.finishOffBranch();

            expect(branch).to.containSubsetInOrder({
                isPassed: undefined,
                isFailed: true
            });
        });

        it("marks a branch failed when one of the steps passed not as expected", function() {
            let stepA = new Step();
            stepA.text = "A";
            stepA.isPassed = true;
            stepA.asExpected = true;

            let stepB = new Step();
            stepB.text = "B";
            stepB.isPassed = true;
            stepB.asExpected = false;

            let stepC = new Step();
            stepC.text = "C";
            stepC.isPassed = true;
            stepC.asExpected = true;

            let stepD = new Step();
            stepD.text = "D";
            stepD.isPassed = true;
            stepD.asExpected = true;

            let branch = new Branch();

            branch.steps = [ stepA, stepB, stepC, stepD ];

            branch.finishOffBranch();

            expect(branch).to.containSubsetInOrder({
                isPassed: undefined,
                isFailed: true
            });
        });
    });
});
