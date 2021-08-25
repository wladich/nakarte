import utf8 from 'utf8';
import escapeHtml from 'escape-html';
import {saveNktk} from './parsers/nktk';

function saveGpx(segments, name, points, withElevations = false) {
    const gpx = [];
    const fakeTime = '1970-01-01T00:00:01.000Z';
    const creationTime = new Date().toISOString();

    gpx.push('<?xml version="1.0" encoding="UTF-8" standalone="no" ?>');
    gpx.push(
        '<gpx xmlns="http://www.topografix.com/GPX/1/1" creator="http://nakarte.me" ' +
        'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.topografix.com/GPX/1/1 ' +
        'http://www.topografix.com/GPX/1/1/gpx.xsd" version="1.1">'
    );

    gpx.push('\t<metadata>');
    gpx.push(`\t\t<time>${creationTime}</time>`);
    gpx.push('\t</metadata>');

    points.forEach(function(marker) {
            var label = marker.label;
            label = escapeHtml(label);
            label = utf8.encode(label);
            gpx.push(`\t<wpt lat="${marker.latlng.lat.toFixed(6)}" lon="${marker.latlng.lng.toFixed(6)}">`);
            if (withElevations && marker.latlng.alt !== null) {
                gpx.push(`\t\t<ele>${marker.latlng.alt.toFixed(1)}</ele>`);
            }
            gpx.push(`\t\t<name>${label}</name>`);
            gpx.push('\t</wpt>');
        }
    );
    if (segments.length > 0) {
        name = name || 'Track';
        name = escapeHtml(name);
        name = utf8.encode(name);
        gpx.push('\t<trk>');
        gpx.push('\t\t<name>' + name + '</name>');

        for (let segment of segments) {
            gpx.push('\t\t<trkseg>');
            for (let point of segment) {
                let x = point.lng.toFixed(6);
                let y = point.lat.toFixed(6);
                const elevation = (withElevations && point.alt !== null)
                    ? `<ele>${point.alt.toFixed(1)}</ele>` : '';
                // time element is not necessary, added for compatibility to Garmin Connect only
                gpx.push(`\t\t\t<trkpt lat="${y}" lon="${x}">${elevation}<time>${fakeTime}</time></trkpt>`);
            }
            gpx.push('\t\t</trkseg>');
        }
        gpx.push('\t</trk>');
    }
    gpx.push('</gpx>');
    return gpx.join('\n');
}

function saveGpxWithElevations(segments, name, points) {
    return saveGpx(segments, name, points, true);
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

    for (let [i, segment] of segments.entries()) {
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

export {saveGpx, saveGpxWithElevations, saveKml, saveNktk as saveToString};

