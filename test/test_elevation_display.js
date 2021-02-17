// eslint-disable-next-line import/default
import demTileDecoder from '~/lib/leaflet.layer.elevation-display/decoder';

const zigzagDecode = demTileDecoder.__get__('zigzagDecode');
const varintDecode = demTileDecoder.__get__('varintDecode');
const deltaDecodeInPlace = demTileDecoder.__get__('deltaDecodeInPlace');
const snakeOrderInPlace = demTileDecoder.__get__('snakeOrderInPlace');

suite('elevation tile decoder');

[
    [0, 0],
    [-1, 1],
    [1, 2],
    [-2, 3],
    [-64, 127],
    [64, 128],
    [32767, 65534],
    [-32768, 65535],
].forEach(function ([exp, inp]) {
    test(`zigzad decode [${inp} -> ${exp}]`, function () {
        const res = zigzagDecode(inp);
        assert.equal(exp, res);
    });
});

[
    [[0x00], [0]],
    [[0x01], [1]],
    [[0x02], [2]],
    [[0xff, 0xff, 0x03], [65535]],
    [[0x7f], [127]],
    [[0x80, 0x01], [128]],
    [[0x81, 0x01], [129]],
    [
        [0x81, 0x01, 0x02, 0x80, 0x01],
        [129, 2, 128],
    ],
].forEach(function ([bytes, expected]) {
    test(`varintDecode ${JSON.stringify(expected)}`, function () {
        const inp = new Uint8Array(bytes);
        const res = varintDecode(inp);
        assert.deepEqual(new Int32Array(expected), res);
    });
});

[
    [[1], 0, [1]],
    [[1], 1, [1]],
    [[1, 1], 0, [1, 0]],
    [[-1, 1], 0, [-1, 2]],
    [[1, -1], 0, [1, -2]],
    [[1, 2, 3], 1, [1, 2, 1]],
].forEach(function ([expected, start, inp]) {
    test(`delta decode ${JSON.stringify(inp)}, ${start}`, function () {
        const ar = new Int32Array(inp);
        deltaDecodeInPlace(ar, start);
        assert.deepEqual(new Int32Array(expected), ar);
    });
});

[
    [[], 1, []],
    [[1], 1, [1]],
    [[1, 2, 3, 4], 2, [1, 2, 4, 3]],
    [[1, 2, 3, 4, 5, 6, 7, 8], 2, [1, 2, 4, 3, 5, 6, 8, 7]],
    [[1, 2, 3, 4, 5, 6, 7, 8, 9], 3, [1, 2, 3, 6, 5, 4, 7, 8, 9]],
].forEach(function ([inp, width, expected]) {
    test(`snake order ${JSON.stringify(inp)}`, function () {
        const ar = new Int32Array(inp);
        snakeOrderInPlace(ar, width);
        assert.deepEqual(new Int32Array(expected), ar);
    });
});
