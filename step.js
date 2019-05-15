const utils = require('./utils.js');
const Constants = require('./constants.js');

/**
 * Represents a step within a Branch
 */
class Step {
    constructor(id) {
        this.id = id || -1;                   // id of the corresponding StepNode

        /*
        OPTIONAL

        this.functionDeclarationId = -1;      // id of StepNode that corresponds to the function declaration, if this step is a function call

        this.level = 0;                       // number of function calls deep this step is within its branch

        this.isPassed = false;                // true if this step passed after being run
        this.isFailed = false;                // true if this step failed after being run
        this.isSkipped = false;               // true if this step was skipped
        this.isRunning = false;               // true if this step is currently running

        this.error = {};                      // if this step failed, this is the Error that was thrown
        this.log = [];                        // Array of objects that represent the logs of this step

        this.elapsed = 0;                     // number of ms it took this step to execute
        this.timeStarted = {};                // Date object (time) of when this step started being executed
        this.timeEnded = {};                  // Date object (time) of when this step ended execution

        reportTemplate = "";                  // points to object whose html property contains html that represents this step in reports
        reportView = {};                      // object that replaces {{{mustache templates}}} in reportTemplate
        */
    }

    /**
     * Logs the given item to this Step
     * @param {Object or String} item - The item to log
     */
    appendToLog(item) {
        if(!this.log) {
            this.log = [];
        }

        if(typeof item == 'string') {
            this.log.push( { text: item } );
        }
        else {
            this.log.push(item);
        }
    }

    /**
     * @return {Boolean} True if this Step completed already
     */
    isComplete() {
        return this.isPassed || this.isFailed || this.isSkipped;
    }

    /**
     * @return {Object} An Object representing this step, but able to be converted to JSON
     */
    serializeObj() {
        let o = {};
        Object.assign(o, this);

        // TODO: delete stuff from o

        return o;
    }
}
module.exports = Step;
