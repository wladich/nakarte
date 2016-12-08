import L from 'leaflet';

L.LineUtil.simplifyLatlngs = function simplifyLatlngs(points, tolerance) {
    function latlngToXy(p) {
        return {
            x: p.lng,
            y: p.lat
        };
    }

    function xyToLatlng(p) {
        return {
            lat: p.y,
            lng: p.x
        };
    }

    points = points.map(latlngToXy);
    points = L.LineUtil.simplify(points, tolerance);
    points = points.map(xyToLatlng);
    return points;
};
