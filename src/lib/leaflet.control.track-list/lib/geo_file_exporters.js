import utf8 from 'utf8';
import escapeHtml from 'escape-html';
import {saveNktk} from './nktk';

function saveGpx(segments, name, points) {
    var gpx = [],
        x, y;

    gpx.push('<?xml version="1.0" encoding="UTF-8" standalone="no" ?>');
    gpx.push(
        '<gpx xmlns="http://www.topografix.com/GPX/1/1" creator="http://nakarte.tk" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">'
    );
    if (segments.length) {
        name = name || 'Track';
        name = escapeHtml(name);
        name = utf8.encode(name);
        gpx.push('\t<trk>');
        gpx.push('\t\t<name>' + name + '</name>');

        segments.forEach(function(points) {
                if (points.length > 1) {
                    gpx.push('\t\t<trkseg>');
                    points.forEach(function(p) {
                            x = p.lng.toFixed(6);
                            y = p.lat.toFixed(6);
                            gpx.push('\t\t\t<trkpt lat="' + y + '" lon="' + x + '"></trkpt>');
                        }
                    );
                    gpx.push('\t\t</trkseg>');
                }
            }
        );
        gpx.push('\t</trk>');
    }
    points.forEach(function(marker) {
            var label = marker.label;
            label = escapeHtml(label);
            label = utf8.encode(label);
            gpx.push('\t<wpt lat="' + marker.latlng.lat.toFixed(6) + '" lon="' + marker.latlng.lng.toFixed(6) + '">');
            gpx.push('\t\t<name>' + label + '</name>');
            gpx.push('\t</wpt>');
        }
    );
    gpx.push('</gpx>');
    gpx = gpx.join('\n');
    return gpx;
}


function saveKml(segments, name, points) {
    var kml = [],
        x, y;

    name = name || 'Track';
    name = escapeHtml(name);
    name = utf8.encode(name);

    kml.push('<?xml version="1.0" encoding="UTF-8"?>');
    kml.push('<kml xmlns="http://earth.google.com/kml/2.2">');
    kml.push('\t<Document>');
    kml.push('\t\t<name>' + name + '</name>');

    segments.forEach(function(points, i) {
            if (points.length > 1) {
                kml.push('\t\t<Placemark>',
                    '\t\t\t<name>Line ' + (i + 1) + '</name>',
                    '\t\t\t<LineString>',
                    '\t\t\t\t<tessellate>1</tessellate>',
                    '\t\t\t\t<coordinates>'
                );
                points.forEach(function(p) {
                        x = p.lng.toFixed(6);
                        y = p.lat.toFixed(6);
                        kml.push('\t\t\t\t\t' + x + ',' + y);
                    }
                );
                kml.push('\t\t\t\t</coordinates>',
                    '\t\t\t</LineString>',
                    '\t\t</Placemark>'
                );
            }
        }
    );
    points.forEach(function(marker) {
            var label = marker.label;
            label = escapeHtml(label);
            label = utf8.encode(label);
            var coordinates = marker.latlng.lng.toFixed(6) + ',' + marker.latlng.lat.toFixed(6) + ',0'

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

    kml = kml.join('\n');
    return kml;
}

function packNumber(n) {
    var bytes = [];
    if (n >= -64 && n <= 63) {
        n += 64;
        bytes.push(n);
    } else if (n >= -8192 && n <= 8191) {
        n += 8192;
        bytes.push((n & 0x7f) | 0x80);
        bytes.push(n >> 7);
        /*        } else if (n >= -2097152 && n <= 2097151) {
         n += 2097152;
         bytes.push((n & 0x7f) | 0x80);
         bytes.push(((n >> 7) & 0x7f) | 0x80);
         bytes.push(n >> 14);
         */
    } else if (n >= -1048576 && n <= 1048575) {
        n += 1048576;
        bytes.push((n & 0x7f) | 0x80);
        bytes.push(((n >> 7) & 0x7f) | 0x80);
        bytes.push(n >> 14);
    } else if (n >= -268435456 && n <= 268435455) {
        n += 268435456;
        bytes.push((n & 0x7f) | 0x80);
        bytes.push(((n >> 7) & 0x7f) | 0x80);
        bytes.push(((n >> 14) & 0x7f) | 0x80);
        bytes.push(n >> 21);
    } else {
        throw new Error('Number ' + n + ' too big to pack in 29 bits');
    }
    return String.fromCharCode.apply(null, bytes);
}


function encodeUrlSafeBase64(s) {
    return (btoa(s)
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '')
    );
}

function saveToString(segments, name, color, measureTicksShown, wayPoints, trackHidden) {
    var stringified = [];
    stringified.push(packNumber(3)); // version
    name = utf8.encode(name);
    stringified.push(packNumber(name.length));
    stringified.push(name);

    var arcUnit = ((1 << 24) - 1) / 360;
    segments = segments.filter(function(segment) {
            return segment.length > 1;
        }
    );

    stringified.push(packNumber(segments.length));
    segments.forEach(function(points) {
            var lastX = 0,
                lastY = 0,
                x, y,
                deltaX, deltaY,
                p;
            stringified.push(packNumber(points.length));
            for (var i = 0, len = points.length; i < len; i++) {
                p = points[i];
                x = Math.round(p.lng * arcUnit);
                y = Math.round(p.lat * arcUnit);
                deltaX = x - lastX;
                deltaY = y - lastY;
                stringified.push(packNumber(deltaX));
                stringified.push(packNumber(deltaY));
                lastX = x;
                lastY = y;
            }
        }
    );
    stringified.push(packNumber(+color || 0));
    stringified.push(packNumber(measureTicksShown ? 1 : 0));
    stringified.push(packNumber(trackHidden ? 1 : 0));

    stringified.push(packNumber(wayPoints.length));
    if (wayPoints.length) {
        var midX = 0, midY = 0;
        wayPoints.forEach(function(p) {
                midX += p.latlng.lng;
                midY += p.latlng.lat;
            }
        );
        midX = Math.round(midX * arcUnit / wayPoints.length);
        midY = Math.round(midY * arcUnit / wayPoints.length);
        stringified.push(packNumber(midX));
        stringified.push(packNumber(midY));
        wayPoints.forEach(function(p) {
                var deltaX = Math.round(p.latlng.lng * arcUnit) - midX,
                    deltaY = Math.round(p.latlng.lat * arcUnit) - midY,
                    symbol = 1,
                    name = utf8.encode(p.label);
                stringified.push(packNumber(name.length));
                stringified.push(name);
                stringified.push(packNumber(symbol));
                stringified.push(packNumber(deltaX));
                stringified.push(packNumber(deltaY));
            }
        );
    }

    return encodeUrlSafeBase64(stringified.join(''));
}

export default {saveGpx, saveKml, saveToString: saveNktk};

