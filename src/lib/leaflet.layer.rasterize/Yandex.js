import L from 'leaflet';
import '~/lib/leaflet.layer.yandex';

L.Layer.Yandex.include({
    cloneForPrint: function(options) {
        return new L.Layer.Yandex(this._mapType, L.Util.extend({}, this.options, options));
    },
});