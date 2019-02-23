const Step = require('./step.js');
const StepBlock = require('./stepblock.js');
const Branch = require('./branch.js');

const SPACES_PER_INDENT = 4;

// Matches any well-formed non-empty line, in this format:
// Optional *, then alternating text or "string literal" or 'string literal' (non-greedy), then identifiers, then { and code, or // and a comment
const LINE_REGEX = /^\s*(\*\s+)?(('([^\\']|(\\\\)*\\.)*'|"([^\\"]|(\\\\)*\\.)*"|.*?)+?)((\s+(\-T|\-M|\-|\~|\~\~|\+|\.\.|\#))*)(\s+(\{[^\}]*$))?(\s*(\/\/.*))?\s*$/;
// Matches "string" or 'string', handles escaped \ and "
const STRING_LITERAL_REGEX_WHOLE = /^('([^\\']|(\\\\)*\\.)*'|"([^\\"]|(\\\\)*\\.)*")$/;
const STRING_LITERAL_REGEX = /'([^\\']|(\\\\)*\\.)*'|"([^\\"]|(\\\\)*\\.)*"/g;
// Matches {var1} = Val1, {var2} = Val2, {{var3}} = Val3, etc. (minimum one {var}=Val)
const VARS_SET_REGEX = /^(\s*((\{[^\{\}\\]+\})|(\{\{[^\{\}\\]+\}\}))\s*\=\s*(('([^\\']|(\\\\)*\\.)*'|"([^\\"]|(\\\\)*\\.)*"|.*?)+?)\s*)(\,\s*((\{[^\{\}\\]+\})|(\{\{[^\{\}\\]+\}\}))\s*\=\s*(('([^\\']|(\\\\)*\\.)*'|"([^\\"]|(\\\\)*\\.)*"|.*?)+?)\s*)*$/;
// Matches {var} or {{var}}
const VAR_REGEX = /\{[^\{\}\\]+\}|\{\{[^\{\}\\]+\}\}/g;
// Matches [text]
const BRACKET_REGEX = /\[[^\[\]\\]+\]/g;
// Matches Must Test X
const MUST_TEST_REGEX = /^\s*Must Test\s+(.*?)\s*$/;
// Matches an ElementFinder in this format:
// OPTIONAL(1st/2nd/3rd/etc.)   MANDATORY('TEXT' AND/OR VAR-NAME)   OPTIONAL(next to 'TEXT')
const ELEMENTFINDER_REGEX = /^\s*(([0-9]+)(st|nd|rd|th))?\s*(('[^']+?'|"[^"]+?")|([^"']+?)|(('[^']+?'|"[^"]+?")\s+([^"']+?)))\s*(next\s+to\s+('[^']+?'|"[^"]+?"))?\s*$/;

/**
 * Represents the test tree
 */
class Tree {
    constructor() {
        this.root = new Step();  // the root Step of the tree (parsed version of the text that got inputted)
        this.branches = [];      // Array of Branch, generated from this.root
    }

    /**
     * @param {String} line - A single line
     * @param {String} filename - The filename of the file where the line is
     * @param {Integer} lineNumber - The line number
     * @return {Integer} The number of indents in line (where each SPACES_PER_INDENT spaces counts as 1 indent). Always returns 0 for empty string or all whitespace.
     * @throws {Error} If there are an invalid number of spaces, or invalid whitespace chars, at the beginning of the step
     */
    numIndents(line, filename, lineNumber) {
        if(line.match(/^\s*$/)) { //empty string or all whitespace
            return 0;
        }

        var spacesAtFront = line.match(/^( *)([^ ]|$)/);
        var whitespaceAtFront = line.match(/^(\s*)([^\s]|$)/);

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
     * @return {Step} The Step object representing this parsed step. The Step's text will be set to '' if this is an empty line, and to '..' if the whole line is just '..'
     * @throws {Error} If there is a parse error
     */
    parseLine(line, filename, lineNumber) {
        var step = new Step();
        step.line = line;
        step.filename = filename;
        step.lineNumber = lineNumber;

        if(line.trim() == '') {
            step.text = '';
            return step;
        }

        if(line.trim() == '..') {
            step.text = '..';
            return step;
        }

        var matches = line.match(LINE_REGEX);
        if(!matches) {
            this.error("This step is not written correctly", filename, lineNumber); // NOTE: probably unreachable (LINE_REGEX can match anything)
        }

        // Parsed parts of the line
        step.text = matches[2];
        if(matches[8]) {
            step.identifiers = matches[8].trim().split(/\s+/);
        }
        if(matches[12]) {
            step.codeBlock = matches[12].substring(1); // substring() strips off leading {
        }
        if(matches[14]) {
            step.comment = matches[14];
        }

        // *Function Declarations
        if(matches[1]) {
            step.isFunctionDeclaration = matches[1].trim() == '*';
        }
        if(step.isFunctionDeclaration && step.text.match(STRING_LITERAL_REGEX)) {
            this.error("A *Function declaration cannot have \"strings\" inside of it", filename, lineNumber);
        }

        // Must Test
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
            if(step.identifiers.includes('-T')) {
                step.isToDo = true;
            }
            if(step.identifiers.includes('-M')) {
                step.isManual = true;
            }
            if(step.identifiers.includes('-')) {
                step.isTextualStep = true;
            }
            if(step.identifiers.includes('~')) {
                step.isDebug = true;
            }
            if(step.identifiers.includes('~~')) {
                step.isStepByStepDebug = true;
            }
            if(step.identifiers.includes('+')) {
                step.isNonParallel = true;
            }
            if(step.identifiers.includes('..')) {
                step.isSequential = true;
            }
            if(step.identifiers.includes('#')) {
                step.isExpectedFail = true;
            }
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

                step.varsBeingSet.push({
                    name: matches[2].replace(/\{|\}/g, '').trim(),
                    value: matches[5],
                    isLocal: matches[2].includes('{{')
                });

                textCopy = textCopy.replace(matches[1], ''); // strip the leading {var}=Step from the string
                textCopy = textCopy.replace(/^\,/, ''); // string the leading comma, if there is one
            }

            if(step.varsBeingSet.length > 1) { // {var1}='str1', {var2}='str2', etc.
                // If there are multiple vars being set, each value must be a string literal
                for(var i = 0; i < step.varsBeingSet.length; i++) {
                    if(!step.varsBeingSet[i].value.match(STRING_LITERAL_REGEX_WHOLE)) {
                        this.error("When multiple {variables} are being set on a single line, those {variables} can only be set to 'string constants'", filename, lineNumber);
                    }
                }
            }
            else { // {var}=Func or {var}='str'
                if(!step.varsBeingSet[0].value.match(STRING_LITERAL_REGEX_WHOLE)) { // {var}=Func
                    step.isFunctionCall = true;
                }
            }
        }
        else {
            if(!step.isTextualStep && !step.isFunctionDeclaration) {
                step.isFunctionCall = true;
            }
        }

        // Create a list of elementFinders contained in this step
        matches = step.text.match(BRACKET_REGEX);
        if(matches) {
            for(var i = 0; i < matches.length; i++) {
                var match = matches[i];
                var name = match.replace(/\[|\]/g, '').trim();

                var elementFinder = this.parseElementFinder(name);
                if(elementFinder) {
                    if(!step.elementFinderList) {
                        step.elementFinderList = [];
                    }

                    step.elementFinderList.push({
                        name: name,
                        elementFinder: elementFinder
                    });
                }
                else {
                    this.error("Invalid [elementFinder in brackets]", filename, lineNumber);
                }
            }
        }

        // Create a list of vars contained in this step
        matches = step.text.match(VAR_REGEX);
        if(matches) {
            step.varsList = [];
            for(var i = 0; i < matches.length; i++) {
                var match = matches[i];
                var name = match.replace(/\{|\}/g, '').trim();
                var isLocal = match.startsWith('{{');

                if(step.isFunctionDeclaration && !isLocal) {
                    this.error("All variables in a *Function declaration must be {{local}} and {" + name + "} is not", filename, lineNumber);
                }

                step.varsList.push({
                    name: name,
                    isLocal: isLocal
                });
            }
        }

        return step;
    }

    /**
     * Parses text inside brackets into an ElementFinder
     * @param {String} text - The text to parse, without the brackets ([])
     * @return {Object} An object containing ElementFinder components (ordinal, text, variable, nextTo - any one of which can be undefined), or null if this is not a valid ElementFinder
     */
    parseElementFinder(name) {
        var matches = name.match(ELEMENTFINDER_REGEX);
        if(matches) {
            var ordinal = (matches[2] || '');
            var text = ((matches[5] || '') + (matches[8] || '')).replace(/^'|^"|'$|"$/g, ''); // it's either matches[5] or matches[8], strip out surrounding quotes
            var variable = ((matches[6] || '') + (matches[9] || '')).trim(); // it's either matches[6] or matches[9]
            var nextTo = (matches[11] || '').replace(/^'|^"|'$|"$/g, ''); // strip out surrounding quotes

            if(!text && !variable) { // either the text and/or the variable must be present
                return null;
            }
            if(variable && !ordinal && !text && !nextTo) { // a variable cannot be listed alone
                return null;
            }
            if(nextTo && !ordinal && !text && !variable) { // next to cannot be listed alone
                return null; // NOTE: probably unreachable because a "next to" by itself won't get matched by the regex
            }

            var elementFinder = {};

            if(ordinal) {
                elementFinder.ordinal = parseInt(ordinal);
            }
            if(text) {
                elementFinder.text = text;
            }
            if(variable) {
                elementFinder.variable = variable;
            }
            if(nextTo) {
                elementFinder.nextTo = nextTo;
            }

            return elementFinder;
        }
        else {
            return null;
        }
    }

    /**
     * Parses a string and adds it onto root
     * @param {String} buffer - Contents of a test file
     * @param {String} filename - Name of the test file
     * @param {Boolean} [isBuiltIn] - If true, this is a built-in file
     */
    parseIn(buffer, filename, isBuiltIn) {
        var lines = buffer.split(/[\r\n|\r|\n]/);

        // Convert each string in lines to either a Step object
        // For a line that's part of a code block, insert the code into the Step representing the code block and remove that line
        var lastStepCreated = null;
        var lastNonEmptyStep = null;
        var currentlyInsideCodeBlockFromLineNum = -1; // if we're currently inside a code block, that code block started on this line, otherwise -1
        for(var i = 0; i < lines.length; i++) {
            var line = lines[i];

            if(currentlyInsideCodeBlockFromLineNum != -1) { // we're currently inside a code block
                if(line.match(new RegExp("^[ ]{" + (lastStepCreated.indents * SPACES_PER_INDENT) + "}\}\s*(\/\/.*?)?\s*$"))) { // code block is ending
                    lastStepCreated.codeBlock += "\n";
                    currentlyInsideCodeBlockFromLineNum = -1;
                }
                else {
                    lastStepCreated.codeBlock += ("\n" + line);
                }

                lines[i] = this.parseLine('', filename, i + 1); // blank out the line we just handled
            }
            else {
                var step = this.parseLine(line, filename, i + 1);
                step.indents = this.numIndents(line, filename, i + 1);

                if(!lastNonEmptyStep && step.indents != 0) {
                    this.error("The first step must have 0 indents", filename, i + 1);
                }

                // If this is the start of a new code block
                if(typeof step.codeBlock != 'undefined') {
                    currentlyInsideCodeBlockFromLineNum = i + 1;
                }

                lines[i] = step;
                lastStepCreated = lines[i];

                if(step.text != '') {
                    lastNonEmptyStep = step;
                }
            }
        }

        // If we're still inside a code block, and EOF was reached, complain that a code block is not closed
        if(currentlyInsideCodeBlockFromLineNum != -1) {
            this.error("An unclosed code block was found", filename, currentlyInsideCodeBlockFromLineNum);
        }

        // Validations for .. steps
        for(var i = 0; i < lines.length; i++) {
            if(lines[i].text == '..') {
                if(i > 0 && lines[i-1].text != '' && lines[i-1].indents == lines[i].indents) {
                    this.error("You cannot have a .. line at the same indent level as the adjacent line above", filename, lines[i].lineNumber);
                }
                if((i + 1 < lines.length && lines[i+1].text == '') || (i + 1 == lines.length)) {
                    this.error("You cannot have a .. line without anything directly below", filename, lines[i].lineNumber);
                }
                if(i + 1 < lines.length && lines[i+1].indents != lines[i].indents) {
                    this.error("A .. line must be followed by a line at the same indent level", filename, lines[i].lineNumber);
                }
                if(i + 1 < lines.length && lines[i+1].text == '..') {
                    this.error("You cannot have two .. lines in a row", filename, lines[i].lineNumber);
                }
            }
        }

        // Look for groups of consecutive steps that consititute a step block, and replace them with a StepBlock object
        // A step block:
        // 1) is preceded by a '' step, '..' step, or start of file
        // 2) is followed by a '' line, indented '..' step, or end of file
        // 3) has no '' steps in the middle
        // 4) all steps are at the same indent level
        for(var i = 0; i < lines.length;) {
            if(lines[i].text != '' && lines[i].text != '..' && (i == 0 || lines[i-1].text == '' || lines[i-1].text == '..')) {
                // Current step may start a step block
                var potentialStepBlock = new StepBlock();

                if(i > 0 && lines[i-1].text == '..') {
                    potentialStepBlock.isSequential = true;
                }

                potentialStepBlock.steps.push(lines[i]);

                // See how far down it goes
                for(var j = i + 1; j < lines.length; j++) {
                    if(lines[j].text == '') {
                        // We've reached the end of the step block
                        break;
                    }
                    else if(lines[j].indents != potentialStepBlock.steps[0].indents) {
                        if(lines[j].text != '..') { // indented .. is a valid end of a StepBlock (don't clear out potentialStepBlock in that case)
                            // StepBlock is ruined, due to consecutive steps being at different indents
                            potentialStepBlock = new StepBlock(); // clear out the potentialStepBlock
                        }

                        break;
                    }
                    else {
                        potentialStepBlock.steps.push(lines[j]);
                    }
                }

                if(potentialStepBlock.steps.length > 1) {
                    // We've found a valid step block
                    potentialStepBlock.filename = filename;
                    potentialStepBlock.lineNumber = potentialStepBlock.isSequential ? potentialStepBlock.steps[0].lineNumber - 1 : potentialStepBlock.steps[0].lineNumber;
                    potentialStepBlock.indents = potentialStepBlock.steps[0].indents;
                    for(var k = 0; k < potentialStepBlock.steps.length; k++) {
                        potentialStepBlock.steps[k].containingStepBlock = potentialStepBlock;
                    }

                    // Have the StepBlock object we created replace its corresponding Steps
                    lines.splice(i, potentialStepBlock.steps.length, potentialStepBlock);
                    i++; // next i will be one position past the new StepBlock's index
                }
                else {
                    i = j; // no new StepBlock was created, so just advance i to however far down we ventured
                }
            }
            else {
                i++;
            }
        }

        // Remove steps that are '' or '..' (we don't need them anymore)
        for(var i = 0; i < lines.length;) {
            if(lines[i].text == '') {
                lines.splice(i, 1);
            }
            else if(lines[i].text == '..') {
                // Validate that .. steps have a StepBlock directly below
                if(i + 1 < lines.length && !(lines[i+1] instanceof StepBlock)) {
                    this.error("A .. line must be followed by a step block", filename, lines[i].lineNumber);
                }
                else {
                    lines.splice(i, 1);
                }
            }
            else {
                i++;
            }
        }

        // Set the parents and children of each Step/StepBlock in lines, based on the indents of each Step/StepBlock
        // Insert the contents of lines into the tree (under this.root)
        for(var i = 0; i < lines.length; i++) {
            var currStepObj = lines[i]; // either a Step or StepBlock object
            var prevStepObj = i > 0 ? lines[i-1] : null;

            // Built-In
            if(isBuiltIn) {
                currStepObj.isBuiltIn = true;
            }

            // Indents of new step vs. last step
            var indentsAdvanced = 0;
            if(prevStepObj != null) {
                indentsAdvanced = currStepObj.indents - prevStepObj.indents;
            }

            if(indentsAdvanced == 0) { // current step is a peer of the previous step
                if(prevStepObj) {
                    currStepObj.parent = prevStepObj.parent;
                }
                else { // only the root has been inserted thus far
                    currStepObj.parent = this.root;
                }

                currStepObj.parent.children.push(currStepObj);
            }
            else if(indentsAdvanced == 1) { // current step is a child of the previous step
                currStepObj.parent = prevStepObj;
                prevStepObj.children.push(currStepObj);
            }
            else if(indentsAdvanced > 1) {
                this.error("You cannot have a step that has 2 or more indents beyond the previous step", filename, currStepObj.lineNumber);
            }
            else { // indentsAdvanced < 0, and current step is a child of a descendant of the previous step
                var parent = prevStepObj.parent;
                for(var j = indentsAdvanced; j < 0; j++) {
                    if(parent.parent == null) {
                        this.error("Invalid number of indents", filename, currStepObj.lineNumber); // NOTE: probably unreachable
                    }

                    parent = parent.parent;
                }

                currStepObj.parent = parent;
                parent.children.push(currStepObj);
            }
        }
    }

    /**
     * Called after all of the tree's text has been inputted with parseIn()
     * Converts the tree under this.root into this.branches, and gets everything ready for the test runner
     * @throws {Error} If a step cannot be found, a Must Test step is violated, or if a var is used but never set in a branch
     */
    finalize() {
        this.expandTree();
        this.validateTree();
        this.convertToBranches();
    }

    /**
     * Checks to see if a given function call matches a given function declaration
     * @param {String} functionDeclarationText - The text of the function declaration (from step.text)
     * @param {String} functionCallText - The text of the function call (from step.text)
     * @param {String} filename - The filename of the file where the function call is
     * @param {Integer} lineNumber - The line number where the function call is
     * @return {Boolean} true if they match, false if they don't
     * @throws {Error} if there's a case insensitive match but not a case sensitive match
     */
    isFunctionMatch(functionDeclarationText, functionCallText, filename, lineNumber) {
        // When hooking up functions, canonicalize by trim(), replace \s+ with a single space
        // functionDeclarationText can have {{variables}}
        // functionCallText can have {{vars}}, {vars}, 'strings', "strings", and [elementFinders]

        functionDeclarationText = functionDeclarationText
            .trim()
            .replace(/\s+/g, ' ')
            .replace(VAR_REGEX, '{}');

        functionCallText = functionCallText
            .trim()
            .replace(/\s+/g, ' ')
            .replace(STRING_LITERAL_REGEX, '{}')
            .replace(BRACKET_REGEX, '{}')
            .replace(VAR_REGEX, '{}');

        if(functionDeclarationText == functionCallText) {
            return true;
        }
        else if(functionDeclarationText.toLowerCase() == functionCallText.toLowerCase()) {
            this.error("The function call '" + functionCallText + "' matches function declaration '" + functionDeclarationText + "', but must match case sensitively", filename, lineNumber);
        }
        else {
            return false;
        }
    }

    /**
     * Expands the tree under this.root to include copies of each function call instance (including built-in functions and hooks),
     * and duplicates the tree underneath for function calls with multiple branches and step blocks
     * @throws {Error} If a step cannot be found
     */
    expandTree() {



















    }

    /**
     * Does a final validation on the tree under this.root
     * 1) Checks that all vars that are used in a branch are set
     * 2) Enforces Must Test steps
     * @throws {Error} If a Must Test step is violated, or if a var is used but never set in a branch
     */
    validateTree() {

    }

    /**
     * Converts the tree under this.root into an array of Branch in this.branches
     * Removes branches that we don't want run
     */
    convertToBranches() {

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
