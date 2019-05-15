const chai = require('chai');
const chaiSubset = require('chai-subset');
const expect = chai.expect;
const assert = chai.assert;
const util = require('util');
const Step = require('../../step.js');
const StepBlock = require('../../stepblock.js');

chai.use(chaiSubset);

describe("Step", () => {
    let root = null;

    beforeEach(() => {
        /*
        A
            B

            C
                D

        E
        F

        C's afterBranches:
            K
        */

        root = new Step();

        let A = new Step();
        A.text = "A";
        A.varsList = ["A1", "A2"];

        let B = new Step();
        B.text = "B";
        B.varsList = ["B1", "B2"];

        let C = new Step();
        C.text = "C";
        C.varsList = ["C1", "C2"];
        C.functionDeclarationInTree = new Step();
        C.functionDeclarationInTree.text = "C-orig";

        let D = new Step();
        D.text = "D";
        D.varsList = ["D1", "D2"];

        let E = new Step();
        E.text = "E";
        E.varsList = ["E1", "E2"];
        E.parent = null;
        E.children = [];

        let F = new Step();
        F.text = "F";
        F.varsList = ["F1", "F2"];
        F.parent = null;
        F.children = [];

        let EF = new StepBlock();
        EF.parent = root;
        EF.children = [];
        EF.steps = [ E, F ];
        E.containingStepBlock = EF;
        F.containingStepBlock = EF;

        D.parent = C;
        D.children = [];

        C.parent = A;
        C.children = [ D ];

        B.parent = A;
        B.children = [];

        A.parent = root;
        A.children = [ B, C ];

        root.parent = null;
        root.children = [ A, EF ];
    });

    describe("cloneForBranch()", () => {
        it("can properly clone, chlidren are removed from the clone, and the original and cloned objects are distinct", () => {
            let C = root.children[0].children[1];
            let clonedC = C.cloneForBranch();

            clonedC.cloneMark = true;
            C.originalMark = true;

            expect(C).to.containSubset({
                text: 'C',
                varsList: [ 'C1', 'C2' ],
                cloneMark: undefined,
                originalMark: true,
                containingStepBlock: undefined,
                functionDeclarationInTree: { text: "C-orig" },
                parent: { text: 'A' },
                children: [
                    {
                        text: 'D',
                        varsList: [ 'D1', 'D2' ],
                        cloneMark: undefined,
                        originalMark: undefined,
                        functionDeclarationInTree: undefined,
                        parent: {
                            cloneMark: undefined,
                            originalMark: true,
                            originalStepInTree: undefined
                        },
                        children: []
                    }
                ],
                originalStepInTree: undefined
            });

            expect(clonedC).to.containSubset({
                text: 'C',
                varsList: [ 'C1', 'C2' ],
                cloneMark: true,
                originalMark: undefined,
                containingStepBlock: undefined,
                functionDeclarationInTree: undefined,
                parent: undefined,
                children: undefined,
                originalStepInTree: {
                    text: 'C',
                    originalMark: true,
                    cloneMark: undefined,
                    functionDeclarationInTree: { text: "C-orig" }
                }
            });
        });

        it("can properly clone with no references to outside objects", () => {
            let C = root.children[0].children[1];
            let clonedC = C.cloneForBranch(true);

            clonedC.cloneMark = true;
            C.originalMark = true;

            expect(C).to.containSubset({
                text: 'C',
                varsList: [ 'C1', 'C2' ],
                cloneMark: undefined,
                originalMark: true,
                containingStepBlock: undefined,
                functionDeclarationInTree: { text: "C-orig" },
                parent: { text: 'A' },
                children: [
                    {
                        text: 'D',
                        varsList: [ 'D1', 'D2' ],
                        cloneMark: undefined,
                        originalMark: undefined,
                        functionDeclarationInTree: undefined,
                        parent: {
                            cloneMark: undefined,
                            originalMark: true,
                            originalStepInTree: undefined
                        },
                        children: []
                    }
                ],
                originalStepInTree: undefined
            });

            expect(clonedC).to.containSubset({
                text: 'C',
                varsList: [ 'C1', 'C2' ],
                cloneMark: true,
                originalMark: undefined,
                containingStepBlock: undefined,
                functionDeclarationInTree: undefined,
                parent: undefined,
                children: undefined,
                originalStepInTree: undefined
            });
        });

        it("can properly clone a step within a step block", () => {
            let E = root.children[1].steps[0];
            let clonedE = E.cloneForBranch();

            clonedE.cloneMark = true;
            E.originalMark = true;

            expect(E).to.containSubset({
                text: 'E',
                varsList: [ 'E1', 'E2' ],
                cloneMark: undefined,
                originalMark: true,
                functionDeclarationInTree: undefined,
                containingStepBlock: { parent: { parent: null } },
                parent: null,
                children: [],
                originalStepInTree: undefined
            });

            expect(clonedE).to.containSubset({
                text: 'E',
                varsList: [ 'E1', 'E2' ],
                cloneMark: true,
                originalMark: undefined,
                containingStepBlock: undefined,
                parent: undefined,
                children: undefined,
                originalStepInTree: {
                    text: 'E',
                    originalMark: true,
                    cloneMark: undefined
                }
            });
        });

        it("can properly double-clone a step", () => {
            let C = root.children[0].children[1];
            let clonedC1 = C.cloneForBranch();
            let clonedC2 = clonedC1.cloneForBranch();

            clonedC2.cloneMark = true;
            C.originalMark = true;

            expect(C).to.containSubset({
                text: 'C',
                varsList: [ 'C1', 'C2' ],
                cloneMark: undefined,
                originalMark: true,
                functionDeclarationInTree: { text: "C-orig" },
                containingStepBlock: undefined,
                parent: { text: 'A' },
                children: [
                    {
                        text: 'D',
                        varsList: [ 'D1', 'D2' ],
                        cloneMark: undefined,
                        originalMark: undefined,
                        functionDeclarationInTree: undefined,
                        containingStepBlock: undefined,
                        parent: {
                            cloneMark: undefined,
                            originalMark: true,
                            originalStepInTree: undefined
                        },
                        children: []
                    }
                ],
                originalStepInTree: undefined
            });

            expect(clonedC1).to.containSubset({
                text: 'C',
                varsList: [ 'C1', 'C2' ],
                cloneMark: undefined,
                originalMark: undefined,
                functionDeclarationInTree: undefined,
                containingStepBlock: undefined,
                parent: undefined,
                children: undefined,
                originalStepInTree: {
                    text: 'C',
                    originalMark: true,
                    cloneMark: undefined,
                    functionDeclarationInTree: { text: "C-orig" },
                }
            });

            expect(clonedC2).to.containSubset({
                text: 'C',
                varsList: [ 'C1', 'C2' ],
                cloneMark: true,
                originalMark: undefined,
                functionDeclarationInTree: undefined,
                containingStepBlock: undefined,
                parent: undefined,
                children: undefined,
                originalStepInTree: {
                    text: 'C',
                    originalMark: true,
                    cloneMark: undefined,
                    functionDeclarationInTree: { text: "C-orig" }
                }
            });
        });
    });
});
