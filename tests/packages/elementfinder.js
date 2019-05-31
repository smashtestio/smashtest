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

    // before(async () => {
    //     driver = await new Builder()
    //         .forBrowser('chrome')
    //         .setChromeOptions(HEADLESS ? new chrome.Options().headless() : new chrome.Options())
    //         .build();
    //
    //     await driver.get(`file://${__dirname}/generic-page.html`);
    // });
    //
    // after(async () => {
    //     await driver.quit();
    // });

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
                            def: `contains`,
                            input: `text`,
                            not: undefined
                        },
                        {
                           prop: `visible`,
                           def: `visible`,
                           input: undefined,
                           not: undefined
                        }
                    ],

                    parent: undefined,
                    children: [],

                    matchMe: undefined,
                    isElemArray: undefined,
                    isAnyOrder: undefined,
                    isSubset: undefined
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
                            def: `contains`,
                            input: `text1`,
                            not: undefined
                        },
                        {
                            prop: `'text 2'`,
                            def: `contains`,
                            input: `text 2`,
                            not: undefined
                        },
                        {
                           prop: `visible`,
                           def: `visible`,
                           input: undefined,
                           not: undefined
                        }
                    ],

                    parent: undefined,
                    children: [],

                    matchMe: undefined,
                    isElemArray: undefined,
                    isAnyOrder: undefined,
                    isSubset: undefined
                });
            });

            it("'text' with 'not' keyword", () => {
                let ef = new ElementFinder(`not 'text'`);

                Comparer.expect(ef).to.match({
                    counter: { min: 1, max: 1 },
                    props: [
                        {
                            prop: `not 'text'`,
                            def: `contains`,
                            input: `text`,
                            not: true
                        },
                        {
                           prop: `visible`,
                           def: `visible`,
                           input: undefined,
                           not: undefined
                        }
                    ],

                    parent: undefined,
                    children: [],

                    matchMe: undefined,
                    isElemArray: undefined,
                    isAnyOrder: undefined,
                    isSubset: undefined
                });
            });

            it("multiple 'text' with 'not' keyword", () => {
                let ef = new ElementFinder(`not 'text1', not 'text 2', 'text 3'`);

                Comparer.expect(ef).to.match({
                    counter: { min: 1, max: 1 },
                    props: [
                        {
                            prop: `not 'text1'`,
                            def: `contains`,
                            input: `text1`,
                            not: true
                        },
                        {
                            prop: `not 'text 2'`,
                            def: `contains`,
                            input: `text 2`,
                            not: true
                        },
                        {
                            prop: `'text 3'`,
                            def: `contains`,
                            input: `text 3`,
                            not: undefined
                        },
                        {
                           prop: `visible`,
                           def: `visible`,
                           input: undefined,
                           not: undefined
                        }
                    ],

                    parent: undefined,
                    children: [],

                    matchMe: undefined,
                    isElemArray: undefined,
                    isAnyOrder: undefined,
                    isSubset: undefined
                });
            });

            it("defined property set to an EF", () => {
                let ef = new ElementFinder(`bold`, {
                    bold: [ new ElementFinder(`b`, {
                        b: [ (elems, input) => true ]
                    }) ],
                    visible: [ (elems, input) => true ]
                });

                Comparer.expect(ef).to.match({
                    counter: { min: 1, max: 1 },
                    props: [
                        {
                            prop: `bold`,
                            def: `bold`,
                            input: undefined
                        },
                        {
                           prop: `visible`,
                           def: `visible`,
                           input: undefined,
                           not: undefined
                        }
                    ],

                    parent: undefined,
                    children: [],

                    matchMe: undefined,
                    isElemArray: undefined,
                    isAnyOrder: undefined,
                    isSubset: undefined
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
                            def: `bold`,
                            input: undefined,
                            not: undefined
                        },
                        {
                           prop: `visible`,
                           def: `visible`,
                           input: undefined,
                           not: undefined
                        }
                    ],

                    parent: undefined,
                    children: [],

                    matchMe: undefined,
                    isElemArray: undefined,
                    isAnyOrder: undefined,
                    isSubset: undefined
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
                            def: `bold`,
                            input: `foobar`,
                            not: undefined
                        },
                        {
                           prop: `visible`,
                           def: `visible`,
                           input: undefined,
                           not: undefined
                        }
                    ],

                    parent: undefined,
                    children: [],

                    matchMe: undefined,
                    isElemArray: undefined,
                    isAnyOrder: undefined,
                    isSubset: undefined
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
                            def: `bold`,
                            input: `foobar`,
                            not: true
                        },
                        {
                           prop: `visible`,
                           def: `visible`,
                           input: undefined,
                           not: undefined
                        }
                    ],

                    parent: undefined,
                    children: [],

                    matchMe: undefined,
                    isElemArray: undefined,
                    isAnyOrder: undefined,
                    isSubset: undefined
                });
            });

            it("selector", () => {
                let ef = new ElementFinder(`div.class1 .class2`);

                Comparer.expect(ef).to.match({
                    counter: { min: 1, max: 1 },
                    props: [
                        {
                            prop: `div.class1 .class2`,
                            def: `selector`,
                            input: `div.class1 .class2`,
                            not: undefined
                        },
                        {
                           prop: `visible`,
                           def: `visible`,
                           input: undefined,
                           not: undefined
                        }
                    ],

                    parent: undefined,
                    children: [],

                    matchMe: undefined,
                    isElemArray: undefined,
                    isAnyOrder: undefined,
                    isSubset: undefined
                });
            });

            it("handles selectors with one single quote", () => {
                let ef = new ElementFinder(`div.class1 .class2'`);

                Comparer.expect(ef).to.match({
                    counter: { min: 1, max: 1 },
                    props: [
                        {
                            prop: `div.class1 .class2'`,
                            def: `selector`,
                            input: `div.class1 .class2'`,
                            not: undefined
                        },
                        {
                           prop: `visible`,
                           def: `visible`,
                           input: undefined,
                           not: undefined
                        }
                    ],

                    parent: undefined,
                    children: [],

                    matchMe: undefined,
                    isElemArray: undefined,
                    isAnyOrder: undefined,
                    isSubset: undefined
                });
            });

            it("handles selectors with two single quotes", () => {
                let ef = new ElementFinder(`div[attr='foobar']`);

                Comparer.expect(ef).to.match({
                    counter: { min: 1, max: 1 },
                    props: [
                        {
                            prop: `div[attr='foobar']`,
                            def: `selector`,
                            input: `div[attr='foobar']`,
                            not: undefined
                        },
                        {
                           prop: `visible`,
                           def: `visible`,
                           input: undefined,
                           not: undefined
                        }
                    ],

                    parent: undefined,
                    children: [],

                    matchMe: undefined,
                    isElemArray: undefined,
                    isAnyOrder: undefined,
                    isSubset: undefined
                });
            });

            it("handles selectors with one double quote", () => {
                let ef = new ElementFinder(`div.class1 .class2"`);

                Comparer.expect(ef).to.match({
                    counter: { min: 1, max: 1 },
                    props: [
                        {
                            prop: `div.class1 .class2"`,
                            def: `selector`,
                            input: `div.class1 .class2"`,
                            not: undefined
                        },
                        {
                           prop: `visible`,
                           def: `visible`,
                           input: undefined,
                           not: undefined
                        }
                    ],

                    parent: undefined,
                    children: [],

                    matchMe: undefined,
                    isElemArray: undefined,
                    isAnyOrder: undefined,
                    isSubset: undefined
                });
            });

            it("handles selectors with two double quotes", () => {
                let ef = new ElementFinder(`div[attr="foobar"]`);

                Comparer.expect(ef).to.match({
                    counter: { min: 1, max: 1 },
                    props: [
                        {
                            prop: `div[attr="foobar"]`,
                            def: `selector`,
                            input: `div[attr="foobar"]`,
                            not: undefined
                        },
                        {
                           prop: `visible`,
                           def: `visible`,
                           input: undefined,
                           not: undefined
                        }
                    ],

                    parent: undefined,
                    children: [],

                    matchMe: undefined,
                    isElemArray: undefined,
                    isAnyOrder: undefined,
                    isSubset: undefined
                });
            });

            it("selector with 'not' keyword", () => {
                let ef = new ElementFinder(`not div.class1 .class2`);

                Comparer.expect(ef).to.match({
                    counter: { min: 1, max: 1 },
                    props: [
                        {
                            prop: `not div.class1 .class2`,
                            def: `selector`,
                            input: `div.class1 .class2`,
                            not: true
                        },
                        {
                           prop: `visible`,
                           def: `visible`,
                           input: undefined,
                           not: undefined
                        }
                    ],

                    parent: undefined,
                    children: [],

                    matchMe: undefined,
                    isElemArray: undefined,
                    isAnyOrder: undefined,
                    isSubset: undefined
                });
            });

            it("ordinal", () => {
                let ef = new ElementFinder(`4th`);

                Comparer.expect(ef).to.match({
                    counter: { min: 1, max: 1 },
                    props: [
                        {
                            prop: `4th`,
                            def: `position`,
                            input: 4,
                            not: undefined
                        },
                        {
                           prop: `visible`,
                           def: `visible`,
                           input: undefined,
                           not: undefined
                        }
                    ],

                    parent: undefined,
                    children: [],

                    matchMe: undefined,
                    isElemArray: undefined,
                    isAnyOrder: undefined,
                    isSubset: undefined
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
                            def: `selector`,
                            input: `.class1`,
                            not: undefined
                        },
                        {
                           prop: `visible`,
                           def: `visible`,
                           input: undefined,
                           not: undefined
                        }
                    ],

                    parent: undefined,
                    children: [],

                    matchMe: undefined,
                    isElemArray: undefined,
                    isAnyOrder: undefined,
                    isSubset: undefined
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
                            def: `selector`,
                            input: `.class1`,
                            not: undefined
                        },
                        {
                           prop: `visible`,
                           def: `visible`,
                           input: undefined,
                           not: undefined
                        }
                    ],

                    parent: undefined,
                    children: [],

                    matchMe: undefined,
                    isElemArray: undefined,
                    isAnyOrder: undefined,
                    isSubset: undefined
                });
            });

            it("multiple items separated by commas", () => {
                let ef = new ElementFinder(`div.class1 .class2, 'piece of text', contains "other text", not selected`);

                Comparer.expect(ef).to.match({
                    counter: { min: 1, max: 1 },
                    props: [
                        {
                            prop: `div.class1 .class2`,
                            def: `selector`,
                            input: `div.class1 .class2`,
                            not: undefined
                        },
                        {
                            prop: `'piece of text'`,
                            def: `contains`,
                            input: `piece of text`,
                            not: undefined
                        },
                        {
                            prop: `contains "other text"`,
                            def: `contains`,
                            input: `other text`,
                            not: undefined
                        },
                        {
                            prop: `not selected`,
                            def: `selected`,
                            input: undefined,
                            not: true
                        },
                        {
                           prop: `visible`,
                           def: `visible`,
                           input: undefined,
                           not: undefined
                        }
                    ],

                    parent: undefined,
                    children: [],

                    matchMe: undefined,
                    isElemArray: undefined,
                    isAnyOrder: undefined,
                    isSubset: undefined
                });
            });

            it("multiple items separated by commas with extra whitespace everywhere", () => {
                let ef = new ElementFinder(`    div.class1 .class2  , 'piece of text'    , contains "other text", not selected    `);

                Comparer.expect(ef).to.match({
                    counter: { min: 1, max: 1 },
                    props: [
                        {
                            prop: `div.class1 .class2`,
                            def: `selector`,
                            input: `div.class1 .class2`,
                            not: undefined
                        },
                        {
                            prop: `'piece of text'`,
                            def: `contains`,
                            input: `piece of text`,
                            not: undefined
                        },
                        {
                            prop: `contains "other text"`,
                            def: `contains`,
                            input: `other text`,
                            not: undefined
                        },
                        {
                            prop: `not selected`,
                            def: `selected`,
                            input: undefined,
                            not: true
                        },
                        {
                           prop: `visible`,
                           def: `visible`,
                           input: undefined,
                           not: undefined
                        }
                    ],

                    parent: undefined,
                    children: [],

                    matchMe: undefined,
                    isElemArray: undefined,
                    isAnyOrder: undefined,
                    isSubset: undefined
                });
            });

            it("multiple items separated by commas, including selectors with quotes inside", () => {
                let ef = new ElementFinder(`input[attr='quote'] p[attr="quote"], 'piece of text', contains "other text", not selected`);

                Comparer.expect(ef).to.match({
                    counter: { min: 1, max: 1 },
                    props: [
                        {
                            prop: `input[attr='quote'] p[attr="quote"]`,
                            def: `selector`,
                            input: `input[attr='quote'] p[attr="quote"]`,
                            not: undefined
                        },
                        {
                            prop: `'piece of text'`,
                            def: `contains`,
                            input: `piece of text`,
                            not: undefined
                        },
                        {
                            prop: `contains "other text"`,
                            def: `contains`,
                            input: `other text`,
                            not: undefined
                        },
                        {
                            prop: `not selected`,
                            def: `selected`,
                            input: undefined,
                            not: true
                        },
                        {
                           prop: `visible`,
                           def: `visible`,
                           input: undefined,
                           not: undefined
                        }
                    ],

                    parent: undefined,
                    children: [],

                    matchMe: undefined,
                    isElemArray: undefined,
                    isAnyOrder: undefined,
                    isSubset: undefined
                });
            });

            it("handles 'text' containing commas and escaped quotes", () => {
                let ef = new ElementFinder(`'quote1,2\\'3"4'`);

                Comparer.expect(ef).to.match({
                    counter: { min: 1, max: 1 },
                    props: [
                        {
                            prop: `'quote1,2\\'3"4'`,
                            def: `contains`,
                            input: `quote1,2'3"4`,
                            not: undefined
                        },
                        {
                           prop: `visible`,
                           def: `visible`,
                           input: undefined,
                           not: undefined
                        }
                    ],

                    parent: undefined,
                    children: [],

                    matchMe: undefined,
                    isElemArray: undefined,
                    isAnyOrder: undefined,
                    isSubset: undefined
                });
            });

            it("handles a selector containing quotes and commas", () => {
                let ef = new ElementFinder(`input[attr='quote'] p[attr="quote"] input[attr='quote1,2\\'3"4'].div[attr='quote1,2\\'3\\"4'], input[attr="1,2'3\\"4"].div[attr="1,2\\'3\\"4"], 'piece of text', contains "other text", not selected`);

                Comparer.expect(ef).to.match({
                    counter: { min: 1, max: 1 },
                    props: [
                        {
                            prop: `input[attr='quote'] p[attr="quote"] input[attr='quote1,2\\'3"4'].div[attr='quote1,2\\'3\\"4']`,
                            def: `selector`,
                            input: `input[attr='quote'] p[attr="quote"] input[attr='quote1,2\\'3"4'].div[attr='quote1,2\\'3\\"4']`,
                            not: undefined
                        },
                        {
                            prop: `input[attr="1,2'3\\"4"].div[attr="1,2\\'3\\"4"]`,
                            def: `selector`,
                            input: `input[attr="1,2'3\\"4"].div[attr="1,2\\'3\\"4"]`,
                            not: undefined
                        },
                        {
                            prop: `'piece of text'`,
                            def: `contains`,
                            input: `piece of text`,
                            not: undefined
                        },
                        {
                            prop: `contains "other text"`,
                            def: `contains`,
                            input: `other text`,
                            not: undefined
                        },
                        {
                            prop: `not selected`,
                            def: `selected`,
                            input: undefined,
                            not: true
                        },
                        {
                           prop: `visible`,
                           def: `visible`,
                           input: undefined,
                           not: undefined
                        }
                    ],

                    parent: undefined,
                    children: [],

                    matchMe: undefined,
                    isElemArray: undefined,
                    isAnyOrder: undefined,
                    isSubset: undefined
                });
            });

            it("handles a defined property with 'input text' containing commas and escaped quotes", () => {
                let ef = new ElementFinder(`contains 'quote1,2\\'3"4'`);

                Comparer.expect(ef).to.match({
                    counter: { min: 1, max: 1 },
                    props: [
                        {
                            prop: `contains 'quote1,2\\'3"4'`,
                            def: `contains`,
                            input: `quote1,2'3"4`,
                            not: undefined
                        },
                        {
                           prop: `visible`,
                           def: `visible`,
                           input: undefined,
                           not: undefined
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
                            def: `selector`,
                            input: `input[attr="quote1,2'3"4'"]`,
                            not: undefined
                        },
                        {
                           prop: `visible`,
                           def: `visible`,
                           input: undefined,
                           not: undefined
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
                            def: `selector`,
                            input: `something`,
                            not: undefined
                        },
                        {
                           prop: `visible`,
                           def: `visible`,
                           input: undefined,
                           not: undefined
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
                            def: `selector`,
                            input: `something`,
                            not: undefined
                        },
                        {
                           prop: `not visible`,
                           def: `visible`,
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
                            def: `selector`,
                            input: `something`,
                            not: undefined
                        },
                        {
                           prop: `any visibility`,
                           def: `any visibility`,
                           input: undefined,
                           not: undefined
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
                            def: `selector`,
                            input: `one`,
                            not: undefined
                        },
                        {
                           prop: `visible`,
                           def: `visible`,
                           input: undefined,
                           not: undefined
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
                                    def: `selector`,
                                    input: `two`,
                                    not: undefined
                                },
                                {
                                   prop: `visible`,
                                   def: `visible`,
                                   input: undefined,
                                   not: undefined
                                }
                            ],

                            parent: { props: [ { prop: `one` }, { prop: `visible` } ] },
                            children: [],

                            matchMe: undefined,
                            isElemArray: undefined,
                            isAnyOrder: undefined,
                            isSubset: undefined
                        }
                    ],

                    matchMe: undefined,
                    isElemArray: undefined,
                    isAnyOrder: undefined,
                    isSubset: undefined
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

            it("inserts implicit body EF if more than one line is at indent 0", () => {
                let ef = new ElementFinder(`
                    one
                    two
                `);

                Comparer.expect(ef).to.match({
                    line: `body`,
                    props: [
                        {
                            prop: `body`,
                            def: `selector`,
                            input: `body`,
                            not: undefined
                        },
                        {
                           prop: `visible`,
                           def: `visible`,
                           input: undefined,
                           not: undefined
                        }
                    ],
                    parent: undefined,
                    children: [
                        {
                            line: `one`,
                            props: [
                                {
                                    prop: `one`,
                                    def: `selector`,
                                    input: `one`,
                                    not: undefined
                                },
                                {
                                   prop: `visible`,
                                   def: `visible`,
                                   input: undefined,
                                   not: undefined
                                }
                            ],
                            parent: { line: `body` },
                            children: []
                        },
                        {
                            line: `two`,
                            props: [
                                {
                                    prop: `two`,
                                    def: `selector`,
                                    input: `two`,
                                    not: undefined
                                },
                                {
                                   prop: `visible`,
                                   def: `visible`,
                                   input: undefined,
                                   not: undefined
                                }
                            ],
                            parent: { line: `body` },
                            children: []
                        }
                    ]
                });

                ef = new ElementFinder(`
                    one
                        two
                    three

                    four
                `);

                Comparer.expect(ef).to.match({
                    line: `body`,
                    props: [
                        {
                            prop: `body`,
                            def: `selector`,
                            input: `body`,
                            not: undefined
                        },
                        {
                           prop: `visible`,
                           def: `visible`,
                           input: undefined,
                           not: undefined
                        }
                    ],
                    parent: undefined,
                    children: [
                        {
                            line: `one`,
                            props: [
                                {
                                    prop: `one`,
                                    def: `selector`,
                                    input: `one`,
                                    not: undefined
                                },
                                {
                                   prop: `visible`,
                                   def: `visible`,
                                   input: undefined,
                                   not: undefined
                                }
                            ],
                            parent: { line: `body` },
                            children: [
                                {
                                    line: `two`,
                                    props: [
                                        {
                                            prop: `two`,
                                            def: `selector`,
                                            input: `two`,
                                            not: undefined
                                        },
                                        {
                                           prop: `visible`,
                                           def: `visible`,
                                           input: undefined,
                                           not: undefined
                                        }
                                    ],
                                    parent: {},
                                    children: []
                                }
                            ]
                        },
                        {
                            line: `three`,
                            props: [
                                {
                                    prop: `three`,
                                    def: `selector`,
                                    input: `three`,
                                    not: undefined
                                },
                                {
                                   prop: `visible`,
                                   def: `visible`,
                                   input: undefined,
                                   not: undefined
                                }
                            ],
                            parent: { line: `body` },
                            children: []
                        },
                        {
                            line: `four`,
                            props: [
                                {
                                    prop: `four`,
                                    def: `selector`,
                                    input: `four`,
                                    not: undefined
                                },
                                {
                                   prop: `visible`,
                                   def: `visible`,
                                   input: undefined,
                                   not: undefined
                                }
                            ],
                            parent: { line: `body` },
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
                            isAnyOrder: undefined
                        },
                        {
                            props: [ { prop: `three` }, { prop: `visible` } ],
                            parent: {},
                            children: [],
                            isAnyOrder: undefined
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
                            isAnyOrder: undefined
                        },
                        {
                            props: [ { prop: `three` }, { prop: `visible` } ],
                            parent: {},
                            children: [],
                            isAnyOrder: undefined
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
                            isAnyOrder: undefined
                        },
                        {
                            props: [ { prop: `three` }, { prop: `visible` } ],
                            parent: {},
                            children: [],
                            isAnyOrder: undefined
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
                            isSubset: undefined
                        },
                        {
                            props: [ { prop: `three` }, { prop: `visible` } ],
                            parent: {},
                            children: [],
                            isSubset: undefined
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
                            isSubset: undefined
                        },
                        {
                            props: [ { prop: `three` }, { prop: `visible` } ],
                            parent: {},
                            children: [],
                            isSubset: undefined
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
                            isSubset: undefined
                        },
                        {
                            props: [ { prop: `three` }, { prop: `visible` } ],
                            parent: {},
                            children: [],
                            isSubset: undefined
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
                            isAnyOrder: undefined
                        },
                        {
                            props: [ { prop: `two` }, { prop: `visible` } ],
                            parent: {},
                            children: [],
                            isAnyOrder: undefined
                        },
                        {
                            props: [ { prop: `three` }, { prop: `visible` } ],
                            parent: {},
                            children: [],
                            isAnyOrder: undefined
                        }
                    ],
                    isAnyOrder: undefined
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
                            isSubset: undefined
                        },
                        {
                            props: [ { prop: `two` }, { prop: `visible` } ],
                            parent: {},
                            children: [],
                            isSubset: undefined
                        },
                        {
                            props: [ { prop: `three` }, { prop: `visible` } ],
                            parent: {},
                            children: [],
                            isSubset: undefined
                        }
                    ],
                    isSubset: undefined
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
                            isElemArray: undefined
                        },
                        {
                            props: [ { prop: `three` }, { prop: `visible` } ],
                            parent: {},
                            children: [],
                            isElemArray: undefined
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
                            isElemArray: undefined,
                            isAnyOrder: undefined
                        },
                        {
                            props: [ { prop: `three` }, { prop: `visible` } ],
                            parent: {},
                            children: [],
                            isElemArray: undefined,
                            isAnyOrder: undefined
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
                            isElemArray: undefined,
                            isSubset: undefined
                        },
                        {
                            props: [ { prop: `three` }, { prop: `visible` } ],
                            parent: {},
                            children: [],
                            isElemArray: undefined,
                            isSubset: undefined
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
                            matchMe: undefined
                        },
                        {
                            props: [ { prop: `three` }, { prop: `visible` } ],
                            parent: {},
                            children: [],
                            matchMe: undefined
                        }
                    ],
                    matchMe: undefined
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
                            matchMe: undefined
                        }
                    ],
                    matchMe: undefined
                });
            });

            it("[counter x child element]", () => {
                let ef = new ElementFinder(`
                    one
                        [5 x two, two2]
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
                            matchMe: undefined
                        }
                    ],
                    matchMe: undefined
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
                            matchMe: undefined
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

            it("throws an error if the 'selector' prop isn't available but is needed", () => {
                assert.throws(() => {
                    new ElementFinder(`
                        one
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
            ef.blockErrors = [ { header: `header1`, body: `body1` } ];

            expect(ef.print()).to.equal(`one
    --> header1
    body1
`);
        });

        it("prints a one-line EF with multiple block errors", () => {
            let ef = new ElementFinder(`one`);
            ef.blockErrors = [ { header: `header1`, body: `body1` }, { header: `header2`, body: `body2` } ];

            expect(ef.print()).to.equal(`one
    --> header1
    body1

    --> header2
    body2
`);
        });

        it("prints a one-line EF with an error and multiple block errors", () => {
            let ef = new ElementFinder(`one`);
            ef.error = `oops`;
            ef.blockErrors = [ { header: `header1`, body: `body1` }, { header: `header2`, body: `body2` } ];

            expect(ef.print()).to.equal(`one  -->  oops
    --> header1
    body1

    --> header2
    body2
`);
        });

        it("prints using a custom errorStart and errorEnd", () => {
            let ef = new ElementFinder(`one`);
            ef.error = `oops`;
            ef.blockErrors = [ { header: `header1`, body: `body1` }, { header: `header2`, body: `body2` } ];

            expect(ef.print(`<start>`, `<end>`)).to.equal(`one  <start>  oops<end>
    <start> header1
    body1<end>

    <start> header2
    body2<end>
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
            ef.blockErrors = [ { header: `header1`, body: `body1` } ];
            ef.children[0].blockErrors = [ { header: `header2`, body: `body2` } ];
            ef.children[0].children[0].blockErrors = [ { header: `header3`, body: `body3` } ];
            ef.children[2].blockErrors = [ { header: `header4`, body: `body4` } ];

            expect(ef.print()).to.equal(`one
    two
        three
            --> header3
            body3

        --> header2
        body2

    four
    five
        --> header4
        body4

    --> header1
    body1
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

            ef.blockErrors = [ { header: `header1`, body: `body1` }, { header: `header2`, body: `body2` } ];
            ef.children[0].blockErrors = [ { header: `header3`, body: `body3` }, { header: `header4`, body: `body4` }, { header: `header5`, body: `body5` } ];
            ef.children[0].children[0].blockErrors = [ { header: `header6`, body: `body6` }, { header: `header7`, body: `body7` }, { header: `header8`, body: `body8` } ];
            ef.children[2].blockErrors = [ { header: `header9`, body: `body9` }, { header: `header10`, body: `body10` } ];

            expect(ef.print()).to.equal(`one  -->  error1
    two  -->  error2
        three  -->  error3
            --> header6
            body6

            --> header7
            body7

            --> header8
            body8

        --> header3
        body3

        --> header4
        body4

        --> header5
        body5

    four
    five  -->  error4
        --> header9
        body9

        --> header10
        body10

    --> header1
    body1

    --> header2
    body2
`);
        });
    });

    describe("serialize()", () => {
        it("serializes a one-line EF", () => {
            let ef = new ElementFinder(`one`);

            Comparer.expect(ef.serialize()).to.match({
                line: `one`,
                counter: { min: 1, max: 1 },
                props: [
                    {
                        prop: `one`,
                        def: `selector`,
                        input: `one`,
                        not: undefined
                    },
                    {
                       prop: `visible`,
                       def: `visible`,
                       input: undefined,
                       not: undefined
                    }
                ],
                children: []
            });
        });

        it("serializes a multi-line EF", () => {
            let ef = new ElementFinder(`
                one
                    subset
                    two
            `);

            Comparer.expect(ef.serialize()).to.match({
                line: `one`,
                counter: { min: 1, max: 1 },
                props: [
                    {
                        prop: `one`,
                        def: `selector`,
                        input: `one`,
                        not: undefined
                    },
                    {
                       prop: `visible`,
                       def: `visible`,
                       input: undefined,
                       not: undefined
                    }
                ],
                children: [
                    {
                        line: `two`,
                        counter: { min: 1, max: 1 },
                        props: [
                            {
                                prop: `two`,
                                def: `selector`,
                                input: `two`,
                                not: undefined
                            },
                            {
                               prop: `visible`,
                               def: `visible`,
                               input: undefined,
                               not: undefined
                            }
                        ],
                        children: []
                    }
                ],
                isSubset: true
            });
        });
    });

    describe("serializeJSON()", () => {
        it("returns a json representation of an EF", () => {
            let ef = new ElementFinder(`one`);
            let json = ef.serializeJSON();
            let obj = JSON.parse(json);

            Comparer.expect(obj).to.match({
                ef: {
                    line: `one`,
                    counter: { min: 1, max: 1 },
                    props: [
                        {
                            prop: `one`,
                            def: `selector`,
                            input: `one`,
                            not: undefined
                        },
                        {
                           prop: `visible`,
                           def: `visible`,
                           input: undefined,
                           not: undefined
                        }
                    ],
                    children: []
                },
                definedProps: {}
            });
        });

        // NOTE: This test skipped because it fails when running nyc code coverage
        it.skip("only includes used functions in definedProps, and converts them to strings", () => {
            let ef = new ElementFinder(`
                one
                    subset
                    'two'
            `, {
                'selector': [
                    (elems, input) => input + 1,
                    (elems, input) => input + 2
                ],
                'contains': [
                    (elems, input) => input + 3
                ],
                'otherprop': [
                    (elems, input) => input + 4
                ]
            });
            let json = ef.serializeJSON();
            let obj = JSON.parse(json);

            Comparer.expect(obj).to.match({
                ef: {
                    line: `one`,
                    counter: { min: 1, max: 1 },
                    props: [
                        {
                            prop: `one`,
                            def: `selector`,
                            input: `one`,
                            not: undefined
                        },
                        {
                           prop: `visible`,
                           def: `visible`,
                           input: undefined,
                           not: undefined
                        }
                    ],
                    children: [
                        {
                            line: `'two'`,
                            counter: { min: 1, max: 1 },
                            props: [
                                {
                                    prop: `'two'`,
                                    def: `contains`,
                                    input: `two`,
                                    not: undefined
                                },
                                {
                                   prop: `visible`,
                                   def: `visible`,
                                   input: undefined,
                                   not: undefined
                                }
                            ],
                            children: []
                        }
                    ],
                    isSubset: true
                },
                definedProps: {
                    $exact: true,
                    selector: [
                        "(elems, input) => input + 1",
                        "(elems, input) => input + 2"
                    ],
                    contains: [
                        "(elems, input) => input + 3"
                    ]
                }
            });
        });
    });

    describe("getAll()", () => {
        context("text EFs", () => {
            it.skip("finds elements based on innerText", async () => {
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
            it.skip("finds elements based on multiple props", () => {
                // text, ords, properties, selectors
                // nots
                // some of those props are functions and others are EFs
            });

            it.skip("doesn't find elements based on multiple props", () => {

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

            it.skip("finds [counter x child element]", () => {

            });

            it.skip("doesn't find [counter x child elements]", () => {

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

        it.skip("finds elements based on 'contains text'", () => {
            // contains 'text'
        });

        it.skip("doesn't find elements based on 'contains text'", () => {

        });

        it.skip("finds elements based on 'contains exact'", () => {
            // contains exact 'text'
        });

        it.skip("doesn't find elements based on 'contains exact'", () => {

        });

        it.skip("finds elements based on 'innertext'", () => {
            // innertext 'text'
        });

        it.skip("doesn't find elements based on 'innertext'", () => {

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
