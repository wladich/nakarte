import urlViaCorsProxy from 'lib/CORSProxy';

const typedUrls = [
    {
        type: 'route',
        url: 'http://www.movescount.com/Move/Route/{id}',
        re: /^https?:\/\/www.movescount.com\/map\?route=(\d+)/
    },
    {
        type: 'move',
        url: 'http://www.movescount.com/Move/Track2/{id}',
        re: /^https?:\/\/www.movescount.com\/moves\/move(\d+)/
    }
];

let matchTypedUrl, trackId;

const trackParser = {
    route: function (data) {
        const track = [];

        data.points.latitudes.forEach(function (lat, i) {
            track.push({
                lat: data.points.latitudes[i],
                lng: data.points.longitudes[i]
            })
        });

        const trackName = getTrackBaseName() + ' ('+ data.routeName + ')';

        const geodata = {
            name: trackName,
            tracks: [track]
        };

        return [geodata];
    },

    move: function (data) {
        const track = [];

        data.TrackPoints.forEach(function (trackPoint) {
            track.push({
                lat: trackPoint.Latitude,
                lng: trackPoint.Longitude
            })
        });

        const geodata = {
            name: getTrackBaseName(),
            tracks: [track]
        };

        return [geodata];
    }
};

function getTrackBaseName() {
    return matchTypedUrl.type + trackId;
}

function isMovescountUrl(url) {
    return typedUrls.some(function (typedUrl) {
        return typedUrl.re.test(url);
    });
}

function movescountXhrOptions(url) {
    matchTypedUrl = typedUrls.filter(function (typedUrl) {
        return typedUrl.re.test(url);
    })[0];

    let match = matchTypedUrl.re.exec(url);

    trackId = match[1];

    return [{
        url: urlViaCorsProxy(matchTypedUrl.url.replace('{id}', trackId)),
        options: {responseType: 'binarystring'}
    }];
}

function movescountParser(name, responses) {
    let data;

    try {
        data = JSON.parse(responses[0].responseBinaryText)
    } catch (e) {
        return [{name: name, error: 'UNSUPPORTED'}];
    }

    return trackParser[matchTypedUrl.type](data);
}

function movescountErrorHandler(errorHandler) {
    return function (e) {
        // movescount returns status 403 when profile or route is private
        if (e.status && e.status === 403) {
            let url = errorHandler(e)[0].name;

            let matchTypedUrl = typedUrls.filter(function (typedUrl) {
                return typedUrl.re.test(url);
            })[0];

            return [{error: 'Movescount user disabled viewing this ' + matchTypedUrl.type}];
        } else {
            return errorHandler(e);
        }
    };
}

export {isMovescountUrl, movescountXhrOptions, movescountParser, movescountErrorHandler}