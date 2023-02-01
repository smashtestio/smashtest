/* globals describe, it */
import chai from 'chai';
import * as utils from '../../src/core/utils.js';

const expect = chai.expect;
const assert = chai.assert;

describe('Utils', () => {
    describe('stripQuotes()', () => {
        it('strips quotes', () => {
            expect(utils.stripQuotes('"foobar"')).to.equal('foobar');
            expect(utils.stripQuotes('  "foobar"  ')).to.equal('foobar');
            expect(utils.stripQuotes('\'foobar\'')).to.equal('foobar');
            expect(utils.stripQuotes('  \'foobar\'  ')).to.equal('foobar');
            expect(utils.stripQuotes('[foobar]')).to.equal('foobar');
            expect(utils.stripQuotes('  [foobar]  ')).to.equal('foobar');
        });

        it('doesn\'t touch non-quotes', () => {
            expect(utils.stripQuotes('foobar')).to.equal('foobar');
            expect(utils.stripQuotes('  foobar  ')).to.equal('  foobar  ');
        });
    });

    describe('hasQuotes()', () => {
        it('determines if a string has quotes', () => {
            expect(utils.hasQuotes('"foobar"')).to.equal(true);
            expect(utils.hasQuotes('  "foobar"  ')).to.equal(true);
            expect(utils.hasQuotes('\'foobar\'')).to.equal(true);
            expect(utils.hasQuotes('  \'foobar\'  ')).to.equal(true);

            expect(utils.hasQuotes('foobar')).to.equal(false);
            expect(utils.hasQuotes('  foobar  ')).to.equal(false);
        });
    });

    describe('escapeBackticks()', () => {
        it('escapes backticks', () => {
            expect(utils.escapeBackticks('foo`&amp;"\'b`a`r`')).to.equal('foo&#96;&amp;amp;"\'b&#96;a&#96;r&#96;');
        });
    });

    describe('unescapeBackticks()', () => {
        it('unescapes backticks', () => {
            expect(utils.unescapeBackticks('foo&#96;&amp;amp;"\'b&#96;a&#96;r&#96;')).to.equal('foo`&amp;"\'b`a`r`');
        });
    });

    describe('escape()', () => {
        it('escapes special chars', () => {
            expect(utils.escape('\n\t')).to.equal('\\n\\t');
            expect(utils.escape('\'"')).to.equal('\\\'\\"');
            expect(utils.escape('\\\n\r\t\\n\\r\\t/')).to.equal('\\\\\\n\\r\\t\\\\n\\\\r\\\\t/');
        });

        it('escapes empty string', () => {
            expect(utils.escape('')).to.equal('');
        });

        it('escapes normal string', () => {
            expect(utils.escape('foobar')).to.equal('foobar');
        });
    });

    describe('unescape()', () => {
        it('unescapes special chars', () => {
            expect(utils.unescape('\\n\\t')).to.equal('\n\t');
            expect(utils.unescape('\\\'\\"')).to.equal('\'"');
            expect(utils.unescape('\\\\\\n\\r\\t\\0\\\\n\\\\r\\\\t\\/')).to.equal('\\\n\r\t\0\\n\\r\\t/');
        });

        it('unescapes empty string', () => {
            expect(utils.unescape('')).to.equal('');
        });

        it('unescapes normal string', () => {
            expect(utils.unescape('foobar')).to.equal('foobar');
        });
    });

    describe('canonicalize()', () => {
        it('generates canonical text', () => {
            expect(utils.canonicalize(' After   EVERY Branch  ')).to.equal('after every branch');
        });
    });

    describe('keepCaseCanonicalize()', () => {
        it('generates canonical text but keeps casing', () => {
            expect(utils.keepCaseCanonicalize(' After   EVERY Branch  ')).to.equal('After EVERY Branch');
        });
    });

    describe('numIndents()', () => {
        it('counts spaces properly', () => {
            assert.equal(utils.numIndents('m ', 'file.txt', 10), 0);
            assert.equal(utils.numIndents('blah', 'file.txt', 10), 0);
            assert.equal(utils.numIndents('    blah blah', 'file.txt', 10), 1);
            assert.equal(utils.numIndents('        blah  \t ', 'file.txt', 10), 2);
        });

        it('throws an exception for non-whitespace at the beginning of a step', () => {
            assert.throws(() => {
                utils.numIndents('\tblah', 'file.txt', 10);
            }, 'Spaces are the only type of whitespace allowed at the beginning of a step [file.txt:10]');

            assert.throws(() => {
                utils.numIndents(' \tblah', 'file.txt', 10);
            }, 'Spaces are the only type of whitespace allowed at the beginning of a step [file.txt:10]');
        });

        it('throws an exception for a number of spaces not a multiple of 4', () => {
            assert.throws(() => {
                utils.numIndents(' blah', 'file.txt', 10);
            }, 'The number of spaces at the beginning of a line must be a multiple of 4. You have 1 space. [file.txt:10]');

            assert.throws(() => {
                utils.numIndents('  blah', 'file.txt', 10);
            }, 'The number of spaces at the beginning of a line must be a multiple of 4. You have 2 spaces. [file.txt:10]');

            assert.throws(() => {
                utils.numIndents('   blah', 'file.txt', 10);
            }, 'The number of spaces at the beginning of a line must be a multiple of 4. You have 3 spaces. [file.txt:10]');

            assert.throws(() => {
                utils.numIndents('     blah', 'file.txt', 10);
            }, 'The number of spaces at the beginning of a line must be a multiple of 4. You have 5 spaces. [file.txt:10]');
        });

        it('returns 0 for an empty string or all-whitespace string', () => {
            assert.equal(utils.numIndents('', 'file.txt', 10), 0);
            assert.equal(utils.numIndents(' ', 'file.txt', 10), 0);
            assert.equal(utils.numIndents('  ', 'file.txt', 10), 0);
            assert.equal(utils.numIndents('     ', 'file.txt', 10), 0);
            assert.equal(utils.numIndents('        ', 'file.txt', 10), 0);
            assert.equal(utils.numIndents('    \t   ', 'file.txt', 10), 0);
        });

        it('returns 0 for a string that\'s entirely a comment', () => {
            assert.equal(utils.numIndents('//', 'file.txt', 10), 0);
            assert.equal(utils.numIndents('// blah', 'file.txt', 10), 0);
            assert.equal(utils.numIndents('//blah', 'file.txt', 10), 0);
            assert.equal(utils.numIndents(' //', 'file.txt', 10), 0);
            assert.equal(utils.numIndents(' // blah', 'file.txt', 10), 0);
            assert.equal(utils.numIndents(' //blah', 'file.txt', 10), 0);
            assert.equal(utils.numIndents('    //', 'file.txt', 10), 0);
            assert.equal(utils.numIndents('    // blah', 'file.txt', 10), 0);
            assert.equal(utils.numIndents('    //blah', 'file.txt', 10), 0);
        });
    });

    describe('getIndentWhitespace()', () => {
        it('returns indents', () => {
            expect(utils.getIndentWhitespace(0)).to.equal('');
            expect(utils.getIndentWhitespace(1)).to.equal('    ');
            expect(utils.getIndentWhitespace(2)).to.equal('        ');
            expect(utils.getIndentWhitespace(3)).to.equal('            ');

            expect(utils.getIndentWhitespace(0, 2)).to.equal('');
            expect(utils.getIndentWhitespace(1, 2)).to.equal('  ');
            expect(utils.getIndentWhitespace(2, 2)).to.equal('    ');
        });
    });

    describe('copyProps()', () => {
        it('copies properies', () => {
            const source = {
                one: 1,
                two: '2',
                three: 0,
                four: undefined,
                five: null,
                six: 6
            };

            const destination = {
                two: 222
            };

            utils.copyProps(destination, source, ['one', 'two', 'three', 'four', 'five']);

            expect(destination).to.eql({
                one: 1,
                two: '2',
                three: 0,
                five: null
            });
        });
    });

    describe('addWhitespaceToEnd()', () => {
        it('adds whitespace to the end of a string', () => {
            expect(utils.addWhitespaceToEnd('', 1)).to.equal(' ');
            expect(utils.addWhitespaceToEnd('1234', 7)).to.equal('1234   ');
        });

        it('doesn\'t add whitespace to the end of a string if it\'s long enough', () => {
            expect(utils.addWhitespaceToEnd('', 0)).to.equal('');
            expect(utils.addWhitespaceToEnd('1234', 0)).to.equal('1234');
            expect(utils.addWhitespaceToEnd('1234', 3)).to.equal('1234');
            expect(utils.addWhitespaceToEnd('1234', 4)).to.equal('1234');
        });
    });

    describe('es5()', () => {
        it('converts a function to es5 with helpers included', () => {
            const fn = async (...args) => args;
            expect(utils.es5(fn).toString().length).to.be.gt(2000);
        });
    });
});
