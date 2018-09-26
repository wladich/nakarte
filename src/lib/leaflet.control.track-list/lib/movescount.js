import urlViaCorsProxy from 'lib/CORSProxy';
import {decode as utf8_decode} from 'utf8';

const urlTypes = {
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
        route(data, type, id, name) {
            const track = data.points.latitudes.map((lat, i) => ({
                lat: data.points.latitudes[i],
                lng: data.points.longitudes[i]
            }));

            name = name || data.routeName;

            return [{
                name: getTrackName(type, name, id),
                tracks: [track]
            }];
        },

        move(data, type, id, name) {
            const track = data.TrackPoints.map(trackPoint => ({
                lat: trackPoint.Latitude,
                lng: trackPoint.Longitude
            }));

            return [{
                name: getTrackName(type, name, id),
                tracks: [track]
            }];
        }
    };

    return parsers[type];
}

function getMovescountUrlType(url, id) {
    let urlType = Object.values(urlTypes).filter(urlType => {
        if (id === undefined) {
            return urlType.re.test(url);
        } else {
            return url === urlViaCorsProxy(urlType.url.replace('{id}', id));
        }
    })[0];

    return urlType && urlType.type;
}

function getTrackName(type, name, id) {
    return `${name} (${type}${id})`;
}

function isMovescountUrl(url) {
    return Object.values(urlTypes).some(urlType => {
        return urlType.re.test(url);
    });
}

function movescountXhrOptions(url) {
    let type = getMovescountUrlType(url);

    let urlType = urlTypes[type];

    let match = urlType.re.exec(url);

    let id = match[2];

    const options = [{
        url: urlViaCorsProxy(urlType.url.replace('{id}', id)),
        options: {
            responseType: 'binarystring',
            isResponseSuccess: (xhr) => xhr.status === 200 || xhr.status === 403 || xhr.status === 404
        },
    }];

    if (type === 'move') {
        options.push({
            url: urlViaCorsProxy(url),
            options: {
                responseType: 'binarystring',
                isResponseSuccess: (xhr) => xhr.status === 200 || xhr.status === 403 || xhr.status === 404
            },
        });
    }

    return options;
}

function movescountParser(id, responses) {
    let data;

    let name;

    let response = responses[0];

    let type = getMovescountUrlType(response.responseURL, id);

    if (response.status === 403) {
        return [{error: `Movescount user disabled viewing this ${type}`}];
    } else {
        try {
            data = JSON.parse(response.responseBinaryText)
        } catch (e) {
            return [{name: id, error: 'UNSUPPORTED'}];
        }
    }

    if (responses[1]) {
        let s = responses[1].responseBinaryText;
        s = utf8_decode(s);

        let m = s.match(/<title>([^<]+)<\/title>/);

        if (m) {
            name = unescapeHtml(m[1]);
        }
    }

    let parseTrack = getTrackParser(type);

    return parseTrack(data, type, id, name);

    function unescapeHtml(html) {
        const element = document.createElement('div');

        return html.replace(/&[0-9a-z#]+;/gi, s => {
            element.innerHTML = s;

            return element.innerText;
        });
    }
}

export {isMovescountUrl, movescountXhrOptions, movescountParser}