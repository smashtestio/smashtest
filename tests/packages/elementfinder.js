const chai = require('chai');
const chaiSubset = require('chai-subset');
const expect = chai.expect;
const assert = chai.assert;
const util = require('util');
const ElementFinder = require('../../packages/js/elementfinder.js');

chai.use(chaiSubset);

describe("ElementFinder", () => {
    describe("parseIn()", () => {
        it("rejects an empty EF", () => {
            assert.throws(() => {
                new ElementFinder();
            }, "Cannot create an empty ElementFinder");

            assert.throws(() => {
                new ElementFinder('');
            }, "Cannot create an empty ElementFinder");

            assert.throws(() => {
                new ElementFinder(' ');
            }, "Cannot create an empty ElementFinder");
        });

        it.skip("TODO", () => {

        });
    });

    describe("findElement()", () => {
        it.skip("TODO", async () => {

        });
    });

    describe("findElements()", () => {
        it.skip("TODO", async () => {

        });
    });
});
