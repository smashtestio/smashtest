const chai = require('chai');
const expect = chai.expect;
const assert = chai.assert;
const util = require('util');
const utils = require('../../utils.js');
const {Builder, By, Key, until} = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const ElementFinder = require('../../packages/js/elementfinder.js');
const Comparer = require('../../packages/js/comparer.js');

const HEADLESS = false;

describe("ElementFinder", function() {
    let driver = null;
    this.timeout(60000);

    before(async () => {
        driver = await new Builder()
            .forBrowser('chrome')
            .setChromeOptions(HEADLESS ? new chrome.Options().headless() : new chrome.Options())
            .build();

        await driver.get(`file://${__dirname}/generic-page.html`);
    });

    after(async () => {
        await driver.quit();
    });

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
            it("'text'", () => {
                let ef = new ElementFinder(`'text'`);

                Comparer.expect(ef).to.match({
                    line: `'text'`,
                    counter: { min: 1, max: 1 },
                    props: [
                        {
                            prop: `'text'`,
                            defs: [ { $typeof: 'function' } ],
                            input: `text`,
                            not: false
                        },
                        {
                           prop: `visible`,
                           defs: [ { $typeof: 'function' } ],
                           input: undefined,
                           not: false
                        }
                    ],

                    parent: undefined,
                    children: [],

                    matchMe: false,
                    isElemArray: false,
                    isAnyOrder: false,
                    isSubset: false
                });
            });

            it("multiple 'text'", () => {
                let ef = new ElementFinder(`'text1', 'text 2'`);

                Comparer.expect(ef).to.match({
                    line: `'text1', 'text 2'`,
                    counter: { min: 1, max: 1 },
                    props: [
                        {
                            prop: `'text1'`,
                            defs: { $typeof: 'array' },
                            input: `text1`,
                            not: false
                        },
                        {
                            prop: `'text 2'`,
                            defs: { $typeof: 'array' },
                            input: `text 2`,
                            not: false
                        },
                        {
                           prop: `visible`,
                           defs: [ { $typeof: 'function' } ],
                           input: undefined,
                           not: false
                        }
                    ],

                    parent: undefined,
                    children: [],

                    matchMe: false,
                    isElemArray: false,
                    isAnyOrder: false,
                    isSubset: false
                });
            });

            it("'text' with 'not' keyword", () => {
                let ef = new ElementFinder(`not 'text'`);

                Comparer.expect(ef).to.match({
                    counter: { min: 1, max: 1 },
                    props: [
                        {
                            prop: `not 'text'`,
                            defs: [ { $typeof: 'function' } ],
                            input: `text`,
                            not: true
                        },
                        {
                           prop: `visible`,
                           defs: [ { $typeof: 'function' } ],
                           input: undefined,
                           not: false
                        }
                    ],

                    parent: undefined,
                    children: [],

                    matchMe: false,
                    isElemArray: false,
                    isAnyOrder: false,
                    isSubset: false
                });
            });

            it("multiple 'text' with 'not' keyword", () => {
                let ef = new ElementFinder(`not 'text1', not 'text 2', 'text 3'`);

                Comparer.expect(ef).to.match({
                    counter: { min: 1, max: 1 },
                    props: [
                        {
                            prop: `not 'text1'`,
                            defs: { $typeof: 'array' },
                            input: `text1`,
                            not: true
                        },
                        {
                            prop: `not 'text 2'`,
                            defs: { $typeof: 'array' },
                            input: `text 2`,
                            not: true
                        },
                        {
                            prop: `'text 3'`,
                            defs: { $typeof: 'array' },
                            input: `text 3`,
                            not: false
                        },
                        {
                           prop: `visible`,
                           defs: [ { $typeof: 'function' } ],
                           input: undefined,
                           not: false
                        }
                    ],

                    parent: undefined,
                    children: [],

                    matchMe: false,
                    isElemArray: false,
                    isAnyOrder: false,
                    isSubset: false
                });
            });

            it("defined property set to an EF", () => {
                let ef = new ElementFinder(`bold`, {
                    bold: [ new ElementFinder(`b`) ],
                    visible: [ (elems, input) => true ]
                });

                Comparer.expect(ef).to.match({
                    counter: { min: 1, max: 1 },
                    props: [
                        {
                            prop: `bold`,
                            defs: [
                                {
                                    counter: { min: 1, max: 1 },
                                    props: [
                                        {
                                            prop: `b`,
                                            defs: [ { $typeof: 'function' } ],
                                            input: `b`,
                                            not: false
                                        },
                                        {
                                           prop: `visible`,
                                           defs: [ { $typeof: 'function' } ],
                                           input: undefined,
                                           not: false
                                        }
                                    ],

                                    parent: undefined,
                                    children: [],

                                    matchMe: false,
                                    isElemArray: false,
                                    isAnyOrder: false,
                                    isSubset: false
                                }
                            ],
                            input: undefined
                        },
                        {
                           prop: `visible`,
                           defs: [ { $typeof: 'function' } ],
                           input: undefined,
                           not: false
                        }
                    ],

                    parent: undefined,
                    children: [],

                    matchMe: false,
                    isElemArray: false,
                    isAnyOrder: false,
                    isSubset: false
                });
            });

            it("defined property set to a function", () => {
                let ef = new ElementFinder(`bold`, {
                    bold: [ (elems, input) => true ],
                    visible: [ (elems, input) => true ]
                });

                Comparer.expect(ef).to.match({
                    counter: { min: 1, max: 1 },
                    props: [
                        {
                            prop: `bold`,
                            defs: [ { $typeof: 'function' } ],
                            input: undefined,
                            not: false
                        },
                        {
                           prop: `visible`,
                           defs: [ { $typeof: 'function' } ],
                           input: undefined,
                           not: false
                        }
                    ],

                    parent: undefined,
                    children: [],

                    matchMe: false,
                    isElemArray: false,
                    isAnyOrder: false,
                    isSubset: false
                });
            });

            it("defined property with 'text input'", () => {
                let ef = new ElementFinder(`bold "foobar"`, {
                    bold: [ (elems, input) => true ],
                    visible: [ (elems, input) => true ]
                });

                Comparer.expect(ef).to.match({
                    counter: { min: 1, max: 1 },
                    props: [
                        {
                            prop: `bold "foobar"`,
                            defs: [ { $typeof: 'function' } ],
                            input: `foobar`,
                            not: false
                        },
                        {
                           prop: `visible`,
                           defs: [ { $typeof: 'function' } ],
                           input: undefined,
                           not: false
                        }
                    ],

                    parent: undefined,
                    children: [],

                    matchMe: false,
                    isElemArray: false,
                    isAnyOrder: false,
                    isSubset: false
                });
            });

            it("defined property with 'not' keyword", () => {
                let ef = new ElementFinder(`not bold "foobar"`, {
                    bold: [ (elems, input) => true ],
                    visible: [ (elems, input) => true ]
                });

                Comparer.expect(ef).to.match({
                    counter: { min: 1, max: 1 },
                    props: [
                        {
                            prop: `not bold "foobar"`,
                            defs: [ { $typeof: 'function' } ],
                            input: `foobar`,
                            not: true
                        },
                        {
                           prop: `visible`,
                           defs: [ { $typeof: 'function' } ],
                           input: undefined,
                           not: false
                        }
                    ],

                    parent: undefined,
                    children: [],

                    matchMe: false,
                    isElemArray: false,
                    isAnyOrder: false,
                    isSubset: false
                });
            });

            it("selector", () => {
                let ef = new ElementFinder(`div.class1 .class2`);

                Comparer.expect(ef).to.match({
                    counter: { min: 1, max: 1 },
                    props: [
                        {
                            prop: `div.class1 .class2`,
                            defs: [ { $typeof: 'function' } ],
                            input: `div.class1 .class2`,
                            not: false
                        },
                        {
                           prop: `visible`,
                           defs: [ { $typeof: 'function' } ],
                           input: undefined,
                           not: false
                        }
                    ],

                    parent: undefined,
                    children: [],

                    matchMe: false,
                    isElemArray: false,
                    isAnyOrder: false,
                    isSubset: false
                });
            });

            it("handles selectors with one single quote", () => {
                let ef = new ElementFinder(`div.class1 .class2'`);

                Comparer.expect(ef).to.match({
                    counter: { min: 1, max: 1 },
                    props: [
                        {
                            prop: `div.class1 .class2'`,
                            defs: [ { $typeof: 'function' } ],
                            input: `div.class1 .class2'`,
                            not: false
                        },
                        {
                           prop: `visible`,
                           defs: [ { $typeof: 'function' } ],
                           input: undefined,
                           not: false
                        }
                    ],

                    parent: undefined,
                    children: [],

                    matchMe: false,
                    isElemArray: false,
                    isAnyOrder: false,
                    isSubset: false
                });
            });

            it("handles selectors with two single quotes", () => {
                let ef = new ElementFinder(`div[attr='foobar']`);

                Comparer.expect(ef).to.match({
                    counter: { min: 1, max: 1 },
                    props: [
                        {
                            prop: `div[attr='foobar']`,
                            defs: [ { $typeof: 'function' } ],
                            input: `div[attr='foobar']`,
                            not: false
                        },
                        {
                           prop: `visible`,
                           defs: [ { $typeof: 'function' } ],
                           input: undefined,
                           not: false
                        }
                    ],

                    parent: undefined,
                    children: [],

                    matchMe: false,
                    isElemArray: false,
                    isAnyOrder: false,
                    isSubset: false
                });
            });

            it("handles selectors with one double quote", () => {
                let ef = new ElementFinder(`div.class1 .class2"`);

                Comparer.expect(ef).to.match({
                    counter: { min: 1, max: 1 },
                    props: [
                        {
                            prop: `div.class1 .class2"`,
                            defs: [ { $typeof: 'function' } ],
                            input: `div.class1 .class2"`,
                            not: false
                        },
                        {
                           prop: `visible`,
                           defs: [ { $typeof: 'function' } ],
                           input: undefined,
                           not: false
                        }
                    ],

                    parent: undefined,
                    children: [],

                    matchMe: false,
                    isElemArray: false,
                    isAnyOrder: false,
                    isSubset: false
                });
            });

            it("handles selectors with two double quotes", () => {
                let ef = new ElementFinder(`div[attr="foobar"]`);

                Comparer.expect(ef).to.match({
                    counter: { min: 1, max: 1 },
                    props: [
                        {
                            prop: `div[attr="foobar"]`,
                            defs: [ { $typeof: 'function' } ],
                            input: `div[attr="foobar"]`,
                            not: false
                        },
                        {
                           prop: `visible`,
                           defs: [ { $typeof: 'function' } ],
                           input: undefined,
                           not: false
                        }
                    ],

                    parent: undefined,
                    children: [],

                    matchMe: false,
                    isElemArray: false,
                    isAnyOrder: false,
                    isSubset: false
                });
            });

            it("selector with 'not' keyword", () => {
                let ef = new ElementFinder(`not div.class1 .class2`);

                Comparer.expect(ef).to.match({
                    counter: { min: 1, max: 1 },
                    props: [
                        {
                            prop: `not div.class1 .class2`,
                            defs: [ { $typeof: 'function' } ],
                            input: `div.class1 .class2`,
                            not: true
                        },
                        {
                           prop: `visible`,
                           defs: [ { $typeof: 'function' } ],
                           input: undefined,
                           not: false
                        }
                    ],

                    parent: undefined,
                    children: [],

                    matchMe: false,
                    isElemArray: false,
                    isAnyOrder: false,
                    isSubset: false
                });
            });

            it("ordinal", () => {
                let ef = new ElementFinder(`4th`);

                Comparer.expect(ef).to.match({
                    counter: { min: 1, max: 1 },
                    props: [
                        {
                            prop: `4th`,
                            defs: [ { $typeof: 'function' } ],
                            input: 4,
                            not: false
                        },
                        {
                           prop: `visible`,
                           defs: [ { $typeof: 'function' } ],
                           input: undefined,
                           not: false
                        }
                    ],

                    parent: undefined,
                    children: [],

                    matchMe: false,
                    isElemArray: false,
                    isAnyOrder: false,
                    isSubset: false
                });
            });

            it("no counter equates to a counter of 1", () => {
                let ef = new ElementFinder(`something`);

                Comparer.expect(ef).to.match({
                    counter: { min: 1, max: 1 }
                });
            });

            it("N counter", () => {
                let ef = new ElementFinder(`4 x something`);

                Comparer.expect(ef).to.match({
                    counter: { min: 4, max: 4 }
                });

                ef = new ElementFinder(`4x something`);

                Comparer.expect(ef).to.match({
                    counter: { min: 4, max: 4 }
                });
            });

            it("N- counter", () => {
                let ef = new ElementFinder(`4- x something`);

                Comparer.expect(ef).to.match({
                    counter: { min: 4, max: undefined }
                });

                ef = new ElementFinder(`4-x something`);

                Comparer.expect(ef).to.match({
                    counter: { min: 4, max: undefined }
                });
            });

            it("N+ counter", () => {
                let ef = new ElementFinder(`4+ x something`);

                Comparer.expect(ef).to.match({
                    counter: { min: 4, max: undefined }
                });

                ef = new ElementFinder(`4+x something`);

                Comparer.expect(ef).to.match({
                    counter: { min: 4, max: undefined }
                });
            });

            it("N-M counter", () => {
                let ef = new ElementFinder(`22-77 x something`);

                Comparer.expect(ef).to.match({
                    counter: { min: 22, max: 77 }
                });

                ef = new ElementFinder(`22-77x something`);

                Comparer.expect(ef).to.match({
                    counter: { min: 22, max: 77 }
                });
            });

            it("comment at the end of a line", () => {
                let ef = new ElementFinder(`.class1 // comment`);

                Comparer.expect(ef).to.match({
                    counter: { min: 1, max: 1 },
                    props: [
                        {
                            prop: `.class1`,
                            defs: [ { $typeof: 'function' } ],
                            input: `.class1`,
                            not: false
                        },
                        {
                           prop: `visible`,
                           defs: [ { $typeof: 'function' } ],
                           input: undefined,
                           not: false
                        }
                    ],

                    parent: undefined,
                    children: [],

                    matchMe: false,
                    isElemArray: false,
                    isAnyOrder: false,
                    isSubset: false
                });
            });

            it("comment on its own line", () => {
                let ef = new ElementFinder(`
                    // comment
                    .class1
                    // comment
                `);

                Comparer.expect(ef).to.match({
                    counter: { min: 1, max: 1 },
                    props: [
                        {
                            prop: `.class1`,
                            defs: [ { $typeof: 'function' } ],
                            input: `.class1`,
                            not: false
                        },
                        {
                           prop: `visible`,
                           defs: [ { $typeof: 'function' } ],
                           input: undefined,
                           not: false
                        }
                    ],

                    parent: undefined,
                    children: [],

                    matchMe: false,
                    isElemArray: false,
                    isAnyOrder: false,
                    isSubset: false
                });
            });

            it("multiple items separated by commas", () => {
                let ef = new ElementFinder(`div.class1 .class2, 'piece of text', contains "other text", not selected`);

                Comparer.expect(ef).to.match({
                    counter: { min: 1, max: 1 },
                    props: [
                        {
                            prop: `div.class1 .class2`,
                            defs: [ { $typeof: 'function' } ],
                            input: `div.class1 .class2`,
                            not: false
                        },
                        {
                            prop: `'piece of text'`,
                            defs: [ { $typeof: 'function' } ],
                            input: `piece of text`,
                            not: false
                        },
                        {
                            prop: `contains "other text"`,
                            defs: [ { $typeof: 'function' } ],
                            input: `other text`,
                            not: false
                        },
                        {
                            prop: `not selected`,
                            defs: [ { $typeof: 'function' } ],
                            input: undefined,
                            not: true
                        },
                        {
                           prop: `visible`,
                           defs: [ { $typeof: 'function' } ],
                           input: undefined,
                           not: false
                        }
                    ],

                    parent: undefined,
                    children: [],

                    matchMe: false,
                    isElemArray: false,
                    isAnyOrder: false,
                    isSubset: false
                });
            });

            it("multiple items separated by commas with extra whitespace everywhere", () => {
                let ef = new ElementFinder(`    div.class1 .class2  , 'piece of text'    , contains "other text", not selected    `);

                Comparer.expect(ef).to.match({
                    counter: { min: 1, max: 1 },
                    props: [
                        {
                            prop: `div.class1 .class2`,
                            defs: [ { $typeof: 'function' } ],
                            input: `div.class1 .class2`,
                            not: false
                        },
                        {
                            prop: `'piece of text'`,
                            defs: [ { $typeof: 'function' } ],
                            input: `piece of text`,
                            not: false
                        },
                        {
                            prop: `contains "other text"`,
                            defs: [ { $typeof: 'function' } ],
                            input: `other text`,
                            not: false
                        },
                        {
                            prop: `not selected`,
                            defs: [ { $typeof: 'function' } ],
                            input: undefined,
                            not: true
                        },
                        {
                           prop: `visible`,
                           defs: [ { $typeof: 'function' } ],
                           input: undefined,
                           not: false
                        }
                    ],

                    parent: undefined,
                    children: [],

                    matchMe: false,
                    isElemArray: false,
                    isAnyOrder: false,
                    isSubset: false
                });
            });

            it("multiple items separated by commas, including selectors with quotes inside", () => {
                let ef = new ElementFinder(`input[attr='quote'] p[attr="quote"], 'piece of text', contains "other text", not selected`);

                Comparer.expect(ef).to.match({
                    counter: { min: 1, max: 1 },
                    props: [
                        {
                            prop: `input[attr='quote'] p[attr="quote"]`,
                            defs: [ { $typeof: 'function' } ],
                            input: `input[attr='quote'] p[attr="quote"]`,
                            not: false
                        },
                        {
                            prop: `'piece of text'`,
                            defs: [ { $typeof: 'function' } ],
                            input: `piece of text`,
                            not: false
                        },
                        {
                            prop: `contains "other text"`,
                            defs: [ { $typeof: 'function' } ],
                            input: `other text`,
                            not: false
                        },
                        {
                            prop: `not selected`,
                            defs: [ { $typeof: 'function' } ],
                            input: undefined,
                            not: true
                        },
                        {
                           prop: `visible`,
                           defs: [ { $typeof: 'function' } ],
                           input: undefined,
                           not: false
                        }
                    ],

                    parent: undefined,
                    children: [],

                    matchMe: false,
                    isElemArray: false,
                    isAnyOrder: false,
                    isSubset: false
                });
            });

            it("handles 'text' containing commas and escaped quotes", () => {
                let ef = new ElementFinder(`'quote1,2\\'3"4'`);

                Comparer.expect(ef).to.match({
                    counter: { min: 1, max: 1 },
                    props: [
                        {
                            prop: `'quote1,2\\'3"4'`,
                            defs: [ { $typeof: 'function' } ],
                            input: `quote1,2'3"4`,
                            not: false
                        },
                        {
                           prop: `visible`,
                           defs: [ { $typeof: 'function' } ],
                           input: undefined,
                           not: false
                        }
                    ],

                    parent: undefined,
                    children: [],

                    matchMe: false,
                    isElemArray: false,
                    isAnyOrder: false,
                    isSubset: false
                });
            });

            it("handles a selector containing quotes and commas", () => {
                let ef = new ElementFinder(`input[attr='quote'] p[attr="quote"] input[attr='quote1,2\\'3"4'].div[attr='quote1,2\\'3\\"4'], input[attr="1,2'3\\"4"].div[attr="1,2\\'3\\"4"], 'piece of text', contains "other text", not selected`);

                Comparer.expect(ef).to.match({
                    counter: { min: 1, max: 1 },
                    props: [
                        {
                            prop: `input[attr='quote'] p[attr="quote"] input[attr='quote1,2\\'3"4'].div[attr='quote1,2\\'3\\"4']`,
                            defs: [ { $typeof: 'function' } ],
                            input: `input[attr='quote'] p[attr="quote"] input[attr='quote1,2\\'3"4'].div[attr='quote1,2\\'3\\"4']`,
                            not: false
                        },
                        {
                            prop: `input[attr="1,2'3\\"4"].div[attr="1,2\\'3\\"4"]`,
                            defs: [ { $typeof: 'function' } ],
                            input: `input[attr="1,2'3\\"4"].div[attr="1,2\\'3\\"4"]`,
                            not: false
                        },
                        {
                            prop: `'piece of text'`,
                            defs: [ { $typeof: 'function' } ],
                            input: `piece of text`,
                            not: false
                        },
                        {
                            prop: `contains "other text"`,
                            defs: [ { $typeof: 'function' } ],
                            input: `other text`,
                            not: false
                        },
                        {
                            prop: `not selected`,
                            defs: [ { $typeof: 'function' } ],
                            input: undefined,
                            not: true
                        },
                        {
                           prop: `visible`,
                           defs: [ { $typeof: 'function' } ],
                           input: undefined,
                           not: false
                        }
                    ],

                    parent: undefined,
                    children: [],

                    matchMe: false,
                    isElemArray: false,
                    isAnyOrder: false,
                    isSubset: false
                });
            });

            it("handles a defined property with 'input text' containing commas and escaped quotes", () => {
                let ef = new ElementFinder(`contains 'quote1,2\\'3"4'`);

                Comparer.expect(ef).to.match({
                    counter: { min: 1, max: 1 },
                    props: [
                        {
                            prop: `contains 'quote1,2\\'3"4'`,
                            defs: [ { $typeof: 'function' } ],
                            input: `quote1,2'3"4`,
                            not: false
                        },
                        {
                           prop: `visible`,
                           defs: [ { $typeof: 'function' } ],
                           input: undefined,
                           not: false
                        }
                    ]
                });
            });

            it("handles a defined property with 'input text' containing a selector, which contains quotes and commas", () => {
                let ef = new ElementFinder(`selector 'input[attr="quote1,2\\'3\\"4\\'"]'`);

                Comparer.expect(ef).to.match({
                    counter: { min: 1, max: 1 },
                    props: [
                        {
                            prop: `selector 'input[attr="quote1,2\\'3\\"4\\'"]'`,
                            defs: [ { $typeof: 'function' } ],
                            input: `input[attr="quote1,2'3"4'"]`,
                            not: false
                        },
                        {
                           prop: `visible`,
                           defs: [ { $typeof: 'function' } ],
                           input: undefined,
                           not: false
                        }
                    ]
                });
            });

            it("includes the 'visible' property only once if 'visible' is explicitly listed", () => {
                let ef = new ElementFinder(`something, visible`);

                Comparer.expect(ef).to.match({
                    props: [
                        {
                            prop: `something`,
                            defs: [ { $typeof: 'function' } ],
                            input: `something`,
                            not: false
                        },
                        {
                           prop: `visible`,
                           defs: [ { $typeof: 'function' } ],
                           input: undefined,
                           not: false
                        }
                    ]
                });
            });

            it("includes the 'visible' property only once if 'not visible' is explicitly listed", () => {
                let ef = new ElementFinder(`something, not visible`);

                Comparer.expect(ef).to.match({
                    props: [
                        {
                            prop: `something`,
                            defs: [ { $typeof: 'function' } ],
                            input: `something`,
                            not: false
                        },
                        {
                           prop: `not visible`,
                           defs: [ { $typeof: 'function' } ],
                           input: undefined,
                           not: true
                        }
                    ]
                });
            });

            it("does not include the 'visible' property if 'any visibility' is explicitly listed", () => {
                let ef = new ElementFinder(`something, any visibility`);

                Comparer.expect(ef).to.match({
                    props: [
                        {
                            prop: `something`,
                            defs: [ { $typeof: 'function' } ],
                            input: `something`,
                            not: false
                        },
                        {
                           prop: `any visibility`,
                           defs: [ { $typeof: 'function' } ],
                           input: undefined,
                           not: false
                        }
                    ]
                });
            });
        });

        context("multi-line EF", () => {
            it("one level of children", () => {
                let ef = new ElementFinder(`
                    one
                        two
                `);

                Comparer.expect(ef).to.match({
                    line: `one`,
                    counter: { min: 1, max: 1 },
                    props: [
                        {
                            prop: `one`,
                            defs: [ { $typeof: 'function' } ],
                            input: `one`,
                            not: false
                        },
                        {
                           prop: `visible`,
                           defs: [ { $typeof: 'function' } ],
                           input: undefined,
                           not: false
                        }
                    ],

                    parent: undefined,
                    children: [
                        {
                            line: `two`,
                            counter: { min: 1, max: 1 },
                            props: [
                                {
                                    prop: `two`,
                                    defs: [ { $typeof: 'function' } ],
                                    input: `two`,
                                    not: false
                                },
                                {
                                   prop: `visible`,
                                   defs: [ { $typeof: 'function' } ],
                                   input: undefined,
                                   not: false
                                }
                            ],

                            parent: { props: [ { prop: `one` }, { prop: `visible` } ] },
                            children: [],

                            matchMe: false,
                            isElemArray: false,
                            isAnyOrder: false,
                            isSubset: false
                        }
                    ],

                    matchMe: false,
                    isElemArray: false,
                    isAnyOrder: false,
                    isSubset: false
                });
            });

            it("multiple levels of children", () => {
                let ef = new ElementFinder(`
                    one
                        two
                            three
                            four
                        five

                        six
                            seven
                                eight
                `);

                Comparer.expect(ef).to.match({
                    props: [ { prop: `one` }, { prop: `visible` } ],
                    parent: undefined,
                    children: [
                        {
                            props: [ { prop: `two` }, { prop: `visible` } ],
                            parent: {},
                            children: [
                                {
                                    props: [ { prop: `three` }, { prop: `visible` } ],
                                    parent: {},
                                    children: []
                                },
                                {
                                    props: [ { prop: `four` }, { prop: `visible` } ],
                                    parent: {},
                                    children: []
                                }
                            ]
                        },
                        {
                            props: [ { prop: `five` }, { prop: `visible` } ],
                            parent: {},
                            children: []
                        },
                        {
                            props: [ { prop: `six` }, { prop: `visible` } ],
                            parent: {},
                            children: [
                                {
                                    props: [ { prop: `seven` }, { prop: `visible` } ],
                                    parent: {},
                                    children: [
                                        {
                                            props: [ { prop: `eight` }, { prop: `visible` } ],
                                            parent: {},
                                            children: []
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                });
            });

            it("first lines blank", () => {
                let ef = new ElementFinder(`


                    one
                        two
                `);

                Comparer.expect(ef).to.match({
                    props: [ { prop: `one` }, { prop: `visible` } ],
                    parent: undefined,
                    children: [
                        {
                            props: [ { prop: `two` }, { prop: `visible` } ],
                            parent: {},
                            children: []
                        }
                    ]
                });
            });

            it("everything indented multiple times", () => {
                let ef = new ElementFinder(`


                    one
                        two
                `);

                Comparer.expect(ef).to.match({
                    props: [ { prop: `one` }, { prop: `visible` } ],
                    parent: undefined,
                    children: [
                        {
                            props: [ { prop: `two` }, { prop: `visible` } ],
                            parent: {},
                            children: []
                        }
                    ]
                });
            });

            it("no indentation on the first line", () => {
                let ef = new ElementFinder(`one
    two
                `);

                Comparer.expect(ef).to.match({
                    props: [ { prop: `one` }, { prop: `visible` } ],
                    parent: undefined,
                    children: [
                        {
                            props: [ { prop: `two` }, { prop: `visible` } ],
                            parent: {},
                            children: []
                        }
                    ]
                });
            });

            it("'any order' keyword", () => {
                let ef = new ElementFinder(`
                    one
                        any order
                        two
                        three
                `);

                Comparer.expect(ef).to.match({
                    props: [ { prop: `one` }, { prop: `visible` } ],
                    parent: undefined,
                    children: [
                        {
                            props: [ { prop: `two` }, { prop: `visible` } ],
                            parent: {},
                            children: [],
                            isAnyOrder: false
                        },
                        {
                            props: [ { prop: `three` }, { prop: `visible` } ],
                            parent: {},
                            children: [],
                            isAnyOrder: false
                        }
                    ],
                    isAnyOrder: true
                });

                ef = new ElementFinder(`
                    one

                        any order

                        two
                        three
                `);

                Comparer.expect(ef).to.match({
                    props: [ { prop: `one` }, { prop: `visible` } ],
                    parent: undefined,
                    children: [
                        {
                            props: [ { prop: `two` }, { prop: `visible` } ],
                            parent: {},
                            children: [],
                            isAnyOrder: false
                        },
                        {
                            props: [ { prop: `three` }, { prop: `visible` } ],
                            parent: {},
                            children: [],
                            isAnyOrder: false
                        }
                    ],
                    isAnyOrder: true
                });

                ef = new ElementFinder(`
                    one
                        two
                        any order
                        three
                `);

                Comparer.expect(ef).to.match({
                    props: [ { prop: `one` }, { prop: `visible` } ],
                    parent: undefined,
                    children: [
                        {
                            props: [ { prop: `two` }, { prop: `visible` } ],
                            parent: {},
                            children: [],
                            isAnyOrder: false
                        },
                        {
                            props: [ { prop: `three` }, { prop: `visible` } ],
                            parent: {},
                            children: [],
                            isAnyOrder: false
                        }
                    ],
                    isAnyOrder: true
                });
            });

            it("'subset' keyword", () => {
                let ef = new ElementFinder(`
                    one
                        subset
                        two
                        three
                `);

                Comparer.expect(ef).to.match({
                    props: [ { prop: `one` }, { prop: `visible` } ],
                    parent: undefined,
                    children: [
                        {
                            props: [ { prop: `two` }, { prop: `visible` } ],
                            parent: {},
                            children: [],
                            isSubset: false
                        },
                        {
                            props: [ { prop: `three` }, { prop: `visible` } ],
                            parent: {},
                            children: [],
                            isSubset: false
                        }
                    ],
                    isSubset: true
                });

                ef = new ElementFinder(`
                    one

                        subset

                        two
                        three
                `);

                Comparer.expect(ef).to.match({
                    props: [ { prop: `one` }, { prop: `visible` } ],
                    parent: undefined,
                    children: [
                        {
                            props: [ { prop: `two` }, { prop: `visible` } ],
                            parent: {},
                            children: [],
                            isSubset: false
                        },
                        {
                            props: [ { prop: `three` }, { prop: `visible` } ],
                            parent: {},
                            children: [],
                            isSubset: false
                        }
                    ],
                    isSubset: true
                });

                ef = new ElementFinder(`
                    one
                        two
                        subset
                        three
                `);

                Comparer.expect(ef).to.match({
                    props: [ { prop: `one` }, { prop: `visible` } ],
                    parent: undefined,
                    children: [
                        {
                            props: [ { prop: `two` }, { prop: `visible` } ],
                            parent: {},
                            children: [],
                            isSubset: false
                        },
                        {
                            props: [ { prop: `three` }, { prop: `visible` } ],
                            parent: {},
                            children: [],
                            isSubset: false
                        }
                    ],
                    isSubset: true
                });
            });

            it("doesn't recognize the 'any order' keyword if there are other things on its line", () => {
                let ef = new ElementFinder(`
                    one
                        any order, .class
                        two
                        three
                `);

                Comparer.expect(ef).to.match({
                    props: [ { prop: `one` }, { prop: `visible` } ],
                    parent: undefined,
                    children: [
                        {
                            props: [ { prop: `any order` }, { prop: `.class` }, { prop: `visible` } ],
                            parent: {},
                            children: [],
                            isAnyOrder: false
                        },
                        {
                            props: [ { prop: `two` }, { prop: `visible` } ],
                            parent: {},
                            children: [],
                            isAnyOrder: false
                        },
                        {
                            props: [ { prop: `three` }, { prop: `visible` } ],
                            parent: {},
                            children: [],
                            isAnyOrder: false
                        }
                    ],
                    isAnyOrder: false
                });
            });

            it("doesn't recognize the 'subset' keyword if there are other things on its line", () => {
                let ef = new ElementFinder(`
                    one
                        .class, subset
                        two
                        three
                `);

                Comparer.expect(ef).to.match({
                    props: [ { prop: `one` }, { prop: `visible` } ],
                    parent: undefined,
                    children: [
                        {
                            props: [ { prop: `.class` }, { prop: `subset` }, { prop: `visible` } ],
                            parent: {},
                            children: [],
                            isSubset: false
                        },
                        {
                            props: [ { prop: `two` }, { prop: `visible` } ],
                            parent: {},
                            children: [],
                            isSubset: false
                        },
                        {
                            props: [ { prop: `three` }, { prop: `visible` } ],
                            parent: {},
                            children: [],
                            isSubset: false
                        }
                    ],
                    isSubset: false
                });
            });

            it("throws an error if the 'any order' keyword doesn't have a parent element", () => {
                assert.throws(() => {
                    new ElementFinder(`
                        any order
                    `);
                }, "The 'any order' keyword must have a parent element [line:2]");
            });

            it("throws an error if the 'subset' keyword doesn't have a parent element", () => {
                assert.throws(() => {
                    new ElementFinder(`
                        subset
                            one
                            two
                    `);
                }, "The 'subset' keyword must have a parent element [line:2]");
            });

            it("element arrays", () => {
                let ef = new ElementFinder(`
                    * one
                        two
                        three
                `);

                Comparer.expect(ef).to.match({
                    props: [ { prop: `one` }, { prop: `visible` } ],
                    parent: undefined,
                    children: [
                        {
                            props: [ { prop: `two` }, { prop: `visible` } ],
                            parent: {},
                            children: [],
                            isElemArray: false
                        },
                        {
                            props: [ { prop: `three` }, { prop: `visible` } ],
                            parent: {},
                            children: [],
                            isElemArray: false
                        }
                    ],
                    isElemArray: true
                });
            });

            it("'any order' keyword inside element array", () => {
                let ef = new ElementFinder(`
                    * one
                        any order
                        two
                        three
                `);

                Comparer.expect(ef).to.match({
                    props: [ { prop: `one` }, { prop: `visible` } ],
                    parent: undefined,
                    children: [
                        {
                            props: [ { prop: `two` }, { prop: `visible` } ],
                            parent: {},
                            children: [],
                            isElemArray: false,
                            isAnyOrder: false
                        },
                        {
                            props: [ { prop: `three` }, { prop: `visible` } ],
                            parent: {},
                            children: [],
                            isElemArray: false,
                            isAnyOrder: false
                        }
                    ],
                    isElemArray: true,
                    isAnyOrder: true
                });
            });

            it("'subset' keyword inside element array", () => {
                let ef = new ElementFinder(`
                    * one
                        subset
                        two
                        three
                `);

                Comparer.expect(ef).to.match({
                    props: [ { prop: `one` }, { prop: `visible` } ],
                    parent: undefined,
                    children: [
                        {
                            props: [ { prop: `two` }, { prop: `visible` } ],
                            parent: {},
                            children: [],
                            isElemArray: false,
                            isSubset: false
                        },
                        {
                            props: [ { prop: `three` }, { prop: `visible` } ],
                            parent: {},
                            children: [],
                            isElemArray: false,
                            isSubset: false
                        }
                    ],
                    isElemArray: true,
                    isSubset: true
                });
            });

            it("no [child element]", () => {
                let ef = new ElementFinder(`
                    one
                        two
                        three
                `);

                Comparer.expect(ef).to.match({
                    props: [ { prop: `one` }, { prop: `visible` } ],
                    parent: undefined,
                    children: [
                        {
                            props: [ { prop: `two` }, { prop: `visible` } ],
                            parent: {},
                            children: [],
                            matchMe: false
                        },
                        {
                            props: [ { prop: `three` }, { prop: `visible` } ],
                            parent: {},
                            children: [],
                            matchMe: false
                        }
                    ],
                    matchMe: false
                });
            });

            it("[child element]", () => {
                let ef = new ElementFinder(`
                    one
                        [two]
                        three
                `);

                Comparer.expect(ef).to.match({
                    props: [ { prop: `one` }, { prop: `visible` } ],
                    parent: undefined,
                    children: [
                        {
                            props: [ { prop: `two` }, { prop: `visible` } ],
                            parent: {},
                            children: [],
                            matchMe: true
                        },
                        {
                            props: [ { prop: `three` }, { prop: `visible` } ],
                            parent: {},
                            children: [],
                            matchMe: false
                        }
                    ],
                    matchMe: false
                });
            });

            it("counter x [child element]", () => {
                let ef = new ElementFinder(`
                    one
                        5 x [two, two2]
                        three
                `);

                Comparer.expect(ef).to.match({
                    props: [ { prop: `one` }, { prop: `visible` } ],
                    parent: undefined,
                    children: [
                        {
                            counter: { min: 5, max: 5 },
                            props: [ { prop: `two` }, { prop: `two2` }, { prop: `visible` } ],
                            parent: {},
                            children: [],
                            matchMe: true
                        },
                        {
                            props: [ { prop: `three` }, { prop: `visible` } ],
                            parent: {},
                            children: [],
                            matchMe: false
                        }
                    ],
                    matchMe: false
                });
            });

            it("multiple [child elements]", () => {
                let ef = new ElementFinder(`
                    [one]
                        [two]
                        three
                `);

                Comparer.expect(ef).to.match({
                    props: [ { prop: `one` }, { prop: `visible` } ],
                    parent: undefined,
                    children: [
                        {
                            props: [ { prop: `two` }, { prop: `visible` } ],
                            parent: {},
                            children: [],
                            matchMe: true
                        },
                        {
                            props: [ { prop: `three` }, { prop: `visible` } ],
                            parent: {},
                            children: [],
                            matchMe: false
                        }
                    ],
                    matchMe: true
                });
            });

            it("throws an error when a line is indented more than twice compared to the one above", () => {
                assert.throws(() => {
                    new ElementFinder(`
                        one
                                two
                    `);
                }, "ElementFinder cannot have a line that's indented more than once compared to the line above [line:3]");

                assert.throws(() => {
                    new ElementFinder(`
                        one
                            two

                                    three
                    `);
                }, "ElementFinder cannot have a line that's indented more than once compared to the line above [line:5]");
            });

            it("throws an error when a line is indented to the left of the top line's indent", () => {
                assert.throws(() => {
                    new ElementFinder(`
                        one
                    two
                    `);
                }, "ElementFinder cannot have a line that's indented left of the first line [line:3]");

                assert.throws(() => {
                    new ElementFinder(`
                        one
                            two
                    three
                    `);
                }, "ElementFinder cannot have a line that's indented left of the first line [line:4]");
            });

            it("throws an error when a line is not indented by a multiple of 4", () => {
                assert.throws(() => {
                    new ElementFinder(`  one`);
                }, "The number of spaces at the beginning of a step must be a multiple of 4. You have 2 spaces. [line:1]");

                assert.throws(() => {
                    new ElementFinder(`
one
 two
                    `);
                }, "The number of spaces at the beginning of a step must be a multiple of 4. You have 1 space. [line:3]");
            });

            it("throws an error if there is more than one line at the top indent", () => {
                assert.throws(() => {
                    new ElementFinder(`
                        one
                        two
                    `);
                }, "ElementFinder cannot have more than one line at indent 0 [line:3]");

                assert.throws(() => {
                    new ElementFinder(`
                        one
                            two
                        three
                    `);
                }, "ElementFinder cannot have more than one line at indent 0 [line:4]");
            });

            it("throws an error if the 'selector' prop isn't available but is needed", () => {
                assert.throws(() => {
                    new ElementFinder(`
                        one
                        two
                    `, {});
                }, "Cannot find property that matches `selector` [line:2]");
            });

            it("handles empty lines between normal lines", () => {
                let ef = new ElementFinder(`
                    one

                        two

                        three
                `);

                Comparer.expect(ef).to.match({
                    props: [ { prop: `one` }, { prop: `visible` } ],
                    parent: undefined,
                    children: [
                        {
                            props: [ { prop: `two` }, { prop: `visible` } ],
                            parent: {},
                            children: []
                        },
                        {
                            props: [ { prop: `three` }, { prop: `visible` } ],
                            parent: {},
                            children: []
                        }
                    ]
                });
            });
        });
    });

    describe("print()", () => {
        it("prints a one-line EF", () => {
            let ef = new ElementFinder(`one`);

            expect(ef.print()).to.equal(`one`);

            ef = new ElementFinder(`one, two`);

            expect(ef.print()).to.equal(`one, two`);
        });

        it("prints a one-line EF with an error", () => {
            let ef = new ElementFinder(`one`);
            ef.error = `oops`;

            expect(ef.print()).to.equal(`one  -->  oops`);
        });

        it("prints a one-line EF with one block error", () => {
            let ef = new ElementFinder(`one`);
            ef.blockErrors = [`oops`];

            expect(ef.print()).to.equal(`one
    -->
    oops
`);
        });

        it("prints a one-line EF with multiple block errors", () => {
            let ef = new ElementFinder(`one`);
            ef.blockErrors = [`oops1`, `oops2`];

            expect(ef.print()).to.equal(`one
    -->
    oops1

    -->
    oops2
`);
        });

        it("prints a one-line EF with an error and multiple block errors", () => {
            let ef = new ElementFinder(`one`);
            ef.error = `oops`;
            ef.blockErrors = [`oops1`, `oops2`];

            expect(ef.print()).to.equal(`one  -->  oops
    -->
    oops1

    -->
    oops2
`);
        });

        it("prints a multi-line EF", () => {
            let ef = new ElementFinder(`
                one
                    two
                        three
                    four
                    five
            `);

            expect(ef.print()).to.equal(`one
    two
        three
    four
    five`);
        });

        it("prints a multi-line EF with errors on multiple lines", () => {
            let ef = new ElementFinder(`
                one
                    two
                        three
                    four
                    five
            `);
            ef.error = `oops1`;
            ef.children[0].error = `oops2`;
            ef.children[0].children[0].error = `oops3`;
            ef.children[2].error = `oops4`;

            expect(ef.print()).to.equal(`one  -->  oops1
    two  -->  oops2
        three  -->  oops3
    four
    five  -->  oops4`);
        });

        it("prints a multi-line EF with a block error on multiple lines", () => {
            let ef = new ElementFinder(`
                one
                    two
                        three
                    four
                    five
            `);
            ef.blockErrors = [`oops1`];
            ef.children[0].blockErrors = [`oops2`];
            ef.children[0].children[0].blockErrors = [`oops3`];
            ef.children[2].blockErrors = [`oops4`];

            expect(ef.print()).to.equal(`one
    two
        three
            -->
            oops3

        -->
        oops2

    four
    five
        -->
        oops4

    -->
    oops1
`);
        });

        it("prints a multi-line EF with multiple errors and multiple block errors on multiple lines", () => {
            let ef = new ElementFinder(`
                one
                    two
                        three
                    four
                    five
            `);

            ef.error = `error1`;
            ef.children[0].error = `error2`;
            ef.children[0].children[0].error = `error3`;
            ef.children[2].error = `error4`;

            ef.blockErrors = [`oops1`, `oops2`];
            ef.children[0].blockErrors = [`oops3`, `oops4`, `oops5`];
            ef.children[0].children[0].blockErrors = [`oops6`, `oops7`, `oops8`];
            ef.children[2].blockErrors = [`oops9`, `oops10`];

            expect(ef.print()).to.equal(`one  -->  error1
    two  -->  error2
        three  -->  error3
            -->
            oops6

            -->
            oops7

            -->
            oops8

        -->
        oops3

        -->
        oops4

        -->
        oops5

    four
    five  -->  error4
        -->
        oops9

        -->
        oops10

    -->
    oops1

    -->
    oops2
`);
        });
    });

    describe("getAll()", () => {
        context("text EFs", () => {
            it.only("finds elements based on innerText", async () => {
                let ef = new ElementFinder(`
                    one
                        two
                `);
                await ef.getAll(driver, await driver.findElement(By.tagName('h1')));
                await new Promise((res, rej) => {});
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
        });

        context("ordinal EFs", () => {
            it.skip("finds elements based on an ord", () => {

            });

            it.skip("doesn't find elements based on an ord", () => {

            });
        });

        context("defined property EFs", () => {
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
        });

        context("counter EFs", () => {
            it.skip("finds elements based on a counter with a min", () => {

            });

            it.skip("doesn't find elements based on a counter with a min", () => {

            });

            it.skip("finds elements based on a counter with a max", () => {

            });

            it.skip("doesn't find elements based on a counter with a max", () => {

            });

            it.skip("finds elements based on a counter with a min and max", () => {

            });

            it.skip("doesn't find elements based on a counter with a min and max", () => {

            });

            it.skip("finds elements based on a counter with an equal min and max", () => {

            });

            it.skip("doesn't find elements based on a counter with an equal min and max", () => {

            });

            it.skip("finds elements based on a counter with a min of 0", () => {

            });

            it.skip("doesn't find elements based on a counter with a min of 0", () => {

            });

            it.skip("finds elements based on a counter with a min and max of 0", () => {

            });

            it.skip("doesn't find elements based on a counter with a min and max of 0", () => {

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

            it.skip("finds elements in a differing order with the 'any order' keyword", () => {

            });

            it.skip("finds elements with the 'subset' keyword, even though it doesn't do anything", () => {

            });

            it.skip("handles the 'any order' and 'subset' keywords together", () => {

            });

            it.skip("finds a [child element]", () => {

            });

            it.skip("finds multiple [child elements]", () => {

            });

            it.skip("doesn't find [child elements]", () => {

            });

            it.skip("only searches within the given parent element", () => {

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

            it.skip("accepts a correct matching with the 'any order' keyword", () => {

            });

            it.skip("rejects an incorrect matching with the 'any order' keyword", () => {

            });

            it.skip("accepts a correct matching with the 'subset' keyword", () => {

            });

            it.skip("rejects an incorrect matching with the 'subset' keyword", () => {

            });

            it.skip("accepts a correct matching with the 'any order' and 'subset' keywords together", () => {

            });

            it.skip("rejects an incorrect matching with the 'any order' and 'subset' keywords together", () => {

            });
        });

        context("performance", () => {
            it("handles very large DOMs", () => {

            });

            it("handles very large EFs", () => {

            });

            it("handles finding a very large number of elements", () => {

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

    describe("defaultProps()", () => {
        it.skip("finds elements based on 'visible'", () => {

        });

        it.skip("doesn't find elements based on 'visible'", () => {

        });

        it.skip("finds elements based on 'not visible'", () => {

        });

        it.skip("doesn't find elements based on 'not visible'", () => {

        });

        it.skip("finds elements based on 'any visibility'", () => {

        });

        it.skip("doesn't find elements based on 'any visibility'", () => {

        });

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

        it.skip("finds elements based on 'style'", () => {
            // style 'name: val'
        });

        it.skip("doesn't find elements based on 'style'", () => {

        });

        it.skip("finds elements based on 'has'", () => {

        });

        it.skip("doesn't find elements based on 'has'", () => {

        });

        it.skip("finds elements based on 'position'", () => {

        });

        it.skip("doesn't find elements based on 'position'", () => {

        });

        it.skip("handles the 'not' keyword", () => {

        });
    });

    describe("canonicalizePropStr", () => {
        it("canonicalizes a prop string with no input", () => {
            let [canonStr, input] = ElementFinder.canonicalizePropStr(`foobar`);
            expect(canonStr).to.equal(`foobar`);
            expect(input).to.be.undefined;

            [canonStr, input] = ElementFinder.canonicalizePropStr(`foo bar`);
            expect(canonStr).to.equal(`foo bar`);
            expect(input).to.be.undefined;

            [canonStr, input] = ElementFinder.canonicalizePropStr(`  foo  bar  `);
            expect(canonStr).to.equal(`foo bar`);
            expect(input).to.be.undefined;

            [canonStr, input] = ElementFinder.canonicalizePropStr(`  Foo  bAr  `);
            expect(canonStr).to.equal(`foo bar`);
            expect(input).to.be.undefined;
        });

        it("canonicalizes a prop string with single quote input", () => {
            let [canonStr, input] = ElementFinder.canonicalizePropStr(`foobar 'blah'`);
            expect(canonStr).to.equal(`foobar`);
            expect(input).to.be.equal(`blah`);

            [canonStr, input] = ElementFinder.canonicalizePropStr(`foo bar 'blah'`);
            expect(canonStr).to.equal(`foo bar`);
            expect(input).to.be.equal(`blah`);

            [canonStr, input] = ElementFinder.canonicalizePropStr(`foo 'blah' bar`);
            expect(canonStr).to.equal(`foo bar`);
            expect(input).to.be.equal(`blah`);

            [canonStr, input] = ElementFinder.canonicalizePropStr(`  foo  bar  ' blah  2 '  `);
            expect(canonStr).to.equal(`foo bar`);
            expect(input).to.be.equal(` blah  2 `);

            [canonStr, input] = ElementFinder.canonicalizePropStr(`  Foo  bAr  ' blah  2 '  `);
            expect(canonStr).to.equal(`foo bar`);
            expect(input).to.be.equal(` blah  2 `);

            [canonStr, input] = ElementFinder.canonicalizePropStr(`  Foo  bAr  ' blah \\' \\' \\\\\\' "" 2 '  `);
            expect(canonStr).to.equal(`foo bar`);
            expect(input).to.be.equal(` blah ' ' \\' "" 2 `);
        });

        it("canonicalizes a prop string with double quote input", () => {
            let [canonStr, input] = ElementFinder.canonicalizePropStr(`foobar "blah"`);
            expect(canonStr).to.equal(`foobar`);
            expect(input).to.be.equal(`blah`);

            [canonStr, input] = ElementFinder.canonicalizePropStr(`foo bar "blah"`);
            expect(canonStr).to.equal(`foo bar`);
            expect(input).to.be.equal(`blah`);

            [canonStr, input] = ElementFinder.canonicalizePropStr(`foo "blah" bar`);
            expect(canonStr).to.equal(`foo bar`);
            expect(input).to.be.equal(`blah`);

            [canonStr, input] = ElementFinder.canonicalizePropStr(`  foo  bar  " blah  2 "  `);
            expect(canonStr).to.equal(`foo bar`);
            expect(input).to.be.equal(` blah  2 `);

            [canonStr, input] = ElementFinder.canonicalizePropStr(`  Foo  bAr  " blah  2 "  `);
            expect(canonStr).to.equal(`foo bar`);
            expect(input).to.be.equal(` blah  2 `);

            [canonStr, input] = ElementFinder.canonicalizePropStr(`  Foo  bAr  " blah \\" \\" \\\\\\" '' 2 "  `);
            expect(canonStr).to.equal(`foo bar`);
            expect(input).to.be.equal(` blah " " \\" '' 2 `);
        });
    });
});
