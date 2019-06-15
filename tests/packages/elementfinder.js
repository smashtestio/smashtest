const chai = require('chai');
const expect = chai.expect;
const assert = chai.assert;
const util = require('util');
const utils = require('../../utils.js');
const {Builder, By, Key, until} = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const ElementFinder = require('../../packages/js/elementfinder.js');
const Comparer = require('../../packages/js/comparer.js');

describe("ElementFinder", function() {
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
            context("'text'", () => {
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
            });

            context("defined prop", () => {
                it("defined property set to an EF", () => {
                    let definedProps = ElementFinder.defaultProps();
                    definedProps.b = [ (elems, input) => true ];
                    definedProps.bold = [ new ElementFinder(`b`, definedProps) ];

                    let ef = new ElementFinder(`bold`, definedProps);

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
            });

            context("selector", () => {
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

                it("selectors with one single quote", () => {
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

                it("selectors with two single quotes", () => {
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

                it("selectors with one double quote", () => {
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

                it("selectors with two double quotes", () => {
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
            });

            context("ord", () => {
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
            });

            context("counter", () => {
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

                it("max < min throws error", () => {
                    assert.throws(() => {
                        new ElementFinder(`7-6 x something`);
                    }, `A counter's max cannot be less than its min [line:1]`);
                });
            });

            context("element array", () => {
                it("empty element array", () => {
                    let ef = new ElementFinder(`* something`);

                    Comparer.expect(ef).to.match({
                        counter: { min: 0 },
                        isElemArray: true,

                        props: [ { prop: `something` }, { prop: `visible` } ],

                        parent: undefined,
                        children: []
                    });
                });

                it("throws error if an element array has a counter", () => {
                    assert.throws(() => {
                        new ElementFinder(`* 4 x something`);
                    }, `An element array is not allowed to have a counter [line:1]`);

                    assert.throws(() => {
                        new ElementFinder(`* [4 x something]`);
                    }, `An element array is not allowed to have a counter [line:1]`);
                });
            });

            context("[match me]", () => {
                it("[match me]", () => {
                    let ef = new ElementFinder(`[something]`);

                    Comparer.expect(ef).to.match({
                        counter: { min: 1, max: 1 },
                        matchMe: true,

                        props: [ { prop: `something` }, { prop: `visible` } ],

                        parent: undefined,
                        children: []
                    });
                });

                it("[counter x match me]", () => {
                    let ef = new ElementFinder(`[4 x something]`);

                    Comparer.expect(ef).to.match({
                        counter: { min: 4, max: 4 },
                        matchMe: true,

                        props: [ { prop: `something` }, { prop: `visible` } ],

                        parent: undefined,
                        children: []
                    });
                });

                it("counter x [selector]", () => {
                    let ef = new ElementFinder(`4 x [something]`);

                    Comparer.expect(ef).to.match({
                        counter: { min: 4, max: 4 },
                        matchMe: undefined,

                        props: [ { prop: `[something]` }, { prop: `visible` } ],

                        parent: undefined,
                        children: []
                    });
                });

                it("* [match me element array]", () => {
                    let ef = new ElementFinder(`* [something]`);

                    Comparer.expect(ef).to.match({
                        counter: { min: 0 },
                        matchMe: true,
                        isElemArray: true,

                        props: [ { prop: `something` }, { prop: `visible` } ],

                        parent: undefined,
                        children: []
                    });
                });
            });

            context("keywords", () => {
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
            });

            context("comment", () => {
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
            });

            context("multiple props", () => {
                it("multiple props separated by commas", () => {
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

                it("multiple props separated by commas with extra whitespace everywhere", () => {
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

                it("multiple props separated by commas, including selectors with quotes inside", () => {
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
            });

            context("quotes", () => {
                it("'text' containing commas and escaped quotes", () => {
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

                it("selector containing quotes and commas", () => {
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

                it("defined property with 'input text' containing commas and escaped quotes", () => {
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

                it("defined property with 'input text' containing a selector, which contains quotes and commas", () => {
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
            });

            context("'visible' property", () => {
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
        });

        context("multi-line EF", () => {
            context("generic parsing", () => {
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

            context("implicit body EF", () => {
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
                });

                it("inserts implicit body EF if more than one line is at indent 0, more complex example", () => {
                    let ef = new ElementFinder(`
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
            });

            context("keywords", () => {
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
            });

            context("element array", () => {
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
            });

            context("[match me]", () => {
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
            });
        });
    });

    describe("parseObj()", () => {
        it("parses a one-line EF", () => {
            let ef = new ElementFinder(`'text1', div, selected`);
            let efClone = JSON.parse(ef.serializeJSON()).ef;
            efClone = ElementFinder.parseObj(efClone);

            Comparer.expect(efClone).to.match({
                counter: { min: 1, max: 1 },
                props: [
                    {
                        prop: `'text1'`,
                        def: `contains`,
                        input: `text1`,
                        not: undefined
                    },
                    {
                        prop: `div`,
                        def: `selector`,
                        input: `div`,
                        not: undefined
                    },
                    {
                       prop: `selected`,
                       def: `selected`,
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

            expect(efClone instanceof ElementFinder).to.be.true;
        });

        it("parses a multi-line EF", () => {
            let ef = new ElementFinder(`
                'text1', div, selected
                    child1
                        3 x child2
                    child3
            `);
            let efClone = JSON.parse(ef.serializeJSON()).ef;
            efClone = ElementFinder.parseObj(efClone);

            Comparer.expect(efClone).to.match({
                counter: { min: 1, max: 1 },
                props: [
                    {
                        prop: `'text1'`,
                        def: `contains`,
                        input: `text1`,
                        not: undefined
                    },
                    {
                        prop: `div`,
                        def: `selector`,
                        input: `div`,
                        not: undefined
                    },
                    {
                       prop: `selected`,
                       def: `selected`,
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
                children: [
                    {
                        counter: { min: 1, max: 1 },
                        props: [
                            {
                                prop: `child1`,
                                def: `selector`,
                                input: `child1`,
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
                                counter: { min: 3, max: 3 },
                                props: [
                                    {
                                        prop: `child2`,
                                        def: `selector`,
                                        input: `child2`,
                                        not: undefined
                                    },
                                    {
                                       prop: `visible`,
                                       def: `visible`,
                                       input: undefined,
                                       not: undefined
                                    }
                                ],
                                children: [],
                            }
                        ]
                    },
                    {
                        counter: { min: 1, max: 1 },
                        props: [
                            {
                                prop: `child3`,
                                def: `selector`,
                                input: `child3`,
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
                ]
            });

            expect(efClone instanceof ElementFinder).to.be.true;
            expect(efClone.children[0] instanceof ElementFinder).to.be.true;
            expect(efClone.children[0].children[0] instanceof ElementFinder).to.be.true;
            expect(efClone.children[1] instanceof ElementFinder).to.be.true;
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

        it("prints a multi-line EF with the 'subset' keyword", () => {
            let ef = new ElementFinder(`
                one
                    subset

                    two
                    three
            `);

            expect(ef.print()).to.equal(`one
    subset
    two
    three`);
        });

        it("prints a multi-line EF with the 'any order' keyword", () => {
            let ef = new ElementFinder(`
                one
                    any order

                    two
                    three
            `);

            expect(ef.print()).to.equal(`one
    any order
    two
    three`);
        });

        it("prints a multi-line EF with the 'subset' and 'any order' keywords", () => {
            let ef = new ElementFinder(`
                one
                    any order
                    subset

                    two
                    three
            `);

            expect(ef.print()).to.equal(`one
    any order
    subset
    two
    three`);
        });

        it("prints an element array EF", () => {
            let ef = new ElementFinder(`
                * one
                    two
                    three
            `);

            expect(ef.print()).to.equal(`* one
    two
    three`);
        });

        it("prints multiple nested element arrays in an EF", () => {
            let ef = new ElementFinder(`
                * one
                    two
                    * three
                        four
                    five
            `);

            expect(ef.print()).to.equal(`* one
    two
    * three
        four
    five`);
        });

        it("prints a [match me] EF", () => {
            let ef = new ElementFinder(`
                one
                    [two]
                    three
            `);

            expect(ef.print()).to.equal(`one
    [two]
    three`);
        });

        it("prints a multiple [match mes] in an EF", () => {
            let ef = new ElementFinder(`
                [one]
                    * [two]
                        three
                        [ 5 x four ]
            `);

            expect(ef.print()).to.equal(`[one]
    * [two]
        three
        [ 5 x four ]`);
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

    describe("hasErrors()", () => {
        it("returns false if there are no errors", () => {
            let ef = new ElementFinder(`one`);
            expect(ef.hasErrors()).to.be.false;

            ef = new ElementFinder(`
                one
                    two
                        three
            `);
            expect(ef.hasErrors()).to.be.false;
        });

        it("returns true if there is an error on the top EF", () => {
            let ef = new ElementFinder(`one`);
            ef.error = 'oops';
            expect(ef.hasErrors()).to.be.true;
        });

        it("returns true if there is a block error on the top EF", () => {
            let ef = new ElementFinder(`one`);
            ef.blockErrors = ['oops'];
            expect(ef.hasErrors()).to.be.true;
        });

        it("returns true if there is an error on a descendant", () => {
            let ef = new ElementFinder(`
                one
                    two
                        three
                    four
                        five
            `);
            ef.children[1].children[0].error = 'oops';
            expect(ef.hasErrors()).to.be.true;
        });

        it("returns true if there is a block error on a descendant", () => {
            let ef = new ElementFinder(`
                one
                    two
                        three
                    four
                        five
            `);
            ef.children[1].children[0].blockErrors = ['oops'];
            expect(ef.hasErrors()).to.be.true;
        });
    });

    describe("serialize()", () => {
        it("serializes a one-line EF", () => {
            let ef = new ElementFinder(`one`);

            Comparer.expect(ef.serialize()).to.match({
                fullStr: `one`,
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
                fullStr:
`one
    subset
    two`,
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
                        fullStr: undefined,
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

        it("handles a prop set to an EF", () => {
            let definedProps = ElementFinder.defaultProps();
            definedProps.big = [ new ElementFinder(`selector '.big'`, definedProps) ];

            let ef = new ElementFinder(`big`, definedProps);
            let json = ef.serializeJSON();
            let obj = JSON.parse(json);

            Comparer.expect(obj).to.match({
                ef: {
                    line: `big`,
                    counter: { min: 1, max: 1 },
                    props: [
                        {
                            prop: `big`,
                            def: `big`,
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
                    children: []
                },
                definedProps: {
                    big: [
                        {
                            line: `selector '.big'`,
                            counter: { min: 1, max: 1 },
                            props: [
                                {
                                    prop: `selector '.big'`,
                                    def: `selector`,
                                    input: `.big`
                                },
                                {
                                    prop: `visible`,
                                    def: `visible`
                                }
                            ],
                            children: []
                        }
                    ],
                    visible: [ { $typeof: 'string' } ],
                    selector: [ { $typeof: 'string' } ]
                }
            });
        });

        it("handles a prop set to an EF with a prop set to an EF", () => {
            let definedProps = ElementFinder.defaultProps();
            definedProps.big = [ new ElementFinder(`selector '.big'`, definedProps) ];
            definedProps.bigger = [ new ElementFinder(`big`, definedProps) ];

            let ef = new ElementFinder(`bigger`, definedProps);
            let json = ef.serializeJSON();
            let obj = JSON.parse(json);

            Comparer.expect(obj).to.match({
                ef: {
                    line: `bigger`,
                    counter: { min: 1, max: 1 },
                    props: [
                        {
                            prop: `bigger`,
                            def: `bigger`,
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
                    children: []
                },
                definedProps: {
                    big: [
                        {
                            line: `selector '.big'`,
                            counter: { min: 1, max: 1 },
                            props: [
                                {
                                    prop: `selector '.big'`,
                                    def: `selector`,
                                    input: `.big`
                                },
                                {
                                    prop: `visible`,
                                    def: `visible`,
                                    input: undefined,
                                }
                            ],
                            children: []
                        }
                    ],
                    bigger: [
                        {
                            line: `big`,
                            counter: { min: 1, max: 1 },
                            props: [
                                {
                                    prop: `big`,
                                    def: `big`,
                                    input: undefined,
                                },
                                {
                                    prop: `visible`,
                                    def: `visible`,
                                    input: undefined,
                                }
                            ],
                            children: []
                        }
                    ],
                    visible: [ { $typeof: 'string' } ],
                    selector: [ { $typeof: 'string' } ]
                }
            });
        });

        // NOTE: This test skipped because it fails when running nyc code coverage
        it.skip("handles a prop set to a function", () => {
            let definedProps = ElementFinder.defaultProps();
            definedProps.big = [ (elems, input) => elems.filter(elem => elem.className == 'big') ];

            let ef = new ElementFinder(`big`, definedProps);
            let json = ef.serializeJSON();
            let obj = JSON.parse(json);

            Comparer.expect(obj).to.match({
                ef: {
                    line: `big`,
                    counter: { min: 1, max: 1 },
                    props: [
                        {
                            prop: `big`,
                            def: `big`,
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
                    children: []
                },
                definedProps: {
                    big: [ `(elems, input) => elems.filter(elem => elem.className == 'big')` ]
                }
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

    // NOTE: See elementfinder.smash for unit tests for getAll(), find(), findAll(), not(), and defaultProps()
});
