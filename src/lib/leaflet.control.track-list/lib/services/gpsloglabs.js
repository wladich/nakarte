import BaseService from './baseService';
import urlViaCorsProxy from '~/lib/CORSProxy';

class Gpsloglabs extends BaseService {
    urlRe = /^https?:\/\/gpsloglabs\.com\/share\/([a-z0-9]+)/u;

    isOurUrl() {
        return this.urlRe.test(this.origUrl);
    }

    requestOptions() {
        const m = this.urlRe.exec(this.origUrl);
        const trackId = this.trackId = m[1];

        return [{
            url: urlViaCorsProxy(`https://gpsloglabs.com/share/${trackId}/json?map`),
            options: {
                responseType: 'json',
                isResponseSuccess: (xhr) => xhr.status === 200 || xhr.status === 404
            }
        }];
    }

    parseResponse(responses) {
        const response = responses[0];
        let name = `GPSLogLabs track ${this.trackId}`;

        if (response.status === 404) {
            return [{error: 'Track does not exist'}];
        }

        try {
            name = `${response.responseJSON.from_name} - ${response.responseJSON.to_name}` || name;
            const track = response.responseJSON.points.map((p) => ({
                    lat: p[0],
                    lng: p[1]
                })
            );

            return [{
                name,
                tracks: [track]
            }];
        } catch (e) {
            let error = 'UNSUPPORTED';

            if (response.status === 200) {
                error = `Track with id ${this.trackId} is not exist`;
            }

            return [{name, error}];
        }
    }
}

export default Gpsloglabs;
