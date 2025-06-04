import utf8 from 'utf8';

import * as urlSafeBase64 from '../../parsers/urlSafeBase64';
import {TRACKLIST_TRACK_COLORS} from '../../../track-list';
import loadFromUrl from '../../loadFromUrl';

function parseWaypoint(rawPoint) {
    let name = rawPoint.n;
    let lat = Number(rawPoint.lt);
    let lng = Number(rawPoint.ln);
    if (typeof name !== 'string' || !name || isNaN(lat) || isNaN(lng) ||
        lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        return {valid: false};
    }
    return {
        valid: true,
        point: {lat, lng, name}
    };
}

function parseTrack(rawTrack) {
    if (!rawTrack.length) {
        return {valid: false};
    }
    const track = [];
    for (let rawSegment of rawTrack) {
        let segment = [];
        if (!rawSegment || !rawSegment.length) {
            return {valid: false};
        }
        for (let rawPoint of rawSegment) {
            if (!rawPoint || rawPoint.length !== 2) {
                return {valid: false};
            }
            let [lat, lng] = rawPoint.map(Number);
            if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90) {
                return {valid: false};
            }
            segment.push({lat, lng});
        }
        track.push(segment);
    }
    return {valid: true, track};
}

async function loadTracksFromJson(value) { // eslint-disable-line complexity
    const errCorrupt = [{name: 'Track in url', error: 'CORRUPT'}];
    let jsonString = urlSafeBase64.decode(value);
    try {
        jsonString = utf8.decode(jsonString);
    } catch (e) {
        // so it was not encoded in utf-8, leave it as it is
    }
    let data;
    try {
        data = JSON.parse(jsonString);
    } catch (e) {
        return errCorrupt;
    }
    if (!data || !data.length) {
        return errCorrupt;
    }
    const geoDataArray = [];

    for (let el of data) {
        // Each track should contain either url or at least one of tracks and points
        if (!el.u && !(el.p || el.t)) {
            return errCorrupt;
        }
        let geodata;
        if (el.u) {
            geodata = await
                loadFromUrl(el.u);
            if (el.n && geodata.length === 1 && !geodata[0].error) {
                geodata[0].name = el.n;
            }
        } else {
            geodata = {};
            geodata.name = el.n || 'Track';
            if (el.t) {
                const res = parseTrack(el.t);
                if (!res.valid) {
                    return errCorrupt;
                }
                geodata.tracks = res.track;
            }
            if (el.p) {
                geodata.points = [];
                for (let rawPoint of el.p) {
                    let res = parseWaypoint(rawPoint);
                    // eslint-disable-next-line max-depth
                    if (!res.valid) {
                        return errCorrupt;
                    }
                    geodata.points.push(res.point);
                }
            }
            geodata = [geodata];
        }
        let viewProps = {};
        if ('c' in el) {
            let color = Number(el.c);
            if (color < 0 || color >= TRACKLIST_TRACK_COLORS.length) {
                return errCorrupt;
            }
            viewProps.color = color;
        }
        if ('v' in el) {
            viewProps.trackHidden = !el.v;
        }
        if ('m' in el) {
            viewProps.measureTicksShown = Boolean(el.m);
        }
        geodata.forEach((el) => Object.assign(el, viewProps));
        geoDataArray.push(...geodata);
    }
    return geoDataArray;
}

export default loadTracksFromJson;
