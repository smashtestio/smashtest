const chai = require('chai');
const expect = chai.expect;
const assert = chai.assert;
const Step = require('../../step.js');
const Comparer = require('../../packages/js/comparer.js');

describe("Step", () => {
    describe("serialize()", () => {
        it("returns a serialized object", () => {
            let s = new Step(1);

            s.fid = 6;
            s.level = 1;

            s.isPassed = true;

            s.error = new Error('oops');
            s.error.msg = s.error.message;

            s.log = [ { text: 'log1' }, { text: 'log2' } ];

            s.elapsed = 65;
            s.timeStarted = new Date();
            s.timeEnded = new Date();

            s.reportTemplateIndex = 9;
            s.reportView = { one: 'one', two: 'two' };

            let o = JSON.parse(s.serialize());

            Comparer.expect(o).to.match({
                $exact: true,

                id: 1,
                fid: 6,
                level: 1,

                isPassed: true,

                error: { msg: 'oops' },
                log: JSON.stringify( [ { text: 'log1' }, { text: 'log2' } ] ),

                elapsed: 65,

                reportTemplateIndex: 9,
                reportView: JSON.stringify( { one: 'one', two: 'two' } )
            });
        });
    });
});
