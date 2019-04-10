const readFiles = require('read-files-promise');
const glob = require('glob');
const utils = require('./utils');
const chalk = require('chalk');
const progress = require('cli-progress');
const repl = require('repl');

const Tree = require('./tree.js');
const Runner = require('./runner.js');
const Reporter = require('./reporter.js');

const yellowChalk = chalk.hex("#ffb347");

console.log("");
console.log(yellowChalk.bold("SmashTEST 0.1.1 BETA"));
console.log("");

if(process.argv.length < 3) {
    utils.error("No files inputted");
}

let filenames = [];
let jsFilenames = [];

let tree = new Tree();
let runner = new Runner();
let reporter = new Reporter(tree, runner);

// ***************************************
//  Exit and cleanup
// ***************************************
let forcedStop = true;

process.on('SIGINT', () => { // Ctrl + C (except when REPL is open)
    console.log("");
    console.log("");
    forcedStop = true;
    exit();
});

function exit() {
    if(forcedStop) {
        console.log("Stopping...");
        console.log("");
    }

    if(runner) {
        runner.stop()
            .then(() => {
                process.exit();
            })
            .catch((e) => {
                console.log(e);
                process.exit();
            });
    }
    else {
        process.exit();
    }
}

// ***************************************
//  Functions
// ***************************************

/**
 * Validates and sets the given flag within runner
 */
function processFlag(name, value) {
    let varName = null;
    matches = name.match(/^(g|p)\:(.*)$/);
    if(matches) {
        name = matches[1];
        varName = matches[2];
    }

    switch(name.toLowerCase()) {
        case "nodebug":
            runner.noDebug = true;
            break;

        case "noreport":
            runner.noReport = true;
            break;

        case "groups":
            runner.groups = value.split(/\s+/);
            break;

        case "group":
            if(!runner.groups) {
                runner.groups = [];
            }
            runner.groups.push(group);
            break;

        case "minfrequency":
            if(['high', 'med', 'low'].indexOf(value) == -1) {
                utils.error("Invalid minFrequency argument. Must be either high, med, or low.");
            }
            runner.minFrequency = value;
            break;

        case "maxinstances":
            runner.maxInstances = value;
            break;

        case "skippassed":
        case "s":
            if(value) {
                runner.skipPassed = value;
            }
            else {
                runner.skipPassed = true;
            }
            break;

        case "repl":
            runner.repl = true;
            break;

        case "g":
            runner.globalInit[varName] = value;
            break;

        case "p":
            runner.persistent[varName] = value;
            break;

        case "help":
        case "?":
            console.log(`Usage: smashtest [test files] [options]

Options:
-repl                         Open the REPL (drive SmashTEST from command line)
-maxInstances=<N>             Do not run more than N branches simultaneously
-noDebug                      Fail is there are any $'s or ~'s. Useful to prevent debugging in CI.
-noReport                     Do not output a report
-screenshots=false            Do not output screenshots
-skipPassed or -s             Do not run branches that passed last time. Just carry them over into new report.
-groups="<group1> <group2>"   Only run branches that are part of one of these groups
-group="<group name>"         Same as -groups, but only one group. Multiple -group's ok. Useful for group names with spaces.
-minFrequency=<high/med/low>  Only run branches at or above this frequency
-g:<name>="<value>"           Set the global variable with the given name to the given value, before each branch
-p:<name>="<value>"           Set the persistent variable with the given name to the given value
-help or -?                   Open this help prompt
            `);
            forcedStop = false;
            return;

        default:
            break;
    }
}

// ***************************************
//  Parse inputs and run
// ***************************************

// Open config file, if there is one
readFiles(["config.json"], {encoding: 'utf8'})
    .then(fileBuffers => {
        if(fileBuffers && fileBuffers.length > 0) {
            let config = JSON.parse(fileBuffers[0]);
            for(name in config) {
                processFlag(name, config[name]);
            }
        }
    })
    .catch(err => {}) // it's ok if there's no config file
    .then(() => {
        // Sort command line arguments into filenames (non-js files), jsFilenames, and flags
        for(let i = 2; i < process.argv.length; i++) {
            let arg = process.argv[i];
            if(arg.startsWith("-")) {
                let matches = arg.match(/\-([^\=]+)(\=(.*))?/);
                if(!matches) {
                    utils.error("Invalid argument: " + arg);
                }

                runner.flags.push(arg);

                let name = matches[1];
                let value = matches[3];

                processFlag(name, value);
            }
            else if(!arg.endsWith(".js")){
                filenames.push(arg);
            }
            else {
                jsFilenames.push(arg);
            }
        }

        if(filenames.length == 0 && !runner.repl) {
            if(jsFilenames.length > 0) {
                utils.error("No files found (js files don't count)");
            }
            else {
                utils.error("No files found");
            }
        }

        glob('packages/*', async function(err, packageFilenames) { // new array of filenames under packages/
            try {
                if(err) {
                    throw err;
                }

                if(!packageFilenames) {
                    // TODO: make sure this will work from any directory where you want to run smashtest from
                    utils.error("Make sure packages/ directory exists in the directory you're running this from");
                }

                // Remove JS files from packages
                packageFilenames = packageFilenames.filter(filename => !filename.endsWith('.js'));

                // Read in all files
                let originalFilenamesLength = filenames.length;
                filenames = filenames.concat(packageFilenames);

                let fileBuffers = await readFiles(filenames, {encoding: 'utf8'});

                if(fileBuffers.length == 0) {
                    utils.error("No files found");
                }

                for(let i = 0; i < fileBuffers.length; i++) {
                    tree.parseIn(fileBuffers[i], filenames[i], i >= originalFilenamesLength);
                }

                runner.init(tree, reporter);

                if(tree.branches.length == 0 && !runner.repl) {
                    utils.error("0 branches generated from given files");
                }

                // Build the tree
                if(runner.skipPassed) {
                    let buffer = null;
                    if(typeof runner.skipPassed == 'string') {
                        // -skipPassed='filename of report that constitutes last run'
                        await reporter.mergeInLastReport(runner.skipPassed);
                    }
                    else {
                        // -skipPassed with no filename
                        // Use last report from /reports that doesn't have debug.html in its name
                        // If one isn't found, use report.html in same directory

                        await new Promise((resolve, reject) => {
                            glob('reports/!(*debug.html)', function(err, filenames) {
                                if(err) {
                                    reject(err);
                                    return;
                                }

                                if(filenames && filenames.length > 0) {
                                    filenames.sort();
                                    filenames.reverse();
                                    reporter.mergeInLastReport(filenames[0])
                                        .then(resolve)
                                        .catch((e) => {
                                            reject(e);
                                        });
                                }
                                else {
                                    reporter.mergeInLastReport("report.html")
                                        .then(resolve)
                                        .catch((e) => {
                                            reject(e);
                                        });
                                }
                            });
                        });
                    }
                }

                let elapsed = 0;
                tree.initCounts();

                /**
                 * Outputs a message upon the completion of a run
                 */
                function outputCompleteMessage() {
                    console.log(``);
                    console.log(yellowChalk("Run complete" /*+ (tree.passed == tree.totalToRun ? " 👍" : "")*/));
                    console.log(`${tree.complete} branches ran` + (!runner.noReport ? ` | ${tree.totalInReport} branches in report` : ``));
                    if(!runner.noReport) {
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
                }

                if(!runner.repl) {
                    if(tree.totalToRun == 0 && runner.skipPassed) {
                        console.log("No branches left to run. All branches have passed last time.");

                        outputCompleteMessage(true);

                        forcedStop = false;
                        return;
                    }

                    console.log(`${tree.totalToRun} branches to run` + (!runner.noReport ? ` | ${tree.totalInReport} branches in report` : ``) + (tree.isDebug ? ` | ` + yellowChalk(`In DEBUG mode (~)`) : ``));
                    if(!runner.noReport) {
                        console.log(`Live report at: ` + chalk.gray.italic(reporter.reportPath));
                    }
                    console.log(``);
                }

                if(tree.isDebug || runner.repl) {
                    let isBranchComplete = false;

                    if(runner.repl) {
                        if(tree.totalToRun == 0) {
                            // Create an empty, paused runner
                            runner.createEmptyRunner();
                            runner.consoleOutput = true;
                        }
                        else if(tree.totalToRun > 1) {
                            utils.error(`There are ${tree.totalToRun} branches to run but you can only have 1 to run -repl. Try isolating a branch with ~.`);
                        }
                        else {
                            runner.consoleOutput = true;

                            // Make the first step a ~ step. Start the runner, which will immediately pause before the first step.
                            tree.branches[0].steps[0].isDebug = true;
                            tree.isDebug = true;
                            await runner.run();
                        }
                    }
                    else {
                        runner.consoleOutput = true;

                        // Run the branch being debugged
                        isBranchComplete = await runner.run();
                    }

                    if(!isBranchComplete || runner.hasPaused()) {
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
                                console.log("Next step: [ " + chalk.gray(nextStep.line.trim()) + " ]");
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
                            completer: (line) => {
                                process.stdout.write("    "); // enter a tab made up of 4 spaces
                                return []; // no autocomplete on tab
                            },
                            eval: (input, context, filename, callback) => {
                                let linesToEval = input.replace(/\n+$/, '').split(/\n/);
                                (async() => {
                                    for(let i = 0; i < linesToEval.length; i++) {
                                        let line = linesToEval[i];
                                        await evalLine(line);

                                        if(i == linesToEval.length - 1 && codeBlockStep === null && !runner.isComplete) {
                                            prePrompt(); // include prompt after last line, and only if we're not in the middle of inputting a code block
                                        }
                                    }
                                })()
                                .then(() => {
                                    callback(null);
                                })
                                .catch((e) => {
                                    console.log(e);
                                    console.log("");

                                    prePrompt();
                                    callback(null);
                                });
                            }
                        });

                        replServer.on('exit', () => {
                            exit();
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
                                    if(runner.repl && tree.branches == 0) {
                                        // this is an empty repl, so exit
                                        exit();
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
                                    forcedStop = true;
                                    exit();
                                    return;

                                default:
                                    if(input.startsWith('*')) {
                                        utils.error("Cannot define a * Function Declaration or ** Hook here");
                                    }

                                    let t = new Tree();

                                    if(codeBlockStep === null) {
                                        let step = t.parseLine(input);
                                        if(step.hasCodeBlock()) {
                                            // Continue inputting lines until a } is inputted
                                            codeBlockStep = input;
                                            return;
                                        }
                                    }
                                    else {
                                        input = codeBlockStep;
                                        codeBlockStep = null;
                                    }

                                    t.parseIn(input);

                                    console.log("");
                                    await runner.injectStep(t.root.children[0]);

                                    break;
                            }

                            if(isBranchComplete && runner.isComplete) {
                                forcedStop = false;
                                exit();
                            }
                        }
                    }
                }
                else { // Normal run of whole tree
                    const PROGRESS_BAR_ON = true;
                    let timer = null;
                    let progressBar = null;

                    if(PROGRESS_BAR_ON) {
                        // Progress bar
                        progressBar = generateProgressBar(true);
                        progressBar.start(tree.totalSteps, tree.totalStepsComplete);

                        activateProgressBarTimer();
                    }

                    // Run
                    await runner.run();
                    forcedStop = false;

                    /**
                     * Activates the progress bar timer
                     */
                    function activateProgressBarTimer() {
                        const UPDATE_PROGRESS_BAR_FREQUENCY = 250; // ms
                        timer = setTimeout(() => { updateProgressBar(); }, UPDATE_PROGRESS_BAR_FREQUENCY);
                    }

                    /**
                     * Called when the progress bar needs to be updated
                     */
                    function updateProgressBar(forceComplete) {
                        tree.updateCounts();

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
                                    process.exit(1);
                                }
                            }
                            process.exit(0);
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
                            (chalk.greenBright(`${tree.passed} passed`) + ` | `) +
                            (chalk.redBright(`${tree.failed} failed`) + ` | `) +
                            (chalk.cyanBright(`${tree.skipped} skipped`) + ` | `) +
                            (`${tree.complete} branches run`)
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
                console.log(e);
                console.log("");
                forcedStop = false;
            }
        });
    })
    .catch(e => {
        console.log(e);
        console.log("");
        forcedStop = false;
    });
