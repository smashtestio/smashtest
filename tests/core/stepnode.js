/* globals describe, it, context, beforeEach */
import chai from 'chai';
import Comparer from '../../packages/js/comparer.js';
import StepNode from '../../src/stepnode.js';

const expect = chai.expect;
const assert = chai.assert;

describe('StepNode', () => {
    describe('parseLine()', () => {
        let s = null;

        beforeEach(() => {
            s = new StepNode(0);
        });

        context('generic tests', () => {
            it('parses a line with a string', () => {
                s.parseLine('Click "Big Red Button"', 'file.txt', 10);
                assert.equal(s.filename, 'file.txt');
                assert.equal(s.lineNumber, 10);
                assert.equal(s.text, 'Click "Big Red Button"');
                assert.equal(s.modifiers, undefined);
                assert.equal(s.codeBlock, undefined);
                assert.equal(s.comment, undefined);
                assert.equal(s.isFunctionDeclaration, undefined);
                assert.equal(s.isFunctionCall, true);
                assert.equal(s.isSkip, undefined);
                assert.equal(s.isSkipBelow, undefined);
                assert.equal(s.isSkipBranch, undefined);
                assert.equal(s.isDebug, undefined);
                assert.equal(s.isExpressDebug, undefined);
                assert.equal(s.isTextualStep, undefined);
                assert.equal(s.isOnly, undefined);
                assert.equal(s.isNonParallel, undefined);
                assert.equal(s.isNonParallelCond, undefined);
                assert.equal(s.isSequential, undefined);
                assert.equal(s.varsList, undefined);
            });

            it('parses a line with multiple strings and whitespace', () => {
                s.parseLine('    Click "B"ig" \'Re\'d\' "Button [\'he\' re]" ', 'file.txt', 10);
                assert.equal(s.text, 'Click "B"ig" \'Re\'d\' "Button [\'he\' re]"');
                assert.equal(s.modifiers, undefined);
                assert.equal(s.codeBlock, undefined);
            });

            it('throws an error if a step only has numbers, periods, or commas', () => {
                assert.throws(() => {
                    s.parseLine('324798', 'file.txt', 10);
                }, 'Invalid step name [file.txt:10]');

                assert.throws(() => {
                    s.parseLine('32, 4798', 'file.txt', 10);
                }, 'Invalid step name [file.txt:10]');

                assert.throws(() => {
                    s.parseLine('.', 'file.txt', 10);
                }, 'Invalid step name [file.txt:10]');
            });

            it('throws an error if a step has the name of a hook', () => {
                assert.throws(() => {
                    s.parseLine('Before Every Branch', 'file.txt', 10);
                }, 'You cannot have a function call with that name. That\'s reserved for hook function declarations. [file.txt:10]');

                assert.throws(() => {
                    s.parseLine('After Every Branch', 'file.txt', 10);
                }, 'You cannot have a function call with that name. That\'s reserved for hook function declarations. [file.txt:10]');

                assert.throws(() => {
                    s.parseLine('Before Every Step', 'file.txt', 10);
                }, 'You cannot have a function call with that name. That\'s reserved for hook function declarations. [file.txt:10]');

                assert.throws(() => {
                    s.parseLine('After Every Step', 'file.txt', 10);
                }, 'You cannot have a function call with that name. That\'s reserved for hook function declarations. [file.txt:10]');

                assert.throws(() => {
                    s.parseLine('  before   Everything  ', 'file.txt', 10);
                }, 'You cannot have a function call with that name. That\'s reserved for hook function declarations. [file.txt:10]');

                assert.throws(() => {
                    s.parseLine(' AFTER EVERYTHING ', 'file.txt', 10);
                }, 'You cannot have a function call with that name. That\'s reserved for hook function declarations. [file.txt:10]');
            });

            it('throws an error if a hook name is invalid', () => {
                assert.throws(() => {
                    s.parseLine('*** Before', 'file.txt', 10);
                }, 'Invalid hook name [file.txt:10]');

                assert.throws(() => {
                    s.parseLine('*** Foobar', 'file.txt', 10);
                }, 'Invalid hook name [file.txt:10]');
            });

            it('does not throw an error if a hook has the right casing and has a code block, regardless of whitespace', () => {
                s = new StepNode(0);
                s.parseLine('*** Before  Every   Branch {', 'file.txt', 10);

                s = new StepNode(0);
                s.parseLine('*** After  Every   Branch {', 'file.txt', 10);

                s = new StepNode(0);
                s.parseLine('***    Before Every Step   { ', 'file.txt', 10);

                s = new StepNode(0);
                s.parseLine('***    After Every Step   {  ', 'file.txt', 10);

                s = new StepNode(0);
                s.parseLine('***  Before  Everything {  ', 'file.txt', 10);

                s = new StepNode(0);
                s.parseLine('***  After  Everything  { ', 'file.txt', 10);
            });

            it('throws an error if a hook doesn\'t start a code block', () => {
                assert.throws(() => {
                    s.parseLine('*** Before  Every   Branch', 'file.txt', 10);
                }, 'A hook must have a code block [file.txt:10]');

                assert.throws(() => {
                    s.parseLine('*** After  Every   Branch', 'file.txt', 10);
                }, 'A hook must have a code block [file.txt:10]');

                assert.throws(() => {
                    s.parseLine('***    Before Every Step    ', 'file.txt', 10);
                }, 'A hook must have a code block [file.txt:10]');

                assert.throws(() => {
                    s.parseLine('***    After Every Step     ', 'file.txt', 10);
                }, 'A hook must have a code block [file.txt:10]');

                assert.throws(() => {
                    s.parseLine('***  Before  Everything +   ', 'file.txt', 10);
                }, 'A hook must have a code block [file.txt:10]');

                assert.throws(() => {
                    s.parseLine('***  After  Everything .. +  ', 'file.txt', 10);
                }, 'A hook must have a code block [file.txt:10]');
            });

            it('parses a line with a {variable}', () => {
                s.parseLine('Click {Big Red Button}', 'file.txt', 10);
                assert.equal(s.text, 'Click {Big Red Button}');
                assert.equal(s.modifiers, undefined);
                assert.equal(s.codeBlock, undefined);
            });

            it('parses a line with a {{local variable}}', () => {
                s.parseLine('Click {{Big Red Button}}', 'file.txt', 10);
                assert.equal(s.text, 'Click {{Big Red Button}}');
                assert.equal(s.modifiers, undefined);
                assert.equal(s.codeBlock, undefined);
            });

            it('parses a line with multiple variables and whitespace', () => {
                s.parseLine('    Click {{Big}} {Red} \'dazzling\' {{Button}} ', 'file.txt', 10);
                assert.equal(s.text, 'Click {{Big}} {Red} \'dazzling\' {{Button}}');
                assert.equal(s.modifiers, undefined);
                assert.equal(s.codeBlock, undefined);
            });

            it('parses a comment', () => {
                s.parseLine('Click {Big Red Button} // comment here', 'file.txt', 10);
                assert.equal(s.text, 'Click {Big Red Button}');
                assert.equal(s.comment, '// comment here');
            });

            it('doesn\'t parse a comment inside single-quotes', () => {
                s.parseLine('Click \'some // ugly \' \\\' comment\'  // comment here ', 'file.txt', 10);
                assert.equal(s.text, 'Click \'some // ugly \' \\\' comment\'');
                assert.equal(s.comment, '// comment here ');
            });

            it('doesn\'t parse a comment inside double-quotes', () => {
                s.parseLine(
                    'Click "some // ugly comment" and "//othercomment " \\\\"" // comment here ',
                    'file.txt',
                    10
                );
                assert.equal(s.text, 'Click "some // ugly comment" and "//othercomment " \\\\""');
                assert.equal(s.comment, '// comment here ');
            });

            it('parses a line that only consists of a comment', () => {
                s = new StepNode(0);
                s.parseLine('// comment here', 'file.txt', 10);
                assert.equal(s.text, '');
                assert.equal(s.comment, '// comment here');

                s = new StepNode(0);
                s.parseLine('    // comment here', 'file.txt', 10);
                assert.equal(s.text, '');
                assert.equal(s.comment, '// comment here');
            });

            it('parses a function declaration', () => {
                s = new StepNode(0);
                s.parseLine('    * My Function here', 'file.txt', 10);
                assert.equal(s.text, 'My Function here');
                assert.equal(s.isFunctionDeclaration, true);
                assert.equal(s.isFunctionCall, undefined);

                s = new StepNode(0);
                s.parseLine('    * My Function {{var}}', 'file.txt', 10);
                assert.equal(s.text, 'My Function {{var}}');
                assert.equal(s.isFunctionDeclaration, true);
                assert.equal(s.isFunctionCall, undefined);
            });

            it('throws an error if a function declaration has \'strings\'', () => {
                assert.throws(() => {
                    s.parseLine('* Something \'quote\' something else', 'file.txt', 10);
                }, 'A function declaration cannot have \'strings\', "strings", or [strings] inside of it [file.txt:10]');

                assert.throws(() => {
                    s.parseLine('** Something "quote" something else', 'file.txt', 10);
                }, 'A function declaration cannot have \'strings\', "strings", or [strings] inside of it [file.txt:10]');

                assert.throws(() => {
                    s.parseLine('* Something [quote] something else', 'file.txt', 10);
                }, 'A function declaration cannot have \'strings\', "strings", or [strings] inside of it [file.txt:10]');
            });

            it('parses a function call', () => {
                s.parseLine('    My Function call ', 'file.txt', 10);
                assert.equal(s.text, 'My Function call');
                assert.equal(s.isFunctionDeclaration, undefined);
                assert.equal(s.isFunctionCall, true);
            });

            it('parses an anonymous function', () => {
                s.parseLine('    [ ', 'file.txt', 10);
                assert.equal(s.text, ' ');
                assert.equal(s.isFunctionDeclaration, true);
                assert.equal(s.isFunctionCall, undefined);
                assert.equal(s.isMultiBlockFunctionDeclaration, true);
            });

            it('throws an error if a textual step is also a multi-level step block', () => {
                assert.throws(() => {
                    s.parseLine('- Something [', 'file.txt', 10);
                }, 'A named step block ([) cannot be a textual step (-) as well [file.txt:10]');

                assert.throws(() => {
                    s.parseLine('    - Something + [  ', 'file.txt', 10);
                }, 'A named step block ([) cannot be a textual step (-) as well [file.txt:10]');
            });

            it('throws an error if a textual step is also a function declaration', () => {
                assert.throws(() => {
                    s.parseLine('* Something - +', 'file.txt', 10);
                }, 'A function declaration cannot be a textual step (-) as well [file.txt:10]');

                assert.throws(() => {
                    s.parseLine('    ** Something - + {', 'file.txt', 10);
                }, 'A function declaration cannot be a textual step (-) as well [file.txt:10]');
            });

            it('throws an error if a textual step has a code block', () => {
                assert.throws(() => {
                    s.parseLine('Something - {', 'file.txt', 10);
                }, 'A step with a code block cannot be a textual step (-) as well [file.txt:10]');

                assert.throws(() => {
                    s.parseLine('    Something - + {', 'file.txt', 10);
                }, 'A step with a code block cannot be a textual step (-) as well [file.txt:10]');
            });

            it('returns text set to empty string for empty or all-whitespace lines', () => {
                s = new StepNode(0);
                s.parseLine('', 'file.txt', 10);
                assert.equal(s.text, '');

                s = new StepNode(0);
                s.parseLine('     ', 'file.txt', 10);
                assert.equal(s.text, '');
            });

            it('returns text set to \'..\' when the whole line is a sequential modifier (..)', () => {
                s = new StepNode(0);
                s.parseLine('..', 'file.txt', 10);
                assert.equal(s.text, '..');

                s = new StepNode(0);
                s.parseLine('    .. ', 'file.txt', 10);
                assert.equal(s.text, '..');

                s = new StepNode(0);
                s.parseLine('    .. // comment here', 'file.txt', 10);
                assert.equal(s.text, '..');
            });
        });

        context('blocks', () => {
            it('parses a function declaration with a code block', () => {
                s.parseLine('* Click {{var}} + { ', 'file.txt', 10);
                assert.equal(s.text, 'Click {{var}}');
                assert.equal(s.codeBlock, ' ');
            });

            it('parses a step with a code block', () => {
                s.parseLine('Some text + { ', 'file.txt', 10);
                assert.equal(s.text, 'Some text');
                assert.equal(s.codeBlock, ' ');
            });

            it('parses an approved function call with a code block', () => {
                s.parseLine('Execute  In Browser  + { ', 'file.txt', 10);
                assert.equal(s.text, 'Execute  In Browser');
                assert.equal(s.codeBlock, ' ');
            });

            it('parses a code block followed by a comment', () => {
                s.parseLine('Something here + { // comment here', 'file.txt', 10);
                assert.equal(s.text, 'Something here');
                assert.equal(s.codeBlock, ' // comment here');
                assert.equal(s.comment, undefined);
            });
        });

        context('modifiers', () => {
            it('parses the skip modifier (-s)', () => {
                s = new StepNode(0);
                s.parseLine('Click {button} -s', 'file.txt', 10);
                assert.equal(s.text, 'Click {button}');
                assert.equal(s.isSkip, true);
                assert.equal(s.isTextualStep, true);

                s = new StepNode(0);
                s.parseLine('-s Click {button}', 'file.txt', 10);
                assert.equal(s.text, 'Click {button}');
                assert.equal(s.isSkip, true);
                assert.equal(s.isTextualStep, true);

                s = new StepNode(0);
                s.parseLine('Click {button} + -s ..', 'file.txt', 10);
                assert.equal(s.text, 'Click {button}');
                assert.equal(s.isSkip, true);
                assert.equal(s.isTextualStep, true);
            });

            it('parses the skip below modifier (.s)', () => {
                s = new StepNode(0);
                s.parseLine('Click {button} .s', 'file.txt', 10);
                assert.equal(s.text, 'Click {button}');
                assert.equal(s.isSkipBelow, true);
                assert.equal(s.isTextualStep, undefined);

                s = new StepNode(0);
                s.parseLine('.s Click {button}', 'file.txt', 10);
                assert.equal(s.text, 'Click {button}');
                assert.equal(s.isSkipBelow, true);
                assert.equal(s.isTextualStep, undefined);

                s = new StepNode(0);
                s.parseLine('Click {button} + .s ..', 'file.txt', 10);
                assert.equal(s.text, 'Click {button}');
                assert.equal(s.isSkipBelow, true);
                assert.equal(s.isTextualStep, undefined);
            });

            it('parses the skip branch modifier ($s)', () => {
                s = new StepNode(0);
                s.parseLine('Click {button} $s', 'file.txt', 10);
                assert.equal(s.text, 'Click {button}');
                assert.equal(s.isSkipBranch, true);
                assert.equal(s.isTextualStep, undefined);

                s = new StepNode(0);
                s.parseLine('$s Click {button}', 'file.txt', 10);
                assert.equal(s.text, 'Click {button}');
                assert.equal(s.isSkipBranch, true);
                assert.equal(s.isTextualStep, undefined);

                s = new StepNode(0);
                s.parseLine('Click {button} + $s ..', 'file.txt', 10);
                assert.equal(s.text, 'Click {button}');
                assert.equal(s.isSkipBranch, true);
                assert.equal(s.isTextualStep, undefined);
            });

            it('parses the textual step modifier (-)', () => {
                s = new StepNode(0);
                s.parseLine('Click {button} -', 'file.txt', 10);
                assert.equal(s.text, 'Click {button}');
                assert.equal(s.isTextualStep, true);

                s = new StepNode(0);
                s.parseLine('- Click {button} +', 'file.txt', 10);
                assert.equal(s.text, 'Click {button}');
                assert.equal(s.isTextualStep, true);

                s = new StepNode(0);
                s.parseLine('    Click {button} - + ', 'file.txt', 10);
                assert.equal(s.text, 'Click {button}');
                assert.equal(s.isTextualStep, true);
            });

            it('parses the debug modifier (~)', () => {
                s = new StepNode(0);
                s.parseLine('~ Click {button}', 'file.txt', 10);
                assert.equal(s.text, 'Click {button}');
                assert.equal(s.isDebug, true);
                assert.equal(s.isBeforeDebug, true);
                assert.equal(s.isAfterDebug, undefined);

                s = new StepNode(0);
                s.parseLine('    ~  Click {button} + ', 'file.txt', 10);
                assert.equal(s.text, 'Click {button}');
                assert.equal(s.isDebug, true);
                assert.equal(s.isBeforeDebug, true);
                assert.equal(s.isAfterDebug, undefined);

                s = new StepNode(0);
                s.parseLine('Click {button} ~', 'file.txt', 10);
                assert.equal(s.text, 'Click {button}');
                assert.equal(s.isDebug, true);
                assert.equal(s.isBeforeDebug, undefined);
                assert.equal(s.isAfterDebug, true);

                s = new StepNode(0);
                s.parseLine('     Click {button} + ~   ', 'file.txt', 10);
                assert.equal(s.text, 'Click {button}');
                assert.equal(s.isDebug, true);
                assert.equal(s.isBeforeDebug, undefined);
                assert.equal(s.isAfterDebug, true);

                s = new StepNode(0);
                s.parseLine('~ Click {button} ~', 'file.txt', 10);
                assert.equal(s.text, 'Click {button}');
                assert.equal(s.isDebug, true);
                assert.equal(s.isBeforeDebug, true);
                assert.equal(s.isAfterDebug, true);

                s = new StepNode(0);
                s.parseLine('    ~  Click {button} ~ +   ', 'file.txt', 10);
                assert.equal(s.text, 'Click {button}');
                assert.equal(s.isDebug, true);
                assert.equal(s.isBeforeDebug, true);
                assert.equal(s.isAfterDebug, true);
            });

            it('parses the express debug modifier (~~)', () => {
                s = new StepNode(0);
                s.parseLine('~~ Click {button}', 'file.txt', 10);
                assert.equal(s.text, 'Click {button}');
                assert.equal(s.isDebug, true);
                assert.equal(s.isExpressDebug, true);

                s = new StepNode(0);
                s.parseLine('    ~~   Click {button} + ', 'file.txt', 10);
                assert.equal(s.text, 'Click {button}');
                assert.equal(s.isDebug, true);
                assert.equal(s.isExpressDebug, true);
            });

            it('parses the only modifier ($)', () => {
                s = new StepNode(0);
                s.parseLine('$ Click {button}', 'file.txt', 10);
                assert.equal(s.text, 'Click {button}');
                assert.equal(s.isOnly, true);

                s = new StepNode(0);
                s.parseLine('    $   Click {button} + ', 'file.txt', 10);
                assert.equal(s.text, 'Click {button}');
                assert.equal(s.isOnly, true);
            });

            it('parses the non-parallel modifier (!)', () => {
                s = new StepNode(0);
                s.parseLine('Click {button} !', 'file.txt', 10);
                assert.equal(s.text, 'Click {button}');
                assert.equal(s.isNonParallel, true);
                assert.equal(s.isNonParallelCond, undefined);

                s = new StepNode(0);
                s.parseLine('Click {button} .s ! .. // comment', 'file.txt', 10);
                assert.equal(s.text, 'Click {button}');
                assert.equal(s.isNonParallel, true);
                assert.equal(s.isNonParallelCond, undefined);
            });

            it('parses the non-parallel conditional modifier (!!)', () => {
                s = new StepNode(0);
                s.parseLine('Click {button} !!', 'file.txt', 10);
                assert.equal(s.text, 'Click {button}');
                assert.equal(s.isNonParallel, undefined);
                assert.equal(s.isNonParallelCond, true);

                s = new StepNode(0);
                s.parseLine('Click {button} .s !! .. // comment', 'file.txt', 10);
                assert.equal(s.text, 'Click {button}');
                assert.equal(s.isNonParallel, undefined);
                assert.equal(s.isNonParallelCond, true);
            });

            it('parses the sequential modifier (..)', () => {
                s = new StepNode(0);
                s.parseLine('Click {button} ..', 'file.txt', 10);
                assert.equal(s.text, 'Click {button}');
                assert.equal(s.isSequential, true);

                s = new StepNode(0);
                s.parseLine('Click {button} .s .. + // comment', 'file.txt', 10);
                assert.equal(s.text, 'Click {button}');
                assert.equal(s.isSequential, true);
            });

            it('parses the collapsed modifier (+)', () => {
                s = new StepNode(0);
                s.parseLine('Click {button} +', 'file.txt', 10);
                assert.equal(s.text, 'Click {button}');
                assert.equal(s.isCollapsed, true);

                s = new StepNode(0);
                s.parseLine('+ Click {button}', 'file.txt', 10);
                assert.equal(s.text, 'Click {button}');
                assert.equal(s.isCollapsed, true);

                s = new StepNode(0);
                s.parseLine('Click {button} .s + ! // comment', 'file.txt', 10);
                assert.equal(s.text, 'Click {button}');
                assert.equal(s.isCollapsed, true);
            });

            it('parses the hidden modifier (+?)', () => {
                s = new StepNode(0);
                s.parseLine('Click {button} +?', 'file.txt', 10);
                assert.equal(s.text, 'Click {button}');
                assert.equal(s.isHidden, true);

                s = new StepNode(0);
                s.parseLine('+? Click {button}', 'file.txt', 10);
                assert.equal(s.text, 'Click {button}');
                assert.equal(s.isHidden, true);

                s = new StepNode(0);
                s.parseLine('Click {button} .s +? + // comment', 'file.txt', 10);
                assert.equal(s.text, 'Click {button}');
                assert.equal(s.isHidden, true);
            });

            it('parses the group modifier (#)', () => {
                s = new StepNode(0);
                s.parseLine('Click {button} #one', 'file.txt', 10);
                assert.equal(s.text, 'Click {button}');
                assert.deepEqual(s.groups, ['one']);

                s = new StepNode(0);
                s.parseLine('- #one Click {button} #two +', 'file.txt', 10);
                assert.equal(s.text, 'Click {button}');
                assert.deepEqual(s.groups, ['one', 'two']);

                s = new StepNode(0);
                s.parseLine('   #one - #two Click {button} - #three + ', 'file.txt', 10);
                assert.equal(s.text, 'Click {button}');
                assert.deepEqual(s.groups, ['one', 'two', 'three']);
            });

            it('rejects a hook with an modifier', () => {
                assert.throws(() => {
                    s.parseLine('$ *** After Every Branch + {', 'file.txt', 10);
                }, 'A hook cannot have any modifiers ($) [file.txt:10]');
            });

            it('rejects a hook with a ~', () => {
                assert.throws(() => {
                    s.parseLine('~ *** Before Every Step {', 'file.txt', 10);
                }, 'A hook cannot have any modifiers (~) [file.txt:10]');

                assert.throws(() => {
                    s.parseLine('*** Before Every Step ~ {', 'file.txt', 10);
                }, 'A hook cannot have any modifiers (~) [file.txt:10]');
            });
        });

        context('{vars}', () => {
            it('parses {var} = Function', () => {
                s = new StepNode(0);
                s.parseLine('{var} = Click \'something\' {blah}', 'file.txt', 10);
                assert.equal(s.text, '{var} = Click \'something\' {blah}');
                assert.equal(s.isFunctionCall, true);

                s = new StepNode(0);
                s.parseLine('    {var with spaces}  = Click \'something\' {{blah}}', 'file.txt', 10);
                assert.equal(s.text, '{var with spaces}  = Click \'something\' {{blah}}');
                assert.equal(s.isFunctionCall, true);
            });

            it('parses {var} = Code Block Function {', () => {
                s.parseLine('{var} = Code Block Function {', 'file.txt', 10);
                assert.equal(s.text, '{var} = Code Block Function');
                assert.equal(s.isFunctionCall, undefined);
                assert.equal(s.isTextualStep, undefined);
            });

            it('rejects {var} = Textual Function -', () => {
                assert.throws(() => {
                    s.parseLine('{var} = Textual Function -', 'file.txt', 10);
                }, 'A textual step (ending in -) cannot also start with a {variable} assignment [file.txt:10]');
            });

            it('rejects {var} = only numbers, periods, or commas', () => {
                assert.throws(() => {
                    s.parseLine('{var} =324798', 'file.txt', 10);
                }, '{vars} can only be set to \'strings\', "strings", or [strings] [file.txt:10]');

                assert.throws(() => {
                    s.parseLine('{var} = 32, 4798', 'file.txt', 10);
                }, '{vars} can only be set to \'strings\', "strings", or [strings] [file.txt:10]');

                assert.throws(() => {
                    s.parseLine('{var}=.', 'file.txt', 10);
                }, '{vars} can only be set to \'strings\', "strings", or [strings] [file.txt:10]');
            });

            it('rejects {var}= by itself', () => {
                assert.throws(() => {
                    s.parseLine('{var}=', 'file.txt', 10);
                }, 'A {variable} must be set to something [file.txt:10]');

                assert.throws(() => {
                    s.parseLine('{{var}}=', 'file.txt', 10);
                }, 'A {variable} must be set to something [file.txt:10]');

                assert.throws(() => {
                    s.parseLine('{var} = ', 'file.txt', 10);
                }, 'A {variable} must be set to something [file.txt:10]');

                assert.throws(() => {
                    s.parseLine('{var}=,{var2}=\'string\'', 'file.txt', 10);
                }, 'A {variable} must be set to something [file.txt:10]');

                assert.throws(() => {
                    s.parseLine('{var}= , {var2}=\'string\'', 'file.txt', 10);
                }, 'A {variable} must be set to something [file.txt:10]');
            });

            it('parses {var} = \'string\'', () => {
                s = new StepNode(0);
                s.parseLine('{var} = \'foo\'', 'file.txt', 10);
                assert.equal(s.text, '{var} = \'foo\'');
                assert.equal(s.isFunctionCall, undefined);

                s = new StepNode(0);
                s.parseLine('{var} = "foo"', 'file.txt', 10);
                assert.equal(s.text, '{var} = "foo"');
                assert.equal(s.isFunctionCall, undefined);

                s = new StepNode(0);
                s.parseLine('{var} = [foo]', 'file.txt', 10);
                assert.equal(s.text, '{var} = [foo]');
                assert.equal(s.isFunctionCall, undefined);
            });

            it('parses {{var}} = Function', () => {
                s = new StepNode(0);
                s.parseLine('{{var}} = Click \'something\' [here] { blah }', 'file.txt', 10);
                assert.equal(s.text, '{{var}} = Click \'something\' [here] { blah }');
                assert.equal(s.isFunctionCall, true);

                s = new StepNode(0);
                s.parseLine('    {{ var with spaces  }} =  Click \'something\' [here] {{blah}}', 'file.txt', 10);
                assert.equal(s.text, '{{ var with spaces  }} =  Click \'something\' [here] {{blah}}');
                assert.equal(s.isFunctionCall, true);

                s = new StepNode(0);
                s.parseLine(
                    '{{var}} = Click \'something \\\\ \'\' "something2 "" [\\\'he\\\' re] {blah} {{blah2}}',
                    'file.txt',
                    10
                );
                assert.equal(s.isFunctionCall, true);
            });

            it('parses {{var}} = \'string\'', () => {
                s = new StepNode(0);
                s.parseLine('{{var}} = \'foo \\\'\'', 'file.txt', 10);
                assert.equal(s.text, '{{var}} = \'foo \\\'\'');
                assert.equal(s.isFunctionCall, undefined);

                s = new StepNode(0);
                s.parseLine('{{var}} = "foo \\""', 'file.txt', 10);
                assert.equal(s.text, '{{var}} = "foo \\""');
                assert.equal(s.isFunctionCall, undefined);

                s = new StepNode(0);
                s.parseLine('{{var}} = [foo \'bar\'\\[\\]]', 'file.txt', 10);
                assert.equal(s.text, '{{var}} = [foo \'bar\'\\[\\]]');
                assert.equal(s.isFunctionCall, undefined);
            });

            it('parses multiple {var} = \'string literal\', separated by commas', () => {
                s.parseLine(
                    '{var1} = \'one\', {{var2}}=\'two 2\', {var 3}= "three 3",{var4}=[four "4"] +',
                    'file.txt',
                    10
                );
                assert.equal(s.text, '{var1} = \'one\', {{var2}}=\'two 2\', {var 3}= "three 3",{var4}=[four "4"]');
                assert.equal(s.isFunctionCall, undefined);
            });

            it('doesn\'t recognize {vars} with backslashes in their names', () => {
                s.parseLine('{var\\} = Click \'something \\{blah\\}\' {foo}', 'file.txt', 10);
                assert.equal(s.text, '{var\\} = Click \'something \\{blah\\}\' {foo}');
            });

            it('rejects {vars} with only numbers in their names', () => {
                assert.throws(() => {
                    s.parseLine('{23} = \'str\'', 'file.txt', 10);
                }, 'A {variable name} cannot be just numbers [file.txt:10]');

                assert.throws(() => {
                    s.parseLine('{234 23432} = \'str\'', 'file.txt', 10);
                }, 'A {variable name} cannot be just numbers [file.txt:10]');

                assert.throws(() => {
                    s.parseLine('{  435 4545    } = \'str\'', 'file.txt', 10);
                }, 'A {variable name} cannot be just numbers [file.txt:10]');
            });

            it('rejects {vars *} to the left of an = sign', () => {
                assert.throws(() => {
                    s.parseLine('{foobar *} = \'str\'', 'file.txt', 10);
                }, 'A variable name to the left of an = cannot end in a * [file.txt:10]');

                assert.throws(() => {
                    s.parseLine('{{ foobar  *  }} = \'str\'', 'file.txt', 10);
                }, 'A variable name to the left of an = cannot end in a * [file.txt:10]');
            });

            it('doesn\'t throw an error when a [bracketed string contains {vars}]', () => {
                s = new StepNode(0);
                s.parseLine('Something [next to \'{var}\']', 'file.txt', 10);

                s = new StepNode(0);
                s.parseLine('Something [next to \'{{var}}\']', 'file.txt', 10);

                s = new StepNode(0);
                s.parseLine('Something [{N}th]', 'file.txt', 10);
            });

            it('throws an error when multiple {vars} are set in a line, and one of them is not a \'string literal\'', () => {
                assert.throws(() => {
                    s.parseLine('{var1} = \'one\', {{var2}}=Some step here, {var 3}= "three 3" +', 'file.txt', 10);
                }, 'When multiple {variables} are being set on a single line, those {variables} can only be set to \'strings\', "strings", or [strings] [file.txt:10]');

                assert.throws(() => {
                    s.parseLine('{var1}=\'str1\', {var2}=\'str2\', Invalid stuff here', 'file.txt', 10);
                }, 'When multiple {variables} are being set on a single line, those {variables} can only be set to \'strings\', "strings", or [strings] [file.txt:10]');
            });

            it('throws an error when a step sets a variable and is a function declaration', () => {
                assert.throws(() => {
                    s.parseLine('* {{var1}}= Some function', 'file.txt', 10);
                }, 'A step setting {variables} cannot start with a * [file.txt:10]');
            });
        });
    });

    describe('getVarsBeingSet()', () => {
        let s = null;

        beforeEach(() => {
            s = new StepNode(0);
        });

        it('parses {var} = Function', () => {
            s = new StepNode(0);
            s.parseLine('{var} = Click \'something\' {blah}', 'file.txt', 10);
            assert.deepEqual(s.getVarsBeingSet(), [{ name: 'var', value: 'Click \'something\' {blah}', isLocal: false }]);

            s = new StepNode(0);
            s.parseLine('    {var with spaces}  = Click \'something\' {{blah}}', 'file.txt', 10);
            assert.deepEqual(s.getVarsBeingSet(), [
                { name: 'var with spaces', value: 'Click \'something\' {{blah}}', isLocal: false }
            ]);
        });

        it('parses {var} = Code Block Function {', () => {
            s.parseLine('{var} = Code Block Function {', 'file.txt', 10);
            assert.deepEqual(s.getVarsBeingSet(), [{ name: 'var', value: 'Code Block Function', isLocal: false }]);
        });

        it('parses {var} = \'string\'', () => {
            s = new StepNode(0);
            s.parseLine('{var} = \'foo\'', 'file.txt', 10);
            assert.deepEqual(s.getVarsBeingSet(), [{ name: 'var', value: '\'foo\'', isLocal: false }]);

            s = new StepNode(0);
            s.parseLine('{var} = "foo"', 'file.txt', 10);
            assert.deepEqual(s.getVarsBeingSet(), [{ name: 'var', value: '"foo"', isLocal: false }]);

            s = new StepNode(0);
            s.parseLine('{var} = [foo]', 'file.txt', 10);
            assert.deepEqual(s.getVarsBeingSet(), [{ name: 'var', value: '[foo]', isLocal: false }]);
        });

        it('parses {{var}} = Function', () => {
            s = new StepNode(0);
            s.parseLine('{{var}} = Click \'something\' [here] { blah }', 'file.txt', 10);
            assert.deepEqual(s.getVarsBeingSet(), [
                { name: 'var', value: 'Click \'something\' [here] { blah }', isLocal: true }
            ]);

            s = new StepNode(0);
            s.parseLine('    {{ var with spaces  }} =  Click \'something\' [here] {{blah}}', 'file.txt', 10);
            assert.deepEqual(s.getVarsBeingSet(), [
                { name: 'var with spaces', value: 'Click \'something\' [here] {{blah}}', isLocal: true }
            ]);

            s = new StepNode(0);
            s.parseLine(
                '{{var}} = Click \'something \\\\ \'\' "something2 "" [\\\'he\\\' re] {blah} {{blah2}}',
                'file.txt',
                10
            );
            assert.deepEqual(s.getVarsBeingSet(), [
                {
                    name: 'var',
                    value: 'Click \'something \\\\ \'\' "something2 "" [\\\'he\\\' re] {blah} {{blah2}}',
                    isLocal: true
                }
            ]);
        });

        it('parses {{var}} = \'string\'', () => {
            s = new StepNode(0);
            s.parseLine('{{var}} = \'foo \\\'\'', 'file.txt', 10);
            assert.deepEqual(s.getVarsBeingSet(), [{ name: 'var', value: '\'foo \\\'\'', isLocal: true }]);

            s = new StepNode(0);
            s.parseLine('{{var}} = "foo \\""', 'file.txt', 10);
            assert.deepEqual(s.getVarsBeingSet(), [{ name: 'var', value: '"foo \\""', isLocal: true }]);

            s = new StepNode(0);
            s.parseLine('{{var}} = [foo \'bar\'\\[\\]]', 'file.txt', 10);
            assert.deepEqual(s.getVarsBeingSet(), [{ name: 'var', value: '[foo \'bar\'\\[\\]]', isLocal: true }]);
        });

        it('parses multiple {var} = \'string literal\', separated by commas', () => {
            s.parseLine('{var1} = \'one\', {{var2}}=\'two 2\', {var 3}= "three 3",{var4}=[four "4"] +', 'file.txt', 10);
            assert.deepEqual(s.getVarsBeingSet(), [
                { name: 'var1', value: '\'one\'', isLocal: false },
                { name: 'var2', value: '\'two 2\'', isLocal: true },
                { name: 'var 3', value: '"three 3"', isLocal: false },
                { name: 'var4', value: '[four "4"]', isLocal: false }
            ]);
        });

        it('doesn\'t recognize {vars} with backslashes in their names', () => {
            s.parseLine('{var\\} = Click \'something \\{blah\\}\' {foo}', 'file.txt', 10);
            assert.deepEqual(s.getVarsBeingSet(), []);
        });
    });

    describe('getFunctionCallText()', () => {
        it('returns function call text for a function call', () => {
            const s = new StepNode(0);
            s.isFunctionCall = true;
            s.text = 'Function call';
            expect(s.getFunctionCallText()).to.equal('Function call');
        });

        it('returns function call text for a function call in form {var} = F', () => {
            const s = new StepNode(0);
            s.isFunctionCall = true;
            s.text = '{var} = Function call';
            expect(s.getFunctionCallText()).to.equal('Function call');
        });

        it('returns null for a non-function call', () => {
            const s = new StepNode(0);
            s.isFunctionCall = false;
            expect(s.getFunctionCallText()).to.equal(null);
        });
    });

    describe('isFunctionMatch()', () => {
        const functionDeclaration = new StepNode(0);
        const functionCall = new StepNode(0);

        it('matches a function call and function declaration with the same text', () => {
            functionDeclaration.parseLine('* Step name here');
            functionCall.parseLine('Step name here');
            expect(functionCall.isFunctionMatch(functionDeclaration)).to.equal(true);
        });

        it('doesn\'t match a function call and function declaration with different text', () => {
            functionDeclaration.parseLine('* Step name here');
            functionCall.parseLine('Different name here');
            expect(functionCall.isFunctionMatch(functionDeclaration)).to.equal(false);
        });

        it('matches a function call and function declaration with the same text but differing amounts of whitespace', () => {
            functionDeclaration.parseLine('* Step name here');
            functionCall.parseLine('  Step  name here ');
            expect(functionCall.isFunctionMatch(functionDeclaration)).to.equal(true);
        });

        it('matches a function call and function declaration with a single quote', () => {
            functionDeclaration.parseLine('* I don\'t know');
            functionCall.parseLine('I don\'t know');
            expect(functionCall.isFunctionMatch(functionDeclaration)).to.equal(true);
        });

        it('matches a function call and function declaration with an escaped single quote', () => {
            functionDeclaration.parseLine('* I don\\\'t know');
            functionCall.parseLine('I don\\\'t know');
            expect(functionCall.isFunctionMatch(functionDeclaration)).to.equal(true);

            functionDeclaration.parseLine('* I don\'t know');
            functionCall.parseLine('I don\\\'t know');
            expect(functionCall.isFunctionMatch(functionDeclaration)).to.equal(true);

            functionDeclaration.parseLine('* I don\\\'t know');
            functionCall.parseLine('I don\'t know');
            expect(functionCall.isFunctionMatch(functionDeclaration)).to.equal(true);
        });

        it('matches a function call and function declaration with multiple escaped single quotes', () => {
            functionDeclaration.parseLine('* I don\\\'t k\\\'now');
            functionCall.parseLine('I don\\\'t k\\\'now');
            expect(functionCall.isFunctionMatch(functionDeclaration)).to.equal(true);

            functionDeclaration.parseLine('* I don\'t k\\\'now');
            functionCall.parseLine('I don\\\'t k\'now');
            expect(functionCall.isFunctionMatch(functionDeclaration)).to.equal(true);

            functionDeclaration.parseLine('* I don\\\'t k\\\'now');
            functionCall.parseLine('I don\'t k\\\'now');
            expect(functionCall.isFunctionMatch(functionDeclaration)).to.equal(true);
        });

        it('matches a function call and function declaration with an escaped single quote preceded with a backslash', () => {
            functionDeclaration.parseLine('* I don\\\\\'t know');
            functionCall.parseLine('I don\\\\\'t know');
            expect(functionCall.isFunctionMatch(functionDeclaration)).to.equal(true);
        });

        it('matches a function call and function declaration with a double quote', () => {
            functionDeclaration.parseLine('* I don"t know');
            functionCall.parseLine('I don"t know');
            expect(functionCall.isFunctionMatch(functionDeclaration)).to.equal(true);
        });

        it('matches a function call and function declaration with an escaped double quote', () => {
            functionDeclaration.parseLine('* I don\\"t know');
            functionCall.parseLine('I don\\"t know');
            expect(functionCall.isFunctionMatch(functionDeclaration)).to.equal(true);

            functionDeclaration.parseLine('* I don"t know');
            functionCall.parseLine('I don\\"t know');
            expect(functionCall.isFunctionMatch(functionDeclaration)).to.equal(true);

            functionDeclaration.parseLine('* I don\\"t know');
            functionCall.parseLine('I don"t know');
            expect(functionCall.isFunctionMatch(functionDeclaration)).to.equal(true);
        });

        it('matches a function call and function declaration with multiple escaped double quotes', () => {
            functionDeclaration.parseLine('* I don\\"t k\\"now');
            functionCall.parseLine('I don\\"t k\\"now');
            expect(functionCall.isFunctionMatch(functionDeclaration)).to.equal(true);

            functionDeclaration.parseLine('* I don\\"t k"now');
            functionCall.parseLine('I don"t k\\"now');
            expect(functionCall.isFunctionMatch(functionDeclaration)).to.equal(true);

            functionDeclaration.parseLine('* I don\\"t k\\"now');
            functionCall.parseLine('I don"t k\\"now');
            expect(functionCall.isFunctionMatch(functionDeclaration)).to.equal(true);
        });

        it('matches a function call and function declaration with an escaped double quote preceded with a backslash', () => {
            functionDeclaration.parseLine('* I don\\\\"t know');
            functionCall.parseLine('I don\\\\"t know');
            expect(functionCall.isFunctionMatch(functionDeclaration)).to.equal(true);
        });

        it('matches a function call and function declaration with multiple escaped brackets', () => {
            functionDeclaration.parseLine('* I [do not know');
            functionCall.parseLine('I \\[do not know');
            expect(functionCall.isFunctionMatch(functionDeclaration)).to.equal(true);

            functionDeclaration.parseLine('* I \\[do not know');
            functionCall.parseLine('I \\[do not know');
            expect(functionCall.isFunctionMatch(functionDeclaration)).to.equal(true);

            functionDeclaration.parseLine('* I \\[do not know');
            functionCall.parseLine('I [do not know');
            expect(functionCall.isFunctionMatch(functionDeclaration)).to.equal(true);
        });

        it('matches a function call and function declaration with multiple escaped brackets', () => {
            functionDeclaration.parseLine('* I [do not\\] know');
            functionCall.parseLine('I \\[do not] know');
            expect(functionCall.isFunctionMatch(functionDeclaration)).to.equal(true);

            functionDeclaration.parseLine('* I \\[do not\\] know');
            functionCall.parseLine('I \\[do not\\] know');
            expect(functionCall.isFunctionMatch(functionDeclaration)).to.equal(true);
        });

        it('matches a function call and function declaration with an escaped bracket preceded with a backslash', () => {
            functionDeclaration.parseLine('* I \\\\[do not know');
            functionCall.parseLine('I \\\\[do not know');
            expect(functionCall.isFunctionMatch(functionDeclaration)).to.equal(true);
        });

        it('matches a function call and function declaration if they match case insensitively', () => {
            functionDeclaration.parseLine('* Step name here');
            functionCall.parseLine('step name here');
            functionCall.filename = 'filename.txt';
            functionCall.lineNumber = 10;
            expect(functionCall.isFunctionMatch(functionDeclaration)).to.equal(true);
        });

        it('matches a function declaration with {{vars}} and a function call with {{vars}}, {vars}, \'strings\', "strings", and [strings]', () => {
            functionDeclaration.parseLine('* Step {{var1}} and {{var2}} {{var3}} also {{var4}}, {{var5}}');
            functionCall.parseLine('Step {{varA}} and  {varB} \'string C\' also "stringD", [4th \'Login\' button]');
            expect(functionCall.isFunctionMatch(functionDeclaration)).to.equal(true);
        });

        it('matches a function declaration with {{vars}} and a function call with {{vars}}, {vars}, \'strings\', "strings", [strings], and escaped single and double quotes', () => {
            functionDeclaration.parseLine('* Step {{var1}} a\\\'nd {{var2}} {{var3}} \\\'al\\"so {{var4}}, {{var5}}');
            functionCall.parseLine(
                'Step {{varA}} a\\\'nd  {varB} \'string C\' \\\'al\\"so "stringD", [4th \'Login\' button]'
            );
            expect(functionCall.isFunctionMatch(functionDeclaration)).to.equal(true);

            functionDeclaration.parseLine('* Step {{var1}} a\'nd {{var2}} {{var3}} al"so {{var4}}, {{var5}}');
            functionCall.parseLine(
                'Step {{varA}} a\\\'nd  {varB} \'string C\' al\\"so "stringD", [4th \'Login\' button]'
            );
            expect(functionCall.isFunctionMatch(functionDeclaration)).to.equal(true);
        });

        it('doesn\'t match a function declaration with {{vars}} and a function call with extra text at the end', () => {
            functionDeclaration.parseLine('* Step {{var1}}');
            functionCall.parseLine('Step \'one\' two three');
            expect(functionCall.isFunctionMatch(functionDeclaration)).to.equal(false);
        });

        it('doesn\'t match a function declaration with {{vars}} and a function call with extra {vars} at the end', () => {
            functionDeclaration.parseLine('* Step {{var1}}');
            functionCall.parseLine('Step {varA} {varB}');
            expect(functionCall.isFunctionMatch(functionDeclaration)).to.equal(false);
        });

        it('doesn\'t match a function declaration with {{vars}} and a function call with extra \'strings\' at the end', () => {
            functionDeclaration.parseLine('* Step {{var1}}');
            functionCall.parseLine('Step \'stringA\' \'stringB\'');
            expect(functionCall.isFunctionMatch(functionDeclaration)).to.equal(false);
        });

        it('doesn\'t match a function declaration with {{vars}} and a function call with extra [string] at the end', () => {
            functionDeclaration.parseLine('* Step {{var1}}');
            functionCall.parseLine('Step {varA} [\'element\' finderB]');
            expect(functionCall.isFunctionMatch(functionDeclaration)).to.equal(false);
        });

        it('doesn\'t match a function declaration with a function call with extra text at the end', () => {
            functionDeclaration.parseLine('* Step one two');
            functionCall.parseLine('Step   one  two   three  ');
            expect(functionCall.isFunctionMatch(functionDeclaration)).to.equal(false);
        });

        it('doesn\'t match a function declaration with extra text at the end with a function call', () => {
            functionDeclaration.parseLine('* Step   one  two   three  ');
            functionCall.parseLine('Step one two');
            expect(functionCall.isFunctionMatch(functionDeclaration)).to.equal(false);
        });

        it('matches a function call and function declaration with the same gherkin keyword', () => {
            functionDeclaration.parseLine('* Given step name here');
            functionCall.parseLine('Given step name here');
            expect(functionCall.isFunctionMatch(functionDeclaration)).to.equal(true);
        });

        it('matches a function call with gherkin a and function declaration without gherkin', () => {
            functionDeclaration.parseLine('* step name here');
            functionCall.parseLine('Given step name here');
            expect(functionCall.isFunctionMatch(functionDeclaration)).to.equal(true);
        });
    });

    describe('serialize()', () => {
        it('returns a serialized object', () => {
            const s = new StepNode(1);
            s.text = 'Foobar';
            s.filename = 'file.txt';
            s.lineNumber = 10;
            s.isTextualStep = true;
            s.parent = null;
            s.children = [new StepNode(2), new StepNode(3)];

            const o = s.serialize();

            Comparer.expect(o).to.match({
                $exact: true,

                id: 1,
                text: 'Foobar',
                filename: 'file.txt',
                lineNumber: 10,
                isTextualStep: true,
                hasCodeBlock: false
            });
        });
    });
});
