import {decode} from 'utf8';

function parseGeojson(txt, fileName) {
    let error;

    let tracks = [];
    let points = [];

    function parsePoints(features) {
        return features
            .filter((feature) => feature.geometry.type === 'Point')
            .map((feature) => {
                let pointName = '';

                if ('name' in feature.properties) {
                    pointName = decode(feature.properties.name.toString());
                }

                const [lng, lat] = feature.geometry.coordinates;

                return {
                    lng,
                    lat,
                    name: pointName,
                };
            });
    }

    function parseTracks(features) {
        return features
            .filter((feature) => feature.geometry.type === 'LineString')
            .map((feature) =>
                feature.geometry.coordinates.map((coordinate) => {
                    const [lng, lat] = coordinate;

                    return {
                        lng,
                        lat,
                    };
                })
            );
    }

    try {
        const json = JSON.parse(txt);

        const features = json.features;

        points = parsePoints(features);
        tracks = parseTracks(features);
    } catch (err) {
        return null;
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
