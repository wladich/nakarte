function arrayBufferToString(arBuf) {
    const
        arr = new Uint8Array(arBuf),
        s = [];
    for (let i = 0; i < arr.length; i += 4096) {
        let chunk = arr.subarray(i, i + 4096);
        chunk = String.fromCharCode.apply(null, chunk);
        s.push(chunk);
    }
    return s.join('');
}

function stringToArrayBuffer(s) {
    const
        length = s.length,
        buf = new ArrayBuffer(length),
        arr = new Uint8Array(buf);
    for (let i = 0; i < length; i++) {
        arr[i] = s.charCodeAt(i);
    }
    return buf;
}

function blobFromString(s, mimeType = 'application/download') {
    const arr = stringToArrayBuffer(s);
    return new Blob([arr], {type: mimeType});
}

export {arrayBufferToString, blobFromString, stringToArrayBuffer};
