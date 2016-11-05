import L from 'leaflet'

const yandexCrs = L.CRS.EPSG3395;

const origPxBoundsToTileRange = L.TileLayer.prototype._pxBoundsToTileRange;
const origInitTile = L.TileLayer.prototype._initTile;
const origCreateTile = L.TileLayer.prototype.createTile;

L.Layer.Yandex = L.TileLayer.extend({
        options: {
            subdomains: '1234'
        },

        initialize: function(mapType, options) {
            var url;
            this._mapType = mapType;
            if (mapType === 'sat') {
                url = 'https://sat0{s}.maps.yandex.net/tiles?l=sat&x={x}&y={y}&z={z}';
            } else {
                url = 'https://vec0{s}.maps.yandex.net/tiles?l=map&x={x}&y={y}&z={z}';
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
            return origPxBoundsToTileRange.call(this, bounds2);
        },

        createTile: function(coords, done) {
            const tile = origCreateTile.call(this, coords, done);
            const coordsBelow = L.point(coords).add([0, 1]);
            coordsBelow.z = coords.z;
            tile._adjustHeight = this._getTilePos(coordsBelow).y - this._getTilePos(coords).y;
            return tile
        },

        _initTile: function(tile) {
            origInitTile.call(this, tile);
            tile.style.height = `${tile._adjustHeight}px`;
        }
    }
);