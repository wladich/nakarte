import BaseService from './baseService';
import urlViaCorsProxy from 'lib/CORSProxy';
import utf8 from 'utf8';

class MovescountBase extends BaseService {
    isOurUrl() {
        return this.urlRe.test(this.origUrl);
    }
}

class MovescountRoute extends MovescountBase {
    urlRe = /^https?:\/\/www.movescount.com\/([a-z]{2}\/)?map.*[?&]route=(\d+)/;

    requestOptions() {
        const m = this.urlRe.exec(this.origUrl);
        const trackId = this.trackId = m[2];
        return [{
            url: urlViaCorsProxy(`http://www.movescount.com/Move/Route/${trackId}`),
            options: {
                responseType: 'binarystring',
                isResponseSuccess: (xhr) => xhr.status === 200 || xhr.status === 403
            },
        }]
    }

    parseResponse(responses) {
        const response = responses[0];
        if (response.status === 403) {
            return [{error: 'Movescount user disabled viewing this route'}];
        }
        let data;
        let name = `Movescount route ${this.trackId}`;
        try {
            data = JSON.parse(utf8.decode(response.responseBinaryText));
        } catch (e) {
            return [{name, error: 'UNSUPPORTED'}];
        }

        let points = [];
        let track = [];

        for (let i = 0; i < data.points.latitudes.length; i++) {
            const latlng = {
                lat: data.points.latitudes[i],
                lng: data.points.longitudes[i]
            };
            track.push(latlng);
            const point = data.points.data[i];
            if (point) {
                points.push({ ...latlng, name: point.name });
            }
        }

        name = data.routeName ? data.routeName : name;

        return [{
            name,
            points,
            tracks: [track]
        }];
    }
}

class MovescountMove extends MovescountBase {
    urlRe = /^https?:\/\/www.movescount.com\/([a-z]{2}\/)?moves\/move(\d+)/;

    requestOptions() {
        const m = this.urlRe.exec(this.origUrl);
        const trackId = m[2];
        return [
            {
                url: urlViaCorsProxy(`http://www.movescount.com/Move/Track2/${trackId}`),
                options: {
                    responseType: 'binarystring',
                    isResponseSuccess: (xhr) => xhr.status === 200 || xhr.status === 403
                }
            },
            {
                url: urlViaCorsProxy(`https://www.movescount.com/moves/move${trackId}`),
                options: {
                    responseType: 'binarystring',
                    isResponseSuccess: (xhr) => xhr.status === 200 || xhr.status === 403 || xhr.status === 404
                }
            }
        ]
    }

    parseResponse(responses) {
        const [trackResponse, pageResponse] = responses;
        if (trackResponse.status === 403) {
            return [{error: 'Movescount user disabled viewing this activity'}];
        }
        let data;
        let name = `Movescount move ${this.trackId}`;
        try {
            data = JSON.parse(utf8.decode(trackResponse.responseBinaryText));
        } catch (e) {
            return [{name, error: 'UNSUPPORTED'}];
        }
        const track = data.TrackPoints.map(trackPoint => ({
                lat: trackPoint.Latitude,
                lng: trackPoint.Longitude
            })
        );

        const dom = (new DOMParser()).parseFromString(pageResponse.responseBinaryText, 'text/html');
        const title = dom.querySelector('title').text.trim();
        name = title ? title : name;

        return [{
            name,
            tracks: [track]
        }];

    }
}

export {MovescountRoute, MovescountMove};