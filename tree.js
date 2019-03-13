const Step = require('./step.js');
const StepBlock = require('./stepblock.js');
const Branch = require('./branch.js');
const Constants = require('./constants.js');
const util = require('util');
const utils = require('./utils.js');

/**
 * Represents the test tree
 */
class Tree {
    constructor() {
        this.root = new Step();              // the root Step of the tree (parsed version of the text that got inputted)
        this.branches = [];                  // Array of Branch, generated from this.root

        this.beforeEverything = [];          // Array of Step, the steps (and their children) to execute before all branches (tests)
        this.afterEverything = [];           // Array of Step, the steps (and their children) to execute after all branches (tests)

        this.latestBranchifiedStep = null;   // Step most recently used by branchify(). Used to debug and track down infinite loops.
    }

    /**
     * @param {String} line - A single line
     * @param {String} filename - The filename of the file where the line is
     * @param {Integer} lineNumber - The line number
     * @return {Integer} The number of indents in line (where each SPACES_PER_INDENT spaces counts as 1 indent). Always returns 0 for empty string or all whitespace.
     * @throws {Error} If there are an invalid number of spaces, or invalid whitespace chars, at the beginning of the step
     */
    numIndents(line, filename, lineNumber) {
        if(line.match(/^\s*$/)) { // empty string or all whitespace
            return 0;
        }
        if(line.match(/^\s*\/\/.*$/)) { // comment
            return 0;
        }

        var spacesAtFront = line.match(/^( *)([^ ]|$)/);
        var whitespaceAtFront = line.match(/^(\s*)([^\s]|$)/);

        if(spacesAtFront[1] != whitespaceAtFront[1]) {
            utils.error("Spaces are the only type of whitespace allowed at the beginning of a step", filename, lineNumber);
        }
        else {
            var numSpaces = spacesAtFront[1].length;
            var numIndents = numSpaces / Constants.SPACES_PER_INDENT;

            if(numIndents - Math.floor(numIndents) != 0) {
                utils.error("The number of spaces at the beginning of a step must be a multiple of " + Constants.SPACES_PER_INDENT + ". You have " + numSpaces + " space(s).", filename, lineNumber);
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

        var matches = line.match(Constants.LINE_REGEX);
        if(!matches) {
            utils.error("This step is not written correctly", filename, lineNumber); // NOTE: probably unreachable (LINE_REGEX can match anything)
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

        // Validation against prohibited step texts
        if(step.text.replace(/\s+/g, '').match(Constants.NUMBERS_ONLY_REGEX)) {
            utils.error("Invalid step name", filename, lineNumber);
        }

        // * Function Declaration
        if(matches[1]) {
            step.isFunctionDeclaration = matches[1].trim() == '*';

            if(step.isFunctionDeclaration && step.text.match(Constants.STRING_LITERAL_REGEX)) {
                utils.error("A * Function declaration cannot have 'strings' inside of it", filename, lineNumber);
            }
        }

        // Validate that a non-function declaration isn't using a hook step name
        if(!step.isFunctionDeclaration) {
            if(Constants.HOOK_NAMES.indexOf(step.getHookCanonicalText()) != -1) {
                utils.error("You cannot have a function call with that name. That's reserved for hook function declarations.", filename, lineNumber);
            }
        }

        // Set identifier booleans and perform related validations
        if(step.identifiers) {
            if(step.identifiers.includes('-T')) {
                step.isToDo = true;
                step.isTextualStep = true;
            }
            if(step.identifiers.includes('-M')) {
                step.isManual = true;
                step.isTextualStep = true;
            }
            if(step.identifiers.includes('-')) {
                step.isTextualStep = true;

                if(step.isFunctionDeclaration) {
                    utils.error("A * Function declaration cannot be a textual step (-) as well", filename, lineNumber);
                }
            }
            if(step.identifiers.includes('~')) {
                step.isDebug = true;
            }
            if(step.identifiers.includes('$')) {
                step.isOnly = true;
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

        // Steps that set variables
        if(step.text.match(Constants.VARS_SET_REGEX)) {
            // This step is a {var1} = Val1, {var2} = Val2, {{var3}} = Val3, etc. (one or more vars)

            if(step.isFunctionDeclaration) {
                utils.error("A step setting {variables} cannot start with a *", filename, lineNumber);
            }

            // Parse vars from text into step.varsBeingSet
            var textCopy = step.text + "";
            step.varsBeingSet = [];
            while(textCopy.trim() != "") {
                matches = textCopy.match(Constants.VARS_SET_REGEX);
                if(!matches) {
                    utils.error("A part of this line doesn't properly set a variable", filename, lineNumber); // NOTE: probably unreachable
                }

                var varBeingSet = {
                    name: matches[2].replace(/^\{\{|\}\}$|^\{|\}$/g, '').trim(),
                    value: matches[5],
                    isLocal: matches[2].includes('{{')
                };

                // Generate variable name validations
                if(varBeingSet.name.replace(/\s+/g, '').match(Constants.NUMBERS_ONLY_REGEX)) {
                    utils.error("A {variable name} cannot be just numbers", filename, lineNumber);
                }

                // Validations for special variables
                if(varBeingSet.name.toLowerCase() == 'frequency') {
                    if(varBeingSet.name != 'frequency') {
                        utils.error("The {frequency} variable name is special and must be all lowercase", filename, lineNumber);
                    }
                    if(varBeingSet.isLocal) {
                        utils.error("The {frequency} variable is special and cannot be {{frequency}}", filename, lineNumber);
                    }
                    if(!utils.hasQuotes(varBeingSet.value) || ['high','med','low'].indexOf(utils.stripQuotes(varBeingSet.value)) == -1) {
                        utils.error("The {frequency} variable is special and can only be set to 'high', 'med', or 'low'", filename, lineNumber);
                    }
                }
                else if(varBeingSet.name.toLowerCase() == 'group') {
                    if(varBeingSet.name != 'group') {
                        utils.error("The {group} variable name is special and must be all lowercase", filename, lineNumber);
                    }
                    if(varBeingSet.isLocal) {
                        utils.error("The {group} variable is special and cannot be {{group}}", filename, lineNumber);
                    }
                }

                step.varsBeingSet.push(varBeingSet);

                textCopy = textCopy.replace(matches[1], ''); // strip the leading {var}=Step from the string
                textCopy = textCopy.replace(/^\,/, ''); // string the leading comma, if there is one
            }

            if(step.varsBeingSet.length > 1) {
                // This step is {var1}='str1', {var2}='str2', etc. (two or more vars)

                // If there are multiple vars being set, each value must be a string literal
                for(var i = 0; i < step.varsBeingSet.length; i++) {
                    if(!step.varsBeingSet[i].value.match(Constants.STRING_LITERAL_REGEX_WHOLE)) {
                        utils.error("When multiple {variables} are being set on a single line, those {variables} can only be set to 'string constants'", filename, lineNumber);
                    }
                }
            }
            else {
                // This step is {var}=Func or {var}='str' (only one var being set)

                if(!step.varsBeingSet[0].value.match(Constants.STRING_LITERAL_REGEX_WHOLE)) {
                    // This step is {var}=Func

                    if(typeof step.codeBlock == 'undefined') { // In {var} = Text {, the Text is not considered a function call
                        step.isFunctionCall = true;
                    }

                    // Validations
                    if(step.varsBeingSet[0].value.replace(/\s+/g, '').match(Constants.NUMBERS_ONLY_REGEX)) {
                        utils.error("{vars} can only be set to 'strings'", filename, lineNumber);
                    }
                    if(step.isTextualStep) {
                        utils.error("A textual step (ending in -) cannot also start with a {variable} assignment", filename, lineNumber);
                    }
                }
            }
        }
        else { // This step does not start with {var}=
            if(!step.isTextualStep && !step.isFunctionDeclaration) {
                step.isFunctionCall = true;
            }
        }

        // Create a list of elementFinders contained in this step
        matches = step.text.match(Constants.BRACKET_REGEX);
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
                    utils.error("Invalid [elementFinder in brackets]", filename, lineNumber);
                }
            }
        }

        // Create a list of vars contained in this step
        matches = step.text.match(Constants.VAR_REGEX);
        if(matches) {
            step.varsList = [];
            for(var i = 0; i < matches.length; i++) {
                var match = matches[i];
                var name = match.replace(/\{|\}/g, '').trim();
                var isLocal = match.startsWith('{{');

                if(step.isFunctionDeclaration && !isLocal) {
                    utils.error("All variables in a * Function declaration must be {{local}} and {" + name + "} is not", filename, lineNumber);
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
        var matches = name.match(Constants.ELEMENTFINDER_REGEX);
        if(matches) {
            var ordinal = (matches[2] || '');
            var text = utils.stripQuotes((matches[5] || '') + (matches[8] || '')); // it's either matches[5] or matches[8]
            var variable = ((matches[6] || '') + (matches[9] || '')).trim(); // it's either matches[6] or matches[9]
            var nextTo = utils.stripQuotes(matches[11] || '');

            if(!text && !variable) { // either the text and/or the variable must be present
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
                if(line.match(new RegExp("^[ ]{" + (lastStepCreated.indents * Constants.SPACES_PER_INDENT) + "}\}\s*(\/\/.*?)?\s*$"))) { // code block is ending
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
                    utils.error("The first step must have 0 indents", filename, i + 1);
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
            utils.error("An unclosed code block was found", filename, currentlyInsideCodeBlockFromLineNum);
        }

        // Validations for .. steps
        for(var i = 0; i < lines.length; i++) {
            if(lines[i].text == '..') {
                if(i > 0 && lines[i-1].text != '' && lines[i-1].indents == lines[i].indents) {
                    utils.error("You cannot have a .. line at the same indent level as the adjacent line above", filename, lines[i].lineNumber);
                }
                if((i + 1 < lines.length && lines[i+1].text == '') || (i + 1 == lines.length)) {
                    utils.error("You cannot have a .. line without anything directly below", filename, lines[i].lineNumber);
                }
                if(i + 1 < lines.length && lines[i+1].indents != lines[i].indents) {
                    utils.error("A .. line must be followed by a line at the same indent level", filename, lines[i].lineNumber);
                }
                if(i + 1 < lines.length && lines[i+1].text == '..') {
                    utils.error("You cannot have two .. lines in a row", filename, lines[i].lineNumber);
                }
            }
        }

        // Look for groups of consecutive steps that consititute a step block, and replace them with a StepBlock object
        // A step block:
        // 1) all steps are at the same indent level
        // 2) has no '' steps in the middle
        // 3) is followed by a '' line, indented '..' step, line that's differntly indented, or end of file
        for(var i = 0; i < lines.length;) {
            if(lines[i].text == '' || lines[i].text == '..') {
                // The first line in a step block is a normal line
                i++;
                continue;
            }

            // Current step may start a step block
            var potentialStepBlock = new StepBlock();

            if(i > 0 && lines[i-1].text == '..') {
                potentialStepBlock.isSequential = true;
            }

            potentialStepBlock.steps.push(lines[i]);

            // See how far down it goes
            for(var j = i + 1; j < lines.length; j++) {
                if(lines[j].text == '' || lines[j].indents != potentialStepBlock.steps[0].indents) {
                    // We've reached the end of the (potential) step block
                    break;
                }
                else {
                    potentialStepBlock.steps.push(lines[j]);
                }
            }

            if(potentialStepBlock.steps.length > 1) {
                // We've found a step block, which goes from lines index i to j

                if(j < lines.length && lines[j].text != '' && lines[j].text != '..' && lines[j].indents == potentialStepBlock.steps[0].indents + 1) {
                    utils.error("There must be an empty line under a step block if it has children directly underneath it. Try putting an empty line under this line.", filename, lines[j].lineNumber - 1);
                }

                potentialStepBlock.filename = filename;
                potentialStepBlock.lineNumber = potentialStepBlock.isSequential ? potentialStepBlock.steps[0].lineNumber - 1 : potentialStepBlock.steps[0].lineNumber;
                potentialStepBlock.indents = potentialStepBlock.steps[0].indents;
                for(var k = 0; k < potentialStepBlock.steps.length; k++) {
                    potentialStepBlock.steps[k].containingStepBlock = potentialStepBlock;

                    // Validate that a step block member is not a function declaration
                    if(potentialStepBlock.steps[k].isFunctionDeclaration) {
                        utils.error("You cannot have a * Function declaration within a step block", filename, potentialStepBlock.steps[k].lineNumber);
                    }

                    // Validate that a step block member is not a code block
                    if(typeof potentialStepBlock.steps[k].codeBlock != 'undefined') {
                        utils.error("You cannot have a code block within a step block", filename, potentialStepBlock.steps[k].lineNumber);
                    }
                }

                // Have the StepBlock object we created replace its corresponding Steps
                lines.splice(i, potentialStepBlock.steps.length, potentialStepBlock);
                i++; // next i will be one position past the new StepBlock's index
            }
            else {
                i = j; // no new StepBlock was created, so just advance i to however far down we ventured
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
                    utils.error("A .. line must be followed by a step block", filename, lines[i].lineNumber);
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
                utils.error("You cannot have a step that has 2 or more indents beyond the previous step", filename, currStepObj.lineNumber);
            }
            else { // indentsAdvanced < 0, and current step is a child of an ancestor of the previous step
                var parent = prevStepObj.parent;
                for(var j = indentsAdvanced; j < 0; j++) {
                    if(parent.parent == null) {
                        utils.error("Invalid number of indents", filename, currStepObj.lineNumber); // NOTE: probably unreachable
                    }

                    parent = parent.parent;
                }

                currStepObj.parent = parent;
                parent.children.push(currStepObj);
            }
        }
    }

    /**
     * Finds the nearest function declaration step under this.root that matches a given function call step
     * @param {Array} stepsAbove - Array of Step (no StepBlocks), steps above the function call step (with functions, step blocks, etc. expanded by branchify()), with the function call step at the very end of the array
     * @return {Step} The nearest function declaration under this.root that matches the function call step
     * @throws {Error} If a matching function declaration could not be found
     */
    findFunctionDeclaration(stepsAbove) {
        // NOTE: Why do we input stepsAbove instead of just inputting a function call Step?
        // The difference between a function call's parents and stepsAbove is that stepsAbove has been "expanded" by branchify().
        // Suppose function declaration B is declared inside function declaration A. If A is called, B has to be accessible
        // to the steps under the call to A. This can only be done if the call to A has been "expanded" (has the steps from
        // A's declaration attached).

        var index = stepsAbove.length - 1;
        var functionCall = stepsAbove[index];

        for(; index >= 0; index--) {
            var currStepInTree = stepsAbove[index].originalStepInTree;

            var siblings = [];
            if(currStepInTree.parent) { // currStep is not inside a StepBlock
                siblings = currStepInTree.parent.children;
            }
            else { // currStep is inside a StepBlock
                siblings = currStepInTree.containingStepBlock.parent.children; // these are the siblings of the step block's parent (remember, step blocks themselves cannot have function declarations)
            }

            for(var i = 0; i < siblings.length; i++) {
                var sibling = siblings[i];
                if(sibling.isFunctionDeclaration && functionCall.isFunctionMatch(sibling)) {
                    return sibling;
                }
            }
        }

        utils.error("The function '" + functionCall.getFunctionCallText() + "' cannot be found. Is there a typo, or did you mean to make this a textual step (with a - at the end)?", functionCall.filename, functionCall.lineNumber);
    }

    /**
     * Validates that F from {var} = F is either a code block function or in {x}='val' format
     * @param {Step} step - The step {var} = F, with step.functionDeclarationInTree already being set to F
     * @return {Boolean} true if F is in {x}='val' format, false if F is a code block function
     * @throws {Error} If F is not the right format
     */
    validateVarSettingFunction(step) {
        /*
        Acceptable formats of F:
            * F {
                code
            }

            * F
                {x}='val1'
                {x}='val2'
                {x}='val3'

                {x}='val4'
                {x}='val5'

                    - No children
                    - No sequential (..) anything
                    - May contain steps, step blocks, or a combination of them
        */

        if(typeof step.functionDeclarationInTree.codeBlock != 'undefined') {
            if(step.functionDeclarationInTree.children.length > 0) {
                utils.error("The function called at " + step.filename + ":" + step.lineNumber + " has a code block in its declaration (at " + step.functionDeclarationInTree.filename + ":" + step.functionDeclarationInTree.lineNumber + ") but that code block must not have any child steps", step.filename, step.lineNumber);
            }

            return false;
        }
        else {
            if(step.functionDeclarationInTree.children.length == 0) {
                utils.error("You cannot use an empty function", step.filename, step.lineNumber);
            }

            step.functionDeclarationInTree.children.forEach(child => {
                if(child instanceof StepBlock) {
                    child.steps.forEach(childStep => {
                        validateChild(childStep);
                    });
                }
                else {
                    validateChild(child);
                }
            });

            return true;

            function validateChild(child) {
                if(!child.varsBeingSet || child.varsBeingSet.length != 1 || child.varsBeingSet[0].isLocal || !utils.hasQuotes(child.varsBeingSet[0].value)) {
                    utils.error("The function called at " + step.filename + ":" + step.lineNumber + " must have all steps in its declaration be in format {x}='string' (but " + child.filename + ":" + child.lineNumber + " is not)", step.filename, step.lineNumber);
                }

                if(child.children.length > 0) {
                    utils.error("The function called at " + step.filename + ":" + step.lineNumber + " must not have any steps in its declaration that have children of their own (but " + child.filename + ":" + child.lineNumber + " does)", step.filename, step.lineNumber);
                }
            }
        }
    }

    /**
     * Converts step and its children into branches. Expands functions, step blocks, hooks, etc.
     * @param {Step} step - Step from the tree (this.root) to convert to branches (NOTE: do not set step to a StepBlock unless it's a sequential StepBlock)
     * @param {Array} [groups] - Array of String, where each string is a group we want run (do include branches with no group or not in at least one group listed here), no group restrictions if this is undefined
     * @param {String} [frequency] - Only include branches at or above this frequency ('high', 'med', or 'low'), no frequency restrictions if this is undefined
     * @param {Boolean} [noDebug] - If true, throws an error if at least one ~ or $ is encountered in the tree at or below the given step
     * @param {Array} [stepsAbove] - Array of Step, steps that comes above this step, with function calls, etc. already expanded (used to help find function declarations), [] if omitted
     * @param {Number} [branchIndents] - Number of indents to give step if the branch is being printed out (i.e., the steps under a function are to be indented one unit to the right of the function call step), 0 if omitted
     * @param {Boolean} [isFunctionCall] - If true, this branchify() call is to a function declaration step, in response to a function call step
     * @param {Boolean} [isSequential] - If true, combine branches of children sequentially (implements .. identifier)
     * @return {Array} Array of Branch, containing the branches at and under step (does not include the steps from branchesAbove). Sorted by ideal execution order (but without regard to {frequency}). Returns null for function declarations encountered while recursively walking the tree.
     * @throws {Error} If a function declaration cannot be found, or if a hook name is invalid
     */
    branchify(step, groups, frequency, noDebug, stepsAbove, branchIndents, isFunctionCall, isSequential) {
        // ***************************************
        // 1) Initialize vars
        // ***************************************

        if(typeof stepsAbove == 'undefined') {
            stepsAbove = [];
        }
        if(typeof branchIndents == 'undefined') {
            branchIndents = 0;
        }

        if(!step.isFunctionDeclaration) {
            this.latestBranchifiedStep = step;
        }

        isSequential = (step.isSequential && !(step instanceof StepBlock)) || isSequential; // is this step or any step above it sequential? (does not include sequential step blocks)

        // If this step isn't the root and isn't a step block, place it at the end of stepsAbove, so we can use it with findFunctionDeclaration()
        if(step.indents != -1 && !(step instanceof StepBlock)) {
            stepsAbove.push(step.cloneForBranch());
        }

        // Enforce noDebug
        if(noDebug) {
            if(step.isDebug) {
                utils.error("A ~ was found, but the noDebug flag is set", step.filename, step.lineNumber);
            }
            else if(step.isOnly) {
                utils.error("A $ was found, but the noDebug flag is set", step.filename, step.lineNumber);
            }
        }

        // ***************************************
        // 2) Fill branchesFromThisStep with this step
        //    (which may be multiple branches if this step is a function call, etc.)
        // ***************************************

        var branchesFromThisStep = []; // Array of Branch

        if(step.indents == -1) {
            // We're at the root. Ignore it.
        }
        else if(step.isFunctionCall) {
            step.functionDeclarationInTree = this.findFunctionDeclaration(stepsAbove);

            var clonedStep = step.cloneForBranch();
            clonedStep.branchIndents = branchIndents;
            clonedStep.mergeInFunctionDeclaration(step.functionDeclarationInTree); // merge top step in function declaration into this function call

            var isReplaceVarsInChildren = false; // true if this step is {var}=F and F contains children in format {x}='val', false otherwise

            if(clonedStep.varsBeingSet && clonedStep.varsBeingSet.length > 0) {
                // This step is {var} = F

                // Validate that F is either a code block function, or has all children being {x}='val'
                isReplaceVarsInChildren = this.validateVarSettingFunction(step);
            }

            branchesFromThisStep = this.branchify(step.functionDeclarationInTree, groups, frequency, noDebug, stepsAbove, branchIndents + 1, true, undefined); // there's no isSequential in branchify() because isSequential does not extend into function calls

            if(branchesFromThisStep.length == 0) {
                // If branchesFromThisStep is empty (happens when the function declaration is empty), just stick the current step (function call) into a sole branch
                var branch = new Branch();
                branch.isOnly = step.isOnly;
                branch.isDebug = step.isDebug;
                branchesFromThisStep = [ branch ];
                branchesFromThisStep[0].steps.push(clonedStep);
            }
            else {
                if(isReplaceVarsInChildren) {
                    // replace {x} in each child to {var} (where this step is {var} = F)
                    branchesFromThisStep.forEach(branch => {
                        branch.steps[0].varsBeingSet[0].name = clonedStep.varsBeingSet[0].name;
                    });
                }

                // Put clone of this step at the front of each Branch that results from expanding the function call
                branchesFromThisStep.forEach(branch => {
                    branch.steps.unshift(clonedStep.cloneForBranch()); // new clone every time we unshift
                });
            }
        }
        else if(step instanceof StepBlock && step.isSequential) { // sequential step block (with a .. on top)
            // Branches from each step block member are attached sequentially to each other
            var bigBranch = new Branch();
            step.steps.forEach(stepInBlock => {
                var branchesFromThisStepBlockMember = this.branchify(stepInBlock, groups, frequency, noDebug, stepsAbove, branchIndents); // there's no isSequential in branchify() because isSequential does not extend into function calls
                branchesFromThisStepBlockMember.forEach(branchBelowBlockMember => {
                    bigBranch.mergeToEnd(branchBelowBlockMember);
                });
            });
            branchesFromThisStep.push(bigBranch);

            // NOTE: branchify() is not called on step blocks unless they are sequential
        }
        else if(step.isFunctionDeclaration) {
            // Skip over function declarations, since we are already including their corresponding function calls in branches

            // If this function declaration was encountered unintentionally, and not in response to finding a function call, return without visiting its children
            // This is because hitting a function declaration on its own won't create any new branches
            if(!isFunctionCall) {
                return null;
            }
        }
        else { // Textual steps (including manual steps), non-function-declaration code block steps, {var}='string'
            // Generic step cloning into branchesFromThisStep
            var branch = new Branch();
            var clonedStep = step.cloneForBranch();
            clonedStep.branchIndents = branchIndents;

            branch.steps.push(clonedStep);
            branch.isOnly = step.isOnly;
            branch.isDebug = step.isDebug;

            // Set branch.groups and branch.frequency, if this a {group}= or {frequency}= step
            if(step.varsBeingSet && step.varsBeingSet.length > 0) {
                step.varsBeingSet.forEach(varBeingSet => {
                    if(varBeingSet.name == 'frequency') {
                        branch.frequency = utils.stripQuotes(varBeingSet.value);
                    }
                    else if(varBeingSet.name == 'group') {
                        if(!branch.groups) {
                            branch.groups = [];
                        }
                        branch.groups = branch.groups.concat(utils.stripQuotes(varBeingSet.value));
                    }
                });
            }

            branchesFromThisStep.push(branch);
        }

        // ***************************************
        // 3) Branchify children of this step, including children that are hooks
        // ***************************************

        var children = step.children;

        if(children.length == 0) {
            // If this step is a member of a non-sequential step block, the step block's children are this step's "children"
            if(step.containingStepBlock && !step.containingStepBlock.isSequential) {
                children = step.containingStepBlock.children;
            }
        }

        // Check if a child is a hook function declaration
        var afterEveryBranch = [];
        var afterEveryStep = [];
        children.forEach(child => {
            if(child.isFunctionDeclaration) {
                var canStepText = child.getHookCanonicalText();
                var stepText = child.text.trim().replace(/\s+/g, ' ');
                if(canStepText == "after every branch") {
                    this.verifyHookCasing(child, 'After Every Branch');

                    var afterEveryBranchMembers = this.branchify(child, groups, frequency, noDebug, stepsAbove, 1, true);
                    var clonedHookStep = child.cloneAsFunctionCall();
                    clonedHookStep.branchIndents = 0;
                    afterEveryBranchMembers.forEach(branch => {
                        branch.steps.unshift(clonedHookStep); // attach this child, converted into a function call, to the top of each branch (thereby preserving its text, identifiers, etc.)
                        branch.isBuiltIn = clonedHookStep.isBuiltIn;
                    });

                    afterEveryBranch = afterEveryBranch.concat(afterEveryBranchMembers);
                }
                else if(canStepText == "after every step") {
                    this.verifyHookCasing(child, 'After Every Step');

                    var afterEveryStepMembers = this.branchify(child, groups, frequency, noDebug, stepsAbove, 1, true);
                    var clonedHookStep = child.cloneAsFunctionCall();
                    clonedHookStep.branchIndents = 0;
                    afterEveryStepMembers.forEach(branch => {
                        branch.steps.unshift(clonedHookStep); // attach this child, converted into a function call, to the top of each branch (thereby preserving its text, identifiers, etc.)
                        branch.isBuiltIn = clonedHookStep.isBuiltIn;
                    });

                    afterEveryStep = afterEveryStep.concat(afterEveryStepMembers);
                }
                else if(canStepText == "before everything") {
                    this.verifyHookCasing(child, 'Before Everything');

                    if(child.indents != 0) {
                        utils.error("A '* Before Everything' function must not be indented (it must be at 0 indents)", step.filename, step.lineNumber + 1);
                    }

                    var newBeforeEverything = this.branchify(child, groups, frequency, noDebug, stepsAbove, 1, true);
                    var clonedHookStep = child.cloneAsFunctionCall();
                    clonedHookStep.branchIndents = 0;
                    newBeforeEverything.forEach(branch => {
                        branch.steps.unshift(clonedHookStep); // attach this child, converted into a function call, to the top of each branch (thereby preserving its text, identifiers, etc.)
                        branch.isBuiltIn = clonedHookStep.isBuiltIn;
                    });
                    this.beforeEverything = newBeforeEverything.concat(this.beforeEverything); // inserted this way so that built-in hooks get executed first
                }
                else if(canStepText == "after everything") {
                    this.verifyHookCasing(child, 'After Everything');

                    if(child.indents != 0) {
                        utils.error("An '* After Everything' function must not be indented (it must be at 0 indents)", step.filename, step.lineNumber + 1);
                    }

                    var newAfterEverything = this.branchify(child, groups, frequency, noDebug, stepsAbove, 1, true);
                    var clonedHookStep = child.cloneAsFunctionCall();
                    clonedHookStep.branchIndents = 0;
                    newAfterEverything.forEach(branch => {
                        branch.steps.unshift(clonedHookStep); // attach this child, converted into a function call, to the top of each branch (thereby preserving its text, identifiers, etc.)
                        branch.isBuiltIn = clonedHookStep.isBuiltIn;
                    });
                    this.afterEverything = this.afterEverything.concat(newAfterEverything); // inserted this way so that built-in hooks get executed last
                }
            }
        });

        // Recursively call branchify() on children
        var branchesFromChildren = []; // Array of Branch
        children.forEach(child => {
            if(child instanceof StepBlock && !child.isSequential) {
                // If this child is a non-sequential step block, just call branchify() directly on each member step
                child.steps.forEach(step => {
                    var branchesFromChild = this.branchify(step, groups, frequency, noDebug, stepsAbove, branchIndents, false, isSequential);
                    if(branchesFromChild && branchesFromChild.length > 0) {
                        branchesFromChildren = branchesFromChildren.concat(branchesFromChild);
                    }
                    // NOTE: else is probably unreachable, since branchify() only returns null on a function declaration and a function declaration cannot be a member of a step block
                });
            }
            else {
                // If this child is a step, call branchify() on it normally
                var branchesFromChild = this.branchify(child, groups, frequency, noDebug, stepsAbove, branchIndents, false, isSequential);
                if(branchesFromChild && branchesFromChild.length > 0) {
                    branchesFromChildren = branchesFromChildren.concat(branchesFromChild);
                }
            }
        });

        // ***************************************
        // 4) Remove branches we don't want run
        // ***************************************

        // Remove branches by $'s
        // Special case for child branches whose first step is a step block member:
        // If a step block member has a $, discard all other branches, even if they have isOnly set
        for(var i = 0; i < branchesFromChildren.length; i++) {
            var branchFromChild = branchesFromChildren[i];
            var firstStep = branchFromChild.steps[0];
            var stepBlockOfFirstStep = firstStep.originalStepInTree.containingStepBlock;
            if(stepBlockOfFirstStep && firstStep.isOnly) { // found a $ step part of a step block
                // Remove other child branches from the same step block that don't have a $ directly attached
                for(var i = 0; i < branchesFromChildren.length;) {
                    var branchFromChild = branchesFromChildren[i];
                    var firstStep = branchFromChild.steps[0];
                    if(firstStep.originalStepInTree.containingStepBlock === stepBlockOfFirstStep) {
                        if(firstStep.isOnly) {
                            i++; // keep it
                        }
                        else {
                            branchesFromChildren.splice(i, 1); // remove this branch
                        }
                    }
                    else {
                        i++; // keep it, since it's not in the same step block
                    }
                }
            }
        }
        // Normal case. If an isOnly child branch exists, remove the other branches that aren't isOnly
        for(var i = 0; i < branchesFromChildren.length; i++) {
            var branchFromChild = branchesFromChildren[i];
            if(branchFromChild.isOnly) {
                // A $ was found. Now find all of them.
                for(var i = 0; i < branchesFromChildren.length;) {
                    var branchFromChild = branchesFromChildren[i];
                    if(branchFromChild.isOnly) {
                        i++; // keep it
                    }
                    else {
                        if(branchFromChild.isDebug) {
                            utils.error("A ~ exists under this step, but it's being cut off by $'s. Either add a $ to this line or remove the ~.", branchFromChild.steps[0].filename, branchFromChild.steps[0].lineNumber);
                        }
                        else {
                            branchesFromChildren.splice(i, 1); // remove this branch
                        }
                    }
                }

                break;
            }
        }

        // Remove branches by groups (but only for steps at the top of the tree or hook)
        if(groups && atTop()) {
            for(var i = 0; i < branchesFromChildren.length;) {
                var branchFromChild = branchesFromChildren[i];

                if(!branchFromChild.groups) {
                    removeBranch();
                    continue;
                }

                var isGroupMatched = false;
                for(var j = 0; j < groups.length; j++) {
                    var groupAllowedToRun = groups[j];
                    if(branchFromChild.groups.indexOf(groupAllowedToRun) != -1) {
                        isGroupMatched = true;
                        break;
                    }
                }

                if(isGroupMatched) {
                    i++;
                }
                else {
                    removeBranch();
                }

                function removeBranch() {
                    if(branchFromChild.isDebug) {
                        var debugStep = findDebugStep(branchFromChild);
                        utils.error("This step contains a ~, but is not inside one of the groups being run. Either add it to the groups being run or remove the ~.", debugStep.filename, debugStep.lineNumber);
                    }
                    else {
                        branchesFromChildren.splice(i, 1); // remove this branch
                    }
                }
            }
        }

        // Remove branches by frequency (but only for steps at the top of the tree or hook)
        if(frequency && atTop()) {
            for(var i = 0; i < branchesFromChildren.length;) {
                var branchFromChild = branchesFromChildren[i];
                var freqAllowed = freqToNum(frequency);
                var freqOfBranch = freqToNum(branchFromChild.frequency);

                if(freqOfBranch >= freqAllowed) {
                    i++; // keep it
                }
                else {
                    if(branchFromChild.isDebug) {
                        var debugStep = findDebugStep(branchFromChild);
                        utils.error("This step contains a ~, but is not above the frequency allowed to run (" + frequency + "). Either set its frequency higher or remove the ~.", debugStep.filename, debugStep.lineNumber);
                    }
                    else {
                        branchesFromChildren.splice(i, 1); // remove this branch
                    }
                }

                /**
                 * @return {Number} The given frequency string ('high', 'med', 'low', undefined) converted into an integer
                 */
                function freqToNum(frequency) {
                    if(frequency == 'low') {
                        return 1;
                    }
                    else if(frequency == 'med') {
                        return 2;
                    }
                    else if(frequency == 'high') {
                        return 3;
                    }
                    else {
                        return 2;
                    }
                }
            }
        }

        /**
         * @return {Boolean} true if this step is at the root step, or at the top of a hook
         */
        function atTop() {
            return step.indents == -1 || Constants.HOOK_NAMES.indexOf(step.getHookCanonicalText()) != -1;
        }

        /**
         * @return {Step} The first Step in the given branch to contain a ~, null if nothing found
         */
        function findDebugStep(branch) {
            for(var i = 0; i < branch.steps.length; i++) {
                var step = branch.steps[i];
                if(step.isDebug) {
                    return step;
                }
            }

            return null; // probably won't be reached
        }

        // Remove branches by ~'s
        // If found, remove all branches other than the one that's connected with one or more ~'s
        var branchFound = null;

        // Search for ~ attached to a step block member first
        for(var i = 0; i < branchesFromChildren.length; i++) {
            var branchFromChild = branchesFromChildren[i];
            if(branchFromChild.steps[0].originalStepInTree.containingStepBlock && branchFromChild.steps[0].isDebug) {
                // A ~ was found
                branchFound = branchFromChild;
                break;
            }
        }
        if(!branchFound) {
            // Search for ~ anywhere in a branch
            for(var i = 0; i < branchesFromChildren.length; i++) {
                var branchFromChild = branchesFromChildren[i];
                if(branchFromChild.isDebug) {
                    // A ~ was found
                    branchFound = branchFromChild;
                    break;
                }
            }
        }
        if(branchFound) {
            branchesFromChildren = [ branchFound ]; // only keep the one we found
        }

        // ***************************************
        // 5) Fill branchesBelow by cross joining branchesFromThisStep with the branches that come from this step's children
        //    Also put branches from hook children into branchesBelow
        // ***************************************

        var branchesBelow = []; // what we're returning - represents all branches at and below this step

        // If branchesFromThisStep is empty, "prime" it with an empty Branch, so that the loops below work
        if(branchesFromThisStep.length == 0) {
            branchesFromThisStep.push(new Branch());
        }

        if(isSequential && !(step instanceof StepBlock)) {
            // One big resulting branch, built as follows:
            // One branchesFromThisStep branch, each child branch, one branchesFromThisStep branch, each child branch, etc.
            var bigBranch = new Branch();
            branchesFromThisStep.forEach(branchFromThisStep => {
                bigBranch.mergeToEnd(branchFromThisStep);
                branchesFromChildren.forEach(branchFromChild => {
                    bigBranch.mergeToEnd(branchFromChild.clone());
                });
            });
            branchesBelow = [ bigBranch ];
        }
        else {
            branchesFromThisStep.forEach(branchFromThisStep => {
                branchesFromChildren.forEach(branchFromChild => {
                    var newBranchBelow = branchFromThisStep.clone();
                    newBranchBelow.mergeToEnd(branchFromChild.clone());
                    branchesBelow.push(newBranchBelow);
                });
            });

            if(branchesBelow.length == 0) {
                if(branchesFromThisStep.length >= 1 && branchesFromThisStep[0].steps.length > 0) {
                    branchesBelow = branchesFromThisStep;
                }
                else {
                    branchesBelow = [];
                }
            }
        }

        // Attach afterEveryBranch to each branch below
        if(afterEveryBranch && afterEveryBranch.length > 0) {
            branchesBelow.forEach(branchBelow => {
                afterEveryBranch.forEach(afterBranch => {
                    if(!branchBelow.afterEveryBranch) {
                        branchBelow.afterEveryBranch = [];
                    }

                    branchBelow.afterEveryBranch.push(afterBranch.clone());
                });
            });
        }

        // Attach afterEveryStep to each branch below
        if(afterEveryStep && afterEveryStep.length > 0) {
            branchesBelow.forEach(branchBelow => {
                afterEveryStep.forEach(afterBranch => {
                    if(!branchBelow.afterEveryStep) {
                        branchBelow.afterEveryStep = [];
                    }

                    branchBelow.afterEveryStep.push(afterBranch.clone());
                });
            });
        }

        // If isNonParallel (+) is set, connect up the branches in branchesBelow
        if(step.isNonParallel) {
            var nonParallelId = utils.randomId();
            branchesBelow.forEach(branch => branch.nonParallelId = nonParallelId);
        }

        return branchesBelow;
    }

    /**
     * Converts the tree under this.root into an array of Branch in this.branches
     * Called after all of the tree's text has been inputted with parseIn()
     * Gets everything ready for the test runner
     * @param {Array} [groups] - Array of String, where each string is a group we want run (do not run branches with no group or not in at least one group listed here), no group restrictions if this is undefined
     * @param {String} [frequency] - Only run branches at or above this frequency ('high', 'med', or 'low'), no frequency restrictions if this is undefined
     * @param {Boolean} [noDebug] - If true, throws an error if at least one ~ or $ is encountered in this.branches
     * @throws {Error} If an error occurs (e.g., if a function declaration cannot be found)
     */
    generateBranches(groups, frequency, noDebug) {
        try {
            this.branches = this.branchify(this.root, groups, frequency, noDebug);
        }
        catch(e) {
            if(e.name == "RangeError" && e.message == "Maximum call stack size exceeded") {
                if(this.latestBranchifiedStep) {
                    utils.error("Infinite loop detected", this.latestBranchifiedStep.filename, this.latestBranchifiedStep.lineNumber);
                }
                else {
                    throw new Error("Infinite loop detected"); // very rare situation (as this.latestBranchifiedStep is almost always set)
                }
            }
            else {
                throw e;
            }
        }

        // Sort by {frequency}, but otherwise keeping the same order
        var highBranches = [];
        var medBranches = [];
        var lowBranches = [];
        this.branches.forEach(branch => {
            if(branch.frequency == 'high') {
                highBranches.push(branch);
            }
            else if(branch.frequency == 'med') {
                medBranches.push(branch);
            }
            else if(branch.frequency == 'low') {
                lowBranches.push(branch);
            }
            else { // branch.frequency is undefined
                medBranches.push(branch);
            }
        });
        this.branches = highBranches.concat(medBranches).concat(lowBranches);
    }

    /**
     * Verifies correct casing in a hook's text
     * @param {Step} step - The step to verify
     * @param {String} correctText - The correct way to spell step's text
     * @throws {Error} That step is not in the right casing
     */
    verifyHookCasing(step, correctText) {
        if(step.text.trim().replace(/\s+/g, ' ') != correctText) {
            utils.error("Every word must be capitalized in a hook function declaration (use '" + correctText + "' instead)", step.filename, step.lineNumber);
        }
    }

    /**
     * @return {String} JSON representation of this.branches, with references to other objects removed
     */
    serializeBranches() {
        var obj = {
            branches: [],
            beforeEverything: [],
            afterEverything: []
        };

        this.branches.forEach(branch => {
            obj.branches.push(branch.clone(true));
        });

        this.beforeEverything.forEach(branch => {
            obj.beforeEverything.push(branch.clone(true));
        });

        this.afterEverything.forEach(branch => {
            obj.afterEverything.push(branch.clone(true));
        });

        return JSON.stringify(obj);
    }

    /**
     * Merges the given JSON (previous) with this tree's branches and hooks (current)
     * If a branch...
     *     1) Exists in both previous and current
     *         a) Didn't pass in previous (it failed or it didn't run)
     *             It will be included in current
     *         b) Passed in previous
     *             It will be included in current, but marked to not run
     *     2) Only exists in previous
     *         It will remain absent from current (tester got rid of this branch)
     *     3) Only exists in current
     *         It will remain included in current (this is a new branch)
     * @param {String} json - A JSON representation of branches and hooks from a previous run. Same JSON that serializeBranches() returns.
     */
    mergeBranchesFromPrevRun(json) {
        var previous = JSON.parse(json);
        var prevBranches = previous.branches;
        var currBranches = this.branches;

        if(prevBranches.length == 0 && currBranches.length == 0) {
            return;
        }

        currBranches.forEach(currBranch => {
            // Find an equal branch in prevBranches
            var found = false;
            for(var i = 0; i < prevBranches.length; i++) {
                var prevBranch = prevBranches[i];
                if(currBranch.equals(prevBranch)) {
                    // 1) This branch exists in both previous and current
                    if(!prevBranch.isPassed) { // failed or didn't run
                        // 1a) Include in currBranch
                        delete currBranch.passedLastTime;
                    }
                    else {
                        // 1b) Keep in currBranch, set passedLastTime
                        currBranch.passedLastTime = true;
                    }

                    // Clean state
                    delete currBranch.isPassed;
                    delete currBranch.isFailed;

                    found = true;
                    break;
                }
            }

            if(!found) {
                // 3) This branch only exists in current
                // Keep in currBranch, clean state
                delete currBranch.passedLastTime;
                delete currBranch.isPassed;
                delete currBranch.isFailed;
            }
        });

        // 2) As for branches that only exist in previous, they already don't exist in current, so we're good
    }

    /**
     * @return {String} HTML report of this tree's current state
     */
    generateReport(reporter) {
        return reporter.generateReport(this);
    }

    /**
     * Get a count on the number of steps within this.branches. Does not include steps in hooks.
     * @param {Boolean} runnableOnly - If true, only count runnable steps
     * @param {Boolean} completeOnly - If true, only count steps that are complete (passed or failed)
     * @return {Number} Number of steps that are to be run
     */
    getStepCount(runnableOnly, completeOnly) {
        var count = 0;
        this.branches.forEach(branch => {
            if(runnableOnly) {
                if(!branch.passedLastTime) {
                    if(completeOnly) {
                        if(branch.isPassed || branch.isFailed) {
                            branch.steps.forEach(step => {
                                if(!step.isTextualStep) {
                                    count++;
                                }
                            });
                        }
                    }
                    else {
                        branch.steps.forEach(step => {
                            if(!step.isTextualStep) {
                                count++;
                            }
                        });
                    }
                }
            }
            else {
                count += branch.steps.length;
            }
        });

        return count;
    }

    /**
     * @return {Number} Percent (0-100) of steps currently being run that are complete
     */
    getPercentComplete() {
        return (this.getStepCount(true, true) / this.getStepCount(true, false)) * 100.0;
    }

    /**
     * Marks the given branch as passed
     */
    markBranchPassed(branch) {
        branch.isPassed = true;
    }

    /**
     * Marks the given branch as failed
     */
    markBranchFailed(branch) {
        branch.isFailed = true;
    }

    /**
     * Finds a branch not yet run and not currently being run and marks it for the caller
     * @param {String} mark - A string to mark the found branch with
     * @return {Branch} The branch that was found, or null if nothing found
     */
    nextBranch(mark) {

    }

    markStepPassed(branch, step) {

    }

    markStepFailed(branch, step) {

    }

    nextStep(branch) {

    }
}
module.exports = Tree;
