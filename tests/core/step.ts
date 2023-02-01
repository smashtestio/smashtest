/* globals describe, it */
import Comparer from '../../src/packages/js/comparer.js';
import Step from '../../src/core/step.js';

describe('Step', () => {
    describe('serialize()', () => {
        it('returns a serialized object', () => {
            const step = new Step(1);

            step.fid = 6;
            step.level = 1;

            step.isPassed = true;

            step.error = new Error('oops');
            step.log = [{ text: 'log1' }, { text: 'log2' }];

            step.elapsed = 65;
            step.timeStarted = new Date();
            step.timeEnded = new Date();

            step.targetCoords = { x: 2, y: 4 };

            const o = step.serialize();

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
