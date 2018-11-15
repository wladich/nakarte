import urlViaCorsProxy from 'lib/CORSProxy';

const urlType = {
    route: {
        type: 'route',
        url: 'http://www.movescount.com/Move/Route/{id}',
        re: /^https?:\/\/www.movescount.com\/([a-z]{2}\/)?map\/?.*[?&]route=(\d+)/
    },
    move: {
        type: 'move',
        url: 'http://www.movescount.com/Move/Track2/{id}',
        re: /^https?:\/\/www.movescount.com\/([a-z]{2}\/)?moves\/move(\d+)/
    }
};

function getTrackParser(type) {
    const parsers = {
        route(data, type, name) {
            const track = data.points.latitudes.map((lat, i) => ({
                lat: data.points.latitudes[i],
                lng: data.points.longitudes[i]
            }));

            return [{
                name: `${data.routeName} ${getTrackBaseName(type, name)}`,
                tracks: [track]
            }];
        },

        move(data, type, name) {
            const track = data.TrackPoints.map(trackPoint => ({
                lat: trackPoint.Latitude,
                lng: trackPoint.Longitude
            }));

            return [{
                name: getTrackBaseName(type, name),
                tracks: [track]
            }];
        }
    };

    return parsers[type];
}

function getMovescountUrlType(url, name) {
    let urlType = Object.values(urlType).filter(urlType => {
        if (name === undefined) {
            return urlType.re.test(url);
        } else {
            return url === urlViaCorsProxy(urlType.url.replace('{id}', name));
        }
    })[0];

    return urlType && urlType.type;
}

function getTrackBaseName(type, name) {
    return type + name;
}

function isMovescountUrl(url) {
    return Object.values(urlType).some(urlType => {
        return urlType.re.test(url);
    });
}

function movescountXhrOptions(url) {
    let type = getMovescountUrlType(url);

    let urlType = urlType[type];

    let match = urlType.re.exec(url);

    let name = match[2];

    return [{
        url: urlViaCorsProxy(urlType.url.replace('{id}', name)),
        options: {
            responseType: 'binarystring',
            isResponseSuccess: (xhr) => xhr.status === 200 || xhr.status === 403
        },
    }];
}

function movescountParser(name, responses) {
    let data;

    let response = responses[0];

    let type = getMovescountUrlType(response.responseURL, name);

    if (response.status === 403) {
        return [{error: `Movescount user disabled viewing this ${type}`}];
    } else {
        try {
            data = JSON.parse(response.responseBinaryText)
        } catch (e) {
            return [{name, error: 'UNSUPPORTED'}];
        }
    }

    let parseTrack = getTrackParser(type);

    return parseTrack(data, type, name);
}

export {isMovescountUrl, movescountXhrOptions, movescountParser}