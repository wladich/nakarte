import JSUnzip from 'vendored/github.com/augustl/js-unzip/js-unzip';
import RawDeflate from 'vendored/github.com/dankogai/js-deflate/rawinflate';

import {decode as utf8_decode} from 'utf8';

function xmlGetNodeText(node) {
    if (node) {
        return Array.prototype.slice.call(node.childNodes)
            .map(function(node) {
                    return node.nodeValue;
                }
            )
            .join('');
    }
}


function parseGpx(txt, name) {
    var error;

    function getSegmentPoints(segment_element) {
        var points_elements = segment_element.getElementsByTagName('trkpt');
        var points = [];
        for (var i = 0; i < points_elements.length; i++) {
            var point_element = points_elements[i];
            var lat = parseFloat(point_element.getAttribute('lat'));
            var lng = parseFloat(point_element.getAttribute('lon'));
            if (isNaN(lat) || isNaN(lng)) {
                error = 'CORRUPT';
                break;
            }
            points.push({lat: lat, lng: lng});
        }
        return points;
    }

    var getTrackSegments = function(xml) {
        var segments = [];
        var segments_elements = xml.getElementsByTagName('trkseg');
        for (var i = 0; i < segments_elements.length; i++) {
            var segment_points = getSegmentPoints(segments_elements[i]);
            if (segment_points.length) {
                segments.push(segment_points);
            }
        }
        return segments;
    };

    var getWaypoints = function(xml) {
        var waypoint_elements = xml.getElementsByTagName('wpt');
        var waypoints = [];
        for (var i = 0; i < waypoint_elements.length; i++) {
            var waypoint_element = waypoint_elements[i];
            var waypoint = {};
            waypoint.lat = parseFloat(waypoint_element.getAttribute('lat'));
            waypoint.lng = parseFloat(waypoint_element.getAttribute('lon'));
            if (isNaN(waypoint.lat) || isNaN(waypoint.lng)) {
                error = 'CORRUPT';
                continue;
            }
            waypoint.name = utf8_decode(xmlGetNodeText(waypoint_element.getElementsByTagName('name')[0]));
            waypoint.symbol_name = xmlGetNodeText(waypoint_element.getElementsByTagName('sym')[0]);
            waypoints.push(waypoint);
        }
        return waypoints;
    };

    // remove namespaces
    txt = txt.replace(/<([^ >]+):([^ >]+)/g, '<$1_$2');
    var dom = (new DOMParser()).parseFromString(txt, "text/xml");
    if (dom.documentElement.nodeName === 'parsererror') {
        return null;
    }
    if (dom.getElementsByTagName('gpx').length === 0) {
        return null;
    }
    return [{
        name: name,
        tracks: getTrackSegments(dom),
        points: getWaypoints(dom),
        error: error
    }];
}


function parseOziPlt(txt, name) {
    var error;
    var segments = [];
    var lines = txt.split('\n');
    if (lines[0].indexOf('OziExplorer Track Point File') !== 0) {
        return null;
    }
    var expected_points_num = parseInt(lines[5], 10);
    var current_segment = [];
    var total_points_num = 0;
    for (var i = 6; i < lines.length; i++) {
        var line = lines[i].trim();
        if (!line) {
            continue;
        }
        var fields = line.split(',');
        var lat = parseFloat(fields[0]);
        var lon = parseFloat(fields[1]);
        var is_start_of_segment = parseInt(fields[2], 10);
        if (isNaN(lat) || isNaN(lon) || isNaN(is_start_of_segment)) {
            error = 'CORRUPT';
            break;
        }
        if (is_start_of_segment) {
            current_segment = [];
        }
        if (!current_segment.length) {
            segments.push(current_segment);
        }
        current_segment.push({lat: lat, lng: lon});
        total_points_num += 1;
    }
    if (isNaN(expected_points_num) || expected_points_num !== total_points_num) {
        error = 'CORRUPT';
    }
    return [{name: name, tracks: segments, error: error}];
}

function decodeCP1251(s) {
    var c, i, s2 = [];
    for (i = 0; i < s.length; i++) {
        c = s.charCodeAt(i);
        if (c >= 192 && c <= 255) {
            c += (0x410 - 192);
        } else if (c === 168) {
            c = 0x0401;
        } else if (c === 184) {
            c = 0x0451;
        }
        s2.push(String.fromCharCode(c));
    }
    return s2.join('');
}

function parseOziWpt(txt, name) {
    var points = [],
        error,
        lines, line,
        i,
        lat, lng, pointName, fields;
    lines = txt.split('\n');
    if (lines[0].indexOf('OziExplorer Waypoint File') !== 0) {
        return null;
    }
    for (i = 4; i < lines.length; i++) {
        line = lines[i].trim();
        if (!line) {
            continue;
        }
        fields = line.split(',');
        lat = parseFloat(fields[2]);
        lng = parseFloat(fields[3]);
        pointName = decodeCP1251(fields[1]).trim();
        if (isNaN(lat) || isNaN(lng)) {
            error = 'CORRUPT';
            break;
        }
        points.push({
                lat: lat,
                lng: lng,
                name: pointName
            }
        );
    }
    return [{name: name, points: points, error: error}];
}

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
            name = utf8_decode(xmlGetNodeText(name[0]).trim());
            points.push({
                    name: name,
                    lat: lat,
                    lng: lng
                }
            );
        }
        return points;
    }

    txt = txt.replace(/<([^ >]+):([^ >]+)/g, '<$1_$2');
    var dom = (new DOMParser()).parseFromString(txt, "text/xml");
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
    var unzipper = new JSUnzip(txt);
    var tracks = [],
        points = [],
        geodata,
        error;
    var hasDocKml = false;
    if (!unzipper.isZipFile()) {
        return null;
    }
    unzipper.readEntries();
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
                uncompressed = window.RawDeflate.inflate(entry.data);
            } else {
                return null;
            }
            geodata = parseKml(uncompressed, 'dummmy');
            if (geodata) {
                error = error || geodata.error;
                tracks.push.apply(tracks, geodata[0].tracks);
                points.push.apply(points, geodata[0].points);
            }
        }
    }

    geodata = [{name: name, error: error, tracks: tracks, points: points}];
    return geodata;
}

function parseYandexRulerString(s) {
    var last_lat = 0;
    var last_lng = 0;
    var error;
    var points = [];
    s = s.replace(/%2C/ig, ',');
    var points_str = s.split('~');
    for (var i = 0; i < points_str.length; i++) {
        var point = points_str[i].split(',');
        var lng = parseFloat(point[0]);
        var lat = parseFloat(point[1]);
        if (isNaN(lat) || isNaN(lng)) {
            error = 'CORRUPT';
            break;
        }
        last_lng += lng;
        last_lat += lat;
        points.push({lat: last_lat, lng: last_lng});
    }
    return {error: error, points: points};
}


function parseYandexRulerUrl(s) {
    var re = /yandex\..+[?&]rl=([^&]+)/;
    var m = re.exec(s);
    if (!m) {
        return null;
    }
    var res = parseYandexRulerString(m[1]);
    return [{name: 'Yandex ruler', error: res.error, tracks: [res.points]}];
}


function parseZip(txt, name) {
    var unzipper = new JSUnzip(txt);
    if (!unzipper.isZipFile()) {
        return null;
    }
    unzipper.readEntries();
    var geodata_array = [];
    for (var i = 0; i < unzipper.entries.length; i++) {
        var entry = unzipper.entries[i];
        var uncompressed;
        if (entry.compressionMethod === 0) {
            uncompressed = entry.data;
        } else if (entry.compressionMethod === 8) {
            uncompressed = RawDeflate.inflate(entry.data);
        } else {
            return null;
        }
        var file_name = name + '/' + entry.fileName;
        var geodata = parseGeoFile(file_name, uncompressed);
        geodata_array.push.apply(geodata_array, geodata);
    }
    return geodata_array;
}

// function parseYandexMap(txt) {
//     var start_tag = '<script id="vpage" type="application/json">';
//     var json_start = txt.indexOf(start_tag);
//     if (json_start === -1) {
//         return null;
//     }
//     json_start += start_tag.length;
//     var json_end = txt.indexOf('</script>', json_start);
//     if (json_end === -1) {
//         return null;
//     }
//     var map_data = txt.substring(json_start, json_end);
//     map_data = JSON.parse(map_data);
//     console.log(map_data);
//     if (!('request' in map_data)) {
//         return null;
//     }
//     var name = 'YandexMap';
//     var segments = [];
//     var error;
//     if (map_data.vpage && map_data.vpage.data && map_data.vpage.data.objects && map_data.vpage.data.objects.length) {
//         var mapName = ('' + (map_data.vpage.data.name || '')).trim();
//         if (mapName.length > 3) {
//             name = '';
//         } else if (mapName.length) {
//             name += ': ';
//         }
//         name += fileutils.decodeUTF8(mapName);
//         map_data.vpage.data.objects.forEach(function(obj){
//             if (obj.pts && obj.pts.length) {
//                 var segment = [];
//                 for (var i=0; i< obj.pts.length; i++) {
//                     var pt = obj.pts[i];
//                     var lng = parseFloat(pt[0]);
//                     var lat = parseFloat(pt[1]);
//                     if (isNaN(lat) || isNaN(lng)) {
//                         error = 'CORRUPT';
//                         break;
//                     }
//                     segment.push({lat: lat, lng:lng});
//                 }
//                 if (segment.length) {
//                     segments.push(segment);
//                 }
//             }
//         });
//     }
//     if (map_data.request.args && map_data.request.args.rl) {
//         var res = parseYandexRulerString(map_data.request.args.rl);
//         error = error || res.error;
//         if (res.points && res.points.length) {
//             segments.push(res.points);
//         }
//     }
//     return [{name: name, error: error, tracks: segments}];
// }

function decodeUrlSafeBase64(s) {
    var decoded;
    s = s
        .replace(/[\n\r \t]/g, '')
        .replace(/-/g, '+')
        .replace(/_/g, '/');
    try {
        decoded = atob(s);
    } catch (e) {
    }
    if (decoded && decoded.length) {
        return decoded;
    }
    return null;
}

function unpackNumber(s, position) {
    var x,
        n = 0;
    x = s.charCodeAt(position);
    if (isNaN(x)) {
        throw new Error('Unexpected end of line while unpacking number');
    }
    if (x < 128) {
        n = x - 64;
        return [n, 1];
    }
    n = x & 0x7f;
    x = s.charCodeAt(position + 1);
    if (isNaN(x)) {
        throw new Error('Unexpected end of line while unpacking number');
    }
    if (x < 128) {
        n |= x << 7;
        n -= 8192;
        return [n, 2];
    }
    n |= (x & 0x7f) << 7;
    x = s.charCodeAt(position + 2);
    if (isNaN(x)) {
        throw new Error('Unexpected end of line while unpacking number');
    }
    if (x < 128) {
        n |= x << 14;
        n -= 1048576;
        return [n, 3];
    }
    n |= (x & 0x7f) << 14;
    x = s.charCodeAt(position + 3);
    if (isNaN(x)) {
        throw new Error('Unexpected end of line while unpacking number');
    }
    n |= x << 21;
    n -= 268435456;
    return [n, 4];
}

function PackedStreamReader(s) {
    this._string = s;
    this.position = 0;
}

PackedStreamReader.prototype.readNumber = function() {
    var n = unpackNumber(this._string, this.position);
    this.position += n[1];
    return n[0];
};

PackedStreamReader.prototype.readString = function(size) {
    var s = this._string.slice(this.position, this.position + size);
    this.position += size;
    return s;
};

function parseStringified(s, oldVersion) {
    var name,
        n,
        segments = [],
        segment,
        segmentsCount,
        pointsCount,
        arcUnit = ((1 << 24) - 1) / 360,
        x, y,
        error, version, midX, midY, /*symbol,*/ waypointName,
        wayPoints = [], color, measureTicksShown;
    s = decodeUrlSafeBase64(s);
    if (!s) {
        return [{name: 'Text encoded track', error: ['CORRUPT']}];
    }
    s = new PackedStreamReader(s);
    try {
        if (oldVersion) {
            version = 0;
        } else {
            version = s.readNumber();
        }
        if (version !== 0 && version !== 1 && version !== 2) {
            return [{name: 'Text encoded track', error: ['CORRUPT']}];
        }
        n = s.readNumber();
        name = s.readString(n);
        name = utf8_decode(name);
        segmentsCount = s.readNumber();
        for (; segmentsCount--;) {
            segment = [];
            pointsCount = s.readNumber();
            x = 0;
            y = 0;
            for (; pointsCount--;) {
                x += s.readNumber();
                y += s.readNumber();
                segment.push({lng: x / arcUnit, lat: y / arcUnit});
            }
            segments.push(segment);
            segment = null;
        }
    } catch (e) {
        if (e.message.match('Unexpected end of line while unpacking number')) {
            error = ['CORRUPT'];
            if (segment) {
                segments.push(segment);
            }
        } else {
            throw e;
        }
    }
    try {
        color = s.readNumber();
        measureTicksShown = s.readNumber();
    } catch (e) {
        if (version === 0 && e.message.match('Unexpected end of line while unpacking number')) {
            color = 0;
            measureTicksShown = 0;
        } else {
            throw e;
        }
    }
    if (version === 2) {
        try {
            pointsCount = s.readNumber();
            if (pointsCount) {
                midX = s.readNumber();
                midY = s.readNumber();
            }
            for (; pointsCount--;) {
                n = s.readNumber();
                waypointName = s.readString(n);
                waypointName = utf8_decode(waypointName);
                // symbol = s.readNumber();
                x = s.readNumber() + midX;
                y = s.readNumber() + midY;
                wayPoints.push({
                        name: waypointName,
                        lat: y / arcUnit,
                        lng: x / arcUnit,

                    }
                );
            }
        } catch (e) {
            if (e.message.match('Unexpected end of line while unpacking number')) {
                error = ['CORRUPT'];
            } else {
                throw e;
            }
        }
    }
    var geoData = {
        name: name || "Text encoded track",
        tracks: segments,
        error: error,
        points: wayPoints,
        color: color,
        measureTicksShown: measureTicksShown
    };
    return [geoData];
}

function parseTrackUrl(s) {
    var i = s.indexOf('track://');
    if (i === -1) {
        return null;
    }
    return parseStringified(s.substring(i + 8), true);
}

function parseNakarteUrl(s) {
    var i = s.indexOf('#');
    if (i === -1) {
        return null;
    }
    i = s.indexOf('nktk=', i + 1);
    if (i === -1) {
        return null;
    }
    s = s.substring(i + 5).split('/');
    var geodataArray = [];
    for (i = 0; i < s.length; i++) {
        if (s[i]) {
            geodataArray.push.apply(geodataArray, parseStringified(s[i]));
        }
    }
    return geodataArray;
}

function parseGeoFile(name, data) {
    var parsers = [
        parseTrackUrl,
        parseNakarteUrl,
        parseKmz,
        parseZip,
        parseGpx,
        parseOziPlt,
        parseOziWpt,
        parseKml,
        parseYandexRulerUrl,
//            parseYandexMap
    ];
    for (var i = 0; i < parsers.length; i++) {
        var parsed = parsers[i](data, name);
        if (parsed !== null) {
            return parsed;
        }
    }
    return [{name: name, error: 'UNSUPPORTED'}];
}

export {parseGeoFile};
