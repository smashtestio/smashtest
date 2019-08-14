const chai = require('chai');
const expect = chai.expect;
const assert = chai.assert;
const utils = require('../../src/utils.js');
const Tree = require('../../src/tree.js');
const Branch = require('../../src/branch.js');
const Step = require('../../src/step.js');
const StepNode = require('../../src/stepnode.js');
const Comparer = require('../../packages/js/comparer.js');

function mergeStepNodesInTree(tree) {
    mergeStepNodesInBranches(tree, tree.branches);
    tree.beforeEverything && mergeStepNodes(tree, tree.beforeEverything);
    tree.afterEverything && mergeStepNodes(tree, tree.afterEverything);
}

function mergeStepNodesInBranches(tree, branches) {
    branches.forEach(branch => {
        mergeStepNodes(tree, branch.steps);
        branch.beforeEveryBranch && mergeStepNodes(tree, branch.beforeEveryBranch);
        branch.afterEveryBranch && mergeStepNodes(tree, branch.afterEveryBranch);
        branch.beforeEveryStep && mergeStepNodes(tree, branch.beforeEveryStep);
        branch.afterEveryStep && mergeStepNodes(tree, branch.afterEveryStep);
    });
}

function mergeStepNodes(tree, steps) {
    for(let i = 0; i < steps.length; i++) {
        let stepNode = tree.stepNodeIndex[steps[i].id];
        steps[i] = Object.assign(steps[i], stepNode);
        if(steps[i].fid) {
            steps[i].codeBlock = tree.stepNodeIndex[steps[i].fid].codeBlock;
        }
    }
}

describe("Tree", () => {
    describe("newStepNode()", () => {
        it("creates a new step node", () => {
            let tree = new Tree();
            let stepNode = tree.newStepNode();
            expect(stepNode.id).to.equal(1);
            expect(tree.stepNodeIndex[1] === stepNode).to.be.true;

            stepNode = tree.newStepNode();
            expect(stepNode.id).to.equal(2);
            expect(tree.stepNodeIndex[2] === stepNode).to.be.true;
        });
    });

    describe("getModifier()", () => {
        let tree = null;
        let sn1 = null;
        let sn2 = null;

        let s1 = null;
        let s2 = null;

        beforeEach(() => {
            tree = new Tree();
            sn1 = tree.newStepNode();
            sn2 = tree.newStepNode();

            s1 = new Step(1);
            s2 = new Step(2);

            s1.fid = 2;
        });

        it("gets a modifier not set on a step node or its function declaration", () => {
            expect(tree.getModifier(s1, 'isDebug')).to.be.false;
        });

        it("gets a modifier only set on a step node", () => {
            sn1.isDebug = true;
            expect(tree.getModifier(s1, 'isDebug')).to.be.true;
        });

        it("gets a modifier only set on a function declaration", () => {
            sn2.isDebug = true;
            expect(tree.getModifier(s1, 'isDebug')).to.be.true;
        });

        it("gets a modifier set on both a step node or its function declaration", () => {
            sn1.isDebug = true;
            sn2.isDebug = true;
            expect(tree.getModifier(s1, 'isDebug')).to.be.true;
        });
    });

    describe("getCodeBlock()", () => {
        let tree = null;
        let sn1 = null;
        let sn2 = null;

        let s1 = null;
        let s2 = null;

        beforeEach(() => {
            tree = new Tree();
            sn1 = tree.newStepNode();
            sn2 = tree.newStepNode();

            s1 = new Step(1);
            s2 = new Step(2);

            s1.fid = 2;
        });

        it("gets a code block set on a step node", () => {
            sn1.codeBlock = 'foobar';
            expect(tree.getCodeBlock(s1)).to.equal('foobar');
        });

        it("gets a code block set on a function declaration", () => {
            sn2.codeBlock = 'foobar';
            expect(tree.getCodeBlock(s1)).to.equal('foobar');
        });

        it("returns an empty string if no code blocks were found", () => {
            expect(tree.getCodeBlock(s1)).to.equal('');
        });
    });

    describe("parseIn()", () => {
        context("generic tests", () => {
            it("parses empty input", () => {
                let tree = new Tree();
                tree.parseIn(``, "file.txt");

                Comparer.expect(tree).to.match({
                    root: {
                        indents: -1,
                        parent: null,
                        children: []
                    }
                });
            });

            it("parses all-whitespace input", () => {
                let tree = new Tree();
                tree.parseIn(`
                    `, "file.txt");

                Comparer.expect(tree).to.match({
                    root: {
                        indents: -1,
                        parent: null,
                        children: []
                    }
                });
            });

            it("parses a normal tree", () => {
                let tree = new Tree();
                tree.parseIn(
`A
    B
        C
    D

    E
        F
G

H
    I
        J
            K
L`
                , "file.txt");

                Comparer.expect(tree).to.match({
                    root: {
                        indents: -1,
                        parent: null,
                        children: [
                            {
                                text: 'A',
                                lineNumber: 1,
                                indents: 0,
                                parent: { indents: -1 },
                                children: [
                                    {
                                        text: 'B',
                                        lineNumber: 2,
                                        indents: 1,
                                        parent: { text: 'A' },
                                        children: [
                                            {
                                                text: 'C',
                                                lineNumber: 3,
                                                indents: 2,
                                                parent: { text: 'B' },
                                                children: []
                                            }
                                        ]
                                    },
                                    {
                                        text: 'D',
                                        lineNumber: 4,
                                        indents: 1,
                                        parent: { text: 'A' },
                                        children: []
                                    },
                                    {
                                        text: 'E',
                                        lineNumber: 6,
                                        indents: 1,
                                        parent: { text: 'A' },
                                        children: [
                                            {
                                                text: 'F',
                                                lineNumber: 7,
                                                indents: 2,
                                                parent: { text: 'E' },
                                                children: []
                                            }
                                        ]
                                    }
                                ]
                            },
                            {
                                text: 'G',
                                lineNumber: 8,
                                indents: 0,
                                parent: { indents: -1 },
                                children: []
                            },
                            {
                                text: 'H',
                                lineNumber: 10,
                                indents: 0,
                                parent: { indents: -1 },
                                children: [
                                    {
                                        text: 'I',
                                        lineNumber: 11,
                                        indents: 1,
                                        parent: { text: 'H' },
                                        children: [
                                            {
                                                text: 'J',
                                                lineNumber: 12,
                                                indents: 2,
                                                parent: { text: 'I' },
                                                children: [
                                                    {
                                                        text: 'K',
                                                        lineNumber: 13,
                                                        indents: 3,
                                                        parent: { text: 'J' },
                                                        children: []
                                                    }
                                                ]
                                            }
                                        ]
                                    }
                                ]
                            },
                            {
                                text: 'L',
                                lineNumber: 14,
                                indents: 0,
                                parent: { indents: -1 },
                                children: []
                            }
                        ]
                    }
                });
            });

            it("parses a normal tree with one or more empty lines in the middle", () => {
                let tree = new Tree();
                tree.parseIn(
`

A
    B

        C
    D

    E
        F

G

H
    I


        J
            K
L
`
                , "file.txt");

                Comparer.expect(tree).to.match({
                    root: {
                        indents: -1,
                        parent: null,
                        children: [
                            {
                                text: 'A',
                                lineNumber: 3,
                                indents: 0,
                                parent: { indents: -1 },
                                children: [
                                    {
                                        text: 'B',
                                        lineNumber: 4,
                                        indents: 1,
                                        parent: { text: 'A' },
                                        children: [
                                            {
                                                text: 'C',
                                                lineNumber: 6,
                                                indents: 2,
                                                parent: { text: 'B' },
                                                children: []
                                            }
                                        ]
                                    },
                                    {
                                        text: 'D',
                                        lineNumber: 7,
                                        indents: 1,
                                        parent: { text: 'A' },
                                        children: []
                                    },
                                    {
                                        text: 'E',
                                        lineNumber: 9,
                                        indents: 1,
                                        parent: { text: 'A' },
                                        children: [
                                            {
                                                text: 'F',
                                                lineNumber: 10,
                                                indents: 2,
                                                parent: { text: 'E' },
                                                children: []
                                            }
                                        ]
                                    }
                                ]
                            },
                            {
                                text: 'G',
                                lineNumber: 12,
                                indents: 0,
                                parent: { indents: -1 },
                                children: []
                            },
                            {
                                text: 'H',
                                lineNumber: 14,
                                indents: 0,
                                parent: { indents: -1 },
                                children: [
                                    {
                                        text: 'I',
                                        lineNumber: 15,
                                        indents: 1,
                                        parent: { text: 'H' },
                                        children: [
                                            {
                                                text: 'J',
                                                lineNumber: 18,
                                                indents: 2,
                                                parent: { text: 'I' },
                                                children: [
                                                    {
                                                        text: 'K',
                                                        lineNumber: 19,
                                                        indents: 3,
                                                        parent: { text: 'J' },
                                                        children: []
                                                    }
                                                ]
                                            }
                                        ]
                                    }
                                ]
                            },
                            {
                                text: 'L',
                                lineNumber: 20,
                                indents: 0,
                                parent: { indents: -1 },
                                children: []
                            }
                        ]
                    }
                });
            });

            it("handles multiple parses into the same tree", () => {
                let tree = new Tree();

                tree.parseIn(
`

A
    B

        C
    D

    E
        F
`
                , "file1.txt");

                tree.parseIn(
`G

H
    I


        J
            K
`
                , "file2.txt");

                tree.parseIn(
`L`
                , "file3.txt");

                Comparer.expect(tree).to.match({
                    root: {
                        indents: -1,
                        parent: null,
                        children: [
                            {
                                text: 'A',
                                lineNumber: 3,
                                filename: 'file1.txt',
                                indents: 0,
                                parent: { indents: -1 },
                                children: [
                                    {
                                        text: 'B',
                                        lineNumber: 4,
                                        filename: 'file1.txt',
                                        indents: 1,
                                        parent: { text: 'A' },
                                        children: [
                                            {
                                                text: 'C',
                                                lineNumber: 6,
                                                filename: 'file1.txt',
                                                indents: 2,
                                                parent: { text: 'B' },
                                                children: []
                                            }
                                        ]
                                    },
                                    {
                                        text: 'D',
                                        lineNumber: 7,
                                        filename: 'file1.txt',
                                        indents: 1,
                                        parent: { text: 'A' },
                                        children: []
                                    },
                                    {
                                        text: 'E',
                                        lineNumber: 9,
                                        filename: 'file1.txt',
                                        indents: 1,
                                        parent: { text: 'A' },
                                        children: [
                                            {
                                                text: 'F',
                                                lineNumber: 10,
                                                filename: 'file1.txt',
                                                indents: 2,
                                                parent: { text: 'E' },
                                                children: []
                                            }
                                        ]
                                    }
                                ]
                            },
                            {
                                text: 'G',
                                lineNumber: 1,
                                filename: 'file2.txt',
                                indents: 0,
                                parent: { indents: -1 },
                                children: []
                            },
                            {
                                text: 'H',
                                lineNumber: 3,
                                filename: 'file2.txt',
                                indents: 0,
                                parent: { indents: -1 },
                                children: [
                                    {
                                        text: 'I',
                                        lineNumber: 4,
                                        filename: 'file2.txt',
                                        indents: 1,
                                        parent: { text: 'H' },
                                        children: [
                                            {
                                                text: 'J',
                                                lineNumber: 7,
                                                filename: 'file2.txt',
                                                indents: 2,
                                                parent: { text: 'I' },
                                                children: [
                                                    {
                                                        text: 'K',
                                                        lineNumber: 8,
                                                        filename: 'file2.txt',
                                                        indents: 3,
                                                        parent: { text: 'J' },
                                                        children: []
                                                    }
                                                ]
                                            }
                                        ]
                                    }
                                ]
                            },
                            {
                                text: 'L',
                                lineNumber: 1,
                                indents: 0,
                                filename: 'file3.txt',
                                parent: { indents: -1 },
                                children: []
                            }
                        ]
                    }
                });
            });

            it("ignores lines that are fully comments", () => {
                let tree = new Tree();
                tree.parseIn(
`A
// comment
    B
        C
        // D
        E
// comment
    F
        ..
        // G
        H
        I

        // ..
        J
        // K
`
                , "file.txt");

                Comparer.expect(tree).to.match({
                    root: {
                        indents: -1,
                        parent: null,
                        children: [
                            {
                                text: 'A',
                                lineNumber: 1,
                                indents: 0,
                                parent: { indents: -1 },
                                children: [
                                    {
                                        text: 'B',
                                        lineNumber: 3,
                                        indents: 1,
                                        parent: { text: 'A' },
                                        children: [
                                            {
                                                steps: [
                                                    {
                                                        text: 'C',
                                                        lineNumber: 4,
                                                        indents: 2,
                                                        parent: null,
                                                        children: []
                                                    },
                                                    {
                                                        text: 'E',
                                                        lineNumber: 6,
                                                        indents: 2,
                                                        parent: null,
                                                        children: []
                                                    }
                                                ],
                                                isSequential: undefined,
                                                parent: { text: 'B' }
                                            }
                                        ]
                                    },
                                    {
                                        text: 'F',
                                        lineNumber: 8,
                                        indents: 1,
                                        parent: { text: 'A' },
                                        children: [
                                            {
                                                steps: [
                                                    {
                                                        text: 'H',
                                                        lineNumber: 11,
                                                        indents: 2,
                                                        parent: null,
                                                        children: []
                                                    },
                                                    {
                                                        text: 'I',
                                                        lineNumber: 12,
                                                        indents: 2,
                                                        parent: null,
                                                        children: []
                                                    }
                                                ],
                                                isSequential: true,
                                                parent: { text: 'F' }
                                            },
                                            {
                                                text: 'J',
                                                lineNumber: 15,
                                                indents: 2,
                                                parent: { text: 'F' },
                                                children: []
                                            }
                                        ]
                                    }
                                ]
                            }
                        ]
                    }
                });
            });

            it("sets isPackaged", () => {
                let tree = new Tree();

                tree.parseIn(
`A
    B`
                , "file1.txt");

                tree.parseIn(
`C
    D`
                , "file2.txt", true);

                Comparer.expect(tree).to.match({
                    root: {
                        indents: -1,
                        parent: null,
                        children: [
                            {
                                text: 'A',
                                isPackaged: undefined,
                                lineNumber: 1,
                                filename: 'file1.txt',
                                indents: 0,
                                parent: { indents: -1 },
                                children: [
                                    {
                                        text: 'B',
                                        isPackaged: undefined,
                                        lineNumber: 2,
                                        filename: 'file1.txt',
                                        indents: 1,
                                        parent: { text: 'A' },
                                        children: []
                                    }
                                ]
                            },
                            {
                                text: 'C',
                                isPackaged: true,
                                lineNumber: 1,
                                filename: 'file2.txt',
                                indents: 0,
                                parent: { indents: -1 },
                                children: [
                                    {
                                        text: 'D',
                                        isPackaged: true,
                                        lineNumber: 2,
                                        filename: 'file2.txt',
                                        indents: 1,
                                        parent: { text: 'C' },
                                        children: []
                                    }
                                ]
                            }
                        ]
                    }
                });
            });

            it("rejects a first step that is not at indent 0", () => {
                let tree = new Tree();
                assert.throws(() => {
                    tree.parseIn(
`    A
`
                    , "file.txt");
                }, "The first step must have 0 indents [file.txt:1]");

                assert.throws(() => {
                    tree.parseIn(
`
    A
`
                    , "file.txt");
                }, "The first step must have 0 indents [file.txt:2]");
            });

            it("rejects a step that is 2 or more indents ahead of the step above", () => {
                let tree = new Tree();
                assert.throws(() => {
                    tree.parseIn(
`A
        B
`
                    , "file.txt");
                }, "You cannot have a step that has 2 or more indents beyond the previous step [file.txt:2]");
            });
        });

        context("step blocks", () => {
            it("parses a step block at the very top", () => {
                let tree = new Tree();
                tree.parseIn(
`A
B
C

    D
`
                , "file.txt");

                Comparer.expect(tree).to.match({
                    root: {
                        indents: -1,
                        parent: null,
                        children: [
                            {
                                lineNumber: 1,
                                indents: 0,
                                steps: [
                                    {
                                        text: 'A',
                                        lineNumber: 1,
                                        indents: 0,
                                        parent: null,
                                        children: [],
                                        containingStepBlock: { indents: 0, steps: { $typeof: 'array' } }
                                    },
                                    {
                                        text: 'B',
                                        lineNumber: 2,
                                        indents: 0,
                                        parent: null,
                                        children: [],
                                        containingStepBlock: { indents: 0, steps: { $typeof: 'array' } }
                                    },
                                    {
                                        text: 'C',
                                        lineNumber: 3,
                                        indents: 0,
                                        parent: null,
                                        children: [],
                                        containingStepBlock: { indents: 0, steps: { $typeof: 'array' } }
                                    }
                                ],
                                parent: { indents: -1 },
                                children: [
                                    {
                                        text: 'D',
                                        lineNumber: 5,
                                        indents: 1,
                                        parent: { indents: 0, steps: { $typeof: 'array' } },
                                        children: []
                                    }
                                ]
                            }
                        ]
                    }
                });
            });

            it("parses a step block at the very top, with empty lines above and below", () => {
                let tree = new Tree();
                tree.parseIn(
`
A
B
C

    D
`
                , "file.txt");

                Comparer.expect(tree).to.match({
                    root: {
                        indents: -1,
                        parent: null,
                        children: [
                            {
                                lineNumber: 2,
                                indents: 0,
                                steps: [
                                    {
                                        text: 'A',
                                        lineNumber: 2,
                                        indents: 0,
                                        parent: null,
                                        children: [],
                                        containingStepBlock: { indents: 0, steps: { $typeof: 'array' } }
                                    },
                                    {
                                        text: 'B',
                                        lineNumber: 3,
                                        indents: 0,
                                        parent: null,
                                        children: [],
                                        containingStepBlock: { indents: 0, steps: { $typeof: 'array' } }
                                    },
                                    {
                                        text: 'C',
                                        lineNumber: 4,
                                        indents: 0,
                                        parent: null,
                                        children: [],
                                        containingStepBlock: { indents: 0, steps: { $typeof: 'array' } }
                                    }
                                ],
                                parent: { indents: -1 },
                                children: [
                                    {
                                        text: 'D',
                                        lineNumber: 6,
                                        indents: 1,
                                        parent: { indents: 0, steps: { $typeof: 'array' } },
                                        children: []
                                    }
                                ]
                            }
                        ]
                    }
                });
            });

            it("parses a step block in the middle, with empty lines above and below", () => {
                let tree = new Tree();
                tree.parseIn(
`A

    B
    C
    D

        E
`
                , "file.txt");

                Comparer.expect(tree).to.match({
                    root: {
                        indents: -1,
                        parent: null,
                        children: [
                            {
                                text: 'A',
                                lineNumber: 1,
                                indents: 0,
                                parent: { indents: -1 },
                                children: [
                                    {
                                        lineNumber: 3,
                                        indents: 1,
                                        steps: [
                                            {
                                                text: 'B',
                                                lineNumber: 3,
                                                indents: 1,
                                                parent: null,
                                                children: [],
                                                containingStepBlock: { indents: 1, steps: { $typeof: 'array' } }
                                            },
                                            {
                                                text: 'C',
                                                lineNumber: 4,
                                                indents: 1,
                                                parent: null,
                                                children: [],
                                                containingStepBlock: { indents: 1, steps: { $typeof: 'array' } }
                                            },
                                            {
                                                text: 'D',
                                                lineNumber: 5,
                                                indents: 1,
                                                parent: null,
                                                children: [],
                                                containingStepBlock: { indents: 1, steps: { $typeof: 'array' } }
                                            }
                                        ],
                                        parent: { indents: 0 },
                                        children: [
                                            {
                                                text: 'E',
                                                lineNumber: 7,
                                                indents: 2,
                                                parent: { indents: 1, steps: { $typeof: 'array' } },
                                                children: []
                                            }
                                        ]
                                    }
                                ]
                            }
                        ]
                    }
                });
            });

            it("parses a step block in the middle, with only an empty line below", () => {
                let tree = new Tree();
                tree.parseIn(
`A
    B
    C
    D

        E
`
                , "file.txt");

                Comparer.expect(tree).to.match({
                    root: {
                        indents: -1,
                        parent: null,
                        children: [
                            {
                                text: 'A',
                                lineNumber: 1,
                                indents: 0,
                                parent: { indents: -1 },
                                children: [
                                    {
                                        lineNumber: 2,
                                        indents: 1,
                                        steps: [
                                            {
                                                text: 'B',
                                                lineNumber: 2,
                                                indents: 1,
                                                parent: null,
                                                children: [],
                                                containingStepBlock: { indents: 1, steps: { $typeof: 'array' } }
                                            },
                                            {
                                                text: 'C',
                                                lineNumber: 3,
                                                indents: 1,
                                                parent: null,
                                                children: [],
                                                containingStepBlock: { indents: 1, steps: { $typeof: 'array' } }
                                            },
                                            {
                                                text: 'D',
                                                lineNumber: 4,
                                                indents: 1,
                                                parent: null,
                                                children: [],
                                                containingStepBlock: { indents: 1, steps: { $typeof: 'array' } }
                                            }
                                        ],
                                        parent: { indents: 0 },
                                        children: [
                                            {
                                                text: 'E',
                                                lineNumber: 6,
                                                indents: 2,
                                                parent: { indents: 1, steps: { $typeof: 'array' } },
                                                children: []
                                            }
                                        ]
                                    }
                                ]
                            }
                        ]
                    }
                });
            });

            it("parses a step block at the very bottom", () => {
                let tree = new Tree();
                tree.parseIn(
`A

    B
    C
    D`
                , "file.txt");

                Comparer.expect(tree).to.match({
                    root: {
                        indents: -1,
                        parent: null,
                        children: [
                            {
                                text: 'A',
                                lineNumber: 1,
                                indents: 0,
                                parent: { indents: -1 },
                                children: [
                                    {
                                        lineNumber: 3,
                                        indents: 1,
                                        steps: [
                                            {
                                                text: 'B',
                                                lineNumber: 3,
                                                indents: 1,
                                                parent: null,
                                                children: [],
                                                containingStepBlock: { indents: 1, steps: { $typeof: 'array' } }
                                            },
                                            {
                                                text: 'C',
                                                lineNumber: 4,
                                                indents: 1,
                                                parent: null,
                                                children: [],
                                                containingStepBlock: { indents: 1, steps: { $typeof: 'array' } }
                                            },
                                            {
                                                text: 'D',
                                                lineNumber: 5,
                                                indents: 1,
                                                parent: null,
                                                children: [],
                                                containingStepBlock: { indents: 1, steps: { $typeof: 'array' } }
                                            }
                                        ],
                                        parent: { indents: 0 },
                                        children: []
                                    }
                                ]
                            }
                        ]
                    }
                });
            });

            it("parses a step block at the bottom, with an empty line below", () => {
                let tree = new Tree();
                tree.parseIn(
`A

    B
    C
    D
`
                , "file.txt");

                Comparer.expect(tree).to.match({
                    root: {
                        indents: -1,
                        parent: null,
                        children: [
                            {
                                text: 'A',
                                lineNumber: 1,
                                indents: 0,
                                parent: { indents: -1 },
                                children: [
                                    {
                                        lineNumber: 3,
                                        indents: 1,
                                        steps: [
                                            {
                                                text: 'B',
                                                lineNumber: 3,
                                                indents: 1,
                                                parent: null,
                                                children: [],
                                                containingStepBlock: { indents: 1, steps: { $typeof: 'array' } }
                                            },
                                            {
                                                text: 'C',
                                                lineNumber: 4,
                                                indents: 1,
                                                parent: null,
                                                children: [],
                                                containingStepBlock: { indents: 1, steps: { $typeof: 'array' } }
                                            },
                                            {
                                                text: 'D',
                                                lineNumber: 5,
                                                indents: 1,
                                                parent: null,
                                                children: [],
                                                containingStepBlock: { indents: 1, steps: { $typeof: 'array' } }
                                            }
                                        ],
                                        parent: { indents: 0 },
                                        children: []
                                    }
                                ]
                            }
                        ]
                    }
                });
            });

            it("parses a step block with an indented line directly above", () => {
                let tree = new Tree();
                tree.parseIn(
`A
    B
C
D`
                , "file.txt");

                Comparer.expect(tree).to.match({
                    root: {
                        indents: -1,
                        parent: null,
                        children: [
                            {
                                text: 'A',
                                lineNumber: 1,
                                indents: 0,
                                parent: { indents: -1 },
                                children: [
                                    {
                                        text: 'B',
                                        lineNumber: 2,
                                        indents: 1,
                                        parent: { indents: 0 },
                                        children: []
                                    }
                                ]
                            },
                            {
                                lineNumber: 3,
                                indents: 0,
                                steps: [
                                    {
                                        text: 'C',
                                        lineNumber: 3,
                                        indents: 0,
                                        parent: null,
                                        children: [],
                                        containingStepBlock: { indents: 0, steps: { $typeof: 'array' } }
                                    },
                                    {
                                        text: 'D',
                                        lineNumber: 4,
                                        indents: 0,
                                        parent: null,
                                        children: [],
                                        containingStepBlock: { indents: 0, steps: { $typeof: 'array' } }
                                    }
                                ],
                                parent: { indents: -1 },
                                children: []
                            }
                        ]
                    }
                });
            });

            it("parses a step block with an indented line above", () => {
                let tree = new Tree();
                tree.parseIn(
`A
    B

C
D`
                , "file.txt");

                Comparer.expect(tree).to.match({
                    root: {
                        indents: -1,
                        parent: null,
                        children: [
                            {
                                text: 'A',
                                lineNumber: 1,
                                indents: 0,
                                parent: { indents: -1 },
                                children: [
                                    {
                                        text: 'B',
                                        lineNumber: 2,
                                        indents: 1,
                                        parent: { indents: 0 },
                                        children: []
                                    }
                                ]
                            },
                            {
                                lineNumber: 4,
                                indents: 0,
                                steps: [
                                    {
                                        text: 'C',
                                        lineNumber: 4,
                                        indents: 0,
                                        parent: null,
                                        children: [],
                                        containingStepBlock: { indents: 0, steps: { $typeof: 'array' } }
                                    },
                                    {
                                        text: 'D',
                                        lineNumber: 5,
                                        indents: 0,
                                        parent: null,
                                        children: [],
                                        containingStepBlock: { indents: 0, steps: { $typeof: 'array' } }
                                    }
                                ],
                                parent: { indents: -1 },
                                children: []
                            }
                        ]
                    }
                });
            });

            it("recognizes an empty line as the end of a step block", () => {
                let tree = new Tree();
                tree.parseIn(
`A
B

C`
                , "file.txt");

                Comparer.expect(tree).to.match({
                    root: {
                        indents: -1,
                        parent: null,
                        children: [
                            {
                                lineNumber: 1,
                                indents: 0,
                                steps: [
                                    {
                                        text: 'A',
                                        lineNumber: 1,
                                        indents: 0,
                                        parent: null,
                                        children: [],
                                        containingStepBlock: { indents: 0, steps: { $typeof: 'array' } }
                                    },
                                    {
                                        text: 'B',
                                        lineNumber: 2,
                                        indents: 0,
                                        parent: null,
                                        children: [],
                                        containingStepBlock: { indents: 0, steps: { $typeof: 'array' } }
                                    }
                                ],
                                parent: { indents: -1 },
                                children: []
                            },
                            {
                                text: 'C',
                                lineNumber: 4,
                                indents: 0,
                                parent: { indents: -1 },
                                children: []
                            }
                        ]
                    }
                });
            });

            it("parses multiple nested step blocks", () => {
                let tree = new Tree();
                tree.parseIn(
`A
B
C

    D
    E
    F
`
                , "file.txt");

                Comparer.expect(tree).to.match({
                    root: {
                        indents: -1,
                        parent: null,
                        children: [
                            {
                                lineNumber: 1,
                                indents: 0,
                                steps: [
                                    {
                                        text: 'A',
                                        lineNumber: 1,
                                        indents: 0,
                                        parent: null,
                                        children: [],
                                        containingStepBlock: { indents: 0, steps: { $typeof: 'array' } }
                                    },
                                    {
                                        text: 'B',
                                        lineNumber: 2,
                                        indents: 0,
                                        parent: null,
                                        children: [],
                                        containingStepBlock: { indents: 0, steps: { $typeof: 'array' } }
                                    },
                                    {
                                        text: 'C',
                                        lineNumber: 3,
                                        indents: 0,
                                        parent: null,
                                        children: [],
                                        containingStepBlock: { indents: 0, steps: { $typeof: 'array' } }
                                    }
                                ],
                                parent: { indents: -1 },
                                children: [
                                    {
                                        lineNumber: 5,
                                        indents: 1,
                                        steps: [
                                            {
                                                text: 'D',
                                                lineNumber: 5,
                                                indents: 1,
                                                parent: null,
                                                children: [],
                                                containingStepBlock: { indents: 1, steps: { $typeof: 'array' } }
                                            },
                                            {
                                                text: 'E',
                                                lineNumber: 6,
                                                indents: 1,
                                                parent: null,
                                                children: [],
                                                containingStepBlock: { indents: 1, steps: { $typeof: 'array' } }
                                            },
                                            {
                                                text: 'F',
                                                lineNumber: 7,
                                                indents: 1,
                                                parent: null,
                                                children: [],
                                                containingStepBlock: { indents: 1, steps: { $typeof: 'array' } }
                                            }
                                        ],
                                        parent: { indents: 0 },
                                        children: []
                                    }
                                ]
                            }
                        ]
                    }
                });
            });

            it("parses three levels of step blocks", () => {
                let tree = new Tree();
                tree.parseIn(
`A
B

    C
    D

        E
        F`
                , "file.txt");

                Comparer.expect(tree).to.match({
                    root: {
                        indents: -1,
                        parent: null,
                        children: [
                            {
                                lineNumber: 1,
                                indents: 0,
                                isSequential: undefined,
                                steps: [
                                    {
                                        text: 'A',
                                        lineNumber: 1,
                                        indents: 0,
                                        parent: null,
                                        children: [],
                                        containingStepBlock: { indents: 0, steps: { $typeof: 'array' } }
                                    },
                                    {
                                        text: 'B',
                                        lineNumber: 2,
                                        indents: 0,
                                        parent: null,
                                        children: [],
                                        containingStepBlock: { indents: 0, steps: { $typeof: 'array' } }
                                    }
                                ],
                                parent: { indents: -1 },
                                children: [
                                    {
                                        lineNumber: 4,
                                        indents: 1,
                                        isSequential: undefined,
                                        steps: [
                                            {
                                                text: 'C',
                                                lineNumber: 4,
                                                indents: 1,
                                                parent: null,
                                                children: [],
                                                containingStepBlock: { indents: 1, steps: { $typeof: 'array' } }
                                            },
                                            {
                                                text: 'D',
                                                lineNumber: 5,
                                                indents: 1,
                                                parent: null,
                                                children: [],
                                                containingStepBlock: { indents: 1, steps: { $typeof: 'array' } }
                                            }
                                        ],
                                        parent: { indents: 0 },
                                        children: [
                                            {
                                                lineNumber: 7,
                                                indents: 2,
                                                isSequential: undefined,
                                                steps: [
                                                    {
                                                        text: 'E',
                                                        lineNumber: 7,
                                                        indents: 2,
                                                        parent: null,
                                                        children: [],
                                                        containingStepBlock: { indents: 2, steps: { $typeof: 'array' } }
                                                    },
                                                    {
                                                        text: 'F',
                                                        lineNumber: 8,
                                                        indents: 2,
                                                        parent: null,
                                                        children: [],
                                                        containingStepBlock: { indents: 2, steps: { $typeof: 'array' } }
                                                    }
                                                ],
                                                parent: { indents: 1 },
                                                children: []
                                            }
                                        ]
                                    }
                                ]
                            }
                        ]
                    }
                });
            });

            it("parses step blocks immediately preceded by a parent, with no empty line in between", () => {
                let tree = new Tree();
                tree.parseIn(
`A
    B
    C
`
                , "file.txt");

                Comparer.expect(tree).to.match({
                    root: {
                        indents: -1,
                        parent: null,
                        children: [
                            {
                                text: 'A',
                                lineNumber: 1,
                                indents: 0,
                                parent: { indents: -1 },
                                children: [
                                    {
                                        lineNumber: 2,
                                        indents: 1,
                                        isSequential: undefined,
                                        steps: [
                                            {
                                                text: 'B',
                                                lineNumber: 2,
                                                indents: 1,
                                                parent: null,
                                                children: [],
                                                containingStepBlock: { indents: 1, steps: { $typeof: 'array' } }
                                            },
                                            {
                                                text: 'C',
                                                lineNumber: 3,
                                                indents: 1,
                                                parent: null,
                                                children: [],
                                                containingStepBlock: { indents: 1, steps: { $typeof: 'array' } }
                                            }
                                        ],
                                        parent: { indents: 0 },
                                        children: []
                                    }
                                ]
                            }
                        ]
                    }
                });
            });

            it("parses a step block immediately followed by a line that's less indented than the step block", () => {
                let tree = new Tree();
                tree.parseIn(
`A

    B
    C
D
`
                , "file.txt");

                Comparer.expect(tree).to.match({
                    root: {
                        indents: -1,
                        parent: null,
                        children: [
                            {
                                text: 'A',
                                lineNumber: 1,
                                indents: 0,
                                parent: { indents: -1 },
                                children: [
                                    {
                                        lineNumber: 3,
                                        indents: 1,
                                        isSequential: undefined,
                                        steps: [
                                            {
                                                text: 'B',
                                                lineNumber: 3,
                                                indents: 1,
                                                parent: null,
                                                children: [],
                                                containingStepBlock: { indents: 1, steps: { $typeof: 'array' } }
                                            },
                                            {
                                                text: 'C',
                                                lineNumber: 4,
                                                indents: 1,
                                                parent: null,
                                                children: [],
                                                containingStepBlock: { indents: 1, steps: { $typeof: 'array' } }
                                            }
                                        ],
                                        parent: { indents: 0 },
                                        children: []
                                    }
                                ]
                            },
                            {
                                text: 'D',
                                lineNumber: 5,
                                indents: 0,
                                parent: { indents: -1 },
                                children: []
                            }
                        ]
                    }
                });
            });

            it("rejects a step block containing a function declaration", () => {
                let tree = new Tree();
                assert.throws(() => {
                    tree.parseIn(
`A
* B
C`
                    , "file.txt");
                }, "You cannot have a function declaration within a step block [file.txt:2]");
            });

            it("rejects a step block containing a [", () => {
                let tree = new Tree();
                assert.throws(() => {
                    tree.parseIn(
`A
B
[
]`
                    , "file.txt");
                }, "You cannot have a '[' within a step block, or adjacent to another '[' or ']' at the same indent level [file.txt:3]");
            });

            it("rejects an empty multi-level step block", () => {
                let tree = new Tree();
                assert.throws(() => {
                    tree.parseIn(
`[
]`
                    , "file.txt");
                }, "You cannot have a '[' within a step block, or adjacent to another '[' or ']' at the same indent level [file.txt:1]");
            });

            it("rejects adjacent multi-level step blocks", () => {
                let tree = new Tree();
                assert.throws(() => {
                    tree.parseIn(
`[
    A
]
[

    B
]`
                    , "file.txt");
                }, "You cannot have a '[' within a step block, or adjacent to another '[' or ']' at the same indent level [file.txt:4]");
            });

            it("rejects adjacent named multi-level step blocks", () => {
                let tree = new Tree();
                assert.throws(() => {
                    tree.parseIn(
`X [
    A
]
Y [

    B
]`
                    , "file.txt");
                }, "You cannot have a '[' within a step block, or adjacent to another '[' or ']' at the same indent level [file.txt:4]");
            });

            it("accepts a step block containing a code block", () => {
                let tree = new Tree();
                tree.parseIn(
`A {
}
B
C {
}`
                , "file.txt");

                Comparer.expect(tree).to.match({
                    root: {
                        children: [
                            {
                                steps: [
                                    { text: 'A' }, { text: 'B' }, { text: 'C' }
                                ]
                            }
                        ]
                    }
                });
            });

            it("rejects a step block with children that doesn't end in an empty line", () => {
                let tree = new Tree();
                assert.throws(() => {
                    tree.parseIn(
`A
B
    C
`
                    , "file.txt");
                }, "There must be an empty line under a step block if it has children directly underneath it. Try putting an empty line under this line. [file.txt:2]");
            });

            it("doesn't reject a step block that's directly followed by a line indented left of the step block", () => {
                let tree = new Tree();
                tree.parseIn(
`A
    B
    C
D
`
                , "file.txt");
            });

            it("doesn't reject a step block if it doesn't have children and doesn't end in an empty line", () => {
                let tree = new Tree();
                tree.parseIn(
`A
B`
                , "file.txt");
            });
        });

        context(".. step blocks", () => {
            it("parses a .. step block with an empty line above it", () => {
                let tree = new Tree();
                tree.parseIn(
`A

    ..
    B
    C
    D
`
                , "file.txt");

                Comparer.expect(tree).to.match({
                    root: {
                        indents: -1,
                        parent: null,
                        children: [
                            {
                                text: 'A',
                                lineNumber: 1,
                                indents: 0,
                                parent: { indents: -1 },
                                children: [
                                    {
                                        lineNumber: 3,
                                        indents: 1,
                                        isSequential: true,
                                        steps: [
                                            {
                                                text: 'B',
                                                lineNumber: 4,
                                                indents: 1,
                                                parent: null,
                                                children: [],
                                                containingStepBlock: { indents: 1, steps: { $typeof: 'array' } }
                                            },
                                            {
                                                text: 'C',
                                                lineNumber: 5,
                                                indents: 1,
                                                parent: null,
                                                children: [],
                                                containingStepBlock: { indents: 1, steps: { $typeof: 'array' } }
                                            },
                                            {
                                                text: 'D',
                                                lineNumber: 6,
                                                indents: 1,
                                                parent: null,
                                                children: [],
                                                containingStepBlock: { indents: 1, steps: { $typeof: 'array' } }
                                            }
                                        ],
                                        parent: { indents: 0 },
                                        children: []
                                    }
                                ]
                            }
                        ]
                    }
                });
            });

            it("parses a .. step block with no empty line above it", () => {
                let tree = new Tree();
                tree.parseIn(
`A
    ..
    B
    C
    D
`
                , "file.txt");

                Comparer.expect(tree).to.match({
                    root: {
                        indents: -1,
                        parent: null,
                        children: [
                            {
                                text: 'A',
                                lineNumber: 1,
                                indents: 0,
                                parent: { indents: -1 },
                                children: [
                                    {
                                        lineNumber: 2,
                                        indents: 1,
                                        isSequential: true,
                                        steps: [
                                            {
                                                text: 'B',
                                                lineNumber: 3,
                                                indents: 1,
                                                parent: null,
                                                children: [],
                                                containingStepBlock: { indents: 1, steps: { $typeof: 'array' } }
                                            },
                                            {
                                                text: 'C',
                                                lineNumber: 4,
                                                indents: 1,
                                                parent: null,
                                                children: [],
                                                containingStepBlock: { indents: 1, steps: { $typeof: 'array' } }
                                            },
                                            {
                                                text: 'D',
                                                lineNumber: 5,
                                                indents: 1,
                                                parent: null,
                                                children: [],
                                                containingStepBlock: { indents: 1, steps: { $typeof: 'array' } }
                                            }
                                        ],
                                        parent: { indents: 0 },
                                        children: []
                                    }
                                ]
                            }
                        ]
                    }
                });
            });

            it("parses a .. step block on the first line", () => {
                let tree = new Tree();
                tree.parseIn(
`..
A
B
C
`
                , "file.txt");

                Comparer.expect(tree).to.match({
                    root: {
                        indents: -1,
                        parent: null,
                        children: [
                            {
                                lineNumber: 1,
                                indents: 0,
                                isSequential: true,
                                steps: [
                                    {
                                        text: 'A',
                                        lineNumber: 2,
                                        indents: 0,
                                        parent: null,
                                        children: [],
                                        containingStepBlock: { indents: 0, steps: { $typeof: 'array' } }
                                    },
                                    {
                                        text: 'B',
                                        lineNumber: 3,
                                        indents: 0,
                                        parent: null,
                                        children: [],
                                        containingStepBlock: { indents: 0, steps: { $typeof: 'array' } }
                                    },
                                    {
                                        text: 'C',
                                        lineNumber: 4,
                                        indents: 0,
                                        parent: null,
                                        children: [],
                                        containingStepBlock: { indents: 0, steps: { $typeof: 'array' } }
                                    }
                                ],
                                parent: { indents: -1 },
                                children: []
                            }
                        ]
                    }
                });
            });

            it("parses empty lines followed by a .. step block", () => {
                let tree = new Tree();
                tree.parseIn(
`

..
A
B
C
`
                , "file.txt");

                Comparer.expect(tree).to.match({
                    root: {
                        indents: -1,
                        parent: null,
                        children: [
                            {
                                lineNumber: 3,
                                indents: 0,
                                isSequential: true,
                                steps: [
                                    {
                                        text: 'A',
                                        lineNumber: 4,
                                        indents: 0,
                                        parent: null,
                                        children: [],
                                        containingStepBlock: { indents: 0, steps: { $typeof: 'array' } }
                                    },
                                    {
                                        text: 'B',
                                        lineNumber: 5,
                                        indents: 0,
                                        parent: null,
                                        children: [],
                                        containingStepBlock: { indents: 0, steps: { $typeof: 'array' } }
                                    },
                                    {
                                        text: 'C',
                                        lineNumber: 6,
                                        indents: 0,
                                        parent: null,
                                        children: [],
                                        containingStepBlock: { indents: 0, steps: { $typeof: 'array' } }
                                    }
                                ],
                                parent: { indents: -1 },
                                children: []
                            }
                        ]
                    }
                });
            });

            it("rejects a step block containing a .. line in the middle", () => {
                let tree = new Tree();
                assert.throws(() => {
                    tree.parseIn(
`A
B
..
C
D
`
                    , "file.txt");
                }, "You cannot have a .. line at the same indent level as the adjacent line above [file.txt:3]");
            });

            it("rejects a step block containing a .. line at the end", () => {
                let tree = new Tree();
                assert.throws(() => {
                    tree.parseIn(
`A
B
..`
                    , "file.txt");
                }, "You cannot have a .. line at the same indent level as the adjacent line above [file.txt:3]");

                assert.throws(() => {
                    tree.parseIn(
`A
B
..
`
                    , "file.txt");
                }, "You cannot have a .. line at the same indent level as the adjacent line above [file.txt:3]");

                assert.throws(() => {
                    tree.parseIn(
`..`
                    , "file.txt");
                }, "You cannot have a .. line without anything directly below [file.txt:1]");
            });

            it("rejects a .. line by itself", () => {
                let tree = new Tree();
                assert.throws(() => {
                    tree.parseIn(
`A
B

..

C
`
                    , "file.txt");
                }, "You cannot have a .. line without anything directly below [file.txt:4]");
            });

            it("rejects a .. line that's immediately followed by indented children", () => {
                let tree = new Tree();
                assert.throws(() => {
                    tree.parseIn(
`..
    A
    B
`
                    , "file.txt");
                }, "A .. line must be followed by a line at the same indent level [file.txt:1]");
            });

            it("rejects a .. line followed by an invalid step block", () => {
                let tree = new Tree();
                assert.throws(() => {
                    tree.parseIn(
`..
A
    B
    C
D
`
                    , "file.txt");
                }, "A .. line must be followed by a step block [file.txt:1]");

                assert.throws(() => {
                    tree.parseIn(
`A

    ..
    B

E
`
                    , "file.txt");
                }, "A .. line must be followed by a step block [file.txt:3]");
            });

            it("rejects two .. lines in a row", () => {
                let tree = new Tree();
                assert.throws(() => {
                    tree.parseIn(
`..
..
`
                    , "file.txt");
                }, "You cannot have two .. lines in a row [file.txt:1]");
            });

            it("parses a step block, followed by an indented .. step block", () => {
                let tree = new Tree();
                tree.parseIn(
`A
B
    ..
    C
    D
`
                , "file.txt");

                Comparer.expect(tree).to.match({
                    root: {
                        indents: -1,
                        parent: null,
                        children: [
                            {
                                lineNumber: 1,
                                indents: 0,
                                isSequential: undefined,
                                steps: [
                                    {
                                        text: 'A',
                                        lineNumber: 1,
                                        indents: 0,
                                        parent: null,
                                        children: [],
                                        containingStepBlock: { indents: 0, steps: { $typeof: 'array' } }
                                    },
                                    {
                                        text: 'B',
                                        lineNumber: 2,
                                        indents: 0,
                                        parent: null,
                                        children: [],
                                        containingStepBlock: { indents: 0, steps: { $typeof: 'array' } }
                                    }
                                ],
                                parent: { indents: -1 },
                                children: [
                                    {
                                        lineNumber: 3,
                                        indents: 1,
                                        isSequential: true,
                                        steps: [
                                            {
                                                text: 'C',
                                                lineNumber: 4,
                                                indents: 1,
                                                parent: null,
                                                children: [],
                                                containingStepBlock: { indents: 1, steps: { $typeof: 'array' } }
                                            },
                                            {
                                                text: 'D',
                                                lineNumber: 5,
                                                indents: 1,
                                                parent: null,
                                                children: [],
                                                containingStepBlock: { indents: 1, steps: { $typeof: 'array' } }
                                            }
                                        ],
                                        parent: { indents: 0 },
                                        children: []
                                    }
                                ]
                            }
                        ]
                    }
                });
            });

            it("parses a step block, followed by an empty line, followed by an indented .. step block", () => {
                let tree = new Tree();
                tree.parseIn(
`A
B

    ..
    C
    D
`
                , "file.txt");

                Comparer.expect(tree).to.match({
                    root: {
                        indents: -1,
                        parent: null,
                        children: [
                            {
                                lineNumber: 1,
                                indents: 0,
                                isSequential: undefined,
                                steps: [
                                    {
                                        text: 'A',
                                        lineNumber: 1,
                                        indents: 0,
                                        parent: null,
                                        children: [],
                                        containingStepBlock: { indents: 0, steps: { $typeof: 'array' } }
                                    },
                                    {
                                        text: 'B',
                                        lineNumber: 2,
                                        indents: 0,
                                        parent: null,
                                        children: [],
                                        containingStepBlock: { indents: 0, steps: { $typeof: 'array' } }
                                    }
                                ],
                                parent: { indents: -1 },
                                children: [
                                    {
                                        lineNumber: 4,
                                        indents: 1,
                                        isSequential: true,
                                        steps: [
                                            {
                                                text: 'C',
                                                lineNumber: 5,
                                                indents: 1,
                                                parent: null,
                                                children: [],
                                                containingStepBlock: { indents: 1, steps: { $typeof: 'array' } }
                                            },
                                            {
                                                text: 'D',
                                                lineNumber: 6,
                                                indents: 1,
                                                parent: null,
                                                children: [],
                                                containingStepBlock: { indents: 1, steps: { $typeof: 'array' } }
                                            }
                                        ],
                                        parent: { indents: 0 },
                                        children: []
                                    }
                                ]
                            }
                        ]
                    }
                });
            });

            it("parses a .. step block, followed by an indented .. step block", () => {
                let tree = new Tree();
                tree.parseIn(
`..
A
B
    ..
    C
    D
`
                , "file.txt");

                Comparer.expect(tree).to.match({
                    root: {
                        indents: -1,
                        parent: null,
                        children: [
                            {
                                lineNumber: 1,
                                indents: 0,
                                isSequential: true,
                                steps: [
                                    {
                                        text: 'A',
                                        lineNumber: 2,
                                        indents: 0,
                                        parent: null,
                                        children: [],
                                        containingStepBlock: { indents: 0, steps: { $typeof: 'array' } }
                                    },
                                    {
                                        text: 'B',
                                        lineNumber: 3,
                                        indents: 0,
                                        parent: null,
                                        children: [],
                                        containingStepBlock: { indents: 0, steps: { $typeof: 'array' } }
                                    }
                                ],
                                parent: { indents: -1 },
                                children: [
                                    {
                                        lineNumber: 4,
                                        indents: 1,
                                        isSequential: true,
                                        steps: [
                                            {
                                                text: 'C',
                                                lineNumber: 5,
                                                indents: 1,
                                                parent: null,
                                                children: [],
                                                containingStepBlock: { indents: 1, steps: { $typeof: 'array' } }
                                            },
                                            {
                                                text: 'D',
                                                lineNumber: 6,
                                                indents: 1,
                                                parent: null,
                                                children: [],
                                                containingStepBlock: { indents: 1, steps: { $typeof: 'array' } }
                                            }
                                        ],
                                        parent: { indents: 0 },
                                        children: []
                                    }
                                ]
                            }
                        ]
                    }
                });
            });

            it("parses a .. step block, followed by an empty line, followed by an indented .. step block", () => {
                let tree = new Tree();
                tree.parseIn(
`..
A
B

    ..
    C
    D
`
                , "file.txt");

                Comparer.expect(tree).to.match({
                    root: {
                        indents: -1,
                        parent: null,
                        children: [
                            {
                                lineNumber: 1,
                                indents: 0,
                                isSequential: true,
                                steps: [
                                    {
                                        text: 'A',
                                        lineNumber: 2,
                                        indents: 0,
                                        parent: null,
                                        children: [],
                                        containingStepBlock: { indents: 0, steps: { $typeof: 'array' } }
                                    },
                                    {
                                        text: 'B',
                                        lineNumber: 3,
                                        indents: 0,
                                        parent: null,
                                        children: [],
                                        containingStepBlock: { indents: 0, steps: { $typeof: 'array' } }
                                    }
                                ],
                                parent: { indents: -1 },
                                children: [
                                    {
                                        lineNumber: 5,
                                        indents: 1,
                                        isSequential: true,
                                        steps: [
                                            {
                                                text: 'C',
                                                lineNumber: 6,
                                                indents: 1,
                                                parent: null,
                                                children: [],
                                                containingStepBlock: { indents: 1, steps: { $typeof: 'array' } }
                                            },
                                            {
                                                text: 'D',
                                                lineNumber: 7,
                                                indents: 1,
                                                parent: null,
                                                children: [],
                                                containingStepBlock: { indents: 1, steps: { $typeof: 'array' } }
                                            }
                                        ],
                                        parent: { indents: 0 },
                                        children: []
                                    }
                                ]
                            }
                        ]
                    }
                });
            });
        });

        context("code blocks", () => {
            it("parses a code block", () => {
                let tree = new Tree();
                tree.parseIn(
`A
    Code block here {start;
        code;
        more code;
    }

    B
C
`
                , "file.txt");

                Comparer.expect(tree).to.match({
                    root: {
                        indents: -1,
                        parent: null,
                        children: [
                            {
                                text: 'A',
                                codeBlock: undefined,
                                lineNumber: 1,
                                indents: 0,
                                parent: { indents: -1 },
                                children: [
                                    {
                                        text: 'Code block here',
                                        codeBlock: 'start;\n        code;\n        more code;',
                                        lineNumber: 2,
                                        indents: 1,
                                        parent: { indents: 0 },
                                        children: []
                                    },
                                    {
                                        text: 'B',
                                        codeBlock: undefined,
                                        lineNumber: 7,
                                        indents: 1,
                                        parent: { indents: 0 },
                                        children: []
                                    }
                                ]
                            },
                            {
                                text: 'C',
                                codeBlock: undefined,
                                lineNumber: 8,
                                indents: 0,
                                parent: { indents: -1 },
                                children: []
                            }
                        ]
                    }
                });
            });

            it("parses an empty code block", () => {
                let tree = new Tree();
                tree.parseIn(
`A
    Code block here {
    }

    B
C
`
                , "file.txt");

                Comparer.expect(tree).to.match({
                    root: {
                        indents: -1,
                        parent: null,
                        children: [
                            {
                                text: 'A',
                                codeBlock: undefined,
                                lineNumber: 1,
                                indents: 0,
                                parent: { indents: -1 },
                                children: [
                                    {
                                        text: 'Code block here',
                                        codeBlock: '',
                                        lineNumber: 2,
                                        indents: 1,
                                        parent: { indents: 0 },
                                        children: []
                                    },
                                    {
                                        text: 'B',
                                        codeBlock: undefined,
                                        lineNumber: 5,
                                        indents: 1,
                                        parent: { indents: 0 },
                                        children: []
                                    }
                                ]
                            },
                            {
                                text: 'C',
                                codeBlock: undefined,
                                lineNumber: 6,
                                indents: 0,
                                parent: { indents: -1 },
                                children: []
                            }
                        ]
                    }
                });
            });

            it("parses a code block with siblings", () => {
                let tree = new Tree();
                tree.parseIn(
`A
    Code block here {
        code;
        more code;
    }

    B
`
                , "file.txt");

                Comparer.expect(tree).to.match({
                    root: {
                        indents: -1,
                        parent: null,
                        children: [
                            {
                                text: 'A',
                                codeBlock: undefined,
                                lineNumber: 1,
                                indents: 0,
                                parent: { indents: -1 },
                                children: [
                                    {
                                        text: 'Code block here',
                                        codeBlock: '\n        code;\n        more code;',
                                        lineNumber: 2,
                                        indents: 1,
                                        parent: { indents: 0 },
                                        children: []
                                    },
                                    {
                                        text: 'B',
                                        codeBlock: undefined,
                                        lineNumber: 7,
                                        indents: 1,
                                        parent: { indents: 0 },
                                        children: []
                                    }
                                ]
                            }
                        ]
                    }
                });
            });

            it("parses a code block with siblings, not separated by an empty line", () => {
                let tree = new Tree();
                tree.parseIn(
`A
    Code block here {
        code;
        more code;
    }

    B`
                , "file.txt");

                Comparer.expect(tree).to.match({
                    root: {
                        indents: -1,
                        parent: null,
                        children: [
                            {
                                text: 'A',
                                codeBlock: undefined,
                                lineNumber: 1,
                                indents: 0,
                                parent: { indents: -1 },
                                children: [
                                    {
                                        text: 'Code block here',
                                        codeBlock: '\n        code;\n        more code;',
                                        lineNumber: 2,
                                        indents: 1,
                                        parent: { indents: 0 },
                                        children: []
                                    },
                                    {
                                        text: 'B',
                                        codeBlock: undefined,
                                        lineNumber: 7,
                                        indents: 1,
                                        parent: { indents: 0 },
                                        children: []
                                    }
                                ]
                            }
                        ]
                    }
                });
            });

            it("parses a code block with children", () => {
                let tree = new Tree();
                tree.parseIn(
`A
    Code block here {
        code;
        more code;
    }

        B
`
                , "file.txt");

                Comparer.expect(tree).to.match({
                    root: {
                        indents: -1,
                        parent: null,
                        children: [
                            {
                                text: 'A',
                                codeBlock: undefined,
                                lineNumber: 1,
                                indents: 0,
                                parent: { indents: -1 },
                                children: [
                                    {
                                        text: 'Code block here',
                                        codeBlock: '\n        code;\n        more code;',
                                        lineNumber: 2,
                                        indents: 1,
                                        parent: { indents: 0 },
                                        children: [
                                            {
                                                text: 'B',
                                                codeBlock: undefined,
                                                lineNumber: 7,
                                                indents: 2,
                                                parent: { indents: 1 },
                                                children: []
                                            }
                                        ]
                                    }
                                ]
                            }
                        ]
                    }
                });
            });

            it("parses a code block with children, not separated by an empty line", () => {
                let tree = new Tree();
                tree.parseIn(
`A
    Code block here {
        code;
        more code;
    }
        B
`
                , "file.txt");

                Comparer.expect(tree).to.match({
                    root: {
                        indents: -1,
                        parent: null,
                        children: [
                            {
                                text: 'A',
                                codeBlock: undefined,
                                lineNumber: 1,
                                indents: 0,
                                parent: { indents: -1 },
                                children: [
                                    {
                                        text: 'Code block here',
                                        codeBlock: '\n        code;\n        more code;',
                                        lineNumber: 2,
                                        indents: 1,
                                        parent: { indents: 0 },
                                        children: [
                                            {
                                                text: 'B',
                                                codeBlock: undefined,
                                                lineNumber: 6,
                                                indents: 2,
                                                parent: { indents: 1 },
                                                children: []
                                            }
                                        ]
                                    }
                                ]
                            }
                        ]
                    }
                });
            });

            it("parses a code block with step blocks as children", () => {
                let tree = new Tree();
                tree.parseIn(
`A
    Code block here {
        code;
        more code;
    }

        B
        C
`
                , "file.txt");

                Comparer.expect(tree).to.match({
                    root: {
                        indents: -1,
                        parent: null,
                        children: [
                            {
                                text: 'A',
                                codeBlock: undefined,
                                lineNumber: 1,
                                indents: 0,
                                parent: { indents: -1 },
                                children: [
                                    {
                                        text: 'Code block here',
                                        codeBlock: '\n        code;\n        more code;',
                                        lineNumber: 2,
                                        indents: 1,
                                        parent: { indents: 0 },
                                        children: [
                                            {
                                                lineNumber: 7,
                                                indents: 2,
                                                steps: [
                                                    {
                                                        text: 'B',
                                                        lineNumber: 7,
                                                        indents: 2,
                                                        parent: null,
                                                        children: [],
                                                        containingStepBlock: { indents: 2, steps: { $typeof: 'array' } }
                                                    },
                                                    {
                                                        text: 'C',
                                                        lineNumber: 8,
                                                        indents: 2,
                                                        parent: null,
                                                        children: [],
                                                        containingStepBlock: { indents: 2, steps: { $typeof: 'array' } }
                                                    }
                                                ],
                                                parent: { indents: 1 },
                                                children: []
                                            }
                                        ]
                                    }
                                ]
                            }
                        ]
                    }
                });
            });

            it("parses a code block with a code block as a child", () => {
                let tree = new Tree();
                tree.parseIn(
`A
    Code block here {
        code;
        more code;
    }

        Another code block {
            blah;
        }
`
                , "file.txt");

                Comparer.expect(tree).to.match({
                    root: {
                        indents: -1,
                        parent: null,
                        children: [
                            {
                                text: 'A',
                                codeBlock: undefined,
                                lineNumber: 1,
                                indents: 0,
                                parent: { indents: -1 },
                                children: [
                                    {
                                        text: 'Code block here',
                                        codeBlock: '\n        code;\n        more code;',
                                        lineNumber: 2,
                                        indents: 1,
                                        parent: { indents: 0 },
                                        children: [
                                            {
                                                text: 'Another code block',
                                                codeBlock: '\n            blah;',
                                                lineNumber: 7,
                                                indents: 2,
                                                parent: { indents: 1 },
                                                children: []
                                            }
                                        ]
                                    }
                                ]
                            }
                        ]
                    }
                });
            });

            it("parses a code block with a code block as a child, not separated by an empty line", () => {
                let tree = new Tree();
                tree.parseIn(
`A
    Code block here {
        code;
        more code;
    }
        Another code block {
            blah;
        }`
                , "file.txt");

                Comparer.expect(tree).to.match({
                    root: {
                        indents: -1,
                        parent: null,
                        children: [
                            {
                                text: 'A',
                                codeBlock: undefined,
                                lineNumber: 1,
                                indents: 0,
                                parent: { indents: -1 },
                                children: [
                                    {
                                        text: 'Code block here',
                                        codeBlock: '\n        code;\n        more code;',
                                        lineNumber: 2,
                                        indents: 1,
                                        parent: { indents: 0 },
                                        children: [
                                            {
                                                text: 'Another code block',
                                                codeBlock: '\n            blah;',
                                                lineNumber: 6,
                                                indents: 2,
                                                parent: { indents: 1 },
                                                children: []
                                            }
                                        ]
                                    }
                                ]
                            }
                        ]
                    }
                });
            });

            it("parses code blocks in a step block", () => {
                let tree = new Tree();
                tree.parseIn(
`A {
    a
}
B {
    b
}
C -

    D -
`
                , "file.txt");

                Comparer.expect(tree).to.match({
                    root: {
                        indents: -1,
                        parent: null,
                        children: [
                            {
                                steps: [
                                    {
                                        text: 'A',
                                        codeBlock: '\n    a',
                                    },
                                    {
                                        text: 'B',
                                        codeBlock: '\n    b',
                                    },
                                    {
                                        text: 'C',
                                        codeBlock: undefined,
                                    }
                                ],
                                children: [
                                    {
                                        text: 'D',
                                        codeBlock: undefined,
                                    }
                                ]
                            }
                        ]
                    }
                });
            });

            it("parses code blocks in a step block, more complex example", () => {
                let tree = new Tree();
                tree.parseIn(
`A {
    a
}
B -
C {
    c
}

    D {
        d
    }
    E {
        e
    }
`
                , "file.txt");

                Comparer.expect(tree).to.match({
                    root: {
                        indents: -1,
                        parent: null,
                        children: [
                            {
                                steps: [
                                    {
                                        text: 'A',
                                        codeBlock: '\n    a',
                                    },
                                    {
                                        text: 'B',
                                        codeBlock: undefined,
                                    },
                                    {
                                        text: 'C',
                                        codeBlock: '\n    c',
                                    }
                                ],
                                children: [
                                    {
                                        steps: [
                                            {
                                                text: 'D',
                                                codeBlock: '\n        d',
                                            },
                                            {
                                                text: 'E',
                                                codeBlock: '\n        e',
                                            }
                                        ],
                                        children: []
                                    }
                                ]
                            }
                        ]
                    }
                });
            });

            it("rejects a code block that isn't closed", () => {
                let tree = new Tree();
                assert.throws(() => {
                    tree.parseIn(
`A
    Code block here {
        code;
        more code;
`
                    , "file.txt");
                }, "An unclosed code block was found [file.txt:2]");

                assert.throws(() => {
                    tree.parseIn(
`Code block here {`
                    , "file.txt");
                }, "An unclosed code block was found [file.txt:1]");
            });

            it("rejects a code block with a closing } at the wrong indentation", () => {
                let tree = new Tree();
                assert.throws(() => {
                    tree.parseIn(
`A
    Code block here {

}
`
                    , "file.txt");
                }, "An unclosed code block was found [file.txt:2]");

                assert.throws(() => {
                    tree.parseIn(
`A
    Code block here {

        }
`
                    , "file.txt");
                }, "An unclosed code block was found [file.txt:2]");
            });
        });

        context("multi-level step blocks", () => {
            it("connects multi-level step block function declarations with their function calls", () => {
                let tree = new Tree();
                tree.parseIn(
`A
    [
        B
            C
        D
        E
    ]
        F
            G`
                , "file.txt");

                Comparer.expect(tree).to.match({
                    root: {
                        indents: -1,
                        parent: null,
                        children: [
                            {
                                text: 'A',
                                lineNumber: 1,
                                indents: 0,
                                parent: { indents: -1 },
                                children: [
                                    {
                                        text: ' ',
                                        isMultiBlockFunctionDeclaration: true,
                                        isFunctionDeclaration: true,
                                        isFunctionCall: undefined,
                                        anonfid: undefined,
                                        lineNumber: 2,
                                        indents: 1,
                                        parent: { text: 'A' },
                                        children: [
                                            {
                                                text: 'B',
                                                lineNumber: 3,
                                                indents: 2,
                                                parent: { text: ' ' },
                                                children: [
                                                    {
                                                        text: 'C',
                                                        lineNumber: 4,
                                                        indents: 3,
                                                        parent: { text: 'B' },
                                                        children: []
                                                    }
                                                ]
                                            },
                                            {
                                                steps: [
                                                    {
                                                        text: 'D',
                                                        lineNumber: 5,
                                                        indents: 2,
                                                        children: []
                                                    },
                                                    {
                                                        text: 'E',
                                                        lineNumber: 6,
                                                        indents: 2,
                                                        children: []
                                                    }
                                                ]
                                            }
                                        ]
                                    },
                                    {
                                        text: ' ',
                                        isMultiBlockFunctionCall: true,
                                        isFunctionDeclaration: undefined,
                                        isFunctionCall: true,
                                        multiBlockFid: 2,
                                        lineNumber: 7,
                                        indents: 1,
                                        parent: { text: 'A' },
                                        children: [
                                            {
                                                text: 'F',
                                                lineNumber: 8,
                                                indents: 2,
                                                parent: { text: ' ' },
                                                children: [
                                                    {
                                                        text: 'G',
                                                        lineNumber: 9,
                                                        indents: 3,
                                                        parent: { text: 'F' },
                                                        children: []
                                                    }
                                                ]
                                            }
                                        ]
                                    }
                                ]
                            }
                        ]
                    }
                });
            });

            it("rejects multi-level step blocks with no ending ]", () => {
                assert.throws(() => {
                    let tree = new Tree();
                    tree.parseIn(
`[

A

]`
                    , "file.txt");
                }, `Cannot find the '[' that corresponds to this ']' [file.txt:5]`);
            });

            it("rejects multi-level step blocks with no ending ], more complex example", () => {
                assert.throws(() => {
                    let tree = new Tree();
                    tree.parseIn(
`]`
                    , "file.txt");
                }, `Cannot find the '[' that corresponds to this ']' [file.txt:1]`);
            });
        });
    });

    describe("findFunctionDeclarations()", () => {
        it("finds the right function when its declaration is a sibling of the function call and is below the function call", () => {
            let tree = new Tree();
            tree.parseIn(`
My function

* My function
    Step one -
            `);

            let branchAbove = new Branch();
            let functionCall = new Step(tree.root.children[0].id);
            let functionDeclarations = tree.findFunctionDeclarations(functionCall, branchAbove);

            Comparer.expect(functionDeclarations).to.match([
                {
                    text: "My function",
                    isFunctionDeclaration: true,
                    parent: { indents: -1 },
                    children: [
                        {
                            text: "Step one",
                            isTextualStep: true
                        }
                    ]
                }
            ]);

            expect(functionDeclarations[0] === tree.root.children[1]).to.equal(true);
        });

        it("finds the right function when the declaration is private", () => {
            let tree = new Tree();
            tree.parseIn(`
My function

** My function
    Step one -
`);

            let branchAbove = new Branch();
            let functionCall = new Step(tree.root.children[0].id);
            let functionDeclarations = tree.findFunctionDeclarations(functionCall, branchAbove);

            Comparer.expect(functionDeclarations).to.match([
                {
                    text: "My function",
                    isFunctionDeclaration: true,
                    isPrivateFunctionDeclaration: true,
                    parent: { indents: -1 },
                    children: [
                        {
                            text: "Step one",
                            isTextualStep: true
                        }
                    ]
                }
            ]);

            expect(functionDeclarations[0] === tree.root.children[1]).to.equal(true);
        });

        it("finds the right multi-level step block function", () => {
            let tree = new Tree();
            tree.parseIn(`
[
    A -
        B -

]
`);

            let branchAbove = new Branch();
            let functionCall = new Step(tree.root.children[1].id);
            let functionDeclarations = tree.findFunctionDeclarations(functionCall, branchAbove);

            Comparer.expect(functionDeclarations).to.match([
                {
                    text: " ",
                    isFunctionDeclaration: true,
                    isFunctionCall: undefined,
                    isPrivateFunctionDeclaration: true,
                    isMultiBlockFunctionDeclaration: true,
                    isMultiBlockFunctionCall: undefined,
                    parent: { indents: -1 },
                    children: [
                        {
                            text: "A",
                            isTextualStep: true
                        }
                    ]
                }
            ]);

            expect(functionDeclarations[0] === tree.root.children[0]).to.equal(true);
        });

        it("finds the right multi-level step block function when there are multiple functions", () => {
            let tree = new Tree();
            tree.parseIn(`
[
    A -
        B -

]

[
    C -
]
`);

            let branchAbove = new Branch();

            let functionCall = new Step(tree.root.children[1].id);
            let functionDeclarations = tree.findFunctionDeclarations(functionCall, branchAbove);
            expect(functionDeclarations).to.have.lengthOf(1);
            expect(functionDeclarations[0] === tree.root.children[0]).to.equal(true);

            functionCall = new Step(tree.root.children[3].id);
            functionDeclarations = tree.findFunctionDeclarations(functionCall, branchAbove);
            expect(functionDeclarations).to.have.lengthOf(1);
            expect(functionDeclarations[0] === tree.root.children[2]).to.equal(true);
        });

        it("finds the right multi-level step block function when there are multiple nested functions", () => {
            let tree = new Tree();
            tree.parseIn(`
[
    A -
        [
            B -
        ]

    C -
]

[
    D -
]
`);

            let branchAbove = new Branch();

            let functionCall = new Step(tree.root.children[1].id);
            let functionDeclarations = tree.findFunctionDeclarations(functionCall, branchAbove);
            expect(functionDeclarations).to.have.lengthOf(1);
            expect(functionDeclarations[0] === tree.root.children[0]).to.equal(true);

            functionCall = new Step(tree.root.children[3].id);
            functionDeclarations = tree.findFunctionDeclarations(functionCall, branchAbove);
            expect(functionDeclarations).to.have.lengthOf(1);
            expect(functionDeclarations[0] === tree.root.children[2]).to.equal(true);

            functionCall = new Step(tree.root.children[0].children[0].children[1].id);
            functionDeclarations = tree.findFunctionDeclarations(functionCall, branchAbove);
            expect(functionDeclarations).to.have.lengthOf(1);
            expect(functionDeclarations[0] === tree.root.children[0].children[0].children[0]).to.equal(true);
        });

        it("finds the right multi-level step block function declared inside another function declaration", () => {
            let tree = new Tree();
            tree.parseIn(`
* F
    [
        A -
            B -

    ]
`);

            let branchAbove = new Branch();
            let functionCall = new Step(tree.root.children[0].children[1].id);
            let functionDeclarations = tree.findFunctionDeclarations(functionCall, branchAbove);

            expect(functionDeclarations).to.have.lengthOf(1);
            expect(functionDeclarations[0] === tree.root.children[0].children[0]).to.equal(true);
        });

        it("finds the right multi-level step block function when it's empty", () => {
            let tree = new Tree();
            tree.parseIn(`
[

]
`);

            let branchAbove = new Branch();

            let functionCall = new Step(tree.root.children[1].id);
            let functionDeclarations = tree.findFunctionDeclarations(functionCall, branchAbove);
            expect(functionDeclarations).to.have.lengthOf(1);
            expect(functionDeclarations[0] === tree.root.children[0]).to.equal(true);
        });

        it("finds the right multi-level step block function when it's named", () => {
            let tree = new Tree();
            tree.parseIn(`
F [
    A -
        B -

]
`);

            let branchAbove = new Branch();
            let functionCall = new Step(tree.root.children[1].id);
            let functionDeclarations = tree.findFunctionDeclarations(functionCall, branchAbove);

            Comparer.expect(functionDeclarations).to.match([
                {
                    text: "F",
                    isFunctionDeclaration: true,
                    isFunctionCall: undefined,
                    isPrivateFunctionDeclaration: true,
                    isMultiBlockFunctionDeclaration: true,
                    isMultiBlockFunctionCall: undefined,
                    parent: { indents: -1 },
                    children: [
                        {
                            text: "A",
                            isTextualStep: true
                        }
                    ]
                }
            ]);

            expect(functionDeclarations[0] === tree.root.children[0]).to.equal(true);
        });

        it("finds the right function when its declaration is a sibling of the function call and is above the function call", () => {
            let tree = new Tree();
            tree.parseIn(`
* My function
    Step one -
My function
`);

            let branchAbove = new Branch();
            let functionCall = new Step(tree.root.children[1].id);
            let functionDeclarations = tree.findFunctionDeclarations(functionCall, branchAbove);

            Comparer.expect(functionDeclarations).to.match([
                {
                    text: "My function",
                    isFunctionDeclaration: true,
                    parent: { indents: -1 },
                    children: [
                        {
                            text: "Step one",
                            isTextualStep: true
                        }
                    ]
                }
            ]);

            expect(functionDeclarations[0] === tree.root.children[0]).to.equal(true);
        });

        it("finds the right function when its declaration is a sibling of a descendant", () => {
            let tree = new Tree();
            tree.parseIn(`
Some parent step -
    My function

* My function
    Step one -
`);

            let branchAbove = new Branch();
            branchAbove.steps = [
                new Step(tree.root.children[0].id)
            ];
            let functionCall = new Step(tree.root.children[0].children[0].id);
            let functionDeclarations = tree.findFunctionDeclarations(functionCall, branchAbove);

            Comparer.expect(functionDeclarations).to.match([
                {
                    text: "My function",
                    isFunctionDeclaration: true,
                    parent: { indents: -1 },
                    children: [
                        {
                            text: "Step one",
                            isTextualStep: true
                        }
                    ]
                }
            ]);

            expect(functionDeclarations[0] === tree.root.children[1]).to.equal(true);
        });

        it("finds the right function even if a step block has to be traversed", () => {
            let tree = new Tree();
            tree.parseIn(`
Step block step 1 -
Step block step 2 -

    My function

* My function
    Step one -
`);

            let branchAbove = new Branch();
            branchAbove.steps = [
                new Step(tree.root.children[0].steps[0].id)
            ];
            let functionCall = new Step(tree.root.children[0].children[0].id);
            let functionDeclarations = tree.findFunctionDeclarations(functionCall, branchAbove);

            Comparer.expect(functionDeclarations).to.match([
                {
                    text: "My function",
                    isFunctionDeclaration: true,
                    parent: { indents: -1 },
                    children: [
                        {
                            text: "Step one",
                            isTextualStep: true
                        }
                    ]
                }
            ]);

            expect(functionDeclarations[0] === tree.root.children[1]).to.equal(true);
        });

        it("finds the right function even if declaration has different amounts of whitespace between words", () => {
            let tree = new Tree();
            tree.parseIn(`
Some parent step -
    My     function

* My  function
    Step one -
`);

            let branchAbove = new Branch();
            branchAbove.steps = [
                new Step(tree.root.children[0].id)
            ];
            let functionCall = new Step(tree.root.children[0].children[0].id);
            let functionDeclarations = tree.findFunctionDeclarations(functionCall, branchAbove);

            Comparer.expect(functionDeclarations).to.match([
                {
                    text: "My  function",
                    isFunctionDeclaration: true,
                    parent: { indents: -1 },
                    children: [
                        {
                            text: "Step one",
                            isTextualStep: true
                        }
                    ]
                }
            ]);

            expect(functionDeclarations[0] === tree.root.children[1]).to.equal(true);
        });

        it("finds the right function when multiple equivalent functions exist", () => {
            let tree = new Tree();
            tree.parseIn(`
Some parent step -
    My function

    * My function
        The right one -
            * My function
                The wrong one -

    * My function
        The other right one -

* My function
    The wrong one -
`);

            let branchAbove = new Branch();
            branchAbove.steps = [
                new Step(tree.root.children[0].id)
            ];
            let functionCall = new Step(tree.root.children[0].children[0].id);
            let functionDeclarations = tree.findFunctionDeclarations(functionCall, branchAbove);

            Comparer.expect(functionDeclarations).to.match([
                {
                    text: "My function",
                    isFunctionDeclaration: true,
                    parent: { text: "Some parent step" },
                    children: [
                        {
                            text: "The right one",
                            isTextualStep: true
                        }
                    ]
                },
                {
                    text: "My function",
                    isFunctionDeclaration: true,
                    parent: { text: "Some parent step" },
                    children: [
                        {
                            text: "The other right one",
                            isTextualStep: true
                        }
                    ]
                }
            ]);

            expect(functionDeclarations[0] === tree.root.children[0].children[1]).to.equal(true);
            expect(functionDeclarations[1] === tree.root.children[0].children[2]).to.equal(true);
        });

        it("finds all function declarations when multiple equivalent functions exist", () => {
            let tree = new Tree();
            tree.parseIn(`
My function

* My function
    First -

* My function
    Second -
`);

            let branchAbove = new Branch();
            let functionCall = new Step(tree.root.children[0].id);
            let functionDeclarations = tree.findFunctionDeclarations(functionCall, branchAbove);

            Comparer.expect(functionDeclarations).to.match([
                {
                    text: "My function",
                    isFunctionDeclaration: true,
                    parent: { indents: -1 },
                    children: [
                        {
                            text: "First",
                            isTextualStep: true
                        }
                    ]
                },
                {
                    text: "My function",
                    isFunctionDeclaration: true,
                    parent: { indents: -1 },
                    children: [
                        {
                            text: "Second",
                            isTextualStep: true
                        }
                    ]
                }
            ]);

            expect(functionDeclarations[0] === tree.root.children[1]).to.equal(true);
            expect(functionDeclarations[1] === tree.root.children[2]).to.equal(true);
        });

        it("finds all function declarations when multiple equivalent functions exist, both above and below", () => {
            let tree = new Tree();
            tree.parseIn(`
* My big function
    First -

My big function

* My big function
    Third -
`);

            let branchAbove = new Branch();
            let functionCall = new Step(tree.root.children[1].id);
            let functionDeclarations = tree.findFunctionDeclarations(functionCall, branchAbove);

            Comparer.expect(functionDeclarations).to.match([
                {
                    text: "My big function",
                    isFunctionDeclaration: true,
                    parent: { indents: -1 },
                    children: [
                        {
                            text: "First",
                            isTextualStep: true
                        }
                    ]
                },
                {
                    text: "My big function",
                    isFunctionDeclaration: true,
                    parent: { indents: -1 },
                    children: [
                        {
                            text: "Third",
                            isTextualStep: true
                        }
                    ]
                }
            ]);

            expect(functionDeclarations[0] === tree.root.children[0]).to.equal(true);
            expect(functionDeclarations[1] === tree.root.children[2]).to.equal(true);
        });

        it("finds the right function when a function call contains strings and variables", () => {
            let tree = new Tree();
            tree.parseIn(`
One {varA}   two   {{varB}} three [1st 'text' EF]

* Something else

* One {{var1}} two {{var2}}   three   {{var3}}
    Step one -

* Something else
`);

            let branchAbove = new Branch();
            let functionCall = new Step(tree.root.children[0].id);
            let functionDeclarations = tree.findFunctionDeclarations(functionCall, branchAbove);

            Comparer.expect(functionDeclarations).to.match([
                {
                    text: "One {{var1}} two {{var2}}   three   {{var3}}",
                    isFunctionDeclaration: true,
                    parent: { indents: -1 },
                    children: [
                        {
                            text: "Step one",
                            isTextualStep: true
                        }
                    ]
                }
            ]);

            expect(functionDeclarations[0] === tree.root.children[2]).to.equal(true);
        });

        it("finds the right function when a {var} = Func call contains strings and variables", () => {
            let tree = new Tree();
            tree.parseIn(`
{varC} = One {varA}   two   {{varB}} three [1st 'text' EF]

* Something else

* One {{var1}} two {{var2}}   three   {{var3}}
    Step one -

* Something else
`);

            let branchAbove = new Branch();
            let functionCall = new Step(tree.root.children[0].id);
            let functionDeclarations = tree.findFunctionDeclarations(functionCall, branchAbove);

            Comparer.expect(functionDeclarations).to.match([
                {
                    text: "One {{var1}} two {{var2}}   three   {{var3}}",
                    isFunctionDeclaration: true,
                    parent: { indents: -1 },
                    children: [
                        {
                            text: "Step one",
                            isTextualStep: true
                        }
                    ]
                }
            ]);

            expect(functionDeclarations[0] === tree.root.children[2]).to.equal(true);
        });

        it("finds the right function on a {var} = Func code block that returns a value", () => {
            let tree = new Tree();
            tree.parseIn(`
{varC} = One {varA}   two   {{varB}} three [1st 'text' EF]

* Something else

* One {{var1}} two {{var2}}   three   {{var3}} {
    code here
}

* Something else
`);

            let branchAbove = new Branch();
            let functionCall = new Step(tree.root.children[0].id);
            let functionDeclarations = tree.findFunctionDeclarations(functionCall, branchAbove);

            Comparer.expect(functionDeclarations).to.match([
                {
                    text: "One {{var1}} two {{var2}}   three   {{var3}}",
                    isFunctionDeclaration: true,
                    parent: { indents: -1 },
                    children: [],
                    codeBlock: '\n    code here'
                }
            ]);

            expect(functionDeclarations[0] === tree.root.children[2]).to.equal(true);
        });

        it("finds the right function when the function call and function declaration match case insensitively", () => {
            let tree = new Tree();
            tree.parseIn(`
My function

* my function
`, "file.txt");

            let branchAbove = new Branch();
            let functionCall = new Step(tree.root.children[0].id);
            let functionDeclarations = tree.findFunctionDeclarations(functionCall, branchAbove);

            Comparer.expect(functionDeclarations).to.match([
                {
                    text: "my function",
                    isFunctionDeclaration: true,
                    parent: { indents: -1 },
                    children: []
                }
            ]);

            expect(functionDeclarations[0] === tree.root.children[1]).to.equal(true);
        });

        it("finds the right function declarations across multiple files", () => {
            let tree = new Tree();
            tree.parseIn(`
* My function
    Other file 1 -
            `, "file1.txt");

            tree.parseIn(`
My function
            `, "file2.txt");

            tree.parseIn(`
* My function
    Other file 2 -
            `, "file3.txt");

            let branchAbove = new Branch();
            let functionCall = new Step(tree.root.children[1].id);
            let functionDeclarations = tree.findFunctionDeclarations(functionCall, branchAbove);

            Comparer.expect(functionDeclarations).to.match([
                {
                    text: "My function",
                    isFunctionDeclaration: true,
                    children: [ { text: "Other file 1" } ]
                },
                {
                    text: "My function",
                    isFunctionDeclaration: true,
                    children: [ { text: "Other file 2" } ]
                }
            ]);

            expect(functionDeclarations[0] === tree.root.children[0]).to.equal(true);
            expect(functionDeclarations[1] === tree.root.children[2]).to.equal(true);
        });

        it("rejects function calls that cannot be found", () => {
            let tree = new Tree();
            tree.parseIn(`
Function that doesn't exist

* Something else
`, "file.txt");

            let branchAbove = new Branch();
            let functionCall = new Step(tree.root.children[0].id);
            assert.throws(() => {
                tree.findFunctionDeclarations(functionCall, branchAbove);
            }, `The function \`Function that doesn't exist\` cannot be found. Is there a typo, or did you mean to make this a textual step (with a - at the end)?

Trace:
   Function that doesn't exist

 [file.txt:2]`);
        });

        it("rejects function calls to functions that were declared in a different scope", () => {
            let tree = new Tree();
            tree.parseIn(`
My function

Other scope -
    * My function
`, "file.txt");

            let branchAbove = new Branch();
            let functionCall = new Step(tree.root.children[0].id);

            assert.throws(() => {
                tree.findFunctionDeclarations(functionCall, branchAbove);
            }, `The function \`My function\` cannot be found. Is there a typo, or did you mean to make this a textual step (with a - at the end)?

Trace:
   My function

 [file.txt:2]`);

            tree = new Tree();
            tree.parseIn(`
One scope -
    My function

Other scope -
    * My function
`, "file.txt");

            branchAbove.steps = [
                new Step(tree.root.children[0].id)
            ];
            functionCall = new Step(tree.root.children[0].children[0].id);
            assert.throws(() => {
                tree.findFunctionDeclarations(functionCall, branchAbove);
            }, `The function \`My function\` cannot be found. Is there a typo, or did you mean to make this a textual step (with a - at the end)?

Trace:
   One scope
   My function

 [file.txt:3]`);
        });

        it("rejects function calls that cannot be found, when an anon function call is included in the trace", () => {
            let tree = new Tree();
            tree.parseIn(`
*
    Function that doesn't exist
*

* Something else
`, "file.txt");

            let branchAbove = new Branch();
            branchAbove.steps = [new Step(tree.root.children[1].id)];
            let functionCall = new Step(tree.root.children[0].children[0].id);
            assert.throws(() => {
                tree.findFunctionDeclarations(functionCall, branchAbove);
            }, `The function \`Function that doesn't exist\` cannot be found. Is there a typo, or did you mean to make this a textual step (with a - at the end)?

Trace:
   *
   Function that doesn't exist

 [file.txt:3]`);
        });
    });

    describe("equivalents()", () => {
        it("finds only itself", () => {
            let tree = new Tree();
            tree.parseIn(`
* F
            `);

            let equivalents = tree.equivalents(tree.root.children[0]); // * F

            Comparer.expect(equivalents).to.match([
                { text: "F", lineNumber: 2 }
            ]);
        });

        it("finds equivalents on one level", () => {
            let tree = new Tree();
            tree.parseIn(`
* F

* F
            `);

            let equivalents = tree.equivalents(tree.root.children[0]); // * F

            Comparer.expect(equivalents).to.match([
                { text: "F", lineNumber: 2 },
                { text: "F", lineNumber: 4 }
            ]);
        });

        it("finds equivalents on one level with a non-function-declaration parent", () => {
            let tree = new Tree();
            tree.parseIn(`
A -
    * F

    * F
            `);

            let equivalents = tree.equivalents(tree.root.children[0].children[1]); // * F

            Comparer.expect(equivalents).to.match([
                { text: "F", lineNumber: 3 },
                { text: "F", lineNumber: 5 }
            ]);
        });

        it("doesn't find equivalents amongst function declarations that are named the same but separated by parents", () => {
            let tree = new Tree();
            tree.parseIn(`
A -
    * F

A -
    * F
            `);

            let equivalents = tree.equivalents(tree.root.children[0].children[0]); // * F

            Comparer.expect(equivalents).to.match([
                { text: "F", lineNumber: 3 }
            ]);
        });

        it("finds as equivalents function declarations with code blocks", () => {
            let tree = new Tree();
            tree.parseIn(`
* F {
    one
}

* F {
    two
}
            `);

            let equivalents = tree.equivalents(tree.root.children[0]); // * F

            Comparer.expect(equivalents).to.match([
                { text: "F", lineNumber: 2 },
                { text: "F", lineNumber: 6 }
            ]);
        });

        it("finds equivalents on two levels", () => {
            let tree = new Tree();
            tree.parseIn(`
* F
    * G

    * H
        * G

    * G

* F
    * G
        * G

    * G
            `);

            let equivalents = tree.equivalents(tree.root.children[0].children[0]); // * G

            Comparer.expect(equivalents).to.match([
                { text: "G", lineNumber: 3 },
                { text: "G", lineNumber: 8 },
                { text: "G", lineNumber: 11 },
                { text: "G", lineNumber: 14 }
            ]);
        });

        it("finds equivalents on three levels", () => {
            let tree = new Tree();
            tree.parseIn(`
* F
    * G
        * H

        * H

    * G
        * H

        * I
            * H

        * H
* F
    * G
        * G
            * H

    * G

    * H

    * G
        * H
            `);

            let equivalents = tree.equivalents(tree.root.children[0].children[0].children[0]); // * H

            Comparer.expect(equivalents).to.match([
                { text: "H", lineNumber: 4 },
                { text: "H", lineNumber: 6 },
                { text: "H", lineNumber: 9 },
                { text: "H", lineNumber: 14 },
                { text: "H", lineNumber: 25 }
            ]);
        });
    });

    describe("validateVarSettingFunction()", () => {
        it("accepts function that has muliple branches in {x}='value' format", () => {
            let tree = new Tree();
            tree.parseIn(`
{var} = F

* F
    {x}='1'

    {x}='2'

    {x}=['3 {var}']
`);

            let functionCall = new Step(tree.root.children[0].id);
            functionCall.fid = tree.root.children[1].id;
            expect(tree.validateVarSettingFunction(functionCall)).to.equal(true);
        });

        it("accepts function that has muliple branches in {x}='value' or {x} = Function format and some are step blocks", () => {
            let tree = new Tree();
            tree.parseIn(`
{var} = F

* F
    {x}='1'

    {a}='2'
    {b}='3'
    {c}='4'

    {x}=[5]
    {x}=Function
`);

            let functionCall = new Step(tree.root.children[0].id);
            functionCall.fid = tree.root.children[1].id;
            expect(tree.validateVarSettingFunction(functionCall)).to.equal(true);
        });

        it("accepts function that has a code block", () => {
            let tree = new Tree();
            tree.parseIn(`
{var} = F

* F {
    code block
}
`);

            let functionCall = new Step(tree.root.children[0].id);
            functionCall.fid = tree.root.children[1].id;
            expect(tree.validateVarSettingFunction(functionCall)).to.equal(false);
        });

        it("rejects an empty function", () => {
            let tree = new Tree();
            tree.parseIn(`
{var} = F

* F
`, "file.txt");

            let functionCall = new Step(tree.root.children[0].id);
            functionCall.fid = tree.root.children[1].id;
            assert.throws(() => {
                tree.validateVarSettingFunction(functionCall);
            }, "You cannot use an empty function [file.txt:2]");
        });

        it("rejects function that doesn't have a code block, isn't a code block function, and isn't a branched function in {x}='value' format", () => {
            let tree = new Tree();
            tree.parseIn(`
{var} = F

* F
    {x}='1'

    Function name

    {x}='3'
`, "file.txt");

            let functionCall = new Step(tree.root.children[0].id);
            functionCall.fid = tree.root.children[1].id;

            assert.throws(() => {
                tree.validateVarSettingFunction(functionCall);
            }, "The function called at file.txt:2 must have all steps in its declaration be in format {x}='string' or {x}=Function (but file.txt:7 is not) [file.txt:2]");

            tree = new Tree();
            tree.parseIn(`
{var} = F

* F
    {x}='1'
    Function name
    {x}=[3]
`, "file.txt");

            functionCall = new Step(tree.root.children[0].id);
            functionCall.fid = tree.root.children[1].id;

            assert.throws(() => {
                tree.validateVarSettingFunction(functionCall);
            }, "The function called at file.txt:2 must have all steps in its declaration be in format {x}='string' or {x}=Function (but file.txt:6 is not) [file.txt:2]");
        });

        it("rejects function that has a code block, but also has children", () => {
            let tree = new Tree();
            tree.parseIn(`
{var} = F

* F {
    code block
}
    Child -
`, "file.txt");

            let functionCall = new Step(tree.root.children[0].id);
            functionCall.fid = tree.root.children[1].id;

            assert.throws(() => {
                tree.validateVarSettingFunction(functionCall);
            }, "The function called at file.txt:2 has a code block in its declaration (at file.txt:4) but that code block must not have any child steps [file.txt:2]");
        });

        it("rejects function that is in {x}='value' format, but also has children", () => {
            let tree = new Tree();
            tree.parseIn(`
{var} = F

* F
    {x}='1'

    {x}='2'
        Child -

    {x}='3'
`, "file.txt");

            let functionCall = new Step(tree.root.children[0].id);
            functionCall.fid = tree.root.children[1].id;

            assert.throws(() => {
                tree.validateVarSettingFunction(functionCall);
            }, "The function called at file.txt:2 must not have any steps in its declaration that have children of their own (but file.txt:7 does) [file.txt:2]");
        });
    });

    describe("branchify()", () => {
        context("generic tests", () => {
            it("handles an empty tree", () => {
                let tree = new Tree();
                tree.parseIn(``);

                let branches = tree.branchify(tree.root);
                expect(branches).to.have.lengthOf(0);
            });

            it("branchifies a textual-step-only tree with one branch", () => {
                let tree = new Tree();
                tree.parseIn(`
A -
    B -
        C -`);

                let branches = tree.branchify(tree.root);

                Comparer.expect(branches).to.match([
                    {
                        steps: [
                            { id: 2 },
                            { id: 3 },
                            { id: 4 }
                        ]
                    }
                ]);

                mergeStepNodesInBranches(tree, branches);

                Comparer.expect(branches).to.match([
                    {
                        steps: [
                            {
                                text: "A",
                                level: 0
                            },
                            {
                                text: "B",
                                level: 0
                            },
                            {
                                text: "C",
                                level: 0
                            }
                        ]
                    }
                ]);
            });

            it("branchifies a textual-step-only tree with multiple branches", () => {
                let tree = new Tree();
                tree.parseIn(`
A -
    B -

        C -

        D -

    E -

    F -

        G -
H -
                `);

                let branches = tree.branchify(tree.root);
                mergeStepNodesInBranches(tree, branches);

                Comparer.expect(branches).to.match([
                    {
                        steps: [
                            { text: "A", level: 0 },
                            { text: "B", level: 0 },
                            { text: "C", level: 0 }
                        ]
                    },
                    {
                        steps: [
                            { text: "A", level: 0 },
                            { text: "B", level: 0 },
                            { text: "D", level: 0 }
                        ]
                    },
                    {
                        steps: [
                            { text: "A", level: 0 },
                            { text: "E", level: 0 }
                        ]
                    },
                    {
                        steps: [
                            { text: "A", level: 0 },
                            { text: "F", level: 0 },
                            { text: "G", level: 0 }
                        ]
                    },
                    {
                        steps: [
                            { text: "H", level: 0 }
                        ]
                    }
                ]);
            });

            it("branchifies a textual-step-only tree with multiple branches and containing step blocks", () => {
                let tree = new Tree();
                tree.parseIn(`
A -
    B -

        C -

        D -

    E -
    F -

        G -
H -
                `);

                let branches = tree.branchify(tree.root);
                mergeStepNodesInBranches(tree, branches);

                Comparer.expect(branches).to.match([
                    {
                        steps: [
                            { text: "A", level: 0 },
                            { text: "B", level: 0 },
                            { text: "C", level: 0 }
                        ]
                    },
                    {
                        steps: [
                            { text: "A", level: 0 },
                            { text: "B", level: 0 },
                            { text: "D", level: 0 }
                        ]
                    },
                    {
                        steps: [
                            { text: "A", level: 0 },
                            { text: "E", level: 0 },
                            { text: "G", level: 0 }
                        ]
                    },
                    {
                        steps: [
                            { text: "A", level: 0 },
                            { text: "F", level: 0 },
                            { text: "G", level: 0 }
                        ]
                    },
                    {
                        steps: [
                            { text: "H", level: 0 }
                        ]
                    }
                ]);
            });

            it("connects branches via nonParallelIds when ! is set", () => {
                let tree = new Tree();
                tree.parseIn(`
A -
    B -

    C - !

        D -
            E -

        F -

G -
                `);

                let branches = tree.branchify(tree.root);
                mergeStepNodesInBranches(tree, branches);

                let nonParallelId = branches[1].nonParallelIds[0];

                Comparer.expect(branches).to.match([
                    {
                        steps: [ { text: "A" }, { text: "B" } ],
                        nonParallelIds: undefined
                    },
                    {
                        steps: [ { text: "A" }, { text: "C" }, { text: "D" }, { text: "E" } ],
                        nonParallelIds: [nonParallelId]
                    },
                    {
                        steps: [ { text: "A" }, { text: "C" }, { text: "F" } ],
                        nonParallelIds: [nonParallelId]
                    },
                    {
                        steps: [ { text: "G" } ],
                        nonParallelIds: undefined
                    }
                ]);
            });

            it("connects branches via nonParallelIds when ! is set on a function declaration", () => {
                let tree = new Tree();
                tree.parseIn(`
* F !
    A -

F

F
                `);

                let branches = tree.branchify(tree.root);
                mergeStepNodesInBranches(tree, branches);

                let nonParallelId = branches[0].nonParallelIds[0];

                Comparer.expect(branches).to.match([
                    {
                        steps: [ { text: "F" }, { text: "A" } ],
                        nonParallelIds: [nonParallelId, nonParallelId]
                    },
                    {
                        steps: [ { text: "F" }, { text: "A" } ],
                        nonParallelIds: [nonParallelId, nonParallelId]
                    }
                ]);
            });

            it("connects branches via nonParallelIds when !! is set on a function declaration", () => {
                let tree = new Tree();
                tree.parseIn(`
* F !!
    A -

F

F
                `);

                let branches = tree.branchify(tree.root);
                mergeStepNodesInBranches(tree, branches);

                let nonParallelId = branches[0].nonParallelIds[0];

                Comparer.expect(branches).to.match([
                    {
                        steps: [ { text: "F" }, { text: "A" } ],
                        nonParallelIds: [nonParallelId, nonParallelId]
                    },
                    {
                        steps: [ { text: "F" }, { text: "A" } ],
                        nonParallelIds: [nonParallelId, nonParallelId]
                    }
                ]);
            });

            it("handles two steps with !, one a descendant of the other", () => {
                let tree = new Tree();
                tree.parseIn(`
A -
    B -

    C - !

        D ! -
            E -
            H -

        F -

G -
                `);

                let branches = tree.branchify(tree.root);
                mergeStepNodesInBranches(tree, branches);

                Comparer.expect(branches).to.match([
                    {
                        steps: [ { text: "A" }, { text: "B" } ],
                        nonParallelIds: undefined
                    },
                    {
                        steps: [ { text: "A" }, { text: "C" }, { text: "D" }, { text: "E" } ],
                        nonParallelIds: { $typeof: 'array', $length: 2 }
                    },
                    {
                        steps: [ { text: "A" }, { text: "C" }, { text: "D" }, { text: "H" } ],
                        nonParallelIds: { $typeof: 'array', $length: 2 }
                    },
                    {
                        steps: [ { text: "A" }, { text: "C" }, { text: "F" } ],
                        nonParallelIds: { $typeof: 'array', $length: 1 }
                    },
                    {
                        steps: [ { text: "G" } ],
                        nonParallelIds: undefined
                    }
                ]);
            });

            it("handles branches with both ! and !!", () => {
                let tree = new Tree();
                tree.parseIn(`
A -
    B -

    C - !

        D !! -
            E -
            H -

        F -

G -
                `);

                let branches = tree.branchify(tree.root);
                mergeStepNodesInBranches(tree, branches);

                Comparer.expect(branches).to.match([
                    {
                        steps: [ { text: "A" }, { text: "B" } ],
                        nonParallelIds: undefined
                    },
                    {
                        steps: [ { text: "A" }, { text: "C" }, { text: "D" }, { text: "E" } ],
                        nonParallelIds: { $typeof: 'array', $length: 2 }
                    },
                    {
                        steps: [ { text: "A" }, { text: "C" }, { text: "D" }, { text: "H" } ],
                        nonParallelIds: { $typeof: 'array', $length: 2 }
                    },
                    {
                        steps: [ { text: "A" }, { text: "C" }, { text: "F" } ],
                        nonParallelIds: { $typeof: 'array', $length: 1 }
                    },
                    {
                        steps: [ { text: "G" } ],
                        nonParallelIds: undefined
                    }
                ]);
            });

            it("ignores !! when noCondNonParallel is set", () => {
                let tree = new Tree();
                tree.parseIn(`
A -
    B -

    C - !

        D !! -
            E -
            H -

        F -

G -
                `);

                tree.noCondNonParallel = true;
                let branches = tree.branchify(tree.root);
                mergeStepNodesInBranches(tree, branches);

                Comparer.expect(branches).to.match([
                    {
                        steps: [ { text: "A" }, { text: "B" } ],
                        nonParallelIds: undefined
                    },
                    {
                        steps: [ { text: "A" }, { text: "C" }, { text: "D" }, { text: "E" } ],
                        nonParallelIds: { $typeof: 'array', $length: 1 }
                    },
                    {
                        steps: [ { text: "A" }, { text: "C" }, { text: "D" }, { text: "H" } ],
                        nonParallelIds: { $typeof: 'array', $length: 1 }
                    },
                    {
                        steps: [ { text: "A" }, { text: "C" }, { text: "F" } ],
                        nonParallelIds: { $typeof: 'array', $length: 1 }
                    },
                    {
                        steps: [ { text: "G" } ],
                        nonParallelIds: undefined
                    }
                ]);
            });

            it("handles two sibling steps with !", () => {
                let tree = new Tree();
                tree.parseIn(`
A -
    B - !

    C - !

        D -
            E -

        F -

G -
                `);

                let branches = tree.branchify(tree.root);
                mergeStepNodesInBranches(tree, branches);

                let nonParallelId0 = branches[0].nonParallelIds[0];
                let nonParallelId1 = branches[1].nonParallelIds[0];
                expect(nonParallelId0).to.not.equal(nonParallelId1);

                Comparer.expect(branches).to.match([
                    {
                        steps: [ { text: "A" }, { text: "B" } ],
                        nonParallelIds: [nonParallelId0]
                    },
                    {
                        steps: [ { text: "A" }, { text: "C" }, { text: "D" }, { text: "E" } ],
                        nonParallelIds: [nonParallelId1]
                    },
                    {
                        steps: [ { text: "A" }, { text: "C" }, { text: "F" } ],
                        nonParallelIds: [nonParallelId1]
                    },
                    {
                        steps: [ { text: "G" } ],
                        nonParallelIds: undefined
                    }
                ]);
            });

            // Skipped because it runs slow and we don't need to run it each time
            it.skip("throws an exception when there's an infinite loop among function calls", function() { // function() needed for this.timeout() to work
                this.timeout(10000);

                let tree = new Tree();
                tree.parseIn(`
A

* A
    B

* B
    A
                `, "file.txt");

                assert.throws(() => {
                    tree.branchify(tree.root);
                }, "Maximum call stack size exceeded");
            });

            it("throws an exception if noDebug is set but a $ is present in a branch", () => {
                let tree = new Tree();
                tree.parseIn(`
A -
    $ B -
                `, "file.txt");

                assert.throws(() => {
                    tree.noDebug = true;
                    tree.branchify(tree.root);
                }, "A $ was found, but the no-debug flag is set [file.txt:3]");
            });

            it("throws an exception if noDebug is set but a ~ is present in a branch", () => {
                let tree = new Tree();
                tree.parseIn(`
A -
    ~ B -
                `, "file.txt");

                assert.throws(() => {
                    tree.noDebug = true;
                    tree.branchify(tree.root);
                }, "A ~ was found, but the no-debug flag is set [file.txt:3]");
            });

            it("throws an exception if noDebug is set but a ~~ is present in a branch", () => {
                let tree = new Tree();
                tree.parseIn(`
A -
    ~~ B -
                `, "file.txt");

                assert.throws(() => {
                    tree.noDebug = true;
                    tree.branchify(tree.root);
                }, "A ~~ was found, but the no-debug flag is set [file.txt:3]");
            });

            it("marks as packaged hooks that are packaged", () => {
                let tree = new Tree();
                tree.parseIn(`
A -

*** Before Everything {
    K
}
                `, "file1.txt", false);

                tree.parseIn(`
*** Before Everything {
    B
}

*** After Everything {
    C
}

*** After Every Branch {
    D
}

*** After Every Step {
    E
}

*** Before Every Branch {
    F
}

*** Before Every Step {
    G
}
                `, "file2.txt", true);

                let branches = tree.branchify(tree.root);
                mergeStepNodesInBranches(tree, branches);

                Comparer.expect(branches).to.match([
                    {
                        steps: [ { text: "A" } ],
                        beforeEveryBranch: [
                            { text: "Before Every Branch", codeBlock: "\n    F", isPackaged: true }
                        ],
                        afterEveryBranch: [
                            { text: "After Every Branch", codeBlock: "\n    D", isPackaged: true }
                        ],
                        beforeEveryStep: [
                            { text: "Before Every Step", codeBlock: "\n    G", isPackaged: true }
                        ],
                        afterEveryStep: [
                            { text: "After Every Step", codeBlock: "\n    E", isPackaged: true }
                        ]
                    }
                ]);

                mergeStepNodes(tree, tree.beforeEverything);
                mergeStepNodes(tree, tree.afterEverything);

                Comparer.expect(tree).to.match({
                    beforeEverything: [
                        { text: "Before Everything", codeBlock: "\n    B", isPackaged: true },
                        { text: "Before Everything", codeBlock: "\n    K", isPackaged: undefined }
                    ],
                    afterEverything: [
                        { text: "After Everything", codeBlock: "\n    C", isPackaged: true }
                    ]
                });
            });
        });

        context("functions", () => {
            context("generic functions tests", () => {
                it("branchifies a function call with no children, whose function declaration has no children", () => {
                    let tree = new Tree();
                    tree.parseIn(`
F

* F
                    `);

                    let branches = tree.branchify(tree.root);
                    mergeStepNodesInBranches(tree, branches);

                    Comparer.expect(branches).to.match([
                        {
                            steps: [
                                {
                                    text: "F",
                                    isFunctionCall: true,
                                    isFunctionDeclaration: undefined,
                                    level: 0,
                                    fid: { $typeof: 'number' }
                                }
                            ]
                        }
                    ]);
                });

                it("branchifies a function call with no children, whose function declaration has one branch", () => {
                    let tree = new Tree();
                    tree.parseIn(`
F

* F
    A -
                    `);

                    let branches = tree.branchify(tree.root);
                    mergeStepNodesInBranches(tree, branches);

                    Comparer.expect(branches).to.match([
                        {
                            steps: [
                                {
                                    text: "F",
                                    isFunctionCall: true,
                                    isFunctionDeclaration: undefined,
                                    level: 0,
                                    fid: { $typeof: 'number' }
                                },
                                {
                                    text: "A",
                                    isFunctionCall: undefined,
                                    isFunctionDeclaration: undefined,
                                    isTextualStep: true,
                                    level: 1,
                                    fid: undefined
                                }
                            ]
                        }
                    ]);
                });

                it("branchifies a function call surrounded by brackets", () => {
                    let tree = new Tree();
                    tree.parseIn(`
F

* F [
    A -
]
                    `);

                    let branches = tree.branchify(tree.root);
                    mergeStepNodesInBranches(tree, branches);

                    Comparer.expect(branches).to.match([
                        {
                            steps: [
                                {
                                    text: "F",
                                    isFunctionCall: true,
                                    isFunctionDeclaration: undefined,
                                    level: 0,
                                    fid: { $typeof: 'number' }
                                },
                                {
                                    text: "A",
                                    isFunctionCall: undefined,
                                    isFunctionDeclaration: undefined,
                                    isTextualStep: true,
                                    level: 1,
                                    fid: undefined
                                }
                            ]
                        }
                    ]);
                });

                it("branchifies a function call surrounded by brackets, declared in context", () => {
                    let tree = new Tree();
                    tree.parseIn(`
F
    G

* F [
    A -
]
    * G [
        B -
    ]
                    `);

                    let branches = tree.branchify(tree.root);
                    mergeStepNodesInBranches(tree, branches);

                    Comparer.expect(branches).to.match([
                        {
                            steps: [
                                {
                                    text: "F",
                                    isFunctionCall: true,
                                    isFunctionDeclaration: undefined,
                                    level: 0,
                                    fid: { $typeof: 'number' }
                                },
                                {
                                    text: "A",
                                    isFunctionCall: undefined,
                                    isFunctionDeclaration: undefined,
                                    isTextualStep: true,
                                    level: 1,
                                    fid: undefined
                                },
                                {
                                    text: "G",
                                    isFunctionCall: true,
                                    isFunctionDeclaration: undefined,
                                    level: 0,
                                    fid: { $typeof: 'number' }
                                },
                                {
                                    text: "B",
                                    isFunctionCall: undefined,
                                    isFunctionDeclaration: undefined,
                                    isTextualStep: true,
                                    level: 1,
                                    fid: undefined
                                }
                            ]
                        }
                    ]);
                });

                it("branchifies a function call surrounded by brackets, declared in context, more complex example", () => {
                    let tree = new Tree();
                    tree.parseIn(`
F
    G
        H

* F [
    A -
]
    * G [
        B -
    ]

    * H [
        C -
    ]
                    `);

                    let branches = tree.branchify(tree.root);
                    mergeStepNodesInBranches(tree, branches);

                    Comparer.expect(branches).to.match([
                        {
                            steps: [
                                {
                                    text: "F",
                                    isFunctionCall: true,
                                    isFunctionDeclaration: undefined,
                                    level: 0,
                                    fid: { $typeof: 'number' }
                                },
                                {
                                    text: "A",
                                    isFunctionCall: undefined,
                                    isFunctionDeclaration: undefined,
                                    isTextualStep: true,
                                    level: 1,
                                    fid: undefined
                                },
                                {
                                    text: "G",
                                    isFunctionCall: true,
                                    isFunctionDeclaration: undefined,
                                    level: 0,
                                    fid: { $typeof: 'number' }
                                },
                                {
                                    text: "B",
                                    isFunctionCall: undefined,
                                    isFunctionDeclaration: undefined,
                                    isTextualStep: true,
                                    level: 1,
                                    fid: undefined
                                },
                                {
                                    text: "H",
                                    isFunctionCall: true,
                                    isFunctionDeclaration: undefined,
                                    level: 0,
                                    fid: { $typeof: 'number' }
                                },
                                {
                                    text: "C",
                                    isFunctionCall: undefined,
                                    isFunctionDeclaration: undefined,
                                    isTextualStep: true,
                                    level: 1,
                                    fid: undefined
                                }
                            ]
                        }
                    ]);
                });

                it("doesn't expand a textual step that has the same text as a function declaration", () => {
                    let tree = new Tree();
                    tree.parseIn(`
F -

* F
    A -
                    `);

                    let branches = tree.branchify(tree.root);
                    mergeStepNodesInBranches(tree, branches);

                    Comparer.expect(branches).to.match([
                        {
                            steps: [
                                {
                                    text: "F",
                                    isFunctionCall: undefined,
                                    isFunctionDeclaration: undefined,
                                    isTextualStep: true,
                                    level: 0
                                }
                            ]
                        }
                    ]);
                });

                it("branchifies a function call with no children, whose function declaration has multiple branches", () => {
                    let tree = new Tree();
                    tree.parseIn(`
F

* F
    A -
        B -
    C -
                    `);

                    let branches = tree.branchify(tree.root);
                    mergeStepNodesInBranches(tree, branches);

                    Comparer.expect(branches).to.match([
                        {
                            steps: [
                                {
                                    text: "F",
                                    isFunctionCall: true,
                                    isFunctionDeclaration: undefined,
                                    level: 0,
                                    fid: { $typeof: 'number' }
                                },
                                {
                                    text: "A",
                                    isFunctionCall: undefined,
                                    isFunctionDeclaration: undefined,
                                    isTextualStep: true,
                                    level: 1,
                                    fid: undefined
                                },
                                {
                                    text: "B",
                                    isFunctionCall: undefined,
                                    isFunctionDeclaration: undefined,
                                    isTextualStep: true,
                                    level: 1,
                                    fid: undefined
                                }
                            ]
                        },
                        {
                            steps: [
                                {
                                    text: "F",
                                    isFunctionCall: true,
                                    isFunctionDeclaration: undefined,
                                    level: 0,
                                    fid: { $typeof: 'number' }
                                },
                                {
                                    text: "C",
                                    isFunctionCall: undefined,
                                    isFunctionDeclaration: undefined,
                                    isTextualStep: true,
                                    level: 1,
                                    fid: undefined
                                }
                            ]
                        }
                    ]);
                });

                it("handles a function declaration as an only child", () => {
                    let tree = new Tree();
                    tree.parseIn(`
A -
    * F
        B -
                    `);

                    let branches = tree.branchify(tree.root);
                    mergeStepNodesInBranches(tree, branches);

                    Comparer.expect(branches).to.match([
                        {
                            steps: [ { text: "A" } ]
                        }
                    ]);
                });

                it("handles a function declaration as an only child to a step block", () => {
                    let tree = new Tree();
                    tree.parseIn(`
A -
B -

    * F
        C -
                    `);

                    let branches = tree.branchify(tree.root);
                    mergeStepNodesInBranches(tree, branches);

                    Comparer.expect(branches).to.match([
                        {
                            steps: [ { text: "A" } ]
                        },
                        {
                            steps: [ { text: "B" } ]
                        }
                    ]);
                });

                it("rejects a function call to a child function declaration", () => {
                    let tree = new Tree();
                    tree.parseIn(`
F
    * F
        B -
                    `, "file.txt");

                    assert.throws(() => {
                        tree.branchify(tree.root);
                    }, `The function \`F\` cannot be found. Is there a typo, or did you mean to make this a textual step (with a - at the end)?

Trace:
   F

 [file.txt:2]`);
                });

                it("branchifies a function call with children, whose function declaration has no children", () => {
                    let tree = new Tree();
                    tree.parseIn(`
F
    A -
        B -

* F
                    `);

                    let branches = tree.branchify(tree.root);
                    mergeStepNodesInBranches(tree, branches);

                    Comparer.expect(branches).to.match([
                        {
                            steps: [
                                {
                                    text: "F",
                                    isFunctionCall: true,
                                    isFunctionDeclaration: undefined,
                                    level: 0,
                                    fid: { $typeof: 'number' }
                                },
                                {
                                    text: "A",
                                    isFunctionCall: undefined,
                                    isFunctionDeclaration: undefined,
                                    isTextualStep: true,
                                    level: 0,
                                    fid: undefined
                                },
                                {
                                    text: "B",
                                    isFunctionCall: undefined,
                                    isFunctionDeclaration: undefined,
                                    isTextualStep: true,
                                    level: 0,
                                    fid: undefined
                                }
                            ]
                        }
                    ]);
                });

                it("branchifies a function call where both the function declaration above, and the function call above, have child function declarations of the same name", () => {
                    let tree = new Tree();
                    tree.parseIn(`
A
    F

    * F
        D -

* A
    * F
        C -
                    `);

                    let branches = tree.branchify(tree.root);
                    mergeStepNodesInBranches(tree, branches);

                    Comparer.expect(branches).to.match([
                        {
                            steps: [ { text: "A" }, { text: "F" }, { text: "D" } ]
                        }
                    ]);
                });

                it("branchifies a function call with children, whose function declaration has one branch", () => {
                    let tree = new Tree();
                    tree.parseIn(`
F
    C -
        D -

* F
    A -
        B -
                    `);

                    let branches = tree.branchify(tree.root);
                    mergeStepNodesInBranches(tree, branches);

                    Comparer.expect(branches).to.match([
                        {
                            steps: [
                                {
                                    text: "F",
                                    isFunctionCall: true,
                                    isFunctionDeclaration: undefined,
                                    level: 0,
                                    fid: { $typeof: 'number' }
                                },
                                {
                                    text: "A",
                                    isFunctionCall: undefined,
                                    isFunctionDeclaration: undefined,
                                    isTextualStep: true,
                                    level: 1,
                                    fid: undefined
                                },
                                {
                                    text: "B",
                                    isFunctionCall: undefined,
                                    isFunctionDeclaration: undefined,
                                    isTextualStep: true,
                                    level: 1,
                                    fid: undefined
                                },
                                {
                                    text: "C",
                                    isFunctionCall: undefined,
                                    isFunctionDeclaration: undefined,
                                    isTextualStep: true,
                                    level: 0,
                                    fid: undefined
                                },
                                {
                                    text: "D",
                                    isFunctionCall: undefined,
                                    isFunctionDeclaration: undefined,
                                    isTextualStep: true,
                                    level: 0,
                                    fid: undefined
                                }
                            ]
                        }
                    ]);
                });

                it("branchifies a function call with children, whose function declaration has multiple branches", () => {
                    let tree = new Tree();
                    tree.parseIn(`
F
    C -
        D -

* F
    A -
        B -
    E -
                    `);

                    let branches = tree.branchify(tree.root);
                    mergeStepNodesInBranches(tree, branches);

                    Comparer.expect(branches).to.match([
                        {
                            steps: [
                                {
                                    text: "F",
                                    isFunctionCall: true,
                                    isFunctionDeclaration: undefined,
                                    level: 0,
                                    fid: { $typeof: 'number' }
                                },
                                {
                                    text: "A",
                                    isFunctionCall: undefined,
                                    isFunctionDeclaration: undefined,
                                    isTextualStep: true,
                                    level: 1,
                                    fid: undefined
                                },
                                {
                                    text: "B",
                                    isFunctionCall: undefined,
                                    isFunctionDeclaration: undefined,
                                    isTextualStep: true,
                                    level: 1,
                                    fid: undefined
                                },
                                {
                                    text: "C",
                                    isFunctionCall: undefined,
                                    isFunctionDeclaration: undefined,
                                    isTextualStep: true,
                                    level: 0,
                                    fid: undefined
                                },
                                {
                                    text: "D",
                                    isFunctionCall: undefined,
                                    isFunctionDeclaration: undefined,
                                    isTextualStep: true,
                                    level: 0,
                                    fid: undefined
                                }
                            ]
                        },
                        {
                            steps: [
                                {
                                    text: "F",
                                    isFunctionCall: true,
                                    isFunctionDeclaration: undefined,
                                    level: 0,
                                    fid: { $typeof: 'number' }
                                },
                                {
                                    text: "E",
                                    isFunctionCall: undefined,
                                    isFunctionDeclaration: undefined,
                                    isTextualStep: true,
                                    level: 1,
                                    fid: undefined
                                },
                                {
                                    text: "C",
                                    isFunctionCall: undefined,
                                    isFunctionDeclaration: undefined,
                                    isTextualStep: true,
                                    level: 0,
                                    fid: undefined
                                },
                                {
                                    text: "D",
                                    isFunctionCall: undefined,
                                    isFunctionDeclaration: undefined,
                                    isTextualStep: true,
                                    level: 0,
                                    fid: undefined
                                }
                            ]
                        }
                    ]);
                });

                it("branchifies a function call with multiple branches within a function call with multiple branches", () => {
                    let tree = new Tree();
                    tree.parseIn(`
F
    C -
        D -
    G -

* F
    A -
        B -
    E -
                    `);

                    let branches = tree.branchify(tree.root);
                    mergeStepNodesInBranches(tree, branches);

                    Comparer.expect(branches).to.match([
                        {
                            steps: [
                                {
                                    text: "F",
                                    isFunctionCall: true,
                                    isFunctionDeclaration: undefined,
                                    level: 0,
                                    fid: { $typeof: 'number' }
                                },
                                {
                                    text: "A",
                                    isFunctionCall: undefined,
                                    isFunctionDeclaration: undefined,
                                    isTextualStep: true,
                                    level: 1,
                                    fid: undefined
                                },
                                {
                                    text: "B",
                                    isFunctionCall: undefined,
                                    isFunctionDeclaration: undefined,
                                    isTextualStep: true,
                                    level: 1,
                                    fid: undefined
                                },
                                {
                                    text: "C",
                                    isFunctionCall: undefined,
                                    isFunctionDeclaration: undefined,
                                    isTextualStep: true,
                                    level: 0,
                                    fid: undefined
                                },
                                {
                                    text: "D",
                                    isFunctionCall: undefined,
                                    isFunctionDeclaration: undefined,
                                    isTextualStep: true,
                                    level: 0,
                                    fid: undefined
                                }
                            ]
                        },
                        {
                            steps: [
                                {
                                    text: "F",
                                    isFunctionCall: true,
                                    isFunctionDeclaration: undefined,
                                    level: 0,
                                    fid: { $typeof: 'number' }
                                },
                                {
                                    text: "A",
                                    isFunctionCall: undefined,
                                    isFunctionDeclaration: undefined,
                                    isTextualStep: true,
                                    level: 1,
                                    fid: undefined
                                },
                                {
                                    text: "B",
                                    isFunctionCall: undefined,
                                    isFunctionDeclaration: undefined,
                                    isTextualStep: true,
                                    level: 1,
                                    fid: undefined
                                },
                                {
                                    text: "G",
                                    isFunctionCall: undefined,
                                    isFunctionDeclaration: undefined,
                                    isTextualStep: true,
                                    level: 0,
                                    fid: undefined
                                }
                            ]
                        },
                        {
                            steps: [
                                {
                                    text: "F",
                                    isFunctionCall: true,
                                    isFunctionDeclaration: undefined,
                                    level: 0,
                                    fid: { $typeof: 'number' }
                                },
                                {
                                    text: "E",
                                    isFunctionCall: undefined,
                                    isFunctionDeclaration: undefined,
                                    isTextualStep: true,
                                    level: 1,
                                    fid: undefined
                                },
                                {
                                    text: "C",
                                    isFunctionCall: undefined,
                                    isFunctionDeclaration: undefined,
                                    isTextualStep: true,
                                    level: 0,
                                    fid: undefined
                                },
                                {
                                    text: "D",
                                    isFunctionCall: undefined,
                                    isFunctionDeclaration: undefined,
                                    isTextualStep: true,
                                    level: 0,
                                    fid: undefined
                                }
                            ]
                        },
                        {
                            steps: [
                                {
                                    text: "F",
                                    isFunctionCall: true,
                                    isFunctionDeclaration: undefined,
                                    level: 0,
                                    fid: { $typeof: 'number' }
                                },
                                {
                                    text: "E",
                                    isFunctionCall: undefined,
                                    isFunctionDeclaration: undefined,
                                    isTextualStep: true,
                                    level: 1,
                                    fid: undefined
                                },
                                {
                                    text: "G",
                                    isFunctionCall: undefined,
                                    isFunctionDeclaration: undefined,
                                    isTextualStep: true,
                                    level: 0,
                                    fid: undefined
                                }
                            ]
                        }
                    ]);
                });

                it("branchifies a function call with multiple branches within a function call with multiple branches, where each function declaration is surrounded by brackets", () => {
                    let tree = new Tree();
                    tree.parseIn(`
F
    C -
        D -
    G -

* F [
    * A [
        B -
    ]

    A
    E -
]
                    `);

                    let branches = tree.branchify(tree.root);
                    mergeStepNodesInBranches(tree, branches);

                    Comparer.expect(branches).to.match([
                        {
                            steps: [
                                {
                                    text: "F",
                                    isFunctionCall: true,
                                    isFunctionDeclaration: undefined,
                                    level: 0,
                                    fid: { $typeof: 'number' }
                                },
                                {
                                    text: "A",
                                    isFunctionCall: true,
                                    isFunctionDeclaration: undefined,
                                    level: 1,
                                    fid: { $typeof: 'number' }
                                },
                                {
                                    text: "B",
                                    isFunctionCall: undefined,
                                    isFunctionDeclaration: undefined,
                                    isTextualStep: true,
                                    level: 2,
                                    fid: undefined
                                },
                                {
                                    text: "C",
                                    isFunctionCall: undefined,
                                    isFunctionDeclaration: undefined,
                                    isTextualStep: true,
                                    level: 0,
                                    fid: undefined
                                },
                                {
                                    text: "D",
                                    isFunctionCall: undefined,
                                    isFunctionDeclaration: undefined,
                                    isTextualStep: true,
                                    level: 0,
                                    fid: undefined
                                }
                            ]
                        },
                        {
                            steps: [
                                {
                                    text: "F",
                                    isFunctionCall: true,
                                    isFunctionDeclaration: undefined,
                                    level: 0,
                                    fid: { $typeof: 'number' }
                                },
                                {
                                    text: "A",
                                    isFunctionCall: true,
                                    isFunctionDeclaration: undefined,
                                    level: 1,
                                    fid: { $typeof: 'number' }
                                },
                                {
                                    text: "B",
                                    isFunctionCall: undefined,
                                    isFunctionDeclaration: undefined,
                                    isTextualStep: true,
                                    level: 2,
                                    fid: undefined
                                },
                                {
                                    text: "G",
                                    isFunctionCall: undefined,
                                    isFunctionDeclaration: undefined,
                                    isTextualStep: true,
                                    level: 0,
                                    fid: undefined
                                }
                            ]
                        },
                        {
                            steps: [
                                {
                                    text: "F",
                                    isFunctionCall: true,
                                    isFunctionDeclaration: undefined,
                                    level: 0,
                                    fid: { $typeof: 'number' }
                                },
                                {
                                    text: "E",
                                    isFunctionCall: undefined,
                                    isFunctionDeclaration: undefined,
                                    isTextualStep: true,
                                    level: 1,
                                    fid: undefined
                                },
                                {
                                    text: "C",
                                    isFunctionCall: undefined,
                                    isFunctionDeclaration: undefined,
                                    isTextualStep: true,
                                    level: 0,
                                    fid: undefined
                                },
                                {
                                    text: "D",
                                    isFunctionCall: undefined,
                                    isFunctionDeclaration: undefined,
                                    isTextualStep: true,
                                    level: 0,
                                    fid: undefined
                                }
                            ]
                        },
                        {
                            steps: [
                                {
                                    text: "F",
                                    isFunctionCall: true,
                                    isFunctionDeclaration: undefined,
                                    level: 0,
                                    fid: { $typeof: 'number' }
                                },
                                {
                                    text: "E",
                                    isFunctionCall: undefined,
                                    isFunctionDeclaration: undefined,
                                    isTextualStep: true,
                                    level: 1,
                                    fid: undefined
                                },
                                {
                                    text: "G",
                                    isFunctionCall: undefined,
                                    isFunctionDeclaration: undefined,
                                    isTextualStep: true,
                                    level: 0,
                                    fid: undefined
                                }
                            ]
                        }
                    ]);
                });

                it("branchifies multiple function calls in the tree", () => {
                    let tree = new Tree();
                    tree.parseIn(`
* FC
    FA
        C -

FA
    FB
        D -
    * FB
        B1 -
        B2 -
FC

* FA

    A -

* FB    // never called
    X -
                    `);

                    let branches = tree.branchify(tree.root);
                    mergeStepNodesInBranches(tree, branches);

                    Comparer.expect(branches).to.match([
                        {
                            steps: [
                                {
                                    text: "FA",
                                    level: 0
                                },
                                {
                                    text: "A",
                                    level: 1
                                },
                                {
                                    text: "FB",
                                    level: 0
                                },
                                {
                                    text: "B1",
                                    level: 1
                                },
                                {
                                    text: "D",
                                    level: 0
                                },
                            ]
                        },
                        {
                            steps: [
                                {
                                    text: "FA",
                                    level: 0
                                },
                                {
                                    text: "A",
                                    level: 1
                                },
                                {
                                    text: "FB",
                                    level: 0
                                },
                                {
                                    text: "B2",
                                    level: 1
                                },
                                {
                                    text: "D",
                                    level: 0
                                },
                            ]
                        },
                        {
                            steps: [
                                {
                                    text: "FC",
                                    level: 0
                                },
                                {
                                    text: "FA",
                                    level: 1
                                },
                                {
                                    text: "A",
                                    level: 2
                                },
                                {
                                    text: "C",
                                    level: 1
                                }
                            ]
                        }
                    ]);
                });

                it("branchifies a function call declared within a function call", () => {
                    let tree = new Tree();
                    tree.parseIn(`
* FA
    * FB
        B -

FA

FA
    FB

* FB // never called
    X
                    `);
                    // A call to FA makes FB accessible to its children

                    let branches = tree.branchify(tree.root);
                    mergeStepNodesInBranches(tree, branches);

                    Comparer.expect(branches).to.match([
                        {
                            steps: [
                                {
                                    text: "FA",
                                    level: 0
                                }
                            ]
                        },
                        {
                            steps: [
                                {
                                    text: "FA",
                                    level: 0
                                },
                                {
                                    text: "FB",
                                    level: 0
                                },
                                {
                                    text: "B",
                                    level: 1
                                }
                            ]
                        }
                    ]);
                });

                it("if function B is declared within function A, and A is called, the children of the call to A will be able to call B", () => {
                    let tree = new Tree();
                    tree.parseIn(`
* A
    * B
        C -

A
    B
                    `);

                    let branches = tree.branchify(tree.root);
                    mergeStepNodesInBranches(tree, branches);

                    Comparer.expect(branches).to.match([
                        {
                            steps: [
                                {
                                    text: "A",
                                    level: 0
                                },
                                {
                                    text: "B",
                                    level: 0
                                },
                                {
                                    text: "C",
                                    level: 1
                                }
                            ]
                        }
                    ]);
                });

                it("marks function declarations that are called at least once", () => {
                    let tree = new Tree();
                    tree.parseIn(`
F

* F
    A -

* G
    B -
                    `);

                    tree.branchify(tree.root);

                    Comparer.expect(tree.root).to.match({
                        children: [
                            {
                                text: "F",
                                isFunctionDeclaration: undefined,
                                used: true

                            },
                            {
                                text: "F",
                                isFunctionDeclaration: true,
                                used: true,
                                children: [
                                    {
                                        text: "A",
                                        used: true
                                    }
                                ]
                            },
                            {
                                text: "G",
                                isFunctionDeclaration: true,
                                used: undefined,
                                children: [
                                    {
                                        text: "B",
                                        used: undefined
                                    }
                                ]
                            }
                        ]
                    });
                });
            });

            context("functions calling themselves", () => {
                it("doesn't allow a function to call itself", () => {
                    let tree = new Tree();
                    tree.parseIn(`
F

* F
    F
                    `, "file.txt");

                    assert.throws(() => {
                        tree.branchify(tree.root);
                    }, `The function \`F\` cannot be found. Is there a typo, or did you mean to make this a textual step (with a - at the end)?

Trace:
   F
   F

 [file.txt:5]`);
                });

                it("doesn't allow a function to call itself but finds a function with the same name beyond", () => {
                    let tree = new Tree();
                    tree.parseIn(`
- Test
    F

    * F
        F

* F
    A -
                    `, "file.txt");

                    let branches = tree.branchify(tree.root);
                    mergeStepNodesInBranches(tree, branches);

                    Comparer.expect(branches).to.match([
                        {
                            steps: [
                                { text: "Test", lineNumber: 2 },
                                { text: "F", lineNumber: 3 },
                                { text: "F", lineNumber: 6 },
                                { text: "A", lineNumber: 9 }
                            ]
                        }
                    ]);
                });

                it("doesn't allow a function to call itself and finds a function with the same name beyond, more complex example", () => {
                    let tree = new Tree();
                    tree.parseIn(`
Start browser
    Nav to page

* Start browser
    Starting browser -

    * Nav to page
        Specific nav to page -
            Nav to page

* Nav to page
    Generic nav to page -
                    `, "file.txt");

                    let branches = tree.branchify(tree.root);
                    mergeStepNodesInBranches(tree, branches);

                    Comparer.expect(branches).to.match([
                        {
                            steps: [
                                { text: 'Start browser' },
                                { text: 'Starting browser' },
                                { text: 'Nav to page' },
                                { text: 'Specific nav to page' },
                                { text: 'Nav to page' },
                                { text: 'Generic nav to page' }
                            ]
                        }
                    ]);
                });

                it("doesn't allow a function to call itself, with a private function, and finds a function with the same name beyond", () => {
                    let tree = new Tree();
                    tree.parseIn(`
Start browser

* Start browser
    Starting browser -
        Nav to page

    ** Nav to page
        Specific nav to page -
            Nav to page

* Nav to page
    Generic nav to page -
                    `, "file.txt");

                    let branches = tree.branchify(tree.root);
                    mergeStepNodesInBranches(tree, branches);

                    Comparer.expect(branches).to.match([
                        {
                            steps: [
                                { text: 'Start browser' },
                                { text: 'Starting browser' },
                                { text: 'Nav to page' },
                                { text: 'Specific nav to page' },
                                { text: 'Nav to page' },
                                { text: 'Generic nav to page' }
                            ]
                        }
                    ]);
                });

                it("doesn't allow a function to call itself and finds a function with the same name beyond, slightly more complex example", () => {
                    let tree = new Tree();
                    tree.parseIn(`
* On special cart page
    On cart page
        Validate special cart stuff -

        * Clear cart
            Specific stuff -
                Clear cart

* On cart page
    * Clear cart
        Generic stuff -

On special cart page
    Clear cart
                    `, "file.txt");

                    let branches = tree.branchify(tree.root);
                    mergeStepNodesInBranches(tree, branches);

                    Comparer.expect(branches).to.match([
                        {
                            steps: [
                                { text: 'On special cart page' },
                                { text: 'On cart page' },
                                { text: 'Validate special cart stuff' },
                                { text: 'Clear cart' },
                                { text: 'Specific stuff' },
                                { text: 'Clear cart' },
                                { text: 'Generic stuff' }
                            ]
                        }
                    ]);
                });

                it("doesn't allow a function to call itself and finds a function with the same name beyond, most complex example", () => {
                    let tree = new Tree();
                    tree.parseIn(`
A
    F
        F
            F

* A
    * F
        * F
            * F
                Specific -
                    F

* F
    Generic -
                    `, "file.txt");

                    let branches = tree.branchify(tree.root);
                    mergeStepNodesInBranches(tree, branches);

                    Comparer.expect(branches).to.match([
                        {
                            steps: [
                                { text: 'A' },
                                { text: 'F' },
                                { text: 'F' },
                                { text: 'F' },
                                { text: 'Specific' },
                                { text: 'F' },
                                { text: 'Generic' }
                            ]
                        }
                    ]);
                });
            });

            context("functions declared within functions", () => {
                it("allows access to a function declared within a function", () => {
                    let tree = new Tree();
                    tree.parseIn(`
F
    H

* F
    * G
        * H
            One -

    G
                    `, "file.txt");

                    let branches = tree.branchify(tree.root);
                    mergeStepNodesInBranches(tree, branches);

                    Comparer.expect(branches).to.match([
                        {
                            steps: [
                                { text: 'F' },
                                { text: 'G' },
                                { text: 'H' },
                                { text: 'One' }
                            ]
                        }
                    ]);

                    tree = new Tree();
                    tree.parseIn(`
* F
    * G
        * H
            One -

    G

F
    H
                    `, "file.txt");

                    branches = tree.branchify(tree.root);
                    mergeStepNodesInBranches(tree, branches);

                    Comparer.expect(branches).to.match([
                        {
                            steps: [
                                { text: 'F' },
                                { text: 'G' },
                                { text: 'H' },
                                { text: 'One' }
                            ]
                        }
                    ]);
                });

                it("allows access to a function declared within a function, inside sequential steps", () => {
                    let tree = new Tree();
                    tree.parseIn(`
* F
    * G
        H -

- Seq ..
    F
    G
                    `, "file.txt");

                    let branches = tree.branchify(tree.root);
                    mergeStepNodesInBranches(tree, branches);

                    Comparer.expect(branches).to.match([
                        {
                            steps: [
                                { text: 'Seq' },
                                { text: 'F' },
                                { text: 'G' },
                                { text: 'H' }
                            ]
                        }
                    ]);
                });

                it("allows access to a function declared within a function, inside a sequential function", () => {
                    let tree = new Tree();
                    tree.parseIn(`
* F
    * G
        H -

* Seq ..
    F
    G

Seq
                    `, "file.txt");

                    let branches = tree.branchify(tree.root);
                    mergeStepNodesInBranches(tree, branches);

                    Comparer.expect(branches).to.match([
                        {
                            steps: [
                                { text: 'Seq' },
                                { text: 'F' },
                                { text: 'G' },
                                { text: 'H' }
                            ]
                        }
                    ]);
                });

                it("calls a private function it has access to", () => {
                    let tree = new Tree();
                    tree.parseIn(`
F

* F
    Private

    ** Private
        A -
                    `, "file.txt");

                    let branches = tree.branchify(tree.root);
                    mergeStepNodesInBranches(tree, branches);

                    Comparer.expect(branches).to.match([
                        {
                            steps: [
                                { text: 'F' },
                                { text: 'Private' },
                                { text: 'A' }
                            ]
                        }
                    ]);
                });

                it("doesn't allow a function to call a private function it doesn't have access to", () => {
                    let tree = new Tree();
                    tree.parseIn(`
Start browser
    Nav to page

* Start browser
    Starting browser -

    ** Nav to page
        Specific nav to page -

* Nav to page
    Generic nav to page -
                    `, "file.txt");

                    let branches = tree.branchify(tree.root);
                    mergeStepNodesInBranches(tree, branches);

                    Comparer.expect(branches).to.match([
                        {
                            steps: [
                                { text: 'Start browser' },
                                { text: 'Starting browser' },
                                { text: 'Nav to page' },
                                { text: 'Generic nav to page' }
                            ]
                        }
                    ]);
                });
            });

            context("equivalent function declarations", () => {
                it("handles empty equivalent function declarations", () => {
                    let tree = new Tree();
                    tree.parseIn(`
A
    B

* A
    * B
                    `);

                    let branches = tree.branchify(tree.root);
                    mergeStepNodesInBranches(tree, branches);

                    Comparer.expect(branches).to.match([
                        {
                            steps: [
                                { text: "A" },
                                { text: "B" }
                            ]
                        }
                    ]);
                });

                it("handles equivalent function declarations", () => {
                    let tree = new Tree();
                    tree.parseIn(`
F
    * F
        Three -

* F
    One -

* F
    Two -
                    `, "file.txt");

                    let branches = tree.branchify(tree.root);
                    mergeStepNodesInBranches(tree, branches);

                    Comparer.expect(branches).to.match([
                        {
                            steps: [
                                { text: 'F' },
                                { text: 'One' }
                            ]
                        },
                        {
                            steps: [
                                { text: 'F' },
                                { text: 'Two' }
                            ]
                        }
                    ]);
                });

                it("handles multiple levels of equivalent function declarations", () => {
                    let tree = new Tree();
                    tree.parseIn(`
F
    G

* F
    * G
        One -

* F
    * G
        Two -
                    `, "file.txt");

                    let branches = tree.branchify(tree.root);
                    mergeStepNodesInBranches(tree, branches);

                    Comparer.expect(branches).to.match([
                        {
                            steps: [
                                { text: 'F' },
                                { text: 'G' },
                                { text: 'One' }
                            ]
                        },
                        {
                            steps: [
                                { text: 'F' },
                                { text: 'G' },
                                { text: 'Two' }
                            ]
                        }
                    ]);
                });

                it("handles equivalent function declarations containing code blocks", () => {
                    let tree = new Tree();
                    tree.parseIn(`
F

* F {
    one
}

* F {
    two
}
                    `, "file.txt");

                    let branches = tree.branchify(tree.root);
                    mergeStepNodesInBranches(tree, branches);

                    Comparer.expect(branches).to.match([
                        {
                            steps: [
                                { text: 'F', codeBlock: '\n    one' }
                            ]
                        },
                        {
                            steps: [
                                { text: 'F', codeBlock: '\n    two' }
                            ]
                        }
                    ]);
                });

                it("handles multiple levels of equivalent function declarations, more complex example", () => {
                    let tree = new Tree();
                    tree.parseIn(`
F
    G

* F
    * G
        One -
    * G
        Two -

* F
    * G
        Three -
    * G
        Four -
                    `, "file.txt");

                    let branches = tree.branchify(tree.root);
                    mergeStepNodesInBranches(tree, branches);

                    Comparer.expect(branches).to.match([
                        {
                            steps: [
                                { text: 'F' },
                                { text: 'G' },
                                { text: 'One' }
                            ]
                        },
                        {
                            steps: [
                                { text: 'F' },
                                { text: 'G' },
                                { text: 'Two' }
                            ]
                        },
                        {
                            steps: [
                                { text: 'F' },
                                { text: 'G' },
                                { text: 'Three' }
                            ]
                        },
                        {
                            steps: [
                                { text: 'F' },
                                { text: 'G' },
                                { text: 'Four' }
                            ]
                        }
                    ]);
                });

                it("handles multiple levels of equivalent function declarations, more complex example 2", () => {
                    let tree = new Tree();
                    tree.parseIn(`
F
    H
        G

* F
    * G
        One -
    * G
        Two -

* F
    * G
        Three -
    * G
        Four -

* H
    J -
                    `, "file.txt");

                    let branches = tree.branchify(tree.root);
                    mergeStepNodesInBranches(tree, branches);

                    Comparer.expect(branches).to.match([
                        {
                            steps: [
                                { text: 'F' },
                                { text: 'H' },
                                { text: 'J' },
                                { text: 'G' },
                                { text: 'One' }
                            ]
                        },
                        {
                            steps: [
                                { text: 'F' },
                                { text: 'H' },
                                { text: 'J' },
                                { text: 'G' },
                                { text: 'Two' }
                            ]
                        },
                        {
                            steps: [
                                { text: 'F' },
                                { text: 'H' },
                                { text: 'J' },
                                { text: 'G' },
                                { text: 'Three' }
                            ]
                        },
                        {
                            steps: [
                                { text: 'F' },
                                { text: 'H' },
                                { text: 'J' },
                                { text: 'G' },
                                { text: 'Four' }
                            ]
                        }
                    ]);
                });

                it("handles multiple levels of equivalent function declarations, most complex example", () => {
                    let tree = new Tree();
                    tree.parseIn(`
F
    G
        H

* F
    * G
        * H
            One -
    * G
        * H
            Two -
        * H
            Three -
        * J
            Zero -

* F
    * G
        * H
            Four -
        * H
            Five -
        * H
            Six -

    * G
        * H
            Seven -
                    `, "file.txt");

                    let branches = tree.branchify(tree.root);
                    mergeStepNodesInBranches(tree, branches);

                    Comparer.expect(branches).to.match([
                        {
                            steps: [
                                { text: 'F' },
                                { text: 'G' },
                                { text: 'H' },
                                { text: 'One' }
                            ]
                        },
                        {
                            steps: [
                                { text: 'F' },
                                { text: 'G' },
                                { text: 'H' },
                                { text: 'Two' }
                            ]
                        },
                        {
                            steps: [
                                { text: 'F' },
                                { text: 'G' },
                                { text: 'H' },
                                { text: 'Three' }
                            ]
                        },
                        {
                            steps: [
                                { text: 'F' },
                                { text: 'G' },
                                { text: 'H' },
                                { text: 'Four' }
                            ]
                        },
                        {
                            steps: [
                                { text: 'F' },
                                { text: 'G' },
                                { text: 'H' },
                                { text: 'Five' }
                            ]
                        },
                        {
                            steps: [
                                { text: 'F' },
                                { text: 'G' },
                                { text: 'H' },
                                { text: 'Six' }
                            ]
                        },
                        {
                            steps: [
                                { text: 'F' },
                                { text: 'G' },
                                { text: 'H' },
                                { text: 'Seven' }
                            ]
                        }
                    ]);
                });

                it("doesn't allow a function calling itself to call its equivalents", () => {
                    let tree = new Tree();
                    tree.parseIn(`
F

* F
    F

* F
    Sibling that won't be called -
                    `, "file.txt");

                    assert.throws(() => {
                        tree.branchify(tree.root);
                    }, `The function \`F\` cannot be found. Is there a typo, or did you mean to make this a textual step (with a - at the end)?

Trace:
   F
   F

 [file.txt:5]`);
                });

                it("handles equivalent function declarations above the function call", () => {
                    let tree = new Tree();
                    tree.parseIn(`
Test -
    F

* F
    One -

* F
    Two -
                    `, "file.txt");

                    let branches = tree.branchify(tree.root);
                    mergeStepNodesInBranches(tree, branches);

                    Comparer.expect(branches).to.match([
                        {
                            steps: [
                                { text: 'Test' },
                                { text: 'F' },
                                { text: 'One' }
                            ]
                        },
                        {
                            steps: [
                                { text: 'Test' },
                                { text: 'F' },
                                { text: 'Two' }
                            ]
                        }
                    ]);
                });

                it("finds the right function declaration when there are equivalent function declarations", () => {
                    let tree = new Tree();
                    tree.parseIn(`
Desktop
    On cart page

* Desktop
    * On homepage
        One -

* Mobile
    * On homepage
        Two -

* Desktop
    * On cart page
        Three -

* Mobile
    * On cart page
        Four -
                    `, "file.txt");

                    let branches = tree.branchify(tree.root);
                    mergeStepNodesInBranches(tree, branches);

                    Comparer.expect(branches).to.match([
                        {
                            steps: [
                                { text: 'Desktop' },
                                { text: 'On cart page' },
                                { text: 'Three' }
                            ]
                        }
                    ]);
                });

                it("handles a function calling itself, but does not allow it to call itself or one of its equivalents", () => {
                    let tree = new Tree();
                    tree.parseIn(`
A -
    B -
        F

    * F
        One -
            F

    * F
        Two -

* F
    Three -

* F
    Four -
                    `, "file.txt");

                    let branches = tree.branchify(tree.root);
                    mergeStepNodesInBranches(tree, branches);

                    Comparer.expect(branches).to.match([
                        {
                            steps: [
                                { text: 'A' },
                                { text: 'B' },
                                { text: 'F' },
                                { text: 'One' },
                                { text: 'F' },
                                { text: 'Three' }

                            ]
                        },
                        {
                            steps: [
                                { text: 'A' },
                                { text: 'B' },
                                { text: 'F' },
                                { text: 'One' },
                                { text: 'F' },
                                { text: 'Four' }

                            ]
                        },
                        {
                            steps: [
                                { text: 'A' },
                                { text: 'B' },
                                { text: 'F' },
                                { text: 'Two' }
                            ]
                        }
                    ]);
                });

                it("handles a function calling itself, but does not allow it to call itself or one of its equivalents, more complex example", () => {
                    let tree = new Tree();
                    tree.parseIn(`
A -
    B -
        F

    * F
        One -
            F

    * F
        Two -
            F

* F
    Three -

* F
    Four -
                    `, "file.txt");

                    let branches = tree.branchify(tree.root);
                    mergeStepNodesInBranches(tree, branches);

                    Comparer.expect(branches).to.match([
                        {
                            steps: [
                                { text: 'A' },
                                { text: 'B' },
                                { text: 'F' },
                                { text: 'One' },
                                { text: 'F' },
                                { text: 'Three' }

                            ]
                        },
                        {
                            steps: [
                                { text: 'A' },
                                { text: 'B' },
                                { text: 'F' },
                                { text: 'One' },
                                { text: 'F' },
                                { text: 'Four' }

                            ]
                        },
                        {
                            steps: [
                                { text: 'A' },
                                { text: 'B' },
                                { text: 'F' },
                                { text: 'Two' },
                                { text: 'F' },
                                { text: 'Three' }
                            ]
                        },
                        {
                            steps: [
                                { text: 'A' },
                                { text: 'B' },
                                { text: 'F' },
                                { text: 'Two' },
                                { text: 'F' },
                                { text: 'Four' }
                            ]
                        }
                    ]);
                });

                it("chooses the function declaration with the more specific context", () => {
                    let tree = new Tree();
                    tree.parseIn(`
* A
    * B
        * C
            One -

* A
    * C
        Two -

A
    B
        C
                    `, "file.txt");

                    let branches = tree.branchify(tree.root);
                    mergeStepNodesInBranches(tree, branches);

                    Comparer.expect(branches).to.match([
                        {
                            steps: [
                                { text: 'A' },
                                { text: 'B' },
                                { text: 'C' },
                                { text: 'One' }
                            ]
                        }
                    ]);

                    tree = new Tree();
                    tree.parseIn(`
* A
    * B
        * C
            One -

* B
    * C
        Two -

A
    B
        C
                    `, "file.txt");

                    branches = tree.branchify(tree.root);
                    mergeStepNodesInBranches(tree, branches);

                    Comparer.expect(branches).to.match([
                        {
                            steps: [
                                { text: 'A' },
                                { text: 'B' },
                                { text: 'C' },
                                { text: 'One' }
                            ]
                        }
                    ]);
                });

                it("chooses the right function declaration with contexts of equal specificity", () => {
                    let tree = new Tree();
                    tree.parseIn(`
* A
    * B
        * D
            One -

* A
    * C
        * D
            Two -

A
    B
        C
            D
                    `, "file.txt");

                    let branches = tree.branchify(tree.root);
                    mergeStepNodesInBranches(tree, branches);

                    Comparer.expect(branches).to.match([
                        {
                            steps: [
                                { text: 'A' },
                                { text: 'B' },
                                { text: 'C' },
                                { text: 'D' },
                                { text: 'Two' }
                            ]
                        }
                    ]);
                });

                it("chooses the correctly ordered function declaration with contexts of equal specificity", () => {
                    let tree = new Tree();
                    tree.parseIn(`
* A
    * B
        * C
            One -

* B
    * A
        * C
            Two -

A
    B
        C
                    `, "file.txt");

                    let branches = tree.branchify(tree.root);
                    mergeStepNodesInBranches(tree, branches);

                    Comparer.expect(branches).to.match([
                        {
                            steps: [
                                { text: 'A' },
                                { text: 'B' },
                                { text: 'C' },
                                { text: 'One' }
                            ]
                        }
                    ]);
                });

                it("chooses both function declarations with equal contexts", () => {
                    let tree = new Tree();
                    tree.parseIn(`
* A
    * B
        * C
            One -

* A
    * B
        * C
            Two -

A
    B
        C
                    `, "file.txt");

                    let branches = tree.branchify(tree.root);
                    mergeStepNodesInBranches(tree, branches);

                    Comparer.expect(branches).to.match([
                        {
                            steps: [
                                { text: 'A' },
                                { text: 'B' },
                                { text: 'C' },
                                { text: 'One' }
                            ]
                        },
                        {
                            steps: [
                                { text: 'A' },
                                { text: 'B' },
                                { text: 'C' },
                                { text: 'Two' }
                            ]
                        }
                    ]);
                });
            });

            context("skipped steps", () => {
                it("doesn't expand functions under a -s", () => {
                    let tree = new Tree();
                    tree.parseIn(`
A -s
B

    C -
    D -

* A
    F -

* B
    G -
                    `);

                    let branches = tree.branchify(tree.root);
                    mergeStepNodesInBranches(tree, branches);

                    Comparer.expect(branches).to.match([
                        { steps: [ { text: "A" }, { text: "C" } ] },
                        { steps: [ { text: "A" }, { text: "D" } ] },
                        { steps: [ { text: "B" }, { text: "G" }, { text: "C" } ] },
                        { steps: [ { text: "B" }, { text: "G" }, { text: "D" } ] },
                    ]);
                });

                it("expands functions under a .s", () => {
                    let tree = new Tree();
                    tree.parseIn(`
A .s
B

    C -
    D -

        E

* A
    * E
        F -

* B
    * E
        G -
                    `);

                    let branches = tree.branchify(tree.root);
                    mergeStepNodesInBranches(tree, branches);

                    Comparer.expect(branches).to.match([
                        { steps: [ { text: "A" }, { text: "C" }, { text: "E" }, { text: "F" } ] },
                        { steps: [ { text: "A" }, { text: "D" }, { text: "E" }, { text: "F" } ] },
                        { steps: [ { text: "B" }, { text: "C" }, { text: "E" }, { text: "G" } ] },
                        { steps: [ { text: "B" }, { text: "D" }, { text: "E" }, { text: "G" } ] },
                    ]);
                });

                it("expands functions under a $s", () => {
                    let tree = new Tree();
                    tree.parseIn(`
A $s
B

    C -
    D -

        E

* A
    * E
        F -

* B
    * E
        G -
                    `);

                    let branches = tree.branchify(tree.root);
                    mergeStepNodesInBranches(tree, branches);

                    Comparer.expect(branches).to.match([
                        { steps: [ { text: "A" }, { text: "C" }, { text: "E" }, { text: "F" } ] },
                        { steps: [ { text: "A" }, { text: "D" }, { text: "E" }, { text: "F" } ] },
                        { steps: [ { text: "B" }, { text: "C" }, { text: "E" }, { text: "G" } ] },
                        { steps: [ { text: "B" }, { text: "D" }, { text: "E" }, { text: "G" } ] },
                    ]);
                });
            });

            context("multi-level step blocks", () => {
                it("branchifies a multi-level step block", () => {
                    let tree = new Tree();
                    tree.parseIn(`
A -
    [
        B -
    ]
        C -
                    `);

                    let branches = tree.branchify(tree.root);
                    mergeStepNodesInBranches(tree, branches);

                    Comparer.expect(branches).to.match([
                        {
                            steps: [
                                { text: 'A', level: 0 },
                                { text: ' ', level: 0 },
                                { text: 'B', level: 1 },
                                { text: 'C', level: 0 }
                            ]
                        }
                    ]);
                });

                it("branchifies nested multi-level step blocks", () => {
                    let tree = new Tree();
                    tree.parseIn(`
A -
    B -
        [
            C -
                D -
                H -

                    [
                        E -
                            F -
                    ]
            G -
        ]
            I -
                J -

                    `);

                    let branches = tree.branchify(tree.root);
                    mergeStepNodesInBranches(tree, branches);

                    Comparer.expect(branches).to.match([
                        {
                            steps: [
                                { text: 'A', level: 0 },
                                { text: 'B', level: 0 },
                                { text: ' ', level: 0 },
                                { text: 'C', level: 1 },
                                { text: 'D', level: 1 },
                                { text: ' ', level: 1 },
                                { text: 'E', level: 2 },
                                { text: 'F', level: 2 },
                                { text: 'I', level: 0 },
                                { text: 'J', level: 0 }
                            ]
                        },
                        {
                            steps: [
                                { text: 'A', level: 0 },
                                { text: 'B', level: 0 },
                                { text: ' ', level: 0 },
                                { text: 'C', level: 1 },
                                { text: 'H', level: 1 },
                                { text: ' ', level: 1 },
                                { text: 'E', level: 2 },
                                { text: 'F', level: 2 },
                                { text: 'I', level: 0 },
                                { text: 'J', level: 0 }
                            ]
                        },
                        {
                            steps: [
                                { text: 'A', level: 0 },
                                { text: 'B', level: 0 },
                                { text: ' ', level: 0 },
                                { text: 'G', level: 1 },
                                { text: 'I', level: 0 },
                                { text: 'J', level: 0 }
                            ]
                        }
                    ]);
                });

                it("branchifies a named multi-level step block", () => {
                    let tree = new Tree();
                    tree.parseIn(`
A -
    F [
        B -
    ]
        C -
                    `);

                    let branches = tree.branchify(tree.root);
                    mergeStepNodesInBranches(tree, branches);

                    Comparer.expect(branches).to.match([
                        {
                            steps: [
                                { text: 'A', level: 0 },
                                { text: 'F', level: 0 },
                                { text: 'B', level: 1 },
                                { text: 'C', level: 0 }
                            ]
                        }
                    ]);
                });

                it("handles a multi-level step block with ..", () => {
                    let tree = new Tree();
                    tree.parseIn(`
.. [
    A -
        B -
            C -
]
                    `);

                    let branches = tree.branchify(tree.root);
                    mergeStepNodesInBranches(tree, branches);

                    Comparer.expect(branches).to.match([
                        {
                            steps: [
                                { text: ' ', level: 0 },
                                { text: 'A', level: 1 },
                                { text: 'B', level: 1 },
                                { text: 'C', level: 1 }
                            ]
                        }
                    ]);
                });

                it("handles a multi-level step block with a comment on the top [", () => {
                    let tree = new Tree();
                    tree.parseIn(`
[//comment
    A -
]
                    `);

                    let branches = tree.branchify(tree.root);
                    mergeStepNodesInBranches(tree, branches);

                    Comparer.expect(branches).to.match([
                        {
                            steps: [
                                { text: ' ', level: 0 },
                                { text: 'A', level: 1 },
                            ]
                        }
                    ]);
                });

                it("handles a multi-level step block with a comment on the bottom ]", () => {
                    let tree = new Tree();
                    tree.parseIn(`
[
    A -
]//comment
                    `);

                    let branches = tree.branchify(tree.root);
                    mergeStepNodesInBranches(tree, branches);

                    Comparer.expect(branches).to.match([
                        {
                            steps: [
                                { text: ' ', level: 0 },
                                { text: 'A', level: 1 },
                            ]
                        }
                    ]);
                });
            });
        });

        context("{vars}", () => {
            it("branchifies {var} = F where F has muliple branches in {x}='value' format", () => {
                let tree = new Tree();
                tree.parseIn(`
{var} = F

* F
    {x}='1'

    {x}='2'
    {x}=''
    {x}="3"

    {a}='4'
                `);
                let branches = tree.branchify(tree.root);
                mergeStepNodesInBranches(tree, branches);

                Comparer.expect(branches).to.match([
                    {
                        steps: [
                            {
                                text: "{var} = F",
                                isFunctionCall: true,
                                level: 0
                            },
                            {
                                text: "{var}='1'",
                                isFunctionCall: undefined,
                                level: 1
                            }
                        ]
                    },
                    {
                        steps: [
                            {
                                text: "{var} = F",
                                isFunctionCall: true,
                                level: 0
                            },
                            {
                                text: "{var}='2'",
                                isFunctionCall: undefined,
                                level: 1
                            }
                        ]
                    },
                    {
                        steps: [
                            {
                                text: "{var} = F",
                                isFunctionCall: true,
                                level: 0
                            },
                            {
                                text: "{var}=''",
                                isFunctionCall: undefined,
                                level: 1
                            }
                        ]
                    },
                    {
                        steps: [
                            {
                                text: "{var} = F",
                                isFunctionCall: true,
                                level: 0
                            },
                            {
                                text: "{var}=\"3\"",
                                isFunctionCall: undefined,
                                level: 1
                            }
                        ]
                    },
                    {
                        steps: [
                            {
                                text: "{var} = F",
                                isFunctionCall: true,
                                level: 0
                            },
                            {
                                text: "{var}='4'",
                                isFunctionCall: undefined,
                                level: 1
                            }
                        ]
                    }
                ]);
            });

            it("branchifies {var} = F where it has children and F has muliple branches in {x}='value' format", () => {
                let tree = new Tree();
                tree.parseIn(`
{var} = F
    G -

* F
    {x}='1'

    {x}='2'
    {x}=''
    {x}="3"

    {a}='4'
                `);
                let branches = tree.branchify(tree.root);
                mergeStepNodesInBranches(tree, branches);

                Comparer.expect(branches).to.match([
                    {
                        steps: [
                            {
                                text: "{var} = F",
                                isFunctionCall: true,
                                level: 0
                            },
                            {
                                text: "{var}='1'",
                                isFunctionCall: undefined,
                                level: 1
                            },
                            {
                                text: "G",
                                isFunctionCall: undefined,
                                level: 0
                            }
                        ]
                    },
                    {
                        steps: [
                            {
                                text: "{var} = F",
                                isFunctionCall: true,
                                level: 0
                            },
                            {
                                text: "{var}='2'",
                                isFunctionCall: undefined,
                                level: 1
                            },
                            {
                                text: "G",
                                isFunctionCall: undefined,
                                level: 0
                            }
                        ]
                    },
                    {
                        steps: [
                            {
                                text: "{var} = F",
                                isFunctionCall: true,
                                level: 0
                            },
                            {
                                text: "{var}=''",
                                isFunctionCall: undefined,
                                level: 1
                            },
                            {
                                text: "G",
                                isFunctionCall: undefined,
                                level: 0
                            }
                        ]
                    },
                    {
                        steps: [
                            {
                                text: "{var} = F",
                                isFunctionCall: true,
                                level: 0
                            },
                            {
                                text: "{var}=\"3\"",
                                isFunctionCall: undefined,
                                level: 1
                            },
                            {
                                text: "G",
                                isFunctionCall: undefined,
                                level: 0
                            }
                        ]
                    },
                    {
                        steps: [
                            {
                                text: "{var} = F",
                                isFunctionCall: true,
                                level: 0
                            },
                            {
                                text: "{var}='4'",
                                isFunctionCall: undefined,
                                level: 1
                            },
                            {
                                text: "G",
                                isFunctionCall: undefined,
                                level: 0
                            }
                        ]
                    }
                ]);
            });

            it("branchifies {var} = F where F has a code block", () => {
                let tree = new Tree();
                tree.parseIn(`
{var} = F

* F {
    code block
}
                `);
                let branches = tree.branchify(tree.root);
                mergeStepNodesInBranches(tree, branches);

                Comparer.expect(branches).to.match([
                    {
                        steps: [
                            {
                                text: "{var} = F",
                                isFunctionCall: true,
                                level: 0
                            }
                        ]
                    }
                ]);

                Comparer.expect(tree.stepNodeIndex[branches[0].steps[0].fid]).to.match({
                    codeBlock: '\n    code block'
                });
            });

            it("branchifies {var} = F ..", () => {
                let tree = new Tree();
                tree.parseIn(`
{var} = F ..
    A -

* F
    {x}='1'
    {x}='2'
    {x}='3'
                `);
                let branches = tree.branchify(tree.root);
                mergeStepNodesInBranches(tree, branches);

                Comparer.expect(branches).to.match([
                    {
                        steps: [
                            { text: "{var} = F" },
                            { text: "{var}='1'" },
                            { text: "A" },

                            { text: "{var} = F" },
                            { text: "{var}='2'" },
                            { text: "A" },

                            { text: "{var} = F" },
                            { text: "{var}='3'" },
                            { text: "A" },
                        ]
                    }
                ]);
            });

            it("branchifies {var} = F under a .. step", () => {
                let tree = new Tree();
                tree.parseIn(`
S - ..
    {var} = F ..
        A -

* F
    {x}='1'
    {x}='2'
    {x}='3'
                `);
                let branches = tree.branchify(tree.root);
                mergeStepNodesInBranches(tree, branches);

                Comparer.expect(branches).to.match([
                    {
                        steps: [
                            { text: "S" },

                            { text: "{var} = F" },
                            { text: "{var}='1'" },
                            { text: "A" },

                            { text: "{var} = F" },
                            { text: "{var}='2'" },
                            { text: "A" },

                            { text: "{var} = F" },
                            { text: "{var}='3'" },
                            { text: "A" },
                        ]
                    }
                ]);
            });

            it("branchifies {var} = F .. that has more {var} = F inside of it", () => {
                let tree = new Tree();
                tree.parseIn(`
{var} = F ..
    {var2}='0'

* F
    {x}='1'
    {x}=F2
    {x}='4'
    {x}=F3

* F2
    {y}='2'
    {y}='3'

* F3 {
    return '5';
}
                `);
                let branches = tree.branchify(tree.root);
                mergeStepNodesInBranches(tree, branches);

                Comparer.expect(branches).to.match([
                    {
                        steps: [
                            { text: "{var} = F" },
                            { text: "{var}='1'" },
                            { text: "{var2}='0'" },

                            { text: "{var} = F" },
                            { text: "{var}=F2" },
                            { text: "{var}='2'" },
                            { text: "{var2}='0'" },

                            { text: "{var} = F" },
                            { text: "{var}=F2" },
                            { text: "{var}='3'" },
                            { text: "{var2}='0'" },

                            { text: "{var} = F" },
                            { text: "{var}='4'" },
                            { text: "{var2}='0'" },

                            { text: "{var} = F" },
                            { text: "{var}=F3" },
                            { text: "{var2}='0'" },
                        ]
                    }
                ]);

                expect(tree.stepNodeIndex[branches[0].steps[15].fid].codeBlock).to.equal("\n    return '5';");
            });

            it("branchifies {var} = F that has more {var} = F inside of it", () => {
                let tree = new Tree();
                tree.parseIn(`
{var} = F
    {var2}='0'

* F
    {x}='1'
    {x}=F2
    {x}='4'
    {x}=F3

* F2
    {y}='2'
    {y}='3'

* F3 {
    return '5';
}
                `);
                let branches = tree.branchify(tree.root);
                mergeStepNodesInBranches(tree, branches);

                Comparer.expect(branches).to.match([
                    {
                        steps: [
                            { text: "{var} = F" },
                            { text: "{var}='1'" },
                            { text: "{var2}='0'" }
                        ]
                    },
                    {
                        steps: [
                            { text: "{var} = F" },
                            { text: "{var}=F2" },
                            { text: "{var}='2'" },
                            { text: "{var2}='0'" }
                        ]
                    },
                    {
                        steps: [
                            { text: "{var} = F" },
                            { text: "{var}=F2" },
                            { text: "{var}='3'" },
                            { text: "{var2}='0'" }
                        ]
                    },
                    {
                        steps: [
                            { text: "{var} = F" },
                            { text: "{var}='4'" },
                            { text: "{var2}='0'" }
                        ]
                    },
                    {
                        steps: [
                            { text: "{var} = F" },
                            { text: "{var}=F3" },
                            { text: "{var2}='0'" }
                        ]
                    }
                ]);

                expect(tree.stepNodeIndex[branches[4].steps[1].fid].codeBlock).to.equal("\n    return '5';");
            });

            it("rejects {var} = F if F has a code block, but also has children", () => {
                let tree = new Tree();
                tree.parseIn(`
{var} = F

* F {
    code block
}
    Child -
                `, "file.txt");

                assert.throws(() => {
                    tree.branchify(tree.root);
                }, "The function called at file.txt:2 has a code block in its declaration (at file.txt:4) but that code block must not have any child steps [file.txt:2]");
            });

            it("rejects {var} = F if F is in {x}='value' format, but some of those steps have children", () => {
                let tree = new Tree();
                tree.parseIn(`
{var} = F

* F
    {x}='1'

    {x}='2'
        {x}='3'

    {x}='4'
                `, "file.txt");

                assert.throws(() => {
                    tree.branchify(tree.root);
                }, "The function called at file.txt:2 must not have any steps in its declaration that have children of their own (but file.txt:7 does) [file.txt:2]");
            });

            it("rejects {var} = F if F doesn't have a code block, isn't a code block function, and isn't a branched function in {x}='value' format", () => {
                let tree = new Tree();
                tree.parseIn(`
{var} = F

* F
    {x}='1'
    D -
    {x}='4'
                `, "file.txt");

                assert.throws(() => {
                    tree.branchify(tree.root);
                }, "The function called at file.txt:2 must have all steps in its declaration be in format {x}='string' or {x}=Function (but file.txt:6 is not) [file.txt:2]");
            });
        });

        context("step blocks", () => {
            it("branchifies a step block with no children", () => {
                let tree = new Tree();
                tree.parseIn(`
A -
B -
C -
                `);
                let branches = tree.branchify(tree.root);
                mergeStepNodesInBranches(tree, branches);

                Comparer.expect(branches).to.match([
                    { steps: [ { text: "A", level: 0 } ] },
                    { steps: [ { text: "B", level: 0 } ] },
                    { steps: [ { text: "C", level: 0 } ] },
                ]);
            });

            it("branchifies a step block with children", () => {
                let tree = new Tree();
                tree.parseIn(`
A -
B -
C -

    D -

    E -
        F -
                `);
                let branches = tree.branchify(tree.root);
                mergeStepNodesInBranches(tree, branches);

                Comparer.expect(branches).to.match([
                    {
                        steps: [
                            { text: "A", level: 0 },
                            { text: "D", level: 0 },
                        ]
                    },
                    {
                        steps: [
                            { text: "A", level: 0 },
                            { text: "E", level: 0 },
                            { text: "F", level: 0 },
                        ]
                    },
                    {
                        steps: [
                            { text: "B", level: 0 },
                            { text: "D", level: 0 },
                        ]
                    },
                    {
                        steps: [
                            { text: "B", level: 0 },
                            { text: "E", level: 0 },
                            { text: "F", level: 0 },
                        ]
                    },
                    {
                        steps: [
                            { text: "C", level: 0 },
                            { text: "D", level: 0 },
                        ]
                    },
                    {
                        steps: [
                            { text: "C", level: 0 },
                            { text: "E", level: 0 },
                            { text: "F", level: 0 },
                        ]
                    },
                ]);
            });

            it("branchifies two levels of step blocks", () => {
                let tree = new Tree();
                tree.parseIn(`
A -
B -

    C -
    D -

        E -
                `);
                let branches = tree.branchify(tree.root);
                mergeStepNodesInBranches(tree, branches);

                Comparer.expect(branches).to.match([
                    {
                        steps: [
                            { text: "A", level: 0 },
                            { text: "C", level: 0 },
                            { text: "E", level: 0 },
                        ]
                    },
                    {
                        steps: [
                            { text: "A", level: 0 },
                            { text: "D", level: 0 },
                            { text: "E", level: 0 },
                        ]
                    },
                    {
                        steps: [
                            { text: "B", level: 0 },
                            { text: "C", level: 0 },
                            { text: "E", level: 0 },
                        ]
                    },
                    {
                        steps: [
                            { text: "B", level: 0 },
                            { text: "D", level: 0 },
                            { text: "E", level: 0 },
                        ]
                    },
                ]);
            });
        });

        context(".. steps", () => {
            it("branchifies a .. step with no children", () => {
                let tree = new Tree();
                tree.parseIn(`
A - ..
                `);
                let branches = tree.branchify(tree.root);
                mergeStepNodesInBranches(tree, branches);

                Comparer.expect(branches).to.match([
                    {
                        steps: [
                            { text: "A", level: 0, isSequential: true }
                        ]
                    }
                ]);
            });

            it("branchifies a .. step with children", () => {
                let tree = new Tree();
                tree.parseIn(`
A - ..
    B -
        C -
    D -
                `);
                let branches = tree.branchify(tree.root);
                mergeStepNodesInBranches(tree, branches);

                Comparer.expect(branches).to.match([
                    {
                        steps: [
                            { text: "A", level: 0, isSequential: true },
                            { text: "B", level: 0, isSequential: undefined },
                            { text: "C", level: 0, isSequential: undefined },
                            { text: "D", level: 0, isSequential: undefined },
                        ]
                    }
                ]);
            });

            it("branchifies a .. step that is a function call and has no children", () => {
                let tree = new Tree();
                tree.parseIn(`
F ..

* F
    A -
        B -
    C -

                `);
                let branches = tree.branchify(tree.root);
                mergeStepNodesInBranches(tree, branches);

                Comparer.expect(branches).to.match([
                    {
                        steps: [
                            { text: "F", level: 0, isSequential: true },
                            { text: "A", level: 1, isSequential: undefined },
                            { text: "B", level: 1, isSequential: undefined },
                            { text: "F", level: 0, isSequential: true },
                            { text: "C", level: 1, isSequential: undefined },
                        ]
                    }
                ]);
            });

            it("branchifies a .. step that is a function call and has children", () => {
                let tree = new Tree();
                tree.parseIn(`
F ..
    D -
        E -

    G -
    H -

* F
    A -
        B -
    C -

                `);
                let branches = tree.branchify(tree.root);
                mergeStepNodesInBranches(tree, branches);

                Comparer.expect(branches).to.match([
                    {
                        steps: [
                            { text: "F", level: 0, isSequential: true },
                            { text: "A", level: 1, isSequential: undefined },
                            { text: "B", level: 1, isSequential: undefined },
                            { text: "D", level: 0, isSequential: undefined },
                            { text: "E", level: 0, isSequential: undefined },
                            { text: "G", level: 0, isSequential: undefined },
                            { text: "H", level: 0, isSequential: undefined },

                            { text: "F", level: 0, isSequential: true },
                            { text: "C", level: 1, isSequential: undefined },
                            { text: "D", level: 0, isSequential: undefined },
                            { text: "E", level: 0, isSequential: undefined },
                            { text: "G", level: 0, isSequential: undefined },
                            { text: "H", level: 0, isSequential: undefined },
                        ]
                    }
                ]);
            });

            it("branchifies a .. step on a function declaration", () => {
                let tree = new Tree();
                tree.parseIn(`
F

* F ..
    A -
        B -
    C -

                `);
                let branches = tree.branchify(tree.root);
                mergeStepNodesInBranches(tree, branches);

                Comparer.expect(branches).to.match([
                    {
                        steps: [
                            { text: "F", level: 0, isSequential: undefined },
                            { text: "A", level: 1, isSequential: undefined },
                            { text: "B", level: 1, isSequential: undefined },
                            { text: "C", level: 1, isSequential: undefined },
                        ]
                    }
                ]);
            });

            it("branchifies a .. step that is a function call, has children, and whose function declaration starts with a ..", () => {
                let tree = new Tree();
                tree.parseIn(`
F ..
    D -
        E -

    G -
    H -

* F ..
    A -
        B -
    C -

                `);
                let branches = tree.branchify(tree.root);
                mergeStepNodesInBranches(tree, branches);

                Comparer.expect(branches).to.match([
                    {
                        steps: [
                            { text: "F", level: 0, isSequential: true },
                            { text: "A", level: 1, isSequential: undefined },
                            { text: "B", level: 1, isSequential: undefined },
                            { text: "C", level: 1, isSequential: undefined },
                            { text: "D", level: 0, isSequential: undefined },
                            { text: "E", level: 0, isSequential: undefined },
                            { text: "G", level: 0, isSequential: undefined },
                            { text: "H", level: 0, isSequential: undefined },
                        ]
                    }
                ]);
            });

            it("branchifies a .. step that is a function call, has children, and where the function declaration has multiple branches", () => {
                let tree = new Tree();
                tree.parseIn(`
F ..
    D -
        E -

    G -
    H -

* F ..
    A -
        B -

                `);
                let branches = tree.branchify(tree.root);
                mergeStepNodesInBranches(tree, branches);

                Comparer.expect(branches).to.match([
                    {
                        steps: [
                            { text: "F", level: 0, isSequential: true },
                            { text: "A", level: 1, isSequential: undefined },
                            { text: "B", level: 1, isSequential: undefined },
                            { text: "D", level: 0, isSequential: undefined },
                            { text: "E", level: 0, isSequential: undefined },
                            { text: "G", level: 0, isSequential: undefined },
                            { text: "H", level: 0, isSequential: undefined },
                        ]
                    }
                ]);
            });

            it("branchifies a .. step that is a function call, has children, where the function declaration has a function call", () => {
                let tree = new Tree();
                tree.parseIn(`
F ..
    D -
        E -

    G -
    H -

* F
    A
        I -

* A
    B -
    C -

                `);
                let branches = tree.branchify(tree.root);
                mergeStepNodesInBranches(tree, branches);

                Comparer.expect(branches).to.match([
                    {
                        steps: [
                            { text: "F", level: 0, isSequential: true },
                            { text: "A", level: 1, isSequential: undefined },
                            { text: "B", level: 2, isSequential: undefined },
                            { text: "I", level: 1, isSequential: undefined },
                            { text: "D", level: 0, isSequential: undefined },
                            { text: "E", level: 0, isSequential: undefined },
                            { text: "G", level: 0, isSequential: undefined },
                            { text: "H", level: 0, isSequential: undefined },

                            { text: "F", level: 0, isSequential: true },
                            { text: "A", level: 1, isSequential: undefined },
                            { text: "C", level: 2, isSequential: undefined },
                            { text: "I", level: 1, isSequential: undefined },
                            { text: "D", level: 0, isSequential: undefined },
                            { text: "E", level: 0, isSequential: undefined },
                            { text: "G", level: 0, isSequential: undefined },
                            { text: "H", level: 0, isSequential: undefined },
                        ]
                    }
                ]);
            });

            it("branchifies a .. step that has a step block as a child", () => {
                let tree = new Tree();
                tree.parseIn(`
S .. -
    A -
    B -
    C -
                `);
                let branches = tree.branchify(tree.root);
                mergeStepNodesInBranches(tree, branches);

                Comparer.expect(branches).to.match([
                    {
                        steps: [
                            { text: "S", level: 0, isSequential: true },
                            { text: "A", level: 0, isSequential: undefined },
                            { text: "B", level: 0, isSequential: undefined },
                            { text: "C", level: 0, isSequential: undefined },
                        ]
                    }
                ]);
            });

            it("branchifies a .. step that has a step block as a child, and a single step as its child", () => {
                let tree = new Tree();
                tree.parseIn(`
S .. -

    A -
    B -
    C -

        D -
                `);
                let branches = tree.branchify(tree.root);
                mergeStepNodesInBranches(tree, branches);

                Comparer.expect(branches).to.match([
                    {
                        steps: [
                            { text: "S", level: 0, isSequential: true },
                            { text: "A", level: 0, isSequential: undefined },
                            { text: "D", level: 0, isSequential: undefined },
                            { text: "B", level: 0, isSequential: undefined },
                            { text: "D", level: 0, isSequential: undefined },
                            { text: "C", level: 0, isSequential: undefined },
                            { text: "D", level: 0, isSequential: undefined },
                        ]
                    }
                ]);
            });

            it("branchifies a .. step that has a step block as a child and the step block has function calls as a members", () => {
                let tree = new Tree();
                tree.parseIn(`
S .. -

    A -
    B
    C

        I -

* B
    D -
    E -

    G -

* C
    H -
                `);
                let branches = tree.branchify(tree.root);
                mergeStepNodesInBranches(tree, branches);

                Comparer.expect(branches).to.match([
                    {
                        steps: [
                            { text: "S", level: 0, isSequential: true },
                            { text: "A", level: 0, isSequential: undefined },
                            { text: "I", level: 0, isSequential: undefined },
                            { text: "B", level: 0, isSequential: undefined },
                            { text: "D", level: 1, isSequential: undefined },
                            { text: "I", level: 0, isSequential: undefined },
                            { text: "B", level: 0, isSequential: undefined },
                            { text: "E", level: 1, isSequential: undefined },
                            { text: "I", level: 0, isSequential: undefined },
                            { text: "B", level: 0, isSequential: undefined },
                            { text: "G", level: 1, isSequential: undefined },
                            { text: "I", level: 0, isSequential: undefined },
                            { text: "C", level: 0, isSequential: undefined },
                            { text: "H", level: 1, isSequential: undefined },
                            { text: "I", level: 0, isSequential: undefined }
                        ]
                    }
                ]);
            });

            it("branchifies a .. step that has a step block as a child, and another step block as its child", () => {
                let tree = new Tree();
                tree.parseIn(`
S .. -

    A -
    B -

        C -
        D -
                `);
                let branches = tree.branchify(tree.root);
                mergeStepNodesInBranches(tree, branches);

                Comparer.expect(branches).to.match([
                    {
                        steps: [
                            { text: "S", level: 0, isSequential: true },
                            { text: "A", level: 0, isSequential: undefined },
                            { text: "C", level: 0, isSequential: undefined },
                            { text: "D", level: 0, isSequential: undefined },
                            { text: "B", level: 0, isSequential: undefined },
                            { text: "C", level: 0, isSequential: undefined },
                            { text: "D", level: 0, isSequential: undefined }
                        ]
                    }
                ]);
            });

            it("branchifies a .. step that has a step block as a child, and another step block as its child, and another step as its child", () => {
                let tree = new Tree();
                tree.parseIn(`
S .. -

    A -
    B -

        C -
        D -

            E -
                `);
                let branches = tree.branchify(tree.root);
                mergeStepNodesInBranches(tree, branches);

                Comparer.expect(branches).to.match([
                    {
                        steps: [
                            { text: "S", level: 0, isSequential: true },
                            { text: "A", level: 0, isSequential: undefined },
                            { text: "C", level: 0, isSequential: undefined },
                            { text: "E", level: 0, isSequential: undefined },
                            { text: "D", level: 0, isSequential: undefined },
                            { text: "E", level: 0, isSequential: undefined },
                            { text: "B", level: 0, isSequential: undefined },
                            { text: "C", level: 0, isSequential: undefined },
                            { text: "E", level: 0, isSequential: undefined },
                            { text: "D", level: 0, isSequential: undefined },
                            { text: "E", level: 0, isSequential: undefined }
                        ]
                    }
                ]);
            });

            it("branchifies a .. step that has other .. steps as children", () => {
                let tree = new Tree();
                tree.parseIn(`
S .. -
    A - ..
        B -
            C -
        D -
    E -
                `);
                let branches = tree.branchify(tree.root);
                mergeStepNodesInBranches(tree, branches);

                Comparer.expect(branches).to.match([
                    {
                        steps: [
                            { text: "S", level: 0, isSequential: true },
                            { text: "A", level: 0, isSequential: true },
                            { text: "B", level: 0, isSequential: undefined },
                            { text: "C", level: 0, isSequential: undefined },
                            { text: "D", level: 0, isSequential: undefined },
                            { text: "E", level: 0, isSequential: undefined }
                        ]
                    }
                ]);
            });

            it("branchifies a function declaration under a .. step", () => {
                let tree = new Tree();
                tree.parseIn(`
A - ..
    F

    * F
        B -
                `);

                let branches = tree.branchify(tree.root);
                mergeStepNodesInBranches(tree, branches);

                Comparer.expect(branches).to.match([
                    {
                        steps: [
                            { text: "A", level: 0, isSequential: true },
                            { text: "F", level: 0, isSequential: undefined },
                            { text: "B", level: 1, isSequential: undefined }
                        ]
                    }
                ]);
            });
        });

        context(".. step blocks", () => {
            it("branchifies a .. step block with no children", () => {
                let tree = new Tree();
                tree.parseIn(`
..
A -
B -
C -
                `);
                let branches = tree.branchify(tree.root);
                mergeStepNodesInBranches(tree, branches);

                Comparer.expect(branches).to.match([
                    {
                        steps: [
                            { text: "A", level: 0, isSequential: undefined },
                            { text: "B", level: 0, isSequential: undefined },
                            { text: "C", level: 0, isSequential: undefined }
                        ]
                    }
                ]);
            });

            it("branchifies a two .. step blocks with no children", () => {
                let tree = new Tree();
                tree.parseIn(`
..
A -
B -

..
C -
D -
                `);
                let branches = tree.branchify(tree.root);
                mergeStepNodesInBranches(tree, branches);

                Comparer.expect(branches).to.match([
                    {
                        steps: [
                            { text: "A", level: 0, isSequential: undefined },
                            { text: "B", level: 0, isSequential: undefined }
                        ]
                    },
                    {
                        steps: [
                            { text: "C", level: 0, isSequential: undefined },
                            { text: "D", level: 0, isSequential: undefined }
                        ]
                    }
                ]);
            });

            it("branchifies a .. step block with a single branch of children", () => {
                let tree = new Tree();
                tree.parseIn(`
..
A -
B -
C -

    D -
        E -
                `);
                let branches = tree.branchify(tree.root);
                mergeStepNodesInBranches(tree, branches);

                Comparer.expect(branches).to.match([
                    {
                        steps: [
                            { text: "A", level: 0, isSequential: undefined },
                            { text: "B", level: 0, isSequential: undefined },
                            { text: "C", level: 0, isSequential: undefined },
                            { text: "D", level: 0, isSequential: undefined },
                            { text: "E", level: 0, isSequential: undefined }
                        ]
                    }
                ]);
            });

            it("branchifies a .. step block with multiple branches of children", () => {
                let tree = new Tree();
                tree.parseIn(`
..
A -
B -
C -

    D -
        E -
    F -
                `);
                let branches = tree.branchify(tree.root);
                mergeStepNodesInBranches(tree, branches);

                Comparer.expect(branches).to.match([
                    {
                        steps: [
                            { text: "A", level: 0, isSequential: undefined },
                            { text: "B", level: 0, isSequential: undefined },
                            { text: "C", level: 0, isSequential: undefined },
                            { text: "D", level: 0, isSequential: undefined },
                            { text: "E", level: 0, isSequential: undefined }
                        ]
                    },
                    {
                        steps: [
                            { text: "A", level: 0, isSequential: undefined },
                            { text: "B", level: 0, isSequential: undefined },
                            { text: "C", level: 0, isSequential: undefined },
                            { text: "F", level: 0, isSequential: undefined }
                        ]
                    }
                ]);
            });

            it("branchifies a .. step block that contains function calls, where each function call has a single branch", () => {
                let tree = new Tree();
                tree.parseIn(`
..
A
B -
C

* A
    G -
        H -

* C
    I -
                `);
                let branches = tree.branchify(tree.root);
                mergeStepNodesInBranches(tree, branches);

                Comparer.expect(branches).to.match([
                    {
                        steps: [
                            { text: "A", level: 0, isSequential: undefined },
                            { text: "G", level: 1, isSequential: undefined },
                            { text: "H", level: 1, isSequential: undefined },
                            { text: "B", level: 0, isSequential: undefined },
                            { text: "C", level: 0, isSequential: undefined },
                            { text: "I", level: 1, isSequential: undefined }
                        ]
                    }
                ]);
            });

            it("branchifies a .. step block that contains a function call, whose function declaration starts with a ..", () => {
                let tree = new Tree();
                tree.parseIn(`
..
A
B -

* A ..
    C -
        D -
    E -
                `);
                let branches = tree.branchify(tree.root);
                mergeStepNodesInBranches(tree, branches);

                Comparer.expect(branches).to.match([
                    {
                        steps: [
                            { text: "A", level: 0, isSequential: undefined },
                            { text: "C", level: 1, isSequential: undefined },
                            { text: "D", level: 1, isSequential: undefined },
                            { text: "E", level: 1, isSequential: undefined },
                            { text: "B", level: 0, isSequential: undefined }
                        ]
                    }
                ]);

                expect(tree.stepNodeIndex[branches[0].steps[0].fid].isSequential).to.be.true;
            });

            it("branchifies a function declaration under a .. step block", () => {
                let tree = new Tree();
                tree.parseIn(`
..
A -
B -

    F

    * F
        C -
                `);

                let branches = tree.branchify(tree.root);
                mergeStepNodesInBranches(tree, branches);

                Comparer.expect(branches).to.match([
                    {
                        steps: [
                            { text: "A", level: 0, isSequential: undefined },
                            { text: "B", level: 0, isSequential: undefined },
                            { text: "F", level: 0, isSequential: undefined },
                            { text: "C", level: 1, isSequential: undefined }
                        ]
                    }
                ]);
            });

            it("branchifies a .. step block that contains function calls, where each function declaration has multiple branches", () => {
                let tree = new Tree();
                tree.parseIn(`
..
A
B -
C

* A
    G -
        H -
    J -

* C
    I -
    K -
                `);
                let branches = tree.branchify(tree.root);
                mergeStepNodesInBranches(tree, branches);

                Comparer.expect(branches).to.match([
                    {
                        steps: [
                            { text: "A", level: 0, isSequential: undefined },
                            { text: "G", level: 1, isSequential: undefined },
                            { text: "H", level: 1, isSequential: undefined },
                            { text: "B", level: 0, isSequential: undefined },
                            { text: "C", level: 0, isSequential: undefined },
                            { text: "I", level: 1, isSequential: undefined }
                        ]
                    },
                    {
                        steps: [
                            { text: "A", level: 0, isSequential: undefined },
                            { text: "G", level: 1, isSequential: undefined },
                            { text: "H", level: 1, isSequential: undefined },
                            { text: "B", level: 0, isSequential: undefined },
                            { text: "C", level: 0, isSequential: undefined },
                            { text: "K", level: 1, isSequential: undefined }
                        ]
                    },
                    {
                        steps: [
                            { text: "A", level: 0, isSequential: undefined },
                            { text: "J", level: 1, isSequential: undefined },
                            { text: "B", level: 0, isSequential: undefined },
                            { text: "C", level: 0, isSequential: undefined },
                            { text: "I", level: 1, isSequential: undefined }
                        ]
                    },
                    {
                        steps: [
                            { text: "A", level: 0, isSequential: undefined },
                            { text: "J", level: 1, isSequential: undefined },
                            { text: "B", level: 0, isSequential: undefined },
                            { text: "C", level: 0, isSequential: undefined },
                            { text: "K", level: 1, isSequential: undefined }
                        ]
                    }
                ]);
            });

            it("branchifies a .. step block that contains function calls and multiple branches of children, where each function declaration has multiple branches", () => {
                let tree = new Tree();
                tree.parseIn(`
..
A
B -
C

    L -

    M -
        N -
        O -

* A
    G -
        H -
    J -

* C
    I -
    K -
                `);
                let branches = tree.branchify(tree.root);
                mergeStepNodesInBranches(tree, branches);

                Comparer.expect(branches).to.match([
                    {
                        steps: [
                            { text: "A", level: 0, isSequential: undefined },
                            { text: "G", level: 1, isSequential: undefined },
                            { text: "H", level: 1, isSequential: undefined },
                            { text: "B", level: 0, isSequential: undefined },
                            { text: "C", level: 0, isSequential: undefined },
                            { text: "I", level: 1, isSequential: undefined },
                            { text: "L", level: 0, isSequential: undefined }
                        ]
                    },
                    {
                        steps: [
                            { text: "A", level: 0, isSequential: undefined },
                            { text: "G", level: 1, isSequential: undefined },
                            { text: "H", level: 1, isSequential: undefined },
                            { text: "B", level: 0, isSequential: undefined },
                            { text: "C", level: 0, isSequential: undefined },
                            { text: "I", level: 1, isSequential: undefined },
                            { text: "M", level: 0, isSequential: undefined },
                            { text: "N", level: 0, isSequential: undefined }
                        ]
                    },
                    {
                        steps: [
                            { text: "A", level: 0, isSequential: undefined },
                            { text: "G", level: 1, isSequential: undefined },
                            { text: "H", level: 1, isSequential: undefined },
                            { text: "B", level: 0, isSequential: undefined },
                            { text: "C", level: 0, isSequential: undefined },
                            { text: "I", level: 1, isSequential: undefined },
                            { text: "M", level: 0, isSequential: undefined },
                            { text: "O", level: 0, isSequential: undefined }
                        ]
                    },
                    {
                        steps: [
                            { text: "A", level: 0, isSequential: undefined },
                            { text: "G", level: 1, isSequential: undefined },
                            { text: "H", level: 1, isSequential: undefined },
                            { text: "B", level: 0, isSequential: undefined },
                            { text: "C", level: 0, isSequential: undefined },
                            { text: "K", level: 1, isSequential: undefined },
                            { text: "L", level: 0, isSequential: undefined }
                        ]
                    },
                    {
                        steps: [
                            { text: "A", level: 0, isSequential: undefined },
                            { text: "G", level: 1, isSequential: undefined },
                            { text: "H", level: 1, isSequential: undefined },
                            { text: "B", level: 0, isSequential: undefined },
                            { text: "C", level: 0, isSequential: undefined },
                            { text: "K", level: 1, isSequential: undefined },
                            { text: "M", level: 0, isSequential: undefined },
                            { text: "N", level: 0, isSequential: undefined }
                        ]
                    },
                    {
                        steps: [
                            { text: "A", level: 0, isSequential: undefined },
                            { text: "G", level: 1, isSequential: undefined },
                            { text: "H", level: 1, isSequential: undefined },
                            { text: "B", level: 0, isSequential: undefined },
                            { text: "C", level: 0, isSequential: undefined },
                            { text: "K", level: 1, isSequential: undefined },
                            { text: "M", level: 0, isSequential: undefined },
                            { text: "O", level: 0, isSequential: undefined }
                        ]
                    },
                    {
                        steps: [
                            { text: "A", level: 0, isSequential: undefined },
                            { text: "J", level: 1, isSequential: undefined },
                            { text: "B", level: 0, isSequential: undefined },
                            { text: "C", level: 0, isSequential: undefined },
                            { text: "I", level: 1, isSequential: undefined },
                            { text: "L", level: 0, isSequential: undefined }
                        ]
                    },
                    {
                        steps: [
                            { text: "A", level: 0, isSequential: undefined },
                            { text: "J", level: 1, isSequential: undefined },
                            { text: "B", level: 0, isSequential: undefined },
                            { text: "C", level: 0, isSequential: undefined },
                            { text: "I", level: 1, isSequential: undefined },
                            { text: "M", level: 0, isSequential: undefined },
                            { text: "N", level: 0, isSequential: undefined }
                        ]
                    },
                    {
                        steps: [
                            { text: "A", level: 0, isSequential: undefined },
                            { text: "J", level: 1, isSequential: undefined },
                            { text: "B", level: 0, isSequential: undefined },
                            { text: "C", level: 0, isSequential: undefined },
                            { text: "I", level: 1, isSequential: undefined },
                            { text: "M", level: 0, isSequential: undefined },
                            { text: "O", level: 0, isSequential: undefined }
                        ]
                    },
                    {
                        steps: [
                            { text: "A", level: 0, isSequential: undefined },
                            { text: "J", level: 1, isSequential: undefined },
                            { text: "B", level: 0, isSequential: undefined },
                            { text: "C", level: 0, isSequential: undefined },
                            { text: "K", level: 1, isSequential: undefined },
                            { text: "L", level: 0, isSequential: undefined }
                        ]
                    },
                    {
                        steps: [
                            { text: "A", level: 0, isSequential: undefined },
                            { text: "J", level: 1, isSequential: undefined },
                            { text: "B", level: 0, isSequential: undefined },
                            { text: "C", level: 0, isSequential: undefined },
                            { text: "K", level: 1, isSequential: undefined },
                            { text: "M", level: 0, isSequential: undefined },
                            { text: "N", level: 0, isSequential: undefined }
                        ]
                    },
                    {
                        steps: [
                            { text: "A", level: 0, isSequential: undefined },
                            { text: "J", level: 1, isSequential: undefined },
                            { text: "B", level: 0, isSequential: undefined },
                            { text: "C", level: 0, isSequential: undefined },
                            { text: "K", level: 1, isSequential: undefined },
                            { text: "M", level: 0, isSequential: undefined },
                            { text: "O", level: 0, isSequential: undefined }
                        ]
                    }
                ]);
            });

            it("branchifies a .. step that contains a .. step block", () => {
                let tree = new Tree();
                tree.parseIn(`
..
A -
B -
    ..
    C -
    D -
                `);
                let branches = tree.branchify(tree.root);
                mergeStepNodesInBranches(tree, branches);

                Comparer.expect(branches).to.match([
                    {
                        steps: [
                            { text: "A", level: 0, isSequential: undefined },
                            { text: "B", level: 0, isSequential: undefined },
                            { text: "C", level: 0, isSequential: undefined },
                            { text: "D", level: 0, isSequential: undefined }
                        ]
                    }
                ]);
            });

            it("branchifies a .. step that contains a .. step block that contains a function call, whose function declaration has multiple branches", () => {
                let tree = new Tree();
                tree.parseIn(`
..
A -
B -
    ..
    C
    D -

    * C
        E -

        F -
                `);
                let branches = tree.branchify(tree.root);
                mergeStepNodesInBranches(tree, branches);

                Comparer.expect(branches).to.match([
                    {
                        steps: [
                            { text: "A", level: 0, isSequential: undefined },
                            { text: "B", level: 0, isSequential: undefined },
                            { text: "C", level: 0, isSequential: undefined },
                            { text: "E", level: 1, isSequential: undefined },
                            { text: "D", level: 0, isSequential: undefined }
                        ]
                    },
                    {
                        steps: [
                            { text: "A", level: 0, isSequential: undefined },
                            { text: "B", level: 0, isSequential: undefined },
                            { text: "C", level: 0, isSequential: undefined },
                            { text: "F", level: 1, isSequential: undefined },
                            { text: "D", level: 0, isSequential: undefined }
                        ]
                    }
                ]);
            });
        });

        context("*** Before Every Branch hook", () => {
            it("branchifies the *** Before Every Branch hook", () => {
                let tree = new Tree();
                tree.parseIn(`
A -
    B -

    C -
        *** Before Every Branch {
            D
        }

E -
                `);

                let branches = tree.branchify(tree.root);
                mergeStepNodesInBranches(tree, branches);

                Comparer.expect(branches).to.match([
                    {
                        steps: [ { text: "A" }, { text: "B" } ],
                        beforeEveryBranch: undefined,
                        afterEveryBranch: undefined,
                        beforeEveryStep: undefined,
                        afterEveryStep: undefined
                    },
                    {
                        steps: [ { text: "A" }, { text: "C" } ],
                        beforeEveryBranch: [
                            { text: "Before Every Branch", level: 0, codeBlock: "\n            D" }
                        ],
                        afterEveryBranch: undefined,
                        beforeEveryStep: undefined,
                        afterEveryStep: undefined
                    },
                    {
                        steps: [ { text: "E" } ],
                        beforeEveryBranch: undefined,
                        afterEveryBranch: undefined,
                        beforeEveryStep: undefined,
                        afterEveryStep: undefined
                    }
                ]);
            });

            it("branchifies an empty *** Before Every Branch hook", () => {
                let tree = new Tree();
                tree.parseIn(`
A -
    *** Before Every Branch {
    }
                `);

                let branches = tree.branchify(tree.root);
                mergeStepNodesInBranches(tree, branches);

                Comparer.expect(branches).to.match([
                    {
                        steps: [ { text: "A" } ],
                        beforeEveryBranch: [
                            { text: "Before Every Branch", level: 0, codeBlock: "" }
                        ],
                    }
                ]);
            });

            it("branchifies the *** Before Every Branch hook under the root", () => {
                let tree = new Tree();
                tree.parseIn(`
A -

*** Before Every Branch {
    B
}

C -
                `);

                let branches = tree.branchify(tree.root);
                mergeStepNodesInBranches(tree, branches);

                Comparer.expect(branches).to.match([
                    {
                        steps: [ { text: "A" } ],
                        beforeEveryBranch: [
                            { text: "Before Every Branch", level: 0, codeBlock: "\n    B" }
                        ]
                    },
                    {
                        steps: [ { text: "C" } ],
                        beforeEveryBranch: [
                            { text: "Before Every Branch", level: 0, codeBlock: "\n    B" }
                        ]
                    }
                ]);
            });

            it("branchifies the *** Before Every Branch hook when it's inside a function declaration", () => {
                let tree = new Tree();
                tree.parseIn(`
F

* F
    A -
    B -

    *** Before Every Branch {
        C
    }
                `);

                let branches = tree.branchify(tree.root);
                mergeStepNodesInBranches(tree, branches);

                Comparer.expect(branches).to.match([
                    {
                        steps: [ { text: "F" }, { text: "A" } ],
                        beforeEveryBranch: [
                            { text: "Before Every Branch", level: 0, codeBlock: "\n        C" }
                        ]
                    },
                    {
                        steps: [ { text: "F" }, { text: "B" } ],
                        beforeEveryBranch: [
                            { text: "Before Every Branch", level: 0, codeBlock: "\n        C" }
                        ]
                    }
                ]);
            });

            it("branchifies the *** Before Every Branch hook under a step block", () => {
                let tree = new Tree();
                tree.parseIn(`
A -
    B -
    C -

        *** Before Every Branch {
            D
        }

G -
                `);

                let branches = tree.branchify(tree.root);
                mergeStepNodesInBranches(tree, branches);

                Comparer.expect(branches).to.match([
                    {
                        steps: [ { text: "A" }, { text: "B" } ],
                        beforeEveryBranch: [
                            { text: "Before Every Branch", codeBlock: "\n            D"}
                        ]
                    },
                    {
                        steps: [ { text: "A" }, { text: "C" } ],
                        beforeEveryBranch: [
                            { text: "Before Every Branch", codeBlock: "\n            D"}
                        ]
                    },
                    {
                        steps: [ { text: "G" } ],
                        beforeEveryBranch: undefined
                    }
                ]);
            });

            it("branchifies the *** Before Every Branch hook under a .. step", () => {
                let tree = new Tree();
                tree.parseIn(`
A - ..

    B -

    C -
        *** Before Every Branch {
            D
        }

G -
                `);

                let branches = tree.branchify(tree.root);
                mergeStepNodesInBranches(tree, branches);

                Comparer.expect(branches).to.match([
                    {
                        steps: [ { text: "A" }, { text: "B" }, { text: "C" } ],
                        beforeEveryBranch: [
                            { text: "Before Every Branch", codeBlock: "\n            D" }
                        ]
                    },
                    {
                        steps: [ { text: "G" } ],
                        beforeEveryBranch: undefined
                    }
                ]);
            });

            it("branchifies the *** Before Every Branch hook under a .. step block", () => {
                let tree = new Tree();
                tree.parseIn(`
A -
    ..
    B -
    C -

        *** Before Every Branch {
            D
        }

G -
                `);

                let branches = tree.branchify(tree.root);
                mergeStepNodesInBranches(tree, branches);

                Comparer.expect(branches).to.match([
                    {
                        steps: [ { text: "A" }, { text: "B" }, { text: "C" } ],
                        beforeEveryBranch: [
                            { text: "Before Every Branch", codeBlock:"\n            D" }
                        ]
                    },
                    {
                        steps: [ { text: "G" } ],
                        beforeEveryBranch: undefined
                    }
                ]);
            });

            it("rejects a *** Before Every Branch hook that has children", () => {
                let tree = new Tree();
                tree.parseIn(`
A -
    *** Before Every Branch {
        B
    }

        C -

G -
                `, "file.txt");

                assert.throws(() => {
                    tree.branchify(tree.root);
                }, "A hook cannot have children [file.txt:3]");
            });
        });

        context("*** After Every Branch hook", () => {
            it("branchifies the *** After Every Branch hook", () => {
                let tree = new Tree();
                tree.parseIn(`
A -
    B -

    C -
        *** After Every Branch {
            D
        }

E -
                `);

                let branches = tree.branchify(tree.root);
                mergeStepNodesInBranches(tree, branches);

                Comparer.expect(branches).to.match([
                    {
                        steps: [ { text: "A" }, { text: "B" } ],
                        beforeEveryBranch: undefined,
                        afterEveryBranch: undefined,
                        beforeEveryStep: undefined,
                        afterEveryStep: undefined
                    },
                    {
                        steps: [ { text: "A" }, { text: "C" } ],
                        beforeEveryBranch: undefined,
                        afterEveryBranch: [
                            { text: "After Every Branch", level: 0, codeBlock: "\n            D" }
                        ],
                        beforeEveryStep: undefined,
                        afterEveryStep: undefined
                    },
                    {
                        steps: [ { text: "E" } ],
                        beforeEveryBranch: undefined,
                        afterEveryBranch: undefined,
                        beforeEveryStep: undefined,
                        afterEveryStep: undefined
                    }
                ]);
            });

            it("branchifies an empty *** After Every Branch hook", () => {
                let tree = new Tree();
                tree.parseIn(`
A -
    *** After Every Branch {
    }
                `);

                let branches = tree.branchify(tree.root);
                mergeStepNodesInBranches(tree, branches);

                Comparer.expect(branches).to.match([
                    {
                        steps: [ { text: "A" } ],
                        afterEveryBranch: [
                            { text: "After Every Branch", level: 0, codeBlock: "" }
                        ],
                    }
                ]);
            });

            it("branchifies the *** After Every Branch hook under the root", () => {
                let tree = new Tree();
                tree.parseIn(`
A -

***  After  Every branch {
    B
}

C -
                `);

                let branches = tree.branchify(tree.root);
                mergeStepNodesInBranches(tree, branches);

                Comparer.expect(branches).to.match([
                    {
                        steps: [ { text: "A" } ],
                        afterEveryBranch: [
                            { text: "After  Every branch", level: 0, codeBlock: "\n    B" }
                        ]
                    },
                    {
                        steps: [ { text: "C" } ],
                        afterEveryBranch: [
                            { text: "After  Every branch", level: 0, codeBlock: "\n    B" }
                        ]
                    }
                ]);
            });

            it("branchifies the *** After Every Branch hook when it's inside a function declaration", () => {
                let tree = new Tree();
                tree.parseIn(`
F

* F
    A -
    B -

    *** After Every Branch {
        C
    }
                `);

                let branches = tree.branchify(tree.root);
                mergeStepNodesInBranches(tree, branches);

                Comparer.expect(branches).to.match([
                    {
                        steps: [ { text: "F" }, { text: "A" } ],
                        afterEveryBranch: [
                            { text: "After Every Branch", level: 0, codeBlock: "\n        C" }
                        ]
                    },
                    {
                        steps: [ { text: "F" }, { text: "B" } ],
                        afterEveryBranch: [
                            { text: "After Every Branch", level: 0, codeBlock: "\n        C" }
                        ]
                    }
                ]);
            });

            it("branchifies the *** After Every Branch hook when it's inside an empty function declaration", () => {
                let tree = new Tree();
                tree.parseIn(`
F

* F
    *** After Every Branch {
        C
    }
                `);

                let branches = tree.branchify(tree.root);
                mergeStepNodesInBranches(tree, branches);

                Comparer.expect(branches).to.match([
                    {
                        steps: [ { text: "F" } ],
                        afterEveryBranch: [
                            { text: "After Every Branch", level: 0, codeBlock: "\n        C" }
                        ]
                    }
                ]);
            });

            it("branchifies the *** After Every Branch hook under a step block", () => {
                let tree = new Tree();
                tree.parseIn(`
A -
    B -
    C -

        *** After Every Branch {
            D
        }

G -
                `);

                let branches = tree.branchify(tree.root);
                mergeStepNodesInBranches(tree, branches);

                Comparer.expect(branches).to.match([
                    {
                        steps: [ { text: "A" }, { text: "B" } ],
                        afterEveryBranch: [
                            { text: "After Every Branch", codeBlock: "\n            D"}
                        ]
                    },
                    {
                        steps: [ { text: "A" }, { text: "C" } ],
                        afterEveryBranch: [
                            { text: "After Every Branch", codeBlock: "\n            D"}
                        ]
                    },
                    {
                        steps: [ { text: "G" } ],
                        afterEveryBranch: undefined
                    }
                ]);
            });

            it("branchifies the *** After Every Branch hook under a .. step", () => {
                let tree = new Tree();
                tree.parseIn(`
A - ..

    B -

    C -
        *** After Every Branch {
            D
        }

G -
                `);

                let branches = tree.branchify(tree.root);
                mergeStepNodesInBranches(tree, branches);

                Comparer.expect(branches).to.match([
                    {
                        steps: [ { text: "A" }, { text: "B" }, { text: "C" } ],
                        afterEveryBranch: [
                            { text: "After Every Branch", codeBlock: "\n            D" }
                        ]
                    },
                    {
                        steps: [ { text: "G" } ],
                        afterEveryBranch: undefined
                    }
                ]);
            });

            it("branchifies the *** After Every Branch hook under a .. step block", () => {
                let tree = new Tree();
                tree.parseIn(`
A -
    ..
    B -
    C -

        *** After Every Branch {
            D
        }

G -
                `);

                let branches = tree.branchify(tree.root);
                mergeStepNodesInBranches(tree, branches);

                Comparer.expect(branches).to.match([
                    {
                        steps: [ { text: "A" }, { text: "B" }, { text: "C" } ],
                        afterEveryBranch: [
                            { text: "After Every Branch", codeBlock:"\n            D" }
                        ]
                    },
                    {
                        steps: [ { text: "G" } ],
                        afterEveryBranch: undefined
                    }
                ]);
            });

            it("rejects a *** After Every Branch hook that has children", () => {
                let tree = new Tree();
                tree.parseIn(`
A -
    *** After Every Branch {
        B
    }

        C -

G -
                `, "file.txt");

                assert.throws(() => {
                    tree.branchify(tree.root);
                }, "A hook cannot have children [file.txt:3]");
            });

            it("handles multiple *** Before Every Branch and *** After Every Branch hooks that are siblings", () => {
                let tree = new Tree();
                tree.parseIn(`
A -
    B -

    C -
        *** Before Every Branch {
            D1
        }

        *** After Every Branch {
            G1
        }

        *** Before Every Branch {
            D2
        }

        *** Before Every Branch {
            D3
        }

        *** After Every Branch {
            G2
        }

        *** After Every Branch {
            G3
        }

E -
                `);

                let branches = tree.branchify(tree.root);
                mergeStepNodesInBranches(tree, branches);

                Comparer.expect(branches).to.match([
                    {
                        steps: [ { text: "A" }, { text: "B" } ],
                        afterEveryBranch: undefined,
                        beforeEveryBranch: undefined
                    },
                    {
                        steps: [ { text: "A" }, { text: "C" } ],
                        afterEveryBranch: [
                            { text: "After Every Branch", codeBlock: "\n            G1" },
                            { text: "After Every Branch", codeBlock: "\n            G2" },
                            { text: "After Every Branch", codeBlock: "\n            G3" }
                        ],
                        beforeEveryBranch: [
                            { text: "Before Every Branch", codeBlock: "\n            D3" },
                            { text: "Before Every Branch", codeBlock: "\n            D2" },
                            { text: "Before Every Branch", codeBlock: "\n            D1" }
                        ]
                    },
                    {
                        steps: [ { text: "E" } ],
                        afterEveryBranch: undefined,
                        beforeEveryBranch: undefined
                    }
                ]);
            });

            it("branchifies many *** Before Every Branch and *** After Every Branch hooks in the tree", () => {
                let tree = new Tree();
                tree.parseIn(`
A -
    B -
        C -
        D -

            E -

                *** After Every Branch {
                    U
                }

            *** After Every Branch {
                T
            }

        F -

    H -
    I -

        *** After Every Branch {
            S
        }

    ..
    J -
    K -

        *** After Every Branch {
            R
        }

        *** Before Every Branch {
            X
        }

    L - ..
        M -
            N -

        *** After Every Branch {
            Q
        }

        *** Before Every Branch {
            Y
        }

        O -

    *** After Every Branch {
        W
    }
G -
    P -
                `);
                let branches = tree.branchify(tree.root);
                mergeStepNodesInBranches(tree, branches);

                Comparer.expect(branches).to.match([
                    {
                        steps: [ { text: "A" }, { text: "B" }, { text: "C" }, { text: "E" } ],
                        afterEveryBranch: [
                            { text: "After Every Branch", codeBlock: "\n                    U" },
                            { text: "After Every Branch", codeBlock: "\n                T" },
                            { text: "After Every Branch", codeBlock: "\n        W" }
                        ]
                    },
                    {
                        steps: [ { text: "A" }, { text: "B" }, { text: "D" }, { text: "E" } ],
                        afterEveryBranch: [
                            { text: "After Every Branch", codeBlock: "\n                    U" },
                            { text: "After Every Branch", codeBlock: "\n                T" },
                            { text: "After Every Branch", codeBlock: "\n        W" }
                        ]
                    },
                    {
                        steps: [ { text: "A" }, { text: "B" }, { text: "F" } ],
                        afterEveryBranch: [
                            { text: "After Every Branch", codeBlock: "\n        W" }
                        ]
                    },
                    {
                        steps: [ { text: "A" }, { text: "H" } ],
                        afterEveryBranch: [
                            { text: "After Every Branch", codeBlock: "\n            S" },
                            { text: "After Every Branch", codeBlock: "\n        W" }
                        ]
                    },
                    {
                        steps: [ { text: "A" }, { text: "I" } ],
                        afterEveryBranch: [
                            { text: "After Every Branch", codeBlock: "\n            S" },
                            { text: "After Every Branch", codeBlock: "\n        W" }
                        ]
                    },
                    {
                        steps: [ { text: "A" }, { text: "J" }, { text: "K" } ],
                        beforeEveryBranch: [
                            { text: "Before Every Branch", codeBlock: "\n            X" }
                        ],
                        afterEveryBranch: [
                            { text: "After Every Branch", codeBlock: "\n            R" },
                            { text: "After Every Branch", codeBlock: "\n        W" }
                        ]
                    },
                    {
                        steps: [ { text: "A" }, { text: "L" }, { text: "M" }, { text: "N" }, { text: "O" } ],
                        beforeEveryBranch: [
                            { text: "Before Every Branch", codeBlock: "\n            Y" }
                        ],
                        afterEveryBranch: [
                            { text: "After Every Branch", codeBlock: "\n            Q" },
                            { text: "After Every Branch", codeBlock: "\n        W" }
                        ]
                    },
                    {
                        steps: [ { text: "G" }, { text: "P" } ],
                        afterEveryBranch: undefined
                    }
                ]);
            });
        });

        context("*** Before Every Step hook", () => {
            it("branchifies the *** Before Every Step hook", () => {
                let tree = new Tree();
                tree.parseIn(`
A -
    B -

    C -
        *** Before Every Step {
            D
        }

E -
                `);

                let branches = tree.branchify(tree.root);
                mergeStepNodesInBranches(tree, branches);

                Comparer.expect(branches).to.match([
                    {
                        steps: [ { text: "A" }, { text: "B" } ],
                        beforeEveryBranch: undefined,
                        afterEveryBranch: undefined,
                        beforeEveryStep: undefined,
                        afterEveryStep: undefined
                    },
                    {
                        steps: [ { text: "A" }, { text: "C" } ],
                        beforeEveryBranch: undefined,
                        afterEveryBranch: undefined,
                        beforeEveryStep: [
                            { text: "Before Every Step", level: 0, codeBlock: "\n            D" }
                        ],
                        afterEveryStep: undefined
                    },
                    {
                        steps: [ { text: "E" } ],
                        beforeEveryBranch: undefined,
                        afterEveryBranch: undefined,
                        beforeEveryStep: undefined,
                        afterEveryStep: undefined
                    }
                ]);
            });

            it("branchifies an empty *** Before Every Step hook", () => {
                let tree = new Tree();
                tree.parseIn(`
A -
    *** Before Every Step {
    }
                `);

                let branches = tree.branchify(tree.root);
                mergeStepNodesInBranches(tree, branches);

                Comparer.expect(branches).to.match([
                    {
                        steps: [ { text: "A" } ],
                        beforeEveryStep: [
                            { text: "Before Every Step", level: 0, codeBlock: "" }
                        ],
                    }
                ]);
            });

            it("branchifies the *** Before Every Step hook under the root", () => {
                let tree = new Tree();
                tree.parseIn(`
A -

*** Before Every Step {
    B
}

C -
                `);

                let branches = tree.branchify(tree.root);
                mergeStepNodesInBranches(tree, branches);

                Comparer.expect(branches).to.match([
                    {
                        steps: [ { text: "A" } ],
                        beforeEveryStep: [
                            { text: "Before Every Step", level: 0, codeBlock: "\n    B" }
                        ]
                    },
                    {
                        steps: [ { text: "C" } ],
                        beforeEveryStep: [
                            { text: "Before Every Step", level: 0, codeBlock: "\n    B" }
                        ]
                    }
                ]);
            });

            it("branchifies the *** Before Every Step hook when it's inside a function declaration", () => {
                let tree = new Tree();
                tree.parseIn(`
F

* F
    A -
    B -

    *** Before Every Step {
        C
    }
                `);

                let branches = tree.branchify(tree.root);
                mergeStepNodesInBranches(tree, branches);

                Comparer.expect(branches).to.match([
                    {
                        steps: [ { text: "F" }, { text: "A" } ],
                        beforeEveryStep: [
                            { text: "Before Every Step", level: 0, codeBlock: "\n        C" }
                        ]
                    },
                    {
                        steps: [ { text: "F" }, { text: "B" } ],
                        beforeEveryStep: [
                            { text: "Before Every Step", level: 0, codeBlock: "\n        C" }
                        ]
                    }
                ]);
            });

            it("branchifies the *** Before Every Step hook under a step block", () => {
                let tree = new Tree();
                tree.parseIn(`
A -
    B -
    C -

        *** Before Every Step {
            D
        }

G -
                `);

                let branches = tree.branchify(tree.root);
                mergeStepNodesInBranches(tree, branches);

                Comparer.expect(branches).to.match([
                    {
                        steps: [ { text: "A" }, { text: "B" } ],
                        beforeEveryStep: [
                            { text: "Before Every Step", codeBlock: "\n            D"}
                        ]
                    },
                    {
                        steps: [ { text: "A" }, { text: "C" } ],
                        beforeEveryStep: [
                            { text: "Before Every Step", codeBlock: "\n            D"}
                        ]
                    },
                    {
                        steps: [ { text: "G" } ],
                        beforeEveryStep: undefined
                    }
                ]);
            });

            it("branchifies the *** Before Every Step hook under a .. step", () => {
                let tree = new Tree();
                tree.parseIn(`
A - ..

    B -

    C -
        *** Before Every Step {
            D
        }

G -
                `);

                let branches = tree.branchify(tree.root);
                mergeStepNodesInBranches(tree, branches);

                Comparer.expect(branches).to.match([
                    {
                        steps: [ { text: "A" }, { text: "B" }, { text: "C" } ],
                        beforeEveryStep: [
                            { text: "Before Every Step", codeBlock: "\n            D" }
                        ]
                    },
                    {
                        steps: [ { text: "G" } ],
                        beforeEveryStep: undefined
                    }
                ]);
            });

            it("branchifies the *** Before Every Step hook under a .. step block", () => {
                let tree = new Tree();
                tree.parseIn(`
A -
    ..
    B -
    C -

        *** Before Every Step {
            D
        }

G -
                `);

                let branches = tree.branchify(tree.root);
                mergeStepNodesInBranches(tree, branches);

                Comparer.expect(branches).to.match([
                    {
                        steps: [ { text: "A" }, { text: "B" }, { text: "C" } ],
                        beforeEveryStep: [
                            { text: "Before Every Step", codeBlock:"\n            D" }
                        ]
                    },
                    {
                        steps: [ { text: "G" } ],
                        beforeEveryStep: undefined
                    }
                ]);
            });

            it("rejects a *** Before Every Step hook that has children", () => {
                let tree = new Tree();
                tree.parseIn(`
A -
    *** Before Every Step {
        B
    }

        C -

G -
                `, "file.txt");

                assert.throws(() => {
                    tree.branchify(tree.root);
                }, "A hook cannot have children [file.txt:3]");
            });
        });

        context("*** After Every Step hook", () => {
            it("branchifies the *** After Every Step hook", () => {
                let tree = new Tree();
                tree.parseIn(`
A -
    B -

    C -
        *** After Every Step {
            D
        }

E -
                `);

                let branches = tree.branchify(tree.root);
                mergeStepNodesInBranches(tree, branches);

                Comparer.expect(branches).to.match([
                    {
                        steps: [ { text: "A" }, { text: "B" } ],
                        beforeEveryBranch: undefined,
                        afterEveryBranch: undefined,
                        beforeEveryStep: undefined,
                        afterEveryStep: undefined
                    },
                    {
                        steps: [ { text: "A" }, { text: "C" } ],
                        beforeEveryBranch: undefined,
                        afterEveryBranch: undefined,
                        beforeEveryStep: undefined,
                        afterEveryStep: [
                            { text: "After Every Step", level: 0, codeBlock: "\n            D" }
                        ]
                    },
                    {
                        steps: [ { text: "E" } ],
                        beforeEveryBranch: undefined,
                        afterEveryBranch: undefined,
                        beforeEveryStep: undefined,
                        afterEveryStep: undefined
                    }
                ]);
            });

            it("branchifies an empty *** After Every Step hook", () => {
                let tree = new Tree();
                tree.parseIn(`
A -
    *** After Every Step {
    }
                `);

                let branches = tree.branchify(tree.root);
                mergeStepNodesInBranches(tree, branches);

                Comparer.expect(branches).to.match([
                    {
                        steps: [ { text: "A" } ],
                        afterEveryStep: [
                            { text: "After Every Step", level: 0, codeBlock: "" }
                        ],
                    }
                ]);
            });

            it("branchifies the *** After Every Step hook under the root", () => {
                let tree = new Tree();
                tree.parseIn(`
A -

*** After Every Step {
    B
}

C -
                `);

                let branches = tree.branchify(tree.root);
                mergeStepNodesInBranches(tree, branches);

                Comparer.expect(branches).to.match([
                    {
                        steps: [ { text: "A" } ],
                        afterEveryStep: [
                            { text: "After Every Step", level: 0, codeBlock: "\n    B" }
                        ]
                    },
                    {
                        steps: [ { text: "C" } ],
                        afterEveryStep: [
                            { text: "After Every Step", level: 0, codeBlock: "\n    B" }
                        ]
                    }
                ]);
            });

            it("branchifies the *** After Every Step hook when it's inside a function declaration", () => {
                let tree = new Tree();
                tree.parseIn(`
F

* F
    A -
    B -

    *** After Every Step {
        C
    }
                `);

                let branches = tree.branchify(tree.root);
                mergeStepNodesInBranches(tree, branches);

                Comparer.expect(branches).to.match([
                    {
                        steps: [ { text: "F" }, { text: "A" } ],
                        afterEveryStep: [
                            { text: "After Every Step", level: 0, codeBlock: "\n        C" }
                        ]
                    },
                    {
                        steps: [ { text: "F" }, { text: "B" } ],
                        afterEveryStep: [
                            { text: "After Every Step", level: 0, codeBlock: "\n        C" }
                        ]
                    }
                ]);
            });

            it("branchifies the *** After Every Step hook under a step block", () => {
                let tree = new Tree();
                tree.parseIn(`
A -
    B -
    C -

        *** After Every Step {
            D
        }

G -
                `);

                let branches = tree.branchify(tree.root);
                mergeStepNodesInBranches(tree, branches);

                Comparer.expect(branches).to.match([
                    {
                        steps: [ { text: "A" }, { text: "B" } ],
                        afterEveryStep: [
                            { text: "After Every Step", codeBlock: "\n            D"}
                        ]
                    },
                    {
                        steps: [ { text: "A" }, { text: "C" } ],
                        afterEveryStep: [
                            { text: "After Every Step", codeBlock: "\n            D"}
                        ]
                    },
                    {
                        steps: [ { text: "G" } ],
                        afterEveryStep: undefined
                    }
                ]);
            });

            it("branchifies the *** After Every Step hook under a .. step", () => {
                let tree = new Tree();
                tree.parseIn(`
A - ..

    B -

    C -
        *** After Every Step {
            D
        }

G -
                `);

                let branches = tree.branchify(tree.root);
                mergeStepNodesInBranches(tree, branches);

                Comparer.expect(branches).to.match([
                    {
                        steps: [ { text: "A" }, { text: "B" }, { text: "C" } ],
                        afterEveryStep: [
                            { text: "After Every Step", codeBlock: "\n            D" }
                        ]
                    },
                    {
                        steps: [ { text: "G" } ],
                        afterEveryStep: undefined
                    }
                ]);
            });

            it("branchifies the *** After Every Step hook under a .. step block", () => {
                let tree = new Tree();
                tree.parseIn(`
A -
    ..
    B -
    C -

        *** After Every Step {
            D
        }

G -
                `);

                let branches = tree.branchify(tree.root);
                mergeStepNodesInBranches(tree, branches);

                Comparer.expect(branches).to.match([
                    {
                        steps: [ { text: "A" }, { text: "B" }, { text: "C" } ],
                        afterEveryStep: [
                            { text: "After Every Step", codeBlock:"\n            D" }
                        ]
                    },
                    {
                        steps: [ { text: "G" } ],
                        afterEveryStep: undefined
                    }
                ]);
            });

            it("rejects a *** After Every Step hook that has children", () => {
                let tree = new Tree();
                tree.parseIn(`
A -
    *** After Every Step {
        B
    }

        C -

G -
                `, "file.txt");

                assert.throws(() => {
                    tree.branchify(tree.root);
                }, "A hook cannot have children [file.txt:3]");
            });

            it("handles multiple *** Before Every Step and *** After Every Step hooks that are siblings", () => {
                let tree = new Tree();
                tree.parseIn(`
A -
    B -

    C -
        *** Before Every Step {
            D1
        }

        *** After Every Step {
            G1
        }

        *** Before Every Step {
            D2
        }

        *** Before Every Step {
            D3
        }

        *** After Every Step {
            G2
        }

        *** After Every Step {
            G3
        }

E -
                `);

                let branches = tree.branchify(tree.root);
                mergeStepNodesInBranches(tree, branches);

                Comparer.expect(branches).to.match([
                    {
                        steps: [ { text: "A" }, { text: "B" } ],
                        afterEveryStep: undefined,
                        beforeEveryStep: undefined
                    },
                    {
                        steps: [ { text: "A" }, { text: "C" } ],
                        afterEveryStep: [
                            { text: "After Every Step", codeBlock: "\n            G1" },
                            { text: "After Every Step", codeBlock: "\n            G2" },
                            { text: "After Every Step", codeBlock: "\n            G3" }
                        ],
                        beforeEveryStep: [
                            { text: "Before Every Step", codeBlock: "\n            D3" },
                            { text: "Before Every Step", codeBlock: "\n            D2" },
                            { text: "Before Every Step", codeBlock: "\n            D1" }
                        ]
                    },
                    {
                        steps: [ { text: "E" } ],
                        afterEveryStep: undefined,
                        beforeEveryStep: undefined
                    }
                ]);
            });

            it("branchifies many *** Before Every Step and *** After Every Step hooks in the tree", () => {
                let tree = new Tree();
                tree.parseIn(`
A -
    B -
        C -
        D -

            E -

                *** After Every Step {
                    U
                }

            *** After Every Step {
                T
            }

        F -

    H -
    I -

        *** After Every Step {
            S
        }

    ..
    J -
    K -

        *** After Every Step {
            R
        }

        *** Before Every Step {
            X
        }

    L - ..
        M -
            N -

        *** After Every Step {
            Q
        }

        *** Before Every Step {
            Y
        }

        O -

    *** After Every Step {
        W
    }
G -
    P -
                `);
                let branches = tree.branchify(tree.root);
                mergeStepNodesInBranches(tree, branches);

                Comparer.expect(branches).to.match([
                    {
                        steps: [ { text: "A" }, { text: "B" }, { text: "C" }, { text: "E" } ],
                        afterEveryStep: [
                            { text: "After Every Step", codeBlock: "\n                    U" },
                            { text: "After Every Step", codeBlock: "\n                T" },
                            { text: "After Every Step", codeBlock: "\n        W" }
                        ]
                    },
                    {
                        steps: [ { text: "A" }, { text: "B" }, { text: "D" }, { text: "E" } ],
                        afterEveryStep: [
                            { text: "After Every Step", codeBlock: "\n                    U" },
                            { text: "After Every Step", codeBlock: "\n                T" },
                            { text: "After Every Step", codeBlock: "\n        W" }
                        ]
                    },
                    {
                        steps: [ { text: "A" }, { text: "B" }, { text: "F" } ],
                        afterEveryStep: [
                            { text: "After Every Step", codeBlock: "\n        W" }
                        ]
                    },
                    {
                        steps: [ { text: "A" }, { text: "H" } ],
                        afterEveryStep: [
                            { text: "After Every Step", codeBlock: "\n            S" },
                            { text: "After Every Step", codeBlock: "\n        W" }
                        ]
                    },
                    {
                        steps: [ { text: "A" }, { text: "I" } ],
                        afterEveryStep: [
                            { text: "After Every Step", codeBlock: "\n            S" },
                            { text: "After Every Step", codeBlock: "\n        W" }
                        ]
                    },
                    {
                        steps: [ { text: "A" }, { text: "J" }, { text: "K" } ],
                        beforeEveryStep: [
                            { text: "Before Every Step", codeBlock: "\n            X" }
                        ],
                        afterEveryStep: [
                            { text: "After Every Step", codeBlock: "\n            R" },
                            { text: "After Every Step", codeBlock: "\n        W" }
                        ]
                    },
                    {
                        steps: [ { text: "A" }, { text: "L" }, { text: "M" }, { text: "N" }, { text: "O" } ],
                        beforeEveryStep: [
                            { text: "Before Every Step", codeBlock: "\n            Y" }
                        ],
                        afterEveryStep: [
                            { text: "After Every Step", codeBlock: "\n            Q" },
                            { text: "After Every Step", codeBlock: "\n        W" }
                        ]
                    },
                    {
                        steps: [ { text: "G" }, { text: "P" } ],
                        afterEveryStep: undefined
                    }
                ]);
            });
        });

        context("*** Before Everything hook", () => {
            it("branchifies the *** Before Everything hook", () => {
                let tree = new Tree();
                tree.parseIn(`
A -

*** Before Everything {
    B
}
                `);

                let branches = tree.branchify(tree.root);

                mergeStepNodesInBranches(tree, branches);
                Comparer.expect(branches).to.match([
                    {
                        steps: [ { text: "A" } ]
                    }
                ]);

                mergeStepNodes(tree, tree.beforeEverything);
                Comparer.expect(tree.beforeEverything).to.match([
                    { text: "Before Everything", level: 0, codeBlock: "\n    B" }
                ]);
            });

            it("branchifies an empty *** Before Everything hook", () => {
                let tree = new Tree();
                tree.parseIn(`
*** Before Everything {
}
                `);

                let branches = tree.branchify(tree.root);

                mergeStepNodesInBranches(tree, branches);
                Comparer.expect(branches).to.match([]);

                mergeStepNodes(tree, tree.beforeEverything);
                Comparer.expect(tree.beforeEverything).to.match([
                    { text: "Before Everything", level: 0, codeBlock: "" }
                ]);
            });

            it("handles multiple *** Before Everything hooks that are siblings, and orders the last in tree to be first in tree.beforeEverything", () => {
                let tree = new Tree();
                tree.parseIn(`
*** Before Everything {
    B
}

*** Before Everything {
    C
}

A -
                `);

                let branches = tree.branchify(tree.root);

                mergeStepNodesInBranches(tree, branches);
                Comparer.expect(branches).to.match([
                    {
                        steps: [ { text: "A" } ]
                    }
                ]);

                mergeStepNodes(tree, tree.beforeEverything);
                Comparer.expect(tree.beforeEverything).to.match([
                    { text: "Before Everything", level: 0, codeBlock: "\n    C" },
                    { text: "Before Everything", level: 0, codeBlock: "\n    B" }
                ]);
            });

            it("rejects the *** Before Everything hook when not at 0 indents", () => {
                let tree = new Tree();
                tree.parseIn(`
A -
    *** Before Everything {
        B
    }
                `, "file.txt");

                assert.throws(() => {
                    tree.branchify(tree.root);
                }, "A Before Everything hook must not be indented (it must be at 0 indents) [file.txt:3]");
            });

            it("rejects a *** Before Everything hook that has children", () => {
                let tree = new Tree();
                tree.parseIn(`
*** Before Everything {
    B
}

    C -
                `, "file.txt");

                assert.throws(() => {
                    tree.branchify(tree.root);
                }, "A hook cannot have children [file.txt:2]");
            });
        });

        context("*** After Everything hook", () => {
            it("branchifies the *** After Everything hook", () => {
                let tree = new Tree();
                tree.parseIn(`
A -

*** After Everything {
    B
}
                `);

                let branches = tree.branchify(tree.root);

                mergeStepNodesInBranches(tree, branches);
                Comparer.expect(branches).to.match([
                    {
                        steps: [ { text: "A" } ]
                    }
                ]);

                mergeStepNodes(tree, tree.afterEverything);
                Comparer.expect(tree.afterEverything).to.match([
                    { text: "After Everything", level: 0, codeBlock: "\n    B" }
                ]);
            });

            it("branchifies an empty *** After Everything hook", () => {
                let tree = new Tree();
                tree.parseIn(`
*** After Everything {
}
                `);

                let branches = tree.branchify(tree.root);

                mergeStepNodesInBranches(tree, branches);
                Comparer.expect(branches).to.match([]);

                mergeStepNodes(tree, tree.afterEverything);
                Comparer.expect(tree.afterEverything).to.match([
                    { text: "After Everything", level: 0, codeBlock: "" }
                ]);
            });

            it("handles multiple *** After Everything hooks that are siblings, and orders the last in tree to be last in tree.afterEverything", () => {
                let tree = new Tree();
                tree.parseIn(`
*** After Everything {
    B
}

*** After Everything {
    C
}

A -
                `);

                let branches = tree.branchify(tree.root);

                mergeStepNodesInBranches(tree, branches);
                Comparer.expect(branches).to.match([
                    {
                        steps: [ { text: "A" } ]
                    }
                ]);

                mergeStepNodes(tree, tree.afterEverything);
                Comparer.expect(tree.afterEverything).to.match([
                    { text: "After Everything", level: 0, codeBlock: "\n    B" },
                    { text: "After Everything", level: 0, codeBlock: "\n    C" }
                ]);
            });

            it("rejects the *** After Everything hook when not at 0 indents", () => {
                let tree = new Tree();
                tree.parseIn(`
A -
    *** After Everything {
        B
    }
                `, "file.txt");

                assert.throws(() => {
                    tree.branchify(tree.root);
                }, "An After Everything hook must not be indented (it must be at 0 indents) [file.txt:3]");
            });

            it("rejects a *** After Everything hook that has children", () => {
                let tree = new Tree();
                tree.parseIn(`
*** After Everything {
    B
}

    C -
                `, "file.txt");

                assert.throws(() => {
                    tree.branchify(tree.root);
                }, "A hook cannot have children [file.txt:2]");
            });
        });
    });

    describe("removeUnwantedBranches()", () => {
        context("$", () => {
            it("only keeps a branches under a $", () => {
                let tree = new Tree();
                tree.parseIn(`
A -
    B -

    $ C -

        D -

        E -

G -
                `);

                let branches = tree.branchify(tree.root);
                mergeStepNodesInBranches(tree, branches);

                Comparer.expect(branches).to.match([
                    {
                        steps: [ { text: "A" }, { text: "C" }, { text: "D" } ],
                        isOnly: true,
                        isDebug: undefined
                    },
                    {
                        steps: [ { text: "A" }, { text: "C" }, { text: "E" } ],
                        isOnly: true,
                        isDebug: undefined
                    }
                ]);
            });

            it("only keeps branches that intersect under multiple $'s", () => {
                let tree = new Tree();
                tree.parseIn(`
A -
    B -

    $ C -

        D -

        $ E -

            $ F -

G -
                `);

                let branches = tree.branchify(tree.root);
                mergeStepNodesInBranches(tree, branches);

                Comparer.expect(branches).to.match([
                    {
                        steps: [ { text: "A" }, { text: "C" }, { text: "E" }, { text: "F" } ],
                        isOnly: true,
                        isDebug: undefined
                    }
                ]);
            });

            it("keeps multiple branches that are under non-intersecting $'s", () => {
                let tree = new Tree();
                tree.parseIn(`
A -
    B -

    $ C -

        D -

        $ E -

            F -

    $ G -

    $ H -
        $ I -

J -
                `);

                let branches = tree.branchify(tree.root);
                mergeStepNodesInBranches(tree, branches);

                Comparer.expect(branches).to.match([
                    {
                        steps: [ { text: "A" }, { text: "C" }, { text: "E" }, { text: "F" } ],
                        isOnly: true,
                        isDebug: undefined
                    },
                    {
                        steps: [ { text: "A" }, { text: "G" } ],
                        isOnly: true,
                        isDebug: undefined
                    },
                    {
                        steps: [ { text: "A" }, { text: "H" }, { text: "I" } ],
                        isOnly: true,
                        isDebug: undefined
                    }
                ]);
            });

            it("handles $ when it's attached to a step block member", () => {
                let tree = new Tree();
                tree.parseIn(`
$ A -
    B -
    $ C -

        D -
        $ E -

            F -

    $ G -
    $ H -

        $ I -

    P -
    Q -
    $ J -
    $ K -
    R -

        L -

$ M -

    N -
    O -
                `);

                let branches = tree.branchify(tree.root);
                mergeStepNodesInBranches(tree, branches);

                Comparer.expect(branches).to.match([
                    {
                        steps: [ { text: "A" }, { text: "C" }, { text: "E" }, { text: "F" } ],
                        isOnly: true,
                        isDebug: undefined
                    },
                    {
                        steps: [ { text: "A" }, { text: "G" }, { text: "I" } ],
                        isOnly: true,
                        isDebug: undefined
                    },
                    {
                        steps: [ { text: "A" }, { text: "H" }, { text: "I" } ],
                        isOnly: true,
                        isDebug: undefined
                    },
                    {
                        steps: [ { text: "A" }, { text: "J" }, { text: "L" } ],
                        isOnly: true,
                        isDebug: undefined
                    },
                    {
                        steps: [ { text: "A" }, { text: "K" }, { text: "L" } ],
                        isOnly: true,
                        isDebug: undefined
                    },
                    {
                        steps: [ { text: "M" }, { text: "N" } ],
                        isOnly: true,
                        isDebug: undefined
                    },
                    {
                        steps: [ { text: "M" }, { text: "O" } ],
                        isOnly: true,
                        isDebug: undefined
                    }
                ]);
            });

            it("handles $ when it's inside a function declaration", () => {
                let tree = new Tree();
                tree.parseIn(`
F
F

* F
    $ A -
        B -

    C -
                `);

                let branches = tree.branchify(tree.root);
                mergeStepNodesInBranches(tree, branches);

                Comparer.expect(branches).to.match([
                    {
                        steps: [ { text: "F" }, { text: "A" }, { text: "B" } ],
                        isOnly: true,
                        isDebug: undefined
                    },
                    {
                        steps: [ { text: "F" }, { text: "A" }, { text: "B" } ],
                        isOnly: true,
                        isDebug: undefined
                    }
                ]);
            });

            it("handles multiple $'s inside and outside a function declaration", () => {
                let tree = new Tree();
                tree.parseIn(`
J -
    F

$ K -
    F

* F
    $ A -
        B -

    C -
                `);

                let branches = tree.branchify(tree.root);
                mergeStepNodesInBranches(tree, branches);

                Comparer.expect(branches).to.match([
                    {
                        steps: [ { text: "K" }, { text: "F" }, { text: "A" }, { text: "B" } ],
                        isOnly: true,
                        isDebug: undefined
                    }
                ]);
            });

            it("handles multiple $'s inside a function declaration and on a function call", () => {
                let tree = new Tree();
                tree.parseIn(`
J -
    F

K -
    $ F

* F
    $ A -
        B -

    C -
                `);

                let branches = tree.branchify(tree.root);
                mergeStepNodesInBranches(tree, branches);

                Comparer.expect(branches).to.match([
                    {
                        steps: [ { text: "K" }, { text: "F" }, { text: "A" }, { text: "B" } ],
                        isOnly: true,
                        isDebug: undefined
                    }
                ]);
            });

            it("handles multiple $'s on a function declaration and on a function call", () => {
                let tree = new Tree();
                tree.parseIn(`
J -
    F

K -
    $ F

$ * F
    A -
        B -
                `);

                let branches = tree.branchify(tree.root);
                mergeStepNodesInBranches(tree, branches);

                Comparer.expect(branches).to.match([
                    {
                        steps: [ { text: "K" }, { text: "F" }, { text: "A" }, { text: "B" } ],
                        isOnly: true,
                        isDebug: undefined
                    }
                ]);
            });

            it("handles multiple $'s on a function declaration and above the function call", () => {
                let tree = new Tree();
                tree.parseIn(`
J -
    F

$ K -
    F

$ * F
    A -
        B -
                `);

                let branches = tree.branchify(tree.root);
                mergeStepNodesInBranches(tree, branches);

                Comparer.expect(branches).to.match([
                    {
                        steps: [ { text: "K" }, { text: "F" }, { text: "A" }, { text: "B" } ],
                        isOnly: true,
                        isDebug: undefined
                    }
                ]);
            });

            it("handles multiple $'s inside a function declaration and below the function call", () => {
                let tree = new Tree();
                tree.parseIn(`
J -
    F

K -
    $ F
        $ W -

* F
    A -
        B -
            $ D -

    C -
                `);

                let branches = tree.branchify(tree.root);
                mergeStepNodesInBranches(tree, branches);

                Comparer.expect(branches).to.match([
                    {
                        steps: [ { text: "K" }, { text: "F" }, { text: "A" }, { text: "B" }, { text: "D" }, { text: "W" } ],
                        isOnly: true,
                        isDebug: undefined
                    }
                ]);
            });

            it("handles $ when it's inside a .. step", () => {
                let tree = new Tree();
                tree.parseIn(`
$ A .. -
    B -
        C -
    $ D -
        E -
    F -

$ G .. -
    H -
    I -
                `);

                let branches = tree.branchify(tree.root);
                mergeStepNodesInBranches(tree, branches);

                Comparer.expect(branches).to.match([
                    {
                        steps: [ { text: "A" }, { text: "B" }, { text: "C" }, { text: "D" }, { text: "E" }, { text: "F" } ],
                        isOnly: true,
                        isDebug: undefined
                    },
                    {
                        steps: [ { text: "G" }, { text: "H" }, { text: "I" } ],
                        isOnly: true,
                        isDebug: undefined
                    }
                ]);
            });

            it("handles $ when it's attached to a .. step block member", () => {
                let tree = new Tree();
                tree.parseIn(`
..
A -
$ B -
C -

    D -
    E -
                `);

                let branches = tree.branchify(tree.root);
                mergeStepNodesInBranches(tree, branches);

                Comparer.expect(branches).to.match([
                    {
                        steps: [ { text: "A" }, { text: "B" }, { text: "C" }, { text: "D" } ],
                        isOnly: true,
                        isDebug: undefined
                    },
                    {
                        steps: [ { text: "A" }, { text: "B" }, { text: "C" }, { text: "E" } ],
                        isOnly: true,
                        isDebug: undefined
                    }
                ]);
            });
        });

        context("~", () => {
            it("isolates a branch with a single ~ before the step", () => {
                let tree = new Tree();
                tree.parseIn(`
A -
    ~ B -
        C -
    D -
    E -

F -
                `);

                let branches = tree.branchify(tree.root);
                mergeStepNodesInBranches(tree, branches);

                Comparer.expect(branches).to.match([
                    {
                        steps: [ { text: "A" }, { text: "B" }, { text: "C" } ],
                        isOnly: undefined,
                        isDebug: true
                    }
                ]);
            });

            it("isolates a branch with a single ~ after the step", () => {
                let tree = new Tree();
                tree.parseIn(`
A -
    B - ~
        C -
    D -
    E -

F -
                `);

                let branches = tree.branchify(tree.root);
                mergeStepNodesInBranches(tree, branches);

                Comparer.expect(branches).to.match([
                    {
                        steps: [ { text: "A" }, { text: "B" }, { text: "C" } ],
                        isOnly: undefined,
                        isDebug: true
                    }
                ]);
            });

            it("isolates a branch with a single ~~ before the step", () => {
                let tree = new Tree();
                tree.parseIn(`
A -
    ~~ B -
        C -
    D -
    E -

F -
                `);

                let branches = tree.branchify(tree.root);
                mergeStepNodesInBranches(tree, branches);

                Comparer.expect(branches).to.match([
                    {
                        steps: [ { text: "A" }, { text: "B" }, { text: "C" } ],
                        isOnly: undefined,
                        isDebug: true
                    }
                ]);
            });

            it("isolates a branch with ~ on multiple steps", () => {
                let tree = new Tree();
                tree.parseIn(`
A -
    ~ B -

        E -
            F -

        ~ G -
            H -

        I -

J -
                `);

                let branches = tree.branchify(tree.root);
                mergeStepNodesInBranches(tree, branches);

                Comparer.expect(branches).to.match([
                    {
                        steps: [ { text: "A" }, { text: "B" }, { text: "G" }, { text: "H" } ],
                        isOnly: undefined,
                        isDebug: true
                    }
                ]);
            });

            it("isolates a branch with ~ on multiple steps, before and after the step", () => {
                let tree = new Tree();
                tree.parseIn(`
A -
    ~ B -

        E -
            F -

        G - ~
            H -

        I -

J -
                `);

                let branches = tree.branchify(tree.root);
                mergeStepNodesInBranches(tree, branches);

                Comparer.expect(branches).to.match([
                    {
                        steps: [ { text: "A" }, { text: "B" }, { text: "G" }, { text: "H" } ],
                        isOnly: undefined,
                        isDebug: true
                    }
                ]);
            });

            it("isolates a branch with ~ on multiple steps, where one of the ~'s is inside a function declaration", () => {
                let tree = new Tree();
                tree.parseIn(`
A -
    F
B -
    ~ F

* F
    ~ K -
                `, "file.txt");

                let branches = tree.branchify(tree.root);
                mergeStepNodesInBranches(tree, branches);

                Comparer.expect(branches).to.match([
                    {
                        steps: [ { text: "B" }, { text: "F" }, { text: "K" } ],
                        isOnly: undefined,
                        isDebug: true
                    }
                ]);
            });

            it("isolates a branch with ~ on multiple steps, where one of the ~'s is on a function declaration", () => {
                let tree = new Tree();
                tree.parseIn(`
A -
    F
~ B -
    F

~ * F
    K -
                `, "file.txt");

                let branches = tree.branchify(tree.root);
                mergeStepNodesInBranches(tree, branches);

                Comparer.expect(branches).to.match([
                    {
                        steps: [ { text: "B" }, { text: "F" }, { text: "K" } ],
                        isOnly: undefined,
                        isDebug: true
                    }
                ]);
            });

            it("isolates a branch with ~ on multiple steps, where one of the ~'s is on a function declaration and function call", () => {
                let tree = new Tree();
                tree.parseIn(`
A -
    F
B -
    ~ F

~ * F
    K -
                `, "file.txt");

                let branches = tree.branchify(tree.root);
                mergeStepNodesInBranches(tree, branches);

                Comparer.expect(branches).to.match([
                    {
                        steps: [ { text: "B" }, { text: "F" }, { text: "K" } ],
                        isOnly: undefined,
                        isDebug: true
                    }
                ]);
            });

            it("isolates the first branch when ~ is on multiple branches", () => {
                let tree = new Tree();
                tree.parseIn(`
A -
    ~ B -

        E -
            F -

        ~ G -
            H -

        ~ I -

J -
                `, "file.txt");

                let branches = tree.branchify(tree.root);
                mergeStepNodesInBranches(tree, branches);

                Comparer.expect(branches).to.match([
                    {
                        steps: [ { text: "A" }, { text: "B" }, { text: "G" }, { text: "H" } ],
                        isOnly: undefined,
                        isDebug: true
                    }
                ]);
            });

            it("isolates the first branch when ~ is on a function declaration that's called on multiple branches", () => {
                let tree = new Tree();
                tree.parseIn(`
A -
    F
B -
    F

~ * F
    K -
                `, "file.txt");

                let branches = tree.branchify(tree.root);
                mergeStepNodesInBranches(tree, branches);

                Comparer.expect(branches).to.match([
                    {
                        steps: [ { text: "A" }, { text: "F" }, { text: "K" } ],
                        isOnly: undefined,
                        isDebug: true
                    }
                ]);
            });

            it("isolates the first branch when ~ is inside a function declaration that's called on multiple branches", () => {
                let tree = new Tree();
                tree.parseIn(`
A -
    F
B -
    F

* F
    ~ K -
                `, "file.txt");

                let branches = tree.branchify(tree.root);
                mergeStepNodesInBranches(tree, branches);

                Comparer.expect(branches).to.match([
                    {
                        steps: [ { text: "A" }, { text: "F" }, { text: "K" } ],
                        isOnly: undefined,
                        isDebug: true
                    }
                ]);
            });

            it("isolates the first branch when ~ is on multiple branches via a step block", () => {
                let tree = new Tree();
                tree.parseIn(`
A -
B -
C -

    ~ D -
                `, "file.txt");

                let branches = tree.branchify(tree.root);
                mergeStepNodesInBranches(tree, branches);

                Comparer.expect(branches).to.match([
                    {
                        steps: [ { text: "A" }, { text: "D" } ],
                        isOnly: undefined,
                        isDebug: true
                    }
                ]);
            });

            it("isolates the first branch when ~ is on multiple branches via multiple function calls", () => {
                let tree = new Tree();
                tree.parseIn(`
* F
    ~ A -

F

B -
    F
                `, "file.txt");

                let branches = tree.branchify(tree.root);
                mergeStepNodesInBranches(tree, branches);

                Comparer.expect(branches).to.match([
                    {
                        steps: [ { text: "F" }, { text: "A" } ],
                        isOnly: undefined,
                        isDebug: true
                    }
                ]);
            });

            it("isolates the first branch when a ~ step has multiple branches underneath it", () => {
                let tree = new Tree();
                tree.parseIn(`
~ A -
    B -
    C -
    D -
                `, "file.txt");

                let branches = tree.branchify(tree.root);
                mergeStepNodesInBranches(tree, branches);

                Comparer.expect(branches).to.match([
                    {
                        steps: [ { text: "A" }, { text: "B" } ],
                        isOnly: undefined,
                        isDebug: true
                    }
                ]);

                tree = new Tree();
                tree.parseIn(`
~ A -

    B -

    C -
                `, "file.txt");

                branches = tree.branchify(tree.root);
                mergeStepNodesInBranches(tree, branches);

                Comparer.expect(branches).to.match([
                    {
                        steps: [ { text: "A" }, { text: "B" } ],
                        isOnly: undefined,
                        isDebug: true
                    }
                ]);
            });

            it("handles ~ when it's attached to a step block member", () => {
                let tree = new Tree();
                tree.parseIn(`
A -
    B -
    ~ C -
    D -

        E -
            F -

        ~ G -
            H -

        I -

J -
                `);

                let branches = tree.branchify(tree.root);
                mergeStepNodesInBranches(tree, branches);

                Comparer.expect(branches).to.match([
                    {
                        steps: [ { text: "A" }, { text: "C" }, { text: "G" }, { text: "H" } ],
                        isOnly: undefined,
                        isDebug: true
                    }
                ]);
            });

            it("handles ~ when it's inside a function declaration", () => {
                let tree = new Tree();
                tree.parseIn(`
* F
    A -

    ~ B -
        C -
        D -

F
    X -
    Y -
                `);

                let branches = tree.branchify(tree.root);
                mergeStepNodesInBranches(tree, branches);

                Comparer.expect(branches).to.match([
                    {
                        steps: [ { text: "F" }, { text: "B" }, { text: "C" }, { text: "X" } ],
                        isOnly: undefined,
                        isDebug: true
                    }
                ]);
            });

            it("handles using multiple $'s and a ~ to isolate a single branch to debug", () => {
                let tree = new Tree();
                tree.parseIn(`
A -
    $ B -
    C -

        $ ~ D -
            E -

        F -

    G -
        H -

I -
                `);

                let branches = tree.branchify(tree.root);
                mergeStepNodesInBranches(tree, branches);

                Comparer.expect(branches).to.match([
                    {
                        steps: [ { text: "A" }, { text: "B" }, { text: "D" }, { text: "E" } ],
                        isOnly: true,
                        isDebug: true,
                    }
                ]);

                tree = new Tree();
                tree.parseIn(`
A -
    $ B -
    C -

        $ D -
            ~ E -

        F -

    G -
        H -

I -
                `);

                branches = tree.branchify(tree.root);
                mergeStepNodesInBranches(tree, branches);

                Comparer.expect(branches).to.match([
                    {
                        steps: [ { text: "A" }, { text: "B" }, { text: "D" }, { text: "E" } ],
                        isOnly: true,
                        isDebug: true,
                    }
                ]);
            });

            it("handles ~ and ~~ on the same branch", () => {
                let tree = new Tree();
                tree.parseIn(`
A -
    ~~ B -
        ~ C -
    D -
    E -

F -
                `);

                let branches = tree.branchify(tree.root);
                mergeStepNodesInBranches(tree, branches);

                Comparer.expect(branches).to.match([
                    {
                        steps: [ { text: "A" }, { text: "B" }, { text: "C" } ],
                        isOnly: undefined,
                        isDebug: true
                    }
                ]);
            });

            it("handles ~ and ~~ on the same step", () => {
                let tree = new Tree();
                tree.parseIn(`
A -
    ~ ~~ B -
        C -
    D -
    E -

F -
                `);

                let branches = tree.branchify(tree.root);
                mergeStepNodesInBranches(tree, branches);

                Comparer.expect(branches).to.match([
                    {
                        steps: [ { text: "A" }, { text: "B" }, { text: "C" } ],
                        isOnly: undefined,
                        isDebug: true
                    }
                ]);
            });
        });

        context("frequency", () => {
            it("sets the frequency of a branch", () => {
                let tree = new Tree();
                tree.parseIn(`
A -
    B - #high
    C -
D -
                `, "file.txt");

                let branches = tree.branchify(tree.root);
                mergeStepNodesInBranches(tree, branches);

                Comparer.expect(branches).to.match([
                    {
                        steps: [ { text: "A" },  { text: "B" } ],
                        frequency: 'high'
                    },
                    {
                        steps: [ { text: "A" },  { text: "C" } ],
                        frequency: undefined
                    },
                    {
                        steps: [ { text: "D" } ],
                        frequency: undefined
                    }
                ]);
            });

            it("sets the frequency of multiple branches", () => {
                let tree = new Tree();
                tree.parseIn(`
A -
    B - #high
        C -
        D -

E -

F - #low
                `, "file.txt");

                let branches = tree.branchify(tree.root);
                mergeStepNodesInBranches(tree, branches);

                Comparer.expect(branches).to.match([
                    {
                        steps: [ { text: "A" },  { text: "B" }, { text: "C" } ],
                        frequency: 'high'
                    },
                    {
                        steps: [ { text: "A" },  { text: "B" }, { text: "D" } ],
                        frequency: 'high'
                    },
                    {
                        steps: [ { text: "E" } ],
                        frequency: undefined
                    },
                    {
                        steps: [ { text: "F" } ],
                        frequency: 'low'
                    }
                ]);
            });

            it("sets the frequency of multiple branches when the frequency is set over a step block", () => {
                let tree = new Tree();
                tree.parseIn(`
A -
    B -
        C -
        D - #high

        K - #low
            E -
            F -
G -
                `, "file.txt");

                let branches = tree.branchify(tree.root);
                mergeStepNodesInBranches(tree, branches);

                Comparer.expect(branches).to.match([
                    {
                        steps: [ { text: "A" },  { text: "B" }, { text: "C" } ],
                        frequency: undefined
                    },
                    {
                        steps: [ { text: "A" },  { text: "B" }, { text: "D" } ],
                        frequency: 'high'
                    },
                    {
                        steps: [ { text: "A" },  { text: "B" }, { text: "K" }, { text: "E" } ],
                        frequency: 'low'
                    },
                    {
                        steps: [ { text: "A" },  { text: "B" }, { text: "K" }, { text: "F" } ],
                        frequency: 'low'
                    },
                    {
                        steps: [ { text: "G" } ],
                        frequency: undefined
                    }
                ]);
            });

            it("sets the frequency of a branch to the deepest frequency when more than one exist on a branch", () => {
                let tree = new Tree();
                tree.parseIn(`
A - #high
    B - #low
        C -
                `, "file.txt");

                let branches = tree.branchify(tree.root);
                mergeStepNodesInBranches(tree, branches);

                Comparer.expect(branches).to.match([
                    {
                        steps: [ { text: "A" }, { text: "B" }, { text: "C" } ],
                        frequency: 'low'
                    }
                ]);
            });

            it("keeps all branches when frequency is set to low", () => {
                let tree = new Tree();
                tree.parseIn(`
A - #high
    B -

    K - #med
        C -

        D - #high
            E -

        F - #low
G -
                `, "file.txt");

                tree.minFrequency = "low";
                let branches = tree.branchify(tree.root);
                mergeStepNodesInBranches(tree, branches);

                Comparer.expect(branches).to.match([
                    {
                        steps: [ { text: "A" }, { text: "B" } ],
                        frequency: 'high'
                    },
                    {
                        steps: [ { text: "A" }, { text: "K" }, { text: "C" } ],
                        frequency: 'med'
                    },
                    {
                        steps: [ { text: "A" }, { text: "K" }, { text: "D" }, { text: "E" } ],
                        frequency: 'high'
                    },
                    {
                        steps: [ { text: "A" }, { text: "K" }, { text: "F" } ],
                        frequency: 'low'
                    },
                    {
                        steps: [ { text: "G" } ],
                        frequency: undefined
                    }
                ]);
            });

            it("keeps all branches when frequency is not set", () => {
                let tree = new Tree();
                tree.parseIn(`
A - #high
    B -

    K - #med
        C -

        D - #high
            E -

        F - #low
G -
                `, "file.txt");

                let branches = tree.branchify(tree.root);
                mergeStepNodesInBranches(tree, branches);

                Comparer.expect(branches).to.match([
                    {
                        steps: [ { text: "A" }, { text: "B" } ],
                        frequency: 'high'
                    },
                    {
                        steps: [ { text: "A" }, { text: "K" }, { text: "C" } ],
                        frequency: 'med'
                    },
                    {
                        steps: [ { text: "A" }, { text: "K" }, { text: "D" }, { text: "E" } ],
                        frequency: 'high'
                    },
                    {
                        steps: [ { text: "A" }, { text: "K" }, { text: "F" } ],
                        frequency: 'low'
                    },
                    {
                        steps: [ { text: "G" } ],
                        frequency: undefined
                    }
                ]);
            });

            it("keeps branches at or above med frequency", () => {
                let tree = new Tree();
                tree.parseIn(`
A - #high
    B -

    K - #med
        C -

        D - #high
            E -

        F - #low
G -
                `, "file.txt");

                tree.minFrequency = "med";
                let branches = tree.branchify(tree.root);
                mergeStepNodesInBranches(tree, branches);

                Comparer.expect(branches).to.match([
                    {
                        steps: [ { text: "A" }, { text: "B" } ],
                        frequency: 'high'
                    },
                    {
                        steps: [ { text: "A" }, { text: "K" }, { text: "C" } ],
                        frequency: 'med'
                    },
                    {
                        steps: [ { text: "A" }, { text: "K" }, { text: "D" }, { text: "E" } ],
                        frequency: 'high'
                    },
                    {
                        steps: [ { text: "G" } ],
                        frequency: undefined
                    }
                ]);
            });

            it("keeps branches at high frequency", () => {
                let tree = new Tree();
                tree.parseIn(`
A - #high
    B -

    K - #med
        C -

        D - #high
            E -

        F - #low
G -
                `, "file.txt");

                tree.minFrequency = "high";
                let branches = tree.branchify(tree.root);
                mergeStepNodesInBranches(tree, branches);

                Comparer.expect(branches).to.match([
                    {
                        steps: [ { text: "A" }, { text: "B" } ],
                        frequency: 'high'
                    },
                    {
                        steps: [ { text: "A" }, { text: "K" }, { text: "D" }, { text: "E" } ],
                        frequency: 'high'
                    }
                ]);
            });

            it("handles frequencies on function declarations", () => {
                let tree = new Tree();
                tree.parseIn(`
F
    A -

* F #high
                `, "file.txt");

                let branches = tree.branchify(tree.root);
                mergeStepNodesInBranches(tree, branches);

                Comparer.expect(branches).to.match([
                    {
                        steps: [ { text: "F" }, { text: "A" } ],
                        frequency: 'high'
                    }
                ]);
            });

            it("handles frequencies inside function declarations", () => {
                let tree = new Tree();
                tree.parseIn(`
F
    A -

* F
    B - #high
                `, "file.txt");

                let branches = tree.branchify(tree.root);
                mergeStepNodesInBranches(tree, branches);

                Comparer.expect(branches).to.match([
                    {
                        steps: [ { text: "F" }, { text: "B" }, { text: "A" } ],
                        frequency: 'high'
                    }
                ]);
            });

            it("handles frequencies on function calls", () => {
                let tree = new Tree();
                tree.parseIn(`
F #high
    A -

* F
    B -
                `, "file.txt");

                let branches = tree.branchify(tree.root);
                mergeStepNodesInBranches(tree, branches);

                Comparer.expect(branches).to.match([
                    {
                        steps: [ { text: "F" }, { text: "B" }, { text: "A" } ],
                        frequency: 'high'
                    }
                ]);
            });

            it("combines frequencies on function calls and declarations", () => {
                let tree = new Tree();
                tree.parseIn(`
F #low
    A -

* F #high
                `, "file.txt");

                let branches = tree.branchify(tree.root);
                mergeStepNodesInBranches(tree, branches);

                Comparer.expect(branches).to.match([
                    {
                        steps: [ { text: "F" }, { text: "A" } ],
                        frequency: 'high'
                    }
                ]);
            });

            it("combines frequencies on function calls and steps inside function declarations", () => {
                let tree = new Tree();
                tree.parseIn(`
F #low
    A -

* F
    B - #high
                `, "file.txt");

                let branches = tree.branchify(tree.root);
                mergeStepNodesInBranches(tree, branches);

                Comparer.expect(branches).to.match([
                    {
                        steps: [ { text: "F" }, { text: "B" }, { text: "A" } ],
                        frequency: 'high'
                    }
                ]);
            });

            it("throws exception if a ~ exists, but is cut off due to a frequency restriction", () => {
                let tree = new Tree();
                tree.parseIn(`
A - #high
    B -

    K - #med
        C - ~

        D - #high
            E -

        F - #low
    G -
                `, "file.txt");

                assert.throws(() => {
                    tree.minFrequency = "high";
                    tree.branchify(tree.root);
                }, "This step contains a ~, but is not above the frequency allowed to run (high). Either set its frequency higher or remove the ~. [file.txt:6]");

                tree.minFrequency = "med";
                tree.branchify(tree.root);
                tree.minFrequency = "low";
                tree.branchify(tree.root);
                delete tree.minFrequency;
                tree.branchify(tree.root);
            });
        });

        context("groups", () => {
            it("sets the groups for a branch", () => {
                let tree = new Tree();
                tree.parseIn(`
A -
    B -
        #primary - Something #first #1st

    Something else - #second
        D -

        E -
        F -

G -
                `, "file.txt");

                let branches = tree.branchify(tree.root);
                mergeStepNodesInBranches(tree, branches);

                Comparer.expect(branches).to.match([
                    {
                        steps: [ { text: "A" }, { text: "B" }, { text: "Something" } ],
                        groups: [ 'primary', 'first', '1st' ]
                    },
                    {
                        steps: [ { text: "A" }, { text: "Something else" }, { text: "D" } ],
                        groups: [ 'second' ]
                    },
                    {
                        steps: [ { text: "A" }, { text: "Something else" }, { text: "E" } ],
                        groups: [ 'second' ]
                    },
                    {
                        steps: [ { text: "A" }, { text: "Something else" }, { text: "F" } ],
                        groups: [ 'second' ]
                    },
                    {
                        steps: [ { text: "G" } ],
                        groups: undefined
                    }
                ]);
            });

            it("sets multiple groups for a branch", () => {
                let tree = new Tree();
                tree.parseIn(`
A -
    B -
        C1 - #first
            C2 - #second

    C3 - #third
        D - #fourth #fifth

        E -
        F -

            - C4 #sixth

G -
                `, "file.txt");

                let branches = tree.branchify(tree.root);
                mergeStepNodesInBranches(tree, branches);

                Comparer.expect(branches).to.match([
                    {
                        steps: [ { text: "A" }, { text: "B" }, { text: "C1" }, { text: "C2" } ],
                        groups: [ 'first', 'second' ]
                    },
                    {
                        steps: [ { text: "A" }, { text: "C3" }, { text: "D" } ],
                        groups: [ 'third', 'fourth', 'fifth' ]
                    },
                    {
                        steps: [ { text: "A" }, { text: "C3" }, { text: "E" }, { text: "C4" } ],
                        groups: [ 'third', 'sixth' ]
                    },
                    {
                        steps: [ { text: "A" }, { text: "C3" }, { text: "F" }, { text: "C4" } ],
                        groups: [ 'third', 'sixth' ]
                    },
                    {
                        steps: [ { text: "G" } ],
                        groups: undefined
                    }
                ]);
            });

            it("keeps all branches when no groups are set", () => {
                let tree = new Tree();
                tree.parseIn(`
A -
    B -
        C1 - #first
            C2 - #second

    C3 - #third
        D - #fourth #fifth

        E -
        F -

            - C4 #sixth

G -
                `, "file.txt");

                let branches = tree.branchify(tree.root);
                mergeStepNodesInBranches(tree, branches);

                Comparer.expect(branches).to.match([
                    {
                        steps: [ { text: "A" }, { text: "B" }, { text: "C1" }, { text: "C2" } ],
                        groups: [ 'first', 'second' ]
                    },
                    {
                        steps: [ { text: "A" }, { text: "C3" }, { text: "D" } ],
                        groups: [ 'third', 'fourth', 'fifth' ]
                    },
                    {
                        steps: [ { text: "A" }, { text: "C3" }, { text: "E" }, { text: "C4" } ],
                        groups: [ 'third', 'sixth' ]
                    },
                    {
                        steps: [ { text: "A" }, { text: "C3" }, { text: "F" }, { text: "C4" } ],
                        groups: [ 'third', 'sixth' ]
                    },
                    {
                        steps: [ { text: "G" } ],
                        groups: undefined
                    }
                ]);
            });

            it("only keeps branches that are part of a group being run", () => {
                let tree = new Tree();
                tree.parseIn(`
A -
    B -
        C1 - #first
            C2 - #second

    C3 - #third
        D - #fourth #first

        E -
        F -

            - C4 #sixth

G -
                `, "file.txt");

                tree.groups = [["first"]];
                let branches = tree.branchify(tree.root);
                mergeStepNodesInBranches(tree, branches);

                Comparer.expect(branches).to.match([
                    {
                        steps: [ { text: "A" }, { text: "B" }, { text: "C1" }, { text: "C2" } ],
                        groups: [ 'first', 'second' ]
                    },
                    {
                        steps: [ { text: "A" }, { text: "C3" }, { text: "D" } ],
                        groups: [ 'third', 'fourth', 'first' ]
                    }
                ]);
            });

            it("only keeps branches that are part of a group being run, when multiple groups are being run", () => {
                let tree = new Tree();
                tree.parseIn(`
A -
    B -
        C1 - #first
            C2 - #second

    C3 - #third
        D - #fourth #first

        E -
        F -

            - C4 #sixth

        - L #sixth

G -
                `, "file.txt");


                tree.groups = [["first"], ["sixth"]];
                let branches = tree.branchify(tree.root);
                mergeStepNodesInBranches(tree, branches);

                Comparer.expect(branches).to.match([
                    {
                        steps: [ { text: "A" }, { text: "B" }, { text: "C1" }, { text: "C2" } ],
                        groups: [ 'first', 'second' ]
                    },
                    {
                        steps: [ { text: "A" }, { text: "C3" }, { text: "D" } ],
                        groups: [ 'third', 'fourth', 'first' ]
                    },
                    {
                        steps: [ { text: "A" }, { text: "C3" }, { text: "E" }, { text: "C4" } ],
                        groups: [ 'third', 'sixth' ]
                    },
                    {
                        steps: [ { text: "A" }, { text: "C3" }, { text: "F" }, { text: "C4" } ],
                        groups: [ 'third', 'sixth' ]
                    },
                    {
                        steps: [ { text: "A" }, { text: "C3" }, { text: "L" } ],
                        groups: [ 'third', 'sixth' ]
                    }
                ]);
            });

            it("only keeps branches that are part of a group being run, when an expression including ANDs is being run", () => {
                let tree = new Tree();
                tree.parseIn(`
A -
    B -
        C1 - #first
            C2 - #second

    C3 -
        D - #second #third

        E - #second
        F - #third

            - C4 #sixth

        - L #sixth

G -
                `, "file.txt");


                tree.groups = [["first"], ["second", "third"]];
                let branches = tree.branchify(tree.root);
                mergeStepNodesInBranches(tree, branches);

                Comparer.expect(branches).to.match([
                    {
                        steps: [ { text: "A" }, { text: "B" }, { text: "C1" }, { text: "C2" } ],
                        groups: [ 'first', 'second' ]
                    },
                    {
                        steps: [ { text: "A" }, { text: "C3" }, { text: "D" } ],
                        groups: [ 'second', 'third' ]
                    }
                ]);
            });

            it("only keeps branches that are part of a group being run, when an expression including ANDs is being run, longer expression", () => {
                let tree = new Tree();
                tree.parseIn(`
A -
    B -
        C1 - #first
            C2 - #second

    C3 -
        D - #second #third

        E - #second
        F - #third

            - C4 #sixth

        - L #sixth #seventh

G - #first #last
                `, "file.txt");


                tree.groups = [["second", "third"], ['sixth', 'seventh'], ['first', 'last']];
                let branches = tree.branchify(tree.root);
                mergeStepNodesInBranches(tree, branches);

                Comparer.expect(branches).to.match([
                    {
                        steps: [ { text: "A" }, { text: "C3" }, { text: "D" } ],
                        groups: [ 'second', 'third' ]
                    },
                    {
                        steps: [ { text: "A" }, { text: "C3" }, { text: "L" } ],
                        groups: [ 'sixth', 'seventh' ]
                    },
                    {
                        steps: [ { text: "G" } ],
                        groups: [ 'first', 'last' ]
                    }
                ]);
            });

            it("handles groups on function declarations", () => {
                let tree = new Tree();
                tree.parseIn(`
F
    A -

* F #one
                `, "file.txt");

                let branches = tree.branchify(tree.root);
                mergeStepNodesInBranches(tree, branches);

                Comparer.expect(branches).to.match([
                    {
                        steps: [ { text: "F" }, { text: "A" } ],
                        groups: [ 'one' ]
                    }
                ]);
            });

            it("combines groups on function calls and declarations", () => {
                let tree = new Tree();
                tree.parseIn(`
F #one
    A -

* F #two
                `, "file.txt");

                let branches = tree.branchify(tree.root);
                mergeStepNodesInBranches(tree, branches);

                Comparer.expect(branches).to.match([
                    {
                        steps: [ { text: "F" }, { text: "A" } ],
                        groups: [ 'one', 'two' ]
                    }
                ]);
            });

            it("combines groups on function calls and steps inside function declarations", () => {
                let tree = new Tree();
                tree.parseIn(`
F #one
    A -

* F
    B - #two
                `, "file.txt");

                let branches = tree.branchify(tree.root);
                mergeStepNodesInBranches(tree, branches);

                Comparer.expect(branches).to.match([
                    {
                        steps: [ { text: "F" }, { text: "B" }, { text: "A" } ],
                        groups: ['two', 'one']
                    }
                ]);
            });

            it("combines groups on function calls and steps inside function declarations, and doesn't duplicate group names", () => {
                let tree = new Tree();
                tree.parseIn(`
F #one
    A -

* F
    B - #two #one
                `, "file.txt");

                let branches = tree.branchify(tree.root);
                mergeStepNodesInBranches(tree, branches);

                Comparer.expect(branches).to.match([
                    {
                        steps: [ { text: "F" }, { text: "B" }, { text: "A" } ],
                        groups: ['two', 'one']
                    }
                ]);
            });

            it("throws exception if a ~ exists, but is cut off due to a groups restriction", () => {
                let tree = new Tree();
                tree.parseIn(`
A -
    B - #one

    ~ C - #two

    D -
        E - #three
        F - #four
    G -
                `, "file.txt");

                assert.throws(() => {
                    tree.groups = [["one"]];
                    tree.branchify(tree.root);
                }, "This step contains a ~, but is not inside one of the groups being run. Either add it to the groups being run or remove the ~. [file.txt:5]");

                assert.throws(() => {
                    tree.groups = [["one"], ["three"], ["four"]];
                    tree.branchify(tree.root);
                }, "This step contains a ~, but is not inside one of the groups being run. Either add it to the groups being run or remove the ~. [file.txt:5]");

                tree.groups = [["two"]];
                tree.branchify(tree.root);
            });
        });

        context("multiple restrictions", () => {
            it("isolates a branch with $'s and ~", () => {
                let tree = new Tree();
                tree.parseIn(`
A -
    B -
    $ C -
    D -

        E -
        ~ F -

G -
                `);

                let branches = tree.branchify(tree.root);
                mergeStepNodesInBranches(tree, branches);

                Comparer.expect(branches).to.match([
                    {
                        steps: [ { text: "A" }, { text: "C" }, { text: "F" } ],
                        isOnly: true,
                        isDebug: true
                    }
                ]);
            });

            it("handles multiple restrictions", () => {
                // Try them all here, all on one big tree (group, frequency, $, ~)
                let tree = new Tree();
                tree.parseIn(`
A -
    $ B - #first #low #second

    $ C - #third
        D - #fourth #first

        E -
        $ ~ F - #sixth

            ~ K - #high

        L - #sixth
G -

                `, "file.txt");

                tree.groups = [["first"], ["sixth"]];
                tree.minFrequency = "med";
                let branches = tree.branchify(tree.root);
                mergeStepNodesInBranches(tree, branches);

                Comparer.expect(branches).to.match([
                    {
                        steps: [ { text: "A" }, { text: "C" }, { text: "F" }, { text: "K" } ],
                        groups: [ 'third', 'sixth' ],
                        frequency: 'high'
                    }
                ]);
            });
        });
    });

    describe("generateBranches()", () => {
        context("sorting branches", () => {
            it("sorts branches by frequency", () => {
                let tree = new Tree();
                tree.parseIn(`
A - #low
B -

C - #high
D - #med
                `, "file.txt");

                tree.noRandom = true;
                tree.generateBranches();
                mergeStepNodesInBranches(tree, tree.branches);

                Comparer.expect(tree.branches).to.match([
                    {
                        steps: [ { text: "C" } ],
                        frequency: 'high'
                    },
                    {
                        steps: [ { text: "B" } ],
                        frequency: undefined
                    },
                    {
                        steps: [ { text: "D" } ],
                        frequency: 'med'
                    },
                    {
                        steps: [ { text: "A" } ],
                        frequency: 'low'
                    }
                ]);
            });

            it("sorts branches randomly without errors and without losing a branch", () => {
                let tree = new Tree();
                tree.parseIn(`
A -
B -
C -
D -
                `, "file.txt");

                tree.generateBranches();
                mergeStepNodesInBranches(tree, tree.branches);

                Comparer.expect(tree.branches).to.match([
                    '$anyOrder',
                    {
                        steps: [ { text: "A" } ]
                    },
                    {
                        steps: [ { text: "B" } ]
                    },
                    {
                        steps: [ { text: "C" } ]
                    },
                    {
                        steps: [ { text: "D" } ]
                    }
                ]);
            });
        });

        context(".s", () => {
            it("marks as skipped branches that start with .s", () => {
                let tree = new Tree();
                tree.parseIn(`
A -
B - .s
C - .s
D -
                `, "file.txt");

                tree.noRandom = true;
                tree.generateBranches();
                mergeStepNodesInBranches(tree, tree.branches);

                Comparer.expect(tree.branches).to.match([
                    {
                        steps: [ { text: "A" } ],
                        isSkipped: undefined,
                        //log: undefined
                    },
                    {
                        steps: [ { text: "B" } ],
                        isSkipped: true,
                        //log: [ { text: "Branch skipped because it starts with a .s step" } ]
                    },
                    {
                        steps: [ { text: "C" } ],
                        isSkipped: true,
                        //log: [ { text: "Branch skipped because it starts with a .s step" } ]
                    },
                    {
                        steps: [ { text: "D" } ],
                        isSkipped: undefined,
                        //log: undefined
                    }
                ]);
            });

            it("marks as skipped steps with a .s and all steps after", () => {
                let tree = new Tree();
                tree.parseIn(`
A -
    B - .s
        C -
            D -
                `, "file.txt");

                tree.noRandom = true;
                tree.generateBranches();
                mergeStepNodesInBranches(tree, tree.branches);

                Comparer.expect(tree.branches).to.match([
                    {
                        steps: [
                            {
                                text: "A",
                                isSkipped: undefined
                            },
                            {
                                text: "B",
                                isSkipped: true
                            },
                            {
                                text: "C",
                                isSkipped: true
                            },
                            {
                                text: "D",
                                isSkipped: true
                            }
                        ]
                    }
                ]);
            });

            it("marks as skipped steps with a last step of .s", () => {
                let tree = new Tree();
                tree.parseIn(`
A -
    B -
        C -
            D - .s
                `, "file.txt");

                tree.noRandom = true;
                tree.generateBranches();
                mergeStepNodesInBranches(tree, tree.branches);

                Comparer.expect(tree.branches).to.match([
                    {
                        steps: [
                            {
                                text: "A",
                                isSkipped: undefined
                            },
                            {
                                text: "B",
                                isSkipped: undefined
                            },
                            {
                                text: "C",
                                isSkipped: undefined
                            },
                            {
                                text: "D",
                                isSkipped: true
                            }
                        ]
                    }
                ]);
            });

            it("marks as skipped all similar branches after the first one with a .s", () => {
                let tree = new Tree();
                tree.parseIn(`
A -
    B - .s
    C -

        E -
            F -

        G -

        H -

    D -

I -
                `, "file.txt");

                tree.noRandom = true;
                tree.generateBranches();
                mergeStepNodesInBranches(tree, tree.branches);

                Comparer.expect(tree.branches).to.match([
                    {
                        steps: [
                            {
                                text: "A",
                                isSkipped: undefined
                            },
                            {
                                text: "B",
                                isSkipped: true
                            },
                            {
                                text: "E",
                                isSkipped: true
                            },
                            {
                                text: "F",
                                isSkipped: true
                            }
                        ]
                    },
                    {
                        steps: [
                            {
                                text: "A",
                                isSkipped: undefined
                            },
                            {
                                text: "B",
                                isSkipped: undefined
                            },
                            {
                                text: "G",
                                isSkipped: undefined
                            }
                        ]
                    },
                    {
                        steps: [
                            {
                                text: "A",
                                isSkipped: undefined
                            },
                            {
                                text: "B",
                                isSkipped: undefined
                            },
                            {
                                text: "H",
                                isSkipped: undefined
                            }
                        ]
                    },
                    {
                        steps: [
                            {
                                text: "A",
                                isSkipped: undefined
                            },
                            {
                                text: "C",
                                isSkipped: undefined
                            },
                            {
                                text: "E",
                                isSkipped: undefined
                            },
                            {
                                text: "F",
                                isSkipped: undefined
                            }
                        ]
                    },
                    {
                        steps: [
                            {
                                text: "A",
                                isSkipped: undefined
                            },
                            {
                                text: "C",
                                isSkipped: undefined
                            },
                            {
                                text: "G",
                                isSkipped: undefined
                            }
                        ]
                    },
                    {
                        steps: [
                            {
                                text: "A",
                                isSkipped: undefined
                            },
                            {
                                text: "C",
                                isSkipped: undefined
                            },
                            {
                                text: "H",
                                isSkipped: undefined
                            }
                        ]
                    },
                    {
                        steps: [
                            {
                                text: "A",
                                isSkipped: undefined
                            },
                            {
                                text: "D",
                                isSkipped: undefined
                            }
                        ]
                    },
                    {
                        steps: [
                            {
                                text: "I",
                                isSkipped: undefined
                            }
                        ]
                    }
                ]);
            });

            it("doesn't skip any other branches when the last step is a .s", () => {
                let tree = new Tree();
                tree.parseIn(`
A -
    B -
        C - .s
        D -
                `, "file.txt");

                tree.noRandom = true;
                tree.generateBranches();
                mergeStepNodesInBranches(tree, tree.branches);

                Comparer.expect(tree.branches).to.match([
                    {
                        steps: [
                            {
                                text: "A",
                                isSkipped: undefined
                            },
                            {
                                text: "B",
                                isSkipped: undefined
                            },
                            {
                                text: "C",
                                isSkipped: true
                            }
                        ]
                    },
                    {
                        steps: [
                            {
                                text: "A",
                                isSkipped: undefined
                            },
                            {
                                text: "B",
                                isSkipped: undefined
                            },
                            {
                                text: "D",
                                isSkipped: undefined
                            }
                        ]
                    }
                ]);
            });
        });

        context("$s", () => {
            it("skips branches under a $s", () => {
                let tree = new Tree();
                tree.parseIn(`
A -
    B -

    $s C -

        D -

        E -

G -

H -
                `, "file.txt");

                tree.noRandom = true;
                tree.generateBranches();
                mergeStepNodesInBranches(tree, tree.branches);

                Comparer.expect(tree.branches).to.match([
                    { steps: [ { text: "A" }, { text: "B" } ], isSkipped: undefined },
                    { steps: [ { text: "A" }, { text: "C" }, { text: "D" } ], isSkipped: true },
                    { steps: [ { text: "A" }, { text: "C" }, { text: "E" } ], isSkipped: true },
                    { steps: [ { text: "G" } ], isSkipped: undefined },
                    { steps: [ { text: "H" } ], isSkipped: undefined },
                ]);
            });

            it("handles multiple $s's", () => {
                let tree = new Tree();
                tree.parseIn(`
A -
    B -

    $s C -

        D -

        $s E -

G - $s

H -
                `, "file.txt");

                tree.noRandom = true;
                tree.generateBranches();
                mergeStepNodesInBranches(tree, tree.branches);

                Comparer.expect(tree.branches).to.match([
                    { steps: [ { text: "A" }, { text: "B" } ], isSkipped: undefined },
                    { steps: [ { text: "A" }, { text: "C" }, { text: "D" } ], isSkipped: true },
                    { steps: [ { text: "A" }, { text: "C" }, { text: "E" } ], isSkipped: true },
                    { steps: [ { text: "G" } ], isSkipped: true },
                    { steps: [ { text: "H" } ], isSkipped: undefined },
                ]);
            });

            it("handles $s when it's attached to a step block member", () => {
                let tree = new Tree();
                tree.parseIn(`
A -
B - $s
C - $s

    D - $s
    E -
    F -
                `);

                tree.noRandom = true;
                tree.generateBranches();
                mergeStepNodesInBranches(tree, tree.branches);

                Comparer.expect(tree.branches).to.match([
                    { steps: [ { text: "A" }, { text: "D" } ], isSkipped: true },
                    { steps: [ { text: "A" }, { text: "E" } ], isSkipped: undefined },
                    { steps: [ { text: "A" }, { text: "F" } ], isSkipped: undefined },
                    { steps: [ { text: "B" }, { text: "D" } ], isSkipped: true },
                    { steps: [ { text: "B" }, { text: "E" } ], isSkipped: true },
                    { steps: [ { text: "B" }, { text: "F" } ], isSkipped: true },
                    { steps: [ { text: "C" }, { text: "D" } ], isSkipped: true },
                    { steps: [ { text: "C" }, { text: "E" } ], isSkipped: true },
                    { steps: [ { text: "C" }, { text: "F" } ], isSkipped: true },
                ]);
            });

            it("handles $s when it's inside a function declaration", () => {
                let tree = new Tree();
                tree.parseIn(`
F

* F
    $s A -
        B -

    C -
                `);

                tree.noRandom = true;
                tree.generateBranches();
                mergeStepNodesInBranches(tree, tree.branches);

                Comparer.expect(tree.branches).to.match([
                    { steps: [ { text: "F" }, { text: "A" }, { text: "B" } ], isSkipped: true },
                    { steps: [ { text: "F" }, { text: "C" } ], isSkipped: undefined },
                ]);
            });

            it("handles $s when it's on a function declaration", () => {
                let tree = new Tree();
                tree.parseIn(`
F

$s * F
    A -
        B -

C -
                `);

                tree.noRandom = true;
                tree.generateBranches();
                mergeStepNodesInBranches(tree, tree.branches);

                Comparer.expect(tree.branches).to.match([
                    { steps: [ { text: "F" }, { text: "A" }, { text: "B" } ], isSkipped: true },
                    { steps: [ { text: "C" } ], isSkipped: undefined },
                ]);
            });

            it("handles $s when it's on a function call", () => {
                let tree = new Tree();
                tree.parseIn(`
F $s

* F
    A -
        B -

C -
                `);

                tree.noRandom = true;
                tree.generateBranches();
                mergeStepNodesInBranches(tree, tree.branches);

                Comparer.expect(tree.branches).to.match([
                    { steps: [ { text: "F" }, { text: "A" }, { text: "B" } ], isSkipped: true },
                    { steps: [ { text: "C" } ], isSkipped: undefined },
                ]);
            });

            it("handles $s when it's on a function call and function declaration", () => {
                let tree = new Tree();
                tree.parseIn(`
F $s

* F $s
    A -
        B -

C -
                `);

                tree.noRandom = true;
                tree.generateBranches();
                mergeStepNodesInBranches(tree, tree.branches);

                Comparer.expect(tree.branches).to.match([
                    { steps: [ { text: "F" }, { text: "A" }, { text: "B" } ], isSkipped: true },
                    { steps: [ { text: "C" } ], isSkipped: undefined },
                ]);
            });

            it("handles multiple $s's inside and outside a function declaration", () => {
                let tree = new Tree();
                tree.parseIn(`
J -
    F

$s K -
    F

* F
    $s A -
        B -

    C -
                `);

                tree.noRandom = true;
                tree.generateBranches();
                mergeStepNodesInBranches(tree, tree.branches);

                Comparer.expect(tree.branches).to.match([
                    { steps: [ { text: "J" }, { text: "F" }, { text: "A" }, { text: "B" } ], isSkipped: true },
                    { steps: [ { text: "J" }, { text: "F" }, { text: "C" } ], isSkipped: undefined },
                    { steps: [ { text: "K" }, { text: "F" }, { text: "A" }, { text: "B" } ], isSkipped: true },
                    { steps: [ { text: "K" }, { text: "F" }, { text: "C" } ], isSkipped: true },
                ]);
            });

            it("handles $s when it's inside a .. step", () => {
                let tree = new Tree();
                tree.parseIn(`
A .. -
    B - $s
        C -

$s G .. -
    H -
    I -

J -
                `);

                tree.noRandom = true;
                tree.generateBranches();
                mergeStepNodesInBranches(tree, tree.branches);

                Comparer.expect(tree.branches).to.match([
                    { steps: [ { text: "A" }, { text: "B" }, { text: "C" } ], isSkipped: true },
                    { steps: [ { text: "G" }, { text: "H" }, { text: "I" } ], isSkipped: true },
                    { steps: [ { text: "J" } ], isSkipped: undefined },
                ]);
            });

            it("handles $s when it's attached to a .. step block member", () => {
                let tree = new Tree();
                tree.parseIn(`
..
A -
$s B -
C -

    D -
    E -

F -
                `);

                tree.noRandom = true;
                tree.generateBranches();
                mergeStepNodesInBranches(tree, tree.branches);

                Comparer.expect(tree.branches).to.match([
                    { steps: [ { text: "A" }, { text: "B" }, { text: "C" }, { text: "D" } ], isSkipped: true },
                    { steps: [ { text: "A" }, { text: "B" }, { text: "C" }, { text: "E" } ], isSkipped: true },
                    { steps: [ { text: "F" } ], isSkipped: undefined },
                ]);
            });

            it("still expands branches under a $s and throws an error if a function declaration cannot be found", () => {
                let tree = new Tree();
                tree.parseIn(`
A -
    F $s
                `, "file.txt");

                assert.throws(() => {
                    tree.generateBranches();
                }, `The function \`F\` cannot be found. Is there a typo, or did you mean to make this a textual step (with a - at the end)?

Trace:
   A
   F

 [file.txt:3]`);
            });
        });

        context("debug by hash", () => {
            it("can isolate a branch by hash", () => {
                let tree = new Tree();
                tree.parseIn(`
A -
    B - $
        C - ~

D -
    E -
        F -

H -
    I -
                `, "file.txt");

                tree.debugHash = '30cb5a00b9b3401c1a038b06e19f1d21';
                tree.generateBranches();
                mergeStepNodesInBranches(tree, tree.branches);

                Comparer.expect(tree.branches).to.match([
                    {
                        steps: [ { text: "D" }, { text: "E" }, { text: "F", isDebug: true, isAfterDebug: true }  ]
                    }
                ]);
            });

            it("throws an exception when it can't find a branch with a given hash", () => {
                let tree = new Tree();
                tree.parseIn(`
A -
    B - $
        C - ~

D -
    E -
        F -
                `, "file.txt");

                assert.throws(() => {
                    tree.debugHash = 'INVALID-HASH';
                    tree.generateBranches();
                }, "Couldn't find the branch with the given hash");
            });
        });

        context("moving ~'s at the end of a function call", () => {
            it("moves ~'s at the end of a function call to the end of the last step in the function, where no steps follow the function call", () => {
                let tree = new Tree();
                tree.parseIn(`
* F
    A -
        B -

F ~
                `, "file.txt");

                tree.noRandom = true;
                tree.generateBranches();
                mergeStepNodesInBranches(tree, tree.branches);

                Comparer.expect(tree.branches).to.match([
                    {
                        steps: [
                            { text: "F", isAfterDebug: undefined },
                            { text: "A", isAfterDebug: undefined },
                            { text: "B", isAfterDebug: true }
                        ]
                    }
                ]);
            });

            it("moves ~'s at the end of a function call to the end of the last step in the function, where other steps follow the function call", () => {
                let tree = new Tree();
                tree.parseIn(`
* F
    A -
        B -

F ~
    C -
                `, "file.txt");

                tree.noRandom = true;
                tree.generateBranches();
                mergeStepNodesInBranches(tree, tree.branches);

                Comparer.expect(tree.branches).to.match([
                    {
                        steps: [
                            { text: "F", isAfterDebug: undefined },
                            { text: "A", isAfterDebug: undefined },
                            { text: "B", isAfterDebug: true },
                            { text: "C", isAfterDebug: undefined }
                        ]
                    }
                ]);
            });

            it("handles moving ~'s in multiple nested function calls, where no steps follow the function call", () => {
                let tree = new Tree();
                tree.parseIn(`
* F
    A -
        G

* G
    C -
        D -

F ~
                `, "file.txt");

                tree.noRandom = true;
                tree.generateBranches();
                mergeStepNodesInBranches(tree, tree.branches);

                Comparer.expect(tree.branches).to.match([
                    {
                        steps: [
                            { text: "F", isAfterDebug: undefined },
                            { text: "A", isAfterDebug: undefined },
                            { text: "G", isAfterDebug: undefined },
                            { text: "C", isAfterDebug: undefined },
                            { text: "D", isAfterDebug: true }
                        ]
                    }
                ]);
            });

            it("handles moving ~'s in multiple nested function calls, where other steps follow the function call", () => {
                let tree = new Tree();
                tree.parseIn(`
* F
    A -
        G

* G
    C -
        D -

* E
    H -

F ~
    E
        I -
                `, "file.txt");

                tree.noRandom = true;
                tree.generateBranches();
                mergeStepNodesInBranches(tree, tree.branches);

                Comparer.expect(tree.branches).to.match([
                    {
                        steps: [
                            { text: "F", isAfterDebug: undefined },
                            { text: "A", isAfterDebug: undefined },
                            { text: "G", isAfterDebug: undefined },
                            { text: "C", isAfterDebug: undefined },
                            { text: "D", isAfterDebug: true },
                            { text: "E", isAfterDebug: undefined },
                            { text: "H", isAfterDebug: undefined },
                            { text: "I", isAfterDebug: undefined }
                        ]
                    }
                ]);
            });

            it("handles moving multiple ~'s in a single branch", () => {
                let tree = new Tree();
                tree.parseIn(`
* F
    A -
        B ~

* B
    D -

F ~
    E -
                `, "file.txt");

                tree.noRandom = true;
                tree.generateBranches();
                mergeStepNodesInBranches(tree, tree.branches);

                Comparer.expect(tree.branches).to.match([
                    {
                        steps: [
                            { text: "F", isAfterDebug: undefined },
                            { text: "A", isAfterDebug: undefined },
                            { text: "B", isAfterDebug: undefined },
                            { text: "D", isAfterDebug: true },
                            { text: "E", isAfterDebug: undefined }
                        ]
                    }
                ]);
            });

            it("handles moving multiple ~'s in a single branch, more complex example", () => {
                let tree = new Tree();
                tree.parseIn(`
* F
    A -
        B ~
            C -

* B
    D -

F ~
    E -
                `, "file.txt");

                tree.noRandom = true;
                tree.generateBranches();
                mergeStepNodesInBranches(tree, tree.branches);

                Comparer.expect(tree.branches).to.match([
                    {
                        steps: [
                            { text: "F", isAfterDebug: undefined },
                            { text: "A", isAfterDebug: undefined },
                            { text: "B", isAfterDebug: undefined },
                            { text: "D", isAfterDebug: true },
                            { text: "C", isAfterDebug: true },
                            { text: "E", isAfterDebug: undefined }
                        ]
                    }
                ]);
            });

            it("doesn't move a ~ when it's already on the last step of a function call", () => {
                let tree = new Tree();
                tree.parseIn(`
* F {
}

F ~
                `, "file.txt");

                tree.noRandom = true;
                tree.generateBranches();
                mergeStepNodesInBranches(tree, tree.branches);

                Comparer.expect(tree.branches).to.match([
                    {
                        steps: [
                            { text: "F", isAfterDebug: true }
                        ]
                    }
                ]);
            });
        });

        context("errors", () => {
            it("handles an error from branchify()", () => {
                let tree = new Tree();
                tree.parseIn(`
A -
    *** Before Everything {
    }
                `, "file.txt");

                assert.throws(() => {
                    tree.noRandom = true;
                    tree.generateBranches();
                }, "A Before Everything hook must not be indented (it must be at 0 indents) [file.txt:3]");
            });

            // Skipped because it runs slow and we don't need to run it each time
            it.skip("throws an exception when there's an infinite loop among function calls", function() { // function() needed for this.timeout() to work
                this.timeout(10000);

                let tree = new Tree();
                tree.parseIn(`
A

* A
    B

* B
    A
                `, "file.txt");

                assert.throws(() => {
                tree.generateBranches();
                }, /Infinite loop detected \[file\.txt:(5|8)\]/);
            });
        });

        context("performance", () => {
            it.skip("handles a very large number of branches and steps", function() {
                this.timeout(120000);
                let tree = new Tree();
                // Each group is another power of 10 worth of branches
                tree.parseIn(`
A-1 -
B-1 -
C-1 -
D-1 -
E-1 -
F-1 -
G-1 -
H-1 -
I-1 -
K-1 -

    A-2 -
    B-2 -
    C-2 -
    D-2 -
    E-2 -
    F-2 -
    G-2 -
    H-2 -
    I-2 -
    K-2 -

        A-3 -
        B-3 -
        C-3 -
        D-3 -
        E-3 -
        F-3 -
        G-3 -
        H-3 -
        I-3 -
        K-3 -

            A-4 -
            B-4 -
            C-4 -
            D-4 -
            E-4 -
            F-4 -
            G-4 -
            H-4 -
            I-4 -
            K-4 -

                A-5 -
                B-5 -
                C-5 -
                D-5 -
                E-5 -
                F-5 -
                G-5 -
                H-5 -
                I-5 -
                K-5 -

                    A-6 -
                    B-6 -
                    C-6 -
                    D-6 -
                    E-6 -
                    F-6 -
                    G-6 -
                    H-6 -
                    I-6 -
                    K-6 -

                    //     A-7 -
                    //     B-7 -
                    //     C-7 -
                    //     D-7 -
                    //     E-7 -
                    //     F-7 -
                    //     G-7 -
                    //     H-7 -
                    //     I-7 -
                    //     K-7 -

    `, "file.txt");

                var start = new Date().getTime();
                tree.generateBranches();
                var end = new Date().getTime();

                console.log("generateBranches() took  " + (end - start) + " ms");
                console.log("Size of serialized tree: " + JSON.stringify(tree.serialize()).length/(1024 * 1024) + " MB");
            });
        });
    });

    describe("serialize()", () => {
        it("outputs a serialized object for an empty tree", () => {
            let tree = new Tree();

            tree.generateBranches();
            tree.isDebug = true;
            tree.elapsed = "DATE";
            let obj = tree.serialize();

            Comparer.expect(obj).to.match({
                branches: [],
                isDebug: true,
                elapsed: "DATE"
            });
        });

        it("outputs a serialized object for all branches", () => {
            let tree = new Tree();
            tree.parseIn(
`A -
    B -
    C -
`);

            tree.noRandom = true;
            tree.generateBranches();
            tree.isDebug = true;
            tree.elapsed = "DATE";
            tree.branches[0].passedLastTime = true;
            let obj = tree.serialize();

            mergeStepNodesInTree(obj);
            Comparer.expect(obj).to.match({
                stepNodeIndex: {
                    1: { text: "A" },
                    2: { text: "B" },
                    3: { text: "C" }
                },
                isDebug: true,
                branches: [
                    {
                        steps: [ { text: "A" }, { text: "B" } ],
                        isPassed: true
                    },
                    {
                        steps: [ { text: "A" }, { text: "C" } ]
                    }
                ],
                elapsed: "DATE"
            });
        });

        it("doesn't serialize more branches per type than the given max", () => {
            let tree = new Tree();
            tree.parseIn(
`A -
    B -

C -
    D -

E -
    F -

G -
    H -
`);

            tree.noRandom = true;
            tree.generateBranches();
            tree.branches[0].isPassed = true;
            tree.branches[1].isPassed = true;
            tree.branches[2].isFailed = true;
            tree.branches[3].isFailed = true;
            let obj = tree.serialize(1, 1);

            mergeStepNodesInTree(obj);
            Comparer.expect(obj).to.match({
                branches: [
                    {
                        steps: [ { text: "E" }, { text: "F" } ]
                    },
                    {
                        steps: [ { text: "A" }, { text: "B" } ],
                        isPassed: true
                    }
                ]
            });
        });

        it("doesn't output used step nodes", () => {
            let tree = new Tree();
            tree.parseIn(
`F

* F
    A -

* G
    B -
    `);

            tree.noRandom = true;
            tree.generateBranches();
            let obj = tree.serialize();

            mergeStepNodesInBranches(tree, obj.branches);
            Comparer.expect(obj).to.match({
                stepNodeIndex: {
                    $exact: true,
                    1: { text: "F" },
                    3: { text: "F" },
                    4: { text: "A" }
                },
                branches: [
                    {
                        steps: [ { text: "F" }, { text: "A" } ]
                    }
                ]
            });
        });

        it("serializes everything hooks, doesn't serialize branch and step hooks", () => {
            let tree = new Tree();
            tree.parseIn(`
A -
    B -
        *** After Every Branch {
            D
        }

        *** After Every Step {
            F
        }

        *** Before Every Branch {
            J
        }

        *** Before Every Step {
            K
        }

    C -

*** Before Everything {
    G
}

*** Before Everything {
    H
}

*** After Everything {
    I
}
`);

            tree.noRandom = true;
            tree.generateBranches();
            let obj = tree.serialize();

            mergeStepNodesInBranches(tree, obj.branches);
            mergeStepNodes(tree, obj.beforeEverything);
            mergeStepNodes(tree, obj.afterEverything);
            Comparer.expect(obj).to.match({
                branches: [
                    {
                        steps: [
                            { text: "A" }, { text: "B" }
                        ],
                        beforeEveryBranch: undefined,
                        afterEveryBranch: undefined,
                        beforeEveryStep: undefined,
                        afterEveryStep: undefined
                    },
                    {
                        steps: [
                            { text: "A" }, { text: "C" }
                        ]
                    }
                ],
                beforeEverything: [
                    { text: "Before Everything", codeBlock: "\n    H" },
                    { text: "Before Everything", codeBlock: "\n    G" }
                ],
                afterEverything: [
                    { text: "After Everything", codeBlock: "\n    I" }
                ]
            });
        });

        it.skip("has good performance", function() {
            this.timeout(6000000);

            let tree = new Tree();

            const id = 1234567890;
            tree.stepNodeIndex = { [id]: new StepNode(id) };

            for(let i = 0; i < 3000000; i++) {
                let branch = new Branch;
                branch.isRunning = true;
                branch.steps = [ new Step(id) ];

                tree.branches.push(branch);
            }

            var start = new Date().getTime();
            let serializedTree = tree.serialize(); // NOTE: also try putting a max value into serialize(), e.g., 500
            var end = new Date().getTime();

            console.log("serialize() took " + (end - start) + " ms");

            var start = new Date().getTime();
            let stringifiedTree = JSON.stringify(tree);
            var end = new Date().getTime();

            console.log("stringify() took " + (end - start) + " ms");

            console.log("Size of serialized tree:  " + JSON.stringify(serializedTree).length/(1024 * 1024) + " MB");
            console.log("Size of stringified tree: " + stringifiedTree.length/(1024 * 1024) + " MB");
        });
    });

    describe("serializeSnapshot()", () => {
        it("outputs a snapshot for an empty tree", () => {
            let tree = new Tree();
            let snapshot = tree.serializeSnapshot();
            Comparer.expect(snapshot).to.match({
                branches: []
            });
        });

        it("outputs a snapshot with no prevSnapshot", () => {
            let tree = new Tree();
            tree.parseIn(`
A -
    B -

C -
    D -
            `);
            tree.noRandom = true;
            tree.generateBranches();
            tree.branches[1].isRunning = true;

            let snapshot = tree.serializeSnapshot();

            mergeStepNodesInBranches(tree, snapshot.branches);
            Comparer.expect(snapshot).to.match({
                branches: [
                    {
                        steps: [ { text: 'C' }, { text: 'D' } ],
                        hash: { $typeof: 'string' }
                    }
                ]
            });
        });

        it("outputs counts", () => {
            let tree = new Tree();
            tree.parseIn(`
A -
    B -

C -
    D -
            `);
            tree.noRandom = true;
            tree.generateBranches();
            tree.updateCounts();

            let snapshot = tree.serializeSnapshot();

            Comparer.expect(snapshot).to.match({
                counts: {
                    totalStepsComplete: 0,
                    totalSteps: 4
                }
            });
        });

        it("limits new results to n", () => {
            let tree = new Tree();
            tree.parseIn(`
A -
    B -

C -
    D -

E -
    F -

G -
    H -
            `);
            tree.noRandom = true;
            tree.generateBranches();
            tree.branches[1].isRunning = true;
            tree.branches[2].isRunning = true;
            tree.branches[3].isRunning = true;

            let snapshot = tree.serializeSnapshot(2);

            mergeStepNodesInBranches(tree, snapshot.branches);
            Comparer.expect(snapshot).to.match({
                branches: [
                    {
                        steps: [ { text: 'C' }, { text: 'D' } ],
                        hash: { $typeof: 'string' }
                    },
                    {
                        steps: [ { text: 'E' }, { text: 'F' } ],
                        hash: { $typeof: 'string' }
                    }
                ]
            });
        });

        it("includes a branch in snapshot if it's in prevSnapshot and if it's still running", () => {
            let tree = new Tree();
            tree.parseIn(`
A -
    B -

C -
    D -

E -
    F -

G -
    H -
            `);
            tree.noRandom = true;
            tree.generateBranches();
            tree.branches[1].isRunning = true;
            tree.branches[2].isRunning = true;
            tree.branches[3].isRunning = true;

            let prevSnapshot = tree.serializeSnapshot();
            let snapshot = tree.serializeSnapshot(undefined, prevSnapshot);

            mergeStepNodesInBranches(tree, snapshot.branches);
            Comparer.expect(snapshot).to.match({
                branches: [
                    {
                        steps: [ { text: 'C' }, { text: 'D' } ],
                        hash: { $typeof: 'string' }
                    },
                    {
                        steps: [ { text: 'E' }, { text: 'F' } ],
                        hash: { $typeof: 'string' }
                    },
                    {
                        steps: [ { text: 'G' }, { text: 'H' } ],
                        hash: { $typeof: 'string' }
                    }
                ]
            });
        });

        it("includes a branch in snapshot if it's in prevSnapshot and if it's no longer running", () => {
            let tree = new Tree();
            tree.parseIn(`
A -
    B -

C -
    D -

E -
    F -

G -
    H -
            `);
            tree.noRandom = true;
            tree.generateBranches();
            tree.branches[1].isRunning = true;
            tree.branches[2].isRunning = true;
            tree.branches[3].isRunning = true;

            let prevSnapshot = tree.serializeSnapshot();

            delete tree.branches[2].isRunning;
            delete tree.branches[3].isRunning;

            let snapshot = tree.serializeSnapshot(undefined, prevSnapshot);

            mergeStepNodesInBranches(tree, snapshot.branches);
            Comparer.expect(snapshot).to.match({
                branches: [
                    {
                        steps: [ { text: 'C' }, { text: 'D' } ],
                        hash: { $typeof: 'string' }
                    },
                    {
                        steps: [ { text: 'E' }, { text: 'F' } ],
                        hash: { $typeof: 'string' }
                    },
                    {
                        steps: [ { text: 'G' }, { text: 'H' } ],
                        hash: { $typeof: 'string' }
                    }
                ]
            });
        });

        it("only includes a branch once if it exists in both prevSnapshot and is one of the top n currently running", () => {
            let tree = new Tree();
            tree.parseIn(`
A -
    B -

C -
    D -

E -
    F -

G -
    H -
            `);
            tree.noRandom = true;
            tree.generateBranches();
            tree.branches[1].isRunning = true;
            tree.branches[2].isRunning = true;
            tree.branches[3].isRunning = true;

            let prevSnapshot = tree.serializeSnapshot(2);
            let snapshot = tree.serializeSnapshot(2, prevSnapshot);

            mergeStepNodesInBranches(tree, snapshot.branches);
            Comparer.expect(snapshot).to.match({
                branches: [
                    {
                        steps: [ { text: 'C' }, { text: 'D' } ],
                        hash: { $typeof: 'string' }
                    },
                    {
                        steps: [ { text: 'E' }, { text: 'F' } ],
                        hash: { $typeof: 'string' }
                    }
                ]
            });
        });

        it("doesn't include a branch in snapshot if it wasn't running in prevSnapshot", () => {
            let tree = new Tree();
            tree.parseIn(`
A -
    B -

C -
    D -

E -
    F -

G -
    H -
            `);
            tree.noRandom = true;
            tree.generateBranches();
            tree.branches[0].isRunning = true;
            tree.branches[1].isRunning = true;
            tree.branches[2].isRunning = true;
            tree.branches[3].isRunning = true;

            let snapshot1 = tree.serializeSnapshot(); // includes all 4 branches, branches 0-3 are running

            delete tree.branches[0].isRunning;
            delete tree.branches[1].isRunning;

            let snapshot2 = tree.serializeSnapshot(undefined, snapshot1); // includes all 4 branches, branches 2-3 are running

            delete tree.branches[2].isRunning;

            let snapshot3 = tree.serializeSnapshot(undefined, snapshot2); // includes branches 2-3, branch 3 is running

            mergeStepNodesInBranches(tree, snapshot3.branches);
            Comparer.expect(snapshot3).to.match({
                branches: [
                    {
                        steps: [ { text: 'G' }, { text: 'H' } ],
                        hash: { $typeof: 'string' }
                    },
                    {
                        steps: [ { text: 'E' }, { text: 'F' } ],
                        hash: { $typeof: 'string' }
                    }
                ]
            });
        });

        it.skip("has good performance", function() {
            this.timeout(6000000);

            let tree = new Tree();

            const id = 1234567890;
            tree.stepNodeIndex = { [id]: new StepNode(id) };

            for(let i = 0; i < 3000000; i++) {
                let branch = new Branch;
                branch.isRunning = true;
                branch.steps = [ new Step(id) ];

                tree.branches.push(branch);
            }

            let prevSnapshot = tree.serializeSnapshot(100);

            var start = new Date().getTime();
            let snapshot = tree.serializeSnapshot(100, prevSnapshot);
            var end = new Date().getTime();

            console.log("serializeSnapshot() took " + (end - start) + " ms");
            console.log("Size of snapshot:        " + JSON.stringify(snapshot).length/(1024 * 1024) + " MB");
            console.log("Size of tree:            " + JSON.stringify(tree).length/(1024 * 1024) + " MB");
            console.log("Size of serialized tree: " + JSON.stringify(tree.serialize()).length/(1024 * 1024) + " MB");
        });
    });

    describe("serializePassed()", () => {
        it("serializes no passed branches", () => {
            let tree = new Tree();
            tree.parseIn(`
A -
    B -

C -
    D -
            `);
            tree.noRandom = true;
            tree.generateBranches();

            let str = tree.serializePassed();
            expect(str).to.equal("");
        });

        it("serializes passed branches", () => {
            let tree = new Tree();
            tree.parseIn(`
A -
    B -

C -
    D -

E -
    F -

G -
    H -
            `);
            tree.noRandom = true;
            tree.generateBranches();
            tree.branches[0].isPassed = true;
            tree.branches[2].isPassed = true;
            tree.branches[3].passedLastTime = true;

            let str = tree.serializePassed();
            expect(str).to.equal("dd8c6a395b5dd36c56d23275028f526c\ne98a4e7d9412619ad47978530320e0f7\nc48cfa4fb9be8441e077bb92428441f5\n");
        });

        it.skip("has good performance", function() {
            this.timeout(6000000);

            let tree = new Tree();

            const id = 1234567890;
            tree.stepNodeIndex = { [id]: new StepNode(id) };

            for(let i = 0; i < 3000000; i++) {
                let branch = new Branch;
                branch.isRunning = true;
                branch.steps = [ new Step(id) ];

                tree.branches.push(branch);
            }

            var start = new Date().getTime();
            let str = tree.serializePassed();
            var end = new Date().getTime();

            console.log("serializePassed() took " + (end - start) + " ms");
            console.log("Size of output:        " + str.length/(1024 * 1024) + " MB");
        });
    });

    describe("markPassedFromPrevRun()", () => {
        it("merges empty previous branches into empty current branches", () => {
            let prevTree = new Tree();
            let currTree = new Tree();

            currTree.generateBranches();
            prevTree.generateBranches();
            let previous = prevTree.serializePassed();

            currTree.markPassedFromPrevRun(previous);

            Comparer.expect(currTree).to.match({ branches: [] });
        });

        it("handles a merge", () => {
             let currTree = new Tree();

             currTree.branches = [ new Branch(), new Branch(), new Branch(), new Branch(), new Branch(), new Branch() ];

             currTree.branches[0].steps = [ new Step(1),  new Step(2),  new Step(3) ];
             currTree.branches[1].steps = [ new Step(4),  new Step(5),  new Step(6) ];
             currTree.branches[2].steps = [ new Step(7),  new Step(8),  new Step(9) ];
             currTree.branches[3].steps = [ new Step(10), new Step(11), new Step(12) ];
             currTree.branches[4].steps = [ new Step(13), new Step(14), new Step(15) ];
             currTree.branches[5].steps = [ new Step(16), new Step(17), new Step(18) ];

             currTree.newStepNode().text = "1A clone-1 step-1";
             currTree.newStepNode().text = "1A clone-1 step-2";
             currTree.newStepNode().text = "1A clone-1 step-3";

             currTree.newStepNode().text = "1A clone-2 step-1";
             currTree.newStepNode().text = "1A clone-2 step-2";
             currTree.newStepNode().text = "1A clone-2 step-3";

             currTree.newStepNode().text = "1B clone-1 step-1";
             currTree.newStepNode().text = "1B clone-1 step-2";
             currTree.newStepNode().text = "1B clone-1 step-3";

             currTree.newStepNode().text = "3 clone-1 step-1";
             currTree.newStepNode().text = "3 clone-1 step-2";
             currTree.newStepNode().text = "3 clone-1 step-3";

             currTree.newStepNode().text = "3 clone-2 step-1";
             currTree.newStepNode().text = "3 clone-2 step-2";
             currTree.newStepNode().text = "3 clone-2 step-3";

             currTree.newStepNode().text = "3 clone-3 step-1";
             currTree.newStepNode().text = "3 clone-3 step-2";
             currTree.newStepNode().text = "3 clone-3 step-3";

             currTree.branches.forEach(branch => branch.updateHash(currTree.stepNodeIndex));

             let prevTree = new Tree();

             prevTree.branches = [ new Branch(), new Branch(), new Branch(), new Branch(), new Branch(), new Branch() ];

             prevTree.branches[0].steps = [ new Step(1),  new Step(2),  new Step(3) ];
             prevTree.branches[1].steps = [ new Step(4),  new Step(5),  new Step(6) ];
             prevTree.branches[2].steps = [ new Step(7),  new Step(8),  new Step(9) ];
             prevTree.branches[3].steps = [ new Step(10), new Step(11), new Step(12) ];
             prevTree.branches[4].steps = [ new Step(13), new Step(14), new Step(15) ];
             prevTree.branches[5].steps = [ new Step(16), new Step(17), new Step(18) ];

             prevTree.newStepNode().text = "1A clone-1 step-1";
             prevTree.newStepNode().text = "1A clone-1 step-2";
             prevTree.newStepNode().text = "1A clone-1 step-3";

             prevTree.newStepNode().text = "1A clone-2 step-1";
             prevTree.newStepNode().text = "1A clone-2 step-2";
             prevTree.newStepNode().text = "1A clone-2 step-3";
             prevTree.branches[1].isFailed = true;

             prevTree.newStepNode().text = "1B clone-1 step-1";
             prevTree.newStepNode().text = "1B clone-1 step-2";
             prevTree.newStepNode().text = "1B clone-1 step-3";
             prevTree.branches[2].isPassed = true;

             prevTree.newStepNode().text = "2 clone-1 step-1";
             prevTree.newStepNode().text = "2 clone-1 step-2";
             prevTree.newStepNode().text = "2 clone-1 step-3";
             prevTree.branches[3].isFailed = true;

             prevTree.newStepNode().text = "2 clone-2 step-1";
             prevTree.newStepNode().text = "2 clone-2 step-2";
             prevTree.newStepNode().text = "2 clone-2 step-3";
             prevTree.branches[4].isPassed = true;

             prevTree.newStepNode().text = "2 clone-3 step-1";
             prevTree.newStepNode().text = "2 clone-3 step-2";
             prevTree.newStepNode().text = "2 clone-3 step-3";

             prevTree.branches.forEach(branch => branch.updateHash(prevTree.stepNodeIndex));

             let previous = prevTree.serializePassed();
             currTree.markPassedFromPrevRun(previous);

             mergeStepNodesInTree(currTree);
             Comparer.expect(currTree).to.match({
                 branches: [
                     {
                         steps: [ { text: "1A clone-1 step-1" }, { text: "1A clone-1 step-2" }, { text: "1A clone-1 step-3" } ],
                         passedLastTime: undefined,
                         isPassed: undefined,
                         isFailed: undefined
                     },
                     {
                         steps: [ { text: "1A clone-2 step-1" }, { text: "1A clone-2 step-2" }, { text: "1A clone-2 step-3" } ],
                         passedLastTime: undefined,
                         isPassed: undefined,
                         isFailed: undefined
                     },
                     {
                         steps: [ { text: "1B clone-1 step-1" }, { text: "1B clone-1 step-2" }, { text: "1B clone-1 step-3" } ],
                         passedLastTime: true,
                         isPassed: undefined,
                         isFailed: undefined
                     },
                     {
                         steps: [ { text: "3 clone-1 step-1" }, { text: "3 clone-1 step-2" }, { text: "3 clone-1 step-3" } ],
                         passedLastTime: undefined,
                         isPassed: undefined,
                         isFailed: undefined
                     },
                     {
                         steps: [ { text: "3 clone-2 step-1" }, { text: "3 clone-2 step-2" }, { text: "3 clone-2 step-3" } ],
                         passedLastTime: undefined,
                         isPassed: undefined,
                         isFailed: undefined
                     },
                     {
                         steps: [ { text: "3 clone-3 step-1" }, { text: "3 clone-3 step-2" }, { text: "3 clone-3 step-3" } ],
                         passedLastTime: undefined,
                         isPassed: undefined,
                         isFailed: undefined
                     }
                 ]
             });
        });
    });

    describe("getBranchCount()", () => {
        it("returns total number of branches", () => {
            let tree = new Tree();
            tree.parseIn(`
$ A -
    B -

        C -
        D -

            E -

    H - .s
        I -
    J - .s

F -
    G -
`, "file.txt");

            tree.noRandom = true;
            tree.generateBranches();

            expect(tree.getBranchCount(false, false)).to.equal(4);
        });

        it("returns total number of runnable branches", () => {
            let tree = new Tree();
            tree.parseIn(`
$ A -
    B -

        C -
        D -

            E -

    H - .s
        I -
    J - .s

F -
    G -
`, "file.txt");

            tree.noRandom = true;
            tree.generateBranches();

            tree.branches[0].passedLastTime = true;

            expect(tree.getBranchCount(true, false)).to.equal(3);
        });

        it("returns total number of complete branches", () => {
            let tree = new Tree();
            tree.parseIn(`
$ A -
    B -

        C -
        D -

            E -
            F -

    H - $s
        I -
    J - $s

F -
    G -
`, "file.txt");

            tree.noRandom = true;
            tree.generateBranches();

            tree.branches[0].passedLastTime = true;
            tree.branches[2].isFailed = true;

            expect(tree.getBranchCount(true, true)).to.equal(1);
            expect(tree.getBranchCount(false, true)).to.equal(4);

            delete tree.branches[2].isFailed;
            tree.branches[2].isSkipped = true;

            expect(tree.getBranchCount(true, true)).to.equal(0);
            expect(tree.getBranchCount(false, true)).to.equal(4);

            delete tree.branches[0].passedLastTime;
            tree.branches[0].isPassed = true;

            expect(tree.getBranchCount(true, true)).to.equal(1);
            expect(tree.getBranchCount(false, true)).to.equal(4);
        });

        it("returns total number of passed branches", () => {
            let tree = new Tree();
            tree.parseIn(`
A -
B -
C -
D -
E -
`, "file.txt");

            tree.noRandom = true;
            tree.generateBranches();

            tree.branches[0].isPassed = true;
            tree.branches[1].isSkipped = true;
            tree.branches[2].isPassed = true;
            tree.branches[3].isFailed = true;
            tree.branches[4].isPassed = true;

            expect(tree.getBranchCount(false, false, true)).to.equal(3);
        });

        it("returns total number of failed branches", () => {
            let tree = new Tree();
            tree.parseIn(`
A -
B -
C -
D -
E -
`, "file.txt");

            tree.noRandom = true;
            tree.generateBranches();

            tree.branches[0].isPassed = true;
            tree.branches[1].isSkipped = true;
            tree.branches[2].isPassed = true;
            tree.branches[3].isFailed = true;
            tree.branches[4].isPassed = true;

            expect(tree.getBranchCount(false, false, false, true)).to.equal(1);
        });

        it("returns total number of skipped branches", () => {
            let tree = new Tree();
            tree.parseIn(`
A -
B -
C -
D -
E -
`, "file.txt");

            tree.noRandom = true;
            tree.generateBranches();

            tree.branches[0].isPassed = true;
            tree.branches[1].isSkipped = true;
            tree.branches[2].isPassed = true;
            tree.branches[3].isFailed = true;
            tree.branches[4].isPassed = true;

            expect(tree.getBranchCount(false, false, false, false, true)).to.equal(1);
        });

        it("does not count inside hooks", () => {
            let tree = new Tree();
            tree.parseIn(`
$ A -
    B -

        C -
        D -

            E -

            *** After Every Branch {
                M
            }

            *** After Every Step {
                N
            }

            *** Before Every Branch {
                O
            }

            *** Before Every Step {
                P
            }

    H - .s
        I -
    J - .s

F -
    G -

*** Before Everything {
    Q
}

*** After Everything {
    R
}
`, "file.txt");

            tree.parseIn(`
*** Before Everything {
    S
}

*** After Everything {
    T
}

*** After Every Branch {
    U
}

*** After Every Step {
    V
}

*** Before Every Branch {
    W
}

*** Before Every Step {
    X
}
`, "packages.txt", true);

            tree.noRandom = true;
            tree.generateBranches();

            expect(tree.getBranchCount(false, false)).to.equal(4);
        });
    });

    describe("getStepCount()", () => {
        it("returns total number of steps", () => {
            let tree = new Tree();
            tree.parseIn(`
$ A -
    B -

        C -
        D -

            E -

    H - .s
        I -
    J - .s

F -
    G -
`, "file.txt");

            tree.noRandom = true;
            tree.generateBranches();

            expect(tree.getStepCount()).to.equal(13);
        });

        it("returns total number of runnable steps", () => {
            let tree = new Tree();
            tree.parseIn(`
$ A -
    B -

        C -
        D -

            E -

    H - .s
        I -
    J - .s

F -
    G -
`, "file.txt");

            tree.noRandom = true;
            tree.generateBranches();

            expect(tree.getStepCount(false)).to.equal(13);
            expect(tree.getStepCount(true)).to.equal(10);

            tree.branches[1].passedLastTime = true;

            expect(tree.getStepCount(true)).to.equal(6);
        });

        it("returns total number of complete steps", () => {
            let tree = new Tree();
            tree.parseIn(`
$ A -
    B -

        C -
        D -

            E -

    H - .s
        I -
    J - .s

F -
    G -
`, "file.txt");

            tree.noRandom = true;
            tree.generateBranches();

            tree.branches[0].steps[0].isPassed = true;
            tree.branches[0].steps[1].isFailed = true;
            tree.branches[2].passedLastTime = true;

            expect(tree.getStepCount(false)).to.equal(13);
            expect(tree.getStepCount(true, true)).to.equal(2);
        });

        it("returns total number of complete steps when there are skipped branches", () => {
            let tree = new Tree();
            tree.parseIn(`
A -
    B -

        C -
        D -

            E -
`, "file.txt");

            tree.noRandom = true;
            tree.generateBranches();

            tree.branches[0].isSkipped = true;

            expect(tree.getStepCount(false)).to.equal(8);
            expect(tree.getStepCount(true, true)).to.equal(0);
        });

        it("does not count inside hooks", () => {
            let tree = new Tree();
            tree.parseIn(`
$ A -
    B -

        C -
        D -

            E -

            *** After Every Branch {
                M
            }

            *** After Every Step {
                N
            }

            *** Before Every Branch {
                O
            }

            *** Before Every Step {
                P
            }

    H - .s
        I -
    J - .s

F -
    G -

*** Before Everything {
    Q
}

*** After Everything {
    R
}
`, "file.txt");

            tree.parseIn(`
*** Before Everything {
    S
}

*** After Everything {
    T
}

*** After Every Branch {
    U
}

*** After Every Step {
    V
}

*** Before Every Branch {
    W
}

*** Before Every Step {
    X
}
`, "packages.txt", true);

            tree.noRandom = true;
            tree.generateBranches();

            tree.branches[0].steps[0].isPassed = true;
            tree.branches[0].steps[1].isFailed = true;
            tree.branches[2].passedLastTime = true;

            expect(tree.getStepCount(false)).to.equal(13);
            expect(tree.getStepCount(true, true)).to.equal(2);
        });

        it("returns total number of failed steps", () => {
            let tree = new Tree();
            tree.parseIn(`
A -
    B -

        C -
        D -

            E -
`, "file.txt");

            tree.noRandom = true;
            tree.generateBranches();

            tree.branches[0].steps[0].isPassed = true;
            tree.branches[0].steps[1].isFailed = true;
            tree.branches[0].steps[2].isFailed = true;
            tree.branches[0].steps[3].isPassed = true;

            tree.branches[1].steps[0].isPassed = true;
            tree.branches[1].steps[1].isFailed = true;
            tree.branches[1].steps[2].isFailed = true;

            expect(tree.getStepCount(true, false, true)).to.equal(4);
        });
    });

    describe("nextBranch()", () => {
        it("returns the next branch", () => {
            let tree = new Tree();
            tree.parseIn(`
A - !
    B -
        C -
        D -
        E -

F -

G -
`, "file.txt");

            tree.noRandom = true;
            tree.generateBranches();
            let b = null;

            b = tree.nextBranch();
            mergeStepNodes(tree, b.steps);
            Comparer.expect(b).to.match({
                steps: [ { text: "A" }, { text: "B" }, { text: "C" } ]
            });

            b = tree.nextBranch();
            mergeStepNodes(tree, b.steps);
            Comparer.expect(b).to.match({
                steps: [ { text: "F" } ]
            });

            b = tree.nextBranch();
            mergeStepNodes(tree, b.steps);
            Comparer.expect(b).to.match({
                steps: [ { text: "G" } ]
            });

            b = tree.nextBranch();
            Comparer.expect(b).to.match(null);

            delete tree.branches[0].isRunning;
            tree.branches[0].isSkipped = true;

            b = tree.nextBranch();
            mergeStepNodes(tree, b.steps);
            Comparer.expect(b).to.match({
                steps: [ { text: "A" }, { text: "B" }, { text: "D" } ]
            });

            b = tree.nextBranch();
            Comparer.expect(b).to.match(null);

            delete tree.branches[1].isRunning;
            tree.branches[1].isFailed = true;

            b = tree.nextBranch();
            mergeStepNodes(tree, b.steps);
            Comparer.expect(b).to.match({
                steps: [ { text: "A" }, { text: "B" }, { text: "E" } ]
            });

            b = tree.nextBranch();
            Comparer.expect(b).to.match(null);

            b = tree.nextBranch();
            Comparer.expect(b).to.match(null);

            delete tree.branches[2].isRunning;
            delete tree.branches[3].isRunning;
            tree.branches[2].isFailed = true;
            tree.branches[3].isPassed = true;

            b = tree.nextBranch();
            Comparer.expect(b).to.match(null);

            delete tree.branches[4].isRunning;
            tree.branches[4].isPassed = true;

            b = tree.nextBranch();
            Comparer.expect(b).to.match(null);

            b = tree.nextBranch();
            Comparer.expect(b).to.match(null);
        });

        it("finds a branch not yet taken, skipping over those with a running branch with matching nonParallelIds", () => {
            let tree = new Tree();
            tree.parseIn(`
A - !
    B -
        C -
        D -
        E -

F -

G -
`, "file.txt");

            tree.noRandom = true;
            tree.generateBranches();

            tree.branches[0].isRunning = true;
            tree.branches[0].steps[0].isPassed = true;
            tree.branches[0].steps[1].isRunning = true;

            let b = tree.nextBranch();
            mergeStepNodes(tree, b.steps);
            Comparer.expect(b).to.match({
                steps: [ { text: "F" } ]
            });
        });

        it("returns null when no branches are available", () => {
            let tree = new Tree();
            tree.parseIn(`
A - !
    B -
        C -
        D -
        E -
`, "file.txt");

            tree.noRandom = true;
            tree.generateBranches();

            tree.branches[0].isRunning = true;
            tree.branches[0].steps[0].isPassed = true;
            tree.branches[0].steps[1].isRunning = true;

            expect(tree.nextBranch()).to.equal(null);

            tree.branches[0].isPassed = true;
            tree.branches[1].isPassed = true;
            tree.branches[2].isPassed = true;
            delete tree.branches[0].isPassed;
            delete tree.branches[1].isPassed;
            delete tree.branches[2].isPassed;

            expect(tree.nextBranch()).to.equal(null);
        });

        it("returns null on an empty tree", () => {
            tree = new Tree();
            tree.noRandom = true;
            tree.generateBranches();

            expect(tree.nextBranch()).to.equal(null);
        });
    });

    describe("findSimilarBranches()", () => {
        it("handles empty branches", () => {
            let tree = new Tree();

            let branch1 = new Branch();
            let branch2 = new Branch();

            tree.branches = [ branch1, branch2 ];

            let similarBranches = tree.findSimilarBranches(branch1, 1);
            Comparer.expect(similarBranches).to.match([
                { steps: [] }
            ]);
        });

        it("finds similar branches", () => {
            let tree = new Tree();

            tree.newStepNode();
            tree.newStepNode();
            tree.newStepNode();
            tree.newStepNode();

            let A = 1; tree.stepNodeIndex[A].text = "A";
            let B = 2; tree.stepNodeIndex[B].text = "B";
            let C = 3; tree.stepNodeIndex[C].text = "C";
            let D = 4; tree.stepNodeIndex[D].text = "D";

            let branch1 = new Branch();
            let branch2 = new Branch();
            let branch3 = new Branch();
            let branch4 = new Branch();

            branch1.steps.push(new Step(A));
            branch1.steps.push(new Step(B));
            branch1.steps.push(new Step(C));
            branch1.steps.push(new Step(D));

            branch2.steps.push(new Step(A));
            branch2.steps.push(new Step(B));
            branch2.steps.push(new Step(D));

            branch3.steps.push(new Step(A));
            branch3.steps.push(new Step(B));
            branch3.steps.push(new Step(C));

            branch4.steps.push(new Step(C));
            branch4.steps.push(new Step(B));
            branch4.steps.push(new Step(A));

            tree.branches = [ branch1, branch2, branch3, branch4 ];

            let similarBranches = tree.findSimilarBranches(branch1, 1);
            mergeStepNodesInBranches(tree, tree.branches);
            Comparer.expect(similarBranches).to.match([
                {
                    steps: [ { text: "A" }, { text: "B" }, { text: "D" } ]
                },
                {
                    steps: [ { text: "A" }, { text: "B" }, { text: "C" } ]
                }
            ]);

            similarBranches = tree.findSimilarBranches(branch1, 2);
            mergeStepNodesInBranches(tree, tree.branches);
            Comparer.expect(similarBranches).to.match([
                {
                    steps: [ { text: "A" }, { text: "B" }, { text: "D" } ]
                },
                {
                    steps: [ { text: "A" }, { text: "B" }, { text: "C" } ]
                }
            ]);

            similarBranches = tree.findSimilarBranches(branch1, 3);
            mergeStepNodesInBranches(tree, tree.branches);
            Comparer.expect(similarBranches).to.match([
                {
                    steps: [ { text: "A" }, { text: "B" }, { text: "C" } ]
                }
            ]);

            similarBranches = tree.findSimilarBranches(branch1, 4);
            mergeStepNodesInBranches(tree, tree.branches);
            Comparer.expect(similarBranches).to.match([]);

            similarBranches = tree.findSimilarBranches(branch3, 3);
            mergeStepNodesInBranches(tree, tree.branches);
            Comparer.expect(similarBranches).to.match([
                {
                    steps: [ { text: "A" }, { text: "B" }, { text: "C" }, { text: "D" } ]
                }
            ]);
        });
    });

    describe("markHookStep()", () => {
        it("marks a hook step passed", () => {
            let tree = new Tree();
            let step = new Step(1);

            tree.markHookStep('pass', step);

            Comparer.expect(step).to.match({
                isPassed: true,
                isFailed: undefined,
                isSkipped: undefined
            });
        });

        it("marks a hook step failed and sets its error", () => {
            let tree = new Tree();
            let step = new Step(1);

            tree.markHookStep('fail', step, new Error('oops'));

            Comparer.expect(step).to.match({
                isPassed: undefined,
                isFailed: true,
                isSkipped: undefined,
                error: {
                    message: 'oops',
                    stack: { $typeof: 'string' }
                }
            });
        });
    });

    describe("nextStep()", () => {
        it("returns null if the branch failed or skipped", () => {
            let tree = new Tree();
            let branch = new Branch();
            tree.branches = [ branch ];

            branch.isFailed = true;

            expect(tree.nextStep(branch, false)).to.equal(null);

            delete branch.isFailed;
            branch.isSkipped = true;

            expect(tree.nextStep(branch, false)).to.equal(null);
        });

        it("returns the first step if nothing is running yet, without advancing", () => {
            let tree = new Tree();

            tree.newStepNode();
            tree.newStepNode();
            tree.newStepNode();
            tree.newStepNode();

            let stepA = new Step(1);
            let stepB = new Step(2);
            let stepC = new Step(3);
            let stepD = new Step(4);

            let branch = new Branch();
            branch.steps = [ stepA, stepB, stepC, stepD ];

            tree.branches = [ branch ];

            let s = tree.nextStep(branch, false);
            Comparer.expect(s).to.match({
                id: 1,
                isRunning: undefined
            });
        });

        it("returns the next step if one is currently running, without advancing", () => {
            let tree = new Tree();

            tree.newStepNode();
            tree.newStepNode();
            tree.newStepNode();
            tree.newStepNode();

            let stepA = new Step(1);
            stepA.isRunning = true;

            let stepB = new Step(2);
            let stepC = new Step(3);
            let stepD = new Step(4);

            let branch = new Branch();
            branch.steps = [ stepA, stepB, stepC, stepD ];

            tree.branches = [ branch ];

            let s = tree.nextStep(branch, false, false);
            Comparer.expect(s).to.match({
                id: 2,
                isRunning: undefined
            });

            Comparer.expect(stepA).to.match({
                id: 1,
                isRunning: true
            });
        });

        it("returns null if the last step is currently running, without advancing", () => {
            let tree = new Tree();

            tree.newStepNode();
            tree.newStepNode();
            tree.newStepNode();
            tree.newStepNode();

            let stepA = new Step(1);
            let stepB = new Step(2);
            let stepC = new Step(3);

            let stepD = new Step(4);
            stepD.isRunning = true;

            let branch = new Branch();
            branch.steps = [ stepA, stepB, stepC, stepD ];

            tree.branches = [ branch ];

            let s = tree.nextStep(branch, false);
            Comparer.expect(s).to.match(null);

            Comparer.expect(stepD).to.match({
                id: 4,
                isRunning: true
            });
        });

        it("returns the first step if nothing is running yet, with advancing", () => {
            let tree = new Tree();

            tree.newStepNode();
            tree.newStepNode();
            tree.newStepNode();
            tree.newStepNode();

            let stepA = new Step(1);
            let stepB = new Step(2);
            let stepC = new Step(3);
            let stepD = new Step(4);

            let branch = new Branch();
            branch.steps = [ stepA, stepB, stepC, stepD ];

            tree.branches = [ branch ];

            let s = tree.nextStep(branch, true);
            Comparer.expect(s).to.match({
                id: 1,
                isRunning: true
            });
        });

        it("returns the next step if one is currently running, with advancing", () => {
            let tree = new Tree();

            tree.newStepNode();
            tree.newStepNode();
            tree.newStepNode();
            tree.newStepNode();

            let stepA = new Step(1);
            stepA.isRunning = true;

            let stepB = new Step(2);
            let stepC = new Step(3);
            let stepD = new Step(4);

            let branch = new Branch();
            branch.steps = [ stepA, stepB, stepC, stepD ];

            tree.branches = [ branch ];

            let s = tree.nextStep(branch, true);
            Comparer.expect(s).to.match({
                id: 2,
                isRunning: true
            });

            Comparer.expect(stepA).to.match({
                id: 1,
                isRunning: undefined
            });
        });

        it("returns null if the last step is currently running, with advancing", () => {
            let tree = new Tree();

            tree.newStepNode();
            tree.newStepNode();
            tree.newStepNode();
            tree.newStepNode();

            let stepA = new Step(1);
            let stepB = new Step(2);
            let stepC = new Step(3);

            let stepD = new Step(4);
            stepD.isRunning = true;

            let branch = new Branch();
            branch.steps = [ stepA, stepB, stepC, stepD ];

            tree.branches = [ branch ];

            let s = tree.nextStep(branch, true);
            Comparer.expect(s).to.match(null);

            Comparer.expect(stepD).to.match({
                id: 4,
                isRunning: undefined
            });
        });

        it("ends the branch if the next step is a .s", () => {
            let tree = new Tree();

            tree.newStepNode();
            tree.newStepNode();
            tree.newStepNode();
            tree.newStepNode();

            let stepA = new Step(1);
            stepA.isPassed = true;

            let stepB = new Step(2);
            stepB.isPassed = true;
            stepB.isRunning = true;

            let stepC = new Step(3);
            tree.stepNodeIndex[3].isSkipBelow = true;

            let stepD = new Step(4);

            let branch1 = new Branch();
            let branch2 = new Branch();
            let branch3 = new Branch();
            let branch4 = new Branch();

            branch1.steps = [ stepA, stepB, stepC, stepD ];
            branch2.steps = [ stepA.clone(), stepB.clone(), stepC.clone() ];
            branch3.steps = [ stepA.clone(), stepB.clone(), stepC.clone(), stepB.clone() ];
            branch4.steps = [ stepD.clone(), stepB.clone() ];

            tree.branches = [ branch2, branch1, branch3, branch4 ];

            let s = tree.nextStep(branch1, true);
            Comparer.expect(s).to.match(null);

            Comparer.expect(stepB).to.match({
                id: 2,
                isRunning: undefined
            });

            Comparer.expect(stepC).to.match({
                id: 3,
                isRunning: undefined
            });

            expect(branch1.isPassed).to.equal(true);
            expect(branch1.isSkipped).to.equal(undefined);
            expect(branch2.isSkipped).to.equal(undefined);
            expect(branch3.isSkipped).to.equal(undefined);
            expect(branch4.isSkipped).to.equal(undefined);
        });

        it("clears isRunning on all steps in the branch if the branch completed already", () => {
            let tree = new Tree();

            tree.newStepNode();
            tree.newStepNode();
            tree.newStepNode();
            tree.newStepNode();

            let stepA = new Step(1);
            stepA.isPassed = true;

            let stepB = new Step(2);
            stepB.isPassed = true;
            stepB.isRunning = true;

            let stepC = new Step(3);
            let stepD = new Step(4);

            let branch1 = new Branch();
            branch1.steps = [ stepA, stepB, stepC, stepD ];
            branch1.isPassed = true;
            tree.branches = [ branch1 ];

            expect(tree.nextStep(branch1, true)).to.equal(null);

            expect(stepA.isRunning).to.equal(undefined);
            expect(stepB.isRunning).to.equal(undefined);
            expect(stepC.isRunning).to.equal(undefined);
            expect(stepD.isRunning).to.equal(undefined);
            expect(branch1.isRunning).to.equal(undefined);
        });

        it("skips over a step that is already skipped", () => {
            let tree = new Tree();

            tree.newStepNode();
            tree.newStepNode();
            tree.newStepNode();
            tree.newStepNode();

            let stepA = new Step(1);
            stepA.isPassed = true;
            stepA.isRunning = true;

            let stepB = new Step(2);
            stepB.isSkipped = true;

            let stepC = new Step(3);
            let stepD = new Step(4);

            let branch = new Branch();
            branch.steps = [ stepA, stepB, stepC, stepD ];

            tree.branches = [ branch ];

            let s = tree.nextStep(branch, true);
            Comparer.expect(s).to.match({
                id: 3,
                isSkipped: undefined,
                isRunning: true
            });

            Comparer.expect(stepA).to.match({
                id: 1,
                isPassed: true,
                isSkipped: undefined,
                isRunning: undefined
            });

            Comparer.expect(stepB).to.match({
                id: 2,
                isSkipped: true,
                isRunning: undefined
            });

            Comparer.expect(stepC).to.match({
                id: 3,
                isSkipped: undefined,
                isRunning: true
            });
        });

        it("skips over a step that has -s", () => {
            let tree = new Tree();

            tree.newStepNode();
            tree.newStepNode();
            tree.newStepNode();
            tree.newStepNode();

            let stepA = new Step(1);
            stepA.isPassed = true;
            stepA.isRunning = true;

            let stepB = new Step(2);
            stepB.isSkip = true;

            let stepC = new Step(3);
            let stepD = new Step(4);

            let branch = new Branch();
            branch.steps = [ stepA, stepB, stepC, stepD ];

            tree.branches = [ branch ];

            let s = tree.nextStep(branch, true);
            Comparer.expect(s).to.match({
                id: 3,
                isSkipped: undefined,
                isRunning: true
            });

            Comparer.expect(stepA).to.match({
                id: 1,
                isPassed: true,
                isSkipped: undefined,
                isRunning: undefined
            });

            Comparer.expect(stepB).to.match({
                id: 2,
                isSkipped: true,
                isRunning: undefined
            });

            Comparer.expect(stepC).to.match({
                id: 3,
                isSkipped: undefined,
                isRunning: true
            });
        });

        it("skips over a first step that has -s", () => {
            let tree = new Tree();

            tree.newStepNode();
            tree.newStepNode();
            tree.newStepNode();
            tree.newStepNode();

            let stepA = new Step(1);
            stepA.isSkip = true;

            let stepB = new Step(2);
            let stepC = new Step(3);
            let stepD = new Step(4);

            let branch = new Branch();
            branch.steps = [ stepA, stepB, stepC, stepD ];

            tree.branches = [ branch ];

            let s = tree.nextStep(branch, true);
            Comparer.expect(s).to.match({
                id: 2,
                isRunning: true
            });

            Comparer.expect(stepA).to.match({
                id: 1,
                isSkipped: true,
                isRunning: undefined
            });

            Comparer.expect(stepB).to.match({
                id: 2,
                isSkipped: undefined,
                isRunning: true
            });
        });

        it("skips over multiple steps that have -s", () => {
            let tree = new Tree();

            tree.newStepNode();
            tree.newStepNode();
            tree.newStepNode();
            tree.newStepNode();

            let stepA = new Step(1);
            stepA.isPassed = true;
            stepA.isRunning = true;

            let stepB = new Step(2);
            stepB.isSkip = true;

            let stepC = new Step(3);
            stepC.isSkip = true;

            let stepD = new Step(4);

            let branch = new Branch();
            branch.steps = [ stepA, stepB, stepC, stepD ];

            tree.branches = [ branch ];

            let s = tree.nextStep(branch, true);
            Comparer.expect(s).to.match({
                id: 4,
                isRunning: true
            });

            Comparer.expect(stepA).to.match({
                id: 1,
                isPassed: true,
                isRunning: undefined
            });

            Comparer.expect(stepB).to.match({
                id: 2,
                isSkipped: true,
                isRunning: undefined
            });

            Comparer.expect(stepC).to.match({
                id: 3,
                isSkipped: true,
                isRunning: undefined
            });

            Comparer.expect(stepD).to.match({
                id: 4,
                isSkipped: undefined,
                isRunning: true
            });
        });

        it("skips over a last step that has -s", () => {
            let tree = new Tree();

            tree.newStepNode();
            tree.newStepNode();
            tree.newStepNode();
            tree.newStepNode();

            let stepA = new Step(1);
            stepA.isPassed = true;
            stepA.isRunning = true;

            let stepB = new Step(2);
            stepB.isSkip = true;

            let branch = new Branch();
            branch.steps = [ stepA, stepB ];

            tree.branches = [ branch ];

            let s = tree.nextStep(branch, true);
            Comparer.expect(s).to.match(null);

            Comparer.expect(stepA).to.match({
                id: 1,
                isPassed: true,
                isRunning: undefined
            });

            Comparer.expect(stepB).to.match({
                id: 2,
                isSkipped: true,
                isRunning: undefined
            });

            expect(branch.isPassed).to.be.true;
        });
    });

    describe("initCounts()", () => {
        it("initializes counts", () => {
            let tree = new Tree();
            tree.parseIn(`
A -
B -

    C -

    D -
`, "file.txt");

            tree.noRandom = true;
            tree.generateBranches();
            tree.initCounts();

            expect(tree.counts.running).to.equal(0);
            expect(tree.counts.passed).to.equal(0);
            expect(tree.counts.failed).to.equal(0);
            expect(tree.counts.skipped).to.equal(0);
            expect(tree.counts.complete).to.equal(0);
            expect(tree.counts.total).to.equal(4);
            expect(tree.counts.totalToRun).to.equal(4);

            expect(tree.counts.totalStepsComplete).to.equal(0);
            expect(tree.counts.totalSteps).to.equal(8);
        });
    });

    describe("updateCounts()", () => {
        it("updates counts", () => {
            let tree = new Tree();
            tree.parseIn(`
A -
B -

    C -

    D -
`, "file.txt");

            tree.noRandom = true;
            tree.generateBranches();

            tree.branches[0].isPassed = true;
            tree.branches[0].steps[0].isPassed = true;
            tree.branches[0].steps[1].isPassed = true;

            tree.branches[1].isFailed = true;
            tree.branches[1].steps[0].isFailed = true;

            tree.branches[2].passedLastTime = true;

            tree.branches[3].isRunning = true;

            tree.updateCounts();

            expect(tree.counts.running).to.equal(1);
            expect(tree.counts.passed).to.equal(2);
            expect(tree.counts.failed).to.equal(1);
            expect(tree.counts.skipped).to.equal(0);
            expect(tree.counts.complete).to.equal(3);
            expect(tree.counts.total).to.equal(4);
            expect(tree.counts.totalToRun).to.equal(3);

            expect(tree.counts.totalStepsComplete).to.equal(4);
            expect(tree.counts.totalSteps).to.equal(6);
        });
    });
});
