import urlViaCorsProxy from 'lib/CORSProxy';
import BaseService from './baseService';
import parseGpx from  '../parsers/gpx';

class Etomesto extends BaseService {
    urlRe = /^https?:\/\/www\.etomesto\.ru\/track([a-z0-9]+)/;

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
            url: urlViaCorsProxy(`http://www.etomesto.ru/save/${trackId}.gpx`),
            options: {responseType: 'binarystring'}
        }]
    }

    parseResponse(responses) {
        const trackId = this.getTrackId();
        const response = responses[0];
        if (response.responseBinaryText == 'ERROR 403') {
            return [{error: 'Invalid link'}];
        }
        return parseGpx(response.responseBinaryText, `Etomesto track ${trackId}`, true);
    }
}

export default Etomesto;
