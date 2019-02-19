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

        it("parses {var} = Step", function() {
            var step = tree.parseLine(`{var} = Click 'something' {blah}`, "file.txt", 10);
            assert.equal(step.text, `{var} = Click 'something' {blah}`);
            assert.deepEqual(step.varsBeingSet, [ {name: "var", value: "Click 'something' {blah}", isLocal: false} ]);
            assert.deepEqual(step.varsList, [ {name: "var", isLocal: false}, {name: "blah", isLocal: false} ]);

            step = tree.parseLine(`{var} = 'foo'`, "file.txt", 10);
            assert.equal(step.text, `{var} = 'foo'`);
            assert.deepEqual(step.varsBeingSet, [ {name: "var", value: "'foo'", isLocal: false} ]);
            assert.deepEqual(step.varsList, [ {name: "var", isLocal: false} ]);

            step = tree.parseLine(`    {var with spaces}  = Click 'something' {{blah}}`, "file.txt", 10);
            assert.equal(step.text, `{var with spaces}  = Click 'something' {{blah}}`);
            assert.deepEqual(step.varsBeingSet, [ {name: "var with spaces", value: "Click 'something' {{blah}}", isLocal: false} ]);
            assert.deepEqual(step.varsList, [ {name: "var with spaces", isLocal: false}, {name: "blah", isLocal: true} ]);
        });

        it("parses {{var}} = Step", function() {
            var step = tree.parseLine(`{{var}} = Click 'something' {blah}`, "file.txt", 10);
            assert.equal(step.text, `{{var}} = Click 'something' {blah}`);
            assert.deepEqual(step.varsBeingSet, [ {name: "var", value: "Click 'something' {blah}", isLocal: true} ]);
            assert.deepEqual(step.varsList, [ {name: "var", isLocal: true}, {name: "blah", isLocal: false} ]);

            step = tree.parseLine(`{{var}} = 'foo \\\''`, "file.txt", 10);
            assert.equal(step.text, `{{var}} = 'foo \\\''`);
            assert.deepEqual(step.varsBeingSet, [ {name: "var", value: "'foo \\\''", isLocal: true} ]);
            assert.deepEqual(step.varsList, [ {name: "var", isLocal: true} ]);

            step = tree.parseLine(`    {{var with spaces}} =  Click 'something' {{blah}}`, "file.txt", 10);
            assert.equal(step.text, `{{var with spaces}} =  Click 'something' {{blah}}`);
            assert.deepEqual(step.varsBeingSet, [ {name: "var with spaces", value: "Click 'something' {{blah}}", isLocal: true} ]);
            assert.deepEqual(step.varsList, [ {name: "var with spaces", isLocal: true}, {name: "blah", isLocal: true} ]);

            step = tree.parseLine(`{{var}} = Click 'something \\\\ \'' "something2 \"" {blah} {{blah2}}`, "file.txt", 10);
            assert.deepEqual(step.varsBeingSet, [ {name: "var", value: `Click 'something \\\\ \'' "something2 \"" {blah} {{blah2}}`, isLocal: true} ]);
            assert.deepEqual(step.varsList, [ {name: "var", isLocal: true}, {name: "blah", isLocal: false}, {name: "blah2", isLocal: true} ]);
        });

        it("parses multiple {var} = 'string literal', separated by commas", function() {
            var step = tree.parseLine(`{var1} = 'one', {{var2}}='two 2', {var 3}= "three 3" +`, "file.txt", 10);
            assert.equal(step.text, `{var1} = 'one', {{var2}}='two 2', {var 3}= "three 3"`);
            assert.deepEqual(step.varsBeingSet, [ {name: "var1", value: "'one'", isLocal: false}, {name: "var2", value: "'two 2'", isLocal: true}, {name: "var 3", value: "\"three 3\"", isLocal: false} ]);
            assert.deepEqual(step.varsList, [ {name: "var1", isLocal: false}, {name: "var2", isLocal: true}, {name: "var 3", isLocal: false} ]);
        });

        it("doesn't recognize {vars} with backslashes in their names", function() {
            var step = tree.parseLine(`{var\\} = Click 'something \\{blah\\}' {foo}`, "file.txt", 10);
            assert.equal(step.text, `{var\\} = Click 'something \\{blah\\}' {foo}`);
            assert.equal(step.varsBeingSet, undefined);
            assert.deepEqual(step.varsList, [ {name: "foo", isLocal: false} ]);
        });

        it("parses {vars} that are ElementFinders", function() {
            var step = tree.parseLine(`Click {'Login' box}`, "file.txt", 10);
            assert.equal(step.text, `Click {'Login' box}`);
            assert.equal(step.varsBeingSet, undefined);
            assert.deepEqual(step.varsList, [ {name: "'Login' box", isLocal: false, elementFinder: {text: 'Login', variable: 'box'}} ]);

            step = tree.parseLine(`Click {'Login'}`, "file.txt", 10);
            assert.equal(step.text, `Click {'Login'}`);
            assert.equal(step.varsBeingSet, undefined);
            assert.deepEqual(step.varsList, [ {name: "'Login'", isLocal: false, elementFinder: {text: 'Login'}} ]);

            step = tree.parseLine(`Click { 4th 'Login' box  next to  "blah" }`, "file.txt", 10);
            assert.equal(step.text, `Click { 4th 'Login' box  next to  "blah" }`);
            assert.equal(step.varsBeingSet, undefined);
            assert.deepEqual(step.varsList, [ {name: " 4th 'Login' box  next to  \"blah\" ", isLocal: false, elementFinder: {ordinal: 4, text: 'Login', variable: 'box', nextTo: 'blah'}} ]);

            step = tree.parseLine(`Click { 'Login' next to "blah" }`, "file.txt", 10);
            assert.equal(step.text, `Click { 'Login' next to "blah" }`);
            assert.equal(step.varsBeingSet, undefined);
            assert.deepEqual(step.varsList, [ {name: " 'Login' next to \"blah\" ", isLocal: false, elementFinder: {text: 'Login', nextTo: 'blah'}} ]);

            step = tree.parseLine(`Click {box next to "blah"}`, "file.txt", 10);
            assert.equal(step.text, `Click {box next to "blah"}`);
            assert.equal(step.varsBeingSet, undefined);
            assert.deepEqual(step.varsList, [ {name: "box next to \"blah\"", isLocal: false, elementFinder: {variable: 'box', nextTo: 'blah'}} ]);
        });

        it("throws an error when a {var} contains a quote and isn't a valid ElementFinder", function() {
            assert.throws(() => {
                tree.parseLine(`Step {something 'not' elementfinder}`, "file.txt", 10);
            });
        });

        it("lists {vars} contained inside 'string literals'", function() {
            var step = tree.parseLine(`Click {var1} "something {var2} {{var3}} foo" '{var4}'`, "file.txt", 10);
            assert.equal(step.text, `Click {var1} "something {var2} {{var3}} foo" '{var4}'`);
            assert.equal(step.varsBeingSet, undefined);
            assert.deepEqual(step.varsList, [ {name: "var1", isLocal: false}, {name: "var2", isLocal: false}, {name: "var3", isLocal: true}, {name: "var4", isLocal: false} ]);
        });

        it("throws an error when a {var} being set has quotes in it", function() {
            assert.throws(() => {
                tree.parseLine(`{var1"} = 'one'`, "file.txt", 10);
            });

            assert.throws(() => {
                tree.parseLine(`{var1'} = 'one'`, "file.txt", 10);
            });
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
                                    lineNumber: 5,
                                    indents: 1,
                                    parent: { text: 'A' },
                                    children: [
                                        {
                                            text: 'F',
                                            lineNumber: 6,
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
                            lineNumber: 7,
                            indents: 0,
                            parent: { indents: -1 },
                            children: []
                        },
                        {
                            text: 'H',
                            lineNumber: 8,
                            indents: 0,
                            parent: { indents: -1 },
                            children: [
                                {
                                    text: 'I',
                                    lineNumber: 9,
                                    indents: 1,
                                    parent: { text: 'H' },
                                    children: [
                                        {
                                            text: 'J',
                                            lineNumber: 10,
                                            indents: 2,
                                            parent: { text: 'I' },
                                            children: [
                                                {
                                                    text: 'K',
                                                    lineNumber: 11,
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
                            lineNumber: 12,
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
                                    lineNumber: 8,
                                    indents: 1,
                                    parent: { text: 'A' },
                                    children: [
                                        {
                                            text: 'F',
                                            lineNumber: 9,
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
                            lineNumber: 11,
                            indents: 0,
                            parent: { indents: -1 },
                            children: []
                        },
                        {
                            text: 'H',
                            lineNumber: 12,
                            indents: 0,
                            parent: { indents: -1 },
                            children: [
                                {
                                    text: 'I',
                                    lineNumber: 13,
                                    indents: 1,
                                    parent: { text: 'H' },
                                    children: [
                                        {
                                            text: 'J',
                                            lineNumber: 16,
                                            indents: 2,
                                            parent: { text: 'I' },
                                            children: [
                                                {
                                                    text: 'K',
                                                    lineNumber: 17,
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
                            lineNumber: 18,
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
                                    lineNumber: 8,
                                    filename: 'file1.txt',
                                    indents: 1,
                                    parent: { text: 'A' },
                                    children: [
                                        {
                                            text: 'F',
                                            lineNumber: 9,
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
                            lineNumber: 2,
                            filename: 'file2.txt',
                            indents: 0,
                            parent: { indents: -1 },
                            children: [
                                {
                                    text: 'I',
                                    lineNumber: 3,
                                    filename: 'file2.txt',
                                    indents: 1,
                                    parent: { text: 'H' },
                                    children: [
                                        {
                                            text: 'J',
                                            lineNumber: 6,
                                            filename: 'file2.txt',
                                            indents: 2,
                                            parent: { text: 'I' },
                                            children: [
                                                {
                                                    text: 'K',
                                                    lineNumber: 7,
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

        it.skip("parses a .. step block on the first line", function() {
        });

        it.skip("parses an empty first line followed by a .. step block", function() {
        });

        it.skip("parses a .. step block that is adjacent to the line directly above (but indented)", function() {
        });

        it.skip("rejects a step block containing a .. line in the middle", function() {
        });

        it.skip("rejects a step block containing a .. line at the end", function() {
        });

        it.skip("rejects a .. line by itself", function() {
        });

        it.skip("rejects a .. line that's immediately followed by indented children", function() {
        });

        it.skip("rejects a .. line followed by a non-step block", function() {
            // followed by what looks to be a step block, but then an indented child with no empty line in between
        });

        it.skip("parses a normal first line, followed by an indented .. step block", function() {
        });

        it.skip("parses a normal first line, followed by an empty line, followed by an indented .. step block", function() {
        });

        it.skip("parses a step block, followed by an indented .. step block", function() {
        });

        it.skip("parses a step block, followed by an empty line, followed by an indented .. step block", function() {
        });

        it.skip("parses a .. step block, followed by an indented .. step block", function() {
        });

        it.skip("parses a .. step block, followed by an empty line, followed by an indented .. step block", function() {
        });

        it.skip("doesn't call a group of consecutive steps immediately followed by an indented child a step block", function() {
        });

        it.skip("parses a code block", function() {
        });

        it.skip("parses an empty code block", function() {
            /*
            Step {
            }
            */
        });

        it.skip("parses a code block with children", function() {
        });

        it.skip("parses a code block with step blocks as children", function() {
        });

        it.skip("parses a code block with code blocks as children", function() {
        });

        it.skip("rejects a code block that isn't closed", function() {
        });

        it.skip("rejects a code block with a closing } at the wrong indentation", function() {
        });
    });
});
