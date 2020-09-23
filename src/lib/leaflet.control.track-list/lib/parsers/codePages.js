function decode866(s) {
    var c, i,
        s2 = [];
    for (i = 0; i < s.length; i++) {
        c = s.charCodeAt(i);
        if (c >= 128 && c <= 175) {
            c += (0x410 - 128);
        } else if (c >= 224 && c <= 239) {
            c += (0x440 - 224);
        } else if (c === 240) {
            c = 0x0401;
        } else if (c === 241) {
            c = 0x0451;
        }
        s2.push(String.fromCharCode(c));
    }
    return s2.join('');
}

function decodeCP1251(s) {
    var c, i,
        s2 = [];
    for (i = 0; i < s.length; i++) {
        c = s.charCodeAt(i);
        if (c >= 192 && c <= 255) {
            c += (0x410 - 192);
        } else if (c === 168) {
            c = 0x0401;
        } else if (c === 184) {
            c = 0x0451;
        }
        s2.push(String.fromCharCode(c));
    }
    return s2.join('');
}

export {decode866, decodeCP1251};

