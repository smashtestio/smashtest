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

describe("Tree", () => {
    describe("numIndents()", () => {
        let tree = new Tree();

        it("counts spaces properly", () => {
            assert.equal(tree.numIndents('m ', 'file.txt', 10), 0);
            assert.equal(tree.numIndents('blah', 'file.txt', 10), 0);
            assert.equal(tree.numIndents('    blah blah', 'file.txt', 10), 1);
            assert.equal(tree.numIndents('        blah  \t ', 'file.txt', 10), 2);
        });

        it("throws an exception for non-whitespace at the beginning of a step", () => {
            assert.throws(() => {
                tree.numIndents('\tblah', 'file.txt', 10);
            }, "Spaces are the only type of whitespace allowed at the beginning of a step [file.txt:10]");

            assert.throws(() => {
                tree.numIndents(' \tblah', 'file.txt', 10);
            }, "Spaces are the only type of whitespace allowed at the beginning of a step [file.txt:10]");
        });

        it("throws an exception for a number of spaces not a multiple of 4", () => {
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

        it("returns 0 for an empty string or all-whitespace string", () => {
            assert.equal(tree.numIndents('', 'file.txt', 10), 0);
            assert.equal(tree.numIndents(' ', 'file.txt', 10), 0);
            assert.equal(tree.numIndents('  ', 'file.txt', 10), 0);
            assert.equal(tree.numIndents('     ', 'file.txt', 10), 0);
            assert.equal(tree.numIndents('        ', 'file.txt', 10), 0);
            assert.equal(tree.numIndents('    \t   ', 'file.txt', 10), 0);
        });

        it("returns 0 for a string that's entirely a comment", () => {
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

    describe("parseLine()", () => {
        let tree = new Tree();

        context("generic tests", () => {
            it("parses a line with a string", () => {
                let step = tree.parseLine(`Click "Big Red Button"`, "file.txt", 10);
                assert.equal(step.filename, 'file.txt');
                assert.equal(step.lineNumber, 10);
                assert.equal(step.line, `Click "Big Red Button"`);
                assert.equal(step.text, `Click "Big Red Button"`);
                assert.equal(step.identifiers, undefined);
                assert.equal(step.codeBlock, undefined);
                assert.equal(step.payloadBlock, undefined);
                assert.equal(step.payloadCodeBlock, undefined);
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
                assert.equal(step.varsBeingSet, undefined);
                assert.equal(step.varsList, undefined);
            });

            it("parses a line with multiple strings and whitespace", () => {
                let step = tree.parseLine(`    Click "B\"ig" 'Re\'d' "Button ['he' re]" `, "file.txt", 10);
                assert.equal(step.line, `    Click "B\"ig" 'Re\'d' "Button ['he' re]" `);
                assert.equal(step.text, `Click "B\"ig" 'Re\'d' "Button ['he' re]"`);
                assert.equal(step.identifiers, undefined);
                assert.equal(step.codeBlock, undefined);
            });

            it("throws an error if a step only has numbers, periods, or commas", () => {
                assert.throws(() => {
                    tree.parseLine(`324798`, "file.txt", 10);
                }, "Invalid step name [file.txt:10]");

                assert.throws(() => {
                    tree.parseLine(`32, 4798`, "file.txt", 10);
                }, "Invalid step name [file.txt:10]");

                assert.throws(() => {
                    tree.parseLine(`.`, "file.txt", 10);
                }, "Invalid step name [file.txt:10]");
            });

            it("throws an error if a step starts with an identifier followed by no space", () => {
                assert.throws(() => {
                    tree.parseLine(`$Hello world`, "file.txt", 10);
                }, "Spaces must separate identifiers from each other and from the step [file.txt:10]");

                assert.throws(() => {
                    tree.parseLine(`    ~ $Hello world    `, "file.txt", 10);
                }, "Spaces must separate identifiers from each other and from the step [file.txt:10]");

                assert.throws(() => {
                    tree.parseLine(`~$ Hello world`, "file.txt", 10);
                }, "Spaces must separate identifiers from each other and from the step [file.txt:10]");

                assert.throws(() => {
                    tree.parseLine(`.. ~$ Hello world`, "file.txt", 10);
                }, "Spaces must separate identifiers from each other and from the step [file.txt:10]");

                assert.throws(() => {
                    tree.parseLine(`~$ .. Hello world`, "file.txt", 10);
                }, "Spaces must separate identifiers from each other and from the step [file.txt:10]");
            });

            it("throws an error if a step ends with an identifier with no space before it", () => {
                assert.throws(() => {
                    tree.parseLine(`Hello world$`, "file.txt", 10);
                }, "Spaces must separate identifiers from each other and from the step [file.txt:10]");

                assert.throws(() => {
                    tree.parseLine(`    Hello world.. $    `, "file.txt", 10);
                }, "Spaces must separate identifiers from each other and from the step [file.txt:10]");

                assert.throws(() => {
                    tree.parseLine(`Hello world ..$`, "file.txt", 10);
                }, "Spaces must separate identifiers from each other and from the step [file.txt:10]");

                assert.throws(() => {
                    tree.parseLine(`Hello world ..$ ~`, "file.txt", 10);
                }, "Spaces must separate identifiers from each other and from the step [file.txt:10]");

                assert.throws(() => {
                    tree.parseLine(`Hello world ~ ..$`, "file.txt", 10);
                }, "Spaces must separate identifiers from each other and from the step [file.txt:10]");
            });

            it("throws an error if a step has the name of a hook", () => {
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

            it("throws an error if a hook name is invalid", () => {
                assert.throws(() => {
                    tree.parseLine(`*** Before`, "file.txt", 10);
                }, "Invalid hook name [file.txt:10]");

                assert.throws(() => {
                    tree.parseLine(`*** Foobar`, "file.txt", 10);
                }, "Invalid hook name [file.txt:10]");
            });

            it("does not throw an error if a hook has the right casing and has a code block, regardless of whitespace", () => {
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
                    tree.parseLine(`*  Before  Everything {  `, "file.txt", 10);
                });

                assert.doesNotThrow(() => {
                    tree.parseLine(`*  After  Everything  { `, "file.txt", 10);
                });
            });

            it("throws an error if a hook doesn't start a code block", () => {
                assert.throws(() => {
                    tree.parseLine(`*** Before  Every   Branch`, "file.txt", 10);
                }, "A hook must have a code block [file.txt:10]");

                assert.throws(() => {
                    tree.parseLine(`*** After  Every   Branch`, "file.txt", 10);
                }, "A hook must have a code block [file.txt:10]");

                assert.throws(() => {
                    tree.parseLine(`***    Before Every Step    `, "file.txt", 10);
                }, "A hook must have a code block [file.txt:10]");

                assert.throws(() => {
                    tree.parseLine(`***    After Every Step     `, "file.txt", 10);
                }, "A hook must have a code block [file.txt:10]");

                assert.throws(() => {
                    tree.parseLine(`***  Before  Everything +   `, "file.txt", 10);
                }, "A hook must have a code block [file.txt:10]");

                assert.throws(() => {
                    tree.parseLine(`***  After  Everything .. +  `, "file.txt", 10);
                }, "A hook must have a code block [file.txt:10]");
            });

            it("parses a line with a {variable}", () => {
                let step = tree.parseLine(`Click {Big Red Button}`, "file.txt", 10);
                assert.equal(step.line, `Click {Big Red Button}`);
                assert.equal(step.text, `Click {Big Red Button}`);
                assert.equal(step.identifiers, undefined);
                assert.equal(step.codeBlock, undefined);
                assert.equal(step.varsBeingSet, undefined);
            });

            it("parses a line with a {{local variable}}", () => {
                let step = tree.parseLine(`Click {{Big Red Button}}`, "file.txt", 10);
                assert.equal(step.line, `Click {{Big Red Button}}`);
                assert.equal(step.text, `Click {{Big Red Button}}`);
                assert.equal(step.identifiers, undefined);
                assert.equal(step.codeBlock, undefined);
                assert.equal(step.varsBeingSet, undefined);
            });

            it("parses a line with multiple variables and whitespace", () => {
                let step = tree.parseLine(`    Click {{Big}} {Red} 'dazzling' {{Button}} `, "file.txt", 10);
                assert.equal(step.line, `    Click {{Big}} {Red} 'dazzling' {{Button}} `);
                assert.equal(step.text, `Click {{Big}} {Red} 'dazzling' {{Button}}`);
                assert.equal(step.identifiers, undefined);
                assert.equal(step.codeBlock, undefined);
                assert.equal(step.varsBeingSet, undefined);
            });

            it("parses a comment", () => {
                let step = tree.parseLine(`Click {Big Red Button} // comment here`, "file.txt", 10);
                assert.equal(step.text, `Click {Big Red Button}`);
                assert.equal(step.comment, '// comment here');
            });

            it("doesn't parse a comment inside single-quotes", () => {
                let step = tree.parseLine(`Click 'some // ugly \' \\\' comment'  // comment here `, "file.txt", 10);
                assert.equal(step.text, `Click 'some // ugly \' \\\' comment'`);
                assert.equal(step.comment, '// comment here ');
            });

            it("doesn't parse a comment inside double-quotes", () => {
                let step = tree.parseLine(`Click "some // ugly comment" and "//othercomment \" \\\\"" // comment here `, "file.txt", 10);
                assert.equal(step.text, `Click "some // ugly comment" and "//othercomment \" \\\\""`);
                assert.equal(step.comment, '// comment here ');
            });

            it("parses a line that only consists of a comment", () => {
                let step = tree.parseLine(`// comment here`, "file.txt", 10);
                assert.equal(step.text, ``);
                assert.equal(step.comment, '// comment here');

                step = tree.parseLine(`    // comment here`, "file.txt", 10);
                assert.equal(step.text, ``);
                assert.equal(step.comment, '// comment here');
            });

            it("parses a function declaration", () => {
                let step = tree.parseLine(`    * My Function here`, "file.txt", 10);
                assert.equal(step.text, `My Function here`);
                assert.equal(step.isFunctionDeclaration, true);
                assert.equal(step.isFunctionCall, undefined);

                step = tree.parseLine(`    * My Function {{var}}`, "file.txt", 10);
                assert.equal(step.text, `My Function {{var}}`);
                assert.equal(step.isFunctionDeclaration, true);
                assert.equal(step.isFunctionCall, undefined);
            });

            it("throws an error if a function declaration has 'strings'", () => {
                assert.throws(() => {
                    tree.parseLine(`* Something 'quote' something else`, "file.txt", 10);
                }, "A function declaration cannot have 'strings', \"strings\", or [strings] inside of it [file.txt:10]");

                assert.throws(() => {
                    tree.parseLine(`** Something "quote" something else`, "file.txt", 10);
                }, "A function declaration cannot have 'strings', \"strings\", or [strings] inside of it [file.txt:10]");

                assert.throws(() => {
                    tree.parseLine(`* Something [quote] something else`, "file.txt", 10);
                }, "A function declaration cannot have 'strings', \"strings\", or [strings] inside of it [file.txt:10]");
            });

            it("parses a function call", () => {
                let step = tree.parseLine(`    My Function call `, "file.txt", 10);
                assert.equal(step.text, `My Function call`);
                assert.equal(step.isFunctionDeclaration, undefined);
                assert.equal(step.isFunctionCall, true);
            });

            it("throws an error if a textual step is also a function declaration", () => {
                assert.throws(() => {
                    tree.parseLine(`* Something - +`, "file.txt", 10);
                }, "A function declaration cannot be a textual step (-) as well [file.txt:10]");

                assert.throws(() => {
                    tree.parseLine(`    ** Something - + {`, "file.txt", 10);
                }, "A function declaration cannot be a textual step (-) as well [file.txt:10]");
            });

            it("returns text set to empty string for empty or all-whitespace lines", () => {
                let step = tree.parseLine(``, "file.txt", 10);
                assert.equal(step.text, '');

                step = tree.parseLine(`     `, "file.txt", 10);
                assert.equal(step.text, '');
            });

            it("returns text set to '..' when the whole line is a sequential identifier (..)", () => {
                let step = tree.parseLine(`..`, "file.txt", 10);
                assert.equal(step.text, '..');

                step = tree.parseLine(`    .. `, "file.txt", 10);
                assert.equal(step.text, '..');
            });
        });

        context("blocks", () => {
            it("throws an error if a function declaration has a string payload block", () => {
                assert.throws(() => {
                    tree.parseLine(`* Something - [`, "file.txt", 10);
                }, "A function declaration cannot have a [payload] block at the end of it [file.txt:10]");

                assert.throws(() => {
                    tree.parseLine(`* Something - [ // comment`, "file.txt", 10);
                }, "A function declaration cannot have a [payload] block at the end of it [file.txt:10]");
            });

            it("throws an error if a function declaration has a code payload block", () => {
                assert.throws(() => {
                    tree.parseLine(`* Something - [{`, "file.txt", 10);
                }, "A function declaration cannot have a [payload] block at the end of it [file.txt:10]");

                assert.throws(() => {
                    tree.parseLine(`* Something - [{ // comment`, "file.txt", 10);
                }, "A function declaration cannot have a [payload] block at the end of it [file.txt:10]");
            });

            it("parses a function declaration with a code block", () => {
                let step = tree.parseLine(`* Click {{var}} + { `, "file.txt", 10);
                assert.equal(step.text, `Click {{var}}`);
                assert.equal(step.codeBlock, ' ');
            });

            it("parses a textual step with a code block", () => {
                let step = tree.parseLine(`Some text + - { `, "file.txt", 10);
                assert.equal(step.text, `Some text`);
                assert.equal(step.codeBlock, ' ');
            });

            it("parses an approved function call with a code block", () => {
                let step = tree.parseLine(`Execute  In Browser  + { `, "file.txt", 10);
                assert.equal(step.text, `Execute  In Browser`);
                assert.equal(step.codeBlock, ' ');
            });

            it("parses a code block followed by a comment", () => {
                let step = tree.parseLine(`Something here + { // comment here`, "file.txt", 10);
                assert.equal(step.text, `Something here`);
                assert.equal(step.codeBlock, ' // comment here');
                assert.equal(step.comment, undefined);
            });

            it("parses a string payload block", () => {
                let step = tree.parseLine(`Something here + [`, "file.txt", 10);
                assert.equal(step.text, `Something here`);
                assert.equal(step.payloadBlock, '');
                assert.equal(step.payloadCodeBlock, undefined);
            });

            it("parses a string payload block followed by a comment", () => {
                let step = tree.parseLine(`Something here + [ // comment here`, "file.txt", 10);
                assert.equal(step.text, `Something here`);
                assert.equal(step.payloadBlock, ' // comment here');
                assert.equal(step.payloadCodeBlock, undefined);
                assert.equal(step.comment, undefined);
            });

            it("parses a code payload block", () => {
                let step = tree.parseLine(`Something here + [{`, "file.txt", 10);
                assert.equal(step.text, `Something here`);
                assert.equal(step.payloadBlock, undefined);
                assert.equal(step.payloadCodeBlock, '');
            });

            it("parses a code payload block followed by a comment", () => {
                let step = tree.parseLine(`Something here + [{ // comment here`, "file.txt", 10);
                assert.equal(step.text, `Something here`);
                assert.equal(step.payloadBlock, undefined);
                assert.equal(step.payloadCodeBlock, ' // comment here');
                assert.equal(step.comment, undefined);
            });
        });

        context("identifiers", () => {
            it("parses the to-do identifier (-T)", () => {
                let step = tree.parseLine(`Click {button} -T`, "file.txt", 10);
                assert.equal(step.text, `Click {button}`);
                assert.equal(step.isToDo, true);
                assert.equal(step.isTextualStep, true);

                step = tree.parseLine(`-T Click {button}`, "file.txt", 10);
                assert.equal(step.text, `Click {button}`);
                assert.equal(step.isToDo, true);
                assert.equal(step.isTextualStep, true);

                step = tree.parseLine(`Click {button} + -T ..`, "file.txt", 10);
                assert.equal(step.text, `Click {button}`);
                assert.equal(step.isToDo, true);
                assert.equal(step.isTextualStep, true);
            });

            it("parses the manual identifier (-M)", () => {
                let step = tree.parseLine(`Click {button} -M`, "file.txt", 10);
                assert.equal(step.text, `Click {button}`);
                assert.equal(step.isManual, true);
                assert.equal(step.isTextualStep, true);

                step = tree.parseLine(`Click {button} + -M ..`, "file.txt", 10);
                assert.equal(step.text, `Click {button}`);
                assert.equal(step.isManual, true);
                assert.equal(step.isTextualStep, true);
            });

            it("parses the textual step identifier (-)", () => {
                let step = tree.parseLine(`Click {button} -`, "file.txt", 10);
                assert.equal(step.text, `Click {button}`);
                assert.equal(step.isTextualStep, true);

                step = tree.parseLine(`-M Click {button} +`, "file.txt", 10);
                assert.equal(step.text, `Click {button}`);
                assert.equal(step.isTextualStep, true);

                step = tree.parseLine(`    Click {button} - -M + `, "file.txt", 10);
                assert.equal(step.text, `Click {button}`);
                assert.equal(step.isManual, true);
                assert.equal(step.isTextualStep, true);
            });

            it("parses the debug identifier (~)", () => {
                let step = tree.parseLine(`~ Click {button}`, "file.txt", 10);
                assert.equal(step.text, `Click {button}`);
                assert.equal(step.isDebug, true);
                assert.equal(step.isBeforeDebug, true);
                assert.equal(step.isAfterDebug, undefined);

                step = tree.parseLine(`    ~  Click {button} + `, "file.txt", 10);
                assert.equal(step.text, `Click {button}`);
                assert.equal(step.isDebug, true);
                assert.equal(step.isBeforeDebug, true);
                assert.equal(step.isAfterDebug, undefined);

                step = tree.parseLine(`Click {button} ~`, "file.txt", 10);
                assert.equal(step.text, `Click {button}`);
                assert.equal(step.isDebug, true);
                assert.equal(step.isBeforeDebug, undefined);
                assert.equal(step.isAfterDebug, true);

                step = tree.parseLine(`     Click {button} + ~   `, "file.txt", 10);
                assert.equal(step.text, `Click {button}`);
                assert.equal(step.isDebug, true);
                assert.equal(step.isBeforeDebug, undefined);
                assert.equal(step.isAfterDebug, true);

                step = tree.parseLine(`~ Click {button} ~`, "file.txt", 10);
                assert.equal(step.text, `Click {button}`);
                assert.equal(step.isDebug, true);
                assert.equal(step.isBeforeDebug, true);
                assert.equal(step.isAfterDebug, true);

                step = tree.parseLine(`    ~  Click {button} ~ +   `, "file.txt", 10);
                assert.equal(step.text, `Click {button}`);
                assert.equal(step.isDebug, true);
                assert.equal(step.isBeforeDebug, true);
                assert.equal(step.isAfterDebug, true);
            });

            it("parses the only identifier ($)", () => {
                let step = tree.parseLine(`$ Click {button}`, "file.txt", 10);
                assert.equal(step.text, `Click {button}`);
                assert.equal(step.isOnly, true);

                step = tree.parseLine(`    $   Click {button} + `, "file.txt", 10);
                assert.equal(step.text, `Click {button}`);
                assert.equal(step.isOnly, true);
            });

            it("parses the non-parallel identifier (!)", () => {
                let step = tree.parseLine(`Click {button} !`, "file.txt", 10);
                assert.equal(step.text, `Click {button}`);
                assert.equal(step.isNonParallel, true);

                step = tree.parseLine(`Click {button} -T ! .. // comment`, "file.txt", 10);
                assert.equal(step.text, `Click {button}`);
                assert.equal(step.isNonParallel, true);
            });

            it("parses the sequential identifier (..)", () => {
                let step = tree.parseLine(`Click {button} ..`, "file.txt", 10);
                assert.equal(step.text, `Click {button}`);
                assert.equal(step.isSequential, true);

                step = tree.parseLine(`Click {button} -T .. + // comment`, "file.txt", 10);
                assert.equal(step.text, `Click {button}`);
                assert.equal(step.isSequential, true);
            });

            it("parses the collapsed identifier (+)", () => {
                let step = tree.parseLine(`Click {button} +`, "file.txt", 10);
                assert.equal(step.text, `Click {button}`);
                assert.equal(step.isCollapsed, true);

                step = tree.parseLine(`+ Click {button}`, "file.txt", 10);
                assert.equal(step.text, `Click {button}`);
                assert.equal(step.isCollapsed, true);

                step = tree.parseLine(`Click {button} -T + ! // comment`, "file.txt", 10);
                assert.equal(step.text, `Click {button}`);
                assert.equal(step.isCollapsed, true);
            });

            it("parses the hidden identifier (+?)", () => {
                let step = tree.parseLine(`Click {button} +?`, "file.txt", 10);
                assert.equal(step.text, `Click {button}`);
                assert.equal(step.isHidden, true);

                step = tree.parseLine(`+? Click {button}`, "file.txt", 10);
                assert.equal(step.text, `Click {button}`);
                assert.equal(step.isHidden, true);

                step = tree.parseLine(`Click {button} -T +? + // comment`, "file.txt", 10);
                assert.equal(step.text, `Click {button}`);
                assert.equal(step.isHidden, true);
            });

            it("rejects a hook with an identifier", () => {
                assert.throws(() => {
                    tree.parseLine(`$ *** After Every Branch + {`, "file.txt", 10);
                }, "A hook cannot have any identifiers ($) [file.txt:10]");
            });

            it("rejects a hook with a ~", () => {
                assert.throws(() => {
                    tree.parseLine(`~ *** Before Every Step {`, "file.txt", 10);
                }, "A hook cannot have any identifiers (~) [file.txt:10]");

                assert.throws(() => {
                    tree.parseLine(`*** Before Every Step ~ {`, "file.txt", 10);
                }, "A hook cannot have any identifiers (~) [file.txt:10]");
            });
        });

        context("{vars}", () => {
            it("parses {var} = Function", () => {
                let step = tree.parseLine(`{var} = Click 'something' {blah}`, "file.txt", 10);
                assert.equal(step.text, `{var} = Click 'something' {blah}`);
                assert.equal(step.isFunctionCall, true);
                assert.deepEqual(step.varsBeingSet, [ {name: "var", value: "Click 'something' {blah}", isLocal: false} ]);

                step = tree.parseLine(`    {var with spaces}  = Click 'something' {{blah}}`, "file.txt", 10);
                assert.equal(step.text, `{var with spaces}  = Click 'something' {{blah}}`);
                assert.equal(step.isFunctionCall, true);
                assert.deepEqual(step.varsBeingSet, [ {name: "var with spaces", value: "Click 'something' {{blah}}", isLocal: false} ]);
            });

            it("parses {var} = Code Block Function {", () => {
                let step = tree.parseLine(`{var} = Code Block Function {`, "file.txt", 10);
                assert.equal(step.text, `{var} = Code Block Function`);
                assert.equal(step.isFunctionCall, undefined);
                assert.equal(step.isTextualStep, undefined);
                assert.deepEqual(step.varsBeingSet, [ {name: "var", value: "Code Block Function", isLocal: false} ]);
            });

            it("rejects {var} = Textual Function -", () => {
                assert.throws(() => {
                    tree.parseLine(`{var} = Textual Function -`, "file.txt", 10);
                }, "A textual step (ending in -) cannot also start with a {variable} assignment [file.txt:10]");
            });

            it("rejects {var} = only numbers, periods, or commas", () => {
                assert.throws(() => {
                    tree.parseLine(`{var} =324798`, "file.txt", 10);
                }, "{vars} can only be set to 'strings', \"strings\", or [strings] [file.txt:10]");

                assert.throws(() => {
                    tree.parseLine(`{var} = 32, 4798`, "file.txt", 10);
                }, "{vars} can only be set to 'strings', \"strings\", or [strings] [file.txt:10]");

                assert.throws(() => {
                    tree.parseLine(`{var}=.`, "file.txt", 10);
                }, "{vars} can only be set to 'strings', \"strings\", or [strings] [file.txt:10]");
            });

            it("rejects {var}= by itself", () => {
                assert.throws(() => {
                    tree.parseLine(`{var}=`, "file.txt", 10);
                }, "A {variable} must be set to something [file.txt:10]");

                assert.throws(() => {
                    tree.parseLine(`{{var}}=`, "file.txt", 10);
                }, "A {variable} must be set to something [file.txt:10]");

                assert.throws(() => {
                    tree.parseLine(`{var} = `, "file.txt", 10);
                }, "A {variable} must be set to something [file.txt:10]");

                assert.throws(() => {
                    tree.parseLine(`{var}=,{var2}='string'`, "file.txt", 10);
                }, "A {variable} must be set to something [file.txt:10]");

                assert.throws(() => {
                    tree.parseLine(`{var}= , {var2}='string'`, "file.txt", 10);
                }, "A {variable} must be set to something [file.txt:10]");
            });

            it("parses {var} = 'string'", () => {
                step = tree.parseLine(`{var} = 'foo'`, "file.txt", 10);
                assert.equal(step.text, `{var} = 'foo'`);
                assert.equal(step.isFunctionCall, undefined);
                assert.deepEqual(step.varsBeingSet, [ {name: "var", value: "'foo'", isLocal: false} ]);

                step = tree.parseLine(`{var} = "foo"`, "file.txt", 10);
                assert.equal(step.text, `{var} = "foo"`);
                assert.equal(step.isFunctionCall, undefined);
                assert.deepEqual(step.varsBeingSet, [ {name: "var", value: "\"foo\"", isLocal: false} ]);

                step = tree.parseLine(`{var} = [foo]`, "file.txt", 10);
                assert.equal(step.text, `{var} = [foo]`);
                assert.equal(step.isFunctionCall, undefined);
                assert.deepEqual(step.varsBeingSet, [ {name: "var", value: "[foo]", isLocal: false} ]);
            });

            it("parses {{var}} = Function", () => {
                let step = tree.parseLine(`{{var}} = Click 'something' [here] { blah }`, "file.txt", 10);
                assert.equal(step.text, `{{var}} = Click 'something' [here] { blah }`);
                assert.equal(step.isFunctionCall, true);
                assert.deepEqual(step.varsBeingSet, [ {name: "var", value: "Click 'something' [here] { blah }", isLocal: true} ]);

                step = tree.parseLine(`    {{ var with spaces  }} =  Click 'something' [here] {{blah}}`, "file.txt", 10);
                assert.equal(step.text, `{{ var with spaces  }} =  Click 'something' [here] {{blah}}`);
                assert.equal(step.isFunctionCall, true);
                assert.deepEqual(step.varsBeingSet, [ {name: "var with spaces", value: "Click 'something' [here] {{blah}}", isLocal: true} ]);

                step = tree.parseLine(`{{var}} = Click 'something \\\\ \'' "something2 \"" [\\'he\\' re] {blah} {{blah2}}`, "file.txt", 10);
                assert.equal(step.isFunctionCall, true);
                assert.deepEqual(step.varsBeingSet, [ {name: "var", value: `Click 'something \\\\ \'' "something2 \"" [\\'he\\' re] {blah} {{blah2}}`, isLocal: true} ]);
            });

            it("parses {{var}} = 'string'", () => {
                step = tree.parseLine(`{{var}} = 'foo \\\''`, "file.txt", 10);
                assert.equal(step.text, `{{var}} = 'foo \\\''`);
                assert.equal(step.isFunctionCall, undefined);
                assert.deepEqual(step.varsBeingSet, [ {name: "var", value: "'foo \\\''", isLocal: true} ]);

                step = tree.parseLine(`{{var}} = "foo \\\""`, "file.txt", 10);
                assert.equal(step.text, `{{var}} = "foo \\\""`);
                assert.equal(step.isFunctionCall, undefined);
                assert.deepEqual(step.varsBeingSet, [ {name: "var", value: "\"foo \\\"\"", isLocal: true} ]);

                step = tree.parseLine(`{{var}} = [foo 'bar'\\\[\\\]]`, "file.txt", 10);
                assert.equal(step.text, `{{var}} = [foo 'bar'\\\[\\\]]`);
                assert.equal(step.isFunctionCall, undefined);
                assert.deepEqual(step.varsBeingSet, [ {name: "var", value: "[foo 'bar'\\\[\\\]]", isLocal: true} ]);
            });

            it("parses multiple {var} = 'string literal', separated by commas", () => {
                let step = tree.parseLine(`{var1} = 'one', {{var2}}='two 2', {var 3}= "three 3",{var4}=[four "4"] +`, "file.txt", 10);
                assert.equal(step.text, `{var1} = 'one', {{var2}}='two 2', {var 3}= "three 3",{var4}=[four "4"]`);
                assert.equal(step.isFunctionCall, undefined);
                assert.deepEqual(step.varsBeingSet, [
                    {name: "var1", value: "'one'", isLocal: false},
                    {name: "var2", value: "'two 2'", isLocal: true},
                    {name: "var 3", value: "\"three 3\"", isLocal: false},
                    {name: "var4", value: "[four \"4\"]", isLocal: false}
                ]);
            });

            it("doesn't recognize {vars} with backslashes in their names", () => {
                let step = tree.parseLine(`{var\\} = Click 'something \\{blah\\}' {foo}`, "file.txt", 10);
                assert.equal(step.text, `{var\\} = Click 'something \\{blah\\}' {foo}`);
                assert.equal(step.varsBeingSet, undefined);
            });

            it("rejects {vars} with only numbers in their names", () => {
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

            it("rejects {vars *} to the left of an = sign", () => {
                assert.throws(() => {
                    tree.parseLine(`{foobar *} = 'str'`, "file.txt", 10);
                }, "A variable name to the left of an = cannot end in a * [file.txt:10]");

                assert.throws(() => {
                    tree.parseLine(`{{ foobar  *  }} = 'str'`, "file.txt", 10);
                }, "A variable name to the left of an = cannot end in a * [file.txt:10]");
            });

            it("doesn't reject {Frequency}", () => {
                tree.parseLine(`{Frequency} = 'high'`, "file.txt", 10);
            });

            it("rejects {{frequency}}", () => {
                assert.throws(() => {
                    tree.parseLine(`{{frequency}} = 'high'`, "file.txt", 10);
                }, "The {frequency} variable is special and cannot be a local variable [file.txt:10]");
            });

            it("rejects {frequency} not set to high/med/low", () => {
                assert.throws(() => {
                    tree.parseLine(`{frequency} = 'blah'`, "file.txt", 10);
                }, "The {frequency} variable is special and can only be set to 'high', 'med', or 'low' [file.txt:10]");

                assert.throws(() => {
                    tree.parseLine(`{frequency} = Function`, "file.txt", 10);
                }, "The {frequency} variable is special and can only be set to 'high', 'med', or 'low' [file.txt:10]");
            });

            it("parses valid {frequency}", () => {
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

            it("doesn't reject {Group}", () => {
                tree.parseLine(`{Group} = 'foobar'`, "file.txt", 10);
            });

            it("rejects {{group}}", () => {
                assert.throws(() => {
                    tree.parseLine(`{{group}} = 'foobar'`, "file.txt", 10);
                }, "The {group} variable is special and cannot be a local variable [file.txt:10]");
            });

            it("parses valid {group}", () => {
                assert.doesNotThrow(() => {
                    tree.parseLine(`{group} = 'foobar'`, "file.txt", 10);
                });

                assert.doesNotThrow(() => {
                    tree.parseLine(`{group} = ' one two three  '`, "file.txt", 10);
                });
            });

            it("doesn't throw an error when a [bracketed string contains {vars}]", () => {
                assert.doesNotThrow(() => {
                    tree.parseLine(`Something [next to '{var}']`, "file.txt", 10);
                });

                assert.doesNotThrow(() => {
                    tree.parseLine(`Something [next to '{{var}}']`, "file.txt", 10);
                });

                assert.doesNotThrow(() => {
                    tree.parseLine(`Something [{N}th]`, "file.txt", 10);
                });
            });

            it("throws an error when multiple {vars} are set in a line, and one of them is not a 'string literal'", () => {
                assert.throws(() => {
                    tree.parseLine(`{var1} = 'one', {{var2}}=Some step here, {var 3}= "three 3" +`, "file.txt", 10);
                }, "When multiple {variables} are being set on a single line, those {variables} can only be set to 'strings', \"strings\", or [strings] [file.txt:10]");

                assert.throws(() => {
                    tree.parseLine(`{var1}='str1', {var2}='str2', Invalid stuff here`, "file.txt", 10);
                }, "When multiple {variables} are being set on a single line, those {variables} can only be set to 'strings', \"strings\", or [strings] [file.txt:10]");
            });

            it("throws an error when a function declaration contains {non-local variables}", () => {
                assert.throws(() => {
                    tree.parseLine(`* Function {one} and {{two}}`, "file.txt", 10);
                }, "All variables in a function declaration must be {{local}} and {one} is not [file.txt:10]");
            });

            it("throws an error when a step sets a variable and is a function declaration", () => {
                assert.throws(() => {
                    tree.parseLine(`* {{var1}}= Some function`, "file.txt", 10);
                }, "A step setting {variables} cannot start with a \* [file.txt:10]");
            });
        });
    });

    describe("parseIn()", () => {
        context("generic tests", () => {
            it("parses empty input", () => {
                let tree = new Tree();
                tree.parseIn(``, "file.txt");

                expect(tree).to.containSubset({
                    root: {
                        indents: -1,
                        parent: null,
                        children: []
                    }
                });
            });

            it("parses all-whitespace input", () => {
                let tree = new Tree();
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

            it("parses a normal tree", () => {
                let tree = new Tree();
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

            it("parses a normal tree with one or more empty lines in the middle", () => {
                let tree = new Tree();
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

            it("handles multiple parses into the same tree", () => {
                let tree = new Tree();

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

            it("ignores lines that are fully comments", () => {
                let tree = new Tree();
                tree.parseIn(
`A
// comment
    B
        C
        // D
        E
// comment
    F
        ..
        // G
        H
        I

        // ..
        J
        // K
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
                                        text: 'B',
                                        lineNumber: 3,
                                        indents: 1,
                                        parent: { text: 'A' },
                                        children: [
                                            {
                                                steps: [
                                                    {
                                                        text: 'C',
                                                        lineNumber: 4,
                                                        indents: 2,
                                                        parent: null,
                                                        children: []
                                                    },
                                                    {
                                                        text: 'E',
                                                        lineNumber: 6,
                                                        indents: 2,
                                                        parent: null,
                                                        children: []
                                                    }
                                                ],
                                                isSequential: undefined,
                                                parent: { text: 'B' }
                                            }
                                        ]
                                    },
                                    {
                                        text: 'F',
                                        lineNumber: 8,
                                        indents: 1,
                                        parent: { text: 'A' },
                                        children: [
                                            {
                                                steps: [
                                                    {
                                                        text: 'H',
                                                        lineNumber: 11,
                                                        indents: 2,
                                                        parent: null,
                                                        children: []
                                                    },
                                                    {
                                                        text: 'I',
                                                        lineNumber: 12,
                                                        indents: 2,
                                                        parent: null,
                                                        children: []
                                                    }
                                                ],
                                                isSequential: true,
                                                parent: { text: 'F' }
                                            },
                                            {
                                                text: 'J',
                                                lineNumber: 15,
                                                indents: 2,
                                                parent: { text: 'F' },
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

            it("sets isPackaged", () => {
                let tree = new Tree();

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
                                isPackaged: undefined,
                                lineNumber: 1,
                                filename: 'file1.txt',
                                indents: 0,
                                parent: { indents: -1 },
                                children: [
                                    {
                                        text: 'B',
                                        isPackaged: undefined,
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
                                isPackaged: true,
                                lineNumber: 1,
                                filename: 'file2.txt',
                                indents: 0,
                                parent: { indents: -1 },
                                children: [
                                    {
                                        text: 'D',
                                        isPackaged: true,
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

            it("rejects a first step that is not at indent 0", () => {
                let tree = new Tree();
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

            it("rejects a step that is 2 or more indents ahead of the step above", () => {
                let tree = new Tree();
                assert.throws(() => {
                    tree.parseIn(
`A
        B
`
                    , "file.txt");
                }, "You cannot have a step that has 2 or more indents beyond the previous step [file.txt:2]");
            });
        });

        context("step blocks", () => {
                it("parses a step block at the very top", () => {
                    let tree = new Tree();
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

            it("parses a step block at the very top, with empty lines above and below", () => {
                let tree = new Tree();
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

            it("parses a step block in the middle, with empty lines above and below", () => {
                let tree = new Tree();
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

            it("parses a step block in the middle, with only an empty line below", () => {
                let tree = new Tree();
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

            it("parses a step block at the very bottom", () => {
                let tree = new Tree();
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

            it("parses a step block at the bottom, with an empty line below", () => {
                let tree = new Tree();
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

            it("parses a step block with an indented line directly above", () => {
                let tree = new Tree();
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

            it("parses a step block with an indented line above", () => {
                let tree = new Tree();
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

            it("recognizes an empty line as the end of a step block", () => {
                let tree = new Tree();
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

            it("parses multiple nested step blocks", () => {
                let tree = new Tree();
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

            it("parses three levels of step blocks", () => {
                let tree = new Tree();
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

            it("parses step blocks immediately preceded by a parent, with no empty line in between", () => {
                let tree = new Tree();
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

            it("parses a step block immediately followed by a line that's less indented than the step block", () => {
                let tree = new Tree();
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

            it("rejects a step block containing a function declaration", () => {
                let tree = new Tree();
                assert.throws(() => {
                    tree.parseIn(
`A
* B
C`
                    , "file.txt");
                }, "You cannot have a function declaration within a step block [file.txt:2]");
            });

            it("accepts a step block containing a code block as its last member", () => {
                let tree = new Tree();
                tree.parseIn(
`A
B
C {
}`
                , "file.txt");

                expect(tree).to.containSubset({
                    root: {
                        children: [
                            {
                                steps: [
                                    { text: 'A' }, { text: 'B' }, { text: 'C' }
                                ]
                            }
                        ]
                    }
                });
            });

            it("rejects a step block with children that doesn't end in an empty line", () => {
                let tree = new Tree();
                assert.throws(() => {
                    tree.parseIn(
`A
B
    C
`
                    , "file.txt");
                }, "There must be an empty line under a step block if it has children directly underneath it. Try putting an empty line under this line. [file.txt:2]");
            });

            it("doesn't reject a step block that's directly followed by a line indented left of the step block", () => {
                let tree = new Tree();
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

            it("doesn't reject a step block if it doesn't have children and doesn't end in an empty line", () => {
                let tree = new Tree();
                assert.doesNotThrow(() => {
                    tree.parseIn(
`A
B`
                    , "file.txt");
                });
            });
        });

        context(".. step blocks", () => {
            it("parses a .. step block with an empty line above it", () => {
                let tree = new Tree();
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

            it("parses a .. step block with no empty line above it", () => {
                let tree = new Tree();
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

            it("parses a .. step block on the first line", () => {
                let tree = new Tree();
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

            it("parses empty lines followed by a .. step block", () => {
                let tree = new Tree();
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

            it("rejects a step block containing a .. line in the middle", () => {
                let tree = new Tree();
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

            it("rejects a step block containing a .. line at the end", () => {
                let tree = new Tree();
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

            it("rejects a .. line by itself", () => {
                let tree = new Tree();
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

            it("rejects a .. line that's immediately followed by indented children", () => {
                let tree = new Tree();
                assert.throws(() => {
                    tree.parseIn(
`..
    A
    B
`
                    , "file.txt");
                }, "A .. line must be followed by a line at the same indent level [file.txt:1]");
            });

            it("rejects a .. line followed by an invalid step block", () => {
                let tree = new Tree();
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

            it("rejects two .. lines in a row", () => {
                let tree = new Tree();
                assert.throws(() => {
                    tree.parseIn(
`..
..
`
                    , "file.txt");
                }, "You cannot have two .. lines in a row [file.txt:1]");
            });

            it("parses a step block, followed by an indented .. step block", () => {
                let tree = new Tree();
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

            it("parses a step block, followed by an empty line, followed by an indented .. step block", () => {
                let tree = new Tree();
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

            it("parses a .. step block, followed by an indented .. step block", () => {
                let tree = new Tree();
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

            it("parses a .. step block, followed by an empty line, followed by an indented .. step block", () => {
                let tree = new Tree();
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
        });

        describe("code blocks", () => {
            it("parses a code block", () => {
                let tree = new Tree();
                tree.parseIn(
`A
    Code block here {start;
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
                                        codeBlock: 'start;\n        code;\n        more code;\n',
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

            it("parses an empty code block", () => {
                let tree = new Tree();
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

            it("parses a code block with siblings", () => {
                let tree = new Tree();
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

            it("parses a code block with siblings, not separated by an empty line", () => {
                let tree = new Tree();
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

            it("parses a code block with children", () => {
                let tree = new Tree();
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

            it("parses a code block with children, not separated by an empty line", () => {
                let tree = new Tree();
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

            it("parses a code block with step blocks as children", () => {
                let tree = new Tree();
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

            it("parses a code block with a code block as a child", () => {
                let tree = new Tree();
                tree.parseIn(
`A
    Code block here {
        code;
        more code;
    }

        Another code block {
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

            it("parses a code block with a code block as a child, not separated by an empty line", () => {
                let tree = new Tree();
                tree.parseIn(
`A
    Code block here {
        code;
        more code;
    }
        Another code block - {
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

            it("rejects a code block that isn't closed", () => {
                let tree = new Tree();
                assert.throws(() => {
                    tree.parseIn(
`A
    Code block here {
        code;
        more code;
`
                    , "file.txt");
                }, "An unclosed block was found [file.txt:2]");

                assert.throws(() => {
                    tree.parseIn(
`Code block here {`
                    , "file.txt");
                }, "An unclosed block was found [file.txt:1]");
            });

            it("rejects a code block with a closing } at the wrong indentation", () => {
                let tree = new Tree();
                assert.throws(() => {
                    tree.parseIn(
`A
    Code block here {

}
`
                    , "file.txt");
                }, "An unclosed block was found [file.txt:2]");

                assert.throws(() => {
                    tree.parseIn(
`A
    Code block here {

        }
`
                    , "file.txt");
                }, "An unclosed block was found [file.txt:2]");
            });

            it("rejects a step that is directly adjacent to a code block above", () => {
                let tree = new Tree();
                assert.throws(() => {
                    tree.parseIn(
`A {
}
B -
`
                    , "file.txt");
                }, "You cannot have a step directly adjacent to a code or payload block above. Consider putting an empty line above this one. [file.txt:3]");
            });
        });
    });

    describe("findFunctionDeclaration()", () => {
        it("finds the right function when its declaration is a sibling of the function call and is below the function call", () => {
            let tree = new Tree();
            tree.parseIn(`
My function

* My function
    Step one -
`);

            let branchAbove = new Branch();
            branchAbove.steps = [];
            let functionCall = tree.root.children[0].cloneForBranch();
            let functionDeclaration = tree.findFunctionDeclaration(functionCall, branchAbove);

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

        it("finds the right function when the declaration is private", () => {
            let tree = new Tree();
            tree.parseIn(`
My function

** My function
    Step one -
`);

            let branchAbove = new Branch();
            branchAbove.steps = [];
            let functionCall = tree.root.children[0].cloneForBranch();
            let functionDeclaration = tree.findFunctionDeclaration(functionCall, branchAbove);

            expect(functionDeclaration).to.containSubset({
                text: "My function",
                isFunctionDeclaration: true,
                isPrivateFunctionDeclaration: true,
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

        it("finds the right function when its declaration is a sibling of the function call and is above the function call", () => {
            let tree = new Tree();
            tree.parseIn(`
* My function
    Step one -
My function
`);

            let branchAbove = new Branch();
            branchAbove.steps = [];
            let functionCall = tree.root.children[1].cloneForBranch();
            let functionDeclaration = tree.findFunctionDeclaration(functionCall, branchAbove);

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

        it("finds the right function when its declaration is a sibling of a descendant", () => {
            let tree = new Tree();
            tree.parseIn(`
Some parent step -
    My function

* My function
    Step one -
`);

            let branchAbove = new Branch();
            branchAbove.steps = [
                tree.root.children[0].cloneForBranch()
            ];
            let functionCall = tree.root.children[0].children[0].cloneForBranch();
            let functionDeclaration = tree.findFunctionDeclaration(functionCall, branchAbove);

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

        it("finds the right function even if a step block has to be traversed", () => {
            let tree = new Tree();
            tree.parseIn(`
Step block step 1 -
Step block step 2 -

    My function

* My function
    Step one -
`);

            let branchAbove = new Branch();
            branchAbove.steps = [
                tree.root.children[0].steps[0].cloneForBranch()
            ];
            let functionCall = tree.root.children[0].children[0].cloneForBranch();
            let functionDeclaration = tree.findFunctionDeclaration(functionCall, branchAbove);

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

        it("finds the right function even if declaration has different amounts of whitespace between words", () => {
            let tree = new Tree();
            tree.parseIn(`
Some parent step -
    My     function

* My  function
    Step one -
`);

            let branchAbove = new Branch();
            branchAbove.steps = [
                tree.root.children[0].cloneForBranch()
            ];
            let functionCall = tree.root.children[0].children[0].cloneForBranch();
            let functionDeclaration = tree.findFunctionDeclaration(functionCall, branchAbove);

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

        it("finds the right function when multiple functions with the same name exist", () => {
            let tree = new Tree();
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

            let branchAbove = new Branch();
            branchAbove.steps = [
                tree.root.children[0].cloneForBranch()
            ];
            let functionCall = tree.root.children[0].children[0].cloneForBranch();
            let functionDeclaration = tree.findFunctionDeclaration(functionCall, branchAbove);

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

        it("finds the first function declaration when multiple sibling function declarations have the same name", () => {
            let tree = new Tree();
            tree.parseIn(`
My function

* My function
    First -

* My function
    Second -
`);

            let branchAbove = new Branch();
            branchAbove.steps = [];
            let functionCall = tree.root.children[0].cloneForBranch();
            let functionDeclaration = tree.findFunctionDeclaration(functionCall, branchAbove);

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

        it("finds the first function declaration when multiple sibling function declarations match the same name", () => {
            let tree = new Tree();
            tree.parseIn(`
My big function

* My big function
    First -

* My big *
    Second -
`);

            let branchAbove = new Branch();
            branchAbove.steps = [];
            let functionCall = tree.root.children[0].cloneForBranch();
            let functionDeclaration = tree.findFunctionDeclaration(functionCall, branchAbove);

            expect(functionDeclaration).to.containSubset({
                text: "My big function",
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

        it("finds the first function declaration, that ends in a *, when multiple sibling function declarations match the same name", () => {
            let tree = new Tree();
            tree.parseIn(`
My big function

* My big *
    First -

* My big function
    Second -
`);

            let branchAbove = new Branch();
            branchAbove.steps = [];
            let functionCall = tree.root.children[0].cloneForBranch();
            let functionDeclaration = tree.findFunctionDeclaration(functionCall, branchAbove);

            expect(functionDeclaration).to.containSubset({
                text: "My big *",
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

        it("finds the right function when a function call contains strings and variables", () => {
            let tree = new Tree();
            tree.parseIn(`
One {varA}   two   {{varB}} three [1st 'text' EF]

* Something else

* One {{var1}} two {{var2}}   three   {{var3}}
    Step one -

* Something else
`);

            let branchAbove = new Branch();
            branchAbove.steps = [];
            let functionCall = tree.root.children[0].cloneForBranch();
            let functionDeclaration = tree.findFunctionDeclaration(functionCall, branchAbove);

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

        it("finds the right function when a {var} = Func call contains strings and variables", () => {
            let tree = new Tree();
            tree.parseIn(`
{varC} = One {varA}   two   {{varB}} three [1st 'text' EF]

* Something else

* One {{var1}} two {{var2}}   three   {{var3}}
    Step one -

* Something else
`);

            let branchAbove = new Branch();
            branchAbove.steps = [];
            let functionCall = tree.root.children[0].cloneForBranch();
            let functionDeclaration = tree.findFunctionDeclaration(functionCall, branchAbove);

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

        it("finds the right function on a {var} = Func code block that returns a value", () => {
            let tree = new Tree();
            tree.parseIn(`
{varC} = One {varA}   two   {{varB}} three [1st 'text' EF]

* Something else

* One {{var1}} two {{var2}}   three   {{var3}} {
    code here
}

* Something else
`);

            let branchAbove = new Branch();
            branchAbove.steps = [];
            let functionCall = tree.root.children[0].cloneForBranch();
            let functionDeclaration = tree.findFunctionDeclaration(functionCall, branchAbove);

            expect(functionDeclaration).to.containSubset({
                text: "One {{var1}} two {{var2}}   three   {{var3}}",
                isFunctionDeclaration: true,
                parent: { indents: -1 },
                children: [],
                codeBlock: '\n    code here\n'
            });

            expect(functionDeclaration === tree.root.children[2]).to.equal(true);
        });

        it("finds the right function when the function call and function declaration match case insensitively", () => {
            let tree = new Tree();
            tree.parseIn(`
My function

* my function
`, "file.txt");

            let branchAbove = new Branch();
            branchAbove.steps = [];
            let functionCall = tree.root.children[0].cloneForBranch();
            let functionDeclaration = tree.findFunctionDeclaration(functionCall, branchAbove);

            expect(functionDeclaration).to.containSubset({
                text: "my function",
                isFunctionDeclaration: true,
                parent: { indents: -1 },
                children: []
            });

            expect(functionDeclaration === tree.root.children[1]).to.equal(true);
        });

        it("rejects function calls that cannot be found", () => {
            let tree = new Tree();
            tree.parseIn(`
Function that doesn't exist

* Something else
`, "file.txt");

            let branchAbove = new Branch();
            branchAbove.steps = [];
            let functionCall = tree.root.children[0].cloneForBranch();
            assert.throws(() => {
                tree.findFunctionDeclaration(functionCall, branchAbove);
            }, "The function 'Function that doesn't exist' cannot be found. Is there a typo, or did you mean to make this a textual step (with a - at the end)? [file.txt:2]");
        });

        it("rejects function calls to functions that were declared in a different scope", () => {
            let tree = new Tree();
            tree.parseIn(`
My function

Other scope -
    * My function
`, "file.txt");

            let branchAbove = new Branch();
            branchAbove.steps = [];
            let functionCall = tree.root.children[0].cloneForBranch();
            assert.throws(() => {
                tree.findFunctionDeclaration(functionCall, branchAbove);
            }, "The function 'My function' cannot be found. Is there a typo, or did you mean to make this a textual step (with a - at the end)? [file.txt:2]");

            tree = new Tree();
            tree.parseIn(`
One scope -
    My function

Other scope -
    * My function
`, "file.txt");

            branchAbove.steps = [
                tree.root.children[0].cloneForBranch()
            ];
            functionCall = tree.root.children[0].children[0].cloneForBranch();
            assert.throws(() => {
                tree.findFunctionDeclaration(functionCall, branchAbove);
            }, "The function 'My function' cannot be found. Is there a typo, or did you mean to make this a textual step (with a - at the end)? [file.txt:3]");
        });
    });

    describe("validateVarSetting()", () => {
        it("accepts function that has muliple branches in {x}='value' format", () => {
            let tree = new Tree();
            tree.parseIn(`
{var} = F

* F
    {x}='1'

    {x}='2'

    {x}=['3 {var}']
`);

            let functionCall = tree.root.children[0].cloneForBranch();
            functionCall.functionDeclarationInTree = tree.root.children[1];
            expect(tree.validateVarSettingFunction(functionCall)).to.equal(true);
        });

        it("accepts function that has muliple branches in {x}='value' or {x} = Function format and some are step blocks", () => {
            let tree = new Tree();
            tree.parseIn(`
{var} = F

* F
    {x}='1'

    {a}='2'
    {b}='3'
    {c}='4'

    {x}=[5]
    {x}=Function
`);

            let functionCall = tree.root.children[0].cloneForBranch();
            functionCall.functionDeclarationInTree = tree.root.children[1];
            expect(tree.validateVarSettingFunction(functionCall)).to.equal(true);
        });

        it("accepts function that has a code block", () => {
            let tree = new Tree();
            tree.parseIn(`
{var} = F

* F {
    code block
}
`);

            let functionCall = tree.root.children[0].cloneForBranch();
            functionCall.functionDeclarationInTree = tree.root.children[1];
            expect(tree.validateVarSettingFunction(functionCall)).to.equal(false);
        });

        it("rejects an empty function", () => {
            let tree = new Tree();
            tree.parseIn(`
{var} = F

* F
`, "file.txt");

            let functionCall = tree.root.children[0].cloneForBranch();
            functionCall.functionDeclarationInTree = tree.root.children[1];
            assert.throws(() => {
                tree.validateVarSettingFunction(functionCall);
            }, "You cannot use an empty function [file.txt:2]");
        });

        it("rejects function that doesn't have a code block, isn't a code block function, and isn't a branched function in {x}='value' format", () => {
            let tree = new Tree();
            tree.parseIn(`
{var} = F

* F
    {x}='1'

    Function name

    {x}='3'
`, "file.txt");

            let functionCall = tree.root.children[0].cloneForBranch();
            functionCall.functionDeclarationInTree = tree.root.children[1];

            assert.throws(() => {
                tree.validateVarSettingFunction(functionCall);
            }, "The function called at file.txt:2 must have all steps in its declaration be in format {x}='string' or {x}=Function (but file.txt:7 is not) [file.txt:2]");

            tree = new Tree();
            tree.parseIn(`
{var} = F

* F
    {x}='1'
    Function name
    {x}=[3]
`, "file.txt");

            functionCall = tree.root.children[0].cloneForBranch();
            functionCall.functionDeclarationInTree = tree.root.children[1];

            assert.throws(() => {
                tree.validateVarSettingFunction(functionCall);
            }, "The function called at file.txt:2 must have all steps in its declaration be in format {x}='string' or {x}=Function (but file.txt:6 is not) [file.txt:2]");
        });

        it("rejects function that has a code block, but also has children", () => {
            let tree = new Tree();
            tree.parseIn(`
{var} = F

* F {
    code block
}
    Child -
`, "file.txt");

            let functionCall = tree.root.children[0].cloneForBranch();
            functionCall.functionDeclarationInTree = tree.root.children[1];

            assert.throws(() => {
                tree.validateVarSettingFunction(functionCall);
            }, "The function called at file.txt:2 has a code block in its declaration (at file.txt:4) but that code block must not have any child steps [file.txt:2]");
        });

        it("rejects function that is in {x}='value' format, but also has children", () => {
            let tree = new Tree();
            tree.parseIn(`
{var} = F

* F
    {x}='1'

    {x}='2'
        Child -

    {x}='3'
`, "file.txt");

            let functionCall = tree.root.children[0].cloneForBranch();
            functionCall.functionDeclarationInTree = tree.root.children[1];

            assert.throws(() => {
                tree.validateVarSettingFunction(functionCall);
            }, "The function called at file.txt:2 must not have any steps in its declaration that have children of their own (but file.txt:7 does) [file.txt:2]");
        });
    });

    describe("branchify()", () => {
        context("generic tests", () => {
            it("handles an empty tree", () => {
                let tree = new Tree();
                tree.parseIn(``);

                let branches = tree.branchify(tree.root);
                expect(branches).to.have.lengthOf(0);
            });

            it("branchifies a textual-step-only tree with one branch", () => {
                let tree = new Tree();
                tree.parseIn(`
A -
    B -
        C -`);

                let branches = tree.branchify(tree.root);

                expect(branches).to.have.lengthOf(1);
                expect(branches[0].steps).to.have.lengthOf(3);

                expect(branches).to.containSubsetInOrder([
                    {
                        steps: [
                            {
                                text: "A",
                                level: 0,
                                parent: undefined,
                                children: undefined
                            },
                            {
                                text: "B",
                                level: 0,
                                parent: undefined,
                                children: undefined
                            },
                            {
                                text: "C",
                                level: 0,
                                parent: undefined,
                                children: undefined
                            }
                        ]
                    }
                ]);
            });

            it("branchifies a textual-step-only tree with multiple branches", () => {
                let tree = new Tree();
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

                let branches = tree.branchify(tree.root);

                expect(branches).to.have.lengthOf(5);
                expect(branches[0].steps).to.have.lengthOf(3);
                expect(branches[1].steps).to.have.lengthOf(3);
                expect(branches[2].steps).to.have.lengthOf(2);
                expect(branches[3].steps).to.have.lengthOf(3);
                expect(branches[4].steps).to.have.lengthOf(1);

                expect(branches).to.containSubsetInOrder([
                    {
                        steps: [
                            { text: "A", level: 0 },
                            { text: "B", level: 0 },
                            { text: "C", level: 0 }
                        ]
                    },
                    {
                        steps: [
                            { text: "A", level: 0 },
                            { text: "B", level: 0 },
                            { text: "D", level: 0 }
                        ]
                    },
                    {
                        steps: [
                            { text: "A", level: 0 },
                            { text: "E", level: 0 }
                        ]
                    },
                    {
                        steps: [
                            { text: "A", level: 0 },
                            { text: "F", level: 0 },
                            { text: "G", level: 0 }
                        ]
                    },
                    {
                        steps: [
                            { text: "H", level: 0 }
                        ]
                    }
                ]);
            });

            it("branchifies a textual-step-only tree with multiple branches and containing step blocks", () => {
                let tree = new Tree();
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

                let branches = tree.branchify(tree.root);

                expect(branches).to.have.lengthOf(5);
                expect(branches[0].steps).to.have.lengthOf(3);
                expect(branches[1].steps).to.have.lengthOf(3);
                expect(branches[2].steps).to.have.lengthOf(3);
                expect(branches[3].steps).to.have.lengthOf(3);
                expect(branches[4].steps).to.have.lengthOf(1);

                expect(branches).to.containSubsetInOrder([
                    {
                        steps: [
                            { text: "A", level: 0 },
                            { text: "B", level: 0 },
                            { text: "C", level: 0 }
                        ]
                    },
                    {
                        steps: [
                            { text: "A", level: 0 },
                            { text: "B", level: 0 },
                            { text: "D", level: 0 }
                        ]
                    },
                    {
                        steps: [
                            { text: "A", level: 0 },
                            { text: "E", level: 0 },
                            { text: "G", level: 0 }
                        ]
                    },
                    {
                        steps: [
                            { text: "A", level: 0 },
                            { text: "F", level: 0 },
                            { text: "G", level: 0 }
                        ]
                    },
                    {
                        steps: [
                            { text: "H", level: 0 }
                        ]
                    }
                ]);
            });

            it("connects branches via nonParallelId when ! is set", () => {
                let tree = new Tree();
                tree.parseIn(`
A -
    B -

    C - !

        D -
            E -

        F -

G -
                `);

                let branches = tree.branchify(tree.root);

                expect(branches).to.have.lengthOf(4);

                expect(branches[0].steps).to.have.lengthOf(2);
                expect(branches[1].steps).to.have.lengthOf(4);
                expect(branches[2].steps).to.have.lengthOf(3);
                expect(branches[3].steps).to.have.lengthOf(1);

                expect(branches[0].nonParallelId).to.equal(undefined);
                let nonParallelId = branches[1].nonParallelId;
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

            it("handles two steps with !, one a descendant of the other", () => {
                let tree = new Tree();
                tree.parseIn(`
A -
    B -

    C - !

        D ! -
            E -

        F -

G -
                `);

                let branches = tree.branchify(tree.root);

                expect(branches).to.have.lengthOf(4);

                expect(branches[0].steps).to.have.lengthOf(2);
                expect(branches[1].steps).to.have.lengthOf(4);
                expect(branches[2].steps).to.have.lengthOf(3);
                expect(branches[3].steps).to.have.lengthOf(1);

                expect(branches[0].nonParallelId).to.equal(undefined);
                let nonParallelId = branches[1].nonParallelId;
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

            it("handles two sibling steps with !", () => {
                let tree = new Tree();
                tree.parseIn(`
A -
    B - !

    C - !

        D -
            E -

        F -

G -
                `);

                let branches = tree.branchify(tree.root);

                expect(branches).to.have.lengthOf(4);

                expect(branches[0].steps).to.have.lengthOf(2);
                expect(branches[1].steps).to.have.lengthOf(4);
                expect(branches[2].steps).to.have.lengthOf(3);
                expect(branches[3].steps).to.have.lengthOf(1);

                let nonParallelId0 = branches[0].nonParallelId;
                expect(nonParallelId0).to.have.lengthOf.above(0);
                let nonParallelId1 = branches[1].nonParallelId;
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

            it("throws an exception when there's an infinite loop among function calls", function() { // function() needed for this.timeout() to work
                this.timeout(10000);

                let tree = new Tree();
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

            it("throws an exception if noDebug is set but a $ is present in a branch", () => {
                let tree = new Tree();
                tree.parseIn(`
A -
    $ B -
                `, "file.txt");

                assert.throws(() => {
                    tree.branchify(tree.root, undefined, undefined, true);
                }, "A $ was found, but the noDebug flag is set [file.txt:3]");
            });

            it("throws an exception if noDebug is set but a ~ is present in a branch", () => {
                let tree = new Tree();
                tree.parseIn(`
A -
    ~ B -
                `, "file.txt");

                assert.throws(() => {
                    tree.branchify(tree.root, undefined, undefined, true);
                }, "A ~ was found, but the noDebug flag is set [file.txt:3]");
            });

            it("marks as packaged hooks that are packaged", () => {
                let tree = new Tree();
                tree.parseIn(`
A -

*** Before Everything {
    K
}
                `, "file1.txt", false);

                tree.parseIn(`
*** Before Everything {
    B
}

*** After Everything {
    C
}

*** After Every Branch {
    D
}

*** After Every Step {
    E
}

*** Before Every Branch {
    F
}

*** Before Every Step {
    G
}
                `, "file2.txt", true);

                let branches = tree.branchify(tree.root);

                expect(branches).to.have.lengthOf(1);
                expect(tree.beforeEverything).to.have.lengthOf(2);
                expect(tree.afterEverything).to.have.lengthOf(1);

                expect(branches).to.containSubsetInOrder([
                    {
                        steps: [ { text: "A" } ],
                        beforeEveryBranch: [
                            { text: "Before Every Branch", codeBlock: "\n    F\n", isPackaged: true }
                        ],
                        afterEveryBranch: [
                            { text: "After Every Branch", codeBlock: "\n    D\n", isPackaged: true }
                        ],
                        beforeEveryStep: [
                            { text: "Before Every Step", codeBlock: "\n    G\n", isPackaged: true }
                        ],
                        afterEveryStep: [
                            { text: "After Every Step", codeBlock: "\n    E\n", isPackaged: true }
                        ]
                    }
                ]);

                expect(tree.beforeEverything).to.containSubsetInOrder([
                    { text: "Before Everything", codeBlock: "\n    B\n", isPackaged: true },
                    { text: "Before Everything", codeBlock: "\n    K\n", isPackaged: undefined }
                ]);

                expect(tree.afterEverything).to.containSubsetInOrder([
                    { text: "After Everything", codeBlock: "\n    C\n", isPackaged: true }
                ]);
            });
        });

        context("functions", () => {
            it("branchifies a function call with no children, whose function declaration has no children", () => {
                let tree = new Tree();
                tree.parseIn(`
F

* F
                `);

                let branches = tree.branchify(tree.root);

                expect(branches).to.have.lengthOf(1);
                expect(branches[0].steps).to.have.lengthOf(1);

                expect(branches).to.containSubsetInOrder([
                    {
                        steps: [
                            {
                                text: "F",
                                isFunctionCall: true,
                                isFunctionDeclaration: undefined,
                                level: 0,
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

            it("branchifies a function call with no children, whose function declaration has one branch", () => {
                let tree = new Tree();
                tree.parseIn(`
F

* F
    A -
                `);

                let branches = tree.branchify(tree.root);

                expect(branches).to.have.lengthOf(1);
                expect(branches[0].steps).to.have.lengthOf(2);

                expect(branches).to.containSubsetInOrder([
                    {
                        steps: [
                            {
                                text: "F",
                                isFunctionCall: true,
                                isFunctionDeclaration: undefined,
                                level: 0,
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
                                level: 1,
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

            it("doesn't expand a textual step that has the same text as a function declaration", () => {
                let tree = new Tree();
                tree.parseIn(`
F -

* F
    A -
                `);

                let branches = tree.branchify(tree.root);

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
                                level: 0,
                                originalStepInTree: { text: "F" }
                            }
                        ]
                    }
                ]);
            });

            it("properly merges identifiers between function call and function declaration", () => {
                let tree = new Tree();
                tree.parseIn(`
~ F

* F !
    A -
                `);

                let branches = tree.branchify(tree.root);

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
                                level: 0,
                                originalStepInTree: {
                                    text: "F",
                                    isFunctionCall: true,
                                    isFunctionDeclaration: undefined,
                                    isDebug: true,
                                    isNonParallel: undefined,
                                    functionDeclarationInTree: {
                                        text: "F",
                                        isFunctionCall: undefined,
                                        isFunctionDeclaration: true,
                                        isDebug: undefined,
                                        isNonParallel: true
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
                                level: 1,
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

            it("properly merges identifiers and a code block between function call and function declaration", () => {
                let tree = new Tree();
                tree.parseIn(`
~ F

* F ! {
    code block 1
    code block 2
}
                `);

                let branches = tree.branchify(tree.root);

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
                                level: 0,
                                codeBlock: '\n    code block 1\n    code block 2\n',
                                originalStepInTree: {
                                    text: "F",
                                    isFunctionCall: true,
                                    isFunctionDeclaration: undefined,
                                    isDebug: true,
                                    isNonParallel: undefined,
                                    codeBlock: undefined,
                                    functionDeclarationInTree: {
                                        text: "F",
                                        isFunctionCall: undefined,
                                        isFunctionDeclaration: true,
                                        isDebug: undefined,
                                        isNonParallel: true,
                                        codeBlock: '\n    code block 1\n    code block 2\n'
                                    }
                                }
                            }
                        ]
                    }
                ]);
            });

            it("branchifies a function call with no children, whose function declaration has multiple branches", () => {
                let tree = new Tree();
                tree.parseIn(`
F

* F
    A -
        B -
    C -
                `);

                let branches = tree.branchify(tree.root);

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
                                level: 0,
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
                                level: 1,
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
                                level: 1,
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
                                level: 0,
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
                                level: 1,
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

            it("handles a function declaration as an only child", () => {
                let tree = new Tree();
                tree.parseIn(`
A -
    * F
        B -
                `);

                let branches = tree.branchify(tree.root);

                expect(branches).to.have.lengthOf(1);
                expect(branches[0].steps).to.have.lengthOf(1);

                expect(branches).to.containSubsetInOrder([
                    {
                        steps: [ { text: "A" } ]
                    }
                ]);
            });

            it("handles a function declaration as an only child to a step block", () => {
                let tree = new Tree();
                tree.parseIn(`
A -
B -

    * F
        C -
                `);

                let branches = tree.branchify(tree.root);

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

            it("rejects a function call to a child function declaration", () => {
                let tree = new Tree();
                tree.parseIn(`
F
    * F
        B -
                `, "file.txt");

                assert.throws(() => {
                    tree.branchify(tree.root);
                }, "The function 'F' cannot be found. Is there a typo, or did you mean to make this a textual step (with a - at the end)? [file.txt:2]");
            });

            it("branchifies a function call with children, whose function declaration has no children", () => {
                let tree = new Tree();
                tree.parseIn(`
F
    A -
        B -

* F
                `);

                let branches = tree.branchify(tree.root);

                expect(branches).to.have.lengthOf(1);
                expect(branches[0].steps).to.have.lengthOf(3);

                expect(branches).to.containSubsetInOrder([
                    {
                        steps: [
                            {
                                text: "F",
                                isFunctionCall: true,
                                isFunctionDeclaration: undefined,
                                level: 0,
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
                                level: 0,
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
                                level: 0,
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

            it("branchifies a function call where both the function declaration above, and the function call above, have child function declarations of the same name", () => {
                let tree = new Tree();
                tree.parseIn(`
A
    F

    * F
        D -

* A
    * F
        C -
                `);

                let branches = tree.branchify(tree.root);

                expect(branches).to.have.lengthOf(1);
                expect(branches[0].steps).to.have.lengthOf(3);

                expect(branches).to.containSubsetInOrder([
                    {
                        steps: [ { text: "A" }, { text: "F" }, { text: "D" } ]
                    }
                ]);
            });

            it("branchifies a function call with children, whose function declaration has one branch", () => {
                let tree = new Tree();
                tree.parseIn(`
F
    C -
        D -

* F
    A -
        B -
                `);

                let branches = tree.branchify(tree.root);

                expect(branches).to.have.lengthOf(1);
                expect(branches[0].steps).to.have.lengthOf(5);

                expect(branches).to.containSubsetInOrder([
                    {
                        steps: [
                            {
                                text: "F",
                                isFunctionCall: true,
                                isFunctionDeclaration: undefined,
                                level: 0,
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
                                level: 1,
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
                                level: 1,
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
                                level: 0,
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
                                level: 0,
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

            it("branchifies a function call with children, whose function declaration has multiple branches", () => {
                let tree = new Tree();
                tree.parseIn(`
F
    C -
        D -

* F
    A -
        B -
    E -
                `);

                let branches = tree.branchify(tree.root);

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
                                level: 0,
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
                                level: 1,
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
                                level: 1,
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
                                level: 0,
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
                                level: 0,
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
                                level: 0,
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
                                level: 1,
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
                                level: 0,
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
                                level: 0,
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

            it("branchifies a function call with multiple branches within a function call with multiple branches", () => {
                let tree = new Tree();
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

                let branches = tree.branchify(tree.root);

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
                                level: 0,
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
                                level: 1,
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
                                level: 1,
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
                                level: 0,
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
                                level: 0,
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
                                level: 0,
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
                                level: 1,
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
                                level: 1,
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
                                level: 0,
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
                                level: 0,
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
                                level: 1,
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
                                level: 0,
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
                                level: 0,
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
                                level: 0,
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
                                level: 1,
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
                                level: 0,
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

            it("branchifies multiple function calls in the tree", () => {
                let tree = new Tree();
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

                let branches = tree.branchify(tree.root);

                expect(branches).to.have.lengthOf(3);
                expect(branches[0].steps).to.have.lengthOf(5);
                expect(branches[1].steps).to.have.lengthOf(5);
                expect(branches[2].steps).to.have.lengthOf(4);

                expect(branches).to.containSubsetInOrder([
                    {
                        steps: [
                            {
                                text: "FA",
                                level: 0
                            },
                            {
                                text: "A",
                                level: 1
                            },
                            {
                                text: "FB",
                                level: 0
                            },
                            {
                                text: "B1",
                                level: 1
                            },
                            {
                                text: "D",
                                level: 0
                            },
                        ]
                    },
                    {
                        steps: [
                            {
                                text: "FA",
                                level: 0
                            },
                            {
                                text: "A",
                                level: 1
                            },
                            {
                                text: "FB",
                                level: 0
                            },
                            {
                                text: "B2",
                                level: 1
                            },
                            {
                                text: "D",
                                level: 0
                            },
                        ]
                    },
                    {
                        steps: [
                            {
                                text: "FC",
                                level: 0
                            },
                            {
                                text: "FA",
                                level: 1
                            },
                            {
                                text: "A",
                                level: 2
                            },
                            {
                                text: "C",
                                level: 1
                            }
                        ]
                    }
                ]);
            });

            it("branchifies a function call declared within a function call", () => {
                let tree = new Tree();
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

                let branches = tree.branchify(tree.root);

                expect(branches).to.have.lengthOf(2);
                expect(branches[0].steps).to.have.lengthOf(1);
                expect(branches[1].steps).to.have.lengthOf(3);

                expect(branches).to.containSubsetInOrder([
                    {
                        steps: [
                            {
                                text: "FA",
                                level: 0
                            }
                        ]
                    },
                    {
                        steps: [
                            {
                                text: "FA",
                                level: 0
                            },
                            {
                                text: "FB",
                                level: 0
                            },
                            {
                                text: "B",
                                level: 1
                            }
                        ]
                    }
                ]);
            });

            it("if function B is declared within function A, and A is called, the children of the call to A will be able to call B", () => {
                let tree = new Tree();
                tree.parseIn(`
* A
    * B
        C -

A
    B
                `);

                let branches = tree.branchify(tree.root);

                expect(branches).to.have.lengthOf(1);
                expect(branches[0].steps).to.have.lengthOf(3);

                expect(branches).to.containSubsetInOrder([
                    {
                        steps: [
                            {
                                text: "A",
                                level: 0
                            },
                            {
                                text: "B",
                                level: 0
                            },
                            {
                                text: "C",
                                level: 1
                            }
                        ]
                    }
                ]);
            });

            it("doesn't allow a function to call itself", () => {
                let tree = new Tree();
                tree.parseIn(`
F

* F
    F
                `, "file.txt");

                assert.throws(() => {
                    tree.branchify(tree.root);
                }, "The function 'F' cannot be found. Is there a typo, or did you mean to make this a textual step (with a - at the end)? [file.txt:5]");
            });

            it("doesn't allow a function to call itself and finds a function with the same name beyond", () => {
                let tree = new Tree();
                tree.parseIn(`
F

* F
    F

* F
    A -
                `, "file.txt");

                let branches = tree.branchify(tree.root);

                expect(branches).to.have.lengthOf(1);
                expect(branches[0].steps).to.have.lengthOf(3);

                expect(branches).to.containSubsetInOrder([
                    {
                        steps: [ { text: "F", lineNumber: 2 }, { text: "F", lineNumber: 5 }, { text: "A", lineNumber: 8 } ]
                    }
                ]);
            });

            it("doesn't allow a function to call itself and finds a function with the same name beyond, more complex example", () => {
                let tree = new Tree();
                tree.parseIn(`
Start browser
    Nav to page

* Start browser
    Starting browser -

    * Nav to page
        Specific nav to page -
            Nav to page

* Nav to page
    Generic nav to page -
                `, "file.txt");

                let branches = tree.branchify(tree.root);

                expect(branches).to.have.lengthOf(1);
                expect(branches[0].steps).to.have.lengthOf(6);

                expect(branches[0].steps[0].text).to.equal("Start browser");
                expect(branches[0].steps[1].text).to.equal("Starting browser");
                expect(branches[0].steps[2].text).to.equal("Nav to page");
                expect(branches[0].steps[3].text).to.equal("Specific nav to page");
                expect(branches[0].steps[4].text).to.equal("Nav to page");
                expect(branches[0].steps[5].text).to.equal("Generic nav to page");
            });

            it("doesn't allow a function to call itself, with a private function, and finds a function with the same name beyond", () => {
                let tree = new Tree();
                tree.parseIn(`
Start browser

* Start browser
    Starting browser -
        Nav to page

    ** Nav to page
        Specific nav to page -
            Nav to page

* Nav to page
    Generic nav to page -
                `, "file.txt");

                let branches = tree.branchify(tree.root);

                expect(branches).to.have.lengthOf(1);
                expect(branches[0].steps).to.have.lengthOf(6);

                expect(branches[0].steps[0].text).to.equal("Start browser");
                expect(branches[0].steps[1].text).to.equal("Starting browser");
                expect(branches[0].steps[2].text).to.equal("Nav to page");
                expect(branches[0].steps[3].text).to.equal("Specific nav to page");
                expect(branches[0].steps[4].text).to.equal("Nav to page");
                expect(branches[0].steps[5].text).to.equal("Generic nav to page");
            });

            it("doesn't allow a function to call itself and finds a function with the same name beyond, slightly more complex example", () => {
                let tree = new Tree();
                tree.parseIn(`
* On special cart page
    On cart page
        Validate special cart stuff -

        * Clear cart
            Specific stuff -
                Clear cart

* On cart page
    * Clear cart
        Generic stuff -

On special cart page
    Clear cart
                `, "file.txt");

                let branches = tree.branchify(tree.root);

                expect(branches).to.have.lengthOf(1);
                expect(branches[0].steps).to.have.lengthOf(7);

                expect(branches[0].steps[0].text).to.equal("On special cart page");
                expect(branches[0].steps[1].text).to.equal("On cart page");
                expect(branches[0].steps[2].text).to.equal("Validate special cart stuff");
                expect(branches[0].steps[3].text).to.equal("Clear cart");
                expect(branches[0].steps[4].text).to.equal("Specific stuff");
                expect(branches[0].steps[5].text).to.equal("Clear cart");
                expect(branches[0].steps[6].text).to.equal("Generic stuff");
            });

            it("allows access to a function declared within a function", () => {
                let tree = new Tree();
                tree.parseIn(`
F
    H

* F
    * G
        * H
            One -

    G
                `, "file.txt");

                let branches = tree.branchify(tree.root);

                expect(branches).to.have.lengthOf(1);
                expect(branches[0].steps).to.have.lengthOf(4);

                expect(branches[0].steps[0].text).to.equal("F");
                expect(branches[0].steps[1].text).to.equal("G");
                expect(branches[0].steps[2].text).to.equal("H");
                expect(branches[0].steps[3].text).to.equal("One");

                tree = new Tree();
                tree.parseIn(`
* F
    * G
        * H
            One -

    G

F
    H
                `, "file.txt");

                branches = tree.branchify(tree.root);

                expect(branches).to.have.lengthOf(1);
                expect(branches[0].steps).to.have.lengthOf(4);

                expect(branches[0].steps[0].text).to.equal("F");
                expect(branches[0].steps[1].text).to.equal("G");
                expect(branches[0].steps[2].text).to.equal("H");
                expect(branches[0].steps[3].text).to.equal("One");
            });

            it("doesn't allow a function to call itself and finds a function with the same name beyond, most complex example", () => {
                let tree = new Tree();
                tree.parseIn(`
A
    F
        F
            F

* A
    * F
        * F
            * F
                Specific -
                    F

* F
    Generic -
                `, "file.txt");

                let branches = tree.branchify(tree.root);

                expect(branches).to.have.lengthOf(1);
                expect(branches[0].steps).to.have.lengthOf(7);

                expect(branches[0].steps[0].text).to.equal("A");
                expect(branches[0].steps[1].text).to.equal("F");
                expect(branches[0].steps[2].text).to.equal("F");
                expect(branches[0].steps[3].text).to.equal("F");
                expect(branches[0].steps[4].text).to.equal("Specific");
                expect(branches[0].steps[5].text).to.equal("F");
                expect(branches[0].steps[6].text).to.equal("Generic");
            });

            it("calls a private function it has access to", () => {
                let tree = new Tree();
                tree.parseIn(`
F

* F
    Private

    ** Private
        A -
                `, "file.txt");

                let branches = tree.branchify(tree.root);

                expect(branches).to.have.lengthOf(1);
                expect(branches[0].steps).to.have.lengthOf(3);

                expect(branches).to.containSubsetInOrder([
                    {
                        steps: [ { text: "F" }, { text: "Private" }, { text: "A" } ]
                    }
                ]);
            });

            it("doesn't allow a function to call a private function it doesn't have access to", () => {
                let tree = new Tree();
                tree.parseIn(`
Start browser
    Nav to page

* Start browser
    Starting browser -

    ** Nav to page
        Specific nav to page -

* Nav to page
    Generic nav to page -
                `, "file.txt");

                let branches = tree.branchify(tree.root);

                expect(branches).to.have.lengthOf(1);
                expect(branches[0].steps).to.have.lengthOf(4);

                expect(branches[0].steps[0].text).to.equal("Start browser");
                expect(branches[0].steps[1].text).to.equal("Starting browser");
                expect(branches[0].steps[2].text).to.equal("Nav to page");
                expect(branches[0].steps[3].text).to.equal("Generic nav to page");
            });

            it("handles a function declaration that ends in a *", () => {
                let tree = new Tree();
                tree.parseIn(`
My big function

* My big *
    A -

* My big something
    B -

* My big function
    C -
                `, "file.txt");

                let branches = tree.branchify(tree.root);

                expect(branches).to.have.lengthOf(1);
                expect(branches[0].steps).to.have.lengthOf(2);

                expect(branches[0].steps[0].text).to.equal("My big function");
                expect(branches[0].steps[1].text).to.equal("A");
            });

            it("handles a function declaration and function call that ends in a *", () => {
                let tree = new Tree();
                tree.parseIn(`
My big function

* My big *
    A -
        My big *

* My big something
    B -

* My big function
    C -
                `, "file.txt");

                let branches = tree.branchify(tree.root);

                expect(branches).to.have.lengthOf(1);
                expect(branches[0].steps).to.have.lengthOf(4);

                expect(branches[0].steps[0].text).to.equal("My big function");
                expect(branches[0].steps[1].text).to.equal("A");
                expect(branches[0].steps[2].text).to.equal("My big *");
                expect(branches[0].steps[3].text).to.equal("C");
            });

            it("handles a function declaration and function call that ends in a *, with variables", () => {
                let tree = new Tree();
                tree.parseIn(`
My big 'foobar' function

* My big {{v}} *
    A -
        My big {{v}} *

* My big {{w}} something
    B -

* My big {{w}} function
    C -
                `, "file.txt");

                let branches = tree.branchify(tree.root);

                expect(branches).to.have.lengthOf(1);
                expect(branches[0].steps).to.have.lengthOf(4);

                expect(branches[0].steps[0].text).to.equal("My big 'foobar' function");
                expect(branches[0].steps[1].text).to.equal("A");
                expect(branches[0].steps[2].text).to.equal("My big {{v}} *");
                expect(branches[0].steps[3].text).to.equal("C");
            });
        });

        context("{vars}", () => {
            it("branchifies {var} = F where F has muliple branches in {x}='value' format", () => {
                let tree = new Tree();
                tree.parseIn(`
{var} = F

* F
    {x}='1'

    {x}='2'
    {x}=''
    {x}="3"

    {a}='4'
                `);
                let branches = tree.branchify(tree.root);

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
                                level: 0
                            },
                            {
                                text: "{var}='1'",
                                isFunctionCall: undefined,
                                level: 1
                            }
                        ]
                    },
                    {
                        steps: [
                            {
                                text: "{var} = F",
                                isFunctionCall: true,
                                level: 0
                            },
                            {
                                text: "{var}='2'",
                                isFunctionCall: undefined,
                                level: 1
                            }
                        ]
                    },
                    {
                        steps: [
                            {
                                text: "{var} = F",
                                isFunctionCall: true,
                                level: 0
                            },
                            {
                                text: "{var}=''",
                                isFunctionCall: undefined,
                                level: 1
                            }
                        ]
                    },
                    {
                        steps: [
                            {
                                text: "{var} = F",
                                isFunctionCall: true,
                                level: 0
                            },
                            {
                                text: "{var}=\"3\"",
                                isFunctionCall: undefined,
                                level: 1
                            }
                        ]
                    },
                    {
                        steps: [
                            {
                                text: "{var} = F",
                                isFunctionCall: true,
                                level: 0
                            },
                            {
                                text: "{var}='4'",
                                isFunctionCall: undefined,
                                level: 1
                            }
                        ]
                    }
                ]);
            });

            it("branchifies {var} = F where it has children and F has muliple branches in {x}='value' format", () => {
                let tree = new Tree();
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
                let branches = tree.branchify(tree.root);

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
                                level: 0
                            },
                            {
                                text: "{var}='1'",
                                isFunctionCall: undefined,
                                level: 1
                            },
                            {
                                text: "G",
                                isFunctionCall: undefined,
                                level: 0
                            }
                        ]
                    },
                    {
                        steps: [
                            {
                                text: "{var} = F",
                                isFunctionCall: true,
                                level: 0
                            },
                            {
                                text: "{var}='2'",
                                isFunctionCall: undefined,
                                level: 1
                            },
                            {
                                text: "G",
                                isFunctionCall: undefined,
                                level: 0
                            }
                        ]
                    },
                    {
                        steps: [
                            {
                                text: "{var} = F",
                                isFunctionCall: true,
                                level: 0
                            },
                            {
                                text: "{var}=''",
                                isFunctionCall: undefined,
                                level: 1
                            },
                            {
                                text: "G",
                                isFunctionCall: undefined,
                                level: 0
                            }
                        ]
                    },
                    {
                        steps: [
                            {
                                text: "{var} = F",
                                isFunctionCall: true,
                                level: 0
                            },
                            {
                                text: "{var}=\"3\"",
                                isFunctionCall: undefined,
                                level: 1
                            },
                            {
                                text: "G",
                                isFunctionCall: undefined,
                                level: 0
                            }
                        ]
                    },
                    {
                        steps: [
                            {
                                text: "{var} = F",
                                isFunctionCall: true,
                                level: 0
                            },
                            {
                                text: "{var}='4'",
                                isFunctionCall: undefined,
                                level: 1
                            },
                            {
                                text: "G",
                                isFunctionCall: undefined,
                                level: 0
                            }
                        ]
                    }
                ]);
            });

            it("branchifies {var} = F where F has a code block", () => {
                let tree = new Tree();
                tree.parseIn(`
{var} = F

* F {
    code block
}
                `);
                let branches = tree.branchify(tree.root);

                expect(branches).to.have.lengthOf(1);
                expect(branches[0].steps).to.have.lengthOf(1);

                expect(branches).to.containSubsetInOrder([
                    {
                        steps: [
                            {
                                text: "{var} = F",
                                isFunctionCall: true,
                                level: 0,
                                codeBlock: '\n    code block\n'
                            }
                        ]
                    }
                ]);
            });

            it("branchifies {var} = F ..", () => {
                let tree = new Tree();
                tree.parseIn(`
{var} = F ..
    A -

* F
    {x}='1'
    {x}='2'
    {x}='3'
                `);
                let branches = tree.branchify(tree.root);

                expect(branches).to.have.lengthOf(1);
                expect(branches[0].steps).to.have.lengthOf(9);

                expect(branches[0].steps[0].text).to.equal("{var} = F");
                expect(branches[0].steps[1].text).to.equal("{var}='1'");
                expect(branches[0].steps[2].text).to.equal("A");

                expect(branches[0].steps[3].text).to.equal("{var} = F");
                expect(branches[0].steps[4].text).to.equal("{var}='2'");
                expect(branches[0].steps[5].text).to.equal("A");

                expect(branches[0].steps[6].text).to.equal("{var} = F");
                expect(branches[0].steps[7].text).to.equal("{var}='3'");
                expect(branches[0].steps[8].text).to.equal("A");
            });

            it("branchifies {var} = F under a .. step", () => {
                let tree = new Tree();
                tree.parseIn(`
S - ..
    {var} = F ..
        A -

* F
    {x}='1'
    {x}='2'
    {x}='3'
                `);
                let branches = tree.branchify(tree.root);

                expect(branches).to.have.lengthOf(1);
                expect(branches[0].steps).to.have.lengthOf(10);

                expect(branches[0].steps[0].text).to.equal("S");

                expect(branches[0].steps[1].text).to.equal("{var} = F");
                expect(branches[0].steps[2].text).to.equal("{var}='1'");
                expect(branches[0].steps[3].text).to.equal("A");

                expect(branches[0].steps[4].text).to.equal("{var} = F");
                expect(branches[0].steps[5].text).to.equal("{var}='2'");
                expect(branches[0].steps[6].text).to.equal("A");

                expect(branches[0].steps[7].text).to.equal("{var} = F");
                expect(branches[0].steps[8].text).to.equal("{var}='3'");
                expect(branches[0].steps[9].text).to.equal("A");
            });

            it("branchifies {var} = F .. that has more {var} = F inside of it", () => {
                let tree = new Tree();
                tree.parseIn(`
{var} = F ..
    {var2}='0'

* F
    {x}='1'
    {x}=F2
    {x}='4'
    {x}=F3

* F2
    {y}='2'
    {y}='3'

* F3 {
    return '5';
}
                `);
                let branches = tree.branchify(tree.root);

                expect(branches).to.have.lengthOf(1);
                expect(branches[0].steps).to.have.lengthOf(17);

                expect(branches[0].steps[0].text).to.equal("{var} = F");
                expect(branches[0].steps[1].text).to.equal("{var}='1'");
                expect(branches[0].steps[2].text).to.equal("{var2}='0'");

                expect(branches[0].steps[3].text).to.equal("{var} = F");
                expect(branches[0].steps[4].text).to.equal("{var}=F2");
                expect(branches[0].steps[5].text).to.equal("{var}='2'");
                expect(branches[0].steps[6].text).to.equal("{var2}='0'");

                expect(branches[0].steps[7].text).to.equal("{var} = F");
                expect(branches[0].steps[8].text).to.equal("{var}=F2");
                expect(branches[0].steps[9].text).to.equal("{var}='3'");
                expect(branches[0].steps[10].text).to.equal("{var2}='0'");

                expect(branches[0].steps[11].text).to.equal("{var} = F");
                expect(branches[0].steps[12].text).to.equal("{var}='4'");
                expect(branches[0].steps[13].text).to.equal("{var2}='0'");

                expect(branches[0].steps[14].text).to.equal("{var} = F");
                expect(branches[0].steps[15].text).to.equal("{var}=F3");
                expect(branches[0].steps[15].codeBlock).to.equal("\n    return '5';\n");
                expect(branches[0].steps[16].text).to.equal("{var2}='0'");
            });

            it("branchifies {var} = F that has more {var} = F inside of it", () => {
                let tree = new Tree();
                tree.parseIn(`
{var} = F
    {var2}='0'

* F
    {x}='1'
    {x}=F2
    {x}='4'
    {x}=F3

* F2
    {y}='2'
    {y}='3'

* F3 {
    return '5';
}
                `);
                let branches = tree.branchify(tree.root);

                expect(branches).to.have.lengthOf(5);
                expect(branches[0].steps).to.have.lengthOf(3);
                expect(branches[1].steps).to.have.lengthOf(4);
                expect(branches[2].steps).to.have.lengthOf(4);
                expect(branches[3].steps).to.have.lengthOf(3);
                expect(branches[4].steps).to.have.lengthOf(3);

                expect(branches[0].steps[0].text).to.equal("{var} = F");
                expect(branches[0].steps[1].text).to.equal("{var}='1'");
                expect(branches[0].steps[2].text).to.equal("{var2}='0'");

                expect(branches[1].steps[0].text).to.equal("{var} = F");
                expect(branches[1].steps[1].text).to.equal("{var}=F2");
                expect(branches[1].steps[2].text).to.equal("{var}='2'");
                expect(branches[1].steps[3].text).to.equal("{var2}='0'");

                expect(branches[2].steps[0].text).to.equal("{var} = F");
                expect(branches[2].steps[1].text).to.equal("{var}=F2");
                expect(branches[2].steps[2].text).to.equal("{var}='3'");
                expect(branches[2].steps[3].text).to.equal("{var2}='0'");

                expect(branches[3].steps[0].text).to.equal("{var} = F");
                expect(branches[3].steps[1].text).to.equal("{var}='4'");
                expect(branches[3].steps[2].text).to.equal("{var2}='0'");

                expect(branches[4].steps[0].text).to.equal("{var} = F");
                expect(branches[4].steps[1].text).to.equal("{var}=F3");
                expect(branches[4].steps[1].codeBlock).to.equal("\n    return '5';\n");
                expect(branches[4].steps[2].text).to.equal("{var2}='0'");
            });

            it("rejects {var} = F if F has a code block, but also has children", () => {
                let tree = new Tree();
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

            it("rejects {var} = F if F is in {x}='value' format, but some of those steps have children", () => {
                let tree = new Tree();
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

            it("rejects {var} = F if F doesn't have a code block, isn't a code block function, and isn't a branched function in {x}='value' format", () => {
                let tree = new Tree();
                tree.parseIn(`
{var} = F

* F
    {x}='1'
    D -
    {x}='4'
                `, "file.txt");

                assert.throws(() => {
                    tree.branchify(tree.root);
                }, "The function called at file.txt:2 must have all steps in its declaration be in format {x}='string' or {x}=Function (but file.txt:6 is not) [file.txt:2]");
            });
        });

        context("step blocks", () => {
            it("branchifies a step block with no children", () => {
                let tree = new Tree();
                tree.parseIn(`
A -
B -
C -
                `);
                let branches = tree.branchify(tree.root);

                expect(branches).to.have.lengthOf(3);
                expect(branches[0].steps).to.have.lengthOf(1);

                expect(branches).to.containSubsetInOrder([
                    {
                        steps: [
                            {
                                text: "A",
                                level: 0
                            }
                        ]
                    },
                    {
                        steps: [
                            {
                                text: "B",
                                level: 0
                            }
                        ]
                    },
                    {
                        steps: [
                            {
                                text: "C",
                                level: 0
                            }
                        ]
                    }
                ]);
            });

            it("branchifies a step block with children", () => {
                let tree = new Tree();
                tree.parseIn(`
A -
B -
C -

    D -

    E -
        F -
                `);
                let branches = tree.branchify(tree.root);

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
                                level: 0
                            },
                            {
                                text: "D",
                                level: 0
                            }
                        ]
                    },
                    {
                        steps: [
                            {
                                text: "A",
                                level: 0
                            },
                            {
                                text: "E",
                                level: 0
                            },
                            {
                                text: "F",
                                level: 0
                            }
                        ]
                    },
                    {
                        steps: [
                            {
                                text: "B",
                                level: 0
                            },
                            {
                                text: "D",
                                level: 0
                            }
                        ]
                    },
                    {
                        steps: [
                            {
                                text: "B",
                                level: 0
                            },
                            {
                                text: "E",
                                level: 0
                            },
                            {
                                text: "F",
                                level: 0
                            }
                        ]
                    },
                    {
                        steps: [
                            {
                                text: "C",
                                level: 0
                            },
                            {
                                text: "D",
                                level: 0
                            }
                        ]
                    },
                    {
                        steps: [
                            {
                                text: "C",
                                level: 0
                            },
                            {
                                text: "E",
                                level: 0
                            },
                            {
                                text: "F",
                                level: 0
                            }
                        ]
                    }
                ]);
            });

            it("branchifies two levels of step blocks", () => {
                let tree = new Tree();
                tree.parseIn(`
A -
B -

    C -
    D -

        E -
                `);
                let branches = tree.branchify(tree.root);

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
                                level: 0
                            },
                            {
                                text: "C",
                                level: 0
                            },
                            {
                                text: "E",
                                level: 0
                            }
                        ]
                    },
                    {
                        steps: [
                            {
                                text: "A",
                                level: 0
                            },
                            {
                                text: "D",
                                level: 0
                            },
                            {
                                text: "E",
                                level: 0
                            }
                        ]
                    },
                    {
                        steps: [
                            {
                                text: "B",
                                level: 0
                            },
                            {
                                text: "C",
                                level: 0
                            },
                            {
                                text: "E",
                                level: 0
                            }
                        ]
                    },
                    {
                        steps: [
                            {
                                text: "B",
                                level: 0
                            },
                            {
                                text: "D",
                                level: 0
                            },
                            {
                                text: "E",
                                level: 0
                            }
                        ]
                    }
                ]);
            });
        });

        context(".. steps", () => {
            it("branchifies a .. step with no children", () => {
                let tree = new Tree();
                tree.parseIn(`
A - ..
                `);
                let branches = tree.branchify(tree.root);

                expect(branches).to.have.lengthOf(1);
                expect(branches[0].steps).to.have.lengthOf(1);

                expect(branches).to.containSubsetInOrder([
                    {
                        steps: [
                            {
                                text: "A",
                                level: 0,
                                isSequential: true
                            }
                        ]
                    }
                ]);
            });

            it("branchifies a .. step with children", () => {
                let tree = new Tree();
                tree.parseIn(`
A - ..
    B -
        C -
    D -
                `);
                let branches = tree.branchify(tree.root);

                expect(branches).to.have.lengthOf(1);
                expect(branches[0].steps).to.have.lengthOf(4);

                expect(branches).to.containSubsetInOrder([
                    {
                        steps: [
                            {
                                text: "A",
                                level: 0,
                                isSequential: true
                            },
                            {
                                text: "B",
                                level: 0,
                                isSequential: undefined
                            },
                            {
                                text: "C",
                                level: 0,
                                isSequential: undefined
                            },
                            {
                                text: "D",
                                level: 0,
                                isSequential: undefined
                            }
                        ]
                    }
                ]);
            });

            it("branchifies a .. step that is a function call and has no children", () => {
                let tree = new Tree();
                tree.parseIn(`
F ..

* F
    A -
        B -
    C -

                `);
                let branches = tree.branchify(tree.root);

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
                                level: 0,
                                isSequential: true
                            },
                            {
                                text: "A",
                                level: 1,
                                isSequential: undefined
                            },
                            {
                                text: "B",
                                level: 1,
                                isSequential: undefined
                            },
                            {
                                text: "F",
                                level: 0,
                                isSequential: true
                            },
                            {
                                text: "C",
                                level: 1,
                                isSequential: undefined
                            }
                        ]
                    }
                ]);
            });

            it("branchifies a .. step that is a function call and has children", () => {
                let tree = new Tree();
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
                let branches = tree.branchify(tree.root);

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
                                level: 0,
                                isSequential: true
                            },
                            {
                                text: "A",
                                level: 1,
                                isSequential: undefined
                            },
                            {
                                text: "B",
                                level: 1,
                                isSequential: undefined
                            },
                            {
                                text: "D",
                                level: 0,
                                isSequential: undefined
                            },
                            {
                                text: "E",
                                level: 0,
                                isSequential: undefined
                            },
                            {
                                text: "G",
                                level: 0,
                                isSequential: undefined
                            },
                            {
                                text: "H",
                                level: 0,
                                isSequential: undefined
                            },
                            {
                                text: "F",
                                level: 0,
                                isSequential: true
                            },
                            {
                                text: "C",
                                level: 1,
                                isSequential: undefined
                            },
                            {
                                text: "D",
                                level: 0,
                                isSequential: undefined
                            },
                            {
                                text: "E",
                                level: 0,
                                isSequential: undefined
                            },
                            {
                                text: "G",
                                level: 0,
                                isSequential: undefined
                            },
                            {
                                text: "H",
                                level: 0,
                                isSequential: undefined
                            }
                        ]
                    }
                ]);
            });

            it("branchifies a .. step that is a function call, has children, and whose function declaration starts with a ..", () => {
                let tree = new Tree();
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
                let branches = tree.branchify(tree.root);

                expect(branches).to.have.lengthOf(1);
                expect(branches[0].steps).to.have.lengthOf(8);

                expect(branches).to.containSubsetInOrder([
                    {
                        steps: [
                            {
                                text: "F",
                                level: 0,
                                isSequential: true
                            },
                            {
                                text: "A",
                                level: 1,
                                isSequential: undefined
                            },
                            {
                                text: "B",
                                level: 1,
                                isSequential: undefined
                            },
                            {
                                text: "C",
                                level: 1,
                                isSequential: undefined
                            },
                            {
                                text: "D",
                                level: 0,
                                isSequential: undefined
                            },
                            {
                                text: "E",
                                level: 0,
                                isSequential: undefined
                            },
                            {
                                text: "G",
                                level: 0,
                                isSequential: undefined
                            },
                            {
                                text: "H",
                                level: 0,
                                isSequential: undefined
                            }
                        ]
                    }
                ]);
            });

            it("branchifies a .. step that is a function call, has children, and where the function declaration has multiple branches", () => {
                let tree = new Tree();
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
                let branches = tree.branchify(tree.root);

                expect(branches).to.have.lengthOf(1);
                expect(branches[0].steps).to.have.lengthOf(7);

                expect(branches).to.containSubsetInOrder([
                    {
                        steps: [
                            {
                                text: "F",
                                level: 0,
                                isSequential: true
                            },
                            {
                                text: "A",
                                level: 1,
                                isSequential: undefined
                            },
                            {
                                text: "B",
                                level: 1,
                                isSequential: undefined
                            },
                            {
                                text: "D",
                                level: 0,
                                isSequential: undefined
                            },
                            {
                                text: "E",
                                level: 0,
                                isSequential: undefined
                            },
                            {
                                text: "G",
                                level: 0,
                                isSequential: undefined
                            },
                            {
                                text: "H",
                                level: 0,
                                isSequential: undefined
                            }
                        ]
                    }
                ]);
            });

            it("branchifies a .. step that is a function call, has children, where the function declaration has a function call", () => {
                let tree = new Tree();
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
                let branches = tree.branchify(tree.root);

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
                                level: 0,
                                isSequential: true
                            },
                            {
                                text: "A",
                                level: 1,
                                isSequential: undefined
                            },
                            {
                                text: "B",
                                level: 2,
                                isSequential: undefined
                            },
                            {
                                text: "I",
                                level: 1,
                                isSequential: undefined
                            },
                            {
                                text: "D",
                                level: 0,
                                isSequential: undefined
                            },
                            {
                                text: "E",
                                level: 0,
                                isSequential: undefined
                            },
                            {
                                text: "G",
                                level: 0,
                                isSequential: undefined
                            },
                            {
                                text: "H",
                                level: 0,
                                isSequential: undefined
                            },
                            {
                                text: "F",
                                level: 0,
                                isSequential: true
                            },
                            {
                                text: "A",
                                level: 1,
                                isSequential: undefined
                            },
                            {
                                text: "C",
                                level: 2,
                                isSequential: undefined
                            },
                            {
                                text: "I",
                                level: 1,
                                isSequential: undefined
                            },
                            {
                                text: "D",
                                level: 0,
                                isSequential: undefined
                            },
                            {
                                text: "E",
                                level: 0,
                                isSequential: undefined
                            },
                            {
                                text: "G",
                                level: 0,
                                isSequential: undefined
                            },
                            {
                                text: "H",
                                level: 0,
                                isSequential: undefined
                            }
                        ]
                    }
                ]);
            });

            it("branchifies a .. step that has a step block as a child", () => {
                let tree = new Tree();
                tree.parseIn(`
S .. -
    A -
    B -
    C -
                `);
                let branches = tree.branchify(tree.root);

                expect(branches).to.have.lengthOf(1);
                expect(branches[0].steps).to.have.lengthOf(4);

                expect(branches).to.containSubsetInOrder([
                    {
                        steps: [
                            {
                                text: "S",
                                level: 0,
                                isSequential: true
                            },
                            {
                                text: "A",
                                level: 0,
                                isSequential: undefined
                            },
                            {
                                text: "B",
                                level: 0,
                                isSequential: undefined
                            },
                            {
                                text: "C",
                                level: 0,
                                isSequential: undefined
                            }
                        ]
                    }
                ]);
            });

            it("branchifies a .. step that has a step block as a child, and a single step as its child", () => {
                let tree = new Tree();
                tree.parseIn(`
S .. -

    A -
    B -
    C -

        D -
                `);
                let branches = tree.branchify(tree.root);

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
                                level: 0,
                                isSequential: true
                            },
                            {
                                text: "A",
                                level: 0,
                                isSequential: undefined
                            },
                            {
                                text: "D",
                                level: 0,
                                isSequential: undefined
                            },
                            {
                                text: "B",
                                level: 0,
                                isSequential: undefined
                            },
                            {
                                text: "D",
                                level: 0,
                                isSequential: undefined
                            },
                            {
                                text: "C",
                                level: 0,
                                isSequential: undefined
                            },
                            {
                                text: "D",
                                level: 0,
                                isSequential: undefined
                            }
                        ]
                    }
                ]);
            });

            it("branchifies a .. step that has a step block as a child and the step block has function calls as a members", () => {
                let tree = new Tree();
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
                let branches = tree.branchify(tree.root);

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
                                level: 0,
                                isSequential: true
                            },
                            {
                                text: "A",
                                level: 0,
                                isSequential: undefined
                            },
                            {
                                text: "I",
                                level: 0,
                                isSequential: undefined
                            },
                            {
                                text: "B",
                                level: 0,
                                isSequential: undefined
                            },
                            {
                                text: "D",
                                level: 1,
                                isSequential: undefined
                            },
                            {
                                text: "I",
                                level: 0,
                                isSequential: undefined
                            },
                            {
                                text: "B",
                                level: 0,
                                isSequential: undefined
                            },
                            {
                                text: "E",
                                level: 1,
                                isSequential: undefined
                            },
                            {
                                text: "I",
                                level: 0,
                                isSequential: undefined
                            },
                            {
                                text: "B",
                                level: 0,
                                isSequential: undefined
                            },
                            {
                                text: "G",
                                level: 1,
                                isSequential: undefined
                            },
                            {
                                text: "I",
                                level: 0,
                                isSequential: undefined
                            },
                            {
                                text: "C",
                                level: 0,
                                isSequential: undefined
                            },
                            {
                                text: "H",
                                level: 1,
                                isSequential: undefined
                            },
                            {
                                text: "I",
                                level: 0,
                                isSequential: undefined
                            }
                        ]
                    }
                ]);
            });

            it("branchifies a .. step that has a step block as a child, and another step block as its child", () => {
                let tree = new Tree();
                tree.parseIn(`
S .. -

    A -
    B -

        C -
        D -
                `);
                let branches = tree.branchify(tree.root);

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
                                level: 0,
                                isSequential: true
                            },
                            {
                                text: "A",
                                level: 0,
                                isSequential: undefined
                            },
                            {
                                text: "C",
                                level: 0,
                                isSequential: undefined
                            },
                            {
                                text: "D",
                                level: 0,
                                isSequential: undefined
                            },
                            {
                                text: "B",
                                level: 0,
                                isSequential: undefined
                            },
                            {
                                text: "C",
                                level: 0,
                                isSequential: undefined
                            },
                            {
                                text: "D",
                                level: 0,
                                isSequential: undefined
                            }
                        ]
                    }
                ]);
            });

            it("branchifies a .. step that has a step block as a child, and another step block as its child, and another step as its child", () => {
                let tree = new Tree();
                tree.parseIn(`
S .. -

    A -
    B -

        C -
        D -

            E -
                `);
                let branches = tree.branchify(tree.root);

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
                                level: 0,
                                isSequential: true
                            },
                            {
                                text: "A",
                                level: 0,
                                isSequential: undefined
                            },
                            {
                                text: "C",
                                level: 0,
                                isSequential: undefined
                            },
                            {
                                text: "E",
                                level: 0,
                                isSequential: undefined
                            },
                            {
                                text: "D",
                                level: 0,
                                isSequential: undefined
                            },
                            {
                                text: "E",
                                level: 0,
                                isSequential: undefined
                            },
                            {
                                text: "B",
                                level: 0,
                                isSequential: undefined
                            },
                            {
                                text: "C",
                                level: 0,
                                isSequential: undefined
                            },
                            {
                                text: "E",
                                level: 0,
                                isSequential: undefined
                            },
                            {
                                text: "D",
                                level: 0,
                                isSequential: undefined
                            },
                            {
                                text: "E",
                                level: 0,
                                isSequential: undefined
                            }
                        ]
                    }
                ]);
            });

            it("branchifies a .. step that has other .. steps as children", () => {
                let tree = new Tree();
                tree.parseIn(`
S .. -
    A - ..
        B -
            C -
        D -
    E -
                `);
                let branches = tree.branchify(tree.root);

                expect(branches).to.have.lengthOf(1);
                expect(branches[0].steps).to.have.lengthOf(6);

                expect(branches).to.containSubsetInOrder([
                    {
                        steps: [
                            {
                                text: "S",
                                level: 0,
                                isSequential: true
                            },
                            {
                                text: "A",
                                level: 0,
                                isSequential: true
                            },
                            {
                                text: "B",
                                level: 0,
                                isSequential: undefined
                            },
                            {
                                text: "C",
                                level: 0,
                                isSequential: undefined
                            },
                            {
                                text: "D",
                                level: 0,
                                isSequential: undefined
                            },
                            {
                                text: "E",
                                level: 0,
                                isSequential: undefined
                            }
                        ]
                    }
                ]);
            });

            it("branchifies a function declaration under a .. step", () => {
                let tree = new Tree();
                tree.parseIn(`
A - ..
    F

    * F
        B -
                `);

                let branches = tree.branchify(tree.root);

                expect(branches).to.have.lengthOf(1);
                expect(branches[0].steps).to.have.lengthOf(3);

                expect(branches).to.containSubsetInOrder([
                    {
                        steps: [
                            {
                                text: "A",
                                level: 0,
                                isSequential: true
                            },
                            {
                                text: "F",
                                level: 0,
                                isSequential: undefined
                            },
                            {
                                text: "B",
                                level: 1,
                                isSequential: undefined
                            }
                        ]
                    }
                ]);
            });
        });

        context(".. step blocks", () => {
            it("branchifies a .. step block with no children", () => {
                let tree = new Tree();
                tree.parseIn(`
..
A -
B -
C -
                `);
                let branches = tree.branchify(tree.root);

                expect(branches).to.have.lengthOf(1);
                expect(branches[0].steps).to.have.lengthOf(3);

                expect(branches).to.containSubsetInOrder([
                    {
                        steps: [
                            {
                                text: "A",
                                level: 0,
                                isSequential: undefined
                            },
                            {
                                text: "B",
                                level: 0,
                                isSequential: undefined
                            },
                            {
                                text: "C",
                                level: 0,
                                isSequential: undefined
                            }
                        ]
                    }
                ]);
            });

            it("branchifies a two .. step blocks with no children", () => {
                let tree = new Tree();
                tree.parseIn(`
..
A -
B -

..
C -
D -
                `);
                let branches = tree.branchify(tree.root);

                expect(branches).to.have.lengthOf(2);
                expect(branches[0].steps).to.have.lengthOf(2);
                expect(branches[1].steps).to.have.lengthOf(2);

                expect(branches).to.containSubsetInOrder([
                    {
                        steps: [
                            {
                                text: "A",
                                level: 0,
                                isSequential: undefined
                            },
                            {
                                text: "B",
                                level: 0,
                                isSequential: undefined
                            }
                        ]
                    },
                    {
                        steps: [
                            {
                                text: "C",
                                level: 0,
                                isSequential: undefined
                            },
                            {
                                text: "D",
                                level: 0,
                                isSequential: undefined
                            }
                        ]
                    }
                ]);
            });

            it("branchifies a .. step block with a single branch of children", () => {
                let tree = new Tree();
                tree.parseIn(`
..
A -
B -
C -

    D -
        E -
                `);
                let branches = tree.branchify(tree.root);

                expect(branches).to.have.lengthOf(1);
                expect(branches[0].steps).to.have.lengthOf(5);

                expect(branches).to.containSubsetInOrder([
                    {
                        steps: [
                            {
                                text: "A",
                                level: 0,
                                isSequential: undefined
                            },
                            {
                                text: "B",
                                level: 0,
                                isSequential: undefined
                            },
                            {
                                text: "C",
                                level: 0,
                                isSequential: undefined
                            },
                            {
                                text: "D",
                                level: 0,
                                isSequential: undefined
                            },
                            {
                                text: "E",
                                level: 0,
                                isSequential: undefined
                            }
                        ]
                    }
                ]);
            });

            it("branchifies a .. step block with multiple branches of children", () => {
                let tree = new Tree();
                tree.parseIn(`
..
A -
B -
C -

    D -
        E -
    F -
                `);
                let branches = tree.branchify(tree.root);

                expect(branches).to.have.lengthOf(2);
                expect(branches[0].steps).to.have.lengthOf(5);
                expect(branches[1].steps).to.have.lengthOf(4);

                expect(branches).to.containSubsetInOrder([
                    {
                        steps: [
                            {
                                text: "A",
                                level: 0,
                                isSequential: undefined
                            },
                            {
                                text: "B",
                                level: 0,
                                isSequential: undefined
                            },
                            {
                                text: "C",
                                level: 0,
                                isSequential: undefined
                            },
                            {
                                text: "D",
                                level: 0,
                                isSequential: undefined
                            },
                            {
                                text: "E",
                                level: 0,
                                isSequential: undefined
                            }
                        ]
                    },
                    {
                        steps: [
                            {
                                text: "A",
                                level: 0,
                                isSequential: undefined
                            },
                            {
                                text: "B",
                                level: 0,
                                isSequential: undefined
                            },
                            {
                                text: "C",
                                level: 0,
                                isSequential: undefined
                            },
                            {
                                text: "F",
                                level: 0,
                                isSequential: undefined
                            }
                        ]
                    }
                ]);
            });

            it("branchifies a .. step block that contains function calls, where each function call has a single branch", () => {
                let tree = new Tree();
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
                let branches = tree.branchify(tree.root);

                expect(branches).to.have.lengthOf(1);
                expect(branches[0].steps).to.have.lengthOf(6);

                expect(branches).to.containSubsetInOrder([
                    {
                        steps: [
                            {
                                text: "A",
                                level: 0,
                                isSequential: undefined
                            },
                            {
                                text: "G",
                                level: 1,
                                isSequential: undefined
                            },
                            {
                                text: "H",
                                level: 1,
                                isSequential: undefined
                            },
                            {
                                text: "B",
                                level: 0,
                                isSequential: undefined
                            },
                            {
                                text: "C",
                                level: 0,
                                isSequential: undefined
                            },
                            {
                                text: "I",
                                level: 1,
                                isSequential: undefined
                            }
                        ]
                    }
                ]);
            });

            it("branchifies a .. step block that contains a function call, whose function declaration starts with a ..", () => {
                let tree = new Tree();
                tree.parseIn(`
..
A
B -

* A ..
    C -
        D -
    E -
                `);
                let branches = tree.branchify(tree.root);

                expect(branches).to.have.lengthOf(1);
                expect(branches[0].steps).to.have.lengthOf(5);

                expect(branches).to.containSubsetInOrder([
                    {
                        steps: [
                            {
                                text: "A",
                                level: 0,
                                isSequential: true
                            },
                            {
                                text: "C",
                                level: 1,
                                isSequential: undefined
                            },
                            {
                                text: "D",
                                level: 1,
                                isSequential: undefined
                            },
                            {
                                text: "E",
                                level: 1,
                                isSequential: undefined
                            },
                            {
                                text: "B",
                                level: 0,
                                isSequential: undefined
                            }
                        ]
                    }
                ]);
            });

            it("branchifies a function declaration under a .. step block", () => {
                let tree = new Tree();
                tree.parseIn(`
..
A -
B -

    F

    * F
        C -
                `);

                let branches = tree.branchify(tree.root);

                expect(branches).to.have.lengthOf(1);
                expect(branches[0].steps).to.have.lengthOf(4);

                expect(branches).to.containSubsetInOrder([
                    {
                        steps: [
                            {
                                text: "A",
                                level: 0,
                                isSequential: undefined
                            },
                            {
                                text: "B",
                                level: 0,
                                isSequential: undefined
                            },
                            {
                                text: "F",
                                level: 0,
                                isSequential: undefined
                            },
                            {
                                text: "C",
                                level: 1,
                                isSequential: undefined
                            }
                        ]
                    }
                ]);
            });

            it("branchifies a .. step block that contains function calls, where each function declaration has multiple branches", () => {
                let tree = new Tree();
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
                let branches = tree.branchify(tree.root);

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
                                level: 0,
                                isSequential: undefined
                            },
                            {
                                text: "G",
                                level: 1,
                                isSequential: undefined
                            },
                            {
                                text: "H",
                                level: 1,
                                isSequential: undefined
                            },
                            {
                                text: "B",
                                level: 0,
                                isSequential: undefined
                            },
                            {
                                text: "C",
                                level: 0,
                                isSequential: undefined
                            },
                            {
                                text: "I",
                                level: 1,
                                isSequential: undefined
                            }
                        ]
                    },
                    {
                        steps: [
                            {
                                text: "A",
                                level: 0,
                                isSequential: undefined
                            },
                            {
                                text: "G",
                                level: 1,
                                isSequential: undefined
                            },
                            {
                                text: "H",
                                level: 1,
                                isSequential: undefined
                            },
                            {
                                text: "B",
                                level: 0,
                                isSequential: undefined
                            },
                            {
                                text: "C",
                                level: 0,
                                isSequential: undefined
                            },
                            {
                                text: "K",
                                level: 1,
                                isSequential: undefined
                            }
                        ]
                    },
                    {
                        steps: [
                            {
                                text: "A",
                                level: 0,
                                isSequential: undefined
                            },
                            {
                                text: "J",
                                level: 1,
                                isSequential: undefined
                            },
                            {
                                text: "B",
                                level: 0,
                                isSequential: undefined
                            },
                            {
                                text: "C",
                                level: 0,
                                isSequential: undefined
                            },
                            {
                                text: "I",
                                level: 1,
                                isSequential: undefined
                            }
                        ]
                    },
                    {
                        steps: [
                            {
                                text: "A",
                                level: 0,
                                isSequential: undefined
                            },
                            {
                                text: "J",
                                level: 1,
                                isSequential: undefined
                            },
                            {
                                text: "B",
                                level: 0,
                                isSequential: undefined
                            },
                            {
                                text: "C",
                                level: 0,
                                isSequential: undefined
                            },
                            {
                                text: "K",
                                level: 1,
                                isSequential: undefined
                            }
                        ]
                    }
                ]);
            });

            it("branchifies a .. step block that contains function calls and multiple branches of children, where each function declaration has multiple branches", () => {
                let tree = new Tree();
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
                let branches = tree.branchify(tree.root);

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
                            { text: "A", level: 0, isSequential: undefined },
                            { text: "G", level: 1, isSequential: undefined },
                            { text: "H", level: 1, isSequential: undefined },
                            { text: "B", level: 0, isSequential: undefined },
                            { text: "C", level: 0, isSequential: undefined },
                            { text: "I", level: 1, isSequential: undefined },
                            { text: "L", level: 0, isSequential: undefined }
                        ]
                    },
                    {
                        steps: [
                            { text: "A", level: 0, isSequential: undefined },
                            { text: "G", level: 1, isSequential: undefined },
                            { text: "H", level: 1, isSequential: undefined },
                            { text: "B", level: 0, isSequential: undefined },
                            { text: "C", level: 0, isSequential: undefined },
                            { text: "I", level: 1, isSequential: undefined },
                            { text: "M", level: 0, isSequential: undefined },
                            { text: "N", level: 0, isSequential: undefined }
                        ]
                    },
                    {
                        steps: [
                            { text: "A", level: 0, isSequential: undefined },
                            { text: "G", level: 1, isSequential: undefined },
                            { text: "H", level: 1, isSequential: undefined },
                            { text: "B", level: 0, isSequential: undefined },
                            { text: "C", level: 0, isSequential: undefined },
                            { text: "I", level: 1, isSequential: undefined },
                            { text: "M", level: 0, isSequential: undefined },
                            { text: "O", level: 0, isSequential: undefined }
                        ]
                    },
                    {
                        steps: [
                            { text: "A", level: 0, isSequential: undefined },
                            { text: "G", level: 1, isSequential: undefined },
                            { text: "H", level: 1, isSequential: undefined },
                            { text: "B", level: 0, isSequential: undefined },
                            { text: "C", level: 0, isSequential: undefined },
                            { text: "K", level: 1, isSequential: undefined },
                            { text: "L", level: 0, isSequential: undefined }
                        ]
                    },
                    {
                        steps: [
                            { text: "A", level: 0, isSequential: undefined },
                            { text: "G", level: 1, isSequential: undefined },
                            { text: "H", level: 1, isSequential: undefined },
                            { text: "B", level: 0, isSequential: undefined },
                            { text: "C", level: 0, isSequential: undefined },
                            { text: "K", level: 1, isSequential: undefined },
                            { text: "M", level: 0, isSequential: undefined },
                            { text: "N", level: 0, isSequential: undefined }
                        ]
                    },
                    {
                        steps: [
                            { text: "A", level: 0, isSequential: undefined },
                            { text: "G", level: 1, isSequential: undefined },
                            { text: "H", level: 1, isSequential: undefined },
                            { text: "B", level: 0, isSequential: undefined },
                            { text: "C", level: 0, isSequential: undefined },
                            { text: "K", level: 1, isSequential: undefined },
                            { text: "M", level: 0, isSequential: undefined },
                            { text: "O", level: 0, isSequential: undefined }
                        ]
                    },
                    {
                        steps: [
                            { text: "A", level: 0, isSequential: undefined },
                            { text: "J", level: 1, isSequential: undefined },
                            { text: "B", level: 0, isSequential: undefined },
                            { text: "C", level: 0, isSequential: undefined },
                            { text: "I", level: 1, isSequential: undefined },
                            { text: "L", level: 0, isSequential: undefined }
                        ]
                    },
                    {
                        steps: [
                            { text: "A", level: 0, isSequential: undefined },
                            { text: "J", level: 1, isSequential: undefined },
                            { text: "B", level: 0, isSequential: undefined },
                            { text: "C", level: 0, isSequential: undefined },
                            { text: "I", level: 1, isSequential: undefined },
                            { text: "M", level: 0, isSequential: undefined },
                            { text: "N", level: 0, isSequential: undefined }
                        ]
                    },
                    {
                        steps: [
                            { text: "A", level: 0, isSequential: undefined },
                            { text: "J", level: 1, isSequential: undefined },
                            { text: "B", level: 0, isSequential: undefined },
                            { text: "C", level: 0, isSequential: undefined },
                            { text: "I", level: 1, isSequential: undefined },
                            { text: "M", level: 0, isSequential: undefined },
                            { text: "O", level: 0, isSequential: undefined }
                        ]
                    },
                    {
                        steps: [
                            { text: "A", level: 0, isSequential: undefined },
                            { text: "J", level: 1, isSequential: undefined },
                            { text: "B", level: 0, isSequential: undefined },
                            { text: "C", level: 0, isSequential: undefined },
                            { text: "K", level: 1, isSequential: undefined },
                            { text: "L", level: 0, isSequential: undefined }
                        ]
                    },
                    {
                        steps: [
                            { text: "A", level: 0, isSequential: undefined },
                            { text: "J", level: 1, isSequential: undefined },
                            { text: "B", level: 0, isSequential: undefined },
                            { text: "C", level: 0, isSequential: undefined },
                            { text: "K", level: 1, isSequential: undefined },
                            { text: "M", level: 0, isSequential: undefined },
                            { text: "N", level: 0, isSequential: undefined }
                        ]
                    },
                    {
                        steps: [
                            { text: "A", level: 0, isSequential: undefined },
                            { text: "J", level: 1, isSequential: undefined },
                            { text: "B", level: 0, isSequential: undefined },
                            { text: "C", level: 0, isSequential: undefined },
                            { text: "K", level: 1, isSequential: undefined },
                            { text: "M", level: 0, isSequential: undefined },
                            { text: "O", level: 0, isSequential: undefined }
                        ]
                    }
                ]);
            });

            it("branchifies a .. step that contains a .. step block", () => {
                let tree = new Tree();
                tree.parseIn(`
..
A -
B -
    ..
    C -
    D -
                `);
                let branches = tree.branchify(tree.root);

                expect(branches).to.have.lengthOf(1);
                expect(branches[0].steps).to.have.lengthOf(4);

                expect(branches).to.containSubsetInOrder([
                    {
                        steps: [
                            {
                                text: "A",
                                level: 0,
                                isSequential: undefined
                            },
                            {
                                text: "B",
                                level: 0,
                                isSequential: undefined
                            },
                            {
                                text: "C",
                                level: 0,
                                isSequential: undefined
                            },
                            {
                                text: "D",
                                level: 0,
                                isSequential: undefined
                            }
                        ]
                    }
                ]);
            });

            it("branchifies a .. step that contains a .. step block that contains a function call, whose function declaration has multiple branches", () => {
                let tree = new Tree();
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
                let branches = tree.branchify(tree.root);

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
                                level: 0,
                                isSequential: undefined
                            },
                            {
                                text: "B",
                                level: 0,
                                isSequential: undefined
                            },
                            {
                                text: "C",
                                level: 0,
                                isSequential: undefined
                            },
                            {
                                text: "E",
                                level: 1,
                                isSequential: undefined
                            },
                            {
                                text: "D",
                                level: 0,
                                isSequential: undefined
                            }
                        ]
                    },
                    {
                        steps: [
                            {
                                text: "A",
                                level: 0,
                                isSequential: undefined
                            },
                            {
                                text: "B",
                                level: 0,
                                isSequential: undefined
                            },
                            {
                                text: "C",
                                level: 0,
                                isSequential: undefined
                            },
                            {
                                text: "F",
                                level: 1,
                                isSequential: undefined
                            },
                            {
                                text: "D",
                                level: 0,
                                isSequential: undefined
                            }
                        ]
                    }
                ]);
            });
        });

        context("*** Before Every Branch hook", () => {
            it("branchifies the *** Before Every Branch hook", () => {
                let tree = new Tree();
                tree.parseIn(`
A -
    B -

    C -
        *** Before Every Branch {
            D
        }

E -
                `);

                let branches = tree.branchify(tree.root);

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
                            { text: "Before Every Branch", level: 0, codeBlock: "\n            D\n" }
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

            it("branchifies an empty *** Before Every Branch hook", () => {
                let tree = new Tree();
                tree.parseIn(`
A -
    *** Before Every Branch {
    }
                `);

                let branches = tree.branchify(tree.root);

                expect(branches).to.have.lengthOf(1);
                expect(branches[0].steps).to.have.lengthOf(1);
                expect(branches[0].beforeEveryBranch).to.have.lengthOf(1);

                expect(branches).to.containSubsetInOrder([
                    {
                        steps: [ { text: "A" } ],
                        beforeEveryBranch: [
                            { text: "Before Every Branch", level: 0, codeBlock: "\n" }
                        ],
                    }
                ]);
            });

            it("branchifies the *** Before Every Branch hook under the root", () => {
                let tree = new Tree();
                tree.parseIn(`
A -

*** Before Every Branch {
    B
}

C -
                `);

                let branches = tree.branchify(tree.root);

                expect(branches).to.have.lengthOf(2);

                expect(branches[0].steps).to.have.lengthOf(1);
                expect(branches[1].steps).to.have.lengthOf(1);

                expect(branches[0].beforeEveryBranch).to.have.lengthOf(1);
                expect(branches[1].beforeEveryBranch).to.have.lengthOf(1);

                expect(branches).to.containSubsetInOrder([
                    {
                        steps: [ { text: "A" } ],
                        beforeEveryBranch: [
                            { text: "Before Every Branch", level: 0, codeBlock: "\n    B\n" }
                        ]
                    },
                    {
                        steps: [ { text: "C" } ],
                        beforeEveryBranch: [
                            { text: "Before Every Branch", level: 0, codeBlock: "\n    B\n" }
                        ]
                    }
                ]);
            });

            it("branchifies the *** Before Every Branch hook when it's inside a function declaration", () => {
                let tree = new Tree();
                tree.parseIn(`
F

* F
    A -
    B -

    *** Before Every Branch {
        C
    }
                `);

                let branches = tree.branchify(tree.root);

                expect(branches).to.have.lengthOf(2);

                expect(branches[0].steps).to.have.lengthOf(2);
                expect(branches[1].steps).to.have.lengthOf(2);

                expect(branches[0].beforeEveryBranch).to.have.lengthOf(1);
                expect(branches[1].beforeEveryBranch).to.have.lengthOf(1);

                expect(branches).to.containSubsetInOrder([
                    {
                        steps: [ { text: "F" }, { text: "A" } ],
                        beforeEveryBranch: [
                            { text: "Before Every Branch", level: 0, codeBlock: "\n        C\n" }
                        ]
                    },
                    {
                        steps: [ { text: "F" }, { text: "B" } ],
                        beforeEveryBranch: [
                            { text: "Before Every Branch", level: 0, codeBlock: "\n        C\n" }
                        ]
                    }
                ]);
            });

            it("branchifies the *** Before Every Branch hook under a step block", () => {
                let tree = new Tree();
                tree.parseIn(`
A -
    B -
    C -

        *** Before Every Branch {
            D
        }

G -
                `);

                let branches = tree.branchify(tree.root);

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

            it("branchifies the *** Before Every Branch hook under a .. step", () => {
                let tree = new Tree();
                tree.parseIn(`
A - ..

    B -

    C -
        *** Before Every Branch {
            D
        }

G -
                `);

                let branches = tree.branchify(tree.root);

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

            it("branchifies the *** Before Every Branch hook under a .. step block", () => {
                let tree = new Tree();
                tree.parseIn(`
A -
    ..
    B -
    C -

        *** Before Every Branch {
            D
        }

G -
                `);

                let branches = tree.branchify(tree.root);

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

            it("rejects a *** Before Every Branch hook that has children", () => {
                let tree = new Tree();
                tree.parseIn(`
A -
    *** Before Every Branch {
        B
    }

        C -

G -
                `, "file.txt");

                assert.throws(() => {
                    tree.branchify(tree.root);
                }, "A hook cannot have children [file.txt:3]");
            });
        });

        context("*** After Every Branch hook", () => {
            it("branchifies the *** After Every Branch hook", () => {
                let tree = new Tree();
                tree.parseIn(`
A -
    B -

    C -
        *** After Every Branch {
            D
        }

E -
                `);

                let branches = tree.branchify(tree.root);

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
                            { text: "After Every Branch", level: 0, codeBlock: "\n            D\n" }
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

            it("branchifies an empty *** After Every Branch hook", () => {
                let tree = new Tree();
                tree.parseIn(`
A -
    *** After Every Branch {
    }
                `);

                let branches = tree.branchify(tree.root);

                expect(branches).to.have.lengthOf(1);
                expect(branches[0].steps).to.have.lengthOf(1);
                expect(branches[0].afterEveryBranch).to.have.lengthOf(1);

                expect(branches).to.containSubsetInOrder([
                    {
                        steps: [ { text: "A" } ],
                        afterEveryBranch: [
                            { text: "After Every Branch", level: 0, codeBlock: "\n" }
                        ],
                    }
                ]);
            });

            it("branchifies the *** After Every Branch hook under the root", () => {
                let tree = new Tree();
                tree.parseIn(`
A -

***  After  Every branch {
    B
}

C -
                `);

                let branches = tree.branchify(tree.root);

                expect(branches).to.have.lengthOf(2);

                expect(branches[0].steps).to.have.lengthOf(1);
                expect(branches[1].steps).to.have.lengthOf(1);

                expect(branches[0].afterEveryBranch).to.have.lengthOf(1);
                expect(branches[1].afterEveryBranch).to.have.lengthOf(1);

                expect(branches).to.containSubsetInOrder([
                    {
                        steps: [ { text: "A" } ],
                        afterEveryBranch: [
                            { text: "After  Every branch", level: 0, codeBlock: "\n    B\n" }
                        ]
                    },
                    {
                        steps: [ { text: "C" } ],
                        afterEveryBranch: [
                            { text: "After  Every branch", level: 0, codeBlock: "\n    B\n" }
                        ]
                    }
                ]);
            });

            it("branchifies the *** After Every Branch hook when it's inside a function declaration", () => {
                let tree = new Tree();
                tree.parseIn(`
F

* F
    A -
    B -

    *** After Every Branch {
        C
    }
                `);

                let branches = tree.branchify(tree.root);

                expect(branches).to.have.lengthOf(2);

                expect(branches[0].steps).to.have.lengthOf(2);
                expect(branches[1].steps).to.have.lengthOf(2);

                expect(branches[0].afterEveryBranch).to.have.lengthOf(1);
                expect(branches[1].afterEveryBranch).to.have.lengthOf(1);

                expect(branches).to.containSubsetInOrder([
                    {
                        steps: [ { text: "F" }, { text: "A" } ],
                        afterEveryBranch: [
                            { text: "After Every Branch", level: 0, codeBlock: "\n        C\n" }
                        ]
                    },
                    {
                        steps: [ { text: "F" }, { text: "B" } ],
                        afterEveryBranch: [
                            { text: "After Every Branch", level: 0, codeBlock: "\n        C\n" }
                        ]
                    }
                ]);
            });

            it("branchifies the *** After Every Branch hook when it's inside an empty function declaration", () => {
                let tree = new Tree();
                tree.parseIn(`
F

* F
    *** After Every Branch {
        C
    }
                `);

                let branches = tree.branchify(tree.root);

                expect(branches).to.have.lengthOf(1);
                expect(branches[0].steps).to.have.lengthOf(1);
                expect(branches[0].afterEveryBranch).to.have.lengthOf(1);

                expect(branches).to.containSubsetInOrder([
                    {
                        steps: [ { text: "F" } ],
                        afterEveryBranch: [
                            { text: "After Every Branch", level: 0, codeBlock: "\n        C\n" }
                        ]
                    }
                ]);
            });

            it("branchifies the *** After Every Branch hook under a step block", () => {
                let tree = new Tree();
                tree.parseIn(`
A -
    B -
    C -

        *** After Every Branch {
            D
        }

G -
                `);

                let branches = tree.branchify(tree.root);

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

            it("branchifies the *** After Every Branch hook under a .. step", () => {
                let tree = new Tree();
                tree.parseIn(`
A - ..

    B -

    C -
        *** After Every Branch {
            D
        }

G -
                `);

                let branches = tree.branchify(tree.root);

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

            it("branchifies the *** After Every Branch hook under a .. step block", () => {
                let tree = new Tree();
                tree.parseIn(`
A -
    ..
    B -
    C -

        *** After Every Branch {
            D
        }

G -
                `);

                let branches = tree.branchify(tree.root);

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

            it("rejects a *** After Every Branch hook that has children", () => {
                let tree = new Tree();
                tree.parseIn(`
A -
    *** After Every Branch {
        B
    }

        C -

G -
                `, "file.txt");

                assert.throws(() => {
                    tree.branchify(tree.root);
                }, "A hook cannot have children [file.txt:3]");
            });

            it("handles multiple *** Before Every Branch and *** After Every Branch hooks that are siblings", () => {
                let tree = new Tree();
                tree.parseIn(`
A -
    B -

    C -
        *** Before Every Branch {
            D1
        }

        *** After Every Branch {
            G1
        }

        *** Before Every Branch {
            D2
        }

        *** Before Every Branch {
            D3
        }

        *** After Every Branch {
            G2
        }

        *** After Every Branch {
            G3
        }

E -
                `);

                let branches = tree.branchify(tree.root);

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

            it("branchifies many *** Before Every Branch and *** After Every Branch hooks in the tree", () => {
                let tree = new Tree();
                tree.parseIn(`
A -
    B -
        C -
        D -

            E -

                *** After Every Branch {
                    U
                }

            *** After Every Branch {
                T
            }

        F -

    H -
    I -

        *** After Every Branch {
            S
        }

    ..
    J -
    K -

        *** After Every Branch {
            R
        }

        *** Before Every Branch {
            X
        }

    L - ..
        M -
            N -

        *** After Every Branch {
            Q
        }

        *** Before Every Branch {
            Y
        }

        O -

    *** After Every Branch {
        W
    }
G -
    P -
                `);
                let branches = tree.branchify(tree.root);

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
        });

        context("*** Before Every Step hook", () => {
            it("branchifies the *** Before Every Step hook", () => {
                let tree = new Tree();
                tree.parseIn(`
A -
    B -

    C -
        *** Before Every Step {
            D
        }

E -
                `);

                let branches = tree.branchify(tree.root);

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
                            { text: "Before Every Step", level: 0, codeBlock: "\n            D\n" }
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

            it("branchifies an empty *** Before Every Step hook", () => {
                let tree = new Tree();
                tree.parseIn(`
A -
    *** Before Every Step {
    }
                `);

                let branches = tree.branchify(tree.root);

                expect(branches).to.have.lengthOf(1);
                expect(branches[0].steps).to.have.lengthOf(1);
                expect(branches[0].beforeEveryStep).to.have.lengthOf(1);

                expect(branches).to.containSubsetInOrder([
                    {
                        steps: [ { text: "A" } ],
                        beforeEveryStep: [
                            { text: "Before Every Step", level: 0, codeBlock: "\n" }
                        ],
                    }
                ]);
            });

            it("branchifies the *** Before Every Step hook under the root", () => {
                let tree = new Tree();
                tree.parseIn(`
A -

*** Before Every Step {
    B
}

C -
                `);

                let branches = tree.branchify(tree.root);

                expect(branches).to.have.lengthOf(2);

                expect(branches[0].steps).to.have.lengthOf(1);
                expect(branches[1].steps).to.have.lengthOf(1);

                expect(branches[0].beforeEveryStep).to.have.lengthOf(1);
                expect(branches[1].beforeEveryStep).to.have.lengthOf(1);

                expect(branches).to.containSubsetInOrder([
                    {
                        steps: [ { text: "A" } ],
                        beforeEveryStep: [
                            { text: "Before Every Step", level: 0, codeBlock: "\n    B\n" }
                        ]
                    },
                    {
                        steps: [ { text: "C" } ],
                        beforeEveryStep: [
                            { text: "Before Every Step", level: 0, codeBlock: "\n    B\n" }
                        ]
                    }
                ]);
            });

            it("branchifies the *** Before Every Step hook when it's inside a function declaration", () => {
                let tree = new Tree();
                tree.parseIn(`
F

* F
    A -
    B -

    *** Before Every Step {
        C
    }
                `);

                let branches = tree.branchify(tree.root);

                expect(branches).to.have.lengthOf(2);

                expect(branches[0].steps).to.have.lengthOf(2);
                expect(branches[1].steps).to.have.lengthOf(2);

                expect(branches[0].beforeEveryStep).to.have.lengthOf(1);
                expect(branches[1].beforeEveryStep).to.have.lengthOf(1);

                expect(branches).to.containSubsetInOrder([
                    {
                        steps: [ { text: "F" }, { text: "A" } ],
                        beforeEveryStep: [
                            { text: "Before Every Step", level: 0, codeBlock: "\n        C\n" }
                        ]
                    },
                    {
                        steps: [ { text: "F" }, { text: "B" } ],
                        beforeEveryStep: [
                            { text: "Before Every Step", level: 0, codeBlock: "\n        C\n" }
                        ]
                    }
                ]);
            });

            it("branchifies the *** Before Every Step hook under a step block", () => {
                let tree = new Tree();
                tree.parseIn(`
A -
    B -
    C -

        *** Before Every Step {
            D
        }

G -
                `);

                let branches = tree.branchify(tree.root);

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

            it("branchifies the *** Before Every Step hook under a .. step", () => {
                let tree = new Tree();
                tree.parseIn(`
A - ..

    B -

    C -
        *** Before Every Step {
            D
        }

G -
                `);

                let branches = tree.branchify(tree.root);

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

            it("branchifies the *** Before Every Step hook under a .. step block", () => {
                let tree = new Tree();
                tree.parseIn(`
A -
    ..
    B -
    C -

        *** Before Every Step {
            D
        }

G -
                `);

                let branches = tree.branchify(tree.root);

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

            it("rejects a *** Before Every Step hook that has children", () => {
                let tree = new Tree();
                tree.parseIn(`
A -
    *** Before Every Step {
        B
    }

        C -

G -
                `, "file.txt");

                assert.throws(() => {
                    tree.branchify(tree.root);
                }, "A hook cannot have children [file.txt:3]");
            });
        });

        context("*** After Every Step hook", () => {
            it("branchifies the *** After Every Step hook", () => {
                let tree = new Tree();
                tree.parseIn(`
A -
    B -

    C -
        *** After Every Step {
            D
        }

E -
                `);

                let branches = tree.branchify(tree.root);

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
                            { text: "After Every Step", level: 0, codeBlock: "\n            D\n" }
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

            it("branchifies an empty *** After Every Step hook", () => {
                let tree = new Tree();
                tree.parseIn(`
A -
    *** After Every Step {
    }
                `);

                let branches = tree.branchify(tree.root);

                expect(branches).to.have.lengthOf(1);
                expect(branches[0].steps).to.have.lengthOf(1);
                expect(branches[0].afterEveryStep).to.have.lengthOf(1);

                expect(branches).to.containSubsetInOrder([
                    {
                        steps: [ { text: "A" } ],
                        afterEveryStep: [
                            { text: "After Every Step", level: 0, codeBlock: "\n" }
                        ],
                    }
                ]);
            });

            it("branchifies the *** After Every Step hook under the root", () => {
                let tree = new Tree();
                tree.parseIn(`
A -

*** After Every Step {
    B
}

C -
                `);

                let branches = tree.branchify(tree.root);

                expect(branches).to.have.lengthOf(2);

                expect(branches[0].steps).to.have.lengthOf(1);
                expect(branches[1].steps).to.have.lengthOf(1);

                expect(branches[0].afterEveryStep).to.have.lengthOf(1);
                expect(branches[1].afterEveryStep).to.have.lengthOf(1);

                expect(branches).to.containSubsetInOrder([
                    {
                        steps: [ { text: "A" } ],
                        afterEveryStep: [
                            { text: "After Every Step", level: 0, codeBlock: "\n    B\n" }
                        ]
                    },
                    {
                        steps: [ { text: "C" } ],
                        afterEveryStep: [
                            { text: "After Every Step", level: 0, codeBlock: "\n    B\n" }
                        ]
                    }
                ]);
            });

            it("branchifies the *** After Every Step hook when it's inside a function declaration", () => {
                let tree = new Tree();
                tree.parseIn(`
F

* F
    A -
    B -

    *** After Every Step {
        C
    }
                `);

                let branches = tree.branchify(tree.root);

                expect(branches).to.have.lengthOf(2);

                expect(branches[0].steps).to.have.lengthOf(2);
                expect(branches[1].steps).to.have.lengthOf(2);

                expect(branches[0].afterEveryStep).to.have.lengthOf(1);
                expect(branches[1].afterEveryStep).to.have.lengthOf(1);

                expect(branches).to.containSubsetInOrder([
                    {
                        steps: [ { text: "F" }, { text: "A" } ],
                        afterEveryStep: [
                            { text: "After Every Step", level: 0, codeBlock: "\n        C\n" }
                        ]
                    },
                    {
                        steps: [ { text: "F" }, { text: "B" } ],
                        afterEveryStep: [
                            { text: "After Every Step", level: 0, codeBlock: "\n        C\n" }
                        ]
                    }
                ]);
            });

            it("branchifies the *** After Every Step hook under a step block", () => {
                let tree = new Tree();
                tree.parseIn(`
A -
    B -
    C -

        *** After Every Step {
            D
        }

G -
                `);

                let branches = tree.branchify(tree.root);

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

            it("branchifies the *** After Every Step hook under a .. step", () => {
                let tree = new Tree();
                tree.parseIn(`
A - ..

    B -

    C -
        *** After Every Step {
            D
        }

G -
                `);

                let branches = tree.branchify(tree.root);

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

            it("branchifies the *** After Every Step hook under a .. step block", () => {
                let tree = new Tree();
                tree.parseIn(`
A -
    ..
    B -
    C -

        *** After Every Step {
            D
        }

G -
                `);

                let branches = tree.branchify(tree.root);

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

            it("rejects a *** After Every Step hook that has children", () => {
                let tree = new Tree();
                tree.parseIn(`
A -
    *** After Every Step {
        B
    }

        C -

G -
                `, "file.txt");

                assert.throws(() => {
                    tree.branchify(tree.root);
                }, "A hook cannot have children [file.txt:3]");
            });

            it("handles multiple *** Before Every Step and *** After Every Step hooks that are siblings", () => {
                let tree = new Tree();
                tree.parseIn(`
A -
    B -

    C -
        *** Before Every Step {
            D1
        }

        *** After Every Step {
            G1
        }

        *** Before Every Step {
            D2
        }

        *** Before Every Step {
            D3
        }

        *** After Every Step {
            G2
        }

        *** After Every Step {
            G3
        }

E -
                `);

                let branches = tree.branchify(tree.root);

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

            it("branchifies many *** Before Every Step and *** After Every Step hooks in the tree", () => {
                let tree = new Tree();
                tree.parseIn(`
A -
    B -
        C -
        D -

            E -

                *** After Every Step {
                    U
                }

            *** After Every Step {
                T
            }

        F -

    H -
    I -

        *** After Every Step {
            S
        }

    ..
    J -
    K -

        *** After Every Step {
            R
        }

        *** Before Every Step {
            X
        }

    L - ..
        M -
            N -

        *** After Every Step {
            Q
        }

        *** Before Every Step {
            Y
        }

        O -

    *** After Every Step {
        W
    }
G -
    P -
                `);
                let branches = tree.branchify(tree.root);

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
        });

        context("*** Before Everything hook", () => {
            it("branchifies the *** Before Everything hook", () => {
                let tree = new Tree();
                tree.parseIn(`
A -

*** Before Everything {
    B
}
                `);

                let branches = tree.branchify(tree.root);

                expect(branches).to.have.lengthOf(1);
                expect(branches[0].steps).to.have.lengthOf(1);
                expect(tree.beforeEverything).to.have.lengthOf(1);

                expect(branches).to.containSubsetInOrder([
                    {
                        steps: [ { text: "A" } ]
                    }
                ]);

                expect(tree.beforeEverything).to.containSubsetInOrder([
                    { text: "Before Everything", level: 0, codeBlock: "\n    B\n" }
                ]);
            });

            it("branchifies an empty *** Before Everything hook", () => {
                let tree = new Tree();
                tree.parseIn(`
*** Before Everything {
}
                `);

                let branches = tree.branchify(tree.root);

                expect(branches).to.have.lengthOf(0);

                expect(tree.beforeEverything).to.containSubsetInOrder([
                    { text: "Before Everything", level: 0, codeBlock: "\n" }
                ]);
            });

            it("handles multiple *** Before Everything hooks that are siblings, and orders the last in tree to be first in tree.beforeEverything", () => {
                let tree = new Tree();
                tree.parseIn(`
*** Before Everything {
    B
}

*** Before Everything {
    C
}

A -
                `);

                let branches = tree.branchify(tree.root);

                expect(branches).to.have.lengthOf(1);

                expect(branches[0].steps).to.have.lengthOf(1);

                expect(tree.beforeEverything).to.have.lengthOf(2);

                expect(branches).to.containSubsetInOrder([
                    {
                        steps: [ { text: "A" } ]
                    }
                ]);

                expect(tree.beforeEverything).to.containSubsetInOrder([
                    { text: "Before Everything", level: 0, codeBlock: "\n    C\n" },
                    { text: "Before Everything", level: 0, codeBlock: "\n    B\n" }
                ]);
            });

            it("rejects the *** Before Everything hook when not at 0 indents", () => {
                let tree = new Tree();
                tree.parseIn(`
A -
    *** Before Everything {
        B
    }
                `, "file.txt");

                assert.throws(() => {
                    tree.branchify(tree.root);
                }, "A Before Everything hook must not be indented (it must be at 0 indents) [file.txt:3]");
            });

            it("rejects a *** Before Everything hook that has children", () => {
                let tree = new Tree();
                tree.parseIn(`
*** Before Everything {
    B
}

    C -
                `, "file.txt");

                assert.throws(() => {
                    tree.branchify(tree.root);
                }, "A hook cannot have children [file.txt:2]");
            });
        });

        context("*** After Everything hook", () => {
            it("branchifies the *** After Everything hook", () => {
                let tree = new Tree();
                tree.parseIn(`
A -

*** After Everything {
    B
}
                `);

                let branches = tree.branchify(tree.root);

                expect(branches).to.have.lengthOf(1);
                expect(branches[0].steps).to.have.lengthOf(1);
                expect(tree.afterEverything).to.have.lengthOf(1);

                expect(branches).to.containSubsetInOrder([
                    {
                        steps: [ { text: "A" } ]
                    }
                ]);

                expect(tree.afterEverything).to.containSubsetInOrder([
                    { text: "After Everything", level: 0, codeBlock: "\n    B\n" }
                ]);
            });

            it("branchifies an empty *** After Everything hook", () => {
                let tree = new Tree();
                tree.parseIn(`
*** After Everything {
}
                `);

                let branches = tree.branchify(tree.root);

                expect(branches).to.have.lengthOf(0);

                expect(tree.afterEverything).to.containSubsetInOrder([
                    { text: "After Everything", level: 0, codeBlock: "\n" }
                ]);
            });

            it("handles multiple *** After Everything hooks that are siblings, and orders the last in tree to be last in tree.afterEverything", () => {
                let tree = new Tree();
                tree.parseIn(`
*** After Everything {
    B
}

*** After Everything {
    C
}

A -
                `);

                let branches = tree.branchify(tree.root);

                expect(branches).to.have.lengthOf(1);
                expect(branches[0].steps).to.have.lengthOf(1);
                expect(tree.afterEverything).to.have.lengthOf(2);

                expect(branches).to.containSubsetInOrder([
                    {
                        steps: [ { text: "A" } ]
                    }
                ]);

                expect(tree.afterEverything).to.containSubsetInOrder([
                    { text: "After Everything", level: 0, codeBlock: "\n    B\n" },
                    { text: "After Everything", level: 0, codeBlock: "\n    C\n" }
                ]);
            });

            it("rejects the *** After Everything hook when not at 0 indents", () => {
                let tree = new Tree();
                tree.parseIn(`
A -
    *** After Everything {
        B
    }
                `, "file.txt");

                assert.throws(() => {
                    tree.branchify(tree.root);
                }, "An After Everything hook must not be indented (it must be at 0 indents) [file.txt:3]");
            });

            it("rejects a *** After Everything hook that has children", () => {
                let tree = new Tree();
                tree.parseIn(`
*** After Everything {
    B
}

    C -
                `, "file.txt");

                assert.throws(() => {
                    tree.branchify(tree.root);
                }, "A hook cannot have children [file.txt:2]");
            });
        });
    });

    describe("removeUnwantedBranches()", () => {
        context("$", () => {
            it("only keeps a branches under a $", () => {
                let tree = new Tree();
                tree.parseIn(`
A -
    B -

    $ C -

        D -

        E -

G -
                `);

                let branches = tree.branchify(tree.root);

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

            it("only keeps branches that intersect under multiple $'s", () => {
                let tree = new Tree();
                tree.parseIn(`
A -
    B -

    $ C -

        D -

        $ E -

            $ F -

G -
                `);

                let branches = tree.branchify(tree.root);

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

            it("keeps multiple branches that are under non-intersecting $'s", () => {
                let tree = new Tree();
                tree.parseIn(`
A -
    B -

    $ C -

        D -

        $ E -

            F -

    $ G -

    $ H -
        $ I -

J -
                `);

                let branches = tree.branchify(tree.root);

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

            it("handles $ when it's attached to a step block member", () => {
                let tree = new Tree();
                tree.parseIn(`
$ A -
    B -
    $ C -

        D -
        $ E -

            F -

    $ G -
    $ H -

        $ I -

    P -
    Q -
    $ J -
    $ K -
    R -

        L -

$ M -

    N -
    O -
                `);

                let branches = tree.branchify(tree.root);

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

            it("handles $ when it's inside a function declaration", () => {
                let tree = new Tree();
                tree.parseIn(`
F
F

* F
    $ A -
        B -

    C -
                `);

                let branches = tree.branchify(tree.root);

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

            it("handles multiple $'s inside and outside a function declaration", () => {
                let tree = new Tree();
                tree.parseIn(`
J -
    F

$ K -
    F

* F
    $ A -
        B -

    C -
                `);

                let branches = tree.branchify(tree.root);

                expect(branches).to.have.lengthOf(1);

                expect(branches[0].steps).to.have.lengthOf(4);

                expect(branches).to.containSubsetInOrder([
                    {
                        steps: [ { text: "K" }, { text: "F" }, { text: "A" }, { text: "B" } ],
                        isOnly: true,
                        isDebug: undefined
                    }
                ]);
            });

            it("handles multiple $'s inside a function declaration and on a function call", () => {
                let tree = new Tree();
                tree.parseIn(`
J -
    F

K -
    $ F

* F
    $ A -
        B -

    C -
                `);

                let branches = tree.branchify(tree.root);

                expect(branches).to.have.lengthOf(1);

                expect(branches[0].steps).to.have.lengthOf(4);

                expect(branches).to.containSubsetInOrder([
                    {
                        steps: [ { text: "K" }, { text: "F" }, { text: "A" }, { text: "B" } ],
                        isOnly: true,
                        isDebug: undefined
                    }
                ]);
            });

            it("handles multiple $'s on a function declaration and on a function call", () => {
                let tree = new Tree();
                tree.parseIn(`
J -
    F

K -
    $ F

$ * F
    A -
        B -
                `);

                let branches = tree.branchify(tree.root);

                expect(branches).to.have.lengthOf(1);

                expect(branches[0].steps).to.have.lengthOf(4);

                expect(branches).to.containSubsetInOrder([
                    {
                        steps: [ { text: "K" }, { text: "F" }, { text: "A" }, { text: "B" } ],
                        isOnly: true,
                        isDebug: undefined
                    }
                ]);
            });

            it("handles multiple $'s on a function declaration and above the function call", () => {
                let tree = new Tree();
                tree.parseIn(`
J -
    F

$ K -
    F

$ * F
    A -
        B -
                `);

                let branches = tree.branchify(tree.root);

                expect(branches).to.have.lengthOf(1);

                expect(branches[0].steps).to.have.lengthOf(4);

                expect(branches).to.containSubsetInOrder([
                    {
                        steps: [ { text: "K" }, { text: "F" }, { text: "A" }, { text: "B" } ],
                        isOnly: true,
                        isDebug: undefined
                    }
                ]);
            });

            it("handles multiple $'s inside a function declaration and below the function call", () => {
                let tree = new Tree();
                tree.parseIn(`
J -
    F

K -
    $ F
        $ W -

* F
    A -
        B -
            $ D -

    C -
                `);

                let branches = tree.branchify(tree.root);

                expect(branches).to.have.lengthOf(1);

                expect(branches[0].steps).to.have.lengthOf(6);

                expect(branches).to.containSubsetInOrder([
                    {
                        steps: [ { text: "K" }, { text: "F" }, { text: "A" }, { text: "B" }, { text: "D" }, { text: "W" } ],
                        isOnly: true,
                        isDebug: undefined
                    }
                ]);
            });

            it("handles $ when it's inside a .. step", () => {
                let tree = new Tree();
                tree.parseIn(`
$ A .. -
    B -
        C -
    $ D -
        E -
    F -

$ G .. -
    H -
    I -
                `);

                let branches = tree.branchify(tree.root);

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

            it("handles $ when it's attached to a .. step block member", () => {
                let tree = new Tree();
                tree.parseIn(`
..
A -
$ B -
C -

    D -
    E -
                `);

                let branches = tree.branchify(tree.root);

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
        });

        context("~", () => {
            it("isolates a branch with a single ~ before the step", () => {
                let tree = new Tree();
                tree.parseIn(`
A -
    ~ B -
        C -
    D -
    E -

F -
                `);

                let branches = tree.branchify(tree.root);

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

            it("isolates a branch with a single ~ after the step", () => {
                let tree = new Tree();
                tree.parseIn(`
A -
    B - ~
        C -
    D -
    E -

F -
                `);

                let branches = tree.branchify(tree.root);

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

            it("isolates a branch with ~ on multiple steps", () => {
                let tree = new Tree();
                tree.parseIn(`
A -
    ~ B -

        E -
            F -

        ~ G -
            H -

        I -

J -
                `);

                let branches = tree.branchify(tree.root);

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

            it("isolates a branch with ~ on multiple steps, before and after the step", () => {
                let tree = new Tree();
                tree.parseIn(`
A -
    ~ B -

        E -
            F -

        G - ~
            H -

        I -

J -
                `);

                let branches = tree.branchify(tree.root);

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

            it("isolates a branch with ~ on multiple steps, where one of the ~'s is inside a function declaration", () => {
                let tree = new Tree();
                tree.parseIn(`
A -
    F
B -
    ~ F

* F
    ~ K -
                `, "file.txt");

                let branches = tree.branchify(tree.root);

                expect(branches).to.have.lengthOf(1);
                expect(branches[0].steps).to.have.lengthOf(3);

                expect(branches).to.containSubsetInOrder([
                    {
                        steps: [ { text: "B" }, { text: "F" }, { text: "K" } ],
                        isOnly: undefined,
                        isDebug: true
                    }
                ]);
            });

            it("isolates a branch with ~ on multiple steps, where one of the ~'s is on a function declaration", () => {
                let tree = new Tree();
                tree.parseIn(`
A -
    F
~ B -
    F

~ * F
    K -
                `, "file.txt");

                let branches = tree.branchify(tree.root);

                expect(branches).to.have.lengthOf(1);
                expect(branches[0].steps).to.have.lengthOf(3);

                expect(branches).to.containSubsetInOrder([
                    {
                        steps: [ { text: "B" }, { text: "F" }, { text: "K" } ],
                        isOnly: undefined,
                        isDebug: true
                    }
                ]);
            });

            it("isolates a branch with ~ on multiple steps, where one of the ~'s is on a function declaration and function call", () => {
                let tree = new Tree();
                tree.parseIn(`
A -
    F
B -
    ~ F

~ * F
    K -
                `, "file.txt");

                let branches = tree.branchify(tree.root);

                expect(branches).to.have.lengthOf(1);
                expect(branches[0].steps).to.have.lengthOf(3);

                expect(branches).to.containSubsetInOrder([
                    {
                        steps: [ { text: "B" }, { text: "F" }, { text: "K" } ],
                        isOnly: undefined,
                        isDebug: true
                    }
                ]);
            });

            it("isolates the first branch when ~ is on multiple branches", () => {
                let tree = new Tree();
                tree.parseIn(`
A -
    ~ B -

        E -
            F -

        ~ G -
            H -

        ~ I -

J -
                `, "file.txt");

                let branches = tree.branchify(tree.root);

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

            it("isolates the first branch when ~ is on a function declaration that's called on multiple branches", () => {
                let tree = new Tree();
                tree.parseIn(`
A -
    F
B -
    F

~ * F
    K -
                `, "file.txt");

                let branches = tree.branchify(tree.root);

                expect(branches).to.have.lengthOf(1);
                expect(branches[0].steps).to.have.lengthOf(3);

                expect(branches).to.containSubsetInOrder([
                    {
                        steps: [ { text: "A" }, { text: "F" }, { text: "K" } ],
                        isOnly: undefined,
                        isDebug: true
                    }
                ]);
            });

            it("isolates the first branch when ~ is inside a function declaration that's called on multiple branches", () => {
                let tree = new Tree();
                tree.parseIn(`
A -
    F
B -
    F

* F
    ~ K -
                `, "file.txt");

                let branches = tree.branchify(tree.root);

                expect(branches).to.have.lengthOf(1);
                expect(branches[0].steps).to.have.lengthOf(3);

                expect(branches).to.containSubsetInOrder([
                    {
                        steps: [ { text: "A" }, { text: "F" }, { text: "K" } ],
                        isOnly: undefined,
                        isDebug: true
                    }
                ]);
            });

            it("isolates the first branch when ~ is on multiple branches via a step block", () => {
                let tree = new Tree();
                tree.parseIn(`
A -
B -
C -

    ~ D -
                `, "file.txt");

                let branches = tree.branchify(tree.root);

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

            it("isolates the first branch when ~ is on multiple branches via multiple function calls", () => {
                let tree = new Tree();
                tree.parseIn(`
* F
    ~ A -

F

B -
    F
                `, "file.txt");

                let branches = tree.branchify(tree.root);

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

            it("isolates the first branch when a ~ step has multiple branches underneath it", () => {
                let tree = new Tree();
                tree.parseIn(`
~ A -
    B -
    C -
    D -
                `, "file.txt");

                let branches = tree.branchify(tree.root);

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
~ A -

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

            it("handles ~ when it's attached to a step block member", () => {
                let tree = new Tree();
                tree.parseIn(`
A -
    B -
    ~ C -
    D -

        E -
            F -

        ~ G -
            H -

        I -

J -
                `);

                let branches = tree.branchify(tree.root);

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

            it("handles ~ when it's inside a function declaration", () => {
                let tree = new Tree();
                tree.parseIn(`
* F
    A -

    ~ B -
        C -
        D -

F
    X -
    Y -
                `);

                let branches = tree.branchify(tree.root);

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

            it("handles using multiple $'s and a ~ to isolate a single branch to debug", () => {
                let tree = new Tree();
                tree.parseIn(`
A -
    $ B -
    C -

        $ ~ D -
            E -

        F -

    G -
        H -

I -
                `);

                let branches = tree.branchify(tree.root);

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
    $ B -
    C -

        $ D -
            ~ E -

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
        });

        context("frequency", () => {
            it("sets the frequency of a branch when the {frequency} variable is set on a leaf", () => {
                let tree = new Tree();
                tree.parseIn(`
A -
    B -
        {frequency}='high'
    C -
D -
                `, "file.txt");

                let branches = tree.branchify(tree.root);

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

            it("sets the frequency of multiple branches when the {frequency} variable is set", () => {
                let tree = new Tree();
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

                let branches = tree.branchify(tree.root);

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

            it("sets the frequency of multiple branches when the {frequency} variable is set on a step block", () => {
                let tree = new Tree();
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

                let branches = tree.branchify(tree.root);

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

            it("sets the frequency of a branch to the deepest {frequency} variable when more than one exist on a branch", () => {
                let tree = new Tree();
                tree.parseIn(`
A -
    {frequency}='high'
        B -
            {frequency}='low'
                C -
                `, "file.txt");

                let branches = tree.branchify(tree.root);

                expect(branches).to.containSubsetInOrder([
                    {
                        steps: [ { text: "A" },  { text: "{frequency}='high'" }, { text: "B" }, { text: "{frequency}='low'" }, { text: "C" } ],
                        frequency: 'low'
                    }
                ]);
            });

            it("keeps all branches when frequency is set to 'low'", () => {
                let tree = new Tree();
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

                let branches = tree.branchify(tree.root, undefined, "low");

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

            it("keeps all branches when frequency is not set", () => {
                let tree = new Tree();
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

                let branches = tree.branchify(tree.root, undefined, undefined);

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

            it("keeps branches at or above 'med' frequency", () => {
                let tree = new Tree();
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

                let branches = tree.branchify(tree.root, undefined, "med");

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

            it("keeps branches at 'high' frequency", () => {
                let tree = new Tree();
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

                let branches = tree.branchify(tree.root, undefined, "high");

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

            it("throws exception if a ~ exists, but is cut off due to a frequency restriction", () => {
                let tree = new Tree();
                tree.parseIn(`
A -
    {frequency}='high'
        B -

    {frequency}='med'
        ~ C -

        D -
            {frequency}='high'
                E -

    {frequency}='low'
        F -
    G -
                `, "file.txt");

                assert.throws(() => {
                    tree.branchify(tree.root, undefined, "high");
                }, "This step contains a ~, but is not above the frequency allowed to run (high). Either set its frequency higher or remove the ~. [file.txt:7]");

                assert.doesNotThrow(() => {
                    tree.branchify(tree.root, undefined, "med");
                });

                assert.doesNotThrow(() => {
                    tree.branchify(tree.root, undefined, "low");
                });

                assert.doesNotThrow(() => {
                    tree.branchify(tree.root, undefined, undefined);
                });
            });
        });

        context("groups", () => {
            it("sets the groups for a branch", () => {
                let tree = new Tree();
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

                let branches = tree.branchify(tree.root);

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

            it("sets multiple groups for a branch", () => {
                let tree = new Tree();
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

                let branches = tree.branchify(tree.root);

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

            it("keeps all branches when no groups are set", () => {
                let tree = new Tree();
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

                let branches = tree.branchify(tree.root, undefined);

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

            it("only keeps branches that are part of a group being run", () => {
                let tree = new Tree();
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

                let branches = tree.branchify(tree.root, ["first"]);

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

            it("only keeps branches that are part of a group being run, and multiple groups are being run", () => {
                let tree = new Tree();
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

                let branches = tree.branchify(tree.root, ["first", "sixth"]);

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

            it("throws exception if a ~ exists, but is cut off due to a groups restriction", () => {
                let tree = new Tree();
                tree.parseIn(`
A -
    {group}='one'
        B -

    {group}='two'
        ~ C -

        D -
            {group}='three'
                E -

    {group}='four'
        F -
    G -
                `, "file.txt");

                assert.throws(() => {
                    tree.branchify(tree.root, ["one"]);
                }, "This step contains a ~, but is not inside one of the groups being run. Either add it to the groups being run or remove the ~. [file.txt:7]");

                assert.throws(() => {
                    tree.branchify(tree.root, ["one", "three", "four"]);
                }, "This step contains a ~, but is not inside one of the groups being run. Either add it to the groups being run or remove the ~. [file.txt:7]");

                assert.doesNotThrow(() => {
                    tree.branchify(tree.root, ["two"]);
                });
            });
        });

        context("multiple restrictions", () => {
            it("handles multiple restrictions", () => {
                // Try them all here, all on one big tree (group, frequency, $, ~)
                let tree = new Tree();
                tree.parseIn(`
A -
    $ B -
        {group}='first', {frequency}='low'
            {group}='second'

    $ {group}='third'
        D -
            {group}='fourth', {group}='first'

        E -
        $ ~ F -

            {group}='sixth'
                ~ K -
                    {frequency}='high'

        {group}='sixth'
            L -
G -
                `, "file.txt");

                let branches = tree.branchify(tree.root, ["first", "sixth"], "med");

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
        });
    });

    describe("generateBranches()", () => {
        it("sorts branches by {frequency}", () => {
            let tree = new Tree();
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

        it("marks as skipped branches that start with -M or -T", () => {
            let tree = new Tree();
            tree.parseIn(`
A -
B -M
C -T
D -
`, "file.txt");

            tree.generateBranches();

            expect(tree.branches).to.containSubsetInOrder([
                {
                    steps: [ { text: "A" } ],
                    isSkipped: undefined
                },
                {
                    steps: [ { text: "B" } ],
                    isSkipped: true
                },
                {
                    steps: [ { text: "C" } ],
                    isSkipped: true
                },
                {
                    steps: [ { text: "D" } ],
                    isSkipped: undefined
                }
            ]);
        });

        it("handles an error from branchify()", () => {
            let tree = new Tree();
            tree.parseIn(`
A -
    *** Before Everything {
    }
    `, "file.txt");

            assert.throws(() => {
                tree.generateBranches();
            }, "A Before Everything hook must not be indented (it must be at 0 indents) [file.txt:3]");
        });

        it("throws an exception when there's an infinite loop among function calls", function() { // function() needed for this.timeout() to work
            this.timeout(10000);

            let tree = new Tree();
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

        it("can isolate a branch by hash", () => {
            let tree = new Tree();
            tree.parseIn(`
A -
    B - $
        C - ~

D -
    E -
        F -

H -
    I -
`, "file.txt");

            tree.generateBranches(undefined, undefined, undefined, "30cb5a00b9b3401c1a038b06e19f1d21");

            expect(tree.branches).to.have.lengthOf(1);
            expect(tree.branches[0].steps).to.have.lengthOf(3);
            expect(tree.branches).to.containSubsetInOrder([
                {
                    steps: [ { text: "D" }, { text: "E" }, { text: "F", isDebug: true, isAfterDebug: true }  ]
                }
            ]);
        });

        it("throws an exception when it can't find a branch with a given hash", () => {
            let tree = new Tree();
            tree.parseIn(`
A -
    B - $
        C - ~

D -
    E -
        F -
`, "file.txt");

            assert.throws(() => {
                tree.generateBranches(undefined, undefined, undefined, "INVALID-HASH");
            }, "Couldn't find the branch with the given hash");
        });

        // NOTE: this just freezes up the executable
        // Unlike the infinite loop which causes an immediate stack size exception, this probably blows out memory before stack size (and there is no exception thrown)
        // This many branches are unlikely in normal usage, though
        /*
        it.skip("throws an exception when there are too many branches", () => {
            let tree = new Tree();
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

    describe("serialize()", () => {
        it("outputs json for an empty tree", () => {
            let tree = new Tree();

            tree.generateBranches();
            tree.isDebug = true;
            tree.elapsed = "DATE";
            let obj = tree.serialize();

            expect(obj).to.containSubsetInOrder({
                branches: [],
                beforeEverything: [],
                afterEverything: [],
                isDebug: true,
                elapsed: "DATE"
            });
        });

        it("outputs json for all branches", () => {
            let tree = new Tree();
            tree.parseIn(`
A -
    B -
    C -
`);

            tree.generateBranches();
            tree.isDebug = true;
            tree.elapsed = "DATE";
            tree.branches[0].passedLastTime = true;
            let obj = tree.serialize();

            expect(obj).to.containSubsetInOrder({
                branches: [
                    {
                        steps: [ { text: "A" }, { text: "B" } ],
                        isPassed: true
                    },
                    {
                        steps: [ { text: "A" }, { text: "C" } ]
                    }
                ],
                beforeEverything: [],
                afterEverything: [],
                isDebug: true,
                elapsed: "DATE"
            });
        });

        it("outputs json for all branches and hooks", () => {
            let tree = new Tree();
            tree.parseIn(`
A -
    B -
        *** After Every Branch {
            D
        }

        *** After Every Step {
            F
        }

        *** Before Every Branch {
            J
        }

        *** Before Every Step {
            K
        }

    C -

*** Before Everything {
    G
}

*** Before Everything {
    H
}

*** After Everything {
    I
}
`);

            tree.generateBranches();
            let obj = tree.serialize();

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

    describe("mergeBranchesFromPrevRun()", () => {
        it("merges empty previous branches into empty current branches", () => {
            let prevTree = new Tree();
            let currTree = new Tree();

            currTree.generateBranches();
            prevTree.generateBranches();
            let prevObj = prevTree.serialize();
            let prevJson = JSON.stringify(prevObj);

            currTree.mergeBranchesFromPrevRun(prevJson);

            expect(currTree.branches).to.have.lengthOf(0);
            expect(currTree.branches).to.containSubsetInOrder([]);
        });

        it("handles a merge", () => {
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

             let currTree = new Tree();

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

             let prevTree = new Tree();

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

             let prevObj = prevTree.serialize();
             let prevJson = JSON.stringify(prevObj);
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

    describe("getBranchCount()", () => {
        it("returns total number of branches", () => {
            let tree = new Tree();
            tree.parseIn(`
$ A -
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

        it("returns total number of runnable branches", () => {
            let tree = new Tree();
            tree.parseIn(`
$ A -
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

        it("returns total number of complete branches", () => {
            let tree = new Tree();
            tree.parseIn(`
$ A -
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

        it("returns total number of passed branches", () => {
            let tree = new Tree();
            tree.parseIn(`
A -
B -
C -
D -
E -
`, "file.txt");

            tree.generateBranches();

            tree.branches[0].isPassed = true;
            tree.branches[1].isSkipped = true;
            tree.branches[2].isPassed = true;
            tree.branches[3].isFailed = true;
            tree.branches[4].isPassed = true;

            expect(tree.getBranchCount(false, false, true)).to.equal(3);
        });

        it("returns total number of failed branches", () => {
            let tree = new Tree();
            tree.parseIn(`
A -
B -
C -
D -
E -
`, "file.txt");

            tree.generateBranches();

            tree.branches[0].isPassed = true;
            tree.branches[1].isSkipped = true;
            tree.branches[2].isPassed = true;
            tree.branches[3].isFailed = true;
            tree.branches[4].isPassed = true;

            expect(tree.getBranchCount(false, false, false, true)).to.equal(1);
        });

        it("returns total number of skipped branches", () => {
            let tree = new Tree();
            tree.parseIn(`
A -
B -
C -
D -
E -
`, "file.txt");

            tree.generateBranches();

            tree.branches[0].isPassed = true;
            tree.branches[1].isSkipped = true;
            tree.branches[2].isPassed = true;
            tree.branches[3].isFailed = true;
            tree.branches[4].isPassed = true;

            expect(tree.getBranchCount(false, false, false, false, true)).to.equal(1);
        });

        it("does not count inside hooks", () => {
            let tree = new Tree();
            tree.parseIn(`
$ A -
    B -

        C -
        D -

            E -

            *** After Every Branch {
                M
            }

            *** After Every Step {
                N
            }

            *** Before Every Branch {
                O
            }

            *** Before Every Step {
                P
            }

    H -T
        I -
    J -M

F -
    G -

*** Before Everything {
    Q
}

*** After Everything {
    R
}
`, "file.txt");

            tree.parseIn(`
*** Before Everything {
    S
}

*** After Everything {
    T
}

*** After Every Branch {
    U
}

*** After Every Step {
    V
}

*** Before Every Branch {
    W
}

*** Before Every Step {
    X
}
`, "packages.txt", true);

            tree.generateBranches();

            expect(tree.getBranchCount(false, false)).to.equal(4);
        });
    });

    describe("getStepCount()", () => {
        it("returns total number of steps", () => {
            let tree = new Tree();
            tree.parseIn(`
$ A -
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

        it("returns total number of runnable steps", () => {
            let tree = new Tree();
            tree.parseIn(`
$ A -
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

        it("returns total number of complete steps", () => {
            let tree = new Tree();
            tree.parseIn(`
$ A -
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

        it("returns total number of complete steps when there are skipped branches", () => {
            let tree = new Tree();
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

        it("does not count inside hooks", () => {
            let tree = new Tree();
            tree.parseIn(`
$ A -
    B -

        C -
        D -

            E -

            *** After Every Branch {
                M
            }

            *** After Every Step {
                N
            }

            *** Before Every Branch {
                O
            }

            *** Before Every Step {
                P
            }

    H -T
        I -
    J -M

F -
    G -

*** Before Everything {
    Q
}

*** After Everything {
    R
}
`, "file.txt");

            tree.parseIn(`
*** Before Everything {
    S
}

*** After Everything {
    T
}

*** After Every Branch {
    U
}

*** After Every Step {
    V
}

*** Before Every Branch {
    W
}

*** Before Every Step {
    X
}
`, "packages.txt", true);

            tree.generateBranches();

            tree.branches[0].steps[0].isPassed = true;
            tree.branches[0].steps[1].isFailed = true;
            tree.branches[2].passedLastTime = true;

            expect(tree.getStepCount(false)).to.equal(13);
            expect(tree.getStepCount(true, true)).to.equal(2);
        });

        it("returns total number of failed steps", () => {
            let tree = new Tree();
            tree.parseIn(`
A -
    B -

        C -
        D -

            E -
`, "file.txt");

            tree.generateBranches();

            tree.branches[0].steps[0].isPassed = true;
            tree.branches[0].steps[1].isFailed = true;
            tree.branches[0].steps[2].isFailed = true;
            tree.branches[0].steps[3].isPassed = true;

            tree.branches[1].steps[0].isPassed = true;
            tree.branches[1].steps[1].isFailed = true;
            tree.branches[1].steps[2].isFailed = true;

            expect(tree.getStepCount(true, false, true)).to.equal(4);
        });
    });

    describe("nextBranch()", () => {
        it("returns the next branch", () => {
            let tree = new Tree();
            tree.parseIn(`
A - !
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

        it("finds a branch not yet taken, skipping over those with a running branch with the same nonParallelId", () => {
            let tree = new Tree();
            tree.parseIn(`
A - !
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

        it("returns null when no branches are available", () => {
            let tree = new Tree();
            tree.parseIn(`
A - !
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

        it("returns null on an empty tree", () => {
            tree = new Tree();
            tree.generateBranches();

            expect(tree.nextBranch()).to.equal(null);
        });
    });

    describe("findSimilarBranches()", () => {
        it("handles empty branches", () => {
            let tree = new Tree();

            let branch1 = new Branch();
            let branch2 = new Branch();

            branches = [ branch1, branch2 ];

            let similarBranches = tree.findSimilarBranches(branch1, 1, branches);
            expect(similarBranches).to.have.lengthOf(1);
            expect(similarBranches).to.containSubsetInOrder([
                {
                    steps: []
                }
            ]);
        });

        it("finds similar branches", () => {
            let tree = new Tree();

            let stepA = new Step();
            stepA.text = "A";

            let stepB = new Step();
            stepB.text = "B";

            let stepC = new Step();
            stepC.text = "C";

            let stepD = new Step();
            stepD.text = "D";

            let branch1 = new Branch();
            let branch2 = new Branch();
            let branch3 = new Branch();
            let branch4 = new Branch();

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

            let similarBranches = tree.findSimilarBranches(branch1, 1, branches);
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

    describe("markStep()", () => {
        it("marks a step passed", () => {
            let tree = new Tree();

            let stepA = new Step();
            stepA.text = "A";
            stepA.isRunning = true;

            let stepB = new Step();
            stepB.text = "B";

            let stepC = new Step();
            stepC.text = "C";

            let stepD = new Step();
            stepD.text = "D";

            let branch = new Branch();

            branch.steps = [ stepA, stepB, stepC, stepD ];

            tree.markStep(stepA, branch, true);

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

        it("marks a branch passed when the last step is passed", () => {
            let tree = new Tree();

            let stepA = new Step();
            stepA.text = "A";
            stepA.isPassed = true;

            let stepB = new Step();
            stepB.text = "B";
            stepB.isPassed = true;

            let stepC = new Step();
            stepC.text = "C";
            stepC.isPassed = true;

            let stepD = new Step();
            stepD.text = "D";
            stepD.isRunning = true;

            let branch = new Branch();

            branch.steps = [ stepA, stepB, stepC, stepD ];

            tree.markStep(stepD, branch, true);

            expect(branch).to.containSubsetInOrder({
                steps: [
                    { text: "A", isPassed: true },
                    { text: "B", isPassed: true },
                    { text: "C", isPassed: true },
                    { text: "D", isPassed: true, isRunning: true }
                ],
                isPassed: true,
                isFailed: undefined
            });
        });

        it("marks a branch failed when the last step is passed", () => {
            let tree = new Tree();

            let stepA = new Step();
            stepA.text = "A";
            stepA.isPassed = true;

            let stepB = new Step();
            stepB.text = "B";
            stepB.isFailed = true;

            let stepC = new Step();
            stepC.text = "C";
            stepC.isPassed = true;

            let stepD = new Step();
            stepD.text = "D";
            stepD.isRunning = true;

            let branch = new Branch();

            branch.steps = [ stepA, stepB, stepC, stepD ];

            tree.markStep(stepD, branch, true);

            expect(branch).to.containSubsetInOrder({
                steps: [
                    { text: "A", isPassed: true },
                    { text: "B", isFailed: true },
                    { text: "C", isPassed: true },
                    { text: "D", isPassed: true, isRunning: true }
                ],
                isPassed: undefined,
                isFailed: true
            });
        });

        it("marks a step failed and sets its error", () => {
            let tree = new Tree();

            let stepA = new Step();
            stepA.text = "A";
            stepA.isRunning = true;

            let stepB = new Step();
            stepB.text = "B";

            let stepC = new Step();
            stepC.text = "C";

            let stepD = new Step();
            stepD.text = "D";

            let branch = new Branch();

            branch.steps = [ stepA, stepB, stepC, stepD ];

            tree.markStep(stepA, branch, false, new Error("foobar"));

            expect(branch).to.containSubsetInOrder({
                steps: [
                    { text: "A", isFailed: true, isRunning: true },
                    { text: "B", isFailed: undefined },
                    { text: "C", isFailed: undefined },
                    { text: "D", isFailed: undefined }
                ],
                isPassed: undefined,
                isFailed: undefined
            });

            expect(stepA.error.message).to.equal("foobar");
        });

        it("marks a branch failed when the last step is failed", () => {
            let tree = new Tree();

            let stepA = new Step();
            stepA.text = "A";
            stepA.isPassed = true;

            let stepB = new Step();
            stepB.text = "B";
            stepB.isPassed = true;

            let stepC = new Step();
            stepC.text = "C";
            stepC.isPassed = true;

            let stepD = new Step();
            stepD.text = "D";
            stepD.isRunning = true;

            let branch = new Branch();

            branch.steps = [ stepA, stepB, stepC, stepD ];

            tree.markStep(stepD, branch, false, new Error("foobar"));

            expect(branch).to.containSubsetInOrder({
                steps: [
                    { text: "A", isFailed: undefined },
                    { text: "B", isFailed: undefined },
                    { text: "C", isFailed: undefined },
                    { text: "D", isFailed: true, isRunning: true }
                ],
                isPassed: undefined,
                isFailed: true
            });

            expect(stepD.error.message).to.equal("foobar");
        });

        it("marks a branch failed before we reach the last step", () => {
            let tree = new Tree();

            let stepA = new Step();
            stepA.text = "A";
            stepA.isPassed = true;

            let stepB = new Step();
            stepB.text = "B";
            stepB.isPassed = true;

            let stepC = new Step();
            stepC.text = "C";
            stepC.isRunning = true;

            let stepD = new Step();
            stepD.text = "D";

            let branch = new Branch();

            branch.steps = [ stepA, stepB, stepC, stepD ];

            tree.markStep(stepC, branch, false, new Error("foobar"), true);

            expect(branch).to.containSubsetInOrder({
                steps: [
                    { text: "A", isFailed: undefined },
                    { text: "B", isFailed: undefined },
                    { text: "C", isFailed: true, isRunning: true },
                    { text: "D", isFailed: undefined }
                ],
                isPassed: undefined,
                isFailed: true
            });

            expect(stepC.error.message).to.equal("foobar");
        });

        it("skips repeat branches", () => {
            let tree = new Tree();

            let stepA = new Step();
            stepA.text = "A";
            stepA.isPassed = true;

            let stepB = new Step();
            stepB.text = "B";
            stepB.isPassed = true;

            let stepC = new Step();
            stepC.text = "C";
            stepC.isRunning = true;

            let stepD = new Step();
            stepD.text = "D";
            stepD.filename = "file.txt";
            stepD.lineNumber = 10;

            let branch1 = new Branch();
            let branch2 = new Branch();
            let branch3 = new Branch();
            let branch4 = new Branch();

            branch1.steps = [ stepA, stepB, stepC, stepD ];
            branch2.steps = [ stepA.cloneForBranch(), stepB.cloneForBranch(), stepC.cloneForBranch() ];
            branch3.steps = [ stepA.cloneForBranch(), stepB.cloneForBranch(), stepC.cloneForBranch(), stepB.cloneForBranch() ];
            branch4.steps = [ stepD.cloneForBranch(), stepB.cloneForBranch() ];

            tree.branches = [ branch2, branch1, branch3, branch4 ];

            tree.markStep(stepC, branch1, false, new Error("foobar"), true, true);

            expect(branch1).to.containSubsetInOrder({
                steps: [
                    { text: "A", isFailed: undefined },
                    { text: "B", isFailed: undefined },
                    { text: "C", isFailed: true, isRunning: true },
                    { text: "D", isFailed: undefined }
                ],
                isPassed: undefined,
                isFailed: true
            });

            expect(stepC.error.message).to.equal("foobar");

            expect(branch2.isSkipped).to.equal(true);
            expect(branch3.isSkipped).to.equal(true);
            expect(branch4.isSkipped).to.equal(undefined);

            expect(branch2.log).to.eql([
                { text: "Branch skipped because it is identical to an earlier branch that ran and failed (ends at file.txt:10)" }
            ]);
            expect(branch3.log).to.eql([
                { text: "Branch skipped because it is identical to an earlier branch that ran and failed (ends at file.txt:10)" }
            ]);
            expect(branch4.log).to.equal(undefined);
        });

        it("doesn't skip a repeat branch if it's currently running", () => {
            let tree = new Tree();

            let stepA = new Step();
            stepA.text = "A";
            stepA.isPassed = true;

            let stepB = new Step();
            stepB.text = "B";
            stepB.isPassed = true;

            let stepC = new Step();
            stepC.text = "C";
            stepC.isRunning = true;

            let stepD = new Step();
            stepD.text = "D";
            stepD.filename = "file.txt";
            stepD.lineNumber = 10;

            let branch1 = new Branch();
            let branch2 = new Branch();
            let branch3 = new Branch();
            let branch4 = new Branch();

            branch1.steps = [ stepA, stepB, stepC, stepD ];
            branch2.steps = [ stepA.cloneForBranch(), stepB.cloneForBranch(), stepC.cloneForBranch() ];
            branch3.steps = [ stepA.cloneForBranch(), stepB.cloneForBranch(), stepC.cloneForBranch(), stepB.cloneForBranch() ];
            branch4.steps = [ stepD.cloneForBranch(), stepB.cloneForBranch() ];

            branch3.isRunning = true;

            tree.branches = [ branch2, branch1, branch3, branch4 ];

            tree.markStep(stepC, branch1, false, new Error("foobar"), true, true);

            expect(branch1).to.containSubsetInOrder({
                steps: [
                    { text: "A", isFailed: undefined },
                    { text: "B", isFailed: undefined },
                    { text: "C", isFailed: true, isRunning: true },
                    { text: "D", isFailed: undefined }
                ],
                isPassed: undefined,
                isFailed: true
            });

            expect(stepC.error.message).to.equal("foobar");

            expect(branch2.isSkipped).to.equal(true);
            expect(branch3.isSkipped).to.equal(undefined);
            expect(branch4.isSkipped).to.equal(undefined);

            expect(branch2.log).to.eql([
                { text: "Branch skipped because it is identical to an earlier branch that ran and failed (ends at file.txt:10)" }
            ]);
            expect(branch3.log).to.equal(undefined);
            expect(branch4.log).to.equal(undefined);
        });

        it("doesn't skip a repeat branch if it already ran", () => {
            let tree = new Tree();

            let stepA = new Step();
            stepA.text = "A";
            stepA.isPassed = true;

            let stepB = new Step();
            stepB.text = "B";
            stepB.isPassed = true;

            let stepC = new Step();
            stepC.text = "C";
            stepC.isRunning = true;

            let stepD = new Step();
            stepD.text = "D";
            stepD.filename = "file.txt";
            stepD.lineNumber = 10;

            let branch1 = new Branch();
            let branch2 = new Branch();
            let branch3 = new Branch();
            let branch4 = new Branch();

            branch1.steps = [ stepA, stepB, stepC, stepD ];
            branch2.steps = [ stepA.cloneForBranch(), stepB.cloneForBranch(), stepC.cloneForBranch() ];
            branch3.steps = [ stepA.cloneForBranch(), stepB.cloneForBranch(), stepC.cloneForBranch(), stepB.cloneForBranch() ];
            branch4.steps = [ stepD.cloneForBranch(), stepB.cloneForBranch() ];

            branch3.isPassed = true;

            tree.branches = [ branch2, branch1, branch3, branch4 ];

            tree.markStep(stepC, branch1, false, new Error("foobar"), true, true);

            expect(branch1).to.containSubsetInOrder({
                steps: [
                    { text: "A", isFailed: undefined },
                    { text: "B", isFailed: undefined },
                    { text: "C", isFailed: true, isRunning: true },
                    { text: "D", isFailed: undefined }
                ],
                isPassed: undefined,
                isFailed: true
            });

            expect(stepC.error.message).to.equal("foobar");

            expect(branch2.isSkipped).to.equal(true);
            expect(branch3.isSkipped).to.equal(undefined);
            expect(branch4.isSkipped).to.equal(undefined);

            expect(branch2.log).to.eql([
                { text: "Branch skipped because it is identical to an earlier branch that ran and failed (ends at file.txt:10)" }
            ]);
            expect(branch3.log).to.equal(undefined);
            expect(branch4.log).to.equal(undefined);
        });
    });

    describe("markStepSkipped()", () => {
        it("marks a step skipped", () => {
            let tree = new Tree();

            let stepA = new Step();
            stepA.text = "A";
            stepA.isRunning = true;

            let stepB = new Step();
            stepB.text = "B";

            let stepC = new Step();
            stepC.text = "C";

            let stepD = new Step();
            stepD.text = "D";

            let branch = new Branch();

            branch.steps = [ stepA, stepB, stepC, stepD ];

            tree.markStepSkipped(stepA, branch);

            expect(branch).to.containSubsetInOrder({
                steps: [
                    { text: "A", isSkipped: true, isRunning: true },
                    { text: "B", isSkipped: undefined },
                    { text: "C", isSkipped: undefined },
                    { text: "D", isSkipped: undefined }
                ],
                isPassed: undefined,
                isFailed: undefined
            });
        });

        it("marks a branch passed when the last step is skipped", () => {
            let tree = new Tree();

            let stepA = new Step();
            stepA.text = "A";
            stepA.isPassed = true;

            let stepB = new Step();
            stepB.text = "B";
            stepB.isSkipped = true;

            let stepC = new Step();
            stepC.text = "C";
            stepC.isPassed = true;

            let stepD = new Step();
            stepD.text = "D";
            stepD.isRunning = true;

            let branch = new Branch();

            branch.steps = [ stepA, stepB, stepC, stepD ];

            tree.markStepSkipped(stepD, branch);

            expect(branch).to.containSubsetInOrder({
                steps: [
                    { text: "A", isSkipped: undefined },
                    { text: "B", isSkipped: true },
                    { text: "C", isSkipped: undefined },
                    { text: "D", isSkipped: true, isRunning: true }
                ],
                isPassed: true,
                isFailed: undefined
            });
        });

        it("handles no branch passed in", () => {
            let tree = new Tree();

            let stepA = new Step();
            stepA.text = "A";
            stepA.isPassed = true;

            let stepB = new Step();
            stepB.text = "B";
            stepB.isSkipped = true;

            let stepC = new Step();
            stepC.text = "C";
            stepC.isPassed = true;

            let stepD = new Step();
            stepD.text = "D";
            stepD.isRunning = true;

            let branch = new Branch();

            branch.steps = [ stepA, stepB, stepC, stepD ];

            tree.markStepSkipped(stepD);

            expect(branch).to.containSubsetInOrder({
                steps: [
                    { text: "A", isSkipped: undefined },
                    { text: "B", isSkipped: true },
                    { text: "C", isSkipped: undefined },
                    { text: "D", isSkipped: true, isRunning: true }
                ],
                isPassed: undefined,
                isFailed: undefined
            });
        });
    });

    describe("nextStep()", () => {
        it("returns null if the branch failed or skipped", () => {
            let tree = new Tree();
            let branch = new Branch();
            tree.branches = [ branch ];

            branch.isFailed = true;

            expect(tree.nextStep(branch, false, false)).to.equal(null);

            delete branch.isFailed;
            branch.isSkipped = true;

            expect(tree.nextStep(branch, false, false)).to.equal(null);
        });

        it("returns the first step if nothing is running yet, without advancing", () => {
            let tree = new Tree();

            let stepA = new Step();
            stepA.text = "A";

            let stepB = new Step();
            stepB.text = "B";

            let stepC = new Step();
            stepC.text = "C";

            let stepD = new Step();
            stepD.text = "D";

            let branch = new Branch();
            branch.steps = [ stepA, stepB, stepC, stepD ];

            tree.branches = [ branch ];

            expect(tree.nextStep(branch, false, false)).to.containSubsetInOrder({
                text: "A",
                isRunning: undefined
            });
        });

        it("returns the next step if one is currently running, without advancing", () => {
            let tree = new Tree();

            let stepA = new Step();
            stepA.text = "A";
            stepA.isRunning = true;

            let stepB = new Step();
            stepB.text = "B";

            let stepC = new Step();
            stepC.text = "C";

            let stepD = new Step();
            stepD.text = "D";

            let branch = new Branch();
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

        it("returns null if the last step is currently running, without advancing", () => {
            let tree = new Tree();

            let stepA = new Step();
            stepA.text = "A";

            let stepB = new Step();
            stepB.text = "B";

            let stepC = new Step();
            stepC.text = "C";

            let stepD = new Step();
            stepD.text = "D";
            stepD.isRunning = true;

            let branch = new Branch();
            branch.steps = [ stepA, stepB, stepC, stepD ];

            tree.branches = [ branch ];

            expect(tree.nextStep(branch, false, false)).to.equal(null);

            expect(stepD).to.containSubsetInOrder({
                text: "D",
                isRunning: true
            });
        });

        it("returns the first step if nothing is running yet, with advancing", () => {
            let tree = new Tree();

            let stepA = new Step();
            stepA.text = "A";

            let stepB = new Step();
            stepB.text = "B";

            let stepC = new Step();
            stepC.text = "C";

            let stepD = new Step();
            stepD.text = "D";

            let branch = new Branch();
            branch.steps = [ stepA, stepB, stepC, stepD ];

            tree.branches = [ branch ];

            expect(tree.nextStep(branch, true, false)).to.containSubsetInOrder({
                text: "A",
                isRunning: true
            });
        });

        it("returns the next step if one is currently running, with advancing", () => {
            let tree = new Tree();

            let stepA = new Step();
            stepA.text = "A";
            stepA.isRunning = true;

            let stepB = new Step();
            stepB.text = "B";

            let stepC = new Step();
            stepC.text = "C";

            let stepD = new Step();
            stepD.text = "D";

            let branch = new Branch();
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

        it("returns null if the last step is currently running, with advancing", () => {
            let tree = new Tree();

            let stepA = new Step();
            stepA.text = "A";

            let stepB = new Step();
            stepB.text = "B";

            let stepC = new Step();
            stepC.text = "C";

            let stepD = new Step();
            stepD.text = "D";
            stepD.isRunning = true;

            let branch = new Branch();
            branch.steps = [ stepA, stepB, stepC, stepD ];

            tree.branches = [ branch ];

            expect(tree.nextStep(branch, true, false)).to.equal(null);

            expect(stepD).to.containSubsetInOrder({
                text: "D",
                isRunning: undefined
            });
        });

        it("ends the branch if the next step is an -M", () => {
            let tree = new Tree();

            let stepA = new Step();
            stepA.text = "A";
            stepA.isPassed = true;

            let stepB = new Step();
            stepB.text = "B";
            stepB.isPassed = true;
            stepB.isRunning = true;

            let stepC = new Step();
            stepC.text = "C";
            stepC.isManual = true;

            let stepD = new Step();
            stepD.text = "D";

            let branch1 = new Branch();
            let branch2 = new Branch();
            let branch3 = new Branch();
            let branch4 = new Branch();

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

        it("ends the branch if the next step is a -T", () => {
            let tree = new Tree();

            let stepA = new Step();
            stepA.text = "A";
            stepA.isPassed = true;

            let stepB = new Step();
            stepB.text = "B";
            stepB.isPassed = true;
            stepB.isRunning = true;

            let stepC = new Step();
            stepC.text = "C";
            stepC.isToDo = true;

            let stepD = new Step();
            stepD.text = "D";

            let branch1 = new Branch();
            let branch2 = new Branch();
            let branch3 = new Branch();
            let branch4 = new Branch();

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

        it("skips repeat branches and end this branch if next step is an -M", () => {
            let tree = new Tree();

            let stepA = new Step();
            stepA.text = "A";
            stepA.isPassed = true;

            let stepB = new Step();
            stepB.text = "B";
            stepB.isPassed = true;
            stepB.isRunning = true;

            let stepC = new Step();
            stepC.text = "C";
            stepC.isManual = true;

            let stepD = new Step();
            stepD.text = "D";
            stepD.filename = "file.txt";
            stepD.lineNumber = 10;

            let branch1 = new Branch();
            let branch2 = new Branch();
            let branch3 = new Branch();
            let branch4 = new Branch();

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
            expect(branch2.log).to.eql([
                { text: "Branch skipped because it is identical to an earlier branch, up to the -M step (ends at file.txt:10)" }
            ]);
            expect(branch3.log).to.eql([
                { text: "Branch skipped because it is identical to an earlier branch, up to the -M step (ends at file.txt:10)" }
            ]);
            expect(branch4.log).to.equal(undefined);
        });

        it("skips repeat branches and end this branch if next step is a -T", () => {
            let tree = new Tree();

            let stepA = new Step();
            stepA.text = "A";
            stepA.isPassed = true;

            let stepB = new Step();
            stepB.text = "B";
            stepB.isPassed = true;
            stepB.isRunning = true;

            let stepC = new Step();
            stepC.text = "C";
            stepC.isToDo = true;

            let stepD = new Step();
            stepD.text = "D";
            stepD.filename = "file.txt";
            stepD.lineNumber = 10;

            let branch1 = new Branch();
            let branch2 = new Branch();
            let branch3 = new Branch();
            let branch4 = new Branch();

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
            expect(branch2.log).to.eql([
                { text: "Branch skipped because it is identical to an earlier branch, up to the -T step (ends at file.txt:10)" }
            ]);
            expect(branch3.log).to.eql([
                { text: "Branch skipped because it is identical to an earlier branch, up to the -T step (ends at file.txt:10)" }
            ]);
            expect(branch4.log).to.equal(undefined);
        });

        it("doesn't skips repeat branches if the next step isn't an -M or -T", () => {
            let tree = new Tree();

            let stepA = new Step();
            stepA.text = "A";
            stepA.isPassed = true;

            let stepB = new Step();
            stepB.text = "B";
            stepB.isPassed = true;
            stepB.isRunning = true;

            let stepC = new Step();
            stepC.text = "C";

            let stepD = new Step();
            stepD.text = "D";

            let branch1 = new Branch();
            let branch2 = new Branch();
            let branch3 = new Branch();
            let branch4 = new Branch();

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

        it("doesn't skip a repeat branch if it's currently running", () => {
            let tree = new Tree();

            let stepA = new Step();
            stepA.text = "A";
            stepA.isPassed = true;

            let stepB = new Step();
            stepB.text = "B";
            stepB.isPassed = true;
            stepB.isRunning = true;

            let stepC = new Step();
            stepC.text = "C";
            stepC.isToDo = true;

            let stepD = new Step();
            stepD.text = "D";
            stepD.filename = "file.txt";
            stepD.lineNumber = 10;

            let branch1 = new Branch();
            let branch2 = new Branch();
            let branch3 = new Branch();
            let branch4 = new Branch();

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
            expect(branch3.log).to.eql([
                { text: "Branch skipped because it is identical to an earlier branch, up to the -T step (ends at file.txt:10)" }
            ]);
            expect(branch4.log).to.equal(undefined);
        });

        it("doesn't skip a repeat branch if it already ran", () => {
            let tree = new Tree();

            let stepA = new Step();
            stepA.text = "A";
            stepA.isPassed = true;

            let stepB = new Step();
            stepB.text = "B";
            stepB.isPassed = true;
            stepB.isRunning = true;

            let stepC = new Step();
            stepC.text = "C";
            stepC.isToDo = true;

            let stepD = new Step();
            stepD.text = "D";
            stepD.filename = "file.txt";
            stepD.lineNumber = 10;

            let branch1 = new Branch();
            let branch2 = new Branch();
            let branch3 = new Branch();
            let branch4 = new Branch();

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
            expect(branch3.log).to.eql([
                { text: "Branch skipped because it is identical to an earlier branch, up to the -T step (ends at file.txt:10)" }
            ]);
            expect(branch4.log).to.equal(undefined);
        });

        it("clears isRunning on all steps in the branch if the branch completed already", () => {
            let tree = new Tree();

            let stepA = new Step();
            stepA.text = "A";
            stepA.isPassed = true;

            let stepB = new Step();
            stepB.text = "B";
            stepB.isPassed = true;
            stepB.isRunning = true;

            let stepC = new Step();
            stepC.text = "C";

            let stepD = new Step();
            stepD.text = "D";

            let branch1 = new Branch();
            branch1.steps = [ stepA, stepB, stepC, stepD ];
            branch1.isPassed = true;
            tree.branches = [ branch1 ];

            expect(tree.nextStep(branch1, true, true)).to.equal(null);

            expect(stepA.isRunning).to.equal(undefined);
            expect(stepB.isRunning).to.equal(undefined);
            expect(stepC.isRunning).to.equal(undefined);
            expect(stepD.isRunning).to.equal(undefined);
            expect(branch1.isRunning).to.equal(undefined);
        });

        it("skips over a step that has -S", () => {
            let tree = new Tree();

            let stepA = new Step();
            stepA.text = "A";
            stepA.isPassed = true;
            stepA.isRunning = true;

            let stepB = new Step();
            stepB.text = "B";
            stepB.isSkip = true;

            let stepC = new Step();
            stepC.text = "C";

            let stepD = new Step();
            stepD.text = "D";

            let branch = new Branch();
            branch.steps = [ stepA, stepB, stepC, stepD ];

            tree.branches = [ branch ];

            expect(tree.nextStep(branch, true)).to.containSubsetInOrder({
                text: "C",
                isSkipped: undefined,
                isRunning: true
            });

            expect(stepA).to.containSubsetInOrder({
                text: "A",
                isPassed: true,
                isSkipped: undefined,
                isRunning: undefined
            });

            expect(stepB).to.containSubsetInOrder({
                text: "B",
                isSkipped: true,
                isRunning: undefined
            });

            expect(stepC).to.containSubsetInOrder({
                text: "C",
                isSkipped: undefined,
                isRunning: true
            });
        });

        it("skips over a first step that has -S", () => {
            let tree = new Tree();

            let stepA = new Step();
            stepA.text = "A";
            stepA.isSkip = true;

            let stepB = new Step();
            stepB.text = "B";

            let stepC = new Step();
            stepC.text = "C";

            let stepD = new Step();
            stepD.text = "D";

            let branch = new Branch();
            branch.steps = [ stepA, stepB, stepC, stepD ];

            tree.branches = [ branch ];

            expect(tree.nextStep(branch, true)).to.containSubsetInOrder({
                text: "B",
                isRunning: true
            });

            expect(stepA).to.containSubsetInOrder({
                text: "A",
                isSkipped: true,
                isRunning: undefined
            });

            expect(stepB).to.containSubsetInOrder({
                text: "B",
                isSkipped: undefined,
                isRunning: true
            });
        });

        it("skips over multiple steps that have -S", () => {
            let tree = new Tree();

            let stepA = new Step();
            stepA.text = "A";
            stepA.isPassed = true;
            stepA.isRunning = true;

            let stepB = new Step();
            stepB.text = "B";
            stepB.isSkip = true;

            let stepC = new Step();
            stepC.text = "C";
            stepC.isSkip = true;

            let stepD = new Step();
            stepD.text = "D";

            let branch = new Branch();
            branch.steps = [ stepA, stepB, stepC, stepD ];

            tree.branches = [ branch ];

            expect(tree.nextStep(branch, true)).to.containSubsetInOrder({
                text: "D",
                isRunning: true
            });

            expect(stepA).to.containSubsetInOrder({
                text: "A",
                isPassed: true,
                isRunning: undefined
            });

            expect(stepB).to.containSubsetInOrder({
                text: "B",
                isSkipped: true,
                isRunning: undefined
            });

            expect(stepC).to.containSubsetInOrder({
                text: "C",
                isSkipped: true,
                isRunning: undefined
            });

            expect(stepD).to.containSubsetInOrder({
                text: "D",
                isSkipped: undefined,
                isRunning: true
            });
        });

        it("skips over a last step that has -S", () => {
            let tree = new Tree();

            let stepA = new Step();
            stepA.text = "A";
            stepA.isPassed = true;
            stepA.isRunning = true;

            let stepB = new Step();
            stepB.text = "B";
            stepB.isSkip = true;

            let branch = new Branch();
            branch.steps = [ stepA, stepB ];

            tree.branches = [ branch ];

            expect(tree.nextStep(branch, true)).to.equal(null);

            expect(stepA).to.containSubsetInOrder({
                text: "A",
                isPassed: true,
                isRunning: undefined
            });

            expect(stepB).to.containSubsetInOrder({
                text: "B",
                isSkipped: true,
                isRunning: undefined
            });

            expect(branch.isPassed).to.be.true;
        });
    });

    describe("initCounts()", () => {
        it("initializes counts", () => {
            let tree = new Tree();
            tree.parseIn(`
A -
B -

    C -

    D -
`, "file.txt");

            tree.generateBranches();
            tree.initCounts();

            expect(tree.passed).to.equal(0);
            expect(tree.failed).to.equal(0);
            expect(tree.skipped).to.equal(0);
            expect(tree.complete).to.equal(0);
            expect(tree.totalToRun).to.equal(4);
            expect(tree.totalInReport).to.equal(4);
            expect(tree.totalPassedInReport).to.equal(0);

            expect(tree.totalStepsComplete).to.equal(0);
            expect(tree.totalSteps).to.equal(8);
        });
    });

    describe("updateCounts()", () => {
        it("updates counts", () => {
            let tree = new Tree();
            tree.parseIn(`
A -
B -

    C -

    D -
`, "file.txt");

            tree.generateBranches();

            tree.branches[0].isPassed = true;
            tree.branches[0].steps[0].isPassed = true;
            tree.branches[0].steps[1].isPassed = true;

            tree.branches[1].isFailed = true;
            tree.branches[1].steps[0].isFailed = true;

            tree.branches[2].passedLastTime = true;

            tree.updateCounts();

            expect(tree.passed).to.equal(1);
            expect(tree.failed).to.equal(1);
            expect(tree.skipped).to.equal(0);
            expect(tree.complete).to.equal(2);
            expect(tree.totalToRun).to.equal(3);
            expect(tree.totalInReport).to.equal(4);
            expect(tree.totalPassedInReport).to.equal(2);

            expect(tree.totalStepsComplete).to.equal(4);
            expect(tree.totalSteps).to.equal(6);
        });
    });
});
