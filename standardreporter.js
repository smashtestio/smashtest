const Reporter = require('./reporter.js');

/**
 * Standard reporter
 */
class StandardReporter extends Reporter {
    constructor() {
        super();
    }

    /**
     * Invoked when htmlReport or name changed from last time
     */
    async onReportChanged() {

    }

    /**
     * @return {String} The generated HTML report
     */
    generateReport() {


        // Set this.htmlReport and this.name
    }
}
module.exports = StandardReporter;
