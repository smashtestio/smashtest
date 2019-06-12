const readFiles = require('read-files-promise');
const fs = require('fs');
const path = require('path');
const glob = require('glob');
const utils = require('./utils');
const chalk = require('chalk');
const progress = require('cli-progress');
const repl = require('repl');
const readline = require('readline');

const Tree = require('./tree.js');
const Runner = require('./runner.js');
const Reporter = require('./reporter.js');
const StepNode = require('./stepnode.js');

// ***************************************
//  Globals
// ***************************************

let tree = new Tree();
let runner = new Runner();
let reporter = new Reporter(tree, runner);

let isRepl = false;
let isReport = true;

const yellowChalk = chalk.hex("#ffb347");
const hRule = chalk.gray("─".repeat(process.stdout.columns));

const CONFIG_FILENAME = 'smashtest.json';

const PROGRESS_BAR_ON = true;
let fullRun = false;

console.log(hRule);
console.log(yellowChalk.bold("SmashTEST 0.1.0 BETA"));
console.log("");

// ***************************************
//  Exit and cleanup
// ***************************************

function setSigint() {
    process.on('SIGINT', () => { // Ctrl + C (except when REPL is open)
        console.log("");
        console.log("");
        exit(true);
    });
}

async function exit(forcedStop, exitCode) {
    if(forcedStop) {
        console.log("Stopping...");
        console.log("");
    }

    restoreCursor();

    if(runner) {
        try {
            await runner.stop();
            await new Promise((res, rej) => setTimeout(res, 1000));
            process.exit(exitCode);
        }
        catch(e) {
            console.log(e);
            process.exit(exitCode);
        }
    }
    else {
        process.exit(exitCode);
    }
}

process.on('unhandledRejection', (reason, promise) => {
    if(!runner.isStopped) {
        onError(reason, true);
    }
});

process.on('uncaughtException', (err) => {
    if(!runner.isStopped) {
        onError(err, true);
    }
});

// ***************************************
//  Helper Functions
// ***************************************

/**
 * Validates and sets the given flag within runner
 */
function processFlag(name, value) {
    try {
        if(typeof name != 'string') {
            name = name.toString();
        }
        if(typeof value != 'string' && typeof value != 'undefined') {
            value = value.toString();
        }

        let varName = null;
        matches = name.match(/^(g|p)\:(.*)$/);
        if(matches) {
            name = matches[1];
            varName = matches[2];
        }

        switch(name.toLowerCase()) {
            case "a":
                runner.skipPassed = false;
                break;

            case "debug":
            case "d":
                runner.debugHash = value;
                break;

            case "g":
                runner.globalInit[varName] = value;
                break;

            case "groups":
                runner.groups = value.split(/\s*\,\s*/);
                break;

            case "help":
            case "?":
                console.log(`Usage: smashtest [files] [options]

Files

  One or more test files to run. Can be in glob format (with *'s).
  If omitted, all .smash files in the current directory are used.

Options

  -a                              Run all branches expected to run. No skipping passed branches. Opposite of -s.
  -r                              Open the REPL (drive SmashTEST from command line)
  -s                              Skip branches that passed last time, carrying them over into report as passed
  -v                              Output the version of SmashTEST
  -?                              Output this help prompt

  --debug=<hash>                  Run the branch associated with the hash in debug mode
  --groups="<group1>,<group2>"    Only run branches that are part of one of these groups
  --g:<name>="<value>"            Sets a global variable before every branch
  --headless=<true/false>         Whether to run browsers as headless
  --help                          Output this help prompt (-?)
  --max-parallel=<N>              Do not run more than N branches simultaneously
  --max-screenshots=<N>           Do not take more than N screenshots
  --min-frequency=<high/med/low>  Only run branches at or above this frequency
  --no-debug                      Fail if there are any $'s or ~'s. Useful to prevent debugging in CI.
  --output-errors=<true/false>    Whether to output all errors to console
  --p:<name>="<value>"            Set a persistent variable
  --random=<true/false>           Whether to randomize the order of branches
  --repl                          Open the REPL (drive SmashTEST from command line) (-r)
  --report-domain=<domain>        Domain and port where report server should run (domain or domain:port format)
  --report-server=<true/false>    Whether to run a server during run for live report updates
  --screenshots=<true/false>      Whether to take screenshots at each step
  --selenium-server=<url>         Location of selenium server, if there is one (e.g., http://localhost:4444/wd/hub)
  --skip-passed=<true/false/file> Whether to skip branches that passed last time (-s/-a)
  --step-data=<all/fail/none>     Keep step data for all steps, only failed steps, or no steps
  --version                       Output the version of SmashTEST (-v)
`);
                process.exit();

            case "max-parallel":
                if(!value.match(/^[0-9]+$/) || parseInt(value) == 0) {
                    utils.error(`Invalid max-parallel. It must be a positive integer above 0.`);
                }

                runner.maxParallel = parseInt(value);
                break;

            case "max-screenshots":
                if(!value.match(/^[0-9]+$/) || parseInt(value) == 0) {
                    utils.error(`Invalid max-screenshots. It must be a positive integer above 0.`);
                }

                runner.maxScreenshots = parseInt(value);
                break;

            case "min-frequency":
                if(Constants.FREQUENCIES.indexOf(value) == -1) {
                    utils.error(`Invalid min-frequency. It must be either 'high', 'med', or 'low'.`);
                }
                runner.minFrequency = value;
                break;

            case "no-debug":
                runner.noDebug = true;
                break;

            case "output-errors":
                runner.outputErrors = (value == 'true');
                break;

            case "p":
                runner.persistent[varName] = value;
                break;

            case "random":
                runner.random = (value == 'true');
                break;

            case "repl":
            case "r":
                isRepl = true;
                break;

            case "report-domain":
                if(!value.match(/^[^\/\: ]+(\:[0-9]+)?$/)) {
                    utils.error(`Invalid report-domain. It must be in format 'domain' or 'domain:port'.`);
                }
                reporter.reportDomain = value;
                break;

            case "report-server":
                reporter.isReportServer = (value == 'true');
                break;

            case "s":
                runner.skipPassed = true;
                break;

            case "screenshots":
                runner.screenshots = (value == 'true');
                break;

            case "skip-passed":
                if(value == 'true') {
                    runner.skipPassed = true;
                }
                else if(value == 'false') {
                    runner.skipPassed = false;
                }
                else {
                    runner.skipPassed = value;
                }
                break;

            case "step-data":
                if(!value.match(/all|fail|none/)) {
                    utils.error(`Invalid step-data. It must be 'all', 'fail', or 'none'.`);
                }
                tree.stepDataMode = value;
                break;

            case "version":
            case "v":
                process.exit();

            default:
                utils.error(`Invalid flag '${name}'. See --help for details.`);
                break;
        }

        runner.flags[name] = value;
    }
    catch(e) {
        onError(e);
    }
}

/**
 * Handles a generic error inside of a catch block
 */
function onError(e, extraSpace) {
    restoreCursor();

    if(e.fatal || extraSpace) { // extra spacing needed for fatal errors coming out of runner
        console.log('');
        console.log('');
    }

    console.log(e.stack);
    console.log('');
    process.exit();
}

/**
 * Restores the console's cursor (if it's been hidden)
 */
function restoreCursor() {
    process.stderr.write('\x1B[?25h');
}

/**
 * Returns "es" if count isn't 1
 */
function plural(count) {
    if(count == 1) {
        return "";
    }
    else {
        return "es";
    }
}

(async() => {
    try {
        // ***************************************
        //  Parse inputs
        // ***************************************

        let filenames = [];
        let fileBuffers = null;

        // Open config file, if there is one
        try {
            fileBuffers = await readFiles([ CONFIG_FILENAME ], {encoding: 'utf8'});
        }
        catch(e) {} // it's ok if there's no config file

        if(fileBuffers && fileBuffers.length > 0) {
            let config = null;
            try {
                config = JSON.parse(fileBuffers[0]);
            }
            catch(e) {
                utils.error(`Syntax error in ${CONFIG_FILENAME}`);
            }

            for(name in config) {
                processFlag(name, config[name]);
            }
        }

        // Sort command line arguments into filenames and flags
        for(let i = 2; i < process.argv.length; i++) {
            let arg = process.argv[i];
            if(arg.startsWith("-")) {
                let matches = arg.match(/\-\-?([^\=]+)(\=(.*))?/);
                if(!matches) {
                    utils.error(`Invalid argument: ${arg}`);
                }

                let name = matches[1];
                let value = matches[3];

                processFlag(name, value);
            }
            else {
                filenames.push(arg);
            }
        }

        if(filenames.length == 0 && !isRepl) {
            let smashFiles = await new Promise((resolve, reject) => {
                glob('*.smash', (err, smashFiles) => { // if no filenames passed in, just choose all the .smash files
                    err ? reject(err) : resolve(smashFiles);
                });
            });

            if(!smashFiles) {
                utils.error("No files found");
            }
            else {
                smashFiles.forEach(filename => filenames.push(filename));
            }
        }

        let packageFilenames = await new Promise((resolve, reject) => {
            glob('packages/*.smash', async(err, packageFilenames) => { // new array of filenames under packages/
                err ? reject(err) : resolve(packageFilenames);
            });
        });

        if(!packageFilenames) {
            // TODO: make sure this will work from any directory where you want to run smashtest from
            utils.error("Make sure packages/ directory exists in the directory you're running this from");
        }

        // Read in all files
        let originalFilenamesLength = filenames.length;
        filenames = filenames.concat(packageFilenames);

        fileBuffers = await readFiles(filenames, {encoding: 'utf8'});

        if(fileBuffers.length == 0) {
            utils.error("No files found");
        }

        for(let i = 0; i < fileBuffers.length; i++) {
            tree.parseIn(fileBuffers[i], filenames[i], i >= originalFilenamesLength);
        }

        // ***************************************
        //  Init the runner, build the tree
        // ***************************************

        // Generate branches
        process.stdout.write("Generating branches...\x1B[?25l"); // temporary message + hide cursor
        try {
            runner.init(tree);
        }
        catch(e) {
            throw e;
        }
        finally {
            // Remove "Generating branches..."
            readline.clearLine(process.stdout, 0);
            readline.cursorTo(process.stdout, 0);
        }

        setSigint(); // attach SIGINT (Ctrl + C) handler after runner.init(), so user can Ctrl + C out of a long branchify operation via the default SIGINT handler

        // Create smashtest directory if it doesn't already exist
        const SMASHTEST_DIR = 'smashtest';
        if(!fs.existsSync(SMASHTEST_DIR)) {
            fs.mkdirSync(SMASHTEST_DIR);
        }

        // Clear out screenshots
        if(!runner.skipPassed) {
            const SMASHTEST_SS_DIR = 'smashtest/screenshots';

            try {
                let files = fs.readdirSync(SMASHTEST_SS_DIR);
                for(let file of files) {
                    fs.unlinkSync(path.join(SMASHTEST_SS_DIR, file));
                }
            }
            catch(e) {
                if(!e.message.includes(`no such file or directory, scandir 'smashtest/screenshots'`)) { // not finding the dir is ok
                    throw e;
                }
            }
        }

        // Output errors to console by default, do not output all steps to console by default
        runner.outputErrors = true;
        runner.consoleOutput = false;

        // No reporter for debug or repl runs
        if(tree.isDebug || isRepl) {
            isReport = false;
            runner.screenshots = false;
        }

        // Link the reporter to the runner, if we're doing a report
        if(isReport) {
            runner.reporter = reporter;
        }

        if(tree.branches.length == 0 && !isRepl) {
            utils.error("0 branches generated from given files");
        }

        // --skip-passed
        if(tree.isDebug) { // no --skip-passed allowed with debug mode
            runner.skipPassed = false;
        }
        if(runner.skipPassed) {
            await reporter.markPassedFromPrevRun(runner.skipPassed === true ? undefined : runner.skipPassed);
        }

        // Suppress maxlisteners warning from node
        require('events').EventEmitter.defaultMaxListeners = runner.maxParallel + 5;

        let elapsed = 0;

        // ***************************************
        //  Output initial counts and other messages
        // ***************************************

        /**
         * Outputs a message upon the completion of a run
         */
        function outputCompleteMessage(outputCounts) {
            console.log(``);
            console.log(yellowChalk("Run complete"));
            if(outputCounts) {
                console.log(getCounts());
            }
            if(isReport) {
                console.log(`Report at: ` + chalk.gray.italic(reporter.getFullReportPath()));
            }

            console.log(``);
        }

        // Output header that contains number of branches to run and live report location
        if(!isRepl) {
            tree.updateCounts();

            if(tree.counts.totalToRun == 0 && runner.skipPassed) {
                console.log("No branches left to run. All branches have passed last time.");
                outputCompleteMessage(true);
                restoreCursor();
                return;
            }

            console.log(`${tree.counts.totalToRun} branch${plural(tree.counts.totalToRun)} to run` + (isReport ? ` | ${tree.counts.total} branch${plural(tree.counts.total)} total` : ``) + (tree.isDebug ? ` | ` + yellowChalk(`In DEBUG mode`) : ``));
            if(isReport) {
                console.log(`Live report at: ` + chalk.gray.italic(reporter.getFullReportPath()));
            }

            console.log(``);
        }

        if((tree.isDebug && !tree.isExpressDebug) || isRepl) {
            // ***************************************
            //  REPL
            // ***************************************
            let isBranchComplete = false;
            restoreCursor();

            if(isRepl) {
                if(tree.counts.totalToRun == 0) {
                    // Create an empty, paused runner
                    runner.createEmptyRunner();
                    runner.consoleOutput = true;
                    runner.outputErrors = false;
                }
                else if(tree.counts.totalToRun > 1) {
                    utils.error(`There are ${tree.counts.totalToRun} branch${plural(tree.counts.totalToRun)} to run but you can only have 1 to run --repl/-r. Try isolating a branch with ~ or $.`);
                }
                else {
                    runner.consoleOutput = true;
                    runner.outputErrors = false;

                    // Make the first step a ~ step. Start the runner, which will immediately pause before the first step.
                    tree.debugFirstStep();
                    isBranchComplete = await runner.run();
                }
            }
            else {
                runner.consoleOutput = true;
                runner.outputErrors = false;

                // Run the branch being debugged
                isBranchComplete = await runner.run();
            }

            if(!isBranchComplete || runner.isPaused) {
                // Tree not completed yet, open REPL and await user input
                let nextStep = null;
                let prevStep = null;

                let codeBlockStep = null;

                prePrompt();

                /**
                 * Outputs info to the console that comes before the REPL prompt
                 */
                function prePrompt() {
                    nextStep = runner.getNextReadyStep();
                    prevStep = runner.getLastStep();

                    if(nextStep) {
                        console.log(`Next step: [ ${chalk.gray(tree.stepNodeIndex[nextStep.id].text.trim())} ]`);
                        console.log(chalk.gray("enter = run next, p = run previous, s = skip, r = resume, x = exit, or enter step to run it"));
                    }
                    else if(prevStep) {
                        console.log(chalk.gray("Passed the very last step"));
                        console.log(chalk.gray("enter or x = exit, p = run previous, or enter step to run it"));
                    }
                    else {
                        console.log(chalk.gray("enter step to run it, enter or x = exit"));
                    }

                    console.log("");
                }

                let replServer = repl.start({
                    prompt: chalk.gray("> "),
                    completer: line => {
                        process.stdout.write("    "); // enter a tab made up of 4 spaces
                        return []; // no autocomplete on tab
                    },
                    eval: async(input, context, filename, callback) => {
                        try {
                            let linesToEval = input.replace(/\n+$/, '').split(/\n/);
                            for(let i = 0; i < linesToEval.length; i++) {
                                let line = linesToEval[i];
                                await evalLine(line);

                                if(i == linesToEval.length - 1 && codeBlockStep === null && !runner.isStopped && !runner.isComplete) {
                                    prePrompt(); // include prompt after last line, and only if we're not in the middle of inputting a code block
                                }
                            }

                            if(!runner.isStopped && !runner.isComplete) {
                                callback(null);
                            }
                        }
                        catch(e) {
                            console.log(e);
                            console.log("");

                            prePrompt();
                            callback(null);
                        }
                    }
                });

                replServer.on('exit', () => {
                    exit(true);
                });

                /**
                 * Called when the REPL needs to eval input
                 */
                async function evalLine(input) {
                    if(codeBlockStep !== null) { // we're currently inputting a code block
                        codeBlockStep += "\n" + input;
                        if(input.length == 0 || input[0] != "}") { // not the end of code block input
                            return;
                        }
                    }

                    let isBranchComplete = false;
                    switch(input.toLowerCase().trim()) {
                        case "":
                            console.log("");
                            if(isRepl && (isBranchComplete || tree.branches == 0)) {
                                // this is an empty repl, so exit
                                exit(false);
                            }
                            else {
                                isBranchComplete = await runner.runOneStep();
                            }
                            break;

                        case "s":
                            console.log("");
                            isBranchComplete = await runner.skipOneStep();
                            break;

                        case "p":
                            console.log("");
                            await runner.runLastStep();
                            break;

                        case "r":
                            console.log("");
                            isBranchComplete = await runner.run();
                            break;

                        case "x":
                            console.log("");
                            exit(true);
                            return;

                        default:
                            if(input.startsWith('*')) {
                                utils.error("Cannot define a function declaration or hook here");
                            }

                            if(codeBlockStep === null) {
                                if(input.trim() == '{') {
                                    // A code block has started. Continue inputting lines until a } is inputted.
                                    codeBlockStep = '(anon step) ' + input;
                                    return;
                                }
                                else {
                                    let stepNode = new StepNode(0);
                                    stepNode.parseLine(input);
                                    if(stepNode.hasCodeBlock()) {
                                        // A code block has started. Continue inputting lines until a } is inputted.
                                        codeBlockStep = input;
                                        return;
                                    }
                                }
                            }
                            else {
                                input = codeBlockStep;
                                codeBlockStep = null;
                            }

                            console.log("");
                            await runner.inject(input);

                            break;
                    }

                    if(isBranchComplete && runner.isComplete) {
                        exit(false);
                    }
                }
            }
            else {
                exit(false);
            }
        }
        else {
            // ***************************************
            //  Full run
            // ***************************************
            let timer = null;
            let progressBar = null;
            fullRun = true;

            if(PROGRESS_BAR_ON) {
                // Progress bar
                progressBar = generateProgressBar(true);
                progressBar.start(tree.counts.totalSteps, tree.counts.totalStepsComplete);

                activateProgressBarTimer();
            }

            // Run
            await runner.run();

            /**
             * Activates the progress bar timer
             */
            function activateProgressBarTimer() {
                let timeout = tree.branches.length <= 100000 ? 500 : 5000; // every 500 ms or 5 secs
                timer = setTimeout(() => updateProgressBar(), timeout);
            }

            /**
             * Called when the progress bar needs to be updated
             */
            async function updateProgressBar(forceComplete) {
                if(runner.isStopped) {
                    return;
                }

                updateElapsed();

                progressBar.stop();
                progressBar.start(tree.counts.totalSteps, tree.counts.totalStepsComplete);
                outputCounts();

                if(forceComplete || runner.isComplete) {
                    progressBar.stop();

                    progressBar = generateProgressBar(false);
                    progressBar.start(tree.counts.totalSteps, tree.counts.totalStepsComplete);
                    outputCounts();
                    progressBar.stop();

                    outputCompleteMessage();

                    // If any branch failed, exit with 1, otherwise exit with 0
                    for(let i = 0; i < tree.branches.length; i++) {
                        if(tree.branches[i].isFailed) {
                            exit(false, 1);
                        }
                    }
                    exit(false, 0);
                }
                else {
                    activateProgressBarTimer();
                }
            }

            /**
             * @return {Object} A new progress bar object
             */
            function generateProgressBar(clearOnComplete) {
                return new progress.Bar({
                    clearOnComplete: clearOnComplete,
                    barsize: 25,
                    hideCursor: true,
                    linewrap: true,
                    format: "{bar} {percentage}% | "
                }, progress.Presets.shades_classic);
            }

            /**
             * Outputs the given counts to the console
             */
            function outputCounts() {
                if(!isReport) { // normally the reporter forces a count update itself, but if it isn't running, do it yourself
                    tree.updateCounts();
                }

                process.stdout.write(
                    (elapsed ? (`${elapsed} | `) : ``) + getCounts()
                );
            }

            /**
             * Updates the elapsed variable
             */
            function updateElapsed() {
                let d = new Date(null);
                d.setSeconds((new Date() - tree.timeStarted)/1000);
                elapsed = d.toISOString().substr(11, 8);
            }
        }

        /**
         * @return {String} The console-formatted counts in the tree
         */
        function getCounts() {
            return (tree.counts.passed > 0 ? chalk.greenBright(`${tree.counts.passed} passed`) + ` | ` : ``) +
                   (tree.counts.failed > 0 ? chalk.redBright(`${tree.counts.failed} failed`) + ` | ` : ``) +
                   (tree.counts.skipped > 0 ? chalk.cyanBright(`${tree.counts.skipped} skipped`) + ` | ` : ``) +
                   (`${tree.counts.complete} branch${plural(tree.counts.complete)} complete`);
        }
    }
    catch(e) {
        onError(e, fullRun && PROGRESS_BAR_ON);
    }
})();
