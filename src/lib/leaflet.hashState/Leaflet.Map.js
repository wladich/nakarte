import L from 'leaflet';
import './leaflet.hashState';

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

        validateState: function(values) {
            if (!values || values.length !== 3) {
                return {valid: false};
            }
            let zoom = parseInt(values[0], 10),
                lat = parseFloat(values[1]),
                lng = parseFloat(values[2]);
            if (isNaN(zoom) || isNaN(lat) || isNaN(lng) || zoom < 0 || zoom > 32 || lat < -90 || lat > 90) {
                return {valid: false};
            }
            return {lat, lng, zoom, valid: true};
        },

        unserializeState: function(values) {
            let {lat, lng, zoom, valid} = this.validateState(values);
            if (valid) {
                this.setView([lat, lng], zoom);
                return true;
            }
            return false;
        }
    }
);

