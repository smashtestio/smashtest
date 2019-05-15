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

    describe("isFunctionMatch()", () => {
        let functionDeclaration = new Step();
        let functionCall = new Step();

        functionDeclaration.isFunctionDeclaration = true;
        functionCall.isFunctionCall = true;

        it("matches a function call and function declaration with the same text", () => {
            functionDeclaration.text = "Step name here";
            functionCall.text = "Step name here";
            expect(functionCall.isFunctionMatch(functionDeclaration)).to.equal(true);
        });

        it("doesn't match a function call and function declaration with different text", () => {
            functionDeclaration.text = "Step name here";
            functionCall.text = "Different name here";
            expect(functionCall.isFunctionMatch(functionDeclaration)).to.equal(false);
        });

        it("matches a function call and function declaration with the same text but differing amounts of whitespace", () => {
            functionDeclaration.text = "Step name here";
            functionCall.text = "  Step  name here ";
            expect(functionCall.isFunctionMatch(functionDeclaration)).to.equal(true);
        });

        it("matches a function call and function declaration with a single quote", () => {
            functionDeclaration.text = "I don't know";
            functionCall.text = "I don't know";
            expect(functionCall.isFunctionMatch(functionDeclaration)).to.equal(true);
        });

        it("matches a function call and function declaration with an escaped single quote", () => {
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

        it("matches a function call and function declaration with multiple escaped single quotes", () => {
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

        it("matches a function call and function declaration with an escaped single quote preceded with a backslash", () => {
            functionDeclaration.text = "I don\\\\'t know";
            functionCall.text = "I don\\\\'t know";
            expect(functionCall.isFunctionMatch(functionDeclaration)).to.equal(true);
        });

        it("matches a function call and function declaration with a double quote", () => {
            functionDeclaration.text = "I don\"t know";
            functionCall.text = "I don\"t know";
            expect(functionCall.isFunctionMatch(functionDeclaration)).to.equal(true);
        });

        it("matches a function call and function declaration with an escaped double quote", () => {
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

        it("matches a function call and function declaration with multiple escaped double quotes", () => {
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

        it("matches a function call and function declaration with an escaped double quote preceded with a backslash", () => {
            functionDeclaration.text = "I don\\\\\"t know";
            functionCall.text = "I don\\\\\"t know";
            expect(functionCall.isFunctionMatch(functionDeclaration)).to.equal(true);
        });

        it("matches a function call and function declaration with multiple escaped brackets", () => {
            functionDeclaration.text = "I [do not know";
            functionCall.text = "I \\[do not know";
            expect(functionCall.isFunctionMatch(functionDeclaration)).to.equal(true);

            functionDeclaration.text = "I \\[do not know";
            functionCall.text = "I \\[do not know";
            expect(functionCall.isFunctionMatch(functionDeclaration)).to.equal(true);

            functionDeclaration.text = "I \\[do not know";
            functionCall.text = "I [do not know";
            expect(functionCall.isFunctionMatch(functionDeclaration)).to.equal(true);
        });

        it("matches a function call and function declaration with multiple escaped brackets", () => {
            functionDeclaration.text = "I [do not] know";
            functionCall.text = "I \\[do not\\] know";
            expect(functionCall.isFunctionMatch(functionDeclaration)).to.equal(true);

            functionDeclaration.text = "I \\[do not\\] know";
            functionCall.text = "I \\[do not\\] know";
            expect(functionCall.isFunctionMatch(functionDeclaration)).to.equal(true);
        });

        it("matches a function call and function declaration with an escaped bracket preceded with a backslash", () => {
            functionDeclaration.text = "I \\\\[do not know";
            functionCall.text = "I \\\\[do not know";
            expect(functionCall.isFunctionMatch(functionDeclaration)).to.equal(true);
        });

        it("matches a function call and function declaration if they match case insensitively", () => {
            functionDeclaration.text = "Step name here";
            functionCall.text = "step name here";
            functionCall.filename = "filename.txt";
            functionCall.lineNumber = 10;
            expect(functionCall.isFunctionMatch(functionDeclaration)).to.equal(true);
        });

        it("matches a function declaration with {{vars}} and a function call with {{vars}}, {vars}, 'strings', \"strings\", and [strings]", () => {
            functionDeclaration.text = "Step {{var1}} and {{var2}} {{var3}} also {{var4}}, {{var5}}";
            functionCall.text = "Step {{varA}} and  {varB} 'string C' also \"stringD\", [4th 'Login' button]";
            expect(functionCall.isFunctionMatch(functionDeclaration)).to.equal(true);
        });

        it("matches a function declaration with {{vars}} and a function call with {{vars}}, {vars}, 'strings', \"strings\", [strings], and escaped single and double quotes", () => {
            functionDeclaration.text = "Step {{var1}} a\\'nd {{var2}} {{var3}} \\'al\\\"so {{var4}}, {{var5}}";
            functionCall.text = "Step {{varA}} a\\'nd  {varB} 'string C' \\'al\\\"so \"stringD\", [4th 'Login' button]";
            expect(functionCall.isFunctionMatch(functionDeclaration)).to.equal(true);

            functionDeclaration.text = "Step {{var1}} a'nd {{var2}} {{var3}} al\"so {{var4}}, {{var5}}";
            functionCall.text = "Step {{varA}} a\\'nd  {varB} 'string C' al\\\"so \"stringD\", [4th 'Login' button]";
            expect(functionCall.isFunctionMatch(functionDeclaration)).to.equal(true);
        });

        it("doesn't match a function declaration with {{vars}} and a function call with extra text at the end", () => {
            functionDeclaration.text = "Step {{var1}}";
            functionCall.text = "Step 'one' two three";
            expect(functionCall.isFunctionMatch(functionDeclaration)).to.equal(false);
        });

        it("doesn't match a function declaration with {{vars}} and a function call with extra {vars} at the end", () => {
            functionDeclaration.text = "Step {{var1}}";
            functionCall.text = "Step {varA} {varB}";
            expect(functionCall.isFunctionMatch(functionDeclaration)).to.equal(false);
        });

        it("doesn't match a function declaration with {{vars}} and a function call with extra 'strings' at the end", () => {
            functionDeclaration.text = "Step {{var1}}";
            functionCall.text = "Step 'stringA' 'stringB'";
            expect(functionCall.isFunctionMatch(functionDeclaration)).to.equal(false);
        });

        it("doesn't match a function declaration with {{vars}} and a function call with extra [string] at the end", () => {
            functionDeclaration.text = "Step {{var1}}";
            functionCall.text = "Step {varA} ['element' finderB]";
            expect(functionCall.isFunctionMatch(functionDeclaration)).to.equal(false);
        });

        it("doesn't match a function declaration with a function call with extra text at the end", () => {
            functionDeclaration.text = "Step one two";
            functionCall.text = "Step   one  two   three  ";
            expect(functionCall.isFunctionMatch(functionDeclaration)).to.equal(false);
        });

        it("doesn't match a function declaration with extra text at the end with a function call", () => {
            functionDeclaration.text = "Step   one  two   three  ";
            functionCall.text = "Step one two";
            expect(functionCall.isFunctionMatch(functionDeclaration)).to.equal(false);
        });

        it("matches a function declaration that ends in * with a function call with extra text at the end", () => {
            functionDeclaration.text = "Step one two *";
            functionCall.text = "Step   one  two   three  ";
            expect(functionCall.isFunctionMatch(functionDeclaration)).to.equal(true);

            functionDeclaration.text = "Step one two   *  ";
            functionCall.text = "Step   one  two   three  ";
            expect(functionCall.isFunctionMatch(functionDeclaration)).to.equal(true);
        });

        it("doesn't match a function declaration that ends in * with extra text at the end with a function call", () => {
            functionDeclaration.text = "Step   one  two   three  * ";
            functionCall.text = "Step one two";
            expect(functionCall.isFunctionMatch(functionDeclaration)).to.equal(false);
        });

        it("matches a function declaration that ends in * and a function call with extra text at the end", () => {
            functionDeclaration.text = "Step {{var1}} *";
            functionCall.text = "Step 'one' two three";
            expect(functionCall.isFunctionMatch(functionDeclaration)).to.equal(true);
        });

        it("matches a function declaration that ends in * and a function call with extra {vars} at the end", () => {
            functionDeclaration.text = "Step {{var1}} * ";
            functionCall.text = "Step {varA} {varB}";
            expect(functionCall.isFunctionMatch(functionDeclaration)).to.equal(true);
        });

        it("matches a function declaration that ends in * and a function call with extra 'strings' at the end", () => {
            functionDeclaration.text = "Step {{var1}} * ";
            functionCall.text = "Step 'stringA' 'stringB'";
            expect(functionCall.isFunctionMatch(functionDeclaration)).to.equal(true);
        });

        it("matches a function declaration that ends in * and a function call with extra [string] at the end", () => {
            functionDeclaration.text = "Step {{var1}} *";
            functionCall.text = "Step {varA} ['element' finderB]";
            expect(functionCall.isFunctionMatch(functionDeclaration)).to.equal(true);
        });
    });

    describe("getFunctionCallText()", () => {
        it("returns function call text for a function call", () => {
            let step = new Step();
            step.isFunctionCall = true;
            step.text = "Function call";
            expect(step.getFunctionCallText()).to.equal("Function call");
        });

        it("returns function call text for a function call in form {var} = F", () => {
            let step = new Step();
            step.isFunctionCall = true;
            step.text = "{var} = Function call";
            expect(step.getFunctionCallText()).to.equal("Function call");
        });

        it("returns null for a non-function call", () => {
            let step = new Step();
            step.isFunctionCall = false;
            expect(step.getFunctionCallText()).to.equal(null);
        });
    });

    describe("mergeInFunctionDeclaration()", () => {
        it("merges in function declaration", () => {
            let functionCall = new Step();
            functionCall.isSkipBelow = true;

            let functionDeclarationInTree = new Step();
            functionDeclarationInTree.text = "T";
            functionDeclarationInTree.isSkip = true;
            functionDeclarationInTree.isSkipBelow = true;
            functionDeclarationInTree.isSkipBranch = true;
            functionDeclarationInTree.isCollapsed = true;

            functionCall.mergeInFunctionDeclaration(functionDeclarationInTree);

            expect(functionCall.isSkip).to.equal(true);
            expect(functionCall.isSkipBelow).to.equal(true);
            expect(functionCall.isSkipBranch).to.equal(true);
            expect(functionCall.isCollapsed).to.equal(true);
            expect(functionCall.isDebug).to.equal(undefined);
            expect(functionCall.isPackaged).to.equal(undefined);
            expect(functionCall.functionDeclarationText).to.equal("T");
        });

        it("merges in function declaration with all modifiers set to false", () => {
            let functionCall = new Step();

            let functionDeclarationInTree = new Step();
            functionDeclarationInTree.text = "T";
            functionDeclarationInTree.isSkip = true;
            functionDeclarationInTree.isSkipBelow = true;
            functionDeclarationInTree.isSkipBranch = true;
            functionDeclarationInTree.isDebug = true;
            functionDeclarationInTree.isOnly = true;
            functionDeclarationInTree.isNonParallel = true;
            functionDeclarationInTree.isSequential = true;
            functionDeclarationInTree.isPackaged = true;
            functionDeclarationInTree.isCollapsed = true;

            functionCall.mergeInFunctionDeclaration(functionDeclarationInTree);

            expect(functionCall.isSkip).to.equal(true);
            expect(functionCall.isSkipBelow).to.equal(true);
            expect(functionCall.isSkipBranch).to.equal(true);
            expect(functionCall.isDebug).to.equal(true);
            expect(functionCall.isOnly).to.equal(true);
            expect(functionCall.isNonParallel).to.equal(true);
            expect(functionCall.isSequential).to.equal(true);
            expect(functionCall.isPackaged).to.equal(true);
            expect(functionCall.isCollapsed).to.equal(true);
            expect(functionCall.functionDeclarationText).to.equal("T");
        });

        it("merges in function declaration with all modifiers missing", () => {
            let functionCall = new Step();
            let functionDeclarationInTree = new Step();

            functionCall.mergeInFunctionDeclaration(functionDeclarationInTree);

            expect(functionCall.isSkip).to.equal(undefined);
            expect(functionCall.isSkipBelow).to.equal(undefined);
            expect(functionCall.isSkipBranch).to.equal(undefined);
            expect(functionCall.isDebug).to.equal(undefined);
            expect(functionCall.isOnly).to.equal(undefined);
            expect(functionCall.isNonParallel).to.equal(undefined);
            expect(functionCall.isSequential).to.equal(undefined);
            expect(functionCall.isPackaged).to.equal(undefined);
            expect(functionCall.isCollapsed).to.equal(undefined);
            expect(functionCall.functionDeclarationText).to.equal(undefined);
        });

        it("merges in code block", () => {
            let functionCall = new Step();

            let functionDeclarationInTree = new Step();
            functionDeclarationInTree.codeBlock = 'code';

            functionCall.mergeInFunctionDeclaration(functionDeclarationInTree);

            expect(functionCall.codeBlock).to.equal('code');
        });
    });

    describe("cloneAsFunctionCall()", () => {
        it("clones a function declaration step into a function call step", () => {
            let functionDeclarationInTree = new Step();
            functionDeclarationInTree.isFunctionDeclaration = true;
            functionDeclarationInTree.text = "My function";
            functionDeclarationInTree.children = [ new Step() ];
            functionDeclarationInTree.children[0].text = "Child step";

            let clone = functionDeclarationInTree.cloneAsFunctionCall();

            expect(clone.isFunctionDeclaration).to.equal(false);
            expect(clone.isFunctionCall).to.equal(true);
            expect(clone.text).to.equal("My function");
            expect(clone.children).to.equal(undefined);
        });
    });
});
