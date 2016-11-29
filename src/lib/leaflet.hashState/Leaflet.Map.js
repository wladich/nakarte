import L from 'leaflet';
import './leaflet.hashState'

L.Map.include(L.Mixin.HashState);

L.Map.include({
        stateChangeEvents: ['moveend'],

        serializeState: function() {
            var center = this.getCenter();
            var zoom = this.getZoom();
            var precision = 5;
            var state = [
                zoom.toString(),
                center.lat.toFixed(precision),
                center.lng.toFixed(precision)
            ];
            return state;
        },

        unserializeState: function(values) {
            if (!values || values.length !== 3) {
                return false;
            }
            var zoom = parseInt(values[0], 10),
                lat = parseFloat(values[1]),
                lng = parseFloat(values[2]);
            if (isNaN(zoom) || isNaN(lat) || isNaN(lng) || zoom < 0 || zoom > 32 || lat < -90 || lat > 90 ) {
                return false;
            }
            this.setView([lat, lng], zoom);
            return true;
        }
    }
);

