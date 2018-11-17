import L from 'leaflet';
import  '../leaflet.control.layers.hotkeys/index';
import 'lib/leaflet.hashState/leaflet.hashState';

L.Control.export.include(L.Mixin.HashState);
L.Control.export.include({
        stateChangeEvents: ['selectionchange', 'exportformatchange'],

        serializeState: function() {
            let state;
            if (this._selector) {
                const bounds = this._selector.getBounds();
                state = [
                    bounds.getSouth().toFixed(5),
                    bounds.getWest().toFixed(5),
                    bounds.getNorth().toFixed(5),
                    bounds.getEast().toFixed(5),
                    this.getExportFormatName()];
            }
            return state;
        },

        unserializeState: function(values) {

            function validateFloat(value, min, max) {
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

            if (values && ( values.length === 4 || values.length === 5 ) ) { // format is optional
                try {
                    var south = validateFloatRange(values[0], -86, 86),
                        west = validateFloat(values[1]),
                        north = validateFloatRange(values[2], -86, 86),
                        east = validateFloat(values[3]);
                } catch (e) {
                    if (e.message === 'INVALID VALUE') {
                        return false;
                    }
                    throw e;
                }
                if ( values[4] ) {
                    this.setExportFormatByName(values[4]);
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
