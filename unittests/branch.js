const chai = require('chai');
const chaiSubset = require('chai-subset');
const expect = chai.expect;
const assert = chai.assert;
const util = require('util');
const utils = require('../utils.js');
const Step = require('../step.js');
const Branch = require('../branch.js');

chai.use(chaiSubset);

describe("Branch", function() {
    describe("mergeToEnd()", function() {
        it("merges one branch to the end of another branch", function() {
            var stepA = new Step();
            stepA.text = "A";

            var stepB = new Step();
            stepB.text = "B";

            var stepC = new Step();
            stepC.text = "C";

            var branch1 = new Branch;
            branch1.steps = [ stepA ];

            var branch2 = new Branch;
            branch2.steps = [ stepB, stepC ];

            branch1.mergeToEnd(branch2);

            expect(branch1.steps.length).to.equal(3);
            expect(branch2.steps.length).to.equal(2);

            expect(branch1).to.containSubsetInOrder({
                steps: [
                    { text: "A" },
                    { text: "B" },
                    { text: "C" }
                ]
            });
        });

        it("merges afterBranches", function() {
            var stepA = new Step();
            stepA.text = "A";

            var stepB = new Step();
            stepB.text = "B";

            var stepC = new Step();
            stepC.text = "C";

            var stepD = new Step();
            stepD.text = "D";

            var stepE = new Step();
            stepE.text = "E";

            var stepF = new Step();
            stepF.text = "F";

            var stepG = new Step();
            stepG.text = "G";

            var branch1 = new Branch;
            branch1.steps = [ stepA ];

            var branch2 = new Branch;
            branch2.steps = [ stepB, stepC ];

            var branch3 = new Branch;
            branch3.steps = [ stepD, stepE ];

            var branch4 = new Branch;
            branch4.steps = [ stepF ];

            var branch5 = new Branch;
            branch5.steps = [ stepG ];

            branch1.afterBranches = [ branch3 ];
            branch2.afterBranches = [ branch4, branch5 ];
            branch1.mergeToEnd(branch2);

            expect(branch1.steps.length).to.equal(3);
            expect(branch2.steps.length).to.equal(2);

            expect(branch1.afterBranches.length).to.equal(3);
            expect(branch2.afterBranches.length).to.equal(2);

            expect(branch1.afterBranches[0].steps.length).to.equal(1);
            expect(branch1.afterBranches[1].steps.length).to.equal(1);
            expect(branch1.afterBranches[2].steps.length).to.equal(2);

            expect(branch1).to.containSubsetInOrder({
                steps: [
                    { text: "A" },
                    { text: "B" },
                    { text: "C" }
                ],
                afterBranches: [
                    {
                        steps: [
                            { text: "F" }
                        ]
                    },
                    {
                        steps: [
                            { text: "G" }
                        ]
                    },
                    {
                        steps: [
                            { text: "D" },
                            { text: "E" }
                        ]
                    }
                ]
            });
        });
    });

    describe("clone()", function() {
        it("clones an empty branch", function() {
            var branch = new Branch();
            var clonedBranch = branch.clone();

            expect(clonedBranch).to.containSubset({
                steps: [],
                prevSequentialBranch: undefined,
                afterBranches: undefined,
                frequency: undefined
            });

            expect(branch.steps).to.have.lengthOf(0);
        });

        it("clones a branch with steps", function() {
            var stepA = new Step();
            stepA.text = "A";

            var stepB = new Step();
            stepB.text = "B";

            var branch = new Branch();
            branch.steps = [ stepA, stepB ];

            var clonedBranch = branch.clone();

            expect(clonedBranch).to.containSubset({
                steps: [
                    { text: "A" },
                    { text: "B" }
                ],
                prevSequentialBranch: undefined,
                afterBranches: undefined,
                frequency: undefined
            });

            expect(clonedBranch.steps).to.have.lengthOf(2);

            expect(branch).to.containSubset({
                steps: [
                    { text: "A" },
                    { text: "B" }
                ],
                prevSequentialBranch: undefined,
                afterBranches: undefined,
                frequency: undefined
            });

            expect(branch.steps).to.have.lengthOf(2);
        });

        it("clones a branch with all member vars set", function() {
            var stepA = new Step();
            stepA.text = "A";

            var stepB = new Step();
            stepB.text = "B";

            var stepD = new Step();
            stepD.text = "D";

            var stepE = new Step();
            stepE.text = "E";

            var stepF = new Step();
            stepF.text = "F";

            var afterBranch1 = new Branch();
            afterBranch1.steps = [ stepD, stepE ];

            var afterBranch2 = new Branch();
            afterBranch2.steps = [ stepF ];

            var branch = new Branch();
            branch.steps = [ stepA, stepB ];
            branch.nonParallelId = "foobarId";
            branch.afterBranches = [ afterBranch1, afterBranch2 ];
            branch.frequency = "high";

            var clonedBranch = branch.clone();

            expect(clonedBranch).to.containSubset({
                steps: [
                    { text: "A" },
                    { text: "B" }
                ],
                nonParallelId: "foobarId",
                afterBranches: [
                    {
                        steps: [
                            { text: "D" },
                            { text: "E" }
                        ]
                    },
                    {
                        steps: [
                            { text: "F" }
                        ]
                    }
                ],
                frequency: "high"
            });

            expect(clonedBranch.steps).to.have.lengthOf(2);

            expect(branch).to.containSubset({
                steps: [
                    { text: "A" },
                    { text: "B" }
                ],
                nonParallelId: "foobarId",
                afterBranches: [
                    {
                        steps: [
                            { text: "D" },
                            { text: "E" }
                        ]
                    },
                    {
                        steps: [
                            { text: "F" }
                        ]
                    }
                ],
                frequency: "high"
            });

            expect(branch.steps).to.have.lengthOf(2);
        });
    });

    describe("output()", function() {
        it("outputs the right text", function() {
            var stepA = new Step();
            stepA.text = "A";
            stepA.branchIndents = 0;

            var stepB = new Step();
            stepB.text = "B";
            stepB.branchIndents = 1;

            var stepC = new Step();
            stepC.text = "C";
            stepC.branchIndents = 2;

            var branch = new Branch;
            branch.steps = [ stepA, stepB, stepC ];

            expect(branch.output("Foo")).to.equal(`Foo ..
    A
        B
            C
`);
        });
    });
});
