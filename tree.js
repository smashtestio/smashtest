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
        this.isDebug = false;                // true if at least one step has isDebug (~) set

        /*
        OPTIONAL

        this.elapsed = 0;                    // number of ms it took for all branches to execute, set to -1 if paused
        this.timeStarted = {};               // Date object (time) of when this tree started being executed
        this.timeEnded = {};                 // Date object (time) of when this tree ended execution

        this.passed = 0;                     // total number of passed branches in this tree
        this.failed = 0;                     // total number of failed branches in this tree
        this.skipped = 0;                    // total number of skipped branches in this tree
        this.complete = 0;                   // total number of complete branches in this tree (passed, failed, or skipped)
        this.totalToRun = 0;                 // total number of branches that will be in the next run (total number of branches - branches passed last time if we're doing a -skipPassed)
        this.totalInReport = 0;              // total number of branches in this tree

        this.totalStepsComplete = 0;         // total number of complete steps in this tree (out of the steps that will be in the next run)
        this.totalSteps = = 0;               // total number of steps in this tree that will be in the next run
        */
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
        if(line.match(Constants.FULL_LINE_COMMENT)) { // comment
            return 0;
        }

        let spacesAtFront = line.match(/^( *)([^ ]|$)/);
        let whitespaceAtFront = line.match(/^(\s*)([^\s]|$)/);

        if(spacesAtFront[1] != whitespaceAtFront[1]) {
            utils.error("Spaces are the only type of whitespace allowed at the beginning of a step", filename, lineNumber);
        }
        else {
            let numSpaces = spacesAtFront[1].length;
            let numIndents = numSpaces / Constants.SPACES_PER_INDENT;

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
        let step = new Step();
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

        let matches = line.match(Constants.LINE_WHOLE);
        if(!matches) {
            utils.error("This step is not written correctly", filename, lineNumber); // NOTE: probably unreachable (LINE_WHOLE can match anything)
        }

        // Parsed parts of the line
        step.text = matches[5];
        if(matches[4]) {
            step.isFunctionDeclaration = true;
            if(matches[4].trim() == '**') {
                step.isHook = true;
            }
        }
        if(matches[1]) {
            step.frontIdentifiers = matches[1].trim().split(/\s+/);
            step.identifiers = (step.identifiers || []).concat(step.frontIdentifiers);
        }
        if(matches[11]) {
            step.backIdentifiers = matches[11].trim().split(/\s+/);
            step.identifiers = (step.identifiers || []).concat(step.backIdentifiers);
        }
        if(matches[15]) {
            step.codeBlock = matches[15].substring(1); // substring() strips off leading {
        }
        if(matches[17]) {
            step.comment = matches[17];
        }

        // Validation against prohibited step texts
        if(step.text.replace(/\s+/g, '').match(Constants.NUMBERS_ONLY_WHOLE)) {
            utils.error("Invalid step name", filename, lineNumber);
        }

        // * Function Declaration
        if(step.isFunctionDeclaration) {
            if(step.text.match(Constants.STRING_LITERAL)) {
                utils.error("A * Function declaration cannot have 'strings', \"strings\", or [strings] inside of it", filename, lineNumber);
            }

            // Validate that all vars in a function declaration are {{local}}
            matches = step.text.match(Constants.VAR);
            if(matches) {
                for(let i = 0; i < matches.length; i++) {
                    let match = matches[i];
                    let name = utils.stripBrackets(match);
                    if(!match.startsWith('{{')) {
                        utils.error("All variables in a * Function declaration must be {{local}} and {" + name + "} is not", filename, lineNumber);
                    }
                }
            }
        }
        else { // not a function declaration
            // Validate that a non-function declaration isn't using a hook step name
            if(Constants.HOOK_NAMES.indexOf(utils.canonicalize(step.text)) != -1) {
                utils.error("You cannot have a function call with that name. That's reserved for hook function declarations.", filename, lineNumber);
            }
        }

        // Set identifier booleans and perform related validations
        if(step.frontIdentifiers) {
            if(step.frontIdentifiers.includes('~')) {
                step.isDebug = true;
                step.isBeforeDebug = true;
            }

        }
        if(step.backIdentifiers) {
            if(step.backIdentifiers.includes('~')) {
                step.isDebug = true;
                step.isAfterDebug = true;
            }
        }
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

        // Validate hook steps
        if(step.isHook) {
            let canStepText = utils.canonicalize(step.text);
            let stepText = step.text.trim().replace(/\s+/g, ' ');
            let index = Constants.HOOK_NAMES.indexOf(canStepText);
            if(index == -1) {
                utils.error("Invalid ** Hook name", filename, lineNumber);
            }
            else {
                if(!step.hasCodeBlock()) {
                    utils.error("A hook must have a code block", filename, lineNumber);
                }
                if(step.identifiers && step.identifiers.length > 0) {
                    utils.error("A hook cannot have any identifiers (" + step.identifiers[0] + ")", filename, lineNumber);
                }
            }
        }

        // Steps that set variables
        if(step.text.match(Constants.VARS_SET_WHOLE)) {
            // This step is a {var1} = Val1, {var2} = Val2, {{var3}} = Val3, etc. (one or more vars)

            if(step.isFunctionDeclaration) {
                utils.error("A step setting {variables} cannot start with a *", filename, lineNumber);
            }

            // Parse vars from text into step.varsBeingSet
            let textCopy = step.text + "";
            step.varsBeingSet = [];
            while(textCopy.trim() != "") {
                matches = textCopy.match(Constants.VARS_SET_WHOLE);
                if(!matches) {
                    utils.error("A part of this line doesn't properly set a variable", filename, lineNumber); // NOTE: probably unreachable
                }

                let varBeingSet = {
                    name: utils.stripBrackets(matches[2]),
                    value: matches[5],
                    isLocal: matches[2].includes('{{')
                };

                // Generate variable name validations
                if(varBeingSet.name.replace(/\s+/g, '').match(Constants.NUMBERS_ONLY_WHOLE)) {
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
                for(let i = 0; i < step.varsBeingSet.length; i++) {
                    if(!step.varsBeingSet[i].value.match(Constants.STRING_LITERAL_WHOLE)) {
                        utils.error("When multiple {variables} are being set on a single line, those {variables} can only be set to 'strings', \"strings\", or [strings]", filename, lineNumber);
                    }
                }
            }
            else {
                // This step is {var}=Func or {var}='str' (only one var being set)

                if(!step.varsBeingSet[0].value.match(Constants.STRING_LITERAL_WHOLE)) {
                    // This step is {var}=Func

                    step.isFunctionCall = true;
                    if(step.hasCodeBlock()) { // In {var} = Text {, the Text is not considered a function call
                        delete step.isFunctionCall;
                    }

                    // Validations
                    if(step.varsBeingSet[0].value.replace(/\s+/g, '').match(Constants.NUMBERS_ONLY_WHOLE)) {
                        utils.error("{vars} can only be set to 'strings', \"strings\", or [strings]", filename, lineNumber);
                    }
                    if(step.isTextualStep) {
                        utils.error("A textual step (ending in -) cannot also start with a {variable} assignment", filename, lineNumber);
                    }
                }
            }
        }
        else { // this step is not a {var}= step
            // Set isFunctionCall
            if(!step.isTextualStep && !step.isFunctionDeclaration) {
                step.isFunctionCall = true;
                if(step.hasCodeBlock()) { // In Text {, the Text is not considered a function call
                    delete step.isFunctionCall;
                }
            }
        }

        return step;
    }

    /**
     * Parses a string and adds it onto root
     * @param {String} buffer - Contents of a test file
     * @param {String} filename - Name of the test file
     * @param {Boolean} [isPackaged] - If true, filename is a package file
     */
    parseIn(buffer, filename, isPackaged) {
        let lines = buffer.split(/\n/);

        // Convert each string in lines to either a Step object
        // For a line that's part of a code block, insert the code into the Step representing the code block and remove that line
        let lastStepCreated = null;
        let lastNonEmptyStep = null;
        let currentlyInsideCodeBlockFromLineNum = -1; // if we're currently inside a code block, that code block started on this line, otherwise -1
        for(let i = 0, lineNumber = 1; i < lines.length; i++, lineNumber++) {
            let line = lines[i];

            if(line.match(Constants.FULL_LINE_COMMENT)) { // ignore lines that are fully comments
                lines.splice(i, 1);
                i--;
                continue;
            }

            if(currentlyInsideCodeBlockFromLineNum != -1) { // we're currently inside a code block
                if(line.match(new RegExp("^[ ]{" + (lastStepCreated.indents * Constants.SPACES_PER_INDENT) + "}\\}\\s*(\\/\\/.*?)?\\s*$"))) { // code block is ending
                    lastStepCreated.codeBlock += "\n";
                    currentlyInsideCodeBlockFromLineNum = -1;
                }
                else {
                    lastStepCreated.codeBlock += ("\n" + line);
                }

                lines[i] = this.parseLine('', filename, lineNumber); // blank out the line we just handled
                if(currentlyInsideCodeBlockFromLineNum == -1) { // if the code block just ended, mark it as such
                    lines[i].indents = this.numIndents(line, filename, lineNumber);
                    lines[i].codeBlockEnd = true;
                }
            }
            else {
                let step = this.parseLine(line, filename, lineNumber);
                step.indents = this.numIndents(line, filename, lineNumber);

                if(!lastNonEmptyStep && step.indents != 0) {
                    utils.error("The first step must have 0 indents", filename, lineNumber);
                }

                if(i - 1 >= 0 && step.text != '' && lines[i - 1].codeBlockEnd && step.indents == lines[i - 1].indents) {
                    utils.error("You cannot have a step directly adjacent to a code block above. Consider putting an empty line above this one.", filename, lineNumber);
                }

                // If this is the start of a new code block
                if(step.hasCodeBlock()) {
                    currentlyInsideCodeBlockFromLineNum = lineNumber;
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
        for(let i = 0; i < lines.length; i++) {
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
        for(let i = 0; i < lines.length;) {
            if(lines[i].text == '' || lines[i].text == '..') {
                // The first line in a step block is a normal line
                i++;
                continue;
            }

            // Current step may start a step block
            let potentialStepBlock = new StepBlock();

            if(i > 0 && lines[i-1].text == '..') {
                potentialStepBlock.isSequential = true;
            }

            potentialStepBlock.steps.push(lines[i]);

            // See how far down it goes
            for(var j = i + 1; j < lines.length; j++) { // var so that j is accessible outside the for loop
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
                for(let k = 0; k < potentialStepBlock.steps.length; k++) {
                    potentialStepBlock.steps[k].containingStepBlock = potentialStepBlock;

                    // Validate that a step block member is not a function declaration
                    if(potentialStepBlock.steps[k].isFunctionDeclaration) {
                        utils.error("You cannot have a * Function declaration within a step block", filename, potentialStepBlock.steps[k].lineNumber);
                    }

                    // Validate that a step block member is not a code block
                    if(potentialStepBlock.steps[k].hasCodeBlock()) {
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
        for(let i = 0; i < lines.length;) {
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
        for(let i = 0; i < lines.length; i++) {
            let currStepObj = lines[i]; // either a Step or StepBlock object
            let prevStepObj = i > 0 ? lines[i-1] : null;

            // Packages
            if(isPackaged) {
                currStepObj.isPackaged = true;
            }

            // Indents of new step vs. last step
            let indentsAdvanced = 0;
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
                let parent = prevStepObj.parent;
                for(let j = indentsAdvanced; j < 0; j++) {
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
     * @param {Array} stepsAbove - Array of Step (no StepBlocks), steps above the function call step (with functions, step blocks, etc. already expanded by branchify()), with the function call step at the very end of the array
     * @return {Step} The nearest function declaration under this.root that matches the function call step
     * @throws {Error} If a matching function declaration could not be found
     */
    findFunctionDeclaration(stepsAbove) {
        // NOTE: Why do we input stepsAbove instead of just inputting a function call Step?
        // The difference between a function call's parents and stepsAbove is that stepsAbove has been "expanded" by branchify().
        // Suppose function declaration B is declared inside function declaration A. If A is called, B has to be accessible
        // to the steps under the call to A. This can only be done if the call to A has been "expanded" (has the steps from
        // A's declaration attached).

        let index = stepsAbove.length - 1;
        let functionCall = stepsAbove[index];

        for(; index >= 0; index--) {
            let currStepInTree = stepsAbove[index].originalStepInTree;

            let siblings = [];
            if(currStepInTree.parent) { // currStep is not inside a StepBlock
                siblings = currStepInTree.parent.children;
            }
            else { // currStep is inside a StepBlock
                siblings = currStepInTree.containingStepBlock.parent.children; // these are the siblings of the step block's parent (remember, step blocks themselves cannot have function declarations)
            }

            for(let i = 0; i < siblings.length; i++) {
                let sibling = siblings[i];
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

        if(step.functionDeclarationInTree.hasCodeBlock()) {
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
     * Converts step and its children into branches. Expands functions, step blocks, etc.
     * @param {Step} step - Step from the tree (this.root) to convert to branches (NOTE: do not set step to a StepBlock unless it's a sequential StepBlock)
     * @param {Array} [groups] - Array of String, where each string is a group we want run (do include branches with no group or not in at least one group listed here), no group restrictions if this is undefined
     * @param {String} [minFrequency] - Only include branches at or above this frequency ('high', 'med', or 'low'), no frequency restrictions if this is undefined
     * @param {Boolean} [noDebug] - If true, throws an error if at least one ~ or $ is encountered in the tree at or below the given step
     * @param {Array} [stepsAbove] - Array of Step, steps that comes above this step, with function calls, etc. already expanded (used to help find function declarations), [] if omitted
     * @param {Number} [branchIndents] - Number of indents to give step if the branch is being printed out (i.e., the steps under a function are to be indented one unit to the right of the function call step), 0 if omitted
     * @param {Boolean} [isFunctionCall] - If true, this branchify() call is to a function declaration step, in response to a function call step
     * @param {Boolean} [isSequential] - If true, combine branches of children sequentially (implements .. identifier)
     * @return {Array} Array of Branch, containing the branches at and under step (does not include the steps from branchesAbove). Sorted by ideal execution order (but without regard to {frequency}). Returns null for function declarations encountered while recursively walking the tree.
     * @throws {Error} If a function declaration cannot be found, or if a hook has children (which is not allowed)
     */
    branchify(step, groups, minFrequency, noDebug, stepsAbove, branchIndents, isFunctionCall, isSequential) {
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

        // Set this.isDebug
        if(step.isDebug) {
            this.isDebug = true;
        }

        // ***************************************
        // 2) Fill branchesFromThisStep with this step
        //    (which may be multiple branches if this step is a function call, etc.)
        // ***************************************

        let branchesFromThisStep = []; // Array of Branch

        if(step.indents == -1) {
            // We're at the root. Ignore it.
        }
        else if(step.isFunctionCall) {
            step.functionDeclarationInTree = this.findFunctionDeclaration(stepsAbove);

            let clonedStep = step.cloneForBranch();
            clonedStep.branchIndents = branchIndents;
            clonedStep.mergeInFunctionDeclaration(step.functionDeclarationInTree); // merge top step in function declaration into this function call

            let isReplaceVarsInChildren = false; // true if this step is {var}=F and F contains children in format {x}='val', false otherwise

            if(clonedStep.varsBeingSet && clonedStep.varsBeingSet.length > 0) {
                // This step is {var} = F

                // Validate that F is either a code block function, or has all children being {x}='val'
                isReplaceVarsInChildren = this.validateVarSettingFunction(step);
            }

            branchesFromThisStep = this.branchify(step.functionDeclarationInTree, groups, minFrequency, noDebug, stepsAbove, branchIndents + 1, true, undefined); // there's no isSequential in branchify() because isSequential does not extend into function calls

            if(branchesFromThisStep.length == 0) {
                // If branchesFromThisStep is empty (happens when the function declaration is empty), just stick the current step (function call) into a sole branch
                let branch = new Branch();
                branchesFromThisStep = [ branch ];
                branchesFromThisStep[0].push(clonedStep);
            }
            else {
                if(isReplaceVarsInChildren) {
                    // replace {x} in each child to {var} (where this step is {var} = F)
                    branchesFromThisStep.forEach(branch => {
                        branch.steps[0].varsBeingSet[0].name = clonedStep.varsBeingSet[0].name;
                    });

                    // since {var} is being set in the children directly below, remove the varBeingSet from this step
                    delete step.varsBeingSet;
                }

                // Put clone of this step at the front of each Branch that results from expanding the function call
                branchesFromThisStep.forEach(branch => {
                    branch.unshift(clonedStep.cloneForBranch()); // new clone every time we unshift
                });
            }
        }
        else if(step instanceof StepBlock && step.isSequential) { // sequential step block (with a .. on top)
            // Branches from each step block member are cross joined sequentially to each other
            let branchesInThisStepBlock = [];
            step.steps.forEach(stepInBlock => {
                let branchesFromThisStepBlockMember = this.branchify(stepInBlock, groups, minFrequency, noDebug, stepsAbove, branchIndents); // there's no isSequential in branchify() because isSequential does not extend into function calls
                if(branchesInThisStepBlock.length == 0) {
                    branchesInThisStepBlock = branchesFromThisStepBlockMember;
                }
                else {
                    let newBranchesInThisStepBlock = [];
                    branchesInThisStepBlock.forEach(branchInThisStepBlock => {
                        branchesFromThisStepBlockMember.forEach(branchBelowBlockMember => {
                            let b = branchInThisStepBlock.clone();
                            b.mergeToEnd(branchBelowBlockMember);
                            newBranchesInThisStepBlock.push(b);
                        });
                    });
                    branchesInThisStepBlock = newBranchesInThisStepBlock;
                }
            });
            branchesFromThisStep = branchesInThisStepBlock;

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
            let branch = new Branch();
            let clonedStep = step.cloneForBranch();
            clonedStep.branchIndents = branchIndents;

            branch.push(clonedStep);

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

        let children = step.children;

        if(children.length == 0) {
            // If this step is a member of a non-sequential step block, the step block's children are this step's "children"
            if(step.containingStepBlock && !step.containingStepBlock.isSequential) {
                children = step.containingStepBlock.children;
            }
        }

        // Check if a child is a hook function declaration
        let beforeEveryBranch = [];
        let afterEveryBranch = [];
        let beforeEveryStep = [];
        let afterEveryStep = [];
        children.forEach(child => {
            if(child.isFunctionDeclaration && child.isHook) {
                let clonedHookStep = child.cloneAsFunctionCall();
                clonedHookStep.branchIndents = 0;

                if(child.children.length > 0) {
                    utils.error("A hook declaration cannot have children", child.filename, child.lineNumber);
                }

                let canStepText = utils.canonicalize(child.text);
                if(canStepText == "before every branch") {
                    beforeEveryBranch.unshift(clonedHookStep);
                }
                else if(canStepText == "after every branch") {
                    afterEveryBranch.push(clonedHookStep);
                }
                else if(canStepText == "before every step") {
                    beforeEveryStep.unshift(clonedHookStep);
                }
                else if(canStepText == "after every step") {
                    afterEveryStep.push(clonedHookStep);
                }
                else if(canStepText == "before everything") {
                    if(child.indents != 0) {
                        utils.error("A '** Before Everything' function must not be indented (it must be at 0 indents)", child.filename, child.lineNumber);
                    }

                    this.beforeEverything.unshift(clonedHookStep); // inserted this way so that packaged hooks get executed first
                }
                else if(canStepText == "after everything") {
                    if(child.indents != 0) {
                        utils.error("An '** After Everything' function must not be indented (it must be at 0 indents)", child.filename, child.lineNumber);
                    }

                    this.afterEverything.push(clonedHookStep); // inserted this way so that packaged hooks get executed last
                }
            }
        });

        // Recursively call branchify() on children
        let branchesFromChildren = []; // Array of Branch
        children.forEach(child => {
            if(child instanceof StepBlock && !child.isSequential) {
                // If this child is a non-sequential step block, just call branchify() directly on each member step
                child.steps.forEach(step => {
                    let branchesFromChild = this.branchify(step, groups, minFrequency, noDebug, stepsAbove, branchIndents, false, isSequential);
                    if(branchesFromChild && branchesFromChild.length > 0) {
                        branchesFromChildren = branchesFromChildren.concat(branchesFromChild);
                    }
                    // NOTE: else is probably unreachable, since branchify() only returns null on a function declaration and a function declaration cannot be a member of a step block
                });
            }
            else {
                // If this child is a step, call branchify() on it normally
                let branchesFromChild = this.branchify(child, groups, minFrequency, noDebug, stepsAbove, branchIndents, false, isSequential);
                if(branchesFromChild && branchesFromChild.length > 0) {
                    branchesFromChildren = branchesFromChildren.concat(branchesFromChild);
                }
            }
        });

        // ***************************************
        // 4) Remove branches we don't want run
        // ***************************************

        /**
         * @param {Branch} branch - The branch to look through
         * @param {String} indentifier - The identifier to look for ('~' or '$')
         * @return {Object} Object, in format { step = the first Step in the given branch to contain ~/$, depth = depth at which the ~/$ was found }, null if nothing found
         */
        function findIdentifierDepth(branch, identifier) {
            let isDebug = identifier == '~';
            for(let i = 0; i < branch.steps.length; i++) {
                let step = branch.steps[i];
                if(isDebug ? step.isDebug : step.isOnly) {
                    if(step.isFunctionCall) {
                        // Tie-break based on if the ~/$ is on the function call vs. function declaration
                        if(isDebug ? step.originalStepInTree.isDebug : step.originalStepInTree.isOnly) { // ~/$ is on the function call
                            return {
                                step: step,
                                depth: i
                            };
                        }
                        else { // ~/$ is slightly deeper, at the function declaration (so add .5 to the depth)
                            return {
                                step: step,
                                depth: i + 0.5
                            };
                        }
                    }
                    else {
                        return {
                            step: step,
                            depth: i
                        };
                    }
                }
            }

            return null; // probably won't be reached
        }

        // Remove branches by $'s
        // Choose the branch with the $ at the shallowest depth, choosing multiple branches if there's a tie
        let shortestDepth = -1;
        for(let i = 0; i < branchesFromChildren.length; i++) {
            let branchFromChild = branchesFromChildren[i];
            if(branchFromChild.isOnly) {
                // A $ was found
                let o = findIdentifierDepth(branchFromChild, '$');
                if(o.depth < shortestDepth || shortestDepth == -1) {
                    shortestDepth = o.depth;
                }
            }
        }
        if(shortestDepth != -1) {
            branchesFromChildren = branchesFromChildren.filter(branch => {
                let o = findIdentifierDepth(branch, '$');
                if(!o) {
                    return false;
                }
                else {
                    return o.depth == shortestDepth;
                }
            });
        }

        let directIsOnlyFound = false;
        for(let i = 0; i < branchesFromChildren.length; i++) {
            let branchFromChild = branchesFromChildren[i];
            if(branchFromChild.steps[0].isOnly) {
                // A $ was found. Now find all of them.
                directIsOnlyFound = true;
                branchesFromChildren = branchesFromChildren.filter(branch => branch.steps[0].isOnly);
                break;
            }
        }
        if(!directIsOnlyFound) {
            // If a isOnly child branch exists, remove the other branches that are not isOnly
            for(let i = 0; i < branchesFromChildren.length; i++) {
                let branchFromChild = branchesFromChildren[i];
                if(branchFromChild.isOnly) {
                    // A $ was found. Now find all of them.
                    branchesFromChildren = branchesFromChildren.filter(branch => branch.isOnly);
                    break;
                }
            }
        }

        // Remove branches by groups (but only for steps at the top of the tree)
        if(groups && step.indents == -1) {
            for(let i = 0; i < branchesFromChildren.length;) {
                let branchFromChild = branchesFromChildren[i];

                if(!branchFromChild.groups) {
                    removeBranch();
                    continue;
                }

                let isGroupMatched = false;
                for(let j = 0; j < groups.length; j++) {
                    let groupAllowedToRun = groups[j];
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
                        let debugStep = findIdentifierDepth(branchFromChild, '~').step;
                        utils.error("This step contains a ~, but is not inside one of the groups being run. Either add it to the groups being run or remove the ~.", debugStep.filename, debugStep.lineNumber);
                    }
                    else {
                        branchesFromChildren.splice(i, 1); // remove this branch
                    }
                }
            }
        }

        // Remove branches by frequency (but only for steps at the top of the tree)
        if(minFrequency && step.indents == -1) {
            for(let i = 0; i < branchesFromChildren.length;) {
                let branchFromChild = branchesFromChildren[i];
                let freqAllowed = freqToNum(minFrequency);
                let freqOfBranch = freqToNum(branchFromChild.frequency);

                if(freqOfBranch >= freqAllowed) {
                    i++; // keep it
                }
                else {
                    if(branchFromChild.isDebug) {
                        let debugStep = findIdentifierDepth(branchFromChild, '~').step;
                        utils.error("This step contains a ~, but is not above the frequency allowed to run (" + minFrequency + "). Either set its frequency higher or remove the ~.", debugStep.filename, debugStep.lineNumber);
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

        // Remove branches by ~'s
        // If found, remove all branches other than the one that's connected with one or more ~'s
        // When multiple branches have ~'s somewhere inside, always prefer the branch with the shallowest-depth ~
        let branchFound = null;
        shortestDepth = -1;
        for(let i = 0; i < branchesFromChildren.length; i++) {
            let branchFromChild = branchesFromChildren[i];
            if(branchFromChild.isDebug) {
                // A ~ was found
                let o = findIdentifierDepth(branchFromChild, '~');
                if(o.depth < shortestDepth || shortestDepth == -1) {
                    shortestDepth = o.depth;
                    branchFound = branchFromChild;
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

        let branchesBelow = []; // what we're returning - represents all branches at and below this step

        // If branchesFromThisStep is empty, "prime" it with an empty Branch, so that the loops below work
        if(branchesFromThisStep.length == 0) {
            branchesFromThisStep.push(new Branch());
        }

        if(isSequential && !(step instanceof StepBlock)) {
            // One big resulting branch, built as follows:
            // One branchesFromThisStep branch, each child branch, one branchesFromThisStep branch, each child branch, etc.
            let bigBranch = new Branch();
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
                    let newBranchBelow = branchFromThisStep.clone();
                    newBranchBelow.mergeToEnd(branchFromChild.clone());
                    branchesBelow.push(newBranchBelow);
                });
            });

            if(branchesBelow.length == 0 && branchesFromThisStep.length >= 1 && branchesFromThisStep[0].steps.length > 0) {
                branchesBelow = branchesFromThisStep;
            }
        }

        // Attach beforeEveryBranch to each branch below
        if(beforeEveryBranch && beforeEveryBranch.length > 0) {
            branchesBelow.forEach(branchBelow => {
                beforeEveryBranch.forEach(s => {
                    if(!branchBelow.beforeEveryBranch) {
                        branchBelow.beforeEveryBranch = [];
                    }

                    branchBelow.beforeEveryBranch.push(s.cloneForBranch());
                });
            });
        }

        // Attach afterEveryBranch to each branch below
        if(afterEveryBranch && afterEveryBranch.length > 0) {
            branchesBelow.forEach(branchBelow => {
                afterEveryBranch.forEach(s => {
                    if(!branchBelow.afterEveryBranch) {
                        branchBelow.afterEveryBranch = [];
                    }

                    branchBelow.afterEveryBranch.push(s.cloneForBranch());
                });
            });
        }

        // Attach beforeEveryStep to each branch below
        if(beforeEveryStep && beforeEveryStep.length > 0) {
            branchesBelow.forEach(branchBelow => {
                beforeEveryStep.forEach(s => {
                    if(!branchBelow.beforeEveryStep) {
                        branchBelow.beforeEveryStep = [];
                    }

                    branchBelow.beforeEveryStep.push(s.cloneForBranch());
                });
            });
        }

        // Attach afterEveryStep to each branch below
        if(afterEveryStep && afterEveryStep.length > 0) {
            branchesBelow.forEach(branchBelow => {
                afterEveryStep.forEach(s => {
                    if(!branchBelow.afterEveryStep) {
                        branchBelow.afterEveryStep = [];
                    }

                    branchBelow.afterEveryStep.push(s.cloneForBranch());
                });
            });
        }

        // If isNonParallel (+) is set, connect up the branches in branchesBelow
        if(step.isNonParallel) {
            let nonParallelId = utils.randomId();
            branchesBelow.forEach(branch => branch.nonParallelId = nonParallelId);
        }

        return branchesBelow;
    }

    /**
     * Converts the tree under this.root into an array of Branch in this.branches
     * Called after all of the tree's text has been inputted with parseIn()
     * Gets everything ready for the test runner
     * @param {Array} [groups] - Array of String, where each string is a group we want run (do not run branches with no group or not in at least one group listed here), no group restrictions if this is undefined
     * @param {String} [minFrequency] - Only run branches at or above this frequency ('high', 'med', or 'low'), no frequency restrictions if this is undefined
     * @param {Boolean} [noDebug] - If true, throws an error if at least one ~ or $ is encountered in this.branches
     * @throws {Error} If an error occurs (e.g., if a function declaration cannot be found)
     */
    generateBranches(groups, minFrequency, noDebug) {
        try {
            this.branches = this.branchify(this.root, groups, minFrequency, noDebug);
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
        let highBranches = [];
        let medBranches = [];
        let lowBranches = [];
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

        // Marks branches with a first step of -T or -M as skipped
        this.branches.forEach(branch => {
            if(branch.steps[0].isManual || branch.steps[0].isToDo) {
                branch.isSkipped = true;
            }
        });
    }

    /**
     * @return {Object} Object containing this.branches, with references to other objects removed
     */
    serialize() {
        let obj = {
            branches: [],
            beforeEverything: [],
            afterEverything: []
        };

        this.branches.forEach(branch => {
            let clone = branch.clone(true);
            if(branch.passedLastTime) {
                clone.isPassed = true;
            }
            obj.branches.push(clone);
        });

        this.beforeEverything.forEach(s => {
            obj.beforeEverything.push(s.cloneForBranch(true));
        });

        this.afterEverything.forEach(s => {
            obj.afterEverything.push(s.cloneForBranch(true));
        });

        const BLACKLIST = [ 'branches', 'beforeEverything', 'afterEverything', 'root', 'latestBranchifiedStep' ];

        for(let property in this) {
            if(this.hasOwnProperty(property) && BLACKLIST.indexOf(property) == -1) {
                obj[property] = this[property];
            }
        }

        return obj;
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
     * @param {String} json - A JSON representation of branches and hooks from a previous run. Same JSON that serialize() returns.
     */
    mergeBranchesFromPrevRun(json) {
        let previous = JSON.parse(json);
        let prevBranches = previous.branches;
        let currBranches = this.branches;

        if(!prevBranches) {
            return;
        }

        if(prevBranches.length == 0 && currBranches.length == 0) {
            return;
        }

        currBranches.forEach(currBranch => {
            // Find an equal branch in prevBranches
            let found = false;
            for(let i = 0; i < prevBranches.length; i++) {
                let prevBranch = prevBranches[i];
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
                    delete currBranch.isSkipped;

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
                delete currBranch.isSkipped;
            }
        });

        // 2) As for branches that only exist in previous, they already don't exist in current, so we're good
    }

    /**
     * Get a count on the number of branches within this.branches
     * @param {Boolean} [runnableOnly] - If true, only count branches that are set to run (i.e., those that passed last time don't count, if we're doing a -skipPassed)
     * @param {Boolean} [completeOnly] - If true, only count branches that are complete (passed, failed, or skipped)
     * @param {Boolean} [passedOnly] - If true, only count branches that have passed
     * @param {Boolean} [failedOnly] - If true, only count branches that have failed
     * @param {Boolean} [skippedOnly] - If true, only count branches that have skipped
     * @return {Number} Number of branches
     */
    getBranchCount(runnableOnly, completeOnly, passedOnly, failedOnly, skippedOnly) {
        let count = 0;
        for(let i = 0; i < this.branches.length; i++) {
            let branch = this.branches[i];

            if(runnableOnly && branch.passedLastTime) {
                continue;
            }

            if(completeOnly && !branch.isPassed && !branch.isFailed && !branch.isSkipped && !branch.passedLastTime) {
                continue;
            }

            if(passedOnly && !branch.isPassed) {
                continue;
            }

            if(failedOnly && !branch.isFailed) {
                continue;
            }

            if(skippedOnly && !branch.isSkipped) {
                continue;
            }

            count++;
        }

        return count;
    }

    /**
     * Get a count on the number of steps within this.branches. Does not include steps in hooks.
     * @param {Boolean} [runnableOnly] - If true, do not include branches that passed previously, or steps at or below a -T or -M
     * @param {Boolean} [completeOnly] - If true, only include steps that are complete (passed, failed, or skipped over)
     * @param {Boolean} [unexpectedOnly] - If true, only include steps that are complete and have an unexpected result
     * @return {Number} Total number of steps
     */
    getStepCount(runnableOnly, completeOnly, unexpectedOnly) {
        let count = 0;
        for(let i = 0; i < this.branches.length; i++) {
            let branch = this.branches[i];

            if(runnableOnly && branch.passedLastTime) {
                continue;
            }

            for(let j = 0; j < branch.steps.length; j++) {
                let step = branch.steps[j];

                if(runnableOnly && (step.isToDo || step.isManual)) {
                    break; // go to next branch
                }

                if(completeOnly && !step.isComplete() && !branch.isComplete()) {
                    continue;
                }

                if(unexpectedOnly && step.asExpected) {
                    continue;
                }

                count++;
            }
        }

        return count;
    }

    /**
     * Finds a branch that hasn't run yet and marks it for the caller
     * @return {Branch} The chosen Branch, or null if nothing left at all
     */
    nextBranch() {
        let branchNotYetTaken = null;
        for(let i = 0; i < this.branches.length; i++) {
            let branch = this.branches[i];
            if(!branch.isRunning && !branch.isPassed && !branch.isFailed && !branch.isSkipped && !branch.passedLastTime) {
                if(branch.nonParallelId) {
                    // If a branch's nonParallelId is set, check if a previous branch with that id is still executing by another thread
                    let found = false;
                    for(let j = 0; j < this.branches.length; j++) {
                        let b = this.branches[j];
                        if(b.nonParallelId == branch.nonParallelId && b.isRunning) {
                            found = true;
                            break;
                        }
                    }

                    if(found) {
                        // You can't touch this branch yet, another branch with the same nonParallelId is still executing
                        continue;
                    }
                }

                branchNotYetTaken = branch;
                break;
            }
        }

        if(branchNotYetTaken) {
            branchNotYetTaken.isRunning = true;
            return branchNotYetTaken;
        }
        else {
            return null;
        }
    }

    /**
     * Finds all other branches whose first N steps are the same as the first N steps of a given branch
     * @param {Branch} branch - The given branch
     * @param {Number} n - The number of steps to look at
     * @param {Array} branches - The pool of branches to look in
     * @return {Array} Array of Branch - branches whose first N steps are the same as the given's branch's first N steps
     */
    findSimilarBranches(branch, n, branches) {
        let foundBranches = [];
        branches.forEach(b => {
            if(branch !== b && branch.equals(b, n)) {
                foundBranches.push(b);
            }
        });

        return foundBranches;
    }

    /**
     * Marks the given step in the given branch as passed or failed (but does not clear step.isRunning)
     * Passes or fails the branch if step is the last step, or if finishBranchNow is set
     * @param {Step} step - The Step to mark
     * @param {Branch} [branch] - The Branch that contains the step, if any
     * @param {Boolean} isPassed - If true, marks the step as passed, if false, marks the step as failed
     * @param {Boolean} asExpected - If true, the value of isPassed was expected, false otherwise
     * @param {Error} [error] - The Error object thrown during the execution of the step, if any
     * @param {Boolean} [finishBranchNow] - If true, marks the whole branch as passed or failed immediately
     * @param {Boolean} [skipsRepeats] - If true, and if the branch failed, skips every other branch in this.branches whose first N steps are identical to this one's (up until this step)
     */
    markStep(step, branch, isPassed, asExpected, error, finishBranchNow, skipsRepeats) {
        if(isPassed) {
            step.isPassed = true;
            delete step.isFailed;
            delete step.isSkipped;
        }
        else {
            step.isFailed = true;
            delete step.isPassed;
            delete step.isSkipped;
        }

        step.asExpected = asExpected;

        if(error) {
            step.error = error;
            step.error.msg = error.message.toString();
            step.error.stackTrace = error.stack.toString();
        }

        // If this is the very last step in the branch, mark the branch as passed/failed
        if(branch && (finishBranchNow || branch.steps.indexOf(step) + 1 == branch.steps.length)) {
            branch.finishOffBranch();

            if(skipsRepeats && branch.isFailed) {
                let n = branch.steps.indexOf(step);
                let branchesToSkip = this.findSimilarBranches(branch, n + 1, this.branches);
                branchesToSkip.forEach(branchToSkip => {
                    if(!branchToSkip.isCompleteOrRunning()) { // let it finish running on its own
                        branchToSkip.isSkipped = true;
                        branchToSkip.appendToLog(`Branch skipped because it is identical to an earlier branch that ran and failed (ends at ${branch.steps[branch.steps.length-1].filename}:${branch.steps[branch.steps.length-1].lineNumber})`);
                    }
                });
            }
        }
    }

    /**
     * Marks the given step as skipped, finishes off the branch if it was the last step
     */
    markStepSkipped(step, branch) {
        step.isSkipped = true;
        delete step.isPassed;
        delete step.isFailed;

        if(branch && branch.steps.indexOf(step) + 1 == branch.steps.length) {
            branch.finishOffBranch();
        }
    }

    /**
     * Returns and/or advances to the next step in the given branch (after the currently running step), or null if no steps are left, the next step is a -T or -M, or the branch already failed/skipped
     * NOTE: This is the only function that's allowed to change Step.isRunning
     * @param {Branch} branch - The branch to look in
     * @param {Boolean} [advance] - If true, advance the current step to the one returned, otherwise just return the next step
     * @param {Boolean} [skipsRepeats] - If true, if the next step is a -T or -M, skips every other branch whose first N steps are identical to this one's (up until the -T or -M step)
     * @return {Step} The next step in the given branch, null if there are none left
     */
    nextStep(branch, advance, skipsRepeats) {
        if(branch.isComplete()) {
            if(advance) {
                branch.steps.forEach(step => delete step.isRunning);
            }

            return null;
        }

        let runningStep = null;
        let nextStep = null;
        for(let i = 0; i < branch.steps.length; i++) {
            let step = branch.steps[i];
            if(step.isRunning) {
                runningStep = step;
                if(i + 1 < branch.steps.length) {
                    nextStep = branch.steps[i + 1];
                }

                break;
            }
        }

        if(!runningStep && branch.steps.length > 0) {
            nextStep = branch.steps[0];
        }

        // Advance the running step from runningStep to nextStep
        if(advance) {
            if(runningStep) {
                delete runningStep.isRunning;
            }
            if(nextStep) {
                nextStep.isRunning = true;
            }
        }

        // End the branch if next step is a -T or -M
        if(nextStep && (nextStep.isManual || nextStep.isToDo)) {
            if(advance) {
                delete nextStep.isRunning;
            }

            // Skip other repeat branches
            if(skipsRepeats) {
                let n = branch.steps.indexOf(nextStep);
                let branchesToSkip = this.findSimilarBranches(branch, n + 1, this.branches);
                branchesToSkip.forEach(branchToSkip => {
                    if(!branchToSkip.isCompleteOrRunning()) { // let it finish running on its own
                        branchToSkip.isSkipped = true;
                        branchToSkip.appendToLog(
                            `Branch skipped because it is identical to an earlier branch, up to the ` +
                            (nextStep.isManual ? "-M" : "-T") +
                            ` step (ends at ${branch.steps[branch.steps.length-1].filename}:${branch.steps[branch.steps.length-1].lineNumber})`
                        );
                    }
                });
            }

            if(advance) {
                branch.finishOffBranch();
            }

            return null;
        }

        return nextStep;
    }

    /**
     * Initializes the counts (prior to a run)
     */
    initCounts() {
        // Branch counts
        this.passed = 0;
        this.failed = 0;
        this.skipped = 0;
        this.complete = 0;
        this.totalToRun = this.getBranchCount(true, false);
        this.totalInReport = this.getBranchCount(false, false);

        // Step counts
        this.totalStepsComplete = 0;
        this.totalSteps = this.getStepCount(true, false, false);
    }

    /**
     * Updates the counts
     */
    updateCounts() {
        // Update branch counts
        this.passed = this.getBranchCount(true, true, true, false, false);
        this.failed = this.getBranchCount(true, true, false, true, false);
        this.skipped = this.getBranchCount(true, true, false, false, true);
        this.complete = this.getBranchCount(true, true);
        this.totalToRun = this.getBranchCount(true, false);
        this.totalInReport = this.getBranchCount(false, false);

        // Update step counts
        this.totalStepsComplete = this.getStepCount(true, true, false);
        this.totalSteps = this.getStepCount(true, false, false);
    }
}
module.exports = Tree;
