import JSUnzip from 'vendored/github.com/augustl/js-unzip/js-unzip';
import RawDeflate from 'vendored/github.com/dankogai/js-deflate/rawinflate';
import stripBom from 'lib/stripBom';

import {decode as utf8_decode} from 'utf8';
import {fetch} from 'lib/xhr-promise';
import urlViaCorsProxy from 'lib/CORSProxy';
import {isGpsiesUrl, gpsiesXhrOptions, gpsiesParser} from './gpsies';
import {isStravaUrl, stravaXhrOptions, stravaParser} from './strava';
import {isEndomondoUrl, endomonXhrOptions, endomondoParser} from './endomondo';
import {parseTrackUrlData, parseNakarteUrl, isNakarteLinkUrl, nakarteLinkXhrOptions, nakarteLinkParser} from './nktk';


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


function parseGpx(txt, name, preferNameFromFile) {
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

    function getRoutePoints(rte_element) {
        var points_elements = rte_element.getElementsByTagName('rtept');
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

    var getRoutes = function(xml) {
        var routes = [];
        var rte_elements = xml.getElementsByTagName('rte');
        for (var i = 0; i < rte_elements.length; i++) {
            var rte_points = getRoutePoints(rte_elements[i]);
            if (rte_points.length) {
                routes.push(rte_points);
            }
        }
        return routes;
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
            let wptName = xmlGetNodeText(waypoint_element.getElementsByTagName('name')[0]) || '';
            try {
                wptName = utf8_decode((wptName));
            }  catch (e) {
                error = 'CORRUPT';
                wptName = '__invalid point name__';
            }
            waypoint.name = wptName;
            waypoint.symbol_name = xmlGetNodeText(waypoint_element.getElementsByTagName('sym')[0]);
            waypoints.push(waypoint);
        }
        return waypoints;
    };

    txt = stripBom(txt);
    // remove namespaces
    txt = txt.replace(/<([^ >]+):([^ >]+)/g, '<$1_$2');
    try {
        var dom = (new DOMParser()).parseFromString(txt, "text/xml");
    } catch (e) {
        return null;
    }
    if (dom.documentElement.nodeName === 'parsererror') {
        return null;
    }
    if (dom.getElementsByTagName('gpx').length === 0) {
        return null;
    }
    if (preferNameFromFile) {
        for (let trk of [...dom.getElementsByTagName('trk')]) {
            let trkName = trk.getElementsByTagName('name')[0];
            if (trkName) {
                trkName = utf8_decode(xmlGetNodeText(trkName));
                if (trkName.length) {
                    name = trkName;
                    break;
                }
            }
        }
    }
    return [{
        name: name,
        tracks: getTrackSegments(dom).concat(getRoutes(dom)),
        points: getWaypoints(dom),
        error: error
    }];
}


function parseOziRte(txt, name) {
    let error, segments = [];
    txt = stripBom(txt);
    const lines = txt.split('\n');
    if (lines[0].indexOf('OziExplorer Route File') !== 0) {
        return null;
    }
    let currentSegment = [];
    for (let i=4; i < lines.length; i++) {
        let line = lines[i].trim();
        if (!line) {
            continue;
        }
        let fields = line.split(',');
        if (fields[0] === 'R') {
            if (currentSegment.length) {
                segments.push(currentSegment);
            }
            currentSegment = [];
        } else if (fields[0] === 'W') {
            let lat = parseFloat(fields[5]);
            let lng = parseFloat(fields[6]);
            if (isNaN(lat) || isNaN(lng)) {
                error = 'CORRUPT';
                break;
            }
            currentSegment.push({lat, lng});
        } else {
            error = 'CORRUPT';
            break
        }
    }
    if (currentSegment.length) {
        segments.push(currentSegment);
    }
    return [{name, tracks: segments, error}];
}

function parseOziPlt(txt, name) {
    var error;
    var segments = [];
    txt = stripBom(txt);
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
    if (isNaN(expected_points_num) || (expected_points_num !== 0 && expected_points_num !== total_points_num)) {
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

function decode866(s) {
    var c, i, s2 = [];
    for (i = 0; i < s.length; i++) {
        c = s.charCodeAt(i);
        if (c >= 128 && c <= 175) {
            c += (0x410 - 128);
        } else if (c >= 224 && c <= 239) {
            c += (0x440 - 224);
        } else if (c === 240) {
            c = 0x0401;
        } else if (c === 241) {
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
    txt = stripBom(txt);
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
                uncompressed = RawDeflate.inflate(entry.data);
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
    try {
        var unzipper = new JSUnzip(txt);
    } catch (e) {
        return null;
    }
    if (!unzipper.isZipFile()) {
        return null;
    }
    try {
        unzipper.readEntries();
    } catch (e) {
        return null;
    }
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
        var file_name = decode866(entry.fileName);
        var geodata = parseGeoFile(file_name, uncompressed);
        for (let item of geodata) {
            if (item.error === 'UNSUPPORTED' && item.name.match(/\.pdf$|\.doc$|\.txt$\.jpg$/)) {
                continue;
            }
            geodata_array.push(item)
        }
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


function parseTrackUrl(s) {
    var i = s.indexOf('track://');
    if (i === -1) {
        return null;
    }
    return parseTrackUrlData(s.substring(i + 8));
}


function simpleTrackFetchOptions(url) {
    return [{
        url: urlViaCorsProxy(url),
        options: {responseType: 'binarystring'}
    }];
}


function simpleTrackParser(name, responses) {
    if (responses.length !== 1) {
        throw new Error(`Invalid responses array length ${responses.length}`);
    }
    return parseGeoFile(name, responses[0].responseBinaryText);
}


function loadFromUrl(url) {
    let geodata;
    geodata = parseGeoFile('', url);
    if (geodata.length === 0 || geodata.length > 1 || geodata[0].error !== 'UNSUPPORTED') {
        return Promise.resolve(geodata);
    }
    let urlToRequest = simpleTrackFetchOptions;
    let parser = simpleTrackParser;


    if (isGpsiesUrl(url)) {
        urlToRequest = gpsiesXhrOptions;
        parser = gpsiesParser;
    } else if (isEndomondoUrl(url)) {
        urlToRequest = endomonXhrOptions;
        parser = endomondoParser;
    } else if (isStravaUrl(url)) {
        urlToRequest = stravaXhrOptions;
        parser = stravaParser;
    } else if (isNakarteLinkUrl(url)) {
        urlToRequest = nakarteLinkXhrOptions;
        parser = nakarteLinkParser;
    }

    const requests = urlToRequest(url);
    return Promise.all(requests.map((request) => fetch(request.url, request.options)))
        .then(
            (responses) => {
                let responseURL = responses[0].responseURL;
                try {
                    responseURL = decodeURIComponent(responseURL);
                } catch (e) {
                }

                let name = responseURL
                    .split('#')[0]
                    .split('?')[0]
                    .replace(/\/*$/, '')
                    .split('/')
                    .pop();
                return parser(name, responses);
            },
            () => [{name: url, error: 'NETWORK'}]
        );
}


function parseGeoFile(name, data) {
    var parsers = [
        parseTrackUrl,
        parseNakarteUrl,
        parseKmz,
        parseZip,
        parseGpx,
        parseOziRte,
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

export {parseGeoFile, parseGpx, loadFromUrl};
