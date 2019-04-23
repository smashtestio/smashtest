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
            expect(utils.escapeHtml("foo<>&amp;\"'bar")).to.equal("foo&lt;&gt;&amp;amp;&quot;&#039;bar");
        });
    });

    describe("unescapeHtml()", () => {
        it("unescapes html", () => {
            expect(utils.unescapeHtml("foo&lt;&gt;&amp;amp;&quot;&#039;bar")).to.equal("foo<>&amp;\"'bar");
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
});
