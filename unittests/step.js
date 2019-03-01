const chai = require('chai');
const chaiSubset = require('chai-subset');
const expect = chai.expect;
const assert = chai.assert;
const util = require('util');
const Step = require('../step.js');
const StepBlock = require('../stepblock.js');

chai.use(chaiSubset);

describe("Step", function() {
    var root = null;

    beforeEach(function() {
        /*
        A
            B

            C
                D

        E
        F
        */

        root = new Step();

        var A = new Step();
        A.text = "A";
        A.varsList = ["A1", "A2"];

        var B = new Step();
        B.text = "B";
        B.varsList = ["B1", "B2"];

        var C = new Step();
        C.text = "C";
        C.varsList = ["C1", "C2"];

        var D = new Step();
        D.text = "D";
        D.varsList = ["D1", "D2"];

        var E = new Step();
        E.text = "E";
        E.varsList = ["E1", "E2"];
        E.parent = null;
        E.children = [];

        var F = new Step();
        F.text = "F";
        F.varsList = ["F1", "F2"];
        F.parent = null;
        F.children = [];

        var EF = new StepBlock();
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

    describe("cloneForBranch()", function() {
        it("can properly clone, chlidren are removed from the clone, and the original and cloned objects are distinct", function() {
            var C = root.children[0].children[1];
            var clonedC = C.cloneForBranch();

            clonedC.cloneMark = true;
            C.originalMark = true;

            expect(clonedC).to.containSubset({
                text: 'C',
                varsList: [ 'C1', 'C2' ],
                cloneMark: true,
                originalMark: undefined,
                parent: null,
                children: undefined,
                originalStep: {
                    originalMark: true,
                    cloneMark: undefined
                }
            });

            expect(C).to.containSubset({
                text: 'C',
                varsList: [ 'C1', 'C2' ],
                cloneMark: undefined,
                originalMark: true,
                parent: { text: 'A' },
                children: [
                    {
                        text: 'D',
                        varsList: [ 'D1', 'D2' ],
                        cloneMark: undefined,
                        originalMark: undefined,
                        parent: {
                            cloneMark: undefined,
                            originalMark: true,
                            originalStep: undefined
                        },
                        children: []
                    }
                ],
                originalStep: undefined
            });
        });
    });

    describe("getLeaves()", function() {
        it("returns all leaves", function() {
            var leaves = root.getLeaves();
            root.rootMark = true;

            expect(leaves).to.containSubset([
                {
                    text: 'B',
                    varsList: [ 'B1', 'B2' ],
                    parent: { text: 'A' },
                    children: []
                },
                {
                    text: 'D',
                    varsList: [ 'D1', 'D2' ],
                    parent: { text: 'C' },
                    children: []
                },
                {
                    steps: [
                        {
                            text: 'E',
                            varsList: [ 'E1', 'E2' ],
                            parent: null,
                            children: []
                        },
                        {
                            text: 'F',
                            varsList: [ 'F1', 'F2' ],
                            parent: null,
                            children: []
                        }
                    ],
                    parent: { rootMark: true },
                    children: []
                }
            ]);
        });

        it("returns an array with itself when called on a leaf", function() {
            var D = root.children[0].children[1].children[0];
            var leaves = D.getLeaves();

            expect(leaves).to.containSubset([
                {
                    text: 'D',
                    varsList: [ 'D1', 'D2' ],
                    parent: { text: 'C' },
                    children: []
                }
            ]);

            expect(leaves).to.have.length(1);
        });
    });

    describe("isFunctionMatch()", function() {
        var functionDeclaration = new Step();
        var functionCall = new Step();

        functionDeclaration.isFunctionDeclaration = true;
        functionCall.isFunctionCall = true;

        it("matches a function call and function declaration with the same text", function() {
            functionDeclaration.text = "Step name here";
            functionCall.text = "Step name here";
            expect(functionCall.isFunctionMatch(functionDeclaration)).to.equal(true);
        });

        it("doesn't match a function call and function declaration with different text", function() {
            functionDeclaration.text = "Step name here";
            functionCall.text = "Different name here";
            expect(functionCall.isFunctionMatch(functionDeclaration)).to.equal(false);
        });

        it("matches a function call and function declaration with the same text but differing amounts of whitespace", function() {
            functionDeclaration.text = "Step name here";
            functionCall.text = "  Step  name here ";
            expect(functionCall.isFunctionMatch(functionDeclaration)).to.equal(true);
        });

        it("throws an exception if a function call and function declaration match case insensitively but not case sensitively", function() {
            functionDeclaration.text = "Step name here";
            functionCall.text = "step name here";
            assert.throws(() => {
                functionCall.isFunctionMatch(functionDeclaration);
            });
        });

        it("matches a function declaration with {{vars}} and a function call with {{vars}}, {vars}, 'strings', \"strings\", and [ElementFinders]", function() {
            functionDeclaration.text = "Step {{var1}} and {{var2}} {{var3}} also {{var4}}, {{var5}}";
            functionCall.text = "Step {{varA}} and  {varB} 'string C' also \"stringD\", [4th 'Login' button]";
            expect(functionCall.isFunctionMatch(functionDeclaration)).to.equal(true);
        });

        it("doesn't match a function declaration with {{vars}} and a function call with extra {vars} at the end", function() {
            functionDeclaration.text = "Step {{var1}}";
            functionCall.text = "Step {varA} {varB}";
            expect(functionCall.isFunctionMatch(functionDeclaration)).to.equal(false);
        });

        it("doesn't match a function declaration with {{vars}} and a function call with extra 'strings' at the end", function() {
            functionDeclaration.text = "Step {{var1}}";
            functionCall.text = "Step 'stringA' 'stringB'";
            expect(functionCall.isFunctionMatch(functionDeclaration)).to.equal(false);
        });

        it("doesn't match a function declaration with {{vars}} and a function call with extra [ElementFinders] at the end", function() {
            functionDeclaration.text = "Step {{var1}}";
            functionCall.text = "Step {varA} ['element' finderB]";
            expect(functionCall.isFunctionMatch(functionDeclaration)).to.equal(false);
        });
    });
});
