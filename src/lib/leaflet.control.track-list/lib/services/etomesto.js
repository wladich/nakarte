import urlViaCorsProxy from '~/lib/CORSProxy';
import BaseService from './baseService';
import parseGpx from '../parsers/gpx';

class Etomesto extends BaseService {
    urlRe = /^https?:\/\/(?:www\.)?etomesto\.ru\/track([a-z0-9]+)/u;

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
            options: {
                responseType: 'binarystring',
                isResponseSuccess: (xhr) => (
                    xhr.status === 200 &&
                    !xhr.responseBinaryText.startsWith('ERROR'))
            }
        }];
    }

    parseResponse(responses) {
        const trackId = this.getTrackId();
        const response = responses[0];
        const name = `Etomesto track ${trackId}`;
        return parseGpx(response.responseBinaryText, name, true) || [{name: name, error: 'UNSUPPORTED'}];
    }
}

export default Etomesto;
