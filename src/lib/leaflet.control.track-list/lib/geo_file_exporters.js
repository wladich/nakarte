import L from 'leaflet';
import utf8 from 'utf8';
import escapeHtml from 'escape-html';
import {saveNktk} from './parsers/nktk';
import config from '~/config';
import {fetch} from '~/lib/xhr-promise';

const elevationCache = {};

function getSegmentLatForLng(latLng1, latLng2, lng) {
    const deltaLat = latLng2.lat - latLng1.lat;
    const deltaLng = latLng2.lng - latLng1.lng;
    return latLng1.lat + deltaLat / deltaLng * (lng - latLng1.lng);
}

function splitLineAt180Meridian(latLngs) {
    const wrappedLatLngs = latLngs.map(ll => ll.wrap());
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
            let splitLat = getSegmentLatForLng(L.latLng(prevLatLng.lat, positivePrevLng),
                L.latLng(latLng.lat, positiveLng), splitLng);
            let splitPrevLat = getSegmentLatForLng(L.latLng(prevLatLng.lat, positivePrevLng),
                L.latLng(latLng.lat, positiveLng), splitPrevLng);
            newLine.push(L.latLng(splitPrevLat, splitPrevLng).wrap());
            newLine = [L.latLng(splitLat, splitLng).wrap(), latLng];
            newLines.push(newLine);
        }
    }
    return newLines;
}

function normalizeLines(lines) {
    return (lines || [])
        .map((segment) => splitLineAt180Meridian(segment))
        .reduce((acc, cur) => {
            acc.push(...cur);
            return acc;
        }, []);
}

async function getElevationData(segments, points) {
    function addPoint(lat, lon) {
        const key = `${lat} ${lon}`;
        const point = elevationCache[key];

        if (!point) {
            elevationCache[key] = null;
        }
    }

    const normalizedSegments = normalizeLines(segments);
    for (let segment of normalizedSegments) {
        for (let point of segment) {
            addPoint(point.lat.toFixed(6), point.lng.toFixed(6));
        }
    }

    points.forEach((marker) => {
        addPoint(marker.latlng.lat.toFixed(6), marker.latlng.lng.toFixed(6));
    });

    let keys = Object.keys(elevationCache);
    const pointsToSearch = keys.filter(latlon => elevationCache[latlon] === null);

    if (!pointsToSearch.length) {
        return elevationCache;
    }

    const req = pointsToSearch.join('\n');
    const res = await fetch(config.elevationsServer, {method: 'POST', data: req});

    const elevationsArray = res.responseText.split('\n');

    elevationsArray.forEach((elevation, idx) => {
        const latlon = pointsToSearch[idx];
        elevationCache[latlon] = parseInt(elevation, 10);
    });

    return elevationCache;
}

async function saveGpxWithElevation(segments, name, points) {
    let elevations = await getElevationData(segments, points);

    return saveGpx(segments, name, points, elevations);
}

function saveGpx(segments, name, points, elevations) {
    const gpx = [];
    const fakeTime = '1970-01-01T00:00:01.000Z';

    function getElevation(lat, lon) {
        return elevations && elevations[`${lat} ${lon}`];
    }

    gpx.push('<?xml version="1.0" encoding="utf-8" standalone="no"?>');
    gpx.push(
        '<gpx version="1.1" creator="http://nakarte.me" ' +
        'xmlns="http://www.topografix.com/GPX/1/1" ' +
        'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" ' +
        'xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">'
    );
    points.forEach(function(marker) {
            var label = marker.label;
            label = escapeHtml(label);
            label = utf8.encode(label);
            gpx.push(`\t<wpt lat="${marker.latlng.lat.toFixed(6)}" lon="${marker.latlng.lng.toFixed(6)}">`);
            gpx.push(`\t\t<name>${label}</name>`);
            gpx.push('\t</wpt>');
        }
    );
    const normalizedSegments = normalizeLines(segments);
    if (normalizedSegments.length > 0) {
        name = utf8.encode(escapeHtml(name || 'Track'));
        gpx.push('\t<trk>');
        gpx.push(`\t\t<name>${name}</name>`);

        for (let segment of normalizedSegments) {
            gpx.push('\t\t<trkseg>');
            for (let point of segment) {
                const lat = point.lat.toFixed(6);
                const lon = point.lng.toFixed(6);
                const ele = getElevation(lat, lon);
                //time element is not necessary, added for compatibility to Garmin Connect only
                const timeElement = `\n\t\t\t\t<time>${fakeTime}</time>\n\t\t\t`;
                let eleElement = '';
                if (typeof ele !== 'undefined') {
                    eleElement = `\t<ele>${ele}</ele>\n\t\t\t`;
                }
                gpx.push(`\t\t\t<trkpt lat="${lat}" lon="${lon}">${timeElement}${eleElement}</trkpt>`);
            }
            gpx.push('\t\t</trkseg>');
        }
        gpx.push('\t</trk>');
    }
    gpx.push('</gpx>');
    return gpx.join('\n');
}

function saveKml(segments, name, points) {
    const kml = [];
    name = utf8.encode(escapeHtml(name || 'Track'));

    kml.push('<?xml version="1.0" encoding="utf-8"?>');
    kml.push('<kml xmlns="http://www.opengis.net/kml/2.2">');
    kml.push('\t<Document>');
    kml.push(`\t\t<name>${name}</name>`);

    const normalizedSegments = normalizeLines(segments);
    for (let [i, segment] of normalizedSegments.entries()) {
        kml.push('\t\t<Placemark>');
        kml.push(`\t\t\t<name>Line ${(i + 1)}</name>`);
        kml.push('\t\t\t<LineString>');
        kml.push('\t\t\t\t<tessellate>1</tessellate>');
        kml.push('\t\t\t\t<coordinates>');

        for (let point of segment) {
            const x = point.lng.toFixed(6);
            const y = point.lat.toFixed(6);
            kml.push(`\t\t\t\t\t${x},${y}`);
        }

        kml.push('\t\t\t\t</coordinates>');
        kml.push('\t\t\t</LineString>');
        kml.push('\t\t</Placemark>');
    }

    points.forEach((marker) => {
        const label = utf8.encode(escapeHtml(marker.label));
        const coordinates = marker.latlng.lng.toFixed(6) + ',' + marker.latlng.lat.toFixed(6) + ',0';

        kml.push('\t\t<Placemark>');
        kml.push('\t\t\t<name>' + label + '</name>');
        kml.push('\t\t\t<Point>');
        kml.push('\t\t\t\t<coordinates>' + coordinates + '</coordinates>');
        kml.push('\t\t\t</Point>');
        kml.push('\t\t</Placemark>');
    });

    kml.push('\t</Document>');
    kml.push('\t</kml>');

    return kml.join('\n');
}

export default {saveGpx, saveGpxWithElevation, saveKml, saveToString: saveNktk};
