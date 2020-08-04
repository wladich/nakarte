import urlViaCorsProxy from '~/lib/CORSProxy';
import BaseService from './baseService';
import parseGpx from '../parsers/gpx';

class OpenStreetMapRu extends BaseService {
    urlRe = /^https?:\/\/(?:www\.)?openstreetmap\.ru\/\?mapid=(\d+)/u;

    getTrackId() {
        const m = this.urlRe.exec(this.origUrl);
        return m[1];
    }

    isOurUrl() {
        return this.urlRe.test(this.origUrl);
    }

    requestOptions() {
        const trackId = this.getTrackId();
        return [{
            url: urlViaCorsProxy(`https://openstreetmap.ru/mymap.php?id=${trackId}&format=gpx`),
            options: {responseType: 'binarystring'}
        }];
    }

    parseResponse(responses) {
        const trackId = this.getTrackId();
        const response = responses[0];
        return parseGpx(response.responseBinaryText, `PersonalMap ${trackId}`, true) ||
            [{name: name, error: 'UNSUPPORTED'}];
    }
}

export default OpenStreetMapRu;
