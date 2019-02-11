var assert = require('assert');

var Tree = require('../tree.js');

describe("Tree", function() {
    describe("parseIn()", function() {
        it.skip("parses a normal line properly", function() {

        });

        it.skip("parses code blocks", function() {

        });

        it.skip("parses comments", function() {

        });

        it.skip("parses variables", function() {

        });

        it.skip("parses functions", function() {

        });
    });

    describe("stripComments()", function() {
        it.skip("strips out a comment", function() {

        });

        it.skip("doesn't intefere with a line that doesn't have comments", function() {

        });

        it.skip("ignores comments inside a double-quote", function() {
            // include \" and \' inside the double-quote
        });

        it.skip("ignores comments inside a single-quote", function() {
            // include \" and \' inside the single-quote
        });
    });

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
});
