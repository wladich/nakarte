import L from 'leaflet';

const BaseLayer = {
    getCrs: function () {
        return L.CRS.EPSG3857;
    },

    _getTilePos: function (coords) {
        this.crs = this.getCrs();
        const tilePosLatLng = this.crs.pointToLatLng(coords.scaleBy(this.getTileSize()), coords.z);
        return this._map.project(tilePosLatLng, coords.z).subtract(this._level.origin);
    },

    _pxBoundsToTileRange: function (bounds) {
        this.crs = this.getCrs();
        const zoom = this._tileZoom;
        const bounds2 = new L.Bounds(
            this.crs.latLngToPoint(this._map.unproject(bounds.min, zoom), zoom),
            this.crs.latLngToPoint(this._map.unproject(bounds.max, zoom), zoom)
        );
        return L.TileLayer.prototype._pxBoundsToTileRange.call(this, bounds2);
    },

    // fix space between tiles (see https://github.com/Leaflet/Leaflet/issues/3575 for details)
    // perhaps this should still be included in a patch for all tiles
    _initTile: function (tile) {
        L.TileLayer.prototype._initTile.call(this, tile);

        const tileSize = this.getTileSize();

        tile.style.width = tileSize.x + 1 + 'px';
        tile.style.height = tileSize.y + 1 + 'px';
    },
};

export {BaseLayer};
