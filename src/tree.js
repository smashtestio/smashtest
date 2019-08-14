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

        this.isDebug = false;                // true if at least one step has the debug or express debug modifier (~ or ~~) set
        this.isExpressDebug = false;         // true if at least one step has the express debug modifier (~~) set

        this.branches = [];                  // Array of Branch, generated from this.root
        this.beforeEverything = [];          // Array of Step, the steps to execute before all branches
        this.afterEverything = [];           // Array of Step, the steps to execute after all branches

        this.latestBranchifiedStepNode = null;   // Step most recently used by branchify(). Used to debug and track down infinite loops.

        this.stepDataMode = 'all';            // Keep step data for all steps, failed steps only, or no steps ('all', 'fail', or 'none')

        /*
        OPTIONAL

        this.groups = [];                     // Array of array of string. Only generate branches whose groups match the expression, no restrictions if this is undefined, --groups=a,b+c === [ ['a'], ['b', 'c'] ] === A or (B and C)
        this.minFrequency = '';               // Only generate branches at or above this frequency ('high', 'med', or 'low'), no frequency restrictions if this is undefined
        this.noDebug = false;                 // If true, throws an error if at least one ~, ~~, or $ is encountered in the tree at or below the given step
        this.noRandom = false;                // If true, does not randomize the order of branches generated
        this.debugHash = '';                  // If set, only generate the one branch with this hash in debug mode and ignore all $'s, ~'s, groups, and minFrequency
        this.noCondNonParallel = false;       // If true, conditional non-parallel modifiers (!!) are ignored

        this.elapsed = 0;                    // number of ms it took for all branches to execute, set to -1 if paused
        this.timeStarted = {};               // Date object (time) of when this tree started being executed
        this.timeEnded = {};                 // Date object (time) of when this tree ended execution

        this.counts = {
            running = 0,                    // total number of branches currently running
            passed = 0,                     // total number of passed branches in this tree (including the ones that passed last time)
            failed = 0,                     // total number of failed branches in this tree
            skipped = 0,                    // total number of skipped branches in this tree
            complete = 0,                   // total number of complete branches in this tree (passed, failed, or skipped)
            total = 0,                      // total number of branches in this tree
            totalToRun = 0,                 // total number of branches that will be in the next run (total number of branches minus branches passed last time if we're doing a --skip-passed)

            totalStepsComplete = 0,         // total number of complete steps in this tree (not including steps that passed last time or are being skipped)
            totalSteps = 0                  // total number of steps in this tree (not including steps that passed last time or are being skipped)
        }
        */
    }

    /**
     * Creates a new StepNode, assigns it an id, and inserts it into this.stepNodeIndex
     * @return {StepNode} A new StepNode
     */
    newStepNode() {
        let stepNode = new StepNode(this.stepNodeCount + 1);
        this.stepNodeIndex[stepNode.id] = stepNode;
        this.stepNodeCount++;
        return stepNode;
    }

    /**
     * Removes the StepNode with the given id from this.stepNodeIndex
     */
    deleteStepNode(id) {
        delete this.stepNodeIndex[id];
    }

    /**
     * Gets a modifier value for a step
     * @param {Step} step - A step
     * @param {String} modifierName - The name of a modifier (key in StepNode)
     * @return {Boolean} True if the given modifier is set on either step's StepNode or on its corresponding function declaration's StepNode (if step is a function call), false otherwise
     */
    getModifier(step, modifierName) {
        let stepNode = this.stepNodeIndex[step.id];
        if(stepNode[modifierName]) {
            return true;
        }
        else if(step.hasOwnProperty('fid') && this.stepNodeIndex[step.fid][modifierName]) {
            return true;
        }

        return false;
    }

    /**
     * Gets the code block associated with a step
     * @param {Step} step - A step
     * @returns {String} The code block associated with this step (either from its StepNode, or if it's a function call, from its corresponding function declaration's StepNode), '' if no code blocks found
     */
    getCodeBlock(step) {
        let stepNode = this.stepNodeIndex[step.id];
        if(stepNode.hasCodeBlock()) {
            return stepNode.codeBlock;
        }
        else if(step.hasOwnProperty('fid')) {
            let functionDeclarationNode = this.stepNodeIndex[step.fid];
            if(functionDeclarationNode.hasCodeBlock()) {
                return functionDeclarationNode.codeBlock;
            }
        }

        return '';
    }

    /**
     * @param {Step} step - A step
     * @return {Boolean} True if step or its corresponding function declaration has a step block, false otherwise
     */
    hasCodeBlock(step) {
        return this.getCodeBlock(step) !=  '';
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

            if(line.match(Constants.FULL_LINE_COMMENT) && currentlyInsideCodeBlockFromLineNum == -1) { // ignore lines that are fully comments
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
                lines[i].codeBlockLine = true;
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
                if(lines[j].codeBlockLine) {
                    continue;
                }
                else if(lines[j].text == '' || lines[j].indents != potentialStepBlock.steps[0].indents) {
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
                        if(potentialStepBlock.steps[k].isOpeningBracket) {
                            utils.error(`You cannot have a '[' within a step block, or adjacent to another '[' or ']' at the same indent level`, filename, potentialStepBlock.steps[k].lineNumber);
                        }
                        else {
                            utils.error(`You cannot have a function declaration within a step block`, filename, potentialStepBlock.steps[k].lineNumber);
                        }
                    }
                }

                // Have the StepBlockNode object we created replace its corresponding StepNodes
                lines.splice(i, j - i, potentialStepBlock);
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
                this.deleteStepNode(lines[i].id);
                lines.splice(i, 1);
            }
            else if(lines[i].text == '..') {
                // Validate that .. steps have a StepBlockNode directly below
                if(i + 1 < lines.length && !(lines[i+1] instanceof StepBlockNode)) {
                    utils.error(`A .. line must be followed by a step block`, filename, lines[i].lineNumber);
                }
                else {
                    this.deleteStepNode(lines[i].id);
                    lines.splice(i, 1);
                }
            }
            else {
                i++;
            }
        }

        // Set the parents and children of each StepNode/StepBlockNode in lines, based on the indents of each StepNode/StepBlockNode
        // Insert the contents of lines into the tree (under this.root)
        let prevStepNode = null;
        for(let i = 0; i < lines.length; i++) {
            let currStepNode = lines[i]; // either a StepNode or StepBlockNode object

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
                    parent = parent.parent;
                }

                currStepNode.parent = parent;
                parent.children.push(currStepNode);
            }

            // If current step node is a multi-level-step-block function call
            if(currStepNode.isMultiBlockFunctionCall) {
                const ERR_MSG = `Cannot find the '[' that corresponds to this ']'`;
                if(currStepNode.parent.children.length > 1) {
                    let lastSibling = currStepNode.parent.children[currStepNode.parent.children.length - 2];
                    if(lastSibling.isMultiBlockFunctionDeclaration) {
                        currStepNode.multiBlockFid = lastSibling.id;
                        currStepNode.text = lastSibling.text;
                    }
                    else if(lastSibling.isFunctionDeclaration && lastSibling.isOpeningBracket) {
                        // currStepNode is the ] of a * function declaration containing []'s
                        // Such a ] should be ignored, and the * function declaration step (lastSibling) is the true parent of currStepNode's children
                        prevStepNode = lastSibling;
                        currStepNode.parent.children = currStepNode.parent.children.filter(child => child !== currStepNode); // remove currStepNode from its parent
                        continue;
                    }
                    else {
                        utils.error(ERR_MSG, filename, currStepNode.lineNumber);
                    }
                }
                else {
                    utils.error(ERR_MSG, filename, currStepNode.lineNumber);
                }
            }

            prevStepNode = currStepNode;
        }
    }

    /**
     * Finds the nearest function declaration step node(s) that match a given function call step
     * Does not choose a function declaration (or equivalent) with a corresponding function call already inside branchAbove (a function cannot call itself)
     * Matches multiple function declarations when they're equivalents (e.g., * A > * B and * A > * B somewhere else in the tree are equivalents)
     * @param {Step} functionCall - The function call Step whose function declaration we're trying to find
     * @param {Branch} branchAbove - Post-branchify Branch of steps that come before functionCall
     * @return {Array of StepNode} The nearest function declaration step nodes that match the function call step
     * @throws {Error} If a matching function declaration could not be found
     */
    findFunctionDeclarations(functionCall, branchAbove) {
        branchAbove.steps.push(functionCall);

        let functionCallNode = this.stepNodeIndex[functionCall.id];
        let functionCallNodeToMatch = functionCallNode;

        // Multi-level step block function calls
        if(functionCallNode.isMultiBlockFunctionCall) {
            branchAbove.steps.pop(); // restore branchAbove to how it was when it was passed in
            return [this.stepNodeIndex[functionCallNode.multiBlockFid]];
        }

        // Say functionCall is F, and needs to be matched to *F. If we go up branchAbove and find another call F,
        // add the corresponding *F (and its equivalents) to a list of untouchables. F is never matched to an untouchable.
        // This prevents an F within a *F from infinitely recursing.
        let untouchables = [];
        for(let s = functionCallNode; s.indents != -1; s = s.parent || s.containingStepBlock.parent) {
            if(s.isFunctionDeclaration && functionCallNodeToMatch.isFunctionMatch(s)) {
                untouchables = untouchables.concat(this.equivalents(s));
            }
        }

        // Try to find the function declarations we're looking for
        for(let index = branchAbove.steps.length - 1; index >= 0; index--) {
            let currStep = branchAbove.steps[index];
            let currStepNode = this.stepNodeIndex[currStep.id];
            let parent = currStepNode.parent || currStepNode.containingStepBlock.parent;
            let siblings = parent.children;

            let foundDeclarationNodes = searchAmong(siblings, currStep);
            if(foundDeclarationNodes.length > 0) {
                branchAbove.steps.pop(); // restore branchAbove to how it was when it was passed in
                return foundDeclarationNodes;
            }

            // If nothing found yet, try going to the step right above (P), finding its corresponding function declaration (*P),
            // finding all equivalents to *P, and searching all of their children
            if(index > 0) {
                let stepAbove = branchAbove.steps[index-1];
                let stepNodeAbove = this.stepNodeIndex[stepAbove.id];

                if(stepNodeAbove && stepNodeAbove.isFunctionCall) {
                    let funcDeclAbove = this.stepNodeIndex[stepAbove.fid]; // this is *P from the example above
                    if(funcDeclAbove) {
                        let funcDeclAboveEquivalents = this.equivalents(funcDeclAbove);
                        let pool = [];
                        funcDeclAboveEquivalents.forEach(fd => pool = pool.concat(fd.children));

                        let foundDeclarationNodes = searchAmong(pool, currStep);
                        if(foundDeclarationNodes.length > 0) {
                            branchAbove.steps.pop(); // restore branchAbove to how it was when it was passed in
                            return foundDeclarationNodes;
                        }
                    }
                }
            }
        }

        utils.error(`The function \`${functionCallNode.getFunctionCallText()}\` cannot be found. Is there a typo, or did you mean to make this a textual step (with a - at the end)?

Trace:
${outputBranchAbove(this)}
`, functionCallNode.filename, functionCallNode.lineNumber);

        /**
         * @param {Array of StepNode} pool - Step nodes to search amongst for functionCallNodeToMatch
         * @param {Step} currStep - The current step in branchAbove we're looking at
         * @return {Array of StepNode} Step nodes that match functionCallNodeToMatch
         */
        function searchAmong(pool, currStep) {
            let matches = [];
            for(let i = 0; i < pool.length; i++) {
                let sn = pool[i];

                if(sn.isFunctionDeclaration
                    && functionCallNodeToMatch.isFunctionMatch(sn) &&
                    !untouchables.includes(sn) &&
                    !(sn.isPrivateFunctionDeclaration && currStep.level > functionCall.level) // ignore private functions that are inaccessible)
                ) {
                    matches.push(sn);
                }
            }

            return matches;
        }

        /**
         * @return {String} The contents of branchAbove, made to look like a stack trace (for errors)
         */
        function outputBranchAbove(self) {
            let str = '';
            branchAbove.steps.forEach(s => {
                let sn = self.stepNodeIndex[s.id];
                let text = sn.text;
                if(text) {
                    str += `   ${text}\n`
                }
            });
            return str;
        }
    }

    /**
     * @return {Array of StepNode} All StepNodes that are equivalents to the given function declaration StepNode
     * Note that the * A's and * B's in * A > * B > C and * A > * B > D are equivalents
     */
    equivalents(stepNode) {
        let results = [];

        let stack = [];
        let s = null;
        for(s = stepNode; s && s.isFunctionDeclaration; s = s.parent) {
            stack.push(s);
        }

        results.push(s);

        while(stack.length > 0) {
            let newResults = [];
            let fd = stack.pop();
            results.forEach(result => {
                newResults = newResults.concat(
                    result.children.filter(
                        c =>
                            c === stepNode ||    // include the original
                            (
                                c.isFunctionDeclaration &&
                                c.canonicalizeFunctionDeclarationText() == fd.canonicalizeFunctionDeclarationText()
                            )
                    )
                );
            });
            results = newResults;
        }

        return results;
    }

    /**
     * Validates that F from step {var} = F is either a code block function or in {x}='val' format (see below)
     * @param {Step} step - The step {var} = F, with step.fid already set to F
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
        let functionDeclarationNode = this.stepNodeIndex[step.fid];

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
     * Converts the given step node and its children into branches. Expands function calls, step blocks, etc.
     * @param {Step} stepNode - StepNode to convert to branches (NOTE: do not set step to a StepBlockNode unless it's a sequential StepBlockNode)
     * @param {Branch} [branchAbove] - post-branchify branch that comes before stepNode (used to help find function declarations), empty branch if omitted
     * @param {Number} [level] - Number of levels of function calls stepNode is under, 0 if omitted
     * @param {Boolean} [isFunctionCall] - If true, stepNode is a function declaration, and this branchify() call is in response to encountering a function call step node
     * @param {Boolean} [isSequential] - If true, combine branches of children sequentially (implements .. modifier on a step node)
     * @return {Array} Array of Branch, containing the branches at and under stepNode (does not include the steps from branchAbove). Returns null if stepNode is a function declaration but isFunctionCall wasn't set (i.e., an unexpected function declaration - very rare scenario).
     * @throws {Error} If an error occurred
     */
    branchify(stepNode, branchAbove = new Branch, level = 0, isFunctionCall, isSequential) {
        // ***************************************
        // 1) Initialize vars
        // ***************************************

        if(!stepNode.isFunctionDeclaration) {
            this.latestBranchifiedStepNode = stepNode;
        }

        isSequential = (stepNode.isSequential && !(stepNode instanceof StepBlockNode)) || isSequential; // is this step node or any step node above it sequential? (does not include sequential step blocks)

        // Enforce noDebug
        if(this.noDebug) {
            if(stepNode.isDebug) {
                if(stepNode.isExpressDebug) {
                    utils.error(`A ~~ was found, but the no-debug flag is set`, stepNode.filename, stepNode.lineNumber);
                }
                else {
                    utils.error(`A ~ was found, but the no-debug flag is set`, stepNode.filename, stepNode.lineNumber);
                }
            }
            else if(stepNode.isOnly) {
                utils.error(`A $ was found, but the no-debug flag is set`, stepNode.filename, stepNode.lineNumber);
            }
        }

        // Set this.isDebug and this.isExpressDebug
        if(stepNode.isDebug) {
            this.isDebug = true;
            if(stepNode.isExpressDebug) {
                this.isExpressDebug = true;
            }
        }

        // Initialize step corresponding to stepNode
        let step = new Step(stepNode.id);
        step.level = level; // needed to findFunctionDeclarations() below
        let varsBeingSet = stepNode.getVarsBeingSet();

        // ***************************************
        // 2) Fill branchesFromThisStepNode with the branches that come from this step node alone (and not its children)
        //    (may be multiple branches if this step node is a function call, etc.)
        // ***************************************

        let branchesFromThisStepNode = [];  // Array of Branch
        let fids = [];                      // If stepNode is a function call, all matching function declaration ids go here

        if(stepNode.indents == -1) {
            // We're at the root. Ignore it.
        }
        else if(stepNode.isFunctionCall) {
            let newBranchesFromThisStepNode = [];
            let functionDeclarationNodes = this.findFunctionDeclarations(step, branchAbove);

            functionDeclarationNodes.forEach(functionDeclarationNode => {
                step.fid = functionDeclarationNode.id;
                fids.push(step.fid);

                let isReplaceVarsInChildren = false; // true if this step is {var}=F and F contains children in format {x}='val', false otherwise

                if(varsBeingSet && varsBeingSet.length > 0) {
                    // This step is {var} = F

                    // Validate that F is either a code block function, or has all children being {x}='val'
                    isReplaceVarsInChildren = this.validateVarSettingFunction(step);
                }

                // Branchify the function declaration node
                newBranchesFromThisStepNode = placeOntoBranchAbove([step], () => this.branchify(functionDeclarationNode, branchAbove, level + 1, true)); // there's no isSequential because isSequential does not extend into function calls

                if(newBranchesFromThisStepNode.length == 0) {
                    // If newBranchesFromThisStepNode is empty (happens when the function declaration is empty),
                    // stick the current step (function call) into a sole branch, but only if it has a code block
                    if(functionDeclarationNode.hasCodeBlock()) {
                        let branch = new Branch;
                        branch.push(step.clone(), this.stepNodeIndex);
                        newBranchesFromThisStepNode = [ branch ];
                    }
                }
                else {
                    if(isReplaceVarsInChildren) {
                        // replace {x} in each child to {var} (where this step is {var} = F)
                        newBranchesFromThisStepNode.forEach(branch => {
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
                    newBranchesFromThisStepNode.forEach(branch => {
                        branch.unshift(step.clone(), this.stepNodeIndex); // new clone every time we unshift
                    });
                }

                branchesFromThisStepNode = branchesFromThisStepNode.concat(newBranchesFromThisStepNode);
            });

            if(branchesFromThisStepNode.length == 0) {
                // If branchesFromThisStepNode is empty (happens when the function declarations are empty),
                // just stick the current step (function call) into a sole branch
                let branch = new Branch;
                branch.push(step.clone(), this.stepNodeIndex);
                branchesFromThisStepNode = [ branch ];
            }
        }
        else if(stepNode instanceof StepBlockNode && stepNode.isSequential) { // sequential step block (with a .. on top)
            // Branches from each step block member are cross joined sequentially to each other
            let branchesInThisStepBlock = [];
            stepNode.steps.forEach(s => {
                let branchesFromThisStepBlockMember = this.branchify(s, branchAbove, level, true); // there's no isSequential because isSequential does not extend into function calls

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

            if(!isFunctionCall) {
                // If this function declaration was encountered unintentionally, and not in response to finding a function call, return without visiting its children
                // This is because hitting a function declaration on its own won't create any new branches
                return null;
            }
        }
        else { // Textual steps, non-function-declaration code block steps, {var}='string'
            let branch = new Branch;
            branch.push(step, this.stepNodeIndex);
            branchesFromThisStepNode.push(branch);
        }

        stepNode.used = true;

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
            fids.forEach(fid => {
                this.stepNodeIndex[fid].children.forEach(child => {
                    setHooks(child, this);
                });
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

                children.forEach(child => {
                    if(child instanceof StepBlockNode && !child.isSequential) {
                        // If this child is a non-sequential step block, just call branchify() directly on each member
                        child.steps.forEach(s => {
                            let branchesFromChild = placeOntoBranchAbove(bigBranch.steps, () => this.branchify(s, branchAbove, level, false, isSequential));
                            if(branchesFromChild && branchesFromChild.length > 0) {
                                branchesFromChild.forEach(branch => branch.isSkipBranch && (bigBranch.isSkipBranch = true));
                                branchesFromChild = this.removeUnwantedBranches(branchesFromChild, stepNode.indents == -1);

                                branchesFromChild.forEach(branchFromChild => {
                                    bigBranch.mergeToEnd(branchFromChild);
                                });
                            }
                            // NOTE: else is probably unreachable, since branchify() only returns null on a function declaration and a function declaration cannot be a member of a step block
                        });
                    }
                    else {
                        // If this child is a step, call branchify() on it normally
                        let branchesFromChild = placeOntoBranchAbove(bigBranch.steps, () => this.branchify(child, branchAbove, level, false, isSequential));
                        if(branchesFromChild && branchesFromChild.length > 0) {
                            branchesFromChild.forEach(branch => branch.isSkipBranch && (bigBranch.isSkipBranch = true));
                            branchesFromChild = this.removeUnwantedBranches(branchesFromChild, stepNode.indents == -1);

                            branchesFromChild.forEach(branchFromChild => {
                                bigBranch.mergeToEnd(branchFromChild);
                            });
                        }
                    }
                });
            });
            branchesBelow = [ bigBranch ];
        }
        else {
            // Cross-join between branchesFromThisStepNode and branches from children
            branchesFromThisStepNode.forEach(branchFromThisStepNode => {
                let branchesFromChildren = [];
                children.forEach(child => {
                    if(child instanceof StepBlockNode && !child.isSequential) {
                        // If this child is a non-sequential step block, just call branchify() directly on each member
                        child.steps.forEach(s => {
                            let branchesFromChild = placeOntoBranchAbove(branchFromThisStepNode.steps, () => this.branchify(s, branchAbove, level, false, isSequential));
                            if(branchesFromChild && branchesFromChild.length > 0) {
                                branchesFromChildren = branchesFromChildren.concat(branchesFromChild);
                            }
                            // NOTE: else is probably unreachable, since branchify() only returns null on a function declaration and a function declaration cannot be a member of a step block
                        });
                    }
                    else {
                        // If this child is a step, call branchify() on it normally
                        let branchesFromChild = placeOntoBranchAbove(branchFromThisStepNode.steps, () => this.branchify(child, branchAbove, level, false, isSequential));
                        if(branchesFromChild && branchesFromChild.length > 0) {
                            branchesFromChildren = branchesFromChildren.concat(branchesFromChild);
                        }
                    }
                });

                branchesFromChildren = this.removeUnwantedBranches(branchesFromChildren, stepNode.indents == -1);
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
        let nonParallelId = undefined;
        if(step.fid && (this.stepNodeIndex[step.fid].isNonParallel || (this.stepNodeIndex[step.fid].isNonParallelCond && !this.noCondNonParallel))) {
            nonParallelId = step.fid;
        }
        else if(stepNode.isNonParallel || (stepNode.isNonParallelCond && !this.noCondNonParallel)) {
            nonParallelId = step.id;
        }

        if(nonParallelId) {
            branchesBelow.forEach(branch => {
                if(!branch.nonParallelIds) {
                    branch.nonParallelIds = [];
                }
                branch.nonParallelIds.push(nonParallelId);
            });
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
     * @param {Boolean} [isRoot] - If true, branches are the children of the root step in the tree
     * @return {Array of Branch} Branches from branches that are not being removed due to $, ~, minFrequency, or groups
     */
    removeUnwantedBranches(branches, isRoot) {
        if(this.debugHash) {
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
        if(this.groups && isRoot) {
            for(let i = 0; i < branches.length;) {
                let branch = branches[i];

                if(!branch.groups) {
                    removeBranch(this);
                    continue;
                }

                let isGroupMatched = true;

                // going through the arrays of groups from the input
                for(let j = 0; j < this.groups.length; j++) {
                    // this could be either a single group or multiple groups at once
                    // if it's the latter, we need to check if ALL of them are mentioned
                    // in branch.groups
                    let groupsAllowedToRun = this.groups[j];

                    isGroupMatched = true;
                    // looping through the groups of the current branch
                    // until we find one that's not in the current group array
                    for(let k = 0; k < groupsAllowedToRun.length; k++) {

                        if(branch.groups.indexOf(groupsAllowedToRun[k]) === -1) {
                            isGroupMatched = false;
                            break;
                        }
                    }

                    if(isGroupMatched) {
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
        if(this.minFrequency && isRoot) {
            for(let i = 0; i < branches.length;) {
                let branch = branches[i];
                let freqAllowed = freqToNum(this.minFrequency);
                let freqOfBranch = freqToNum(branch.frequency);

                if(freqOfBranch >= freqAllowed) {
                    i++; // keep it
                }
                else {
                    if(branch.isDebug) {
                        let debugStep = findModifierDepth(branch, '~', this).step;
                        let debugStepNode = this.stepNodeIndex[debugStep.id];
                        utils.error(`This step contains a ~, but is not above the frequency allowed to run (${this.minFrequency}). Either set its frequency higher or remove the ~.`, debugStepNode.filename, debugStepNode.lineNumber);
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
        // 4) Remove branches by ~/~~'s
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
         * @param {String} modifier - The modifier to look for ('~' or '$', where '~' represents both '~' and '~~')
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

                let functionDeclarationNode = step.fid ? self.stepNodeIndex[step.fid] : null;
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
     * @throws {Error} If an error occurs (e.g., if a function declaration cannot be found)
     */
    generateBranches() {
        // Branchify and detect infinite loops
        try {
            this.branches = this.branchify(this.root);
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
                branch.markBranch('skip', undefined, this.stepDataMode);
                //branch.appendToLog(`Branch skipped because it starts with a .s step`);
            }
        });

        // Marks branches with a $s as skipped
        this.branches.forEach(branch => {
            if(branch.isSkipBranch) {
                branch.markBranch('skip', undefined, this.stepDataMode);
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
                    let branchesToSkip = this.findSimilarBranches(branch, indexOfSkipBelow + 1);
                    branchesToSkip.forEach(branchToSkip => {
                        branchToSkip.markBranch('skip', undefined, this.stepDataMode);
                        /*branchToSkip.appendToLog(
                            `Branch skipped because it is identical to an earlier branch, up to the .s step (ends at ${branch.steps[branch.steps.length-1].filename}:${branch.steps[branch.steps.length-1].lineNumber})`
                        );*/
                    });
                }
            }
        });

        // Randomize order of branches
        if(!this.noRandom) {
            function randomizeOrder(arr) {
                for(let i = arr.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [arr[i], arr[j]] = [arr[j], arr[i]];
                }
            }
            randomizeOrder(this.branches);
        }

        // Sort by frequency, but otherwise keeping the same order
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

        // Move ~'s at the end of a function call to after the last step in that function
        this.branches.forEach(branch => {
            branch.steps.forEach((step, i) => {
                let stepNode = this.stepNodeIndex[step.id];
                if(stepNode.isAfterDebug && stepNode.isFunctionCall) {
                    let baseLevel = step.level;
                    let found = false;
                    delete stepNode.isAfterDebug;
                    for(i++; i < branch.steps.length; i++) {
                        let lastStepNode = stepNode;
                        step = branch.steps[i];
                        stepNode = this.stepNodeIndex[step.id];

                        if(step.level <= baseLevel) {
                            found = true;
                            lastStepNode.isAfterDebug = true;
                            break;
                        }
                    }
                    if(!found) {
                        let lastStep = branch.steps[branch.steps.length - 1];
                        let lastStepNode = this.stepNodeIndex[lastStep.id];
                        lastStepNode.isAfterDebug = true;
                    }
                }
            });
        });

        // Updates hashes of all branches
        this.branches.forEach(branch => branch.updateHash(this.stepNodeIndex));

        // Choose branch by debugHash, if one is set
        if(this.debugHash) {
            let found = false;
            for(let i = 0; i < this.branches.length; i++) {
                if(this.branches[i].equalsHash(this.debugHash)) {
                    this.branches = [ this.branches[i] ];

                    let lastStep = this.branches[0].steps[this.branches[0].steps.length - 1];
                    let lastStepNode = this.stepNodeIndex[lastStep.id];
                    lastStepNode.isDebug = true;
                    lastStepNode.isAfterDebug = true;
                    this.isDebug = true;

                    found = true;
                    break;
                }
            }

            if(!found) {
                utils.error(`Couldn't find the branch with the given hash`);
            }
        }

        this.initCounts();
    }

    /**
     * Attaches counts to the given object
     */
    attachCounts(obj) {
        this.updateCounts();

        return Object.assign(obj, {
            elapsed: this.elapsed,
            timeStarted: this.timeStarted,
            timeEnded: this.timeEnded,

            counts: this.counts
        });
    }

    /**
     * Generates an object that represents this tree, but able to be converted to JSON and only containing the most necessary stuff for a report
     * Updates counts
     * @param {Number} [max] - Maximum number of branches to serialize per type (passed, skipped, etc.), no limit if omitted
     * @param {Number} [maxFailed] - Maximum number of failed branches to serialize, no limit if omitted
     * @return {Object} An Object representing this tree
     */
    serialize(max, maxFailed) {
        let branchesRunning = this.branches.filter(branch => branch.isRunning).filter(keepBranch);
        let branchesFailed = this.branches.filter(branch => branch.isFailed).filter(keepBranchFailed);
        let branchesPassed = this.branches.filter(branch => branch.isPassed || branch.passedLastTime).filter(keepBranch);
        let branchesSkipped = this.branches.filter(branch => branch.isSkipped).filter(keepBranch);
        let branchesNotRunYet = this.branches.filter(branch => !branch.isCompleteOrRunning()).filter(keepBranch);

        let branches = branchesRunning
            .concat(branchesFailed)
            .concat(branchesPassed)
            .concat(branchesSkipped)
            .concat(branchesNotRunYet);

        return this.attachCounts({
            stepNodeIndex: serializeUsedStepNodes(this.stepNodeIndex),
            isDebug: this.isDebug,

            branches: branches.map(branch => branch.serialize()),
            beforeEverything: this.beforeEverything.map(branch => branch.serialize()),
            afterEverything: this.afterEverything.map(branch => branch.serialize())
        });

        /**
         * @return {Object} stepNodeIndex, but only with step nodes that are actually used at least once
         */
        function serializeUsedStepNodes(stepNodeIndex) {
            let o = {};
            for(let key in stepNodeIndex) {
                if(stepNodeIndex.hasOwnProperty(key)) {
                    let stepNode = stepNodeIndex[key];
                    if(stepNode.used) {
                        o[key] = stepNode.serialize();
                    }
                }
            }

            return o;
        }

        function keepBranch(branch, index) {
            return max ? index < max : true;
        }

        function keepBranchFailed(branch, index) {
            return maxFailed ? index < maxFailed : true;
        }
    }

    /**
     * Generates an object representing a snapshot of currently-running branches in this tree
     * Updates counts
     * @param {Number} [max] - Maximum number of currently-running branches to serialize, no limit if omitted
     * @param {Object} [prevSnapshot] - The previous snapshot returned by this function
     * @return {Object} An object representing a snapshot of currently-running branches in this tree
     *     {Array} returnedObj.branches - contains n currently-running branches, as well as all the branches from prevSnapshot (used to update the branches a report is currently showing)
     *     returnedObj also contains all the updated counts from this tree
     */
    serializeSnapshot(max, prevSnapshot) {
        let snapshot = {
            branches: []
        };

        for(let i = 0; i < this.branches.length; i++) {
            let b = this.branches[i];
            if(b.isRunning) {
                snapshot.branches.push(b.serialize());
                if(typeof max != 'undefined' && snapshot.branches.length >= max) {
                    break;
                }
            }
        }

        // Include branches from prevSnapshot
        if(prevSnapshot) {
            prevSnapshot.branches.forEach(prevBranch => {
                if(prevBranch.isRunning) { // only include a branch from prevSnapshot if it was running back then
                    // Did we already include prevBranch in snapshot?
                    let alreadyIncluded = false;
                    for(let i = 0; i < snapshot.branches.length; i++) {
                        let b = snapshot.branches[i];
                        if(b.hash == prevBranch.hash) {
                            alreadyIncluded = true;
                            break;
                        }
                    }

                    if(!alreadyIncluded) {
                        // Find prevBranch's equivalent in this tree and put it into snapshot
                        for(let i = 0; i < this.branches.length; i++) {
                            let b = this.branches[i];
                            if(b.hash == prevBranch.hash) {
                                snapshot.branches.push(b.serialize());
                                break;
                            }
                        }
                    }
                }
            });
        }

        return this.attachCounts(snapshot);
    }

    /**
     * @return {String} A string containing the hashes of all passed branches, separated by newlines
     */
    serializePassed() {
        let str = '';
        this.branches.forEach(branch => (branch.isPassed || branch.passedLastTime) && (str += branch.hash + '\n'));
        return str;
    }

    /**
     * Marks branches as passed if they passed in a previous run
     * @param {String} previous - A list of hashes of passed branches from a completed previous run. Same string that serializePassed() returns.
     */
    markPassedFromPrevRun(previous) {
        let prevHashes = previous.split('\n');
        if(prevHashes.length == 0) {
            return;
        }
        prevHashes.splice(prevHashes.length - 1, 1); // remove last item, which is a blank line

        this.branches.forEach(branch => {
            // Find an equal branch in prevHashes
            let found = false;
            for(let i = 0; i < prevHashes.length; i++) {
                if(branch.hash == prevHashes[i]) {
                    branch.passedLastTime = true;
                    found = true;
                    break;
                }
            }
        });
    }

    /**
     * Counts various types of branches
     * @param {Boolean} [runnableOnly] - If true, only count branches that are set to run (i.e., those that passed last time don't count, if we're doing a --skip-passed, and skipped branches don't count)
     * @param {Boolean} [completeOnly] - If true, only count branches that are complete (passed, failed, or skipped)
     * @param {Boolean} [passedOnly] - If true, only count branches that have passed
     * @param {Boolean} [failedOnly] - If true, only count branches that have failed
     * @param {Boolean} [skippedOnly] - If true, only count branches that have skipped
     * @param {Boolean} [runningOnly] - If true, only count branches that are currently running
     * @return {Number} Number of branches
     */
    getBranchCount(runnableOnly, completeOnly, passedOnly, failedOnly, skippedOnly, runningOnly) {
        let count = 0;
        for(let i = 0; i < this.branches.length; i++) {
            let branch = this.branches[i];

            if(runnableOnly && (branch.passedLastTime || branch.isSkipped)) {
                continue;
            }

            if(completeOnly && !branch.isComplete()) {
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

            if(runningOnly && !branch.isRunning) {
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

            if(runnableOnly && (branch.passedLastTime || branch.isSkipped)) {
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
            if(!branch.isCompleteOrRunning()) {
                if(branch.nonParallelIds) {
                    // If a branch's nonParallelIds are set, check if a previous branch with one of those ids is still running
                    let found = false;

                    start:
                        for(let j = 0; j < this.branches.length; j++) {
                            let b = this.branches[j];
                            if(b.isRunning && b.nonParallelIds) {
                                for(let g = 0; g < b.nonParallelIds.length; g++) {
                                    for(let h = 0; h < branch.nonParallelIds.length; h++) {
                                        if(b.nonParallelIds[g] == branch.nonParallelIds[h]) {
                                            found = true;
                                            break start;
                                        }
                                    }
                                }
                            }
                        }

                    if(found) {
                        // You can't touch this branch yet, another branch that has the same nonParallelId is still executing
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
     * @return {Array} Array of Branch - branches whose first N steps are the same as the given's branch's first N steps
     */
    findSimilarBranches(branch, n) {
        let foundBranches = [];
        this.branches.forEach(b => {
            if(branch !== b && branch.equals(b, this.stepNodeIndex, n)) {
                foundBranches.push(b);
            }
        });

        return foundBranches;
    }

    /**
     * Marks the given hook step has pass/fail/skip
     * @param {String} state - 'pass' to pass, 'fail' to fail
     * @param {Step} step - The Step to mark
     * @param {Error} [error] - The Error object thrown during the execution of the step, if any
     */
    markHookStep(state, step, error) {
        // Reset state
        delete step.isPassed;
        delete step.isFailed;
        delete step.isSkipped;

        if(state == 'pass') {
            step.isPassed = true;
        }
        else if(state == 'fail') {
            step.isFailed = true;
        }

        if(error) {
            step.error = utils.serializeError(error);
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
                branch.finishOffBranch(this.stepDataMode);
            }

            return null;
        }

        // If the next step is a -s or is already skipped, mark it as skipped and advance again
        if(advance && nextStep && (nextStep.isSkip || nextStep.isSkipped)) {
            branch.markStep('skip', nextStep, undefined, undefined, this.stepDataMode);
            return this.nextStep(branch, advance);
        }

        return nextStep;
    }

    /**
     * Initializes the counts (prior to a run)
     */
    initCounts() {
        this.counts = {
            // Branch counts
            running: 0,
            passed: 0,
            failed: 0,
            skipped: 0,
            complete: 0,
            total: this.getBranchCount(false, false),
            totalToRun: this.getBranchCount(true, false),

            // Step counts
            totalStepsComplete: 0,
            totalSteps: this.getStepCount(true, false, false)
        };
    }

    /**
     * Updates the counts
     */
    updateCounts() {
        this.counts = {
            // Update branch counts
            running: this.getBranchCount(false, false, false, false, false, true),
            passed: this.getBranchCount(false, true, true, false, false),
            failed: this.getBranchCount(false, true, false, true, false),
            skipped: this.getBranchCount(false, true, false, false, true),
            complete: this.getBranchCount(false, true),
            total: this.getBranchCount(false, false),
            totalToRun: this.getBranchCount(true, false),

            // Update step counts
            totalStepsComplete: this.getStepCount(true, true, false),
            totalSteps: this.getStepCount(true, false, false)
        };
    }
}
module.exports = Tree;
