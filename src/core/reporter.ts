import chalk from 'chalk';
import date from 'date-and-time';
import getPort, { portNumbers } from 'get-port';
import fs from 'node:fs';
import path from 'node:path';
import readFiles from 'read-files-promise';
import { WebSocketServer } from 'ws';
import Runner from './runner.js'
import Tree from './tree.js'
import * as utils from './utils.js';

let reportFilename: string,
    reportDataFilename: string, // absolute path of report-data.js file
    passedDataFilename: string, // absolute path of passed-data file
    passedDataFilenameHistory: string, // absolute path of passed-data file inside history, if report-history is on
    smashtestSSDir: string; // absolute path of screenshots directory

const now = new Date();
const dateFormat = date.format(now, 'YYYY-MM-DDTHH-mm-ss');

/**
 * Generates a report on the status of the tree and runner
 */
class Reporter {
    tree; // the Tree object to report on
    runner; // the Runner object to report on

    reportTemplate = ''; // template for html reports
    reportTime = null; // Date when the report was generated

    isReportServer = true; // whether or not to run the report server
    reportDomain = null; // domain:port where report server's api is available
    wsServer = null; // websocket server object

    prevSnapshot = null; // previous snapshot sent over websockets

    timerFull = null; // timer that goes off when it's time to do a full write
    timerSnapshot = null; // timer that goes off when it's time to do a snapshot write

    stopped = false; // true if this Reporter has been stopped

    reportPath = ''; // custom absolute path for the smashtest folder sent in by user
    history = false; // activate history for reporting

    constructor(tree: Tree, runner: Runner) {
        this.tree = tree; // the Tree object to report on
        this.runner = runner; // the Runner object to report on
    }

    /**
     * @return {String} Absolute path of smashtest/ folder
     */
    getPathFolder() {
        const initialFolder = this.history ? path.join('smashtest', 'reports', `smashtest-${dateFormat}`) : 'smashtest';
        const smashtestFolder =
            this.reportPath === '' ? path.join(process.cwd(), 'smashtest') : path.join(this.reportPath, 'smashtest');
        const folder =
            this.reportPath === ''
                ? path.join(process.cwd(), initialFolder)
                : path.join(this.reportPath, initialFolder);

        reportFilename = path.join(folder, 'report.html');
        reportDataFilename = path.join(folder, 'report-data.js');
        passedDataFilename = path.join(smashtestFolder, 'passed-data');
        passedDataFilenameHistory = path.join(folder, 'passed-data');
        smashtestSSDir = path.join(folder, 'screenshots');

        return folder;
    }

    /**
     * @return {String} Absolute path of the report html file
     */
    getFullReportPath() {
        return path.join(this.getPathFolder(), 'report.html');
    }

    /**
     * @return {String} Absolute path of the screenshots directory
     */
    getFullSSPath() {
        return smashtestSSDir;
    }

    /**
     * Starts the reporter, which generates and writes to disk a new report once every REPORT_GENERATE_FREQUENCY ms
     */
    async start() {
        // Clear out existing screenshots (one by one)
        try {
            const files = fs.readdirSync(smashtestSSDir);
            for (const file of files) {
                const match = file.match(/[^_]+/);
                const hash = match ? match[0] : null;
                // If we're doing --skip-passed, delete a screenshot only if the branch didn't pass last time
                if (
                    !this.runner.skipPassed ||
                    !this.tree.branches.find((branch) => branch.hash == hash && branch.passedLastTime)
                ) {
                    fs.unlinkSync(path.join(smashtestSSDir, file));
                }
            }
        }
        catch (e) {
            if (!e.message.includes('no such file or directory, scandir')) {
                // not finding the dir is ok
                throw e;
            }
        }

        // Load template
        const buffers = await readFiles([new URL('report-template.html', import.meta.url).pathname], {
            encoding: 'utf8'
        });
        if (!buffers || !buffers[0]) {
            utils.error('report-template.html not found');
        }
        this.reportTemplate = buffers[0];

        // Start server
        if (this.isReportServer) {
            await this.startServer();
        }

        // Kick off write functions
        await this.writeFull();
        if (this.isReportServer) {
            await this.writeSnapshot();
        }
    }

    /**
     * Stops the timer set by start()
     */
    async stop() {
        if (!this.stopped) {
            this.stopped = true;

            if (this.timerFull) {
                clearTimeout(this.timerFull);
                this.timerFull = null;
            }
            if (this.timerSnapshot) {
                clearTimeout(this.timerSnapshot);
                this.timerSnapshot = null;
            }

            // Send updates one final time, to encompass the last batch of changes
            if (this.isReportServer) {
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
        const portConfig = { port: portNumbers(9000, 9999) }; // avoid 8000's, since that's where localhost apps tend to be run
        if (this.reportDomain) {
            const matches = this.reportDomain.match(/:([0-9]+)/);
            if (matches && matches[1]) {
                // reportDomain has a domain and port
                port = parseInt(matches[1]);
            }
            else {
                // reportDomain only has a domain
                port = await getPort(portConfig);
                this.reportDomain += ':' + port;
            }
        }
        else {
            // reportDomain has nothing
            port = await getPort(portConfig);
            this.reportDomain = `localhost:${port}`;
        }

        this.wsServer = new WebSocketServer({ port: port });
        //console.log(`Report server running on port ${port}`);

        this.wsServer.on('connection', (ws) => {
            ws.on('message', (message) => {
                const ERR_MSG = 'Invalid origin';
                let isError = false;
                try {
                    // message must be { origin: absolute filename or domain:port of client }
                    try {
                        message = JSON.parse(message);
                    }
                    catch (e) {
                        throw new Error(ERR_MSG);
                    }

                    if (!message.origin) {
                        throw new Error(ERR_MSG);
                    }

                    // Validate that the client is either the current report html file or a page on the reportDomain origin
                    const canonFilenameOrigin = function (origin) {
                        return decodeURI(origin).replace(/^\//, '').replace(/\\/g, '/');
                    };
                    if (
                        canonFilenameOrigin(message.origin) != canonFilenameOrigin(this.getFullReportPath()) &&
                        !message.origin.startsWith(this.reportDomain)
                    ) {
                        throw new Error(ERR_MSG);
                    }
                }
                catch (e) {
                    ws.send(JSON.stringify({ error: e.toString() }));
                    ws.close();
                    isError = true;
                }

                if (!isError) {
                    ws.send('{ "dataUpdate": true }');
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
        const reportData =
            'onReportData(String.raw`' +
            utils.escapeBackticks(
                JSON.stringify({
                    tree: this.tree.serialize(MAX_BRANCHES_PER_TYPE, MAX_BRANCHES_PER_FAILED),
                    runner: this.runner.serialize(),
                    reportTime: this.reportTime,
                    reportDomain: this.reportDomain
                })
            ) +
            '`);';

        // Generate passed data file
        const passedData = this.tree.serializePassed();

        // Write report, report data, and passed data to disk
        await Promise.all([
            new Promise((res, rej) =>
                fs.writeFile(reportFilename, this.reportTemplate, (err) => (err ? rej(err) : res()))
            ),
            new Promise((res, rej) => fs.writeFile(reportDataFilename, reportData, (err) => (err ? rej(err) : res()))),
            new Promise((res, rej) => fs.writeFile(passedDataFilename, passedData, (err) => (err ? rej(err) : res()))),
            this.history
                ? new Promise((res, rej) =>
                    fs.writeFile(passedDataFilenameHistory, passedData, (err) => (err ? rej(err) : res()))
                )
                : undefined
        ]);

        // Notify all connected websockets that new data is available on disk
        if (this.isReportServer && this.wsServer) {
            this.wsServer.clients.forEach((client) => {
                client.send('{ "dataUpdate": true }');
            });
        }

        // Have this function get called again in a certain period of time
        if (!this.stopped) {
            // The more branches there are, the longer it takes to serialize, the less often this function should get called
            const timeout = this.tree.branches.length <= 100000 ? 30000 : 300000; // every 30 secs or 5 mins
            this.timerFull = setTimeout(() => this.writeFull(), timeout);
        }
    }

    /**
     * Sends a snapshot of the tree to all connected websockets. Continues doing so periodically.
     */
    async writeSnapshot() {
        if (this.wsServer && this.wsServer.clients.size > 0) {
            const MAX_CURRENTLY_RUNNING_IN_SNAPSHOT = 20;

            // Send snapshot to all connected websockets
            const snapshot = JSON.stringify({
                snapshot: true,
                tree: this.tree.serializeSnapshot(
                    MAX_CURRENTLY_RUNNING_IN_SNAPSHOT,
                    this.prevSnapshot ? this.prevSnapshot.tree : undefined
                ),
                runner: this.runner.serialize()
            });

            this.prevSnapshot = JSON.parse(snapshot);

            this.wsServer.clients.forEach((client) => {
                client.send(snapshot);
            });
        }

        // Have this function get called again in a certain period of time
        if (!this.stopped) {
            // The more branches there are, the longer it takes to serialize, the less often this function should get called
            const timeout = this.tree.branches.length <= 100000 ? 1000 : 5000; // every 1 or 5 secs
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
        console.log('');

        let fileBuffers = null;
        try {
            fileBuffers = await readFiles([filename], { encoding: 'utf8' });
        }
        catch (e) {
            utils.error(`The file '${filename}' could not be found`);
        }

        this.tree.markPassedFromPrevRun(fileBuffers[0]);
    }
}

export default Reporter;
