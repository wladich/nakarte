import {urlViaCorsProxy} from '~/lib/CORSProxy';
import {fetch} from '~/lib/xhr-promise';

import BaseService from './baseService';

class GarminBase extends BaseService {
    urlRe = /NOT IMPLEMENTED/u;

    isOurUrl() {
        return this.urlRe.test(this.origUrl);
    }

    async prepare() {
        let response;
        try {
            response = await fetch(urlViaCorsProxy(this.origUrl + '?' + Date.now()), {
                isResponseSuccess: (xhr) => xhr.status === 200,
            });
        } catch {
            return 'NETWORK';
        }
        let dom;
        try {
            dom = new DOMParser().parseFromString(response.response, 'text/html');
        } catch {
            return 'NETWORK';
        }
        const token = dom.querySelector('meta[name="csrf-token"]')?.content;
        if (!token) {
            return 'NETWORK';
        }
        this.token = token;
        return null;
    }
}

function isResponseSuccess(xhr) {
    return xhr.status === 200 || xhr.status === 403 || xhr.status === 404;
}

class GarminRoute extends GarminBase {
    urlRe = /^https?:\/\/connect\.garmin\.com\/modern\/course\/(\d+)/u;

    requestOptions() {
        const m = this.urlRe.exec(this.origUrl);
        const trackId = m[1];
        this.trackId = trackId;
        return [
            {
                url: urlViaCorsProxy(`https://connect.garmin.com/gc-api/course-service/course/${trackId}`),
                options: {
                    responseType: 'json',
                    headers: [['connect-csrf-token', this.token]],
                    isResponseSuccess,
                },
            },
        ];
    }

    parseResponse(responses) {
        const response = responses[0];
        if (response.status === 403) {
            return [{error: 'Garmin Connect user disabled viewing this route'}];
        }
        if (response.status === 404) {
            return [{error: 'Garmin Connect route does not exist'}];
        }
        let trackName = `Garmin Connect route ${this.trackId}`;
        const data = response.responseJSON;
        if (!data) {
            return [{name: trackName, error: 'UNSUPPORTED'}];
        }
        let points = null;
        let tracks = [];
        try {
            if (data.coursePoints) {
                points = data.coursePoints.map((pt) => ({name: pt.name, lat: pt.lat, lng: pt.lon}));
            }
            if (data.geoPoints) {
                tracks = [data.geoPoints.map((obj) => ({lat: obj.latitude, lng: obj.longitude}))];
            }
        } catch {
            return [{name: trackName, error: 'UNSUPPORTED'}];
        }
        trackName = data.courseName ? data.courseName : trackName;
        return [
            {
                name: trackName,
                points,
                tracks,
            },
        ];
    }
}

class GarminActivity extends GarminBase {
    urlRe = /^https?:\/\/connect\.garmin\.com\/modern\/activity\/(\d+)/u;

    requestOptions() {
        const m = this.urlRe.exec(this.origUrl);
        const trackId = m[1];
        this.trackId = trackId;
        return [
            {
                url: urlViaCorsProxy(`https://connect.garmin.com/gc-api/activity-service/activity/${trackId}`),
                options: {
                    responseType: 'json',
                    headers: [['connect-csrf-token', this.token]],
                    isResponseSuccess,
                },
            },
            {
                url: urlViaCorsProxy(`https://connect.garmin.com/gc-api/activity-service/activity/${trackId}/details`),
                options: {
                    responseType: 'json',
                    headers: [['connect-csrf-token', this.token]],
                    isResponseSuccess,
                },
            },
        ];
    }

    parseResponse(responses) {
        const [infoResponse, detailsResponse] = responses;
        if (infoResponse.status === 403) {
            return [{error: 'Garmin Connect user disabled viewing this activity'}];
        }
        if (infoResponse.status === 404) {
            return [{error: 'Garmin Connect activity does not exist'}];
        }
        let trackName = `Garmin Connect activity ${this.trackId}`;
        if (!infoResponse.responseJSON) {
            return [{name: trackName, error: 'UNSUPPORTED'}];
        }
        trackName = infoResponse.responseJSON.activityName || trackName;
        let track;
        try {
            track = detailsResponse.responseJSON.geoPolylineDTO.polyline.map((obj) => ({lat: obj.lat, lng: obj.lon}));
        } catch {
            return [{name: trackName, error: 'UNSUPPORTED'}];
        }

        return [
            {
                name: trackName,
                tracks: [track],
            },
        ];
    }
}

export {GarminRoute, GarminActivity};
