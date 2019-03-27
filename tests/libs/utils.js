const chai = require('chai');
const chaiSubset = require('chai-subset');
const expect = chai.expect;
const assert = chai.assert;
const util = require('util');
const utils = require('../../utils.js');

chai.use(chaiSubset);

describe("Utils", function() {
    describe("stripQuotes()", function() {
        it("strips quotes", function() {
            expect(utils.stripQuotes(`"foobar"`)).to.equal(`foobar`);
            expect(utils.stripQuotes(`  "foobar"  `)).to.equal(`foobar`);
            expect(utils.stripQuotes(`'foobar'`)).to.equal(`foobar`);
            expect(utils.stripQuotes(`  'foobar'  `)).to.equal(`foobar`);
            expect(utils.stripQuotes(`[foobar]`)).to.equal(`foobar`);
            expect(utils.stripQuotes(`  [foobar]  `)).to.equal(`foobar`);
        });

        it("doesn't touch non-quotes", function() {
            expect(utils.stripQuotes(`foobar`)).to.equal(`foobar`);
            expect(utils.stripQuotes(`  foobar  `)).to.equal(`  foobar  `);
        });
    });

    describe("hasQuotes()", function() {
        it("determines if a string has quotes", function() {
            expect(utils.hasQuotes(`"foobar"`)).to.equal(true);
            expect(utils.hasQuotes(`  "foobar"  `)).to.equal(true);
            expect(utils.hasQuotes(`'foobar'`)).to.equal(true);
            expect(utils.hasQuotes(`  'foobar'  `)).to.equal(true);

            expect(utils.hasQuotes(`foobar`)).to.equal(false);
            expect(utils.hasQuotes(`  foobar  `)).to.equal(false);
        });
    });

    describe("canonicalize()", function() {
        it("generates canonical text", function() {
            expect(utils.canonicalize(" After   EVERY Branch  ")).to.equal("after every branch");
        });
    });
});
