import L from 'leaflet';
import './style.css';

const yandexCrs = L.CRS.EPSG3395;

L.Layer.Yandex = L.TileLayer.extend({
        options: {
            subdomains: '1234',
            className: L.Browser.retina ? '' : 'yandex-tile-layer',
            yandexScale: L.Browser.retina ? 2 : 1
        },

        initialize: function(mapType, options) {
            let url;
            this._mapType = mapType;
            if (mapType === 'sat') {
                url = 'https://sat0{s}.maps.yandex.net/tiles?l=sat&x={x}&y={y}&z={z}';
            } else {
                url = 'https://vec0{s}.maps.yandex.net/tiles?l=map&x={x}&y={y}&z={z}&scale={yandexScale}';
            }

            L.TileLayer.prototype.initialize.call(this, url, options);
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
