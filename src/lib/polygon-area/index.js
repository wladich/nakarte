const EARTH_RADIUS = 6371008.8;
const RADIANS_PER_DEGREE = Math.PI / 180;
/**
 * Calculate the approximate area of the polygon were it projected onto the earth.
 *
 * Reference:
 * Robert. G. Chamberlain and William H. Duquette, "Some Algorithms for Polygons on a Sphere",
 * JPL Publication 07-03, Jet Propulsion
 * Laboratory, Pasadena, CA, June 2007 https://trs.jpl.nasa.gov/handle/2014/40409
 */
function polygonArea(latlngs) {
    const latlngsLength = latlngs.length;
    if (latlngsLength < 3) {
        return 0;
    }
    let acc = 0;
    for (let i = 0; i < latlngsLength; i++) {
        let iLow = i - 1;
        if (iLow === -1) {
            iLow = latlngsLength - 1;
        }
        let iHigh = i + 1;
        if (iHigh === latlngsLength) {
            iHigh = 0;
        }
        acc +=
            (latlngs[iHigh].lng - latlngs[iLow].lng) *
            RADIANS_PER_DEGREE *
            Math.sin(latlngs[i].lat * RADIANS_PER_DEGREE);
    }
    return Math.abs(((EARTH_RADIUS * EARTH_RADIUS) / 2) * acc);
}

export {polygonArea};
