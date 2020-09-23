import BaseService from './baseService';
import urlViaCorsProxy from '~/lib/CORSProxy';

class GarminBase extends BaseService {
    isOurUrl() {
        return this.urlRe.test(this.origUrl);
    }
}

class GarminRoute extends GarminBase {
    urlRe = /^https?:\/\/connect\.garmin\.com\/modern\/course\/(\d+)/u;

    requestOptions() {
        const m = this.urlRe.exec(this.origUrl);
        const trackId = this.trackId = m[1];
        return [{
            url: urlViaCorsProxy(`https://connect.garmin.com/modern/proxy/course-service/course/${trackId}`),
            options: {
                responseType: 'json',
                isResponseSuccess: (xhr) => xhr.status === 200 || xhr.status === 403 || xhr.status === 404
            },
        }];
    }

    parseResponse(responses) {
        const response = responses[0];
        if (response.status === 403) {
            return [{error: 'Garmin Connect user disabled viewing this route'}];
        }
        if (response.status === 404) {
            return [{error: 'Garmin Connect route does not exist'}];
        }
        let name = `Garmin Connect route ${this.trackId}`;
        const data = response.responseJSON;
        if (!data) {
            return [{name, error: 'UNSUPPORTED'}];
        }
        let points = data.coursePoints.map((pt) => ({name: pt.name, lat: pt.lat, lng: pt.lon}));
        let track = data.geoPoints.map((obj) => ({lat: obj.latitude, lng: obj.longitude}));
        name = data.courseName ? data.courseName : name;
        return [{
            name,
            points,
            tracks: [track]
        }];
    }
}

class GarminActivity extends GarminBase {
    urlRe = /^https?:\/\/connect\.garmin\.com\/modern\/activity\/(\d+)/u;

    requestOptions() {
        const m = this.urlRe.exec(this.origUrl);
        const trackId = this.trackId = m[1];
        return [
            {
                url: urlViaCorsProxy(
                    `https://connect.garmin.com/modern/proxy/activity-service/activity/${trackId}/details`),
                options: {
                    responseType: 'json',
                    isResponseSuccess: (xhr) => xhr.status === 200 || xhr.status === 403 || xhr.status === 404
                }
            }
        ];
    }

    parseResponse(responses) {
        const response = responses[0];
        if (response.status === 403) {
            return [{error: 'Garmin Connect user disabled viewing this activity'}];
        }
        if (response.status === 404) {
            return [{error: 'Garmin Connect activity does not exist'}];
        }
        let name = `Garmin Connect activity ${this.trackId}`;
        const data = response.responseJSON;
        if (!data) {
            return [{name, error: 'UNSUPPORTED'}];
        }
        let track = data.geoPolylineDTO.polyline.map((obj) => ({lat: obj.lat, lng: obj.lon}));
        return [{
            name,
            tracks: [track]
        }];
    }
}

export {GarminRoute, GarminActivity};
