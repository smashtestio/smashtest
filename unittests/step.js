const chai = require('chai');
const chaiSubset = require('chai-subset');
const expect = chai.expect;
const assert = chai.assert;
const util = require('util');
const Step = require('../step.js');

chai.use(chaiSubset);

describe("Step", function() {
    describe("clone()", function() {
        it("can properly deep clone", function() {
            var A = new Step();
            A.text = "A";







        });

        it("references to the original Step are to the cloned version of the original Step", function() {

        });
    });

    describe("cloneChildren()", function() {
        it("can properly deep clone", function() {

        });
    });

    describe("getLeaves()", function() {
        it("returns all leaves", function() {
            // include StepBlocks in the underlying structure
        });

        it("returns an array with itself when called on a leaf", function() {

        });
    });
});
