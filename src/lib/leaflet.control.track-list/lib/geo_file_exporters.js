import utf8 from 'utf8';
import escapeHtml from 'escape-html';
import {saveNktk} from './nktk';

function saveGpx(segments, name, points) {
    var gpx = [],
        x, y,
        time = '1970-01-01T00:00:01.000Z';

    gpx.push('<?xml version="1.0" encoding="UTF-8" standalone="no" ?>');
    gpx.push(
        '<gpx xmlns="http://www.topografix.com/GPX/1/1" creator="http://nakarte.tk" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd" version="1.1">'
    );
    points.forEach(function(marker) {
            var label = marker.label;
            label = escapeHtml(label);
            label = utf8.encode(label);
            gpx.push('\t<wpt lat="' + marker.latlng.lat.toFixed(6) + '" lon="' + marker.latlng.lng.toFixed(6) + '">');
            gpx.push('\t\t<name>' + label + '</name>');
            gpx.push('\t</wpt>');
        }
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
                            //time element is not necessary, added for compatibility to Garmin Connect only
                            gpx.push('\t\t\t<trkpt lat="' + y + '" lon="' + x + '"><time>' + time + '</time></trkpt>');
                        }
                    );
                    gpx.push('\t\t</trkseg>');
                }
            }
        );
        gpx.push('\t</trk>');
    }
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
    kml.push('<kml xmlns="http://www.opengis.net/kml/2.2">');
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

export default {saveGpx, saveKml, saveToString: saveNktk};

