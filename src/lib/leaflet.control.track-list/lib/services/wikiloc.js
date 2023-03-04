import BaseService from './baseService';
import urlViaCorsProxy from '~/lib/CORSProxy';
import {stringToArrayBuffer} from '~/lib/binary-strings';
import twkb from 'twkb';

class Wikiloc extends BaseService {
    urlRe = /^https?:\/\/(?:.+\.)?wikiloc\.com\/.*-(\d+)/u;
    mapDataRe = /mapData=(.*);/u;

    getTrackId() {
        const m = this.urlRe.exec(this.origUrl);
        return m[1];
    }

    isOurUrl() {
        return this.urlRe.test(this.origUrl);
    }

    requestOptions() {
        return [{
            url: urlViaCorsProxy(this.origUrl),
            options: {
                isResponseSuccess: (xhr) => xhr.status === 200 || xhr.status === 404
            }
        }];
    }

    parseResponse(responses) {
        const trackId = this.getTrackId();
        const name = `Wikiloc track ${trackId}`;
        const response = responses[0];
        const m = this.mapDataRe.exec(response.responseText);
        if (response.status === 404) {
            return [{error: 'Wikiloc trail does not exist'}];
        }

        try {
            const data = JSON.parse(m[1]);

            let points = [];
            let tracks = [];

            for (let i = 0; i < data.mapData.length; i++) {
                const mapData = data.mapData[i];
                const geom = twkb.toGeoJSON(new Uint8Array(stringToArrayBuffer(atob(mapData.geom))));
                if (mapData.waypoint) {
                    points.push({
                        name: mapData.nom,
                        lat: geom.features[0].geometry.coordinates[0][1],
                        lng: geom.features[0].geometry.coordinates[0][0]
                    });
                } else if (mapData.spaId.toString() === trackId) {
                    tracks.push(geom.features[0].geometry.coordinates.map((obj) => ({lat: obj[1], lng: obj[0]})));
                }
            }
            if (data.waypoints) {
                for (const waypoint of data.waypoints) {
                    points.push({
                        name: waypoint.name,
                        lat: waypoint.lat,
                        lng: waypoint.lon,
                    });
                }
            }

            return [{
                name: data.mapData?.[0]?.nom ?? name,
                points,
                tracks
            }];
        } catch (e) {
            return [{name: name, error: 'UNSUPPORTED'}];
        }
    }
}

export default Wikiloc;
