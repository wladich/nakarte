import BaseService from './baseService';
import urlViaCorsProxy from '~/lib/CORSProxy';
import L from 'leaflet';

class Tracedetrail extends BaseService {
    urlRe = /^https?:\/\/(?:www\.)?tracedetrail\.[a-z]{2,}.*\/trace\/trace\/([0-9]+)/u;

    isOurUrl() {
        return this.urlRe.test(this.origUrl);
    }

    requestOptions() {
        const m = this.urlRe.exec(this.origUrl);
        const trackId = this.trackId = m[1];

        return [{
            url: urlViaCorsProxy(`https://tracedetrail.com/en/trace/geomSections/${trackId}`),
            options: {responseType: 'json'}
        }];
    }

    parseResponse(responses) {
        const response = responses[0];
        let name = `Tracedetrail track ${this.trackId}`;
        try {
            name = response.responseJSON.nom_fr || name;
            const geometry = JSON.parse(response.responseJSON.geometry);
            const proj = L.CRS.EPSG3857;
            const points = geometry.map((item) => proj.unproject(L.point(item.lon, item.lat)));

            return [{
                name,
                tracks: [points]
            }];
        } catch (e) {
            let error = 'UNSUPPORTED';

            if (response.status === 200) {
                error = `Track with id ${this.trackId} was deleted or did not exist`;
            }

            return [{name, error}];
        }
    }
}

export default Tracedetrail;
