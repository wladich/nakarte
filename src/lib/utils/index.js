function formatTrackLength(len, nullable) {
    let digits = 0;

    if (len < 10000) {
        digits = 2;
    } else if (len < 100000) {
        digits = 1;
    }

    const fixed = (len / 1000).toFixed(digits);

    return (nullable ? fixed : Number(fixed)) + ' km';
}

export {formatTrackLength};
