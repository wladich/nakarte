export default function stripBom(s) {
    if (s.substr(0, 3) === '\xef\xbb\xbf') {
        s = s.substr(3);
    }
    return s;
}
