const StepBlock = require('./stepblock.js');
const Step = require('./step.js');

const SPACES_PER_INDENT = 4;

/**
 * Represents the test tree
 */
class Tree {
    constructor() {
        this.root = new Step();
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
     * @return {String} String representing the given filename a line number, appropriate for logging or console output
     */
    filenameAndLine(filename, lineNumber) {
        return "[" + filename + ":" + lineNumber + "]";
    }

    /**
     * Parses in a line and converts it to a Step object
     * @param {String} line - The full text of the line
     * @param {String} filename - The filename of the file where the step is
     * @param {Integer} lineNumber - The line number of the step
     * @return {Step} The Step object representing this parsed step, null if this is an empty line, '..' if the whole line is just '..'
     * @throws {Error} If there is a parse error
     */
    parseLine(line, filename, lineNumber) {
        if(line.trim() == "") {
            return null;
        }

        if(line.trim() == "..") {
            return '..';
        }

        // Matches any well-formed non-empty line
        // Explanation: Optional *, then alternating text or "string literal" or 'string literal' (non-greedy), then identifiers (with * being first), then { and code, or // and a comment
        const LINE_REGEX = /^\s*(\*\s+)?(('([^\\']|(\\\\)*\\.)*'|"([^\\"]|(\\\\)*\\.)*"|.*?)+?)(\s+\*)?((\s+(\-TODO|\-MANUAL|\~|\~\~|\+|\.\.|\#))*)(\s+(\{[^\}]*$))?(\s*(\/\/.*))?\s*$/;
        // Matches a 'string literal', handles escaped \ and '
        const SINGLE_QUOTE_STRING_LITERAL = /'([^\\']|(\\\\)*\\.)*'/g;
        const SINGLE_QUOTE_STRING_LITERAL_WHOLE = /^'([^\\']|(\\\\)*\\.)*'$/;
        // Matches a "string literal", handles escaped \ and "
        const DOUBLE_QUOTE_STRING_LITERAL = /"([^\\"]|(\\\\)*\\.)*"/g;
        const DOUBLE_QUOTE_STRING_LITERAL_WHOLE = /^"([^\\"]|(\\\\)*\\.)*"$/;

        var matches = line.match(LINE_REGEX);
        if(!matches) {
            throw new Error("This step is not written correctly. " + this.filenameAndLine(filename, lineNumber));
        }

        var step = new Step();
        step.filename = filename;
        step.lineNumber = lineNumber;

        // Parsed parts of the line
        step.line = line;
        step.text = matches[2];
        step.identifiers = matches[9] ? matches[9].trim().split(/\s+/) : undefined;
        step.codeBlock = matches[13] ? matches[13].substring(1) : undefined; // substring() strips off leading {
        step.comment = matches[15];

        // Identifier booleans
        step.isFunctionCall = (matches[8] ? matches[8].trim() == '*' : undefined);
        step.isFunction = (matches[1] ? matches[1].trim() == '*' : undefined);
        if(step.isFunctionCall && step.isFunction) {
            throw new Error("A step cannot be both a '* Function Declaration' and a 'Function Call *'. " + this.filenameAndLine(filename, lineNumber));
        }

        if(step.identifiers) {
            step.isTODO = step.identifiers.includes('-TODO') ? true : undefined;
            step.isMANUAL = step.identifiers.includes('-MANUAL') ? true : undefined;
            step.isDebug = step.identifiers.includes('~') ? true : undefined;
            step.isStepByStepDebug = step.identifiers.includes('~~') ? true : undefined;
            step.isNonParallel = step.identifiers.includes('+') ? true : undefined;
            step.isSequential = step.identifiers.includes('..') ? true : undefined;
            step.isExpectedFail = step.identifiers.includes('#') ? true : undefined;
        }

        // Matches {var1} = Step1, {var2} = Step2, {{var3}} = Step3, etc.
        const VARS_SET_REGEX = /^(\s*((\{[^\{\}]+\})|(\{\{[^\{\}]+\}\}))\s*\=\s*(('([^\\']|(\\\\)*\\.)*'|"([^\\"]|(\\\\)*\\.)*"|.*?)+?)\s*)(\,\s*((\{[^\{\}]+\})|(\{\{[^\{\}]+\}\}))\s*\=\s*(('([^\\']|(\\\\)*\\.)*'|"([^\\"]|(\\\\)*\\.)*"|.*?)+?)\s*)*$/;
        // Matches {var} or {{var}}
        const VAR_REGEX = /\{[^\{\}]+\}|\{\{[^\{\}]+\}\}/g;

        // Parse {var1} = Step1, {var2} = Step2, {{var3}} = Step3, etc. from text into step.varsBeingSet
        if(step.text.match(VARS_SET_REGEX)) {
            var textCopy = step.text + "";
            step.varsBeingSet = [];
            while(textCopy.trim() != "") {
                matches = textCopy.match(VARS_SET_REGEX);
                if(!matches) {
                    break;
                }

                step.varsBeingSet.push({
                    name: matches[2].replace(/\{|\}/g, ''),
                    value: matches[5],
                    isLocal: matches[2].includes('{{')
                });

                textCopy = textCopy.replace(matches[1], ''); // strip the leading {var}=Step from the string
                textCopy = textCopy.replace(/^\,/, ''); // string the leading comma, if there is one
            }

            // If there are multiple vars being set, each Step must be a string literal
            if(step.varsBeingSet.length > 1) {
                for(var i = 0; i < step.varsBeingSet.length; i++) {
                    if(!step.varsBeingSet[i].value.match(SINGLE_QUOTE_STRING_LITERAL_WHOLE) && !step.varsBeingSet[i].value.match(DOUBLE_QUOTE_STRING_LITERAL_WHOLE)) {
                        throw new Error("When multiple {variables} are being set on a single line, those {variables} can only be set to 'string constants'. " + this.filenameAndLine(filename, lineNumber));
                    }
                }
            }
        }

        // Create a list of vars contained in this step (including those within quotes)
        matches = step.text.match(VAR_REGEX);
        if(matches) {
            step.varsList = [];
            for(var i = 0; i < matches.length; i++) {
                var match = matches[i];
                step.varsList.push({
                    name: match.replace(/\{|\}/g, ''),
                    isLocal: match.startsWith('{{')
                });
            }
        }

        return step;
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

            this.parseLine(stepLines[i], filename, i);






        }










        // TODO
        // - Handle step blocks
        // - Handle step blocks that start with a .. on top
        // - Handle code blocks, which span multiple lines (code blocks end on a line that starts with '}' and is the
        //      exact number of indents as the step that started the code block)
        //      Add to step.codeBlock



        // TODO: remove this
        /*for(var i = 0; i < stepLines.length; i++) {
            if(stepLines[i] == '') continue;

            var stepObj = new Step(lastStepInserted, stepLines[i], filename, i);

            lastStepInserted.children.push(stepObj);
            lastStepInserted = stepObj;
        }*/
    }
}
module.exports = Tree;
