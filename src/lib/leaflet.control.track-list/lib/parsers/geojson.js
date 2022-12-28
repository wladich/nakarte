import {decode} from 'utf8';

function parseGeojson(txt, fileName) {
    let error;

    const tracks = [];
    const points = [];

    function parsePoints(features) {
        features.forEach((feature) => {
            let pointName = '';

            if ('name' in feature.properties) {
                pointName = decode(feature.properties.name.toString());
            }

            const [lng, lat] = feature.geometry.coordinates;

            if (typeof lng !== 'number' || typeof lat !== 'number') {
                error = 'CORRUPT';

                return;
            }

            points.push({
                lng,
                lat,
                name: pointName,
            });
        });
    }

    function parseTracks(features) {
        features.forEach((feature) => {
            const segment = [];

            feature.geometry.coordinates.forEach((coordinate) => {
                const [lng, lat] = coordinate;

                if (typeof lng !== 'number' || typeof lat !== 'number') {
                    error = 'CORRUPT';

                    return;
                }

                segment.push({
                    lng,
                    lat,
                });
            });

            if (segment.length < 2) {
                error = 'CORRUPT';

                return;
            }

            tracks.push(segment);
        });
    }

    try {
        const json = JSON.parse(txt);

        const features = json.features;

        parsePoints(features.filter((feature) => feature.geometry.type === 'Point'));
        parseTracks(features.filter((feature) => feature.geometry.type === 'LineString'));
    } catch (err) {
        error = 'CORRUPT';
    }

    return [
        {
            name: fileName,
            tracks,
            points,
            error,
        },
    ];
}

export {parseGeojson};
