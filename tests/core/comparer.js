const chai = require('chai');
const expect = chai.expect;
const assert = chai.assert;
const Comparer = require('../../comparer.js');

describe.only("Comparer", () => {
    describe("comparison()", () => {
        context("plain comparison", () => {
            it("actual=string, expected=same string", () => {
                let obj = Comparer.comparison("foobar", "foobar");
                expect(Comparer.print(obj)).to.equal(`"foobar"`);
            });

            it("actual=string, expected=different string", () => {
                let obj = Comparer.comparison("foobar", "foobar2");
                expect(Comparer.print(obj)).to.equal(`"foobar"  -->  not "foobar2"`);
            });

            it("actual=string, expected=0", () => {
                let obj = Comparer.comparison("foobar", 0);
                expect(Comparer.print(obj)).to.equal(`"foobar"  -->  not 0`);
            });

            it("actual=string, expected=number", () => {
                let obj = Comparer.comparison("foobar", 7);
                expect(Comparer.print(obj)).to.equal(`"foobar"  -->  not 7`);
            });

            it("actual=string, expected=null", () => {
                let obj = Comparer.comparison("foobar", null);
                expect(Comparer.print(obj)).to.equal(`"foobar"  -->  not null`);
            });

            it("actual=string, expected=undefined", () => {
                let obj = Comparer.comparison("foobar", undefined);
                expect(Comparer.print(obj)).to.equal(`"foobar"  -->  not undefined`);
            });

            it("actual=string, expected=object", () => {
                let obj = Comparer.comparison("foobar", { text: "foobar"} );
                expect(Comparer.print(obj)).to.equal(`"foobar"  -->  not an object`);
            });

            it("actual=string, expected=array", () => {
                let obj = Comparer.comparison("foobar", [ "foobar" ] );
                expect(Comparer.print(obj)).to.equal(`"foobar"  -->  not an array`);
            });

            it("actual=number, expected=same number", () => {
                let obj = Comparer.comparison(7, 7);
                expect(Comparer.print(obj)).to.equal(`7`);
            });

            it("actual=number, expected=different number", () => {
                let obj = Comparer.comparison(7, 8);
                expect(Comparer.print(obj)).to.equal(`7  -->  not 8`);
            });

            it("actual=boolean, expected=same boolean", () => {
                let obj = Comparer.comparison(true, true);
                expect(Comparer.print(obj)).to.equal(`true`);

                obj = Comparer.comparison(false, false);
                expect(Comparer.print(obj)).to.equal(`false`);
            });

            it("actual=boolean, expected=different boolean", () => {
                let obj = Comparer.comparison(true, false);
                expect(Comparer.print(obj)).to.equal(`true  -->  not false`);
            });

            it("actual=null, expected=null", () => {
                let obj = Comparer.comparison(null, null);
                expect(Comparer.print(obj)).to.equal(`null`);
            });

            it("actual=null, expected=not null", () => {
                let obj = Comparer.comparison(null, 8);
                expect(Comparer.print(obj)).to.equal(`null  -->  not 8`);
            });

            it("actual=undefined, expected=undefined", () => {
                let obj = Comparer.comparison(undefined, undefined);
                expect(Comparer.print(obj)).to.equal(`undefined`);
            });

            it("actual=0, expected=null", () => {
                let obj = Comparer.comparison(0, null);
                expect(Comparer.print(obj)).to.equal(`0  -->  not null`);
            });

            it("actual=null, expected=undefined", () => {
                let obj = Comparer.comparison(null, undefined);
                expect(Comparer.print(obj)).to.equal(`null  -->  not undefined`);
            });

            it("actual={}, expected=undefined", () => {
                let obj = Comparer.comparison({}, undefined);
                expect(Comparer.print(obj)).to.equal(`{  -->  not undefined
}`);
            });

            it("actual={}, expected=null", () => {
                let obj = Comparer.comparison({}, null);
                expect(Comparer.print(obj)).to.equal(`{  -->  not null
}`);
            });

            it("actual=[], expected=undefined", () => {
                let obj = Comparer.comparison([], undefined);
                expect(Comparer.print(obj)).to.equal(`[  -->  not undefined
]`);
            });

            it("actual=[], expected=null", () => {
                let obj = Comparer.comparison([], null);
                expect(Comparer.print(obj)).to.equal(`[  -->  not null
]`);
            });

            it("actual=simple object, expected=same simple object", () => {
                let obj = Comparer.comparison({ one: 1, two: "2", three: 3, four: "4" }, { one: 1, two: "2", three: 3, four: "4" });
                expect(Comparer.print(obj)).to.equal(`{
    one: 1,
    two: "2",
    three: 3,
    four: "4"
}`);
            });

            it("actual=simple object, expected=same simple object but with a subset of keys", () => {
                let obj = Comparer.comparison({ one: 1, two: "2", three: 3, four: "4" }, { one: 1, two: "2" });
                expect(Comparer.print(obj)).to.equal(`{
    one: 1,
    two: "2",
    three: 3,
    four: "4"
}`);
            });

            it("actual=simple object, expected={}", () => {
                let obj = Comparer.comparison({ one: 1, two: "2", three: 3, four: "4" }, {});
                expect(Comparer.print(obj)).to.equal(`{
    one: 1,
    two: "2",
    three: 3,
    four: "4"
}`);
            });

            it("actual=simple object, expected=different simple object", () => {
                let obj = Comparer.comparison({ one: 1, two: "2", three: 3, four: "4" }, { one: 1, two: "5", three: null, five: "5", six: 6 });
                expect(Comparer.print(obj)).to.equal(`{  -->  missing key 'five', missing key 'six'
    one: 1,
    two: "2",  -->  not "5"
    three: 3,  -->  not null
    four: "4"
}`);
            });

            it("actual=simple array, expected=same simple array", () => {
                let obj = Comparer.comparison([ 1, "2", 3, null, false, undefined ], [ 1, "2", 3, null, false, undefined ]);
                expect(Comparer.print(obj)).to.equal(`[
    1,
    "2",
    3,
    null,
    false,
    undefined
]`);
            });

            it("actual=simple array, expected=same simple array but in a different order", () => {
                let obj = Comparer.comparison([ 1, "2", 3, null, false, undefined ], [ null, 1, "2", undefined, 3, false ]);
                expect(Comparer.print(obj)).to.equal(`[
    1,  -->  not null
    "2",  -->  not 1
    3,  -->  not "2"
    null,  -->  not undefined
    false,  -->  not 3
    undefined  -->  not false
]`);
            });

            it("actual=simple array, expected=different simple array", () => {
                let obj = Comparer.comparison([ 1, "2", 3, null, false, undefined ], [ 7, 8, 9 ]);
                expect(Comparer.print(obj)).to.equal(`[
    1,  -->  not 7
    "2",  -->  not 8
    3,  -->  not 9
    null,  -->  not expected
    false,  -->  not expected
    undefined  -->  not expected
]`);
            });

            it("actual=object containing objects/arrays/primitives, expected=same object", () => {
                let obj = Comparer.comparison({
                    one: 1,
                    two: "2",
                    three: null,
                    four: undefined,
                    "five six": "\"56\"",
                    seven: "",
                    eight: false,
                    nine: {
                        ten: 10,
                        eleven: "11",
                        twenty: {
                            twentyone: 21,
                            "22": "22"
                        },
                        twentythree: [
                            23,
                            24
                        ],
                        twentyfive: [],
                        twentysix: {}
                    },
                    twelve: [
                        1,
                        "2",
                        3,
                        true,
                        null,
                        false,
                        undefined,
                        {},
                        {
                            thirteen: 13,
                            fourteen: 14,
                            fifteen: [
                                16
                            ]
                        },
                        [],
                        [
                            17,
                            18,
                            [ 19 ]
                        ]
                    ]
                }, {
                    one: 1,
                    two: "2",
                    three: null,
                    four: undefined,
                    "five six": "\"56\"",
                    seven: "",
                    eight: false,
                    nine: {
                        ten: 10,
                        eleven: "11",
                        twenty: {
                            twentyone: 21,
                            "22": "22"
                        },
                        twentythree: [
                            23,
                            24
                        ],
                        twentyfive: [],
                        twentysix: {}
                    },
                    twelve: [
                        1,
                        "2",
                        3,
                        true,
                        null,
                        false,
                        undefined,
                        {},
                        {
                            thirteen: 13,
                            fourteen: 14,
                            fifteen: [
                                16
                            ]
                        },
                        [],
                        [
                            17,
                            18,
                            [ 19 ]
                        ]
                    ]
                });

                expect(Comparer.print(obj)).to.equal(`{
    one: 1,
    two: "2",
    three: null,
    four: undefined,
    "five six": "\\\"56\\\"",
    seven: "",
    eight: false,
    nine: {
        ten: 10,
        eleven: "11",
        twenty: {
            22: "22",
            twentyone: 21
        },
        twentythree: [
            23,
            24
        ],
        twentyfive: [
        ],
        twentysix: {
        }
    },
    twelve: [
        1,
        "2",
        3,
        true,
        null,
        false,
        undefined,
        {
        },
        {
            thirteen: 13,
            fourteen: 14,
            fifteen: [
                16
            ]
        },
        [
        ],
        [
            17,
            18,
            [
                19
            ]
        ]
    ]
}`);
            });

            it("actual=object containing objects/arrays/primitives, expected=same object but with a subset of keys", () => {
                let obj = Comparer.comparison({
                    one: 1,
                    two: "2",
                    three: null,
                    four: undefined,
                    "five six": "\"56\"",
                    seven: "",
                    eight: false,
                    nine: {
                        ten: 10,
                        eleven: "11",
                        twenty: {
                            twentyone: 21,
                            "22": "22"
                        },
                        twentythree: [
                            23,
                            24
                        ],
                        twentyfive: [],
                        twentysix: {}
                    },
                    twelve: [
                        1,
                        "2",
                        3,
                        true,
                        null,
                        false,
                        undefined,
                        {},
                        {
                            thirteen: 13,
                            fourteen: 14,
                            fifteen: [
                                16
                            ]
                        },
                        [],
                        [
                            17,
                            18,
                            [ 19 ]
                        ]
                    ]
                }, {
                    one: 1,
                    three: null,
                    four: undefined,
                    "five six": "\"56\"",
                    seven: "",
                    nine: {
                        ten: 10,
                        twenty: {
                            twentyone: 21,
                            "22": "22"
                        },
                        twentythree: [
                            23,
                            24
                        ],
                        twentysix: {}
                    },
                    twelve: [
                        1,
                        "2",
                        3,
                        true,
                        null,
                        false,
                        undefined,
                        {},
                        {
                            thirteen: 13,
                            fifteen: [
                                16
                            ]
                        },
                        [],
                        [
                            17,
                            18,
                            [ 19 ]
                        ]
                    ]
                });

                expect(Comparer.print(obj)).to.equal(`{
    one: 1,
    two: "2",
    three: null,
    four: undefined,
    "five six": "\\\"56\\\"",
    seven: "",
    eight: false,
    nine: {
        ten: 10,
        eleven: "11",
        twenty: {
            22: "22",
            twentyone: 21
        },
        twentythree: [
            23,
            24
        ],
        twentyfive: [
        ],
        twentysix: {
        }
    },
    twelve: [
        1,
        "2",
        3,
        true,
        null,
        false,
        undefined,
        {
        },
        {
            thirteen: 13,
            fourteen: 14,
            fifteen: [
                16
            ]
        },
        [
        ],
        [
            17,
            18,
            [
                19
            ]
        ]
    ]
}`);
            });

            it("actual=object containing objects/arrays/primitives, expected={}", () => {
                let obj = Comparer.comparison({
                    one: 1,
                    two: "2",
                    three: null,
                    four: undefined,
                    "five six": "\"56\"",
                    seven: "",
                    eight: false,
                    nine: {
                        ten: 10,
                        eleven: "11",
                        twenty: {
                            twentyone: 21,
                            "22": "22"
                        },
                        twentythree: [
                            23,
                            24
                        ],
                        twentyfive: [],
                        twentysix: {}
                    },
                    twelve: [
                        1,
                        "2",
                        3,
                        true,
                        null,
                        false,
                        undefined,
                        {},
                        {
                            thirteen: 13,
                            fourteen: 14,
                            fifteen: [
                                16
                            ]
                        },
                        [],
                        [
                            17,
                            18,
                            [ 19 ]
                        ]
                    ]
                }, {});

                expect(Comparer.print(obj)).to.equal(`{
    one: 1,
    two: "2",
    three: null,
    four: undefined,
    "five six": "\\\"56\\\"",
    seven: "",
    eight: false,
    nine: {
        ten: 10,
        eleven: "11",
        twenty: {
            22: "22",
            twentyone: 21
        },
        twentythree: [
            23,
            24
        ],
        twentyfive: [
        ],
        twentysix: {
        }
    },
    twelve: [
        1,
        "2",
        3,
        true,
        null,
        false,
        undefined,
        {
        },
        {
            thirteen: 13,
            fourteen: 14,
            fifteen: [
                16
            ]
        },
        [
        ],
        [
            17,
            18,
            [
                19
            ]
        ]
    ]
}`);
            });

            it("actual=object containing objects/arrays/primitives, expected=different object", () => {
                let obj = Comparer.comparison({
                    one: 1,
                    three: null,
                    four: undefined,
                    "five six": "\"56\"",
                    seven: "",
                    eight: false,
                    nine: {
                        ten: 10,
                        eleven: "11",
                        twenty: {
                            "22": "22"
                        },
                        twentythree: [
                            24
                        ],
                        twentyfive: [],
                        twentysix: {}
                    },
                    twelve: [
                        1,
                        "2",
                        3,
                        true,
                        null,
                        false,
                        undefined,
                        {
                            thirteen: 13,
                            fifteen: [
                                16
                            ]
                        },
                        [],
                        [
                            17,
                            []
                        ]
                    ]
                }, {
                    one: 1,
                    two: "2",
                    three: null,
                    four: undefined,
                    "five six": "\"56\"",
                    seven: "",
                    eight: false,
                    nine: {
                        ten: 10,
                        eleven: "11",
                        twenty: {
                            twentyone: 21,
                            "22": "22"
                        },
                        twentythree: [
                            23,
                            24
                        ],
                        twentyfive: [],
                        twentysix: {}
                    },
                    twelve: [
                        1,
                        "2",
                        3,
                        true,
                        null,
                        false,
                        undefined,
                        {},
                        {
                            thirteen: 13,
                            fourteen: 14,
                            fifteen: [
                                16
                            ]
                        },
                        [],
                        [
                            17,
                            18,
                            [ 19 ]
                        ]
                    ]
                });

                expect(Comparer.print(obj)).to.equal(`{  -->  missing key 'two'
    one: 1,
    three: null,
    four: undefined,
    "five six": "\\\"56\\\"",
    seven: "",
    eight: false,
    nine: {
        ten: 10,
        eleven: "11",
        twenty: {  -->  missing key 'twentyone'
            22: "22"
        },
        twentythree: [
            24,  -->  not 23
            undefined  -->  not 24
        ],
        twentyfive: [
        ],
        twentysix: {
        }
    },
    twelve: [
        1,
        "2",
        3,
        true,
        null,
        false,
        undefined,
        {
            thirteen: 13,
            fifteen: [
                16
            ]
        },
        [  -->  missing key 'thirteen', missing key 'fourteen', missing key 'fifteen'
        ],
        [
            17,  -->  not expected
            [  -->  not expected
            ]
        ],
        undefined  -->  not an array
    ]
}`);
            });
        });

        context("comparison with special expected objects", () => {
            context("$typeof", () => {
                it("expected=$typeof but not a string", () => {
                    assert.throws(() => {
                        let obj = Comparer.comparison("foobar6", { $typeof: 6 });
                    }, `typeof has to be a string: 6`);
                });

                it("expected=correct $typeof", () => {
                    let obj = Comparer.comparison(6, { $typeof: "number" });
                    expect(Comparer.print(obj)).to.equal(`6`);
                });

                it("expected=incorrect $typeof", () => {
                    let obj = Comparer.comparison(6, { $typeof: "string" });
                    expect(Comparer.print(obj)).to.equal(`6  -->  not $typeof string`);
                });

                it("actual=array, expected=$typeof array", () => {
                    let obj = Comparer.comparison([ 6 ], { $typeof: "array" });
                    expect(Comparer.print(obj)).to.equal(`[
    6
]`);
                });

                it("actual=non-array, expected=$typeof array", () => {
                    let obj = Comparer.comparison({}, { $typeof: "array" });
                    expect(Comparer.print(obj)).to.equal(`{  -->  not $typeof array
}`);
                });
            });

            context("$regex", () => {
                it("expected=$regex but not a regex or string", () => {
                    assert.throws(() => {
                        let obj = Comparer.comparison("foobar6", { $regex: 6 });
                    }, `$regex has to be a /regex/ or "regex": 6`);
                });

                it("actual=non-string, expected=$regex", () => {
                    let obj = Comparer.comparison(6, { $regex: /6/ });
                    expect(Comparer.print(obj)).to.equal(`6  -->  isn't a string so can't match $regex /6/`);

                    obj = Comparer.comparison(6, { $regex: "6" });
                    expect(Comparer.print(obj)).to.equal(`6  -->  isn't a string so can't match $regex /6/`);
                });

                it("expected=correct $regex in /regex/ form", () => {
                    let obj = Comparer.comparison("foobar", { $regex: /foo[a-z]+/ });
                    expect(Comparer.print(obj)).to.equal(`"foobar"`);
                });

                it("expected=incorrect $regex in /regex/ form", () => {
                    let obj = Comparer.comparison("foobar", { $regex: /foo\\z[a-z]+/ });
                    expect(Comparer.print(obj)).to.equal(`"foobar"  -->  doesn't match $regex /foo\\\\z[a-z]+/`);
                });

                it("expected=correct $regex in string form", () => {
                    let obj = Comparer.comparison("foobar", { $regex: "foo[a-z]+" });
                    expect(Comparer.print(obj)).to.equal(`"foobar"`);
                });

                it("expected=incorrect $regex in string form", () => {
                    let obj = Comparer.comparison("foobar", { $regex: "foo\\\\z[a-z]+" });
                    expect(Comparer.print(obj)).to.equal(`"foobar"  -->  doesn't match $regex /foo\\\\z[a-z]+/`);
                });
            });

            context("$contains", () => {
                it("expected=$contains but not a string", () => {
                    assert.throws(() => {
                        let obj = Comparer.comparison("foobar6", { $contains: 6 });
                    }, `$contains has to be a string: 6`);
                });

                it("actual=non-string, expected=$contains", () => {
                    let obj = Comparer.comparison(6, { $contains: "oo" });
                    expect(Comparer.print(obj)).to.equal(`6  -->  isn't a string so can't $contains "oo"`);
                });

                it("expected=correct $contains", () => {
                    let obj = Comparer.comparison("foobar", { $contains: "oo" });
                    expect(Comparer.print(obj)).to.equal(`"foobar"`);
                });

                it("expected=incorrect $contains", () => {
                    let obj = Comparer.comparison("foobar", { $contains: "hoo" });
                    expect(Comparer.print(obj)).to.equal(`"foobar"  -->  doesn't $contains "hoo"`);
                });
            });

            context("$max", () => {
                it("expected=$max but not a number", () => {
                    assert.throws(() => {
                        let obj = Comparer.comparison(8, { $max: "10" });
                    }, `$max has to be a number: "10"`);
                });

                it("actual=non-number, expected=$max", () => {
                    let obj = Comparer.comparison("8", { $max: 10 });
                    expect(Comparer.print(obj)).to.equal(`"8"  -->  isn't a number so can't have a $max of 10`);
                });

                it("expected=correct $max", () => {
                    let obj = Comparer.comparison(8, { $max: 10 });
                    expect(Comparer.print(obj)).to.equal(`8`);

                    obj = Comparer.comparison(8, { $max: 8 });
                    expect(Comparer.print(obj)).to.equal(`8`);
                });

                it("expected=incorrect $max", () => {
                    let obj = Comparer.comparison(8, { $max: 7 });
                    expect(Comparer.print(obj)).to.equal(`8  -->  is greater than the $max of 7`);
                });
            });

            context("$min", () => {
                it("expected=$min but not a number", () => {
                    assert.throws(() => {
                        let obj = Comparer.comparison(8, { $min: "2" });
                    }, `$min has to be a number: "2"`);
                });

                it("actual=non-number, expected=$min", () => {
                    let obj = Comparer.comparison("8", { $min: 2 });
                    expect(Comparer.print(obj)).to.equal(`"8"  -->  isn't a number so can't have a $min of 2`);
                });

                it("expected=correct $min", () => {
                    let obj = Comparer.comparison(8, { $min: 2 });
                    expect(Comparer.print(obj)).to.equal(`8`);

                    obj = Comparer.comparison(8, { $min: 8 });
                    expect(Comparer.print(obj)).to.equal(`8`);
                });

                it("expected=incorrect $min", () => {
                    let obj = Comparer.comparison(8, { $min: 10 });
                    expect(Comparer.print(obj)).to.equal(`8  -->  is less than the $min of 10`);
                });
            });

            context("$code", () => {
                it("expected=$code but not function or string", () => {
                    assert.throws(() => {
                        let obj = Comparer.comparison("foobar", { $code: null });
                    }, `code has to be a function or string: null`);
                });

                it("expected=$code function that returns true", () => {
                    let obj = Comparer.comparison("Foobar", { $code: (actual) => { return actual.toLowerCase() == "foobar"; } });
                    expect(Comparer.print(obj)).to.equal(`"Foobar"`);
                });

                it("expected=$code function that returns false", () => {
                    let obj = Comparer.comparison("Foobar", { $code: (actual) => { return actual.toLowerCase() == "hoo"; } });
                    expect(Comparer.print(obj)).to.equal(`"Foobar"  -->  failed the $code '(actual) => { return actual.toLowerCase() == "hoo"; }'`);
                });

                it("expected=$code function that throws an exception", () => {
                    assert.throws(() => {
                        let obj = Comparer.comparison("Foobar", { $code: (actual) => { throw new Error("oops"); } });
                    }, "oops");
                });

                it("expected=$code string that returns true", () => {
                    let obj = Comparer.comparison("Foobar", { $code: 'return actual.toLowerCase() == "foobar"' });
                    expect(Comparer.print(obj)).to.equal(`"Foobar"`);
                });

                it("expected=$code string that returns false", () => {
                    let obj = Comparer.comparison("Foobar", { $code: 'return actual.toLowerCase() == "hoo";' });
                    expect(Comparer.print(obj)).to.equal(`"Foobar"  -->  failed the $code 'return actual.toLowerCase() == "hoo";'`);
                });

                it("expected=$code string that throws an exception", () => {
                    assert.throws(() => {
                        let obj = Comparer.comparison("Foobar", { $code: 'throw new Error("oops");' });
                    }, "oops");
                });

                it("expected=$code string that evaluates true", () => {
                    let obj = Comparer.comparison("Foobar", { $code: 'actual.toLowerCase() == "foobar"' });
                    expect(Comparer.print(obj)).to.equal(`"Foobar"`);
                });

                it("expected=$code string that evaluates false", () => {
                    let obj = Comparer.comparison("Foobar", { $code: 'actual.toLowerCase() == "hoo"' });
                    expect(Comparer.print(obj)).to.equal(`"Foobar"  -->  failed the $code 'actual.toLowerCase() == "hoo"'`);
                });
            });

            context("$length", () => {
                it("expected=$length but not a number", () => {
                    assert.throws(() => {
                        let obj = Comparer.comparison([], { $length: "2" });
                    }, `$length has to be a number: "2"`);
                });

                it("actual=non-object, expected=$length", () => {
                    let obj = Comparer.comparison("8", { $length: 2 });
                    expect(Comparer.print(obj)).to.equal(`"8"  -->  isn't an object or array so can't have a $length of 2`);
                });

                it("actual=object with no length property, expected=$length", () => {
                    let obj = Comparer.comparison({}, { $length: 2 });
                    expect(Comparer.print(obj)).to.equal(`{  -->  doesn't have a length property so can't have a $length of 2
}`);
                });

                it("expected=correct $length", () => {
                    let obj = Comparer.comparison([1, 2], { $length: 2 });
                    expect(Comparer.print(obj)).to.equal(`[
    1,
    2
]`);
                });

                it("expected=incorrect $length", () => {
                    let obj = Comparer.comparison([1, 2], { $length: 3 });
                    expect(Comparer.print(obj)).to.equal(`[  -->  doesn't have a $length of 3
    1,
    2
]`);
                });
            });

            context("$maxLength", () => {
                it("expected=$maxLength but not a number", () => {
                    assert.throws(() => {
                        let obj = Comparer.comparison([], { $maxLength: "2" });
                    }, `$maxLength has to be a number: "2"`);
                });

                it("actual=non-object, expected=$maxLength", () => {
                    let obj = Comparer.comparison("8", { $maxLength: 2 });
                    expect(Comparer.print(obj)).to.equal(`"8"  -->  isn't an object or array so can't have a $maxLength of 2`);
                });

                it("actual=object with no length property, expected=$maxLength", () => {
                    let obj = Comparer.comparison({}, { $maxLength: 2 });
                    expect(Comparer.print(obj)).to.equal(`{  -->  doesn't have a length property so can't have a $maxLength of 2
}`);
                });

                it("expected=correct $maxLength", () => {
                    let obj = Comparer.comparison([1, 2], { $maxLength: 2 });
                    expect(Comparer.print(obj)).to.equal(`[
    1,
    2
]`);

                    obj = Comparer.comparison([1, 2], { $maxLength: 3 });
                    expect(Comparer.print(obj)).to.equal(`[
    1,
    2
]`);
                });

                it("expected=incorrect $maxLength", () => {
                    let obj = Comparer.comparison([1, 2], { $maxLength: 1 });
                    expect(Comparer.print(obj)).to.equal(`[  -->  is longer than the $maxLength of 1
    1,
    2
]`);
                });
            });

            context("$minLength", () => {
                it("expected=$minLength but not a number", () => {
                    assert.throws(() => {
                        let obj = Comparer.comparison([], { $minLength: "2" });
                    }, `$minLength has to be a number: "2"`);
                });

                it("actual=non-object, expected=$minLength", () => {
                    let obj = Comparer.comparison("8", { $minLength: 2 });
                    expect(Comparer.print(obj)).to.equal(`"8"  -->  isn't an object or array so can't have a $minLength of 2`);
                });

                it("actual=object with no length property, expected=$minLength", () => {
                    let obj = Comparer.comparison({}, { $minLength: 2 });
                    expect(Comparer.print(obj)).to.equal(`{  -->  doesn't have a length property so can't have a $minLength of 2
}`);
                });

                it("expected=correct $minLength", () => {
                    let obj = Comparer.comparison([1, 2], { $minLength: 2 });
                    expect(Comparer.print(obj)).to.equal(`[
    1,
    2
]`);

                    obj = Comparer.comparison([1, 2], { $minLength: 1 });
                    expect(Comparer.print(obj)).to.equal(`[
    1,
    2
]`);
                });

                it("expected=incorrect $minLength", () => {
                    let obj = Comparer.comparison([1, 2], { $minLength: 3 });
                    expect(Comparer.print(obj)).to.equal(`[  -->  is shorter than the $minLength of 3
    1,
    2
]`);
                });
            });

            context("$subset", () => {
                it.skip("actual=non-array, expected=$subset", () => {

                });

                it.skip("actual=array of primitives, expected=$subset with same exact array of primitives", () => {

                });

                it.skip("actual=array of primitives, expected=correct $subset", () => {

                });

                it.skip("actual=array of primitives, expected=incorrect $subset", () => {

                });

                it.skip("actual=array of objects/arrays/primitives, expected=correct $subset", () => {

                });

                it.skip("actual=array of objects/arrays/primitives, expected=incorrect $subset", () => {

                });
            });

            context("$anyOrder", () => {
                it.skip("actual=non-array, expected=$anyOrder", () => {

                });

                it.skip("actual=array of primitives, expected=$anyOrder with array of primitives in the same order", () => {

                });

                it.skip("actual=array of primitives, expected=correct $anyOrder", () => {

                });

                it.skip("actual=array of primitives, expected=incorrect $anyOrder", () => {

                });

                it.skip("actual=array of objects/arrays/primitives, expected=correct $anyOrder", () => {

                });

                it.skip("actual=array of objects/arrays/primitives, expected=incorrect $anyOrder", () => {

                });
            });

            context("$exact", () => {
                it.skip("actual=non-object, expected=$exact", () => {

                });

                it.skip("actual=simple object, expected=$exact with same simple object", () => {

                });

                it.skip("actual=simple object, expected=$exact with same simple object but with subset of keys", () => {
                    // should fail
                });

                it.skip("actual=simple object, expected=$exact with different simple object", () => {

                });

                it.skip("actual=object containing objects/arrays/primitives, expected=$exact with same object", () => {

                });

                it.skip("actual=object containing objects/arrays/primitives, expected=$exact with same object but with subset of keys", () => {
                    // should fail
                });

                it.skip("actual=object containing objects/arrays/primitives, expected=$exact with different object", () => {

                });
            });

            context("$every", () => {
                it.skip("actual=non-array, expected=$every", () => {

                });

                it.skip("actual=array of primitives, expected=correct $every", () => {

                });

                it.skip("actual=array of primitives, expected=incorrect $every", () => {

                });

                it.skip("actual=array of objects/arrays/primitives, expected=correct $every", () => {

                });

                it.skip("actual=array of objects/arrays/primitives, expected=incorrect $every", () => {

                });
            });

            context("multiple constraints in one special expected object", () => {
                it.skip("expected=multiple contrains that are correct", () => {
                    // make sure you to $subset and $anyOrder together
                });

                it.skip("expected=multiple contrains where one is incorrect", () => {

                });
            });
        });
    });

    describe("compareObj()", () => {
        it("doesn't throw an exception if there's no error and doesn't edit the objects sent in", () => {
            let actual = { one: "foobar" };
            let expected = { one: "foobar" };

            Comparer.compareObj(actual, expected);

            expect(actual).to.eql( { one: "foobar" } );
            expect(expected).to.eql( { one: "foobar" } );
        });

        it("throws an exception on error and doesn't edit the objects sent in", () => {
            let actual = { one: "foobar" };
            let expected = { one: "foobar2" };
            assert.throws(() => {
                Comparer.compareObj(actual, expected);
            }, `{
    one: "foobar"  -->  not "foobar2"
}`);

            expect(actual).to.eql( { one: "foobar" } );
            expect(expected).to.eql( { one: "foobar2" } );
        });
    });

    describe("hasErrors()", () => {
        it("returns false on a primitive", () => {
            let failed = Comparer.hasErrors(5);
            expect(failed).to.be.false;
        });

        it("returns false on a simple object", () => {
            let failed = Comparer.hasErrors({one: 1});
            expect(failed).to.be.false;
        });

        it("returns false on a simple array", () => {
            let failed = Comparer.hasErrors([1, 2]);
            expect(failed).to.be.false;
        });

        it("returns true when there are errors in an object inside a complex object", () => {
            let failed = Comparer.hasErrors({
                $comparerNode: true,
                errors: [],
                value: {
                    one: 1,
                    two: [
                        22,
                        undefined,
                        {
                            $comparerNode: true,
                            errors: [],
                            value: 33
                        }
                    ],
                    three: {
                        $comparerNode: true,
                        errors: [ "oops" ],
                        value: 3
                    },
                    four: null
                }
            });
            expect(failed).to.be.true;
        });

        it("returns true when there are errors in an array inside a complex object", () => {
            failed = Comparer.hasErrors({
                $comparerNode: true,
                errors: [],
                value: {
                    one: 1,
                    two: [
                        22,
                        undefined,
                        {
                            $comparerNode: true,
                            errors: [ "oops" ],
                            value: 33
                        }
                    ],
                    three: {
                        $comparerNode: true,
                        errors: [],
                        value: 3
                    },
                    four: null
                }
            });
            expect(failed).to.be.true;
        });

        it("returns false when there are no errors in a complex object", () => {
            failed = Comparer.hasErrors({
                $comparerNode: true,
                errors: [],
                value: {
                    one: 1,
                    two: [
                        22,
                        undefined,
                        {
                            $comparerNode: true,
                            errors: [],
                            value: 33
                        }
                    ],
                    three: {
                        $comparerNode: true,
                        errors: [],
                        value: 3
                    },
                    four: null
                }
            });
            expect(failed).to.be.false;
        });
    });

    describe("print()", () => {
        it("prints a null", () => {
            let printed = Comparer.print(null);
            expect(printed).to.equal(`null`);
        });

        it("prints an undefined", () => {
            let printed = Comparer.print(undefined);
            expect(printed).to.equal(`undefined`);
        });

        it("prints an empty string", () => {
            let printed = Comparer.print("");
            expect(printed).to.equal(`""`);
        });

        it("prints a string", () => {
            let printed = Comparer.print("foobar");
            expect(printed).to.equal(`"foobar"`);
        });

        it("prints a number", () => {
            let printed = Comparer.print(6);
            expect(printed).to.equal(`6`);
        });

        it("prints a boolean", () => {
            let printed = Comparer.print(false);
            expect(printed).to.equal(`false`);
        });

        it("prints an empty object", () => {
            let printed = Comparer.print({});
            expect(printed).to.equal(`{
}`);
        });

        it("prints an empty array", () => {
            let printed = Comparer.print([]);
            expect(printed).to.equal(`[
]`);
        });

        it("prints a simple object", () => {
            let printed = Comparer.print( { one: 1, two: "2", "three 3": 3 } );
            expect(printed).to.equal(`{
    one: 1,
    two: "2",
    "three 3": 3
}`);
        });

        it("prints a simple array", () => {
            let printed = Comparer.print( [ 1, "2" ] );
            expect(printed).to.equal(`[
    1,
    "2"
]`);
        });

        it("prints a complex object containing objects/arrays/primitives and that contains errors", () => {
            let printed = Comparer.print({
                $comparerNode: true,
                errors: [],
                value: {
                    one: 1,
                    two: [
                        22,
                        undefined,
                        {
                            $comparerNode: true,
                            errors: [ "oops1" ],
                            value: 33
                        }
                    ],
                    three: {
                        $comparerNode: true,
                        errors: [ "oops2", "oops3" ],
                        value: 3
                    },
                    four: null
                }
            });
            expect(printed).to.equal(`{
    one: 1,
    two: [
        22,
        undefined,
        33  -->  oops1
    ],
    three: 3,  -->  oops2, oops3
    four: null
}`);
        });

        it("prints a complex object containing objects/arrays/primitives and that doesn't contain errors", () => {
            let printed = Comparer.print({
                $comparerNode: true,
                errors: [],
                value: {
                    one: 1,
                    two: [
                        22,
                        undefined,
                        {
                            $comparerNode: true,
                            errors: [],
                            value: 33
                        }
                    ],
                    three: {
                        $comparerNode: true,
                        errors: [],
                        value: 3
                    },
                    four: null
                }
            });
            expect(printed).to.equal(`{
    one: 1,
    two: [
        22,
        undefined,
        33
    ],
    three: 3,
    four: null
}`);
        });
    });
});
