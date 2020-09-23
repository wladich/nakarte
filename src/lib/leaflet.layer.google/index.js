import L from "leaflet";

L.Layer.GoogleBase = L.TileLayer.extend({
    options: {
        subdomains: '0123'
    },

    getTileUrl: function(coords) {
        const data = {
            x: coords.x,
            y: coords.y,
            z: 17 - this._getZoomForUrl(),
            s: this._getSubdomain(coords),
            lang: navigator.language || ''
        };
        return L.Util.template(this._url, data);
    }
});

L.Layer.GoogleMap = L.Layer.GoogleBase.extend({
    initialize: function(options) {
        L.Layer.GoogleBase.prototype.initialize.call(
            this, 'https://mt{s}.google.com/vt/lyrs=m@169000000&hl={lang}&x={x}&y={y}&zoom={z}', options);
    }
});

L.Layer.GoogleTerrain = L.Layer.GoogleBase.extend({
    initialize: function(options) {
        L.Layer.GoogleBase.prototype.initialize.call(
            this, 'https://mt{s}.google.com/vt/lyrs=t@130,r@206000000&hl={lang}&x={x}&y={y}&zoom={z}', options);
    }
});

L.Layer.GoogleHybrid = L.Layer.GoogleBase.extend({
    initialize: function(options) {
        L.Layer.GoogleBase.prototype.initialize.call(
            this, 'https://mt{s}.google.com/vt/lyrs=h@169000000&hl={lang}&x={x}&y={y}&zoom={z}', options);
    }
});

L.Layer.GoogleSat = L.TileLayer.extend({
    options: {
        subdomains: '0123'
    },

    initialize: function(options) {
        L.TileLayer.prototype.initialize.call(
            this, 'https://mt{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', options);
    }
});
