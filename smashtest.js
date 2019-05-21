const readFiles = require('read-files-promise');
const glob = require('glob');
const utils = require('./utils');
const chalk = require('chalk');
const progress = require('cli-progress');
const repl = require('repl');

const Tree = require('./tree.js');
const Runner = require('./runner.js');
const Reporter = require('./reporter.js');

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
process.on('SIGINT', () => { // Ctrl + C (except when REPL is open)
    console.log("");
    console.log("");
    exit(true);
});

async function exit(forcedStop, exitCode) {
    if(forcedStop) {
        console.log("Stopping...");
        console.log("");
    }

    //console.log(hRule);
    restoreCursor();

    if(runner) {
        try {
            await runner.stop();

            // sleep for 1 sec to give reports a chance to get the final state of the tree before the server goes down
            await new Promise(r => setTimeout(() => r(), 1000));

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
    onError(reason, true);
});

process.on('uncaughtException', (err) => {
    onError(err, true);
});

// ***************************************
//  Helper Functions
// ***************************************

/**
 * Validates and sets the given flag within runner
 */
function processFlag(name, value) {
    try {
        let varName = null;
        matches = name.match(/^(g|p)\:(.*)$/);
        if(matches) {
            name = matches[1];
            varName = matches[2];
        }

        switch(name.toLowerCase()) {
            case "debug":
            case "d":
                runner.debugHash = value;
                break;

            case "g":
                runner.globalInit[varName] = value;
                break;

            case "group":
                if(!runner.groups) {
                    runner.groups = [];
                }
                runner.groups.push(group);
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

  --debug=<hash> or -d            Run the branch associated with the hash in debug mode
  --group="<group name>"          Same as -groups, but only one group. Multiple -group's ok.
                                    Useful for group names with spaces.
  --groups="<group1>,<group2>"    Only run branches that are part of one of these groups
  --g:<name>="<value>"            Set the global variable with the given name to the given value,
                                    before each branch
  --headless=<true/false>         Overrides default headless behavior (headless unless debugging),
                                    true if true/false omitted
  --help or -?                    Open this help prompt
  --max-parallel=<N>              Do not run more than N branches simultaneously
  --max-report-size=<N>           Stop running if report reaches this size, in MB. Default is 1024 MB.
  --min-frequency=<high/med/low>  Only run branches at or above this frequency
  --no-debug                      Fail is there are any $'s or ~'s. Useful to prevent debugging in CI.
  --p:<name>="<value>"            Set the persistent variable with the given name to the given value
  --random=<true/false>           Whether or not to randomize the order of branches. Default is true.
  --repl or -r                    Open the REPL (drive SmashTEST from command line)
  --report=<true/false>           Whether or not to output a report. Default is true.
  --report-domain=<url>           Domain and port where report server should run (domain or domain:port format)
  --report-server=<true/false>    Whether or not to run a server during run for live report updates. Default is true.
  --screenshots=<true/false>      Whether or not to take screenshots. Default is true.
  --selenium-server=<url>         Location of selenium server, if there is one (e.g., http://localhost:4444/wd/hub)
  --skip-passed or -s             Do not run branches that passed last time. Just carry them over
                                    into new report.
  --step-data=<all/fail/none>     Keep step data for all steps, failed step, or no steps. Default is fail.
  --version or -v                 Output the version of SmashTEST
`);
                process.exit();

            case "max-parallel":
                runner.maxParallel = value;
                break;

            case "max-report-size":
                reporter.maxSize = value * 1048576;
                break;

            case "min-frequency":
                if(['high', 'med', 'low'].indexOf(value) == -1) {
                    utils.error("Invalid min-frequency argument. Must be either high, med, or low.");
                }
                runner.minFrequency = value;
                break;

            case "no-debug":
                runner.noDebug = true;
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

            case "report":
                isReport = (value == 'true');
                break;

            case "report-domain":
                if(!value.match(/^[^\/\: ]+(\:[0-9]+)?$/)) {
                    utils.error("Invalid report-domain (must be domain or domain:port)");
                }
                reporter.reportDomain = value;
                break;

            case "report-server":
                reporter.isReportServer = (value == 'true');
                break;

            case "skip-passed":
            case "s":
                if(value) {
                    runner.skipPassed = value;
                }
                else {
                    runner.skipPassed = true;
                }
                break;

            case "step-data":
                if(!value.match(/all|fail|none/)) {
                    utils.error("step-data must be all, fail, or none");
                }
                tree.stepDataMode = value;
                break;

            case "version":
            case "v":
                process.exit();

            default:
                break;
        }
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
                runner.flags[name] = value;
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
        runner.init(tree);

        // No reporter for debug runs
        if(tree.isDebug) {
            isReport = false;
        }

        // Link the reporter to the runner, if we're doing a report
        if(isReport) {
            runner.reporter = reporter;
        }

        if(tree.branches.length == 0 && !isRepl) {
            utils.error("0 branches generated from given files");
        }

        // --skip-passed
        if(runner.skipPassed) {
            await reporter.mergeInLastReport(runner.skipPassed);
        }

        let elapsed = 0;
        tree.initCounts();

        // ***************************************
        //  Output initial counts and other messages
        // ***************************************

        /**
         * Outputs a message upon the completion of a run
         */
        function outputCompleteMessage() {
            console.log(``);
            console.log(yellowChalk("Run complete"));
            console.log(`${tree.complete} branch${plural(tree.complete)} ran` + (isReport ? ` | ${tree.totalInReport} branch${plural(tree.totalInReport)} in report` : ``));
            if(isReport) {
                console.log(`Report at: ` + chalk.gray.italic(reporter.reportPath));
            }

            let failingHooks = tree.beforeEverything.concat(tree.afterEverything).filter(s => s.error);
            if(failingHooks.length > 0) {
                console.log(``);
                console.log(`Hook errors occurred:`);

                failingHooks.forEach(hook => {
                    console.log(``);
                    console.log(hook.error.stackTrace);
                });
            }

            console.log(``);
            //console.log(hRule);
        }

        // Output header that contains number of branches to run and live report location
        if(!isRepl) {
            if(tree.totalToRun == 0 && runner.skipPassed) {
                console.log("No branches left to run. All branches have passed last time.");
                outputCompleteMessage(true);
                return;
            }

            console.log(`${tree.totalToRun} branch${plural(tree.totalToRun)} to run` + (isReport ? ` | ${tree.totalInReport} branch${plural(tree.totalInReport)} in report` : ``) + (tree.isDebug ? ` | ` + yellowChalk(`In DEBUG mode (~)`) : ``));
            if(isReport) {
                console.log(`Live report at: ` + chalk.gray.italic(reporter.reportPath));
            }

            console.log(``);
        }

        if(tree.isDebug || isRepl) {
            // ***************************************
            //  REPL
            // ***************************************
            let isBranchComplete = false;

            if(isRepl) {
                if(tree.totalToRun == 0) {
                    // Create an empty, paused runner
                    runner.createEmptyRunner();
                    runner.consoleOutput = true;
                }
                else if(tree.totalToRun > 1) {
                    utils.error(`There are ${tree.totalToRun} branch${plural(tree.totalToRun)} to run but you can only have 1 to run --repl. Try isolating a branch with ~.`);
                }
                else {
                    runner.consoleOutput = true;

                    // Make the first step a ~ step. Start the runner, which will immediately pause before the first step.
                    tree.debugFirstStep();
                    isBranchComplete = await runner.run();
                }
            }
            else {
                runner.consoleOutput = true;

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
                                let stepNode = new StepNode(0);
                                stepNode.parseLine(input);
                                if(stepNode.hasCodeBlock()) {
                                    // A code block has started. Continue inputting lines until a } is inputted.
                                    codeBlockStep = input;
                                    return;
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
                progressBar.start(tree.totalSteps, tree.totalStepsComplete);

                activateProgressBarTimer();
            }

            // Run server
            if(isReport) {
                reporter.runServer(); // sync call to start server in background
            }

            // Run
            await runner.run();

            /**
             * Activates the progress bar timer
             */
            function activateProgressBarTimer() {
                const UPDATE_PROGRESS_BAR_FREQUENCY = 250; // ms
                timer = setTimeout(() => updateProgressBar(), UPDATE_PROGRESS_BAR_FREQUENCY);
            }

            /**
             * Called when the progress bar needs to be updated
             */
            function updateProgressBar(forceComplete) {
                if(runner.isStopped) {
                    return;
                }

                tree.updateCounts();
                updateElapsed();

                progressBar.stop();
                progressBar.start(tree.totalSteps, tree.totalStepsComplete);
                outputCounts();

                if(forceComplete || runner.isComplete) {
                    progressBar.stop();

                    progressBar = generateProgressBar(false);
                    progressBar.start(tree.totalSteps, tree.totalStepsComplete);
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
                    format: "{bar} {percentage}% | "
                }, progress.Presets.shades_classic);
            }

            /**
             * Outputs the given counts to the console
             */
            function outputCounts() {
                process.stdout.write(
                    (elapsed ? (`${elapsed} | `) : ``) +
                    (tree.passed > 0 ? chalk.greenBright(`${tree.passed} passed`) + ` | ` : ``) +
                    (tree.failed > 0 ? chalk.redBright(`${tree.failed} failed`) + ` | ` : ``) +
                    (tree.skipped > 0 ? chalk.cyanBright(`${tree.skipped} skipped`) + ` | ` : ``) +
                    (`${tree.complete} branch${plural(tree.complete)} run`)
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
    }
    catch(e) {
        onError(e, fullRun && PROGRESS_BAR_ON);
    }
})();
