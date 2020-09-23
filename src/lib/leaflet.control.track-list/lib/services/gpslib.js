import urlViaCorsProxy from '~/lib/CORSProxy';
import BaseService from './baseService';
import parseGpx from '../parsers/gpx';

class Gpslib extends BaseService {
    urlRe = /^https?:\/\/(?:.+\.)?gpslib\.[^.]+\/tracks\/info\/(\d+)/u;

    isOurUrl() {
        return this.urlRe.test(this.origUrl);
    }

    requestOptions() {
        const m = this.urlRe.exec(this.origUrl);
        const trackId = this.trackId = m[1];
        return [{
            url: urlViaCorsProxy(`https://www.gpslib.ru/tracks/download/${trackId}.gpx`),
            options: {responseType: 'binarystring'}
        }];
    }

    parseResponse(responses) {
        const response = responses[0];
        return parseGpx(response.responseBinaryText, `GPSLib ${this.trackId}`, true) ||
            [{name: name, error: 'UNSUPPORTED'}];
    }
}

export default Gpslib;
