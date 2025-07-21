import L from 'leaflet';

import {fetch} from '~/lib/xhr-promise';

function tile2quad(x, y, z) {
    let quad = '';
    for (let i = z; i > 0; i--) {
        let digit = 0;
        const mask = 1 << (i - 1);
        if ((x & mask) !== 0) {
            digit += 1;
        }
        if ((y & mask) !== 0) {
            digit += 2;
        }
        quad += digit;
    }
    return quad;
}

const BingBaseLayer = L.TileLayer.extend({
    getTileUrl: function (tilePoint) {
        const data = {
            quadkey: tile2quad(tilePoint.x, tilePoint.y, this._getZoomForUrl()),
        };
        return L.Util.template(this._url, L.extend(data, this.options));
    },
});

const BingBaseLayerWithDynamicUrl = BingBaseLayer.extend({
    initialize: function (options) {
        BingBaseLayer.prototype.initialize.call(this, null, options);
        this.layerInfoRequested = false;
    },

    onAdd: function (map) {
        this.loadLayerInfo();
        L.TileLayer.prototype.onAdd.apply(this, [map]);
    },

    _update: function () {
        if (this._url === null || !this._map) {
            return;
        }
        L.TileLayer.prototype._update.apply(this);
    },

    getLayerUrl: async function () {
        throw new Error('Not implemented');
    },

    loadLayerInfo: async function () {
        if (this.layerInfoRequested) {
            return;
        }
        this.layerInfoRequested = true;
        this._url = await this.getLayerUrl();
        this._update();
    },
});

const BingSatLayer = BingBaseLayerWithDynamicUrl.extend({
    getLayerUrl: async function () {
        const xhr = await fetch('https://www.bing.com/maps/style?styleid=aerial', {
            responseType: 'json',
            timeout: 5000,
        });
        return xhr.response['sources']['bing-aerial']['tiles'][0].replace(/^raster/u, 'https');
    },
});

const BingOrdnanceSurveyLayer = BingBaseLayerWithDynamicUrl.extend({
    options: {
        credentials: 'Auy875gcaw3RCFzVQSxi8Ytzw_K67r4Dw8DpGHavRZW_ciCBHLhQJAhCiXSdnzwH',
    },

    getLayerUrl: async function () {
        const xhr = await fetch('https://www.bing.com/maps/style?styleid=ordnancesurvey', {
            responseType: 'json',
            headers: [['accept-language', 'en-GB']],
            timeout: 5000,
        });
        return xhr.response['sources']['osMaps1']['tiles'][0].replace(/^raster/u, 'https');
    },
});

// eslint-disable-next-line import/no-unused-modules
export {BingSatLayer, BingOrdnanceSurveyLayer, BingBaseLayerWithDynamicUrl};
