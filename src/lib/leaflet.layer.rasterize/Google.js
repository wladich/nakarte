import L from 'leaflet';
import '~/lib/leaflet.layer.google';

L.Layer.GoogleBase.include({
    cloneForPrint: function(options) {
        return new L.Layer.GoogleBase(this._url, L.Util.extend({}, this.options, options));
    },
});

