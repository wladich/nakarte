import config from '~/config';
import {fetch} from '~/lib/xhr-promise';

class ElevationProvider {
    constructor(serverUrl = config.elevationsServer) {
        this.url = serverUrl;
    }

    async get(latlngs) {
        const request = latlngs.map((ll) => `${ll.lat.toFixed(6)} ${ll.lng.toFixed(6)}`).join('\n');
        const xhr = await fetch(this.url, {method: 'POST', data: request, withCredentials: true});
        return xhr.responseText.split('\n').map((line) => (line === 'NULL' ? null : parseFloat(line)));
    }
}

export {ElevationProvider};
