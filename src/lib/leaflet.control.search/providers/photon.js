import L from 'leaflet';
import {fetch} from '~/lib/xhr-promise';

class PhotonProvider {
    DEFAULT_API_URL = 'https://photon.komoot.de/api/';

    constructor({apiUrl, maxResponses}) {
        this.maxResponses = maxResponses;
        this.apiUrl = apiUrl ?? this.DEFAULT_API_URL;
    }

    async search(query, {latlng}) {
        const url = new URL(this.DEFAULT_API_URL);
        url.searchParams.append('limit', this.maxResponses);
        url.searchParams.append('q', query);
        url.searchParams.append('lang', 'en');
        url.searchParams.append('lat', latlng.lat);
        url.searchParams.append('lon', latlng.lng);
        let xhr;
        try {
            xhr = await fetch(url.href, {responseType: 'json', timeout: 5000});
        } catch (e) {
            if (e.name === 'XMLHttpRequestPromiseError') {
                return {error: `Search failed: ${e.message}`};
            }
            throw e;
        }
        const places = xhr.responseJSON.features.map((feature) => {
            const properties = feature.properties;
            let address = [
                properties.street,
                properties.housenumber,
                properties.city,
                properties.state,
                properties.country,
            ]
                .filter((it) => it)
                .join(', ');
            let bbox = null;
            let zoom = null;
            if (properties.extent) {
                bbox = L.latLngBounds([
                    [properties.extent[1], properties.extent[0]],
                    [properties.extent[3], properties.extent[2]],
                ]);
            } else {
                zoom = 17;
            }
            let title = properties.name;
            if (!title) {
                title = address;
                address = null;
            }
            let category = properties.osm_value;
            if (['yes'].includes(category)) {
                category = properties.osm_key;
            }
            category = category.replace('_', ' ');
            return {
                title,
                latlng: L.latLng(feature.geometry.coordinates[1], feature.geometry.coordinates[0]),
                bbox,
                category,
                address,
                zoom
            };
        });
        return {results: places};
    }
}

export {PhotonProvider};
