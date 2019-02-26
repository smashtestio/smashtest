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

    describe("clone()", function() {
        it("can properly deep clone", function() {
            var clonedRoot = root.clone();

            clonedRoot.cloneMark = true;
            clonedRoot.children[0].children[1].children[0].cloneMark = true; // D's clone

            expect(clonedRoot).to.containSubset({
                parent: null,
                cloneMark: true,
                children: [
                    {
                        text: 'A',
                        varsList: [ 'A1', 'A2' ],
                        cloneMark: undefined,
                        parent: { cloneMark: true },
                        children: [
                            {
                                text: 'B',
                                varsList: [ 'B1', 'B2' ],
                                cloneMark: undefined,
                                parent: { cloneMark: undefined },
                                children: []
                            },
                            {
                                text: 'C',
                                varsList: [ 'C1', 'C2' ],
                                cloneMark: undefined,
                                parent: { cloneMark: undefined },
                                children: [
                                    {
                                        text: 'D',
                                        varsList: [ 'D1', 'D2' ],
                                        cloneMark: true,
                                        parent: { cloneMark: undefined },
                                        children: []
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        steps: [
                            {
                                text: 'E',
                                varsList: [ 'E1', 'E2' ],
                                cloneMark: undefined,
                                parent: null,
                                children: []
                            },
                            {
                                text: 'F',
                                varsList: [ 'F1', 'F2' ],
                                cloneMark: undefined,
                                parent: null,
                                children: []
                            }
                        ],
                        parent: { cloneMark: true },
                        children: []
                    }
                ]
            });
        });

        it("changes to the clone do not affect the original object", function() {
            var clonedRoot = root.clone();

            clonedRoot.cloneMark = true;
            clonedRoot.children[0].children[1].children[0].cloneMark = true; // D's clone

            expect(root).to.containSubset({
                parent: null,
                cloneMark: undefined,
                children: [
                    {
                        text: 'A',
                        varsList: [ 'A1', 'A2' ],
                        cloneMark: undefined,
                        parent: { cloneMark: undefined },
                        children: [
                            {
                                text: 'B',
                                varsList: [ 'B1', 'B2' ],
                                cloneMark: undefined,
                                parent: { cloneMark: undefined },
                                children: []
                            },
                            {
                                text: 'C',
                                varsList: [ 'C1', 'C2' ],
                                cloneMark: undefined,
                                parent: { cloneMark: undefined },
                                children: [
                                    {
                                        text: 'D',
                                        varsList: [ 'D1', 'D2' ],
                                        cloneMark: undefined,
                                        parent: { cloneMark: undefined },
                                        children: []
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        steps: [
                            {
                                text: 'E',
                                varsList: [ 'E1', 'E2' ],
                                cloneMark: undefined,
                                parent: null,
                                children: []
                            },
                            {
                                text: 'F',
                                varsList: [ 'F1', 'F2' ],
                                cloneMark: undefined,
                                parent: null,
                                children: []
                            }
                        ],
                        parent: { cloneMark: undefined },
                        children: []
                    }
                ]
            });
        });

        it("changes to the original object do not affect the clone", function() {
            var clonedRoot = root.clone();

            root.originalMark = true;
            root.children[0].children[1].children[0].originalMark = true; // D

            expect(clonedRoot).to.containSubset({
                parent: null,
                originalMark: undefined,
                children: [
                    {
                        text: 'A',
                        varsList: [ 'A1', 'A2' ],
                        originalMark: undefined,
                        parent: { originalMark: undefined },
                        children: [
                            {
                                text: 'B',
                                varsList: [ 'B1', 'B2' ],
                                originalMark: undefined,
                                parent: { originalMark: undefined },
                                children: []
                            },
                            {
                                text: 'C',
                                varsList: [ 'C1', 'C2' ],
                                originalMark: undefined,
                                parent: { originalMark: undefined },
                                children: [
                                    {
                                        text: 'D',
                                        varsList: [ 'D1', 'D2' ],
                                        originalMark: undefined,
                                        parent: { originalMark: undefined },
                                        children: []
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        steps: [
                            {
                                text: 'E',
                                varsList: [ 'E1', 'E2' ],
                                originalMark: undefined,
                                parent: null,
                                children: []
                            },
                            {
                                text: 'F',
                                varsList: [ 'F1', 'F2' ],
                                originalMark: undefined,
                                parent: null,
                                children: []
                            }
                        ],
                        parent: { originalMark: undefined },
                        children: []
                    }
                ]
            });
        });
    });

    describe("cloneChildren()", function() {
        it("can properly clone children", function() {
            var clones = root.cloneChildren();

            root.originalMark = true;
            root.children[0].children[1].children[0].originalMark = true; // D

            expect(clones).to.containSubset([
                {
                    text: 'A',
                    varsList: [ 'A1', 'A2' ],
                    originalMark: undefined,
                    parent: null,
                    children: [
                        {
                            text: 'B',
                            varsList: [ 'B1', 'B2' ],
                            originalMark: undefined,
                            parent: { originalMark: undefined },
                            children: []
                        },
                        {
                            text: 'C',
                            varsList: [ 'C1', 'C2' ],
                            originalMark: undefined,
                            parent: { originalMark: undefined },
                            children: [
                                {
                                    text: 'D',
                                    varsList: [ 'D1', 'D2' ],
                                    originalMark: undefined,
                                    parent: { originalMark: undefined },
                                    children: []
                                }
                            ]
                        }
                    ]
                },
                {
                    steps: [
                        {
                            text: 'E',
                            varsList: [ 'E1', 'E2' ],
                            originalMark: undefined,
                            parent: null,
                            children: []
                        },
                        {
                            text: 'F',
                            varsList: [ 'F1', 'F2' ],
                            originalMark: undefined,
                            parent: null,
                            children: []
                        }
                    ],
                    parent: null,
                    children: []
                }
            ]);
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
});
