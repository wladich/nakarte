import L from 'leaflet';
import '~/lib/leaflet.layer.yandex';

L.Layer.Yandex.Map.include({
    cloneForPrint: function(options) {
        return new L.Layer.Yandex.Map({...this.options, ...options});
    },
});

L.Layer.Yandex.Sat.include({
    cloneForPrint: function(options) {
        return new L.Layer.Yandex.Sat({...this.options, ...options});
    },
});

L.Layer.Yandex.Tracks.include({
    cloneForPrint: function(options) {
        return new L.Layer.Yandex.Tracks({...this.options, ...options});
    },
});
