import L from 'leaflet';

L.Layer.CustomLayer = L.TileLayer.extend({
    getTileUrl: function(coords) {
        const z = this._getZoomForUrl();
        var data = {
            r: L.Browser.retina ? '@2x' : '',
            s: this._getSubdomain(coords),
            x: coords.x,
            y: coords.y,
            z: z,
            z_1: z + 1,
            x_1024: Math.floor(coords.x / 1024),
            y_1024: Math.floor(coords.y / 1024),
        };
        if (this._map && !this._map.options.crs.infinite) {
            var invertedY = this._globalTileRange.max.y - coords.y;
            if (this.options.tms) {
                data['y'] = invertedY;
                data['y_1024'] = Math.floor(invertedY / 1024);
            }
            data['-y'] = invertedY;
        }

        return L.Util.template(this._url, L.extend(data, this.options));
    },

    cloneForPrint: function(options) {
        return new L.Layer.CustomLayer(this._url, L.Util.extend({}, this.options, options));
    },

    getCrs: function() {
        return this.options.epsg3395 ? L.CRS.EPSG3395 : L.CRS.EPSG3857;
    },

    _getTilePos: function(coords) {
        const tilePosLatLng = this.getCrs().pointToLatLng(coords.scaleBy(this.getTileSize()), coords.z);
        return this._map.project(tilePosLatLng, coords.z).subtract(this._level.origin).round();
    },

    _pxBoundsToTileRange: function(bounds) {
        const zoom = this._tileZoom;
        const bounds2 = new L.Bounds(
            this.getCrs().latLngToPoint(this._map.unproject(bounds.min, zoom), zoom),
            this.getCrs().latLngToPoint(this._map.unproject(bounds.max, zoom), zoom));
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

});
