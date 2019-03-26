/**
 * Generates a report on the status of the tree and runner
 */
class Reporter {
    constructor() {
        this.tree = {};                 // the Tree object to report on
        this.runner = {};               // the Runner object to report on
        this.path = "";                 // absolute path on disk to report file

        this.htmlReport = "";           // the generated html report is stored here
        this.name = "";                 // name of the report
    }

    /**
     * Calls generateReport() every time ms, calls onReportChanged() it's different from last time
     */
    start(time) {
        // setTimer() for time ms, then call generateReport(), then set another timer for time ms
        // If onReportChanged() called, sleep for a second before starting process again
    }

    /**
     * Stops the timer set by start()
     */
    stop() {

    }

    /**
     * Invoked when htmlReport or name changed from last time
     */
    async onReportChanged() {}

    /**
     * @return {String} The generated HTML report
     */
    generateReport() {}
}
