const fs = require("fs");
const path = require("path");
const readFiles = require("read-files-promise");
const mustache = require("mustache");
const utils = require("./utils.js");
const chalk = require("chalk");
const getPort = require("get-port");
const WebSocket = require("ws");
const date = require('date-and-time');

let reportFilename,
    reportDataFilename,
    passedDataFilename,
    smashtestSSDir,
    initialFolder,
    folder;

const now = new Date();
const dateFormat = date.format(now, 'YYYY-MM-DDTHH-mm-ss');

/**
 * Generates a report on the status of the tree and runner
 */
class Reporter {
    constructor(tree, runner) {
        this.tree = tree;               // the Tree object to report on
        this.runner = runner;           // the Runner object to report on

        this.reportTemplate = "";       // template for html reports
        this.reportTime = null;         // Date when the report was generated

        this.isReportServer = true;     // whether or not to run the report server
        this.reportDomain = null;       // domain:port where report server's api is available
        this.wsServer = null;           // websocket server object

        this.prevSnapshot = null;       // previous snapshot sent over websockets

        this.timerFull = null;          // timer that goes off when it's time to do a full write
        this.timerSnapshot = null;      // timer that goes off when it's time to do a snapshot write

        this.stopped = false;           // true if this Reporter has been stopped

        this.reportPath = "";           // path for the report folder default is same folder smashtest file
        this.history = false;           // activate history for reporting
    }

    /**
    * @return {String} The absolute path of the report html file
    */
    getFullReportPath() {
        return path.join(folder, "report.html");
    }

    /**
    * @return {String} The path for report folder
    */
   getPathFolder() {
    initialFolder = (this.history === false ? "smashtest" : `${path.join(`smashtest`, `report`, `smashtest-${dateFormat}`)}`);
    initialFolder = (this.history === false ? "smashtest" : `${path.join("smashtest/report/smashtest-", dateFormat)}`);
    folder = (this.reportPath === "" ? initialFolder : `${path.join(this.reportPath, initialFolder)}`);
    return folder;
}

    /**
    * @return {String} Variable custom path for report folder
    */
    getCustomPath() {
        return folder;
    }

    /**
     * Starts the reporter, which generates and writes to disk a new report once every REPORT_GENERATE_FREQUENCY ms
     */
    async start() {
        // Clear out existing screenshots (one by one)
        reportFilename = path.join(folder, "report.html");
        reportDataFilename = path.join(folder, "report-data.js");
        passedDataFilename = path.join(folder, "passed-data");
        smashtestSSDir = path.join(folder, "screenshots");

        try {
            let files = fs.readdirSync(smashtestSSDir);
            for(let file of files) {
                let match = file.match(/[^\_]+/);
                let hash = match ? match[0] : null;
                // If we're doing --skip-passed, delete a screenshot only if the branch didn't pass last time
                if(!this.runner.skipPassed || !this.tree.branches.find(branch => branch.hash == hash && branch.passedLastTime)) {
                    fs.unlinkSync(path.join(smashtestSSDir, file));
                }
            }
        }
        catch(e) {
            if(!e.message.includes(`no such file or directory, scandir`)) { // not finding the dir is ok
                throw e;
            }
        }

        // Load template
        let buffers = await readFiles([path.join(path.dirname(require.main.filename), `report-template.html`)] , {encoding: 'utf8'});
        if(!buffers || !buffers[0]) {
            utils.error(`report-template.html not found`);
        }
        this.reportTemplate = buffers[0];

        // Start server
        if(this.isReportServer) {
            await this.startServer();
        }

        // Kick off write functions
        await this.writeFull();
        if(this.isReportServer) {
            await this.writeSnapshot();
        }
    }

    /**
     * Stops the timer set by start()
     */
    async stop() {
        if(!this.stopped) {
            this.stopped = true;

            if(this.timerFull) {
                clearTimeout(this.timerFull);
                this.timerFull = null;
            }
            if(this.timerSnapshot) {
                clearTimeout(this.timerSnapshot);
                this.timerSnapshot = null;
            }

            // Send updates one final time, to encompass the last batch of changes
            if(this.isReportServer) {
                await this.writeSnapshot();
            }
            await this.writeFull();
        }
    }

    /**
     * Starts WebSocket server
     */
    async startServer() {
        // Set port and fill reportDomain
        let port = null;
        let portConfig = {port: getPort.makeRange(9000,9999)}; // avoid 8000's, since that's where localhost apps tend to be run
        if(this.reportDomain) {
            let matches = this.reportDomain.match(/\:([0-9]+)/);
            if(matches && matches[1]) { // reportDomain has a domain and port
                port = parseInt(matches[1]);
            }
            else { // reportDomain only has a domain
                port = await getPort(portConfig);
                this.reportDomain += ":" + port;
            }
        }
        else { // reportDomain has nothing
            port = await getPort(portConfig);
            this.reportDomain = `localhost:${port}`;
        }

        this.wsServer = new WebSocket.Server({ port: port });
        //console.log(`Report server running on port ${port}`);

        this.wsServer.on('connection', (ws) => {
            ws.on('message', (message) => {
                const ERR_MSG = `Invalid origin`;
                let isError = false;
                try {
                    // message must be { origin: absolute filename or domain:port of client }
                    try {
                        message = JSON.parse(message);
                    }
                    catch(e) {
                        throw new Error(ERR_MSG);
                    }

                    if(!message.origin) {
                        throw new Error(ERR_MSG);
                    }

                    // Validate that the client is either the current report html file or a page on the reportDomain origin
                    function canonFilenameOrigin(origin) {
                        return decodeURI(origin).replace(/^\//, '').replace(/\\/g, '/');
                    }
                    if(canonFilenameOrigin(message.origin) != canonFilenameOrigin(this.getFullReportPath()) &&
                        !message.origin.startsWith(this.reportDomain)) {
                        throw new Error(ERR_MSG);
                    }
                }
                catch(e) {
                    ws.send(JSON.stringify({ error: e.toString() }));
                    ws.close();
                    isError = true;
                }

                if(!isError) {
                    ws.send(`{ "dataUpdate": true }`);
                }
            });
        });
    }

    /**
     * Generates and writes report and report data to disk. Notifies all connected websockets. Continues doing so periodically.
     */
    async writeFull() {
        const MAX_BRANCHES_PER_TYPE = 500;
        const MAX_BRANCHES_PER_FAILED = 1000;

        this.reportTime = new Date();

        // Generate report data file
        let reportData = 'onReportData(String.raw`' + utils.escapeBackticks(JSON.stringify({
            tree: this.tree.serialize(MAX_BRANCHES_PER_TYPE, MAX_BRANCHES_PER_FAILED),
            runner: this.runner.serialize(),
            reportTime: this.reportTime,
            reportDomain: this.reportDomain
        })) + '`);';

        // Generate passed data file
        let passedData = this.tree.serializePassed();

        // Write report, report data, and passed data to disk
        await Promise.all([
            new Promise((res, rej) => fs.writeFile(reportFilename, this.reportTemplate, err => err ? rej(err) : res())),
            new Promise((res, rej) => fs.writeFile(reportDataFilename, reportData, err => err ? rej(err) : res())),
            new Promise((res, rej) => fs.writeFile(passedDataFilename, passedData, err => err ? rej(err) : res()))
        ]);

        // Notify all connected websockets that new data is available on disk
        if(this.isReportServer && this.wsServer) {
            this.wsServer.clients.forEach(client => {
                client.send(`{ "dataUpdate": true }`);
            });
        }

        // Have this function get called again in a certain period of time
        if(!this.stopped) {
            // The more branches there are, the longer it takes to serialize, the less often this function should get called
            let timeout = this.tree.branches.length <= 100000 ? 30000 : 300000; // every 30 secs or 5 mins
            this.timerFull = setTimeout(() => this.writeFull(), timeout);
        }
    }

    /**
     * Sends a snapshot of the tree to all connected websockets. Continues doing so periodically.
     */
    async writeSnapshot() {
        if(this.wsServer && this.wsServer.clients.size > 0) {
            const MAX_CURRENTLY_RUNNING_IN_SNAPSHOT = 20;

            // Send snapshot to all connected websockets
            let snapshot = JSON.stringify({
                snapshot: true,
                tree: this.tree.serializeSnapshot(MAX_CURRENTLY_RUNNING_IN_SNAPSHOT, this.prevSnapshot ? this.prevSnapshot.tree : undefined),
                runner: this.runner.serialize()
            });

            this.prevSnapshot = JSON.parse(snapshot);

            this.wsServer.clients.forEach(client => {
                client.send(snapshot);
            });
        }

        // Have this function get called again in a certain period of time
        if(!this.stopped) {
            // The more branches there are, the longer it takes to serialize, the less often this function should get called
            let timeout = this.tree.branches.length <= 100000 ? 1000 : 5000; // every 1 or 5 secs
            this.timerSnapshot = setTimeout(() => this.writeSnapshot(), timeout);
        }
    }

    /**
     * Reads in the given passed data file and marks passed branches as passed in this.tree
     * @param {String} [filename] - The relative filename to use, uses passed data file filename if omitted
     */
    async markPassedFromPrevRun(filename) {
        filename = filename || passedDataFilename;
        console.log(`Including passed branches from: ${chalk.gray(filename)}`);
        console.log("");

        let fileBuffers = null;
        try {
            fileBuffers = await readFiles([ filename ], {encoding: 'utf8'});
        }
        catch(e) {
            utils.error(`The file '${filename}' could not be found`);
        }

        this.tree.markPassedFromPrevRun(fileBuffers[0]);
    }
}
module.exports = Reporter;
