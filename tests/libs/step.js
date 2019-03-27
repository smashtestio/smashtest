const chai = require('chai');
const chaiSubset = require('chai-subset');
const expect = chai.expect;
const assert = chai.assert;
const util = require('util');
const Step = require('../../step.js');
const StepBlock = require('../../stepblock.js');

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

        C's afterBranches:
            K
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
        C.functionDeclarationInTree = new Step();
        C.functionDeclarationInTree.text = "C-orig";

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

        it("can properly clone with no refernces to outside objects", function() {
            var C = root.children[0].children[1];
            var clonedC = C.cloneForBranch(true);

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

        it("can properly clone a step within a step block", function() {
            var E = root.children[1].steps[0];
            var clonedE = E.cloneForBranch();

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

        it("can properly double-clone a step", function() {
            var C = root.children[0].children[1];
            var clonedC1 = C.cloneForBranch();
            var clonedC2 = clonedC1.cloneForBranch();

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

        it("matches a function call and function declaration with a single quote", function() {
            functionDeclaration.text = "I don't know";
            functionCall.text = "I don't know";
            expect(functionCall.isFunctionMatch(functionDeclaration)).to.equal(true);
        });

        it("matches a function call and function declaration with an escaped single quote", function() {
            functionDeclaration.text = "I don\\'t know";
            functionCall.text = "I don\\'t know";
            expect(functionCall.isFunctionMatch(functionDeclaration)).to.equal(true);

            functionDeclaration.text = "I don't know";
            functionCall.text = "I don\\'t know";
            expect(functionCall.isFunctionMatch(functionDeclaration)).to.equal(true);

            functionDeclaration.text = "I don\\'t know";
            functionCall.text = "I don't know";
            expect(functionCall.isFunctionMatch(functionDeclaration)).to.equal(true);
        });

        it("matches a function call and function declaration with multiple escaped single quotes", function() {
            functionDeclaration.text = "I don\\'t k\\'now";
            functionCall.text = "I don\\'t k\\'now";
            expect(functionCall.isFunctionMatch(functionDeclaration)).to.equal(true);

            functionDeclaration.text = "I don't k'now";
            functionCall.text = "I don\\'t k'now";
            expect(functionCall.isFunctionMatch(functionDeclaration)).to.equal(true);

            functionDeclaration.text = "I don\\'t k\\'now";
            functionCall.text = "I don't k\\'now";
            expect(functionCall.isFunctionMatch(functionDeclaration)).to.equal(true);
        });

        it("matches a function call and function declaration with an escaped single quote preceded with a backslash", function() {
            functionDeclaration.text = "I don\\\\'t know";
            functionCall.text = "I don\\\\'t know";
            expect(functionCall.isFunctionMatch(functionDeclaration)).to.equal(true);

            functionDeclaration.text = "I don\\\\'t know";
            functionCall.text = "I don\\\'t know";
            expect(functionCall.isFunctionMatch(functionDeclaration)).to.equal(true);
        });

        it("matches a function call and function declaration with a double quote", function() {
            functionDeclaration.text = "I don\"t know";
            functionCall.text = "I don\"t know";
            expect(functionCall.isFunctionMatch(functionDeclaration)).to.equal(true);
        });

        it("matches a function call and function declaration with an escaped double quote", function() {
            functionDeclaration.text = "I don\\\"t know";
            functionCall.text = "I don\\\"t know";
            expect(functionCall.isFunctionMatch(functionDeclaration)).to.equal(true);

            functionDeclaration.text = "I don\"t know";
            functionCall.text = "I don\\\"t know";
            expect(functionCall.isFunctionMatch(functionDeclaration)).to.equal(true);

            functionDeclaration.text = "I don\\\"t know";
            functionCall.text = "I don\"t know";
            expect(functionCall.isFunctionMatch(functionDeclaration)).to.equal(true);
        });

        it("matches a function call and function declaration with multiple escaped double quotes", function() {
            functionDeclaration.text = "I don\\\"t k\\\"now";
            functionCall.text = "I don\\\"t k\\\"now";
            expect(functionCall.isFunctionMatch(functionDeclaration)).to.equal(true);

            functionDeclaration.text = "I don\\\"t k\"now";
            functionCall.text = "I don\"t k\\\"now";
            expect(functionCall.isFunctionMatch(functionDeclaration)).to.equal(true);

            functionDeclaration.text = "I don\\\"t k\\\"now";
            functionCall.text = "I don\"t k\\\"now";
            expect(functionCall.isFunctionMatch(functionDeclaration)).to.equal(true);
        });

        it("matches a function call and function declaration with an escaped double quote preceded with a backslash", function() {
            functionDeclaration.text = "I don\\\\\"t know";
            functionCall.text = "I don\\\\\"t know";
            expect(functionCall.isFunctionMatch(functionDeclaration)).to.equal(true);
        });

        it("matches a function call and function declaration if they match case insensitively", function() {
            functionDeclaration.text = "Step name here";
            functionCall.text = "step name here";
            functionCall.filename = "filename.txt";
            functionCall.lineNumber = 10;
            expect(functionCall.isFunctionMatch(functionDeclaration)).to.equal(true);
        });

        it("matches a function declaration with {{vars}} and a function call with {{vars}}, {vars}, 'strings', \"strings\", and [strings]", function() {
            functionDeclaration.text = "Step {{var1}} and {{var2}} {{var3}} also {{var4}}, {{var5}}";
            functionCall.text = "Step {{varA}} and  {varB} 'string C' also \"stringD\", [4th 'Login' button]";
            expect(functionCall.isFunctionMatch(functionDeclaration)).to.equal(true);
        });

        it("matches a function declaration with {{vars}} and a function call with {{vars}}, {vars}, 'strings', \"strings\", and [strings], both of which have single and double quotes", function() {
            functionDeclaration.text = "Step {{var1}} a\\'nd {{var2}} {{var3}} al\\\"so {{var4}}, {{var5}}";
            functionCall.text = "Step {{varA}} a\\'nd  {varB} 'string C' al\\\"so \"stringD\", [4th 'Login' button]";
            expect(functionCall.isFunctionMatch(functionDeclaration)).to.equal(true);

            functionDeclaration.text = "Step {{var1}} a'nd {{var2}} {{var3}} al\"so {{var4}}, {{var5}}";
            functionCall.text = "Step {{varA}} a\\'nd  {varB} 'string C' al\\\"so \"stringD\", [4th 'Login' button]";
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

        it("doesn't match a function declaration with {{vars}} and a function call with extra [string] at the end", function() {
            functionDeclaration.text = "Step {{var1}}";
            functionCall.text = "Step {varA} ['element' finderB]";
            expect(functionCall.isFunctionMatch(functionDeclaration)).to.equal(false);
        });
    });

    describe("getFunctionCallText()", function() {
        it("returns function call text for a function call", function() {
            var step = new Step();
            step.isFunctionCall = true;
            step.text = "Function call";
            expect(step.getFunctionCallText()).to.equal("Function call");
        });

        it("returns function call text for a function call in form {var} = F", function() {
            var step = new Step();
            step.isFunctionCall = true;
            step.text = "{var} = Function call";
            step.varsBeingSet = [ {name: "var", value: "Function call", isLocal: false} ];
            expect(step.getFunctionCallText()).to.equal("Function call");
        });

        it("returns null for a non-function call", function() {
            var step = new Step();
            step.isFunctionCall = false;
            expect(step.getFunctionCallText()).to.equal(null);
        });
    });

    describe("mergeInFunctionDeclaration()", function() {
        it("merges in function declaration", function() {
            var step = new Step();
            step.isToDo = true;

            var functionDeclarationInTree = new Step();
            functionDeclarationInTree.text = "T";
            functionDeclarationInTree.isToDo = true;
            functionDeclarationInTree.isManual = true;

            step.mergeInFunctionDeclaration(functionDeclarationInTree);

            expect(step.isToDo).to.equal(true);
            expect(step.isManual).to.equal(true);
            expect(step.isDebug).to.equal(undefined);
            expect(step.isBuiltIn).to.equal(undefined);
            expect(step.functionDeclarationText).to.equal("T");
        });

        it("merges in function declaration with all identifiers set to false", function() {
            var step = new Step();

            var functionDeclarationInTree = new Step();
            functionDeclarationInTree.text = "T";
            functionDeclarationInTree.isToDo = true;
            functionDeclarationInTree.isManual = true;
            functionDeclarationInTree.isDebug = true;
            functionDeclarationInTree.isOnly = true;
            functionDeclarationInTree.isNonParallel = true;
            functionDeclarationInTree.isSequential = true;
            functionDeclarationInTree.isExpectedFail = true;
            functionDeclarationInTree.isBuiltIn = true;

            step.mergeInFunctionDeclaration(functionDeclarationInTree);

            expect(step.isToDo).to.equal(true);
            expect(step.isManual).to.equal(true);
            expect(step.isDebug).to.equal(true);
            expect(step.isOnly).to.equal(true);
            expect(step.isNonParallel).to.equal(true);
            expect(step.isSequential).to.equal(true);
            expect(step.isExpectedFail).to.equal(true);
            expect(step.isBuiltIn).to.equal(true);
            expect(step.functionDeclarationText).to.equal("T");
        });

        it("merges in function declaration with all identifiers missing", function() {
            var step = new Step();

            var functionDeclarationInTree = new Step();

            step.mergeInFunctionDeclaration(functionDeclarationInTree);

            expect(step.isToDo).to.equal(undefined);
            expect(step.isManual).to.equal(undefined);
            expect(step.isDebug).to.equal(undefined);
            expect(step.isOnly).to.equal(undefined);
            expect(step.isNonParallel).to.equal(undefined);
            expect(step.isSequential).to.equal(undefined);
            expect(step.isExpectedFail).to.equal(undefined);
            expect(step.isBuiltIn).to.equal(undefined);
            expect(step.functionDeclarationText).to.equal(undefined);
        });

        it("merges in code block", function() {
            var step = new Step();

            var functionDeclarationInTree = new Step();
            functionDeclarationInTree.codeBlock = 'code';

            step.mergeInFunctionDeclaration(functionDeclarationInTree);

            expect(step.codeBlock).to.equal('code');
        });
    });

    describe("cloneAsFunctionCall()", function() {
        it("clones a function declaration step into a function call step", function() {
            var functionDeclarationInTree = new Step();
            functionDeclarationInTree.isFunctionDeclaration = true;
            functionDeclarationInTree.text = "My function";
            functionDeclarationInTree.children = [ new Step() ];
            functionDeclarationInTree.children[0].text = "Child step";

            var clone = functionDeclarationInTree.cloneAsFunctionCall();

            expect(clone.isFunctionDeclaration).to.equal(false);
            expect(clone.isFunctionCall).to.equal(true);
            expect(clone.text).to.equal("My function");
            expect(clone.children).to.equal(undefined);
        });
    });
});
