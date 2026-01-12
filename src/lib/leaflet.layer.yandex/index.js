import L from 'leaflet';
import './style.css';
import {BaseLayer} from '../leaflet.control.layers.configure/baseLayer';

L.Layer.Yandex = L.TileLayer.extend({
    includes: BaseLayer,

    options: {
        // className: L.Browser.retina ? '' : 'yandex-tile-layer',
        yandexScale: L.Browser.retina ? 2 : 1
    },

    getCrs: function() {
        return L.CRS.EPSG3395;
    },
});

L.Layer.Yandex.Map = L.Layer.Yandex.extend({
    initialize: function(options) {
        let url = 'https://core-renderer-tiles.maps.yandex.net/tiles?l=map&x={x}&y={y}&z={z}&scale={yandexScale}';
        if (navigator.language) {
            url += `&lang=${navigator.language}`;
        }
        L.Layer.Yandex.prototype.initialize.call(this, url, options);
    },
});

L.Layer.Yandex.Sat = L.Layer.Yandex.extend({
    initialize: function(options) {
        L.Layer.Yandex.prototype.initialize.call(
            this,
            'https://core-sat.maps.yandex.net/tiles?l=sat&x={x}&y={y}&z={z}',
            options
        );
    },
});

L.Layer.Yandex.Tracks = L.Layer.Yandex.extend({
    initialize: function(options) {
        options = {minZoom: 10, maxNativeZoom: 16, ...options};
        L.Layer.Yandex.prototype.initialize.call(
            this,
            'https://core-gpstiles.maps.yandex.net/tiles?style=point&x={x}&y={y}&z={z}',
            options
        );
    },
});
