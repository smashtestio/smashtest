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
            assert.equal(step.isMustTest, undefined);
            assert.equal(step.isToDo, undefined);
            assert.equal(step.isManual, undefined);
            assert.equal(step.isDebug, undefined);
            assert.equal(step.isTextualStep, undefined);
            assert.equal(step.isStepByStepDebug, undefined);
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

        it("throws an error if a textual step is also a code step", function() {
            assert.throws(() => {
                tree.parseLine(`Something + - {`, "file.txt", 10);
            });
        });

        it("throws an error if a textual step is also a function declaration", function() {
            assert.throws(() => {
                tree.parseLine(`* Something - +`, "file.txt", 10);
            });

            assert.throws(() => {
                tree.parseLine(`    * Something - + {`, "file.txt", 10);
            });
        });

        it("parses a Must Test step", function() {
            var step = tree.parseLine(`Must Test foo bar`, "file.txt", 10);
            assert.equal(step.isMustTest, true);
            assert.equal(step.mustTestText, 'foo bar');

            step = tree.parseLine(`    Must Test foo bar  `, "file.txt", 10);
            assert.equal(step.isMustTest, true);
            assert.equal(step.mustTestText, 'foo bar');

            step = tree.parseLine(`Must Test    `, "file.txt", 10);
            assert.equal(step.isMustTest, undefined);
            assert.equal(step.mustTestText, undefined);
        });

        it("throws an error if a function declaration is also a Must Test step", function() {
            assert.throws(() => {
                tree.parseLine(`* Must Test something`, "file.txt", 10);
            });

            assert.throws(() => {
                tree.parseLine(`    *  Must Test something  `, "file.txt", 10);
            });
        });

        it("parses a code block", function() {
            var step = tree.parseLine(`Click 'A button' + { `, "file.txt", 10);
            assert.equal(step.text, `Click 'A button'`);
            assert.equal(step.codeBlock, ' ');
        });

        it("parses a code block followed by a comment", function() {
            var step = tree.parseLine(`Click 'A button' + { // comment here`, "file.txt", 10);
            assert.equal(step.text, `Click 'A button'`);
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

            step = tree.parseLine(`Click {button} + ~ {`, "file.txt", 10);
            assert.equal(step.text, `Click {button}`);
            assert.equal(step.isDebug, true);
            assert.equal(step.isStepByStepDebug, undefined);
        });

        it("parses the step-by-step debug identifier (~~)", function() {
            var step = tree.parseLine(`Click {button} ~~`, "file.txt", 10);
            assert.equal(step.text, `Click {button}`);
            assert.equal(step.isDebug, undefined);
            assert.equal(step.isStepByStepDebug, true);

            step = tree.parseLine(`Click {button} + ~~ {`, "file.txt", 10);
            assert.equal(step.text, `Click {button}`);
            assert.equal(step.isDebug, undefined);
            assert.equal(step.isStepByStepDebug, true);
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
                tree.parseLine(`Something [in brackets]`, "file.txt", 10);
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

        it("rejects ElementFinders with ordinal", function() {
            var elementFinder = tree.parseElementFinder(`1st`);
            assert.equal(elementFinder, null);

            elementFinder = tree.parseElementFinder(`   2nd  `);
            assert.equal(elementFinder, null);
        });

        it("parses ElementFinders with text", function() {
            var elementFinder = tree.parseElementFinder(`'Login'`);
            assert.deepEqual(elementFinder, {text: 'Login'});

            elementFinder = tree.parseElementFinder(` 'Login' `);
            assert.deepEqual(elementFinder, {text: 'Login'});
        });

        it("rejects ElementFinders with variable", function() {
            var elementFinder = tree.parseElementFinder(`foobar`);
            assert.equal(elementFinder, null);

            elementFinder = tree.parseElementFinder(`   foobar  `);
            assert.equal(elementFinder, null);
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

            elementFinder = tree.parseElementFinder(`foobar`);
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
                    line: '',
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
                    line: '',
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
                    line: '',
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
                    line: '',
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
                    line: '',
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
                    line: '',
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
                    line: '',
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

        it("parses a step block at the very top, with an empty line above it", function() {
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
                    line: '',
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

        it("parses a step block in the middle", function() {
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
                    line: '',
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
                    line: '',
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
                    line: '',
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
                    line: '',
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
                    line: '',
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
                    line: '',
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
                    line: '',
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
                    line: '',
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
`
..
A
B
    C
`
                , "file.txt");
            });

            assert.throws(() => {
                tree.parseIn(
`A

    ..
    B
    C
        D

E
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
                    line: '',
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
                    line: '',
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
                    line: '',
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
                    line: '',
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
                    line: '',
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
                    line: '',
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
                    line: '',
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

        it("rejects a step block immediately followed by an indented child, with no empty line in between", function() {
            var tree = new Tree();
            assert.throws(() => {
                tree.parseIn(
`A
B
    C
`
                , "file.txt");
            });

            assert.throws(() => {
                tree.parseIn(
`A
B
    C
D
E
`
                , "file.txt");
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
                    line: '',
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
                    line: '',
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
                    line: '',
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
                    line: '',
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
                    line: '',
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
                    line: '',
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
                    line: '',
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
                    line: '',
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
        Another code block # {
            blah;
        }`
            , "file.txt");

            expect(tree).to.containSubset({
                root: {
                    line: '',
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

    describe("finalize()", function() {
        it("runs without crashing", function() {
            var tree = new Tree();
            tree.parseIn(`Click ['Login' button]`);
            tree.finalize();
        });
    });

    describe("isFunctionMatch()", function() {
        it("matches a function call and function declaration with the same text", function() {
            var tree = new Tree();
            expect(tree.isFunctionMatch("Step name here", "Step name here", "filename.text", 10)).to.equal(true);
        });

        it("doesn't match a function call and function declaration with different text", function() {
            var tree = new Tree();
            expect(tree.isFunctionMatch("Step name here", "Different name here", "filename.text", 10)).to.equal(false);
        });

        it("matches a function call and function declaration with the same text but differing amounts of whitespace", function() {
            var tree = new Tree();
            expect(tree.isFunctionMatch("Step name here", "  Step  name here ", "filename.text", 10)).to.equal(true);
        });

        it("throws an exception if a function call and function declaration match case insensitively but not case sensitively", function() {
            var tree = new Tree();
            assert.throws(() => {
                tree.isFunctionMatch("Step name here", "step name here", "filename.text", 10);
            });
        });

        it("matches a function declaration with {{vars}} and a function call with {{vars}}, {vars}, 'strings', \"strings\", and [ElementFinders]", function() {
            var tree = new Tree();
            expect(tree.isFunctionMatch("Step {{var1}} and {{var2}} {{var3}} also {{var4}}, {{var5}}", "Step {{varA}} and  {varB} 'string C' also \"stringD\", [4th 'Login' button]", "filename.text", 10)).to.equal(true);
        });

        it("doesn't match a function declaration with {{vars}} and a function call with extra {vars} at the end", function() {
            var tree = new Tree();
            expect(tree.isFunctionMatch("Step {{var1}}", "Step {varA} {varB}", "filename.text", 10)).to.equal(false);
        });

        it("doesn't match a function declaration with {{vars}} and a function call with extra 'strings' at the end", function() {
            var tree = new Tree();
            expect(tree.isFunctionMatch("Step {{var1}}", "Step 'stringA' 'stringB'", "filename.text", 10)).to.equal(false);
        });

        it("doesn't match a function declaration with {{vars}} and a function call with extra [ElementFinders] at the end", function() {
            var tree = new Tree();
            expect(tree.isFunctionMatch("Step {{var1}}", "Step {varA} ['element' finderB]", "filename.text", 10)).to.equal(false);
        });
    });

    describe("expandTree()", function() {
        it.skip("expands a function call", function() {
            var tree = new Tree();
            tree.parseIn(`Click ['Login' button]`);











        });

        it.skip("expands a function call with multiple branches", function() {
            var tree = new Tree();
        });

        it.skip("expands multiple function calls in the tree", function() {
            var tree = new Tree();
        });

        it.skip("expands a function call within a function call", function() {
            var tree = new Tree();
        });

        it.skip("expands a function call with multiple branches within a function call with multiple branches", function() {
            var tree = new Tree();
        });

        it.skip("finds the right function even if declaration has different amounts of whitespace between words", function() {
            var tree = new Tree();
        });

        it.skip("finds the right function when multiple functions with the same name exist", function() {
            var tree = new Tree();
        });

        it.skip("finds the right function when a function call contains strings, variables, and elementFinders", function() {
            var tree = new Tree();
        });

        it.skip("finds the right function on a {var} = Func code block that returns a value", function() {
            var tree = new Tree();
        });

        it.skip("expands on a {var} = Func that has muliple branches that set a variable", function() {
            var tree = new Tree();
        });

        it.skip("rejects {var} = Func if Func is neither a code block, nor a branched function in {x}='value' format", function() {
            var tree = new Tree();
        });

        it.skip("finds a built-in function", function() {
            var tree = new Tree();
        });

        it.skip("expands the declared function when it has the same signature as a built-in function", function() {
            var tree = new Tree();
        });

        it.skip("if function B is declared within function A, and A is called, the branches below now have access to B", function() {
            var tree = new Tree();
        });

        it.skip("expands the branches beneath a step block to under each step within the step block", function() {
            var tree = new Tree();
        });

        it.skip("expands .. steps", function() {
            // indented string of steps (with children and functions correctly connected to bottom)
        });

        it.skip("expands .. step blocks", function() {
            // indented string of steps (with children and functions correctly connected to bottom)
        });

        it.skip("expands the branches beneath a .. step block to under each step within the .. step block", function() {
            var tree = new Tree();
            // also carries over step block's isSequential to its steps
        });

        it.skip("expands the * Before all branches hook", function() {
            var tree = new Tree();
        });

        it.skip("expands the * After all branches hook", function() {
            var tree = new Tree();
        });

        it.skip("expands the * Before every branch hook", function() {
            var tree = new Tree();
        });

        it.skip("expands the * After every branch hook", function() {
            var tree = new Tree();
        });

        it.skip("expands the * Before every step hook", function() {
            var tree = new Tree();
        });

        it.skip("expands the * After every step hook", function() {
            var tree = new Tree();
        });

        it.skip("expands the * After failed step hook", function() {
            var tree = new Tree();
        });

        it.skip("expands the * After successful step hook", function() {
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

        it.skip("expands Must Test X", function() {
            var tree = new Tree();
            // puts that tree into a separate variable (i.e., step.mustTestTree)
        });

        it.skip("expands {var} = Must Test X", function() {
            var tree = new Tree();
            // puts that tree into a separate variable (i.e., step.mustTestTree)
        });

        it.skip("rejects steps that cannot be found", function() {
            var tree = new Tree();
            // neither a declared function nor a built-in function
        });

        it.skip("rejects Must Test X where X cannot be found", function() {
            var tree = new Tree();
        });

        it.skip("rejects Must Test X where X is a code block", function() {
            var tree = new Tree();
        });

        it.skip("rejects {var} = Must Test X where X is not a branched function in {x}='value' format", function() {
            var tree = new Tree();
        });

        it.skip("rejects with a special error steps that match case insensitively but not case sensitively", function() {
            var tree = new Tree();
        });

        it.skip("rejects function calls to functions that were declared in a different scope", function() {
            var tree = new Tree();
        });

        it.skip("throws an exception when there's a circular reference among function calls", function() {
            var tree = new Tree();
            // this will probably be a js stack size exception
        });
    });

    describe("validateTree()", function() {
        it.skip("throws an exception when a {var} is used but never set in a branch", function() {

        });

        it.skip("accepts a Must Test X statement that's fulfilled exactly", function() {
            // structure under Must Test X is exactly the same as the one under X
            // X contains both textual steps (must have - in both X and under Must Test X) and simple function calls (no vars, strings, elementFinders)
        });

        it.skip("accepts a Must Test X statement that's fulfilled", function() {
            // any amount of children between steps under Must Test X
        });

        it.skip("rejects a Must Test X statement that's not fulfilled", function() {

        });

        it.skip("rejects a Must Test X statement that's only fullfilled partially", function() {

        });

        it.skip("rejects a Must Test X statement that's fulfilled in a different part of the tree but not underneath", function() {

        });

        it.skip("accepts a Must Test X statement that's fulfilled by steps with different amounts of whitespace", function() {

        });

        it.skip("accepts a Must Test X statement that's fulfilled once function calls under the statement are expanded", function() {

        });

        it.skip("accepts a Must Test X statement that's inside a called function and is fulfilled outside the function call", function() {

        });

        it.skip("rejects a Must Test X statement that's inside a called function and is not fulfilled", function() {

        });

        it.skip("accepts a Must Test X statement that has step blocks and is fulfilled", function() {

        });

        it.skip("rejects a Must Test X statement that has step blocks and is not fulfilled", function() {

        });

        it.skip("accepts a Must Test X statement where X contains complex function calls and is fulfilled", function() {
            // X contains complex function calls (vars, strings, elementFinders). Ensure those exact functions are called, with those exact inputs.
        });

        it.skip("rejects a Must Test X statement where X contains complex function calls and is not fulfilled", function() {
            // X contains complex function calls (vars, strings, elementFinders). Ensure those exact functions are called, with those exact inputs.
        });

        it.skip("accepts a Must Test {var} = X statement that's fulfilled", function() {
            // any variable name in X
        });

        it.skip("rejects a Must Test {var} = X statement that's not fulfilled", function() {

        });

        it.skip("rejects a Must Test {var} = X statement when X is not in the correct format", function() {

        });
    });

    describe("convertToBranches()", function() {
        it.skip("generates branches from the tree", function() {

        });

        it.skip("orders branches breadth-first", function() {

        });

        it.skip("orders branches based on their {frequency}, then breadth-first", function() {

        });

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

        it.skip("when called a second time, sets a flag to only run previously failed branches", function() {
            // When convertToBranches() is called and this.branches already exists, this.branches is assumed to have been run already
        });
    });
});
