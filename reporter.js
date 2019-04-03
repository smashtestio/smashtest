const REPORT_GENERATE_FREQUENCY = 1000; // ms

/**
 * Generates a report on the status of the tree and runner
 */
class Reporter {
    constructor() {
        this.tree = {};                 // the Tree object to report on
        this.runner = {};               // the Runner object to report on

        this.htmlReport = "";           // the generated html report is stored here

        this.timer = null;              // timer that goes off when it's time to re-generate the report
        this.stopped = false;           // true if this Reporter was already stopped
        this.onReportChanged = null;    // async function that gets invoked when htmlReport changes
    }

    /**
     * Calls generateReport() every REPORT_GENERATE_FREQUENCY ms, calls onReportChanged() if report changed from last time
     */
    async start() {
        await this.checkForChanges();
    }

    /**
     * Stops the timer set by start()
     */
    async stop() {
        this.stopped = true;
        if(this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }
        await this.checkForChanges(); // one final time, to encompass last-second changes
    }

    /**
     * Checks for changes to this.htmlReport, and if there is, invokes this.onReportChanged()
     */
    async checkForChanges() {
        let newHtmlReport = this.generateReport();
        if(newHtmlReport != this.htmlReport) {
            this.htmlReport = newHtmlReport;
            if(this.onReportChanged) {
                await this.onReportChanged();
            }
        }
        
        if(!this.stopped) {
            this.timer = setTimeout(this.checkForChanges, REPORT_GENERATE_FREQUENCY);
        }
    }

    /**
     * @return {String} The HTML report generated from this.tree and this.runner
     */
    generateReport() {
        return "REPORT HERE";



    }
}
module.exports = Reporter;
