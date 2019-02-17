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
     * @return {Integer} The number of indents in step (where each SPACES_PER_INDENT spaces counts as 1 indent)
     * @throws {Error} If there are an invalid number of spaces, or invalid whitespace chars, at the beginning of the step
     */
    numIndents(step, filename, lineNumber) {
        var spacesAtFront = step.match(/^( *)[^ |$]/);
        var whitespaceAtFront = step.match(/^(\s*)[^\s|$]/);

        if(spacesAtFront[1] != whitespaceAtFront[1]) {
            this.error("Spaces are the only type of whitespace allowed at the beginning of a step", filename, lineNumber);
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
        // Explanation: Optional *, then alternating text or "string literal" or 'string literal' (non-greedy), then identifiers, then { and code, or // and a comment
        const LINE_REGEX = /^\s*(\*\s+)?(('([^\\']|(\\\\)*\\.)*'|"([^\\"]|(\\\\)*\\.)*"|.*?)+?)((\s+(\-T|\-M|\-|\~|\~\~|\+|\.\.|\#))*)(\s+(\{[^\}]*$))?(\s*(\/\/.*))?\s*$/;
        // Matches "string" or 'string', handles escaped \ and "
        const STRING_LITERAL_REGEX_WHOLE = /^('([^\\']|(\\\\)*\\.)*'|"([^\\"]|(\\\\)*\\.)*")$/;
        const STRING_LITERAL_REGEX = /'([^\\']|(\\\\)*\\.)*'|"([^\\"]|(\\\\)*\\.)*"/g;
        // Matches {var1} = Val1, {var2} = Val2, {{var3}} = Val3, etc. (minimum one {var}=Val)
        const VARS_SET_REGEX = /^(\s*((\{[^\{\}\\]+\})|(\{\{[^\{\}\\]+\}\}))\s*\=\s*(('([^\\']|(\\\\)*\\.)*'|"([^\\"]|(\\\\)*\\.)*"|.*?)+?)\s*)(\,\s*((\{[^\{\}\\]+\})|(\{\{[^\{\}\\]+\}\}))\s*\=\s*(('([^\\']|(\\\\)*\\.)*'|"([^\\"]|(\\\\)*\\.)*"|.*?)+?)\s*)*$/;
        // Matches {var} or {{var}}
        const VAR_REGEX = /\{[^\{\}\\]+\}|\{\{[^\{\}\\]+\}\}/g;

        var matches = line.match(LINE_REGEX);
        if(!matches) {
            this.error("This step is not written correctly", filename, lineNumber); // NOTE: probably unreachable (LINE_REGEX can match anything)
        }

        var step = new Step();
        step.filename = filename;
        step.lineNumber = lineNumber;

        // Parsed parts of the line
        step.line = line;
        step.text = matches[2];
        step.identifiers = matches[8] ? matches[8].trim().split(/\s+/) : undefined;
        step.codeBlock = matches[12] ? matches[12].substring(1) : undefined; // substring() strips off leading {
        step.comment = matches[14];

        // *Function Declarations
        step.isFunctionDeclaration = (matches[1] ? matches[1].trim() == '*' : undefined);
        if(step.isFunctionDeclaration && step.text.match(STRING_LITERAL_REGEX)) {
            this.error("A *Function declaration cannot have \"strings\" inside of it", filename, lineNumber);
        }

        // Must Test
        const MUST_TEST_REGEX = /^\s*Must Test\s+(.*?)\s*$/;
        matches = step.text.match(MUST_TEST_REGEX);
        if(matches) {
            if(step.isFunctionDeclaration) {
                this.error("A *Function cannot start with Must Test", filename, lineNumber);
            }

            step.isMustTest = true;
            step.mustTestText = matches[1];
        }

        // Identifier booleans
        if(step.identifiers) {
            step.isToDo = step.identifiers.includes('-T') ? true : undefined;
            step.isManual = step.identifiers.includes('-M') ? true : undefined;
            step.isTextualStep = step.identifiers.includes('-') ? true : undefined;
            step.isDebug = step.identifiers.includes('~') ? true : undefined;
            step.isStepByStepDebug = step.identifiers.includes('~~') ? true : undefined;
            step.isNonParallel = step.identifiers.includes('+') ? true : undefined;
            step.isSequential = step.identifiers.includes('..') ? true : undefined;
            step.isExpectedFail = step.identifiers.includes('#') ? true : undefined;
        }

        if(!step.isTextualStep && !step.isFunctionDeclaration) {
            step.isFunctionCall = true;
        }

        if(typeof step.codeBlock != 'undefined' && step.isTextualStep) {
            this.error("A textual step (-) cannot have a code block a well", filename, lineNumber);
        }
        if(step.isFunctionDeclaration && step.isTextualStep) {
            this.error("A *Function declaration cannot be a textual step (-) as well", filename, lineNumber);
        }

        // Parse {var1} = Val1, {var2} = Val2, {{var3}} = Val3, etc. from text into step.varsBeingSet
        if(step.text.match(VARS_SET_REGEX)) {
            if(step.isFunctionDeclaration) {
                this.error("A step setting {variables} cannot start with a *", filename, lineNumber);
            }

            var textCopy = step.text + "";
            step.varsBeingSet = [];
            while(textCopy.trim() != "") {
                matches = textCopy.match(VARS_SET_REGEX);
                if(!matches) {
                    this.error("A part of this line doesn't properly set a variable", filename, lineNumber); // NOTE: probably unreachable
                }

                if(matches[2].match(/"|'/g)) {
                    this.error("You cannot have quotes inside a {variable} that you're setting", filename, lineNumber);
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
                        this.error("When multiple {variables} are being set on a single line, those {variables} can only be set to 'string constants'", filename, lineNumber);
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
                var isLocal = match.startsWith('{{');

                if(step.isFunctionDeclaration && !isLocal) {
                    this.error("All variables in a *Function declaration must be {{local}}. {" + name + "} is not.", filename, lineNumber);
                }

                var elementFinder = this.parseElementFinder(name);
                if(elementFinder) {
                    step.varsList.push({
                        name: name,
                        isLocal: isLocal,
                        elementFinder: elementFinder
                    });
                }
                else {
                    step.varsList.push({
                        name: name,
                        isLocal: isLocal
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
                    this.error("{variable} names containing quotes must be valid ElementFinders", filename, lineNumber);
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
        var lines = buffer.split(/[\r\n|\r|\n]/);

        var lastLineIndents = 0; // number of indents on the last line we saw (doesn't include lines within code blocks or empty lines)
        var lastStepInserted = this.root;

        var currentlyInsideCodeBlockFromLineNum = -1; // if we're currently inside a code block, that code block started on this line, otherwise -1

        // Put steps here as they are inserted into the tree.
        // If later they're confirmed to be part of a step block, combine them into a StepBlock and insert that into the tree instead.
        var potentialStepBlockCandidates = [];
        var potentialStepBlockIsSequential = false; // is the potential step block sequential (..)?

        for(var i = 0; i < lines.length; i++) {
            var line = lines[i];
            var currLineIndents = this.numIndents(step, filename, i + 1);

            if(currentlyInsideCodeBlockFromLineNum > 0) {
                if(line.match(new RegExp("[ ]{" + (lastLineIndents * SPACES_PER_INDENT) + ",}\}\s*(\/\/.*?)?\s*"))) { // code block is ending
                    currentlyInsideCodeBlockFromLineNum = -1;
                }
                else {
                    lastStepInserted.codeBlock += ("\n" + line);
                }
            }
            else if(line.match(/^\s*$/)) { // line is empty
                flushStepBlockCandidates();
            }
            else { // line is a normal step
                var step = this.parseLine(lines[i], filename, i + 1);

                if(step == '..') {
                    potentialStepBlockIsSequential = true;
                }
                else {
                    // Insert the new step into the tree, based on the number of indents it has








                    // If this is the start of a new code block
                    if(typeof step.codeBlock != 'undefined') {
                        currentlyInsideCodeBlockFromLineNum = i + 1;
                        clearStepBlockCandidates();
                    }
                }

                lastLineIndents = currLineIndents;
            }
        }

        // If we're still inside a code block, and EOF was reached, complain that a code block is not closed
        if(currentlyInsideCodeBlockFromLineNum > 0) {
            this.error("An unclosed code block was found", filename, currentlyInsideCodeBlockFromLineNum);
        }

        flushStepBlockCandidates();

        /**
         * If there are steps inside potentialStepBlockCandidates, puts them into a StepBlock and puts that into the tree instead.
         */
        function flushStepBlockCandidates() {
            if(potentialStepBlockCandidates.length > 0) {
                var stepblock = new StepBlock();
                if(potentialStepBlockIsSequential) {
                    stepblock.isSequential = true; // isSequential is undefined otherwise
                }
                var parent = potentialStepBlockCandidates[0].parent;

                // Put new StepBlock into parent of the candidates
                stepblock.parent = parentOfPotentialStepBlockCandidates;
                parent.children.push(stepblock);

                // Put candidates into the StepBlock
                for(var i = 0; i < potentialStepBlockCandidates.length; i++) {
                    stepblock.steps.push(potentialStepBlockCandidates[i]);
                }

                // Remove the candidates from their parent, as they're in the StepBlock now
                parent.children = parent.children.filter(function(value) {
                    return !stepblock.steps.includes(value);
                });

                // Clear out candidates, as they're in the StepBlock now
                clearStepBlockCandidates();
            }
        }

        /**
         * Clears out the potential step block candidates
         */
        function clearStepBlockCandidates() {
            potentialStepBlockCandidates = [];
            potentialStepBlockIsSequential = false;
        }
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
