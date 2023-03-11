import L from 'leaflet';

import config from '~/config';
import * as logging from '~/lib/logging';
import {fetch} from '~/lib/xhr-promise';

import _categories from './categories.csv';
import icons from './icons.json';
import {BaseProvider} from '../remoteBase';

const categories = Object.assign({}, ..._categories.map((it) => ({[String(it.id)]: it})));

const MapyCzProvider = BaseProvider.extend({
    name: 'Mapy.cz',

    options: {
        apiUrl: 'https://api.mapy.cz/v0/suggest/',
        attribution: {
            text: 'Mapy.cz',
            url: 'https://mapy.cz',
        },
        delay: 300,
        languages: ['en', 'cs', 'de', 'pl', 'sk', 'ru', 'es', 'fr'],
        categoriesLanguages: ['en', 'ru'],
        defaultLanguage: 'en',
    },

    initialize: function (options) {
        BaseProvider.prototype.initialize.call(this, options);
        this.langStr = this.getRequestLanguages(this.options.languages).join(',');
        this.categoriesLanguage = this.getRequestLanguages(
            this.options.categoriesLanguages,
            this.options.defaultLanguage
        )[0];
        this.apiKey = config.mapyCz;
    },

    search: async function (query, {latlng, zoom}) {
        if (!(await this.waitNoNewRequestsSent())) {
            return {error: 'Request cancelled'};
        }
        const url = new URL(this.options.apiUrl);
        url.searchParams.append('phrase', query);
        url.searchParams.append('lat', latlng.lat);
        url.searchParams.append('lon', latlng.lng);
        url.searchParams.append('zoom', zoom);
        url.searchParams.append('lang', this.langStr);
        if (this.options.maxResponses) {
            url.searchParams.append('count', this.options.maxResponses);
        }
        url.searchParams.append('apikey', this.apiKey);
        let xhr;
        try {
            xhr = await fetch(url.href, {responseType: 'json', timeout: 5000});
        } catch (e) {
            if (e.name === 'XMLHttpRequestPromiseError') {
                logging.captureException(e, 'Error response from mapy.cz search api');
                return {error: `Search failed: ${e.message}`};
            }
            throw e;
        }
        const places = xhr.responseJSON.result
            .filter((it) => it.userData.suggestSecondRow !== 'Poloha')
            .map((it) => {
                const data = it.userData;
                const iconId = icons[data.poiTypeId];
                const icon = iconId ? `https://api.mapy.cz/poiimg/icon/${iconId}?scale=1` : null;
                const place = {
                    latlng: L.latLng(data.latitude, data.longitude),
                    title: data.suggestFirstRow,
                    address: data.suggestSecondRow,
                    category: categories[data.poiTypeId]?.[this.categoriesLanguage] || data.suggestThirdRow || null,
                    icon,
                };
                if (data.bbox) {
                    place.bbox = L.latLngBounds([data.bbox[0], data.bbox[1]], [data.bbox[2], data.bbox[3]]);
                } else {
                    place.zoom = 17;
                }
                return place;
            });
        const poiIds = xhr.responseJSON.result
            .filter((it) => Boolean(it.userData.poiTypeId))
            .map((it) => ({
                typeId: it.userData.poiTypeId,
                poiId: it.userData.id,
                source: it.userData.source,
            }));
        if (poiIds.length > 0) {
            logging.logEvent('SearchMapyCzPoiIds', {poiIds});
        }
        return {results: places};
    },
});

export {MapyCzProvider};
