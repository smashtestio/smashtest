const readFiles = require('read-files-promise');
const glob = require('glob');
const utils = require('./utils');
const chalk = require('chalk');
const progress = require('cli-progress');
const repl = require('repl');
const getPort = require('get-port');
const express = require('express');

const Tree = require('./tree.js');
const Runner = require('./runner.js');
const Reporter = require('./reporter.js');

// ***************************************
//  Globals
// ***************************************

let tree = new Tree();
let runner = new Runner();
let reporter = new Reporter(tree, runner);

const yellowChalk = chalk.hex("#ffb347");

console.log("");
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

    if(runner) {
        try {
            await runner.stop();

            // sleep for 1 sec to give reports a chance to get the final state of the tree before the server goes down
            await new Promise((resolve, reject) => {
                setTimeout(() => { resolve(); }, 1000);
            });

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
            case "nodebug":
                runner.noDebug = true;
                break;

            case "debug":
            case "d":
                runner.debugHash = value;
                break;

            case "noreport":
                runner.noReport = true;
                break;

            case "noreportserver":
                runner.noReportServer = true;
                break;

            case "reportdomain":
                if(!value.match(/^https?/)) { // add an http:// if one is missing
                    value = "http://" + value;
                }
                if(!value.match(/^https?\:\/\/[^\/ ]+(\:[0-9]+)?$/)) {
                    utils.error("Invalid reportDomain");
                }
                runner.reportDomain = value;
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

            case "r":
            case "repl":
                runner.repl = true;
                break;

            case "g":
                runner.globalInit[varName] = value;
                break;

            case "p":
                runner.persistent[varName] = value;
                break;

            case "version":
            case "v":
                process.exit();

            case "help":
            case "?":
                console.log(`Usage: smashtest [files] [options]

Files:
One or more test files to run
If omitted, all .smash files in the current directory are used

Options:
--repl or -r                   Open the REPL (drive SmashTEST from command line)
--maxInstances=<N>             Do not run more than N branches simultaneously
--noDebug                      Fail is there are any $'s or ~'s. Useful to prevent debugging in CI.
--debug=<hash> or -d           Run the branch associated with the hash in debug mode
--noReport                     Do not output a report
--reportDomain=<url>           Domain and port where report server should run (http://domain:port format)
--noReportServer               Do not run a server during run for live report updates
--screenshots=false            Do not output screenshots
--skipPassed or -s             Do not run branches that passed last time. Just carry them over into new report.
--groups="<group1> <group2>"   Only run branches that are part of one of these groups
--group="<group name>"         Same as -groups, but only one group. Multiple -group's ok. Useful for group names with spaces.
--minFrequency=<high/med/low>  Only run branches at or above this frequency
--g:<name>="<value>"           Set the global variable with the given name to the given value, before each branch
--p:<name>="<value>"           Set the persistent variable with the given name to the given value
--version or -v                Output the version of SmashTEST
--help or -?                   Open this help prompt
            `);
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
function onError(e) {
    console.log(e);
    console.log("");
    process.exit();
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

/**
 * Runs HTTP server
 */
async function runServer() {
    try {
        if(runner.noReportServer) {
            return;
        }

        // Set port and fill reportDomain
        let port = null;
        if(runner.reportDomain) {
            let matches = runner.reportDomain.match(/\:([0-9]+)/);
            if(matches && matches[1]) { // reportDomain has a domain and port
                port = parseInt(matches[1]);
            }
            else { // reportDomain only has a domain
                port = await getPort({port: getPort.makeRange(9000,9999)}); // avoid 8000's, since that's where localhost apps tend to be run
                runner.reportDomain += ":" + port;
            }
        }
        else { // reportDomain has nothing
            port = await getPort({port: getPort.makeRange(9000,9999)});
            runner.reportDomain = "http://localhost:" + port;
        }

        reporter.domain = runner.reportDomain;

        const server = express();

        server.use(function(req, res, next) {
            let isLocalHost = runner.reportDomain.match(/^https?\:\/\/(localhost|127\.0\.0\.1)/);
            res.header("Access-Control-Allow-Origin", isLocalHost ? null : runner.reportDomain);
            res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
            next();
        });

        server.get('/', (req, res) => {
            if(reporter.reportPath) {
                res.sendFile(reporter.reportPath);
            }
        });

        server.get('/state', (req, res) => {
            if(req.query.file && (reporter.reportPath == req.query.file || req.query.file.startsWith(runner.reportDomain))) { // only send back data for the report that's currently running (or the report server)
                res.json(reporter.generateStateObj());
            }
            else {
                res.status(400).json({error: "Invalid file param"});
            }
        });

        server.listen(port, () => {
            //console.log(`Running on port ${port}`);
        });
    }
    catch(e) {
        onError(e);
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
            fileBuffers = await readFiles(["config.json"], {encoding: 'utf8'});
        }
        catch(e) {} // it's ok if there's no config file

        if(fileBuffers && fileBuffers.length > 0) {
            let config = null;
            try {
                config = JSON.parse(fileBuffers[0]);
            }
            catch(e) {
                utils.error("Syntax error in config.json");
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

                runner.flags.push(arg);

                let name = matches[1];
                let value = matches[3];

                processFlag(name, value);
            }
            else {
                filenames.push(arg);
            }
        }

        if(filenames.length == 0 && !runner.repl) {
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

                let filenames = await new Promise((resolve, reject) => {
                    glob('reports/!(*debug.html)', async(err, filenames) => {
                        err ? reject(err) : resolve(filenames);
                    });
                });

                if(filenames && filenames.length > 0) {
                    filenames.sort();
                    filenames.reverse();
                    await reporter.mergeInLastReport(filenames[0]);
                }
                else {
                    await reporter.mergeInLastReport("report.html");
                }
            }
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
            console.log(`${tree.complete} branch${plural(tree.complete)} ran` + (!runner.noReport ? ` | ${tree.totalInReport} branch${plural(tree.totalInReport)} in report` : ``));
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

        // Output header that contains number of branches to run and live report location
        if(!runner.repl) {
            if(tree.totalToRun == 0 && runner.skipPassed) {
                console.log("No branches left to run. All branches have passed last time.");
                outputCompleteMessage(true);
                return;
            }

            console.log(`${tree.totalToRun} branch${plural(tree.totalToRun)} to run` + (!runner.noReport ? ` | ${tree.totalInReport} branch${plural(tree.totalInReport)} in report` : ``) + (tree.isDebug ? ` | ` + yellowChalk(`In DEBUG mode (~)`) : ``));
            if(!runner.noReport) {
                console.log(`Live report at: ` + chalk.gray.italic(reporter.reportPath));
            }
            console.log(``);
        }

        runServer(); // sync call to start server in background

        if(tree.isDebug || runner.repl) {
            // ***************************************
            //  REPL
            // ***************************************
            let isBranchComplete = false;

            if(runner.repl) {
                if(tree.totalToRun == 0) {
                    // Create an empty, paused runner
                    runner.createEmptyRunner();
                    runner.consoleOutput = true;
                }
                else if(tree.totalToRun > 1) {
                    utils.error(`There are ${tree.totalToRun} branch${plural(tree.totalToRun)} to run but you can only have 1 to run -repl. Try isolating a branch with ~.`);
                }
                else {
                    runner.consoleOutput = true;

                    // Make the first step a ~ step. Start the runner, which will immediately pause before the first step.
                    tree.branches = tree.branches.slice(0, 1);
                    tree.branches[0].steps[0].isDebug = true;
                    tree.isDebug = true;
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
                        console.log(`Next step: [ ${chalk.gray(nextStep.line.trim())} ]`);
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
                            if(runner.repl && (isBranchComplete || tree.branches == 0)) {
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
        onError(e);
    }
})();
