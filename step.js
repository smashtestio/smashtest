const clonedeep = require('lodash/clonedeep');
const utils = require('./utils.js');
const Constants = require('./constants.js');

/**
 * Represents a step within a Branch
 */
class Step {
    constructor(id) {
        this.id = id;                         // id of the corresponding StepNode

        /*
        OPTIONAL

        this.fid = -1;                        // id of StepNode that corresponds to the function declaration, if this step is a function call

        this.level = 0;                       // number of function calls deep this step is within its branch

        this.isDebug = false;                 // true if this step has the debug modifier (~)
        this.isBeforeDebug = false;           // true if this step has the debug modifier (~) before the step text
        this.isAfterDebug = false;            // true if this step has the debug modifier (~) after the step text

        this.isPassed = false;                // true if this step passed after being run
        this.isFailed = false;                // true if this step failed after being run
        this.isSkipped = false;               // true if this step was skipped
        this.isRunning = false;               // true if this step is currently running

        this.error = {};                      // if this step failed, this is the Error that was thrown
        this.log = [];                        // Array of objects that represent the logs of this step

        this.elapsed = 0;                     // number of ms it took this step to execute
        this.timeStarted = {};                // Date object (time) of when this step started being executed
        this.timeEnded = {};                  // Date object (time) of when this step ended execution

        reportTemplateIndex = -1;             // Index of the html that represents this step in reports (stored in Tree.reportTemplates)
        reportView = {};                      // object that replaces {{{template tags}}} in reportTemplates, values can only be strings
        */
    }

    /**
     * @return {Step} Clone of this step
     */
    clone() {
        return clonedeep(this);
    }

    /**
     * @return {Boolean} True if this Step completed already
     */
    isComplete() {
        return this.isPassed || this.isFailed || this.isSkipped;
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
     * @return {Array of String} Keys to include when serializing this object
     */
    static getSerializableKeys() {
        return [
            'id',
            'fid',
            'level',

            'isPassed',
            'isFailed',
            'isSkipped',
            'isRunning',

            'elapsed',

            'msg',
            'stackTrace',

            'reportTemplateIndex'
        ];
    }

    /**
     * @return {Array of String} Keys whose values should be fully turned into json when serializing this object
     */
    static getFullSerializableKeys() {
        return [
            'log',
            'reportView'
        ];
    }

    /**
     * @return {String} JSON representing this object, but only containing the most necessary stuff for a report
     */
    serialize() {
        return JSON.stringify(this, (k, v) => utils.isSerializable(k, v, Step.getSerializableKeys, Step.getFullSerializableKeys));
    }
}
module.exports = Step;
