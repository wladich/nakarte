import BaseService from './baseService';
import {corsProxyOriginalUrl, urlViaCorsProxy} from '~/lib/CORSProxy';

class Strava extends BaseService {
    urlRe = /^https?:\/\/(?:.+\.)?strava\.com\/activities\/(\d+)/u;

    isOurUrl() {
        return this.urlRe.test(this.origUrl);
    }

    requestOptions() {
        const m = this.urlRe.exec(this.origUrl);
        const trackId = this.trackId = m[1];
        function isResponseSuccess(response) {
            return [200, 401, 404].includes(response.status);
        }
        return [
            {
                url: urlViaCorsProxy(`https://www.strava.com/activities/${trackId}?hl=en-GB`),
                options: {
                    isResponseSuccess
                }
            },
            {
                url: urlViaCorsProxy(`https://www.strava.com/activities/${trackId}/streams?stream_types%5B%5D=latlng`),
                options: {
                    responseType: 'json',
                    isResponseSuccess
                }
            }
        ];
    }

    parseResponse(responses) {
        const statusMessages = {
            401: 'Requested Strava activity marked as private',
            404: 'Requested Strava activity could not be found'
        };
        const [pageResponse, trackResponse] = responses;
        if (trackResponse.status !== 200) {
            return [{error: statusMessages[trackResponse.status]}];
        }
        let name = `Strava ${this.trackId}`;
        const latlngs = trackResponse.responseJSON?.latlng;
        if (!latlngs || !Array.isArray(latlngs)) {
            return [{name, error: 'UNSUPPORTED'}];
        }
        const tracks = [latlngs.map((p) => ({lat: p[0], lng: p[1]}))];
        let dom;
        try {
            dom = (new DOMParser()).parseFromString(pageResponse.response, 'text/html');
        } catch (e) {
            // will use default name
        }
        if (dom) {
            const userName = (dom.querySelector('a.minimal[href*="/athletes/"]')?.textContent ?? '').trim();
            const activityTitle = (dom.querySelector('h1.activity-name')?.textContent ?? '').trim();
            let date = dom.querySelector('time')?.textContent ?? '';
            date = date.split(',')[1] ?? '';
            date = date.trim();
            if (userName && activityTitle && date) {
                name = `${userName} - ${activityTitle} ${date}`;
            }
        }
        return [{
            name,
            tracks
        }];
    }
}

class StravaShortUrl extends BaseService {
    urlRe = /^https:\/\/strava.app.link\/([A-Za-z0-9]+)/u;

    isOurUrl() {
        return this.urlRe.test(this.origUrl);
    }

    requestOptions() {
        return [
            {
                url: urlViaCorsProxy(this.origUrl),
                options: {isResponseSuccess: (response) => [200, 404].includes(response.status)},
            },
        ];
    }

    parseResponse(responses) {
        const response = responses[0];
        const url = corsProxyOriginalUrl(response.responseURL);
        if (response.status === 404) {
            return [{error: 'Requested Strava activity was deleted'}];
        }
        const strava = new Strava(url);
        if (!strava.isOurUrl()) {
            return [{error: 'Bad short link for Strava activity or activity is marked as private'}];
        }
        return strava.geoData();
    }
}

export {Strava, StravaShortUrl};
