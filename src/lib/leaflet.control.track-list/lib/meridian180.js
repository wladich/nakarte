import L from "leaflet";

function getSegmentSplitPointLat(latLng1, latLng2, lng) {
    const deltaLat = latLng2.lat - latLng1.lat;
    const deltaLng = latLng2.lng - latLng1.lng;
    return latLng1.lat + deltaLat / deltaLng * (lng - latLng1.lng);
}

function splitLineAt180Meridian(latLngs) {
    // this function also creates new LatLng object for all elements
    const wrappedLatLngs = latLngs.map((ll) => ll.wrap());
    const newLines = [];
    if (latLngs.length < 2) {
        return newLines;
    }

    let newLine = [wrappedLatLngs[0]];
    newLines.push(newLine);
    for (let i = 1; i < wrappedLatLngs.length; i++) {
        let latLng = wrappedLatLngs[i];
        let prevLatLng = wrappedLatLngs[i - 1];
        if (Math.abs(latLng.lng - prevLatLng.lng) <= 180) {
            newLine.push(latLng);
        } else {
            let positiveLng = L.Util.wrapNum(latLng.lng, [0, 360]);
            let positivePrevLng = L.Util.wrapNum(prevLatLng.lng, [0, 360]);
            let splitLng = 180 - 0.000001 * Math.sign(latLng.lng);
            let splitPrevLng = 180 - 0.000001 * Math.sign(prevLatLng.lng);
            let splitLat = getSegmentSplitPointLat(
                L.latLng(prevLatLng.lat, positivePrevLng),
                L.latLng(latLng.lat, positiveLng),
                splitLng
            );
            let splitPrevLat = getSegmentSplitPointLat(
                L.latLng(prevLatLng.lat, positivePrevLng),
                L.latLng(latLng.lat, positiveLng),
                splitPrevLng
            );
            newLine.push(L.latLng(splitPrevLat, splitPrevLng).wrap());
            newLine = [L.latLng(splitLat, splitLng).wrap(), latLng];
            newLines.push(newLine);
        }
    }
    return newLines;
}

function splitLinesAt180Meridian(lines) {
    return (lines || [])
        .map((segment) => splitLineAt180Meridian(segment))
        .reduce((acc, cur) => {
            acc.push(...cur);
            return acc;
        }, []);
}

export {splitLinesAt180Meridian};
