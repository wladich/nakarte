import urlViaCorsProxy from '~/lib/CORSProxy';
import BaseService from './baseService';
import parseGpx from '../parsers/gpx';

class Osm extends BaseService {
    urlRe = /^https?:\/\/(?:www\.)?openstreetmap\.org\/user\/(?:.*)\/traces\/(\d+)/u;

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
            url: urlViaCorsProxy(`https://www.openstreetmap.org/trace/${trackId}/data`),
            options: {responseType: 'binarystring'}
        }];
    }

    parseResponse(responses) {
        const trackId = this.getTrackId();
        const response = responses[0];
        return parseGpx(response.responseBinaryText, `OSM track ${trackId}`, true) ||
            [{name: name, error: 'UNSUPPORTED'}];
    }
}

export default Osm;
