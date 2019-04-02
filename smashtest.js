const readFiles = require('read-files-promise');
const glob = require('glob');
const utils = require('./utils');
const Tree = require('./tree.js');
const Runner = require('./runner.js');

if(process.argv.length < 3) {
    utils.error("No files inputted");
}

let filenames = [];
let jsFilenames = [];

// flags
let flags = [];
let groups = undefined;
let minFrequency = undefined;
let noDebug = undefined;
let noReport = undefined;
let maxInstances = undefined;
let rerunNotPassed = undefined;

// Sort command line arguments into filenames (non-js files), jsFilenames, and flags
for(let i = 2; i < process.argv.length; i++) {
    let arg = process.argv[i];
    if(arg.startsWith("-")) {
        let matches = arg.matches(/\-([^\=]+)(\=(.*))?/);
        if(!matches) {
            utils.error("Invalid argument: " + arg);
        }

        flags.push(arg);

        let name = matches[1].toLowerCase();
        let value = utils.stripQuotes(matches[3]);

        switch(name) {
            case "nodebug":
                noDebug = true;
                break;

            case "noreport":
                noReport = true;
                break;

            case "groups":
                groups = value.split(/\s+/);
                break;

            case "minfrequency":
                if(['high', 'med', 'low'].indexOf(value) == -1) {
                    utils.error("Invalid minFrequency argument. Must be either high, med, or low.");
                }
                minFrequency = value;
                break;

            case "maxinstances":
                maxInstances = value;
                break;

            case "rerunnotpassed":
            case "r":
                if(value) {
                    rerunNotPassed = value;
                }
                else {
                    rerunNotPassed = true;
                }
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

if(filenames.length == 0) {
    if(jsFilenames.length > 0) {
        utils.error("No files found (js files don't count)");
    }
    else {
        utils.error("No files found");
    }
}

glob('packages/*', async function(err, packageFilenames) { // new array of filenames under packages/
    if(err) {
        throw err;
    }

    if(!packageFilenames) {
        // TODO: make sure this will work from any directory where you want to run smashtest from
        utils.error("Make sure packages/ directory exists in the directory you're running this from");
    }

    // Remove JS files from packages
    packageFilenames = packageFilenames.filter(filename => !filename.endsWith('.js'));

    let originalFilenamesLength = filenames.length;
    filenames = filenames.concat(packageFilenames);

    let fileBuffers = await readFiles(filenames, {encoding: 'utf8'});

    if(fileBuffers.length == 0) {
        utils.error("No files found");
    }

    let tree = new Tree();

    for(let i = 0; i < fileBuffers.length; i++) {
        tree.parseIn(fileBuffers[i], filenames[i], i >= originalFilenamesLength);
    }

    if(rerunNotPassed) {
        let buffer = null;
        if(typeof rerunNotPassed == 'string') {
            // -rerunNotPassed='filename of report that constitutes last run, or num of branches run at the end of filename'
            // TODO: find and read in last report
            // TODO: document this







        }
        else {
            // TODO
            // If filename omitted, use last report from /reports that didn't have a ~.
            // Otherwise use report.html in same directory, which should have the last run






        }

        let json = JSON.parse(buffer);
        tree.mergeBranchesFromPrevRun(json);
    }

    tree.generateBranches(groups, minFrequency, noDebug);

    let runner = new Runner(tree);
    runner.flags = flags;
    runner.noDebug = noDebug;
    runner.maxInstances = maxInstances;

    if(!noReport) {
        // Set up Reporter






    }

    await runner.run();






});
