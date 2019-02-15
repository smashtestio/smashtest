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
     * @return {Step} The Step object representing this parsed step, null if this is an empty line
     * @throws {Error} If there is a parse error
     */
    parseLine(line, filename, lineNumber) {
        if(line.trim() == "") {
            return null;
        }

        // TODO: remove?
        //const LINE_REGEX = /^\s*(\*\s+)?(.*?)(\s+\*)?((\s+(\-TODO|\-MANUAL|\~|\~\~|\+|\.\.|\#(.*?)))*)(\s+(\{.*))?(\s*(\/\/.*))?\s*$/;

        // Matches any well-formed non-empty line
        // Explanation: Optional *, then alternating text or "string literal" or 'string literal' (non-greedy), then identifiers (with * being first), then { and code, or // and a comment
        const LINE_REGEX = /^\s*(\*\s+)?(('([^\\']|(\\\\)*\\.)*'|"([^\\"]|(\\\\)*\\.)*"|.*?)+?)(\s+\*)?((\s+(\-TODO|\-MANUAL|\~|\~\~|\+|\.\.|\#(.*?)))*)(\s+(\{.*))?(\s*(\/\/.*))?\s*$/;
        // Matches a 'string literal', handles escaped \ and '
        const SINGLE_QUOTE_STRING_LITERAL = /'([^\\']|(\\\\)*\\.)*'/g;
        // Matches a "string literal", handles escaped \ and "
        const DOUBLE_QUOTE_STRING_LITERAL = /"([^\\"]|(\\\\)*\\.)*"/g;

        var matches = line.match(LINE_REGEX);
        if(!matches) {
            var errorMsg = "This step is not written correctly. ";

            /*
            TODO: remove this?

            const COMMENT_IN_QUOTES_REGEX = /(\".*\/\/.*\")|(\'.*\/\/.*\')/;
            if(line.match(COMMENT_IN_QUOTES_REGEX)) {
                errorMsg += "Remember, // has to be escaped to \\/\\/ within quotes. "
                // NOTE: in the future, do a better job of parsing so a // inside quotes is treated as part of the quote and not a comment
            }
            */

            throw new Error(errorMsg + this.filenameAndLine(filename, lineNumber));
        }

        var step = new Step();

        // Parsed parts of the line
        step.line = line;
        step.text = matches[2];
        step.identifiers = matches[4].trim().split(/\s+/);
        step.codeBlock = matches[9];
        step.comment = matches[11];

        // If the codeBlock ends in a }, chop it off
        if(step.codeBlock.trim().slice(-1) == "}") {
            step.codeBlock = step.codeBlock.trim().slice(0, -1);
            step.isOneLineCodeBlock = true;
        }

        // Identifier booleans
        step.isFunctionCall = (matches[3].trim() == '*');
        step.isFunction = (matches[1].trim() == '*');
        step.isTODO = step.identifiers.includes('-TODO');
        step.isMANUAL = step.identifiers.includes('-MANUAL');
        step.isDebug = step.identifiers.includes('~');
        step.isStepByStepDebug = step.identifiers.includes('~~');
        step.isNonParallel = step.identifiers.includes('+');
        step.isSequential = step.identifiers.includes('..');
        step.expectedFailNote = step.identifiers.find(identifier => identifier.starsWith('#')) || "";
        step.isExpectedFail = (step.expectedFailNote != "");

        if(step.isExpectedFail) {
            step.expectedFailNote = step.expectedFailNote.substring(1); // strip off leading #
        }

        // Parse {var1} = Step1, {var2} = Step2, {{var3}} = Step3, etc.

        // TODO: include string literal regexes in Step1/2/3, just like in the LINE_REGEX above



        // Matches {var1} = Step1, {var2} = Step2, {{var3}} = Step3, etc.
        const VARS_SET_REGEX = /^(\s*((\{[^\{\}"]+\})|(\{\{[^\{\}"]+\}\}))\s*\=\s*(('([^\\']|(\\\\)*\\.)*'|"([^\\"]|(\\\\)*\\.)*"|.*?)+?)\s*)(\,\s*((\{[^\{\}"]+\})|(\{\{[^\{\}"]+\}\}))\s*\=\s*(('([^\\']|(\\\\)*\\.)*'|"([^\\"]|(\\\\)*\\.)*"|.*?)+?)\s*)*$/;
        // Matches {var1} = Step1
        const VAR_SET_REGEX = /\s*\{([^\{\}"]+)\}\s*\=\s*(('([^\\']|(\\\\)*\\.)*'|"([^\\"]|(\\\\)*\\.)*"|.*?)+?)\s*/;
        // Matches {{var1}} = Step1
        const LOCAL_VAR_SET_REGEX = /\s*\{\{([^\{\}"]+)\}\}\s*\=\s*(('([^\\']|(\\\\)*\\.)*'|"([^\\"]|(\\\\)*\\.)*"|.*?)+?)\s*/;

        matches = step.text.match(VAR_SET_REGEX);
        if(matches) {
            step.varBeingSet = matches[1];
            step.text = matches[2]; // the text without the {var}=
        }
        else {
            matches = step.text.match(LOCAL_VAR_SET_REGEX);
            if(matches) {
                step.localVarBeingSet = matches[1];
                step.text = matches[2]; // the text without the {{var}}=
            }
        }


        // TODO:
        // /"([^\\"]|(\\\\)*\\.)*"/g - match a "string literal" (handles escaped " and \)
        // - Parse the var text
        //      - Handle multiple vars separated by commas (all have to be on one line)
        //      - Create a list of vars that this step depends on (that are contained in this step)
        //      - ElementFinders are converted to their {js object equivalents}







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
        // - Handle code blocks, which may span multiple lines (code blocks end on a line that starts with '}' and is the
        //      exact number of indents as the step that started the code block) OR the { and } are on the same line
        //      Remember that the } at the end of a code block can be followed by a // comment
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
