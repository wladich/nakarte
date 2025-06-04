// eslint-disable-next-line import/default
import serviceNakarte from '~/lib/leaflet.control.track-list/lib/services/nakarte';

suite('flattenArray');

const flattenArray = serviceNakarte.__get__('flattenArray');
[
    [[], []],
    [[[], []], []],
    [[[1]], [1]],
    [[[1, 2, 3]], [1, 2, 3]],
    [
        [[], [1, 2, 3]],
        [1, 2, 3],
    ],
    [
        [[1], [2]],
        [1, 2],
    ],
    [
        [
            [1, 2, 3],
            [4, 5, 6],
        ],
        [1, 2, 3, 4, 5, 6],
    ],
    [
        [
            [1, 2],
            [3, 4],
            [5, 6],
        ],
        [1, 2, 3, 4, 5, 6],
    ],
].forEach(function ([inp, exp]) {
    test(JSON.stringify(inp), function () {
        const res = flattenArray(inp);
        assert.deepEqual(res, exp);
    });
});
