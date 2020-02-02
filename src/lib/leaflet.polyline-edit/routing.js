import L from 'leaflet';
import {fetch} from '~/lib/xhr-promise';

class Routing {
    constructor(server) {
        this.server = server;
    }

    async fetchData(latlngs) {
        if (!latlngs || latlngs.length < 1) {
            throw new Error('Input empty or has less then 2 points');
        }
        const brouterParams = {
            alternativeidx: 0,
            profile: 'shortest',
            format: 'geojson',
            lonlats: latlngs.map(({lat, lng}) => `${lng},${lat}`).join('|'),
        };
        const requestUrl = this.server + L.Util.getParamString(brouterParams);
        let response;
        try {
            response = await fetch(requestUrl, {responseType: 'json', timeout: 3000, maxTries: 1});
        } catch (e) {
            console.log(e);
            return null;
        }
        return response.responseJSON;
    }

    parseResponse(data) {
        const coords = data?.features?.[0]?.geometry?.coordinates;
        if (coords && coords.length > 1) {
            return coords.map(([lon, lat]) => L.latLng(lat, lon));
        }
        return null;
    }

    async getRoute(latlngs) {
        const responseData = await this.fetchData(latlngs);
        // debugger;
        if (!responseData) {
            return null;
        }
        return this.parseResponse(responseData);
    }
}

export {Routing};
