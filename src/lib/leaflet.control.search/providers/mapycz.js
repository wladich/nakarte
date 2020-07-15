import L from 'leaflet';
import {fetch} from '~/lib/xhr-promise';

class MapyCzProvider {
    API_URL = 'https://api.mapy.cz/suggest/';

    constructor({maxResponses}) {
        this.maxResponses = maxResponses;
    }

    async search(query, {latlng, zoom}) {
        const url = new URL(this.API_URL);
        url.searchParams.append('phrase', query);
        url.searchParams.append('lat', latlng.lat);
        url.searchParams.append('lon', latlng.lng);
        url.searchParams.append('zoom', zoom);
        url.searchParams.append('lang', 'en');
        if (this.maxResponses) {
            url.searchParams.append('count', this.maxResponses);
        }
        let xhr;
        try {
            xhr = await fetch(url.href, {responseType: 'json', timeout: 5000});
        } catch (e) {
            if (e.name === 'XMLHttpRequestPromiseError') {
                return {error: `Search failed: ${e.message}`};
            }
            throw e;
        }
        const places = xhr.responseJSON.result.map((it) => {
            const data = it.userData;
            return {
                bbox: L.latLngBounds([data.bbox[0], data.bbox[1]], [data.bbox[2], data.bbox[3]]),
                latlng: L.latLng(data.latitude, data.longitude),
                title: data.suggestFirstRow,
                address: data.suggestSecondRow,
                category: data.suggestThirdRow || null,
            };
        });
        return {results: places};
    }
}

export {MapyCzProvider};
