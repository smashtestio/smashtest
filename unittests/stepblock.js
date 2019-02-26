const chai = require('chai');
const chaiSubset = require('chai-subset');
const expect = chai.expect;
const assert = chai.assert;
const util = require('util');
const Step = require('../step.js');
const StepBlock = require('../stepblock.js');

chai.use(chaiSubset);

describe("StepBlock", function() {
    var EF = null;

    beforeEach(function() {
        /*
        E
        F
            G
        */

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

        var G = new Step();
        G.text = "G";
        G.varsList = ["G1", "G2"];

        EF = new StepBlock();
        EF.parent = root;
        EF.children = [ G ];
        EF.steps = [ E, F ];
        E.containingStepBlock = EF;
        F.containingStepBlock = EF;

        G.parent = EF;
        G.children = [];
    });

    describe("cloneSteps()", function() {
        it("can properly clone steps", function() {
            var clonedSteps = EF.cloneSteps();

            expect(clonedSteps).to.containSubset([
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
            ]);
        });
    });
});
