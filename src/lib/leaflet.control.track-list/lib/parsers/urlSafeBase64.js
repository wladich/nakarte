function encode(s) {
    return (btoa(s)
            .replace(/\+/ug, '-')
            .replace(/\//ug, '_')
        // .replace(/=+$/, '')
    );
}

function decode(s) {
    var decoded;
    s = s
        .replace(/[\n\r \t]/ug, '')
        .replace(/-/ug, '+')
        .replace(/_/ug, '/');
    try {
        decoded = atob(s);
    } catch (e) {
        // will return null for malformed data
    }
    if (decoded && decoded.length) {
        return decoded;
    }
    return null;
}

export {encode, decode};
