const StepNode = require('./stepnode.js');
const StepBlockNode = require('./stepblocknode.js');
const Step = require('./step.js');
const Branch = require('./branch.js');
const Constants = require('./constants.js');
const util = require('util');
const utils = require('./utils.js');

/**
 * Represents the test tree
 */
class Tree {
    constructor() {
        this.root = new StepNode();          // the root Step of the tree (parsed version of the text that got inputted)
        this.stepNodeIndex = {};             // object where keys are ids and values are references to StepNodes under this.root
        this.stepNodeCount = 0;              // number of StepNodes under this.root, used to generate StepNode ids
        this.isDebug = false;                // true if at least one step has isDebug (~) set

        this.branches = [];                  // Array of Branch, generated from this.root
        this.beforeEverything = [];          // Array of Step, the steps to execute before all branches
        this.afterEverything = [];           // Array of Step, the steps to execute after all branches

        this.latestBranchifiedStepNode = null;   // Step most recently used by branchify(). Used to debug and track down infinite loops.

        /*
        OPTIONAL

        this.reportTemplates = [];           // Array of strings, each of which is html that represents step details

        this.elapsed = 0;                    // number of ms it took for all branches to execute, set to -1 if paused
        this.timeStarted = {};               // Date object (time) of when this tree started being executed
        this.timeEnded = {};                 // Date object (time) of when this tree ended execution

        this.passed = 0;                     // total number of passed branches in this tree (excluding the ones that passed last time)
        this.failed = 0;                     // total number of failed branches in this tree
        this.skipped = 0;                    // total number of skipped branches in this tree
        this.complete = 0;                   // total number of complete branches in this tree (passed, failed, or skipped)
        this.totalToRun = 0;                 // total number of branches that will be in the next run (total number of branches - branches passed last time if we're doing a -skipPassed)
        this.totalInReport = 0;              // total number of branches in this tree
        this.totalPassedInReport = 0;        // total number of passed branches in this tree (including the ones that passed last time)

        this.totalStepsComplete = 0;         // total number of complete steps in this tree (out of the steps that will be in the next run)
        this.totalSteps = = 0;               // total number of steps in this tree that will be in the next run
        */
    }

    /**
     * @return {StepNode} A new StepNode
     */
    newStepNode() {
        let stepNode = new StepNode(this.stepNodeCount + 1);
        this.stepNodeIndex[stepNode.id] = stepNode;
        this.stepNodeCount++;
        return stepNode;
    }

    /**
     * @param {Step} step - A step
     * @param {String} modifierName - The name of a modifier (key in StepNode)
     * @return {Boolean} True if the given modifier is set on either step's StepNode or on its function declaration's StepNode (if it has one), false otherwise
     */
    getModifier(step, modifierName) {
        let stepNode = this.stepNodeIndex[step.id];
        if(!stepNode) {
            return false;
        }
        else if(stepNode[modifierName]) {
            return true;
        }
        else if(stepNode.hasOwnProperty('functionDeclarationId') && this.stepNodeIndex[stepNode.functionDeclarationId][modifierName]) {
            return true;
        }

        return false;
    }

    /**
     * Parses a string and adds it onto root
     * @param {String} buffer - Contents of a test file
     * @param {String} filename - Name of the test file
     * @param {Boolean} [isPackaged] - If true, filename is a package file
     */
    parseIn(buffer, filename, isPackaged) {
        let lines = buffer.split(/\n/);

        // Convert each string in lines to a StepNode object
        // For a line that's part of a code block, insert the code block contents into the StepNode that started the code block and remove that line
        let lastStepNodeCreated = null;
        let lastNonEmptyStepNode = null;

        let currentlyInsideCodeBlockFromLineNum = -1; // if we're currently inside a code block, that code block started on this line, otherwise -1

        for(let i = 0, lineNumber = 1; i < lines.length; i++, lineNumber++) {
            let line = lines[i];

            if(line.match(Constants.FULL_LINE_COMMENT)) { // ignore lines that are fully comments
                lines.splice(i, 1);
                i--;
                continue;
            }

            if(currentlyInsideCodeBlockFromLineNum != -1) { // we're currently inside a code block
                let endRegex = new RegExp(`^[ ]{${lastStepNodeCreated.indents * Constants.SPACES_PER_INDENT}}\\}\\s*(\\/\\/.*?)?\\s*$`);
                if(line.match(endRegex)) {
                    // code block has ended
                    currentlyInsideCodeBlockFromLineNum = -1;
                }
                else {
                    lastStepNodeCreated.codeBlock += ("\n" + line);
                }

                lines[i] = this.newStepNode().parseLine('', filename, lineNumber); // blank out the line we just handled
                if(currentlyInsideCodeBlockFromLineNum == -1) { // if the code block just ended, mark it as such
                    lines[i].indents = utils.numIndents(line, filename, lineNumber);
                    lines[i].codeBlockEnd = true;
                }
            }
            else {
                let s = this.newStepNode().parseLine(line, filename, lineNumber);
                s.indents = utils.numIndents(line, filename, lineNumber);

                if(!lastNonEmptyStepNode && s.indents != 0) {
                    utils.error(`The first step must have 0 indents`, filename, lineNumber);
                }

                if(i - 1 >= 0 && s.text != '' && lines[i - 1].codeBlockEnd && s.indents == lines[i - 1].indents) {
                    utils.error(`You cannot have a step directly adjacent to a code block above. Consider putting an empty line above this one.`, filename, lineNumber);
                }

                // If this is the start of a new code block
                if(s.hasCodeBlock()) {
                    currentlyInsideCodeBlockFromLineNum = lineNumber;
                }

                lines[i] = s;
                lastStepNodeCreated = lines[i];

                if(s.text != '') {
                    lastNonEmptyStepNode = s;
                }
            }
        }

        // If we're still inside a code block, and EOF was reached, complain that a code block is not closed
        if(currentlyInsideCodeBlockFromLineNum != -1) {
            utils.error(`An unclosed code block was found`, filename, currentlyInsideCodeBlockFromLineNum);
        }

        // Validations for .. step nodes
        for(let i = 0; i < lines.length; i++) {
            if(lines[i].text == '..') {
                if(i > 0 && lines[i-1].text != '' && lines[i-1].indents == lines[i].indents) {
                    utils.error(`You cannot have a .. line at the same indent level as the adjacent line above`, filename, lines[i].lineNumber);
                }
                if((i + 1 < lines.length && lines[i+1].text == '') || (i + 1 == lines.length)) {
                    utils.error(`You cannot have a .. line without anything directly below`, filename, lines[i].lineNumber);
                }
                if(i + 1 < lines.length && lines[i+1].indents != lines[i].indents) {
                    utils.error(`A .. line must be followed by a line at the same indent level`, filename, lines[i].lineNumber);
                }
                if(i + 1 < lines.length && lines[i+1].text == '..') {
                    utils.error(`You cannot have two .. lines in a row`, filename, lines[i].lineNumber);
                }
            }
        }

        // Look for groups of consecutive steps that consititute a step block, and replace them with a StepBlockNode object
        // A step block:
        // 1) all lines are at the same indent level
        // 2) has no '' lines in the middle
        // 3) is followed by a '' line, indented '..' line, line that's differently indented, or end of file
        for(let i = 0; i < lines.length;) {
            if(lines[i].text == '' || lines[i].text == '..') {
                // The first line in a step block is a normal line
                i++;
                continue;
            }

            // Current line may start a step block
            let potentialStepBlock = new StepBlockNode();

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
                    utils.error(`There must be an empty line under a step block if it has children directly underneath it. Try putting an empty line under this line.`, filename, lines[j].lineNumber - 1);
                }

                potentialStepBlock.filename = filename;
                potentialStepBlock.lineNumber = potentialStepBlock.isSequential ? potentialStepBlock.steps[0].lineNumber - 1 : potentialStepBlock.steps[0].lineNumber;
                potentialStepBlock.indents = potentialStepBlock.steps[0].indents;
                for(let k = 0; k < potentialStepBlock.steps.length; k++) {
                    potentialStepBlock.steps[k].containingStepBlock = potentialStepBlock;

                    // Validate that a step block member is not a function declaration
                    if(potentialStepBlock.steps[k].isFunctionDeclaration) {
                        utils.error(`You cannot have a function declaration within a step block`, filename, potentialStepBlock.steps[k].lineNumber);
                    }
                }

                // Have the StepBlockNode object we created replace its corresponding StepNodes
                lines.splice(i, potentialStepBlock.steps.length, potentialStepBlock);
                i++; // next i will be one position past the new StepBlockNode's index
            }
            else {
                i = j; // no new StepBlockNode was created, so just advance i to however far down we ventured
            }
        }

        // Remove steps that are '' or '..' (we don't need them anymore)
        for(let i = 0; i < lines.length;) {
            if(lines[i] instanceof StepBlockNode) {
                i++;
                continue;
            }
            else if(lines[i].text == '') {
                lines.splice(i, 1);
            }
            else if(lines[i].text == '..') {
                // Validate that .. steps have a StepBlockNode directly below
                if(i + 1 < lines.length && !(lines[i+1] instanceof StepBlockNode)) {
                    utils.error(`A .. line must be followed by a step block`, filename, lines[i].lineNumber);
                }
                else {
                    lines.splice(i, 1);
                }
            }
            else {
                i++;
            }
        }

        // Set the parents and children of each StepNode/StepBlockNode in lines, based on the indents of each StepNode/StepBlockNode
        // Insert the contents of lines into the tree (under this.root)
        for(let i = 0; i < lines.length; i++) {
            let currStepNode = lines[i]; // either a StepNode or StepBlockNode object
            let prevStepNode = i > 0 ? lines[i-1] : null;

            // Packages
            if(isPackaged) {
                currStepNode.isPackaged = true;
            }

            // Indents of new step node vs. last step node
            let indentsAdvanced = 0;
            if(prevStepNode != null) {
                indentsAdvanced = currStepNode.indents - prevStepNode.indents;
            }

            if(indentsAdvanced == 0) { // current step node is a peer of the previous step node
                if(prevStepNode) {
                    currStepNode.parent = prevStepNode.parent;
                }
                else { // only the root has been inserted thus far
                    currStepNode.parent = this.root;
                }

                currStepNode.parent.children.push(currStepNode);
            }
            else if(indentsAdvanced == 1) { // current step node is a child of the previous step node
                currStepNode.parent = prevStepNode;
                prevStepNode.children.push(currStepNode);
            }
            else if(indentsAdvanced > 1) {
                utils.error(`You cannot have a step that has 2 or more indents beyond the previous step`, filename, currStepNode.lineNumber);
            }
            else { // indentsAdvanced < 0, and current step node is a child of an ancestor of the previous step node
                let parent = prevStepNode.parent;
                for(let j = indentsAdvanced; j < 0; j++) {
                    if(parent.parent == null) {
                        utils.error(`Invalid number of indents`, filename, currStepNode.lineNumber); // NOTE: probably unreachable
                    }

                    parent = parent.parent;
                }

                currStepNode.parent = parent;
                parent.children.push(currStepNode);
            }
        }
    }

    /**
     * Finds the nearest function declaration step node that matches a given function call step
     * Does not choose a function declaration with a corresponding function call already inside branchAbove (a function cannot call itself)
     * @param {Step} functionCall - The function call Step whose function declaration we're trying to find
     * @param {Branch} branchAbove - Post-branchify Branch of steps that come before functionCall
     * @return {StepNode} The nearest function declaration step node that matches the function call step
     * @throws {Error} If a matching function declaration could not be found
     */
    findFunctionDeclaration(functionCall, branchAbove) {
        branchAbove.steps.push(functionCall);

        let functionCallNode = this.stepNodeIndex[functionCall.id];
        let functionCallNodeToMatch = functionCallNode;

        // If the functionCall ends in a *, find out what text was used for the * in branchAbove
        if(functionCallNode.text.trim().endsWith('*')) {
            for(let i = branchAbove.steps.length - 2; i >= 0; i--) {
                let s = branchAbove.steps[i];
                let sNode = this.stepNodeIndex[s.id];
                let sFunctionDeclarationNode = this.stepNodeIndex[s.functionDeclarationId];
                if(sFunctionDeclarationNode && functionCallNode.isFunctionMatch(sFunctionDeclarationNode)) {
                    functionCallNodeToMatch = sNode;
                    break;
                }
            }
        }

        // Say functionCall is F, and needs to be matched to a *F. If we go up branchAbove and find other instances of F,
        // add their corresponding *F's to a list of untouchables. functionCall F is never matched to an untouchable.
        // This prevents an F within a *F from infinitely recursing.
        let untouchables = [];
        for(let s = functionCallNode; s.indents != -1; s = s.parent || s.containingStepBlock.parent) {
            if(s.isFunctionDeclaration && functionCallNodeToMatch.isFunctionMatch(s)) {
                untouchables.push(s);
            }
        }

        for(let index = branchAbove.steps.length - 1; index >= 0; index--) {
            let currStep = branchAbove.steps[index];
            let currStepNode = this.stepNodeIndex[currStep.id];
            let parent = currStepNode.parent || currStepNode.containingStepBlock.parent;
            let siblings = parent.children;

            let foundDeclarationNode = searchAmongSiblings(siblings);
            if(foundDeclarationNode) {
                branchAbove.steps.pop(); // restore branchAbove to how it was when it was passed in
                return foundDeclarationNode;
            }

            // Search inside the corresponding function declaration's children
            if(index > 0) {
                let currStepAbove = branchAbove.steps[index-1];
                let currStepNodeAbove = this.stepNodeIndex[currStepAbove.id];

                if(currStepNodeAbove && currStepNodeAbove.isFunctionCall) {
                    parent = this.stepNodeIndex[currStepAbove.functionDeclarationId];
                    if(parent) {
                        siblings = parent.children;
                        foundDeclarationNode = searchAmongSiblings(siblings);
                        if(foundDeclarationNode) {
                            branchAbove.steps.pop(); // restore branchAbove to how it was when it was passed in
                            return foundDeclarationNode;
                        }
                    }
                }
            }

            function searchAmongSiblings(siblings) {
                for(let i = 0; i < siblings.length; i++) {
                    let sibling = siblings[i];
                    if(sibling.isFunctionDeclaration && functionCallNodeToMatch.isFunctionMatch(sibling) && untouchables.indexOf(sibling) == -1) {
                        if(sibling.isPrivateFunctionDeclaration && currStep.level > functionCall.level) {
                            continue; // ignore private functions that are inaccessible
                        }

                        return sibling;
                    }
                }

                return null;
            }
        }

        utils.error(`The function '${functionCallNode.getFunctionCallText()}' cannot be found. Is there a typo, or did you mean to make this a textual step (with a - at the end)?

Trace:
${outputBranchAbove(this)}
`, functionCallNode.filename, functionCallNode.lineNumber);

        function outputBranchAbove(self) {
            let str = '';
            branchAbove.steps.forEach(s => {
                str += `   ${self.stepNodeIndex[s.id].text}\n`
            });
            return str;
        }
    }

    /**
     * Validates that F from step {var} = F is either a code block function or in {x}='val' format (see below)
     * @param {Step} step - The step {var} = F, with step.functionDeclarationId already set to F
     * @return {Boolean} true if F is in {x}='val' format, false if F is a code block function
     * @throws {Error} If F is not the right format
     */
    validateVarSettingFunction(step) {
        /*
        Acceptable formats of F:

            * F {
                code
            }

                OR

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

        let stepNode = this.stepNodeIndex[step.id];
        let functionDeclarationNode = this.stepNodeIndex[step.functionDeclarationId];

        if(functionDeclarationNode.hasCodeBlock()) {
            if(functionDeclarationNode.children.length > 0) {
                utils.error(`The function called at ${stepNode.filename}:${stepNode.lineNumber} has a code block in its declaration (at ${functionDeclarationNode.filename}:${functionDeclarationNode.lineNumber}) but that code block must not have any child steps`, stepNode.filename, stepNode.lineNumber);
            }

            return false;
        }
        else {
            if(functionDeclarationNode.children.length == 0) {
                utils.error(`You cannot use an empty function`, stepNode.filename, stepNode.lineNumber);
            }

            functionDeclarationNode.children.forEach(child => {
                if(child instanceof StepBlockNode) {
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
                let varsBeingSet = child.getVarsBeingSet();
                if(!varsBeingSet || varsBeingSet.length != 1 || varsBeingSet[0].isLocal) {
                    utils.error(`The function called at ${stepNode.filename}:${stepNode.lineNumber} must have all steps in its declaration be in format {x}='string' or {x}=Function (but ${child.filename}:${child.lineNumber} is not)`, stepNode.filename, stepNode.lineNumber);
                }

                if(child.children.length > 0) {
                    utils.error(`The function called at ${stepNode.filename}:${stepNode.lineNumber} must not have any steps in its declaration that have children of their own (but ${child.filename}:${child.lineNumber} does)`, stepNode.filename, stepNode.lineNumber);
                }
            }
        }
    }

    /**
     * Converts step and its children into branches. Expands function calls, step blocks, etc.
     * @param {Step} stepNode - StepNode to convert to branches (NOTE: do not set step to a StepBlockNode unless it's a sequential StepBlockNode)
     * @param {Array} [groups] - Array of String, only return branches part of at least one of these groups, no group restrictions if this is undefined
     * @param {String} [minFrequency] - Only return branches at or above this frequency ('high', 'med', or 'low'), no frequency restrictions if this is undefined
     * @param {Boolean} [noDebug] - If true, throws an error if at least one ~ or $ is encountered in the tree at or below the given step
     * @param {String} [debugHash] - If set, only return the branch with this hash in debug mode and ignore all $'s, ~'s, groups, and minFrequency
     * @param {Branch} [branchAbove] - post-branchify branch that comes before stepNode (used to help find function declarations), empty branch if omitted
     * @param {Number} [level] - Number of levels of function calls stepNode is under, 0 if omitted
     * @param {Boolean} [isFunctionCall] - If true, stepNode is a function declaration, and this branchify() call is in response to encountering a function call step node
     * @param {Boolean} [isSequential] - If true, combine branches of children sequentially (implements .. modifier on a step node)
     * @return {Array} Array of Branch, containing the branches at and under stepNode (does not include the steps from branchAbove). Returns null if stepNode is a function declaration but isFunctionCall wasn't set (i.e., an unexpected function declaration - very rare scenario).
     * @throws {Error} If an error occurred
     */
    branchify(stepNode, groups, minFrequency, noDebug, debugHash, branchAbove, level, isFunctionCall, isSequential) {
        // ***************************************
        // 1) Initialize vars
        // ***************************************

        if(typeof branchAbove == 'undefined') {
            branchAbove = new Branch;
        }

        if(typeof level == 'undefined') {
            level = 0;
        }

        if(!stepNode.isFunctionDeclaration) {
            this.latestBranchifiedStepNode = stepNode;
        }

        isSequential = (stepNode.isSequential && !(stepNode instanceof StepBlockNode)) || isSequential; // is this step node or any step node above it sequential? (does not include sequential step blocks)

        // Enforce noDebug
        if(noDebug) {
            if(stepNode.isDebug) {
                utils.error(`A ~ was found, but the noDebug flag is set`, stepNode.filename, stepNode.lineNumber);
            }
            else if(stepNode.isOnly) {
                utils.error(`A $ was found, but the noDebug flag is set`, stepNode.filename, stepNode.lineNumber);
            }
        }

        // Set this.isDebug
        if(stepNode.isDebug) {
            this.isDebug = true;
        }

        // Initialize step corresponding to stepNode
        let step = new Step(stepNode.id);
        step.level = level; // needed to findFunctionDeclaration() below
        let varsBeingSet = stepNode.getVarsBeingSet();
        let functionDeclarationNode = null;

        // ***************************************
        // 2) Fill branchesFromThisStepNode with the branches that come from this step node alone (and not its children)
        //    (may be multiple branches if this step node is a function call, etc.)
        // ***************************************

        let branchesFromThisStepNode = []; // Array of Branch

        if(stepNode.indents == -1) {
            // We're at the root. Ignore it.
        }
        else if(stepNode.isFunctionCall) {
            functionDeclarationNode = this.findFunctionDeclaration(step, branchAbove);
            step.functionDeclarationId = functionDeclarationNode.id;

            let isReplaceVarsInChildren = false; // true if this step is {var}=F and F contains children in format {x}='val', false otherwise

            if(varsBeingSet && varsBeingSet.length > 0) {
                // This step is {var} = F

                // Validate that F is either a code block function, or has all children being {x}='val'
                isReplaceVarsInChildren = this.validateVarSettingFunction(step);
            }

            // Branchify the function declaration node
            branchesFromThisStepNode = placeOntoBranchAbove([step], () => this.branchify(functionDeclarationNode, groups, minFrequency, noDebug, debugHash, branchAbove, level + 1, true)); // there's no isSequential because isSequential does not extend into function calls

            if(branchesFromThisStepNode.length == 0) {
                // If branchesFromThisStepNode is empty (happens when the function declaration is empty), just stick the current step (function call) into a sole branch
                let branch = new Branch;
                branch.push(step, this.stepNodeIndex);
                branchesFromThisStepNode = [ branch ];
            }
            else {
                if(isReplaceVarsInChildren) {
                    // replace {x} in each child to {var} (where this step is {var} = F)
                    branchesFromThisStepNode.forEach(branch => {
                        for(let i = 0; i < branch.steps.length; i++) { // handles mulitple levels of {var} = F
                            let s = branch.steps[i];
                            let sNode = this.stepNodeIndex[s.id];
                            let sVarsBeingSet = sNode.getVarsBeingSet();

                            let originalName = sVarsBeingSet[0].name;
                            let newName = varsBeingSet[0].name;

                            sNode.text = sNode.text.replace(new RegExp(`(\\{\\s*)${originalName}(\\s*\\})`), `$1${newName}$2`);

                            if(!sNode.isFunctionCall) {
                                break;
                            }
                        }
                    });
                }

                // Put a clone of this step at the front of each Branch that results from expanding the function call
                branchesFromThisStepNode.forEach(branch => {
                    branch.unshift(step.clone(), this.stepNodeIndex); // new clone every time we unshift
                });
            }
        }
        else if(stepNode instanceof StepBlockNode && stepNode.isSequential) { // sequential step block (with a .. on top)
            // Branches from each step block member are cross joined sequentially to each other
            let branchesInThisStepBlock = [];
            stepNode.steps.forEach(s => {
                let branchesFromThisStepBlockMember = placeOntoBranchAbove([step], () => this.branchify(s, groups, minFrequency, noDebug, debugHash, branchAbove, level, true)); // there's no isSequential because isSequential does not extend into function calls

                if(branchesInThisStepBlock.length == 0) {
                    branchesInThisStepBlock = branchesFromThisStepBlockMember;
                }
                else {
                    let newBranchesInThisStepBlock = [];
                    branchesInThisStepBlock.forEach(branchInThisStepBlock => {
                        branchesFromThisStepBlockMember.forEach(branchBelowBlockMember => {
                            newBranchesInThisStepBlock.push(branchInThisStepBlock.clone().mergeToEnd(branchBelowBlockMember.clone()));
                        });
                    });
                    branchesInThisStepBlock = newBranchesInThisStepBlock;
                }
            });
            branchesFromThisStepNode = branchesInThisStepBlock;

            // NOTE: branchify() is not called on step blocks unless they are sequential
        }
        else if(stepNode.isFunctionDeclaration) {
            // Skip over function declarations. Only function calls go into a branch.

            // If this function declaration was encountered unintentionally, and not in response to finding a function call, return without visiting its children
            // This is because hitting a function declaration on its own won't create any new branches
            if(!isFunctionCall) {
                return null;
            }
        }
        else { // Textual steps, non-function-declaration code block steps, {var}='string'
            let branch = new Branch;
            branch.push(step, this.stepNodeIndex);

            // Set branch.groups and branch.frequency, if this a {group}= or {frequency}= step
            if(varsBeingSet && varsBeingSet.length > 0) {
                varsBeingSet.forEach(varBeingSet => {
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

            branchesFromThisStepNode.push(branch);
        }

        // ***************************************
        // 3) List the children of this step node, including children that are hooks
        // ***************************************

        let children = stepNode.children;

        if(children.length == 0) {
            // If this step node is a member of a non-sequential step block, the step block's children are this step node's "children"
            if(stepNode.containingStepBlock && !stepNode.containingStepBlock.isSequential) {
                children = stepNode.containingStepBlock.children;
            }
        }

        // Set step's hooks if a child is a hook

        let beforeEveryBranch = [];
        let afterEveryBranch = [];
        let beforeEveryStep = [];
        let afterEveryStep = [];

        // Ignore function declarations (they're handled by their corresponding function call, in the code below)
        if(!stepNode.isFunctionDeclaration) {
            children.forEach(child => {
                setHooks(child, this);
            });
        }

        // If stepNode is a function call, look to the hooks of the function declaration as well
        if(stepNode.isFunctionCall) {
            this.stepNodeIndex[step.functionDeclarationId].children.forEach(child => {
                setHooks(child, this);
            });
        }

        function setHooks(child, self) {
            if(child.isHook) {
                let hookStep = new Step(child.id);
                hookStep.level = 0;

                if(child.children.length > 0) {
                    utils.error(`A hook cannot have children`, child.filename, child.lineNumber);
                }

                let canStepText = utils.canonicalize(child.text);
                if(canStepText == "before every branch") {
                    beforeEveryBranch.unshift(hookStep);
                }
                else if(canStepText == "after every branch") {
                    afterEveryBranch.push(hookStep);
                }
                else if(canStepText == "before every step") {
                    beforeEveryStep.unshift(hookStep);
                }
                else if(canStepText == "after every step") {
                    afterEveryStep.push(hookStep);
                }
                else if(canStepText == "before everything") {
                    if(child.indents != 0) {
                        utils.error(`A Before Everything hook must not be indented (it must be at 0 indents)`, child.filename, child.lineNumber);
                    }

                    self.beforeEverything.unshift(hookStep); // inserted this way so that packaged hooks get executed first
                }
                else if(canStepText == "after everything") {
                    if(child.indents != 0) {
                        utils.error(`An After Everything hook must not be indented (it must be at 0 indents)`, child.filename, child.lineNumber);
                    }

                    self.afterEverything.push(hookStep); // inserted this way so that packaged hooks get executed last
                }
            }
        }

        // ***************************************
        // 4) Fill branchesBelow by cross joining branchesFromThisStepNode with the branches that come from its children
        // ***************************************

        /**
         * Gets branches derived from the children of stepNode (children variable)
         */
        function getBranchesFromChildren(branchFromThisStepNode, self) {
            let branchesFromChildren = []; // Array of Branch

            children.forEach(child => {
                if(child instanceof StepBlockNode && !child.isSequential) {
                    // If this child is a non-sequential step block, just call branchify() directly on each member
                    child.steps.forEach(s => {
                        let branchesFromChild = placeOntoBranchAbove(branchFromThisStepNode.steps, () => self.branchify(s, groups, minFrequency, noDebug, debugHash, branchAbove, level, false, isSequential));
                        if(branchesFromChild && branchesFromChild.length > 0) {
                            branchesFromChildren = branchesFromChildren.concat(branchesFromChild);
                        }
                        // NOTE: else is probably unreachable, since branchify() only returns null on a function declaration and a function declaration cannot be a member of a step block
                    });
                }
                else {
                    // If this child is a step, call branchify() on it normally
                    let branchesFromChild = placeOntoBranchAbove(branchFromThisStepNode.steps, () => self.branchify(child, groups, minFrequency, noDebug, debugHash, branchAbove, level, false, isSequential));
                    if(branchesFromChild && branchesFromChild.length > 0) {
                        branchesFromChildren = branchesFromChildren.concat(branchesFromChild);
                    }
                }
            });

            return branchesFromChildren;
        }

        let branchesBelow = []; // what we're returning - represents all branches at and below this step node

        // If branchesFromThisStepNode is empty, "prime" it with an empty Branch, so that the loops below work
        if(branchesFromThisStepNode.length == 0) {
            branchesFromThisStepNode.push(new Branch);
        }

        if(isSequential && !(stepNode instanceof StepBlockNode)) {
            // One big resulting branch, built as follows:
            // One branchesFromThisStepNode branch, each child branch, one branchesFromThisStepNode branch, each child branch, etc.
            let bigBranch = new Branch;
            branchesFromThisStepNode.forEach(branchFromThisStepNode => {
                bigBranch.mergeToEnd(branchFromThisStepNode);

                let branchesFromChildren = getBranchesFromChildren(branchFromThisStepNode, this);
                branchesFromChildren.forEach(branch => branch.isSkipBranch && (bigBranch.isSkipBranch = true));
                branchesFromChildren = this.removeUnwantedBranches(branchesFromChildren, groups, minFrequency, debugHash, stepNode.indents == -1);
                branchesFromChildren.forEach(branchFromChild => {
                    bigBranch.mergeToEnd(branchFromChild);
                });
            });
            branchesBelow = [ bigBranch ];
        }
        else {
            // Cross-join between branchesFromThisStepNode and branches from children
            branchesFromThisStepNode.forEach(branchFromThisStepNode => {
                let branchesFromChildren = getBranchesFromChildren(branchFromThisStepNode, this);
                branchesFromChildren = this.removeUnwantedBranches(branchesFromChildren, groups, minFrequency, debugHash, stepNode.indents == -1);
                branchesFromChildren.forEach(branchFromChild => {
                    branchesBelow.push(branchFromThisStepNode.clone().mergeToEnd(branchFromChild.clone()));
                });
            });

            if(branchesBelow.length == 0 && branchesFromThisStepNode.length >= 1 && branchesFromThisStepNode[0].steps.length > 0) {
                branchesBelow = branchesFromThisStepNode;
            }
        }

        // ***************************************
        // 5) Attach hooks, connect branchesBelow by isNonParallel
        // ***************************************

        // Attach hooks to each branch below
        attachHooksToBranch(beforeEveryBranch, "beforeEveryBranch", this);
        attachHooksToBranch(afterEveryBranch, "afterEveryBranch", this);
        attachHooksToBranch(beforeEveryStep, "beforeEveryStep", this);
        attachHooksToBranch(afterEveryStep, "afterEveryStep", this);

        function attachHooksToBranch(hooks, hookName, self) {
            if(hooks && hooks.length > 0) {
                branchesBelow.forEach(branchBelow => {
                    hooks.forEach(s => {
                        if(!branchBelow[hookName]) {
                            branchBelow[hookName] = [];
                        }

                        branchBelow[hookName].push(s.clone());
                    });
                });
            }
        }

        // If isNonParallel (!) is set, connect up the branches in branchesBelow
        if(this.getModifier(step, 'isNonParallel')) {
            let nonParallelId = utils.randomId();
            branchesBelow.forEach(branch => branch.nonParallelId = nonParallelId);
        }

        return branchesBelow;

        /**
         * Temporarily places the given steps onto the end of branchAbove, executes f(), removes the temporary steps, then returns what f() returned
         */
        function placeOntoBranchAbove(steps, f) {
            branchAbove.steps = branchAbove.steps.concat(steps);
            let ret = f();
            for(let i = 0; i < steps.length; i++) {
                branchAbove.steps.pop();
            }

            return ret;
        }
    }

    /**
     * @param {Array of Branch} branches - An array of branches that came from a step's children
     * @param {Array} [groups] - Array of String, only return branches part of at least one of these groups, no group restrictions if this is undefined
     * @param {String} [minFrequency] - Only return branches at or above this frequency ('high', 'med', or 'low'), no frequency restrictions if this is undefined
     * @param {String} [debugHash] - If set, all branches will be returned and the caller will need to isolate the branch that matches the hash
     * @param {Boolean} [isRoot] - If true, branches are the children of the root step in the tree
     * @return {Array of Branch} Branches from branches that are not being removed due to $, ~, minFrequency, or groups
     */
    removeUnwantedBranches(branches, groups, minFrequency, debugHash, isRoot) {
        if(debugHash) {
            return branches;
        }

        // ***************************************
        // 1) Remove branches by $'s
        // ***************************************

        // Choose the branches with the $ at the shallowest depth (choosing multiple branches if there's a tie)
        let shortestDepth = -1;
        for(let i = 0; i < branches.length; i++) {
            let branch = branches[i];
            if(branch.isOnly) {
                // A $ was found
                let o = findModifierDepth(branch, '$', this);
                if(o.depth < shortestDepth || shortestDepth == -1) {
                    shortestDepth = o.depth;
                }
            }
        }
        if(shortestDepth != -1) {
            branches = branches.filter(branch => {
                let o = findModifierDepth(branch, '$', this);
                if(!o) {
                    return false;
                }
                else {
                    return o.depth == shortestDepth;
                }
            });
        }

        // ***************************************
        // 2) Remove branches by groups
        //    (but only for steps at the top of the tree)
        // ***************************************
        if(groups && isRoot) {
            for(let i = 0; i < branches.length;) {
                let branch = branches[i];

                if(!branch.groups) {
                    removeBranch(this);
                    continue;
                }

                let isGroupMatched = false;
                for(let j = 0; j < groups.length; j++) {
                    let groupAllowedToRun = groups[j];
                    if(branch.groups.indexOf(groupAllowedToRun) != -1) {
                        isGroupMatched = true;
                        break;
                    }
                }

                if(isGroupMatched) {
                    i++;
                }
                else {
                    removeBranch(this);
                }

                function removeBranch(self) {
                    if(branch.isDebug) {
                        let debugStep = findModifierDepth(branch, '~', self).step;
                        let debugStepNode = self.stepNodeIndex[debugStep.id];
                        utils.error(`This step contains a ~, but is not inside one of the groups being run. Either add it to the groups being run or remove the ~.`, debugStepNode.filename, debugStepNode.lineNumber);
                    }
                    else {
                        branches.splice(i, 1); // remove this branch
                    }
                }
            }
        }

        // ***************************************
        // 3) Remove branches by frequency
        //    (but only for steps at the top of the tree)
        // ***************************************
        if(minFrequency && isRoot) {
            for(let i = 0; i < branches.length;) {
                let branch = branches[i];
                let freqAllowed = freqToNum(minFrequency);
                let freqOfBranch = freqToNum(branch.frequency);

                if(freqOfBranch >= freqAllowed) {
                    i++; // keep it
                }
                else {
                    if(branch.isDebug) {
                        let debugStep = findModifierDepth(branch, '~', this).step;
                        let debugStepNode = this.stepNodeIndex[debugStep.id];
                        utils.error(`This step contains a ~, but is not above the frequency allowed to run (${minFrequency}). Either set its frequency higher or remove the ~.`, debugStepNode.filename, debugStepNode.lineNumber);
                    }
                    else {
                        branches.splice(i, 1); // remove this branch
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

        // ***************************************
        // 4) Remove branches by ~'s
        // ***************************************

        // If found, remove all branches other than the one that's connected with one or more ~'s
        // When multiple branches have ~'s somewhere inside, always prefer the branch with the shallowest-depth ~
        let branchFound = null;
        shortestDepth = -1;
        for(let i = 0; i < branches.length; i++) {
            let branch = branches[i];
            if(branch.isDebug) {
                // A ~ was found
                let o = findModifierDepth(branch, '~', this);
                if(o.depth < shortestDepth || shortestDepth == -1) {
                    shortestDepth = o.depth;
                    branchFound = branch;
                }
            }
        }
        if(branchFound) {
            branches = [ branchFound ]; // only keep the one we found
        }

        return branches;

        /**
         * @param {Branch} branch - The branch to look through
         * @param {String} modifier - The modifier to look for ('~' or '$')
         * @param {Tree} self - This tree
         * @return {Object} Object, in format { step: the first Step in the given branch to contain modifier, depth: depth at which the modifier was found }, null if nothing found
         */
        function findModifierDepth(branch, modifier, self) {
            for(let i = 0; i < branch.steps.length; i++) {
                let step = branch.steps[i];
                let stepNode = self.stepNodeIndex[step.id];

                let setOnOriginal = null;
                let setOnFunctionDeclaration = null;

                if(modifier == '~') {
                    setOnOriginal = stepNode.isDebug;
                }
                else if(modifier == '$') {
                    setOnOriginal = stepNode.isOnly;
                }

                let functionDeclarationNode = step.functionDeclarationId ? self.stepNodeIndex[step.functionDeclarationId] : null;
                if(functionDeclarationNode) {
                    if(modifier == '~') {
                        setOnFunctionDeclaration = functionDeclarationNode.isDebug;
                    }
                    else if(modifier == '$') {
                        setOnFunctionDeclaration = functionDeclarationNode.isOnly;
                    }
                }

                if(setOnOriginal) {
                    return {
                        step: step,
                        depth: i
                    };
                }
                else if(setOnFunctionDeclaration) {
                    return {
                        step: step,
                        depth: i + 0.5
                    };
                }
            }

            return null; // probably won't be reached
        }
    }

    /**
     * Converts the tree under this.root into an array of Branch in this.branches, randomly sorts these branches
     * Called after all of the tree's text has been inputted with parseIn()
     * Gets everything ready for the test runner
     * @param {Array} [groups] - Array of String, where each string is a group we want run (do not run branches with no group or not in at least one group listed here), no group restrictions if this is undefined
     * @param {String} [minFrequency] - Only run branches at or above this frequency ('high', 'med', or 'low'), no frequency restrictions if this is undefined
     * @param {Boolean} [noDebug] - If true, throws an error if at least one ~ or $ is encountered in this.branches
     * @param {String} [debugHash] - If set, run the branch with this hash in debug mode and ignore all $'s, ~'s, groups, and minFrequency
     * @param {Boolean} [noRandom] - If true, does not randomly sort branches
     * @throws {Error} If an error occurs (e.g., if a function declaration cannot be found)
     */
    generateBranches(groups, minFrequency, noDebug, debugHash, noRandom) {
        // Branchify and detect infinite loops
        try {
            this.branches = this.branchify(this.root, groups, minFrequency, noDebug, debugHash);
        }
        catch(e) {
            if(e.name == "RangeError" && e.message == "Maximum call stack size exceeded") {
                if(this.latestBranchifiedStepNode) {
                    utils.error(`Infinite loop detected`, this.latestBranchifiedStepNode.filename, this.latestBranchifiedStepNode.lineNumber);
                }
                else {
                    throw new Error("Infinite loop detected"); // very rare situation (as this.latestBranchifiedStepNode is almost always set)
                }
            }
            else {
                throw e;
            }
        }

        // Marks branches with a first step of .s as skipped
        this.branches.forEach(branch => {
            let firstStep = branch.steps[0];
            let firstStepNode = this.stepNodeIndex[firstStep.id];
            if(this.getModifier(firstStep, 'isSkipBelow')) {
                branch.isSkipped = true;
                //branch.appendToLog(`Branch skipped because it starts with a .s step`);
            }
        });

        // Marks branches with a $s as skipped
        this.branches.forEach(branch => {
            if(branch.isSkipBranch) {
                branch.isSkipped = true;
                /*branch.steps.forEach(s => {
                    if(this.getModifier(s, 'isSkipBranch')) {
                        branch.appendToLog(`Branch skipped because a $s step was encountered at ${s.filename}:${s.lineNumber}`);
                    }
                });*/
            }
        });

        // Skips all steps at or after a .s, skips all similar branches
        this.branches.forEach(branch => {
            if(!branch.isSkipped) {
                let indexOfSkipBelow = -1;
                for(let i = 0; i < branch.steps.length; i++) {
                    let s = branch.steps[i];
                    if(this.getModifier(s, 'isSkipBelow')) {
                        indexOfSkipBelow = i;
                    }
                    if(indexOfSkipBelow != -1) {
                        s.isSkipped = true;
                    }
                }

                // Mark all similar branches as skipped
                if(indexOfSkipBelow != -1) {
                    let branchesToSkip = this.findSimilarBranches(branch, indexOfSkipBelow + 1, this.branches);
                    branchesToSkip.forEach(branchToSkip => {
                        branchToSkip.isSkipped = true;
                        /*branchToSkip.appendToLog(
                            `Branch skipped because it is identical to an earlier branch, up to the .s step (ends at ${branch.steps[branch.steps.length-1].filename}:${branch.steps[branch.steps.length-1].lineNumber})`
                        );*/
                    });
                }
            }
        });

        // Randomize order of branches
        if(!noRandom) {
            function randomizeOrder(arr) {
                for(let i = arr.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [arr[i], arr[j]] = [arr[j], arr[i]];
                }
            }
            randomizeOrder(this.branches);
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

        // Updates hashes of all branches
        this.branches.forEach(branch => branch.updateHash(this.stepNodeIndex));

        // Choose branch by debugHash, if one is set
        if(debugHash) {
            let found = false;
            for(let i = 0; i < this.branches.length; i++) {
                if(this.branches[i].equalsHash(debugHash)) {
                    this.branches = [ this.branches[i] ];

                    let lastStep = this.branches[0].steps[this.branches[0].steps.length - 1];
                    lastStep.isDebug = true;
                    lastStep.isAfterDebug = true;
                    this.isDebug = true;

                    found = true;
                    break;
                }
            }

            if(!found) {
                utils.error(`Couldn't find the branch with the given hash`);
            }
        }
    }

    /**
     * @return {String} JSON representation of this tree, only containing the most necessary stuff for a report
     */
    serialize() {
        return JSON.stringify(utils.removeUndefineds({
            stepNodeIndex: this.stepNodeIndex,
            isDebug: this.isDebug,

            branches: this.branches,
            beforeEverything: this.beforeEverything,
            afterEverything: this.afterEverything,

            reportTemplates: this.reportTemplates,

            elapsed: this.elapsed,
            timeStarted: this.timeStarted,
            timeEnded: this.timeEnded,

            passed: this.passed,
            failed: this.failed,
            skipped: this.skipped,
            complete: this.complete,
            totalToRun: this.totalToRun,
            totalInReport: this.totalInReport,
            totalPassedInReport: this.totalPassedInReport,

            totalStepsComplete: this.totalStepsComplete,
            totalSteps: this.totalSteps
        }), (k, v) => {
            if(v instanceof Branch || v instanceof StepNode || v instanceof Step) {
                return v.serializeObj();
            }
            else {
                return v;
            }
        });
    }

    /**
     * Marks branches as passed if they passed last time
     * @param {String} json - A JSON representation of branches from a previous run. Same JSON that serialize() returns.
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
                    if(prevBranch.isPassed) { // failed or didn't run
                        currBranch.passedLastTime = true;
                    }

                    // Clean state
                    delete currBranch.isSkipped;

                    found = true;
                    break;
                }
            }
        });
    }

    /**
     * Counts various types of branches
     * @param {Boolean} [runnableOnly] - If true, only count branches that are set to run (i.e., those that passed last time don't count, if we're doing a --skip-passed)
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

            if(passedOnly && !branch.isPassed && !branch.passedLastTime) {
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
     * Counts various types of steps. Does not include steps in hooks.
     * @param {Boolean} [runnableOnly] - If true, do not include branches that passed previously, or steps at or below a .s
     * @param {Boolean} [completeOnly] - If true, only include steps that are complete (passed, failed, or skipped)
     * @param {Boolean} [failedOnly] - If true, only include steps that are complete and have failed
     * @return {Number} Total number of steps
     */
    getStepCount(runnableOnly, completeOnly, failedOnly) {
        let count = 0;
        for(let i = 0; i < this.branches.length; i++) {
            let branch = this.branches[i];

            if(runnableOnly && branch.passedLastTime) {
                continue;
            }

            for(let j = 0; j < branch.steps.length; j++) {
                let step = branch.steps[j];

                if(runnableOnly && this.getModifier(step, 'isSkipBelow')) {
                    break; // go to next branch
                }

                if(completeOnly && !step.isComplete() && !branch.isComplete()) {
                    continue;
                }

                if(failedOnly && !step.isFailed) {
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
                    // If a branch's nonParallelId is set, check if a previous branch with that id is still running
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
            if(branch !== b && branch.equals(b, this.stepNodeIndex, n)) {
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
     * @param {Error} [error] - The Error object thrown during the execution of the step, if any
     * @param {Boolean} [finishBranchNow] - If true, marks the whole branch as passed or failed immediately
     */
    markStep(step, branch, isPassed, error, finishBranchNow) {
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

        if(error) {
            step.error = error;
            step.error.msg = error.message.toString();
            step.error.stackTrace = error.stack.toString();
        }

        // If this is the very last step in the branch, mark the branch as passed/failed
        if(branch && (finishBranchNow || branch.steps.indexOf(step) + 1 == branch.steps.length)) {
            branch.finishOffBranch();
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
     * Returns the next step in the given branch (after the currently running step), or null if no steps are left, the next step is a .s, or the branch already failed/skipped
     * Advances to the next step if advance is set
     * NOTE: This is the only function that's allowed to change Step.isRunning
     * @param {Branch} branch - The branch to look in
     * @param {Boolean} [advance] - If true, advance the current step to the one returned, otherwise just return the next step
     * @return {Step} The next step in the given branch, null if there are none left
     */
    nextStep(branch, advance) {
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

        // End the branch if next step is a .s
        if(nextStep && this.getModifier(nextStep, 'isSkipBelow')) {
            if(advance) {
                delete nextStep.isRunning;
                branch.finishOffBranch();
            }

            return null;
        }

        // If the next step is a -s or is already skipped, mark it as skipped and advance again
        if(advance && nextStep && (nextStep.isSkip || nextStep.isSkipped)) {
            this.markStepSkipped(nextStep, branch);
            return this.nextStep(branch, advance);
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
        this.totalPassedInReport = this.getBranchCount(false, true, true, false, false);

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
        this.totalPassedInReport = this.getBranchCount(false, true, true, false, false);

        // Update step counts
        this.totalStepsComplete = this.getStepCount(true, true, false);
        this.totalSteps = this.getStepCount(true, false, false);
    }
}
module.exports = Tree;
