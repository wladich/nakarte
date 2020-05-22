import config from '~/config';
import {fetch} from '~/lib/xhr-promise';

class ElevationProvider {
    chunkSize = 10000;

    constructor(serverUrl = config.elevationsServer) {
        this.url = serverUrl;
    }

    async get(latlngs) {
        const result = [];
        for (let i = 0; i < latlngs.length; i += this.chunkSize) {
            const chunk = latlngs.slice(i, i + this.chunkSize);
            const request = chunk.map((ll) => `${ll.lat.toFixed(6)} ${ll.lng.toFixed(6)}`).join('\n');
            const xhr = await fetch(this.url, {method: 'POST', data: request, withCredentials: true});
            const respValues = xhr.responseText.split('\n').map((line) => (line === 'NULL' ? null : parseFloat(line)));
            result.push(...respValues);
        }
        return result;
    }
}

export {ElevationProvider};
