const readFiles = require('read-files-promise');
const fs = require('fs');
const glob = require('glob');
const utils = require('./utils');
const chalk = require('chalk');
const progress = require('cli-progress');
const prompt = require('prompt-sync')({
    history: require('prompt-sync-history')()
});
const Tree = require('./tree.js');
const Runner = require('./runner.js');
const Reporter = require('./reporter.js');

if(process.argv.length < 3) {
    utils.error("No files inputted");
}

let filenames = [];
let jsFilenames = [];

let tree = new Tree();
let runner = new Runner();
let reporter = new Reporter(tree, runner);

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

            case "minfrequency":
                if(['high', 'med', 'low'].indexOf(value) == -1) {
                    utils.error("Invalid minFrequency argument. Must be either high, med, or low.");
                }
                runner.minFrequency = value;
                break;

            case "maxinstances":
                runner.maxInstances = value;
                break;

            case "rerunnotpassed":
            case "r":
                if(value) {
                    runner.rerunNotPassed = value;
                }
                else {
                    runner.rerunNotPassed = true;
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

            default:
                utils.error("Invalid argument " + arg);
                break;
        }
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

        // Initialize the reporter
        let reportPath = process.cwd() + "/report.html";
        let dateReportPath = process.cwd() + "/reports/" + (new Date()).toISOString().replace(/\..*$/, '').replace('T', '_') + (tree.isDebug ? "_debug" : "") + ".html";
        let dateReportsDirPath = process.cwd() + "/reports";
        let lastReportPath = null;

        reporter.onReportChanged = async function() {
            // Write the new report to report.html and reports/<datetime>.html
            await new Promise((resolve, reject) => {
                fs.mkdir(dateReportsDirPath, { recursive: true }, (err) => {
                    if(err) {
                        reject(err);
                    }
                    else {
                        resolve();
                    }
                });
            });

            let reportPromise = new Promise((resolve, reject) => {
                fs.writeFile(reportPath, reporter.htmlReport, (err) => {
                    if(err) {
                        reject(err);
                    }
                    else {
                        resolve();
                    }
                });
            });

            let dateReportPromise = new Promise((resolve, reject) => {
                fs.writeFile(dateReportPath, reporter.htmlReport, (err) => {
                    if(err) {
                        reject(err);
                    }
                    else {
                        resolve();
                    }
                });
            });

            await Promise.all[reportPromise, dateReportPromise];
        };

        // Build the tree
        if(runner.rerunNotPassed) {
            let buffer = null;
            if(typeof runner.rerunNotPassed == 'string') {
                // -rerunNotPassed='filename of report that constitutes last run'
                await rerunNotPassed(runner.rerunNotPassed);
            }
            else {
                // -rerunNotPassed with no filename
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
                            rerunNotPassed(filenames[0])
                                .then(resolve)
                                .catch((e) => {
                                    reject(e);
                                });
                        }
                        else {
                            rerunNotPassed("report.html")
                                .then(resolve)
                                .catch((e) => {
                                    reject(e);
                                });
                        }
                    });
                });
            }

            /**
             * Reads in the given report html file, extracts json, merges it with tree
             */
            async function rerunNotPassed(filename) {
                lastReportPath = process.cwd() + "/" + filename;

                let fileBuffers = await readFiles([ filename ], {encoding: 'utf8'});

                if(fileBuffers.length == 0) {
                    utils.error(`The file ${filename} could not be found`);
                }

                let buffer = fileBuffers[0];
                buffer = reporter.extractBranchesJson(buffer);

                let json = JSON.parse(JSON.stringify(buffer));
                tree.mergeBranchesFromPrevRun(json);
            }
        }

        let isComplete = false;
        let elapsed = 0;

        let emptyREPL = runner.repl && tree.branches.length == 0;

        // Branch counts
        let passed = 0;
        let failed = 0;
        let skipped = 0;
        let complete = 0;
        let totalToRun = tree.getBranchCount(true, false);
        let totalInReport = tree.getBranchCount(false, false);

        // Step counts
        let totalStepsComplete = 0;
        let totalSteps = tree.getStepCount(true, false, false);

        console.log(``);
        console.log(chalk.bold.yellow(`SmashTEST 0.1.1 BETA`));

        if(!emptyREPL) {
            console.log(`${totalToRun} branches to run` + (!runner.noReport ? ` | ${totalInReport} branches in report` : ``) + (tree.isDebug ? ` | ` + chalk.yellow(`In DEBUG mode (~)`) : ``));
            if(lastReportPath) {
                console.log(`Retrieving last run from: ` + chalk.gray.italic(lastReportPath));
            }
            if(!runner.noReport) {
                console.log(`Live report at: ` + chalk.gray.italic(reportPath));
            }
        }

        console.log(``);

        if(tree.isDebug || runner.repl) {
            runner.consoleOutput = true;

            // Run the branch being debugged
            let isBranchComplete = await runner.run();

            while(!isBranchComplete) {
                if(runner.hasPaused() || emptyREPL) {
                    // Tree not completed yet, open REPL and await user input
                    let nextStep = runner.getNextReadyStep();
                    let prevStep = runner.getLastStep();

                    if(nextStep) {
                        console.log("Next step: [ " + chalk.gray(nextStep.line.trim()) + " ]");
                        console.log(chalk.gray("enter = run next, s = skip, p = previous, r = resume, x = exit, or enter step to run it"));
                    }
                    else if(prevStep) {
                        console.log(chalk.gray("enter step to run it, p = previous, x = exit"));
                    }
                    else {
                        console.log(chalk.gray("enter step to run it, x = exit"));
                    }

                    console.log("");

                    const PROMPT_STR = ">  ";
                    let input = prompt(PROMPT_STR);
                    prompt.history.save();

                    if(input === null) { // Ctrl + C
                        console.log("");
                        await exit();
                        return;
                    }

                    switch(input.toLowerCase().trim()) {
                        case "":
                            console.log("");
                            isBranchComplete = await runner.runOneStep();
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
                            await exit();
                            return;

                        default:
                            let t = new Tree();
                            let stepStr = input;
                            let branchRun = null;

                            try {
                                let step = t.parseLine(stepStr);

                                if(step.hasCodeBlock()) {
                                    // Continue inputting lines until a } is inputted
                                    while(true) {
                                        let input = prompt(PROMPT_STR);
                                        prompt.history.save();
                                        stepStr += "\n" + input;

                                        if(input === null) { // Ctrl + C
                                            console.log("");
                                            await exit();
                                            return;
                                        }
                                        else if(input.length > 0 && input[0] == "}") {
                                            break;
                                        }
                                    }
                                }

                                console.log("");

                                t.parseIn(stepStr);
                                branchRun = await runner.injectStep(t.root.children[0]);
                            }
                            catch(e) {
                                // Parse issue
                                console.log(e);
                                console.log("");
                                continue;
                            }

                            break;
                    }
                }
                else {
                    break; // the Tree ended, so exit
                }
            }
        }
        else { // Normal run of whole tree
            // Progress bar
            let progressBar = generateProgressBar(true);
            progressBar.start(totalSteps, totalStepsComplete);

            let timer = null;
            activateProgressBarTimer();

            // Run
            await runner.run();
            isComplete = true;
        }

        /**
         * Exits the app
         */
        async function exit() {
            console.log("Stopping...");
            await runner.stop();
            console.log("");
        }

        /**
         * Activates the progress bar timer
         */
        function activateProgressBarTimer() {
            const UPDATE_PROGRESS_BAR_FREQUENCY = 250; // ms
            timer = setTimeout(updateProgressBar, UPDATE_PROGRESS_BAR_FREQUENCY);
        }

        /**
         * Called when the progress bar needs to be updated
         */
        function updateProgressBar() {
            // Update branch counts
            passed = tree.getBranchCount(true, true, true, false, false);
            failed = tree.getBranchCount(true, true, false, true, false);
            skipped = tree.getBranchCount(true, true, false, false, true);
            complete = tree.getBranchCount(true, true);
            totalToRun = tree.getBranchCount(true, false);
            totalInReport = tree.getBranchCount(false, false);

            // Update step counts
            totalStepsComplete = tree.getStepCount(true, true, false);
            totalSteps = tree.getStepCount(true, false, false);

            progressBar.stop();
            progressBar.start(totalSteps, totalStepsComplete);
            outputCounts();

            if(isComplete) {
                progressBar.stop();

                progressBar = generateProgressBar(false);
                progressBar.start(totalSteps, totalStepsComplete);
                outputCounts();
                progressBar.stop();

                console.log(``);
                console.log(chalk.yellow("Run complete" + (passed == totalToRun ? " 👍" : "")));
                console.log(`${complete} branches ran` + (!runner.noReport ? ` | ${totalInReport} branches in report` : ``));
                if(!runner.noReport) {
                    console.log(`Report at: ` + chalk.gray.italic(reportPath));
                }
                console.log(``);
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
            if(!isComplete && passed == 0 && failed == 0 && skipped == 0 && complete == 0) {
                return; // nothing to show yet
            }

            process.stdout.write(
                (elapsed ? (`${elapsed} | `) : ``) +
                (passed > 0        || isComplete ? chalk.greenBright(`${passed} passed`) + ` | ` : ``) +
                (failed > 0        || isComplete ? chalk.redBright(`${failed} failed`) + ` | ` : ``) +
                (skipped > 0       || isComplete ? chalk.cyanBright(`${skipped} skipped`) + ` | ` : ``) +
                (complete > 0      || isComplete ? (`${complete} branches run`) : ``)
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
    catch(e) {
        console.error(e);
    }
});
