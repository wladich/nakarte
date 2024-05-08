import BaseService from './baseService';
import urlViaCorsProxy from '~/lib/CORSProxy';
import L from 'leaflet';

class Tracedetrail extends BaseService {
    urlRe = /^https?:\/\/(?:www\.)?tracedetrail\.[a-z]{2,}.*\/trace\/trace\/([0-9]+)/u;

    isOurUrl() {
        return this.urlRe.test(this.origUrl);
    }

    requestOptions() {
        return [{
            url: urlViaCorsProxy(this.origUrl),
        }];
    }

    parseResponse(responses) {
        const trackId = this.urlRe.exec(this.origUrl)[1];
        let name = `Tracedetrail track ${trackId}`;
        const documentText = responses[0].responseText;
        try {
            const geometryMatch = /geometry\s*:\s*"(.+)",\n/u.exec(documentText);
            if (!geometryMatch) {
                let error = 'UNSUPPORTED';
                if (documentText.includes("track doesn't exist")) {
                    error = '{name} was deleted or did not exist';
                } else if (documentText.includes('Private track')) {
                    error = '{name} is private';
                }
                return [{name, error}];
            }
            const encodedGeometry = geometryMatch[1];
            const titleMatch = /<title>.+:\s*(.+)<\/title>/u.exec(documentText);
            if (titleMatch) {
                name = titleMatch[1];
            }

            const geometry = JSON.parse(encodedGeometry.replaceAll('\\"', '"'));
            const proj = L.CRS.EPSG3857;
            const points = geometry.map((item) => proj.unproject(L.point(item.lon, item.lat)));

            return [{
                name,
                tracks: [points]
            }];
        } catch (e) {
            return [{name, error: 'UNSUPPORTED'}];
        }
    }
}

export default Tracedetrail;
