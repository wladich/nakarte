import loadFromUrl from '~/lib/leaflet.control.track-list/lib/loadFromUrl.js';
suite('Track services availability');

const data = [
    // {
    //     description: 'nktk - url encoded track',
    //     url: '#nktk=QklOZXcgdHJhY2tBRMC_64C0nJ6BgDOhdcDxPshAgDngFUBAQA',
    //     expected: [{
    //         name: 'New track',
    //         tracks: [{
    //             start: {lat: 55.62489841132751, lng: 37.79159771153913},
    //             nPoints: 4
    //         }]
    //     }]
    // },
    // {
    //     description: 'nktl - track from server',
    //     url: '#nktl=sLZnFrQChjzfCMvxiG1QMw',
    //     expected: [{
    //         name: 'Ruler',
    //         color: 1,
    //         measureTicksShown: true,
    //         tracks: [{
    //             start: {lat: 61.18563301477629, lng: 55.37109705037457},
    //             nPoints: 2
    //         }]
    //     }]
    // },
    // {
    //     description: 'nktl - not found track from server',
    //     url: '#nktl=sLZnFrQChjzfCMvxiG1QMw1',
    //     expected: [{
    //         name: 'Track from nakarte server',
    //         tracks: [{
    //             start: {lat: 0, lng: 0},
    //             nPoints: 0
    //         }],
    //         error: 'NETWORK'
    //     }]
    // },
    // {
    //     description: 'nktu - from url-encoded urls',
    //     url: '#nktu=http%3A%2F%2Fslazav.mccme.ru%2Fgps%2F20180415wz.zip/https%3A%2F%2Fwww.strava.com%2Factivities%2F1989612737',
    //     expected: [{
    //         name: '',
    //         tracks: [{
    //             start: {lat: 0, lng: 0},
    //             nPoints: 0
    //         }]
    //     }]
    // },
    // TODO: from url encoded urls when download fails: 1) single, 2) one of two

    // {
    //     description: 'nktj - json encoded tracks',
    //     url: '#nktj=W3sibiI6IlRyYWNrIG5hbWUiLCJwIjpbeyJuIjoiUG9pbnQxIiwibHQiOjI0LjU2LCJsbiI6MzQuNTZ9XSwidCI6W1tbNTYuMjQsNDUuNjddLFs1Ny4yNCw0Ni42N11dXX0seyJuIjoiQW5vdGhlciB0cmFjayIsImMiOjMsInYiOmZhbHNlLCJtIjp0cnVlLCJ1IjoiaHR0cHM6Ly93d3cuc3RyYXZhLmNvbS9hY3Rpdml0aWVzLzE5ODk2MTI3MzcifV0=',
    //     expected: [{
    //         name: '',
    //         tracks: [{
    //             start: {lat: 0, lng: 0},
    //             nPoints: 0
    //         }]
    //     }]
    // },
    {
        description: 'Strava: name defined',
        url: 'https://www.strava.com/activities/1984276821',
        expected: [{
            name: 'Бобрава',
            tracks: [{
                start: {lat: 0, lng: 0},
                nPoints: 0
            }]
        }]
    },
    {
        description: 'Strava: default name',
        url: 'https://www.strava.com/activities/1971945845',
        expected: [{
            name: 'Strava 1971945845',
            tracks: [{
                start: {lat: 49.365864, lng: 16.308448},
                nPoints: 9401
            }]
        }]
    },
    // {
    //     description: '',
    //     url: '',
    //     expected: [{
    //         name: '',
    //         tracks: [{
    //             start: {lat: 0, lng: 0},
    //             nPoints: 0
    //         }]
    //     }]
    // },
];

function trackSegmentSummary(segment) {
    return {
        start: segment[0],
        nPoints: segment.length
    };
}

data.forEach((testCase) => {
    test.only(testCase.description, async function() {
        this.timeout(10000);
        const res = await loadFromUrl(testCase.url);
        for (let geoData of res) {
            if (geoData.tracks) {
                geoData.tracks = geoData.tracks.map(trackSegmentSummary);
            }
        }
        const expected = testCase.expected.map((expectedGeoData) => {
            return {
                error: null,
                points: [],
                tracks: [],
                ...expectedGeoData
            };
        });

        assert.deepEqual(expected, res);
    });
});
