// From https://www.geeksforgeeks.org/dsa/check-if-two-given-line-segments-intersect/

/* eslint-disable camelcase */

// function to find orientation of ordered triplet (p, q, r)
// 0 --> p, q and r are collinear
// 1 --> Clockwise
// 2 --> Counterclockwise
function orientation(p, q, r) {
    const val = (q.lng - p.lng) * (r.lat - q.lat) - (q.lat - p.lat) * (r.lng - q.lng);
    // collinear
    if (val === 0) {
        return 0;
    }
    // clock or counterclock wise
    // 1 for clockwise, 2 for counterclockwise
    return val > 0 ? 1 : 2;
}

// function to check if point q lies on line segment 'pr'
function onSegment(p, q, r) {
    return (
        q.lat <= Math.max(p.lat, r.lat) &&
        q.lat >= Math.min(p.lat, r.lat) &&
        q.lng <= Math.max(p.lng, r.lng) &&
        q.lng >= Math.min(p.lng, r.lng)
    );
}

// function to check if two line segments intersect
function segmentsIntersect(seg1_1, seg1_2, seg2_1, seg2_2) {
    // find the four orientations needed
    // for general and special cases
    const o1 = orientation(seg1_1, seg1_2, seg2_1);
    const o2 = orientation(seg1_1, seg1_2, seg2_2);
    const o3 = orientation(seg2_1, seg2_2, seg1_1);
    const o4 = orientation(seg2_1, seg2_2, seg1_2);
    // general case
    if (o1 !== o2 && o3 !== o4) {
        return true;
    }
    // special cases
    // seg1_1, seg1_2 and seg2_1 are collinear and seg2_1 lies on segment seg1
    if (o1 === 0 && onSegment(seg1_1, seg2_1, seg1_2)) {
        return true;
    }
    // seg1_1, seg1_2 and seg2_2 are collinear and seg2_2 lies on segment seg1
    if (o2 === 0 && onSegment(seg1_1, seg2_2, seg1_2)) {
        return true;
    }
    // seg2_1, seg2_2 and seg1_1 are collinear and seg1_1 lies on segment seg2
    if (o3 === 0 && onSegment(seg2_1, seg1_1, seg2_2)) {
        return true;
    }
    // seg2_1, seg2_2 and seg1_2 are collinear and seg1_2 lies on segment seg2
    if (o4 === 0 && onSegment(seg2_1, seg1_2, seg2_2)) {
        return true;
    }
    return false;
}

function polylineHasSelfIntersections(latlngs) {
    if (latlngs.length < 4) {
        return false;
    }
    for (let i = 0; i <= latlngs.length - 3; i++) {
        const seg1_1 = latlngs[i];
        const seg1_2 = latlngs[i + 1];

        for (let j = i + 2; j <= latlngs.length - 1; j++) {
            if (i === 0 && j === latlngs.length - 1) {
                continue;
            }
            const seg2_1 = latlngs[j];
            const seg2_2 = latlngs[(j + 1) % latlngs.length];

            if (segmentsIntersect(seg1_1, seg1_2, seg2_1, seg2_2)) {
                return true;
            }
        }
    }
    return false;
}

export {polylineHasSelfIntersections};
