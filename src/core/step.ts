import cloneDeep from 'lodash/cloneDeep.js';
import invariant from 'tiny-invariant';
import { pickBy } from './typehelpers.js';
import { SerializedSmashError, StepNodeIndex } from './types.js';

/**
 * Represents a step within a Branch
 */
class Step {
    id; // id of the corresponding StepNode

    // OPTIONAL
    fid?: number; // id of StepNode that corresponds to the function declaration, if this step is a function call
    level?: number; // number of function calls deep this step is within its branch

    // SET AFTER STEP IS RUN
    isPassed?: boolean; // true if this step passed after being run
    isFailed?: boolean; // true if this step failed after being run
    isSkipped?: boolean; // true if this step was skipped
    isRunning?: boolean; // true if this step is currently running

    error?: SerializedSmashError; // if this step failed, this is the Error that was thrown
    log?: { text: string }[]; // Array of objects that represent the logs of this step

    elapsed?: number; // number of ms it took this step to execute
    timeStarted?: Date; // Date object (time) of when this step started being executed
    timeEnded?: Date; // Date object (time) of when this step ended execution

    beforeScreenshot?: unknown;
    afterScreenshot?: unknown;
    targetCoords?: { x: number; y: number } | null; // if this is set, set the crosshairs on the before screenshot to these coords (where x and y are a percentage of the total width and height respectively)

    constructor(id: number) {
        this.id = id;
    }

    /**
     * @return {Step} Clone of this step
     */
    clone() {
        return cloneDeep(this);
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
    appendToLog(item: string | { text: string }) {
        if (!this.log) {
            this.log = [];
        }

        if (typeof item === 'string') {
            this.log.push({ text: item });
        }
        else {
            this.log.push(item);
        }
    }

    /**
     * @param {Function} stepNodeIndex - A object that maps ids to StepNodes
     * @return {String} A string in the format [this step's filename:linenumber] --> [this step's function declaration's filename:linenumber]
     */
    locString(stepNodeIndex: StepNodeIndex) {
        const removePath = (str: string) => (str ? str.replace(/^.*[/\\]/, '') : '');

        invariant(this.id !== undefined, 'Step must have an id to get its loc string');

        const sn = stepNodeIndex[this.id];
        let loc = sn.filename ? `${removePath(sn.filename)}:${sn.lineNumber}` : '';
        const fsn = this.fid ? stepNodeIndex[this.fid] : null; // function declaration step node
        if (fsn) {
            invariant(fsn.filename, 'Function declaration step node must have a filename');
            loc += `${loc ? ' ' : ''}--> ${removePath(fsn.filename)}:${fsn.lineNumber}`;
        }

        return loc;
    }

    /**
     * @return {Object} An Object representing this step, but able to be converted to JSON and only containing the most necessary stuff for a report
     */
    serialize() {
        const keys: (keyof Step)[] = [
            'isPassed',
            'isFailed',
            'isSkipped',
            'isRunning',

            'error',
            'log',

            'elapsed',

            'beforeScreenshot',
            'afterScreenshot',
            'targetCoords'
        ];

        return {
            id: this.id,
            fid: this.fid,
            level: this.level,
            ...pickBy<Step>(this, (value, key) => value !== undefined && keys.includes(key))
        };
    }
}

export default Step;
