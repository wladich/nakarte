import BaseService from './baseService';
import urlViaCorsProxy from '~/lib/CORSProxy';
import utf8 from 'utf8';

class SportsTrackerBase extends BaseService {
    isOurUrl() {
        return this.urlRe.test(this.origUrl);
    }
}

class SportsTrackerActivity extends SportsTrackerBase {
    urlRe = /^https?:\/\/(www\.)?sports-tracker\.com\/workout\/([^/]+)\/([a-z0-9]+)/u;

    requestOptions() {
        const m = this.urlRe.exec(this.origUrl);
        const activityId = m[3];
        return [
            {
                url: urlViaCorsProxy(
                    `https://api.sports-tracker.com/apiserver/v1/workouts/${activityId}/data?samples=100000`
                ),
                options: {
                    responseType: 'binarystring',
                    isResponseSuccess: (xhr) => xhr.status === 200 || xhr.status === 403
                }
            },
            {
                url: urlViaCorsProxy(`https://api.sports-tracker.com/apiserver/v1/workouts/${activityId}/combined`),
                options: {
                    responseType: 'binarystring',
                    isResponseSuccess: (xhr) => [200, 403, 404].includes(xhr.status)
                }
            }
        ];
    }

    parseResponse(responses) {
        const [dataResponse, metadataResponse] = responses;
        if (metadataResponse.status === 404) {
            return [{error: 'Sports Tracker activity not found'}];
        }
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
        const track = data.payload.locations.map((location) => ({
                lat: location.la,
                lng: location.ln
            })
        );
        if (data.payload.description) {
            name = data.payload.description;
        } else {
            const startTime = new Date(metadata.payload.startTime).toDateString();
            name = `${metadata.payload.fullname} on ${startTime}`;
        }

        return [{
            name,
            tracks: [track]
        }];
    }
}

export {SportsTrackerActivity};
