import BaseService from './baseService';
import urlViaCorsProxy from 'lib/CORSProxy';
import L from 'leaflet';

class Tracedetrail extends BaseService {
    urlRe = /^https?:\/\/tracedetrail\.[a-z]{2,}\/[a-z]{2}\/trace\/trace\/([0-9]+)/;

    isOurUrl() {
        return this.urlRe.test(this.origUrl);
    }

    requestOptions() {
        const m = this.urlRe.exec(this.origUrl);
        const trackId = this.trackId = m[1];

        return [{
            url: urlViaCorsProxy(`https://tracedetrail.com/en/trace/geomSections/${trackId}`),
            options: {responseType: 'json'}
        }]
    }

    parseResponse(responses) {
        const response = responses[0];

        let name = `Tracedetrail track ${this.trackId}`;

        try {
            name = response.responseJSON.nom_fr;

            const geometry = JSON.parse(response.responseJSON.geometry);

            const geoArr = geometry.map(item => {
                return {
                    lon: item.lon,
                    lat: item.lat
                }
            });

            const tracks = geoArr.map(item => {
                const proj = L.CRS.EPSG3857;

                const latlng = proj.unproject(new L.Point(item.lon, item.lat));

                return {
                    lng: latlng.lng,
                    lat: latlng.lat
                };
            });

            return [{
                name,
                tracks: [tracks]
            }];
        } catch (e) {
            return [{name, error: 'UNSUPPORTED'}];
        }
    }
}

export default Tracedetrail;
