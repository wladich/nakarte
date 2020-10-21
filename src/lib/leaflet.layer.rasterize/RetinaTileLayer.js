import L from 'leaflet';

import {RetinaTileLayer} from '~/lib/leaflet.layer.RetinaTileLayer';
import './TileLayer';

RetinaTileLayer.include({
    cloneForPrint: function(options) {
        const newOptions = L.Util.extend({}, this.options, options);
        return new RetinaTileLayer(this.urls, newOptions, newOptions.scaleDependent);
    },

    getTilesInfo: async function(printOptions) {
        const tilesInfo = await L.TileLayer.prototype.getTilesInfo.call(this, printOptions);
        tilesInfo.tileScale = this.tileSizeMultiplicator;
        return tilesInfo;
    },
});
