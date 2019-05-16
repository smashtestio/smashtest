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

    describe("escapeHtml()", () => {
        it("escapes html", () => {
            expect(utils.escapeHtml("foo<>&amp;\"'bar")).to.equal("foo&lt;&gt;&amp;amp;\"'bar");
        });
    });

    describe("unescapeHtml()", () => {
        it("unescapes html", () => {
            expect(utils.unescapeHtml("foo&lt;&gt;&amp;amp;\"'bar")).to.equal("foo<>&amp;\"'bar");
        });
    });

    describe("escape()", () => {
        it("escapes special chars", () => {
            expect(utils.escape("\\\n\r\t\\n\\r\\t/")).to.equal("\\\\\\n\\r\\t\\\\n\\\\r\\\\t/");
        });

        it("escapes empty string", () => {
            expect(utils.escape("")).to.equal("");
        });

        it("escapes normal string", () => {
            expect(utils.escape("foobar")).to.equal("foobar");
        });
    });

    describe("unescape()", () => {
        it("unescapes special chars", () => {
            expect(utils.unescape("\\\\\\n\\r\\t\\0\\\\n\\\\r\\\\t\\/")).to.equal("\\\n\r\t\0\\n\\r\\t/");
        });

        it("unescapes empty string", () => {
            expect(utils.unescape("")).to.equal("");
        });

        it("unescapes normal string", () => {
            expect(utils.unescape("foobar")).to.equal("foobar");
        });
    });

    describe("canonicalize()", () => {
        it("generates canonical text", () => {
            expect(utils.canonicalize(" After   EVERY Branch  ")).to.equal("after every branch");
        });
    });

    describe("keepCaseCanonicalize()", () => {
        it("generates canonical text but keeps casing", () => {
            expect(utils.keepCaseCanonicalize(" After   EVERY Branch  ")).to.equal("After EVERY Branch");
        });
    });

    describe("numIndents()", () => {
        it("counts spaces properly", () => {
            assert.equal(utils.numIndents('m ', 'file.txt', 10), 0);
            assert.equal(utils.numIndents('blah', 'file.txt', 10), 0);
            assert.equal(utils.numIndents('    blah blah', 'file.txt', 10), 1);
            assert.equal(utils.numIndents('        blah  \t ', 'file.txt', 10), 2);
        });

        it("throws an exception for non-whitespace at the beginning of a step", () => {
            assert.throws(() => {
                utils.numIndents('\tblah', 'file.txt', 10);
            }, "Spaces are the only type of whitespace allowed at the beginning of a step [file.txt:10]");

            assert.throws(() => {
                utils.numIndents(' \tblah', 'file.txt', 10);
            }, "Spaces are the only type of whitespace allowed at the beginning of a step [file.txt:10]");
        });

        it("throws an exception for a number of spaces not a multiple of 4", () => {
            assert.throws(() => {
                utils.numIndents(' blah', 'file.txt', 10);
            }, "The number of spaces at the beginning of a step must be a multiple of 4. You have 1 space(s). [file.txt:10]");

            assert.throws(() => {
                utils.numIndents('  blah', 'file.txt', 10);
            }, "The number of spaces at the beginning of a step must be a multiple of 4. You have 2 space(s). [file.txt:10]");

            assert.throws(() => {
                utils.numIndents('   blah', 'file.txt', 10);
            }, "The number of spaces at the beginning of a step must be a multiple of 4. You have 3 space(s). [file.txt:10]");

            assert.throws(() => {
                utils.numIndents('     blah', 'file.txt', 10);
            }, "The number of spaces at the beginning of a step must be a multiple of 4. You have 5 space(s). [file.txt:10]");
        });

        it("returns 0 for an empty string or all-whitespace string", () => {
            assert.equal(utils.numIndents('', 'file.txt', 10), 0);
            assert.equal(utils.numIndents(' ', 'file.txt', 10), 0);
            assert.equal(utils.numIndents('  ', 'file.txt', 10), 0);
            assert.equal(utils.numIndents('     ', 'file.txt', 10), 0);
            assert.equal(utils.numIndents('        ', 'file.txt', 10), 0);
            assert.equal(utils.numIndents('    \t   ', 'file.txt', 10), 0);
        });

        it("returns 0 for a string that's entirely a comment", () => {
            assert.equal(utils.numIndents('//', 'file.txt', 10), 0);
            assert.equal(utils.numIndents('// blah', 'file.txt', 10), 0);
            assert.equal(utils.numIndents('//blah', 'file.txt', 10), 0);
            assert.equal(utils.numIndents(' //', 'file.txt', 10), 0);
            assert.equal(utils.numIndents(' // blah', 'file.txt', 10), 0);
            assert.equal(utils.numIndents(' //blah', 'file.txt', 10), 0);
            assert.equal(utils.numIndents('    //', 'file.txt', 10), 0);
            assert.equal(utils.numIndents('    // blah', 'file.txt', 10), 0);
            assert.equal(utils.numIndents('    //blah', 'file.txt', 10), 0);
        });
    });

    describe("removeUndefineds()", () => {
        it("removes undefined properies", () => {
            let o = utils.removeUndefineds({
                one: 1,
                two: undefined,
                three: undefined,
                four: null,
                five: 0,
                six: "6"
            });

            expect(o).to.eql({
                one: 1,
                four: null,
                five: 0,
                six: "6"
            });
        });
    });
});
