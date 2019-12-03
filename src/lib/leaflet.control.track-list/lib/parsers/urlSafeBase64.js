function encode(s) {
    return (btoa(s)
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
        // .replace(/=+$/, '')
    );
}

function decode(s) {
    var decoded;
    s = s
        .replace(/[\n\r \t]/g, '')
        .replace(/-/g, '+')
        .replace(/_/g, '/');
    try {
        decoded = atob(s);
    } catch (e) {
        //will return null for malformed data
    }
    if (decoded && decoded.length) {
        return decoded;
    }
    return null;
}

export default {encode, decode}
