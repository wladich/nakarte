import L from 'leaflet';
import '~/lib/leaflet.hashState/leaflet.hashState';

L.Control.JNX.include(L.Mixin.HashState);
L.Control.JNX.include({
        stateChangeEvents: ['selectionchange'],

        serializeState: function() {
            let state;
            if (this._selector) {
                const bounds = this._selector.getBounds();
                state = [
                    bounds.getSouth().toFixed(5),
                    bounds.getWest().toFixed(5),
                    bounds.getNorth().toFixed(5),
                    bounds.getEast().toFixed(5)
                ];
            }
            return state;
        },

        unserializeState: function(values) {
            function validateFloat(value) {
                value = parseFloat(value);
                if (isNaN(value)) {
                    throw new Error('INVALID VALUE');
                }
                return value;
            }

            function validateFloatRange(value, min, max) {
                value = validateFloat(value);
                if (value < min || value > max) {
                    throw new Error('INVALID VALUE');
                }
                return value;
            }

            if (values && values.length === 4) {
                let south, west, north, east;
                try {
                        south = validateFloatRange(values[0], -86, 86);
                        west = validateFloat(values[1]);
                        north = validateFloatRange(values[2], -86, 86);
                        east = validateFloat(values[3]);
                } catch (e) {
                    if (e.message === 'INVALID VALUE') {
                        return false;
                    }
                    throw e;
                }
                this.removeSelector();
                this.addSelector([[south, west], [north, east]]);
                return true;
            }
            return false;
        }
    }
);
