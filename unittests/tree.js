const assert = require('assert');
const Tree = require('../tree.js');

describe("Tree", function() {
    describe("numIndents()", function() {
        var tree = new Tree();

        it("counts spaces properly", function() {
            assert.equal(tree.numIndents('meow', 'file.txt', 10), 0);
            assert.equal(tree.numIndents('    meow blah', 'file.txt', 10), 1);
            assert.equal(tree.numIndents('        meow  \t ', 'file.txt', 10), 2);
        });

        it("throws an exception for non-whitespace at the beginning of a step", function() {
            assert.throws(() => { tree.numIndents('\tmeow', 'file.txt', 10); });
            assert.throws(() => { tree.numIndents(' \tmeow', 'file.txt', 10); });
        });

        it("throws an exception for a number of spaces not a multiple of 4", function() {
            assert.throws(() => { tree.numIndents(' meow', 'file.txt', 10); });
            assert.throws(() => { tree.numIndents('  meow', 'file.txt', 10); });
            assert.throws(() => { tree.numIndents('   meow', 'file.txt', 10); });
            assert.throws(() => { tree.numIndents('     meow', 'file.txt', 10); });
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
            assert.equal(step.isFunctionCall, undefined);
            assert.equal(step.isMustTest, undefined);
            assert.equal(step.isTODO, undefined);
            assert.equal(step.isMANUAL, undefined);
            assert.equal(step.isDebug, undefined);
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
            var step = tree.parseLine(`    My Function call * `, "file.txt", 10);
            assert.equal(step.text, `My Function call`);
            assert.equal(step.isFunctionDeclaration, undefined);
            assert.equal(step.isFunctionCall, true);
        });

        it("throws an error if a function call is also a code step", function() {
            assert.throws(() => {
                tree.parseLine(`Something * + {`, "file.txt", 10);
            });
        });

        it("parses a Must Test step", function() {
            var step = tree.parseLine(`Must Test foo bar *`, "file.txt", 10);
            assert.equal(step.isMustTest, true);
            assert.equal(step.mustTestText, 'foo bar');

            step = tree.parseLine(`    Must Test foo bar  *  `, "file.txt", 10);
            assert.equal(step.isMustTest, true);
            assert.equal(step.mustTestText, 'foo bar');

            step = tree.parseLine(`Must Test   *  `, "file.txt", 10);
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

        it("parses the to-do identifier (-TODO)", function() {
            var step = tree.parseLine(`Click {button} -TODO`, "file.txt", 10);
            assert.equal(step.text, `Click {button}`);
            assert.equal(step.isTODO, true);

            step = tree.parseLine(`Click {button} + -TODO ~`, "file.txt", 10);
            assert.equal(step.text, `Click {button}`);
            assert.equal(step.isTODO, true);
        });

        it("parses the manual identifier (-MANUAL)", function() {
            var step = tree.parseLine(`Click {button} -MANUAL`, "file.txt", 10);
            assert.equal(step.text, `Click {button}`);
            assert.equal(step.isMANUAL, true);

            step = tree.parseLine(`Click {button} + -MANUAL ~`, "file.txt", 10);
            assert.equal(step.text, `Click {button}`);
            assert.equal(step.isMANUAL, true);
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

            step = tree.parseLine(`Click {button} -MANUAL + ~ // comment`, "file.txt", 10);
            assert.equal(step.text, `Click {button}`);
            assert.equal(step.isNonParallel, true);
        });

        it("parses the sequential identifier (..)", function() {
            var step = tree.parseLine(`Click {button} ..`, "file.txt", 10);
            assert.equal(step.text, `Click {button}`);
            assert.equal(step.isSequential, true);

            step = tree.parseLine(`Click {button} -MANUAL .. ~ // comment`, "file.txt", 10);
            assert.equal(step.text, `Click {button}`);
            assert.equal(step.isSequential, true);
        });

        it("returns '..' when the whole line is a sequential identifier (..)", function() {
            var step = tree.parseLine(`    .. `, "file.txt", 10);
            assert.equal(step, '..');
        });

        it("parses the expected fail identifier (#)", function() {
            var step = tree.parseLine(`Click {button} #`, "file.txt", 10);
            assert.equal(step.text, `Click {button}`);
            assert.equal(step.isExpectedFail, true);

            step = tree.parseLine(`Click {button} -MANUAL # ~ // comment`, "file.txt", 10);
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
            assert.deepEqual(step.varsList, [ {name: "'Login' box", isLocal: false, elementFinder: {text: 'Login', selector: 'box'}} ]);

            step = tree.parseLine(`Click {'Login'}`, "file.txt", 10);
            assert.equal(step.text, `Click {'Login'}`);
            assert.equal(step.varsBeingSet, undefined);
            assert.deepEqual(step.varsList, [ {name: "'Login'", isLocal: false, elementFinder: {text: 'Login'}} ]);

            step = tree.parseLine(`Click { 'Login' box  next to  "meow" }`, "file.txt", 10);
            assert.equal(step.text, `Click { 'Login' box  next to  "meow" }`);
            assert.equal(step.varsBeingSet, undefined);
            assert.deepEqual(step.varsList, [ {name: " 'Login' box  next to  \"meow\" ", isLocal: false, elementFinder: {text: 'Login', selector: 'box', nextTo: 'meow'}} ]);

            step = tree.parseLine(`Click { 'Login' next to "meow" }`, "file.txt", 10);
            assert.equal(step.text, `Click { 'Login' next to "meow" }`);
            assert.equal(step.varsBeingSet, undefined);
            assert.deepEqual(step.varsList, [ {name: " 'Login' next to \"meow\" ", isLocal: false, elementFinder: {text: 'Login', nextTo: 'meow'}} ]);

            step = tree.parseLine(`Click {box next to "meow"}`, "file.txt", 10);
            assert.equal(step.text, `Click {box next to "meow"}`);
            assert.equal(step.varsBeingSet, undefined);
            assert.deepEqual(step.varsList, [ {name: "box next to \"meow\"", isLocal: false, elementFinder: {selector: 'box', nextTo: 'meow'}} ]);
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

        it("throws an error when a step is both a function declaration and call", function() {
            assert.throws(() => {
                tree.parseLine(` *  My Function declaration and call  * `, "file.txt", 10);
            });
        });

        it("returns null for empty or all-whitespace lines", function() {
            var step = tree.parseLine(``, "file.txt", 10);
            assert.equal(step, null);

            step = tree.parseLine(`     `, "file.txt", 10);
            assert.equal(step, null);
        });
    });

    describe("parseElementFinder()", function() {
        var tree = new Tree();

        it("parses ElementFinders with text and selector", function() {
            var elementFinder = tree.parseElementFinder(`'Login' box`);
            assert.deepEqual(elementFinder, {text: 'Login', selector: 'box'});
        });

        it("parses ElementFinders with text", function() {
            var elementFinder = tree.parseElementFinder(`'Login'`);
            assert.deepEqual(elementFinder, {text: 'Login'});
        });

        it("parses ElementFinders with text, selector, and nextTo", function() {
            var elementFinder = tree.parseElementFinder(` 'Login' box  next to  "meow" `);
            assert.deepEqual(elementFinder, {text: 'Login', selector: 'box', nextTo: 'meow'});
        });

        it("parses ElementFinders with text and nextTo", function() {
            var elementFinder = tree.parseElementFinder(` 'Login' next to "meow" `);
            assert.deepEqual(elementFinder, {text: 'Login', nextTo: 'meow'});
        });

        it("parses ElementFinders with selector and nextTo", function() {
            var elementFinder = tree.parseElementFinder(`box next to "meow"`);
            assert.deepEqual(elementFinder, {selector: 'box', nextTo: 'meow'});
        });

        it("returns null for invalid ElementFinders", function() {
            var elementFinder = tree.parseElementFinder(`something 'not' elementfinder`);
            assert.equal(elementFinder, null);
        });
    });

    describe("parseIn()", function() {
        it.skip("TEXT", function() {
        });
















    });
});
