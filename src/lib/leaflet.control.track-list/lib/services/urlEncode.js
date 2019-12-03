function urlEncode(d) {
    return Object.entries(d).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
}

export default urlEncode;
