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

});
