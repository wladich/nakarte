import BaseService from './baseService';
import urlViaCorsProxy from '~/lib/CORSProxy';
import {decode as utf8_decode} from 'utf8';

class Strava extends BaseService {
    urlRe = /^https?:\/\/(?:.+\.)?strava\.com\/activities\/(\d+)/u;

    isOurUrl() {
        return this.urlRe.test(this.origUrl);
    }

    requestOptions() {
        const m = this.urlRe.exec(this.origUrl);
        const trackId = this.trackId = m[1];
        return [
            {
                url: urlViaCorsProxy(`https://www.strava.com/activities/${trackId}?hl=en-GB`),
                options: {
                    responseType: 'binarystring',
                    isResponseSuccess: (xhr) => (xhr.status === 200 || xhr.status === 404)
                }
            },
            {
                url: urlViaCorsProxy(`https://www.strava.com/stream/${trackId}?streams%5B%5D=latlng`),
                options: {
                    responseType: 'binarystring',
                    isResponseSuccess: (xhr) => (xhr.status === 200 || xhr.status === 401)
                }
            }
        ];
    }

    parseResponse(responses) {
        let data;
        const [pageResponse, trackResponse] = responses;
        if (trackResponse.status === 401) {
            return [{error: 'Strava user disabled viewing this track (track is private)'}];
        }
        let name = `Strava ${this.trackId}`;
        try {
            data = JSON.parse(trackResponse.responseBinaryText);
        } catch (e) {
            return [{name, error: 'UNSUPPORTED'}];
        }
        if (!data.latlng) {
            return [{name, error: 'UNSUPPORTED'}];
        }
        const tracks = [data.latlng.map((p) => ({lat: p[0], lng: p[1]}))];

        try {
            let name2;
            const dom = (new DOMParser()).parseFromString(pageResponse.responseBinaryText, "text/html");
            let title = dom.querySelector('meta[property=og\\:title]').content;
            title = utf8_decode(title);
            // name and description
            const m = title.match(/^(.+) - ([^-]+)/u);
            if (m) {
                // reverse name and description
                name2 = `${m[2]} ${m[1]}`;
                title = dom.querySelector('title').text;
                let date = title.match(/ (on \d{1,2} \w+ \d{4}) /u)[1];
                if (date) {
                    name2 += ' ' + date;
                }
            }
            name = name2;
        } catch (e) {
            // use previously constructed name
        }

        return [{
            name,
            tracks
        }];
    }
}

export default Strava;
