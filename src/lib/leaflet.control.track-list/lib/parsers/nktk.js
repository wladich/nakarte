import Pbf from 'pbf';
import {TrackView} from './nktk_pb';
import {arrayBufferToString, stringToArrayBuffer} from '~/lib/binary-strings';
import utf8 from 'utf8';
import * as urlSafeBase64 from './urlSafeBase64';

const arcUnit = ((1 << 24) - 1) / 360;

function PackedStreamReader(s) {
    this._string = s;
    this.position = 0;
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

function deltaEncodeSegment(points) {
    let deltaLats = [],
        deltaLons = [];
    let lastLon = 0,
        lastLat = 0,
        lon, lat;
    for (let i = 0, len = points.length; i < len; i++) {
        let p = points[i];
        lon = Math.round(p.lng * arcUnit);
        lat = Math.round(p.lat * arcUnit);
        let deltaLon = lon - lastLon;
        let deltaLat = lat - lastLat;
        deltaLats.push(deltaLat);
        deltaLons.push(deltaLon);
        lastLon = lon;
        lastLat = lat;
    }
    return {deltaLats, deltaLons};
}

function deltaDecodeSegment(deltaLats, deltaLons) {
    let encodedLat = 0,
        encodedLon = 0;
    const points = [];
    for (let i = 0; i < deltaLats.length; i++) {
        encodedLat += deltaLats[i];
        encodedLon += deltaLons[i];
        points.push({lat: encodedLat / arcUnit, lng: encodedLon / arcUnit});
    }
    return points;
}

function saveNktk(segments, name, color, measureTicksShown, waypoints, trackHidden) {
    const trackView = {
        view: {
            color,
            shown: !trackHidden,
            ticksShown: measureTicksShown,
        }
    };
    const track = trackView.track = {name};
    if (segments && segments.length) {
        let deltaEncodedSegments = [];
        for (let segment of segments) {
            let {deltaLats, deltaLons} = deltaEncodeSegment(segment);
            deltaEncodedSegments.push({lats: deltaLats, lons: deltaLons});
        }
        track.segments = deltaEncodedSegments;
    }
    if (waypoints && waypoints.length) {
        let midLon = 0,
            midLat = 0;
        waypoints.forEach((wp) => {
                midLon += wp.latlng.lng;
                midLat += wp.latlng.lat;
            }
        );
        midLon = Math.round(midLon * arcUnit / waypoints.length);
        midLat = Math.round(midLat * arcUnit / waypoints.length);
        track.waypoints = {
            midLat, midLon
        };

        let packedWaypoints = [];
        for (let waypoint of waypoints) {
            packedWaypoints.push({
                name: waypoint.label,
                lat: Math.round(waypoint.latlng.lat * arcUnit) - midLat,
                lon: Math.round(waypoint.latlng.lng * arcUnit) - midLon
            });
        }
        track.waypoints.waypoints = packedWaypoints;
    }
    const pbf = new Pbf();
    const versionStr = String.fromCharCode(4 + 64);
    TrackView.write(trackView, pbf);
    const s = versionStr + arrayBufferToString(pbf.finish());
    return urlSafeBase64.encode(s);
}

function parseNktkOld(s, version) {
    var name,
        n,
        segments = [],
        segment,
        segmentsCount,
        pointsCount,
        arcUnit = ((1 << 24) - 1) / 360,
        x, y,
        error, midX, midY, /* symbol,*/ waypointName,
        wayPoints = [],
        color, measureTicksShown,
        trackHidden = false;
    s = new PackedStreamReader(s);
    try {
        n = s.readNumber();
        name = s.readString(n);
        name = utf8.decode(name);
        segmentsCount = s.readNumber();
        for (let i = 0; i < segmentsCount; i++) {
            segment = [];
            pointsCount = s.readNumber();
            x = 0;
            y = 0;
            for (let j = 0; j < pointsCount; j++) {
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
        if (e.message.match('Unexpected end of line while unpacking number')) {
            color = 0;
            measureTicksShown = 0;
            if (version > 0) {
                error = ['CORRUPT'];
            }
        } else {
            throw e;
        }
    }
    if (version >= 3) {
        try {
            trackHidden = Boolean(s.readNumber());
        } catch (e) {
            if (e.message.match('Unexpected end of line while unpacking number')) {
                error = ['CORRUPT'];
            } else {
                throw e;
            }
        }
    }
    if (version >= 2) {
        try {
            pointsCount = s.readNumber();
            if (pointsCount) {
                midX = s.readNumber();
                midY = s.readNumber();
            }
            for (let i = 0; i < pointsCount; i++) {
                n = s.readNumber();
                waypointName = s.readString(n);
                waypointName = utf8.decode(waypointName);

                // let symbol = s.readNumber();
                s.readNumber();

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
        measureTicksShown: measureTicksShown,
        trackHidden: trackHidden
    };
    return [geoData];
}

function parseTrackUrlData(s) {
    s = urlSafeBase64.decode(s);
    if (!s) {
        return [{name: 'Text encoded track', error: ['CORRUPT']}];
    }
    return parseNktkOld(s, 0);
}

function parseNktkProtobuf(s) {
    const pbf = new Pbf(stringToArrayBuffer(s));
    let trackView;
    try {
        trackView = TrackView.read(pbf);
    } catch (e) {
        return [{name: 'Text encoded track', error: ['CORRUPT']}];
    }
    const geoData = {
        name: trackView.track.name || "Text encoded track",
        color: trackView.view.color,
        trackHidden: !trackView.view.shown,
        measureTicksShown: trackView.view.ticksShown,
    };
    const segments = trackView.track.segments;
    if (segments && segments.length) {
        geoData.tracks = segments.map((segment) => deltaDecodeSegment(segment.lats, segment.lons));
    }
    if (trackView.track.waypoints && trackView.track.waypoints.waypoints.length) {
        const waypoints = geoData.points = [];
        for (let waypoint of trackView.track.waypoints.waypoints) {
            waypoints.push({
                name: waypoint.name,
                lat: (waypoint.lat + trackView.track.waypoints.midLat) / arcUnit,
                lng: (waypoint.lon + trackView.track.waypoints.midLon) / arcUnit
            });
        }
    }
    return [geoData];
}

function parseNktkFragment(s) {
    s = urlSafeBase64.decode(s);
    if (!s) {
        return [{name: 'Text encoded track', error: ['CORRUPT']}];
    }
    const reader = new PackedStreamReader(s);
    let version = reader.readNumber();
    if (version === 1 || version === 2 || version === 3) {
        return parseNktkOld(s.substring(reader.position), version);
    } else if (version === 4) {
        return parseNktkProtobuf(s.substring(reader.position));
    }
    return [{name: 'Text encoded track', error: ['CORRUPT']}];
}

function parseNktkSequence(s) {
    return s.split('/')
        .map(parseNktkFragment)
        .reduce((acc, cur) => {
            acc.push(...cur);
            return acc;
        });
}

export {saveNktk, parseTrackUrlData, parseNktkSequence, parseNktkFragment};
