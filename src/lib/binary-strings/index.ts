function arrayBufferToString(arBuf: ArrayBuffer): string {
    const arr = new Uint8Array(arBuf);
    const s = [];
    for (let i = 0; i < arr.length; i += 4096) {
        const chunk = arr.subarray(i, i + 4096);
        s.push(String.fromCharCode.apply(null, (chunk as unknown) as Array<number>));
    }
    return s.join('');
}

function stringToArrayBuffer(s: string): ArrayBuffer {
    const buf = new ArrayBuffer(s.length);
    const arr = new Uint8Array(buf);
    for (let i = 0; i < s.length; i++) {
        arr[i] = s.charCodeAt(i);
    }
    return buf;
}

function blobFromString(s: string): Blob {
    const arr = stringToArrayBuffer(s);
    return new Blob([arr]);
}

export {arrayBufferToString, blobFromString, stringToArrayBuffer};
