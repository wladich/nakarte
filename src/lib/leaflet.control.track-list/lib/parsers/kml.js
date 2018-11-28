import {decode as utf8_decode} from 'utf8';
import {xmlGetNodeText} from './xmlUtils';
import stripBom from 'lib/stripBom';
import JSUnzip from 'vendored/github.com/augustl/js-unzip/js-unzip';
import jsInflate from './jsInflate';

function parseKml(txt, name) {
    var error;
    var getSegmentPoints = function(coordinates_element) {
        // convert multiline text value of tag to single line
        var coordinates_string = xmlGetNodeText(coordinates_element);
        var points_strings = coordinates_string.split(/\s+/);
        var points = [];
        for (var i = 0; i < points_strings.length; i++) {
            if (points_strings[i].length) {
                var point = points_strings[i].split(',');
                var lat = parseFloat(point[1]);
                var lng = parseFloat(point[0]);
                if (isNaN(lat) || isNaN(lng)) {
                    error = 'CORRUPT';
                    break;
                }
                points.push({lat: lat, lng: lng});
            }
        }
        return points;
    };

    var getTrackSegments = function(xml) {
        var segments_elements = xml.getElementsByTagName('LineString');
        var segments = [];
        for (var i = 0; i < segments_elements.length; i++) {
            var coordinates_element = segments_elements[i].getElementsByTagName('coordinates');
            if (coordinates_element.length) {
                var segment_points = getSegmentPoints(coordinates_element[0]);
                if (segment_points.length) {
                    segments.push(segment_points);
                }
            }
        }
        return segments;
    };

    function getPoints(dom) {
        var points = [],
            placemarks, i, coord, name, lat, lng, pointObjs;
        placemarks = dom.getElementsByTagName('Placemark');
        for (i = 0; i < placemarks.length; i++) {
            pointObjs = placemarks[i].getElementsByTagName('Point');
            if (pointObjs.length === 0) {
                continue
            } else if (pointObjs.length > 1) {
                error = 'CORRUPT';
                break;
            }
            coord = pointObjs[0].getElementsByTagName('coordinates');
            if (coord.length !== 1) {
                error = 'CORRUPT';
                break;
            }
            coord = xmlGetNodeText(coord[0]);
            coord = coord.split(',');
            lat = parseFloat(coord[1]);
            lng = parseFloat(coord[0]);
            if (isNaN(lat) || isNaN(lng)) {
                error = 'CORRUPT';
                break;
            }
            name = placemarks[i].getElementsByTagName('name');
            if (name.length !== 1) {
                error = 'CORRUPT';
                break;
            }
            try {
                name = utf8_decode(xmlGetNodeText(name[0])).trim();
            } catch (e) {
                error = 'CORRUPT';
                break;
            }
            points.push({
                    name: name,
                    lat: lat,
                    lng: lng
                }
            );
        }
        return points;
    }

    txt = stripBom(txt);
    txt = txt.replace(/<([^ >]+):([^ >]+)/g, '<$1_$2');
    try {
        var dom = (new DOMParser()).parseFromString(txt, "text/xml");
    } catch (e) {
        return null;
    }
    if (dom.documentElement.nodeName === 'parsererror') {
        return null;
    }
    if (dom.getElementsByTagName('kml').length === 0) {
        return null;
    }

    return [{name: name, tracks: getTrackSegments(dom), points: getPoints(dom), error: error}];
}

function parseKmz(txt, name) {
    var uncompressed;
    try {
        var unzipper = new JSUnzip(txt);
    } catch (e) {
        return null;
    }
    var tracks = [],
        points = [],
        geodata,
        error;
    var hasDocKml = false;
    if (!unzipper.isZipFile()) {
        return null;
    }
    try {
        unzipper.readEntries();
    } catch (e) {
        return null;
    }
    var i, entry;
    for (i = 0; i < unzipper.entries.length; i++) {
        entry = unzipper.entries[i];
        if (entry.fileName === 'doc.kml') {
            hasDocKml = true;
            break;
        }
    }
    if (!hasDocKml) {
        return null;
    }

    for (i = 0; i < unzipper.entries.length; i++) {
        entry = unzipper.entries[i];
        if (entry.fileName.match(/\.kml$/i)) {
            if (entry.compressionMethod === 0) {
                uncompressed = entry.data;
            } else if (entry.compressionMethod === 8) {
                uncompressed = jsInflate(entry.data, entry.uncompressedSize);
            } else {
                return null;
            }
            geodata = parseKml(uncompressed, 'dummmy');
            if (geodata) {
                error = error || geodata[0].error;
                tracks.push.apply(tracks, geodata[0].tracks);
                points.push.apply(points, geodata[0].points);
            }
        }
    }

    geodata = [{name: name, error: error, tracks: tracks, points: points}];
    return geodata;
}

export {parseKml, parseKmz}