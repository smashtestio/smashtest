import chai from 'chai';
import Comparer from '../../packages/js/comparer.js';
import Step from '../../src/step.js';

const expect = chai.expect;
const assert = chai.assert;

describe('Step', () => {
    describe('serialize()', () => {
        it('returns a serialized object', () => {
            const s = new Step(1);

            s.fid = 6;
            s.level = 1;

            s.isPassed = true;

            s.error = new Error('oops');
            s.log = [{ text: 'log1' }, { text: 'log2' }];

            s.elapsed = 65;
            s.timeStarted = new Date();
            s.timeEnded = new Date();

            s.targetCoords = { x: 2, y: 4 };

            const o = s.serialize();

            Comparer.expect(o).to.match({
                $exact: true,

                id: 1,
                fid: 6,
                level: 1,

                isPassed: true,

                error: { message: 'oops' },
                log: [{ text: 'log1' }, { text: 'log2' }],

                elapsed: 65,

                targetCoords: { x: 2, y: 4 }
            });
        });
    });
});
