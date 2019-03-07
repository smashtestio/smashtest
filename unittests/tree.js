const chai = require('chai');
const chaiSubset = require('chai-subset');
const chaiSubsetInOrder = require('chai-subset-in-order');
const expect = chai.expect;
const assert = chai.assert;
const util = require('util');
const utils = require('../utils.js');
const Tree = require('../tree.js');

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
            assert.throws(() => { tree.numIndents('\tblah', 'file.txt', 10); });
            assert.throws(() => { tree.numIndents(' \tblah', 'file.txt', 10); });
        });

        it("throws an exception for a number of spaces not a multiple of 4", function() {
            assert.throws(() => { tree.numIndents(' blah', 'file.txt', 10); });
            assert.throws(() => { tree.numIndents('  blah', 'file.txt', 10); });
            assert.throws(() => { tree.numIndents('   blah', 'file.txt', 10); });
            assert.throws(() => { tree.numIndents('     blah', 'file.txt', 10); });
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
            assert.equal(step.isStepByStepDebug, undefined);
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
            });

            assert.throws(() => {
                tree.parseLine(`32, 4798`, "file.txt", 10);
            });

            assert.throws(() => {
                tree.parseLine(`...`, "file.txt", 10);
            });
        });

        it("throws an error if a step has the name of a hook function declaration", function() {
            assert.throws(() => {
                tree.parseLine(`After Every Branch`, "file.txt", 10);
            });

            assert.throws(() => {
                tree.parseLine(`  before   Everything  `, "file.txt", 10);
            });

            assert.throws(() => {
                tree.parseLine(` AFTER EVERYTHING `, "file.txt", 10);
            });
        });

        it("parses a line with a {variable}", function() {
            var step = tree.parseLine(`Click {Big Red Button}`, "file.txt", 10);
            assert.equal(step.line, `Click {Big Red Button}`);
            assert.equal(step.text, `Click {Big Red Button}`);
            assert.equal(step.identifiers, undefined);
            assert.equal(step.codeBlock, undefined);
            assert.equal(step.varsBeingSet, undefined);
            assert.deepEqual(step.varsList, [ {name: "Big Red Button", isLocal: false} ]);
        });

        it("parses a line with a {{local variable}}", function() {
            var step = tree.parseLine(`Click {{Big Red Button}}`, "file.txt", 10);
            assert.equal(step.line, `Click {{Big Red Button}}`);
            assert.equal(step.text, `Click {{Big Red Button}}`);
            assert.equal(step.identifiers, undefined);
            assert.equal(step.codeBlock, undefined);
            assert.equal(step.varsBeingSet, undefined);
            assert.deepEqual(step.varsList, [ {name: "Big Red Button", isLocal: true} ]);
        });

        it("parses a line with multiple variables and whitespace", function() {
            var step = tree.parseLine(`    Click {{Big}} {Red} 'dazzling' {{Button}} `, "file.txt", 10);
            assert.equal(step.line, `    Click {{Big}} {Red} 'dazzling' {{Button}} `);
            assert.equal(step.text, `Click {{Big}} {Red} 'dazzling' {{Button}}`);
            assert.equal(step.identifiers, undefined);
            assert.equal(step.codeBlock, undefined);
            assert.equal(step.varsBeingSet, undefined);
            assert.deepEqual(step.varsList, [ {name: "Big", isLocal: true}, {name: "Red", isLocal: false}, {name: "Button", isLocal: true} ]);
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
            });

            assert.throws(() => {
                tree.parseLine(`* Something "quote" something else`, "file.txt", 10);
            });
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
            });

            assert.throws(() => {
                tree.parseLine(`    * Something - + {`, "file.txt", 10);
            });
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
            var step = tree.parseLine(`Execute  in browser  + { `, "file.txt", 10);
            assert.equal(step.text, `Execute  in browser`);
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
            assert.equal(step.isTextualStep, undefined);

            step = tree.parseLine(`Click {button} + -T ~`, "file.txt", 10);
            assert.equal(step.text, `Click {button}`);
            assert.equal(step.isToDo, true);
            assert.equal(step.isTextualStep, undefined);
        });

        it("parses the manual identifier (-M)", function() {
            var step = tree.parseLine(`Click {button} -M`, "file.txt", 10);
            assert.equal(step.text, `Click {button}`);
            assert.equal(step.isManual, true);
            assert.equal(step.isTextualStep, undefined);

            step = tree.parseLine(`Click {button} + -M ~`, "file.txt", 10);
            assert.equal(step.text, `Click {button}`);
            assert.equal(step.isManual, true);
            assert.equal(step.isTextualStep, undefined);
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
            assert.equal(step.isStepByStepDebug, undefined);

            step = tree.parseLine(`Click {button} + ~`, "file.txt", 10);
            assert.equal(step.text, `Click {button}`);
            assert.equal(step.isDebug, true);
            assert.equal(step.isStepByStepDebug, undefined);
        });

        it("parses the step-by-step debug identifier (~~)", function() {
            var step = tree.parseLine(`Click {button} ~~`, "file.txt", 10);
            assert.equal(step.text, `Click {button}`);
            assert.equal(step.isDebug, undefined);
            assert.equal(step.isStepByStepDebug, true);

            step = tree.parseLine(`Click {button} + ~~`, "file.txt", 10);
            assert.equal(step.text, `Click {button}`);
            assert.equal(step.isDebug, undefined);
            assert.equal(step.isStepByStepDebug, true);
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

        it("parses {var} = Function", function() {
            var step = tree.parseLine(`{var} = Click 'something' {blah}`, "file.txt", 10);
            assert.equal(step.text, `{var} = Click 'something' {blah}`);
            assert.equal(step.isFunctionCall, true);
            assert.deepEqual(step.varsBeingSet, [ {name: "var", value: "Click 'something' {blah}", isLocal: false} ]);
            assert.deepEqual(step.varsList, [ {name: "var", isLocal: false}, {name: "blah", isLocal: false} ]);

            step = tree.parseLine(`    {var with spaces}  = Click 'something' {{blah}}`, "file.txt", 10);
            assert.equal(step.text, `{var with spaces}  = Click 'something' {{blah}}`);
            assert.equal(step.isFunctionCall, true);
            assert.deepEqual(step.varsBeingSet, [ {name: "var with spaces", value: "Click 'something' {{blah}}", isLocal: false} ]);
            assert.deepEqual(step.varsList, [ {name: "var with spaces", isLocal: false}, {name: "blah", isLocal: true} ]);
        });

        it("parses {var} = Code Block Function {", function() {
            var step = tree.parseLine(`{var} = Code Block Function {`, "file.txt", 10);
            assert.equal(step.text, `{var} = Code Block Function`);
            assert.equal(step.isFunctionCall, undefined);
            assert.equal(step.isTextualStep, undefined);
            assert.deepEqual(step.varsBeingSet, [ {name: "var", value: "Code Block Function", isLocal: false} ]);
            assert.deepEqual(step.varsList, [ {name: "var", isLocal: false} ]);
        });

        it("rejects {var} = Textual Function -", function() {
            assert.throws(() => {
                tree.parseLine(`{var} = Textual Function -`, "file.txt", 10);
            });
        });

        it("rejects {var} = only numbers, periods, or commas", function() {
            assert.throws(() => {
                tree.parseLine(`{var} =324798`, "file.txt", 10);
            });

            assert.throws(() => {
                tree.parseLine(`{var} = 32, 4798`, "file.txt", 10);
            });

            assert.throws(() => {
                tree.parseLine(`{var}=...`, "file.txt", 10);
            });
        });

        it("parses {var} = 'string'", function() {
            step = tree.parseLine(`{var} = 'foo'`, "file.txt", 10);
            assert.equal(step.text, `{var} = 'foo'`);
            assert.equal(step.isFunctionCall, undefined);
            assert.deepEqual(step.varsBeingSet, [ {name: "var", value: "'foo'", isLocal: false} ]);
            assert.deepEqual(step.varsList, [ {name: "var", isLocal: false} ]);
        });

        it("parses {{var}} = Function", function() {
            var step = tree.parseLine(`{{var}} = Click 'something' { blah }`, "file.txt", 10);
            assert.equal(step.text, `{{var}} = Click 'something' { blah }`);
            assert.equal(step.isFunctionCall, true);
            assert.deepEqual(step.varsBeingSet, [ {name: "var", value: "Click 'something' { blah }", isLocal: true} ]);
            assert.deepEqual(step.varsList, [ {name: "var", isLocal: true}, {name: "blah", isLocal: false} ]);

            step = tree.parseLine(`    {{ var with spaces  }} =  Click 'something' {{blah}}`, "file.txt", 10);
            assert.equal(step.text, `{{ var with spaces  }} =  Click 'something' {{blah}}`);
            assert.equal(step.isFunctionCall, true);
            assert.deepEqual(step.varsBeingSet, [ {name: "var with spaces", value: "Click 'something' {{blah}}", isLocal: true} ]);
            assert.deepEqual(step.varsList, [ {name: "var with spaces", isLocal: true}, {name: "blah", isLocal: true} ]);

            step = tree.parseLine(`{{var}} = Click 'something \\\\ \'' "something2 \"" {blah} {{blah2}}`, "file.txt", 10);
            assert.equal(step.isFunctionCall, true);
            assert.deepEqual(step.varsBeingSet, [ {name: "var", value: `Click 'something \\\\ \'' "something2 \"" {blah} {{blah2}}`, isLocal: true} ]);
            assert.deepEqual(step.varsList, [ {name: "var", isLocal: true}, {name: "blah", isLocal: false}, {name: "blah2", isLocal: true} ]);
        });

        it("parses {{var}} = 'string'", function() {
            step = tree.parseLine(`{{var}} = 'foo \\\''`, "file.txt", 10);
            assert.equal(step.text, `{{var}} = 'foo \\\''`);
            assert.equal(step.isFunctionCall, undefined);
            assert.deepEqual(step.varsBeingSet, [ {name: "var", value: "'foo \\\''", isLocal: true} ]);
            assert.deepEqual(step.varsList, [ {name: "var", isLocal: true} ]);
        });

        it("parses multiple {var} = 'string literal', separated by commas", function() {
            var step = tree.parseLine(`{var1} = 'one', {{var2}}='two 2', {var 3}= "three 3" +`, "file.txt", 10);
            assert.equal(step.text, `{var1} = 'one', {{var2}}='two 2', {var 3}= "three 3"`);
            assert.equal(step.isFunctionCall, undefined);
            assert.deepEqual(step.varsBeingSet, [ {name: "var1", value: "'one'", isLocal: false}, {name: "var2", value: "'two 2'", isLocal: true}, {name: "var 3", value: "\"three 3\"", isLocal: false} ]);
            assert.deepEqual(step.varsList, [ {name: "var1", isLocal: false}, {name: "var2", isLocal: true}, {name: "var 3", isLocal: false} ]);
        });

        it("doesn't recognize {vars} with backslashes in their names", function() {
            var step = tree.parseLine(`{var\\} = Click 'something \\{blah\\}' {foo}`, "file.txt", 10);
            assert.equal(step.text, `{var\\} = Click 'something \\{blah\\}' {foo}`);
            assert.equal(step.varsBeingSet, undefined);
            assert.deepEqual(step.varsList, [ {name: "foo", isLocal: false} ]);
        });

        it("rejects {vars} with only numbers in their names", function() {
            assert.throws(() => {
                tree.parseLine(`{23} = 'str'`, "file.txt", 10);
            });

            assert.throws(() => {
                tree.parseLine(`{234 23432} = 'str'`, "file.txt", 10);
            });

            assert.throws(() => {
                tree.parseLine(`{  435 4545    } = 'str'`, "file.txt", 10);
            });
        });

        it("rejects {Frequency}", function() {
            assert.throws(() => {
                tree.parseLine(`{Frequency} = 'high'`, "file.txt", 10);
            });
        });

        it("rejects {{frequency}}", function() {
            assert.throws(() => {
                tree.parseLine(`{{frequency}} = 'high'`, "file.txt", 10);
            });
        });

        it("rejects {frequency} not set to high/med/low", function() {
            assert.throws(() => {
                tree.parseLine(`{frequency} = 'blah'`, "file.txt", 10);
            });

            assert.throws(() => {
                tree.parseLine(`{frequency} = Function`, "file.txt", 10);
            });
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
            });
        });

        it("rejects {{group}}", function() {
            assert.throws(() => {
                tree.parseLine(`{{group}} = 'foobar'`, "file.txt", 10);
            });
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
            var step = tree.parseLine(`Click ['Login' box]`, "file.txt", 10);
            assert.equal(step.text, `Click ['Login' box]`);
            assert.equal(step.varsBeingSet, undefined);
            assert.deepEqual(step.elementFinderList, [ {name: "'Login' box", elementFinder: {text: 'Login', variable: 'box'}} ]);

            step = tree.parseLine(`Click ['Login']`, "file.txt", 10);
            assert.equal(step.text, `Click ['Login']`);
            assert.equal(step.varsBeingSet, undefined);
            assert.deepEqual(step.elementFinderList, [ {name: "'Login'", elementFinder: {text: 'Login'}} ]);

            step = tree.parseLine(`Click [ 4th 'Login' box  next to  "blah" ]`, "file.txt", 10);
            assert.equal(step.text, `Click [ 4th 'Login' box  next to  "blah" ]`);
            assert.equal(step.varsBeingSet, undefined);
            assert.deepEqual(step.elementFinderList, [ {name: "4th 'Login' box  next to  \"blah\"", elementFinder: {ordinal: 4, text: 'Login', variable: 'box', nextTo: 'blah'}} ]);

            step = tree.parseLine(`Click [ 'Login' next to "blah" ]`, "file.txt", 10);
            assert.equal(step.text, `Click [ 'Login' next to "blah" ]`);
            assert.equal(step.varsBeingSet, undefined);
            assert.deepEqual(step.elementFinderList, [ {name: "'Login' next to \"blah\"", elementFinder: {text: 'Login', nextTo: 'blah'}} ]);

            step = tree.parseLine(`Click [box next to "blah"]`, "file.txt", 10);
            assert.equal(step.text, `Click [box next to "blah"]`);
            assert.equal(step.varsBeingSet, undefined);
            assert.deepEqual(step.elementFinderList, [ {name: "box next to \"blah\"", elementFinder: {variable: 'box', nextTo: 'blah'}} ]);

            step = tree.parseLine(`Click ['Login'] and [ 4th 'Login' box  next to  "blah" ]`, "file.txt", 10);
            assert.equal(step.text, `Click ['Login'] and [ 4th 'Login' box  next to  "blah" ]`);
            assert.equal(step.varsBeingSet, undefined);
            assert.deepEqual(step.elementFinderList, [ {name: "'Login'", elementFinder: {text: 'Login'}}, {name: "4th 'Login' box  next to  \"blah\"", elementFinder: {ordinal: 4, text: 'Login', variable: 'box', nextTo: 'blah'}} ]);
        });

        it("throws an error when a [bracketed string] is not a valid elementFinder", function() {
            assert.throws(() => {
                tree.parseLine(`Something [next to 'something']`, "file.txt", 10);
            });
        });

        it("lists {vars} contained inside 'string literals'", function() {
            var step = tree.parseLine(`Click {var1} "something {var2} {{var3}} foo" '{var4}'`, "file.txt", 10);
            assert.equal(step.text, `Click {var1} "something {var2} {{var3}} foo" '{var4}'`);
            assert.equal(step.varsBeingSet, undefined);
            assert.deepEqual(step.varsList, [ {name: "var1", isLocal: false}, {name: "var2", isLocal: false}, {name: "var3", isLocal: true}, {name: "var4", isLocal: false} ]);
        });

        it("throws an error when multiple {vars} are set in a line, and one of them is not a 'string literal'", function() {
            assert.throws(() => {
                tree.parseLine(`{var1} = 'one', {{var2}}=Some step here, {var 3}= "three 3" +`, "file.txt", 10);
            });
        });

        it("throws an error when a function declaration contains {non-local variables}", function() {
            assert.throws(() => {
                tree.parseLine(`* Function {one} and {{two}}`, "file.txt", 10);
            });

            assert.throws(() => {
                tree.parseLine(`{var1}='str1', {var2}='str2', Invalid stuff here`, "file.txt", 10);
            });
        });

        it("throws an error when a step sets a variable and is a function declaration", function() {
            assert.throws(() => {
                tree.parseLine(`* {var}='str'`, "file.txt", 10);
            });

            assert.throws(() => {
                tree.parseLine(`  * Function {var}='str'  `, "file.txt", 10);
            });

            assert.throws(() => {
                tree.parseLine(`* {var1}='str1', {var2}='str2'`, "file.txt", 10);
            });

            assert.throws(() => {
                tree.parseLine(`* {var1}= Some function`, "file.txt", 10);
            });
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
            var elementFinder = tree.parseElementFinder(`'Login'`);
            assert.deepEqual(elementFinder, {text: 'Login'});

            elementFinder = tree.parseElementFinder(` 'Login' `);
            assert.deepEqual(elementFinder, {text: 'Login'});
        });

        it("rejects ElementFinders with nextTo", function() {
            var elementFinder = tree.parseElementFinder(`next to 'blah'`);
            assert.equal(elementFinder, null);

            elementFinder = tree.parseElementFinder(`   next to "blah"  `);
            assert.equal(elementFinder, null);
        });

        it("parses ElementFinders with ordinal and text", function() {
            var elementFinder = tree.parseElementFinder(`235th '  blah blah2 '`);
            assert.deepEqual(elementFinder, {ordinal: 235, text: '  blah blah2 '});

            elementFinder = tree.parseElementFinder(` 235th  '  blah blah2 ' `);
            assert.deepEqual(elementFinder, {ordinal: 235, text: '  blah blah2 '});
        });

        it("parses ElementFinders with ordinal and variable", function() {
            var elementFinder = tree.parseElementFinder(`6422nd blah blah2`);
            assert.deepEqual(elementFinder, {ordinal: 6422, variable: 'blah blah2'});

            elementFinder = tree.parseElementFinder(` 6422nd  blah  blah2 `);
            assert.deepEqual(elementFinder, {ordinal: 6422, variable: 'blah  blah2'});
        });

        it("rejects ElementFinders with ordinal and nextTo", function() {
            var elementFinder = tree.parseElementFinder(`2nd next to 'blah'`);
            assert.equal(elementFinder, null);

            elementFinder = tree.parseElementFinder(` 2nd   next to 'blah' `);
            assert.equal(elementFinder, null);
        });

        it("parses ElementFinders with text and variable", function() {
            var elementFinder = tree.parseElementFinder(`'Login' box`);
            assert.deepEqual(elementFinder, {text: 'Login', variable: 'box'});

            elementFinder = tree.parseElementFinder(` 'Login'  box `);
            assert.deepEqual(elementFinder, {text: 'Login', variable: 'box'});
        });

        it("parses ElementFinders with text and nextTo", function() {
            var elementFinder = tree.parseElementFinder(`'Login' next to "blah"`);
            assert.deepEqual(elementFinder, {text: 'Login', nextTo: 'blah'});

            elementFinder = tree.parseElementFinder(` 'Login'  next  to  "blah" `);
            assert.deepEqual(elementFinder, {text: 'Login', nextTo: 'blah'});
        });

        it("parses ElementFinders with variable and nextTo", function() {
            var elementFinder = tree.parseElementFinder(`box next to "blah"`);
            assert.deepEqual(elementFinder, {variable: 'box', nextTo: 'blah'});

            elementFinder = tree.parseElementFinder(` box  next  to  "blah" `);
            assert.deepEqual(elementFinder, {variable: 'box', nextTo: 'blah'});

            elementFinder = tree.parseElementFinder(`22foo next to "blah"`);
            assert.deepEqual(elementFinder, {variable: '22foo', nextTo: 'blah'});
        });

        it("parses ElementFinders with ordinal, text, and variable", function() {
            var elementFinder = tree.parseElementFinder(`1st "Login" box`);
            assert.deepEqual(elementFinder, {ordinal: 1, text: 'Login', variable: 'box'});

            elementFinder = tree.parseElementFinder(`  1st  "Login"  big  box  `);
            assert.deepEqual(elementFinder, {ordinal: 1, text: 'Login', variable: 'big  box'});
        });

        it("parses ElementFinders with ordinal, text, and nextTo", function() {
            var elementFinder = tree.parseElementFinder(`20th " Login  thing " next to "blah"`);
            assert.deepEqual(elementFinder, {ordinal: 20, text: ' Login  thing ', nextTo: 'blah'});

            elementFinder = tree.parseElementFinder(`  20th " Login  thing "  next  to  "blah" `);
            assert.deepEqual(elementFinder, {ordinal: 20, text: ' Login  thing ', nextTo: 'blah'});
        });

        it("parses ElementFinders with ordinal, variable, and nextTo", function() {
            var elementFinder = tree.parseElementFinder(`14th box next to "blah"`);
            assert.deepEqual(elementFinder, {ordinal: 14, variable: 'box', nextTo: 'blah'});

            elementFinder = tree.parseElementFinder(` 13th  box  next  to "blah"  `);
            assert.deepEqual(elementFinder, {ordinal: 13, variable: 'box', nextTo: 'blah'});
        });

        it("parses ElementFinders with text, variable, and nextTo", function() {
            var elementFinder = tree.parseElementFinder(`'Login' box next to "blah"`);
            assert.deepEqual(elementFinder, {text: 'Login', variable: 'box', nextTo: 'blah'});

            elementFinder = tree.parseElementFinder(` 'Login' box  next to  "blah" `);
            assert.deepEqual(elementFinder, {text: 'Login', variable: 'box', nextTo: 'blah'});
        });

        it("parses ElementFinders with ordinal, text, variable, and nextTo", function() {
            var elementFinder = tree.parseElementFinder(`14th 'Login' box next to "blah"`);
            assert.deepEqual(elementFinder, {ordinal: 14, text: 'Login', variable: 'box', nextTo: 'blah'});

            elementFinder = tree.parseElementFinder(` 13th 'Login'  box  next  to "blah"  `);
            assert.deepEqual(elementFinder, {ordinal: 13, text: 'Login', variable: 'box', nextTo: 'blah'});
        });

        it("rejects other invalid ElementFinders", function() {
            var elementFinder = tree.parseElementFinder(`something 'not' elementfinder`);
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
            });

            assert.throws(() => {
                tree.parseIn(
` A
`
                , "file.txt");
            });

            assert.throws(() => {
                tree.parseIn(
`
    A
`
                , "file.txt");
            });
        });

        it("rejects a step that is 2 or more indents ahead of the step above", function() {
            var tree = new Tree();
            assert.throws(() => {
                tree.parseIn(
`A
        B
`
                , "file.txt");
            });

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
            });
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
            });
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
            });
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
            });
        });

        it("rejects a step block containing a .. line at the end", function() {
            var tree = new Tree();
            assert.throws(() => {
                tree.parseIn(
`A
B
..`
                , "file.txt");
            });

            assert.throws(() => {
                tree.parseIn(
`A
B
..
`
                , "file.txt");
            });

            assert.throws(() => {
                tree.parseIn(
`..`
                , "file.txt");
            });
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
            });
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
            });
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
            });

            assert.throws(() => {
                tree.parseIn(
`A

    ..
    B

E
`
                , "file.txt");
            });
        });

        it("rejects two .. lines in a row", function() {
            var tree = new Tree();
            assert.throws(() => {
                tree.parseIn(
`..
..
`
                , "file.txt");
            });
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
            });

            assert.throws(() => {
                tree.parseIn(
`Code block here {`
                , "file.txt");
            });
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
            });

            assert.throws(() => {
                tree.parseIn(
`A
    Code block here {

        }
`
                , "file.txt");
            });
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

        it("rejects function calls that cannot be found", function() {
            var tree = new Tree();
            tree.parseIn(`
Function that doesn't exist

* Something else
`);

            var stepsAbove = [ tree.root.children[0].cloneForBranch() ];
            assert.throws(() => {
                tree.findFunctionDeclaration(stepsAbove);
            });
        });

        it("rejects with a special error function calls that match case insensitively but not case sensitively", function() {
            var tree = new Tree();
            tree.parseIn(`
My function

* my function
`);

            var stepsAbove = [ tree.root.children[0].cloneForBranch() ];
            assert.throws(() => {
                tree.findFunctionDeclaration(stepsAbove);
            });
        });

        it("rejects function calls to functions that were declared in a different scope", function() {
            var tree = new Tree();
            tree.parseIn(`
My function

Other scope -
    * My function
`);

            var stepsAbove = [ tree.root.children[0].cloneForBranch() ];
            assert.throws(() => {
                tree.findFunctionDeclaration(stepsAbove);
            });

            tree = new Tree();
            tree.parseIn(`
One scope -
    My function

Other scope -
    * My function
`);

            stepsAbove = [
                tree.root.children[0].cloneForBranch(),
                tree.root.children[0].children[0].cloneForBranch()
            ];
            assert.throws(() => {
                tree.findFunctionDeclaration(stepsAbove);
            });
        });
    });

    describe("validateVarSettingFunction()", function() {
        it("accepts function that has muliple branches in {x}='value' format", function() {
            var tree = new Tree();
            tree.parseIn(`
F

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
F

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
F

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
F

* F
`);

            var functionCall = tree.root.children[0].cloneForBranch();
            functionCall.functionDeclarationInTree = tree.root.children[1];
            assert.throws(() => {
                tree.validateVarSettingFunction(functionCall);
            });
        });

        it("rejects function that doesn't have a code block, isn't a code block function, and isn't a branched function in {x}='value' format", function() {
            var tree = new Tree();
            tree.parseIn(`
F

* F
    {x}='1'

    Function name

    {x}='3'
`);

            var functionCall = tree.root.children[0].cloneForBranch();
            functionCall.functionDeclarationInTree = tree.root.children[1];

            assert.throws(() => {
                tree.validateVarSettingFunction(functionCall);
            });

            tree = new Tree();
            tree.parseIn(`
F

* F
    {x}='1'
    Function name
    {x}='3'
`);

            var functionCall = tree.root.children[0].cloneForBranch();
            functionCall.functionDeclarationInTree = tree.root.children[1];

            assert.throws(() => {
                tree.validateVarSettingFunction(functionCall);
            });
        });

        it("rejects function that has a code block, but also has children", function() {
            var tree = new Tree();
            tree.parseIn(`
F

* F {
    code block
}
    Child -
`);

            var functionCall = tree.root.children[0].cloneForBranch();
            functionCall.functionDeclarationInTree = tree.root.children[1];

            assert.throws(() => {
                tree.validateVarSettingFunction(functionCall);
            });
        });

        it("rejects function that is in {x}='value' format, but also has children", function() {
            var tree = new Tree();
            tree.parseIn(`
F

* F
    {x}='1'

    {x}='2'
        Child -

    {x}='3'
`);

            var functionCall = tree.root.children[0].cloneForBranch();
            functionCall.functionDeclarationInTree = tree.root.children[1];

            assert.throws(() => {
                tree.validateVarSettingFunction(functionCall);
            });
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
F ~~

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
                            isStepByStepDebug: true,
                            isNonParallel: true,
                            isExpectedFail: true,
                            branchIndents: 0,
                            originalStepInTree: {
                                text: "F",
                                isFunctionCall: true,
                                isFunctionDeclaration: undefined,
                                isStepByStepDebug: true,
                                isNonParallel: undefined,
                                isExpectedFail: undefined,
                                functionDeclarationInTree: {
                                    text: "F",
                                    isFunctionCall: undefined,
                                    isFunctionDeclaration: true,
                                    isStepByStepDebug: undefined,
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
                            isStepByStepDebug: undefined,
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
F ~~

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
                            isStepByStepDebug: true,
                            isNonParallel: true,
                            isExpectedFail: true,
                            branchIndents: 0,
                            codeBlock: '\n    code block 1\n    code block 2\n',
                            originalStepInTree: {
                                text: "F",
                                isFunctionCall: true,
                                isFunctionDeclaration: undefined,
                                isStepByStepDebug: true,
                                isNonParallel: undefined,
                                isExpectedFail: undefined,
                                codeBlock: undefined,
                                functionDeclarationInTree: {
                                    text: "F",
                                    isFunctionCall: undefined,
                                    isFunctionDeclaration: true,
                                    isStepByStepDebug: undefined,
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
    `);

            assert.throws(() => {
                tree.branchify(tree.root);
            });
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
    `);

            assert.throws(() => {
                tree.branchify(tree.root);
            });
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
    `);

            assert.throws(() => {
                tree.branchify(tree.root);
            });
        });

        it("rejects {var} = F if F doesn't have a code block, isn't a code block function, and isn't a branched function in {x}='value' format", function() {
            var tree = new Tree();
            tree.parseIn(`
{var} = F

* F
    {x}='1'
    D -
    {x}='4'
    `);

            assert.throws(() => {
                tree.branchify(tree.root);
            });
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

            expect(branches).to.have.lengthOf(1);
            expect(branches[0].steps).to.have.lengthOf(10);

            // We need to do this because containSubsetInOrder() doesn't like duplicate array values (so we're using containSubset() instead)
            expect(branches[0].steps[0].text).to.equal("A");
            expect(branches[0].steps[1].text).to.equal("G");
            expect(branches[0].steps[2].text).to.equal("H");
            expect(branches[0].steps[3].text).to.equal("A");
            expect(branches[0].steps[4].text).to.equal("J");
            expect(branches[0].steps[5].text).to.equal("B");
            expect(branches[0].steps[6].text).to.equal("C");
            expect(branches[0].steps[7].text).to.equal("I");
            expect(branches[0].steps[8].text).to.equal("C");
            expect(branches[0].steps[9].text).to.equal("K");

            expect(branches).to.containSubset([
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

            expect(branches).to.have.lengthOf(3);
            expect(branches[0].steps).to.have.lengthOf(11);
            expect(branches[1].steps).to.have.lengthOf(12);
            expect(branches[2].steps).to.have.lengthOf(12);

            // We need to do this because containSubsetInOrder() doesn't like duplicate array values (so we're using containSubset() instead)
            expect(branches[0].steps[0].text).to.equal("A");
            expect(branches[0].steps[1].text).to.equal("G");
            expect(branches[0].steps[2].text).to.equal("H");
            expect(branches[0].steps[3].text).to.equal("A");
            expect(branches[0].steps[4].text).to.equal("J");
            expect(branches[0].steps[5].text).to.equal("B");
            expect(branches[0].steps[6].text).to.equal("C");
            expect(branches[0].steps[7].text).to.equal("I");
            expect(branches[0].steps[8].text).to.equal("C");
            expect(branches[0].steps[9].text).to.equal("K");
            expect(branches[0].steps[10].text).to.equal("L");

            expect(branches[1].steps[0].text).to.equal("A");
            expect(branches[1].steps[1].text).to.equal("G");
            expect(branches[1].steps[2].text).to.equal("H");
            expect(branches[1].steps[3].text).to.equal("A");
            expect(branches[1].steps[4].text).to.equal("J");
            expect(branches[1].steps[5].text).to.equal("B");
            expect(branches[1].steps[6].text).to.equal("C");
            expect(branches[1].steps[7].text).to.equal("I");
            expect(branches[1].steps[8].text).to.equal("C");
            expect(branches[1].steps[9].text).to.equal("K");
            expect(branches[1].steps[10].text).to.equal("M");
            expect(branches[1].steps[11].text).to.equal("N");

            expect(branches[2].steps[0].text).to.equal("A");
            expect(branches[2].steps[1].text).to.equal("G");
            expect(branches[2].steps[2].text).to.equal("H");
            expect(branches[2].steps[3].text).to.equal("A");
            expect(branches[2].steps[4].text).to.equal("J");
            expect(branches[2].steps[5].text).to.equal("B");
            expect(branches[2].steps[6].text).to.equal("C");
            expect(branches[2].steps[7].text).to.equal("I");
            expect(branches[2].steps[8].text).to.equal("C");
            expect(branches[2].steps[9].text).to.equal("K");
            expect(branches[2].steps[10].text).to.equal("M");
            expect(branches[2].steps[11].text).to.equal("O");

            expect(branches).to.containSubset([
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
                        },
                        {
                            text: "L",
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
                        },
                        {
                            text: "M",
                            branchIndents: 0,
                            isSequential: undefined
                        },
                        {
                            text: "N",
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
                        },
                        {
                            text: "M",
                            branchIndents: 0,
                            isSequential: undefined
                        },
                        {
                            text: "O",
                            branchIndents: 0,
                            isSequential: undefined
                        }
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

            expect(branches).to.have.lengthOf(1);
            expect(branches[0].steps).to.have.lengthOf(7);

            // We need to do this because containSubsetInOrder() doesn't like duplicate array values (so we're using containSubset() instead)
            expect(branches[0].steps[0].text).to.equal("A");
            expect(branches[0].steps[1].text).to.equal("B");
            expect(branches[0].steps[2].text).to.equal("C");
            expect(branches[0].steps[3].text).to.equal("E");
            expect(branches[0].steps[4].text).to.equal("C");
            expect(branches[0].steps[5].text).to.equal("F");
            expect(branches[0].steps[6].text).to.equal("D");

            expect(branches).to.containSubset([
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

        it("branchifies the * After Every Branch hook", function() {
            var tree = new Tree();
            tree.parseIn(`
A -
    B -

    C -
        * After Every Branch
            D -

E -
    `);

            var branches = tree.branchify(tree.root);

            expect(branches).to.have.lengthOf(3);

            expect(branches[0].steps).to.have.lengthOf(2);
            expect(branches[1].steps).to.have.lengthOf(2);
            expect(branches[2].steps).to.have.lengthOf(1);

            expect(branches[0].afterBranches).to.equal(undefined);
            expect(branches[1].afterBranches).to.have.lengthOf(1);
            expect(branches[2].afterBranches).to.equal(undefined);

            expect(branches[1].afterBranches[0].steps).to.have.lengthOf(2);

            expect(branches).to.containSubsetInOrder([
                {
                    steps: [ { text: "A" }, { text: "B" } ],
                    afterBranches: undefined
                },
                {
                    steps: [ { text: "A" }, { text: "C" } ],
                    afterBranches: [
                        {
                            steps: [ { text: "After Every Branch", branchIndents: 0 }, { text: "D", branchIndents: 1 } ]
                        }
                    ]
                },
                {
                    steps: [ { text: "E" } ],
                    afterBranches: undefined
                }
            ]);
        });

        it("branchifies the * After Every Branch hook under the root", function() {
            var tree = new Tree();
            tree.parseIn(`
A -

* After Every Branch
    B -

C -
    `);

            var branches = tree.branchify(tree.root);

            expect(branches).to.have.lengthOf(2);

            expect(branches[0].steps).to.have.lengthOf(1);
            expect(branches[1].steps).to.have.lengthOf(1);

            expect(branches[0].afterBranches).to.have.lengthOf(1);
            expect(branches[1].afterBranches).to.have.lengthOf(1);

            expect(branches[0].afterBranches[0].steps).to.have.lengthOf(2);
            expect(branches[1].afterBranches[0].steps).to.have.lengthOf(2);

            expect(branches).to.containSubsetInOrder([
                {
                    steps: [ { text: "A" } ],
                    afterBranches: [
                        {
                            steps: [ { text: "After Every Branch", branchIndents: 0 }, { text: "B", branchIndents: 1 } ]
                        }
                    ]
                },
                {
                    steps: [ { text: "C" } ],
                    afterBranches: [
                        {
                            steps: [ { text: "After Every Branch", branchIndents: 0 }, { text: "B", branchIndents: 1 } ]
                        }
                    ]
                }
            ]);
        });

        it("branchifies the * After Every Branch hook with multiple branches", function() {
            var tree = new Tree();
            tree.parseIn(`
A -
    B -

    C -
        * After Every Branch
            D -

            E -
                F -

G -
    `);

            var branches = tree.branchify(tree.root);

            expect(branches).to.have.lengthOf(3);

            expect(branches[0].steps).to.have.lengthOf(2);
            expect(branches[1].steps).to.have.lengthOf(2);
            expect(branches[2].steps).to.have.lengthOf(1);

            expect(branches[0].afterBranches).to.equal(undefined);
            expect(branches[1].afterBranches).to.have.lengthOf(2);
            expect(branches[2].afterBranches).to.equal(undefined);

            expect(branches[1].afterBranches[0].steps).to.have.lengthOf(2);
            expect(branches[1].afterBranches[1].steps).to.have.lengthOf(3);

            expect(branches).to.containSubsetInOrder([
                {
                    steps: [ { text: "A" }, { text: "B" } ],
                    afterBranches: undefined
                },
                {
                    steps: [ { text: "A" }, { text: "C" } ],
                    afterBranches: [
                        {
                            steps: [ { text: "After Every Branch", branchIndents: 0 }, { text: "D", branchIndents: 1 } ]
                        },
                        {
                            steps: [ { text: "After Every Branch", branchIndents: 0 }, { text: "E", branchIndents: 1 }, { text: "F", branchIndents: 1 } ]
                        }
                    ]
                },
                {
                    steps: [ { text: "G" } ],
                    afterBranches: undefined
                }
            ]);
        });

        it("branchifies the * After Every Branch hook under a step block", function() {
            var tree = new Tree();
            tree.parseIn(`
A -
    B -
    C -

        * After Every Branch
            D -

G -
    `);

            var branches = tree.branchify(tree.root);

            expect(branches).to.have.lengthOf(3);

            expect(branches[0].steps).to.have.lengthOf(2);
            expect(branches[1].steps).to.have.lengthOf(2);
            expect(branches[2].steps).to.have.lengthOf(1);

            expect(branches[0].afterBranches).to.have.lengthOf(1);
            expect(branches[1].afterBranches).to.have.lengthOf(1);
            expect(branches[2].afterBranches).to.equal(undefined);

            expect(branches[0].afterBranches[0].steps).to.have.lengthOf(2);
            expect(branches[1].afterBranches[0].steps).to.have.lengthOf(2);

            expect(branches).to.containSubsetInOrder([
                {
                    steps: [ { text: "A" }, { text: "B" } ],
                    afterBranches: [
                        {
                            steps: [ { text: "After Every Branch"}, { text: "D" } ]
                        }
                    ]
                },
                {
                    steps: [ { text: "A" }, { text: "C" } ],
                    afterBranches: [
                        {
                            steps: [ { text: "After Every Branch"}, { text: "D" } ]
                        }
                    ]
                },
                {
                    steps: [ { text: "G" } ],
                    afterBranches: undefined
                }
            ]);
        });

        it("branchifies the * After Every Branch hook under a .. step", function() {
            var tree = new Tree();
            tree.parseIn(`
A - ..

    B -

    C -
        * After Every Branch
            D -

G -
    `);

            var branches = tree.branchify(tree.root);

            expect(branches).to.have.lengthOf(2);

            expect(branches[0].steps).to.have.lengthOf(3);
            expect(branches[1].steps).to.have.lengthOf(1);

            expect(branches[0].afterBranches).to.have.lengthOf(1);
            expect(branches[1].afterBranches).to.equal(undefined);

            expect(branches[0].afterBranches[0].steps).to.have.lengthOf(2);

            expect(branches).to.containSubsetInOrder([
                {
                    steps: [ { text: "A" }, { text: "B" }, { text: "C" } ],
                    afterBranches: [
                        {
                            steps: [ { text: "After Every Branch"}, { text: "D" } ]
                        }
                    ]
                },
                {
                    steps: [ { text: "G" } ],
                    afterBranches: undefined
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

        * After Every Branch
            D -

G -
    `);

            var branches = tree.branchify(tree.root);

            expect(branches).to.have.lengthOf(2);

            expect(branches[0].steps).to.have.lengthOf(3);
            expect(branches[1].steps).to.have.lengthOf(1);

            expect(branches[0].afterBranches).to.have.lengthOf(1);
            expect(branches[1].afterBranches).to.equal(undefined);

            expect(branches[0].afterBranches[0].steps).to.have.lengthOf(2);

            expect(branches).to.containSubsetInOrder([
                {
                    steps: [ { text: "A" }, { text: "B" }, { text: "C" } ],
                    afterBranches: [
                        {
                            steps: [ { text: "After Every Branch"}, { text: "D" } ]
                        }
                    ]
                },
                {
                    steps: [ { text: "G" } ],
                    afterBranches: undefined
                }
            ]);
        });

        it("branchifies the * After Every Branch hook under a * After Every Branch hook", function() {
            var tree = new Tree();
            tree.parseIn(`
A -
    B -

    C -
        * After Every Branch
            D -

            * After Every Branch
                H -

            E -
                * After Every Branch
                    I -
                F -

G -
    `);

            var branches = tree.branchify(tree.root);

            expect(branches).to.have.lengthOf(3);

            expect(branches[0].steps).to.have.lengthOf(2);
            expect(branches[1].steps).to.have.lengthOf(2);
            expect(branches[2].steps).to.have.lengthOf(1);

            expect(branches[0].afterBranches).to.equal(undefined);
            expect(branches[1].afterBranches).to.have.lengthOf(2);
            expect(branches[2].afterBranches).to.equal(undefined);

            expect(branches[1].afterBranches[0].steps).to.have.lengthOf(2);
            expect(branches[1].afterBranches[1].steps).to.have.lengthOf(3);

            expect(branches[1].afterBranches[0].afterBranches).to.have.lengthOf(1);
            expect(branches[1].afterBranches[1].afterBranches).to.have.lengthOf(2);

            expect(branches[1].afterBranches[0].afterBranches[0].steps).to.have.lengthOf(2);
            expect(branches[1].afterBranches[1].afterBranches[0].steps).to.have.lengthOf(2);
            expect(branches[1].afterBranches[1].afterBranches[1].steps).to.have.lengthOf(2);

            expect(branches).to.containSubsetInOrder([
                {
                    steps: [ { text: "A" }, { text: "B" } ],
                    afterBranches: undefined
                },
                {
                    steps: [ { text: "A" }, { text: "C" } ],
                    afterBranches: [
                        {
                            steps: [ { text: "After Every Branch" }, { text: "D" } ],
                            afterBranches: [
                                {
                                    steps: [ { text: "After Every Branch" }, { text: "H" } ]
                                }
                            ]
                        },
                        {
                            steps: [ { text: "After Every Branch" }, { text: "E" }, { text: "F" } ],
                            afterBranches: [
                                {
                                    steps: [ { text: "After Every Branch" }, { text: "I" } ]
                                },
                                {
                                    steps: [ { text: "After Every Branch" }, { text: "H" } ]
                                }
                            ]
                        }
                    ]
                },
                {
                    steps: [ { text: "G" } ],
                    afterBranches: undefined
                }
            ]);
        });

        it("branchifies the * After Every Branch hook if it has a ..", function() {
            var tree = new Tree();
            tree.parseIn(`
A -
    B -

    C -
        * After Every Branch ..
            D -
                F -
            G -

E -
    `);

            var branches = tree.branchify(tree.root);

            expect(branches).to.have.lengthOf(3);

            expect(branches[0].steps).to.have.lengthOf(2);
            expect(branches[1].steps).to.have.lengthOf(2);
            expect(branches[2].steps).to.have.lengthOf(1);

            expect(branches[0].afterBranches).to.equal(undefined);
            expect(branches[1].afterBranches).to.have.lengthOf(1);
            expect(branches[2].afterBranches).to.equal(undefined);

            expect(branches[1].afterBranches[0].steps).to.have.lengthOf(4);

            expect(branches).to.containSubsetInOrder([
                {
                    steps: [ { text: "A" }, { text: "B" } ],
                    afterBranches: undefined
                },
                {
                    steps: [ { text: "A" }, { text: "C" } ],
                    afterBranches: [
                        {
                            steps: [ { text: "After Every Branch"}, { text: "D" }, { text: "F" }, { text: "G" } ]
                        }
                    ]
                },
                {
                    steps: [ { text: "E" } ],
                    afterBranches: undefined
                }
            ]);
        });

        it("handles multiple * After Every Branch hooks that are siblings", function() {
            var tree = new Tree();
            tree.parseIn(`
A -
    B -

    C -
        * After Every Branch
            D -

        * After Every Branch
            G -

        * After Every Branch
            H -

E -
    `);

            var branches = tree.branchify(tree.root);

            expect(branches).to.have.lengthOf(3);

            expect(branches[0].steps).to.have.lengthOf(2);
            expect(branches[1].steps).to.have.lengthOf(2);
            expect(branches[2].steps).to.have.lengthOf(1);

            expect(branches[0].afterBranches).to.equal(undefined);
            expect(branches[1].afterBranches).to.have.lengthOf(3);
            expect(branches[2].afterBranches).to.equal(undefined);

            expect(branches[1].afterBranches[0].steps).to.have.lengthOf(2);
            expect(branches[1].afterBranches[1].steps).to.have.lengthOf(2);
            expect(branches[1].afterBranches[2].steps).to.have.lengthOf(2);

            expect(branches).to.containSubsetInOrder([
                {
                    steps: [ { text: "A" }, { text: "B" } ],
                    afterBranches: undefined
                },
                {
                    steps: [ { text: "A" }, { text: "C" } ],
                    afterBranches: [
                        {
                            steps: [ { text: "After Every Branch"}, { text: "D" } ]
                        },
                        {
                            steps: [ { text: "After Every Branch"}, { text: "G" } ]
                        },
                        {
                            steps: [ { text: "After Every Branch"}, { text: "H" } ]
                        }
                    ]
                },
                {
                    steps: [ { text: "E" } ],
                    afterBranches: undefined
                }
            ]);
        });

        it("handles a function call under a * After Every Branch hook, with function declarations inside an outside the hook", function() {
            var tree = new Tree();
            tree.parseIn(`
A -
    B -
        * After Every Branch
            C
            D

            * C
                X -

    * D
        Y -
    `);

            var branches = tree.branchify(tree.root);

            expect(branches).to.have.lengthOf(1);

            expect(branches[0].steps).to.have.lengthOf(2);

            expect(branches[0].afterBranches).to.have.lengthOf(2);

            expect(branches[0].afterBranches[0].steps).to.have.lengthOf(3);
            expect(branches[0].afterBranches[1].steps).to.have.lengthOf(3);

            expect(branches).to.containSubsetInOrder([
                {
                    steps: [ { text: "A" }, { text: "B" } ],
                    afterBranches: [
                        {
                            steps: [
                                { text: "After Every Branch", branchIndents: 0 },
                                { text: "C", branchIndents: 1, isFunctionCall: true },
                                { text: "X", branchIndents: 2 } ,
                            ]
                        },
                        {
                            steps: [
                                { text: "After Every Branch", branchIndents: 0 },
                                { text: "D", branchIndents: 1, isFunctionCall: true },
                                { text: "Y", branchIndents: 2 } ,
                            ]
                        }
                    ]
                }
            ]);
        });

        it("branchifies many * After Every Branch hooks in the tree", function() {
            var tree = new Tree();
            tree.parseIn(`
A -
    B -
        C -
        D -

            E -

                * After Every Branch
                    U -

            * After Every Branch
                T -

                * After Every Branch
                    V -

        F -

    H -
    I -

        * After Every Branch
            S -

    ..
    J -
    K -

        * After Every Branch
            R -

    L - ..
        M -
            N -

        * After Every Branch
            Q -

        O -

    * After Every Branch
        W -
G -
    P -
    `);
            var branches = tree.branchify(tree.root);

            expect(branches).to.have.lengthOf(8);

            expect(branches[0].steps).to.have.lengthOf(4);
            expect(branches[0].afterBranches).to.have.lengthOf(3);
            expect(branches[0].afterBranches[0].steps).to.have.lengthOf(2);
            expect(branches[0].afterBranches[1].steps).to.have.lengthOf(2);
            expect(branches[0].afterBranches[1].afterBranches).to.have.lengthOf(1);
            expect(branches[0].afterBranches[1].afterBranches[0].steps).to.have.lengthOf(2);
            expect(branches[0].afterBranches[2].steps).to.have.lengthOf(2);

            expect(branches[1].steps).to.have.lengthOf(4);
            expect(branches[1].afterBranches).to.have.lengthOf(3);
            expect(branches[1].afterBranches[0].steps).to.have.lengthOf(2);
            expect(branches[1].afterBranches[1].steps).to.have.lengthOf(2);
            expect(branches[1].afterBranches[1].afterBranches).to.have.lengthOf(1);
            expect(branches[1].afterBranches[1].afterBranches[0].steps).to.have.lengthOf(2);
            expect(branches[1].afterBranches[2].steps).to.have.lengthOf(2);

            expect(branches[2].steps).to.have.lengthOf(3);
            expect(branches[2].afterBranches).to.have.lengthOf(1);
            expect(branches[2].afterBranches[0].steps).to.have.lengthOf(2);

            expect(branches[3].steps).to.have.lengthOf(2);
            expect(branches[3].afterBranches).to.have.lengthOf(2);
            expect(branches[3].afterBranches[0].steps).to.have.lengthOf(2);
            expect(branches[3].afterBranches[1].steps).to.have.lengthOf(2);

            expect(branches[4].steps).to.have.lengthOf(2);
            expect(branches[4].afterBranches).to.have.lengthOf(2);
            expect(branches[4].afterBranches[0].steps).to.have.lengthOf(2);
            expect(branches[4].afterBranches[1].steps).to.have.lengthOf(2);

            expect(branches[5].steps).to.have.lengthOf(3);
            expect(branches[5].afterBranches).to.have.lengthOf(2);
            expect(branches[5].afterBranches[0].steps).to.have.lengthOf(2);
            expect(branches[5].afterBranches[1].steps).to.have.lengthOf(2);

            expect(branches[6].steps).to.have.lengthOf(5);
            expect(branches[6].afterBranches).to.have.lengthOf(2);
            expect(branches[6].afterBranches[0].steps).to.have.lengthOf(2);
            expect(branches[6].afterBranches[1].steps).to.have.lengthOf(2);

            expect(branches[7].steps).to.have.lengthOf(2);
            expect(branches[7].afterBranches).to.equal(undefined);

            expect(branches).to.containSubsetInOrder([
                {
                    steps: [ { text: "A" }, { text: "B" }, { text: "C" }, { text: "E" } ],
                    afterBranches: [
                        {
                            steps: [ { text: "After Every Branch" }, { text: "U" } ]
                        },
                        {
                            steps: [ { text: "After Every Branch" }, { text: "T" } ],
                            afterBranches: [
                                {
                                    steps: [ { text: "After Every Branch" }, { text: "V" } ]
                                }
                            ]
                        },
                        {
                            steps: [ { text: "After Every Branch" }, { text: "W" } ]
                        }
                    ]
                },
                {
                    steps: [ { text: "A" }, { text: "B" }, { text: "D" }, { text: "E" } ],
                    afterBranches: [
                        {
                            steps: [ { text: "After Every Branch" }, { text: "U" } ]
                        },
                        {
                            steps: [ { text: "After Every Branch" }, { text: "T" } ],
                            afterBranches: [
                                {
                                    steps: [ { text: "After Every Branch" }, { text: "V" } ]
                                }
                            ]
                        },
                        {
                            steps: [ { text: "After Every Branch" }, { text: "W" } ]
                        }
                    ]
                },
                {
                    steps: [ { text: "A" }, { text: "B" }, { text: "F" } ],
                    afterBranches: [
                        {
                            steps: [ { text: "After Every Branch" }, { text: "W" } ]
                        }
                    ]
                },
                {
                    steps: [ { text: "A" }, { text: "H" } ],
                    afterBranches: [
                        {
                            steps: [ { text: "After Every Branch" }, { text: "S" } ]
                        },
                        {
                            steps: [ { text: "After Every Branch" }, { text: "W" } ]
                        }
                    ]
                },
                {
                    steps: [ { text: "A" }, { text: "I" } ],
                    afterBranches: [
                        {
                            steps: [ { text: "After Every Branch" }, { text: "S" } ]
                        },
                        {
                            steps: [ { text: "After Every Branch" }, { text: "W" } ]
                        }
                    ]
                },
                {
                    steps: [ { text: "A" }, { text: "J" }, { text: "K" } ],
                    afterBranches: [
                        {
                            steps: [ { text: "After Every Branch" }, { text: "R" } ]
                        },
                        {
                            steps: [ { text: "After Every Branch" }, { text: "W" } ]
                        }
                    ]
                },
                {
                    steps: [ { text: "A" }, { text: "L" }, { text: "M" }, { text: "N" }, { text: "O" } ],
                    afterBranches: [
                        {
                            steps: [ { text: "After Every Branch" }, { text: "Q" } ]
                        },
                        {
                            steps: [ { text: "After Every Branch" }, { text: "W" } ]
                        }
                    ]
                },
                {
                    steps: [ { text: "G" }, { text: "P" } ],
                    afterBranches: undefined
                }
            ]);
        });

        it("rejects the * After Every Branch hook with the wrong casing", function() {
            var tree = new Tree();
            tree.parseIn(`
A -
    B -

    C -
        * After every Branch
            D -

E -
    `);

            assert.throws(() => {
                tree.branchify(tree.root);
            });
        });

        it("accepts varying amounts of whitespace in the * After Every Branch hook", function() {
            var tree = new Tree();
            tree.parseIn(`
A -
    B -

    C -
        *  After   Every  Branch
            D -

E -
    `);

            assert.doesNotThrow(() => {
                tree.branchify(tree.root);
            });
        });

        it.skip("branchifies the * Before Everything hook", function() {
        });

        it.skip("branchifies the * Before Everything hook with multiple branches", function() {
        });

        it.skip("branchifies the * Before Everything hook if it has a ..", function() {
        });

        it.skip("handles multiple * Before Everything hooks that are siblings", function() {
        });

        it.skip("handles multiple * Before Everything hooks that are at different levels in the tree", function() {
        });

        it.skip("rejects the * Before Everything hook with the wrong casing", function() {
            // every word must be capitalized, such as "After Every Branch"
        });

        it.skip("rejects the * Before Everything hook when not at 0 indents", function() {
        });

        it.skip("branchifies the * After Everything hook", function() {
        });

        it.skip("branchifies the * After Everything hook when it itself has multiple branches", function() {
        });

        it.skip("branchifies the * After Everything hook if it has a ..", function() {
        });

        it.skip("handles multiple * After Everything hooks that are siblings", function() {
        });

        it.skip("handles multiple * After Everything hooks that are at different levels in the tree", function() {
        });

        it.skip("rejects the * After Everything hook with the wrong casing", function() {
            // every word must be capitalized, such as "After Every Branch"
        });

        it.skip("rejects the * After Everything hook when not at 0 indents", function() {
        });

        it.skip("handles different hooks that are siblings", function() {
            // try each of the the 3 hook types
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
    `);

            assert.throws(() => {
                tree.branchify(tree.root);
            });

            tree = new Tree();
            tree.parseIn(`
A

* A
    B

* B
    A
    `);

            assert.throws(() => {
                tree.branchify(tree.root);
            });
        });
    });

    describe("generateBranches()", function() {
        it.skip("sets the frequency of a branch when the {frequency} variable is set on a leaf", function() {
        });

        it.skip("sets the frequency of multiple branches when the {frequency} variable is set", function() {
            // have multiple branches have their {frequency} set
        });

        it.skip("sets the frequency of a branch to medium when the {frequency} variable is absent", function() {
        });

        it.skip("sets the frequency of a branch to the deepest {frequency} variable when more than one exist on a branch", function() {
        });

        it.skip("sorts branches by {frequency}", function() {
        });

        it.skip("when called a second time, sets a flag to only run previously failed branches", function() {
            // When generateBranches() is called and this.branches already exists, this.branches is assumed to have been run already
        });

        it("throws an exception when there's an infinite loop among function calls", function() {
        });









    });

    describe("pruneBranches()", function() {
        it.skip("isolates the first branch with ~ encountered", function() {
            // try multiple ~'s on different siblings, only the first one is chosen
        });

        it.skip("isolates the first branch with ~ on multiple steps", function() {
            // the first ~ step still gives you multiple branches, but a second ~ narrows it down, etc.
        });

        it.skip("puts a ~ on all steps above and including a ~~ step, isolates the first branch accordingly", function() {

        });

        it.skip("puts a ~ on all steps above and including a ~~ step, but stops when it encounters a ~ on the way to the top, isolates the first branch accordingly", function() {

        });

        it.skip("removes all steps under a -T step", function() {
            // the first ~ step still gives you multiple branches, but a second ~ narrows it down, etc.
        });

        it.skip("removes all steps under a -M step", function() {
            // the first ~ step still gives you multiple branches, but a second ~ narrows it down, etc.
        });

        it.skip("links branches that go through a + step", function() {

        });

        it.skip("removes branches not part of a {group} being run", function() {

        });

        it.skip("does not remove branches part of a {group} being run", function() {

        });

        it.skip("removes branches not part of a {frequency} being run", function() {

        });

        it.skip("does not remove branches part of a {frequency} being run", function() {

        });









    });

    describe("finalize()", function() {
        it.skip("doesn't crash when called", function() {

        });
    });
});
