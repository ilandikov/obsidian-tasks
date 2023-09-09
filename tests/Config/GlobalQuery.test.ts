/**
 * @jest-environment jsdom
 */

import { GlobalQuery } from '../../src/Config/GlobalQuery';

describe('GlobalQuery tests', () => {
    it('getInstance() should return the same object', () => {
        const globalQuery1 = GlobalQuery.getInstance();
        const globalQuery2 = GlobalQuery.getInstance();

        expect(Object.is(globalQuery1, globalQuery2)).toEqual(true);
    });

    it.each(['', ' ', '\n', '\n     \n    ', '  \n    \n'])(
        'should have empty source if line breaks and spaces were set in the query',
        (globalQuerySource) => {
            const globalQuery = new GlobalQuery();
            globalQuery.set(globalQuerySource);

            expect(globalQuery.isEmpty()).toEqual(true);
        },
    );
});
