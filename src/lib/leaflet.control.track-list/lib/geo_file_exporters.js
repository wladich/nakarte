import L from 'leaflet';
import utf8 from 'utf8';
import escapeHtml from 'escape-html';
import {saveNktk} from './parsers/nktk';

function getSegmentLatForLng(latLng1, latLng2, lng) {
    const deltaLat = latLng2.lat - latLng1.lat;
    const deltaLng = latLng2.lng - latLng1.lng;
    return latLng1.lat + deltaLat / deltaLng * (lng - latLng1.lng);
}

function splitLineAt180Meridian(latLngs) {
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
            let splitLat = getSegmentLatForLng(
                L.latLng(prevLatLng.lat, positivePrevLng),
                L.latLng(latLng.lat, positiveLng),
                splitLng
            );
            let splitPrevLat = getSegmentLatForLng(
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

function normalizeLines(lines) {
    return (lines || [])
        .map((segment) => splitLineAt180Meridian(segment))
        .reduce((acc, cur) => {
            acc.push(...cur);
            return acc;
        }, []);
}

function saveGpx(segments, name, points) {
    const gpx = [];
    const fakeTime = '1970-01-01T00:00:01.000Z';

    gpx.push('<?xml version="1.0" encoding="UTF-8" standalone="no" ?>');
    gpx.push(
        '<gpx xmlns="http://www.topografix.com/GPX/1/1" creator="http://nakarte.me" ' +
        'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.topografix.com/GPX/1/1 ' +
        'http://www.topografix.com/GPX/1/1/gpx.xsd" version="1.1">'
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
        name = name || 'Track';
        name = escapeHtml(name);
        name = utf8.encode(name);
        gpx.push('\t<trk>');
        gpx.push('\t\t<name>' + name + '</name>');

        for (let segment of normalizedSegments) {
            gpx.push('\t\t<trkseg>');
            for (let point of segment) {
                let x = point.lng.toFixed(6);
                let y = point.lat.toFixed(6);
                //time element is not necessary, added for compatibility to Garmin Connect only
                gpx.push(`\t\t\t<trkpt lat="${y}" lon="${x}"><time>${fakeTime}</time></trkpt>`);
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

    name = name || 'Track';
    name = escapeHtml(name);
    name = utf8.encode(name);

    kml.push('<?xml version="1.0" encoding="UTF-8"?>');
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
            let x = point.lng.toFixed(6);
            let y = point.lat.toFixed(6);
            kml.push(`\t\t\t\t\t${x},${y}`);
        }

        kml.push('\t\t\t\t</coordinates>');
        kml.push('\t\t\t</LineString>');
        kml.push('\t\t</Placemark>');
    }

    points.forEach(function(marker) {
            var label = marker.label;
            label = escapeHtml(label);
            label = utf8.encode(label);
            var coordinates = marker.latlng.lng.toFixed(6) + ',' + marker.latlng.lat.toFixed(6) + ',0';

            kml.push('\t\t<Placemark>');
            kml.push('\t\t\t<name>' + label + '</name>');
            kml.push('\t\t\t<Point>');
            kml.push('\t\t\t\t<coordinates>' + coordinates + '</coordinates>');
            kml.push('\t\t\t</Point>');
            kml.push('\t\t</Placemark>');
        }
    );

    kml.push('\t</Document>');
    kml.push('\t</kml>');

    return kml.join('\n');
}

export default {saveGpx, saveKml, saveToString: saveNktk};

