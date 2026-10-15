import L from 'leaflet';
import {BaseLayer} from './baseLayer';

L.Layer.CustomLayer = L.TileLayer.extend({
    includes: BaseLayer,

    getCrs: function() {
        if (this.crs) {
            return this.crs;
        }

        let code = this.__customLayer.crs?.replace(':', '');

        if (!(code in L.CRS)) {
            code = 'EPSG3857';
        }

        return L.CRS[code];
    },
});
