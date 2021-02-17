function zigzagDecode(i) {
    return (i >>> 1) ^ -(i & 1);
}

function varintDecode(ar) {
    const ints = new Int32Array(ar.length);
    let intsPos = 0;
    let value = 0;
    let shift = 0;
    let insideNumber = false;
    for (let b of ar) {
        value = value | ((b & 0x7f) << shift);
        if ((b & 0x80) === 0) {
            ints[intsPos] = value;
            intsPos += 1;
            value = 0;
            shift = 0;
            insideNumber = false;
        } else {
            insideNumber = true;
            shift += 7;
        }
    }
    if (insideNumber) {
        throw new Error('Incomplete varint');
    }
    return ints.slice(0, intsPos);
}

function deltaDecodeInPlace(ar, start) {
    for (let i = start + 1; i < ar.length; i++) {
        ar[i] += ar[i - 1];
    }
}

function snakeOrderInPlace(ar, width) {
    if (ar.length % width !== 0) {
        throw new Error('Array length is not multiple of width');
    }
    for (let i = 1; i < ar.length / width; i += 2) {
        ar.subarray(i * width, (i + 1) * width).reverse();
    }
}

function decodeTile(arBuf, width) {
    const ar = new Uint8Array(arBuf);
    const deltaOrder = ar[0];
    const ints = varintDecode(ar.subarray(1));
    for (let i = 0; i < ints.length; i++) {
        ints[i] = zigzagDecode(ints[i]);
    }
    for (let i = deltaOrder; i > 0; i--) {
        deltaDecodeInPlace(ints, i - 1);
    }
    snakeOrderInPlace(ints, width);
    return ints;
}

export {decodeTile};
