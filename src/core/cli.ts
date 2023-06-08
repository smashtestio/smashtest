#!/usr/bin/env ts-node-esm

import chalk from 'chalk';
import progress from 'cli-progress';
import clipboardy from 'clipboardy';
import glob from 'glob';
import { EventEmitter } from 'node:events';
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import repl from 'node:repl';
// @ts-expect-error - no types
import readFiles from 'read-files-promise';
import * as Constants from './constants.js';
import { reporter, runner, tree } from './instances.js';
import StepNode from './stepnode.js';
import * as utils from './utils.js';

// Reading package.json is way simpler already, but it's a parse error for
// eslint, so even // eslint-disable doesn't work. Eslint only supports stage 4
// features, and it's stage 3 atm.
// import packageJson from '../package.json' assert { type: 'json' };
import { readFileSync } from 'fs';
import invariant from 'tiny-invariant';
import { entries, Merge } from './typehelpers.js';
import { Frequency } from './types.js';

const filePath = utils.normalizePathname(new URL('../../package.json', import.meta.url).pathname);
const packageJson = JSON.parse(readFileSync(filePath, 'utf-8'));

const { version } = packageJson;

// selenium-webdriver now includes a manager which automatically downloads the
// drivers. We just don't need those debug messages about it.
const consoleDebug = console.debug;
console.debug = (...args) => {
    if (args[0]?.includes('Applicable driver not found; attempting to install with Selenium Manager')) return;
    return consoleDebug(...args);
};

// ***************************************
//  Globals
// ***************************************
let isReport = true;
let isRecursive = false;

const yellowChalk = chalk.hex('#ffb347');
const hRule = chalk.gray('─'.repeat(process.stdout.columns));

const CONFIG_FILENAME = 'smashtest.json';

const PROGRESS_BAR_ON = true;
let fullRun = false;

console.log(hRule);
console.log(yellowChalk.bold('Smashtest ' + version));
console.log('');

// ***************************************
//  Exit and cleanup
// ***************************************

function setSigint() {
    process.on('SIGINT', () => {
        // Ctrl + C (except when REPL is open)
        console.log('');
        console.log('');
        exit(true);
    });
}

async function exit(forcedStop?: boolean, exitCode?: number) {
    if (forcedStop) {
        console.log('Stopping...');
        console.log('');
    }

    restoreCursor();

    if (runner) {
        try {
            await runner.stop();
            await new Promise((res) => setTimeout(res, 1000));
            process.exit(exitCode);
        }
        catch (e) {
            console.log(e);
            process.exit(exitCode);
        }
    }
    else {
        process.exit(exitCode);
    }
}

process.on('unhandledRejection', (reason) => {
    if (!runner.isStopped) {
        onError(reason, true, true);
    }
});

process.on('uncaughtException', (err) => {
    if (!runner.isStopped) {
        onError(err, true, true);
    }
});

// ***************************************
//  Helper Functions
// ***************************************

/**
 * Validates and sets the given flag within runner
 */
function processFlag(name: string, value: string) {
    try {
        if (typeof name !== 'string') {
            name = String(name);
        }
        if (typeof value !== 'string' && value !== undefined) {
            value = String(value);
        }

        const matches = name.match(/^(?<name>g|p):(?<varName>.*)$/);

        if (matches?.groups) {
            name = matches.groups.name;
        }

        switch (name) {
        case 'a':
            noValue();
            runner.skipPassed = false;
            break;

        case 'debug':
            utils.assert(value, 'debug flag must be set to a hash');
            runner.debugHash = value;
            break;

        case 'g':
            invariant(matches?.groups, '');
            runner.globalInit[matches.groups.varName] = value;
            break;

        case 'groups':
            utils.assert(value, 'groups flag must include a group expression');
            runner.groups = value.split(/\s*,\s*/).map((group) => group.split(/\s*\+\s*/));
            break;

        case 'headless':
            runner.headless = boolValue();
            break;

        case 'help':
        case '?':
            console.log(`Usage: smashtest [files] [options]

Files

  One or more test files to run. Can be in glob format (with *'s).
  If omitted, all .smash files in the current directory are used.

Options

  -a                                       Run all branches expected to run. No skipping passed branches. Opposite of -s.
  -r                                       Open the REPL (drive Smashtest from command line)
  -s                                       Skip branches that passed last time, carrying them over into report as passed
  -v                                       Output the version of Smashtest
  -?                                       Output this help prompt

  --debug=<hash>                           Only run the branch with the given hash, in debug mode
  --groups="<group1>,<group2>+<group3>"    Only run branches that match the expression (+ = AND, comma = OR, AND takes precendence)
  --g:<name>="<value>"                     Sets a global variable before every branch
  --headless=<true/false>                  Whether to run browsers as headless
  --help                                   Output this help prompt (-?)
  --max-parallel=<N>                       Do not run more than N branches simultaneously
  --max-screenshots=<N>                    Do not take more than N screenshots
  --min-frequency=<high/med/low>           Only run branches at or above this frequency
  --no-debug                               Fail if there are any $'s or ~'s. Useful to prevent debugging in CI.
  --output-errors=<true/false>             Whether to output all errors to console
  --p:<name>="<value>"                     Set a persistent variable
  --random=<true/false>                    Whether to randomize the order of branches
  --recursive                              Scan the current directory and subdirectories for .smash files
  --repl                                   Open the REPL (drive Smashtest from command line) (-r)
  --report-domain=<domain>                 Domain and port where report server should run (domain or domain:port format)
  --report-history=<true/false>            Whether to keep a history of all reports by date
  --report-path="<path>"                   Set to absolute path to set report location
  --report-server=<true/false>             Whether to run a server during run for live report updates
  --screenshots=<true/false>               Whether to take screenshots at each step
  --skip-passed=<true/false/file>          Whether to skip branches that passed last time (-s/-a)
  --step-data=<all/fail/none>              Keep step data for all steps, only failed steps, or no steps
  --test-server=<url>                      Location of test server (e.g., http://localhost:4444/wd/hub for selenium server)
  --version                                Output the version of Smashtest (-v)
`);
            process.exit();
            break;

        case 'max-parallel':
            utils.assert(
                value.match(/^[0-9]+$/) && parseInt(value, 10) !== 0,
                'Invalid max-parallel. It must be a positive integer above 0.'
            );

            runner.maxParallel = parseInt(value, 10);
            break;

        case 'max-screenshots':
            utils.assert(
                value.match(/^[0-9]+$/) && parseInt(value, 10) !== 0,
                'Invalid max-screenshots. It must be a positive integer above 0.'
            );

            runner.maxScreenshots = parseInt(value, 10);
            break;

        case 'min-frequency':
            // eslint-disable-next-line no-case-declarations
            const isValid = (value: string): value is Frequency =>
                Constants.FREQUENCIES.includes(value as Frequency);

            utils.assert(isValid(value), 'Invalid min-frequency. It must be either \'high\', \'med\', or \'low\'.');
            runner.minFrequency = value;
            break;

        case 'no-debug':
            noValue();
            runner.noDebug = true;
            break;

        case 'output-errors':
            runner.outputErrors = boolValue();
            break;

        case 'p':
            invariant(matches?.groups, '');
            runner.persistent[matches.groups.varName] = value;
            break;

        case 'random':
            runner.random = boolValue();
            break;

        case 'recursive':
            noValue();
            isRecursive = true;
            break;

        case 'repl':
        case 'r':
            noValue();
            runner.isRepl = true;
            break;

        case 'report-domain':
            if (!value.match(/^[^/: ]+(:[0-9]+)?$/)) {
                utils.error('Invalid report-domain. It must be in the format \'domain\' or \'domain:port\'.');
            }
            reporter.reportDomain = value;
            break;

        case 'report-server':
            reporter.isReportServer = boolValue();
            break;

        case 'report-path':
            reporter.reportPath = value;
            break;

        case 'report-history':
            reporter.history = boolValue();
            break;

        case 's':
            noValue();
            runner.skipPassed = true;
            break;

        case 'screenshots':
            runner.screenshots = boolValue();
            break;

        case 'skip-passed':
            if (value === 'true') {
                runner.skipPassed = true;
            }
            else if (value === 'false') {
                runner.skipPassed = false;
            }
            else {
                runner.skipPassed = Boolean(value);
            }
            break;

        case 'step-data':
            if (value === 'all' || value === 'fail' || value === 'none') {
                tree.stepDataMode = value;
            }
            else {
                utils.error('Invalid step-data. It must be \'all\', \'fail\', or \'none\'.');
            }
            break;

        case 'test-server':
            if (value === '') {
                runner.testServer = undefined; // --test-server="" is the same as not setting test-server at all
                break;
            }
            if (!value.match(/^https?:\/\/.*$/)) {
                utils.error('Invalid test-server. It must be in the format \'http://...\' or \'https://...\'.');
            }
            runner.testServer = value;
            break;

        case 'version':
        case 'v':
            // Version already printed to console when executable started
            noValue();
            process.exit();
            break;

        default:
            utils.error(`Invalid flag '${name}'. See --help for details.`);
            break;
        }

        runner.flags[name] = value;
    }
    catch (e) {
        onError(e);
    }

    // Validation functions
    function boolValue() {
        utils.assert(value === 'true' || value === 'false', `'${name}' flag must be set to either 'true' or 'false'`);
        return value === 'true';
    }

    function noValue() {
        utils.assert(!value, `'${name}' flag cannot have a value`);
    }
}

/**
 * Handles a generic error
 */
function onError(err: unknown, extraSpace?: boolean, noEnd?: boolean) {
    restoreCursor();

    if ((err instanceof Error && 'fatal' in err && err.fatal) || extraSpace) {
        // extra spacing needed for fatal errors coming out of runner
        console.log('');
        console.log('');
    }

    if (err instanceof Error) {
        console.log('outputStack' in err && err.outputStack === false ? 'Error: ' + err.message : err.stack);
        console.log('');
    }

    if (!noEnd) {
        process.exit();
    }
}

/**
 * Restores the console's cursor (if it's been hidden)
 */
function restoreCursor() {
    process.stdout.write('\x1B[?25h');
}

/**
 * Returns "es" if count isn't 1
 */
function plural(count: number) {
    return count === 1 ? '' : 'es';
}

(async () => {
    const passedReplCommands: string[] = [];
    let isBranchComplete: boolean;
    let replServer: repl.REPLServer;
    let elapsed = '';
    let progressBar: progress.Bar;
    let codeBlockStep: string | null;

    /**
     * Outputs info to the console that comes before the REPL prompt
     */
    function prePrompt() {
        const nextStep = runner.getNextReadyStep();
        const prevStep = runner.getLastStep();

        if (nextStep) {
            console.log(`Next step: [ ${chalk.gray(tree.stepNodeIndex[nextStep.id].text.trim())} ]`);
            console.log(
                chalk.gray(
                    'enter = run next, p = run previous, s = skip, r = resume, x = exit, or enter step to run it'
                )
            );
        }
        else if (prevStep) {
            console.log(chalk.gray('Passed the very last step'));
            console.log(chalk.gray('enter or x = exit, p = run previous, or enter step to run it'));
        }
        else {
            console.log(chalk.gray('enter step to run it, enter or x = exit'));
        }

        console.log('');
    }

    const wrapAction = (action: () => Promise<void>) => {
        return async function (this: repl.REPLServer) {
            console.log('');
            await action.call(this);
        };
    };

    const commandsMap: Record<
        string,
        { name?: string; help?: string; action?: (this: repl.REPLServer) => Promise<void> }
    > = {
        '': {
            action: wrapAction(async () => {
                if (runner.isRepl && (isBranchComplete || tree.branches.length === 0)) {
                    // this is an empty repl, so exit
                    exit(false);
                }
                else {
                    isBranchComplete = await runner.runOneStep();
                }
            })
        },
        s: {
            name: 'skip',
            help: '(s) Skip next step',
            action: wrapAction(async () => {
                isBranchComplete = await runner.skipOneStep();
            })
        },
        p: {
            name: 'repeat',
            help: '(p) Repeat previous step',
            action: wrapAction(async () => {
                await runner.runLastStep();
            })
        },
        r: {
            name: 'resume',
            help: '(r) Resume running',
            action: wrapAction(async () => {
                isBranchComplete = await runner.run();
            })
        },
        x: {
            name: 'exit',
            help: '(x) Exit',
            action: wrapAction(async () => {
                exit(true);
            })
        },
        c: {
            name: 'copy',
            help: '(c) Copy all evaluated passed commands to the clipboard',
            action: wrapAction(async () => {
                clipboardy.writeSync(passedReplCommands.join('\n') + '\n');
                console.log('Copied passed commands to clipboard');
                console.log('');
                replServer.displayPrompt();
            })
        },
        h: {
            name: 'help',
            help: '(h) Print this help message'
        },
        e: {
            name: 'editor',
            help: '(e) Enter editor mode'
        }
    };

    try {
        // ***************************************
        //  Parse inputs
        // ***************************************

        let filenames: string[] = [];
        let fileBuffers: string[] = [];
        let configBuffers = null;

        // Open config file, if there is one
        try {
            configBuffers = await readFiles([CONFIG_FILENAME], { encoding: 'utf8' });
        }
        catch {
            // it's ok if there's no config file
        }

        if (configBuffers && configBuffers.length > 0) {
            let config = null;
            try {
                config = JSON.parse(configBuffers[0]);
            }
            catch (e) {
                utils.error(`Syntax error in ${CONFIG_FILENAME}`);
            }

            for (const name in config) {
                processFlag(name, config[name]);
            }
        }

        // Sort command line arguments into filenames and flags
        const filePatterns: string[] = [];

        for (let i = 2; i < process.argv.length; i++) {
            const arg = process.argv[i];
            if (arg.startsWith('-')) {
                const matches = arg.match(/--?([^=]+)(=(.*))?/);
                if (!matches) {
                    utils.error(`Invalid argument: ${arg}`);
                }
                else {
                    const name = matches[1];
                    const value = matches[3];

                    processFlag(name, value);
                }
            }
            else {
                filePatterns.push(arg);
            }
        }

        for (const filePattern of filePatterns) {
            const newFilenames = glob.sync(utils.normalizePathname(path.resolve(filePattern)), { absolute: true });

            // If it's a concrete filename with no glob wildcard, and
            // there's no match, it's probably a typo, so throw an error
            if (newFilenames.length === 0 && !/[*?]/.test(filePattern)) {
                utils.error(`File not found: ${filePattern}`);
            }

            filenames = [...filenames, ...newFilenames];
        }

        if (filenames.length === 0 && filePatterns.length > 0) {
            utils.error(`No files found for: ${filePatterns.join(', ')}`);
        }

        if (filenames.length === 0 && !runner.isRepl) {
            let searchString = '*.smash';

            if (isRecursive) {
                searchString = '**/*.smash';
            }

            // if no filenames passed in, just choose all the .smash files
            const smashFiles = glob.sync(utils.normalizePathname(searchString), { absolute: true });

            if (!smashFiles) {
                utils.error('No files found');
            }
            else {
                smashFiles.forEach((filename) => filenames.push(filename));
            }
        }

        const packageFilenames = glob.sync(
            utils.normalizePathname(new URL('../packages', import.meta.url).pathname) + '/*.smash'
        );

        if (!packageFilenames || packageFilenames.length === 0) {
            utils.error('Make sure ../packages/ directory exists in the directory you\'re running this from');
        }

        // Read in all files
        const originalFilenamesLength = filenames.length;
        if (runner.isRepl) {
            filenames = packageFilenames; // only include packages for a --repl
        }
        else {
            filenames = [...filenames, ...packageFilenames];
        }

        fileBuffers = await readFiles(filenames, { encoding: 'utf8' });

        if (fileBuffers.length === 0) {
            utils.error('No files found');
        }

        for (let i = 0; i < fileBuffers.length; i++) {
            tree.parseIn(fileBuffers[i], filenames[i], i >= originalFilenamesLength);
        }

        // ***************************************
        //  Init the runner, build the tree
        // ***************************************

        // Generate branches
        process.stdout.write('Generating branches...\x1B[?25l'); // temporary message + hide cursor
        try {
            runner.init();
        }
        finally {
            // Remove "Generating branches..."
            readline.clearLine(process.stdout, 0);
            readline.cursorTo(process.stdout, 0);
        }

        setSigint(); // attach SIGINT (Ctrl + C) handler after runner.init(), so user can Ctrl + C out of a long branchify operation via the default SIGINT handler

        // Create smashtest directory if it doesn't already exist
        const smashtestDir = reporter.getPathFolder();

        if (!fs.existsSync(smashtestDir)) {
            fs.mkdirSync(smashtestDir, { recursive: true });
        }

        // Output errors to console by default, do not output all steps to console by default
        runner.outputErrors = true;
        runner.consoleOutput = false;

        // No reporter for debug or repl runs
        if (tree.isDebug || runner.isRepl) {
            isReport = false;
            runner.screenshots = false;
        }

        // Link the reporter to the runner, if we're doing a report
        if (isReport) {
            runner.reporter = reporter;
        }

        if (tree.branches.length === 0 && !runner.isRepl) {
            utils.error('0 branches generated from given files');
        }

        // --skip-passed
        if (tree.isDebug) {
            // no --skip-passed allowed with debug mode
            runner.skipPassed = false;
        }
        if (runner.skipPassed) {
            await reporter.markPassedFromPrevRun(runner.skipPassed === true ? undefined : runner.skipPassed);
        }

        // Suppress maxlisteners warning from node
        EventEmitter.defaultMaxListeners = runner.maxParallel + 5;

        // ***************************************
        //  Output initial counts and other messages
        // ***************************************

        // Output header that contains number of branches to run and live report location
        if (!runner.isRepl) {
            tree.updateCounts();

            if (tree.counts.totalToRun === 0 && runner.skipPassed) {
                console.log('No branches left to run. All branches have passed last time.');
                outputCompleteMessage(true);
                restoreCursor();
                process.exit(0);
            }

            console.log(
                `${tree.counts.totalToRun} branch${plural(tree.counts.totalToRun)} to run` +
                    (isReport ? ` | ${tree.counts.total} branch${plural(tree.counts.total)} total` : '') +
                    (tree.isDebug
                        ? tree.isExpressDebug
                            ? ' | ' + yellowChalk('In EXPRESS DEBUG mode')
                            : ' | ' + yellowChalk('In DEBUG mode')
                        : '')
            );
            if (isReport) {
                console.log('Live report at: ' + chalk.gray.italic(reporter.getFullReportPath()));
            }

            console.log('');
        }

        if ((tree.isDebug && !tree.isExpressDebug) || runner.isRepl) {
            // ***************************************
            //  REPL
            // ***************************************
            isBranchComplete = false;
            restoreCursor();

            if (runner.isRepl) {
                // Create an empty, paused runner
                runner.createEmptyRunner(tree);
                runner.consoleOutput = true;
                runner.outputErrors = false;
                await runner.runBeforeEverything();
            }
            else {
                // debug mode
                runner.consoleOutput = true;
                runner.outputErrors = false;

                // Run the branch being debugged
                isBranchComplete = await runner.run();
            }

            if (!isBranchComplete || runner.isPaused) {
                // Tree not completed yet, open REPL and await user input
                codeBlockStep = null; // contents of a code block

                prePrompt();

                replServer = repl.start({
                    prompt: chalk.gray('> '),
                    completer: () => {
                        process.stdout.write('    '); // enter a tab made up of 4 spaces
                        return []; // no autocomplete on tab
                    },
                    eval: async (input, context, filename, callback) => {
                        try {
                            const linesToEval = input.replace(/\n+$/, '').split(/\n/);
                            for (let i = 0; i < linesToEval.length; i++) {
                                const line = linesToEval[i];
                                await evalLine(line);

                                const lastStep = runner.getLastStep();
                                // lastStep is null when the REPL session finishes from a 'resume' command. The root
                                // cause is this.currBranch = this.tree.nextBranch() being null at the end of the
                                // while loop in runInstance:run(). Whithout REPL, we don't get here, and with a REPL
                                // step-by-step finish, runInstance:run() bails out with a 'return' in the middle of
                                // the while loop (runinstance.ts:~132).
                                if (lastStep && lastStep.isPassed && !commandsMap[line.trim()]) {
                                    passedReplCommands.push(line);
                                }

                                if (
                                    i === linesToEval.length - 1 &&
                                    codeBlockStep === null &&
                                    !runner.isStopped &&
                                    !runner.isComplete &&
                                    line.trim() !== 'e'
                                ) {
                                    prePrompt(); // include prompt after last line, and only if we're not in the middle of inputting a code block
                                }
                            }

                            if (!runner.isStopped && !runner.isComplete) {
                                // @ts-expect-error callback is incorrectly typed,
                                // the second arg is optional and must not be passed
                                // See https://github.com/nodejs/node/blob/main/lib/repl.js#L939
                                callback(null);
                            }
                        }
                        catch (e) {
                            console.log(e);
                            console.log('');

                            prePrompt();
                            // @ts-expect-error callback is incorrectly typed,
                            // the second arg is optional and must not be passed
                            // See https://github.com/nodejs/node/blob/main/lib/repl.js#L939
                            callback(null);
                        }
                    }
                });

                const commands = entries(commandsMap);

                for (const [shortcut, $obj] of commands) {
                    const obj = $obj as Merge<typeof $obj>;
                    if (obj.name) {
                        // Is built-in command? (e.g. 'help')
                        if (replServer.commands[obj.name]) {
                            // Reuse built-in command properties
                            Object.assign(replServer.commands[obj.name] as typeof obj, obj);
                            // Write it back to our command store
                            Object.assign(commandsMap[shortcut], replServer.commands[obj.name]);

                            const entry = commandsMap[shortcut] as typeof obj;

                            invariant(entry.action);

                            entry.action = wrapAction(entry.action);
                        }
                        else {
                            replServer.defineCommand(obj.name, {
                                help: obj.help,
                                async action(this: repl.REPLServer) {
                                    invariant(obj.action);
                                    await obj.action.call(this);
                                    prePrompt();
                                    replServer.displayPrompt();
                                }
                            });
                        }
                    }
                }

                // Remove unnecessary built-in commands
                // @ts-expect-error deletion works
                delete replServer.commands.load;
                // @ts-expect-error deletion works
                delete replServer.commands.break;
                // @ts-expect-error deletion works
                delete replServer.commands.clear;
                // @ts-expect-error deletion works
                delete replServer.commands.save;

                replServer.on('exit', () => {
                    exit(true);
                });
            }
            else {
                exit(false);
            }
        }
        else {
            // ***************************************
            //  Full run
            // ***************************************
            fullRun = true;

            if (PROGRESS_BAR_ON) {
                // Progress bar
                progressBar = generateProgressBar(true);
                progressBar.start(tree.counts.totalSteps, tree.counts.totalStepsComplete);

                activateProgressBarTimer();
            }

            // Run
            await runner.run();
        }
    }
    catch (e) {
        onError(e, fullRun && PROGRESS_BAR_ON);
    }

    /**
     * Outputs a message upon the completion of a run
     */
    function outputCompleteMessage(outputCounts?: boolean) {
        console.log('');
        console.log(yellowChalk('Run complete'));
        if (outputCounts) {
            console.log(getCounts());
        }
        if (isReport && !reporter.history) {
            console.log('Report at: ' + chalk.gray.italic(reporter.getFullReportPath()));
        }

        console.log('');
    }

    /**
     * @return {String} The console-formatted counts in the tree
     */
    function getCounts() {
        return (
            (tree.counts.passed > 0 ? chalk.greenBright(`${tree.counts.passed} passed`) + ' | ' : '') +
            (tree.counts.failed > 0 ? chalk.redBright(`${tree.counts.failed} failed`) + ' | ' : '') +
            (tree.counts.skipped > 0 ? chalk.cyanBright(`${tree.counts.skipped} skipped`) + ' | ' : '') +
            `${tree.counts.complete} branch${plural(tree.counts.complete)} complete`
        );
    }

    /**
     * Activates the progress bar timer
     */
    function activateProgressBarTimer() {
        const timeout = tree.branches.length <= 100000 ? 500 : 5000; // every 500 ms or 5 secs
        setTimeout(updateProgressBar, timeout);
    }

    /**
     * Called when the progress bar needs to be updated
     */
    async function updateProgressBar(forceComplete?: boolean) {
        if (runner.isStopped) {
            return;
        }

        updateElapsed();

        readline.clearLine(process.stderr, 0);
        readline.cursorTo(process.stderr, 0);

        progressBar.start(tree.counts.totalSteps, tree.counts.totalStepsComplete);
        outputCounts();

        if (forceComplete || runner.isComplete) {
            console.log('');
            outputCompleteMessage();

            // If any branch failed, exit with 1, otherwise exit with 0
            for (let i = 0; i < tree.branches.length; i++) {
                if (tree.branches[i].isFailed) {
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
    function generateProgressBar(clearOnComplete: boolean) {
        return new progress.Bar(
            {
                clearOnComplete,
                barsize: 25,
                hideCursor: true,
                linewrap: true,
                format: '{bar} {percentage}% | '
            },
            progress.Presets.shades_classic
        );
    }

    /**
     * Outputs the given counts to the console
     */
    function outputCounts() {
        tree.updateCounts();
        process.stdout.write((elapsed ? `${elapsed} | ` : '') + getCounts());
    }

    /**
     * Updates the elapsed variable
     */
    function updateElapsed() {
        const d = new Date();
        d.setSeconds((Number(new Date()) - Number(tree.timeStarted)) / 1000);
        elapsed = d.toISOString().substring(11, 19);
    }

    /**
     * @return {Number} The number of spaces at the front of s
     */
    function numberOfSpacesInFront(str: string) {
        return (str.match(/^( *)/) || []).length;
    }

    /**
     * @return {String} The first line of s, "" if empty string
     */
    function firstLine(str: string) {
        const matches = str.match(/^.*/);
        if (matches && matches.length > 0) {
            return matches[0];
        }
        else {
            return '';
        }
    }

    /**
     * @return {String} The last line of s, "" if empty string
     */
    function lastLine(str: string) {
        const matches = str.match(/.*$/);
        if (matches && matches.length > 0) {
            return matches[0];
        }
        else {
            return '';
        }
    }

    /**
     * Called when the REPL needs to eval input
     */
    async function evalLine(input: string) {
        if (codeBlockStep !== null) {
            // we're currently inputting a code block
            codeBlockStep += '\n' + input;
            if (
                input.length === 0 ||
                input.trim() !== '}' ||
                numberOfSpacesInFront(firstLine(codeBlockStep)) !== numberOfSpacesInFront(lastLine(codeBlockStep))
            ) {
                // not the end of code block input
                return;
            }
        }

        isBranchComplete = false;

        input = input.trim();

        if (input in commandsMap) {
            const command = commandsMap[input];
            invariant(command.action);
            // Pass correct 'this' for the built-in commands
            await command.action.call(replServer);
        }
        else {
            if (codeBlockStep === null) {
                if (input === '{') {
                    // A code block has started. Continue inputting lines until a } is inputted.
                    codeBlockStep = '(anon step) ' + input;
                    return;
                }
                else {
                    const stepNode = new StepNode(0);
                    stepNode.parseLine(input);
                    if (stepNode.isMultiBlockFunctionDeclaration || stepNode.isMultiBlockFunctionCall) {
                        utils.error('Cannot use step block brackets ([, ]) here');
                    }
                    else if (stepNode.isFunctionDeclaration) {
                        utils.error('Cannot define a function declaration or hook here');
                    }
                    else if (stepNode.hasCodeBlock()) {
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

            console.log('');
            await runner.inject(input);
        }

        if (isBranchComplete && runner.isComplete) {
            exit(false);
        }
    }
})();
