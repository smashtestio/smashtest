const Step = require('./step.js');
const StepBlock = require('./stepblock.js');
const Branch = require('./branch.js');
const Constants = require('./constants.js');
const utils = require('./utils.js');

/**
 * Represents the test tree
 */
class Tree {
    constructor() {
        this.root = new Step();         // the root Step of the tree (parsed version of the text that got inputted)
        this.beforeEverything = [];     // Array of Step, the steps (and their children) to execute before all branches (tests)
        this.afterEverything = [];      // Array of Step, the steps (and their children) to execute after all branches (tests)

        this.branches = [];             // Array of Branch, generated from this.root
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
            var numIndents = numSpaces / Constants.SPACES_PER_INDENT;

            if(numIndents - Math.floor(numIndents) != 0) {
                this.error("The number of spaces at the beginning of a step must be a multiple of " + Constants.SPACES_PER_INDENT + ". You have " + numSpaces + " space(s).", filename, lineNumber);
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

        // Validation against prohibited step texts
        if(step.text.replace(/\s+/g, '').match(Constants.NUMBERS_ONLY_REGEX)) {
            this.error("Invalid step name", filename, lineNumber);
        }

        // * Function Declaration
        if(matches[1]) {
            step.isFunctionDeclaration = matches[1].trim() == '*';

            if(step.isFunctionDeclaration && step.text.match(Constants.STRING_LITERAL_REGEX)) {
                this.error("A *Function declaration cannot have \"strings\" inside of it", filename, lineNumber);
            }
        }

        // Must Test X
        matches = step.text.match(Constants.MUST_TEST_REGEX);
        if(matches) {
            // This step is a Must Test X
            if(step.isFunctionDeclaration) {
                this.error("A *Function cannot start with Must Test", filename, lineNumber);
            }

            step.isMustTest = true;
            step.mustTestText = matches[1];
        }

        // Set identifier booleans and perform related validations
        if(step.identifiers) {
            if(step.identifiers.includes('-T')) {
                step.isToDo = true;
            }
            if(step.identifiers.includes('-M')) {
                step.isManual = true;
            }
            if(step.identifiers.includes('-')) {
                step.isTextualStep = true;

                if(step.isFunctionDeclaration) {
                    this.error("A *Function declaration cannot be a textual step (-) as well", filename, lineNumber);
                }
                if(step.isMustTest) {
                    this.error("A textual step (-) cannot start with Must Test", filename, lineNumber);
                }
            }
            if(step.identifiers.includes('~')) {
                step.isDebug = true;
            }
            if(step.identifiers.includes('~~')) {
                step.isStepByStepDebug = true;
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
                this.error("A step setting {variables} cannot start with a *", filename, lineNumber);
            }

            // Parse vars from text into step.varsBeingSet
            var textCopy = step.text + "";
            step.varsBeingSet = [];
            while(textCopy.trim() != "") {
                matches = textCopy.match(Constants.VARS_SET_REGEX);
                if(!matches) {
                    this.error("A part of this line doesn't properly set a variable", filename, lineNumber); // NOTE: probably unreachable
                }

                var varBeingSet = {
                    name: matches[2].replace(/\{|\}/g, '').trim(),
                    value: matches[5],
                    isLocal: matches[2].includes('{{')
                };

                // Validations for special variables
                if(varBeingSet.name.toLowerCase() == 'frequency') {
                    if(varBeingSet.name != 'frequency') {
                        this.error("The {frequency} variable is special and must be all lowercase", filename, lineNumber);
                    }
                    if(varBeingSet.isLocal) {
                        this.error("The {frequency} variable is special and cannot be {{frequency}}", filename, lineNumber);
                    }
                    if(['high','med','low'].indexOf(utils.stripQuotes(varBeingSet.value)) == -1) {
                        this.error("The {frequency} variable is special and can only be set to 'high', 'med', or 'low'", filename, lineNumber);
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
                        this.error("When multiple {variables} are being set on a single line, those {variables} can only be set to 'string constants'", filename, lineNumber);
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
                        this.error("{vars} can only be set to 'strings'", filename, lineNumber);
                    }
                    if(step.isTextualStep) {
                        this.error("A textual step (ending in -) cannot also start with a {variable} assignment", filename, lineNumber);
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
                    this.error("Invalid [elementFinder in brackets]", filename, lineNumber);
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
        var matches = name.match(Constants.ELEMENTFINDER_REGEX);
        if(matches) {
            var ordinal = (matches[2] || '');
            var text = utils.stripQuotes((matches[5] || '') + (matches[8] || '')); // it's either matches[5] or matches[8]
            var variable = ((matches[6] || '') + (matches[9] || '')).trim(); // it's either matches[6] or matches[9]
            var nextTo = utils.stripQuotes(matches[11] || '');

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
                    // We've reached the end of the step block
                    break;
                }
                else {
                    potentialStepBlock.steps.push(lines[j]);
                }
            }

            if(potentialStepBlock.steps.length > 1) {
                // We've found a step block, which goes from lines index i to j
                potentialStepBlock.filename = filename;
                potentialStepBlock.lineNumber = potentialStepBlock.isSequential ? potentialStepBlock.steps[0].lineNumber - 1 : potentialStepBlock.steps[0].lineNumber;
                potentialStepBlock.indents = potentialStepBlock.steps[0].indents;
                for(var k = 0; k < potentialStepBlock.steps.length; k++) {
                    potentialStepBlock.steps[k].containingStepBlock = potentialStepBlock;

                    // Validate that a step block member is not a function declaration
                    if(potentialStepBlock.steps[k].isFunctionDeclaration) {
                        this.error("You cannot have a *Function declaration within a step block", filename, potentialStepBlock.steps[k].lineNumber);
                    }

                    // Validate that a step block member is not a code block
                    if(typeof potentialStepBlock.steps[k].codeBlock != 'undefined') {
                        this.error("You cannot have a code block within a step block", filename, potentialStepBlock.steps[k].lineNumber);
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
            else { // indentsAdvanced < 0, and current step is a child of an ancestor of the previous step
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
     * @throws {Error} If a step cannot be found, or if a Must Test step is violated
     */
    finalize() {
        generateBranches();
        validateMustTest();
        pruneBranches();

        /**
         * Finds the nearest function declaration step under this.root that matches a given function call step from a Branch
         * @param {Branch} containingBranch - The Branch that contains the function call step at its the very end
         * @return {Step} The nearest function declaration under this.root that matches the function call step
         * @throws {Error} If a matching function declaration could not be found
         */
        function findFunctionDeclaration(containingBranch) {
            // NOTE: Why do we use branches here instead of just using a Step from this.root?
            // Suppose function declaration B is declared inside function declaration A. If A is called, B has to be accessible
            // to the steps under the call to A. This can only be done if the call to A has been "expanded" (has the steps from
            // A's declaration attached), and this is something that's done in branches but not in this.root.

            var index = containingBranch.steps.length - 1;
            var functionCallStepInBranch = containingBranch.steps[index];
            var currStepInTree = functionCallStep.originalStep;

            while(index >= 0) {
                var siblings = [];
                if(currStepInTree.parent) { // currStep is not inside a StepBlock
                    siblings = currStepInTree.parent.children;
                }
                else if(currStepInTree.containingStepBlock) { // currStep is inside a StepBlock
                    siblings = currStepInTree.containingStepBlock.steps;
                }

                for(var i = 0; i < siblings.length; i++) {
                    var sibling = siblings[i];
                    if(!sibling.isFunctionDeclaration) {
                        continue;
                    }

                    if(functionCallStepInBranch.isFunctionMatch(sibling)) {
                        return sibling;
                    }
                }

                index--;
                currStepInTree = containingBranch.steps[index].originalStep;
            }

            this.error("The function '" + functionCallStepInBranch.getFunctionCallText() + "' cannot be found. Is there a typo, or did you mean to make this a textual step (with a - at the end)?", filename, lineNumber);
        }

        /**
         * Converts the tree under this.root into an array of Branch in this.branches
         * Expands function calls, hooks, and Must Test X to their corresponding function declarations
         * @throws {Error} If a step cannot be found
         */
        function generateBranches() {
            this.branches = branchify(this.root);











        }

        /**
         * Converts step and its children into branches. Expands functions, step blocks, hooks, etc.
         * @param {Step} step - Step or StepBlock under this.root to convert to branches
         * @param {Branch} [branchAbove] - Branch that comes above step (used to help find function declarations), [] if omitted
         * @param {Number} [branchIndents] - Number of indents to give step if the branch is being printed out (i.e., the steps under a function are to be indented one unit to the right of the function call step), 0 if omitted
         * @param {Array} [afterEveryBranch] - Array of Branch - the Branches to execute after every child branch of step (in order of preferred execution), [] if omitted
         * @param {String} [frequency] - The frequency set at step or above it
         * @return {Array} Array of Branch, containing the branches at and under step (does not include the steps from branchesAbove). Sorted by ideal execution order (but without regard to {frequency}).
         * @throws {Error} If a step cannot be found, or if a hook name is invalid
         */
        function branchify(step, branchAbove, branchIndents, afterEveryBranch, frequency) {
            if(typeof branchAbove == 'undefined') {
                branchAbove = [];
            }
            if(typeof indentCount == 'undefined') {
                indentCount = 0;
            }
            if(typeof afterEveryBranch == 'undefined') {
                afterEveryBranch = [];
            }

            branchAbove.push(step.cloneForBranch()); // now branchAbove contains step at its end, so we can use it with findFunctionDeclaration()

            var branchesBelow = []; // Branches at and below step (what we're returning)

            // Fill branchesBelow based on step's type
            if(step.isMustTest) {
                var functionDeclarationInTree = findFunctionDeclaration(branchAbove); // If step is 'Must Test X', functionDeclarationInTree is X
                step.mustTestBraches = branchify(functionDeclarationInTree, branchAbove, branchIndents + 1, afterEveryBranch, frequency);
            }
            else if(step.isFunctionCall) {
                var functionDeclarationInTree = findFunctionDeclaration(branchAbove);
                branchesBelow = branchify(functionDeclarationInTree, branchAbove, branchIndents + 1, afterEveryBranch, frequency);

                // Put clone of step at the front of each Branch that results from expanding the function call
                branchesBelow.forEach((branch) => {
                    var clonedStep = step.cloneForBranch();
                    clonedStep.branchIndents = branchIndents;
                    branch.steps.unshift(clonedStep);
                });
            }
            else if(step.isFunctionDeclaration) {
                // Ignore function declarations (since we do not include the *Function Declaration step itself in branchesBelow)
            }
            else if(step instanceof StepBlock) {
                // Branchify each member of this step block
                step.steps.forEach((stepInBlock) => {
                    branchesBelow = branchesBelow.concat(branchify(stepInBlock, branchAbove, branchIndents, afterEveryBranch, frequency));
                });
            }
            else { // Textual steps (including manual steps), non-function-declaration code block steps, {var}='string'
                // {frequency}='high/med/low'
                var frequency = null;
                if(step.varsBeingSet && step.varsBeingSet.length > 0) {
                    step.varsBeingSet.forEach((varBeingSet) => {
                        if(varBeingSet.name == 'frequency') {
                            frequency = utils.stripQuotes(varBeingSet.value);
                        }
                    });
                }

                // Generic step cloning into branchesBelow
                var branch = new Branch();
                var clonedStep = step.cloneForBranch();
                clonedStep.branchIndents = branchIndents;
                if(frequency) {
                    branch.frequency = frequency;
                }
                branch.steps.push();
                branchesBelow.push(branch);
            }

            if(step.children.length > 0) {
                // We have children

                // Check if a child is an * After Every Branch function declaration
                step.children.forEach((child) => {
                    if(child.isFunctionDeclaration) {
                        var canStepText = child.getCanonicalText();
                        var stepText = child.text.trim().replace(/\s+/g, ' ');
                        if(canStepText == "after every branch") {
                            if(stepText != 'After Every Branch') {
                                badHookCasingError(child);
                            }

                            var afterEveryBranchBranches = branchify(child, branchAbove, branchIndents + 1, afterEveryBranch, frequency);
                            afterEveryBranch.unshift(afterEveryBranchBranches); // add to front of array (attached in a way that built-in * After Every Branch functions come last)
                        }
                        else if(canStepText == "before everything") {
                            if(stepText != 'Before Everything') {
                                badHookCasingError(child);
                            }

                            if(child.indents != 0) {
                                this.error("A '* Before Everything' function must not be indented (it must be at the top level)", step.filename, step.lineNumber);
                            }

                            var newBeforeEverything = branchify(child, branchAbove, branchIndents + 1, afterEveryBranch, frequency);
                            this.beforeEverything.push(newBeforeEverything);
                        }
                        else if(canStepText == "after everything") {
                            if(stepText != 'After Everything') {
                                badHookCasingError(child);
                            }

                            if(child.indents != 0) {
                                this.error("An '* After Everything' function must not be indented (it must be at the top level)", step.filename, step.lineNumber);
                            }

                            var newAfterEverything = branchify(child, branchAbove, branchIndents + 1, afterEveryBranch, frequency);
                            this.afterEverything.push(newAfterEverything);
                        }
                    }
                });

                // Recursively call branchify() on children
                var branchesFromChildren = []; // Array of Array of Branch
                step.children.forEach((child) => {
                    var branchesFromChild = branchify(child, branchAbove, branchIndents + 1, afterEveryBranch, frequency);
                    if(branchesFromChild && branchesFromChild.length > 0) {
                        branchesFromChildren.push(branchesFromChild);
                    }
                });

                // Put branchify() results into branchesBelow in a breadth-first manner
                // Take one Branch from each child (to tack onto end of every member of branchesBelow), then continue taking round-robin until nothing left
                var expandedBranchesBelow = [];
                while(branchesFromChildren.length > 0) {
                    for(var i = 0; i < branchesFromChildren.length;) {
                        var branchesFromChild = branchesFromChildren[i];
                        var takenBranch = branchesFromChild.shift(); // take first branch from each child
                        branchesBelow.forEach((branchBelow) => { // put takenBranch onto every branchBelow
                            var expandedBranch = branchBelow.clone();
                            expandedBranch.attachToEnd(takenBranch);
                            expandedBranchesBelow.push(expandedBranch);
                        });

                        if(branchesFromChild.length == 0) {
                            branchesFromChildren.splice(i, 1); // remove empty branchesFromChild
                        }
                        else {
                            i++;
                        }
                    }
                }
                branchesBelow = expandedBranchesBelow;
            }
            else {
                // We're at a leaf

                // Add afterEveryBranch to every member of branchesBelow
                branchesBelow.forEach((branchBelow) => {
                    afterEveryBranch.forEach((afterBranch) => {
                        branchBelow.afterBranches = afterBranch.clone();
                    });
                });
            }

            return branchesBelow;
        }

        /**
         * Throws an error for bad casing in the given hook step
         * @throws {Error} That step is not in the right casing
         */
        function badHookCasingError(step) {
            this.error("Every word must be capitalized in a hook function declaration (e.g., 'After Every Branch')", step.filename, step.lineNumber);
        }

        /**
         * Removes branches that we don't want run
         */
        function pruneBranches() {






        }

        /**
         * Enforces Must Test steps
         * @throws {Error} If a Must Test step is violated
         */
        function validateMustTest() {






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
