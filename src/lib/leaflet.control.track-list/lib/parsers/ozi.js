import {decodeCP1251} from './codePages';
import stripBom from '~/lib/stripBom';

function parseOziRte(txt, name) {
    let error,
        segments = [];
    txt = stripBom(txt);
    const lines = txt.split('\n');
    if (lines[0].indexOf('OziExplorer Route File') !== 0) {
        return null;
    }
    let currentSegment = [];
    for (let i = 4; i < lines.length; i++) {
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
            break;
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

export {parseOziPlt, parseOziRte, parseOziWpt};
