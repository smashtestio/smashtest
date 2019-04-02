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
        this.onReportChanged = null;    // async function that gets invoked when htmlReport changes
    }

    /**
     * Calls generateReport() every time ms, calls onReportChanged() it's different from last time
     */
    start(time) {
        timer = setTimeout(this.checkForChanges, REPORT_GENERATE_FREQUENCY);
    }

    /**
     * Stops the timer set by start()
     */
    stop() {
        clearTimeout(timer);
    }

    /**
     * Checks for changes to this.htmlReport, and if there is, invokes this.onReportChanged()
     */
    async checkForChanges() {
        let newHtmlReport = this.generateReport();
        if(newHtmlReport != this.htmlReport) {
            this.htmlReport = newHtmlReport;
            await this.onReportChanged();
        }
        timer = setTimeout(this.checkForChanges, REPORT_GENERATE_FREQUENCY);
    }

    /**
     * @return {String} The generated HTML report
     */
    generateReport() {
        return "REPORT HERE";



    }
}
module.exports = Reporter;
