const chai = require('chai');
const chaiSubset = require('chai-subset');
const expect = chai.expect;
const assert = chai.assert;
const util = require('util');
const utils = require('../../utils.js');

chai.use(chaiSubset);

describe("Utils", () => {
    describe("stripQuotes()", () => {
        it("strips quotes", () => {
            expect(utils.stripQuotes(`"foobar"`)).to.equal(`foobar`);
            expect(utils.stripQuotes(`  "foobar"  `)).to.equal(`foobar`);
            expect(utils.stripQuotes(`'foobar'`)).to.equal(`foobar`);
            expect(utils.stripQuotes(`  'foobar'  `)).to.equal(`foobar`);
            expect(utils.stripQuotes(`[foobar]`)).to.equal(`foobar`);
            expect(utils.stripQuotes(`  [foobar]  `)).to.equal(`foobar`);
        });

        it("doesn't touch non-quotes", () => {
            expect(utils.stripQuotes(`foobar`)).to.equal(`foobar`);
            expect(utils.stripQuotes(`  foobar  `)).to.equal(`  foobar  `);
        });
    });

    describe("hasQuotes()", () => {
        it("determines if a string has quotes", () => {
            expect(utils.hasQuotes(`"foobar"`)).to.equal(true);
            expect(utils.hasQuotes(`  "foobar"  `)).to.equal(true);
            expect(utils.hasQuotes(`'foobar'`)).to.equal(true);
            expect(utils.hasQuotes(`  'foobar'  `)).to.equal(true);

            expect(utils.hasQuotes(`foobar`)).to.equal(false);
            expect(utils.hasQuotes(`  foobar  `)).to.equal(false);
        });
    });

    describe("canonicalize()", () => {
        it("generates canonical text", () => {
            expect(utils.canonicalize(" After   EVERY Branch  ")).to.equal("after every branch");
        });
    });
});
