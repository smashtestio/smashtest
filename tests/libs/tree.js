const chai = require('chai');
const chaiSubset = require('chai-subset');
const chaiSubsetInOrder = require('chai-subset-in-order');
const expect = chai.expect;
const assert = chai.assert;
const util = require('util');
const utils = require('../../utils.js');
const Tree = require('../../tree.js');
const Branch = require('../../branch.js');
const Step = require('../../step.js');

chai.use(chaiSubset);
chai.use(chaiSubsetInOrder);

describe("Tree", function() {
    describe("numIndents()", function() {
        var tree = new Tree();

        it("counts spaces properly", function() {
            assert.equal(tree.numIndents('m ', 'file.txt', 10), 0);
            assert.equal(tree.numIndents('blah', 'file.txt', 10), 0);
            assert.equal(tree.numIndents('    blah blah', 'file.txt', 10), 1);
            assert.equal(tree.numIndents('        blah  \t ', 'file.txt', 10), 2);
        });

        it("throws an exception for non-whitespace at the beginning of a step", function() {
            assert.throws(() => {
                tree.numIndents('\tblah', 'file.txt', 10);
            }, "Spaces are the only type of whitespace allowed at the beginning of a step [file.txt:10]");

            assert.throws(() => {
                tree.numIndents(' \tblah', 'file.txt', 10);
            }, "Spaces are the only type of whitespace allowed at the beginning of a step [file.txt:10]");
        });

        it("throws an exception for a number of spaces not a multiple of 4", function() {
            assert.throws(() => {
                tree.numIndents(' blah', 'file.txt', 10);
            }, "The number of spaces at the beginning of a step must be a multiple of 4. You have 1 space(s). [file.txt:10]");

            assert.throws(() => {
                tree.numIndents('  blah', 'file.txt', 10);
            }, "The number of spaces at the beginning of a step must be a multiple of 4. You have 2 space(s). [file.txt:10]");

            assert.throws(() => {
                tree.numIndents('   blah', 'file.txt', 10);
            }, "The number of spaces at the beginning of a step must be a multiple of 4. You have 3 space(s). [file.txt:10]");

            assert.throws(() => {
                tree.numIndents('     blah', 'file.txt', 10);
            }, "The number of spaces at the beginning of a step must be a multiple of 4. You have 5 space(s). [file.txt:10]");
        });

        it("returns 0 for an empty string or all-whitespace string", function() {
            assert.equal(tree.numIndents('', 'file.txt', 10), 0);
            assert.equal(tree.numIndents(' ', 'file.txt', 10), 0);
            assert.equal(tree.numIndents('  ', 'file.txt', 10), 0);
            assert.equal(tree.numIndents('     ', 'file.txt', 10), 0);
            assert.equal(tree.numIndents('        ', 'file.txt', 10), 0);
            assert.equal(tree.numIndents('    \t   ', 'file.txt', 10), 0);
        });

        it("returns 0 for a string that's entirely a comment", function() {
            assert.equal(tree.numIndents('//', 'file.txt', 10), 0);
            assert.equal(tree.numIndents('// blah', 'file.txt', 10), 0);
            assert.equal(tree.numIndents('//blah', 'file.txt', 10), 0);
            assert.equal(tree.numIndents(' //', 'file.txt', 10), 0);
            assert.equal(tree.numIndents(' // blah', 'file.txt', 10), 0);
            assert.equal(tree.numIndents(' //blah', 'file.txt', 10), 0);
            assert.equal(tree.numIndents('    //', 'file.txt', 10), 0);
            assert.equal(tree.numIndents('    // blah', 'file.txt', 10), 0);
            assert.equal(tree.numIndents('    //blah', 'file.txt', 10), 0);
        });
    });

    describe("parseLine()", function() {
        var tree = new Tree();

        it("parses a line with a string", function() {
            var step = tree.parseLine(`Click "Big Red Button"`, "file.txt", 10);
            assert.equal(step.filename, 'file.txt');
            assert.equal(step.lineNumber, 10);
            assert.equal(step.line, `Click "Big Red Button"`);
            assert.equal(step.text, `Click "Big Red Button"`);
            assert.equal(step.identifiers, undefined);
            assert.equal(step.codeBlock, undefined);
            assert.equal(step.comment, undefined);
            assert.equal(step.isFunctionDeclaration, undefined);
            assert.equal(step.isFunctionCall, true);
            assert.equal(step.isToDo, undefined);
            assert.equal(step.isManual, undefined);
            assert.equal(step.isDebug, undefined);
            assert.equal(step.isTextualStep, undefined);
            assert.equal(step.isOnly, undefined);
            assert.equal(step.isNonParallel, undefined);
            assert.equal(step.isSequential, undefined);
            assert.equal(step.isExpectedFail, undefined);
            assert.equal(step.expectedFailNote, undefined);
            assert.equal(step.varsBeingSet, undefined);
            assert.equal(step.varsList, undefined);
        });

        it("parses a line with multiple strings and whitespace", function() {
            var step = tree.parseLine(`    Click "B\"ig" 'Re\'d' "Button" `, "file.txt", 10);
            assert.equal(step.line, `    Click "B\"ig" 'Re\'d' "Button" `);
            assert.equal(step.text, `Click "B\"ig" 'Re\'d' "Button"`);
            assert.equal(step.identifiers, undefined);
            assert.equal(step.codeBlock, undefined);
        });

        it("throws an error if a step only has numbers, periods, or commas", function() {
            assert.throws(() => {
                tree.parseLine(`324798`, "file.txt", 10);
            }, "Invalid step name [file.txt:10]");

            assert.throws(() => {
                tree.parseLine(`32, 4798`, "file.txt", 10);
            }, "Invalid step name [file.txt:10]");

            assert.throws(() => {
                tree.parseLine(`...`, "file.txt", 10);
            }, "Invalid step name [file.txt:10]");
        });

        it("throws an error if a step has the name of a hook", function() {
            assert.throws(() => {
                tree.parseLine(`Before Every Branch`, "file.txt", 10);
            }, "You cannot have a function call with that name. That's reserved for hook function declarations. [file.txt:10]");

            assert.throws(() => {
                tree.parseLine(`After Every Branch`, "file.txt", 10);
            }, "You cannot have a function call with that name. That's reserved for hook function declarations. [file.txt:10]");

            assert.throws(() => {
                tree.parseLine(`Before Every Step`, "file.txt", 10);
            }, "You cannot have a function call with that name. That's reserved for hook function declarations. [file.txt:10]");

            assert.throws(() => {
                tree.parseLine(`After Every Step`, "file.txt", 10);
            }, "You cannot have a function call with that name. That's reserved for hook function declarations. [file.txt:10]");

            assert.throws(() => {
                tree.parseLine(`  before   Everything  `, "file.txt", 10);
            }, "You cannot have a function call with that name. That's reserved for hook function declarations. [file.txt:10]");

            assert.throws(() => {
                tree.parseLine(` AFTER EVERYTHING `, "file.txt", 10);
            }, "You cannot have a function call with that name. That's reserved for hook function declarations. [file.txt:10]");
        });

        it("does not throw an error if a hook has the right casing and has a code block, regardless of whitespace", function() {
            assert.doesNotThrow(() => {
                tree.parseLine(`* Before  Every   Branch {`, "file.txt", 10);
            });

            assert.doesNotThrow(() => {
                tree.parseLine(`* After  Every   Branch {`, "file.txt", 10);
            });

            assert.doesNotThrow(() => {
                tree.parseLine(`*    Before Every Step   { `, "file.txt", 10);
            });

            assert.doesNotThrow(() => {
                tree.parseLine(`*    After Every Step   {  `, "file.txt", 10);
            });

            assert.doesNotThrow(() => {
                tree.parseLine(`*  Before  Everything + {  `, "file.txt", 10);
            });

            assert.doesNotThrow(() => {
                tree.parseLine(`*  After  Everything .. + { `, "file.txt", 10);
            });
        });

        it("throws an error if a hook doesn't start a code block", function() {
            assert.throws(() => {
                tree.parseLine(`* Before  Every   Branch`, "file.txt", 10);
            }, "A hook must have a code block [file.txt:10]");

            assert.throws(() => {
                tree.parseLine(`* After  Every   Branch`, "file.txt", 10);
            }, "A hook must have a code block [file.txt:10]");

            assert.throws(() => {
                tree.parseLine(`*    Before Every Step    `, "file.txt", 10);
            }, "A hook must have a code block [file.txt:10]");

            assert.throws(() => {
                tree.parseLine(`*    After Every Step     `, "file.txt", 10);
            }, "A hook must have a code block [file.txt:10]");

            assert.throws(() => {
                tree.parseLine(`*  Before  Everything +   `, "file.txt", 10);
            }, "A hook must have a code block [file.txt:10]");

            assert.throws(() => {
                tree.parseLine(`*  After  Everything .. +  `, "file.txt", 10);
            }, "A hook must have a code block [file.txt:10]");
        });

        it("parses a line with a {variable}", function() {
            var step = tree.parseLine(`Click {Big Red Button}`, "file.txt", 10);
            assert.equal(step.line, `Click {Big Red Button}`);
            assert.equal(step.text, `Click {Big Red Button}`);
            assert.equal(step.identifiers, undefined);
            assert.equal(step.codeBlock, undefined);
            assert.equal(step.varsBeingSet, undefined);
        });

        it("parses a line with a {{local variable}}", function() {
            var step = tree.parseLine(`Click {{Big Red Button}}`, "file.txt", 10);
            assert.equal(step.line, `Click {{Big Red Button}}`);
            assert.equal(step.text, `Click {{Big Red Button}}`);
            assert.equal(step.identifiers, undefined);
            assert.equal(step.codeBlock, undefined);
            assert.equal(step.varsBeingSet, undefined);
        });

        it("parses a line with multiple variables and whitespace", function() {
            var step = tree.parseLine(`    Click {{Big}} {Red} 'dazzling' {{Button}} `, "file.txt", 10);
            assert.equal(step.line, `    Click {{Big}} {Red} 'dazzling' {{Button}} `);
            assert.equal(step.text, `Click {{Big}} {Red} 'dazzling' {{Button}}`);
            assert.equal(step.identifiers, undefined);
            assert.equal(step.codeBlock, undefined);
            assert.equal(step.varsBeingSet, undefined);
        });

        it("parses a comment", function() {
            var step = tree.parseLine(`Click {Big Red Button} // comment here`, "file.txt", 10);
            assert.equal(step.text, `Click {Big Red Button}`);
            assert.equal(step.comment, '// comment here');
        });

        it("doesn't parse a comment inside single-quotes", function() {
            var step = tree.parseLine(`Click 'some // ugly \' \\\' comment'  // comment here `, "file.txt", 10);
            assert.equal(step.text, `Click 'some // ugly \' \\\' comment'`);
            assert.equal(step.comment, '// comment here ');
        });

        it("doesn't parse a comment inside double-quotes", function() {
            var step = tree.parseLine(`Click "some // ugly comment" and "//othercomment \" \\\\"" // comment here `, "file.txt", 10);
            assert.equal(step.text, `Click "some // ugly comment" and "//othercomment \" \\\\""`);
            assert.equal(step.comment, '// comment here ');
        });

        it("parses a line that only consists of a comment", function() {
            var step = tree.parseLine(`// comment here`, "file.txt", 10);
            assert.equal(step.text, ``);
            assert.equal(step.comment, '// comment here');

            step = tree.parseLine(`    // comment here`, "file.txt", 10);
            assert.equal(step.text, ``);
            assert.equal(step.comment, '// comment here');
        });

        it("parses a function declaration", function() {
            var step = tree.parseLine(`    * My Function here`, "file.txt", 10);
            assert.equal(step.text, `My Function here`);
            assert.equal(step.isFunctionDeclaration, true);
            assert.equal(step.isFunctionCall, undefined);

            step = tree.parseLine(`    * My Function {{var}}`, "file.txt", 10);
            assert.equal(step.text, `My Function {{var}}`);
            assert.equal(step.isFunctionDeclaration, true);
            assert.equal(step.isFunctionCall, undefined);
        });

        it("throws an error if a function declaration has 'strings'", function() {
            assert.throws(() => {
                tree.parseLine(`* Something 'quote' something else`, "file.txt", 10);
            }, "A * Function declaration cannot have 'strings' inside of it [file.txt:10]");

            assert.throws(() => {
                tree.parseLine(`* Something "quote" something else`, "file.txt", 10);
            }, "A * Function declaration cannot have 'strings' inside of it [file.txt:10]");
        });

        it("parses a function call", function() {
            var step = tree.parseLine(`    My Function call `, "file.txt", 10);
            assert.equal(step.text, `My Function call`);
            assert.equal(step.isFunctionDeclaration, undefined);
            assert.equal(step.isFunctionCall, true);
        });

        it("throws an error if a textual step is also a function declaration", function() {
            assert.throws(() => {
                tree.parseLine(`* Something - +`, "file.txt", 10);
            }, "A * Function declaration cannot be a textual step (-) as well [file.txt:10]");

            assert.throws(() => {
                tree.parseLine(`    * Something - + {`, "file.txt", 10);
            }, "A * Function declaration cannot be a textual step (-) as well [file.txt:10]");
        });

        it("parses a function declaration with a code block", function() {
            var step = tree.parseLine(`* Click {{var}} + { `, "file.txt", 10);
            assert.equal(step.text, `Click {{var}}`);
            assert.equal(step.codeBlock, ' ');
        });

        it("parses a textual step with a code block", function() {
            var step = tree.parseLine(`Some text + - { `, "file.txt", 10);
            assert.equal(step.text, `Some text`);
            assert.equal(step.codeBlock, ' ');
        });

        it("parses an approved function call with a code block", function() {
            var step = tree.parseLine(`Execute  In Browser  + { `, "file.txt", 10);
            assert.equal(step.text, `Execute  In Browser`);
            assert.equal(step.codeBlock, ' ');
        });

        it("parses a code block followed by a comment", function() {
            var step = tree.parseLine(`Something here + { // comment here`, "file.txt", 10);
            assert.equal(step.text, `Something here`);
            assert.equal(step.codeBlock, ' // comment here');
            assert.equal(step.comment, undefined);
        });

        it("parses the to-do identifier (-T)", function() {
            var step = tree.parseLine(`Click {button} -T`, "file.txt", 10);
            assert.equal(step.text, `Click {button}`);
            assert.equal(step.isToDo, true);
            assert.equal(step.isTextualStep, true);

            step = tree.parseLine(`Click {button} + -T ~`, "file.txt", 10);
            assert.equal(step.text, `Click {button}`);
            assert.equal(step.isToDo, true);
            assert.equal(step.isTextualStep, true);
        });

        it("parses the manual identifier (-M)", function() {
            var step = tree.parseLine(`Click {button} -M`, "file.txt", 10);
            assert.equal(step.text, `Click {button}`);
            assert.equal(step.isManual, true);
            assert.equal(step.isTextualStep, true);

            step = tree.parseLine(`Click {button} + -M ~`, "file.txt", 10);
            assert.equal(step.text, `Click {button}`);
            assert.equal(step.isManual, true);
            assert.equal(step.isTextualStep, true);
        });

        it("parses the textual step identifier (-)", function() {
            var step = tree.parseLine(`Click {button} -`, "file.txt", 10);
            assert.equal(step.text, `Click {button}`);
            assert.equal(step.isTextualStep, true);

            step = tree.parseLine(`    Click {button} - -M ~ `, "file.txt", 10);
            assert.equal(step.text, `Click {button}`);
            assert.equal(step.isManual, true);
            assert.equal(step.isTextualStep, true);
        });

        it("parses the debug identifier (~)", function() {
            var step = tree.parseLine(`Click {button} ~`, "file.txt", 10);
            assert.equal(step.text, `Click {button}`);
            assert.equal(step.isDebug, true);

            step = tree.parseLine(`Click {button} + ~`, "file.txt", 10);
            assert.equal(step.text, `Click {button}`);
            assert.equal(step.isDebug, true);
        });

        it("parses the only identifier ($)", function() {
            var step = tree.parseLine(`Click {button} $`, "file.txt", 10);
            assert.equal(step.text, `Click {button}`);
            assert.equal(step.isOnly, true);

            step = tree.parseLine(`Click {button} + $ `, "file.txt", 10);
            assert.equal(step.text, `Click {button}`);
            assert.equal(step.isOnly, true);
        });

        it("parses the non-parallel identifier (+)", function() {
            var step = tree.parseLine(`Click {button} +`, "file.txt", 10);
            assert.equal(step.text, `Click {button}`);
            assert.equal(step.isNonParallel, true);

            step = tree.parseLine(`Click {button} -T + ~ // comment`, "file.txt", 10);
            assert.equal(step.text, `Click {button}`);
            assert.equal(step.isNonParallel, true);
        });

        it("parses the sequential identifier (..)", function() {
            var step = tree.parseLine(`Click {button} ..`, "file.txt", 10);
            assert.equal(step.text, `Click {button}`);
            assert.equal(step.isSequential, true);

            step = tree.parseLine(`Click {button} -T .. ~ // comment`, "file.txt", 10);
            assert.equal(step.text, `Click {button}`);
            assert.equal(step.isSequential, true);
        });

        it("parses the expected fail identifier (#)", function() {
            var step = tree.parseLine(`Click {button} #`, "file.txt", 10);
            assert.equal(step.text, `Click {button}`);
            assert.equal(step.isExpectedFail, true);

            step = tree.parseLine(`Click {button} -T # ~ // comment`, "file.txt", 10);
            assert.equal(step.text, `Click {button}`);
            assert.equal(step.isExpectedFail, true);
        });

        it("rejects a hook with a $", function() {
            assert.throws(() => {
                tree.parseLine(`* After Every Branch $ {`, "file.txt", 10);
            }, "A hook cannot have a $ [file.txt:10]");
        });

        it("rejects a hook with a ~", function() {
            assert.throws(() => {
                tree.parseLine(`* Before Every Step ~ {`, "file.txt", 10);
            }, "A hook cannot have a ~ [file.txt:10]");
        });

        it("parses {var} = Function", function() {
            var step = tree.parseLine(`{var} = Click 'something' {blah}`, "file.txt", 10);
            assert.equal(step.text, `{var} = Click 'something' {blah}`);
            assert.equal(step.isFunctionCall, true);
            assert.deepEqual(step.varsBeingSet, [ {name: "var", value: "Click 'something' {blah}", isLocal: false} ]);

            step = tree.parseLine(`    {var with spaces}  = Click 'something' {{blah}}`, "file.txt", 10);
            assert.equal(step.text, `{var with spaces}  = Click 'something' {{blah}}`);
            assert.equal(step.isFunctionCall, true);
            assert.deepEqual(step.varsBeingSet, [ {name: "var with spaces", value: "Click 'something' {{blah}}", isLocal: false} ]);
        });

        it("parses {var} = Code Block Function {", function() {
            var step = tree.parseLine(`{var} = Code Block Function {`, "file.txt", 10);
            assert.equal(step.text, `{var} = Code Block Function`);
            assert.equal(step.isFunctionCall, undefined);
            assert.equal(step.isTextualStep, undefined);
            assert.deepEqual(step.varsBeingSet, [ {name: "var", value: "Code Block Function", isLocal: false} ]);
        });

        it("rejects {var} = Textual Function -", function() {
            assert.throws(() => {
                tree.parseLine(`{var} = Textual Function -`, "file.txt", 10);
            }, "A textual step (ending in -) cannot also start with a {variable} assignment [file.txt:10]");
        });

        it("rejects {var} = only numbers, periods, or commas", function() {
            assert.throws(() => {
                tree.parseLine(`{var} =324798`, "file.txt", 10);
            }, "{vars} can only be set to 'strings' [file.txt:10]");

            assert.throws(() => {
                tree.parseLine(`{var} = 32, 4798`, "file.txt", 10);
            }, "{vars} can only be set to 'strings' [file.txt:10]");

            assert.throws(() => {
                tree.parseLine(`{var}=...`, "file.txt", 10);
            }, "{vars} can only be set to 'strings' [file.txt:10]");
        });

        it("parses {var} = 'string'", function() {
            step = tree.parseLine(`{var} = 'foo'`, "file.txt", 10);
            assert.equal(step.text, `{var} = 'foo'`);
            assert.equal(step.isFunctionCall, undefined);
            assert.deepEqual(step.varsBeingSet, [ {name: "var", value: "'foo'", isLocal: false} ]);
        });

        it("parses {{var}} = Function", function() {
            var step = tree.parseLine(`{{var}} = Click 'something' { blah }`, "file.txt", 10);
            assert.equal(step.text, `{{var}} = Click 'something' { blah }`);
            assert.equal(step.isFunctionCall, true);
            assert.deepEqual(step.varsBeingSet, [ {name: "var", value: "Click 'something' { blah }", isLocal: true} ]);

            step = tree.parseLine(`    {{ var with spaces  }} =  Click 'something' {{blah}}`, "file.txt", 10);
            assert.equal(step.text, `{{ var with spaces  }} =  Click 'something' {{blah}}`);
            assert.equal(step.isFunctionCall, true);
            assert.deepEqual(step.varsBeingSet, [ {name: "var with spaces", value: "Click 'something' {{blah}}", isLocal: true} ]);

            step = tree.parseLine(`{{var}} = Click 'something \\\\ \'' "something2 \"" {blah} {{blah2}}`, "file.txt", 10);
            assert.equal(step.isFunctionCall, true);
            assert.deepEqual(step.varsBeingSet, [ {name: "var", value: `Click 'something \\\\ \'' "something2 \"" {blah} {{blah2}}`, isLocal: true} ]);
        });

        it("parses {{var}} = 'string'", function() {
            step = tree.parseLine(`{{var}} = 'foo \\\''`, "file.txt", 10);
            assert.equal(step.text, `{{var}} = 'foo \\\''`);
            assert.equal(step.isFunctionCall, undefined);
            assert.deepEqual(step.varsBeingSet, [ {name: "var", value: "'foo \\\''", isLocal: true} ]);
        });

        it("parses multiple {var} = 'string literal', separated by commas", function() {
            var step = tree.parseLine(`{var1} = 'one', {{var2}}='two 2', {var 3}= "three 3" +`, "file.txt", 10);
            assert.equal(step.text, `{var1} = 'one', {{var2}}='two 2', {var 3}= "three 3"`);
            assert.equal(step.isFunctionCall, undefined);
            assert.deepEqual(step.varsBeingSet, [ {name: "var1", value: "'one'", isLocal: false}, {name: "var2", value: "'two 2'", isLocal: true}, {name: "var 3", value: "\"three 3\"", isLocal: false} ]);
        });

        it("doesn't recognize {vars} with backslashes in their names", function() {
            var step = tree.parseLine(`{var\\} = Click 'something \\{blah\\}' {foo}`, "file.txt", 10);
            assert.equal(step.text, `{var\\} = Click 'something \\{blah\\}' {foo}`);
            assert.equal(step.varsBeingSet, undefined);
        });

        it("rejects {vars} with only numbers in their names", function() {
            assert.throws(() => {
                tree.parseLine(`{23} = 'str'`, "file.txt", 10);
            }, "A {variable name} cannot be just numbers [file.txt:10]");

            assert.throws(() => {
                tree.parseLine(`{234 23432} = 'str'`, "file.txt", 10);
            }, "A {variable name} cannot be just numbers [file.txt:10]");

            assert.throws(() => {
                tree.parseLine(`{  435 4545    } = 'str'`, "file.txt", 10);
            }, "A {variable name} cannot be just numbers [file.txt:10]");
        });

        it("rejects {Frequency}", function() {
            assert.throws(() => {
                tree.parseLine(`{Frequency} = 'high'`, "file.txt", 10);
            }, "The {frequency} variable name is special and must be all lowercase [file.txt:10]");
        });

        it("rejects {{frequency}}", function() {
            assert.throws(() => {
                tree.parseLine(`{{frequency}} = 'high'`, "file.txt", 10);
            }, "The {frequency} variable is special and cannot be {{frequency}} [file.txt:10]");
        });

        it("rejects {frequency} not set to high/med/low", function() {
            assert.throws(() => {
                tree.parseLine(`{frequency} = 'blah'`, "file.txt", 10);
            }, "The {frequency} variable is special and can only be set to 'high', 'med', or 'low' [file.txt:10]");

            assert.throws(() => {
                tree.parseLine(`{frequency} = Function`, "file.txt", 10);
            }, "The {frequency} variable is special and can only be set to 'high', 'med', or 'low' [file.txt:10]");
        });

        it("parses valid {frequency}", function() {
            assert.doesNotThrow(() => {
                tree.parseLine(`{frequency} = 'high'`, "file.txt", 10);
            });

            assert.doesNotThrow(() => {
                tree.parseLine(`{frequency} = 'med'`, "file.txt", 10);
            });

            assert.doesNotThrow(() => {
                tree.parseLine(`{frequency} = 'low'`, "file.txt", 10);
            });

            assert.doesNotThrow(() => {
                tree.parseLine(`{foo1}='bar1',{frequency} = 'med', {foo2} = "bar2"`, "file.txt", 10);
            });
        });

        it("rejects {Group}", function() {
            assert.throws(() => {
                tree.parseLine(`{Group} = 'foobar'`, "file.txt", 10);
            }, "The {group} variable name is special and must be all lowercase [file.txt:10]");
        });

        it("rejects {{group}}", function() {
            assert.throws(() => {
                tree.parseLine(`{{group}} = 'foobar'`, "file.txt", 10);
            }, "The {group} variable is special and cannot be {{group}} [file.txt:10]");
        });

        it("parses valid {group}", function() {
            assert.doesNotThrow(() => {
                tree.parseLine(`{group} = 'foobar'`, "file.txt", 10);
            });

            assert.doesNotThrow(() => {
                tree.parseLine(`{group} = ' one two three  '`, "file.txt", 10);
            });
        });

        it("parses ElementFinders", function() {
            assert.doesNotThrow(() => {
                tree.parseLine(`Click ['Login' box]`, "file.txt", 10);
                tree.parseLine(`Click ['Login']`, "file.txt", 10);
                tree.parseLine(`Click [ 4th 'Login' box  next to  "blah" ]`, "file.txt", 10);
                tree.parseLine(`Click [ 'Login' next to "blah" ]`, "file.txt", 10);
                tree.parseLine(`Click [box next to "blah"]`, "file.txt", 10);
                tree.parseLine(`Click ['Login'] and [ 4th 'Login' box  next to  "blah" ]`, "file.txt", 10);
            });
        });

        it("throws an error when a [bracketed string] is not a valid elementFinder", function() {
            assert.throws(() => {
                tree.parseLine(`Something [next to 'something']`, "file.txt", 10);
            }, "Invalid [elementFinder in brackets] [file.txt:10]");
        });

        it("throws an error when multiple {vars} are set in a line, and one of them is not a 'string literal'", function() {
            assert.throws(() => {
                tree.parseLine(`{var1} = 'one', {{var2}}=Some step here, {var 3}= "three 3" +`, "file.txt", 10);
            }, "When multiple {variables} are being set on a single line, those {variables} can only be set to 'string constants' [file.txt:10]");

            assert.throws(() => {
                tree.parseLine(`{var1}='str1', {var2}='str2', Invalid stuff here`, "file.txt", 10);
            }, "When multiple {variables} are being set on a single line, those {variables} can only be set to 'string constants' [file.txt:10]");
        });

        it("throws an error when a function declaration contains {non-local variables}", function() {
            assert.throws(() => {
                tree.parseLine(`* Function {one} and {{two}}`, "file.txt", 10);
            }, "All variables in a \* Function declaration must be {{local}} and {one} is not [file.txt:10]");
        });

        it("throws an error when a step sets a variable and is a function declaration", function() {
            assert.throws(() => {
                tree.parseLine(`* {var1}= Some function`, "file.txt", 10);
            }, "A step setting {variables} cannot start with a \* [file.txt:10]");
        });

        it("returns text set to empty string for empty or all-whitespace lines", function() {
            var step = tree.parseLine(``, "file.txt", 10);
            assert.equal(step.text, '');

            step = tree.parseLine(`     `, "file.txt", 10);
            assert.equal(step.text, '');
        });

        it("returns text set to '..' when the whole line is a sequential identifier (..)", function() {
            var step = tree.parseLine(`..`, "file.txt", 10);
            assert.equal(step.text, '..');

            step = tree.parseLine(`    .. `, "file.txt", 10);
            assert.equal(step.text, '..');
        });
    });

    describe("parseElementFinder()", function() {
        var tree = new Tree();

        it("parses ElementFinders with text", function() {
            var elementFinder = tree.parseElementFinder(`['Login']`);
            assert.deepEqual(elementFinder, {text: 'Login'});

            elementFinder = tree.parseElementFinder(`[ 'Login' ]`);
            assert.deepEqual(elementFinder, {text: 'Login'});
        });

        it("rejects ElementFinders with nextTo", function() {
            var elementFinder = tree.parseElementFinder(`[next to 'blah']`);
            assert.equal(elementFinder, null);

            elementFinder = tree.parseElementFinder(`[   next to "blah"  ]`);
            assert.equal(elementFinder, null);
        });

        it("parses ElementFinders with ordinal and text", function() {
            var elementFinder = tree.parseElementFinder(`[235th '  blah blah2 ']`);
            assert.deepEqual(elementFinder, {ordinal: 235, text: '  blah blah2 '});

            elementFinder = tree.parseElementFinder(`[ 235th  '  blah blah2 ' ]`);
            assert.deepEqual(elementFinder, {ordinal: 235, text: '  blah blah2 '});
        });

        it("parses ElementFinders with ordinal and variable", function() {
            var elementFinder = tree.parseElementFinder(`[6422nd blah blah2]`);
            assert.deepEqual(elementFinder, {ordinal: 6422, variable: 'blah blah2'});

            elementFinder = tree.parseElementFinder(`[ 6422nd  blah  blah2 ]`);
            assert.deepEqual(elementFinder, {ordinal: 6422, variable: 'blah  blah2'});
        });

        it("rejects ElementFinders with ordinal and nextTo", function() {
            var elementFinder = tree.parseElementFinder(`[2nd next to 'blah']`);
            assert.equal(elementFinder, null);

            elementFinder = tree.parseElementFinder(`[ 2nd   next to 'blah' ]`);
            assert.equal(elementFinder, null);
        });

        it("parses ElementFinders with text and variable", function() {
            var elementFinder = tree.parseElementFinder(`['Login' box]`);
            assert.deepEqual(elementFinder, {text: 'Login', variable: 'box'});

            elementFinder = tree.parseElementFinder(`[ 'Login'  box ]`);
            assert.deepEqual(elementFinder, {text: 'Login', variable: 'box'});
        });

        it("parses ElementFinders with text and nextTo", function() {
            var elementFinder = tree.parseElementFinder(`['Login' next to "blah"]`);
            assert.deepEqual(elementFinder, {text: 'Login', nextTo: 'blah'});

            elementFinder = tree.parseElementFinder(`[ 'Login'  next  to  "blah" ]`);
            assert.deepEqual(elementFinder, {text: 'Login', nextTo: 'blah'});
        });

        it("parses ElementFinders with variable and nextTo", function() {
            var elementFinder = tree.parseElementFinder(`[box next to "blah"]`);
            assert.deepEqual(elementFinder, {variable: 'box', nextTo: 'blah'});

            elementFinder = tree.parseElementFinder(`[ box  next  to  "blah" ]`);
            assert.deepEqual(elementFinder, {variable: 'box', nextTo: 'blah'});

            elementFinder = tree.parseElementFinder(`[22foo next to "blah"]`);
            assert.deepEqual(elementFinder, {variable: '22foo', nextTo: 'blah'});
        });

        it("parses ElementFinders with ordinal, text, and variable", function() {
            var elementFinder = tree.parseElementFinder(`[1st "Login" box]`);
            assert.deepEqual(elementFinder, {ordinal: 1, text: 'Login', variable: 'box'});

            elementFinder = tree.parseElementFinder(`[  1st  "Login"  big  box  ]`);
            assert.deepEqual(elementFinder, {ordinal: 1, text: 'Login', variable: 'big  box'});
        });

        it("parses ElementFinders with ordinal, text, and nextTo", function() {
            var elementFinder = tree.parseElementFinder(`[20th " Login  thing " next to "blah"]`);
            assert.deepEqual(elementFinder, {ordinal: 20, text: ' Login  thing ', nextTo: 'blah'});

            elementFinder = tree.parseElementFinder(`[  20th " Login  thing "  next  to  "blah" ]`);
            assert.deepEqual(elementFinder, {ordinal: 20, text: ' Login  thing ', nextTo: 'blah'});
        });

        it("parses ElementFinders with ordinal, variable, and nextTo", function() {
            var elementFinder = tree.parseElementFinder(`[14th box next to "blah"]`);
            assert.deepEqual(elementFinder, {ordinal: 14, variable: 'box', nextTo: 'blah'});

            elementFinder = tree.parseElementFinder(`[ 13th  box  next  to "blah"  ]`);
            assert.deepEqual(elementFinder, {ordinal: 13, variable: 'box', nextTo: 'blah'});
        });

        it("parses ElementFinders with text, variable, and nextTo", function() {
            var elementFinder = tree.parseElementFinder(`['Login' box next to "blah"]`);
            assert.deepEqual(elementFinder, {text: 'Login', variable: 'box', nextTo: 'blah'});

            elementFinder = tree.parseElementFinder(`[ 'Login' box  next to  "blah" ]`);
            assert.deepEqual(elementFinder, {text: 'Login', variable: 'box', nextTo: 'blah'});
        });

        it("parses ElementFinders with ordinal, text, variable, and nextTo", function() {
            var elementFinder = tree.parseElementFinder(`[14th 'Login' box next to "blah"]`);
            assert.deepEqual(elementFinder, {ordinal: 14, text: 'Login', variable: 'box', nextTo: 'blah'});

            elementFinder = tree.parseElementFinder(`[ 13th 'Login'  box  next  to "blah"  ]`);
            assert.deepEqual(elementFinder, {ordinal: 13, text: 'Login', variable: 'box', nextTo: 'blah'});
        });

        it("rejects other invalid ElementFinders", function() {
            var elementFinder = tree.parseElementFinder(`[something 'not' elementfinder]`);
            assert.equal(elementFinder, null);

            var elementFinder = tree.parseElementFinder(`'text' box`);
            assert.equal(elementFinder, null);

            var elementFinder = tree.parseElementFinder(`['text' box`);
            assert.equal(elementFinder, null);

            var elementFinder = tree.parseElementFinder(`'text' box]`);
            assert.equal(elementFinder, null);

            elementFinder = tree.parseElementFinder(``);
            assert.equal(elementFinder, null);

            elementFinder = tree.parseElementFinder(`  `);
            assert.equal(elementFinder, null);
        });
    });

    describe("parseIn()", function() {
        it("parses empty input", function() {
            var tree = new Tree();
            tree.parseIn(``, "file.txt");

            expect(tree).to.containSubset({
                root: {
                    indents: -1,
                    parent: null,
                    children: []
                }
            });
        });

        it("parses all-whitespace input", function() {
            var tree = new Tree();
            tree.parseIn(`
                `, "file.txt");

            expect(tree).to.containSubset({
                root: {
                    indents: -1,
                    parent: null,
                    children: []
                }
            });
        });

        it("parses a normal tree", function() {
            var tree = new Tree();
            tree.parseIn(
`A
    B
        C
    D

    E
        F
G

H
    I
        J
            K
L`
            , "file.txt");

            expect(tree).to.containSubset({
                root: {
                    indents: -1,
                    parent: null,
                    children: [
                        {
                            text: 'A',
                            lineNumber: 1,
                            indents: 0,
                            parent: { indents: -1 },
                            children: [
                                {
                                    text: 'B',
                                    lineNumber: 2,
                                    indents: 1,
                                    parent: { text: 'A' },
                                    children: [
                                        {
                                            text: 'C',
                                            lineNumber: 3,
                                            indents: 2,
                                            parent: { text: 'B' },
                                            children: []
                                        }
                                    ]
                                },
                                {
                                    text: 'D',
                                    lineNumber: 4,
                                    indents: 1,
                                    parent: { text: 'A' },
                                    children: []
                                },
                                {
                                    text: 'E',
                                    lineNumber: 6,
                                    indents: 1,
                                    parent: { text: 'A' },
                                    children: [
                                        {
                                            text: 'F',
                                            lineNumber: 7,
                                            indents: 2,
                                            parent: { text: 'E' },
                                            children: []
                                        }
                                    ]
                                }
                            ]
                        },
                        {
                            text: 'G',
                            lineNumber: 8,
                            indents: 0,
                            parent: { indents: -1 },
                            children: []
                        },
                        {
                            text: 'H',
                            lineNumber: 10,
                            indents: 0,
                            parent: { indents: -1 },
                            children: [
                                {
                                    text: 'I',
                                    lineNumber: 11,
                                    indents: 1,
                                    parent: { text: 'H' },
                                    children: [
                                        {
                                            text: 'J',
                                            lineNumber: 12,
                                            indents: 2,
                                            parent: { text: 'I' },
                                            children: [
                                                {
                                                    text: 'K',
                                                    lineNumber: 13,
                                                    indents: 3,
                                                    parent: { text: 'J' },
                                                    children: []
                                                }
                                            ]
                                        }
                                    ]
                                }
                            ]
                        },
                        {
                            text: 'L',
                            lineNumber: 14,
                            indents: 0,
                            parent: { indents: -1 },
                            children: []
                        }
                    ]
                }
            });
        });

        it("parses a normal tree with one or more empty lines in the middle", function() {
            var tree = new Tree();
            tree.parseIn(
`

A
    B

        C
    D

    E
        F

G

H
    I


        J
            K
L
`
            , "file.txt");

            expect(tree).to.containSubset({
                root: {
                    indents: -1,
                    parent: null,
                    children: [
                        {
                            text: 'A',
                            lineNumber: 3,
                            indents: 0,
                            parent: { indents: -1 },
                            children: [
                                {
                                    text: 'B',
                                    lineNumber: 4,
                                    indents: 1,
                                    parent: { text: 'A' },
                                    children: [
                                        {
                                            text: 'C',
                                            lineNumber: 6,
                                            indents: 2,
                                            parent: { text: 'B' },
                                            children: []
                                        }
                                    ]
                                },
                                {
                                    text: 'D',
                                    lineNumber: 7,
                                    indents: 1,
                                    parent: { text: 'A' },
                                    children: []
                                },
                                {
                                    text: 'E',
                                    lineNumber: 9,
                                    indents: 1,
                                    parent: { text: 'A' },
                                    children: [
                                        {
                                            text: 'F',
                                            lineNumber: 10,
                                            indents: 2,
                                            parent: { text: 'E' },
                                            children: []
                                        }
                                    ]
                                }
                            ]
                        },
                        {
                            text: 'G',
                            lineNumber: 12,
                            indents: 0,
                            parent: { indents: -1 },
                            children: []
                        },
                        {
                            text: 'H',
                            lineNumber: 14,
                            indents: 0,
                            parent: { indents: -1 },
                            children: [
                                {
                                    text: 'I',
                                    lineNumber: 15,
                                    indents: 1,
                                    parent: { text: 'H' },
                                    children: [
                                        {
                                            text: 'J',
                                            lineNumber: 18,
                                            indents: 2,
                                            parent: { text: 'I' },
                                            children: [
                                                {
                                                    text: 'K',
                                                    lineNumber: 19,
                                                    indents: 3,
                                                    parent: { text: 'J' },
                                                    children: []
                                                }
                                            ]
                                        }
                                    ]
                                }
                            ]
                        },
                        {
                            text: 'L',
                            lineNumber: 20,
                            indents: 0,
                            parent: { indents: -1 },
                            children: []
                        }
                    ]
                }
            });
        });

        it("handles multiple parses into the same tree", function() {
            var tree = new Tree();

            tree.parseIn(
`

A
    B

        C
    D

    E
        F
`
            , "file1.txt");

            tree.parseIn(
`G

H
    I


        J
            K
`
            , "file2.txt");

            tree.parseIn(
`L`
            , "file3.txt");

            expect(tree).to.containSubset({
                root: {
                    indents: -1,
                    parent: null,
                    children: [
                        {
                            text: 'A',
                            lineNumber: 3,
                            filename: 'file1.txt',
                            indents: 0,
                            parent: { indents: -1 },
                            children: [
                                {
                                    text: 'B',
                                    lineNumber: 4,
                                    filename: 'file1.txt',
                                    indents: 1,
                                    parent: { text: 'A' },
                                    children: [
                                        {
                                            text: 'C',
                                            lineNumber: 6,
                                            filename: 'file1.txt',
                                            indents: 2,
                                            parent: { text: 'B' },
                                            children: []
                                        }
                                    ]
                                },
                                {
                                    text: 'D',
                                    lineNumber: 7,
                                    filename: 'file1.txt',
                                    indents: 1,
                                    parent: { text: 'A' },
                                    children: []
                                },
                                {
                                    text: 'E',
                                    lineNumber: 9,
                                    filename: 'file1.txt',
                                    indents: 1,
                                    parent: { text: 'A' },
                                    children: [
                                        {
                                            text: 'F',
                                            lineNumber: 10,
                                            filename: 'file1.txt',
                                            indents: 2,
                                            parent: { text: 'E' },
                                            children: []
                                        }
                                    ]
                                }
                            ]
                        },
                        {
                            text: 'G',
                            lineNumber: 1,
                            filename: 'file2.txt',
                            indents: 0,
                            parent: { indents: -1 },
                            children: []
                        },
                        {
                            text: 'H',
                            lineNumber: 3,
                            filename: 'file2.txt',
                            indents: 0,
                            parent: { indents: -1 },
                            children: [
                                {
                                    text: 'I',
                                    lineNumber: 4,
                                    filename: 'file2.txt',
                                    indents: 1,
                                    parent: { text: 'H' },
                                    children: [
                                        {
                                            text: 'J',
                                            lineNumber: 7,
                                            filename: 'file2.txt',
                                            indents: 2,
                                            parent: { text: 'I' },
                                            children: [
                                                {
                                                    text: 'K',
                                                    lineNumber: 8,
                                                    filename: 'file2.txt',
                                                    indents: 3,
                                                    parent: { text: 'J' },
                                                    children: []
                                                }
                                            ]
                                        }
                                    ]
                                }
                            ]
                        },
                        {
                            text: 'L',
                            lineNumber: 1,
                            indents: 0,
                            filename: 'file3.txt',
                            parent: { indents: -1 },
                            children: []
                        }
                    ]
                }
            });
        });

        it("sets isBuiltIn", function() {
            var tree = new Tree();

            tree.parseIn(
`A
    B`
            , "file1.txt");

            tree.parseIn(
`C
    D`
            , "file2.txt", true);

            expect(tree).to.containSubset({
                root: {
                    indents: -1,
                    parent: null,
                    children: [
                        {
                            text: 'A',
                            isBuiltIn: undefined,
                            lineNumber: 1,
                            filename: 'file1.txt',
                            indents: 0,
                            parent: { indents: -1 },
                            children: [
                                {
                                    text: 'B',
                                    isBuiltIn: undefined,
                                    lineNumber: 2,
                                    filename: 'file1.txt',
                                    indents: 1,
                                    parent: { text: 'A' },
                                    children: []
                                }
                            ]
                        },
                        {
                            text: 'C',
                            isBuiltIn: true,
                            lineNumber: 1,
                            filename: 'file2.txt',
                            indents: 0,
                            parent: { indents: -1 },
                            children: [
                                {
                                    text: 'D',
                                    isBuiltIn: true,
                                    lineNumber: 2,
                                    filename: 'file2.txt',
                                    indents: 1,
                                    parent: { text: 'C' },
                                    children: []
                                }
                            ]
                        }
                    ]
                }
            });
        });

        it("rejects a first step that is not at indent 0", function() {
            var tree = new Tree();
            assert.throws(() => {
                tree.parseIn(
`    A
`
                , "file.txt");
            }, "The first step must have 0 indents [file.txt:1]");

            assert.throws(() => {
                tree.parseIn(
`
    A
`
                , "file.txt");
            }, "The first step must have 0 indents [file.txt:2]");
        });

        it("rejects a step that is 2 or more indents ahead of the step above", function() {
            var tree = new Tree();
            assert.throws(() => {
                tree.parseIn(
`A
        B
`
                , "file.txt");
            }, "You cannot have a step that has 2 or more indents beyond the previous step [file.txt:2]");
        });

        it("parses a step block at the very top", function() {
            var tree = new Tree();
            tree.parseIn(
`A
B
C

    D
`
            , "file.txt");

            expect(tree).to.containSubset({
                root: {
                    indents: -1,
                    parent: null,
                    children: [
                        {
                            lineNumber: 1,
                            indents: 0,
                            steps: [
                                {
                                    text: 'A',
                                    lineNumber: 1,
                                    indents: 0,
                                    parent: null,
                                    children: [],
                                    containingStepBlock: { indents: 0, steps: [] }
                                },
                                {
                                    text: 'B',
                                    lineNumber: 2,
                                    indents: 0,
                                    parent: null,
                                    children: [],
                                    containingStepBlock: { indents: 0, steps: [] }
                                },
                                {
                                    text: 'C',
                                    lineNumber: 3,
                                    indents: 0,
                                    parent: null,
                                    children: [],
                                    containingStepBlock: { indents: 0, steps: [] }
                                }
                            ],
                            parent: { indents: -1 },
                            children: [
                                {
                                    text: 'D',
                                    lineNumber: 5,
                                    indents: 1,
                                    parent: { indents: 0, steps: [] },
                                    children: []
                                }
                            ]
                        }
                    ]
                }
            });
        });

        it("parses a step block at the very top, with empty lines above and below", function() {
            var tree = new Tree();
            tree.parseIn(
`
A
B
C

    D
`
            , "file.txt");

            expect(tree).to.containSubset({
                root: {
                    indents: -1,
                    parent: null,
                    children: [
                        {
                            lineNumber: 2,
                            indents: 0,
                            steps: [
                                {
                                    text: 'A',
                                    lineNumber: 2,
                                    indents: 0,
                                    parent: null,
                                    children: [],
                                    containingStepBlock: { indents: 0, steps: [] }
                                },
                                {
                                    text: 'B',
                                    lineNumber: 3,
                                    indents: 0,
                                    parent: null,
                                    children: [],
                                    containingStepBlock: { indents: 0, steps: [] }
                                },
                                {
                                    text: 'C',
                                    lineNumber: 4,
                                    indents: 0,
                                    parent: null,
                                    children: [],
                                    containingStepBlock: { indents: 0, steps: [] }
                                }
                            ],
                            parent: { indents: -1 },
                            children: [
                                {
                                    text: 'D',
                                    lineNumber: 6,
                                    indents: 1,
                                    parent: { indents: 0, steps: [] },
                                    children: []
                                }
                            ]
                        }
                    ]
                }
            });
        });

        it("parses a step block in the middle, with empty lines above and below", function() {
            var tree = new Tree();
            tree.parseIn(
`A

    B
    C
    D

        E
`
            , "file.txt");

            expect(tree).to.containSubset({
                root: {
                    indents: -1,
                    parent: null,
                    children: [
                        {
                            text: 'A',
                            lineNumber: 1,
                            indents: 0,
                            parent: { indents: -1 },
                            children: [
                                {
                                    lineNumber: 3,
                                    indents: 1,
                                    steps: [
                                        {
                                            text: 'B',
                                            lineNumber: 3,
                                            indents: 1,
                                            parent: null,
                                            children: [],
                                            containingStepBlock: { indents: 1, steps: [] }
                                        },
                                        {
                                            text: 'C',
                                            lineNumber: 4,
                                            indents: 1,
                                            parent: null,
                                            children: [],
                                            containingStepBlock: { indents: 1, steps: [] }
                                        },
                                        {
                                            text: 'D',
                                            lineNumber: 5,
                                            indents: 1,
                                            parent: null,
                                            children: [],
                                            containingStepBlock: { indents: 1, steps: [] }
                                        }
                                    ],
                                    parent: { indents: 0 },
                                    children: [
                                        {
                                            text: 'E',
                                            lineNumber: 7,
                                            indents: 2,
                                            parent: { indents: 1, steps: [] },
                                            children: []
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                }
            });
        });

        it("parses a step block in the middle, with only an empty line below", function() {
            var tree = new Tree();
            tree.parseIn(
`A
    B
    C
    D

        E
`
            , "file.txt");

            expect(tree).to.containSubset({
                root: {
                    indents: -1,
                    parent: null,
                    children: [
                        {
                            text: 'A',
                            lineNumber: 1,
                            indents: 0,
                            parent: { indents: -1 },
                            children: [
                                {
                                    lineNumber: 2,
                                    indents: 1,
                                    steps: [
                                        {
                                            text: 'B',
                                            lineNumber: 2,
                                            indents: 1,
                                            parent: null,
                                            children: [],
                                            containingStepBlock: { indents: 1, steps: [] }
                                        },
                                        {
                                            text: 'C',
                                            lineNumber: 3,
                                            indents: 1,
                                            parent: null,
                                            children: [],
                                            containingStepBlock: { indents: 1, steps: [] }
                                        },
                                        {
                                            text: 'D',
                                            lineNumber: 4,
                                            indents: 1,
                                            parent: null,
                                            children: [],
                                            containingStepBlock: { indents: 1, steps: [] }
                                        }
                                    ],
                                    parent: { indents: 0 },
                                    children: [
                                        {
                                            text: 'E',
                                            lineNumber: 6,
                                            indents: 2,
                                            parent: { indents: 1, steps: [] },
                                            children: []
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                }
            });
        });

        it("parses a step block at the very bottom", function() {
            var tree = new Tree();
            tree.parseIn(
`A

    B
    C
    D`
            , "file.txt");

            expect(tree).to.containSubset({
                root: {
                    indents: -1,
                    parent: null,
                    children: [
                        {
                            text: 'A',
                            lineNumber: 1,
                            indents: 0,
                            parent: { indents: -1 },
                            children: [
                                {
                                    lineNumber: 3,
                                    indents: 1,
                                    steps: [
                                        {
                                            text: 'B',
                                            lineNumber: 3,
                                            indents: 1,
                                            parent: null,
                                            children: [],
                                            containingStepBlock: { indents: 1, steps: [] }
                                        },
                                        {
                                            text: 'C',
                                            lineNumber: 4,
                                            indents: 1,
                                            parent: null,
                                            children: [],
                                            containingStepBlock: { indents: 1, steps: [] }
                                        },
                                        {
                                            text: 'D',
                                            lineNumber: 5,
                                            indents: 1,
                                            parent: null,
                                            children: [],
                                            containingStepBlock: { indents: 1, steps: [] }
                                        }
                                    ],
                                    parent: { indents: 0 },
                                    children: []
                                }
                            ]
                        }
                    ]
                }
            });
        });

        it("parses a step block at the bottom, with an empty line below", function() {
            var tree = new Tree();
            tree.parseIn(
`A

    B
    C
    D
`
            , "file.txt");

            expect(tree).to.containSubset({
                root: {
                    indents: -1,
                    parent: null,
                    children: [
                        {
                            text: 'A',
                            lineNumber: 1,
                            indents: 0,
                            parent: { indents: -1 },
                            children: [
                                {
                                    lineNumber: 3,
                                    indents: 1,
                                    steps: [
                                        {
                                            text: 'B',
                                            lineNumber: 3,
                                            indents: 1,
                                            parent: null,
                                            children: [],
                                            containingStepBlock: { indents: 1, steps: [] }
                                        },
                                        {
                                            text: 'C',
                                            lineNumber: 4,
                                            indents: 1,
                                            parent: null,
                                            children: [],
                                            containingStepBlock: { indents: 1, steps: [] }
                                        },
                                        {
                                            text: 'D',
                                            lineNumber: 5,
                                            indents: 1,
                                            parent: null,
                                            children: [],
                                            containingStepBlock: { indents: 1, steps: [] }
                                        }
                                    ],
                                    parent: { indents: 0 },
                                    children: []
                                }
                            ]
                        }
                    ]
                }
            });
        });

        it("parses a step block with an indented line directly above", function() {
            var tree = new Tree();
            tree.parseIn(
`A
    B
C
D`
            , "file.txt");

            expect(tree).to.containSubset({
                root: {
                    indents: -1,
                    parent: null,
                    children: [
                        {
                            text: 'A',
                            lineNumber: 1,
                            indents: 0,
                            parent: { indents: -1 },
                            children: [
                                {
                                    text: 'B',
                                    lineNumber: 2,
                                    indents: 1,
                                    parent: { indents: 0 },
                                    children: []
                                }
                            ]
                        },
                        {
                            lineNumber: 3,
                            indents: 0,
                            steps: [
                                {
                                    text: 'C',
                                    lineNumber: 3,
                                    indents: 0,
                                    parent: null,
                                    children: [],
                                    containingStepBlock: { indents: 0, steps: [] }
                                },
                                {
                                    text: 'D',
                                    lineNumber: 4,
                                    indents: 0,
                                    parent: null,
                                    children: [],
                                    containingStepBlock: { indents: 0, steps: [] }
                                }
                            ],
                            parent: { indents: -1 },
                            children: []
                        }
                    ]
                }
            });
        });

        it("parses a step block with an indented line above", function() {
            var tree = new Tree();
            tree.parseIn(
`A
    B

C
D`
            , "file.txt");

            expect(tree).to.containSubset({
                root: {
                    indents: -1,
                    parent: null,
                    children: [
                        {
                            text: 'A',
                            lineNumber: 1,
                            indents: 0,
                            parent: { indents: -1 },
                            children: [
                                {
                                    text: 'B',
                                    lineNumber: 2,
                                    indents: 1,
                                    parent: { indents: 0 },
                                    children: []
                                }
                            ]
                        },
                        {
                            lineNumber: 4,
                            indents: 0,
                            steps: [
                                {
                                    text: 'C',
                                    lineNumber: 4,
                                    indents: 0,
                                    parent: null,
                                    children: [],
                                    containingStepBlock: { indents: 0, steps: [] }
                                },
                                {
                                    text: 'D',
                                    lineNumber: 5,
                                    indents: 0,
                                    parent: null,
                                    children: [],
                                    containingStepBlock: { indents: 0, steps: [] }
                                }
                            ],
                            parent: { indents: -1 },
                            children: []
                        }
                    ]
                }
            });
        });

        it("recognizes an empty line as the end of a step block", function() {
            var tree = new Tree();
            tree.parseIn(
`A
B

C`
            , "file.txt");

            expect(tree).to.containSubset({
                root: {
                    indents: -1,
                    parent: null,
                    children: [
                        {
                            lineNumber: 1,
                            indents: 0,
                            steps: [
                                {
                                    text: 'A',
                                    lineNumber: 1,
                                    indents: 0,
                                    parent: null,
                                    children: [],
                                    containingStepBlock: { indents: 0, steps: [] }
                                },
                                {
                                    text: 'B',
                                    lineNumber: 2,
                                    indents: 0,
                                    parent: null,
                                    children: [],
                                    containingStepBlock: { indents: 0, steps: [] }
                                }
                            ],
                            parent: { indents: -1 },
                            children: []
                        },
                        {
                            text: 'C',
                            lineNumber: 4,
                            indents: 0,
                            parent: { indents: -1 },
                            children: []
                        }
                    ]
                }
            });
        });

        it("parses multiple nested step blocks", function() {
            var tree = new Tree();
            tree.parseIn(
`A
B
C

    D
    E
    F
`
            , "file.txt");

            expect(tree).to.containSubset({
                root: {
                    indents: -1,
                    parent: null,
                    children: [
                        {
                            lineNumber: 1,
                            indents: 0,
                            steps: [
                                {
                                    text: 'A',
                                    lineNumber: 1,
                                    indents: 0,
                                    parent: null,
                                    children: [],
                                    containingStepBlock: { indents: 0, steps: [] }
                                },
                                {
                                    text: 'B',
                                    lineNumber: 2,
                                    indents: 0,
                                    parent: null,
                                    children: [],
                                    containingStepBlock: { indents: 0, steps: [] }
                                },
                                {
                                    text: 'C',
                                    lineNumber: 3,
                                    indents: 0,
                                    parent: null,
                                    children: [],
                                    containingStepBlock: { indents: 0, steps: [] }
                                }
                            ],
                            parent: { indents: -1 },
                            children: [
                                {
                                    lineNumber: 5,
                                    indents: 1,
                                    steps: [
                                        {
                                            text: 'D',
                                            lineNumber: 5,
                                            indents: 1,
                                            parent: null,
                                            children: [],
                                            containingStepBlock: { indents: 1, steps: [] }
                                        },
                                        {
                                            text: 'E',
                                            lineNumber: 6,
                                            indents: 1,
                                            parent: null,
                                            children: [],
                                            containingStepBlock: { indents: 1, steps: [] }
                                        },
                                        {
                                            text: 'F',
                                            lineNumber: 7,
                                            indents: 1,
                                            parent: null,
                                            children: [],
                                            containingStepBlock: { indents: 1, steps: [] }
                                        }
                                    ],
                                    parent: { indents: 0 },
                                    children: []
                                }
                            ]
                        }
                    ]
                }
            });
        });

        it("rejects a step block containing a function declaration", function() {
            var tree = new Tree();
            assert.throws(() => {
                tree.parseIn(
`A
* B
C`
                , "file.txt");
            }, "You cannot have a * Function declaration within a step block [file.txt:2]");
        });

        it("rejects a step block containing a code block", function() {
            var tree = new Tree();
            assert.throws(() => {
                tree.parseIn(
`A
B {
}
C`
                , "file.txt");
            }, "You cannot have a code block within a step block [file.txt:2]");
        });

        it("rejects a step block with children that doesn't end in an empty line", function() {
            var tree = new Tree();
            assert.throws(() => {
                tree.parseIn(
`A
B
    C
`
                , "file.txt");
            }, "There must be an empty line under a step block if it has children directly underneath it. Try putting an empty line under this line. [file.txt:2]");
        });

        it("doesn't reject a step block that's directly followed by a line indented left of the step block", function() {
            var tree = new Tree();
            assert.doesNotThrow(() => {
                tree.parseIn(
`A
    B
    C
D
`
                , "file.txt");
            });
        });

        it("doesn't reject a step block if it doesn't have children and doesn't end in an empty line", function() {
            var tree = new Tree();
            assert.doesNotThrow(() => {
                tree.parseIn(
`A
B`
                , "file.txt");
            });
        });

        it("parses a .. step block with an empty line above it", function() {
            var tree = new Tree();
            tree.parseIn(
`A

    ..
    B
    C
    D
`
            , "file.txt");

            expect(tree).to.containSubset({
                root: {
                    indents: -1,
                    parent: null,
                    children: [
                        {
                            text: 'A',
                            lineNumber: 1,
                            indents: 0,
                            parent: { indents: -1 },
                            children: [
                                {
                                    lineNumber: 3,
                                    indents: 1,
                                    isSequential: true,
                                    steps: [
                                        {
                                            text: 'B',
                                            lineNumber: 4,
                                            indents: 1,
                                            parent: null,
                                            children: [],
                                            containingStepBlock: { indents: 1, steps: [] }
                                        },
                                        {
                                            text: 'C',
                                            lineNumber: 5,
                                            indents: 1,
                                            parent: null,
                                            children: [],
                                            containingStepBlock: { indents: 1, steps: [] }
                                        },
                                        {
                                            text: 'D',
                                            lineNumber: 6,
                                            indents: 1,
                                            parent: null,
                                            children: [],
                                            containingStepBlock: { indents: 1, steps: [] }
                                        }
                                    ],
                                    parent: { indents: 0 },
                                    children: []
                                }
                            ]
                        }
                    ]
                }
            });
        });

        it("parses a .. step block with no empty line above it", function() {
            var tree = new Tree();
            tree.parseIn(
`A
    ..
    B
    C
    D
`
            , "file.txt");

            expect(tree).to.containSubset({
                root: {
                    indents: -1,
                    parent: null,
                    children: [
                        {
                            text: 'A',
                            lineNumber: 1,
                            indents: 0,
                            parent: { indents: -1 },
                            children: [
                                {
                                    lineNumber: 2,
                                    indents: 1,
                                    isSequential: true,
                                    steps: [
                                        {
                                            text: 'B',
                                            lineNumber: 3,
                                            indents: 1,
                                            parent: null,
                                            children: [],
                                            containingStepBlock: { indents: 1, steps: [] }
                                        },
                                        {
                                            text: 'C',
                                            lineNumber: 4,
                                            indents: 1,
                                            parent: null,
                                            children: [],
                                            containingStepBlock: { indents: 1, steps: [] }
                                        },
                                        {
                                            text: 'D',
                                            lineNumber: 5,
                                            indents: 1,
                                            parent: null,
                                            children: [],
                                            containingStepBlock: { indents: 1, steps: [] }
                                        }
                                    ],
                                    parent: { indents: 0 },
                                    children: []
                                }
                            ]
                        }
                    ]
                }
            });
        });

        it("parses a .. step block on the first line", function() {
            var tree = new Tree();
            tree.parseIn(
`..
A
B
C
`
            , "file.txt");

            expect(tree).to.containSubset({
                root: {
                    indents: -1,
                    parent: null,
                    children: [
                        {
                            lineNumber: 1,
                            indents: 0,
                            isSequential: true,
                            steps: [
                                {
                                    text: 'A',
                                    lineNumber: 2,
                                    indents: 0,
                                    parent: null,
                                    children: [],
                                    containingStepBlock: { indents: 0, steps: [] }
                                },
                                {
                                    text: 'B',
                                    lineNumber: 3,
                                    indents: 0,
                                    parent: null,
                                    children: [],
                                    containingStepBlock: { indents: 0, steps: [] }
                                },
                                {
                                    text: 'C',
                                    lineNumber: 4,
                                    indents: 0,
                                    parent: null,
                                    children: [],
                                    containingStepBlock: { indents: 0, steps: [] }
                                }
                            ],
                            parent: { indents: -1 },
                            children: []
                        }
                    ]
                }
            });
        });

        it("parses empty lines followed by a .. step block", function() {
            var tree = new Tree();
            tree.parseIn(
`

..
A
B
C
`
            , "file.txt");

            expect(tree).to.containSubset({
                root: {
                    indents: -1,
                    parent: null,
                    children: [
                        {
                            lineNumber: 3,
                            indents: 0,
                            isSequential: true,
                            steps: [
                                {
                                    text: 'A',
                                    lineNumber: 4,
                                    indents: 0,
                                    parent: null,
                                    children: [],
                                    containingStepBlock: { indents: 0, steps: [] }
                                },
                                {
                                    text: 'B',
                                    lineNumber: 5,
                                    indents: 0,
                                    parent: null,
                                    children: [],
                                    containingStepBlock: { indents: 0, steps: [] }
                                },
                                {
                                    text: 'C',
                                    lineNumber: 6,
                                    indents: 0,
                                    parent: null,
                                    children: [],
                                    containingStepBlock: { indents: 0, steps: [] }
                                }
                            ],
                            parent: { indents: -1 },
                            children: []
                        }
                    ]
                }
            });
        });

        it("rejects a step block containing a .. line in the middle", function() {
            var tree = new Tree();
            assert.throws(() => {
                tree.parseIn(
`A
B
..
C
D
`
                , "file.txt");
            }, "You cannot have a .. line at the same indent level as the adjacent line above [file.txt:3]");
        });

        it("rejects a step block containing a .. line at the end", function() {
            var tree = new Tree();
            assert.throws(() => {
                tree.parseIn(
`A
B
..`
                , "file.txt");
            }, "You cannot have a .. line at the same indent level as the adjacent line above [file.txt:3]");

            assert.throws(() => {
                tree.parseIn(
`A
B
..
`
                , "file.txt");
            }, "You cannot have a .. line at the same indent level as the adjacent line above [file.txt:3]");

            assert.throws(() => {
                tree.parseIn(
`..`
                , "file.txt");
            }, "You cannot have a .. line without anything directly below [file.txt:1]");
        });

        it("rejects a .. line by itself", function() {
            var tree = new Tree();
            assert.throws(() => {
                tree.parseIn(
`A
B

..

C
`
                , "file.txt");
            }, "You cannot have a .. line without anything directly below [file.txt:4]");
        });

        it("rejects a .. line that's immediately followed by indented children", function() {
            var tree = new Tree();
            assert.throws(() => {
                tree.parseIn(
`..
    A
    B
`
                , "file.txt");
            }, "A .. line must be followed by a line at the same indent level [file.txt:1]");
        });

        it("rejects a .. line followed by an invalid step block", function() {
            var tree = new Tree();
            assert.throws(() => {
                tree.parseIn(
`..
A
    B
    C
D
`
                , "file.txt");
            }, "A .. line must be followed by a step block [file.txt:1]");

            assert.throws(() => {
                tree.parseIn(
`A

    ..
    B

E
`
                , "file.txt");
            }, "A .. line must be followed by a step block [file.txt:3]");
        });

        it("rejects two .. lines in a row", function() {
            var tree = new Tree();
            assert.throws(() => {
                tree.parseIn(
`..
..
`
                , "file.txt");
            }, "You cannot have two .. lines in a row [file.txt:1]");
        });

        it("parses a step block, followed by an indented .. step block", function() {
            var tree = new Tree();
            tree.parseIn(
`A
B
    ..
    C
    D
`
            , "file.txt");

            expect(tree).to.containSubset({
                root: {
                    indents: -1,
                    parent: null,
                    children: [
                        {
                            lineNumber: 1,
                            indents: 0,
                            isSequential: undefined,
                            steps: [
                                {
                                    text: 'A',
                                    lineNumber: 1,
                                    indents: 0,
                                    parent: null,
                                    children: [],
                                    containingStepBlock: { indents: 0, steps: [] }
                                },
                                {
                                    text: 'B',
                                    lineNumber: 2,
                                    indents: 0,
                                    parent: null,
                                    children: [],
                                    containingStepBlock: { indents: 0, steps: [] }
                                }
                            ],
                            parent: { indents: -1 },
                            children: [
                                {
                                    lineNumber: 3,
                                    indents: 1,
                                    isSequential: true,
                                    steps: [
                                        {
                                            text: 'C',
                                            lineNumber: 4,
                                            indents: 1,
                                            parent: null,
                                            children: [],
                                            containingStepBlock: { indents: 1, steps: [] }
                                        },
                                        {
                                            text: 'D',
                                            lineNumber: 5,
                                            indents: 1,
                                            parent: null,
                                            children: [],
                                            containingStepBlock: { indents: 1, steps: [] }
                                        }
                                    ],
                                    parent: { indents: 0 },
                                    children: []
                                }
                            ]
                        }
                    ]
                }
            });
        });

        it("parses a step block, followed by an empty line, followed by an indented .. step block", function() {
            var tree = new Tree();
            tree.parseIn(
`A
B

    ..
    C
    D
`
            , "file.txt");

            expect(tree).to.containSubset({
                root: {
                    indents: -1,
                    parent: null,
                    children: [
                        {
                            lineNumber: 1,
                            indents: 0,
                            isSequential: undefined,
                            steps: [
                                {
                                    text: 'A',
                                    lineNumber: 1,
                                    indents: 0,
                                    parent: null,
                                    children: [],
                                    containingStepBlock: { indents: 0, steps: [] }
                                },
                                {
                                    text: 'B',
                                    lineNumber: 2,
                                    indents: 0,
                                    parent: null,
                                    children: [],
                                    containingStepBlock: { indents: 0, steps: [] }
                                }
                            ],
                            parent: { indents: -1 },
                            children: [
                                {
                                    lineNumber: 4,
                                    indents: 1,
                                    isSequential: true,
                                    steps: [
                                        {
                                            text: 'C',
                                            lineNumber: 5,
                                            indents: 1,
                                            parent: null,
                                            children: [],
                                            containingStepBlock: { indents: 1, steps: [] }
                                        },
                                        {
                                            text: 'D',
                                            lineNumber: 6,
                                            indents: 1,
                                            parent: null,
                                            children: [],
                                            containingStepBlock: { indents: 1, steps: [] }
                                        }
                                    ],
                                    parent: { indents: 0 },
                                    children: []
                                }
                            ]
                        }
                    ]
                }
            });
        });

        it("parses a .. step block, followed by an indented .. step block", function() {
            var tree = new Tree();
            tree.parseIn(
`..
A
B
    ..
    C
    D
`
            , "file.txt");

            expect(tree).to.containSubset({
                root: {
                    indents: -1,
                    parent: null,
                    children: [
                        {
                            lineNumber: 1,
                            indents: 0,
                            isSequential: true,
                            steps: [
                                {
                                    text: 'A',
                                    lineNumber: 2,
                                    indents: 0,
                                    parent: null,
                                    children: [],
                                    containingStepBlock: { indents: 0, steps: [] }
                                },
                                {
                                    text: 'B',
                                    lineNumber: 3,
                                    indents: 0,
                                    parent: null,
                                    children: [],
                                    containingStepBlock: { indents: 0, steps: [] }
                                }
                            ],
                            parent: { indents: -1 },
                            children: [
                                {
                                    lineNumber: 4,
                                    indents: 1,
                                    isSequential: true,
                                    steps: [
                                        {
                                            text: 'C',
                                            lineNumber: 5,
                                            indents: 1,
                                            parent: null,
                                            children: [],
                                            containingStepBlock: { indents: 1, steps: [] }
                                        },
                                        {
                                            text: 'D',
                                            lineNumber: 6,
                                            indents: 1,
                                            parent: null,
                                            children: [],
                                            containingStepBlock: { indents: 1, steps: [] }
                                        }
                                    ],
                                    parent: { indents: 0 },
                                    children: []
                                }
                            ]
                        }
                    ]
                }
            });
        });

        it("parses a .. step block, followed by an empty line, followed by an indented .. step block", function() {
            var tree = new Tree();
            tree.parseIn(
`..
A
B

    ..
    C
    D
`
            , "file.txt");

            expect(tree).to.containSubset({
                root: {
                    indents: -1,
                    parent: null,
                    children: [
                        {
                            lineNumber: 1,
                            indents: 0,
                            isSequential: true,
                            steps: [
                                {
                                    text: 'A',
                                    lineNumber: 2,
                                    indents: 0,
                                    parent: null,
                                    children: [],
                                    containingStepBlock: { indents: 0, steps: [] }
                                },
                                {
                                    text: 'B',
                                    lineNumber: 3,
                                    indents: 0,
                                    parent: null,
                                    children: [],
                                    containingStepBlock: { indents: 0, steps: [] }
                                }
                            ],
                            parent: { indents: -1 },
                            children: [
                                {
                                    lineNumber: 5,
                                    indents: 1,
                                    isSequential: true,
                                    steps: [
                                        {
                                            text: 'C',
                                            lineNumber: 6,
                                            indents: 1,
                                            parent: null,
                                            children: [],
                                            containingStepBlock: { indents: 1, steps: [] }
                                        },
                                        {
                                            text: 'D',
                                            lineNumber: 7,
                                            indents: 1,
                                            parent: null,
                                            children: [],
                                            containingStepBlock: { indents: 1, steps: [] }
                                        }
                                    ],
                                    parent: { indents: 0 },
                                    children: []
                                }
                            ]
                        }
                    ]
                }
            });
        });

        it("parses three levels of step blocks", function() {
            var tree = new Tree();
            tree.parseIn(
`A
B

    C
    D

        E
        F`
            , "file.txt");

            expect(tree).to.containSubset({
                root: {
                    indents: -1,
                    parent: null,
                    children: [
                        {
                            lineNumber: 1,
                            indents: 0,
                            isSequential: undefined,
                            steps: [
                                {
                                    text: 'A',
                                    lineNumber: 1,
                                    indents: 0,
                                    parent: null,
                                    children: [],
                                    containingStepBlock: { indents: 0, steps: [] }
                                },
                                {
                                    text: 'B',
                                    lineNumber: 2,
                                    indents: 0,
                                    parent: null,
                                    children: [],
                                    containingStepBlock: { indents: 0, steps: [] }
                                }
                            ],
                            parent: { indents: -1 },
                            children: [
                                {
                                    lineNumber: 4,
                                    indents: 1,
                                    isSequential: undefined,
                                    steps: [
                                        {
                                            text: 'C',
                                            lineNumber: 4,
                                            indents: 1,
                                            parent: null,
                                            children: [],
                                            containingStepBlock: { indents: 1, steps: [] }
                                        },
                                        {
                                            text: 'D',
                                            lineNumber: 5,
                                            indents: 1,
                                            parent: null,
                                            children: [],
                                            containingStepBlock: { indents: 1, steps: [] }
                                        }
                                    ],
                                    parent: { indents: 0 },
                                    children: [
                                        {
                                            lineNumber: 7,
                                            indents: 2,
                                            isSequential: undefined,
                                            steps: [
                                                {
                                                    text: 'E',
                                                    lineNumber: 7,
                                                    indents: 2,
                                                    parent: null,
                                                    children: [],
                                                    containingStepBlock: { indents: 2, steps: [] }
                                                },
                                                {
                                                    text: 'F',
                                                    lineNumber: 8,
                                                    indents: 2,
                                                    parent: null,
                                                    children: [],
                                                    containingStepBlock: { indents: 2, steps: [] }
                                                }
                                            ],
                                            parent: { indents: 1 },
                                            children: []
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                }
            });
        });

        it("parses step blocks immediately preceded by a parent, with no empty line in between", function() {
            var tree = new Tree();
            tree.parseIn(
`A
    B
    C
`
            , "file.txt");

            expect(tree).to.containSubset({
                root: {
                    indents: -1,
                    parent: null,
                    children: [
                        {
                            text: 'A',
                            lineNumber: 1,
                            indents: 0,
                            parent: { indents: -1 },
                            children: [
                                {
                                    lineNumber: 2,
                                    indents: 1,
                                    isSequential: undefined,
                                    steps: [
                                        {
                                            text: 'B',
                                            lineNumber: 2,
                                            indents: 1,
                                            parent: null,
                                            children: [],
                                            containingStepBlock: { indents: 1, steps: [] }
                                        },
                                        {
                                            text: 'C',
                                            lineNumber: 3,
                                            indents: 1,
                                            parent: null,
                                            children: [],
                                            containingStepBlock: { indents: 1, steps: [] }
                                        }
                                    ],
                                    parent: { indents: 0 },
                                    children: []
                                }
                            ]
                        }
                    ]
                }
            });
        });

        it("parses a step block immediately followed by a line that's less indented than the step block", function() {
            var tree = new Tree();
            tree.parseIn(
`A

    B
    C
D
`
            , "file.txt");

            expect(tree).to.containSubset({
                root: {
                    indents: -1,
                    parent: null,
                    children: [
                        {
                            text: 'A',
                            lineNumber: 1,
                            indents: 0,
                            parent: { indents: -1 },
                            children: [
                                {
                                    lineNumber: 3,
                                    indents: 1,
                                    isSequential: undefined,
                                    steps: [
                                        {
                                            text: 'B',
                                            lineNumber: 3,
                                            indents: 1,
                                            parent: null,
                                            children: [],
                                            containingStepBlock: { indents: 1, steps: [] }
                                        },
                                        {
                                            text: 'C',
                                            lineNumber: 4,
                                            indents: 1,
                                            parent: null,
                                            children: [],
                                            containingStepBlock: { indents: 1, steps: [] }
                                        }
                                    ],
                                    parent: { indents: 0 },
                                    children: []
                                }
                            ]
                        },
                        {
                            text: 'D',
                            lineNumber: 5,
                            indents: 0,
                            parent: { indents: -1 },
                            children: []
                        }
                    ]
                }
            });
        });

        it("parses a code block", function() {
            var tree = new Tree();
            tree.parseIn(
`A
    Code block here {
        code;
        more code;
    }

    B
C
`
            , "file.txt");

            expect(tree).to.containSubset({
                root: {
                    indents: -1,
                    parent: null,
                    children: [
                        {
                            text: 'A',
                            codeBlock: undefined,
                            lineNumber: 1,
                            indents: 0,
                            parent: { indents: -1 },
                            children: [
                                {
                                    text: 'Code block here',
                                    codeBlock: '\n        code;\n        more code;\n',
                                    lineNumber: 2,
                                    indents: 1,
                                    parent: { indents: 0 },
                                    children: []
                                },
                                {
                                    text: 'B',
                                    codeBlock: undefined,
                                    lineNumber: 7,
                                    indents: 1,
                                    parent: { indents: 0 },
                                    children: []
                                }
                            ]
                        },
                        {
                            text: 'C',
                            codeBlock: undefined,
                            lineNumber: 8,
                            indents: 0,
                            parent: { indents: -1 },
                            children: []
                        }
                    ]
                }
            });
        });

        it("parses an empty code block", function() {
            var tree = new Tree();
            tree.parseIn(
`A
    Code block here {
    }

    B
C
`
            , "file.txt");

            expect(tree).to.containSubset({
                root: {
                    indents: -1,
                    parent: null,
                    children: [
                        {
                            text: 'A',
                            codeBlock: undefined,
                            lineNumber: 1,
                            indents: 0,
                            parent: { indents: -1 },
                            children: [
                                {
                                    text: 'Code block here',
                                    codeBlock: '\n',
                                    lineNumber: 2,
                                    indents: 1,
                                    parent: { indents: 0 },
                                    children: []
                                },
                                {
                                    text: 'B',
                                    codeBlock: undefined,
                                    lineNumber: 5,
                                    indents: 1,
                                    parent: { indents: 0 },
                                    children: []
                                }
                            ]
                        },
                        {
                            text: 'C',
                            codeBlock: undefined,
                            lineNumber: 6,
                            indents: 0,
                            parent: { indents: -1 },
                            children: []
                        }
                    ]
                }
            });
        });

        it("parses a code block with siblings", function() {
            var tree = new Tree();
            tree.parseIn(
`A
    Code block here {
        code;
        more code;
    }

    B
`
            , "file.txt");

            expect(tree).to.containSubset({
                root: {
                    indents: -1,
                    parent: null,
                    children: [
                        {
                            text: 'A',
                            codeBlock: undefined,
                            lineNumber: 1,
                            indents: 0,
                            parent: { indents: -1 },
                            children: [
                                {
                                    text: 'Code block here',
                                    codeBlock: '\n        code;\n        more code;\n',
                                    lineNumber: 2,
                                    indents: 1,
                                    parent: { indents: 0 },
                                    children: []
                                },
                                {
                                    text: 'B',
                                    codeBlock: undefined,
                                    lineNumber: 7,
                                    indents: 1,
                                    parent: { indents: 0 },
                                    children: []
                                }
                            ]
                        }
                    ]
                }
            });
        });

        it("parses a code block with siblings, not separated by an empty line", function() {
            var tree = new Tree();
            tree.parseIn(
`A
    Code block here {
        code;
        more code;
    }
    B`
            , "file.txt");

            expect(tree).to.containSubset({
                root: {
                    indents: -1,
                    parent: null,
                    children: [
                        {
                            text: 'A',
                            codeBlock: undefined,
                            lineNumber: 1,
                            indents: 0,
                            parent: { indents: -1 },
                            children: [
                                {
                                    text: 'Code block here',
                                    codeBlock: '\n        code;\n        more code;\n',
                                    lineNumber: 2,
                                    indents: 1,
                                    parent: { indents: 0 },
                                    children: []
                                },
                                {
                                    text: 'B',
                                    codeBlock: undefined,
                                    lineNumber: 6,
                                    indents: 1,
                                    parent: { indents: 0 },
                                    children: []
                                }
                            ]
                        }
                    ]
                }
            });
        });

        it("parses a code block with children", function() {
            var tree = new Tree();
            tree.parseIn(
`A
    Code block here {
        code;
        more code;
    }

        B
`
            , "file.txt");

            expect(tree).to.containSubset({
                root: {
                    indents: -1,
                    parent: null,
                    children: [
                        {
                            text: 'A',
                            codeBlock: undefined,
                            lineNumber: 1,
                            indents: 0,
                            parent: { indents: -1 },
                            children: [
                                {
                                    text: 'Code block here',
                                    codeBlock: '\n        code;\n        more code;\n',
                                    lineNumber: 2,
                                    indents: 1,
                                    parent: { indents: 0 },
                                    children: [
                                        {
                                            text: 'B',
                                            codeBlock: undefined,
                                            lineNumber: 7,
                                            indents: 2,
                                            parent: { indents: 1 },
                                            children: []
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                }
            });
        });

        it("parses a code block with children, not separated by an empty line", function() {
            var tree = new Tree();
            tree.parseIn(
`A
    Code block here {
        code;
        more code;
    }
        B
`
            , "file.txt");

            expect(tree).to.containSubset({
                root: {
                    indents: -1,
                    parent: null,
                    children: [
                        {
                            text: 'A',
                            codeBlock: undefined,
                            lineNumber: 1,
                            indents: 0,
                            parent: { indents: -1 },
                            children: [
                                {
                                    text: 'Code block here',
                                    codeBlock: '\n        code;\n        more code;\n',
                                    lineNumber: 2,
                                    indents: 1,
                                    parent: { indents: 0 },
                                    children: [
                                        {
                                            text: 'B',
                                            codeBlock: undefined,
                                            lineNumber: 6,
                                            indents: 2,
                                            parent: { indents: 1 },
                                            children: []
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                }
            });
        });

        it("parses a code block with step blocks as children", function() {
            var tree = new Tree();
            tree.parseIn(
`A
    Code block here {
        code;
        more code;
    }

        B
        C
`
            , "file.txt");

            expect(tree).to.containSubset({
                root: {
                    indents: -1,
                    parent: null,
                    children: [
                        {
                            text: 'A',
                            codeBlock: undefined,
                            lineNumber: 1,
                            indents: 0,
                            parent: { indents: -1 },
                            children: [
                                {
                                    text: 'Code block here',
                                    codeBlock: '\n        code;\n        more code;\n',
                                    lineNumber: 2,
                                    indents: 1,
                                    parent: { indents: 0 },
                                    children: [
                                        {
                                            lineNumber: 7,
                                            indents: 2,
                                            steps: [
                                                {
                                                    text: 'B',
                                                    lineNumber: 7,
                                                    indents: 2,
                                                    parent: null,
                                                    children: [],
                                                    containingStepBlock: { indents: 2, steps: [] }
                                                },
                                                {
                                                    text: 'C',
                                                    lineNumber: 8,
                                                    indents: 2,
                                                    parent: null,
                                                    children: [],
                                                    containingStepBlock: { indents: 2, steps: [] }
                                                }
                                            ],
                                            parent: { indents: 1 },
                                            children: []
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                }
            });
        });

        it("parses a code block with a code block as a child", function() {
            var tree = new Tree();
            tree.parseIn(
`A
    Code block here {
        code;
        more code;
    }

        Another code block # {
            blah;
        }
`
            , "file.txt");

            expect(tree).to.containSubset({
                root: {
                    indents: -1,
                    parent: null,
                    children: [
                        {
                            text: 'A',
                            codeBlock: undefined,
                            lineNumber: 1,
                            indents: 0,
                            parent: { indents: -1 },
                            children: [
                                {
                                    text: 'Code block here',
                                    codeBlock: '\n        code;\n        more code;\n',
                                    lineNumber: 2,
                                    indents: 1,
                                    parent: { indents: 0 },
                                    children: [
                                        {
                                            text: 'Another code block',
                                            codeBlock: '\n            blah;\n',
                                            lineNumber: 7,
                                            indents: 2,
                                            parent: { indents: 1 },
                                            children: []
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                }
            });
        });

        it("parses a code block with a code block as a child, not separated by an empty line", function() {
            var tree = new Tree();
            tree.parseIn(
`A
    Code block here {
        code;
        more code;
    }
        Another code block - # {
            blah;
        }`
            , "file.txt");

            expect(tree).to.containSubset({
                root: {
                    indents: -1,
                    parent: null,
                    children: [
                        {
                            text: 'A',
                            codeBlock: undefined,
                            lineNumber: 1,
                            indents: 0,
                            parent: { indents: -1 },
                            children: [
                                {
                                    text: 'Code block here',
                                    codeBlock: '\n        code;\n        more code;\n',
                                    lineNumber: 2,
                                    indents: 1,
                                    parent: { indents: 0 },
                                    children: [
                                        {
                                            text: 'Another code block',
                                            codeBlock: '\n            blah;\n',
                                            lineNumber: 6,
                                            indents: 2,
                                            parent: { indents: 1 },
                                            children: []
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                }
            });
        });

        it("rejects a code block that isn't closed", function() {
            var tree = new Tree();
            assert.throws(() => {
                tree.parseIn(
`A
    Code block here {
        code;
        more code;
`
                , "file.txt");
            }, "An unclosed code block was found [file.txt:2]");

            assert.throws(() => {
                tree.parseIn(
`Code block here {`
                , "file.txt");
            }, "An unclosed code block was found [file.txt:1]");
        });

        it("rejects a code block with a closing } at the wrong indentation", function() {
            var tree = new Tree();
            assert.throws(() => {
                tree.parseIn(
`A
    Code block here {

}
`
                , "file.txt");
            }, "An unclosed code block was found [file.txt:2]");

            assert.throws(() => {
                tree.parseIn(
`A
    Code block here {

        }
`
                , "file.txt");
            }, "An unclosed code block was found [file.txt:2]");
        });
    });

    describe("findFunctionDeclaration()", function() {
        it("finds the right function when its declaration is a sibling of the function call and is below the function call", function() {
            var tree = new Tree();
            tree.parseIn(`
My function

* My function
    Step one -
`);

            var stepsAbove = [ tree.root.children[0].cloneForBranch() ];
            var functionDeclaration = tree.findFunctionDeclaration(stepsAbove);

            expect(functionDeclaration).to.containSubset({
                text: "My function",
                isFunctionDeclaration: true,
                parent: { indents: -1 },
                children: [
                    {
                        text: "Step one",
                        isTextualStep: true
                    }
                ]
            });

            expect(functionDeclaration === tree.root.children[1]).to.equal(true);
        });

        it("finds the right function when its declaration is a sibling of the function call and is above the function call", function() {
            var tree = new Tree();
            tree.parseIn(`
* My function
    Step one -
My function
`);

            var stepsAbove = [ tree.root.children[1].cloneForBranch() ];
            var functionDeclaration = tree.findFunctionDeclaration(stepsAbove);

            expect(functionDeclaration).to.containSubset({
                text: "My function",
                isFunctionDeclaration: true,
                parent: { indents: -1 },
                children: [
                    {
                        text: "Step one",
                        isTextualStep: true
                    }
                ]
            });

            expect(functionDeclaration === tree.root.children[0]).to.equal(true);
        });

        it("finds the right function when its declaration is a sibling of a descendant", function() {
            var tree = new Tree();
            tree.parseIn(`
Some parent step -
    My function

* My function
    Step one -
`);

            var stepsAbove = [
                tree.root.children[0].cloneForBranch(),
                tree.root.children[0].children[0].cloneForBranch()
            ];
            var functionDeclaration = tree.findFunctionDeclaration(stepsAbove);

            expect(functionDeclaration).to.containSubset({
                text: "My function",
                isFunctionDeclaration: true,
                parent: { indents: -1 },
                children: [
                    {
                        text: "Step one",
                        isTextualStep: true
                    }
                ]
            });

            expect(functionDeclaration === tree.root.children[1]).to.equal(true);
        });

        it("finds the right function even if a step block has to be traversed", function() {
            var tree = new Tree();
            tree.parseIn(`
Step block step 1 -
Step block step 2 -

    My function

* My function
    Step one -
`);

            var stepsAbove = [
                tree.root.children[0].steps[0].cloneForBranch(),
                tree.root.children[0].children[0].cloneForBranch()
            ];
            var functionDeclaration = tree.findFunctionDeclaration(stepsAbove);

            expect(functionDeclaration).to.containSubset({
                text: "My function",
                isFunctionDeclaration: true,
                parent: { indents: -1 },
                children: [
                    {
                        text: "Step one",
                        isTextualStep: true
                    }
                ]
            });

            expect(functionDeclaration === tree.root.children[1]).to.equal(true);
        });

        it("finds the right function even if declaration has different amounts of whitespace between words", function() {
            var tree = new Tree();
            tree.parseIn(`
Some parent step -
    My     function

* My  function
    Step one -
`);

            var stepsAbove = [
                tree.root.children[0].cloneForBranch(),
                tree.root.children[0].children[0].cloneForBranch()
            ];
            var functionDeclaration = tree.findFunctionDeclaration(stepsAbove);

            expect(functionDeclaration).to.containSubset({
                text: "My  function",
                isFunctionDeclaration: true,
                parent: { indents: -1 },
                children: [
                    {
                        text: "Step one",
                        isTextualStep: true
                    }
                ]
            });

            expect(functionDeclaration === tree.root.children[1]).to.equal(true);
        });

        it("finds the right function when multiple functions with the same name exist", function() {
            var tree = new Tree();
            tree.parseIn(`
Some parent step -
    My function

    * My function
        The right one -
            * My function
                The wrong one -

    * My function
        The wrong one -

* My function
    The wrong one -
`);

            var stepsAbove = [
                tree.root.children[0].cloneForBranch(),
                tree.root.children[0].children[0].cloneForBranch()
            ];
            var functionDeclaration = tree.findFunctionDeclaration(stepsAbove);

            expect(functionDeclaration).to.containSubset({
                text: "My function",
                isFunctionDeclaration: true,
                parent: { text: "Some parent step" },
                children: [
                    {
                        text: "The right one",
                        isTextualStep: true
                    }
                ]
            });

            expect(functionDeclaration === tree.root.children[0].children[1]).to.equal(true);
        });

        it("finds the first function declaration when multiple sibling function declarations have the same name", function() {
            var tree = new Tree();
            tree.parseIn(`
My function

* My function
    First -

* My function
    Second -
`);

            var stepsAbove = [ tree.root.children[0].cloneForBranch() ];
            var functionDeclaration = tree.findFunctionDeclaration(stepsAbove);

            expect(functionDeclaration).to.containSubset({
                text: "My function",
                isFunctionDeclaration: true,
                parent: { indents: -1 },
                children: [
                    {
                        text: "First",
                        isTextualStep: true
                    }
                ]
            });

            expect(functionDeclaration === tree.root.children[1]).to.equal(true);
        });

        it("finds the right function when a function call contains strings, variables, and elementFinders", function() {
            var tree = new Tree();
            tree.parseIn(`
One {varA}   two   {{varB}} three [1st 'text' ElementFinder]

* Something else

* One {{var1}} two {{var2}}   three   {{var3}}
    Step one -

* Something else
`);

            var stepsAbove = [ tree.root.children[0].cloneForBranch() ];
            var functionDeclaration = tree.findFunctionDeclaration(stepsAbove);

            expect(functionDeclaration).to.containSubset({
                text: "One {{var1}} two {{var2}}   three   {{var3}}",
                isFunctionDeclaration: true,
                parent: { indents: -1 },
                children: [
                    {
                        text: "Step one",
                        isTextualStep: true
                    }
                ]
            });

            expect(functionDeclaration === tree.root.children[2]).to.equal(true);
        });

        it("finds the right function when a {var} = Func call contains strings, variables, and elementFinders", function() {
            var tree = new Tree();
            tree.parseIn(`
{varC} = One {varA}   two   {{varB}} three [1st 'text' ElementFinder]

* Something else

* One {{var1}} two {{var2}}   three   {{var3}}
    Step one -

* Something else
`);

            var stepsAbove = [ tree.root.children[0].cloneForBranch() ];
            var functionDeclaration = tree.findFunctionDeclaration(stepsAbove);

            expect(functionDeclaration).to.containSubset({
                text: "One {{var1}} two {{var2}}   three   {{var3}}",
                isFunctionDeclaration: true,
                parent: { indents: -1 },
                children: [
                    {
                        text: "Step one",
                        isTextualStep: true
                    }
                ]
            });

            expect(functionDeclaration === tree.root.children[2]).to.equal(true);
        });

        it("finds the right function on a {var} = Func code block that returns a value", function() {
            var tree = new Tree();
            tree.parseIn(`
{varC} = One {varA}   two   {{varB}} three [1st 'text' ElementFinder]

* Something else

* One {{var1}} two {{var2}}   three   {{var3}} {
    code here
}

* Something else
`);

            var stepsAbove = [ tree.root.children[0].cloneForBranch() ];
            var functionDeclaration = tree.findFunctionDeclaration(stepsAbove);

            expect(functionDeclaration).to.containSubset({
                text: "One {{var1}} two {{var2}}   three   {{var3}}",
                isFunctionDeclaration: true,
                parent: { indents: -1 },
                children: [],
                codeBlock: '\n    code here\n'
            });

            expect(functionDeclaration === tree.root.children[2]).to.equal(true);
        });

        it("finds the right function when the function call and function declaration match case insensitively", function() {
            var tree = new Tree();
            tree.parseIn(`
My function

* my function
`, "file.txt");

            var stepsAbove = [ tree.root.children[0].cloneForBranch() ];
            var functionDeclaration = tree.findFunctionDeclaration(stepsAbove);

            expect(functionDeclaration).to.containSubset({
                text: "my function",
                isFunctionDeclaration: true,
                parent: { indents: -1 },
                children: []
            });

            expect(functionDeclaration === tree.root.children[1]).to.equal(true);
        });

        it("rejects function calls that cannot be found", function() {
            var tree = new Tree();
            tree.parseIn(`
Function that doesn't exist

* Something else
`, "file.txt");

            var stepsAbove = [ tree.root.children[0].cloneForBranch() ];
            assert.throws(() => {
                tree.findFunctionDeclaration(stepsAbove);
            }, "The function 'Function that doesn't exist' cannot be found. Is there a typo, or did you mean to make this a textual step (with a - at the end)? [file.txt:2]");
        });

        it("rejects function calls to functions that were declared in a different scope", function() {
            var tree = new Tree();
            tree.parseIn(`
My function

Other scope -
    * My function
`, "file.txt");

            var stepsAbove = [ tree.root.children[0].cloneForBranch() ];
            assert.throws(() => {
                tree.findFunctionDeclaration(stepsAbove);
            }, "The function 'My function' cannot be found. Is there a typo, or did you mean to make this a textual step (with a - at the end)? [file.txt:2]");

            tree = new Tree();
            tree.parseIn(`
One scope -
    My function

Other scope -
    * My function
`, "file.txt");

            stepsAbove = [
                tree.root.children[0].cloneForBranch(),
                tree.root.children[0].children[0].cloneForBranch()
            ];
            assert.throws(() => {
                tree.findFunctionDeclaration(stepsAbove);
            }, "The function 'My function' cannot be found. Is there a typo, or did you mean to make this a textual step (with a - at the end)? [file.txt:3]");
        });
    });

    describe("validateVarSettingFunction()", function() {
        it("accepts function that has muliple branches in {x}='value' format", function() {
            var tree = new Tree();
            tree.parseIn(`
{var} = F

* F
    {x}='1'

    {x}='2'

    {x}='3'
`);

            var functionCall = tree.root.children[0].cloneForBranch();
            functionCall.functionDeclarationInTree = tree.root.children[1];
            expect(tree.validateVarSettingFunction(functionCall)).to.equal(true);
        });

        it("accepts function that has muliple branches in {x}='value' format and some are step blocks", function() {
            var tree = new Tree();
            tree.parseIn(`
{var} = F

* F
    {x}='1'

    {a}='2'
    {b}='3'
    {c}='4'

    {x}='5'
`);

            var functionCall = tree.root.children[0].cloneForBranch();
            functionCall.functionDeclarationInTree = tree.root.children[1];
            expect(tree.validateVarSettingFunction(functionCall)).to.equal(true);
        });

        it("accepts function that has a code block", function() {
            var tree = new Tree();
            tree.parseIn(`
{var} = F

* F {
    code block
}
`);

            var functionCall = tree.root.children[0].cloneForBranch();
            functionCall.functionDeclarationInTree = tree.root.children[1];
            expect(tree.validateVarSettingFunction(functionCall)).to.equal(false);
        });

        it("rejects an empty function", function() {
            var tree = new Tree();
            tree.parseIn(`
{var} = F

* F
`, "file.txt");

            var functionCall = tree.root.children[0].cloneForBranch();
            functionCall.functionDeclarationInTree = tree.root.children[1];
            assert.throws(() => {
                tree.validateVarSettingFunction(functionCall);
            }, "You cannot use an empty function [file.txt:2]");
        });

        it("rejects function that doesn't have a code block, isn't a code block function, and isn't a branched function in {x}='value' format", function() {
            var tree = new Tree();
            tree.parseIn(`
{var} = F

* F
    {x}='1'

    Function name

    {x}='3'
`, "file.txt");

            var functionCall = tree.root.children[0].cloneForBranch();
            functionCall.functionDeclarationInTree = tree.root.children[1];

            assert.throws(() => {
                tree.validateVarSettingFunction(functionCall);
            }, "The function called at file.txt:2 must have all steps in its declaration be in format {x}='string' (but file.txt:7 is not) [file.txt:2]");

            tree = new Tree();
            tree.parseIn(`
{var} = F

* F
    {x}='1'
    Function name
    {x}='3'
`, "file.txt");

            var functionCall = tree.root.children[0].cloneForBranch();
            functionCall.functionDeclarationInTree = tree.root.children[1];

            assert.throws(() => {
                tree.validateVarSettingFunction(functionCall);
            }, "The function called at file.txt:2 must have all steps in its declaration be in format {x}='string' (but file.txt:6 is not) [file.txt:2]");
        });

        it("rejects function that has a code block, but also has children", function() {
            var tree = new Tree();
            tree.parseIn(`
{var} = F

* F {
    code block
}
    Child -
`, "file.txt");

            var functionCall = tree.root.children[0].cloneForBranch();
            functionCall.functionDeclarationInTree = tree.root.children[1];

            assert.throws(() => {
                tree.validateVarSettingFunction(functionCall);
            }, "The function called at file.txt:2 has a code block in its declaration (at file.txt:4) but that code block must not have any child steps [file.txt:2]");
        });

        it("rejects function that is in {x}='value' format, but also has children", function() {
            var tree = new Tree();
            tree.parseIn(`
{var} = F

* F
    {x}='1'

    {x}='2'
        Child -

    {x}='3'
`, "file.txt");

            var functionCall = tree.root.children[0].cloneForBranch();
            functionCall.functionDeclarationInTree = tree.root.children[1];

            assert.throws(() => {
                tree.validateVarSettingFunction(functionCall);
            }, "The function called at file.txt:2 must not have any steps in its declaration that have children of their own (but file.txt:7 does) [file.txt:2]");
        });
    });

    describe("branchify()", function() {
        it("handles an empty tree", function() {
            var tree = new Tree();
            tree.parseIn(``);

            var branches = tree.branchify(tree.root);
            expect(branches).to.have.lengthOf(0);
        });

        it("branchifies a textual-step-only tree with one branch", function() {
            var tree = new Tree();
            tree.parseIn(`
A -
    B -
        C -`);

            var branches = tree.branchify(tree.root);

            expect(branches).to.have.lengthOf(1);
            expect(branches[0].steps).to.have.lengthOf(3);

            expect(branches).to.containSubsetInOrder([
                {
                    steps: [
                        {
                            text: "A",
                            branchIndents: 0,
                            parent: undefined,
                            children: undefined
                        },
                        {
                            text: "B",
                            branchIndents: 0,
                            parent: undefined,
                            children: undefined
                        },
                        {
                            text: "C",
                            branchIndents: 0,
                            parent: undefined,
                            children: undefined
                        }
                    ]
                }
            ]);
        });

        it("branchifies a textual-step-only tree with multiple branches", function() {
            var tree = new Tree();
            tree.parseIn(`
A -
    B -

        C -

        D -

    E -

    F -

        G -
H -
    `);

            var branches = tree.branchify(tree.root);

            expect(branches).to.have.lengthOf(5);
            expect(branches[0].steps).to.have.lengthOf(3);
            expect(branches[1].steps).to.have.lengthOf(3);
            expect(branches[2].steps).to.have.lengthOf(2);
            expect(branches[3].steps).to.have.lengthOf(3);
            expect(branches[4].steps).to.have.lengthOf(1);

            expect(branches).to.containSubsetInOrder([
                {
                    steps: [
                        { text: "A", branchIndents: 0 },
                        { text: "B", branchIndents: 0 },
                        { text: "C", branchIndents: 0 }
                    ]
                },
                {
                    steps: [
                        { text: "A", branchIndents: 0 },
                        { text: "B", branchIndents: 0 },
                        { text: "D", branchIndents: 0 }
                    ]
                },
                {
                    steps: [
                        { text: "A", branchIndents: 0 },
                        { text: "E", branchIndents: 0 }
                    ]
                },
                {
                    steps: [
                        { text: "A", branchIndents: 0 },
                        { text: "F", branchIndents: 0 },
                        { text: "G", branchIndents: 0 }
                    ]
                },
                {
                    steps: [
                        { text: "H", branchIndents: 0 }
                    ]
                }
            ]);
        });

        it("branchifies a textual-step-only tree with multiple branches and containing step blocks", function() {
            var tree = new Tree();
            tree.parseIn(`
A -
    B -

        C -

        D -

    E -
    F -

        G -
H -
    `);

            var branches = tree.branchify(tree.root);

            expect(branches).to.have.lengthOf(5);
            expect(branches[0].steps).to.have.lengthOf(3);
            expect(branches[1].steps).to.have.lengthOf(3);
            expect(branches[2].steps).to.have.lengthOf(3);
            expect(branches[3].steps).to.have.lengthOf(3);
            expect(branches[4].steps).to.have.lengthOf(1);

            expect(branches).to.containSubsetInOrder([
                {
                    steps: [
                        { text: "A", branchIndents: 0 },
                        { text: "B", branchIndents: 0 },
                        { text: "C", branchIndents: 0 }
                    ]
                },
                {
                    steps: [
                        { text: "A", branchIndents: 0 },
                        { text: "B", branchIndents: 0 },
                        { text: "D", branchIndents: 0 }
                    ]
                },
                {
                    steps: [
                        { text: "A", branchIndents: 0 },
                        { text: "E", branchIndents: 0 },
                        { text: "G", branchIndents: 0 }
                    ]
                },
                {
                    steps: [
                        { text: "A", branchIndents: 0 },
                        { text: "F", branchIndents: 0 },
                        { text: "G", branchIndents: 0 }
                    ]
                },
                {
                    steps: [
                        { text: "H", branchIndents: 0 }
                    ]
                }
            ]);
        });

        it("branchifies a function call with no children, whose function declaration has no children", function() {
            var tree = new Tree();
            tree.parseIn(`
F

* F
    `);

            var branches = tree.branchify(tree.root);

            expect(branches).to.have.lengthOf(1);
            expect(branches[0].steps).to.have.lengthOf(1);

            expect(branches).to.containSubsetInOrder([
                {
                    steps: [
                        {
                            text: "F",
                            isFunctionCall: true,
                            isFunctionDeclaration: undefined,
                            branchIndents: 0,
                            originalStepInTree: {
                                text: "F",
                                parent: { indents: -1 },
                                functionDeclarationInTree: {
                                    text: "F",
                                    lineNumber: 4
                                }
                            }
                        }
                    ]
                }
            ]);
        });

        it("branchifies a function call with no children, whose function declaration has one branch", function() {
            var tree = new Tree();
            tree.parseIn(`
F

* F
    A -
    `);

            var branches = tree.branchify(tree.root);

            expect(branches).to.have.lengthOf(1);
            expect(branches[0].steps).to.have.lengthOf(2);

            expect(branches).to.containSubsetInOrder([
                {
                    steps: [
                        {
                            text: "F",
                            isFunctionCall: true,
                            isFunctionDeclaration: undefined,
                            branchIndents: 0,
                            originalStepInTree: {
                                text: "F",
                                parent: { indents: -1 },
                                functionDeclarationInTree: {
                                    text: "F",
                                    lineNumber: 4
                                }
                            }
                        },
                        {
                            text: "A",
                            isFunctionCall: undefined,
                            isFunctionDeclaration: undefined,
                            isTextualStep: true,
                            branchIndents: 1,
                            originalStepInTree: {
                                text: "A",
                                parent: { text: "F" },
                                functionDeclarationInTree: undefined
                            }
                        }
                    ]
                }
            ]);
        });

        it("doesn't expand a textual step that has the same text as a function declaration", function() {
            var tree = new Tree();
            tree.parseIn(`
F -

* F
    A -
    `);

            var branches = tree.branchify(tree.root);

            expect(branches).to.have.lengthOf(1);
            expect(branches[0].steps).to.have.lengthOf(1);

            expect(branches).to.containSubsetInOrder([
                {
                    steps: [
                        {
                            text: "F",
                            isFunctionCall: undefined,
                            isFunctionDeclaration: undefined,
                            isTextualStep: true,
                            branchIndents: 0,
                            originalStepInTree: { text: "F" }
                        }
                    ]
                }
            ]);
        });

        it("properly merges identifiers between function call and function declaration", function() {
            var tree = new Tree();
            tree.parseIn(`
F ~

* F + #
    A -
    `);

            var branches = tree.branchify(tree.root);

            expect(branches).to.have.lengthOf(1);
            expect(branches[0].steps).to.have.lengthOf(2);

            expect(branches).to.containSubsetInOrder([
                {
                    steps: [
                        {
                            text: "F",
                            isFunctionCall: true,
                            isFunctionDeclaration: undefined,
                            isDebug: true,
                            isNonParallel: true,
                            isExpectedFail: true,
                            branchIndents: 0,
                            originalStepInTree: {
                                text: "F",
                                isFunctionCall: true,
                                isFunctionDeclaration: undefined,
                                isDebug: true,
                                isNonParallel: undefined,
                                isExpectedFail: undefined,
                                functionDeclarationInTree: {
                                    text: "F",
                                    isFunctionCall: undefined,
                                    isFunctionDeclaration: true,
                                    isDebug: undefined,
                                    isNonParallel: true,
                                    isExpectedFail: true
                                }
                            }
                        },
                        {
                            text: "A",
                            isFunctionCall: undefined,
                            isFunctionDeclaration: undefined,
                            isTextualStep: true,
                            isDebug: undefined,
                            isNonParallel: undefined,
                            isExpectedFail: undefined,
                            branchIndents: 1,
                            originalStepInTree: {
                                text: "A",
                                parent: { text: "F" },
                                functionDeclarationInTree: undefined
                            }
                        }
                    ]
                }
            ]);
        });

        it("properly merges identifiers and a code block between function call and function declaration", function() {
            var tree = new Tree();
            tree.parseIn(`
F ~

* F + # {
    code block 1
    code block 2
}
    `);

            var branches = tree.branchify(tree.root);

            expect(branches).to.have.lengthOf(1);
            expect(branches[0].steps).to.have.lengthOf(1);

            expect(branches).to.containSubsetInOrder([
                {
                    steps: [
                        {
                            text: "F",
                            isFunctionCall: true,
                            isFunctionDeclaration: undefined,
                            isDebug: true,
                            isNonParallel: true,
                            isExpectedFail: true,
                            branchIndents: 0,
                            codeBlock: '\n    code block 1\n    code block 2\n',
                            originalStepInTree: {
                                text: "F",
                                isFunctionCall: true,
                                isFunctionDeclaration: undefined,
                                isDebug: true,
                                isNonParallel: undefined,
                                isExpectedFail: undefined,
                                codeBlock: undefined,
                                functionDeclarationInTree: {
                                    text: "F",
                                    isFunctionCall: undefined,
                                    isFunctionDeclaration: true,
                                    isDebug: undefined,
                                    isNonParallel: true,
                                    isExpectedFail: true,
                                    codeBlock: '\n    code block 1\n    code block 2\n'
                                }
                            }
                        }
                    ]
                }
            ]);
        });

        it("branchifies a function call with no children, whose function declaration has multiple branches", function() {
            var tree = new Tree();
            tree.parseIn(`
F

* F
    A -
        B -
    C -
    `);

            var branches = tree.branchify(tree.root);

            expect(branches).to.have.lengthOf(2);
            expect(branches[0].steps).to.have.lengthOf(3);
            expect(branches[1].steps).to.have.lengthOf(2);

            expect(branches).to.containSubsetInOrder([
                {
                    steps: [
                        {
                            text: "F",
                            isFunctionCall: true,
                            isFunctionDeclaration: undefined,
                            branchIndents: 0,
                            originalStepInTree: {
                                text: "F",
                                parent: { indents: -1 },
                                functionDeclarationInTree: {
                                    text: "F",
                                    lineNumber: 4
                                }
                            }
                        },
                        {
                            text: "A",
                            isFunctionCall: undefined,
                            isFunctionDeclaration: undefined,
                            isTextualStep: true,
                            branchIndents: 1,
                            originalStepInTree: {
                                text: "A",
                                parent: { text: "F" },
                                functionDeclarationInTree: undefined
                            }
                        },
                        {
                            text: "B",
                            isFunctionCall: undefined,
                            isFunctionDeclaration: undefined,
                            isTextualStep: true,
                            branchIndents: 1,
                            originalStepInTree: {
                                text: "B",
                                parent: { text: "A" },
                                functionDeclarationInTree: undefined
                            }
                        }
                    ]
                },
                {
                    steps: [
                        {
                            text: "F",
                            isFunctionCall: true,
                            isFunctionDeclaration: undefined,
                            branchIndents: 0,
                            originalStepInTree: {
                                text: "F",
                                parent: { indents: -1 },
                                functionDeclarationInTree: {
                                    text: "F",
                                    lineNumber: 4
                                }
                            }
                        },
                        {
                            text: "C",
                            isFunctionCall: undefined,
                            isFunctionDeclaration: undefined,
                            isTextualStep: true,
                            branchIndents: 1,
                            originalStepInTree: {
                                text: "C",
                                parent: { text: "F" },
                                functionDeclarationInTree: undefined
                            }
                        }
                    ]
                }
            ]);
        });

        it("handles a function declaration as an only child", function() {
            var tree = new Tree();
            tree.parseIn(`
A -
    * F
        B -
    `);

            var branches = tree.branchify(tree.root);

            expect(branches).to.have.lengthOf(1);
            expect(branches[0].steps).to.have.lengthOf(1);

            expect(branches).to.containSubsetInOrder([
                {
                    steps: [ { text: "A" } ]
                }
            ]);
        });

        it("handles a function declaration as an only child to a step block", function() {
            var tree = new Tree();
            tree.parseIn(`
A -
B -

    * F
        C -
    `);

            var branches = tree.branchify(tree.root);

            expect(branches).to.have.lengthOf(2);
            expect(branches[0].steps).to.have.lengthOf(1);
            expect(branches[1].steps).to.have.lengthOf(1);

            expect(branches).to.containSubsetInOrder([
                {
                    steps: [ { text: "A" } ]
                },
                {
                    steps: [ { text: "B" } ]
                }
            ]);
        });

        it("rejects a function call to a child function declaration", function() {
            var tree = new Tree();
            tree.parseIn(`
F
    * F
        B -
    `, "file.txt");

            assert.throws(() => {
                tree.branchify(tree.root);
            }, "The function 'F' cannot be found. Is there a typo, or did you mean to make this a textual step (with a - at the end)? [file.txt:2]");
        });

        it("branchifies a function call with children, whose function declaration has no children", function() {
            var tree = new Tree();
            tree.parseIn(`
F
    A -
        B -

* F
    `);

            var branches = tree.branchify(tree.root);

            expect(branches).to.have.lengthOf(1);
            expect(branches[0].steps).to.have.lengthOf(3);

            expect(branches).to.containSubsetInOrder([
                {
                    steps: [
                        {
                            text: "F",
                            isFunctionCall: true,
                            isFunctionDeclaration: undefined,
                            branchIndents: 0,
                            originalStepInTree: {
                                text: "F",
                                parent: { indents: -1 },
                                functionDeclarationInTree: {
                                    text: "F"
                                }
                            }
                        },
                        {
                            text: "A",
                            isFunctionCall: undefined,
                            isFunctionDeclaration: undefined,
                            isTextualStep: true,
                            branchIndents: 0,
                            originalStepInTree: {
                                text: "A",
                                parent: { text: "F" },
                                functionDeclarationInTree: undefined
                            }
                        },
                        {
                            text: "B",
                            isFunctionCall: undefined,
                            isFunctionDeclaration: undefined,
                            isTextualStep: true,
                            branchIndents: 0,
                            originalStepInTree: {
                                text: "B",
                                parent: { text: "A" },
                                functionDeclarationInTree: undefined
                            }
                        }
                    ]
                }
            ]);
        });

        it("branchifies a function call with children, whose function declaration has one branch", function() {
            var tree = new Tree();
            tree.parseIn(`
F
    C -
        D -

* F
    A -
        B -
    `);

            var branches = tree.branchify(tree.root);

            expect(branches).to.have.lengthOf(1);
            expect(branches[0].steps).to.have.lengthOf(5);

            expect(branches).to.containSubsetInOrder([
                {
                    steps: [
                        {
                            text: "F",
                            isFunctionCall: true,
                            isFunctionDeclaration: undefined,
                            branchIndents: 0,
                            originalStepInTree: {
                                text: "F",
                                parent: { indents: -1 },
                                functionDeclarationInTree: {
                                    text: "F"
                                }
                            }
                        },
                        {
                            text: "A",
                            isFunctionCall: undefined,
                            isFunctionDeclaration: undefined,
                            isTextualStep: true,
                            branchIndents: 1,
                            originalStepInTree: {
                                text: "A",
                                parent: { text: "F" },
                                functionDeclarationInTree: undefined
                            }
                        },
                        {
                            text: "B",
                            isFunctionCall: undefined,
                            isFunctionDeclaration: undefined,
                            isTextualStep: true,
                            branchIndents: 1,
                            originalStepInTree: {
                                text: "B",
                                parent: { text: "A" },
                                functionDeclarationInTree: undefined
                            }
                        },
                        {
                            text: "C",
                            isFunctionCall: undefined,
                            isFunctionDeclaration: undefined,
                            isTextualStep: true,
                            branchIndents: 0,
                            originalStepInTree: {
                                text: "C",
                                parent: { text: "F" },
                                functionDeclarationInTree: undefined
                            }
                        },
                        {
                            text: "D",
                            isFunctionCall: undefined,
                            isFunctionDeclaration: undefined,
                            isTextualStep: true,
                            branchIndents: 0,
                            originalStepInTree: {
                                text: "D",
                                parent: { text: "C" },
                                functionDeclarationInTree: undefined
                            }
                        }
                    ]
                }
            ]);
        });

        it("branchifies a function call with children, whose function declaration has multiple branches", function() {
            var tree = new Tree();
            tree.parseIn(`
F
    C -
        D -

* F
    A -
        B -
    E -
    `);

            var branches = tree.branchify(tree.root);

            expect(branches).to.have.lengthOf(2);
            expect(branches[0].steps).to.have.lengthOf(5);
            expect(branches[1].steps).to.have.lengthOf(4);

            expect(branches).to.containSubsetInOrder([
                {
                    steps: [
                        {
                            text: "F",
                            isFunctionCall: true,
                            isFunctionDeclaration: undefined,
                            branchIndents: 0,
                            originalStepInTree: {
                                text: "F",
                                parent: { indents: -1 },
                                functionDeclarationInTree: {
                                    text: "F"
                                }
                            }
                        },
                        {
                            text: "A",
                            isFunctionCall: undefined,
                            isFunctionDeclaration: undefined,
                            isTextualStep: true,
                            branchIndents: 1,
                            originalStepInTree: {
                                text: "A",
                                parent: { text: "F" },
                                functionDeclarationInTree: undefined
                            }
                        },
                        {
                            text: "B",
                            isFunctionCall: undefined,
                            isFunctionDeclaration: undefined,
                            isTextualStep: true,
                            branchIndents: 1,
                            originalStepInTree: {
                                text: "B",
                                parent: { text: "A" },
                                functionDeclarationInTree: undefined
                            }
                        },
                        {
                            text: "C",
                            isFunctionCall: undefined,
                            isFunctionDeclaration: undefined,
                            isTextualStep: true,
                            branchIndents: 0,
                            originalStepInTree: {
                                text: "C",
                                parent: { text: "F" },
                                functionDeclarationInTree: undefined
                            }
                        },
                        {
                            text: "D",
                            isFunctionCall: undefined,
                            isFunctionDeclaration: undefined,
                            isTextualStep: true,
                            branchIndents: 0,
                            originalStepInTree: {
                                text: "D",
                                parent: { text: "C" },
                                functionDeclarationInTree: undefined
                            }
                        }
                    ]
                },
                {
                    steps: [
                        {
                            text: "F",
                            isFunctionCall: true,
                            isFunctionDeclaration: undefined,
                            branchIndents: 0,
                            originalStepInTree: {
                                text: "F",
                                parent: { indents: -1 },
                                functionDeclarationInTree: {
                                    text: "F"
                                }
                            }
                        },
                        {
                            text: "E",
                            isFunctionCall: undefined,
                            isFunctionDeclaration: undefined,
                            isTextualStep: true,
                            branchIndents: 1,
                            originalStepInTree: {
                                text: "E",
                                parent: { text: "F" },
                                functionDeclarationInTree: undefined
                            }
                        },
                        {
                            text: "C",
                            isFunctionCall: undefined,
                            isFunctionDeclaration: undefined,
                            isTextualStep: true,
                            branchIndents: 0,
                            originalStepInTree: {
                                text: "C",
                                parent: { text: "F" },
                                functionDeclarationInTree: undefined
                            }
                        },
                        {
                            text: "D",
                            isFunctionCall: undefined,
                            isFunctionDeclaration: undefined,
                            isTextualStep: true,
                            branchIndents: 0,
                            originalStepInTree: {
                                text: "D",
                                parent: { text: "C" },
                                functionDeclarationInTree: undefined
                            }
                        }
                    ]
                }
            ]);
        });

        it("branchifies a function call with multiple branches within a function call with multiple branches", function() {
            var tree = new Tree();
            tree.parseIn(`
F
    C -
        D -
    G -

* F
    A -
        B -
    E -
    `);

            var branches = tree.branchify(tree.root);

            expect(branches).to.have.lengthOf(4);
            expect(branches[0].steps).to.have.lengthOf(5);
            expect(branches[1].steps).to.have.lengthOf(4);
            expect(branches[2].steps).to.have.lengthOf(4);
            expect(branches[3].steps).to.have.lengthOf(3);

            expect(branches).to.containSubsetInOrder([
                {
                    steps: [
                        {
                            text: "F",
                            isFunctionCall: true,
                            isFunctionDeclaration: undefined,
                            branchIndents: 0,
                            originalStepInTree: {
                                text: "F",
                                parent: { indents: -1 },
                                functionDeclarationInTree: {
                                    text: "F"
                                }
                            }
                        },
                        {
                            text: "A",
                            isFunctionCall: undefined,
                            isFunctionDeclaration: undefined,
                            isTextualStep: true,
                            branchIndents: 1,
                            originalStepInTree: {
                                text: "A",
                                parent: { text: "F" },
                                functionDeclarationInTree: undefined
                            }
                        },
                        {
                            text: "B",
                            isFunctionCall: undefined,
                            isFunctionDeclaration: undefined,
                            isTextualStep: true,
                            branchIndents: 1,
                            originalStepInTree: {
                                text: "B",
                                parent: { text: "A" },
                                functionDeclarationInTree: undefined
                            }
                        },
                        {
                            text: "C",
                            isFunctionCall: undefined,
                            isFunctionDeclaration: undefined,
                            isTextualStep: true,
                            branchIndents: 0,
                            originalStepInTree: {
                                text: "C",
                                parent: { text: "F" },
                                functionDeclarationInTree: undefined
                            }
                        },
                        {
                            text: "D",
                            isFunctionCall: undefined,
                            isFunctionDeclaration: undefined,
                            isTextualStep: true,
                            branchIndents: 0,
                            originalStepInTree: {
                                text: "D",
                                parent: { text: "C" },
                                functionDeclarationInTree: undefined
                            }
                        }
                    ]
                },
                {
                    steps: [
                        {
                            text: "F",
                            isFunctionCall: true,
                            isFunctionDeclaration: undefined,
                            branchIndents: 0,
                            originalStepInTree: {
                                text: "F",
                                parent: { indents: -1 },
                                functionDeclarationInTree: {
                                    text: "F"
                                }
                            }
                        },
                        {
                            text: "A",
                            isFunctionCall: undefined,
                            isFunctionDeclaration: undefined,
                            isTextualStep: true,
                            branchIndents: 1,
                            originalStepInTree: {
                                text: "A",
                                parent: { text: "F" },
                                functionDeclarationInTree: undefined
                            }
                        },
                        {
                            text: "B",
                            isFunctionCall: undefined,
                            isFunctionDeclaration: undefined,
                            isTextualStep: true,
                            branchIndents: 1,
                            originalStepInTree: {
                                text: "B",
                                parent: { text: "A" },
                                functionDeclarationInTree: undefined
                            }
                        },
                        {
                            text: "G",
                            isFunctionCall: undefined,
                            isFunctionDeclaration: undefined,
                            isTextualStep: true,
                            branchIndents: 0,
                            originalStepInTree: {
                                text: "G",
                                parent: { text: "F" },
                                functionDeclarationInTree: undefined
                            }
                        }
                    ]
                },
                {
                    steps: [
                        {
                            text: "F",
                            isFunctionCall: true,
                            isFunctionDeclaration: undefined,
                            branchIndents: 0,
                            originalStepInTree: {
                                text: "F",
                                parent: { indents: -1 },
                                functionDeclarationInTree: {
                                    text: "F"
                                }
                            }
                        },
                        {
                            text: "E",
                            isFunctionCall: undefined,
                            isFunctionDeclaration: undefined,
                            isTextualStep: true,
                            branchIndents: 1,
                            originalStepInTree: {
                                text: "E",
                                parent: { text: "F" },
                                functionDeclarationInTree: undefined
                            }
                        },
                        {
                            text: "C",
                            isFunctionCall: undefined,
                            isFunctionDeclaration: undefined,
                            isTextualStep: true,
                            branchIndents: 0,
                            originalStepInTree: {
                                text: "C",
                                parent: { text: "F" },
                                functionDeclarationInTree: undefined
                            }
                        },
                        {
                            text: "D",
                            isFunctionCall: undefined,
                            isFunctionDeclaration: undefined,
                            isTextualStep: true,
                            branchIndents: 0,
                            originalStepInTree: {
                                text: "D",
                                parent: { text: "C" },
                                functionDeclarationInTree: undefined
                            }
                        }
                    ]
                },
                {
                    steps: [
                        {
                            text: "F",
                            isFunctionCall: true,
                            isFunctionDeclaration: undefined,
                            branchIndents: 0,
                            originalStepInTree: {
                                text: "F",
                                parent: { indents: -1 },
                                functionDeclarationInTree: {
                                    text: "F"
                                }
                            }
                        },
                        {
                            text: "E",
                            isFunctionCall: undefined,
                            isFunctionDeclaration: undefined,
                            isTextualStep: true,
                            branchIndents: 1,
                            originalStepInTree: {
                                text: "E",
                                parent: { text: "F" },
                                functionDeclarationInTree: undefined
                            }
                        },
                        {
                            text: "G",
                            isFunctionCall: undefined,
                            isFunctionDeclaration: undefined,
                            isTextualStep: true,
                            branchIndents: 0,
                            originalStepInTree: {
                                text: "G",
                                parent: { text: "F" },
                                functionDeclarationInTree: undefined
                            }
                        }
                    ]
                }
            ]);
        });

        it("branchifies multiple function calls in the tree", function() {
            var tree = new Tree();
            tree.parseIn(`
* FC
    FA
        C -

FA
    FB
        D -
    * FB
        B1 -
        B2 -
FC

* FA

    A -

* FB    // never called
    X -
    `);

            var branches = tree.branchify(tree.root);

            expect(branches).to.have.lengthOf(3);
            expect(branches[0].steps).to.have.lengthOf(5);
            expect(branches[1].steps).to.have.lengthOf(5);
            expect(branches[2].steps).to.have.lengthOf(4);

            expect(branches).to.containSubsetInOrder([
                {
                    steps: [
                        {
                            text: "FA",
                            branchIndents: 0
                        },
                        {
                            text: "A",
                            branchIndents: 1
                        },
                        {
                            text: "FB",
                            branchIndents: 0
                        },
                        {
                            text: "B1",
                            branchIndents: 1
                        },
                        {
                            text: "D",
                            branchIndents: 0
                        },
                    ]
                },
                {
                    steps: [
                        {
                            text: "FA",
                            branchIndents: 0
                        },
                        {
                            text: "A",
                            branchIndents: 1
                        },
                        {
                            text: "FB",
                            branchIndents: 0
                        },
                        {
                            text: "B2",
                            branchIndents: 1
                        },
                        {
                            text: "D",
                            branchIndents: 0
                        },
                    ]
                },
                {
                    steps: [
                        {
                            text: "FC",
                            branchIndents: 0
                        },
                        {
                            text: "FA",
                            branchIndents: 1
                        },
                        {
                            text: "A",
                            branchIndents: 2
                        },
                        {
                            text: "C",
                            branchIndents: 1
                        }
                    ]
                }
            ]);
        });

        it("branchifies a function call declared within a function call", function() {
            var tree = new Tree();
            tree.parseIn(`
* FA
    * FB
        B -

FA

FA
    FB

* FB // never called
    X
    `);
            // A call to FA makes FB accessible to its children

            var branches = tree.branchify(tree.root);

            expect(branches).to.have.lengthOf(2);
            expect(branches[0].steps).to.have.lengthOf(1);
            expect(branches[1].steps).to.have.lengthOf(3);

            expect(branches).to.containSubsetInOrder([
                {
                    steps: [
                        {
                            text: "FA",
                            branchIndents: 0
                        }
                    ]
                },
                {
                    steps: [
                        {
                            text: "FA",
                            branchIndents: 0
                        },
                        {
                            text: "FB",
                            branchIndents: 0
                        },
                        {
                            text: "B",
                            branchIndents: 1
                        }
                    ]
                }
            ]);
        });

        it("branchifies {var} = F where F has muliple branches in {x}='value' format", function() {
            var tree = new Tree();
            tree.parseIn(`
{var} = F

* F
    {x}='1'

    {x}='2'
    {x}=''
    {x}="3"

    {a}='4'
    `);
            var branches = tree.branchify(tree.root);

            expect(branches).to.have.lengthOf(5);
            expect(branches[0].steps).to.have.lengthOf(2);
            expect(branches[1].steps).to.have.lengthOf(2);
            expect(branches[2].steps).to.have.lengthOf(2);
            expect(branches[3].steps).to.have.lengthOf(2);
            expect(branches[4].steps).to.have.lengthOf(2);

            expect(branches).to.containSubsetInOrder([
                {
                    steps: [
                        {
                            text: "{var} = F",
                            isFunctionCall: true,
                            branchIndents: 0
                        },
                        {
                            text: "{x}='1'",
                            isFunctionCall: undefined,
                            branchIndents: 1
                        }
                    ]
                },
                {
                    steps: [
                        {
                            text: "{var} = F",
                            isFunctionCall: true,
                            branchIndents: 0
                        },
                        {
                            text: "{x}='2'",
                            isFunctionCall: undefined,
                            branchIndents: 1
                        }
                    ]
                },
                {
                    steps: [
                        {
                            text: "{var} = F",
                            isFunctionCall: true,
                            branchIndents: 0
                        },
                        {
                            text: "{x}=''",
                            isFunctionCall: undefined,
                            branchIndents: 1
                        }
                    ]
                },
                {
                    steps: [
                        {
                            text: "{var} = F",
                            isFunctionCall: true,
                            branchIndents: 0
                        },
                        {
                            text: "{x}=\"3\"",
                            isFunctionCall: undefined,
                            branchIndents: 1
                        }
                    ]
                },
                {
                    steps: [
                        {
                            text: "{var} = F",
                            isFunctionCall: true,
                            branchIndents: 0
                        },
                        {
                            text: "{a}='4'",
                            isFunctionCall: undefined,
                            branchIndents: 1
                        }
                    ]
                }
            ]);
        });

        it("branchifies {var} = F where it has children and F has muliple branches in {x}='value' format", function() {
            var tree = new Tree();
            tree.parseIn(`
{var} = F
    G -

* F
    {x}='1'

    {x}='2'
    {x}=''
    {x}="3"

    {a}='4'
    `);
            var branches = tree.branchify(tree.root);

            expect(branches).to.have.lengthOf(5);
            expect(branches[0].steps).to.have.lengthOf(3);
            expect(branches[1].steps).to.have.lengthOf(3);
            expect(branches[2].steps).to.have.lengthOf(3);
            expect(branches[3].steps).to.have.lengthOf(3);
            expect(branches[4].steps).to.have.lengthOf(3);

            expect(branches).to.containSubsetInOrder([
                {
                    steps: [
                        {
                            text: "{var} = F",
                            isFunctionCall: true,
                            branchIndents: 0
                        },
                        {
                            text: "{x}='1'",
                            isFunctionCall: undefined,
                            branchIndents: 1
                        },
                        {
                            text: "G",
                            isFunctionCall: undefined,
                            branchIndents: 0
                        }
                    ]
                },
                {
                    steps: [
                        {
                            text: "{var} = F",
                            isFunctionCall: true,
                            branchIndents: 0
                        },
                        {
                            text: "{x}='2'",
                            isFunctionCall: undefined,
                            branchIndents: 1
                        },
                        {
                            text: "G",
                            isFunctionCall: undefined,
                            branchIndents: 0
                        }
                    ]
                },
                {
                    steps: [
                        {
                            text: "{var} = F",
                            isFunctionCall: true,
                            branchIndents: 0
                        },
                        {
                            text: "{x}=''",
                            isFunctionCall: undefined,
                            branchIndents: 1
                        },
                        {
                            text: "G",
                            isFunctionCall: undefined,
                            branchIndents: 0
                        }
                    ]
                },
                {
                    steps: [
                        {
                            text: "{var} = F",
                            isFunctionCall: true,
                            branchIndents: 0
                        },
                        {
                            text: "{x}=\"3\"",
                            isFunctionCall: undefined,
                            branchIndents: 1
                        },
                        {
                            text: "G",
                            isFunctionCall: undefined,
                            branchIndents: 0
                        }
                    ]
                },
                {
                    steps: [
                        {
                            text: "{var} = F",
                            isFunctionCall: true,
                            branchIndents: 0
                        },
                        {
                            text: "{a}='4'",
                            isFunctionCall: undefined,
                            branchIndents: 1
                        },
                        {
                            text: "G",
                            isFunctionCall: undefined,
                            branchIndents: 0
                        }
                    ]
                }
            ]);
        });

        it("branchifies {var} = F where F has a code block", function() {
            var tree = new Tree();
            tree.parseIn(`
{var} = F

* F {
    code block
}
    `);
            var branches = tree.branchify(tree.root);

            expect(branches).to.have.lengthOf(1);
            expect(branches[0].steps).to.have.lengthOf(1);

            expect(branches).to.containSubsetInOrder([
                {
                    steps: [
                        {
                            text: "{var} = F",
                            isFunctionCall: true,
                            branchIndents: 0,
                            codeBlock: '\n    code block\n'
                        }
                    ]
                }
            ]);
        });

        it("rejects {var} = F if F has a code block, but also has children", function() {
            var tree = new Tree();
            tree.parseIn(`
{var} = F

* F {
    code block
}
    Child -
    `, "file.txt");

            assert.throws(() => {
                tree.branchify(tree.root);
            }, "The function called at file.txt:2 has a code block in its declaration (at file.txt:4) but that code block must not have any child steps [file.txt:2]");
        });

        it("rejects {var} = F if F is in {x}='value' format, but some of those steps have children", function() {
            var tree = new Tree();
            tree.parseIn(`
{var} = F

* F
    {x}='1'

    {x}='2'
        {x}='3'

    {x}='4'
    `, "file.txt");

            assert.throws(() => {
                tree.branchify(tree.root);
            }, "The function called at file.txt:2 must not have any steps in its declaration that have children of their own (but file.txt:7 does) [file.txt:2]");
        });

        it("rejects {var} = F if F doesn't have a code block, isn't a code block function, and isn't a branched function in {x}='value' format", function() {
            var tree = new Tree();
            tree.parseIn(`
{var} = F

* F
    {x}='1'
    D -
    {x}='4'
    `, "file.txt");

            assert.throws(() => {
                tree.branchify(tree.root);
            }, "The function called at file.txt:2 must have all steps in its declaration be in format {x}='string' (but file.txt:6 is not) [file.txt:2]");
        });

        it("if function B is declared within function A, and A is called, the children of the call to A will be able to call B", function() {
            var tree = new Tree();
            tree.parseIn(`
* A
    * B
        C -

A
    B
    `);

            var branches = tree.branchify(tree.root);

            expect(branches).to.have.lengthOf(1);
            expect(branches[0].steps).to.have.lengthOf(3);

            expect(branches).to.containSubsetInOrder([
                {
                    steps: [
                        {
                            text: "A",
                            branchIndents: 0
                        },
                        {
                            text: "B",
                            branchIndents: 0
                        },
                        {
                            text: "C",
                            branchIndents: 1
                        }
                    ]
                }
            ]);
        });

        it("branchifies a step block with no children", function() {
            var tree = new Tree();
            tree.parseIn(`
A -
B -
C -
    `);
            var branches = tree.branchify(tree.root);

            expect(branches).to.have.lengthOf(3);
            expect(branches[0].steps).to.have.lengthOf(1);

            expect(branches).to.containSubsetInOrder([
                {
                    steps: [
                        {
                            text: "A",
                            branchIndents: 0
                        }
                    ]
                },
                {
                    steps: [
                        {
                            text: "B",
                            branchIndents: 0
                        }
                    ]
                },
                {
                    steps: [
                        {
                            text: "C",
                            branchIndents: 0
                        }
                    ]
                }
            ]);
        });

        it("branchifies a step block with children", function() {
            var tree = new Tree();
            tree.parseIn(`
A -
B -
C -

    D -

    E -
        F -
    `);
            var branches = tree.branchify(tree.root);

            expect(branches).to.have.lengthOf(6);
            expect(branches[0].steps).to.have.lengthOf(2);
            expect(branches[1].steps).to.have.lengthOf(3);
            expect(branches[2].steps).to.have.lengthOf(2);
            expect(branches[3].steps).to.have.lengthOf(3);
            expect(branches[4].steps).to.have.lengthOf(2);
            expect(branches[5].steps).to.have.lengthOf(3);

            expect(branches).to.containSubsetInOrder([
                {
                    steps: [
                        {
                            text: "A",
                            branchIndents: 0
                        },
                        {
                            text: "D",
                            branchIndents: 0
                        }
                    ]
                },
                {
                    steps: [
                        {
                            text: "A",
                            branchIndents: 0
                        },
                        {
                            text: "E",
                            branchIndents: 0
                        },
                        {
                            text: "F",
                            branchIndents: 0
                        }
                    ]
                },
                {
                    steps: [
                        {
                            text: "B",
                            branchIndents: 0
                        },
                        {
                            text: "D",
                            branchIndents: 0
                        }
                    ]
                },
                {
                    steps: [
                        {
                            text: "B",
                            branchIndents: 0
                        },
                        {
                            text: "E",
                            branchIndents: 0
                        },
                        {
                            text: "F",
                            branchIndents: 0
                        }
                    ]
                },
                {
                    steps: [
                        {
                            text: "C",
                            branchIndents: 0
                        },
                        {
                            text: "D",
                            branchIndents: 0
                        }
                    ]
                },
                {
                    steps: [
                        {
                            text: "C",
                            branchIndents: 0
                        },
                        {
                            text: "E",
                            branchIndents: 0
                        },
                        {
                            text: "F",
                            branchIndents: 0
                        }
                    ]
                }
            ]);
        });

        it("branchifies two levels of step blocks", function() {
            var tree = new Tree();
            tree.parseIn(`
A -
B -

    C -
    D -

        E -
    `);
            var branches = tree.branchify(tree.root);

            expect(branches).to.have.lengthOf(4);
            expect(branches[0].steps).to.have.lengthOf(3);
            expect(branches[1].steps).to.have.lengthOf(3);
            expect(branches[2].steps).to.have.lengthOf(3);
            expect(branches[3].steps).to.have.lengthOf(3);

            expect(branches).to.containSubsetInOrder([
                {
                    steps: [
                        {
                            text: "A",
                            branchIndents: 0
                        },
                        {
                            text: "C",
                            branchIndents: 0
                        },
                        {
                            text: "E",
                            branchIndents: 0
                        }
                    ]
                },
                {
                    steps: [
                        {
                            text: "A",
                            branchIndents: 0
                        },
                        {
                            text: "D",
                            branchIndents: 0
                        },
                        {
                            text: "E",
                            branchIndents: 0
                        }
                    ]
                },
                {
                    steps: [
                        {
                            text: "B",
                            branchIndents: 0
                        },
                        {
                            text: "C",
                            branchIndents: 0
                        },
                        {
                            text: "E",
                            branchIndents: 0
                        }
                    ]
                },
                {
                    steps: [
                        {
                            text: "B",
                            branchIndents: 0
                        },
                        {
                            text: "D",
                            branchIndents: 0
                        },
                        {
                            text: "E",
                            branchIndents: 0
                        }
                    ]
                }
            ]);
        });

        it("branchifies a .. step with no children", function() {
            var tree = new Tree();
            tree.parseIn(`
A - ..
    `);
            var branches = tree.branchify(tree.root);

            expect(branches).to.have.lengthOf(1);
            expect(branches[0].steps).to.have.lengthOf(1);

            expect(branches).to.containSubsetInOrder([
                {
                    steps: [
                        {
                            text: "A",
                            branchIndents: 0,
                            isSequential: true
                        }
                    ]
                }
            ]);
        });

        it("branchifies a .. step with children", function() {
            var tree = new Tree();
            tree.parseIn(`
A - ..
    B -
        C -
    D -
    `);
            var branches = tree.branchify(tree.root);

            expect(branches).to.have.lengthOf(1);
            expect(branches[0].steps).to.have.lengthOf(4);

            expect(branches).to.containSubsetInOrder([
                {
                    steps: [
                        {
                            text: "A",
                            branchIndents: 0,
                            isSequential: true
                        },
                        {
                            text: "B",
                            branchIndents: 0,
                            isSequential: undefined
                        },
                        {
                            text: "C",
                            branchIndents: 0,
                            isSequential: undefined
                        },
                        {
                            text: "D",
                            branchIndents: 0,
                            isSequential: undefined
                        }
                    ]
                }
            ]);
        });

        it("branchifies a .. step that is a function call and has no children", function() {
            var tree = new Tree();
            tree.parseIn(`
F ..

* F
    A -
        B -
    C -

    `);
            var branches = tree.branchify(tree.root);

            expect(branches).to.have.lengthOf(1);
            expect(branches[0].steps).to.have.lengthOf(5);

            // We need to do this because containSubsetInOrder() doesn't like duplicate array values (so we're using containSubset() instead)
            expect(branches[0].steps[0].text).to.equal("F");
            expect(branches[0].steps[1].text).to.equal("A");
            expect(branches[0].steps[2].text).to.equal("B");
            expect(branches[0].steps[3].text).to.equal("F");
            expect(branches[0].steps[4].text).to.equal("C");

            expect(branches).to.containSubset([
                {
                    steps: [
                        {
                            text: "F",
                            branchIndents: 0,
                            isSequential: true
                        },
                        {
                            text: "A",
                            branchIndents: 1,
                            isSequential: undefined
                        },
                        {
                            text: "B",
                            branchIndents: 1,
                            isSequential: undefined
                        },
                        {
                            text: "F",
                            branchIndents: 0,
                            isSequential: true
                        },
                        {
                            text: "C",
                            branchIndents: 1,
                            isSequential: undefined
                        }
                    ]
                }
            ]);
        });

        it("branchifies a .. step that is a function call and has children", function() {
            var tree = new Tree();
            tree.parseIn(`
F ..
    D -
        E -

    G -
    H -

* F
    A -
        B -
    C -

    `);
            var branches = tree.branchify(tree.root);

            expect(branches).to.have.lengthOf(1);
            expect(branches[0].steps).to.have.lengthOf(13);

            // We need to do this because containSubsetInOrder() doesn't like duplicate array values (so we're using containSubset() instead)
            expect(branches[0].steps[0].text).to.equal("F");
            expect(branches[0].steps[1].text).to.equal("A");
            expect(branches[0].steps[2].text).to.equal("B");
            expect(branches[0].steps[3].text).to.equal("D");
            expect(branches[0].steps[4].text).to.equal("E");
            expect(branches[0].steps[5].text).to.equal("G");
            expect(branches[0].steps[6].text).to.equal("H");

            expect(branches[0].steps[7].text).to.equal("F");
            expect(branches[0].steps[8].text).to.equal("C");
            expect(branches[0].steps[9].text).to.equal("D");
            expect(branches[0].steps[10].text).to.equal("E");
            expect(branches[0].steps[11].text).to.equal("G");
            expect(branches[0].steps[12].text).to.equal("H");


            expect(branches).to.containSubset([
                {
                    steps: [
                        {
                            text: "F",
                            branchIndents: 0,
                            isSequential: true
                        },
                        {
                            text: "A",
                            branchIndents: 1,
                            isSequential: undefined
                        },
                        {
                            text: "B",
                            branchIndents: 1,
                            isSequential: undefined
                        },
                        {
                            text: "D",
                            branchIndents: 0,
                            isSequential: undefined
                        },
                        {
                            text: "E",
                            branchIndents: 0,
                            isSequential: undefined
                        },
                        {
                            text: "G",
                            branchIndents: 0,
                            isSequential: undefined
                        },
                        {
                            text: "H",
                            branchIndents: 0,
                            isSequential: undefined
                        },
                        {
                            text: "F",
                            branchIndents: 0,
                            isSequential: true
                        },
                        {
                            text: "C",
                            branchIndents: 1,
                            isSequential: undefined
                        },
                        {
                            text: "D",
                            branchIndents: 0,
                            isSequential: undefined
                        },
                        {
                            text: "E",
                            branchIndents: 0,
                            isSequential: undefined
                        },
                        {
                            text: "G",
                            branchIndents: 0,
                            isSequential: undefined
                        },
                        {
                            text: "H",
                            branchIndents: 0,
                            isSequential: undefined
                        }
                    ]
                }
            ]);
        });

        it("branchifies a .. step that is a function call, has children, and whose function declaration starts with a ..", function() {
            var tree = new Tree();
            tree.parseIn(`
F ..
    D -
        E -

    G -
    H -

* F ..
    A -
        B -
    C -

    `);
            var branches = tree.branchify(tree.root);

            expect(branches).to.have.lengthOf(1);
            expect(branches[0].steps).to.have.lengthOf(8);

            expect(branches).to.containSubsetInOrder([
                {
                    steps: [
                        {
                            text: "F",
                            branchIndents: 0,
                            isSequential: true
                        },
                        {
                            text: "A",
                            branchIndents: 1,
                            isSequential: undefined
                        },
                        {
                            text: "B",
                            branchIndents: 1,
                            isSequential: undefined
                        },
                        {
                            text: "C",
                            branchIndents: 1,
                            isSequential: undefined
                        },
                        {
                            text: "D",
                            branchIndents: 0,
                            isSequential: undefined
                        },
                        {
                            text: "E",
                            branchIndents: 0,
                            isSequential: undefined
                        },
                        {
                            text: "G",
                            branchIndents: 0,
                            isSequential: undefined
                        },
                        {
                            text: "H",
                            branchIndents: 0,
                            isSequential: undefined
                        }
                    ]
                }
            ]);
        });

        it("branchifies a .. step that is a function call, has children, and where the function declaration has multiple branches", function() {
            var tree = new Tree();
            tree.parseIn(`
F ..
    D -
        E -

    G -
    H -

* F ..
    A -
        B -

    `);
            var branches = tree.branchify(tree.root);

            expect(branches).to.have.lengthOf(1);
            expect(branches[0].steps).to.have.lengthOf(7);

            expect(branches).to.containSubsetInOrder([
                {
                    steps: [
                        {
                            text: "F",
                            branchIndents: 0,
                            isSequential: true
                        },
                        {
                            text: "A",
                            branchIndents: 1,
                            isSequential: undefined
                        },
                        {
                            text: "B",
                            branchIndents: 1,
                            isSequential: undefined
                        },
                        {
                            text: "D",
                            branchIndents: 0,
                            isSequential: undefined
                        },
                        {
                            text: "E",
                            branchIndents: 0,
                            isSequential: undefined
                        },
                        {
                            text: "G",
                            branchIndents: 0,
                            isSequential: undefined
                        },
                        {
                            text: "H",
                            branchIndents: 0,
                            isSequential: undefined
                        }
                    ]
                }
            ]);
        });

        it("branchifies a .. step that is a function call, has children, where the function declaration has a function call", function() {
            var tree = new Tree();
            tree.parseIn(`
F ..
    D -
        E -

    G -
    H -

* F
    A
        I -

* A
    B -
    C -

    `);
            var branches = tree.branchify(tree.root);

            expect(branches).to.have.lengthOf(1);
            expect(branches[0].steps).to.have.lengthOf(16);

            // We need to do this because containSubsetInOrder() doesn't like duplicate array values (so we're using containSubset() instead)
            expect(branches[0].steps[0].text).to.equal("F");
            expect(branches[0].steps[1].text).to.equal("A");
            expect(branches[0].steps[2].text).to.equal("B");
            expect(branches[0].steps[3].text).to.equal("I");
            expect(branches[0].steps[4].text).to.equal("D");
            expect(branches[0].steps[5].text).to.equal("E");
            expect(branches[0].steps[6].text).to.equal("G");
            expect(branches[0].steps[7].text).to.equal("H");

            expect(branches[0].steps[8].text).to.equal("F");
            expect(branches[0].steps[9].text).to.equal("A");
            expect(branches[0].steps[10].text).to.equal("C");
            expect(branches[0].steps[11].text).to.equal("I");
            expect(branches[0].steps[12].text).to.equal("D");
            expect(branches[0].steps[13].text).to.equal("E");
            expect(branches[0].steps[14].text).to.equal("G");
            expect(branches[0].steps[15].text).to.equal("H");

            expect(branches).to.containSubset([
                {
                    steps: [
                        {
                            text: "F",
                            branchIndents: 0,
                            isSequential: true
                        },
                        {
                            text: "A",
                            branchIndents: 1,
                            isSequential: undefined
                        },
                        {
                            text: "B",
                            branchIndents: 2,
                            isSequential: undefined
                        },
                        {
                            text: "I",
                            branchIndents: 1,
                            isSequential: undefined
                        },
                        {
                            text: "D",
                            branchIndents: 0,
                            isSequential: undefined
                        },
                        {
                            text: "E",
                            branchIndents: 0,
                            isSequential: undefined
                        },
                        {
                            text: "G",
                            branchIndents: 0,
                            isSequential: undefined
                        },
                        {
                            text: "H",
                            branchIndents: 0,
                            isSequential: undefined
                        },
                        {
                            text: "F",
                            branchIndents: 0,
                            isSequential: true
                        },
                        {
                            text: "A",
                            branchIndents: 1,
                            isSequential: undefined
                        },
                        {
                            text: "C",
                            branchIndents: 2,
                            isSequential: undefined
                        },
                        {
                            text: "I",
                            branchIndents: 1,
                            isSequential: undefined
                        },
                        {
                            text: "D",
                            branchIndents: 0,
                            isSequential: undefined
                        },
                        {
                            text: "E",
                            branchIndents: 0,
                            isSequential: undefined
                        },
                        {
                            text: "G",
                            branchIndents: 0,
                            isSequential: undefined
                        },
                        {
                            text: "H",
                            branchIndents: 0,
                            isSequential: undefined
                        }
                    ]
                }
            ]);
        });

        it("branchifies a .. step that has a step block as a child", function() {
            var tree = new Tree();
            tree.parseIn(`
S .. -
    A -
    B -
    C -
    `);
            var branches = tree.branchify(tree.root);

            expect(branches).to.have.lengthOf(1);
            expect(branches[0].steps).to.have.lengthOf(4);

            expect(branches).to.containSubsetInOrder([
                {
                    steps: [
                        {
                            text: "S",
                            branchIndents: 0,
                            isSequential: true
                        },
                        {
                            text: "A",
                            branchIndents: 0,
                            isSequential: undefined
                        },
                        {
                            text: "B",
                            branchIndents: 0,
                            isSequential: undefined
                        },
                        {
                            text: "C",
                            branchIndents: 0,
                            isSequential: undefined
                        }
                    ]
                }
            ]);
        });

        it("branchifies a .. step that has a step block as a child, and a single step as its child", function() {
            var tree = new Tree();
            tree.parseIn(`
S .. -

    A -
    B -
    C -

        D -
    `);
            var branches = tree.branchify(tree.root);

            expect(branches).to.have.lengthOf(1);
            expect(branches[0].steps).to.have.lengthOf(7);

            // We need to do this because containSubsetInOrder() doesn't like duplicate array values (so we're using containSubset() instead)
            expect(branches[0].steps[0].text).to.equal("S");
            expect(branches[0].steps[1].text).to.equal("A");
            expect(branches[0].steps[2].text).to.equal("D");
            expect(branches[0].steps[3].text).to.equal("B");
            expect(branches[0].steps[4].text).to.equal("D");
            expect(branches[0].steps[5].text).to.equal("C");
            expect(branches[0].steps[6].text).to.equal("D");

            expect(branches).to.containSubset([
                {
                    steps: [
                        {
                            text: "S",
                            branchIndents: 0,
                            isSequential: true
                        },
                        {
                            text: "A",
                            branchIndents: 0,
                            isSequential: undefined
                        },
                        {
                            text: "D",
                            branchIndents: 0,
                            isSequential: undefined
                        },
                        {
                            text: "B",
                            branchIndents: 0,
                            isSequential: undefined
                        },
                        {
                            text: "D",
                            branchIndents: 0,
                            isSequential: undefined
                        },
                        {
                            text: "C",
                            branchIndents: 0,
                            isSequential: undefined
                        },
                        {
                            text: "D",
                            branchIndents: 0,
                            isSequential: undefined
                        }
                    ]
                }
            ]);
        });

        it("branchifies a .. step that has a step block as a child and the step block has function calls as a members", function() {
            var tree = new Tree();
            tree.parseIn(`
S .. -

    A -
    B
    C

        I -

* B
    D -
    E -

    G -

* C
    H -
    `);
            var branches = tree.branchify(tree.root);

            expect(branches).to.have.lengthOf(1);
            expect(branches[0].steps).to.have.lengthOf(15);

            // We need to do this because containSubsetInOrder() doesn't like duplicate array values (so we're using containSubset() instead)
            expect(branches[0].steps[0].text).to.equal("S");
            expect(branches[0].steps[1].text).to.equal("A");
            expect(branches[0].steps[2].text).to.equal("I");

            expect(branches[0].steps[3].text).to.equal("B");
            expect(branches[0].steps[4].text).to.equal("D");
            expect(branches[0].steps[5].text).to.equal("I");

            expect(branches[0].steps[6].text).to.equal("B");
            expect(branches[0].steps[7].text).to.equal("E");
            expect(branches[0].steps[8].text).to.equal("I");

            expect(branches[0].steps[9].text).to.equal("B");
            expect(branches[0].steps[10].text).to.equal("G");
            expect(branches[0].steps[11].text).to.equal("I");

            expect(branches[0].steps[12].text).to.equal("C");
            expect(branches[0].steps[13].text).to.equal("H");
            expect(branches[0].steps[14].text).to.equal("I");

            expect(branches).to.containSubset([
                {
                    steps: [
                        {
                            text: "S",
                            branchIndents: 0,
                            isSequential: true
                        },
                        {
                            text: "A",
                            branchIndents: 0,
                            isSequential: undefined
                        },
                        {
                            text: "I",
                            branchIndents: 0,
                            isSequential: undefined
                        },
                        {
                            text: "B",
                            branchIndents: 0,
                            isSequential: undefined
                        },
                        {
                            text: "D",
                            branchIndents: 1,
                            isSequential: undefined
                        },
                        {
                            text: "I",
                            branchIndents: 0,
                            isSequential: undefined
                        },
                        {
                            text: "B",
                            branchIndents: 0,
                            isSequential: undefined
                        },
                        {
                            text: "E",
                            branchIndents: 1,
                            isSequential: undefined
                        },
                        {
                            text: "I",
                            branchIndents: 0,
                            isSequential: undefined
                        },
                        {
                            text: "B",
                            branchIndents: 0,
                            isSequential: undefined
                        },
                        {
                            text: "G",
                            branchIndents: 1,
                            isSequential: undefined
                        },
                        {
                            text: "I",
                            branchIndents: 0,
                            isSequential: undefined
                        },
                        {
                            text: "C",
                            branchIndents: 0,
                            isSequential: undefined
                        },
                        {
                            text: "H",
                            branchIndents: 1,
                            isSequential: undefined
                        },
                        {
                            text: "I",
                            branchIndents: 0,
                            isSequential: undefined
                        }
                    ]
                }
            ]);
        });

        it("branchifies a .. step that has a step block as a child, and another step block as its child", function() {
            var tree = new Tree();
            tree.parseIn(`
S .. -

    A -
    B -

        C -
        D -
    `);
            var branches = tree.branchify(tree.root);

            expect(branches).to.have.lengthOf(1);
            expect(branches[0].steps).to.have.lengthOf(7);

            // We need to do this because containSubsetInOrder() doesn't like duplicate array values (so we're using containSubset() instead)
            expect(branches[0].steps[0].text).to.equal("S");
            expect(branches[0].steps[1].text).to.equal("A");
            expect(branches[0].steps[2].text).to.equal("C");
            expect(branches[0].steps[3].text).to.equal("D");
            expect(branches[0].steps[4].text).to.equal("B");
            expect(branches[0].steps[5].text).to.equal("C");
            expect(branches[0].steps[6].text).to.equal("D");

            expect(branches).to.containSubset([
                {
                    steps: [
                        {
                            text: "S",
                            branchIndents: 0,
                            isSequential: true
                        },
                        {
                            text: "A",
                            branchIndents: 0,
                            isSequential: undefined
                        },
                        {
                            text: "C",
                            branchIndents: 0,
                            isSequential: undefined
                        },
                        {
                            text: "D",
                            branchIndents: 0,
                            isSequential: undefined
                        },
                        {
                            text: "B",
                            branchIndents: 0,
                            isSequential: undefined
                        },
                        {
                            text: "C",
                            branchIndents: 0,
                            isSequential: undefined
                        },
                        {
                            text: "D",
                            branchIndents: 0,
                            isSequential: undefined
                        }
                    ]
                }
            ]);
        });

        it("branchifies a .. step that has a step block as a child, and another step block as its child, and another step as its child", function() {
            var tree = new Tree();
            tree.parseIn(`
S .. -

    A -
    B -

        C -
        D -

            E -
    `);
            var branches = tree.branchify(tree.root);

            expect(branches).to.have.lengthOf(1);
            expect(branches[0].steps).to.have.lengthOf(11);

            // We need to do this because containSubsetInOrder() doesn't like duplicate array values (so we're using containSubset() instead)
            expect(branches[0].steps[0].text).to.equal("S");
            expect(branches[0].steps[1].text).to.equal("A");
            expect(branches[0].steps[2].text).to.equal("C");
            expect(branches[0].steps[3].text).to.equal("E");
            expect(branches[0].steps[4].text).to.equal("D");
            expect(branches[0].steps[5].text).to.equal("E");

            expect(branches[0].steps[6].text).to.equal("B");
            expect(branches[0].steps[7].text).to.equal("C");
            expect(branches[0].steps[8].text).to.equal("E");
            expect(branches[0].steps[9].text).to.equal("D");
            expect(branches[0].steps[10].text).to.equal("E");

            expect(branches).to.containSubset([
                {
                    steps: [
                        {
                            text: "S",
                            branchIndents: 0,
                            isSequential: true
                        },
                        {
                            text: "A",
                            branchIndents: 0,
                            isSequential: undefined
                        },
                        {
                            text: "C",
                            branchIndents: 0,
                            isSequential: undefined
                        },
                        {
                            text: "E",
                            branchIndents: 0,
                            isSequential: undefined
                        },
                        {
                            text: "D",
                            branchIndents: 0,
                            isSequential: undefined
                        },
                        {
                            text: "E",
                            branchIndents: 0,
                            isSequential: undefined
                        },
                        {
                            text: "B",
                            branchIndents: 0,
                            isSequential: undefined
                        },
                        {
                            text: "C",
                            branchIndents: 0,
                            isSequential: undefined
                        },
                        {
                            text: "E",
                            branchIndents: 0,
                            isSequential: undefined
                        },
                        {
                            text: "D",
                            branchIndents: 0,
                            isSequential: undefined
                        },
                        {
                            text: "E",
                            branchIndents: 0,
                            isSequential: undefined
                        }
                    ]
                }
            ]);
        });

        it("branchifies a .. step that has other .. steps as children", function() {
            var tree = new Tree();
            tree.parseIn(`
S .. -
    A - ..
        B -
            C -
        D -
    E -
    `);
            var branches = tree.branchify(tree.root);

            expect(branches).to.have.lengthOf(1);
            expect(branches[0].steps).to.have.lengthOf(6);

            expect(branches).to.containSubsetInOrder([
                {
                    steps: [
                        {
                            text: "S",
                            branchIndents: 0,
                            isSequential: true
                        },
                        {
                            text: "A",
                            branchIndents: 0,
                            isSequential: true
                        },
                        {
                            text: "B",
                            branchIndents: 0,
                            isSequential: undefined
                        },
                        {
                            text: "C",
                            branchIndents: 0,
                            isSequential: undefined
                        },
                        {
                            text: "D",
                            branchIndents: 0,
                            isSequential: undefined
                        },
                        {
                            text: "E",
                            branchIndents: 0,
                            isSequential: undefined
                        }
                    ]
                }
            ]);
        });

        it("branchifies a function declaration under a .. step", function() {
            var tree = new Tree();
            tree.parseIn(`
A - ..
    F

    * F
        B -
    `);

            var branches = tree.branchify(tree.root);

            expect(branches).to.have.lengthOf(1);
            expect(branches[0].steps).to.have.lengthOf(3);

            expect(branches).to.containSubsetInOrder([
                {
                    steps: [
                        {
                            text: "A",
                            branchIndents: 0,
                            isSequential: true
                        },
                        {
                            text: "F",
                            branchIndents: 0,
                            isSequential: undefined
                        },
                        {
                            text: "B",
                            branchIndents: 1,
                            isSequential: undefined
                        }
                    ]
                }
            ]);
        });

        it("branchifies a .. step block with no children", function() {
            var tree = new Tree();
            tree.parseIn(`
..
A -
B -
C -
    `);
            var branches = tree.branchify(tree.root);

            expect(branches).to.have.lengthOf(1);
            expect(branches[0].steps).to.have.lengthOf(3);

            expect(branches).to.containSubsetInOrder([
                {
                    steps: [
                        {
                            text: "A",
                            branchIndents: 0,
                            isSequential: undefined
                        },
                        {
                            text: "B",
                            branchIndents: 0,
                            isSequential: undefined
                        },
                        {
                            text: "C",
                            branchIndents: 0,
                            isSequential: undefined
                        }
                    ]
                }
            ]);
        });

        it("branchifies a .. step block with a single branch of children", function() {
            var tree = new Tree();
            tree.parseIn(`
..
A -
B -
C -

    D -
        E -
    `);
            var branches = tree.branchify(tree.root);

            expect(branches).to.have.lengthOf(1);
            expect(branches[0].steps).to.have.lengthOf(5);

            expect(branches).to.containSubsetInOrder([
                {
                    steps: [
                        {
                            text: "A",
                            branchIndents: 0,
                            isSequential: undefined
                        },
                        {
                            text: "B",
                            branchIndents: 0,
                            isSequential: undefined
                        },
                        {
                            text: "C",
                            branchIndents: 0,
                            isSequential: undefined
                        },
                        {
                            text: "D",
                            branchIndents: 0,
                            isSequential: undefined
                        },
                        {
                            text: "E",
                            branchIndents: 0,
                            isSequential: undefined
                        }
                    ]
                }
            ]);
        });

        it("branchifies a .. step block with multiple branches of children", function() {
            var tree = new Tree();
            tree.parseIn(`
..
A -
B -
C -

    D -
        E -
    F -
    `);
            var branches = tree.branchify(tree.root);

            expect(branches).to.have.lengthOf(2);
            expect(branches[0].steps).to.have.lengthOf(5);
            expect(branches[1].steps).to.have.lengthOf(4);

            expect(branches).to.containSubsetInOrder([
                {
                    steps: [
                        {
                            text: "A",
                            branchIndents: 0,
                            isSequential: undefined
                        },
                        {
                            text: "B",
                            branchIndents: 0,
                            isSequential: undefined
                        },
                        {
                            text: "C",
                            branchIndents: 0,
                            isSequential: undefined
                        },
                        {
                            text: "D",
                            branchIndents: 0,
                            isSequential: undefined
                        },
                        {
                            text: "E",
                            branchIndents: 0,
                            isSequential: undefined
                        }
                    ]
                },
                {
                    steps: [
                        {
                            text: "A",
                            branchIndents: 0,
                            isSequential: undefined
                        },
                        {
                            text: "B",
                            branchIndents: 0,
                            isSequential: undefined
                        },
                        {
                            text: "C",
                            branchIndents: 0,
                            isSequential: undefined
                        },
                        {
                            text: "F",
                            branchIndents: 0,
                            isSequential: undefined
                        }
                    ]
                }
            ]);
        });

        it("branchifies a .. step block that contains function calls, where each function call has a single branch", function() {
            var tree = new Tree();
            tree.parseIn(`
..
A
B -
C

* A
    G -
        H -

* C
    I -
    `);
            var branches = tree.branchify(tree.root);

            expect(branches).to.have.lengthOf(1);
            expect(branches[0].steps).to.have.lengthOf(6);

            expect(branches).to.containSubsetInOrder([
                {
                    steps: [
                        {
                            text: "A",
                            branchIndents: 0,
                            isSequential: undefined
                        },
                        {
                            text: "G",
                            branchIndents: 1,
                            isSequential: undefined
                        },
                        {
                            text: "H",
                            branchIndents: 1,
                            isSequential: undefined
                        },
                        {
                            text: "B",
                            branchIndents: 0,
                            isSequential: undefined
                        },
                        {
                            text: "C",
                            branchIndents: 0,
                            isSequential: undefined
                        },
                        {
                            text: "I",
                            branchIndents: 1,
                            isSequential: undefined
                        }
                    ]
                }
            ]);
        });

        it("branchifies a .. step block that contains a function call, whose function declaration starts with a ..", function() {
            var tree = new Tree();
            tree.parseIn(`
..
A
B -

* A ..
    C -
        D -
    E -
    `);
            var branches = tree.branchify(tree.root);

            expect(branches).to.have.lengthOf(1);
            expect(branches[0].steps).to.have.lengthOf(5);

            expect(branches).to.containSubsetInOrder([
                {
                    steps: [
                        {
                            text: "A",
                            branchIndents: 0,
                            isSequential: true
                        },
                        {
                            text: "C",
                            branchIndents: 1,
                            isSequential: undefined
                        },
                        {
                            text: "D",
                            branchIndents: 1,
                            isSequential: undefined
                        },
                        {
                            text: "E",
                            branchIndents: 1,
                            isSequential: undefined
                        },
                        {
                            text: "B",
                            branchIndents: 0,
                            isSequential: undefined
                        }
                    ]
                }
            ]);
        });

        it("branchifies a function declaration under a .. step block", function() {
            var tree = new Tree();
            tree.parseIn(`
..
A -
B -

    F

    * F
        C -
    `);

            var branches = tree.branchify(tree.root);

            expect(branches).to.have.lengthOf(1);
            expect(branches[0].steps).to.have.lengthOf(4);

            expect(branches).to.containSubsetInOrder([
                {
                    steps: [
                        {
                            text: "A",
                            branchIndents: 0,
                            isSequential: undefined
                        },
                        {
                            text: "B",
                            branchIndents: 0,
                            isSequential: undefined
                        },
                        {
                            text: "F",
                            branchIndents: 0,
                            isSequential: undefined
                        },
                        {
                            text: "C",
                            branchIndents: 1,
                            isSequential: undefined
                        }
                    ]
                }
            ]);
        });

        it("branchifies a .. step block that contains function calls, where each function declaration has multiple branches", function() {
            var tree = new Tree();
            tree.parseIn(`
..
A
B -
C

* A
    G -
        H -
    J -

* C
    I -
    K -
    `);
            var branches = tree.branchify(tree.root);

            expect(branches).to.have.lengthOf(4);
            expect(branches[0].steps).to.have.lengthOf(6);
            expect(branches[1].steps).to.have.lengthOf(6);
            expect(branches[2].steps).to.have.lengthOf(5);
            expect(branches[3].steps).to.have.lengthOf(5);

            expect(branches[0].steps[0].text).to.equal("A");
            expect(branches[0].steps[1].text).to.equal("G");
            expect(branches[0].steps[2].text).to.equal("H");
            expect(branches[0].steps[3].text).to.equal("B");
            expect(branches[0].steps[4].text).to.equal("C");
            expect(branches[0].steps[5].text).to.equal("I");

            expect(branches[1].steps[0].text).to.equal("A");
            expect(branches[1].steps[1].text).to.equal("G");
            expect(branches[1].steps[2].text).to.equal("H");
            expect(branches[1].steps[3].text).to.equal("B");
            expect(branches[1].steps[4].text).to.equal("C");
            expect(branches[1].steps[5].text).to.equal("K");

            expect(branches[2].steps[0].text).to.equal("A");
            expect(branches[2].steps[1].text).to.equal("J");
            expect(branches[2].steps[2].text).to.equal("B");
            expect(branches[2].steps[3].text).to.equal("C");
            expect(branches[2].steps[4].text).to.equal("I");

            expect(branches[3].steps[0].text).to.equal("A");
            expect(branches[3].steps[1].text).to.equal("J");
            expect(branches[3].steps[2].text).to.equal("B");
            expect(branches[3].steps[3].text).to.equal("C");
            expect(branches[3].steps[4].text).to.equal("K");

            expect(branches).to.containSubsetInOrder([
                {
                    steps: [
                        {
                            text: "A",
                            branchIndents: 0,
                            isSequential: undefined
                        },
                        {
                            text: "G",
                            branchIndents: 1,
                            isSequential: undefined
                        },
                        {
                            text: "H",
                            branchIndents: 1,
                            isSequential: undefined
                        },
                        {
                            text: "B",
                            branchIndents: 0,
                            isSequential: undefined
                        },
                        {
                            text: "C",
                            branchIndents: 0,
                            isSequential: undefined
                        },
                        {
                            text: "I",
                            branchIndents: 1,
                            isSequential: undefined
                        }
                    ]
                },
                {
                    steps: [
                        {
                            text: "A",
                            branchIndents: 0,
                            isSequential: undefined
                        },
                        {
                            text: "G",
                            branchIndents: 1,
                            isSequential: undefined
                        },
                        {
                            text: "H",
                            branchIndents: 1,
                            isSequential: undefined
                        },
                        {
                            text: "B",
                            branchIndents: 0,
                            isSequential: undefined
                        },
                        {
                            text: "C",
                            branchIndents: 0,
                            isSequential: undefined
                        },
                        {
                            text: "K",
                            branchIndents: 1,
                            isSequential: undefined
                        }
                    ]
                },
                {
                    steps: [
                        {
                            text: "A",
                            branchIndents: 0,
                            isSequential: undefined
                        },
                        {
                            text: "J",
                            branchIndents: 1,
                            isSequential: undefined
                        },
                        {
                            text: "B",
                            branchIndents: 0,
                            isSequential: undefined
                        },
                        {
                            text: "C",
                            branchIndents: 0,
                            isSequential: undefined
                        },
                        {
                            text: "I",
                            branchIndents: 1,
                            isSequential: undefined
                        }
                    ]
                },
                {
                    steps: [
                        {
                            text: "A",
                            branchIndents: 0,
                            isSequential: undefined
                        },
                        {
                            text: "J",
                            branchIndents: 1,
                            isSequential: undefined
                        },
                        {
                            text: "B",
                            branchIndents: 0,
                            isSequential: undefined
                        },
                        {
                            text: "C",
                            branchIndents: 0,
                            isSequential: undefined
                        },
                        {
                            text: "K",
                            branchIndents: 1,
                            isSequential: undefined
                        }
                    ]
                }
            ]);
        });

        it("branchifies a .. step block that contains function calls and multiple branches of children, where each function declaration has multiple branches", function() {
            var tree = new Tree();
            tree.parseIn(`
..
A
B -
C

    L -

    M -
        N -
        O -

* A
    G -
        H -
    J -

* C
    I -
    K -
    `);
            var branches = tree.branchify(tree.root);

            expect(branches).to.have.lengthOf(12);
            expect(branches[0].steps).to.have.lengthOf(7);
            expect(branches[1].steps).to.have.lengthOf(8);
            expect(branches[2].steps).to.have.lengthOf(8);
            expect(branches[3].steps).to.have.lengthOf(7);
            expect(branches[4].steps).to.have.lengthOf(8);
            expect(branches[5].steps).to.have.lengthOf(8);
            expect(branches[6].steps).to.have.lengthOf(6);
            expect(branches[7].steps).to.have.lengthOf(7);
            expect(branches[8].steps).to.have.lengthOf(7);
            expect(branches[9].steps).to.have.lengthOf(6);
            expect(branches[10].steps).to.have.lengthOf(7);
            expect(branches[11].steps).to.have.lengthOf(7);

            expect(branches[0].steps[0].text).to.equal("A");
            expect(branches[0].steps[1].text).to.equal("G");
            expect(branches[0].steps[2].text).to.equal("H");
            expect(branches[0].steps[3].text).to.equal("B");
            expect(branches[0].steps[4].text).to.equal("C");
            expect(branches[0].steps[5].text).to.equal("I");
            expect(branches[0].steps[6].text).to.equal("L");

            expect(branches[1].steps[0].text).to.equal("A");
            expect(branches[1].steps[1].text).to.equal("G");
            expect(branches[1].steps[2].text).to.equal("H");
            expect(branches[1].steps[3].text).to.equal("B");
            expect(branches[1].steps[4].text).to.equal("C");
            expect(branches[1].steps[5].text).to.equal("I");
            expect(branches[1].steps[6].text).to.equal("M");
            expect(branches[1].steps[7].text).to.equal("N");

            expect(branches[2].steps[0].text).to.equal("A");
            expect(branches[2].steps[1].text).to.equal("G");
            expect(branches[2].steps[2].text).to.equal("H");
            expect(branches[2].steps[3].text).to.equal("B");
            expect(branches[2].steps[4].text).to.equal("C");
            expect(branches[2].steps[5].text).to.equal("I");
            expect(branches[2].steps[6].text).to.equal("M");
            expect(branches[2].steps[7].text).to.equal("O");

            expect(branches[3].steps[0].text).to.equal("A");
            expect(branches[3].steps[1].text).to.equal("G");
            expect(branches[3].steps[2].text).to.equal("H");
            expect(branches[3].steps[3].text).to.equal("B");
            expect(branches[3].steps[4].text).to.equal("C");
            expect(branches[3].steps[5].text).to.equal("K");
            expect(branches[3].steps[6].text).to.equal("L");

            expect(branches[4].steps[0].text).to.equal("A");
            expect(branches[4].steps[1].text).to.equal("G");
            expect(branches[4].steps[2].text).to.equal("H");
            expect(branches[4].steps[3].text).to.equal("B");
            expect(branches[4].steps[4].text).to.equal("C");
            expect(branches[4].steps[5].text).to.equal("K");
            expect(branches[4].steps[6].text).to.equal("M");
            expect(branches[4].steps[7].text).to.equal("N");

            expect(branches[5].steps[0].text).to.equal("A");
            expect(branches[5].steps[1].text).to.equal("G");
            expect(branches[5].steps[2].text).to.equal("H");
            expect(branches[5].steps[3].text).to.equal("B");
            expect(branches[5].steps[4].text).to.equal("C");
            expect(branches[5].steps[5].text).to.equal("K");
            expect(branches[5].steps[6].text).to.equal("M");
            expect(branches[5].steps[7].text).to.equal("O");

            expect(branches[6].steps[0].text).to.equal("A");
            expect(branches[6].steps[1].text).to.equal("J");
            expect(branches[6].steps[2].text).to.equal("B");
            expect(branches[6].steps[3].text).to.equal("C");
            expect(branches[6].steps[4].text).to.equal("I");
            expect(branches[6].steps[5].text).to.equal("L");

            expect(branches[7].steps[0].text).to.equal("A");
            expect(branches[7].steps[1].text).to.equal("J");
            expect(branches[7].steps[2].text).to.equal("B");
            expect(branches[7].steps[3].text).to.equal("C");
            expect(branches[7].steps[4].text).to.equal("I");
            expect(branches[7].steps[5].text).to.equal("M");
            expect(branches[7].steps[6].text).to.equal("N");

            expect(branches[8].steps[0].text).to.equal("A");
            expect(branches[8].steps[1].text).to.equal("J");
            expect(branches[8].steps[2].text).to.equal("B");
            expect(branches[8].steps[3].text).to.equal("C");
            expect(branches[8].steps[4].text).to.equal("I");
            expect(branches[8].steps[5].text).to.equal("M");
            expect(branches[8].steps[6].text).to.equal("O");

            expect(branches[9].steps[0].text).to.equal("A");
            expect(branches[9].steps[1].text).to.equal("J");
            expect(branches[9].steps[2].text).to.equal("B");
            expect(branches[9].steps[3].text).to.equal("C");
            expect(branches[9].steps[4].text).to.equal("K");
            expect(branches[9].steps[5].text).to.equal("L");

            expect(branches[10].steps[0].text).to.equal("A");
            expect(branches[10].steps[1].text).to.equal("J");
            expect(branches[10].steps[2].text).to.equal("B");
            expect(branches[10].steps[3].text).to.equal("C");
            expect(branches[10].steps[4].text).to.equal("K");
            expect(branches[10].steps[5].text).to.equal("M");
            expect(branches[10].steps[6].text).to.equal("N");

            expect(branches[11].steps[0].text).to.equal("A");
            expect(branches[11].steps[1].text).to.equal("J");
            expect(branches[11].steps[2].text).to.equal("B");
            expect(branches[11].steps[3].text).to.equal("C");
            expect(branches[11].steps[4].text).to.equal("K");
            expect(branches[11].steps[5].text).to.equal("M");
            expect(branches[11].steps[6].text).to.equal("O");

            expect(branches).to.containSubsetInOrder([
                {
                    steps: [
                        { text: "A", branchIndents: 0, isSequential: undefined },
                        { text: "G", branchIndents: 1, isSequential: undefined },
                        { text: "H", branchIndents: 1, isSequential: undefined },
                        { text: "B", branchIndents: 0, isSequential: undefined },
                        { text: "C", branchIndents: 0, isSequential: undefined },
                        { text: "I", branchIndents: 1, isSequential: undefined },
                        { text: "L", branchIndents: 0, isSequential: undefined }
                    ]
                },
                {
                    steps: [
                        { text: "A", branchIndents: 0, isSequential: undefined },
                        { text: "G", branchIndents: 1, isSequential: undefined },
                        { text: "H", branchIndents: 1, isSequential: undefined },
                        { text: "B", branchIndents: 0, isSequential: undefined },
                        { text: "C", branchIndents: 0, isSequential: undefined },
                        { text: "I", branchIndents: 1, isSequential: undefined },
                        { text: "M", branchIndents: 0, isSequential: undefined },
                        { text: "N", branchIndents: 0, isSequential: undefined }
                    ]
                },
                {
                    steps: [
                        { text: "A", branchIndents: 0, isSequential: undefined },
                        { text: "G", branchIndents: 1, isSequential: undefined },
                        { text: "H", branchIndents: 1, isSequential: undefined },
                        { text: "B", branchIndents: 0, isSequential: undefined },
                        { text: "C", branchIndents: 0, isSequential: undefined },
                        { text: "I", branchIndents: 1, isSequential: undefined },
                        { text: "M", branchIndents: 0, isSequential: undefined },
                        { text: "O", branchIndents: 0, isSequential: undefined }
                    ]
                },
                {
                    steps: [
                        { text: "A", branchIndents: 0, isSequential: undefined },
                        { text: "G", branchIndents: 1, isSequential: undefined },
                        { text: "H", branchIndents: 1, isSequential: undefined },
                        { text: "B", branchIndents: 0, isSequential: undefined },
                        { text: "C", branchIndents: 0, isSequential: undefined },
                        { text: "K", branchIndents: 1, isSequential: undefined },
                        { text: "L", branchIndents: 0, isSequential: undefined }
                    ]
                },
                {
                    steps: [
                        { text: "A", branchIndents: 0, isSequential: undefined },
                        { text: "G", branchIndents: 1, isSequential: undefined },
                        { text: "H", branchIndents: 1, isSequential: undefined },
                        { text: "B", branchIndents: 0, isSequential: undefined },
                        { text: "C", branchIndents: 0, isSequential: undefined },
                        { text: "K", branchIndents: 1, isSequential: undefined },
                        { text: "M", branchIndents: 0, isSequential: undefined },
                        { text: "N", branchIndents: 0, isSequential: undefined }
                    ]
                },
                {
                    steps: [
                        { text: "A", branchIndents: 0, isSequential: undefined },
                        { text: "G", branchIndents: 1, isSequential: undefined },
                        { text: "H", branchIndents: 1, isSequential: undefined },
                        { text: "B", branchIndents: 0, isSequential: undefined },
                        { text: "C", branchIndents: 0, isSequential: undefined },
                        { text: "K", branchIndents: 1, isSequential: undefined },
                        { text: "M", branchIndents: 0, isSequential: undefined },
                        { text: "O", branchIndents: 0, isSequential: undefined }
                    ]
                },
                {
                    steps: [
                        { text: "A", branchIndents: 0, isSequential: undefined },
                        { text: "J", branchIndents: 1, isSequential: undefined },
                        { text: "B", branchIndents: 0, isSequential: undefined },
                        { text: "C", branchIndents: 0, isSequential: undefined },
                        { text: "I", branchIndents: 1, isSequential: undefined },
                        { text: "L", branchIndents: 0, isSequential: undefined }
                    ]
                },
                {
                    steps: [
                        { text: "A", branchIndents: 0, isSequential: undefined },
                        { text: "J", branchIndents: 1, isSequential: undefined },
                        { text: "B", branchIndents: 0, isSequential: undefined },
                        { text: "C", branchIndents: 0, isSequential: undefined },
                        { text: "I", branchIndents: 1, isSequential: undefined },
                        { text: "M", branchIndents: 0, isSequential: undefined },
                        { text: "N", branchIndents: 0, isSequential: undefined }
                    ]
                },
                {
                    steps: [
                        { text: "A", branchIndents: 0, isSequential: undefined },
                        { text: "J", branchIndents: 1, isSequential: undefined },
                        { text: "B", branchIndents: 0, isSequential: undefined },
                        { text: "C", branchIndents: 0, isSequential: undefined },
                        { text: "I", branchIndents: 1, isSequential: undefined },
                        { text: "M", branchIndents: 0, isSequential: undefined },
                        { text: "O", branchIndents: 0, isSequential: undefined }
                    ]
                },
                {
                    steps: [
                        { text: "A", branchIndents: 0, isSequential: undefined },
                        { text: "J", branchIndents: 1, isSequential: undefined },
                        { text: "B", branchIndents: 0, isSequential: undefined },
                        { text: "C", branchIndents: 0, isSequential: undefined },
                        { text: "K", branchIndents: 1, isSequential: undefined },
                        { text: "L", branchIndents: 0, isSequential: undefined }
                    ]
                },
                {
                    steps: [
                        { text: "A", branchIndents: 0, isSequential: undefined },
                        { text: "J", branchIndents: 1, isSequential: undefined },
                        { text: "B", branchIndents: 0, isSequential: undefined },
                        { text: "C", branchIndents: 0, isSequential: undefined },
                        { text: "K", branchIndents: 1, isSequential: undefined },
                        { text: "M", branchIndents: 0, isSequential: undefined },
                        { text: "N", branchIndents: 0, isSequential: undefined }
                    ]
                },
                {
                    steps: [
                        { text: "A", branchIndents: 0, isSequential: undefined },
                        { text: "J", branchIndents: 1, isSequential: undefined },
                        { text: "B", branchIndents: 0, isSequential: undefined },
                        { text: "C", branchIndents: 0, isSequential: undefined },
                        { text: "K", branchIndents: 1, isSequential: undefined },
                        { text: "M", branchIndents: 0, isSequential: undefined },
                        { text: "O", branchIndents: 0, isSequential: undefined }
                    ]
                }
            ]);
        });

        it("branchifies a .. step that contains a .. step block", function() {
            var tree = new Tree();
            tree.parseIn(`
..
A -
B -
    ..
    C -
    D -
    `);
            var branches = tree.branchify(tree.root);

            expect(branches).to.have.lengthOf(1);
            expect(branches[0].steps).to.have.lengthOf(4);

            expect(branches).to.containSubsetInOrder([
                {
                    steps: [
                        {
                            text: "A",
                            branchIndents: 0,
                            isSequential: undefined
                        },
                        {
                            text: "B",
                            branchIndents: 0,
                            isSequential: undefined
                        },
                        {
                            text: "C",
                            branchIndents: 0,
                            isSequential: undefined
                        },
                        {
                            text: "D",
                            branchIndents: 0,
                            isSequential: undefined
                        }
                    ]
                }
            ]);
        });

        it("branchifies a .. step that contains a .. step block that contains a function call, whose function declaration has multiple branches", function() {
            var tree = new Tree();
            tree.parseIn(`
..
A -
B -
    ..
    C
    D -

    * C
        E -

        F -
    `);
            var branches = tree.branchify(tree.root);

            expect(branches).to.have.lengthOf(2);
            expect(branches[0].steps).to.have.lengthOf(5);
            expect(branches[1].steps).to.have.lengthOf(5);

            expect(branches[0].steps[0].text).to.equal("A");
            expect(branches[0].steps[1].text).to.equal("B");
            expect(branches[0].steps[2].text).to.equal("C");
            expect(branches[0].steps[3].text).to.equal("E");
            expect(branches[0].steps[4].text).to.equal("D");

            expect(branches[1].steps[0].text).to.equal("A");
            expect(branches[1].steps[1].text).to.equal("B");
            expect(branches[1].steps[2].text).to.equal("C");
            expect(branches[1].steps[3].text).to.equal("F");
            expect(branches[1].steps[4].text).to.equal("D");

            expect(branches).to.containSubsetInOrder([
                {
                    steps: [
                        {
                            text: "A",
                            branchIndents: 0,
                            isSequential: undefined
                        },
                        {
                            text: "B",
                            branchIndents: 0,
                            isSequential: undefined
                        },
                        {
                            text: "C",
                            branchIndents: 0,
                            isSequential: undefined
                        },
                        {
                            text: "E",
                            branchIndents: 1,
                            isSequential: undefined
                        },
                        {
                            text: "D",
                            branchIndents: 0,
                            isSequential: undefined
                        }
                    ]
                },
                {
                    steps: [
                        {
                            text: "A",
                            branchIndents: 0,
                            isSequential: undefined
                        },
                        {
                            text: "B",
                            branchIndents: 0,
                            isSequential: undefined
                        },
                        {
                            text: "C",
                            branchIndents: 0,
                            isSequential: undefined
                        },
                        {
                            text: "F",
                            branchIndents: 1,
                            isSequential: undefined
                        },
                        {
                            text: "D",
                            branchIndents: 0,
                            isSequential: undefined
                        }
                    ]
                }
            ]);
        });

        it("branchifies the * Before Every Branch hook", function() {
            var tree = new Tree();
            tree.parseIn(`
A -
    B -

    C -
        * Before Every Branch {
            D
        }

E -
    `);

            var branches = tree.branchify(tree.root);

            expect(branches).to.have.lengthOf(3);

            expect(branches[0].steps).to.have.lengthOf(2);
            expect(branches[1].steps).to.have.lengthOf(2);
            expect(branches[2].steps).to.have.lengthOf(1);

            expect(branches[0].beforeEveryBranch).to.equal(undefined);
            expect(branches[1].beforeEveryBranch).to.have.lengthOf(1);
            expect(branches[2].beforeEveryBranch).to.equal(undefined);

            expect(branches).to.containSubsetInOrder([
                {
                    steps: [ { text: "A" }, { text: "B" } ],
                    beforeEveryBranch: undefined,
                    afterEveryBranch: undefined,
                    beforeEveryStep: undefined,
                    afterEveryStep: undefined
                },
                {
                    steps: [ { text: "A" }, { text: "C" } ],
                    beforeEveryBranch: [
                        { text: "Before Every Branch", branchIndents: 0, codeBlock: "\n            D\n" }
                    ],
                    afterEveryBranch: undefined,
                    beforeEveryStep: undefined,
                    afterEveryStep: undefined
                },
                {
                    steps: [ { text: "E" } ],
                    beforeEveryBranch: undefined,
                    afterEveryBranch: undefined,
                    beforeEveryStep: undefined,
                    afterEveryStep: undefined
                }
            ]);
        });

        it("branchifies the * After Every Branch hook", function() {
            var tree = new Tree();
            tree.parseIn(`
A -
    B -

    C -
        * After Every Branch {
            D
        }

E -
    `);

            var branches = tree.branchify(tree.root);

            expect(branches).to.have.lengthOf(3);

            expect(branches[0].steps).to.have.lengthOf(2);
            expect(branches[1].steps).to.have.lengthOf(2);
            expect(branches[2].steps).to.have.lengthOf(1);

            expect(branches[0].afterEveryBranch).to.equal(undefined);
            expect(branches[1].afterEveryBranch).to.have.lengthOf(1);
            expect(branches[2].afterEveryBranch).to.equal(undefined);

            expect(branches).to.containSubsetInOrder([
                {
                    steps: [ { text: "A" }, { text: "B" } ],
                    beforeEveryBranch: undefined,
                    afterEveryBranch: undefined,
                    beforeEveryStep: undefined,
                    afterEveryStep: undefined
                },
                {
                    steps: [ { text: "A" }, { text: "C" } ],
                    beforeEveryBranch: undefined,
                    afterEveryBranch: [
                        { text: "After Every Branch", branchIndents: 0, codeBlock: "\n            D\n" }
                    ],
                    beforeEveryStep: undefined,
                    afterEveryStep: undefined
                },
                {
                    steps: [ { text: "E" } ],
                    beforeEveryBranch: undefined,
                    afterEveryBranch: undefined,
                    beforeEveryStep: undefined,
                    afterEveryStep: undefined
                }
            ]);
        });

        it("branchifies an empty * Before Every Branch hook", function() {
            var tree = new Tree();
            tree.parseIn(`
A -
    * Before Every Branch {
    }
`);

            var branches = tree.branchify(tree.root);

            expect(branches).to.have.lengthOf(1);
            expect(branches[0].steps).to.have.lengthOf(1);
            expect(branches[0].beforeEveryBranch).to.have.lengthOf(1);

            expect(branches).to.containSubsetInOrder([
                {
                    steps: [ { text: "A" } ],
                    beforeEveryBranch: [
                        { text: "Before Every Branch", branchIndents: 0, codeBlock: "\n" }
                    ],
                }
            ]);
        });

        it("branchifies an empty * After Every Branch hook", function() {
            var tree = new Tree();
            tree.parseIn(`
A -
    * After Every Branch {
    }
`);

            var branches = tree.branchify(tree.root);

            expect(branches).to.have.lengthOf(1);
            expect(branches[0].steps).to.have.lengthOf(1);
            expect(branches[0].afterEveryBranch).to.have.lengthOf(1);

            expect(branches).to.containSubsetInOrder([
                {
                    steps: [ { text: "A" } ],
                    afterEveryBranch: [
                        { text: "After Every Branch", branchIndents: 0, codeBlock: "\n" }
                    ],
                }
            ]);
        });

        it("branchifies the * Before Every Branch hook under the root", function() {
            var tree = new Tree();
            tree.parseIn(`
A -

* Before Every Branch {
    B
}

C -
    `);

            var branches = tree.branchify(tree.root);

            expect(branches).to.have.lengthOf(2);

            expect(branches[0].steps).to.have.lengthOf(1);
            expect(branches[1].steps).to.have.lengthOf(1);

            expect(branches[0].beforeEveryBranch).to.have.lengthOf(1);
            expect(branches[1].beforeEveryBranch).to.have.lengthOf(1);

            expect(branches).to.containSubsetInOrder([
                {
                    steps: [ { text: "A" } ],
                    beforeEveryBranch: [
                        { text: "Before Every Branch", branchIndents: 0, codeBlock: "\n    B\n" }
                    ]
                },
                {
                    steps: [ { text: "C" } ],
                    beforeEveryBranch: [
                        { text: "Before Every Branch", branchIndents: 0, codeBlock: "\n    B\n" }
                    ]
                }
            ]);
        });

        it("branchifies the * After Every Branch hook under the root", function() {
            var tree = new Tree();
            tree.parseIn(`
A -

*  After  Every branch {
    B
}

C -
    `);

            var branches = tree.branchify(tree.root);

            expect(branches).to.have.lengthOf(2);

            expect(branches[0].steps).to.have.lengthOf(1);
            expect(branches[1].steps).to.have.lengthOf(1);

            expect(branches[0].afterEveryBranch).to.have.lengthOf(1);
            expect(branches[1].afterEveryBranch).to.have.lengthOf(1);

            expect(branches).to.containSubsetInOrder([
                {
                    steps: [ { text: "A" } ],
                    afterEveryBranch: [
                        { text: "After  Every branch", branchIndents: 0, codeBlock: "\n    B\n" }
                    ]
                },
                {
                    steps: [ { text: "C" } ],
                    afterEveryBranch: [
                        { text: "After  Every branch", branchIndents: 0, codeBlock: "\n    B\n" }
                    ]
                }
            ]);
        });

        it("branchifies the * Before Every Branch hook when it's inside a function declaration", function() {
            var tree = new Tree();
            tree.parseIn(`
F

* F
    A -
    B -

    * Before Every Branch {
        C
    }
    `);

            var branches = tree.branchify(tree.root);

            expect(branches).to.have.lengthOf(2);

            expect(branches[0].steps).to.have.lengthOf(2);
            expect(branches[1].steps).to.have.lengthOf(2);

            expect(branches[0].beforeEveryBranch).to.have.lengthOf(1);
            expect(branches[1].beforeEveryBranch).to.have.lengthOf(1);

            expect(branches).to.containSubsetInOrder([
                {
                    steps: [ { text: "F" }, { text: "A" } ],
                    beforeEveryBranch: [
                        { text: "Before Every Branch", branchIndents: 0, codeBlock: "\n        C\n" }
                    ]
                },
                {
                    steps: [ { text: "F" }, { text: "B" } ],
                    beforeEveryBranch: [
                        { text: "Before Every Branch", branchIndents: 0, codeBlock: "\n        C\n" }
                    ]
                }
            ]);
        });

        it("branchifies the * After Every Branch hook when it's inside a function declaration", function() {
            var tree = new Tree();
            tree.parseIn(`
F

* F
    A -
    B -

    * After Every Branch {
        C
    }
    `);

            var branches = tree.branchify(tree.root);

            expect(branches).to.have.lengthOf(2);

            expect(branches[0].steps).to.have.lengthOf(2);
            expect(branches[1].steps).to.have.lengthOf(2);

            expect(branches[0].afterEveryBranch).to.have.lengthOf(1);
            expect(branches[1].afterEveryBranch).to.have.lengthOf(1);

            expect(branches).to.containSubsetInOrder([
                {
                    steps: [ { text: "F" }, { text: "A" } ],
                    afterEveryBranch: [
                        { text: "After Every Branch", branchIndents: 0, codeBlock: "\n        C\n" }
                    ]
                },
                {
                    steps: [ { text: "F" }, { text: "B" } ],
                    afterEveryBranch: [
                        { text: "After Every Branch", branchIndents: 0, codeBlock: "\n        C\n" }
                    ]
                }
            ]);
        });

        it("branchifies the * Before Every Branch hook under a step block", function() {
            var tree = new Tree();
            tree.parseIn(`
A -
    B -
    C -

        * Before Every Branch {
            D
        }

G -
    `);

            var branches = tree.branchify(tree.root);

            expect(branches).to.have.lengthOf(3);

            expect(branches[0].steps).to.have.lengthOf(2);
            expect(branches[1].steps).to.have.lengthOf(2);
            expect(branches[2].steps).to.have.lengthOf(1);

            expect(branches[0].beforeEveryBranch).to.have.lengthOf(1);
            expect(branches[1].beforeEveryBranch).to.have.lengthOf(1);
            expect(branches[2].beforeEveryBranch).to.equal(undefined);

            expect(branches).to.containSubsetInOrder([
                {
                    steps: [ { text: "A" }, { text: "B" } ],
                    beforeEveryBranch: [
                        { text: "Before Every Branch", codeBlock: "\n            D\n"}
                    ]
                },
                {
                    steps: [ { text: "A" }, { text: "C" } ],
                    beforeEveryBranch: [
                        { text: "Before Every Branch", codeBlock: "\n            D\n"}
                    ]
                },
                {
                    steps: [ { text: "G" } ],
                    beforeEveryBranch: undefined
                }
            ]);
        });

        it("branchifies the * After Every Branch hook under a step block", function() {
            var tree = new Tree();
            tree.parseIn(`
A -
    B -
    C -

        * After Every Branch {
            D
        }

G -
    `);

            var branches = tree.branchify(tree.root);

            expect(branches).to.have.lengthOf(3);

            expect(branches[0].steps).to.have.lengthOf(2);
            expect(branches[1].steps).to.have.lengthOf(2);
            expect(branches[2].steps).to.have.lengthOf(1);

            expect(branches[0].afterEveryBranch).to.have.lengthOf(1);
            expect(branches[1].afterEveryBranch).to.have.lengthOf(1);
            expect(branches[2].afterEveryBranch).to.equal(undefined);

            expect(branches).to.containSubsetInOrder([
                {
                    steps: [ { text: "A" }, { text: "B" } ],
                    afterEveryBranch: [
                        { text: "After Every Branch", codeBlock: "\n            D\n"}
                    ]
                },
                {
                    steps: [ { text: "A" }, { text: "C" } ],
                    afterEveryBranch: [
                        { text: "After Every Branch", codeBlock: "\n            D\n"}
                    ]
                },
                {
                    steps: [ { text: "G" } ],
                    afterEveryBranch: undefined
                }
            ]);
        });

        it("branchifies the * Before Every Branch hook under a .. step", function() {
            var tree = new Tree();
            tree.parseIn(`
A - ..

    B -

    C -
        * Before Every Branch {
            D
        }

G -
    `);

            var branches = tree.branchify(tree.root);

            expect(branches).to.have.lengthOf(2);

            expect(branches[0].steps).to.have.lengthOf(3);
            expect(branches[1].steps).to.have.lengthOf(1);

            expect(branches[0].beforeEveryBranch).to.have.lengthOf(1);
            expect(branches[1].beforeEveryBranch).to.equal(undefined);

            expect(branches).to.containSubsetInOrder([
                {
                    steps: [ { text: "A" }, { text: "B" }, { text: "C" } ],
                    beforeEveryBranch: [
                        { text: "Before Every Branch", codeBlock: "\n            D\n" }
                    ]
                },
                {
                    steps: [ { text: "G" } ],
                    beforeEveryBranch: undefined
                }
            ]);
        });

        it("branchifies the * After Every Branch hook under a .. step", function() {
            var tree = new Tree();
            tree.parseIn(`
A - ..

    B -

    C -
        * After Every Branch {
            D
        }

G -
    `);

            var branches = tree.branchify(tree.root);

            expect(branches).to.have.lengthOf(2);

            expect(branches[0].steps).to.have.lengthOf(3);
            expect(branches[1].steps).to.have.lengthOf(1);

            expect(branches[0].afterEveryBranch).to.have.lengthOf(1);
            expect(branches[1].afterEveryBranch).to.equal(undefined);

            expect(branches).to.containSubsetInOrder([
                {
                    steps: [ { text: "A" }, { text: "B" }, { text: "C" } ],
                    afterEveryBranch: [
                        { text: "After Every Branch", codeBlock: "\n            D\n" }
                    ]
                },
                {
                    steps: [ { text: "G" } ],
                    afterEveryBranch: undefined
                }
            ]);
        });

        it("branchifies the * Before Every Branch hook under a .. step block", function() {
            var tree = new Tree();
            tree.parseIn(`
A -
    ..
    B -
    C -

        * Before Every Branch {
            D
        }

G -
    `);

            var branches = tree.branchify(tree.root);

            expect(branches).to.have.lengthOf(2);

            expect(branches[0].steps).to.have.lengthOf(3);
            expect(branches[1].steps).to.have.lengthOf(1);

            expect(branches[0].beforeEveryBranch).to.have.lengthOf(1);
            expect(branches[1].beforeEveryBranch).to.equal(undefined);

            expect(branches).to.containSubsetInOrder([
                {
                    steps: [ { text: "A" }, { text: "B" }, { text: "C" } ],
                    beforeEveryBranch: [
                        { text: "Before Every Branch", codeBlock:"\n            D\n" }
                    ]
                },
                {
                    steps: [ { text: "G" } ],
                    beforeEveryBranch: undefined
                }
            ]);
        });

        it("branchifies the * After Every Branch hook under a .. step block", function() {
            var tree = new Tree();
            tree.parseIn(`
A -
    ..
    B -
    C -

        * After Every Branch {
            D
        }

G -
    `);

            var branches = tree.branchify(tree.root);

            expect(branches).to.have.lengthOf(2);

            expect(branches[0].steps).to.have.lengthOf(3);
            expect(branches[1].steps).to.have.lengthOf(1);

            expect(branches[0].afterEveryBranch).to.have.lengthOf(1);
            expect(branches[1].afterEveryBranch).to.equal(undefined);

            expect(branches).to.containSubsetInOrder([
                {
                    steps: [ { text: "A" }, { text: "B" }, { text: "C" } ],
                    afterEveryBranch: [
                        { text: "After Every Branch", codeBlock:"\n            D\n" }
                    ]
                },
                {
                    steps: [ { text: "G" } ],
                    afterEveryBranch: undefined
                }
            ]);
        });

        it("rejects a * Before Every Branch hook that has children", function() {
            var tree = new Tree();
            tree.parseIn(`
A -
    * Before Every Branch {
        B
    }

        C -

G -
    `, "file.txt");

            assert.throws(() => {
                tree.branchify(tree.root);
            }, "A hook declaration cannot have children [file.txt:3]");
        });

        it("rejects a * After Every Branch hook that has children", function() {
            var tree = new Tree();
            tree.parseIn(`
A -
    * After Every Branch {
        B
    }

        C -

G -
    `, "file.txt");

            assert.throws(() => {
                tree.branchify(tree.root);
            }, "A hook declaration cannot have children [file.txt:3]");
        });

        it("handles multiple * Before Every Branch and * After Every Branch hooks that are siblings", function() {
            var tree = new Tree();
            tree.parseIn(`
A -
    B -

    C -
        * Before Every Branch {
            D1
        }

        * After Every Branch {
            G1
        }

        * Before Every Branch {
            D2
        }

        * Before Every Branch {
            D3
        }

        * After Every Branch {
            G2
        }

        * After Every Branch {
            G3
        }

E -
    `);

            var branches = tree.branchify(tree.root);

            expect(branches).to.have.lengthOf(3);

            expect(branches[0].steps).to.have.lengthOf(2);
            expect(branches[1].steps).to.have.lengthOf(2);
            expect(branches[2].steps).to.have.lengthOf(1);

            expect(branches[0].afterEveryBranch).to.equal(undefined);
            expect(branches[1].afterEveryBranch).to.have.lengthOf(3);
            expect(branches[2].afterEveryBranch).to.equal(undefined);

            expect(branches[0].beforeEveryBranch).to.equal(undefined);
            expect(branches[1].beforeEveryBranch).to.have.lengthOf(3);
            expect(branches[2].beforeEveryBranch).to.equal(undefined);

            expect(branches).to.containSubsetInOrder([
                {
                    steps: [ { text: "A" }, { text: "B" } ],
                    afterEveryBranch: undefined,
                    beforeEveryBranch: undefined
                },
                {
                    steps: [ { text: "A" }, { text: "C" } ],
                    afterEveryBranch: [
                        { text: "After Every Branch", codeBlock: "\n            G1\n" },
                        { text: "After Every Branch", codeBlock: "\n            G2\n" },
                        { text: "After Every Branch", codeBlock: "\n            G3\n" }
                    ],
                    beforeEveryBranch: [
                        { text: "Before Every Branch", codeBlock: "\n            D3\n" },
                        { text: "Before Every Branch", codeBlock: "\n            D2\n" },
                        { text: "Before Every Branch", codeBlock: "\n            D1\n" }
                    ]
                },
                {
                    steps: [ { text: "E" } ],
                    afterEveryBranch: undefined,
                    beforeEveryBranch: undefined
                }
            ]);
        });

        it("branchifies many * Before Every Branch and * After Every Branch hooks in the tree", function() {
            var tree = new Tree();
            tree.parseIn(`
A -
    B -
        C -
        D -

            E -

                * After Every Branch {
                    U
                }

            * After Every Branch {
                T
            }

        F -

    H -
    I -

        * After Every Branch {
            S
        }

    ..
    J -
    K -

        * After Every Branch {
            R
        }

        * Before Every Branch {
            X
        }

    L - ..
        M -
            N -

        * After Every Branch {
            Q
        }

        * Before Every Branch {
            Y
        }

        O -

    * After Every Branch {
        W
    }
G -
    P -
    `);
            var branches = tree.branchify(tree.root);

            expect(branches).to.have.lengthOf(8);

            expect(branches[0].steps).to.have.lengthOf(4);
            expect(branches[0].afterEveryBranch).to.have.lengthOf(3);

            expect(branches[1].steps).to.have.lengthOf(4);
            expect(branches[1].afterEveryBranch).to.have.lengthOf(3);

            expect(branches[2].steps).to.have.lengthOf(3);
            expect(branches[2].afterEveryBranch).to.have.lengthOf(1);

            expect(branches[3].steps).to.have.lengthOf(2);
            expect(branches[3].afterEveryBranch).to.have.lengthOf(2);

            expect(branches[4].steps).to.have.lengthOf(2);
            expect(branches[4].afterEveryBranch).to.have.lengthOf(2);

            expect(branches[5].steps).to.have.lengthOf(3);
            expect(branches[5].beforeEveryBranch).to.have.lengthOf(1);
            expect(branches[5].afterEveryBranch).to.have.lengthOf(2);

            expect(branches[6].steps).to.have.lengthOf(5);
            expect(branches[6].beforeEveryBranch).to.have.lengthOf(1);
            expect(branches[6].afterEveryBranch).to.have.lengthOf(2);

            expect(branches[7].steps).to.have.lengthOf(2);
            expect(branches[7].afterEveryBranch).to.equal(undefined);

            expect(branches).to.containSubsetInOrder([
                {
                    steps: [ { text: "A" }, { text: "B" }, { text: "C" }, { text: "E" } ],
                    afterEveryBranch: [
                        { text: "After Every Branch", codeBlock: "\n                    U\n" },
                        { text: "After Every Branch", codeBlock: "\n                T\n" },
                        { text: "After Every Branch", codeBlock: "\n        W\n" }
                    ]
                },
                {
                    steps: [ { text: "A" }, { text: "B" }, { text: "D" }, { text: "E" } ],
                    afterEveryBranch: [
                        { text: "After Every Branch", codeBlock: "\n                    U\n" },
                        { text: "After Every Branch", codeBlock: "\n                T\n" },
                        { text: "After Every Branch", codeBlock: "\n        W\n" }
                    ]
                },
                {
                    steps: [ { text: "A" }, { text: "B" }, { text: "F" } ],
                    afterEveryBranch: [
                        { text: "After Every Branch", codeBlock: "\n        W\n" }
                    ]
                },
                {
                    steps: [ { text: "A" }, { text: "H" } ],
                    afterEveryBranch: [
                        { text: "After Every Branch", codeBlock: "\n            S\n" },
                        { text: "After Every Branch", codeBlock: "\n        W\n" }
                    ]
                },
                {
                    steps: [ { text: "A" }, { text: "I" } ],
                    afterEveryBranch: [
                        { text: "After Every Branch", codeBlock: "\n            S\n" },
                        { text: "After Every Branch", codeBlock: "\n        W\n" }
                    ]
                },
                {
                    steps: [ { text: "A" }, { text: "J" }, { text: "K" } ],
                    beforeEveryBranch: [
                        { text: "Before Every Branch", codeBlock: "\n            X\n" }
                    ],
                    afterEveryBranch: [
                        { text: "After Every Branch", codeBlock: "\n            R\n" },
                        { text: "After Every Branch", codeBlock: "\n        W\n" }
                    ]
                },
                {
                    steps: [ { text: "A" }, { text: "L" }, { text: "M" }, { text: "N" }, { text: "O" } ],
                    beforeEveryBranch: [
                        { text: "Before Every Branch", codeBlock: "\n            Y\n" }
                    ],
                    afterEveryBranch: [
                        { text: "After Every Branch", codeBlock: "\n            Q\n" },
                        { text: "After Every Branch", codeBlock: "\n        W\n" }
                    ]
                },
                {
                    steps: [ { text: "G" }, { text: "P" } ],
                    afterEveryBranch: undefined
                }
            ]);
        });

        it("branchifies the * Before Every Step hook", function() {
            var tree = new Tree();
            tree.parseIn(`
A -
    B -

    C -
        * Before Every Step {
            D
        }

E -
    `);

            var branches = tree.branchify(tree.root);

            expect(branches).to.have.lengthOf(3);

            expect(branches[0].steps).to.have.lengthOf(2);
            expect(branches[1].steps).to.have.lengthOf(2);
            expect(branches[2].steps).to.have.lengthOf(1);

            expect(branches[0].beforeEveryStep).to.equal(undefined);
            expect(branches[1].beforeEveryStep).to.have.lengthOf(1);
            expect(branches[2].beforeEveryStep).to.equal(undefined);

            expect(branches).to.containSubsetInOrder([
                {
                    steps: [ { text: "A" }, { text: "B" } ],
                    beforeEveryBranch: undefined,
                    afterEveryBranch: undefined,
                    beforeEveryStep: undefined,
                    afterEveryStep: undefined
                },
                {
                    steps: [ { text: "A" }, { text: "C" } ],
                    beforeEveryBranch: undefined,
                    afterEveryBranch: undefined,
                    beforeEveryStep: [
                        { text: "Before Every Step", branchIndents: 0, codeBlock: "\n            D\n" }
                    ],
                    afterEveryStep: undefined
                },
                {
                    steps: [ { text: "E" } ],
                    beforeEveryBranch: undefined,
                    afterEveryBranch: undefined,
                    beforeEveryStep: undefined,
                    afterEveryStep: undefined
                }
            ]);
        });

        it("branchifies the * After Every Step hook", function() {
            var tree = new Tree();
            tree.parseIn(`
A -
    B -

    C -
        * After Every Step {
            D
        }

E -
    `);

            var branches = tree.branchify(tree.root);

            expect(branches).to.have.lengthOf(3);

            expect(branches[0].steps).to.have.lengthOf(2);
            expect(branches[1].steps).to.have.lengthOf(2);
            expect(branches[2].steps).to.have.lengthOf(1);

            expect(branches[0].afterEveryStep).to.equal(undefined);
            expect(branches[1].afterEveryStep).to.have.lengthOf(1);
            expect(branches[2].afterEveryStep).to.equal(undefined);

            expect(branches).to.containSubsetInOrder([
                {
                    steps: [ { text: "A" }, { text: "B" } ],
                    beforeEveryBranch: undefined,
                    afterEveryBranch: undefined,
                    beforeEveryStep: undefined,
                    afterEveryStep: undefined
                },
                {
                    steps: [ { text: "A" }, { text: "C" } ],
                    beforeEveryBranch: undefined,
                    afterEveryBranch: undefined,
                    beforeEveryStep: undefined,
                    afterEveryStep: [
                        { text: "After Every Step", branchIndents: 0, codeBlock: "\n            D\n" }
                    ]
                },
                {
                    steps: [ { text: "E" } ],
                    beforeEveryBranch: undefined,
                    afterEveryBranch: undefined,
                    beforeEveryStep: undefined,
                    afterEveryStep: undefined
                }
            ]);
        });

        it("branchifies an empty * Before Every Step hook", function() {
            var tree = new Tree();
            tree.parseIn(`
A -
    * Before Every Step {
    }
`);

            var branches = tree.branchify(tree.root);

            expect(branches).to.have.lengthOf(1);
            expect(branches[0].steps).to.have.lengthOf(1);
            expect(branches[0].beforeEveryStep).to.have.lengthOf(1);

            expect(branches).to.containSubsetInOrder([
                {
                    steps: [ { text: "A" } ],
                    beforeEveryStep: [
                        { text: "Before Every Step", branchIndents: 0, codeBlock: "\n" }
                    ],
                }
            ]);
        });

        it("branchifies an empty * After Every Step hook", function() {
            var tree = new Tree();
            tree.parseIn(`
A -
    * After Every Step {
    }
`);

            var branches = tree.branchify(tree.root);

            expect(branches).to.have.lengthOf(1);
            expect(branches[0].steps).to.have.lengthOf(1);
            expect(branches[0].afterEveryStep).to.have.lengthOf(1);

            expect(branches).to.containSubsetInOrder([
                {
                    steps: [ { text: "A" } ],
                    afterEveryStep: [
                        { text: "After Every Step", branchIndents: 0, codeBlock: "\n" }
                    ],
                }
            ]);
        });

        it("branchifies the * Before Every Step hook under the root", function() {
            var tree = new Tree();
            tree.parseIn(`
A -

* Before Every Step {
    B
}

C -
    `);

            var branches = tree.branchify(tree.root);

            expect(branches).to.have.lengthOf(2);

            expect(branches[0].steps).to.have.lengthOf(1);
            expect(branches[1].steps).to.have.lengthOf(1);

            expect(branches[0].beforeEveryStep).to.have.lengthOf(1);
            expect(branches[1].beforeEveryStep).to.have.lengthOf(1);

            expect(branches).to.containSubsetInOrder([
                {
                    steps: [ { text: "A" } ],
                    beforeEveryStep: [
                        { text: "Before Every Step", branchIndents: 0, codeBlock: "\n    B\n" }
                    ]
                },
                {
                    steps: [ { text: "C" } ],
                    beforeEveryStep: [
                        { text: "Before Every Step", branchIndents: 0, codeBlock: "\n    B\n" }
                    ]
                }
            ]);
        });

        it("branchifies the * After Every Step hook under the root", function() {
            var tree = new Tree();
            tree.parseIn(`
A -

* After Every Step {
    B
}

C -
    `);

            var branches = tree.branchify(tree.root);

            expect(branches).to.have.lengthOf(2);

            expect(branches[0].steps).to.have.lengthOf(1);
            expect(branches[1].steps).to.have.lengthOf(1);

            expect(branches[0].afterEveryStep).to.have.lengthOf(1);
            expect(branches[1].afterEveryStep).to.have.lengthOf(1);

            expect(branches).to.containSubsetInOrder([
                {
                    steps: [ { text: "A" } ],
                    afterEveryStep: [
                        { text: "After Every Step", branchIndents: 0, codeBlock: "\n    B\n" }
                    ]
                },
                {
                    steps: [ { text: "C" } ],
                    afterEveryStep: [
                        { text: "After Every Step", branchIndents: 0, codeBlock: "\n    B\n" }
                    ]
                }
            ]);
        });

        it("branchifies the * Before Every Step hook when it's inside a function declaration", function() {
            var tree = new Tree();
            tree.parseIn(`
F

* F
    A -
    B -

    * Before Every Step {
        C
    }
    `);

            var branches = tree.branchify(tree.root);

            expect(branches).to.have.lengthOf(2);

            expect(branches[0].steps).to.have.lengthOf(2);
            expect(branches[1].steps).to.have.lengthOf(2);

            expect(branches[0].beforeEveryStep).to.have.lengthOf(1);
            expect(branches[1].beforeEveryStep).to.have.lengthOf(1);

            expect(branches).to.containSubsetInOrder([
                {
                    steps: [ { text: "F" }, { text: "A" } ],
                    beforeEveryStep: [
                        { text: "Before Every Step", branchIndents: 0, codeBlock: "\n        C\n" }
                    ]
                },
                {
                    steps: [ { text: "F" }, { text: "B" } ],
                    beforeEveryStep: [
                        { text: "Before Every Step", branchIndents: 0, codeBlock: "\n        C\n" }
                    ]
                }
            ]);
        });

        it("branchifies the * After Every Step hook when it's inside a function declaration", function() {
            var tree = new Tree();
            tree.parseIn(`
F

* F
    A -
    B -

    * After Every Step {
        C
    }
    `);

            var branches = tree.branchify(tree.root);

            expect(branches).to.have.lengthOf(2);

            expect(branches[0].steps).to.have.lengthOf(2);
            expect(branches[1].steps).to.have.lengthOf(2);

            expect(branches[0].afterEveryStep).to.have.lengthOf(1);
            expect(branches[1].afterEveryStep).to.have.lengthOf(1);

            expect(branches).to.containSubsetInOrder([
                {
                    steps: [ { text: "F" }, { text: "A" } ],
                    afterEveryStep: [
                        { text: "After Every Step", branchIndents: 0, codeBlock: "\n        C\n" }
                    ]
                },
                {
                    steps: [ { text: "F" }, { text: "B" } ],
                    afterEveryStep: [
                        { text: "After Every Step", branchIndents: 0, codeBlock: "\n        C\n" }
                    ]
                }
            ]);
        });

        it("branchifies the * Before Every Step hook under a step block", function() {
            var tree = new Tree();
            tree.parseIn(`
A -
    B -
    C -

        * Before Every Step {
            D
        }

G -
    `);

            var branches = tree.branchify(tree.root);

            expect(branches).to.have.lengthOf(3);

            expect(branches[0].steps).to.have.lengthOf(2);
            expect(branches[1].steps).to.have.lengthOf(2);
            expect(branches[2].steps).to.have.lengthOf(1);

            expect(branches[0].beforeEveryStep).to.have.lengthOf(1);
            expect(branches[1].beforeEveryStep).to.have.lengthOf(1);
            expect(branches[2].beforeEveryStep).to.equal(undefined);

            expect(branches).to.containSubsetInOrder([
                {
                    steps: [ { text: "A" }, { text: "B" } ],
                    beforeEveryStep: [
                        { text: "Before Every Step", codeBlock: "\n            D\n"}
                    ]
                },
                {
                    steps: [ { text: "A" }, { text: "C" } ],
                    beforeEveryStep: [
                        { text: "Before Every Step", codeBlock: "\n            D\n"}
                    ]
                },
                {
                    steps: [ { text: "G" } ],
                    beforeEveryStep: undefined
                }
            ]);
        });

        it("branchifies the * After Every Step hook under a step block", function() {
            var tree = new Tree();
            tree.parseIn(`
A -
    B -
    C -

        * After Every Step {
            D
        }

G -
    `);

            var branches = tree.branchify(tree.root);

            expect(branches).to.have.lengthOf(3);

            expect(branches[0].steps).to.have.lengthOf(2);
            expect(branches[1].steps).to.have.lengthOf(2);
            expect(branches[2].steps).to.have.lengthOf(1);

            expect(branches[0].afterEveryStep).to.have.lengthOf(1);
            expect(branches[1].afterEveryStep).to.have.lengthOf(1);
            expect(branches[2].afterEveryStep).to.equal(undefined);

            expect(branches).to.containSubsetInOrder([
                {
                    steps: [ { text: "A" }, { text: "B" } ],
                    afterEveryStep: [
                        { text: "After Every Step", codeBlock: "\n            D\n"}
                    ]
                },
                {
                    steps: [ { text: "A" }, { text: "C" } ],
                    afterEveryStep: [
                        { text: "After Every Step", codeBlock: "\n            D\n"}
                    ]
                },
                {
                    steps: [ { text: "G" } ],
                    afterEveryStep: undefined
                }
            ]);
        });

        it("branchifies the * Before Every Step hook under a .. step", function() {
            var tree = new Tree();
            tree.parseIn(`
A - ..

    B -

    C -
        * Before Every Step {
            D
        }

G -
    `);

            var branches = tree.branchify(tree.root);

            expect(branches).to.have.lengthOf(2);

            expect(branches[0].steps).to.have.lengthOf(3);
            expect(branches[1].steps).to.have.lengthOf(1);

            expect(branches[0].beforeEveryStep).to.have.lengthOf(1);
            expect(branches[1].beforeEveryStep).to.equal(undefined);

            expect(branches).to.containSubsetInOrder([
                {
                    steps: [ { text: "A" }, { text: "B" }, { text: "C" } ],
                    beforeEveryStep: [
                        { text: "Before Every Step", codeBlock: "\n            D\n" }
                    ]
                },
                {
                    steps: [ { text: "G" } ],
                    beforeEveryStep: undefined
                }
            ]);
        });

        it("branchifies the * After Every Step hook under a .. step", function() {
            var tree = new Tree();
            tree.parseIn(`
A - ..

    B -

    C -
        * After Every Step {
            D
        }

G -
    `);

            var branches = tree.branchify(tree.root);

            expect(branches).to.have.lengthOf(2);

            expect(branches[0].steps).to.have.lengthOf(3);
            expect(branches[1].steps).to.have.lengthOf(1);

            expect(branches[0].afterEveryStep).to.have.lengthOf(1);
            expect(branches[1].afterEveryStep).to.equal(undefined);

            expect(branches).to.containSubsetInOrder([
                {
                    steps: [ { text: "A" }, { text: "B" }, { text: "C" } ],
                    afterEveryStep: [
                        { text: "After Every Step", codeBlock: "\n            D\n" }
                    ]
                },
                {
                    steps: [ { text: "G" } ],
                    afterEveryStep: undefined
                }
            ]);
        });

        it("branchifies the * Before Every Step hook under a .. step block", function() {
            var tree = new Tree();
            tree.parseIn(`
A -
    ..
    B -
    C -

        * Before Every Step {
            D
        }

G -
    `);

            var branches = tree.branchify(tree.root);

            expect(branches).to.have.lengthOf(2);

            expect(branches[0].steps).to.have.lengthOf(3);
            expect(branches[1].steps).to.have.lengthOf(1);

            expect(branches[0].beforeEveryStep).to.have.lengthOf(1);
            expect(branches[1].beforeEveryStep).to.equal(undefined);

            expect(branches).to.containSubsetInOrder([
                {
                    steps: [ { text: "A" }, { text: "B" }, { text: "C" } ],
                    beforeEveryStep: [
                        { text: "Before Every Step", codeBlock:"\n            D\n" }
                    ]
                },
                {
                    steps: [ { text: "G" } ],
                    beforeEveryStep: undefined
                }
            ]);
        });

        it("branchifies the * After Every Step hook under a .. step block", function() {
            var tree = new Tree();
            tree.parseIn(`
A -
    ..
    B -
    C -

        * After Every Step {
            D
        }

G -
    `);

            var branches = tree.branchify(tree.root);

            expect(branches).to.have.lengthOf(2);

            expect(branches[0].steps).to.have.lengthOf(3);
            expect(branches[1].steps).to.have.lengthOf(1);

            expect(branches[0].afterEveryStep).to.have.lengthOf(1);
            expect(branches[1].afterEveryStep).to.equal(undefined);

            expect(branches).to.containSubsetInOrder([
                {
                    steps: [ { text: "A" }, { text: "B" }, { text: "C" } ],
                    afterEveryStep: [
                        { text: "After Every Step", codeBlock:"\n            D\n" }
                    ]
                },
                {
                    steps: [ { text: "G" } ],
                    afterEveryStep: undefined
                }
            ]);
        });

        it("rejects a * Before Every Step hook that has children", function() {
            var tree = new Tree();
            tree.parseIn(`
A -
    * Before Every Step {
        B
    }

        C -

G -
    `, "file.txt");

            assert.throws(() => {
                tree.branchify(tree.root);
            }, "A hook declaration cannot have children [file.txt:3]");
        });

        it("rejects a * After Every Step hook that has children", function() {
            var tree = new Tree();
            tree.parseIn(`
A -
    * After Every Step {
        B
    }

        C -

G -
    `, "file.txt");

            assert.throws(() => {
                tree.branchify(tree.root);
            }, "A hook declaration cannot have children [file.txt:3]");
        });

        it("handles multiple * Before Every Step and * After Every Step hooks that are siblings", function() {
            var tree = new Tree();
            tree.parseIn(`
A -
    B -

    C -
        * Before Every Step {
            D1
        }

        * After Every Step {
            G1
        }

        * Before Every Step {
            D2
        }

        * Before Every Step {
            D3
        }

        * After Every Step {
            G2
        }

        * After Every Step {
            G3
        }

E -
    `);

            var branches = tree.branchify(tree.root);

            expect(branches).to.have.lengthOf(3);

            expect(branches[0].steps).to.have.lengthOf(2);
            expect(branches[1].steps).to.have.lengthOf(2);
            expect(branches[2].steps).to.have.lengthOf(1);

            expect(branches[0].afterEveryStep).to.equal(undefined);
            expect(branches[1].afterEveryStep).to.have.lengthOf(3);
            expect(branches[2].afterEveryStep).to.equal(undefined);

            expect(branches[0].beforeEveryStep).to.equal(undefined);
            expect(branches[1].beforeEveryStep).to.have.lengthOf(3);
            expect(branches[2].beforeEveryStep).to.equal(undefined);

            expect(branches).to.containSubsetInOrder([
                {
                    steps: [ { text: "A" }, { text: "B" } ],
                    afterEveryStep: undefined,
                    beforeEveryStep: undefined
                },
                {
                    steps: [ { text: "A" }, { text: "C" } ],
                    afterEveryStep: [
                        { text: "After Every Step", codeBlock: "\n            G1\n" },
                        { text: "After Every Step", codeBlock: "\n            G2\n" },
                        { text: "After Every Step", codeBlock: "\n            G3\n" }
                    ],
                    beforeEveryStep: [
                        { text: "Before Every Step", codeBlock: "\n            D3\n" },
                        { text: "Before Every Step", codeBlock: "\n            D2\n" },
                        { text: "Before Every Step", codeBlock: "\n            D1\n" }
                    ]
                },
                {
                    steps: [ { text: "E" } ],
                    afterEveryStep: undefined,
                    beforeEveryStep: undefined
                }
            ]);
        });

        it("branchifies many * Before Every Step and * After Every Step hooks in the tree", function() {
            var tree = new Tree();
            tree.parseIn(`
A -
    B -
        C -
        D -

            E -

                * After Every Step {
                    U
                }

            * After Every Step {
                T
            }

        F -

    H -
    I -

        * After Every Step {
            S
        }

    ..
    J -
    K -

        * After Every Step {
            R
        }

        * Before Every Step {
            X
        }

    L - ..
        M -
            N -

        * After Every Step {
            Q
        }

        * Before Every Step {
            Y
        }

        O -

    * After Every Step {
        W
    }
G -
    P -
    `);
            var branches = tree.branchify(tree.root);

            expect(branches).to.have.lengthOf(8);

            expect(branches[0].steps).to.have.lengthOf(4);
            expect(branches[0].afterEveryStep).to.have.lengthOf(3);

            expect(branches[1].steps).to.have.lengthOf(4);
            expect(branches[1].afterEveryStep).to.have.lengthOf(3);

            expect(branches[2].steps).to.have.lengthOf(3);
            expect(branches[2].afterEveryStep).to.have.lengthOf(1);

            expect(branches[3].steps).to.have.lengthOf(2);
            expect(branches[3].afterEveryStep).to.have.lengthOf(2);

            expect(branches[4].steps).to.have.lengthOf(2);
            expect(branches[4].afterEveryStep).to.have.lengthOf(2);

            expect(branches[5].steps).to.have.lengthOf(3);
            expect(branches[5].beforeEveryStep).to.have.lengthOf(1);
            expect(branches[5].afterEveryStep).to.have.lengthOf(2);

            expect(branches[6].steps).to.have.lengthOf(5);
            expect(branches[6].beforeEveryStep).to.have.lengthOf(1);
            expect(branches[6].afterEveryStep).to.have.lengthOf(2);

            expect(branches[7].steps).to.have.lengthOf(2);
            expect(branches[7].afterEveryStep).to.equal(undefined);

            expect(branches).to.containSubsetInOrder([
                {
                    steps: [ { text: "A" }, { text: "B" }, { text: "C" }, { text: "E" } ],
                    afterEveryStep: [
                        { text: "After Every Step", codeBlock: "\n                    U\n" },
                        { text: "After Every Step", codeBlock: "\n                T\n" },
                        { text: "After Every Step", codeBlock: "\n        W\n" }
                    ]
                },
                {
                    steps: [ { text: "A" }, { text: "B" }, { text: "D" }, { text: "E" } ],
                    afterEveryStep: [
                        { text: "After Every Step", codeBlock: "\n                    U\n" },
                        { text: "After Every Step", codeBlock: "\n                T\n" },
                        { text: "After Every Step", codeBlock: "\n        W\n" }
                    ]
                },
                {
                    steps: [ { text: "A" }, { text: "B" }, { text: "F" } ],
                    afterEveryStep: [
                        { text: "After Every Step", codeBlock: "\n        W\n" }
                    ]
                },
                {
                    steps: [ { text: "A" }, { text: "H" } ],
                    afterEveryStep: [
                        { text: "After Every Step", codeBlock: "\n            S\n" },
                        { text: "After Every Step", codeBlock: "\n        W\n" }
                    ]
                },
                {
                    steps: [ { text: "A" }, { text: "I" } ],
                    afterEveryStep: [
                        { text: "After Every Step", codeBlock: "\n            S\n" },
                        { text: "After Every Step", codeBlock: "\n        W\n" }
                    ]
                },
                {
                    steps: [ { text: "A" }, { text: "J" }, { text: "K" } ],
                    beforeEveryStep: [
                        { text: "Before Every Step", codeBlock: "\n            X\n" }
                    ],
                    afterEveryStep: [
                        { text: "After Every Step", codeBlock: "\n            R\n" },
                        { text: "After Every Step", codeBlock: "\n        W\n" }
                    ]
                },
                {
                    steps: [ { text: "A" }, { text: "L" }, { text: "M" }, { text: "N" }, { text: "O" } ],
                    beforeEveryStep: [
                        { text: "Before Every Step", codeBlock: "\n            Y\n" }
                    ],
                    afterEveryStep: [
                        { text: "After Every Step", codeBlock: "\n            Q\n" },
                        { text: "After Every Step", codeBlock: "\n        W\n" }
                    ]
                },
                {
                    steps: [ { text: "G" }, { text: "P" } ],
                    afterEveryStep: undefined
                }
            ]);
        });

        it("branchifies the * Before Everything hook", function() {
            var tree = new Tree();
            tree.parseIn(`
A -

* Before Everything {
    B
}
    `);

            var branches = tree.branchify(tree.root);

            expect(branches).to.have.lengthOf(1);
            expect(branches[0].steps).to.have.lengthOf(1);
            expect(tree.beforeEverything).to.have.lengthOf(1);

            expect(branches).to.containSubsetInOrder([
                {
                    steps: [ { text: "A" } ]
                }
            ]);

            expect(tree.beforeEverything).to.containSubsetInOrder([
                { text: "Before Everything", branchIndents: 0, codeBlock: "\n    B\n" }
            ]);
        });

        it("branchifies the * After Everything hook", function() {
            var tree = new Tree();
            tree.parseIn(`
A -

* After Everything {
    B
}
    `);

            var branches = tree.branchify(tree.root);

            expect(branches).to.have.lengthOf(1);
            expect(branches[0].steps).to.have.lengthOf(1);
            expect(tree.afterEverything).to.have.lengthOf(1);

            expect(branches).to.containSubsetInOrder([
                {
                    steps: [ { text: "A" } ]
                }
            ]);

            expect(tree.afterEverything).to.containSubsetInOrder([
                { text: "After Everything", branchIndents: 0, codeBlock: "\n    B\n" }
            ]);
        });

        it("branchifies an empty * Before Everything hook", function() {
            var tree = new Tree();
            tree.parseIn(`
* Before Everything {
}
`);

            var branches = tree.branchify(tree.root);

            expect(branches).to.have.lengthOf(0);

            expect(tree.beforeEverything).to.containSubsetInOrder([
                { text: "Before Everything", branchIndents: 0, codeBlock: "\n" }
            ]);
        });

        it("branchifies an empty * After Everything hook", function() {
            var tree = new Tree();
            tree.parseIn(`
* After Everything {
}
`);

            var branches = tree.branchify(tree.root);

            expect(branches).to.have.lengthOf(0);

            expect(tree.afterEverything).to.containSubsetInOrder([
                { text: "After Everything", branchIndents: 0, codeBlock: "\n" }
            ]);
        });

        it("handles multiple * Before Everything hooks that are siblings, and orders the last in tree to be first in tree.beforeEverything", function() {
            var tree = new Tree();
            tree.parseIn(`
* Before Everything {
    B
}
* Before Everything {
    C
}

A -
    `);

            var branches = tree.branchify(tree.root);

            expect(branches).to.have.lengthOf(1);

            expect(branches[0].steps).to.have.lengthOf(1);

            expect(tree.beforeEverything).to.have.lengthOf(2);

            expect(branches).to.containSubsetInOrder([
                {
                    steps: [ { text: "A" } ]
                }
            ]);

            expect(tree.beforeEverything).to.containSubsetInOrder([
                { text: "Before Everything", branchIndents: 0, codeBlock: "\n    C\n" },
                { text: "Before Everything", branchIndents: 0, codeBlock: "\n    B\n" }
            ]);
        });

        it("handles multiple * After Everything hooks that are siblings, and orders the last in tree to be last in tree.afterEverything", function() {
            var tree = new Tree();
            tree.parseIn(`
* After Everything {
    B
}
* After Everything {
    C
}

A -
    `);

            var branches = tree.branchify(tree.root);

            expect(branches).to.have.lengthOf(1);
            expect(branches[0].steps).to.have.lengthOf(1);
            expect(tree.afterEverything).to.have.lengthOf(2);

            expect(branches).to.containSubsetInOrder([
                {
                    steps: [ { text: "A" } ]
                }
            ]);

            expect(tree.afterEverything).to.containSubsetInOrder([
                { text: "After Everything", branchIndents: 0, codeBlock: "\n    B\n" },
                { text: "After Everything", branchIndents: 0, codeBlock: "\n    C\n" }
            ]);
        });

        it("rejects the * Before Everything hook when not at 0 indents", function() {
            var tree = new Tree();
            tree.parseIn(`
A -
    * Before Everything {
        B
    }
    `, "file.txt");

            assert.throws(() => {
                tree.branchify(tree.root);
            }, "A '* Before Everything' function must not be indented (it must be at 0 indents) [file.txt:3]");
        });

        it("rejects the * After Everything hook when not at 0 indents", function() {
            var tree = new Tree();
            tree.parseIn(`
A -
    * After Everything {
        B
    }
    `, "file.txt");

            assert.throws(() => {
                tree.branchify(tree.root);
            }, "An '* After Everything' function must not be indented (it must be at 0 indents) [file.txt:3]");
        });

        it("rejects a * Before Everything hook that has children", function() {
            var tree = new Tree();
            tree.parseIn(`
* Before Everything {
    B
}

    C -
    `, "file.txt");

            assert.throws(() => {
                tree.branchify(tree.root);
            }, "A hook declaration cannot have children [file.txt:2]");
        });

        it("rejects a * After Everything hook that has children", function() {
            var tree = new Tree();
            tree.parseIn(`
* After Everything {
    B
}

    C -
    `, "file.txt");

            assert.throws(() => {
                tree.branchify(tree.root);
            }, "A hook declaration cannot have children [file.txt:2]");
        });

        it("connects branches via nonParallelId when + is set", function() {
            var tree = new Tree();
            tree.parseIn(`
A -
    B -

    C - +

        D -
            E -

        F -

G -
    `);

            var branches = tree.branchify(tree.root);

            expect(branches).to.have.lengthOf(4);

            expect(branches[0].steps).to.have.lengthOf(2);
            expect(branches[1].steps).to.have.lengthOf(4);
            expect(branches[2].steps).to.have.lengthOf(3);
            expect(branches[3].steps).to.have.lengthOf(1);

            expect(branches[0].nonParallelId).to.equal(undefined);
            var nonParallelId = branches[1].nonParallelId;
            expect(nonParallelId).to.have.lengthOf.above(0);
            expect(branches[2].nonParallelId).to.equal(nonParallelId);
            expect(branches[3].nonParallelId).to.equal(undefined);

            expect(branches).to.containSubsetInOrder([
                {
                    steps: [ { text: "A" }, { text: "B" } ],
                    nonParallelId: undefined
                },
                {
                    steps: [ { text: "A" }, { text: "C" }, { text: "D" }, { text: "E" } ]
                },
                {
                    steps: [ { text: "A" }, { text: "C" }, { text: "F" } ]
                },
                {
                    steps: [ { text: "G" } ],
                    nonParallelId: undefined
                }
            ]);
        });

        it("handles two steps with +, one a descendant of the other", function() {
            var tree = new Tree();
            tree.parseIn(`
A -
    B -

    C - +

        D + -
            E -

        F -

G -
    `);

            var branches = tree.branchify(tree.root);

            expect(branches).to.have.lengthOf(4);

            expect(branches[0].steps).to.have.lengthOf(2);
            expect(branches[1].steps).to.have.lengthOf(4);
            expect(branches[2].steps).to.have.lengthOf(3);
            expect(branches[3].steps).to.have.lengthOf(1);

            expect(branches[0].nonParallelId).to.equal(undefined);
            var nonParallelId = branches[1].nonParallelId;
            expect(nonParallelId).to.have.lengthOf.above(0);
            expect(branches[2].nonParallelId).to.equal(nonParallelId);
            expect(branches[3].nonParallelId).to.equal(undefined);

            expect(branches).to.containSubsetInOrder([
                {
                    steps: [ { text: "A" }, { text: "B" } ],
                    nonParallelId: undefined
                },
                {
                    steps: [ { text: "A" }, { text: "C" }, { text: "D" }, { text: "E" } ]
                },
                {
                    steps: [ { text: "A" }, { text: "C" }, { text: "F" } ]
                },
                {
                    steps: [ { text: "G" } ],
                    nonParallelId: undefined
                }
            ]);
        });

        it("handles two sibling steps with +", function() {
            var tree = new Tree();
            tree.parseIn(`
A -
    B - +

    C - +

        D -
            E -

        F -

G -
    `);

            var branches = tree.branchify(tree.root);

            expect(branches).to.have.lengthOf(4);

            expect(branches[0].steps).to.have.lengthOf(2);
            expect(branches[1].steps).to.have.lengthOf(4);
            expect(branches[2].steps).to.have.lengthOf(3);
            expect(branches[3].steps).to.have.lengthOf(1);

            var nonParallelId0 = branches[0].nonParallelId;
            expect(nonParallelId0).to.have.lengthOf.above(0);
            var nonParallelId1 = branches[1].nonParallelId;
            expect(nonParallelId1).to.have.lengthOf.above(0);
            expect(nonParallelId0).to.not.equal(nonParallelId1);
            expect(branches[2].nonParallelId).to.equal(nonParallelId1);
            expect(branches[3].nonParallelId).to.equal(undefined);

            expect(branches).to.containSubsetInOrder([
                {
                    steps: [ { text: "A" }, { text: "B" } ]
                },
                {
                    steps: [ { text: "A" }, { text: "C" }, { text: "D" }, { text: "E" } ]
                },
                {
                    steps: [ { text: "A" }, { text: "C" }, { text: "F" } ]
                },
                {
                    steps: [ { text: "G" } ],
                    nonParallelId: undefined
                }
            ]);
        });

        it("throws an exception when there's an infinite loop among function calls", function() {
            var tree = new Tree();
            tree.parseIn(`
F

* F
    F
    `, "file.txt");

            assert.throws(() => {
                tree.branchify(tree.root);
            }, "Maximum call stack size exceeded");

            tree = new Tree();
            tree.parseIn(`
A

* A
    B

* B
    A
    `, "file.txt");

            assert.throws(() => {
                tree.branchify(tree.root);
            }, "Maximum call stack size exceeded");
        });

        it("only keeps a branches under a $", function() {
            var tree = new Tree();
            tree.parseIn(`
A -
    B -

    C - $

        D -

        E -

G -
    `);

            var branches = tree.branchify(tree.root);

            expect(branches).to.have.lengthOf(2);

            expect(branches[0].steps).to.have.lengthOf(3);
            expect(branches[1].steps).to.have.lengthOf(3);

            expect(branches).to.containSubsetInOrder([
                {
                    steps: [ { text: "A" }, { text: "C" }, { text: "D" } ],
                    isOnly: true,
                    isDebug: undefined
                },
                {
                    steps: [ { text: "A" }, { text: "C" }, { text: "E" } ],
                    isOnly: true,
                    isDebug: undefined
                }
            ]);
        });

        it("only keeps branches that intersect under multiple $'s", function() {
            var tree = new Tree();
            tree.parseIn(`
A -
    B -

    C - $

        D -

        E - $

            F - $

G -
    `);

            var branches = tree.branchify(tree.root);

            expect(branches).to.have.lengthOf(1);
            expect(branches[0].steps).to.have.lengthOf(4);

            expect(branches).to.containSubsetInOrder([
                {
                    steps: [ { text: "A" }, { text: "C" }, { text: "E" }, { text: "F" } ],
                    isOnly: true,
                    isDebug: undefined
                }
            ]);
        });

        it("keeps multiple branches that are under non-intersecting $'s", function() {
            var tree = new Tree();
            tree.parseIn(`
A -
    B -

    C - $

        D -

        E - $

            F -

    G - $

    H -
        I $ -

J -
    `);

            var branches = tree.branchify(tree.root);

            expect(branches).to.have.lengthOf(3);

            expect(branches[0].steps).to.have.lengthOf(4);
            expect(branches[1].steps).to.have.lengthOf(2);
            expect(branches[2].steps).to.have.lengthOf(3);

            expect(branches).to.containSubsetInOrder([
                {
                    steps: [ { text: "A" }, { text: "C" }, { text: "E" }, { text: "F" } ],
                    isOnly: true,
                    isDebug: undefined
                },
                {
                    steps: [ { text: "A" }, { text: "G" } ],
                    isOnly: true,
                    isDebug: undefined
                },
                {
                    steps: [ { text: "A" }, { text: "H" }, { text: "I" } ],
                    isOnly: true,
                    isDebug: undefined
                }
            ]);
        });

        it("handles $ when it's attached to a step block member", function() {
            var tree = new Tree();
            tree.parseIn(`
A -
    B -
    C - $

        D -
        E - $

            F -

    G -
    H -

        I $ -

    P -
    Q -
    J - $
    K - $
    R -

        L -

M $ -

    N -
    O -
    `);

            var branches = tree.branchify(tree.root);

            expect(branches).to.have.lengthOf(7);

            expect(branches[0].steps).to.have.lengthOf(4);
            expect(branches[1].steps).to.have.lengthOf(3);
            expect(branches[2].steps).to.have.lengthOf(3);
            expect(branches[3].steps).to.have.lengthOf(3);
            expect(branches[4].steps).to.have.lengthOf(3);
            expect(branches[5].steps).to.have.lengthOf(2);
            expect(branches[6].steps).to.have.lengthOf(2);

            expect(branches).to.containSubsetInOrder([
                {
                    steps: [ { text: "A" }, { text: "C" }, { text: "E" }, { text: "F" } ],
                    isOnly: true,
                    isDebug: undefined
                },
                {
                    steps: [ { text: "A" }, { text: "G" }, { text: "I" } ],
                    isOnly: true,
                    isDebug: undefined
                },
                {
                    steps: [ { text: "A" }, { text: "H" }, { text: "I" } ],
                    isOnly: true,
                    isDebug: undefined
                },
                {
                    steps: [ { text: "A" }, { text: "J" }, { text: "L" } ],
                    isOnly: true,
                    isDebug: undefined
                },
                {
                    steps: [ { text: "A" }, { text: "K" }, { text: "L" } ],
                    isOnly: true,
                    isDebug: undefined
                },
                {
                    steps: [ { text: "M" }, { text: "N" } ],
                    isOnly: true,
                    isDebug: undefined
                },
                {
                    steps: [ { text: "M" }, { text: "O" } ],
                    isOnly: true,
                    isDebug: undefined
                }
            ]);
        });

        it("handles $ when it's inside a function declaration", function() {
            var tree = new Tree();
            tree.parseIn(`
F
F

* F
    A - $
        B -

    C -
    `);

            var branches = tree.branchify(tree.root);

            expect(branches).to.have.lengthOf(2);

            expect(branches[0].steps).to.have.lengthOf(3);
            expect(branches[1].steps).to.have.lengthOf(3);

            expect(branches).to.containSubsetInOrder([
                {
                    steps: [ { text: "F" }, { text: "A" }, { text: "B" } ],
                    isOnly: true,
                    isDebug: undefined
                },
                {
                    steps: [ { text: "F" }, { text: "A" }, { text: "B" } ],
                    isOnly: true,
                    isDebug: undefined
                }
            ]);
        });

        it("handles $ when it's inside a .. step", function() {
            var tree = new Tree();
            tree.parseIn(`
A .. -
    B -
        C -
    D $ -
        E -
    F -

G .. - $
    H -
    I -
    `);

            var branches = tree.branchify(tree.root);

            expect(branches).to.have.lengthOf(2);

            expect(branches[0].steps).to.have.lengthOf(3);
            expect(branches[1].steps).to.have.lengthOf(3);

            expect(branches).to.containSubsetInOrder([
                {
                    steps: [ { text: "A" }, { text: "D" }, { text: "E" } ],
                    isOnly: true,
                    isDebug: undefined
                },
                {
                    steps: [ { text: "G" }, { text: "H" }, { text: "I" } ],
                    isOnly: true,
                    isDebug: undefined
                }
            ]);
        });

        it("handles $ when it's attached to a .. step block member", function() {
            var tree = new Tree();
            tree.parseIn(`
..
A -
B $ -
C -

    D -
    E -
    `);

            var branches = tree.branchify(tree.root);

            expect(branches).to.have.lengthOf(2);

            expect(branches[0].steps).to.have.lengthOf(4);
            expect(branches[1].steps).to.have.lengthOf(4);

            expect(branches).to.containSubsetInOrder([
                {
                    steps: [ { text: "A" }, { text: "B" }, { text: "C" }, { text: "D" } ],
                    isOnly: true,
                    isDebug: undefined
                },
                {
                    steps: [ { text: "A" }, { text: "B" }, { text: "C" }, { text: "E" } ],
                    isOnly: true,
                    isDebug: undefined
                }
            ]);
        });

        it("isolates a branch with a single ~", function() {
            var tree = new Tree();
            tree.parseIn(`
A -
    B - ~
        C -
    D -
    E -

F -
    `);

            var branches = tree.branchify(tree.root);

            expect(branches).to.have.lengthOf(1);
            expect(branches[0].steps).to.have.lengthOf(3);

            expect(branches).to.containSubsetInOrder([
                {
                    steps: [ { text: "A" }, { text: "B" }, { text: "C" } ],
                    isOnly: undefined,
                    isDebug: true
                }
            ]);
        });

        it("isolates the a branch with ~ on multiple steps", function() {
            var tree = new Tree();
            tree.parseIn(`
A -
    B - ~

        E -
            F -

        G ~ -
            H -

        I -

J -
    `);

            var branches = tree.branchify(tree.root);

            expect(branches).to.have.lengthOf(1);
            expect(branches[0].steps).to.have.lengthOf(4);

            expect(branches).to.containSubsetInOrder([
                {
                    steps: [ { text: "A" }, { text: "B" }, { text: "G" }, { text: "H" } ],
                    isOnly: undefined,
                    isDebug: true
                }
            ]);
        });

        it("isolates the first branch when ~ is on multiple branches", function() {
            var tree = new Tree();
            tree.parseIn(`
A -
    B - ~

        E -
            F -

        G ~ -
            H -

        I -

J - ~
`, "file.txt");

            var branches = tree.branchify(tree.root);

            expect(branches).to.have.lengthOf(1);
            expect(branches[0].steps).to.have.lengthOf(4);

            expect(branches).to.containSubsetInOrder([
                {
                    steps: [ { text: "A" }, { text: "B" }, { text: "G" }, { text: "H" } ],
                    isOnly: undefined,
                    isDebug: true
                }
            ]);
        });

        it("isolates the first branch when ~ is on multiple branches via a step block", function() {
            var tree = new Tree();
            tree.parseIn(`
A -
B -
C -

    D - ~
`, "file.txt");

            var branches = tree.branchify(tree.root);

            expect(branches).to.have.lengthOf(1);
            expect(branches[0].steps).to.have.lengthOf(2);

            expect(branches).to.containSubsetInOrder([
                {
                    steps: [ { text: "A" }, { text: "D" } ],
                    isOnly: undefined,
                    isDebug: true
                }
            ]);
        });

        it("isolates the first branch when ~ is on multiple branches via multiple function calls", function() {
            var tree = new Tree();
            tree.parseIn(`
* F
    A - ~

F

B -
    F
`, "file.txt");

            var branches = tree.branchify(tree.root);

            expect(branches).to.have.lengthOf(1);
            expect(branches[0].steps).to.have.lengthOf(2);

            expect(branches).to.containSubsetInOrder([
                {
                    steps: [ { text: "F" }, { text: "A" } ],
                    isOnly: undefined,
                    isDebug: true
                }
            ]);
        });

        it("isolates the first branch when a ~ step has multiple branches underneath it", function() {
            var tree = new Tree();
            tree.parseIn(`
A - ~
    B -
    C -
    D -
`, "file.txt");

            var branches = tree.branchify(tree.root);

            expect(branches).to.have.lengthOf(1);
            expect(branches[0].steps).to.have.lengthOf(2);

            expect(branches).to.containSubsetInOrder([
                {
                    steps: [ { text: "A" }, { text: "B" } ],
                    isOnly: undefined,
                    isDebug: true
                }
            ]);

            tree = new Tree();
            tree.parseIn(`
A - ~

    B -

    C -
`, "file.txt");

            branches = tree.branchify(tree.root);

            expect(branches).to.have.lengthOf(1);
            expect(branches[0].steps).to.have.lengthOf(2);

            expect(branches).to.containSubsetInOrder([
                {
                    steps: [ { text: "A" }, { text: "B" } ],
                    isOnly: undefined,
                    isDebug: true
                }
            ]);
        });

        it("handles ~ when it's attached to a step block member", function() {
            var tree = new Tree();
            tree.parseIn(`
A -
    B -
    C - ~
    D -

        E -
            F -

        G ~ -
            H -

        I -

J -
    `);

            var branches = tree.branchify(tree.root);

            expect(branches).to.have.lengthOf(1);
            expect(branches[0].steps).to.have.lengthOf(4);

            expect(branches).to.containSubsetInOrder([
                {
                    steps: [ { text: "A" }, { text: "C" }, { text: "G" }, { text: "H" } ],
                    isOnly: undefined,
                    isDebug: true
                }
            ]);
        });

        it("handles ~ when it's inside a function declaration", function() {
            var tree = new Tree();
            tree.parseIn(`
* F
    A -

    B - ~
        C -
        D -

F
    X -
    Y -
    `);

            var branches = tree.branchify(tree.root);

            expect(branches).to.have.lengthOf(1);
            expect(branches[0].steps).to.have.lengthOf(4);

            expect(branches).to.containSubsetInOrder([
                {
                    steps: [ { text: "F" }, { text: "B" }, { text: "C" }, { text: "X" } ],
                    isOnly: undefined,
                    isDebug: true
                }
            ]);
        });

        it("handles using multiple $'s and a ~ to isolate a single branch to debug", function() {
            var tree = new Tree();
            tree.parseIn(`
A -
    B - $
    C -

        D - $ ~
            E -

        F -

    G -
        H -

I -
    `);

            var branches = tree.branchify(tree.root);

            expect(branches).to.have.lengthOf(1);
            expect(branches[0].steps).to.have.lengthOf(4);

            expect(branches).to.containSubsetInOrder([
                {
                    steps: [ { text: "A" }, { text: "B" }, { text: "D" }, { text: "E" } ],
                    isOnly: true,
                    isDebug: true,
                }
            ]);

            tree = new Tree();
            tree.parseIn(`
A -
    B - $
    C -

        D - $
            E - ~

        F -

    G -
        H -

I -
    `);

            branches = tree.branchify(tree.root);

            expect(branches).to.have.lengthOf(1);
            expect(branches[0].steps).to.have.lengthOf(4);

            expect(branches).to.containSubsetInOrder([
                {
                    steps: [ { text: "A" }, { text: "B" }, { text: "D" }, { text: "E" } ],
                    isOnly: true,
                    isDebug: true,
                }
            ]);
        });

        it("throws exception if a ~ exists, but is cut off due to $", function() {
            var tree = new Tree();
            tree.parseIn(`
A -
    B - $
    C -

        D - $ ~
            E -

        F -

    G -
        H - ~

I -
`, "file.txt");

            assert.throws(function() {
                tree.branchify(tree.root);
            }, "A ~ exists under this step, but it's being cut off by $'s. Either add a $ to this line or remove the ~. [file.txt:11]");

            tree = new Tree();
            tree.parseIn(`
A -
    B - $
    C -

        D - $ ~
            E -

        F -

    G -
        H -

I - ~
`, "file.txt");

            assert.throws(function() {
                tree.branchify(tree.root);
            }, "A ~ exists under this step, but it's being cut off by $'s. Either add a $ to this line or remove the ~. [file.txt:14]");
        });

        it("sets the frequency of a branch when the {frequency} variable is set on a leaf", function() {
            var tree = new Tree();
            tree.parseIn(`
A -
    B -
        {frequency}='high'
    C -
D -
`, "file.txt");

            var branches = tree.branchify(tree.root);

            expect(branches).to.containSubsetInOrder([
                {
                    steps: [ { text: "A" },  { text: "B" } ],
                    frequency: 'high'
                },
                {
                    steps: [ { text: "A" },  { text: "C" } ],
                    frequency: undefined
                },
                {
                    steps: [ { text: "D" } ],
                    frequency: undefined
                }
            ]);
        });

        it("sets the frequency of multiple branches when the {frequency} variable is set", function() {
            var tree = new Tree();
            tree.parseIn(`
A -
    B -
        {frequency}='high'
            C -

            D -

E -

{frequency}='low'

    F -
`, "file.txt");

            var branches = tree.branchify(tree.root);

            expect(branches).to.containSubsetInOrder([
                {
                    steps: [ { text: "A" },  { text: "B" }, { text: "{frequency}='high'" }, { text: "C" } ],
                    frequency: 'high'
                },
                {
                    steps: [ { text: "A" },  { text: "B" }, { text: "{frequency}='high'" }, { text: "D" } ],
                    frequency: 'high'
                },
                {
                    steps: [ { text: "E" } ],
                    frequency: undefined
                },
                {
                    steps: [ { text: "{frequency}='low'" }, { text: "F" } ],
                    frequency: 'low'
                }
            ]);
        });

        it("sets the frequency of multiple branches when the {frequency} variable is set on a step block", function() {
            var tree = new Tree();
            tree.parseIn(`
A -
    B -
        C -
        D -

            {frequency}='high'

        {frequency}='low'
            E -
            F -
G -
`, "file.txt");

            var branches = tree.branchify(tree.root);

            expect(branches).to.containSubsetInOrder([
                {
                    steps: [ { text: "A" },  { text: "B" }, { text: "C" }, { text: "{frequency}='high'" } ],
                    frequency: 'high'
                },
                {
                    steps: [ { text: "A" },  { text: "B" }, { text: "D" }, { text: "{frequency}='high'" } ],
                    frequency: 'high'
                },
                {
                    steps: [ { text: "A" },  { text: "B" }, { text: "{frequency}='low'" }, { text: "E" } ],
                    frequency: 'low'
                },
                {
                    steps: [ { text: "A" },  { text: "B" }, { text: "{frequency}='low'" }, { text: "F" } ],
                    frequency: 'low'
                },
                {
                    steps: [ { text: "G" } ],
                    frequency: undefined
                }
            ]);
        });

        it("sets the frequency of a branch to the deepest {frequency} variable when more than one exist on a branch", function() {
            var tree = new Tree();
            tree.parseIn(`
A -
    {frequency}='high'
        B -
            {frequency}='low'
                C -
`, "file.txt");

            var branches = tree.branchify(tree.root);

            expect(branches).to.containSubsetInOrder([
                {
                    steps: [ { text: "A" },  { text: "{frequency}='high'" }, { text: "B" }, { text: "{frequency}='low'" }, { text: "C" } ],
                    frequency: 'low'
                }
            ]);
        });

        it("keeps all branches when frequency is set to 'low'", function() {
            var tree = new Tree();
            tree.parseIn(`
A -
    {frequency}='high'
        B -

    {frequency}='med'
        C -

        D -
            {frequency}='high'
                E -

    {frequency}='low'
        F -
    G -
`, "file.txt");

            var branches = tree.branchify(tree.root, undefined, "low");

            expect(branches).to.have.lengthOf(5);

            expect(branches).to.containSubsetInOrder([
                {
                    steps: [ { text: "A" }, { text: "{frequency}='high'" }, { text: "B" } ],
                    frequency: 'high'
                },
                {
                    steps: [ { text: "A" }, { text: "{frequency}='med'" }, { text: "C" } ],
                    frequency: 'med'
                },
                {
                    steps: [ { text: "A" }, { text: "{frequency}='med'" }, { text: "D" }, { text: "{frequency}='high'" }, { text: "E" } ],
                    frequency: 'high'
                },
                {
                    steps: [ { text: "A" }, { text: "{frequency}='low'" }, { text: "F" } ],
                    frequency: 'low'
                },
                {
                    steps: [ { text: "A" }, { text: "G" } ],
                    frequency: undefined
                }
            ]);
        });

        it("keeps all branches when frequency is not set", function() {
            var tree = new Tree();
            tree.parseIn(`
A -
    {frequency}='high'
        B -

    {frequency}='med'
        C -

        D -
            {frequency}='high'
                E -

    {frequency}='low'
        F -
    G -
`, "file.txt");

            var branches = tree.branchify(tree.root, undefined, undefined);

            expect(branches).to.have.lengthOf(5);

            expect(branches).to.containSubsetInOrder([
                {
                    steps: [ { text: "A" }, { text: "{frequency}='high'" }, { text: "B" } ],
                    frequency: 'high'
                },
                {
                    steps: [ { text: "A" }, { text: "{frequency}='med'" }, { text: "C" } ],
                    frequency: 'med'
                },
                {
                    steps: [ { text: "A" }, { text: "{frequency}='med'" }, { text: "D" }, { text: "{frequency}='high'" }, { text: "E" } ],
                    frequency: 'high'
                },
                {
                    steps: [ { text: "A" }, { text: "{frequency}='low'" }, { text: "F" } ],
                    frequency: 'low'
                },
                {
                    steps: [ { text: "A" }, { text: "G" } ],
                    frequency: undefined
                }
            ]);
        });

        it("keeps branches at or above 'med' frequency", function() {
            var tree = new Tree();
            tree.parseIn(`
A -
    {frequency}='high'
        B -

    {frequency}='med'
        C -

        D -
            {frequency}='high'
                E -

    {frequency}='low'
        F -
    G -
`, "file.txt");

            var branches = tree.branchify(tree.root, undefined, "med");

            expect(branches).to.have.lengthOf(4);

            expect(branches).to.containSubsetInOrder([
                {
                    steps: [ { text: "A" }, { text: "{frequency}='high'" }, { text: "B" } ],
                    frequency: 'high'
                },
                {
                    steps: [ { text: "A" }, { text: "{frequency}='med'" }, { text: "C" } ],
                    frequency: 'med'
                },
                {
                    steps: [ { text: "A" }, { text: "{frequency}='med'" }, { text: "D" }, { text: "{frequency}='high'" }, { text: "E" } ],
                    frequency: 'high'
                },
                {
                    steps: [ { text: "A" }, { text: "G" } ],
                    frequency: undefined
                }
            ]);
        });

        it("keeps branches at 'high' frequency", function() {
            var tree = new Tree();
            tree.parseIn(`
A -
    {frequency}='high'
        B -

    {frequency}='med'
        C -

        D -
            {frequency}='high'
                E -

    {frequency}='low'
        F -
    G -
`, "file.txt");

            var branches = tree.branchify(tree.root, undefined, "high");

            expect(branches).to.have.lengthOf(2);

            expect(branches).to.containSubsetInOrder([
                {
                    steps: [ { text: "A" }, { text: "{frequency}='high'" }, { text: "B" } ],
                    frequency: 'high'
                },
                {
                    steps: [ { text: "A" }, { text: "{frequency}='med'" }, { text: "D" }, { text: "{frequency}='high'" }, { text: "E" } ],
                    frequency: 'high'
                }
            ]);
        });

        it("throws exception if a ~ exists, but is cut off due to a frequency restriction", function() {
            var tree = new Tree();
            tree.parseIn(`
A -
    {frequency}='high'
        B -

    {frequency}='med'
        C - ~

        D -
            {frequency}='high'
                E -

    {frequency}='low'
        F -
    G -
`, "file.txt");

            assert.throws(function() {
                tree.branchify(tree.root, undefined, "high");
            }, "This step contains a ~, but is not above the frequency allowed to run (high). Either set its frequency higher or remove the ~. [file.txt:7]");

            assert.doesNotThrow(function() {
                tree.branchify(tree.root, undefined, "med");
            });

            assert.doesNotThrow(function() {
                tree.branchify(tree.root, undefined, "low");
            });

            assert.doesNotThrow(function() {
                tree.branchify(tree.root, undefined, undefined);
            });
        });

        it("sets the groups for a branch", function() {
            var tree = new Tree();
            tree.parseIn(`
A -
    B -
        {group}='first'

    {group}='second'
        D -

        E -
        F -

G -
`, "file.txt");

            var branches = tree.branchify(tree.root);

            expect(branches).to.have.lengthOf(5);
            expect(branches[0].steps).to.have.lengthOf(3);
            expect(branches[1].steps).to.have.lengthOf(3);
            expect(branches[2].steps).to.have.lengthOf(3);
            expect(branches[3].steps).to.have.lengthOf(3);
            expect(branches[4].steps).to.have.lengthOf(1);

            expect(branches).to.containSubsetInOrder([
                {
                    steps: [ { text: "A" }, { text: "B" }, { text: "{group}='first'" } ],
                    groups: [ 'first' ]
                },
                {
                    steps: [ { text: "A" }, { text: "{group}='second'" }, { text: "D" } ],
                    groups: [ 'second' ]
                },
                {
                    steps: [ { text: "A" }, { text: "{group}='second'" }, { text: "E" } ],
                    groups: [ 'second' ]
                },
                {
                    steps: [ { text: "A" }, { text: "{group}='second'" }, { text: "F" } ],
                    groups: [ 'second' ]
                },
                {
                    steps: [ { text: "G" } ],
                    groups: undefined
                }
            ]);
        });

        it("sets multiple groups for a branch", function() {
            var tree = new Tree();
            tree.parseIn(`
A -
    B -
        {group}='first'
            {group}='second'

    {group}='third'
        D -
            {group}='fourth', {group}='fifth'

        E -
        F -

            {group}='sixth'

G -
`, "file.txt");

            var branches = tree.branchify(tree.root);

            expect(branches).to.have.lengthOf(5);
            expect(branches[0].steps).to.have.lengthOf(4);
            expect(branches[1].steps).to.have.lengthOf(4);
            expect(branches[2].steps).to.have.lengthOf(4);
            expect(branches[3].steps).to.have.lengthOf(4);
            expect(branches[4].steps).to.have.lengthOf(1);

            expect(branches).to.containSubsetInOrder([
                {
                    steps: [ { text: "A" }, { text: "B" }, { text: "{group}='first'" }, { text: "{group}='second'" } ],
                    groups: [ 'first', 'second' ]
                },
                {
                    steps: [ { text: "A" }, { text: "{group}='third'" }, { text: "D" }, { text: "{group}='fourth', {group}='fifth'" } ],
                    groups: [ 'third', 'fourth', 'fifth' ]
                },
                {
                    steps: [ { text: "A" }, { text: "{group}='third'" }, { text: "E" }, { text: "{group}='sixth'" } ],
                    groups: [ 'third', 'sixth' ]
                },
                {
                    steps: [ { text: "A" }, { text: "{group}='third'" }, { text: "F" }, { text: "{group}='sixth'" } ],
                    groups: [ 'third', 'sixth' ]
                },
                {
                    steps: [ { text: "G" } ],
                    groups: undefined
                }
            ]);
        });

        it("keeps all branches when no groups are set", function() {
            var tree = new Tree();
            tree.parseIn(`
A -
    B -
        {group}='first'
            {group}='second'

    {group}='third'
        D -
            {group}='fourth', {group}='fifth'

        E -
        F -

            {group}='sixth'

G -
`, "file.txt");

            var branches = tree.branchify(tree.root, undefined);

            expect(branches).to.have.lengthOf(5);
            expect(branches[0].steps).to.have.lengthOf(4);
            expect(branches[1].steps).to.have.lengthOf(4);
            expect(branches[2].steps).to.have.lengthOf(4);
            expect(branches[3].steps).to.have.lengthOf(4);
            expect(branches[4].steps).to.have.lengthOf(1);

            expect(branches).to.containSubsetInOrder([
                {
                    steps: [ { text: "A" }, { text: "B" }, { text: "{group}='first'" }, { text: "{group}='second'" } ],
                    groups: [ 'first', 'second' ]
                },
                {
                    steps: [ { text: "A" }, { text: "{group}='third'" }, { text: "D" }, { text: "{group}='fourth', {group}='fifth'" } ],
                    groups: [ 'third', 'fourth', 'fifth' ]
                },
                {
                    steps: [ { text: "A" }, { text: "{group}='third'" }, { text: "E" }, { text: "{group}='sixth'" } ],
                    groups: [ 'third', 'sixth' ]
                },
                {
                    steps: [ { text: "A" }, { text: "{group}='third'" }, { text: "F" }, { text: "{group}='sixth'" } ],
                    groups: [ 'third', 'sixth' ]
                },
                {
                    steps: [ { text: "G" } ],
                    groups: undefined
                }
            ]);
        });

        it("only keeps branches that are part of a group being run", function() {
            var tree = new Tree();
            tree.parseIn(`
A -
    B -
        {group}='first'
            {group}='second'

    {group}='third'
        D -
            {group}='fourth', {group}='first'

        E -
        F -

            {group}='sixth'

G -
`, "file.txt");

            var branches = tree.branchify(tree.root, ["first"]);

            expect(branches).to.have.lengthOf(2);
            expect(branches[0].steps).to.have.lengthOf(4);
            expect(branches[1].steps).to.have.lengthOf(4);

            expect(branches).to.containSubsetInOrder([
                {
                    steps: [ { text: "A" }, { text: "B" }, { text: "{group}='first'" }, { text: "{group}='second'" } ],
                    groups: [ 'first', 'second' ]
                },
                {
                    steps: [ { text: "A" }, { text: "{group}='third'" }, { text: "D" }, { text: "{group}='fourth', {group}='first'" } ],
                    groups: [ 'third', 'fourth', 'first' ]
                }
            ]);
        });

        it("only keeps branches that are part of a group being run, and multiple groups are being run", function() {
            var tree = new Tree();
            tree.parseIn(`
A -
    B -
        {group}='first'
            {group}='second'

    {group}='third'
        D -
            {group}='fourth', {group}='first'

        E -
        F -

            {group}='sixth'
                K -

        {group}='sixth'
            L -
G -
`, "file.txt");

            var branches = tree.branchify(tree.root, ["first", "sixth"]);

            expect(branches).to.have.lengthOf(5);
            expect(branches[0].steps).to.have.lengthOf(4);
            expect(branches[1].steps).to.have.lengthOf(4);
            expect(branches[2].steps).to.have.lengthOf(5);
            expect(branches[3].steps).to.have.lengthOf(5);
            expect(branches[4].steps).to.have.lengthOf(4);

            expect(branches).to.containSubsetInOrder([
                {
                    steps: [ { text: "A" }, { text: "B" }, { text: "{group}='first'" }, { text: "{group}='second'" } ],
                    groups: [ 'first', 'second' ]
                },
                {
                    steps: [ { text: "A" }, { text: "{group}='third'" }, { text: "D" }, { text: "{group}='fourth', {group}='first'" } ],
                    groups: [ 'third', 'fourth', 'first' ]
                },
                {
                    steps: [ { text: "A" }, { text: "{group}='third'" }, { text: "E" }, { text: "{group}='sixth'" }, { text: "K" } ],
                    groups: [ 'third', 'sixth' ]
                },
                {
                    steps: [ { text: "A" }, { text: "{group}='third'" }, { text: "F" }, { text: "{group}='sixth'" }, { text: "K" } ],
                    groups: [ 'third', 'sixth' ]
                },
                {
                    steps: [ { text: "A" }, { text: "{group}='third'" }, { text: "{group}='sixth'" }, { text: "L" } ],
                    groups: [ 'sixth' ]
                }
            ]);
        });

        it("throws exception if a ~ exists, but is cut off due to a groups restriction", function() {
            var tree = new Tree();
            tree.parseIn(`
A -
    {group}='one'
        B -

    {group}='two'
        C - ~

        D -
            {group}='three'
                E -

    {group}='four'
        F -
    G -
`, "file.txt");

            assert.throws(function() {
                tree.branchify(tree.root, ["one"]);
            }, "This step contains a ~, but is not inside one of the groups being run. Either add it to the groups being run or remove the ~. [file.txt:7]");

            assert.throws(function() {
                tree.branchify(tree.root, ["one", "three", "four"]);
            }, "This step contains a ~, but is not inside one of the groups being run. Either add it to the groups being run or remove the ~. [file.txt:7]");

            assert.doesNotThrow(function() {
                tree.branchify(tree.root, ["two"]);
            });
        });

        it("throws an exception if noDebug is set but a $ is present in a branch", function() {
            var tree = new Tree();
            tree.parseIn(`
A -
    B $ -
`, "file.txt");

            assert.throws(() => {
                tree.branchify(tree.root, undefined, undefined, true);
            }, "A $ was found, but the noDebug flag is set [file.txt:3]");
        });

        it("throws an exception if noDebug is set but a ~ is present in a branch", function() {
            var tree = new Tree();
            tree.parseIn(`
A -
    B ~ -
`, "file.txt");

            assert.throws(() => {
                tree.branchify(tree.root, undefined, undefined, true);
            }, "A ~ was found, but the noDebug flag is set [file.txt:3]");
        });

        it("handles multiple restrictions", function() {
            // Try them all here, all on one big tree (group, frequency, $, ~)
            var tree = new Tree();
            tree.parseIn(`
A -
    B $ -
        {group}='first', {frequency}='low'
            {group}='second'

    {group}='third'
        D -
            {group}='fourth', {group}='first'

        E -
        F - $ ~

            {group}='sixth'
                K - ~
                    {frequency}='high'

        {group}='sixth'
            L -
G -
`, "file.txt");

            var branches = tree.branchify(tree.root, ["first", "sixth"], "med");

            expect(branches).to.have.lengthOf(1);
            expect(branches[0].steps).to.have.lengthOf(6);

            expect(branches).to.containSubsetInOrder([
                {
                    steps: [ { text: "A" }, { text: "{group}='third'" }, { text: "F" }, { text: "{group}='sixth'" }, { text: "K" }, { text: "{frequency}='high'" } ],
                    groups: [ 'third', 'sixth' ],
                    frequency: 'high'
                }
            ]);
        });

        it("marks as built-in hooks that are built-in", function() {
            var tree = new Tree();
            tree.parseIn(`
A -

* Before Everything {
    K
}
`, "file1.txt", false);

            tree.parseIn(`
* Before Everything {
    B
}

* After Everything {
    C
}

* After Every Branch {
    D
}

* After Every Step {
    E
}

* Before Every Branch {
    F
}

* Before Every Step {
    G
}
`, "file2.txt", true);

            var branches = tree.branchify(tree.root);

            expect(branches).to.have.lengthOf(1);
            expect(tree.beforeEverything).to.have.lengthOf(2);
            expect(tree.afterEverything).to.have.lengthOf(1);

            expect(branches).to.containSubsetInOrder([
                {
                    steps: [ { text: "A" } ],
                    beforeEveryBranch: [
                        { text: "Before Every Branch", codeBlock: "\n    F\n", isBuiltIn: true }
                    ],
                    afterEveryBranch: [
                        { text: "After Every Branch", codeBlock: "\n    D\n", isBuiltIn: true }
                    ],
                    beforeEveryStep: [
                        { text: "Before Every Step", codeBlock: "\n    G\n", isBuiltIn: true }
                    ],
                    afterEveryStep: [
                        { text: "After Every Step", codeBlock: "\n    E\n", isBuiltIn: true }
                    ]
                }
            ]);

            expect(tree.beforeEverything).to.containSubsetInOrder([
                { text: "Before Everything", codeBlock: "\n    B\n", isBuiltIn: true },
                { text: "Before Everything", codeBlock: "\n    K\n", isBuiltIn: undefined }
            ]);

            expect(tree.afterEverything).to.containSubsetInOrder([
                { text: "After Everything", codeBlock: "\n    C\n", isBuiltIn: true }
            ]);
        });
    });

    describe("generateBranches()", function() {
        it("sorts branches by {frequency}", function() {
            var tree = new Tree();
            tree.parseIn(`
A -
    {frequency}='low'
B -

C -
    {frequency}='high', {var}='foo'
D -
    {frequency}='med'
`, "file.txt");

            tree.generateBranches();

            expect(tree.branches).to.containSubsetInOrder([
                {
                    steps: [ { text: "C" }, { text: "{frequency}='high', {var}='foo'" } ],
                    frequency: 'high'
                },
                {
                    steps: [ { text: "B" } ],
                    frequency: undefined
                },
                {
                    steps: [ { text: "D" }, { text: "{frequency}='med'" } ],
                    frequency: 'med'
                },
                {
                    steps: [ { text: "A" }, { text: "{frequency}='low'" } ],
                    frequency: 'low'
                }
            ]);
        });

        it("handles an error from branchify()", function() {
            var tree = new Tree();
            tree.parseIn(`
A -
    * Before Everything {
    }
    `, "file.txt");

            assert.throws(() => {
                tree.generateBranches();
            }, "A '* Before Everything' function must not be indented (it must be at 0 indents) [file.txt:3]");
        });

        it("throws an exception when there's an infinite loop among function calls", function() {
            var tree = new Tree();
            tree.parseIn(`
F

* F
    F
`, "file.txt");

            assert.throws(() => {
                tree.generateBranches();
            }, "Infinite loop detected [file.txt:5]");

            tree = new Tree();
            tree.parseIn(`
A

* A
    B

* B
    A
`, "file.txt");

            assert.throws(() => {
                tree.generateBranches();
            }, /Infinite loop detected \[file\.txt:(5|8)\]/);

        });

        // NOTE: this just freezes up the executable
        // Unlike the infinite loop which causes an immediate stack size exception, this probably blows out memory before stack size (and there is no exception thrown)
        // This many branches are unlikely in normal usage, though
        /*
        it.skip("throws an exception when there are too many branches", function() {
            var tree = new Tree();
            // This is 10^10 branches, or 10,000,000,000 branches
            tree.parseIn(`
A-1 -
B-1 -
C-1 -
D-1 -
E-1 -
F-1 -
G-1 -
H-1 -
I-1 -
K-1 -

    A-2 -
    B-2 -
    C-2 -
    D-2 -
    E-2 -
    F-2 -
    G-2 -
    H-2 -
    I-2 -
    K-2 -

        A-3 -
        B-3 -
        C-3 -
        D-3 -
        E-3 -
        F-3 -
        G-3 -
        H-3 -
        I-3 -
        K-3 -

            A-4 -
            B-4 -
            C-4 -
            D-4 -
            E-4 -
            F-4 -
            G-4 -
            H-4 -
            I-4 -
            K-4 -

                A-5 -
                B-5 -
                C-5 -
                D-5 -
                E-5 -
                F-5 -
                G-5 -
                H-5 -
                I-5 -
                K-5 -

                    A-6 -
                    B-6 -
                    C-6 -
                    D-6 -
                    E-6 -
                    F-6 -
                    G-6 -
                    H-6 -
                    I-6 -
                    K-6 -

                        A-7 -
                        B-7 -
                        C-7 -
                        D-7 -
                        E-7 -
                        F-7 -
                        G-7 -
                        H-7 -
                        I-7 -
                        K-7 -

                            A-8 -
                            B-8 -
                            C-8 -
                            D-8 -
                            E-8 -
                            F-8 -
                            G-8 -
                            H-8 -
                            I-8 -
                            K-8 -

                                A-9 -
                                B-9 -
                                C-9 -
                                D-9 -
                                E-9 -
                                F-9 -
                                G-9 -
                                H-9 -
                                I-9 -
                                K-9 -

                                    A-10 -
                                    B-10 -
                                    C-10 -
                                    D-10 -
                                    E-10 -
                                    F-10 -
                                    G-10 -
                                    H-10 -
                                    I-10 -
                                    K-10 -

`, "file.txt");

            assert.throws(() => {
                tree.generateBranches();
            }, "Infinite loop detected");
        });
        */
    });

    describe("serializeBranches()", function() {
        it("outputs json for an empty tree", function() {
            var tree = new Tree();

            tree.generateBranches();
            var json = tree.serializeBranches();
            var obj = JSON.parse(json);

            expect(obj).to.containSubsetInOrder({
                branches: [],
                beforeEverything: [],
                afterEverything: []
            });
        });

        it("outputs json for all branches", function() {
            var tree = new Tree();
            tree.parseIn(`
A -
    B -
    C -
`);

            tree.generateBranches();
            var json = tree.serializeBranches();
            var obj = JSON.parse(json);

            expect(obj).to.containSubsetInOrder({
                branches: [
                    {
                        steps: [ { text: "A" }, { text: "B" } ]
                    },
                    {
                        steps: [ { text: "A" }, { text: "C" } ]
                    }
                ],
                beforeEverything: [],
                afterEverything: []
            });
        });

        it("outputs json for all branches and hooks", function() {
            var tree = new Tree();
            tree.parseIn(`
A -
    B -
        * After Every Branch {
            D
        }

        * After Every Step {
            F
        }

        * Before Every Branch {
            J
        }

        * Before Every Step {
            K
        }

    C -

* Before Everything {
    G
}

* Before Everything {
    H
}

* After Everything {
    I
}
`);

            tree.generateBranches();
            var json = tree.serializeBranches();
            var obj = JSON.parse(json);

            expect(obj.branches[0].beforeEveryBranch).to.have.lengthOf(1);
            expect(obj.branches[0].afterEveryBranch).to.have.lengthOf(1);
            expect(obj.branches[0].beforeEveryStep).to.have.lengthOf(1);
            expect(obj.branches[0].afterEveryStep).to.have.lengthOf(1);

            expect(obj.beforeEverything).to.have.lengthOf(2);
            expect(obj.afterEverything).to.have.lengthOf(1);

            expect(obj).to.containSubsetInOrder({
                branches: [
                    {
                        steps: [ { text: "A" }, { text: "B" } ],
                        beforeEveryBranch: [
                            { text: "Before Every Branch", codeBlock: "\n            J\n" }
                        ],
                        afterEveryBranch: [
                            { text: "After Every Branch", codeBlock: "\n            D\n" }
                        ],
                        beforeEveryStep: [
                            { text: "Before Every Step", codeBlock: "\n            K\n" }
                        ],
                        afterEveryStep: [
                            { text: "After Every Step", codeBlock: "\n            F\n" }
                        ]
                    },
                    {
                        steps: [ { text: "A" }, { text: "C" } ]
                    }
                ],
                beforeEverything: [
                    { text: "Before Everything", codeBlock: "\n    H\n" },
                    { text: "Before Everything", codeBlock: "\n    G\n" }
                ],
                afterEverything: [
                    { text: "After Everything", codeBlock: "\n    I\n" }
                ]
            });
        });
    });

    describe("mergeBranchesFromPrevRun()", function() {
        it("merges empty previous branches into empty current branches", function() {
            var prevTree = new Tree();
            var currTree = new Tree();

            currTree.generateBranches();
            prevTree.generateBranches();
            var prevJson = prevTree.serializeBranches();

            currTree.mergeBranchesFromPrevRun(prevJson);

            expect(currTree.branches).to.have.lengthOf(0);
            expect(currTree.branches).to.containSubsetInOrder([]);
        });

        it("handles a merge", function() {
            /*
             * If a branch...
             *     1) Exists in both previous and current
             *         a) Didn't pass in previous (it failed or it didn't run)
             *             It will be included in current, with a clean execution state
             *         b) Passed in previous
             *             It will be included in current, but marked to not run and will carry over its execution state from previous
             *     2) Only exists in previous
             *         It will remain absent from current (tester got rid of this branch)
             *     3) Only exists in current
             *         It will remain included in current, with a clean execution state (this is a new branch)
             */

             var currTree = new Tree();

             currTree.branches = [ new Branch(), new Branch(), new Branch(), new Branch(), new Branch(), new Branch() ];
             currTree.branches[0].steps = [ new Step(), new Step(), new Step() ];
             currTree.branches[1].steps = [ new Step(), new Step(), new Step() ];
             currTree.branches[2].steps = [ new Step(), new Step(), new Step() ];
             currTree.branches[3].steps = [ new Step(), new Step(), new Step() ];
             currTree.branches[4].steps = [ new Step(), new Step(), new Step() ];
             currTree.branches[5].steps = [ new Step(), new Step(), new Step() ];

             currTree.branches[0].steps[0].text = "1A clone-1 step-1";
             currTree.branches[0].steps[1].text = "1A clone-1 step-2";
             currTree.branches[0].steps[2].text = "1A clone-1 step-3";

             currTree.branches[1].steps[0].text = "1A clone-2 step-1";
             currTree.branches[1].steps[1].text = "1A clone-2 step-2";
             currTree.branches[1].steps[2].text = "1A clone-2 step-3";

             currTree.branches[2].steps[0].text = "1B clone-1 step-1";
             currTree.branches[2].steps[1].text = "1B clone-1 step-2";
             currTree.branches[2].steps[2].text = "1B clone-1 step-3";

             currTree.branches[3].steps[0].text = "3 clone-1 step-1";
             currTree.branches[3].steps[1].text = "3 clone-1 step-2";
             currTree.branches[3].steps[2].text = "3 clone-1 step-3";
             currTree.branches[3].isPassed = true;

             currTree.branches[4].steps[0].text = "3 clone-2 step-1";
             currTree.branches[4].steps[1].text = "3 clone-2 step-2";
             currTree.branches[4].steps[2].text = "3 clone-2 step-3";
             currTree.branches[4].isFailed = true;
             currTree.branches[4].passedLastTime = true;

             currTree.branches[5].steps[0].text = "3 clone-3 step-1";
             currTree.branches[5].steps[1].text = "3 clone-3 step-2";
             currTree.branches[5].steps[2].text = "3 clone-3 step-3";

             var prevTree = new Tree();

             prevTree.branches = [ new Branch(), new Branch(), new Branch(), new Branch(), new Branch(), new Branch() ];
             prevTree.branches[0].steps = [ new Step(), new Step(), new Step() ];
             prevTree.branches[1].steps = [ new Step(), new Step(), new Step() ];
             prevTree.branches[2].steps = [ new Step(), new Step(), new Step() ];
             prevTree.branches[3].steps = [ new Step(), new Step(), new Step() ];
             prevTree.branches[4].steps = [ new Step(), new Step(), new Step() ];
             prevTree.branches[5].steps = [ new Step(), new Step(), new Step() ];

             prevTree.branches[0].steps[0].text = "1A clone-1 step-1";
             prevTree.branches[0].steps[1].text = "1A clone-1 step-2";
             prevTree.branches[0].steps[2].text = "1A clone-1 step-3";

             prevTree.branches[1].steps[0].text = "1A clone-2 step-1";
             prevTree.branches[1].steps[1].text = "1A clone-2 step-2";
             prevTree.branches[1].steps[2].text = "1A clone-2 step-3";
             prevTree.branches[1].isFailed = true;

             prevTree.branches[2].steps[0].text = "1B clone-1 step-1";
             prevTree.branches[2].steps[1].text = "1B clone-1 step-2";
             prevTree.branches[2].steps[2].text = "1B clone-1 step-3";
             prevTree.branches[2].isPassed = true;

             prevTree.branches[3].steps[0].text = "2 clone-1 step-1";
             prevTree.branches[3].steps[1].text = "2 clone-1 step-2";
             prevTree.branches[3].steps[2].text = "2 clone-1 step-3";
             prevTree.branches[3].isFailed = true;

             prevTree.branches[4].steps[0].text = "2 clone-2 step-1";
             prevTree.branches[4].steps[1].text = "2 clone-2 step-2";
             prevTree.branches[4].steps[2].text = "2 clone-2 step-3";
             prevTree.branches[4].isPassed = true;

             prevTree.branches[5].steps[0].text = "2 clone-3 step-1";
             prevTree.branches[5].steps[1].text = "2 clone-3 step-2";
             prevTree.branches[5].steps[2].text = "2 clone-3 step-3";

             var prevJson = prevTree.serializeBranches();
             currTree.mergeBranchesFromPrevRun(prevJson);

             expect(currTree.branches).to.have.lengthOf(6);
             expect(currTree.branches).to.containSubsetInOrder([
                 {
                     steps: [ { text: "1A clone-1 step-1" }, { text: "1A clone-1 step-2" }, { text: "1A clone-1 step-3" } ],
                     passedLastTime: undefined,
                     isPassed: undefined,
                     isFailed: undefined
                 },
                 {
                     steps: [ { text: "1A clone-2 step-1" }, { text: "1A clone-2 step-2" }, { text: "1A clone-2 step-3" } ],
                     passedLastTime: undefined,
                     isPassed: undefined,
                     isFailed: undefined
                 },
                 {
                     steps: [ { text: "1B clone-1 step-1" }, { text: "1B clone-1 step-2" }, { text: "1B clone-1 step-3" } ],
                     passedLastTime: true,
                     isPassed: undefined,
                     isFailed: undefined
                 },
                 {
                     steps: [ { text: "3 clone-1 step-1" }, { text: "3 clone-1 step-2" }, { text: "3 clone-1 step-3" } ],
                     passedLastTime: undefined,
                     isPassed: undefined,
                     isFailed: undefined
                 },
                 {
                     steps: [ { text: "3 clone-2 step-1" }, { text: "3 clone-2 step-2" }, { text: "3 clone-2 step-3" } ],
                     passedLastTime: undefined,
                     isPassed: undefined,
                     isFailed: undefined
                 },
                 {
                     steps: [ { text: "3 clone-3 step-1" }, { text: "3 clone-3 step-2" }, { text: "3 clone-3 step-3" } ],
                     passedLastTime: undefined,
                     isPassed: undefined,
                     isFailed: undefined
                 }
             ]);
        });
    });

    describe("getBranchCount()", function() {
        it("returns total number of branches", function() {
            var tree = new Tree();
            tree.parseIn(`
A - $
    B -

        C -
        D -

            E -

    H -T
        I -
    J -M

F -
    G -
`, "file.txt");

            tree.generateBranches();

            expect(tree.getBranchCount(false, false)).to.equal(4);
        });

        it("returns total number of runnable branches", function() {
            var tree = new Tree();
            tree.parseIn(`
A - $
    B -

        C -
        D -

            E -

    H -T
        I -
    J -M

F -
    G -
`, "file.txt");

            tree.generateBranches();

            tree.branches[0].passedLastTime = true;

            expect(tree.getBranchCount(true, false)).to.equal(3);
        });

        it("returns total number of complete branches", function() {
            var tree = new Tree();
            tree.parseIn(`
A - $
    B -

        C -
        D -

            E -

    H -T
        I -
    J -M

F -
    G -
`, "file.txt");

            tree.generateBranches();

            tree.branches[0].passedLastTime = true;
            tree.branches[2].isFailed = true;

            expect(tree.getBranchCount(true, true)).to.equal(1);
            expect(tree.getBranchCount(false, true)).to.equal(2);

            delete tree.branches[2].isFailed;
            tree.branches[2].isSkipped = true;

            expect(tree.getBranchCount(true, true)).to.equal(1);
            expect(tree.getBranchCount(false, true)).to.equal(2);

            delete tree.branches[0].passedLastTime;
            tree.branches[0].isPassed = true;

            expect(tree.getBranchCount(true, true)).to.equal(2);
            expect(tree.getBranchCount(false, true)).to.equal(2);
        });

        it("does not count inside hooks", function() {
            var tree = new Tree();
            tree.parseIn(`
A - $
    B -

        C -
        D -

            E -

            * After Every Branch {
                M
            }

            * After Every Step {
                N
            }

            * Before Every Branch {
                O
            }

            * Before Every Step {
                P
            }

    H -T
        I -
    J -M

F -
    G -

* Before Everything {
    Q
}

* After Everything {
    R
}
`, "file.txt");

            tree.parseIn(`
* Before Everything {
    S
}

* After Everything {
    T
}

* After Every Branch {
    U
}

* After Every Step {
    V
}

* Before Every Branch {
    W
}

* Before Every Step {
    X
}
`, "builtin.txt", true);

            tree.generateBranches();

            expect(tree.getBranchCount(false, false)).to.equal(4);
        });
    });

    describe("getStepCount()", function() {
        it("returns total number of steps", function() {
            var tree = new Tree();
            tree.parseIn(`
A - $
    B -

        C -
        D -

            E -

    H -T
        I -
    J -M

F -
    G -
`, "file.txt");

            tree.generateBranches();

            expect(tree.getStepCount()).to.equal(13);
        });

        it("returns total number of runnable steps", function() {
            var tree = new Tree();
            tree.parseIn(`
A - $
    B -

        C -
        D -

            E -

    H -T
        I -
    J -M

F -
    G -
`, "file.txt");

            tree.generateBranches();

            expect(tree.getStepCount(false)).to.equal(13);
            expect(tree.getStepCount(true)).to.equal(10);

            tree.branches[1].passedLastTime = true;

            expect(tree.getStepCount(true)).to.equal(6);
        });

        it("returns total number of complete steps", function() {
            var tree = new Tree();
            tree.parseIn(`
A - $
    B -

        C -
        D -

            E -

    H -T
        I -
    J -M

F -
    G -
`, "file.txt");

            tree.generateBranches();

            tree.branches[0].steps[0].isPassed = true;
            tree.branches[0].steps[1].isFailed = true;
            tree.branches[2].passedLastTime = true;

            expect(tree.getStepCount(false)).to.equal(13);
            expect(tree.getStepCount(true, true)).to.equal(2);
        });

        it("returns total number of complete steps when there are skipped branches", function() {
            var tree = new Tree();
            tree.parseIn(`
A -
    B -

        C -
        D -

            E -
`, "file.txt");

            tree.generateBranches();

            tree.branches[0].isSkipped = true;

            expect(tree.getStepCount(false)).to.equal(8);
            expect(tree.getStepCount(true, true)).to.equal(4);
        });

        it("does not count inside hooks", function() {
            var tree = new Tree();
            tree.parseIn(`
A - $
    B -

        C -
        D -

            E -

            * After Every Branch {
                M
            }

            * After Every Step {
                N
            }

            * Before Every Branch {
                O
            }

            * Before Every Step {
                P
            }

    H -T
        I -
    J -M

F -
    G -

* Before Everything {
    Q
}

* After Everything {
    R
}
`, "file.txt");

            tree.parseIn(`
* Before Everything {
    S
}

* After Everything {
    T
}

* After Every Branch {
    U
}

* After Every Step {
    V
}

* Before Every Branch {
    W
}

* Before Every Step {
    X
}
`, "builtin.txt", true);

            tree.generateBranches();

            tree.branches[0].steps[0].isPassed = true;
            tree.branches[0].steps[1].isFailed = true;
            tree.branches[2].passedLastTime = true;

            expect(tree.getStepCount(false)).to.equal(13);
            expect(tree.getStepCount(true, true)).to.equal(2);
        });

        it("returns total number of unexpected steps", function() {
            var tree = new Tree();
            tree.parseIn(`
A -
    B -

        C -
        D -

            E -
`, "file.txt");

            tree.generateBranches();

            tree.branches[0].steps[0].asExpected = true;
            tree.branches[0].steps[1].asExpected = false;
            tree.branches[0].steps[2].asExpected = false;
            tree.branches[0].steps[3].asExpected = true;

            tree.branches[1].steps[0].asExpected = true;
            tree.branches[1].steps[1].asExpected = false;
            tree.branches[1].steps[2].asExpected = false;

            expect(tree.getStepCount(true, false, true)).to.equal(5);
        });
    });

    describe("nextBranch()", function() {
        it("returns the next branch", function() {
            var tree = new Tree();
            tree.parseIn(`
A - +
    B -
        C -
        D -
        E -

F -

G -
`, "file.txt");

            tree.generateBranches();

            expect(tree.nextBranch()).to.containSubsetInOrder({
                steps: [ { text: "A" }, { text: "B" }, { text: "C" } ]
            });

            expect(tree.nextBranch()).to.containSubsetInOrder({
                steps: [ { text: "F" } ]
            });

            expect(tree.nextBranch()).to.containSubsetInOrder({
                steps: [ { text: "G" } ]
            });

            expect(tree.nextBranch()).to.equal(null);

            delete tree.branches[0].isRunning;
            tree.branches[0].isSkipped = true;

            expect(tree.nextBranch()).to.containSubsetInOrder({
                steps: [ { text: "A" }, { text: "B" }, { text: "D" } ]
            });

            expect(tree.nextBranch()).to.equal(null);

            delete tree.branches[1].isRunning;
            tree.branches[1].isFailed = true;

            expect(tree.nextBranch()).to.containSubsetInOrder({
                steps: [ { text: "A" }, { text: "B" }, { text: "E" } ]
            });

            expect(tree.nextBranch()).to.equal(null);
            expect(tree.nextBranch()).to.equal(null);

            delete tree.branches[2].isRunning;
            delete tree.branches[3].isRunning;
            tree.branches[2].isFailed = true;
            tree.branches[3].isPassed = true;

            expect(tree.nextBranch()).to.equal(null);

            delete tree.branches[4].isRunning;
            tree.branches[4].isPassed = true;

            expect(tree.nextBranch()).to.equal(null);
            expect(tree.nextBranch()).to.equal(null);
        });

        it("finds a branch not yet taken, skipping over those with a running branch with the same nonParallelId", function() {
            var tree = new Tree();
            tree.parseIn(`
A - +
    B -
        C -
        D -
        E -

F -

G -
`, "file.txt");

            tree.generateBranches();

            tree.branches[0].isRunning = true;
            tree.branches[0].steps[0].isPassed = true;
            tree.branches[0].steps[1].isRunning = true;

            expect(tree.nextBranch()).to.containSubsetInOrder({
                steps: [ { text: "F" } ]
            });
        });

        it("returns null when no branches are available", function() {
            var tree = new Tree();
            tree.parseIn(`
A - +
    B -
        C -
        D -
        E -
`, "file.txt");

            tree.generateBranches();

            tree.branches[0].isRunning = true;
            tree.branches[0].steps[0].isPassed = true;
            tree.branches[0].steps[1].isRunning = true;

            expect(tree.nextBranch()).to.equal(null);

            tree.branches[0].isPassed = true;
            tree.branches[1].isPassed = true;
            tree.branches[2].isPassed = true;
            delete tree.branches[0].isPassed;
            delete tree.branches[1].isPassed;
            delete tree.branches[2].isPassed;

            expect(tree.nextBranch()).to.equal(null);
        });

        it("returns null on an empty tree", function() {
            tree = new Tree();
            tree.generateBranches();

            expect(tree.nextBranch()).to.equal(null);
        });
    });

    describe("findSimilarBranches()", function() {
        it("handles empty branches", function() {
            var tree = new Tree();

            var branch1 = new Branch();
            var branch2 = new Branch();

            branches = [ branch1, branch2 ];

            var similarBranches = tree.findSimilarBranches(branch1, 1, branches);
            expect(similarBranches).to.have.lengthOf(1);
            expect(similarBranches).to.containSubsetInOrder([
                {
                    steps: []
                }
            ]);
        });

        it("finds similar branches", function() {
            var tree = new Tree();

            var stepA = new Step();
            stepA.text = "A";

            var stepB = new Step();
            stepB.text = "B";

            var stepC = new Step();
            stepC.text = "C";

            var stepD = new Step();
            stepD.text = "D";

            var branch1 = new Branch();
            var branch2 = new Branch();
            var branch3 = new Branch();
            var branch4 = new Branch();

            branch1.steps.push(stepA.cloneForBranch());
            branch1.steps.push(stepB.cloneForBranch());
            branch1.steps.push(stepC.cloneForBranch());
            branch1.steps.push(stepD.cloneForBranch());

            branch2.steps.push(stepA.cloneForBranch());
            branch2.steps.push(stepB.cloneForBranch());
            branch2.steps.push(stepD.cloneForBranch());

            branch3.steps.push(stepA.cloneForBranch());
            branch3.steps.push(stepB.cloneForBranch());
            branch3.steps.push(stepC.cloneForBranch());

            branch4.steps.push(stepC.cloneForBranch());
            branch4.steps.push(stepB.cloneForBranch());
            branch4.steps.push(stepA.cloneForBranch());

            branches = [ branch1, branch2, branch3, branch4 ];

            var similarBranches = tree.findSimilarBranches(branch1, 1, branches);
            expect(similarBranches).to.have.lengthOf(2);
            expect(similarBranches).to.containSubsetInOrder([
                {
                    steps: [ { text: "A" }, { text: "B" }, { text: "D" } ]
                },
                {
                    steps: [ { text: "A" }, { text: "B" }, { text: "C" } ]
                }
            ]);

            similarBranches = tree.findSimilarBranches(branch1, 2, branches);
            expect(similarBranches).to.have.lengthOf(2);
            expect(similarBranches).to.containSubsetInOrder([
                {
                    steps: [ { text: "A" }, { text: "B" }, { text: "D" } ]
                },
                {
                    steps: [ { text: "A" }, { text: "B" }, { text: "C" } ]
                }
            ]);

            similarBranches = tree.findSimilarBranches(branch1, 3, branches);
            expect(similarBranches).to.have.lengthOf(1);
            expect(similarBranches).to.containSubsetInOrder([
                {
                    steps: [ { text: "A" }, { text: "B" }, { text: "C" } ]
                }
            ]);

            similarBranches = tree.findSimilarBranches(branch1, 4, branches);
            expect(similarBranches).to.have.lengthOf(0);

            similarBranches = tree.findSimilarBranches(branch3, 3, branches);
            expect(similarBranches).to.have.lengthOf(1);
            expect(similarBranches).to.containSubsetInOrder([
                {
                    steps: [ { text: "A" }, { text: "B" }, { text: "C" }, { text: "D" } ]
                }
            ]);
        });
    });

    describe("markStep()", function() {
        it("marks a step passed", function() {
            var tree = new Tree();

            var stepA = new Step();
            stepA.text = "A";
            stepA.isRunning = true;

            var stepB = new Step();
            stepB.text = "B";

            var stepC = new Step();
            stepC.text = "C";

            var stepD = new Step();
            stepD.text = "D";

            var branch = new Branch();

            branch.steps = [ stepA, stepB, stepC, stepD ];

            tree.markStep(stepA, branch, true, true);

            expect(branch).to.containSubsetInOrder({
                steps: [
                    { text: "A", isPassed: true, isRunning: true },
                    { text: "B", isPassed: undefined },
                    { text: "C", isPassed: undefined },
                    { text: "D", isPassed: undefined }
                ],
                isPassed: undefined,
                isFailed: undefined
            });
        });

        it("marks a branch passed when the last step is passed", function() {
            var tree = new Tree();

            var stepA = new Step();
            stepA.text = "A";
            stepA.isPassed = true;
            stepA.asExpected = true;

            var stepB = new Step();
            stepB.text = "B";
            stepB.isPassed = true;
            stepB.asExpected = true;

            var stepC = new Step();
            stepC.text = "C";
            stepC.isPassed = true;
            stepC.asExpected = true;

            var stepD = new Step();
            stepD.text = "D";
            stepD.isRunning = true;

            var branch = new Branch();

            branch.steps = [ stepA, stepB, stepC, stepD ];

            tree.markStep(stepD, branch, true, true);

            expect(branch).to.containSubsetInOrder({
                steps: [
                    { text: "A", isPassed: true },
                    { text: "B", isPassed: true },
                    { text: "C", isPassed: true },
                    { text: "D", isPassed: true, asExpected: true, isRunning: true }
                ],
                isPassed: true,
                isFailed: undefined
            });
        });

        it("marks a branch failed when the last step is passed", function() {
            var tree = new Tree();

            var stepA = new Step();
            stepA.text = "A";
            stepA.isPassed = true;
            stepA.asExpected = true;

            var stepB = new Step();
            stepB.text = "B";
            stepB.isFailed = true;
            stepB.asExpected = false;

            var stepC = new Step();
            stepC.text = "C";
            stepC.isPassed = true;
            stepC.asExpected = true;

            var stepD = new Step();
            stepD.text = "D";
            stepD.isRunning = true;

            var branch = new Branch();

            branch.steps = [ stepA, stepB, stepC, stepD ];

            tree.markStep(stepD, branch, true, true);

            expect(branch).to.containSubsetInOrder({
                steps: [
                    { text: "A", isPassed: true },
                    { text: "B", isFailed: true },
                    { text: "C", isPassed: true },
                    { text: "D", isPassed: true, asExpected: true, isRunning: true }
                ],
                isPassed: undefined,
                isFailed: true
            });
        });

        it("marks a step failed and sets its error", function() {
            var tree = new Tree();

            var stepA = new Step();
            stepA.text = "A";
            stepA.isRunning = true;

            var stepB = new Step();
            stepB.text = "B";

            var stepC = new Step();
            stepC.text = "C";

            var stepD = new Step();
            stepD.text = "D";

            var branch = new Branch();

            branch.steps = [ stepA, stepB, stepC, stepD ];

            tree.markStep(stepA, branch, false, false, new Error("foobar"));

            expect(branch).to.containSubsetInOrder({
                steps: [
                    { text: "A", isFailed: true, asExpected: false, isRunning: true },
                    { text: "B", isFailed: undefined },
                    { text: "C", isFailed: undefined },
                    { text: "D", isFailed: undefined }
                ],
                isPassed: undefined,
                isFailed: undefined
            });

            expect(stepA.error.message).to.equal("foobar");
        });

        it("marks a branch failed when the last step is failed", function() {
            var tree = new Tree();

            var stepA = new Step();
            stepA.text = "A";
            stepA.isPassed = true;
            stepA.asExpected = true;

            var stepB = new Step();
            stepB.text = "B";
            stepB.isPassed = true;
            stepB.asExpected = true;

            var stepC = new Step();
            stepC.text = "C";
            stepC.isPassed = true;
            stepC.asExpected = true;

            var stepD = new Step();
            stepD.text = "D";
            stepD.isRunning = true;

            var branch = new Branch();

            branch.steps = [ stepA, stepB, stepC, stepD ];

            tree.markStep(stepD, branch, false, false, new Error("foobar"));

            expect(branch).to.containSubsetInOrder({
                steps: [
                    { text: "A", isFailed: undefined },
                    { text: "B", isFailed: undefined },
                    { text: "C", isFailed: undefined },
                    { text: "D", isFailed: true, asExpected: false, isRunning: true }
                ],
                isPassed: undefined,
                isFailed: true
            });

            expect(stepD.error.message).to.equal("foobar");
        });

        it("marks a branch failed before we reach the last step", function() {
            var tree = new Tree();

            var stepA = new Step();
            stepA.text = "A";
            stepA.isPassed = true;
            stepA.asExpected = true;

            var stepB = new Step();
            stepB.text = "B";
            stepB.isPassed = true;
            stepB.asExpected = true;

            var stepC = new Step();
            stepC.text = "C";
            stepC.isRunning = true;

            var stepD = new Step();
            stepD.text = "D";

            var branch = new Branch();

            branch.steps = [ stepA, stepB, stepC, stepD ];

            tree.markStep(stepC, branch, false, false, new Error("foobar"), true);

            expect(branch).to.containSubsetInOrder({
                steps: [
                    { text: "A", isFailed: undefined },
                    { text: "B", isFailed: undefined },
                    { text: "C", isFailed: true, asExpected: false, isRunning: true },
                    { text: "D", isFailed: undefined }
                ],
                isPassed: undefined,
                isFailed: true
            });

            expect(stepC.error.message).to.equal("foobar");
        });

        it("skips repeat branches", function() {
            var tree = new Tree();

            var stepA = new Step();
            stepA.text = "A";
            stepA.isPassed = true;
            stepA.asExpected = true;

            var stepB = new Step();
            stepB.text = "B";
            stepB.isPassed = true;
            stepB.asExpected = true;

            var stepC = new Step();
            stepC.text = "C";
            stepC.isRunning = true;

            var stepD = new Step();
            stepD.text = "D";

            var branch1 = new Branch();
            var branch2 = new Branch();
            var branch3 = new Branch();
            var branch4 = new Branch();

            branch1.steps = [ stepA, stepB, stepC, stepD ];
            branch2.steps = [ stepA.cloneForBranch(), stepB.cloneForBranch(), stepC.cloneForBranch() ];
            branch3.steps = [ stepA.cloneForBranch(), stepB.cloneForBranch(), stepC.cloneForBranch(), stepB.cloneForBranch() ];
            branch4.steps = [ stepD.cloneForBranch(), stepB.cloneForBranch() ];

            tree.branches = [ branch2, branch1, branch3, branch4 ];

            tree.markStep(stepC, branch1, false, false, new Error("foobar"), true, true);

            expect(branch1).to.containSubsetInOrder({
                steps: [
                    { text: "A", isFailed: undefined },
                    { text: "B", isFailed: undefined },
                    { text: "C", isFailed: true, asExpected: false, isRunning: true },
                    { text: "D", isFailed: undefined }
                ],
                isPassed: undefined,
                isFailed: true
            });

            expect(stepC.error.message).to.equal("foobar");

            expect(branch2.isSkipped).to.equal(true);
            expect(branch3.isSkipped).to.equal(true);
            expect(branch4.isSkipped).to.equal(undefined);

            expect(branch2.log).to.equal("Branch skipped because it is identical to an earlier branch that ran and failed\n");
            expect(branch3.log).to.equal("Branch skipped because it is identical to an earlier branch that ran and failed\n");
            expect(branch4.log).to.equal(undefined);
        });

        it("doesn't skip a repeat branch if it's currently running", function() {
            var tree = new Tree();

            var stepA = new Step();
            stepA.text = "A";
            stepA.isPassed = true;
            stepA.asExpected = true;

            var stepB = new Step();
            stepB.text = "B";
            stepB.isPassed = true;
            stepB.asExpected = true;

            var stepC = new Step();
            stepC.text = "C";
            stepC.isRunning = true;

            var stepD = new Step();
            stepD.text = "D";

            var branch1 = new Branch();
            var branch2 = new Branch();
            var branch3 = new Branch();
            var branch4 = new Branch();

            branch1.steps = [ stepA, stepB, stepC, stepD ];
            branch2.steps = [ stepA.cloneForBranch(), stepB.cloneForBranch(), stepC.cloneForBranch() ];
            branch3.steps = [ stepA.cloneForBranch(), stepB.cloneForBranch(), stepC.cloneForBranch(), stepB.cloneForBranch() ];
            branch4.steps = [ stepD.cloneForBranch(), stepB.cloneForBranch() ];

            branch3.isRunning = true;

            tree.branches = [ branch2, branch1, branch3, branch4 ];

            tree.markStep(stepC, branch1, false, false, new Error("foobar"), true, true);

            expect(branch1).to.containSubsetInOrder({
                steps: [
                    { text: "A", isFailed: undefined },
                    { text: "B", isFailed: undefined },
                    { text: "C", isFailed: true, asExpected: false, isRunning: true },
                    { text: "D", isFailed: undefined }
                ],
                isPassed: undefined,
                isFailed: true
            });

            expect(stepC.error.message).to.equal("foobar");

            expect(branch2.isSkipped).to.equal(true);
            expect(branch3.isSkipped).to.equal(undefined);
            expect(branch4.isSkipped).to.equal(undefined);

            expect(branch2.log).to.equal("Branch skipped because it is identical to an earlier branch that ran and failed\n");
            expect(branch3.log).to.equal(undefined);
            expect(branch4.log).to.equal(undefined);
        });

        it("doesn't skip a repeat branch if it already ran", function() {
            var tree = new Tree();

            var stepA = new Step();
            stepA.text = "A";
            stepA.isPassed = true;
            stepA.asExpected = true;

            var stepB = new Step();
            stepB.text = "B";
            stepB.isPassed = true;
            stepB.asExpected = true;

            var stepC = new Step();
            stepC.text = "C";
            stepC.isRunning = true;

            var stepD = new Step();
            stepD.text = "D";

            var branch1 = new Branch();
            var branch2 = new Branch();
            var branch3 = new Branch();
            var branch4 = new Branch();

            branch1.steps = [ stepA, stepB, stepC, stepD ];
            branch2.steps = [ stepA.cloneForBranch(), stepB.cloneForBranch(), stepC.cloneForBranch() ];
            branch3.steps = [ stepA.cloneForBranch(), stepB.cloneForBranch(), stepC.cloneForBranch(), stepB.cloneForBranch() ];
            branch4.steps = [ stepD.cloneForBranch(), stepB.cloneForBranch() ];

            branch3.isPassed = true;

            tree.branches = [ branch2, branch1, branch3, branch4 ];

            tree.markStep(stepC, branch1, false, false, new Error("foobar"), true, true);

            expect(branch1).to.containSubsetInOrder({
                steps: [
                    { text: "A", isFailed: undefined },
                    { text: "B", isFailed: undefined },
                    { text: "C", isFailed: true, asExpected: false, isRunning: true },
                    { text: "D", isFailed: undefined }
                ],
                isPassed: undefined,
                isFailed: true
            });

            expect(stepC.error.message).to.equal("foobar");

            expect(branch2.isSkipped).to.equal(true);
            expect(branch3.isSkipped).to.equal(undefined);
            expect(branch4.isSkipped).to.equal(undefined);

            expect(branch2.log).to.equal("Branch skipped because it is identical to an earlier branch that ran and failed\n");
            expect(branch3.log).to.equal(undefined);
            expect(branch4.log).to.equal(undefined);
        });
    });

    describe("nextStep()", function() {
        it("returns null if the branch failed or skipped", function() {
            var tree = new Tree();
            var branch = new Branch();
            tree.branches = [ branch ];

            branch.isFailed = true;

            expect(tree.nextStep(branch, false, false)).to.equal(null);

            delete branch.isFailed;
            branch.isSkipped = true;

            expect(tree.nextStep(branch, false, false)).to.equal(null);
        });

        it("returns the first step if nothing is running yet, without advancing", function() {
            var tree = new Tree();

            var stepA = new Step();
            stepA.text = "A";

            var stepB = new Step();
            stepB.text = "B";

            var stepC = new Step();
            stepC.text = "C";

            var stepD = new Step();
            stepD.text = "D";

            var branch = new Branch();
            branch.steps = [ stepA, stepB, stepC, stepD ];

            tree.branches = [ branch ];

            expect(tree.nextStep(branch, false, false)).to.containSubsetInOrder({
                text: "A",
                isRunning: undefined
            });
        });

        it("returns the next step if one is currently running, without advancing", function() {
            var tree = new Tree();

            var stepA = new Step();
            stepA.text = "A";
            stepA.isRunning = true;

            var stepB = new Step();
            stepB.text = "B";

            var stepC = new Step();
            stepC.text = "C";

            var stepD = new Step();
            stepD.text = "D";

            var branch = new Branch();
            branch.steps = [ stepA, stepB, stepC, stepD ];

            tree.branches = [ branch ];

            expect(tree.nextStep(branch, false, false)).to.containSubsetInOrder({
                text: "B",
                isRunning: undefined
            });

            expect(stepA).to.containSubsetInOrder({
                text: "A",
                isRunning: true
            });
        });

        it("returns null if the last step is currently running, without advancing", function() {
            var tree = new Tree();

            var stepA = new Step();
            stepA.text = "A";

            var stepB = new Step();
            stepB.text = "B";

            var stepC = new Step();
            stepC.text = "C";

            var stepD = new Step();
            stepD.text = "D";
            stepD.isRunning = true;

            var branch = new Branch();
            branch.steps = [ stepA, stepB, stepC, stepD ];

            tree.branches = [ branch ];

            expect(tree.nextStep(branch, false, false)).to.equal(null);

            expect(stepD).to.containSubsetInOrder({
                text: "D",
                isRunning: true
            });
        });

        it("returns the first step if nothing is running yet, with advancing", function() {
            var tree = new Tree();

            var stepA = new Step();
            stepA.text = "A";

            var stepB = new Step();
            stepB.text = "B";

            var stepC = new Step();
            stepC.text = "C";

            var stepD = new Step();
            stepD.text = "D";

            var branch = new Branch();
            branch.steps = [ stepA, stepB, stepC, stepD ];

            tree.branches = [ branch ];

            expect(tree.nextStep(branch, true, false)).to.containSubsetInOrder({
                text: "A",
                isRunning: true
            });
        });

        it("returns the next step if one is currently running, with advancing", function() {
            var tree = new Tree();

            var stepA = new Step();
            stepA.text = "A";
            stepA.isRunning = true;

            var stepB = new Step();
            stepB.text = "B";

            var stepC = new Step();
            stepC.text = "C";

            var stepD = new Step();
            stepD.text = "D";

            var branch = new Branch();
            branch.steps = [ stepA, stepB, stepC, stepD ];

            tree.branches = [ branch ];

            expect(tree.nextStep(branch, true, false)).to.containSubsetInOrder({
                text: "B",
                isRunning: true
            });

            expect(stepA).to.containSubsetInOrder({
                text: "A",
                isRunning: undefined
            });
        });

        it("returns null if the last step is currently running, with advancing", function() {
            var tree = new Tree();

            var stepA = new Step();
            stepA.text = "A";

            var stepB = new Step();
            stepB.text = "B";

            var stepC = new Step();
            stepC.text = "C";

            var stepD = new Step();
            stepD.text = "D";
            stepD.isRunning = true;

            var branch = new Branch();
            branch.steps = [ stepA, stepB, stepC, stepD ];

            tree.branches = [ branch ];

            expect(tree.nextStep(branch, true, false)).to.equal(null);

            expect(stepD).to.containSubsetInOrder({
                text: "D",
                isRunning: undefined
            });
        });

        it("ends the branch if the next step is an -M", function() {
            var tree = new Tree();

            var stepA = new Step();
            stepA.text = "A";
            stepA.isPassed = true;
            stepA.asExpected = true;

            var stepB = new Step();
            stepB.text = "B";
            stepB.isPassed = true;
            stepB.asExpected = true;
            stepB.isRunning = true;

            var stepC = new Step();
            stepC.text = "C";
            stepC.isManual = true;

            var stepD = new Step();
            stepD.text = "D";

            var branch1 = new Branch();
            var branch2 = new Branch();
            var branch3 = new Branch();
            var branch4 = new Branch();

            branch1.steps = [ stepA, stepB, stepC, stepD ];
            branch2.steps = [ stepA.cloneForBranch(), stepB.cloneForBranch(), stepC.cloneForBranch() ];
            branch3.steps = [ stepA.cloneForBranch(), stepB.cloneForBranch(), stepC.cloneForBranch(), stepB.cloneForBranch() ];
            branch4.steps = [ stepD.cloneForBranch(), stepB.cloneForBranch() ];

            tree.branches = [ branch2, branch1, branch3, branch4 ];

            expect(tree.nextStep(branch1, true, false)).to.equal(null);

            expect(stepB).to.containSubsetInOrder({
                text: "B",
                isRunning: undefined
            });

            expect(stepC).to.containSubsetInOrder({
                text: "C",
                isRunning: undefined
            });

            expect(branch1.isPassed).to.equal(true);
            expect(branch1.isSkipped).to.equal(undefined);
            expect(branch2.isSkipped).to.equal(undefined);
            expect(branch3.isSkipped).to.equal(undefined);
            expect(branch4.isSkipped).to.equal(undefined);
        });

        it("ends the branch if the next step is a -T", function() {
            var tree = new Tree();

            var stepA = new Step();
            stepA.text = "A";
            stepA.isPassed = true;
            stepA.asExpected = true;

            var stepB = new Step();
            stepB.text = "B";
            stepB.isPassed = true;
            stepB.asExpected = true;
            stepB.isRunning = true;

            var stepC = new Step();
            stepC.text = "C";
            stepC.isToDo = true;

            var stepD = new Step();
            stepD.text = "D";

            var branch1 = new Branch();
            var branch2 = new Branch();
            var branch3 = new Branch();
            var branch4 = new Branch();

            branch1.steps = [ stepA, stepB, stepC, stepD ];
            branch2.steps = [ stepA.cloneForBranch(), stepB.cloneForBranch(), stepC.cloneForBranch() ];
            branch3.steps = [ stepA.cloneForBranch(), stepB.cloneForBranch(), stepC.cloneForBranch(), stepB.cloneForBranch() ];
            branch4.steps = [ stepD.cloneForBranch(), stepB.cloneForBranch() ];

            tree.branches = [ branch2, branch1, branch3, branch4 ];

            expect(tree.nextStep(branch1, true, false)).to.equal(null);

            expect(stepB).to.containSubsetInOrder({
                text: "B",
                isRunning: undefined
            });

            expect(stepC).to.containSubsetInOrder({
                text: "C",
                isRunning: undefined
            });

            expect(branch1.isPassed).to.equal(true);
            expect(branch1.isSkipped).to.equal(undefined);
            expect(branch2.isSkipped).to.equal(undefined);
            expect(branch3.isSkipped).to.equal(undefined);
            expect(branch4.isSkipped).to.equal(undefined);
        });

        it("skips repeat branches and end this branch if next step is an -M", function() {
            var tree = new Tree();

            var stepA = new Step();
            stepA.text = "A";
            stepA.isPassed = true;
            stepA.asExpected = true;

            var stepB = new Step();
            stepB.text = "B";
            stepB.isPassed = true;
            stepB.asExpected = true;
            stepB.isRunning = true;

            var stepC = new Step();
            stepC.text = "C";
            stepC.isManual = true;

            var stepD = new Step();
            stepD.text = "D";

            var branch1 = new Branch();
            var branch2 = new Branch();
            var branch3 = new Branch();
            var branch4 = new Branch();

            branch1.steps = [ stepA, stepB, stepC, stepD ];
            branch2.steps = [ stepA.cloneForBranch(), stepB.cloneForBranch(), stepC.cloneForBranch() ];
            branch3.steps = [ stepA.cloneForBranch(), stepB.cloneForBranch(), stepC.cloneForBranch(), stepB.cloneForBranch() ];
            branch4.steps = [ stepD.cloneForBranch(), stepB.cloneForBranch() ];

            tree.branches = [ branch2, branch1, branch3, branch4 ];

            expect(tree.nextStep(branch1, true, true)).to.equal(null);

            expect(stepB).to.containSubsetInOrder({
                text: "B",
                isRunning: undefined
            });

            expect(stepC).to.containSubsetInOrder({
                text: "C",
                isRunning: undefined
            });

            expect(branch1.isPassed).to.equal(true);
            expect(branch1.isSkipped).to.equal(undefined);
            expect(branch2.isSkipped).to.equal(true);
            expect(branch3.isSkipped).to.equal(true);
            expect(branch4.isSkipped).to.equal(undefined);

            expect(branch1.log).to.equal(undefined);
            expect(branch2.log).to.equal("Branch skipped because it is identical to an earlier branch, up to the -M step\n");
            expect(branch3.log).to.equal("Branch skipped because it is identical to an earlier branch, up to the -M step\n");
            expect(branch4.log).to.equal(undefined);
        });

        it("skips repeat branches and end this branch if next step is a -T", function() {
            var tree = new Tree();

            var stepA = new Step();
            stepA.text = "A";
            stepA.isPassed = true;
            stepA.asExpected = true;

            var stepB = new Step();
            stepB.text = "B";
            stepB.isPassed = true;
            stepB.asExpected = true;
            stepB.isRunning = true;

            var stepC = new Step();
            stepC.text = "C";
            stepC.isToDo = true;

            var stepD = new Step();
            stepD.text = "D";

            var branch1 = new Branch();
            var branch2 = new Branch();
            var branch3 = new Branch();
            var branch4 = new Branch();

            branch1.steps = [ stepA, stepB, stepC, stepD ];
            branch2.steps = [ stepA.cloneForBranch(), stepB.cloneForBranch(), stepC.cloneForBranch() ];
            branch3.steps = [ stepA.cloneForBranch(), stepB.cloneForBranch(), stepC.cloneForBranch(), stepB.cloneForBranch() ];
            branch4.steps = [ stepD.cloneForBranch(), stepB.cloneForBranch() ];

            tree.branches = [ branch2, branch1, branch3, branch4 ];

            expect(tree.nextStep(branch1, true, true)).to.equal(null);

            expect(stepB).to.containSubsetInOrder({
                text: "B",
                isRunning: undefined
            });

            expect(stepC).to.containSubsetInOrder({
                text: "C",
                isRunning: undefined
            });

            expect(branch1.isPassed).to.equal(true);
            expect(branch1.isSkipped).to.equal(undefined);
            expect(branch2.isSkipped).to.equal(true);
            expect(branch3.isSkipped).to.equal(true);
            expect(branch4.isSkipped).to.equal(undefined);

            expect(branch1.log).to.equal(undefined);
            expect(branch2.log).to.equal("Branch skipped because it is identical to an earlier branch, up to the -T step\n");
            expect(branch3.log).to.equal("Branch skipped because it is identical to an earlier branch, up to the -T step\n");
            expect(branch4.log).to.equal(undefined);
        });

        it("doesn't skips repeat branches if the next step isn't an -M or -T", function() {
            var tree = new Tree();

            var stepA = new Step();
            stepA.text = "A";
            stepA.isPassed = true;
            stepA.asExpected = true;

            var stepB = new Step();
            stepB.text = "B";
            stepB.isPassed = true;
            stepB.asExpected = true;
            stepB.isRunning = true;

            var stepC = new Step();
            stepC.text = "C";

            var stepD = new Step();
            stepD.text = "D";

            var branch1 = new Branch();
            var branch2 = new Branch();
            var branch3 = new Branch();
            var branch4 = new Branch();

            branch1.steps = [ stepA, stepB, stepC, stepD ];
            branch2.steps = [ stepA.cloneForBranch(), stepB.cloneForBranch(), stepC.cloneForBranch() ];
            branch3.steps = [ stepA.cloneForBranch(), stepB.cloneForBranch(), stepC.cloneForBranch(), stepB.cloneForBranch() ];
            branch4.steps = [ stepD.cloneForBranch(), stepB.cloneForBranch() ];

            tree.branches = [ branch2, branch1, branch3, branch4 ];

            expect(tree.nextStep(branch1, true, true)).to.containSubsetInOrder({
                text: "C",
                isRunning: true
            });

            expect(stepB).to.containSubsetInOrder({
                text: "B",
                isRunning: undefined
            });

            expect(branch2.isSkipped).to.equal(undefined);
            expect(branch3.isSkipped).to.equal(undefined);
            expect(branch4.isSkipped).to.equal(undefined);
        });

        it("doesn't skip a repeat branch if it's currently running", function() {
            var tree = new Tree();

            var stepA = new Step();
            stepA.text = "A";
            stepA.isPassed = true;
            stepA.asExpected = true;

            var stepB = new Step();
            stepB.text = "B";
            stepB.isPassed = true;
            stepB.asExpected = true;
            stepB.isRunning = true;

            var stepC = new Step();
            stepC.text = "C";
            stepC.isToDo = true;

            var stepD = new Step();
            stepD.text = "D";

            var branch1 = new Branch();
            var branch2 = new Branch();
            var branch3 = new Branch();
            var branch4 = new Branch();

            branch1.steps = [ stepA, stepB, stepC, stepD ];
            branch2.steps = [ stepA.cloneForBranch(), stepB.cloneForBranch(), stepC.cloneForBranch() ];
            branch3.steps = [ stepA.cloneForBranch(), stepB.cloneForBranch(), stepC.cloneForBranch(), stepB.cloneForBranch() ];
            branch4.steps = [ stepD.cloneForBranch(), stepB.cloneForBranch() ];

            branch2.isRunning = true;

            tree.branches = [ branch2, branch1, branch3, branch4 ];

            expect(tree.nextStep(branch1, true, true)).to.equal(null);

            expect(stepB).to.containSubsetInOrder({
                text: "B",
                isRunning: undefined
            });

            expect(branch1.isPassed).to.equal(true);
            expect(branch1.isSkipped).to.equal(undefined);
            expect(branch2.isSkipped).to.equal(undefined);
            expect(branch3.isSkipped).to.equal(true);
            expect(branch4.isSkipped).to.equal(undefined);

            expect(branch1.log).to.equal(undefined);
            expect(branch2.log).to.equal(undefined);
            expect(branch3.log).to.equal("Branch skipped because it is identical to an earlier branch, up to the -T step\n");
            expect(branch4.log).to.equal(undefined);
        });

        it("doesn't skip a repeat branch if it already ran", function() {
            var tree = new Tree();

            var stepA = new Step();
            stepA.text = "A";
            stepA.isPassed = true;
            stepA.asExpected = true;

            var stepB = new Step();
            stepB.text = "B";
            stepB.isPassed = true;
            stepB.asExpected = true;
            stepB.isRunning = true;

            var stepC = new Step();
            stepC.text = "C";
            stepC.isToDo = true;

            var stepD = new Step();
            stepD.text = "D";

            var branch1 = new Branch();
            var branch2 = new Branch();
            var branch3 = new Branch();
            var branch4 = new Branch();

            branch1.steps = [ stepA, stepB, stepC, stepD ];
            branch2.steps = [ stepA.cloneForBranch(), stepB.cloneForBranch(), stepC.cloneForBranch() ];
            branch3.steps = [ stepA.cloneForBranch(), stepB.cloneForBranch(), stepC.cloneForBranch(), stepB.cloneForBranch() ];
            branch4.steps = [ stepD.cloneForBranch(), stepB.cloneForBranch() ];

            branch2.isFailed = true;

            tree.branches = [ branch2, branch1, branch3, branch4 ];

            expect(tree.nextStep(branch1, true, true)).to.equal(null);

            expect(stepB).to.containSubsetInOrder({
                text: "B",
                isRunning: undefined
            });

            expect(branch1.isPassed).to.equal(true);
            expect(branch1.isSkipped).to.equal(undefined);
            expect(branch2.isSkipped).to.equal(undefined);
            expect(branch3.isSkipped).to.equal(true);
            expect(branch4.isSkipped).to.equal(undefined);

            expect(branch1.log).to.equal(undefined);
            expect(branch2.log).to.equal(undefined);
            expect(branch3.log).to.equal("Branch skipped because it is identical to an earlier branch, up to the -T step\n");
            expect(branch4.log).to.equal(undefined);
        });
    });
});
