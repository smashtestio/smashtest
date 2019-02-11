/**
 * Represents a Step within a StepBlock
 */
class Step {
    /**
     * @param {Step} parent - The parent Step (null if none)
     * @param {String} text - The entire text of the step, including spaces at the front, comments, etc.
     * @param {String} filename - The filename where this step is from
     * @param {Number} lineNumber - The line number where this step is from
     */
    constructor(parent, text, filename, lineNumber) {
        this.text = text || "";

        this.children = [];     // Step or StepBlock objects that are children of this Step
        this.parent = parent || null;   // Step or StepBlock that's the parent of this Step

        this.filename = filename || "";
        this.lineNumber = lineNumber || 0;
    }
}
module.exports = Step;
