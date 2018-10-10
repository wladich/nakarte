import L from 'leaflet';
import  '../leaflet.control.layers.hotkeys/index';
import 'lib/leaflet.hashState/leaflet.hashState';

L.Control.export.include(L.Mixin.HashState);
L.Control.export.include({
        stateChangeEvents: ['selectionchange'],

        serializeState: function() {
            let state;
            if (this._selector) {
                const bounds = this._selector.getBounds();
                state = [
                    bounds.getSouth().toFixed(5),
                    bounds.getWest().toFixed(5),
                    bounds.getNorth().toFixed(5),
                    bounds.getEast().toFixed(5)];
            }
            return state;
        },

        unserializeState: function(values) {
            function validateFloat(value, min, max) {
                value = parseFloat(value);
                if (isNaN(value) || value < min || value > max) {
                    throw new Error('INVALID VALUE');
                }
                return value;
            }

            if (values && values.length === 4) {
                try {
                    var south = validateFloat(values[0], -86, 86),
                        west = validateFloat(values[1], -180, 180),
                        north = validateFloat(values[2], -86, 86),
                        east = validateFloat(values[3], -180, 180);
                } catch (e) {
                    if (e.message === 'INVALID VALUE') {
                        return false;
                    }
                    throw e;
                }
                this.removeSelector();
                this.addSelector([[south, west], [north, east]]);
                return true;
            } else {
                return false;
            }
        }
    }
);
