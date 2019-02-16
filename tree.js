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
            this.error("Spaces are the only type of whitespace allowed at the beginning of a step.", filename, lineNumber);
        }
        else if(typeof spacesAtFront[1] == 'undefined') {
            return 0;
        }
        else {
            var numSpaces = spacesAtFront[1].length;
            var numIndents = numSpaces / SPACES_PER_INDENT;

            if(numIndents - Math.floor(numIndents) != 0) {
                this.error("The number of spaces at the beginning of a step must be a multiple of " + SPACES_PER_INDENT + ". You have " + numSpaces + " space(s).", filename, lineNumber);
            }
            else {
                return numIndents;
            }
        }
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
        // Matches "string" or 'string', handles escaped \ and "
        const STRING_LITERAL_REGEX_WHOLE = /^'([^\\']|(\\\\)*\\.)*'|"([^\\"]|(\\\\)*\\.)*"$/;
        const STRING_LITERAL_REGEX = /'([^\\']|(\\\\)*\\.)*'|"([^\\"]|(\\\\)*\\.)*"/g;
        // Matches {var1} = Val1, {var2} = Val2, {{var3}} = Val3, etc. (minimum one {var}=Val)
        const VARS_SET_REGEX = /^(\s*((\{[^\{\}\\]+\})|(\{\{[^\{\}\\]+\}\}))\s*\=\s*(('([^\\']|(\\\\)*\\.)*'|"([^\\"]|(\\\\)*\\.)*"|.*?)+?)\s*)(\,\s*((\{[^\{\}\\]+\})|(\{\{[^\{\}\\]+\}\}))\s*\=\s*(('([^\\']|(\\\\)*\\.)*'|"([^\\"]|(\\\\)*\\.)*"|.*?)+?)\s*)*$/;
        // Matches {var} or {{var}}
        const VAR_REGEX = /\{[^\{\}\\]+\}|\{\{[^\{\}\\]+\}\}/g;

        var matches = line.match(LINE_REGEX);
        if(!matches) {
            this.error("This step is not written correctly.", filename, lineNumber);
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

        // Functions
        step.isFunctionCall = (matches[8] ? matches[8].trim() == '*' : undefined);
        step.isFunctionDeclaration = (matches[1] ? matches[1].trim() == '*' : undefined);
        if(step.isFunctionCall && step.isFunctionDeclaration) {
            this.error("A step cannot have a * on both sides of it.", filename, lineNumber);
        }
        if(step.isFunctionDeclaration && step.text.match(STRING_LITERAL_REGEX)) {
            this.error("A Function Call * cannot have \"strings\" inside of it.", filename, lineNumber);
        }
        if(typeof step.codeBlock != 'undefined' && step.isFunctionCall) {
            this.error("A Function Call * cannot be a code step as well.", filename, lineNumber);
        }

        // Must Test
        const MUST_TEST_REGEX = /^\s*Must Test\s+(.*?)\s*$/;
        matches = step.text.match(MUST_TEST_REGEX);
        if(matches) {
            if(step.isFunctionDeclaration) {
                this.error("A *Function cannot start with Must Test.", filename, lineNumber);
            }

            step.isMustTest = true;
            step.mustTestText = matches[1];
        }

        // Identifier booleans
        if(step.identifiers) {
            step.isTODO = step.identifiers.includes('-TODO') ? true : undefined;
            step.isMANUAL = step.identifiers.includes('-MANUAL') ? true : undefined;
            step.isDebug = step.identifiers.includes('~') ? true : undefined;
            step.isStepByStepDebug = step.identifiers.includes('~~') ? true : undefined;
            step.isNonParallel = step.identifiers.includes('+') ? true : undefined;
            step.isSequential = step.identifiers.includes('..') ? true : undefined;
            step.isExpectedFail = step.identifiers.includes('#') ? true : undefined;
        }

        // Parse {var1} = Val1, {var2} = Val2, {{var3}} = Val3, etc. from text into step.varsBeingSet
        if(step.text.match(VARS_SET_REGEX)) {
            var textCopy = step.text + "";
            step.varsBeingSet = [];
            while(textCopy.trim() != "") {
                matches = textCopy.match(VARS_SET_REGEX);
                if(!matches) {
                    break;
                }

                if(matches[2].match(/"|'/g)) {
                    this.error("You cannot have quotes inside a {variable} that you're setting.", filename, lineNumber);
                }

                step.varsBeingSet.push({
                    name: matches[2].replace(/\{|\}/g, ''),
                    value: matches[5],
                    isLocal: matches[2].includes('{{')
                });

                textCopy = textCopy.replace(matches[1], ''); // strip the leading {var}=Step from the string
                textCopy = textCopy.replace(/^\,/, ''); // string the leading comma, if there is one
            }

            // If there are multiple vars being set, each value must be a string literal
            if(step.varsBeingSet.length > 1) {
                for(var i = 0; i < step.varsBeingSet.length; i++) {
                    if(!step.varsBeingSet[i].value.match(STRING_LITERAL_REGEX_WHOLE)) {
                        this.error("When multiple {variables} are being set on a single line, those {variables} can only be set to 'string constants'.", filename, lineNumber);
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
                var name = match.replace(/\{|\}/g, '');
                var elementFinder = this.parseElementFinder(name);
                if(elementFinder) {
                    step.varsList.push({
                        name: name,
                        isLocal: match.startsWith('{{'),
                        elementFinder: elementFinder
                    });
                }
                else {
                    step.varsList.push({
                        name: name,
                        isLocal: match.startsWith('{{')
                    });
                }
            }
        }

        // If {vars} contain quotes, they must be valid ElementFinders ({vars} to the left of an = have already been vetted for the absence of quotes)
        matches = step.text.match(VAR_REGEX);
        if(matches) {
            for(var i = 0; i < matches.length; i++) {
                var name = matches[i].replace(/\{|\}/g, '');
                if(name.match(/"|'/g) && !this.parseElementFinder(name)) {
                    this.error("{variable} names containing quotes must be valid ElementFinders.", filename, lineNumber);
                }
            }
        }

        return step;
    }

    /**
     * Parses text inside brackets into an ElementFinder
     * @param {String} text - The text to parse, without the brackets ({})
     * @return {Object} An object containing ElementFinder components (text, selector, nextTo - any one of which can be undefined), or null if this is not a valid ElementFinder
     */
    parseElementFinder(name) {
        const ELEMENTFINDER_TEXT = `('[^']+?'|"[^"]+?")`;
        const ELEMENTFINDER_SELECTOR = `([^"']+?)`;
        const ELEMENTFINDER_NEXTTO = `(next\\s+to\\s+('[^']+?'|"[^"]+?"))`;

        var matches = null;
        if(matches = name.match(`^\\s*(` + ELEMENTFINDER_TEXT + `)\\s*$`)) {
            return {text: matches[2].slice(1,-1)};
        }
        else if(matches = name.match(`^\\s*(` + ELEMENTFINDER_TEXT + `\\s+` + ELEMENTFINDER_SELECTOR + `)\\s*$`)) {
            return {text: matches[2].slice(1,-1), selector: matches[3]};
        }
        else if(matches = name.match(`^\\s*(` + ELEMENTFINDER_TEXT + `\\s+` + ELEMENTFINDER_SELECTOR + `\\s+` + ELEMENTFINDER_NEXTTO + `)\\s*$`)) {
            return {text: matches[2].slice(1,-1), selector: matches[3], nextTo: matches[5].slice(1,-1)};
        }
        else if(matches = name.match(`^\\s*(` + ELEMENTFINDER_TEXT + `\\s+` + ELEMENTFINDER_NEXTTO + `)\\s*$`)) {
            return {text: matches[2].slice(1,-1), nextTo: matches[4].slice(1,-1)};
        }
        else if(matches = name.match(`^\\s*(` + ELEMENTFINDER_SELECTOR + `\\s+` + ELEMENTFINDER_NEXTTO + `)\\s*$`)) {
            return {selector: matches[2], nextTo: matches[4].slice(1,-1)};
        }
        else {
            return null;
        }
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

    /**
     * Throws an Error with the given message, filename, and line number
     * @throws {Error}
     */
    error(msg, filename, lineNumber) {
        throw new Error(msg + " " + this.filenameAndLine(filename, lineNumber));
    }

    /**
     * @return {String} String representing the given filename a line number, appropriate for logging or console output
     */
    filenameAndLine(filename, lineNumber) {
        return "[" + filename + ":" + lineNumber + "]";
    }
}
module.exports = Tree;
