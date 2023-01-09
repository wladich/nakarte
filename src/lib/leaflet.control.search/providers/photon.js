import L from 'leaflet';

import * as logging from '~/lib/logging';
import {fetch} from '~/lib/xhr-promise';

import {BaseProvider} from './remoteBase';

const PhotonProvider = BaseProvider.extend({
    name: 'Photon',

    options: {
        apiUrl: 'https://photon.komoot.io/api/',
        attribution: {
            text: 'Photon by Komoot',
            url: 'https://photon.komoot.io/',
        },
        delay: 700,
        languages: ['en', 'de', 'fr', 'it'],
        defaultLanguage: 'en',
    },

    initialize: function (options) {
        BaseProvider.prototype.initialize.call(this, options);
        this.lang = this.getRequestLanguages(this.options.languages, this.options.defaultLanguage)[0];
    },

    search: async function (query, {latlng}) {
        if (!(await this.waitNoNewRequestsSent())) {
            return {error: 'Request cancelled'};
        }
        const url = new URL(this.options.apiUrl);
        if (this.options.maxResponses) {
            url.searchParams.append('limit', this.options.maxResponses);
        }
        url.searchParams.append('q', query);
        url.searchParams.append('lang', 'en');
        url.searchParams.append('lat', latlng.lat);
        url.searchParams.append('lon', latlng.lng);
        let xhr;
        try {
            xhr = await fetch(url.href, {responseType: 'json', timeout: 5000});
        } catch (e) {
            if (e.name === 'XMLHttpRequestPromiseError') {
                logging.captureException(e, 'Error response from photon search api');
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
                zoom,
                icon: null,
            };
        });
        return {results: places};
    },
});

export {PhotonProvider};
