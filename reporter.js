const fs = require('fs');
const readFiles = require('read-files-promise');
const mustache = require('mustache');
const utils = require('./utils.js');
const chalk = require('chalk');
const getPort = require('get-port');
const WebSocket = require('ws');

const REPORT_FILENAME = 'smashtest.html';
const REPORT_DATA_FILENAME = 'smashtest-data.js';

/**
 * Generates a report on the status of the tree and runner
 */
class Reporter {
    constructor(tree, runner) {
        this.tree = tree;               // the Tree object to report on
        this.runner = runner;           // the Runner object to report on

        this.reportTemplate = "";       // template for html reports
        this.reportTime = null;         // Date when the report was generated
        this.reportPath = process.cwd() + "/" + REPORT_FILENAME; // absolute path of where to read/write report html file
        this.reportDataPath = process.cwd() + "/" + REPORT_DATA_FILENAME; // absolute path of where to read/write report data js file

        this.maxSize = 1073741824;      // maximum permissible size of report, in bytes, no limit if 0 (1 GB default)
        this.size = 0;                  // size of report, in bytes

        this.isReportServer = true;     // whether or not to run the report server
        this.reportDomain = null;       // domain:port where report server's api is available
        this.wsServer = null;           // websocket server object

        this.timerFull = null;          // timer that goes off when it's time to do a full write
        this.timerSnapshot = null;      // timer that goes off when it's time to do a snapshot write

        this.stopped = false;           // true if this Reporter has been stopped
    }

    /**
     * Starts the reporter, which generates and writes to disk a new report once every REPORT_GENERATE_FREQUENCY ms
     */
    async start() {
        // Load template
        let buffers = await readFiles(['report-template.html'] , {encoding: 'utf8'});
        if(!buffers || !buffers[0]) {
            utils.error(`report-template.html not found`);
        }
        this.reportTemplate = buffers[0];

        // Kick off write functions
        await this.writeFull();
        await this.writeSnapshot();
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

            await this.writeFull(); // one final time, to encompass the last batch of changes
        }
    }

    /**
     * Generates and writes report and report data to disk. Notifies all connected websockets. Continues doing so periodically.
     */
    async writeFull() {
        if(this.stopped) {
            return;
        }

        // Update state
        this.tree.updateCounts();
        this.reportTime = new Date();

        // Render report html
        let reportData = 'onReportData(`' + utils.escapeBackticks({
            tree: this.tree.serialize(),
            runner: this.runner.serialize(),
            reportTime: this.reportTime,
            reportDomain: this.reportDomain
        }) + '`);';

        // Check if report is above max size
        this.size = reportData.length;
        if(this.maxSize > 0 && this.size > this.maxSize) {
            utils.error(`Maximum report size exceeded (report size = ${(this.size/1048576).toFixed(3)} MB, max size = ${this.maxSize/1048576} MB)`);
        }

        // Write report and report data to disk
        await Promise.all([
            new Promise((res, rej) => fs.writeFile(this.reportPath, this.reportTemplate, err => err ? rej(err) : res())),
            new Promise((res, rej) => fs.writeFile(this.reportDataPath, reportData, err => err ? rej(err) : res()))
        ]);

        // Notify all connected websockets that new data is available on disk
        this.wsServer.clients.forEach(client => {
            client.send(JSON.stringify({ dataUpdate: true }));
        });

        // Have this function get called again in a certain amount of time
        if(!this.stopped) {
            // As the report data gets bigger, it takes longer to generate/write. So we generate/write it less often.
            let time = 0;
            if(this.size < 52428800) {           // < 50 MB
                time = 20000;                    // every 20 secs
            }
            else {                               // >= 50 MB
                time = 60000;                    // every 1 min
            }

            this.timerFull = setTimeout(() => this.writeFull(), time);
        }
    }

    /**
     * Sends a snapshot of the tree to all connected websockets. Continues doing so periodically.
     */
    async writeSnapshot() {
        if(this.stopped) {
            return;
        }

        // Update state
        this.tree.updateCounts();

        // Send snapshot to all connected websockets
        let snapshot = this.tree.serializeSnapshot();
        this.wsServer.clients.forEach(client => {
            client.send(JSON.stringify(snapshot));
        });

        // Have this function get called again in a certain amount of time
        if(!this.stopped) {
            let time = 500; // every 500 ms
            this.timerSnapshot = setTimeout(() => this.writeSnapshot(), time);
        }
    }

    /**
     * Reads in the given report data file (usually smashtest-data.js) and marks passed branches as passed in this.tree
     * @param {String} [filename] - The relative filename to use, uses default report filename if omitted
     */
    async mergeInLastReport(filename) {
        filename = filename || REPORT_DATA_FILENAME;
        let lastReportDataPath = process.cwd() + "/" + filename;
        console.log(`Including passed branches from: ${chalk.gray(lastReportDataPath)}`);
        console.log("");

        let fileBuffers = null;
        try {
            fileBuffers = await readFiles([ lastReportDataPath ], {encoding: 'utf8'});
        }
        catch(e) {
            utils.error(`The file '${filename}' could not be found`);
        }

        let buffer = fileBuffers[0];
        buffer = this.extractTree(buffer);
        this.tree.markPassedFromPrevRun(buffer);
    }

    /**
     * Extracts the report data json from the given report data file
     * @param {String} reportData - The raw report data file contents
     * @return {Object} The js object extracted from reportData
     * @throws {Error} If there was a problem extracting, or if the file contents is invalid
     */
    extractTree(reportData) {
        const errMsg = "Error parsing the report from last time. Please try another file or do not use -s or --skip-passed.";

        let matches = htmlReport.match(/^[^`]*`(.*)`[^`]*$/);
        if(matches) {
            let content = matches[1];
            content = utils.unescapeBackticks(content);
            try {
                content = JSON.parse(content);
            }
            catch(e) {
                utils.error(errMsg);
            }

            return content;
        }
        else {
            utils.error(errMsg);
        }
    }

    /**
     * Runs WebSocket server
     */
    async runServer() {
        if(!this.isReportServer) {
            return;
        }

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
            this.reportDomain = "ws://localhost:" + port;
        }

        this.wsServer = new WebSocket.Server({ port: port });
        //console.log(`Report server running on port ${port}`);

        wsServer.on('connection', (ws) => {
            ws.on('message', (message) => {
                try {
                    // message must be { origin: absolute filename or domain:port of client }
                    message = JSON.parse(message);

                    // Validate that the client is either the current report html file or a page on the reportDomain origin
                    if(!message.origin || (message.origin != this.reportPath && !message.origin.startsWith(this.reportDomain))) {
                        throw new Error(`Invalid filename param`);
                    }
                }
                catch(e) {
                    ws.send(e);
                    ws.close();
                }
            });
        });
    }
}
module.exports = Reporter;
