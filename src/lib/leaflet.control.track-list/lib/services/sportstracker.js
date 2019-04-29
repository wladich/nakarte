import BaseService from './baseService';
import urlViaCorsProxy from 'lib/CORSProxy';
import utf8 from 'utf8';

class SportsTrackerBase extends BaseService {
    isOurUrl() {
        return this.urlRe.test(this.origUrl);
    }
}

class SportsTrackerActivity extends SportsTrackerBase {
    urlRe = /^https?:\/\/(www.)?sports-tracker.com\/workout\/([^/]+)\/([a-z0-9]+)/;

    requestOptions() {
        const m = this.urlRe.exec(this.origUrl);
        const activityId = m[3];
        return [
            {
                url: urlViaCorsProxy(`https://www.sports-tracker.com/apiserver/v1/workouts/${activityId}/data?samples=100000`),
                options: {
                    responseType: 'binarystring',
                    isResponseSuccess: (xhr) => xhr.status === 200 || xhr.status === 403
                }
            },
            {
                url: urlViaCorsProxy(`https://www.sports-tracker.com/apiserver/v1/workouts/${activityId}/combined`),
                options: {
                    responseType: 'binarystring',
                    isResponseSuccess: (xhr) => xhr.status === 200 || xhr.status === 403
                }
            }
        ]
    }

    parseResponse(responses) {
        const [dataResponse, metadataResponse] = responses;
        if (dataResponse.status === 403) {
            return [{error: 'Sports Tracker user disabled viewing this activity'}];
        }
        let data, metadata;
        let name = `Sports Tracker activity`;
        try {
            data = JSON.parse(utf8.decode(dataResponse.responseBinaryText));
            metadata = JSON.parse(utf8.decode(metadataResponse.responseBinaryText));
        } catch (e) {
            return [{name, error: 'UNSUPPORTED'}];
        }
        const track = data.payload.locations.map(location => ({
                lat: location.la,
                lng: location.ln
            })
        );

        // природа поля name не совсем очевидна, данные, которые там иногда приходят (например, 29/4/19 8:40 a. m.)
        // как-то не шибко сильно позволяют идентифицировать тип активности, а через приложение и сайт
        // можно редактировать только поле description (sic!), поэтому мы пока будем игнорировать поле name

        if (/*data.payload.name || */data.payload.description) {
            name = /*data.payload.name || */data.payload.description;
        } else {
            const startTime = new Date(metadata.payload.startTime).toGMTString();
            name = `${name} of ${metadata.payload.fullname} on ${startTime}`;
        }

        return [{
            name,
            tracks: [track]
        }];
    }
}

export {SportsTrackerActivity};