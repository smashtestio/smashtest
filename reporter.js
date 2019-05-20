const fs = require('fs');
const readFiles = require('read-files-promise');
const mustache = require('mustache');
const utils = require('./utils.js');
const chalk = require('chalk');
const getPort = require('get-port');
const WebSocket = require('ws');

const DEFAULT_FILENAME = 'smashtest-report.html';

/**
 * Generates a report on the status of the tree and runner
 */
class Reporter {
    constructor(tree, runner) {
        this.tree = tree;               // the Tree object to report on
        this.runner = runner;           // the Runner object to report on

        this.serializedTree = '';       // serialized version of this.tree
        this.branchUpdates = [];        // references to branches in this.tree.branches that were updated after this.serializedTree was generated

        this.reportTemplate = "";       // template for html reports
        this.reportTime = null;         // Date when the report was generated
        this.reportPath = process.cwd() + "/" + DEFAULT_FILENAME; // absolute path of where to read/write report html file

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
            utils.error("report-template.html not found in this directory");
        }
        this.reportTemplate = buffers[0];

        await this.writeFull();
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
     * Writes the report to disk and serialized tree to websockets, and continues doing so periodically
     */
    async writeFull() {
        // Update state
        this.tree.updateCounts();
        this.reportTime = new Date();
        this.serializedTree = this.tree.serialize();

        // Render report html
        let view = {
            tree: utils.escapeHtml(this.serializedTree),
            runner: utils.escapeHtml(this.runner.serialize()),
            reportTime: JSON.stringify(this.reportTime),
            reportDomain: this.reportDomain || ""
        }

        let reportData = mustache.render(this.reportTemplate, view);

        // Check if report is above max size
        this.size = reportData.length;
        if(this.maxSize > 0 && this.size > this.maxSize) {
            utils.error(`Maximum report size exceeded (report size = ${(this.size/1048576).toFixed(3)} MB, max size = ${this.maxSize/1048576} MB)`);
        }

        // Write report to disk
        await new Promise((res, rej) => fs.writeFile(this.reportPath, reportData, err => err ? rej(err) : res()));

        // TODO
        // Write serialized tree to all connected websockets







        // Have this function get called again in a certain amount of time
        if(!this.stopped) {
            // We generate/write the report less often the larger it gets, since it takes longer to do so
            let time = 0;
            if(this.size < 20971520) {           // < 20 MB
                time = 20000;                    // 20 secs
            }
            else if(this.size < 314572800) {     // < 300 MB
                time = 60000;                    // 1 min
            }
            else {                               // >= 300 MB
                time = 300000;                   // 5 mins
            }

            this.timerFull = setTimeout(() => this.writeFull(), time);
        }
    }

    /**
     * Writes a limited snapshot of the serialized tree to websockets, and continues doing so periodically
     */
    async writeSnapshot() {










        // Have this function get called again in a certain amount of time
        if(!this.stopped) {
            let time = 250; // 250 ms
            this.timerSnapshot = setTimeout(() => this.writeSnapshot(), time);
        }
    }

    /**
     * Reads in the given report html file, extracts json, merges it with tree
     * @param {String} [filename] - The relative filename to use, uses default report filename if omitted
     */
    async mergeInLastReport(filename) {
        let lastReportPath = process.cwd() + "/" + (filename || DEFAULT_FILENAME);
        console.log(`Including passed branches from: ${chalk.gray(lastReportPath)}`);
        console.log("");

        let fileBuffers = null;
        try {
            fileBuffers = await readFiles([ filename ], {encoding: 'utf8'});
        }
        catch(e) {
            utils.error(`The file '${filename}' could not be found`);
        }

        let buffer = fileBuffers[0];
        buffer = this.extractTreeJson(buffer);
        this.tree.markPassedFromPrevRun(buffer);
    }

    /**
     * Extracts the report json from the given html report
     * @param {String} reportData - The raw html report
     * @return {String} The json object extracted from reportData
     * @throws {Error} If there was a problem extracting, or if the JSON is invalid
     */
    extractTreeJson(reportData) {
        const errMsg = "Error parsing the report from last time. Please try another file or do not use -s or --skip-passed.";

        let matches = htmlReport.match(/<div id="tree">([^<]*)<\/div>/);
        if(matches) {
            let content = matches[1];
            content = utils.unescapeHtml(content);
            try {
                JSON.parse(content);
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

                    // Dump current serialized tree
                    ws.send(this.serializedTree);
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
