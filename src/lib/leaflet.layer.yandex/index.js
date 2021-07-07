import L from 'leaflet';
import './style.css';

const yandexCrs = L.CRS.EPSG3395;

L.Layer.Yandex = L.TileLayer.extend({
        options: {
            className: L.Browser.retina ? '' : 'yandex-tile-layer',
            yandexScale: L.Browser.retina ? 2 : 1
        },

        _getTilePos: function(coords) {
            const tilePosLatLng = yandexCrs.pointToLatLng(coords.scaleBy(this.getTileSize()), coords.z);
            return this._map.project(tilePosLatLng, coords.z).subtract(this._level.origin).round();
        },

        _pxBoundsToTileRange: function(bounds) {
            const zoom = this._tileZoom;
            const bounds2 = new L.Bounds(
                yandexCrs.latLngToPoint(this._map.unproject(bounds.min, zoom), zoom),
                yandexCrs.latLngToPoint(this._map.unproject(bounds.max, zoom), zoom));
            return L.TileLayer.prototype._pxBoundsToTileRange.call(this, bounds2);
        },

        createTile: function(coords, done) {
            const tile = L.TileLayer.prototype.createTile.call(this, coords, done);
            const coordsBelow = L.point(coords).add([0, 1]);
            coordsBelow.z = coords.z;
            tile._adjustHeight = this._getTilePos(coordsBelow).y - this._getTilePos(coords).y;
            return tile;
        },

        _initTile: function(tile) {
            L.TileLayer.prototype._initTile.call(this, tile);
            tile.style.height = `${tile._adjustHeight}px`;
        }
    }
);

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
