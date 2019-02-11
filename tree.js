var StepBlock = require('./stepblock.js');
var Step = require('./step.js');

const SPACES_PER_INDENT = 4;

/**
 * Represents the test tree
 */
class Tree {
    constructor() {
        this.root = new Step();
    }

    /**
     * Parses a string and adds it onto root
     * @param {String} buffer - Contents of a test file
     * @param {String} filename - Name of the test file
     */
    parseIn(buffer, filename) {
        var stepLines = buffer.split(/[\r\n|\r|\n]/);

        var lastStepInserted = this.root;

        for(var i = 0; i < stepLines.length; i++) {
            // numIndents(step, filename, lineNumber);








        }











        // TODO
        // TODO: don't forget about code blocks, which may span multiple lines (code blocks end on a line that starts with '}' and is the exact number of indents as the step that started the code block)



        // TODO: remove this
        for(var i = 0; i < stepLines.length; i++) {
            if(stepLines[i] == '') continue;

            var stepObj = new Step(lastStepInserted, stepLines[i], filename, i);

            lastStepInserted.children.push(stepObj);
            lastStepInserted = stepObj;
        }
    }

    /**
     * @return {String} step, but with comments stripped out. Only // comments are supported, and the // must not be inside a '' or ""
     */
    stripComments(step) {
        // TODO





    }

    /**
     * Validates the given step
     * @throws {Exception} If there's something wrong in step
     */
    validateStr(step, filename, lineNumber) {
        // TODO
    }

    /**
     * @return {Integer} The number of indents in step
     * @throws {Error} If there are an invalid number of spaces, or invalid whitespace chars, at the beginning of the step
     */
    numIndents(step, filename, lineNumber) {
        var spacesAtFront = step.match(/^( *)[^ |$]/);
        var whitespaceAtFront = step.match(/^(\s*)[^\s|$]/);

        if(spacesAtFront[1] != whitespaceAtFront[1]) {
            throw new Error("Spaces are the only type of whitespace allowed at the beginning of a step. " + this.filenameAndLine(filename, lineNumber));
        }
        else if(typeof spacesAtFront[1] == 'undefined') {
            return 0;
        }
        else {
            var numSpaces = spacesAtFront[1].length;
            var numIndents = numSpaces / SPACES_PER_INDENT;

            if(numIndents - Math.floor(numIndents) != 0) {
                throw new Error("The number of spaces at the beginning of a step must be a multiple of " + SPACES_PER_INDENT + ". You have " + numSpaces + " space(s). " + this.filenameAndLine(filename, lineNumber));
            }
            else {
                return numIndents;
            }
        }
    }

    /**
     * @return {Boolean} True if step represents a function, otherwise false
     */
    isFunction(step) {
        // TODO
    }

    /**
     * @return {Node} The Node of the function that step calls, otherwise null
     * @throws {Exception} If step calls a function that doesn't exist
     */
    getFunctionCall(step) {
        // TODO
    }

    /**
     * @return {String} String representing the given filename a line number, appropriate for logging or console output
     */
    filenameAndLine(filename, lineNumber) {
        return "[" + filename + ":" + lineNumber + "]";
    }
}
module.exports = Tree;
