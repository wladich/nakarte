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
        const geodata = parseGpx(response.responseBinaryText, `PersonalMap ${trackId}`, true);
        if (!geodata) {
            return [{name: name, error: 'UNSUPPORTED'}];
        }
        if (geodata[0].tracks.length === 0 && geodata[0].points.length === 0) {
            return [{error: 'Personal map is empty or does not exist'}];
        }
        return geodata;
    }
}

export default OpenStreetMapRu;
