import L from 'leaflet';

import loadFromUrl from '~/lib/leaflet.control.track-list/lib/loadFromUrl';

function calcLineLength(points) {
    let lineLength = 0;
    for (let i = 1; i < points.length; i++) {
        const p1 = points[i];
        const p2 = points[i - 1];
        lineLength += L.latLng(p1.lat, p1.lng).distanceTo(L.latLng(p2.lat, p2.lng));
    }
    return lineLength;
}

function getSegmentSummary(points) {
    return {
        first: points[0],
        last: points[points.length - 1],
        count: points.length,
        length: Math.round(calcLineLength(points)),
    };
}

function trackSummary(track) {
    const result = {...track};
    if (result.tracks) {
        result.tracksSummary = result.tracks.map(getSegmentSummary);
        delete result.tracks;
    }

    return result;
}

function reduceSegmentsPointsPrecision(segments) {
    return segments.map((segment) => segment.map(({lat, lng}) => ({lat: lat.toFixed(7), lng: lng.toFixed(7)})));
}

suite('Load tracks from services');
[
    'strava_with_title',
    'strava_without_title',
    'strava_private',
    'strava_not_exists',
    'garmin_connect_activity_with_title',
    'garmin_connect_activity_without_title',
    'garmin_connect_activity_private',
    'garmin_connect_activity_not_exists',
    'garmin_connect_route_with_title',
    'garmin_connect_route_private',
    'garmin_connect_route_not_exists',
    'gpslib_with_title',
    'gpslib_without_title',
    'gpslib_not_exists',
    'osm_with_title',
    'osm_without_title',
    'osm_private',
    'osm_trackable',
    'osm_public',
    'osm_not_exists',
    'etomesto_with_title',
    'etomesto_without_title',
    'etomesto_private',
    'etomesto_not_exists',
    'tracedetrail_with_title',
    'tracedetrail_private',
    'tracedetrail_not_exists',
    'sportstracker_with_title',
    'sportstracker_without_title',
    'sportstracker_private',
    'sportstracker_not_exists',
    'openstreetmapRu',
    'openstreetmapRuGpx',
    'openstreetmapRu_not_exists',
    'wikiloc_not_exists',
    'wikiloc_with_waypoints',
    'wikiloc',
].forEach(function (testcase) {
    // eslint-disable-next-line import/no-dynamic-require
    const testData = require('./track_load_data/testcases/' + testcase + '.json');
    for (const track of testData.geodata) {
        if (track.tracks) {
            track.tracks = reduceSegmentsPointsPrecision(track.tracks);
        }
    }
    for (let i = 0; i < testData.query.length; i++) {
        let testcaseName = testcase;
        if (testData.query.length > 1) {
            testcaseName += `_#${i + 1}`;
        }
        test(testcaseName, async function () {
            this.timeout(5000);
            this.retries(5);
            const result = await loadFromUrl(testData.query[i]);
            if (result) {
                for (const track of result) {
                    for (const [k, v] of Object.entries(track)) {
                        if (v === undefined) {
                            delete track[k];
                        }
                    }
                    if (track.tracks) {
                        track.tracks = reduceSegmentsPointsPrecision(track.tracks);
                    }
                    if (track.points) {
                        track.points = track.points.sort((point) => point.name);
                    }
                }
            }
            assert.deepEqual(testData.geodata.map(trackSummary), result.map(trackSummary));
            assert.deepEqual(testData.geodata, result);
        });
    }
});
