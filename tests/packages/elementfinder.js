const chai = require('chai');
const chaiSubset = require('chai-subset');
const expect = chai.expect;
const assert = chai.assert;
const util = require('util');
const ElementFinder = require('../../packages/js/elementfinder.js');

chai.use(chaiSubset);

describe("ElementFinder", () => {
    describe("parseIn()", () => {
        context("empty EFs", () => {
            it("rejects an empty EF", () => {
                assert.throws(() => {
                    new ElementFinder();
                }, "Cannot create an empty ElementFinder");
            });

            it("rejects an empty string EF", () => {
                assert.throws(() => {
                    new ElementFinder('');
                }, "Cannot create an empty ElementFinder");
            });

            it("rejects a whitespace EF", () => {
                assert.throws(() => {
                    new ElementFinder(' ');
                }, "Cannot create an empty ElementFinder");
            });
        });

        context("one-line EFs", () => {
            it.skip("'text' only", () => {

            });

            it.skip("property only", () => {

            });

            it.skip("property with 'text input' only", () => {

            });

            it.skip("property with 'not' keyword", () => {

            });

            it.skip("selector only", () => {

            });

            it.skip("ordinal", () => {

            });

            it.skip("no counter equates to a counter of 1", () => {

            });

            it.skip("N counter", () => {

            });

            it.skip("N- counter", () => {

            });

            it.skip("N+ counter", () => {

            });

            it.skip("N-M counter", () => {

            });

            it.skip("comments", () => {

            });

            it.skip("multiple items separated by commas", () => {

            });

            it.skip("handles 'text' containing commas and escaped quotes", () => {

            });

            it.skip("handles a selector containing quotes and commas", () => {
                // e.g., input[name='foo,bar']
            });

            it.skip("handles a property with 'input text' containing commas and escaped quotes", () => {

            });

            it.skip("handles a property with 'input text' containing a selector, which contains quotes and commas", () => {

            });
        });

        context("multi-line EF", () => {
            it.skip("one level of children", () => {

            });

            it.skip("multiple levels of children", () => {

            });

            it.skip("first lines blank", () => {

            });

            it.skip("everything indented multiple times", () => {

            });

            it.skip("'any order' modifier", () => {

            });

            it.skip("'subset' modifier", () => {

            });

            it.skip("doesn't recognize the 'any order' modifier if there are other things on its line", () => {

            });

            it.skip("doesn't recognize the 'subset' modifier if there are other things on its line", () => {

            });

            it.skip("element arrays", () => {

            });

            it.skip("any order modifier inside element array", () => {

            });

            it.skip("subset modifier inside element array", () => {

            });

            it.skip("throws an error when a line is indented more than twice compared to the one above", () => {

            });

            it.skip("throws an error when a line is not indented by a multiple of 4", () => {

            });

            it.skip("throws an error if there is more than one line at the top indent", () => {

            });

            it.skip("handles empty lines between normal lines", () => {

            });
        });
    });

    describe("find()", () => {
        it.skip("sends back the first element if multiple elements are found", async () => {

        });

        it.skip("throws an error if nothing is found", async () => {

        });

        it.skip("throws an error if nothing is found and timeout is 0", async () => {

        });

        it.skip("throws an error if nothing is found and timeout is omitted", async () => {

        });

        it.skip("finds an element if it appears before the timeout", () => {

        });

        it.skip("doesn't find an element if it appears after the timeout", () => {

        });

        it.skip("sends back an element as soon as one is found", () => {

        });

        it.skip("polls according to the requested poll frequency", () => {

        });

        it.skip("sets an error's continue properly", () => {

        });
    });

    describe("findAll()", () => {
        it.skip("sends back all elements if multiple elements are found", async () => {

        });

        it.skip("sends back empty array if nothing is found", async () => {

        });

        it.skip("sends back empty array if nothing is found and timeout is 0", async () => {

        });

        it.skip("sends back empty array if nothing is found and timeout is omitted", async () => {

        });

        it.skip("finds elements if they appear before the timeout", () => {

        });

        it.skip("doesn't find elements if they appear after the timeout", () => {

        });

        it.skip("sends back elements as soon as it finds something", () => {

        });

        it.skip("polls according to the requested poll frequency", () => {

        });

        it.skip("sets an error's continue properly", () => {

        });
    });

    describe("not()", () => {
        it.skip("throws error if elements are found", async () => {

        });

        it.skip("doesn't throw error if elements aren't found because they don't exist in the DOM", async () => {

        });

        it.skip("doesn't throw error if elements aren't found because they aren't visible", async () => {

        });

        it.skip("doesn't throw an error if elements disappear before the timeout", () => {

        });

        it.skip("throws an error if elements disappear after the timeout", () => {

        });

        it.skip("polls according to the requested poll frequency", () => {

        });

        it.skip("sets an error's continue properly", () => {

        });
    });

    describe("getAll()", () => {
        context("text EFs", () => {
            it.skip("finds elements based on innerText", () => {

            });

            it.skip("finds elements based on innerText, where the matching text is of a different case and has differing whitespace", () => {
                // Containing, lower case, trimmed, and whitespace-to-single-space match
            });

            it.skip("finds elements based on value", () => {

            });

            it.skip("finds elements based on placeholder", () => {

            });

            it.skip("finds elements based on an associated label's innerText", () => {

            });

            it.skip("doesn't find elements based on text", () => {
                // verify error message with -->'s
            });

            it.skip("finds elements based on text that spans multiple elements", () => {

            });

            it.skip("searches across all iframes", () => {

            });
        });

        context("ordinal EFs", () => {
            it.skip("finds elements based on an ord", () => {

            });

            it.skip("doesn't find elements based on an ord", () => {

            });

            it.skip("searches across all iframes", () => {

            });
        });

        context("property EFs", () => {
            it.skip("finds elements based on an EF property", () => {

            });

            it.skip("doesn't find elements based on an EF property", () => {

            });

            it.skip("finds elements based on a function property", () => {

            });

            it.skip("doesn't find elements based on a function property", () => {

            });

            it.skip("finds elements based on a function property with input", () => {

            });

            it.skip("doesn't find elements based on a function property with input", () => {

            });

            it.skip("searches across all iframes", () => {

            });

            it.skip("handles the 'not' keyword", () => {

            });
        });

        context("selector EFs", () => {
            it.skip("finds elements based on a css selector", () => {

            });

            it.skip("doesn't find elements based on a css selector", () => {

            });

            it.skip("interprets an item as a selector if a corresponding property does not exist", () => {

            });

            it.skip("can access elements within iframes with the / operator", () => {

            });

            it.skip("can access elements within mulitple nested layers of iframes with the / operator", () => {

            });

            it.skip("searches across all iframes", () => {

            });
        });

        context("one-line EFs", () => {
            it.skip("finds elements based on multiple items", () => {
                // text, ords, properties, selectors
            });

            it.skip("doesn't find elements based on multiple items", () => {

            });

            it.skip("chooses the first element when multiple matching elements exist", () => {

            });

            it.skip("ignores matching elements that aren't visible", () => {

            });
        });

        context("built-in properties", () => {
            it.skip("finds elements based on 'enabled'", () => {

            });

            it.skip("doesn't find elements based on 'enabled'", () => {

            });

            it.skip("finds elements based on 'disabled'", () => {

            });

            it.skip("doesn't find elements based on 'disabled'", () => {

            });

            it.skip("finds elements based on 'checked'", () => {

            });

            it.skip("doesn't find elements based on 'checked'", () => {

            });

            it.skip("finds elements based on 'unchecked'", () => {

            });

            it.skip("doesn't find elements based on 'unchecked'", () => {

            });

            it.skip("finds elements based on 'selected'", () => {

            });

            it.skip("doesn't find elements based on 'selected'", () => {

            });

            it.skip("finds elements based on 'focused'", () => {

            });

            it.skip("doesn't find elements based on 'focused'", () => {

            });

            it.skip("finds elements based on 'in focus'", () => {

            });

            it.skip("doesn't find elements based on 'in focus'", () => {

            });

            it.skip("finds elements based on 'element'", () => {

            });

            it.skip("doesn't find elements based on 'element'", () => {

            });

            it.skip("finds elements based on 'clickable'", () => {

            });

            it.skip("doesn't find elements based on 'clickable'", () => {

            });

            it.skip("finds elements based on 'page title'", () => {
                // page title 'title'
            });

            it.skip("doesn't find elements based on 'page title'", () => {

            });

            it.skip("finds elements based on 'page title contains'", () => {
                // page title contains 'title'
            });

            it.skip("doesn't find elements based on 'page title contains'", () => {

            });

            it.skip("finds elements based on a relative 'page url'", () => {
                // page url 'url'
            });

            it.skip("doesn't find elements based on a relative 'page url'", () => {

            });

            it.skip("finds elements based on an absolute 'page url'", () => {
                // page url 'url'
            });

            it.skip("doesn't find elements based on an absolute 'page url'", () => {

            });

            it.skip("finds elements based on 'page url contains'", () => {
                // page url contains 'url'
            });

            it.skip("doesn't find elements based on 'page url contains'", () => {

            });

            it.skip("finds elements based on 'next to'", () => {
                // next to 'text', only one element chosen from many
            });

            it.skip("doesn't find elements based on 'next to'", () => {

            });

            it.skip("finds elements based on 'value'", () => {
                // value 'text', elem.value only
            });

            it.skip("doesn't find elements based on 'value'", () => {

            });

            it.skip("finds elements based on 'exact text'", () => {
                // exact 'text'
            });

            it.skip("doesn't find elements based on 'exact text'", () => {

            });

            it.skip("finds elements based on 'contains text'", () => {
                // contains 'text'
            });

            it.skip("doesn't find elements based on 'contains text'", () => {

            });

            it.skip("finds elements based on 'innerText'", () => {
                // innerText 'text'
            });

            it.skip("doesn't find elements based on 'innerText'", () => {

            });

            it.skip("finds elements based on 'selector'", () => {
                // selector '.selector'
            });

            it.skip("doesn't find elements based on 'selector'", () => {

            });

            it.skip("finds elements based on 'xpath'", () => {
                // xpath 'xpath'
            });

            it.skip("doesn't find elements based on 'xpath'", () => {

            });

            it.skip("handles the 'not' keyword", () => {

            });
        });

        context("children", () => {
            it.skip("finds elements with one level of children", () => {

            });

            it.skip("doesn't find elements with one level of children", () => {

            });

            it.skip("doesn't find elements with one level of children, when only one of those children couldn't be found", () => {

            });

            it.skip("doesn't find elements with one level of children, when those children are correct but in the wrong order", () => {

            });

            it.skip("finds elements with one level of children, where counters allow correct matching", () => {

            });

            it.skip("finds elements with one level of children, where a counter of 0 is used", () => {

            });

            it.skip("doesn't find elements with one level of children, where counters prevent correct matching", () => {

            });

            it.skip("finds elements with multiple levels of children", () => {

            });

            it.skip("doesn't find elements with multiple levels of children", () => {

            });

            it.skip("finds elements in a differing order with the 'any order' modifier", () => {

            });

            it.skip("finds elements with the 'subset' modifier, even though it doesn't do anything", () => {

            });

            it.skip("handles the 'any order' and 'subset' modifiers together", () => {

            });
        });

        context("element arrays", () => {
            it.skip("accepts a matching of 0 elements", () => {

            });

            it.skip("accepts a correct matching", () => {

            });

            it.skip("accepts a correct matching, even when the matched element type exists at different depths in the DOM, and with other elements in between", () => {

            });

            it.skip("rejects an incorrect matching where there are too few elements listed", () => {

            });

            it.skip("rejects an incorrect matching where the elements are correct but in the wrong order", () => {

            });

            it.skip("rejects an incorrect matching where the elements listed don't match", () => {

            });

            it.skip("accepts a correct matching where counters allow correct matching", () => {

            });

            it.skip("accepts a correct matching where a counter of 0 allows correct matching", () => {

            });

            it.skip("rejects an incorrect matching where counters prevent correct matching", () => {

            });

            it.skip("accepts a correct matching with the 'any order' modifier", () => {

            });

            it.skip("rejects an incorrect matching with the 'any order' modifier", () => {

            });

            it.skip("accepts a correct matching with the 'subset' modifier", () => {

            });

            it.skip("rejects an incorrect matching with the 'subset' modifier", () => {

            });

            it.skip("accepts a correct matching with the 'any order' and 'subset' modifiers together", () => {

            });

            it.skip("rejects an incorrect matching with the 'any order' and 'subset' modifiers together", () => {

            });
        });

        context("element restrictions", () => {
            it.skip("only searches within the given parent element", () => {

            });

            it.skip("only searches after the given element", () => {

            });

            it.skip("only searches within a parent element and after an element simultaneously", () => {

            });
        });
    });
});
