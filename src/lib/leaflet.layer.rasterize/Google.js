import L from 'leaflet';
import 'lib/leaflet.layer.google';
import {TileLayerGrabMixin} from './TileLayer';



const GooglePrint = L.Layer.Google.extend({
    includes: TileLayerGrabMixin,

    _rasterizeNeedsFullSizeMap: true,

    _dummyTile: L.DomUtil.create('div'),

    onAdd: function(map) {
        this._waitTilesReadyToGrab = new Promise((resolve) => {
           this._tilesReadyToGrab = resolve;
        });
        L.Layer.Google.prototype.onAdd.call(this, map);
    },

    waitTilesReadyToGrab: function() {
        return this._waitTilesReadyToGrab;
    },

    createTile: function() {
        return this._dummyTile;
    },

    _fullfillPendingTiles: function() {
        if (!Object.keys(this._readyTiles).length) {
            return;
        }
        this._tilesReadyToGrab();
    },

    getTileUrl: function(coords) {
        return this._readyTiles[this._tileCoordsToKey(coords)] || null;
    }
});


L.Layer.Google.include({
    cloneForPrint: function(options) {
        return new GooglePrint(this.mapType, L.Util.extend({}, this.options, options));
    },
});

