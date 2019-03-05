const chai = require('chai');
const chaiSubset = require('chai-subset');
const expect = chai.expect;
const assert = chai.assert;
const util = require('util');
const Tree = require('../tree.js');

chai.use(chaiSubset);

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
            expect(branches).to.containSubset([
                {
                    steps: [
                        {
                            text: "A",
                            parent: undefined,
                            children: undefined
                        },
                        {
                            text: "B",
                            parent: undefined,
                            children: undefined
                        },
                        {
                            text: "C",
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
            expect(branches).to.containSubset([
                {
                    steps: [
                        { text: "A" },
                        { text: "B" },
                        { text: "C" }
                    ]
                },
                {
                    steps: [
                        { text: "A" },
                        { text: "B" },
                        { text: "D" }
                    ]
                },
                {
                    steps: [
                        { text: "A" },
                        { text: "E" }
                    ]
                },
                {
                    steps: [
                        { text: "A" },
                        { text: "F" },
                        { text: "G" }
                    ]
                },
                {
                    steps: [
                        { text: "H" }
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
            expect(branches).to.containSubset([
                {
                    steps: [
                        { text: "A" },
                        { text: "B" },
                        { text: "C" }
                    ]
                },
                {
                    steps: [
                        { text: "A" },
                        { text: "B" },
                        { text: "D" }
                    ]
                },
                {
                    steps: [
                        { text: "A" },
                        { text: "E" },
                        { text: "G" }
                    ]
                },
                {
                    steps: [
                        { text: "A" },
                        { text: "F" },
                        { text: "G" }
                    ]
                },
                {
                    steps: [
                        { text: "H" }
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
            expect(branches).to.containSubset([
                {
                    steps: [
                        {
                            text: "F",
                            isFunctionCall: true,
                            isFunctionDeclaration: undefined,
                            originalStep: {
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
            expect(branches).to.containSubset([
                {
                    steps: [
                        {
                            text: "F",
                            isFunctionCall: true,
                            isFunctionDeclaration: undefined,
                            originalStep: {
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
                            originalStep: {
                                text: "A",
                                parent: { text: "F" },
                                functionDeclarationInTree: undefined
                            }
                        }
                    ]
                }
            ]);
        });

        it("properly merges identifiers between function call and function declaration", function() {













        });

        it.skip("properly merges identifiers and code block between function call and function declaration", function() {
        });

        it.skip("branchifies a function call with no children, whose function declaration has multiple branches", function() {
            var tree = new Tree();
            // check step.branchIndents too
        });

        it.skip("branchifies a function call with children, whose function declaration has no children", function() {
        });

        it.skip("branchifies a function call with children, whose function declaration has one branch", function() {
        });

        it.skip("branchifies a function call with children, whose function declaration has multiple branches", function() {
        });

        it.skip("branchifies multiple function calls in the tree", function() {
            var tree = new Tree();
        });

        it.skip("branchifies a function call within a function call", function() {
            var tree = new Tree();
            // Functions declared within function F. A call to F makes the functions accessible to its children.
        });

        it.skip("branchifies a function call with multiple branches within a function call with multiple branches", function() {
            var tree = new Tree();
        });

        it.skip("orders branches breadth-first", function() {

        });

        it.skip("branchifies {var} = F where F has muliple branches in {x}='value' format", function() {
            var tree = new Tree();
            // try branched function with steps and stepblocks
        });

        it.skip("branchifies {var} = F where F has a code block", function() {
            var tree = new Tree();
        });

        it.skip("rejects {var} = F if F has a code block, but also has children", function() {
            var tree = new Tree();
        });

        it.skip("rejects {var} = F if F is in {x}='value' format, but some of those steps have children", function() {
            var tree = new Tree();
        });

        it.skip("rejects {var} = F if F doesn't have a code block, isn't a code block function, and isn't a branched function in {x}='value' format", function() {
            var tree = new Tree();
            // try branched function with steps and stepblocks with bad steps in both the steps and stepblocks. Bad steps can be not in {x}='value' format, or have children themselves.
        });

        it.skip("if function B is declared within function A, and A is called, the children of the call to A will be able to call B", function() {
            var tree = new Tree();
        });

        it.skip("branchifies a step block with no children", function() {
            var tree = new Tree();
        });

        it.skip("branchifies a step block with children", function() {
            var tree = new Tree();
        });

        it.skip("branchifies two levels of step blocks", function() {
            var tree = new Tree();
        });

        it.skip("branchifies a .. step with no children", function() {

        });

        it.skip("branchifies a .. step with children", function() {
            // indented string of steps (with children and functions correctly connected to bottom)
        });

        it.skip("branchifies a .. step that is a function call and has no children", function() {

        });

        it.skip("branchifies a .. step that is a function call and has children", function() {
            // the .. doesn't apply to within each function call
        });

        it.skip("branchifies a .. step that is a function call, has children, and whose function declaration starts with a ..", function() {

        });

        it.skip("branchifies a .. step that is a function call, has children, and where the function declaration has multiple branches", function() {
            // the .. doesn't apply to within each function call
            // see documentation and test_language_sample.txt
        });

        it.skip("branchifies a .. step that is a function call, has children, where the function declaration has a function call", function() {

        });

        it.skip("branchifies a .. step that has a step block as a child", function() {

        });

        it.skip("branchifies a .. step that has a step block as a child, and a single step as its child", function() {

        });

        it.skip("branchifies a .. step that has a step block as a child, and another step block as its child", function() {

        });

        it.skip("branchifies a .. step that has other .. steps as children", function() {

        });

        it.skip("branchifies a .. step block with no children", function() {

        });

        it.skip("branchifies a .. step block with a single branch of children", function() {

        });

        it.skip("branchifies a .. step block with multiple branches of children", function() {
            // indented string of steps (with children and functions correctly connected to bottom)
            // expands the branches beneath a .. step block to under each step within the .. step block
        });

        it.skip("branchifies a .. step block that contains function calls", function() {
            // function has one branch only
        });

        it.skip("branchifies a .. step block that contains a function call, whose function declaration starts with a ..", function() {

        });

        it.skip("branchifies a .. step block that contains function calls, where each function has multiple branches", function() {
            // One branch resulting: 1st step's function 1st branch, 1st step's function 2nd branch, 2nd step's function 1st branch, etc.
        });

        it.skip("branchifies the * After Every Branch hook", function() {
            var tree = new Tree();
            // have it expand to multiple leaves, but not to all leaves in the tree
        });

        it.skip("branchifies the * After Every Branch hook with multiple branches", function() {
            var tree = new Tree();
            // have the function declaration have multiple branches itself
        });

        it.skip("branchifies the * After Every Branch hook such that built-in hooks execute last", function() {
            var tree = new Tree();
        });

        it.skip("branchifies the * After Every Branch hook if it has a ..", function() {
            var tree = new Tree();
        });

        it.skip("branchifies the * Before Everything hook", function() {
            var tree = new Tree();
        });

        it.skip("branchifies the * Before Everything hook with multiple branches", function() {
            var tree = new Tree();
        });

        it.skip("branchifies the * Before Everything hook if it has a ..", function() {
            var tree = new Tree();
        });

        it.skip("branchifies the * After Everything hook", function() {
            var tree = new Tree();
        });

        it.skip("branchifies the * After Everything hook when it itself has multiple branches", function() {
            var tree = new Tree();
        });

        it.skip("branchifies the * After Everything hook if it has a ..", function() {
            var tree = new Tree();
        });

        it.skip("rejects the * Before Everything hook when not at 0 indents", function() {
            var tree = new Tree();
        });

        it.skip("rejects the * After Everything hook when not at 0 indents", function() {
            var tree = new Tree();
        });

        it.skip("handles multiple hooks of the same type that are siblings", function() {
            var tree = new Tree();
        });

        it.skip("handles multiple hooks of the same type that are at different levels in the tree", function() {
            var tree = new Tree();
        });

        it.skip("handles different hooks that are siblings", function() {
            var tree = new Tree();
        });

        it.skip("rejects a hook function declaration with the wrong casing", function() {
            var tree = new Tree();
            // every word must be capitalized, such as "After Every Branch"
        });

        it.skip("throws an exception when there's a circular reference among function calls", function() {
            var tree = new Tree();
            // this will probably be a js stack size exception
        });
    });

    describe("generateBranches()", function() {
        it.skip("sets the frequency of a branch when the {frequency} variable is set on a leaf", function() {
            var tree = new Tree();
        });

        it.skip("sets the frequency of multiple branches when the {frequency} variable is set", function() {
            var tree = new Tree();
            // have multiple branches have their {frequency} set
        });

        it.skip("sets the frequency of a branch to medium when the {frequency} variable is absent", function() {
            var tree = new Tree();
        });

        it.skip("sets the frequency of a branch to the deepest {frequency} variable when more than one exist on a branch", function() {
            var tree = new Tree();
        });

        it.skip("sorts branches by {frequency}, then breadth-first", function() {
            var tree = new Tree();
        });

        it.skip("when called a second time, sets a flag to only run previously failed branches", function() {
            // When generateBranches() is called and this.branches already exists, this.branches is assumed to have been run already
        });









    });

    describe("pruneBranches()", function() {
        it.skip("isolates the first branch with ~ encountered", function() {
            // try multiple ~'s on different siblings, only the first one is chosen
            // as for branches below the ~, the first breadth-first one is chosen
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
