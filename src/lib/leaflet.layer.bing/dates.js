import L from 'leaflet';
import {tile2quad} from './index';

const BingDates = L.TileLayer.extend({
        _url: 'http://mvexel.dev.openstreetmap.org/bingimageanalyzer/tile.php?t={quad}&nodepth=1',

        initialize: function(options) {
            L.Util.setOptions(this, options);
        },

        getTileUrl: function(tilePoint) {
            var zoom = this._getZoomForUrl();
            return this._url.replace('{quad}', tile2quad(tilePoint.x, tilePoint.y, zoom));
        },
    }
);

export {BingDates};